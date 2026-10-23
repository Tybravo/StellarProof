import * as StellarSDK from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { walletService } from './wallet';

export type VoteChoice = 'for' | 'against' | 'abstain';

export interface CastVoteResult {
  txHash: string;
  proposalId: string;
  choice: VoteChoice;
}

// Configuration from environment (mirrors verificationService's contract wiring)
const HORIZON_URL = process.env.NEXT_PUBLIC_VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE || StellarSDK.Networks.TESTNET;
const GOVERNANCE_CONTRACT_ID = process.env.NEXT_PUBLIC_VITE_GOVERNANCE_CONTRACT_ID || '';

const server = new StellarSDK.Horizon.Server(HORIZON_URL);

function choiceToScVal(choice: VoteChoice): InstanceType<typeof StellarSDK.xdr.ScVal> {
  // Represent the vote choice as a Soroban symbol so it maps directly onto a
  // `vote(voter: Address, proposal_id: u64, choice: Symbol)` contract entrypoint.
  return StellarSDK.xdr.ScVal.scvSymbol(choice);
}

/**
 * Builds, signs (via Freighter), and submits an XLM-weighted governance vote
 * transaction against the on-chain voting contract.
 */
export async function castVote(
  proposalId: string,
  choice: VoteChoice,
  publicKey: string
): Promise<CastVoteResult> {
  if (!GOVERNANCE_CONTRACT_ID) {
    throw new Error('Governance contract ID not configured. Please check your environment variables.');
  }

  if (!publicKey) {
    throw new Error('Connect a wallet before voting.');
  }

  try {
    const networkDetails = await walletService.getNetworkDetails();
    const networkPassphrase = networkDetails?.networkPassphrase || NETWORK_PASSPHRASE;

    const account = await server.loadAccount(publicKey);
    const contract = new StellarSDK.Contract(GOVERNANCE_CONTRACT_ID);

    const params = [
      StellarSDK.Address.fromString(publicKey).toScVal(),
      StellarSDK.nativeToScVal(proposalId, { type: 'u64' }),
      choiceToScVal(choice),
    ];

    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call('vote', ...params))
      .setTimeout(30)
      .build();

    const signedResult = await signTransaction(transaction.toXDR(), {
      address: publicKey,
      networkPassphrase,
    });

    const signedXDR = signedResult?.signedTxXdr;
    if (!signedXDR) {
      throw new Error('No signed transaction XDR returned from Freighter');
    }

    const submitted = await server.submitTransaction(
      StellarSDK.TransactionBuilder.fromXDR(signedXDR, networkPassphrase)
    );

    return {
      txHash: submitted.hash,
      proposalId,
      choice,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('User declined') ||
        error.message.includes('rejected') ||
        error.message.includes('Rejected')
      ) {
        throw new Error('You declined the signing request.');
      }

      if (error.message.includes('tx_bad_seq')) {
        throw new Error('Transaction sequence error. Please try again.');
      }

      if (error.message.includes('insufficient balance')) {
        throw new Error('Insufficient balance to submit your vote.');
      }

      throw error;
    }

    throw new Error('An unexpected error occurred while casting your vote.');
  }
}
