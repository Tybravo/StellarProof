export interface SubmissionResult {
  txHash: string;
  requestId: string;
}

/**
 * Constructs and submits a verification request to the Soroban Smart Contract.
 * @param contentHash The SHA-256 hash of the content to verify
 * @param manifestHash Optional hash of the associated manifest metadata
 * @param publicKey The user's connected Stellar public key
 */
export const submitVerificationRequest = async (
  contentHash: string,
  manifestHash: string | null,
  publicKey: string
): Promise<SubmissionResult> => {
  void publicKey;

  // 1. MOCK IMPLEMENTATION (For Development/UI Testing)
  // In a real scenario, we'd fetch the network passphrase and contract ID from env
  console.log("Constructing Soroban transaction for:", { contentHash, manifestHash });

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Randomly simulate a user rejection for testing (10% chance)
  if (Math.random() < 0.1) {
    throw new Error("User declined the signing request");
  }

  // Return mock success data
  return {
    txHash: "abc123mockTransactionHash789xyz",
    requestId: `req-${Math.random().toString(36).substring(7)}`,
  };
};

/**
 * NOTE: When the backend is ready, this will use @stellar/stellar-sdk 
 * to invoke the 'submit_request' function on the deployed Soroban contract.
 * Example:
 * const contract = new Contract(CONTRACT_ID);
 * const tx = new TransactionBuilder(...)
 * .addOperation(contract.call("submit_request", ...))
 * .build();
 */
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
