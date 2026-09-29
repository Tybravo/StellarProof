/**
 * Fetch-by-CID: retrieves verification content (media and manifest) from the
 * configured IPFS gateway and re-hashes it before handing it to callers.
 *
 * Every fetch is bounded by `IPFS_RESOLVE_TIMEOUT_MS` (headers and body) and
 * `IPFS_RESOLVE_MAX_BYTES` (declared and streamed size). Downloaded bytes are
 * SHA-256 hashed and checked against:
 *   - the CID itself, when it is a CIDv1 whose multihash is a SHA-256 of the
 *     raw bytes (codec `raw`); other CIDs address a DAG node, not the bytes,
 *     so they cannot be checked locally; and
 *   - the caller's expected SHA-256, when one is supplied.
 * Any mismatch rejects the content.
 *
 * Failures are raised as `CidFetchError`, whose `retryable` flag tells the
 * caller whether a later attempt could succeed.
 */
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { isCidV0, isCidV1 } from "../utils/cid";

export type CidContentKind = "media" | "manifest";

export type CidFetchFailure =
  | "invalid_cid"
  | "invalid_expected_hash"
  | "timeout"
  | "unreachable"
  | "not_found"
  | "gateway_error"
  | "gateway_rejected"
  | "too_large"
  | "integrity_mismatch";

/** Failures a later attempt could recover from (outages, content still propagating). */
const RETRYABLE_FAILURES: ReadonlySet<CidFetchFailure> = new Set<CidFetchFailure>([
  "timeout",
  "unreachable",
  "not_found",
  "gateway_error",
]);

export class CidFetchError extends AppError {
  public readonly cid: string;
  public readonly failure: CidFetchFailure;
  public readonly retryable: boolean;

  constructor(cid: string, failure: CidFetchFailure, message: string, statusCode: number) {
    super(message, statusCode, "CID_FETCH_FAILED");
    this.name = "CidFetchError";
    this.cid = cid;
    this.failure = failure;
    this.retryable = RETRYABLE_FAILURES.has(failure);
    Object.setPrototypeOf(this, CidFetchError.prototype);
  }
}

export interface CidFetchConfig {
  gatewayUrl: string;
  timeoutMs: number;
  maxBytes: number;
}

export interface CidFetchOptions {
  /** SHA-256 the content must hash to; `<hex>` or `sha256:<hex>`. */
  expectedSha256?: string;
}

export type CidIntegrityCheck = "cid" | "expected_sha256";

export interface CidFetchResult {
  cid: string;
  kind: CidContentKind;
  bytes: Buffer;
  size: number;
  /** Lower-case SHA-256 hex of `bytes`. */
  sha256: string;
  /** Integrity checks the content passed; empty when none was applicable. */
  verifiedBy: CidIntegrityCheck[];
}

/** CIDv1 binary prefix for codec `raw` (0x55) with a sha2-256 (0x12), 32-byte multihash. */
const RAW_SHA256_CID_PREFIX = Buffer.from([0x01, 0x55, 0x12, 0x20]);
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/** Decodes unpadded lower-case RFC 4648 base32. */
function decodeBase32(input: string): Buffer | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of input) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/** The SHA-256 digest a raw-codec CIDv1 commits to, or null for any other CID. */
function rawCidSha256(cid: string): string | null {
  if (!isCidV1(cid)) return null;
  const decoded = decodeBase32(cid.slice(1));
  if (!decoded || decoded.length !== RAW_SHA256_CID_PREFIX.length + 32) return null;
  if (!decoded.subarray(0, RAW_SHA256_CID_PREFIX.length).equals(RAW_SHA256_CID_PREFIX)) return null;
  return decoded.subarray(RAW_SHA256_CID_PREFIX.length).toString("hex");
}

type FetchFn = typeof fetch;

