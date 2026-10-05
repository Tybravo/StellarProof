import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getOracleHealth } from "../services/oracleHealth.service";

export async function health(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(StatusCodes.OK).json({ success: true, data: await getOracleHealth() });
  } catch (error) {
    next(error);
  }
}
