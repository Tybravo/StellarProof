import type { AuthUser } from "@/services/auth";

/**
 * Key shared with `billingService.getAuthToken`, which reads `token` from it.
 * Browser storage is readable by any script on the page, so the token is kept
 * only until its own `exp` claim passes and is removed on logout.
 */
export const SESSION_STORAGE_KEY = "stellarproof_auth";

export interface StoredSession {
  isAuthenticated: true;
  token: string;
  user: AuthUser;
}

/** Returns the JWT `exp` claim in milliseconds, or null when unreadable. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiry = getTokenExpiryMs(token);
  return expiry !== null && expiry <= now;
}

export function saveSession(token: string, user: AuthUser): void {
  const session: StoredSession = { isAuthenticated: true, token, user };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Reads a valid, unexpired session; clears storage when it is stale. */
export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.token !== "string" ||
      !parsed.token ||
      !parsed.user ||
      typeof parsed.user.email !== "string" ||
      isTokenExpired(parsed.token)
    ) {
      clearSession();
      return null;
    }
    return { isAuthenticated: true, token: parsed.token, user: parsed.user };
  } catch {
    clearSession();
    return null;
  }
}
