/**
 * Server entry point.
 * Connects to MongoDB, then starts the HTTP server.
 * Handles SIGTERM / SIGINT for graceful shutdown (important in Docker/K8s).
 */
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";

async function main(): Promise<void> {
  // Establish database connection before accepting HTTP traffic.
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(
      `[Server] StellarProof backend listening on port ${env.PORT} (${env.NODE_ENV})`
    );
  });

  // -------------------------------------------------------------------------
  // Graceful shutdown
  // -------------------------------------------------------------------------
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      console.log("[Server] HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds if connections don't drain in time.
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
