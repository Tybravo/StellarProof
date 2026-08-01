/**
 * Tests for the Global Certificate Search API integration layer.
 * @see Issue #377
 */
import {
  MOCK_CERTIFICATES,
  SearchApiError,
  normalizeCertificate,
  normalizeSearchPayload,
  searchCertificates,
  searchMockCertificates,
} from "../searchService";

const ORIGINAL_ENV = process.env;

function setApiUrl(url: string | undefined) {
  process.env = { ...ORIGINAL_ENV };
  if (url === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = url;
  }
  delete process.env.NEXT_PUBLIC_SEARCH_MOCK;
}

function apiEnvelope(certificates: unknown[], extra: Record<string, unknown> = {}) {
  return {
    success: true,
    data: { certificates, total: certificates.length, limit: 12, skip: 0, ...extra },
  };
}

describe("searchService", () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /*                          normalizeCertificate                       */
  /* ------------------------------------------------------------------ */

  describe("normalizeCertificate", () => {
    it("maps a Mongo-shaped backend certificate document", () => {
      const cert = normalizeCertificate({
        _id: "6512c0ffee0000000000abcd",
        certificateId: "SP-CERT-000001",
        creatorId: "6512c0ffee0000000000dcba",
        stellarNetwork: "mainnet",
        contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
        transactionHash: "abc123",
        ledgerSequence: 42,
        mintedAt: "2026-01-15T10:30:00.000Z",
        manifestId: {
          manifestHash: "0xmanifest",
          contentHash: "sha256:content",
          creator: "GBVBK2TX",
          metadata: { title: "Test Asset", tags: ["photo", "raw"] },
        },
        assetId: { fileName: "shot.dng", mimeType: "image/x-adobe-dng", sizeBytes: 2048 },
      });

      expect(cert).toMatchObject({
        id: "SP-CERT-000001",
        certificateId: "SP-CERT-000001",
        title: "Test Asset",
        creator: "GBVBK2TX",
        contentHash: "sha256:content",
        manifestHash: "0xmanifest",
        transactionHash: "abc123",
        ledgerSequence: 42,
        network: "mainnet",
        status: "verified",
        fileName: "shot.dng",
        sizeBytes: 2048,
        tags: ["photo", "raw"],
      });
      expect(cert.mintedAt).toBe("2026-01-15T10:30:00.000Z");
    });

    it("maps a flattened Soroban contract-shaped record (snake_case)", () => {
      const cert = normalizeCertificate({
        certificate_id: "SP-CERT-000002",
        owner: "GCAABBCC",
        manifest_hash: "0xmanifest2",
        content_hash: "sha256:content2",
        attestation_hash: "0xattest2",
        // Soroban ledger timestamps are seconds since epoch.
        timestamp: 1_760_000_000,
        network: "testnet",
      });

      expect(cert.certificateId).toBe("SP-CERT-000002");
      expect(cert.creator).toBe("GCAABBCC");
      expect(cert.manifestHash).toBe("0xmanifest2");
      expect(cert.attestationHash).toBe("0xattest2");
      expect(cert.network).toBe("testnet");
      expect(cert.mintedAt).toBe(new Date(1_760_000_000 * 1000).toISOString());
    });

    it("normalizes status aliases and defaults safely", () => {
      expect(normalizeCertificate({ id: "a", status: "rejected" }).status).toBe("revoked");
      expect(normalizeCertificate({ id: "b", status: "processing" }).status).toBe("pending");
      expect(normalizeCertificate({ id: "c", status: "minted" }).status).toBe("verified");
      // A minted on-chain certificate with no status is verified by definition.
      expect(normalizeCertificate({ id: "d" }).status).toBe("verified");
      // Unknown network falls back to testnet (the safe default).
      expect(normalizeCertificate({ id: "e", network: "weird" }).network).toBe("testnet");
    });

    it("never throws on a sparse/garbage record", () => {
      const cert = normalizeCertificate({});
      expect(cert.title).toBeTruthy();
      expect(cert.creator).toBe("Unknown creator");
      expect(cert.tags).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*                        normalizeSearchPayload                       */
  /* ------------------------------------------------------------------ */

  describe("normalizeSearchPayload", () => {
    it("unwraps the { success, data } envelope and derives page from skip", () => {
      const out = normalizeSearchPayload(
        apiEnvelope([{ certificateId: "X1" }, { certificateId: "X2" }], {
          total: 40,
          limit: 10,
          skip: 20,
        }),
        1,
        12
      );

      expect(out.results).toHaveLength(2);
      expect(out.total).toBe(40);
      expect(out.limit).toBe(10);
      expect(out.page).toBe(3); // skip 20 / limit 10 + 1
      expect(out.totalPages).toBe(4);
    });

    it("supports `results` and `items` keys as well as `certificates`", () => {
      expect(
        normalizeSearchPayload({ data: { results: [{ certificateId: "R" }] } }, 1, 12)
          .results
      ).toHaveLength(1);
      expect(
        normalizeSearchPayload({ data: { items: [{ certificateId: "I" }] } }, 1, 12).results
      ).toHaveLength(1);
    });

    it("falls back to the requested page/limit when the API omits them", () => {
      const out = normalizeSearchPayload({ data: { certificates: [] } }, 5, 12);
      expect(out.page).toBe(5);
      expect(out.limit).toBe(12);
      expect(out.results).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*                       searchCertificates – API                      */
  /* ------------------------------------------------------------------ */

  describe("searchCertificates against a configured API", () => {
    it("calls the versioned endpoint with the correct query parameters", async () => {
      setApiUrl("https://api.stellarproof.test");
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => apiEnvelope([{ certificateId: "SP-1" }]),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = await searchCertificates({
        query: "  aurora  ",
        page: 2,
        limit: 10,
        status: "verified",
        network: "mainnet",
        sort: "newest",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "https://api.stellarproof.test/api/v1/certificates/search"
      );
      expect(calledUrl.searchParams.get("q")).toBe("aurora"); // trimmed
      expect(calledUrl.searchParams.get("page")).toBe("2");
      expect(calledUrl.searchParams.get("limit")).toBe("10");
      expect(calledUrl.searchParams.get("skip")).toBe("10");
      expect(calledUrl.searchParams.get("status")).toBe("verified");
      expect(calledUrl.searchParams.get("network")).toBe("mainnet");
      expect(calledUrl.searchParams.get("sort")).toBe("newest");

      expect(res.source).toBe("api");
      expect(res.results[0].certificateId).toBe("SP-1");
    });

    it("strips a trailing slash from the configured base URL", async () => {
      setApiUrl("https://api.stellarproof.test/");
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => apiEnvelope([]),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await searchCertificates({ query: "x" });

      expect(fetchMock.mock.calls[0][0]).toContain(
        "https://api.stellarproof.test/api/v1/certificates/search"
      );
      expect(fetchMock.mock.calls[0][0]).not.toContain("test//api");
    });

    it("throws SearchApiError carrying the API error message on 4xx", async () => {
      setApiUrl("https://api.stellarproof.test");
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: "Invalid query parameters" }),
      }) as unknown as typeof fetch;

      await expect(searchCertificates({ query: "bad" })).rejects.toThrow(
        "Invalid query parameters"
      );
    });

    it("throws a friendly SearchApiError on 5xx", async () => {
      setApiUrl("https://api.stellarproof.test");
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ success: false }),
      }) as unknown as typeof fetch;

      await expect(searchCertificates({ query: "x" })).rejects.toMatchObject({
        name: "SearchApiError",
        status: 503,
      });
    });

    it("throws a NETWORK_ERROR SearchApiError when fetch rejects", async () => {
      setApiUrl("https://api.stellarproof.test");
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("connection refused")) as unknown as typeof fetch;

      await expect(searchCertificates({ query: "x" })).rejects.toMatchObject({
        name: "SearchApiError",
        code: "NETWORK_ERROR",
      });
    });

    it("throws when the API responds with success:false", async () => {
      setApiUrl("https://api.stellarproof.test");
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: "Search rejected" }),
      }) as unknown as typeof fetch;

      await expect(searchCertificates({ query: "x" })).rejects.toThrow("Search rejected");
    });

    it("throws INVALID_JSON when the body cannot be parsed", async () => {
      setApiUrl("https://api.stellarproof.test");
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json");
        },
      }) as unknown as typeof fetch;

      await expect(searchCertificates({ query: "x" })).rejects.toMatchObject({
        code: "INVALID_JSON",
      });
    });

    it("marks an aborted request with isAbort so the UI can ignore it", async () => {
      setApiUrl("https://api.stellarproof.test");
      const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
      global.fetch = jest.fn().mockRejectedValue(abortErr) as unknown as typeof fetch;

      const controller = new AbortController();
      controller.abort();

      await expect(
        searchCertificates({ query: "x", signal: controller.signal })
      ).rejects.toMatchObject({ isAbort: true });
    });
  });

  /* ------------------------------------------------------------------ */
  /*                     searchCertificates – mock mode                  */
  /* ------------------------------------------------------------------ */

  describe("searchCertificates without a configured API (mock mode)", () => {
    it("returns mock data and never calls fetch", async () => {
      setApiUrl(undefined);
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = await searchCertificates({ query: "" });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(res.source).toBe("mock");
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.total).toBe(MOCK_CERTIFICATES.length);
    });
  });

  /* ------------------------------------------------------------------ */
  /*                        searchMockCertificates                       */
  /* ------------------------------------------------------------------ */

  describe("searchMockCertificates", () => {
    it("filters by free-text across hashes, ids, titles and tags", async () => {
      const byTag = await searchMockCertificates({ query: "photography" });
      expect(byTag.results.length).toBeGreaterThan(0);
      expect(
        byTag.results.every(
          (c) =>
            c.tags.includes("photography") ||
            c.title.toLowerCase().includes("photography")
        )
      ).toBe(true);

      const byId = await searchMockCertificates({ query: "SP-CERT-000148" });
      expect(byId.results).toHaveLength(1);
      expect(byId.results[0].certificateId).toBe("SP-CERT-000148");
    });

    it("returns zero results for a query that matches nothing", async () => {
      const res = await searchMockCertificates({ query: "zzz-no-such-certificate-zzz" });
      expect(res.results).toEqual([]);
      expect(res.total).toBe(0);
    });

    it("applies status and network filters", async () => {
      const verified = await searchMockCertificates({ query: "", status: "verified" });
      expect(verified.results.every((c) => c.status === "verified")).toBe(true);

      const mainnet = await searchMockCertificates({ query: "", network: "mainnet" });
      expect(mainnet.results.every((c) => c.network === "mainnet")).toBe(true);
    });

    it("sorts newest-first by default and oldest-first on request", async () => {
      const newest = await searchMockCertificates({ query: "", limit: 100 });
      const newestTimes = newest.results.map((c) => new Date(c.mintedAt).getTime());
      expect([...newestTimes].sort((a, b) => b - a)).toEqual(newestTimes);

      const oldest = await searchMockCertificates({ query: "", limit: 100, sort: "oldest" });
      const oldestTimes = oldest.results.map((c) => new Date(c.mintedAt).getTime());
      expect([...oldestTimes].sort((a, b) => a - b)).toEqual(oldestTimes);
    });

    it("paginates without overlapping between pages", async () => {
      const p1 = await searchMockCertificates({ query: "", page: 1, limit: 5 });
      const p2 = await searchMockCertificates({ query: "", page: 2, limit: 5 });

      expect(p1.results).toHaveLength(5);
      expect(p1.page).toBe(1);
      expect(p2.page).toBe(2);
      expect(p1.totalPages).toBe(Math.ceil(MOCK_CERTIFICATES.length / 5));

      const overlap = p1.results.filter((a) => p2.results.some((b) => b.id === a.id));
      expect(overlap).toEqual([]);
    });

    it("rejects with an abort-flagged error when the signal fires", async () => {
      const controller = new AbortController();
      const promise = searchMockCertificates({ query: "", signal: controller.signal });
      controller.abort();

      await expect(promise).rejects.toBeInstanceOf(SearchApiError);
      await expect(promise).rejects.toMatchObject({ isAbort: true });
    });
  });
});
