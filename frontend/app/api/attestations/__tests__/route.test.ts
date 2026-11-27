/**
 * @jest-environment node
 */
import { GET } from "../route";
import * as history from "@/services/attestationHistory";
import { SAMPLE_OWNER_ADDRESS } from "@/services/attestationHistory";

const call = (qs: string) => GET(new Request(`http://localhost/api/attestations?${qs}`));

describe("GET /api/attestations", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns valid JSON history, newest first", async () => {
    const res = await call(`owner=${SAMPLE_OWNER_ADDRESS}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = await res.json();
    expect(body.data).toHaveLength(5);
    expect(body.pagination).toEqual({ limit: 20, total: 5, nextCursor: null });
    const times = body.data.map((r: { attestedAt: string }) => Date.parse(r.attestedAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(body.data[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), status: expect.any(String) })
    );
  });

  it("filters by status", async () => {
    const body = await (await call(`owner=${SAMPLE_OWNER_ADDRESS}&status=minted`)).json();
    expect(body.data).toHaveLength(3);
    expect(
      body.data.every(
        (r: { status: string; certificateId?: string }) =>
          r.status === "minted" && Boolean(r.certificateId)
      )
    ).toBe(true);
  });

  it("paginates with a cursor", async () => {
    const first = await (await call(`owner=${SAMPLE_OWNER_ADDRESS}&limit=2`)).json();
    expect(first.data).toHaveLength(2);
    expect(first.pagination.nextCursor).toBe(first.data[1].id);

    const second = await (
      await call(`owner=${SAMPLE_OWNER_ADDRESS}&limit=2&cursor=${first.pagination.nextCursor}`)
    ).json();
    expect(second.data).toHaveLength(2);
    expect(second.data.map((r: { id: string }) => r.id)).not.toContain(first.data[0].id);

    const last = await (
      await call(`owner=${SAMPLE_OWNER_ADDRESS}&limit=2&cursor=${second.pagination.nextCursor}`)
    ).json();
    expect(last.data).toHaveLength(1);
    expect(last.pagination.nextCursor).toBeNull();
  });

  it("returns an empty list for an owner with no history", async () => {
    const res = await call(`owner=G${"A".repeat(55)}`);
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
  });

  it.each([
    ["", "missing_owner"],
    ["owner=not-an-address", "invalid_owner"],
    [`owner=${SAMPLE_OWNER_ADDRESS}&status=bogus`, "invalid_status"],
    [`owner=${SAMPLE_OWNER_ADDRESS}&limit=0`, "invalid_limit"],
    [`owner=${SAMPLE_OWNER_ADDRESS}&limit=101`, "invalid_limit"],
    [`owner=${SAMPLE_OWNER_ADDRESS}&limit=abc`, "invalid_limit"],
    [`owner=${SAMPLE_OWNER_ADDRESS}&cursor=nope`, "invalid_cursor"],
  ])("rejects bad input (%s) with 400 %s", async (qs, code) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(code);
  });

  it("returns 500 JSON without leaking details when the data layer fails", async () => {
    jest.spyOn(history, "getAttestationHistory").mockRejectedValue(new Error("boom"));
    const res = await call(`owner=${SAMPLE_OWNER_ADDRESS}`);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});
