import { Request, Response, NextFunction } from 'express';

export const jwtMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Simple middleware implementation
  next();
};