import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  // Mock validation middleware
  next();
};
export const validateBody = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  // Mock validation middleware
  next();
};

export const validateParams = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  // Mock validation middleware  
  next();
};