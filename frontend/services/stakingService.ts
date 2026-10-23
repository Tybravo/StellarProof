import * as StellarSDK from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { walletService } from './wallet';

export interface StakePosition {
  /** Current XLM collateral staked by this operator. */
  stakedXlm: number;
  /** Minimum XLM collateral required to remain an active Oracle node. */
  minRequiredXlm: number;
  /** Accrued staking rewards in XLM, available to claim. */
  pendingRewardsXlm: number;
}

export interface StakeActionResult {
  txHash: string;
  amountXlm: number;
}

const HORIZON_URL = process.env.NEXT_PUBLIC_VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE || StellarSDK.Networks.TESTNET;
const REGISTRY_CONTRACT_ID = process.env.NEXT_PUBLIC_VITE_REGISTRY_CONTRACT_ID || '';

const server = new StellarSDK.Horizon.Server(HORIZON_URL);

function xlmToStroopsScVal(amountXlm: number): InstanceType<typeof StellarSDK.xdr.ScVal> {
  const stroops = BigInt(Math.round(amountXlm * 10_000_000));
  return StellarSDK.nativeToScVal(stroops, { type: 'i128' });
}

async function callRegistryAmountFn(
  method: 'stake' | 'unstake',
  amountXlm: number,
  publicKey: string
): Promise<StakeActionResult> {
  if (!REGISTRY_CONTRACT_ID) {
    throw new Error('Registry contract ID not configured. Please check your environment variables.');
  }

  if (!publicKey) {
    throw new Error('Connect a wallet before managing your stake.');
  }

  if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
    throw new Error('Enter an amount greater than zero.');
  }

  try {
    const networkDetails = await walletService.getNetworkDetails();
    const networkPassphrase = networkDetails?.networkPassphrase || NETWORK_PASSPHRASE;

    const account = await server.loadAccount(publicKey);
    const contract = new StellarSDK.Contract(REGISTRY_CONTRACT_ID);

    const params = [
      StellarSDK.Address.fromString(publicKey).toScVal(),
      xlmToStroopsScVal(amountXlm),
    ];

    const transaction = new StellarSDK.TransactionBuilder(account, {
      fee: StellarSDK.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call(method, ...params))
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

    return { txHash: submitted.hash, amountXlm };
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
        throw new Error('Insufficient balance for this operation.');
      }

      throw error;
    }

    throw new Error('An unexpected error occurred while updating your stake.');
  }
}

/**
 * Deposits (stakes) XLM collateral into the registry contract, signed with
 * the connected Freighter wallet.
 */
export function stake(amountXlm: number, publicKey: string): Promise<StakeActionResult> {
  return callRegistryAmountFn('stake', amountXlm, publicKey);
}

/**
 * Withdraws (unstakes) XLM collateral from the registry contract, signed
 * with the connected Freighter wallet.
 */
export function unstake(amountXlm: number, publicKey: string): Promise<StakeActionResult> {
  return callRegistryAmountFn('unstake', amountXlm, publicKey);
}

function simulateDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the connected operator's current stake position. Backed by mock
 * data until a backend / indexer endpoint for the registry contract is
 * available, matching the pattern used by `registryService`.
 */
export async function getStakePosition(_publicKey: string): Promise<StakePosition> {
  await simulateDelay();
  return {
    stakedXlm: 12500,
    minRequiredXlm: 5000,
    pendingRewardsXlm: 184.32,
  };
}
