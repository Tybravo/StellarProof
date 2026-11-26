import {
  getAttestationHistory,
  InvalidCursorError,
  isAttestationStatus,
  isValidStellarAddress,
  ATTESTATION_STATUSES,
  MAX_LIMIT,
  type AttestationStatus,
} from "@/services/attestationHistory";

const NO_STORE = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * GET /api/attestations?owner=<G-address>[&status=][&limit=][&cursor=]
 *
 * Returns the owner's SPV attestation history, newest first.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const owner = params.get("owner")?.trim() ?? "";
  if (!owner) {
    return errorResponse(400, "missing_owner", "The 'owner' query parameter is required.");
  }
  if (!isValidStellarAddress(owner)) {
    return errorResponse(400, "invalid_owner", "'owner' must be a valid Stellar public key.");
  }

  let status: AttestationStatus | undefined;
  const statusParam = params.get("status");
  if (statusParam) {
    if (!isAttestationStatus(statusParam)) {
      return errorResponse(
        400,
        "invalid_status",
        `'status' must be one of: ${ATTESTATION_STATUSES.join(", ")}.`
      );
    }
    status = statusParam;
  }

  let limit: number | undefined;
  const limitParam = params.get("limit");
  if (limitParam !== null) {
    if (!/^\d+$/.test(limitParam) || Number(limitParam) < 1 || Number(limitParam) > MAX_LIMIT) {
      return errorResponse(
        400,
        "invalid_limit",
        `'limit' must be an integer between 1 and ${MAX_LIMIT}.`
      );
    }
    limit = Number(limitParam);
  }

  try {
    const page = await getAttestationHistory({
      ownerAddress: owner,
      status,
      limit,
      cursor: params.get("cursor") ?? undefined,
    });
    return Response.json(page, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      return errorResponse(400, "invalid_cursor", "'cursor' is not valid for this query.");
    }
    return errorResponse(500, "internal_error", "Failed to load attestation history.");
  }
}
