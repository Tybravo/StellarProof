/**
 * Request validation middleware factory.
 * Accepts a Zod schema and returns an Express middleware that validates
 * `req.body` or `req.params` and responds with 422/400 on failure.
 */
import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

/**
 * Validates `req.body` against `schema`.
 * On success, replaces `req.body` with the parsed (coerced) output.
 * On failure, sends 422 Unprocessable Entity with field-level errors.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        error: "Validation failed",
        details: (result.error as ZodError).flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates `req.params` against `schema`.
 * On failure, sends 400 Bad Request with field-level errors.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Invalid route parameters",
        details: (result.error as ZodError).flatten().fieldErrors,
      });
      return;
    }
    next();
  };
}
