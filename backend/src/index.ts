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