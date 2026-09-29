jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    PINATA_JWT: "test-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
    IPFS_PIN_POLL_INTERVAL_MS: 1,
    IPFS_PIN_POLL_TIMEOUT_MS: 2_000,
    IPFS_PIN_POLL_MAX_ATTEMPTS: 3,
    IPFS_AVAILABILITY_TIMEOUT_MS: 500,
  },
}));

const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

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

import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ipfsController } from "../controllers/ipfs.controller";

function resolveUploadWith(response: Record<string, unknown>) {
  builder.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(response).then(onFulfilled)
  );
}

describe("ipfs.controller uploadFile", () => {
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
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: { cancel: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it("returns pinningStatus, gatewayUrl and availability in the upload response", async () => {
    resolveUploadWith({ cid: CID_V1, size: 5, name: "clip.mp4", id: "file-9" });
    getFileMock.mockResolvedValue({ cid: CID_V1 });

    const req = {
      file: {
        buffer: Buffer.from("media"),
        originalname: "clip.mp4",
        mimetype: "video/mp4",
        size: 5,
      },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    await ipfsController.uploadFile(req, res, next as unknown as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        cid: CID_V1,
        pinId: "file-9",
        pinningStatus: "pinned",
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${CID_V1}`,
        availability: expect.objectContaining({ available: true, httpStatus: 200 }),
      }),
    });
  });

  it("forwards errors to the error handler when no file is attached", async () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    await ipfsController.uploadFile(req, res, next as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
  });
});
