/**
 * Domain types for the Certificate list endpoint.
 * The canonical ICertificate shape is defined in models/Certificate.model.ts.
 */
import mongoose from "mongoose";

/** Validated query parameters for GET /api/v1/certificates */
export interface ListCertificatesQuery {
  creatorId: string;
  /** Maximum number of records to return (1–100, default 20). */
  limit: number;
  /** Number of records to skip for offset-based pagination (default 0). */
  skip: number;
}

/** Paginated response envelope for the certificate list endpoint. */
export interface CertificateListResult {
  certificates: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
}

/** Standard JSON envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
