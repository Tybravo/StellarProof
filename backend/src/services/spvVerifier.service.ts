// @ts-nocheck
/**
 * SPV verifier: checks that a media object on IPFS matches the manifest that
 * claims to describe it, and that the manifest belongs to the requester.
 *
 * Checks, in order:
 *   1. The manifest is JSON with a `contentHash` and `creator`.
 *   2. SHA-256 of the media bytes equals the manifest's `contentHash`.
 *   3. The manifest's `creator` is the verification requester.
 *
 * A failed check is a verification verdict (`verified: false`), not an
 * error. Errors are reserved for being unable to reach a verdict, e.g. the
 * gateway is unreachable, and carry a `retryable` flag.
 */
import crypto from "crypto";
import { StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { assertCid, XdrValidationError } from "../utils/xdr";

export interface SpvVerificationRequest {
  mediaCid: string;
  manifestCid: string;
  requester: string;
}

export interface SpvVerificationResult {
  verified: boolean;
  /** SHA-256 hex of the media bytes. */
  contentHash: string;
  /** SHA-256 hex of the raw manifest bytes. */
  manifestHash: string;
  /** Why verification failed; present only when `verified` is false. */
  reason?: string;
}

export interface SpvVerifierConfig {
  gatewayUrl: string;
  fetchTimeoutMs: number;
  maxMediaBytes: number;
  maxManifestBytes: number;
}

/** A gateway fetch failed before a verdict could be reached. */
export class SpvFetchError extends AppError {
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message, StatusCodes.BAD_GATEWAY, "SPV_FETCH_FAILED");
    this.name = "SpvFetchError";
    this.retryable = retryable;
    Object.setPrototypeOf(this, SpvFetchError.prototype);
  }
}

const manifestSchema = z
  .object({
    contentHash: z.string().min(1),
    creator: z.string().min(1),
  })
  .passthrough();

/** Accepts `<hex>` or `sha256:<hex>`, as written by the manifest pipeline. */
function normalizeContentHash(value: string): string | null {
  const hex = value.startsWith("sha256:") ? value.slice("sha256:".length) : value;
  return /^[0-9a-fA-F]{64}$/.test(hex) ? hex.toLowerCase() : null;
}

type FetchFn = typeof fetch;

export class SpvVerifierService {
  constructor(
    private readonly config: SpvVerifierConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async verify(request: SpvVerificationRequest): Promise<SpvVerificationResult> {
    assertCid(request.mediaCid, "mediaCid");
    assertCid(request.manifestCid, "manifestCid");
    if (!StrKey.isValidEd25519PublicKey(request.requester)) {
      throw new XdrValidationError("requester", "expected a valid Stellar G... address");
    }

    const manifestBytes = await this.fetchBytes(request.manifestCid, this.config.maxManifestBytes);
    const mediaBytes = await this.fetchBytes(request.mediaCid, this.config.maxMediaBytes);

    const manifestHash = crypto.createHash("sha256").update(manifestBytes).digest("hex");
    const contentHash = crypto.createHash("sha256").update(mediaBytes).digest("hex");
    const reject = (reason: string): SpvVerificationResult => ({
      verified: false,
      contentHash,
      manifestHash,
      reason,
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
    if (manifest.data.creator !== request.requester) {
      return reject("Manifest creator does not match the verification requester");
    }

    return { verified: true, contentHash, manifestHash };
  }

  private async fetchBytes(cid: string, maxBytes: number): Promise<Buffer> {
    const url = `${this.config.gatewayUrl.replace(/\/+$/, "")}/${cid}`;

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        signal: AbortSignal.timeout(this.config.fetchTimeoutMs),
      });
    } catch (err) {
      throw new SpvFetchError(
        `Gateway request for ${cid} failed: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }

    if (!response.ok) {
      // 404 is typical while content propagates; 5xx/429 are transient.
      const retryable =
        response.status === 404 || response.status === 429 || response.status >= 500;
      throw new SpvFetchError(`Gateway returned HTTP ${response.status} for ${cid}`, retryable);
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new SpvFetchError(`${cid} exceeds the ${maxBytes}-byte limit`, false);
    }
    if (!response.body) {
      throw new SpvFetchError(`Gateway returned an empty body for ${cid}`, true);
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
          throw new SpvFetchError(`${cid} exceeds the ${maxBytes}-byte limit`, false);
        }
        chunks.push(Buffer.from(value));
      }
    } catch (err) {
      if (err instanceof SpvFetchError) throw err;
      throw new SpvFetchError(
        `Reading ${cid} from gateway failed: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }

    return Buffer.concat(chunks);
  }
}

export const spvVerifierService = new SpvVerifierService({
  gatewayUrl: env.PINATA_GATEWAY_URL,
  fetchTimeoutMs: env.SPV_FETCH_TIMEOUT_MS,
  maxMediaBytes: env.SPV_MAX_MEDIA_BYTES,
  maxManifestBytes: env.SPV_MAX_MANIFEST_BYTES,
});
