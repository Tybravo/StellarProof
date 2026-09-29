import { PinataSDK } from "pinata";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { isCidV1 } from "../utils/cid";
import type {
  IpfsAvailability,
  IpfsPinStatus,
  IpfsUploadInput,
  IpfsUploadResult,
} from "../types/ipfs.types";
import type { GatewayFetchOptions, GatewayFetchResult } from "../types/storage.types";

/**
 * Every pin must be requested as CIDv1 so the returned IpfsHash is a
 * canonical base32 CID that is safe to reference from Soroban contracts.
 * Never rely on the provider default.
 */
const PINATA_CID_VERSION = "v1" as const;

/**
 * Bounded polling window used to observe Pinata's real pin state after an
 * upload. Pinata may return a CID before the pin has finished propagating, so
 * we poll (bounded) instead of assuming success. All values are overridable
 * via env; the defaults keep the worst-case extra latency under ~6s.
 */
const DEFAULT_PIN_POLL_INTERVAL_MS = 500;
const DEFAULT_PIN_POLL_TIMEOUT_MS = 6_000;
const DEFAULT_PIN_POLL_MAX_ATTEMPTS = 8;
const DEFAULT_AVAILABILITY_TIMEOUT_MS = 4_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class IpfsService {
  private readonly pinata: PinataSDK;
  private readonly pinPollIntervalMs: number;
  private readonly pinPollTimeoutMs: number;
  private readonly pinPollMaxAttempts: number;
  private readonly availabilityTimeoutMs: number;

  constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY_URL,
    });
    this.pinPollIntervalMs = env.IPFS_PIN_POLL_INTERVAL_MS ?? DEFAULT_PIN_POLL_INTERVAL_MS;
    this.pinPollTimeoutMs = env.IPFS_PIN_POLL_TIMEOUT_MS ?? DEFAULT_PIN_POLL_TIMEOUT_MS;
    this.pinPollMaxAttempts = env.IPFS_PIN_POLL_MAX_ATTEMPTS ?? DEFAULT_PIN_POLL_MAX_ATTEMPTS;
    this.availabilityTimeoutMs = env.IPFS_AVAILABILITY_TIMEOUT_MS ?? DEFAULT_AVAILABILITY_TIMEOUT_MS;
  }

  async upload(input: IpfsUploadInput): Promise<IpfsUploadResult> {
    const { content, name = "upload", metadata = {} } = input;
    const file = this.toFile(content, name);

    return this.uploadWithRetry(file, name, metadata, content);
  }

  /**
   * Upload the file, retrying transient failures up to
   * `IPFS_UPLOAD_MAX_RETRIES` times with exponential backoff. Every attempt is
   * bounded by `IPFS_UPLOAD_TIMEOUT_MS`.
   */
  private async uploadWithRetry(
    file: File,
    name: string,
    metadata: Record<string, string>,
    content: IpfsUploadInput["content"],
  ): Promise<IpfsUploadResult> {
    const maxAttempts = env.IPFS_UPLOAD_MAX_RETRIES + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await withUploadTimeout(
          () => this.performUpload(file, name, metadata, content),
          env.IPFS_UPLOAD_TIMEOUT_MS,
        );
      } catch (err) {
        lastError = err;

        if (attempt === maxAttempts - 1 || !isRetryableUploadError(err)) {
          break;
        }

        await delay(computeBackoffDelayMs(env.IPFS_UPLOAD_BACKOFF_MS, attempt));
      }
    }

      const size: number = response.size ?? (Buffer.isBuffer(content) ? content.byteLength : Buffer.byteLength(JSON.stringify(content)));
      const gatewayUrl = this.getGatewayUrl(cid);
      const pinId = typeof response.id === "string" ? response.id : "";

      // Probe the gateway first: it doubles as the pin-state fallback for
      // responses that do not carry a Pinata file id.
      const availability = await this.probeGatewayAvailability(cid);
      const pinningStatus = await this.resolvePinStatus(pinId, availability);

      return {
        cid,
        cidVersion: 1,
        size,
        name: response.name ?? name,
        timestamp: new Date().toISOString(),
        gatewayUrl,
        pinId,
        pinningStatus,
        availability,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;

    const response = await builder;
    const cid = response.cid;

    if (typeof cid !== "string" || !isCidV1(cid)) {
      throw new AppError(
        `IPFS upload returned a non-CIDv1 content identifier: ${String(cid)}`,
        StatusCodes.BAD_GATEWAY,
        IPFS_CID_VERSION_MISMATCH,
      );
    }

    const size: number =
      response.size ??
      (Buffer.isBuffer(content)
        ? content.byteLength
        : Buffer.byteLength(JSON.stringify(content)));

    return {
      cid,
      cidVersion: 1,
      size,
      name: response.name ?? name,
      timestamp: new Date().toISOString(),
      gatewayUrl: `${env.PINATA_GATEWAY_URL}/${cid}`,
    };
  }

  /**
   * Derive the real pin state for a freshly uploaded file.
   *
   * Pinata reports `cid: "pending"` on a file record until the pin has
   * propagated; a concrete CID means the pin is complete. We poll within a
   * bounded window so the response reflects reality instead of assuming the
   * upload succeeded. When Pinata reports a pending CID for the whole window
   * (or is unreachable) the upload is reported as `pinning`, never `pinned`.
   *
   * When Pinata did not return a file id we fall back to the gateway probe:
   * a CID the gateway already serves is pinned, otherwise it is still pinning.
   */
  async resolvePinStatus(pinId: string, availability: IpfsAvailability): Promise<IpfsPinStatus> {
    if (!pinId) {
      return availability.available ? "pinned" : "pinning";
    }

    const deadline = Date.now() + this.pinPollTimeoutMs;

    for (let attempt = 0; attempt < this.pinPollMaxAttempts; attempt += 1) {
      let pinned = false;
      let reachable = true;

      try {
        const file = await this.pinata.files.public.get(pinId);
        pinned = typeof file.cid === "string" && file.cid.length > 0 && file.cid !== "pending";
      } catch {
        reachable = false;
      }

      if (pinned) return "pinned";

      if (Date.now() >= deadline) break;
      if (reachable && Date.now() + this.pinPollIntervalMs > deadline) break;

      await delay(this.pinPollIntervalMs);
    }

    // Pinata never confirmed the pin within the window: report the truth.
    return "pinning";
  }

  /**
   * Probe whether the configured gateway currently serves a CID.
   * Bounded by `IPFS_AVAILABILITY_TIMEOUT_MS` and never throws: a gateway
   * error, timeout or non-2xx status is reported as unavailable.
   */
  async probeGatewayAvailability(cid: string): Promise<IpfsAvailability> {
    const checkedAt = new Date().toISOString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.availabilityTimeoutMs);

    try {
      const response = await fetch(this.getGatewayUrl(cid), {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });
      // Availability only needs the status line; drop the body immediately.
      await response.body?.cancel();

      return { available: response.ok, httpStatus: response.status, checkedAt };
    } catch {
      return { available: false, httpStatus: null, checkedAt };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Stream a CID from the Pinata gateway and compute its SHA-256.
   * The whole request (headers + body) is bounded by `timeoutMs`, and the
   * download is aborted as soon as it exceeds `maxBytes`, so a slow gateway
   * or an oversized object can never stall or exhaust the API process.
   * Gateway-side failures are reported as a status rather than thrown.
   */
  async fetchFromGateway(cid: string, options: GatewayFetchOptions): Promise<GatewayFetchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    return new File([JSON.stringify(content)], `${name}.json`, { type: "application/json" });
  }

  /** Preserve typed AppErrors; wrap everything else as a 502 upload failure. */
  private toUploadError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const message = error instanceof Error ? error.message : "IPFS upload failed — unknown error";
    return new AppError(`IPFS upload failed: ${message}`, StatusCodes.BAD_GATEWAY, IPFS_UPLOAD_FAILED);
  }
  
  async fetchManifestJson(cidOrUrl: string): Promise<Record<string, any>> {
    const url = cidOrUrl.startsWith("http")
      ? cidOrUrl
      : `${env.PINATA_GATEWAY_URL}/${cidOrUrl}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new AppError(
          `IPFS fetch failed with status ${response.status}`,
          StatusCodes.BAD_GATEWAY,
          "IPFS_FETCH_FAILED"
        );
      }

      return await response.json();
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;

      const message =
        err instanceof Error ? err.message : "IPFS fetch failed - unknown error";

      throw new AppError(
        `IPFS fetch failed: ${message}`,
        StatusCodes.BAD_GATEWAY,
        "IPFS_FETCH_FAILED"
      );
    }
  }
}

export const ipfsService = new IpfsService();
