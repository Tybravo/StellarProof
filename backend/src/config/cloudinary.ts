import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

/**
 * Initialize Cloudinary SDK with environment variables.
 * This is called at server startup.
 */
export const initCloudinary = (): void => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    console.warn("[Config] Cloudinary credentials missing. Media uploads will fail.");
    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  console.log("[Config] Cloudinary initialized successfully");
};

export { cloudinary };