/**
 * Client for the StellarProof auth API (`/api/v1/auth/*` and
 * `/api/v1/users/connect-wallet`).
 */

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const API_ROOT = `${API_BASE_URL.replace(/\/$/, "")}/api/v1`;

export const LOGIN_ENDPOINT = `${API_ROOT}/auth/login`;
export const REGISTER_ENDPOINT = `${API_ROOT}/auth/register`;
export const CONNECT_WALLET_ENDPOINT = `${API_ROOT}/users/connect-wallet`;

export interface AuthUser {
  id?: string;
  name?: string;
  email: string;
  role?: string;
  stellarPublicKey?: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export class AuthApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  options: { method: "POST" | "PUT"; body: unknown; token?: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(options.body),
    });
  } catch {
    throw new AuthApiError(
      "Unable to reach the server. Check your connection and try again.",
      0,
    );
  }

  let payload: { data?: T; message?: string; error?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new AuthApiError(
      payload?.message || payload?.error || `Request failed (${response.status})`,
      response.status,
    );
  }
  if (!payload || payload.data === undefined) {
    throw new AuthApiError("Unexpected response from the server.", response.status);
  }
  return payload.data;
}

async function login(email: string, password: string): Promise<LoginResult> {
  const data = await request<{ token?: unknown; user?: AuthUser }>(LOGIN_ENDPOINT, {
    method: "POST",
    body: { email, password },
  });
  if (typeof data.token !== "string" || !data.token || !data.user) {
    throw new AuthApiError("Unexpected response from the server.", 200);
  }
  return { token: data.token, user: data.user };
}

/** Creates the account. The API does not return a session; call `login` after. */
async function register(email: string, password: string): Promise<void> {
  await request<unknown>(REGISTER_ENDPOINT, {
    method: "POST",
    body: { email, password },
  });
}

async function connectWallet(token: string, stellarPublicKey: string): Promise<AuthUser> {
  return request<AuthUser>(CONNECT_WALLET_ENDPOINT, {
    method: "PUT",
    body: { stellarPublicKey },
    token,
  });
}

export const authService = { login, register, connectWallet };
