import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

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
