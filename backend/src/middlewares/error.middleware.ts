import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  const genericMessage = error instanceof Error ? error.message : 'Internal server error';
  console.error('Unhandled error:', error);

  res.status(500).json({
    status: 'error',
    message: genericMessage,
  });
};
