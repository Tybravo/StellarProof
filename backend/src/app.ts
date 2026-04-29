/**
 * Express application factory.
 *
 * Kept separate from the server entry point so the app can be imported in
 * tests without binding a network port.
 */

import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { setupSwagger } from './docs/swagger';

import morgan from 'morgan';
import { env } from './config/env';
import { corsMiddleware, apiV1RateLimiter, authRateLimiter } from './config/security';
import rootRouter from './routes';
import { globalErrorHandler } from './middlewares/errorHandler';

export function createApp(): Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  // Sets Content-Security-Policy, X-Frame-Options, HSTS, etc.
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Restricts cross-origin access to configured trusted frontend domains only.
  app.use(corsMiddleware);

  // ── HTTP request logging ──────────────────────────────────────────────────
  app.use(morgan(env.LOG_LEVEL));

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Rate limiting ─────────────────────────────────────────────────────────
  // Stricter limiter for auth endpoints first (more specific path wins).
  app.use('/api/v1/auth', authRateLimiter);
  // General limiter for all remaining /api/v1 routes.
  app.use('/api/v1', apiV1RateLimiter);

  // ── Application routes ────────────────────────────────────────────────────
  app.use(rootRouter);

  setupSwagger(app); // ← add this

  // -------------------------------------------------------------------------
  // 404 handler – catch unmatched routes
  // -------------------------------------------------------------------------
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // Must be registered last so it catches errors from all middleware above.
  app.use(globalErrorHandler);



  return app;

}

















