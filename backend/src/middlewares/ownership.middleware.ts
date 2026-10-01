/**
 * Ensures the authenticated caller owns the verification job they are
 * reading or mutating. Missing and non-owned jobs both return 404.
 */
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { verificationService } from "../services/verification.service";

function notFound(id?: string): AppError {
  return new AppError(
    id ? `Verification job not found: '${id}'` : "Verification job not found",
    StatusCodes.NOT_FOUND,
    "JOB_NOT_FOUND"
  );
}

function callerPublicKey(req: Request): string | undefined {
  const key = req.user?.stellarPublicKey;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

/**
 * For routes with a job `:id`. Must run after `protect`.
 */
export async function requireJobOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ownerPublicKey = callerPublicKey(req);
    const jobId = req.params.id;
    if (!ownerPublicKey || !jobId) {
      throw notFound(jobId);
    }

    await verificationService.assertJobOwner(jobId, ownerPublicKey);
    res.locals.ownerPublicKey = ownerPublicKey;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * For collection routes. Scopes the query to the caller and rejects a
 * requested ownerPublicKey that belongs to someone else with 404.
 * Must run after `protect`.
 */
export function scopeJobsToOwner(req: Request, res: Response, next: NextFunction): void {
  const ownerPublicKey = callerPublicKey(req);
  const requested = req.query.ownerPublicKey;
  const requestedKey = typeof requested === "string" ? requested : undefined;

  if (!ownerPublicKey || (requestedKey && requestedKey !== ownerPublicKey)) {
    next(notFound());
    return;
  }

  res.locals.ownerPublicKey = ownerPublicKey;
  next();
}
