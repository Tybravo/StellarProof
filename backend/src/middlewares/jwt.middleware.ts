import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import User from '../models/User.model';

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const verifyJWT = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authorization token is required', 401, 'MISSING_TOKEN'));
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.userId).exec();
    if (!user || !user.isActive) {
      return next(new AppError('User not found or account deactivated', 401, 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
