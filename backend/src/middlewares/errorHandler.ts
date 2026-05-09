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
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      error: "Database validation error",
      details: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: `Invalid value for field '${err.path}'`,
    });
    return;
  }

  if (err instanceof mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "field";
    res.status(StatusCodes.CONFLICT).json({
      success: false,
      error: `Duplicate value for '${field}'`,
      code: "DUPLICATE_KEY",
    });
    return;
  }

  console.error("[Unhandled Error]", err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : (err as Error).message ?? "Internal server error",
  });
};