export class CidFetchService {
  constructor(
    private readonly config: CidFetchConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  fetchMedia(mediaCid: string, options: CidFetchOptions = {}): Promise<CidFetchResult> {
    return this.fetchByCid(mediaCid, "media", options);
  }

  fetchManifest(manifestCid: string, options: CidFetchOptions = {}): Promise<CidFetchResult> {
    return this.fetchByCid(manifestCid, "manifest", options);
  }

  private async fetchByCid(
    cid: string,
    kind: CidContentKind,
    options: CidFetchOptions
  ): Promise<CidFetchResult> {
    if (!isCidV0(cid) && !isCidV1(cid)) {
      throw new CidFetchError(cid, "invalid_cid", `${kind}Cid is not a valid CIDv0 or base32 CIDv1`, StatusCodes.BAD_REQUEST);
    }
    const expectedSha256 = this.normalizeExpectedSha256(cid, options.expectedSha256);

    const bytes = await this.download(cid);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const verifiedBy: CidIntegrityCheck[] = [];

    const cidDigest = rawCidSha256(cid);
    if (cidDigest !== null) {
      if (cidDigest !== sha256) {
        throw new CidFetchError(cid, "integrity_mismatch", `Content served for ${cid} does not match its CID`, StatusCodes.BAD_GATEWAY);
      }
      verifiedBy.push("cid");
    }

    if (expectedSha256 !== undefined) {
      if (expectedSha256 !== sha256) {
        throw new CidFetchError(
          cid,
          "integrity_mismatch",
          `SHA-256 of ${cid} does not match the expected digest`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }
      verifiedBy.push("expected_sha256");
    }

    return { cid, kind, bytes, size: bytes.length, sha256, verifiedBy };
  }

  private normalizeExpectedSha256(cid: string, value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    const hex = value.startsWith("sha256:") ? value.slice("sha256:".length) : value;
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new CidFetchError(
        cid,
        "invalid_expected_hash",
        "expectedSha256 must be a 64-character SHA-256 hex digest",
        StatusCodes.BAD_REQUEST
      );
    }
    return hex.toLowerCase();
  }

  /** Streams the CID from the gateway, enforcing the timeout and size limit. */
  private async download(cid: string): Promise<Buffer> {
    const { maxBytes, timeoutMs } = this.config;
    const url = `${this.config.gatewayUrl.replace(/\/+$/, "")}/${cid}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(url, { method: "GET", signal: controller.signal, redirect: "follow" });

      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === StatusCodes.NOT_FOUND) {
          throw new CidFetchError(cid, "not_found", `Gateway has no content for ${cid} yet`, StatusCodes.BAD_GATEWAY);
        }
        // 5xx and 429 are transient; any other status will not change on retry.
        const transient =
          response.status >= StatusCodes.INTERNAL_SERVER_ERROR || response.status === StatusCodes.TOO_MANY_REQUESTS;
        throw new CidFetchError(
          cid,
          transient ? "gateway_error" : "gateway_rejected",
          `Gateway returned HTTP ${response.status} for ${cid}`,
          StatusCodes.BAD_GATEWAY
        );
      }
      if (!response.body) {
        throw new CidFetchError(cid, "gateway_error", `Gateway returned an empty body for ${cid}`, StatusCodes.BAD_GATEWAY);
      }

      const lengthHeader = response.headers.get("content-length");
      if (lengthHeader !== null && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > maxBytes) {
        await response.body.cancel();
        throw this.tooLarge(cid, maxBytes);
      }

      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          throw this.tooLarge(cid, maxBytes);
        }
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      if (err instanceof CidFetchError) throw err;
      if (controller.signal.aborted) {
        throw new CidFetchError(cid, "timeout", `Gateway request for ${cid} timed out after ${timeoutMs}ms`, StatusCodes.GATEWAY_TIMEOUT);
      }
      throw new CidFetchError(
        cid,
        "unreachable",
        `Gateway request for ${cid} failed: ${err instanceof Error ? err.message : String(err)}`,
        StatusCodes.BAD_GATEWAY
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private tooLarge(cid: string, maxBytes: number): CidFetchError {
    return new CidFetchError(cid, "too_large", `${cid} exceeds the ${maxBytes}-byte limit`, StatusCodes.REQUEST_TOO_LONG);
  }
}

export const cidFetchService = new CidFetchService({
  gatewayUrl: env.PINATA_GATEWAY_URL,
  timeoutMs: env.IPFS_RESOLVE_TIMEOUT_MS,
  maxBytes: env.IPFS_RESOLVE_MAX_BYTES,
});
