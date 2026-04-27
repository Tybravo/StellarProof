import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import healthRoutes from './routes/health.routes';
import storageRoutes from './routes/v1/storage.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/storage', storageRoutes);

// Base route
app.get('/', (_req: Request, res: Response) => {
  res.send('StellarProof Backend API is running');
});

app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
import { createApp } from "./app";
import { initCloudinary } from "./config/cloudinary";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { startCleanupJob } from "./jobs/cleanup.job";
import { startVerificationTimeoutJob } from "./jobs/verificationTimeout.job";

function hasCloudinaryConfig(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function main(): Promise<void> {
  await connectDatabase();

  startVerificationTimeoutJob();

  if (hasCloudinaryConfig()) {
    initCloudinary();
    startCleanupJob();
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[Server] StellarProof backend listening on port ${env.PORT} (${env.NODE_ENV})`
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      console.log("[Server] HTTP server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});