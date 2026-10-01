/**
 * Authenticates the trusted TEE oracle on the callback route.
 * Accepts either a shared API key or an HMAC-SHA256 of the JSON body.
 * Requests without a configured secret or a matching credential are rejected.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";

const API_KEY_HEADER = "x-oracle-api-key";
const HMAC_HEADER = "x-oracle-signature";

function safeEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function unauthorized(): AppError {
  return new AppError(
    "Invalid oracle credentials",
    StatusCodes.UNAUTHORIZED,
    "ORACLE_AUTH_FAILED"
  );
}

export function oracleAuth(req: Request, _res: Response, next: NextFunction): void {
  const configured = env.ORACLE_CALLBACK_KEY;
  if (!configured) {
    next(unauthorized());
    return;
  }

  const apiKey = req.header(API_KEY_HEADER)?.trim();
  if (apiKey && safeEqual(apiKey, configured)) {
    next();
    return;
  }

  const signature = req.header(HMAC_HEADER)?.trim();
  if (signature) {
    const payload = JSON.stringify(req.body ?? {});
    const computed = createHmac("sha256", configured).update(payload).digest("hex");
    if (safeEqual(signature.toLowerCase(), computed)) {
      next();
      return;
    }
  }

  next(unauthorized());
}
