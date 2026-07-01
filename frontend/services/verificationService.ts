import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
} from "@stellar/stellar-sdk";

export interface SubmissionResult {
  txHash: string;
  requestId: string;
}

/**
 * Constructs and submits a verification request to the Soroban Smart Contract.
 * @param contentHash The SHA-256 hash of the content to verify
 * @param manifestHash Optional hash of the associated manifest metadata
 * @param publicKey The user's connected Stellar public key
 * @param signTx Function to sign transaction XDR using wallet
 * @param networkPassphrase Network passphrase for the Stellar network
 */
export const submitVerificationRequest = async (
  contentHash: string,
  manifestHash: string | null,
  publicKey: string,
  signTx: (xdr: string) => Promise<string>,
  networkPassphrase: string
): Promise<SubmissionResult> => {
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
  const contractId = process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID;

  if (!contractId) {
    throw new Error("Oracle contract ID not configured");
  }

  // Initialize Soroban RPC server
  const server = new SorobanRpc.Server(rpcUrl);

  // Get account sequence number
  const account = await server.getAccount(publicKey);

  // Prepare content hash as BytesN<32>
  // Remove 0x prefix if present
  const cleanHash = contentHash.startsWith("0x") ? contentHash.slice(2) : contentHash;
  const hashBuffer = Buffer.from(cleanHash, "hex");
  const contentHashVal = nativeToScVal(hashBuffer, { type: "bytes32" });

  // Build transaction
  const contract = new Contract(contractId);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call("submit_request", contentHashVal))
    .setTimeout(30)
    .build();

  // Prepare transaction with Soroban RPC
  const preparedTx = await server.prepareTransaction(transaction);

  // Sign transaction
  const signedXdr = await signTx(preparedTx.toXDR());

  // Submit transaction
  const submitResponse = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
  );

  if (submitResponse.status !== "PENDING") {
    throw new Error(`Failed to submit transaction: ${submitResponse.status}`);
  }

  // Poll for transaction status
  let getTxResponse;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    getTxResponse = await server.getTransaction(submitResponse.hash);

    if (getTxResponse.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
      break;
    }
    attempts++;
  }

  if (!getTxResponse || getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    throw new Error("Transaction not found after polling");
  }

  if (getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed: ${getTxResponse.resultMetaXdr}`);
  }

  // Parse request ID from transaction result
  const requestId = getTxResponse.returnValue?.value().toString() || "";

  return {
    txHash: submitResponse.hash,
    requestId,
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
