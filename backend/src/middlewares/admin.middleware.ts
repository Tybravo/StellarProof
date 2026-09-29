import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError("Authentication is required", 401, "AUTH_REQUIRED"));
    return;
  }
  if (req.user.role !== "admin") {
    next(new AppError("Administrator access is required", 403, "ADMIN_REQUIRED"));
    return;
  }
  next();
}
