/**
 * Queue operations over VerificationRequestEvents.
 *
 * Claiming is a single atomic `findOneAndUpdate`, so concurrent workers can
 * never process the same event at once. Every later write is guarded by the
 * claiming worker's lease; a worker whose lease was taken over gets a
 * `LeaseLostError` instead of silently overwriting the new owner's progress.
 */
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { VerificationRequestEventModel } from "../models/verificationRequestEvent.model";
import { AppError } from "../errors/AppError";
import {
  VerificationRequestEventStatus,
  type IVerificationRequestEvent,
} from "../types/verificationRequestEvent.types";

/** The worker no longer owns the event it was processing. */
export class LeaseLostError extends AppError {
  constructor(eventId: string) {
    super(
      `Lease on verification request event '${eventId}' is no longer held by this worker`,
      StatusCodes.CONFLICT,
      "EVENT_LEASE_LOST"
    );
    this.name = "LeaseLostError";
    Object.setPrototypeOf(this, LeaseLostError.prototype);
  }
}

export interface ClaimOptions {
  workerId: string;
  leaseMs: number;
  now?: Date;
}

export interface VerificationOutcome {
  contentHash: string;
  manifestHash: string;
}

export interface CompletionOutcome {
  transactionHash: string;
  certificateId?: string;
}

export interface TimelineEntry {
  status: VerificationRequestEventStatus;
  at: Date;
  details?: Record<string, unknown>;
}

type EventUpdate = mongoose.UpdateQuery<IVerificationRequestEvent>;

function serialize(doc: Record<string, unknown>): IVerificationRequestEvent {
  const { _id, verificationJobId, ...rest } = doc;
  return {
    ...(rest as Omit<IVerificationRequestEvent, "_id" | "verificationJobId">),
    _id: String(_id),
    ...(verificationJobId ? { verificationJobId: String(verificationJobId) } : {}),
  };
}

class VerificationRequestEventService {
  /**
   * Atomically claims the next due event: a pending event whose retry time
   * has arrived, or a processing event whose lease has expired.
   */
  async claimNext({ workerId, leaseMs, now = new Date() }: ClaimOptions): Promise<IVerificationRequestEvent | null> {
    const doc = await VerificationRequestEventModel.findOneAndUpdate(
      {
        $or: [
          { status: VerificationRequestEventStatus.PENDING, nextAttemptAt: { $lte: now } },
          { status: VerificationRequestEventStatus.PROCESSING, lockedUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          status: VerificationRequestEventStatus.PROCESSING,
          lockedBy: workerId,
          lockedUntil: new Date(now.getTime() + leaseMs),
        },
        $inc: { attempts: 1 },
      },
      { sort: { nextAttemptAt: 1, createdAt: 1 }, new: true }
    ).lean<Record<string, unknown>>();

    return doc ? serialize(doc) : null;
  }

  /** Links the event to its VerificationJob. A job can be attached only once. */
  async attachJob(eventId: string, workerId: string, jobId: string): Promise<void> {
    await this.guardedUpdate(
      eventId,
      workerId,
      { $set: { verificationJobId: new mongoose.Types.ObjectId(jobId) } },
      { verificationJobId: { $exists: false } }
    );
  }

  async recordVerification(eventId: string, workerId: string, outcome: VerificationOutcome): Promise<void> {
    await this.guardedUpdate(eventId, workerId, { $set: { ...outcome } });
  }

  /** Records (or with `null`, clears) the mint transaction currently in flight. */
  async recordTransaction(eventId: string, workerId: string, txHash: string | null): Promise<void> {
    await this.guardedUpdate(
      eventId,
      workerId,
      txHash ? { $set: { transactionHash: txHash } } : { $unset: { transactionHash: 1 } }
    );
  }

  /**
   * Appends a timeline entry and transitions the event to a new status.
   * Timeline entries are appended atomically with `$push` so the full history
   * is persisted even when multiple workers touch the event over time.
   */
  async recordStatusTransition(
    eventId: string,
    workerId: string,
    status: VerificationRequestEventStatus,
    details?: Record<string, unknown>
  ): Promise<void> {
    const entry: TimelineEntry = { status, at: new Date(), ...(details ? { details } : {}) };
    await this.guardedUpdate(eventId, workerId, {
      $set: { status },
      $push: { timeline: entry },
    });
  }

  async markCompleted(eventId: string, workerId: string, outcome: CompletionOutcome): Promise<void> {
    const entry: TimelineEntry = {
      status: VerificationRequestEventStatus.COMPLETED,
      at: new Date(),
      details: { transactionHash: outcome.transactionHash, ...(outcome.certificateId ? { certificateId: outcome.certificateId } : {}) },
    };
    await this.guardedUpdate(eventId, workerId, {
      $set: {
        status: VerificationRequestEventStatus.COMPLETED,
        completedAt: new Date(),
        ...outcome,
      },
      $unset: { lockedBy: 1, lockedUntil: 1, lastError: 1 },
      $push: { timeline: entry },
    });
  }

  async markFailed(eventId: string, workerId: string, error: string): Promise<void> {
    const entry: TimelineEntry = {
      status: VerificationRequestEventStatus.FAILED,
      at: new Date(),
      details: { error },
    };
    await this.guardedUpdate(eventId, workerId, {
      $set: { status: VerificationRequestEventStatus.FAILED, lastError: error },
      $unset: { lockedBy: 1, lockedUntil: 1 },
      $push: { timeline: entry },
    });
  }

  /** Releases the lease and makes the event claimable again at `nextAttemptAt`. */
  async scheduleRetry(eventId: string, workerId: string, nextAttemptAt: Date, error: string): Promise<void> {
    const entry: TimelineEntry = {
      status: VerificationRequestEventStatus.PENDING,
      at: new Date(),
      details: { error, nextAttemptAt: nextAttemptAt.toISOString() },
    };
    await this.guardedUpdate(eventId, workerId, {
      $set: { status: VerificationRequestEventStatus.PENDING, nextAttemptAt, lastError: error },
      $unset: { lockedBy: 1, lockedUntil: 1 },
      $push: { timeline: entry },
    });
  }

  /** Returns the persisted timeline for an event, ordered by append order. */
  async getTimeline(eventId: string): Promise<TimelineEntry[]> {
    const doc = await VerificationRequestEventModel.findById(eventId).lean<Record<string, unknown> | null>();
    if (!doc) {
      throw new AppError(
        `Verification request event '${eventId}' not found`,
        StatusCodes.NOT_FOUND,
        "EVENT_NOT_FOUND"
      );
    }
    const timeline = (doc as { timeline?: TimelineEntry[] }).timeline ?? [];
    return timeline.map((entry) => ({
      ...entry,
      at: entry.at instanceof Date ? entry.at : new Date(entry.at),
    }));
  }

  private async guardedUpdate(
    eventId: string,
    workerId: string,
    update: EventUpdate,
    extraFilter: Record<string, unknown> = {}
  ): Promise<void> {
    const result = await VerificationRequestEventModel.updateOne(
      {
        _id: eventId,
        status: VerificationRequestEventStatus.PROCESSING,
        lockedBy: workerId,
        ...extraFilter,
      },
      update
    );

    if (result.matchedCount === 0) {
      throw new LeaseLostError(eventId);
    }
  }
}

export type VerificationRequestEventServiceType = VerificationRequestEventService;
export const verificationRequestEventService = new VerificationRequestEventService();
