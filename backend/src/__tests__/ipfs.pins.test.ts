jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    PINATA_JWT: "test-pinata-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
  },
}));

/**
 * Pinata SDK mock covering the pin lifecycle surface:
 *   upload.public.cid(cid).name().keyvalues()     -> pin by CID
 *   files.public.list().order().limit().cid()...  -> list / lookup
 *   files.public.delete(ids)                      -> unpin
 */
const mockPinOutcome = jest.fn();
const mockPinBuilder = {
  name: jest.fn(),
  keyvalues: jest.fn(),
  then: (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve().then(() => mockPinOutcome()).then(onFulfilled, onRejected),
};
const mockUploadCid = jest.fn();

const mockListPage = jest.fn();
const mockListAll = jest.fn();
const mockFilter = {
  order: jest.fn(),
  limit: jest.fn(),
  cid: jest.fn(),
  pageToken: jest.fn(),
  all: mockListAll,
  then: (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve().then(() => mockListPage()).then(onFulfilled, onRejected),
};
const mockList = jest.fn();
const mockDelete = jest.fn();

jest.mock("pinata", () => ({
  __esModule: true,
  PinataSDK: jest.fn().mockImplementation(() => ({
    upload: { public: { cid: mockUploadCid } },
    files: { public: { list: mockList, delete: mockDelete } },
  })),
}));

import { ipfsService, isValidCid } from "../services/ipfs.service";
import { AppError } from "../errors/AppError";

const CID_V1 = "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq";
const CID_V0 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

const fileItem = (id: string, cid = CID_V1) => ({
  id,
  name: `${id}.png`,
  cid,
  size: 1024,
  number_of_files: 1,
  mime_type: "image/png",
  keyvalues: { assetId: "a1" },
  group_id: null,
  created_at: "2026-09-25T09:00:00.000Z",
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadCid.mockReturnValue(mockPinBuilder);
  mockPinBuilder.name.mockReturnValue(mockPinBuilder);
  mockPinBuilder.keyvalues.mockReturnValue(mockPinBuilder);
  mockList.mockReturnValue(mockFilter);
  mockFilter.order.mockReturnValue(mockFilter);
  mockFilter.limit.mockReturnValue(mockFilter);
  mockFilter.cid.mockReturnValue(mockFilter);
  mockFilter.pageToken.mockReturnValue(mockFilter);
});

const expectAppError = async (promise: Promise<unknown>, statusCode: number, code: string) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ statusCode, code });
};

describe("isValidCid", () => {
  it.each([CID_V1, CID_V0])("accepts %s", (cid) => {
    expect(isValidCid(cid)).toBe(true);
  });

  it.each(["", "not-a-cid", "https://gateway.pinata.cloud/ipfs/x", `${CID_V0}0`, CID_V1.toUpperCase()])(
    "rejects %p",
    (cid) => {
      expect(isValidCid(cid)).toBe(false);
    },
  );
});

describe("IpfsService.pinMedia", () => {
  it("pins by CID with name and keyvalues and maps the queued response", async () => {
    mockPinOutcome.mockReturnValue({
      id: "job-1",
      cid: CID_V1,
      date_queued: "2026-09-26T10:00:00.000Z",
      name: "photo.png",
      status: "prechecking",
      keyvalues: { assetId: "a1" },
      host_nodes: null,
      group_id: null,
    });

    const result = await ipfsService.pinMedia({
      cid: CID_V1,
    });

    expect(mockUploadCid).toHaveBeenCalledWith(CID_V1);
    expect(mockPinBuilder.name).toHaveBeenCalledWith("photo.png");
    expect(mockPinBuilder.keyvalues).toHaveBeenCalledWith({ assetId: "a1" });
    expect(result).toEqual({
      id: "job-1",
      cid: CID_V1,
      name: "photo.png",
      status: "prechecking",
      queuedAt: "2026-09-26T10:00:00.000Z",
    });
  });

  it("defaults the pin name to the CID and skips empty metadata", async () => {
    mockPinOutcome.mockReturnValue({
      id: "job-2",
      cid: CID_V0,
      date_queued: "2026-09-26T10:00:00.000Z",
      name: CID_V0,
      status: "prechecking",
    });

    await ipfsService.pinMedia({ cid: CID_V0 });

    expect(mockPinBuilder.name).toHaveBeenCalledWith(CID_V0);
    expect(mockPinBuilder.keyvalues).not.toHaveBeenCalled();
  });

  it("rejects an invalid CID with 400 before calling Pinata", async () => {
    await expectAppError(ipfsService.pinMedia({ cid: "nope" }), 400, "INVALID_CID");
    expect(mockUploadCid).not.toHaveBeenCalled();
  });

  it("maps Pinata failures to 502 IPFS_PIN_FAILED", async () => {
    mockPinOutcome.mockImplementation(() => {
      throw new Error("HTTP error: 403 Forbidden");
    });

    await expectAppError(ipfsService.pinMedia({ cid: CID_V1 }), 502, "IPFS_PIN_FAILED");
  });
});

