/**
 * Verification Controller – thin HTTP adapter layer.
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
import { verificationService } from "../services/verification.service";
import type {
  CreateVerificationJobDTO,
  UpdateVerificationStatusDTO,
} from "../types/verification.types";

export class VerificationController {
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

  /**
   * GET /api/v1/verification/jobs?ownerPublicKey=G...
   * Lists all VerificationJobs belonging to the given owner.
   */
  async listJobsByOwner(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ownerPublicKey } = req.query as { ownerPublicKey: string };
      const jobs = await verificationService.getJobsByOwner(ownerPublicKey);
      res.status(StatusCodes.OK).json({
        success: true,
        data: jobs,
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
        dto
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
}

export const verificationController = new VerificationController();
