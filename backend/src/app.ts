/**
 * Express application factory.
 *
 * Kept separate from the server entry point so the app can be imported in
 * tests without binding a network port.
 */
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import rootRouter from "./routes";
import { globalErrorHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  // -------------------------------------------------------------------------
  // Security headers (sets Content-Security-Policy, X-Frame-Options, etc.)
  // -------------------------------------------------------------------------
  app.use(helmet());

  // -------------------------------------------------------------------------
  // CORS
  // -------------------------------------------------------------------------
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // -------------------------------------------------------------------------
  // HTTP request logging
  // -------------------------------------------------------------------------
  app.use(morgan(env.LOG_LEVEL));

  // -------------------------------------------------------------------------
  // Body parsing
  // -------------------------------------------------------------------------
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // -------------------------------------------------------------------------
  // Application routes
  // -------------------------------------------------------------------------
  app.use(rootRouter);

  // -------------------------------------------------------------------------
  // 404 handler – catch unmatched routes
  // -------------------------------------------------------------------------
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      error: "Route not found",
    });
  });

  // -------------------------------------------------------------------------
  // Global error handler – must be registered last
  // -------------------------------------------------------------------------
  app.use(globalErrorHandler);

  return app;
}
