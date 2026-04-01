/**
 * MongoDB connection management via Mongoose.
 * Called once from server.ts before the HTTP server starts.
 */
import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on("connected", () =>
    console.log("[MongoDB] Connection established")
  );
  mongoose.connection.on("error", (err: Error) =>
    console.error("[MongoDB] Connection error:", err.message)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("[MongoDB] Disconnected")
  );

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("[MongoDB] Connection closed");
}
