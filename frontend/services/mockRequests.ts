import type { Request } from "@/components/dashboard/RequestRow";

export const mockRequest: Request = {
  id: "1",
  hash: "0x1234567890abcdef1234567890abcdef",
  fullHash:
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  manifest: JSON.stringify(
    { name: "Example Manifest", version: "1.0" },
    null,
    2,
  ),
  attestation: JSON.stringify(
    { verifier: "TEE-Oracle", result: "ok" },
    null,
    2,
  ),
  timestamp: new Date().toISOString(),
  txHash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  certificateUrl: "https://example.com/certificate/1",
  status: "verified",
  registryStatus: "verified",
};
