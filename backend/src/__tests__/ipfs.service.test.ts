jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    PINATA_JWT: "test-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
    // Short, deterministic polling window so the suite stays fast.
    IPFS_PIN_POLL_INTERVAL_MS: 1,
    IPFS_PIN_POLL_TIMEOUT_MS: 2_000,
    IPFS_PIN_POLL_MAX_ATTEMPTS: 4,
    IPFS_AVAILABILITY_TIMEOUT_MS: 500,
  },
}));

const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const CID_V0 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

const builder = {
  name: jest.fn(),
  keyvalues: jest.fn(),
  cidVersion: jest.fn(),
  then: jest.fn(),
};
const fileMock = jest.fn();
const getFileMock = jest.fn();

jest.mock("pinata", () => ({
  __esModule: true,
  PinataSDK: jest.fn().mockImplementation(() => ({
    upload: { public: { file: fileMock } },
    files: { public: { get: getFileMock } },
  })),
}));

const fetchMock = jest.fn();

import { ipfsService } from "../services/ipfs.service";
import { AppError } from "../errors/AppError";
import { isCidV0, isCidV1 } from "../utils/cid";

function resolveUploadWith(response: Record<string, unknown>) {
  builder.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(response).then(onFulfilled)
  );
}

/** Stub the gateway probe response returned by global fetch. */
function mockGateway(ok: boolean, status: number) {
  fetchMock.mockResolvedValue({
    ok,
    status,
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
  });
}

describe("CID helpers", () => {
  it("recognises base32 CIDv1 strings", () => {
    expect(isCidV1(CID_V1)).toBe(true);
    expect(isCidV1(CID_V0)).toBe(false);
    expect(isCidV1(CID_V1.toUpperCase())).toBe(false);
  });

  it("recognises CIDv0 strings", () => {
    expect(isCidV0(CID_V0)).toBe(true);
    expect(isCidV0(CID_V1)).toBe(false);
  });
});

describe("IpfsService.upload", () => {
  beforeAll(() => {
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    builder.name.mockReturnValue(builder);
    builder.keyvalues.mockReturnValue(builder);
    builder.cidVersion.mockReturnValue(builder);
    fileMock.mockReturnValue(builder);
    fetchMock.mockReset();
    getFileMock.mockReset();
  });

  it("requests CIDv1 for every pin and returns the IpfsHash as the canonical CID", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg" });
    mockGateway(true, 200);

    const result = await ipfsService.upload({
      content: Buffer.from("test content"),
      name: "photo.jpg",
      metadata: { mimetype: "image/jpeg" },
    });

    expect(builder.cidVersion).toHaveBeenCalledWith("v1");
    expect(builder.name).toHaveBeenCalledWith("photo.jpg");
    expect(builder.keyvalues).toHaveBeenCalledWith({ mimetype: "image/jpeg" });
    expect(result).toEqual(
      expect.objectContaining({
        cid: CID_V1,
        cidVersion: 1,
        size: 12,
        name: "photo.jpg",
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${CID_V1}`,
      })
    );
  });

  it("enforces CIDv1 for JSON documents as well", async () => {
    resolveUploadWith({ cid: CID_V1, size: 20, name: "doc" });
    mockGateway(true, 200);

    await ipfsService.upload({ content: { hello: "world" }, name: "doc" });

    const pinnedFile = fileMock.mock.calls[0][0] as File;
    expect(pinnedFile.name).toBe("doc.json");
    expect(pinnedFile.type).toBe("application/json");
    expect(builder.cidVersion).toHaveBeenCalledWith("v1");
    expect(builder.keyvalues).not.toHaveBeenCalled();
  });

  it("rejects a CIDv0 response instead of persisting a non-canonical CID", async () => {
    resolveUploadWith({ cid: CID_V0, size: 12, name: "photo.jpg" });

    const promise = ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 502,
      code: "IPFS_CID_VERSION_MISMATCH",
    });
  });

  it("wraps provider failures in a 502 AppError", async () => {
    builder.then.mockImplementation((_ok: unknown, onRejected: (e: unknown) => unknown) =>
      Promise.reject(new Error("network down")).then(undefined, onRejected)
    );

    await expect(
      ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "IPFS_UPLOAD_FAILED",
      message: "IPFS upload failed: network down",
    });
  });

  it("reports 'pinned' plus gateway availability once Pinata confirms the pin", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg", id: "file-1" });
    getFileMock.mockResolvedValue({ cid: CID_V1 });
    mockGateway(true, 200);

    const result = await ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    expect(result.pinId).toBe("file-1");
    expect(result.pinningStatus).toBe("pinned");
    expect(result.availability).toEqual({
      available: true,
      httpStatus: 200,
      checkedAt: expect.any(String),
    });
    expect(getFileMock).toHaveBeenCalledWith("file-1");
    expect(fetchMock).toHaveBeenCalledWith(
      `https://gateway.pinata.cloud/ipfs/${CID_V1}`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("keeps reporting 'pinning' while Pinata still returns a pending CID", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg", id: "file-2" });
    getFileMock.mockResolvedValue({ cid: "pending" });
    mockGateway(false, 404);

    const result = await ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    expect(result.pinningStatus).toBe("pinning");
    expect(result.availability).toEqual({
      available: false,
      httpStatus: 404,
      checkedAt: expect.any(String),
    });
    // Polled rather than assumed: more than one lookup within the window.
    expect(getFileMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("never assumes success when Pinata is unreachable", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg", id: "file-3" });
    getFileMock.mockRejectedValue(new Error("pinata down"));
    mockGateway(false, 500);

    const result = await ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    expect(result.pinningStatus).toBe("pinning");
    expect(result.availability.available).toBe(false);
  });

  it("reports the gateway as unavailable (without throwing) when the probe fails", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg", id: "file-4" });
    getFileMock.mockResolvedValue({ cid: CID_V1 });
    fetchMock.mockRejectedValue(new Error("aborted"));

    const result = await ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    expect(result.pinningStatus).toBe("pinned");
    expect(result.availability).toEqual({
      available: false,
      httpStatus: null,
      checkedAt: expect.any(String),
    });
  });

  it("derives pin state from the gateway when Pinata returns no file id", async () => {
    resolveUploadWith({ cid: CID_V1, size: 12, name: "photo.jpg" });
    mockGateway(true, 200);

    const result = await ipfsService.upload({ content: Buffer.from("x"), name: "photo.jpg" });

    expect(result.pinningStatus).toBe("pinned");
    expect(result.pinId).toBe("");
    expect(getFileMock).not.toHaveBeenCalled();
  });
});
