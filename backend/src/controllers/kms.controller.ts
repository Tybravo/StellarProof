import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import * as kmsService from "../services/kms.service";

export async function rotateKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId =
      ((req as any).user?.id as string | undefined) ??
      (req.body?.userId as string | undefined);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: "fail",
        message: "Invalid userId",
      });
      return;
    }

    const result = await kmsService.rotateKey(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserKeys(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: "fail",
        message: "Invalid userId",
      });
      return;
    }

    const keys = await kmsService.getAllKeys(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: keys,
    });
  } catch (error) {
    next(error);
  }
}

export async function getActiveKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: "fail",
        message: "Invalid userId",
      });
      return;
    }

    const key = await kmsService.getActiveKey(userId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: key,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const keyId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(keyId)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: "fail",
        message: "Invalid key id",
      });
      return;
    }

    const key = await kmsService.revokeKey(keyId);
    res.status(StatusCodes.OK).json({
      status: "success",
      data: key,
    });
  } catch (error) {
    next(error);
  }
}
