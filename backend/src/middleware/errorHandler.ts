/**
 * Global Express error-handling middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Handles:
 *  - AppError            → operational errors with known HTTP status codes.
 *  - Mongoose errors     → mapped to 400 / 422 / 409 where appropriate.
 *  - Unknown errors      → 500, with details hidden in production.
 */
import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { Error as MongooseError, mongo } from "mongoose";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next
): void => {
  // 1. Known operational errors thrown by service layer.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // 2. Mongoose field-level validation errors → 422.
  if (err instanceof MongooseError.ValidationError) {
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      error: "Database validation error",
      details: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId format) → 400.
  if (err instanceof MongooseError.CastError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: `Invalid value for field '${err.path}'`,
    });
    return;
  }

  // 4. MongoDB duplicate-key error (code 11000) → 409.
  if (err instanceof mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "field";
    res.status(StatusCodes.CONFLICT).json({
      success: false,
      error: `Duplicate value for '${field}'`,
      code: "DUPLICATE_KEY",
    });
    return;
  }

  // 5. Catch-all: log server-side, expose details only outside production.
  console.error("[Unhandled Error]", err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : (err as Error).message ?? "Internal server error",
  });
};
