/**
 * KMS key management API service.
 *
 * Talks to the StellarProof backend KMS endpoints (`/api/v1/kms/*`) using the
 * standard `{ success, data, error }` response envelope.
 */

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const KMS_BASE_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/api/v1/kms`;

export interface RotateKeyResult {
  oldKeyVersion: string;
  newKeyVersion: string;
  assetsReEncrypted: number;
}

export interface RotateKeyOptions {
  /** Optional asset or storage identifier associated with the rotation trigger. */
  assetId?: string;
  /** AbortSignal so callers can cancel an in-flight rotation request. */
  signal?: AbortSignal;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("stellarproof_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token.length > 0
      ? parsed.token
      : null;
  } catch {
    return null;
  }
}

export function buildRotateKeyEndpoint(userId: string): string {
  return `${KMS_BASE_ENDPOINT}/rotate/${encodeURIComponent(userId)}`;
}

/**
 * Triggers a KMS key rotation for the given asset owner / user ID.
 * Throws a user-facing `Error` when the request fails or the backend rejects it.
 */
export async function rotateKmsKey(
  userId: string,
  options: RotateKeyOptions = {},
): Promise<RotateKeyResult> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("Owner ID is required to rotate the KMS key.");
  }

  const token = readAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildRotateKeyEndpoint(trimmedUserId), {
      method: "POST",
      headers,
      body: JSON.stringify(
        options.assetId ? { assetId: options.assetId } : {},
      ),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new Error(
      "Unable to reach the StellarProof KMS API. Check your connection and try again.",
    );
  }

  let body: ApiEnvelope<Partial<RotateKeyResult>> | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<Partial<RotateKeyResult>>;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body || body.success === false) {
    throw new Error(
      body?.error ??
        body?.message ??
        `KMS key rotation failed with status ${response.status}.`,
    );
  }

  const data = body.data;
  if (
    !data ||
    typeof data.oldKeyVersion !== "string" ||
    typeof data.newKeyVersion !== "string" ||
    typeof data.assetsReEncrypted !== "number"
  ) {
    throw new Error("Unexpected response shape from the KMS rotation API.");
  }

  return {
    oldKeyVersion: data.oldKeyVersion,
    newKeyVersion: data.newKeyVersion,
    assetsReEncrypted: data.assetsReEncrypted,
  };
}
