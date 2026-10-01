import { createHash } from "crypto";
import { PinataSDK } from "pinata";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { isCidV1 } from "../utils/cid";
import type {
  IpfsAvailability,
  IpfsPin,
  IpfsPinInput,
  IpfsPinListQuery,
  IpfsPinListResult,
  IpfsPinResult,
  IpfsPinStatus,
  IpfsUnpinResult,
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
export const IPFS_CID_VERSION_MISMATCH = "IPFS_CID_VERSION_MISMATCH";
export const IPFS_UPLOAD_FAILED = "IPFS_UPLOAD_FAILED";
export const IPFS_UPLOAD_TIMEOUT = "IPFS_UPLOAD_TIMEOUT";
export const IPFS_PIN_FAILED = "IPFS_PIN_FAILED";
export const IPFS_UNPIN_FAILED = "IPFS_UNPIN_FAILED";
export const IPFS_LIST_PINS_FAILED = "IPFS_LIST_PINS_FAILED";

export function isValidCid(cid: string): boolean {
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) || /^b[a-z2-7]{50,}$/.test(cid);
}

export function computeBackoffDelayMs(baseMs: number, attempt: number, maxMs = 30_000): number {
  return Math.min(baseMs * 2 ** attempt, maxMs);
}

export function isRetryableUploadError(error: unknown): boolean {
  if (!(error instanceof AppError)) return true;
  return error.statusCode >= StatusCodes.INTERNAL_SERVER_ERROR && error.code !== IPFS_CID_VERSION_MISMATCH;
}

function withUploadTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    operation(),
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new AppError("IPFS pinning timed out", StatusCodes.BAD_GATEWAY, IPFS_UPLOAD_TIMEOUT)),
        timeoutMs,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class IpfsService {
  private readonly pinata: PinataSDK;
  private readonly pinPollIntervalMs: number;
  private readonly pinPollTimeoutMs: number;
  private readonly pinPollMaxAttempts: number;
  private readonly availabilityTimeoutMs: number;
  private readonly uploadTimeoutMs: number;
  private readonly uploadMaxRetries: number;
  private readonly uploadBackoffMs: number;

  constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY_URL,
    });
    this.pinPollIntervalMs = env.IPFS_PIN_POLL_INTERVAL_MS ?? DEFAULT_PIN_POLL_INTERVAL_MS;
    this.pinPollTimeoutMs = env.IPFS_PIN_POLL_TIMEOUT_MS ?? DEFAULT_PIN_POLL_TIMEOUT_MS;
    this.pinPollMaxAttempts = env.IPFS_PIN_POLL_MAX_ATTEMPTS ?? DEFAULT_PIN_POLL_MAX_ATTEMPTS;
    this.availabilityTimeoutMs = env.IPFS_AVAILABILITY_TIMEOUT_MS ?? DEFAULT_AVAILABILITY_TIMEOUT_MS;
    this.uploadTimeoutMs = env.IPFS_UPLOAD_TIMEOUT_MS;
    this.uploadMaxRetries = env.IPFS_UPLOAD_MAX_RETRIES;
    this.uploadBackoffMs = env.IPFS_UPLOAD_BACKOFF_MS;
  }

  async healthCheck(): Promise<void> {
    await this.pinata.testAuthentication();
  }

  async upload(input: IpfsUploadInput): Promise<IpfsUploadResult> {
    const { content, name = "upload", metadata = {} } = input;
    const file = this.toFile(content, name);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.uploadMaxRetries; attempt += 1) {
      try {
        return await withUploadTimeout(
          () => this.performUpload(file, name, metadata, content),
          this.uploadTimeoutMs,
        );
      } catch (error) {
        lastError = error;
        if (attempt === this.uploadMaxRetries || !isRetryableUploadError(error)) break;
        await delay(computeBackoffDelayMs(this.uploadBackoffMs, attempt));
      }
    }

    throw this.toUploadError(lastError);
  }

  private toFile(content: IpfsUploadInput["content"], name: string): File {
    if (Buffer.isBuffer(content)) {
      return new File([new Uint8Array(content)], name, { type: "application/octet-stream" });
    }
    return new File([JSON.stringify(content)], `${name}.json`, { type: "application/json" });
  }

  private async performUpload(
    file: File,
    name: string,
    metadata: Record<string, string>,
    content: IpfsUploadInput["content"],
  ): Promise<IpfsUploadResult> {
    try {
      let builder = this.pinata.upload.public.file(file).name(name).cidVersion(PINATA_CID_VERSION);
      if (Object.keys(metadata).length > 0) builder = builder.keyvalues(metadata);

      const response = await builder;
      const cid = response.cid;
      if (typeof cid !== "string" || !isCidV1(cid)) {
        throw new AppError(
          `IPFS upload returned a non-CIDv1 content identifier: ${String(cid)}`,
          StatusCodes.BAD_GATEWAY,
          IPFS_CID_VERSION_MISMATCH,
        );
      }

      const size = response.size ?? (Buffer.isBuffer(content)
        ? content.byteLength
        : Buffer.byteLength(JSON.stringify(content)));
      const gatewayUrl = this.getGatewayUrl(cid);
      const pinId = typeof response.id === "string" ? response.id : "";
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
    } catch (error) {
      throw this.toUploadError(error);
    }
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

  getGatewayUrl(cid: string): string {
    return `${env.PINATA_GATEWAY_URL.replace(/\/+$/, "")}/${cid}`;
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

    try {
      const response = await fetch(this.getGatewayUrl(cid), {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });
      if (response.status === StatusCodes.NOT_FOUND || response.status === StatusCodes.GONE) {
        await response.body?.cancel();
        return { status: "not_found", httpStatus: response.status };
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        return { status: "unreachable", httpStatus: response.status };
      }

      const contentLength = response.headers.get("content-length");
      const declaredSize = contentLength && /^\d+$/.test(contentLength) ? Number(contentLength) : null;
      if (declaredSize !== null && declaredSize > options.maxBytes) {
        await response.body.cancel();
        return { status: "too_large", declaredSize };
      }

      const hash = createHash("sha256");
      const reader = response.body.getReader();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > options.maxBytes) {
          await reader.cancel();
          return { status: "too_large", declaredSize };
        }
        hash.update(value);
      }
      return { status: "ok", size: received, sha256: hash.digest("hex") };
    } catch {
      return controller.signal.aborted ? { status: "timeout" } : { status: "unreachable" };
    } finally {
      clearTimeout(timer);
    }
  }

  async pinMedia(input: IpfsPinInput): Promise<IpfsPinResult> {
    if (!isValidCid(input.cid)) {
      throw new AppError(`Invalid IPFS CID: ${input.cid}`, StatusCodes.BAD_REQUEST, "INVALID_CID");
    }
    try {
      let builder = this.pinata.upload.public.cid(input.cid).name(input.name ?? input.cid);
      if (input.metadata && Object.keys(input.metadata).length > 0) builder = builder.keyvalues(input.metadata);
      const result = await builder;
      return {
        id: result.id,
        cid: result.cid,
        name: result.name ?? input.name ?? input.cid,
        status: result.status,
        queuedAt: result.date_queued,
      };
    } catch (error) {
      throw this.toLifecycleError(error, IPFS_PIN_FAILED, "pin");
    }
  }

  async listPins(query: IpfsPinListQuery = {}): Promise<IpfsPinListResult> {
    const limit = query.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new AppError("Pin list limit must be between 1 and 1000", StatusCodes.BAD_REQUEST, "INVALID_PIN_LIST_LIMIT");
    }
    try {
      let builder = this.pinata.files.public.list().order("DESC").limit(limit);
      if (query.pageToken) builder = builder.pageToken(query.pageToken);
      if (query.cid) builder = builder.cid(query.cid);
      const page = await builder;
      return {
        pins: (page.files ?? []).map((file): IpfsPin => ({
          id: file.id,
          cid: file.cid,
          name: file.name ?? null,
          size: file.size,
          mimeType: file.mime_type,
          keyvalues: file.keyvalues ?? {},
          createdAt: file.created_at,
        })),
        nextPageToken: page.next_page_token || null,
      };
    } catch (error) {
      throw this.toLifecycleError(error, IPFS_LIST_PINS_FAILED, "list pins");
    }
  }

  async unpinCid(cid: string): Promise<IpfsUnpinResult> {
    if (!isValidCid(cid)) {
      throw new AppError(`Invalid IPFS CID: ${cid}`, StatusCodes.BAD_REQUEST, "INVALID_CID");
    }
    try {
      const pins = await this.pinata.files.public.list().cid(cid).all();
      const fileIds = pins.map((pin) => pin.id);
      if (fileIds.length === 0) return { cid, unpinned: false, fileIds: [] };

      const results = await this.pinata.files.public.delete(fileIds);
      const failures = results.filter((result) => result.status !== "OK");
      const remaining = await this.pinata.files.public.list().cid(cid).all();
      if (failures.length > 0 || remaining.length > 0) {
        const details = failures.map((result) => `${result.id} (${result.status})`).join(", ");
        throw new Error(`Could not unpin ${remaining.length || failures.length} of ${fileIds.length}${details ? `: ${details}` : ""}`);
      }
      return { cid, unpinned: true, fileIds };
    } catch (error) {
      throw this.toLifecycleError(error, IPFS_UNPIN_FAILED, "unpin");
    }
  }

  private toLifecycleError(error: unknown, code: string, operation: string): AppError {
    if (error instanceof AppError) return error;
    const message = error instanceof Error ? error.message : String(error);
    return new AppError(`IPFS ${operation} failed: ${message}`, StatusCodes.BAD_GATEWAY, code);
  }

  /** Preserve typed AppErrors; wrap everything else as a 502 upload failure. */
  private toUploadError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const message = error instanceof Error ? error.message : "IPFS upload failed — unknown error";
    const code = message.toLowerCase().includes("timed out") ? IPFS_UPLOAD_TIMEOUT : IPFS_UPLOAD_FAILED;
    return new AppError(`IPFS upload failed: ${message}`, StatusCodes.BAD_GATEWAY, code);
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
