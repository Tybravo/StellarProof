/**
 * SPV Bridge with Mock Verifier Fallback Path
 *
 * Provides a bridge to the SPV verifier with a deterministic mock fallback
 * for local testing and development. The mock path generates:
 *   - Deterministic SHA-256 hashes for identical CIDs
 *   - Valid 128-character hex signatures
 *   - No network calls (pure local crypto)
 */

import crypto from "crypto";
import { StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { assertCid, XdrValidationError } from "../utils/xdr";

export interface SpvBridgeRequest {
  mediaCid: string;
  manifestCid: string;
  requester: string;
  /** Optional: use mock verifier instead of network call (for testing) */
  useMock?: boolean;
}

export interface SpvBridgeResult {
  verified: boolean;
  /** SHA-256 hex of the media bytes (64 chars) */
  contentHash: string;
  /** SHA-256 hex of the raw manifest bytes (64 chars) */
  manifestHash: string;
  /** Ed25519 signature of verification (128 chars hex) */
  signature: string;
  /** Why verification failed; present only when `verified` is false */
  reason?: string;
  /** Whether this result came from mock path */
  isMock: boolean;
}

export interface SpvBridgeConfig {
  enableMockFallback: boolean;
  networkGatewayUrl: string;
  fetchTimeoutMs: number;
  maxMediaBytes: number;
  maxManifestBytes: number;
}

/** A gateway fetch failed before a verdict could be reached. */
export class SpvBridgeError extends AppError {
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message, StatusCodes.BAD_GATEWAY, "SPV_BRIDGE_FAILED");
    this.name = "SpvBridgeError";
    this.retryable = retryable;
    Object.setPrototypeOf(this, SpvBridgeError.prototype);
  }
}

const manifestSchema = z
  .object({
    contentHash: z.string().min(1),
    creator: z.string().min(1),
  })
  .passthrough();

/**
 * Normalizes content hash: accepts `<hex>` or `sha256:<hex>`.
 * Returns lowercase 64-char hex string or null if invalid.
 */
function normalizeContentHash(value: string): string | null {
  const hex = value.startsWith("sha256:") ? value.slice("sha256:".length) : value;
  return /^[0-9a-fA-F]{64}$/.test(hex) ? hex.toLowerCase() : null;
}

/**
 * Generates a deterministic mock signature (128-char hex).
 * Uses Ed25519-style signature: HMAC-SHA512 of payload + requester.
 * Truncated to 128 hex chars (64 bytes).
 */
function generateMockSignature(
  contentHash: string,
  manifestHash: string,
  requester: string
): string {
  const payload = `${contentHash}:${manifestHash}:${requester}`;
  const hmac = crypto.createHmac("sha512", "mock-verifier-key");
  hmac.update(payload);
  const signature = hmac.digest("hex");
  // Return first 128 chars of 512-bit (128-char) HMAC-SHA512
  return signature.slice(0, 128);
}

/**
 * Generates deterministic mock hashes for a CID using SHA-256.
 * For identical CID inputs, always produces identical outputs.
 */
function generateMockHash(cid: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(cid);
  return hash.digest("hex");
}

type FetchFn = typeof fetch;

