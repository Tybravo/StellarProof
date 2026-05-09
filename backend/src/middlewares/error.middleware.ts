import type { ErrorRequestHandler, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { Error as MongooseError, mongo } from "mongoose";
import { HttpError } from "../utils/httpError";

const isProduction = process.env.NODE_ENV === "production";

export const notFoundHandler: RequestHandler = (req, res): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      status: "fail",
      message: "Validation failed for one or more fields",
      errors: Object.values(err.errors).map((e) => e.message),
      ...(!isProduction ? { stack: err.stack } : {}),
    });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      status: "fail",
      message: `Invalid ${err.path}: ${err.value}`,
      ...(!isProduction ? { stack: err.stack } : {}),
    });
    return;
  }

  if (err instanceof mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "field";
    res.status(StatusCodes.CONFLICT).json({
      status: "fail",
      message: `Duplicate value for ${field}. Please use a different value.`,
      ...(!isProduction ? { stack: err.stack } : {}),
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: "error",
    message: err instanceof Error ? err.message : "Internal server error",
    ...(!isProduction && err instanceof Error ? { stack: err.stack } : {}),
  });
};