describe("IpfsService.unpinCid", () => {
  it("deletes every Pinata file holding the CID and confirms release", async () => {
    mockListAll
      .mockResolvedValueOnce([fileItem("f1"), fileItem("f2")]) // before delete
      .mockResolvedValueOnce([]); // verification after delete
    mockDelete.mockResolvedValue([
      { id: "f1", status: "OK" },
      { id: "f2", status: "OK" },
    ]);

    const result = await ipfsService.unpinCid(CID_V1);

    expect(mockFilter.cid).toHaveBeenCalledWith(CID_V1);
    expect(mockDelete).toHaveBeenCalledWith(["f1", "f2"]);
    expect(result).toEqual({ cid: CID_V1, unpinned: true, fileIds: ["f1", "f2"] });
  });

  it("is idempotent when no pin exists for the CID", async () => {
    mockListAll.mockResolvedValue([]);

    const result = await ipfsService.unpinCid(CID_V1);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result).toEqual({ cid: CID_V1, unpinned: false, fileIds: [] });
  });

  it("throws 502 IPFS_UNPIN_FAILED when pins survive the delete", async () => {
    mockListAll
      .mockResolvedValueOnce([fileItem("f1"), fileItem("f2")])
      .mockResolvedValueOnce([fileItem("f2")]);
    mockDelete.mockResolvedValue([
      { id: "f1", status: "OK" },
      { id: "f2", status: "HTTP error: 500" },
    ]);

    const error = await ipfsService.unpinCid(CID_V1).catch((e: unknown) => e);

    expect(error).toMatchObject({ statusCode: 502, code: "IPFS_UNPIN_FAILED" });
    expect((error as AppError).message).toContain("1 of 2");
    expect((error as AppError).message).toContain("f2 (HTTP error: 500)");
  });

  it("maps list failures to 502 IPFS_UNPIN_FAILED", async () => {
    mockListAll.mockRejectedValue(new Error("fetch failed"));

    await expectAppError(ipfsService.unpinCid(CID_V1), 502, "IPFS_UNPIN_FAILED");
  });

  it("rejects an invalid CID with 400", async () => {
    await expectAppError(ipfsService.unpinCid("../etc"), 400, "INVALID_CID");
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe("IpfsService.listPins", () => {
  it("returns one page of pins newest first with a next page token", async () => {
    mockListPage.mockReturnValue({ files: [fileItem("f1")], next_page_token: "tok-2" });

    const result = await ipfsService.listPins({ limit: 10, pageToken: "tok-1", cid: CID_V1 });

    expect(mockFilter.order).toHaveBeenCalledWith("DESC");
    expect(mockFilter.limit).toHaveBeenCalledWith(10);
    expect(mockFilter.pageToken).toHaveBeenCalledWith("tok-1");
    expect(mockFilter.cid).toHaveBeenCalledWith(CID_V1);
    expect(result).toEqual({
      pins: [
        {
          id: "f1",
          cid: CID_V1,
          name: "f1.png",
          size: 1024,
          mimeType: "image/png",
          keyvalues: { assetId: "a1" },
          createdAt: "2026-09-25T09:00:00.000Z",
        },
      ],
      nextPageToken: "tok-2",
    });
  });

  it("uses the default limit and reports the last page as a null token", async () => {
    mockListPage.mockReturnValue({ files: [], next_page_token: "" });

    const result = await ipfsService.listPins();

    expect(mockFilter.limit).toHaveBeenCalledWith(50);
    expect(mockFilter.pageToken).not.toHaveBeenCalled();
    expect(result.nextPageToken).toBeNull();
  });

  it.each([0, 1001, 2.5, Number.NaN])("rejects limit %p with 400", async (limit) => {
    await expectAppError(ipfsService.listPins({ limit }), 400, "INVALID_PIN_LIST_LIMIT");
    expect(mockList).not.toHaveBeenCalled();
  });

  it("maps Pinata failures to 502 IPFS_LIST_PINS_FAILED", async () => {
    mockListPage.mockImplementation(() => {
      throw new Error("HTTP error: 401");
    });

    await expectAppError(ipfsService.listPins(), 502, "IPFS_LIST_PINS_FAILED");
  });
});
