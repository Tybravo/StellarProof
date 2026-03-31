import { NextFunction, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { HttpError } from '../utils/httpError';

export const verifyApiKey = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKeyHeader = req.header('x-api-key');

    if (!apiKeyHeader) {
      throw new HttpError(401, 'Missing x-api-key header');
    }

    const user = await userService.findActiveUserByApiKey(apiKeyHeader.trim());
    if (!user) {
      throw new HttpError(401, 'Invalid API key');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
