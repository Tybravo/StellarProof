const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

/** Stellar network identifier for display and comparison. */
export type StellarNetworkId = "mainnet" | "testnet" | "futurenet" | "unknown";

export interface NetworkDetails {
  network: StellarNetworkId;
  networkPassphrase: string;
}

export type WalletConnectionResult =
  | { address: string; error?: undefined }
  | { address?: undefined; error: string };

export interface WalletService {
  isInstalled(): Promise<boolean>;
  requestAccess(): Promise<WalletConnectionResult>;
  getAddress(): Promise<string | null>;
  getNetworkDetails(): Promise<NetworkDetails | null>;
}

async function isFreighterInstalled(): Promise<boolean> {
  try {
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    const value = typeof result === "object" && result !== null ? result.isConnected : !!result;
    return Boolean(value);
  } catch {
    return false;
  }
}

function toErrorString(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "No address returned";
}

async function requestFreighterAccess(): Promise<WalletConnectionResult> {
  const { requestAccess } = await import("@stellar/freighter-api");
  const res = await requestAccess();
  if (res.error) return { error: toErrorString(res.error) };
  if (res.address) return { address: res.address };
  return { error: "No address returned" };
}

async function getFreighterAddress(): Promise<string | null> {
  try {
    const { getAddress } = await import("@stellar/freighter-api");
    const res = await getAddress();
    if (res?.address) return res.address;
    return null;
  } catch {
    return null;
  }
}

const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const FUTURENET_PASSPHRASE = "Test SDF Future Network ; October 2022";

function networkIdFromPassphrase(passphrase: string): StellarNetworkId {
  if (passphrase === MAINNET_PASSPHRASE) return "mainnet";
  if (passphrase === TESTNET_PASSPHRASE) return "testnet";
  if (passphrase === FUTURENET_PASSPHRASE) return "futurenet";
  return "unknown";
}

interface FreighterNetworkResponse {
  network?: string;
  networkPassphrase?: string;
  error?: { code?: number; message?: string };
}

async function getFreighterNetworkDetails(): Promise<NetworkDetails | null> {
  try {
    const { getNetworkDetails } = await import("@stellar/freighter-api");
    const res = (await getNetworkDetails()) as FreighterNetworkResponse | undefined;
    if (!res || res.error) return null;
    const passphrase = res.networkPassphrase ?? "";
    const rawNetwork = (res.network ?? "").toLowerCase();
    const network: StellarNetworkId =
      rawNetwork === "mainnet" || rawNetwork === "testnet" || rawNetwork === "futurenet"
        ? rawNetwork
        : networkIdFromPassphrase(passphrase);
    return {
      network,
      networkPassphrase: passphrase || (network === "mainnet" ? MAINNET_PASSPHRASE : network === "testnet" ? TESTNET_PASSPHRASE : network === "futurenet" ? FUTURENET_PASSPHRASE : ""),
    };
  } catch {
    return null;
  }
}

const MOCK_PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const MOCK_NETWORK: NetworkDetails = {
  network: "testnet",
  networkPassphrase: TESTNET_PASSPHRASE,
};

export function createWalletService(useMock = false): WalletService {
  if (useMock) {
    return {
      async isInstalled() {
        return true;
      },
      async requestAccess() {
        return { address: MOCK_PUBLIC_KEY };
      },
      async getAddress() {
        return MOCK_PUBLIC_KEY;
      },
      async getNetworkDetails() {
        return MOCK_NETWORK;
      },
    };
  }
  return {
    isInstalled: isFreighterInstalled,
    requestAccess: requestFreighterAccess,
    getAddress: getFreighterAddress,
    getNetworkDetails: getFreighterNetworkDetails,
  };
}

export const walletService = createWalletService(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_MOCK_WALLET === "true"
);

export { FREIGHTER_INSTALL_URL };
