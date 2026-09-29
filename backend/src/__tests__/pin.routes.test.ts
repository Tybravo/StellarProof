jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    PINATA_JWT: "test-pinata-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
  },
}));

jest.mock("../services/auth.service", () => ({
  __esModule: true,
  authService: { verifyTokenAndGetUser: jest.fn() },
}));

jest.mock("../services/pinLifecycle.service", () => ({
  __esModule: true,
  pinLifecycleService: { listPins: jest.fn(), pin: jest.fn(), unpin: jest.fn() },
}));

jest.mock("../services/asset.service", () => ({
  __esModule: true,
  assetService: { deleteAsset: jest.fn() },
}));

import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import ipfsRoutes from "../routes/ipfs.routes";
import assetRoutes from "../routes/v1/asset.routes";
import { globalErrorHandler } from "../middlewares/errorHandler";
import { authService } from "../services/auth.service";
import { pinLifecycleService } from "../services/pinLifecycle.service";
import { assetService } from "../services/asset.service";
import { AppError } from "../errors/AppError";

const verifyToken = authService.verifyTokenAndGetUser as jest.Mock;
const listPins = pinLifecycleService.listPins as jest.Mock;
const pin = pinLifecycleService.pin as jest.Mock;
const unpin = pinLifecycleService.unpin as jest.Mock;
const deleteAsset = assetService.deleteAsset as jest.Mock;

const app = express();
app.use(express.json());
app.use("/api/v1/ipfs", ipfsRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use(globalErrorHandler);

const CID = "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq";
const userId = new mongoose.Types.ObjectId();
const asRole = (role: "creator" | "developer" | "admin") =>
  verifyToken.mockResolvedValue({ _id: userId, role, isActive: true });
const AUTH = { Authorization: "Bearer test-token" };

describe("Pin lifecycle routes (/api/v1/ipfs/pins)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires a bearer token", async () => {
    const res = await request(app).get("/api/v1/ipfs/pins");
    expect(res.status).toBe(401);
    expect(listPins).not.toHaveBeenCalled();
  });

  it("forbids non-admin users", async () => {
    asRole("creator");
    const res = await request(app).get("/api/v1/ipfs/pins").set(AUTH);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect(listPins).not.toHaveBeenCalled();
  });

  it("lists pins for admins and forwards query parameters", async () => {
    asRole("admin");
    const page = { pins: [], nextPageToken: null };
    listPins.mockResolvedValue(page);

    const res = await request(app)
      .get(`/api/v1/ipfs/pins?limit=25&pageToken=tok&cid=${CID}`)
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: page });
    expect(listPins).toHaveBeenCalledWith({ limit: 25, pageToken: "tok", cid: CID });
  });

  it("pins by CID with 202 Accepted", async () => {
    asRole("admin");
    const queued = { id: "job-1", cid: CID, name: "photo", status: "prechecking", queuedAt: "t" };
    pin.mockResolvedValue(queued);

    const res = await request(app)
      .post("/api/v1/ipfs/pins")
      .set(AUTH)
      .send({ cid: CID, name: "photo", metadata: { assetId: "a1" } });

    expect(res.status).toBe(202);
    expect(res.body.data).toEqual(queued);
    expect(pin).toHaveBeenCalledWith({ cid: CID, name: "photo", metadata: { assetId: "a1" } });
  });

  it("validates the pin body", async () => {
    asRole("admin");
    const res = await request(app)
      .post("/api/v1/ipfs/pins")
      .set(AUTH)
      .send({ metadata: { count: 3 } });

    expect(res.status).toBe(422);
    expect(pin).not.toHaveBeenCalled();
  });

  it("surfaces CID_IN_USE as 409 on unpin", async () => {
    asRole("admin");
    unpin.mockRejectedValue(new AppError("CID still referenced", 409, "CID_IN_USE"));

    const res = await request(app).delete(`/api/v1/ipfs/pins/${CID}`).set(AUTH);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, code: "CID_IN_USE" });
    expect(unpin).toHaveBeenCalledWith(CID);
  });
});

describe("Asset routes (/api/v1/assets)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires a bearer token to delete", async () => {
    const res = await request(app).delete(`/api/v1/assets/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(401);
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it("deletes an asset on behalf of the authenticated user", async () => {
    asRole("creator");
    const assetId = new mongoose.Types.ObjectId().toString();
    deleteAsset.mockResolvedValue({
      assetId,
      fileName: "photo.png",
      storageProvider: "ipfs",
      storageReferenceId: CID,
      deletedAt: new Date("2026-09-26T10:00:00.000Z"),
      pinRelease: { cid: CID, released: true, fileIds: ["f1"] },
    });

    const res = await request(app).delete(`/api/v1/assets/${assetId}`).set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.pinRelease).toEqual({ cid: CID, released: true, fileIds: ["f1"] });
    expect(deleteAsset).toHaveBeenCalledWith(assetId, { id: userId.toString(), role: "creator" });
  });

  it("maps service errors through the global error handler", async () => {
    asRole("creator");
    deleteAsset.mockRejectedValue(new AppError("Asset not found", 404, "ASSET_NOT_FOUND"));

    const res = await request(app)
      .delete(`/api/v1/assets/${new mongoose.Types.ObjectId()}`)
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ASSET_NOT_FOUND");
  });
});
