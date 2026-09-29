import type { Response } from "express";
import { VerificationStatus } from "../types/verification.types";
import type { IVerificationJob } from "../types/verification.types";

type Subscriber = {
  res: Response;
  jobId: string;
};

export class StatusStreamService {
  private subscribers: Map<string, Set<Response>> = new Map();

  /**
   * Subscribe an SSE response to a specific job ID.
   * The caller is responsible for sending the initial status event
   * after subscribing (typically the controller with pre-resolved job data).
   * Registers a close handler for automatic cleanup on disconnect.
   */
  subscribe(jobId: string, res: Response): void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }
    this.subscribers.get(jobId)!.add(res);

    const cleanup = (): void => {
      this.unsubscribe(jobId, res);
    };

    res.on("close", cleanup);
    res.on("error", cleanup);
  }

  /**
   * Send an initial status event to a subscriber.
   */
  sendStatus(
    res: Response,
    job: IVerificationJob
  ): void {
    const eventData: Record<string, unknown> = {
      jobId: String(job._id),
      status: job.status,
      ownerPublicKey: job.ownerPublicKey,
      contentHash: job.contentHash,
      teeAttestationHash: job.teeAttestationHash ?? null,
      stellarTransactionHash: job.stellarTransactionHash ?? null,
      errorMessage: job.errorMessage ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    try {
      res.write(this.serializeSSE("status", eventData));
    } catch {
      this.unsubscribe(String(job._id), res);
    }
  }

  /**
   * Unsubscribe a response from a job and clean up empty sets.
   */
  unsubscribe(jobId: string, res: Response): void {
    const jobSubscribers = this.subscribers.get(jobId);
    if (jobSubscribers) {
      jobSubscribers.delete(res);
      if (jobSubscribers.size === 0) {
        this.subscribers.delete(jobId);
      }
    }
  }

  /**
   * Broadcast a status transition event to all subscribers of a job.
   */
  async broadcast(
    jobId: string,
    status: VerificationStatus,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    const jobSubscribers = this.subscribers.get(jobId);
    if (!jobSubscribers || jobSubscribers.size === 0) return;

    const eventData: Record<string, unknown> = {
      jobId,
      status,
      ...extra,
    };

    const payload = this.serializeSSE("status", eventData);
    const deadSubscribers: Response[] = [];

    for (const subscriberRes of Array.from(jobSubscribers)) {
      try {
        subscriberRes.write(payload);
      } catch {
        deadSubscribers.push(subscriberRes);
      }
    }

    for (const deadRes of deadSubscribers) {
      this.unsubscribe(jobId, deadRes);
    }
  }

  /**
   * Returns the number of active subscribers for a given job.
   */
  getSubscriberCount(jobId: string): number {
    return this.subscribers.get(jobId)?.size ?? 0;
  }

  /**
   * Removes all subscribers (used during shutdown).
   */
  async disconnectAll(): Promise<void> {
    for (const [, jobSubscribers] of Array.from(this.subscribers)) {
      for (const res of Array.from(jobSubscribers)) {
        try {
          res.end();
        } catch {
          // ignore
        }
      }
    }
    this.subscribers.clear();
  }

  /**
   * Check whether a job has any active SSE subscribers.
   */
  hasSubscribers(jobId: string): boolean {
    const set = this.subscribers.get(jobId);
    return set !== undefined && set.size > 0;
  }

  private sendEvent(res: Response, event: string, data: Record<string, unknown>): void {
    res.write(this.serializeSSE(event, data));
  }

  private serializeSSE(event: string, data: Record<string, unknown>): string {
    const payload = JSON.stringify(data);
    return `event: ${event}\ndata: ${payload}\n\n`;
  }
}

export const statusStreamService = new StatusStreamService();