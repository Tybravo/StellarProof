/**
 * Dashboard overview data service.
 *
 * Fetches creator dashboard metrics from `GET /api/v1/users/me/dashboard/metrics`
 * and normalises the response into the shapes used by the dashboard UI.
 * Errors are thrown (not swallowed) so data-fetching hooks can surface them.
 */

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const DASHBOARD_METRICS_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/api/v1/users/me/dashboard/metrics`;

export type DashboardAssetStatus = "verified" | "pending" | "revoked";
export type DashboardAssetPrivacy = "public" | "private";
export type DashboardMediaType = "image" | "video" | "other";

export interface DashboardAsset {
  id: string;
  name: string;
  /** ISO timestamp the asset was registered. */
  createdAt: string;
  contentHash: string;
  status: DashboardAssetStatus;
  privacy: DashboardAssetPrivacy;
  mediaType: DashboardMediaType;
  thumbnailUrl?: string;
}

export interface DashboardActivity {
  id: string;
  description: string;
  timestamp: string;
  status: DashboardAssetStatus;
}

export interface DashboardMetrics {
  totalAssets: number;
  totalVerifications: number;
  recentActivity: DashboardActivity[];
  assets: DashboardAsset[];
}

type Raw = Record<string, unknown>;

const STATUSES: DashboardAssetStatus[] = ["verified", "pending", "revoked"];
const MEDIA_TYPES: DashboardMediaType[] = ["image", "video", "other"];

function isRecord(v: unknown): v is Raw {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function list(v: unknown): Raw[] {
  return Array.isArray(v) ? v.filter(isRecord) : [];
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toStatus(value: unknown): DashboardAssetStatus {
  const v = str(value).toLowerCase();
  return (STATUSES as string[]).includes(v) ? (v as DashboardAssetStatus) : "pending";
}

function toMediaType(value: unknown): DashboardMediaType {
  const v = str(value).toLowerCase();
  return (MEDIA_TYPES as string[]).includes(v) ? (v as DashboardMediaType) : "other";
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

/** Maps an untrusted API payload to `DashboardMetrics`, defaulting missing fields. */
export function normalizeDashboardMetrics(payload: unknown): DashboardMetrics {
  const raw: Raw = isRecord(payload) ? payload : {};

  const assets = list(raw.assets).map(
    (a, i): DashboardAsset => ({
      id: str(a.id ?? a._id, `asset-${i}`),
      name: str(a.name, "Untitled asset"),
      createdAt: str(a.createdAt),
      contentHash: str(a.contentHash ?? a.hash),
      status: toStatus(a.status),
      privacy: a.privacy === "private" || a.isPrivate === true ? "private" : "public",
      mediaType: toMediaType(a.mediaType ?? a.type),
      thumbnailUrl: typeof a.thumbnailUrl === "string" ? a.thumbnailUrl : undefined,
    }),
  );

  const recentActivity = list(raw.recentActivity).map(
    (a, i): DashboardActivity => ({
      id: str(a.id ?? a._id, `activity-${i}`),
      description: str(a.description, "Activity"),
      timestamp: str(a.timestamp ?? a.createdAt),
      status: toStatus(a.status),
    }),
  );

  return {
    totalAssets: raw.totalAssets === undefined ? assets.length : toCount(raw.totalAssets),
    totalVerifications: toCount(raw.totalVerifications),
    recentActivity,
    assets,
  };
}

export interface FetchDashboardMetricsOptions {
  signal?: AbortSignal;
  /** Optional bearer token for the authenticated user. */
  token?: string;
}

export async function fetchDashboardMetrics(
  options: FetchDashboardMetricsOptions = {},
): Promise<DashboardMetrics> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(DASHBOARD_METRICS_ENDPOINT, {
    headers,
    signal: options.signal,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body; handled below.
  }

  if (!res.ok) {
    const env: Raw = isRecord(body) ? body : {};
    throw new Error(
      str(env.error) || str(env.message) || `Failed to load dashboard metrics (${res.status})`,
    );
  }

  const data = isRecord(body) && "data" in body ? body.data : body;
  return normalizeDashboardMetrics(data);
}
