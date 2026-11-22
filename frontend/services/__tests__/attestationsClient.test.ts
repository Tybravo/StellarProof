import { fetchMintedCertificates } from "../attestationsClient";

const OWNER = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const rec = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  ownerAddress: OWNER,
  status: "minted",
  attestedAt: "2026-08-01T08:12:00Z",
  contentHash: "0x1",
  manifestHash: "0x2",
  attestationHash: "0x3",
  certificateId: `cert-${id}`,
  ...extra,
});

// jsdom has no Response, so use a minimal structural stand-in.
const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("fetchMintedCertificates", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("follows the cursor across pages and requests minted records only", async () => {
    fetchMock
      .mockReturnValueOnce(
        json({ data: [rec("a")], pagination: { limit: 100, total: 2, nextCursor: "a" } })
      )
      .mockReturnValueOnce(
        json({ data: [rec("b")], pagination: { limit: 100, total: 2, nextCursor: null } })
      );

    const out = await fetchMintedCertificates(OWNER);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
    const first = new URL(fetchMock.mock.calls[0][0], "http://x");
    expect(first.searchParams.get("owner")).toBe(OWNER);
    expect(first.searchParams.get("status")).toBe("minted");
    expect(new URL(fetchMock.mock.calls[1][0], "http://x").searchParams.get("cursor")).toBe("a");
  });

  it("drops records without a certificate id", async () => {
    fetchMock.mockReturnValueOnce(
      json({
        data: [rec("a"), rec("b", { certificateId: undefined })],
        pagination: { limit: 100, total: 2, nextCursor: null },
      })
    );
    expect((await fetchMintedCertificates(OWNER)).map((r) => r.id)).toEqual(["a"]);
  });

  it("surfaces the API error message", async () => {
    fetchMock.mockReturnValueOnce(
      json({ error: { code: "invalid_owner", message: "bad owner" } }, 400)
    );
    await expect(fetchMintedCertificates(OWNER)).rejects.toThrow("bad owner");
  });

  it("uses a generic message for a non-JSON error body", async () => {
    fetchMock.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      })
    );
    await expect(fetchMintedCertificates(OWNER)).rejects.toThrow(/unable to load/i);
  });
});
