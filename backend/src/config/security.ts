/**
 * Security configuration for the StellarProof backend.
 *
 * Centralises:
 *  - Rate limiting  (express-rate-limit) applied to all /api/v1 routes
 *  - CORS policy    (cors) restricted to trusted frontend domains
 *
 * Both configs read from environment variables so they can be adjusted per
 * deployment without code changes.
 */

import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import cors, { type CorsOptions } from 'cors';
import { env } from './env';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a comma-separated list of trusted origins from an env variable.
 * Falls back to a single origin string when no commas are present.
 *
 * Example env value:
 *   CORS_ALLOWED_ORIGINS=https://stellarproof.io,https://app.stellarproof.io
 */
function parseTrustedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? env.CORS_ORIGIN;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const trustedOrigins = parseTrustedOrigins();

/**
 * CORS options that restrict cross-origin access to the configured trusted
 * frontend domains only.  Unknown origins receive a 403 from the cors
 * middleware before the request reaches any route handler.
 */
export const corsOptions: CorsOptions = {
  origin: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void => {
    // Allow server-to-server requests (no Origin header) and trusted origins.
    if (!requestOrigin || trustedOrigins.includes(requestOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${requestOrigin}' is not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
};

/** Pre-built cors middleware ready to be mounted with `app.use(corsMiddleware)`. */
export const corsMiddleware = cors(corsOptions);

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * General API rate limiter applied to all /api/v1/* routes.
 *
 * Defaults (overridable via env):
 *   RATE_LIMIT_WINDOW_MS   = 15 minutes
 *   RATE_LIMIT_MAX         = 100 requests per window per IP
 */
export const apiV1RateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000),
    10
  ),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  standardHeaders: true,   // Return rate-limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests — please try again later.',
  },
  skip: (): boolean => {
    // Skip rate limiting in test environments to avoid flaky tests
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Stricter rate limiter for authentication endpoints to slow down brute-force
 * attacks.
 *
 * Defaults (overridable via env):
 *   AUTH_RATE_LIMIT_WINDOW_MS  = 15 minutes
 *   AUTH_RATE_LIMIT_MAX        = 20 requests per window per IP
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000),
    10
  ),
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts — please try again later.',
  },
  skip: (): boolean => process.env.NODE_ENV === 'test',
});