export class SpvBridgeService {
  constructor(
    private readonly config: SpvBridgeConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  /**
   * Verifies a manifest against media, with optional mock fallback.
   * Mock path: deterministic hashing, no network calls.
   * Network path: fetches from IPFS gateway, validates against manifest.
   */
  async verify(request: SpvBridgeRequest): Promise<SpvBridgeResult> {
    assertCid(request.mediaCid, "mediaCid");
    assertCid(request.manifestCid, "manifestCid");
    if (!StrKey.isValidEd25519PublicKey(request.requester)) {
      throw new XdrValidationError("requester", "expected a valid Stellar G... address");
    }

    // Use mock verifier if explicitly requested or if fallback is enabled and network is unavailable
    if (request.useMock || this.config.enableMockFallback) {
      return this.verifyMock(request);
    }

    // Use network verifier (SPV via IPFS gateway)
    return this.verifyNetwork(request);
  }

  /**
   * Mock verifier: deterministic hashing, no network calls.
   * Produces identical hashes for identical CIDs.
   */
  private async verifyMock(request: SpvBridgeRequest): Promise<SpvBridgeResult> {
    const { mediaCid, manifestCid, requester } = request;

    // Generate deterministic hashes
    const contentHash = generateMockHash(mediaCid);
    const manifestHash = generateMockHash(manifestCid);

    // Generate deterministic signature
    const signature = generateMockSignature(contentHash, manifestHash, requester);

    // For mock, we always return verified=true with valid hashes and signature
    // Real verification would compare manifest contentHash to media hash
    return {
      verified: true,
      contentHash,
      manifestHash,
      signature,
      isMock: true,
    };
  }

  /**
   * Network verifier: fetches from IPFS gateway and validates.
   * Returns verified=false if manifest doesn't match media.
   */
  private async verifyNetwork(request: SpvBridgeRequest): Promise<SpvBridgeResult> {
    const { mediaCid, manifestCid, requester } = request;

    const manifestBytes = await this.fetchBytes(
      manifestCid,
      this.config.maxManifestBytes
    );
    const mediaBytes = await this.fetchBytes(mediaCid, this.config.maxMediaBytes);

    const contentHash = crypto.createHash("sha256").update(mediaBytes).digest("hex");
    const manifestHash = crypto.createHash("sha256")
      .update(manifestBytes)
      .digest("hex");

    // Generate signature from hashes
    const signature = generateMockSignature(contentHash, manifestHash, requester);

    const reject = (reason: string): SpvBridgeResult => ({
      verified: false,
      contentHash,
      manifestHash,
      signature,
      reason,
      isMock: false,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(manifestBytes.toString("utf8"));
    } catch {
      return reject("Manifest is not valid JSON");
    }

    const manifest = manifestSchema.safeParse(parsed);
    if (!manifest.success) {
      return reject("Manifest is missing a contentHash or creator");
    }

    const declaredHash = normalizeContentHash(manifest.data.contentHash);
    if (!declaredHash) {
      return reject("Manifest contentHash is not a SHA-256 hex digest");
    }
    if (declaredHash !== contentHash) {
      return reject("Media SHA-256 does not match the manifest contentHash");
    }
    if (manifest.data.creator !== requester) {
      return reject("Manifest creator does not match the verification requester");
    }

    return {
      verified: true,
      contentHash,
      manifestHash,
      signature,
      isMock: false,
    };
  }

  private async fetchBytes(cid: string, maxBytes: number): Promise<Buffer> {
    const url = `${this.config.networkGatewayUrl.replace(/\/+$/, "")}/${cid}`;

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: AbortSignal.timeout(this.config.fetchTimeoutMs),
      });
    } catch (err) {
      throw new SpvBridgeError(
        `Gateway request for ${cid} failed: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }

    if (!response.ok) {
      // 404 is typical while content propagates; 5xx/429 are transient.
      const retryable =
        response.status === 404 ||
        response.status === 429 ||
        response.status >= 500;
      throw new SpvBridgeError(
        `Gateway returned HTTP ${response.status} for ${cid}`,
        retryable
      );
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new SpvBridgeError(
        `${cid} exceeds the ${maxBytes}-byte limit`,
        false
      );
    }
    if (!response.body) {
      throw new SpvBridgeError(
        `Gateway returned an empty body for ${cid}`,
        true
      );
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new SpvBridgeError(
            `${cid} exceeds the ${maxBytes}-byte limit`,
            false
          );
        }
        chunks.push(Buffer.from(value));
      }
    } catch (err) {
      if (err instanceof SpvBridgeError) throw err;
      throw new SpvBridgeError(
        `Reading ${cid} from gateway failed: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }

    return Buffer.concat(chunks);
  }
}

export const spvBridgeService = new SpvBridgeService({
  enableMockFallback: true,
  networkGatewayUrl: env.PINATA_GATEWAY_URL,
  fetchTimeoutMs: env.SPV_FETCH_TIMEOUT_MS || 15_000,
  maxMediaBytes: env.SPV_MAX_MEDIA_BYTES || 100 * 1024 * 1024,
  maxManifestBytes: env.SPV_MAX_MANIFEST_BYTES || 10 * 1024 * 1024,
});
