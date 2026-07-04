import { Request, Response, NextFunction } from 'express';
import { StrKey } from '@stellar/stellar-sdk';
import { userService } from '../services/user.service';
import { AppError } from '../errors/AppError';
import { IUser } from '../models/User.model';

export const connectWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stellarPublicKey } = req.body as { stellarPublicKey?: unknown };

    if (!stellarPublicKey || typeof stellarPublicKey !== 'string') {
      return next(new AppError('stellarPublicKey is required', 400, 'MISSING_FIELD'));
    }

    if (!StrKey.isValidEd25519PublicKey(stellarPublicKey)) {
      return next(
        new AppError('Invalid Stellar public key format', 400, 'INVALID_STELLAR_KEY')
      );
    }

    const userId = req.user!._id.toString();
    const updatedUser = await userService.connectWallet(userId, stellarPublicKey);

    res.status(200).json({
      success: true,
      message: 'Stellar wallet connected successfully',
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        stellarPublicKey: updatedUser.stellarPublicKey,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const user = await userService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        stellarPublicKey: user.stellarPublicKey ?? null,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const updates = req.body as Partial<IUser>;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return next(new AppError('Invalid request body', 400, 'INVALID_BODY'));
    }

    const updated = await userService.updateProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updated._id,
        email: updated.email,
        stellarPublicKey: updated.stellarPublicKey ?? null,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};













