import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../errors/AppError';

/**
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string') {
      return next(new AppError('Email and password must be strings', 400, 'INVALID_INPUT'));
    }

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/register
 *
 * Accepts { email, password, role? } and creates a new user account.
 * Password hashing is handled by the User model pre-save hook.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    // ── Basic input validation ───────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Email is required.',
      });
      return;
    }

    if (!password || typeof password !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Password is required.',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
      return;
    }

    if (role && !['creator', 'developer'].includes(role)) {
      res.status(400).json({
        status: 'error',
        message: 'Role must be either "creator" or "developer".',
      });
      return;
    }

    // ── Delegate to service layer ────────────────────────────────────────────
    const result = await authService.register({ email, password, role });

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: result,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
      return;
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e: any) => e.message);
      res.status(400).json({
        status: 'error',
        message: messages.join(' '),
      });
      return;
    }

    next(err);
  }
};