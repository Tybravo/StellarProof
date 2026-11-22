import * as StellarSDK from '@stellar/stellar-sdk';
import { signWithFreighter, transactionErrorMessage } from '@/hooks/useSignTransaction';
import { walletService } from './wallet';

export interface SubmissionResult {
  txHash: string;
  requestId: string;
  certificateId?: string;
}

// Configuration from environment
const HORIZON_URL = process.env.NEXT_PUBLIC_VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE || StellarSDK.Networks.TESTNET;
const CONTRACT_ID = process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID || '';

// Initialize Horizon server
const server = new StellarSDK.Horizon.Server(HORIZON_URL);

export const submitVerificationRequest = async (
  contentHash: string,
  manifestHash: string | null,
  publicKey: string,
  onSigningChange?: (signing: boolean) => void
): Promise<SubmissionResult> => {
  try {
    if (!CONTRACT_ID) {
      throw new Error('Soroban contract ID not configured. Please check your environment variables.');
    }

    console.log('Submitting verification request to Provenance contract:', {
      contentHash,
      manifestHash,
      publicKey,
    });

    const networkDetails = await walletService.getNetworkDetails();
    const networkPassphrase = networkDetails?.networkPassphrase || NETWORK_PASSPHRASE;

    const account = await server.loadAccount(publicKey);
    const contract = new StellarSDK.Contract(CONTRACT_ID);

    const details = JSON.stringify({
      content_hash: contentHash,
      metadata: manifestHash || 'No manifest provided',
      timestamp: new Date().toISOString(),
    });

    const params = [
      StellarSDK.Address.fromString(publicKey).toScVal(),
      StellarSDK.xdr.ScVal.scvString(details),
    ];

    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase: networkPassphrase,
    })
      .addOperation(contract.call('mint', ...params))
      .setTimeout(30)
      .build();

    let signedXDR: string;
    onSigningChange?.(true);
    try {
      signedXDR = await signWithFreighter(transaction.toXDR(), {
        address: publicKey,
        networkPassphrase,
      });
    } finally {
      onSigningChange?.(false);
    }

    // Submit the transaction
    const submittedTransaction = await server.submitTransaction(
      StellarSDK.TransactionBuilder.fromXDR(signedXDR, networkPassphrase)
    );

    // Generate a request ID
    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}`;

    // Try to extract certificate ID from transaction
    let certificateId = '';
    try {
      if (submittedTransaction.result_xdr) {
        certificateId = submittedTransaction.hash.substring(0, 8);
      }
    } catch (_parseError) {
      // Silent catch - certificate ID is optional
    }

    console.log('Transaction successful:', {
      txHash: submittedTransaction.hash,
      requestId,
      certificateId: certificateId || 'N/A',
    });

    return {
      txHash: submittedTransaction.hash,
      requestId,
      certificateId: certificateId || undefined,
    };
  } catch (error) {
    console.error('Error submitting verification request:', error);

    throw new Error(transactionErrorMessage(error));
  }
};

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'processing';

export interface VerificationRequest {
  id: string;
  date: string;
  contentHash: string;
  status: VerificationStatus;
  txHash?: string;
  manifestHash?: string;
  certificateId?: string;
}

export const getVerificationRequests = async (_publicKey: string): Promise<VerificationRequest[]> => {
  try {
    return getMockRequests();
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return getMockRequests();
  }
};

function getMockRequests(): VerificationRequest[] {
  const statuses: VerificationStatus[] = ['pending', 'verified', 'failed', 'processing'];

  return Array.from({ length: 5 }, (_, i) => ({
    id: `REQ-${String(i + 1).padStart(4, '0')}`,
    date: new Date(Date.now() - i * 86400000 * 2).toISOString().split('T')[0],
    contentHash: `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`,
    status: statuses[i % 4],
    txHash: i % 2 === 0 ? `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` : undefined,
    manifestHash: i % 3 === 0 ? `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` : undefined,
    certificateId: i % 2 === 0 ? `${i + 1}` : undefined,
  }));
}

export const checkVerificationStatus = async (
  _requestId: string,
  _publicKey: string
): Promise<VerificationStatus> => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statuses: VerificationStatus[] = ['pending', 'verified', 'failed'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  } catch (error) {
    console.error('Error checking verification status:', error);
    return 'pending';
  }
};

export const verificationService = {
  async getRequests(publicKey: string): Promise<VerificationRequest[]> {
    return getVerificationRequests(publicKey);
  },
  async checkStatus(requestId: string, publicKey: string): Promise<VerificationStatus> {
    return checkVerificationStatus(requestId, publicKey);
  },
};
