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
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { verificationService } from '../services/verification.service';
import { HttpError } from '../utils/httpError';

interface MintCallbackRequestBody {
  transactionHash?: string;
  certificateId?: string;
  contractAddress?: string;
  ledgerSequence?: number;
  mintedAt?: string;
  stellarNetwork?: 'testnet' | 'mainnet';
}

export const handleMintCallback = async (
  req: Request<{ jobId: string }, unknown, MintCallbackRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new HttpError(400, 'Invalid job id');
    }

    const { transactionHash, certificateId, contractAddress, ledgerSequence, mintedAt, stellarNetwork } = req.body;

    if (!transactionHash || !transactionHash.trim()) {
      throw new HttpError(400, 'transactionHash is required');
    }

    if (!certificateId || !certificateId.trim()) {
      throw new HttpError(400, 'certificateId is required');
    }

    if (!contractAddress || !contractAddress.trim()) {
      throw new HttpError(400, 'contractAddress is required');
    }

    if (!Number.isInteger(ledgerSequence) || (ledgerSequence ?? 0) <= 0) {
      throw new HttpError(400, 'ledgerSequence must be a positive integer');
    }
    const parsedLedgerSequence = Number(ledgerSequence);

    if (stellarNetwork && stellarNetwork !== 'testnet' && stellarNetwork !== 'mainnet') {
      throw new HttpError(400, 'stellarNetwork must be either testnet or mainnet');
    }

    const mintedAtDate = mintedAt ? new Date(mintedAt) : new Date();
    if (Number.isNaN(mintedAtDate.getTime())) {
      throw new HttpError(400, 'mintedAt must be a valid ISO date');
    }

    const result = await verificationService.handleMintCallback({
      jobId,
      transactionHash: transactionHash.trim(),
      certificateId: certificateId.trim(),
      contractAddress: contractAddress.trim(),
      ledgerSequence: parsedLedgerSequence,
      mintedAt: mintedAtDate,
      stellarNetwork,
    });

    res.status(200).json({
      status: 'success',
      message: 'Verification job completed and certificate cache created',
      data: {
        verificationJob: result.verificationJob,
        certificate: result.certificate,
        webhookDispatched: result.webhookDispatched,
      },
    });
  } catch (error) {
    next(error);
  }
};
