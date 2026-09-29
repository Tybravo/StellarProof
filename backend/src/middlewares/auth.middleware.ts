import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { authService } from '../services/auth.service';
import { AppError } from '../errors/AppError';
import type { IUser } from '../models/User.model';

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No bearer token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Token is missing.',
    });
    return;
  }

  try {
    const user = await authService.verifyTokenAndGetUser(token);
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
      return;
    }

    if (error instanceof AppError) {
      if (error.code === 'USER_NOT_FOUND') {
        res.status(401).json({
          success: false,
          message: 'The user associated with this token no longer exists.',
        });
        return;
      }

      if (error.code === 'ACCOUNT_DEACTIVATED') {
        res.status(403).json({
          success: false,
          message: 'This account has been deactivated.',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'An internal error occurred during authentication.',
    });
  }
};

/**
 * Role guard. Must run after `protect`, which populates req.user.
 */
export const restrictTo =
  (...roles: IUser['role'][]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          'You do not have permission to perform this action',
          403,
          'FORBIDDEN'
        )
      );
      return;
    }

    next();
  };
