export type VerificationStatus = "pending" | "verified" | "failed" | "processing";

export interface VerificationRequest {
  id: string;
  date: string;
  contentHash: string;
  status: VerificationStatus;
}

const MOCK_REQUESTS: VerificationRequest[] = Array.from({ length: 37 }, (_, i) => ({
  id: `REQ-${String(i + 1).padStart(4, "0")}`,
  date: new Date(Date.now() - i * 86400000 * 2).toISOString().split("T")[0],
  contentHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}`,
  status: (["pending", "verified", "failed", "processing"] as VerificationStatus[])[i % 4],
}));

export const verificationService = {
  async getRequests(publicKey: string): Promise<VerificationRequest[]> {
    void publicKey;
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_REQUESTS;
  },
};