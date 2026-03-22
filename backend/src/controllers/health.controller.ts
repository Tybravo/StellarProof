import { Request, Response } from 'express';
import mongoose from 'mongoose';

export const checkHealth = (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState;
  
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };

  res.status(200).json({
    status: 'success',
    message: 'Backend API is healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: statusMap[dbStatus as keyof typeof statusMap] || 'unknown',
    }
  });
};
