import { z } from 'zod';

export const manifestSchema = z.object({
  contentHash: z.string().min(1, "contentHash is required"),
  creator: z.string().min(1, "creator is required").regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar public key"),
  timestamp: z.string().min(1, "timestamp is required").datetime({ message: "Invalid timestamp format, must be ISO 8601" }),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type ManifestSchema = z.infer<typeof manifestSchema>;

export const validateManifest = (data: unknown) => {
  return manifestSchema.safeParse(data);
};
