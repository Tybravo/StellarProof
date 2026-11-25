/**
 * Best-effort fixed-window rate limiting for the checkout endpoints.
 *
 * LIMITATION (read before relying on this)
 * ----------------------------------------
 * The counters live in module memory, so a limit is enforced per server
 * instance. On a serverless platform (this app ships with `vercel.json`) each
 * cold start gets its own empty map and concurrent instances do not share
 * state, so a determined caller can exceed the nominal limit by fanning out.
 *
 * It is therefore defence-in-depth against accidental loops, double-clicks and
 * naive scripted abuse - NOT a security boundary. A durable limiter (Redis,
 * Upstash, a WAF rule, or the platform's own edge rate limiting) is required
 * before these endpoints are exposed publicly, and is tracked alongside the
 * authentication work in `lib/checkout/availability.ts`.
 */

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the caller should wait; 0 when allowed. */
  retryAfterSeconds: number;
}

/** Creating a PaymentIntent calls Stripe, so it is the tighter budget. */
export const CREATE_INTENT_LIMIT: RateLimitOptions = { limit: 8, windowMs: 60_000 };

/** Status checks are cheap and legitimately polled after a confirmation. */
export const STATUS_CHECK_LIMIT: RateLimitOptions = { limit: 30, windowMs: 60_000 };

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Drops expired windows so the map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Derives a stable requester key from proxy headers.
 *
 * This is a weak identity - headers can be spoofed unless a trusted proxy sets
 * them - which is another reason this is not a security boundary. It is the
 * best available signal until requests carry an authenticated user.
 */
export function getRequesterKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Records one request against `key` and reports whether it may proceed. */
export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test hook: clears all counters. */
export function resetRateLimits(): void {
  windows.clear();
}
