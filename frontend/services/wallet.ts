const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

export type WalletConnectionResult =
  | { address: string; error?: undefined }
  | { address?: undefined; error: string };

export interface WalletService {
  isInstalled(): Promise<boolean>;
  requestAccess(): Promise<WalletConnectionResult>;
  getAddress(): Promise<string | null>;
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

const MOCK_PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

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
    };
  }
  return {
    isInstalled: isFreighterInstalled,
    requestAccess: requestFreighterAccess,
    getAddress: getFreighterAddress,
  };
}

export const walletService = createWalletService(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_MOCK_WALLET === "true"
);

export { FREIGHTER_INSTALL_URL };
