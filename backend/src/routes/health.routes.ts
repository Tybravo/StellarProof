import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

import { checkHealth } from '../controllers/health.controller';

const router = Router();

router.get('/', checkHealth);


/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the current health status of the API and database connection
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;

  const isHealthy = dbState === 1; // 1 = connected

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isHealthy ? 'connected' : 'disconnected',
  });
});


export default router;
