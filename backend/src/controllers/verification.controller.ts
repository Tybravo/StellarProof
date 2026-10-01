/**
 * Verification Controller - thin HTTP adapter layer.
 *
 * Each method:
 *  1. Extracts validated data from the request (body / params / query are
 *     already validated by middleware before reaching here).
 *  2. Delegates to the verification service.
 *  3. Wraps the result in the standard ApiResponse envelope.
 *  4. Forwards any errors to the global error handler via `next(err)`.
 *
 * No business logic or state machine rules live here.
 */
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError";
import Asset from "../models/Asset.model";
import Manifest from "../models/Manifest.model";
import { VerificationJobModel } from "../models/verificationJob.model";
import { verificationService } from "../services/verification.service";
import { statusStreamService } from "../services/statusStream.service";
import type {
  CreateVerificationJobDTO,
  UpdateVerificationStatusDTO,
  OracleCallbackDTO,
  IVerificationJob,
  ListVerificationJobsQuery,
} from "../types/verification.types";
import { VerificationStatus } from "../types/verification.types";

export class VerificationController {
  /**
   * POST /api/v1/verify/submit
   * Validates ownership and creates a pending Truth Engine verification job.
   */
  async submit(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { manifestId, assetId } = req.body as {
        manifestId?: string;
        assetId?: string;
      };
      const user = req.user as any;
      const userId = user?.id || user?._id?.toString();

      if (!userId) {
        throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
      }

      if (!manifestId || !mongoose.Types.ObjectId.isValid(manifestId)) {
        throw new AppError("Valid manifestId is required", StatusCodes.BAD_REQUEST, "INVALID_MANIFEST_ID");
      }

      if (!assetId || !mongoose.Types.ObjectId.isValid(assetId)) {
        throw new AppError("Valid assetId is required", StatusCodes.BAD_REQUEST, "INVALID_ASSET_ID");
      }

      const [manifest, asset] = await Promise.all([
        Manifest.findById(manifestId),
        Asset.findById(assetId),
      ]);

      if (!manifest) {
        throw new AppError("Manifest not found", StatusCodes.NOT_FOUND, "MANIFEST_NOT_FOUND");
      }

      if (!asset) {
        throw new AppError("Asset not found", StatusCodes.NOT_FOUND, "ASSET_NOT_FOUND");
      }

      if (manifest.creatorId.toString() !== userId || asset.creatorId.toString() !== userId) {
        throw new AppError(
          "Authenticated user does not own both the manifest and asset",
          StatusCodes.FORBIDDEN,
          "OWNERSHIP_MISMATCH"
        );
      }

      const job = await VerificationJobModel.create({
        manifestId: new mongoose.Types.ObjectId(manifestId),
        assetId: new mongoose.Types.ObjectId(assetId),
        ownerPublicKey: user.stellarPublicKey || manifest.creator,
        contentHash: manifest.contentHash,
        status: VerificationStatus.PENDING,
        timeline: [{ stage: VerificationStatus.PENDING, at: new Date(), actor: "user" }],
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Verification job submitted successfully",
        data: {
          jobId: job._id,
          status: job.status,
          manifestId: job.manifestId,
          assetId: job.assetId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/verification/jobs
   * Creates a new VerificationJob in the `pending` state.
   */
  async createJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = req.body as CreateVerificationJobDTO;
      const job = await verificationService.createJob(dto);
      res.status(StatusCodes.CREATED).json({
        success: true,
        data: job,
        message: "Verification job created successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/verification/jobs/:id
   * Retrieves a single VerificationJob by its MongoDB ObjectId.
   */
  async getJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const job = await verificationService.getJob(req.params.id);
      res.status(StatusCodes.OK).json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/verification/jobs/:id/timeline */
  async getTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requester = req.user;
      const timeline = await verificationService.getJobTimeline(req.params.id, {
        role: requester.role,
        stellarPublicKey: requester.stellarPublicKey,
      });
      res.status(StatusCodes.OK).json({ success: true, data: timeline });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/v1/verification/jobs/:id/retry */
  async retryJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requester = req.user;
      const job = await verificationService.retryJob(req.params.id, {
        role: requester.role,
        stellarPublicKey: requester.stellarPublicKey,
      });
      res.status(StatusCodes.CREATED).json({
        success: true,
        data: job,
        message: "Verification job retry submitted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/verification/jobs
   * Lists the caller's jobs with pagination, status, date range, and contentHash search.
   */
  async listJobsByOwner(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerPublicKey = res.locals.ownerPublicKey as string | undefined;
      const parsed = res.locals.listJobsQuery as Omit<ListVerificationJobsQuery, "ownerPublicKey"> | undefined;
      if (!ownerPublicKey || !parsed) {
        throw new AppError("Verification job not found", StatusCodes.NOT_FOUND, "JOB_NOT_FOUND");
      }

      const result = await verificationService.listJobs({
        ...parsed,
        ownerPublicKey,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.jobs,
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/verification/jobs/stats
   * Counts the caller's jobs by status and returns the success rate plus daily trends.
   */
  async getJobStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerPublicKey = res.locals.ownerPublicKey as string | undefined;
      if (!ownerPublicKey) {
        throw new AppError("Verification job not found", StatusCodes.NOT_FOUND, "JOB_NOT_FOUND");
      }

      const stats = await verificationService.getJobStats(ownerPublicKey);
      res.status(StatusCodes.OK).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/verification/jobs/:id/status
   * Advances a VerificationJob to the requested status.
   * Enforces all state machine transition rules in the service layer.
   */
  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = req.body as UpdateVerificationStatusDTO;
      const job = await verificationService.updateJobStatus(
        req.params.id,
        dto,
        "user"
      );
      res.status(StatusCodes.OK).json({
        success: true,
        data: job,
        message: `Verification job transitioned to '${job.status}'`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/verification/jobs/oracle/callback
   * Receives cryptographic attestation from the TEE oracle and advances
   * the job to `minting`.
   */
  async oracleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = req.body as OracleCallbackDTO;
      const job = await verificationService.receiveOracleAttestation(dto);
      res.status(StatusCodes.OK).json({
        success: true,
        data: job,
        message: "TEE attestation accepted; job moved to 'minting'",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/verification/jobs/:id/stream
   * SSE endpoint that streams live status transitions for a VerificationJob.
   * Sets appropriate SSE headers, subscribes the response to the job,
   * sends the initial status event, and handles client disconnect cleanup.
   */
  async subscribe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const jobId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new AppError("Invalid job ID", StatusCodes.BAD_REQUEST, "INVALID_ID");
      }

      const job = await VerificationJobModel.findById(jobId).lean<IVerificationJob>();
      if (!job) {
        throw new AppError(
          `Verification job not found: '${jobId}'`,
          StatusCodes.NOT_FOUND,
          "JOB_NOT_FOUND"
        );
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.flushHeaders();

      statusStreamService.subscribe(jobId, res);
      statusStreamService.sendStatus(res, job);
    } catch (err) {
      if (!res.headersSent) {
        next(err);
      }
    }
  }
}

export const verificationController = new VerificationController();
