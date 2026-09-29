jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    PINATA_JWT: "test-pinata-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
  },
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock("../services/ipfs.service", () => {
  const actual = jest.requireActual("../services/ipfs.service");
  return {
    __esModule: true,
    isValidCid: actual.isValidCid,
    ipfsService: { unpinCid: jest.fn(), listPins: jest.fn(), pinMedia: jest.fn() },
  };
});

jest.mock("../config/cloudinary", () => ({
  __esModule: true,
  cloudinary: { uploader: { destroy: jest.fn() } },
}));

/** Resolves a Mongoose-style query chain (select/lean/exec) with `value`. */
const mockQuery = (value: unknown) => {
  const chain = {
    select: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  chain.select.mockReturnValue(chain);
  chain.lean.mockReturnValue(chain);
  return chain;
};

jest.mock("../models/Asset.model", () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn(), deleteOne: jest.fn() },
}));

jest.mock("../models/Manifest.model", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

jest.mock("../models/verificationJob.model", () => ({
  __esModule: true,
  VerificationJobModel: { exists: jest.fn(), distinct: jest.fn() },
}));

import mongoose from "mongoose";
import Asset from "../models/Asset.model";
import Manifest from "../models/Manifest.model";
import { VerificationJobModel } from "../models/verificationJob.model";
import { ipfsService } from "../services/ipfs.service";
import { pinLifecycleService } from "../services/pinLifecycle.service";
import { assetService } from "../services/asset.service";
import { cleanupService } from "../services/cleanup";
import { AppError } from "../errors/AppError";

const AssetMock = Asset as unknown as { find: jest.Mock; findById: jest.Mock; deleteOne: jest.Mock };
const ManifestMock = Manifest as unknown as { find: jest.Mock };
const JobMock = VerificationJobModel as unknown as { exists: jest.Mock; distinct: jest.Mock };
const unpinCid = ipfsService.unpinCid as jest.Mock;
const listPins = ipfsService.listPins as jest.Mock;

const CID = "bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq";
const OTHER_CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

const oid = () => new mongoose.Types.ObjectId();

/** Configure which Assets/Manifests reference CIDs (excluded ids are honoured). */
const setReferences = (
  assets: Array<{ _id: mongoose.Types.ObjectId; storageReferenceId: string }>,
  manifests: Array<{ _id: mongoose.Types.ObjectId; ipfsCid: string }> = [],
) => {
  AssetMock.find.mockImplementation((filter: { _id?: { $nin: mongoose.Types.ObjectId[] } }) => {
    const excluded = (filter._id?.$nin ?? []).map(String);
    return mockQuery(assets.filter((a) => !excluded.includes(a._id.toString())));
  });
  ManifestMock.find.mockImplementation(() => mockQuery(manifests));
};

beforeEach(() => {
  jest.clearAllMocks();
  AssetMock.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });
  JobMock.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
  unpinCid.mockImplementation(async (cid: string) => ({ cid, unpinned: true, fileIds: ["f1"] }));
});

describe("PinLifecycleService", () => {
  describe("releaseIfUnreferenced", () => {
    it("unpins when no other record references the CID", async () => {
      const assetId = oid();
      setReferences([{ _id: assetId, storageReferenceId: CID }]);

      const outcome = await pinLifecycleService.releaseIfUnreferenced(CID, [assetId]);

      expect(unpinCid).toHaveBeenCalledWith(CID);
      expect(outcome).toEqual({ cid: CID, released: true, fileIds: ["f1"] });
    });

    it("keeps the pin when another asset shares the CID", async () => {
      const deleting = oid();
      setReferences([
        { _id: deleting, storageReferenceId: CID },
        { _id: oid(), storageReferenceId: CID },
      ]);

      const outcome = await pinLifecycleService.releaseIfUnreferenced(CID, [deleting]);

      expect(unpinCid).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ released: false, skippedReason: "referenced" });
    });

    it("keeps the pin when a manifest references the CID", async () => {
      setReferences([], [{ _id: oid(), ipfsCid: CID }]);

      const outcome = await pinLifecycleService.releaseIfUnreferenced(CID);

      expect(unpinCid).not.toHaveBeenCalled();
      expect(outcome.skippedReason).toBe("referenced");
    });

    it("skips storage references that are not CIDs without calling Pinata", async () => {
      const outcome = await pinLifecycleService.releaseIfUnreferenced("https://example.com/file");

      expect(AssetMock.find).not.toHaveBeenCalled();
      expect(unpinCid).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ released: false, skippedReason: "invalid_cid" });
    });

    it("propagates Pinata failures so callers can retry", async () => {
      setReferences([]);
      unpinCid.mockRejectedValue(new AppError("IPFS unpin failed: 500", 502, "IPFS_UNPIN_FAILED"));

      await expect(pinLifecycleService.releaseIfUnreferenced(CID)).rejects.toMatchObject({
        code: "IPFS_UNPIN_FAILED",
      });
    });
  });

  describe("unpin", () => {
    it("refuses with 409 CID_IN_USE while an asset references the CID", async () => {
      setReferences([{ _id: oid(), storageReferenceId: CID }]);

      await expect(pinLifecycleService.unpin(CID)).rejects.toMatchObject({
        statusCode: 409,
        code: "CID_IN_USE",
      });
      expect(unpinCid).not.toHaveBeenCalled();
    });

    it("unpins an untracked CID", async () => {
      setReferences([]);

      await expect(pinLifecycleService.unpin(CID)).resolves.toEqual({
        cid: CID,
        unpinned: true,
        fileIds: ["f1"],
      });
    });

    it("rejects invalid CIDs with 400", async () => {
      await expect(pinLifecycleService.unpin("bad")).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_CID",
      });
    });
  });

  describe("listPins", () => {
    it("annotates each pin with the records that track it", async () => {
      const assetId = oid();
      const manifestId = oid();
      listPins.mockResolvedValue({
        pins: [
          { id: "f1", cid: CID, name: "a.png", size: 1, mimeType: "image/png", keyvalues: {}, createdAt: "t" },
          { id: "f2", cid: OTHER_CID, name: "b.png", size: 1, mimeType: "image/png", keyvalues: {}, createdAt: "t" },
        ],
        nextPageToken: "next",
      });
      setReferences(
        [{ _id: assetId, storageReferenceId: CID }],
        [{ _id: manifestId, ipfsCid: CID }],
      );

      const result = await pinLifecycleService.listPins({ limit: 2 });

      expect(listPins).toHaveBeenCalledWith({ limit: 2 });
      expect(result.nextPageToken).toBe("next");
      expect(result.pins[0]).toMatchObject({
        cid: CID,
        tracked: true,
        trackedAssetIds: [assetId.toString()],
        trackedManifestIds: [manifestId.toString()],
      });
      expect(result.pins[1]).toMatchObject({
        cid: OTHER_CID,
        tracked: false,
        trackedAssetIds: [],
        trackedManifestIds: [],
      });
      const assetFilter = AssetMock.find.mock.calls[0][0];
      expect(assetFilter.storageReferenceId.$in.sort()).toEqual([CID, OTHER_CID].sort());
    });
  });
});

describe("AssetService.deleteAsset", () => {
  const ownerId = oid();

  const storedAsset = (overrides: Record<string, unknown> = {}) => ({
    _id: oid(),
    creatorId: ownerId,
    fileName: "photo.png",
    storageProvider: "ipfs",
    storageReferenceId: CID,
    ...overrides,
  });

  const givenAsset = (asset: ReturnType<typeof storedAsset> | null) => {
    AssetMock.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(asset) });
  };

  it("releases the IPFS pin, then deletes the asset for its owner", async () => {
    const asset = storedAsset();
    givenAsset(asset);
    setReferences([{ _id: asset._id, storageReferenceId: CID }]);

    const result = await assetService.deleteAsset(asset._id.toString(), {
      id: ownerId.toString(),
      role: "creator",
    });

    expect(unpinCid).toHaveBeenCalledWith(CID);
    expect(AssetMock.deleteOne).toHaveBeenCalledWith({ _id: asset._id });
    expect(unpinCid.mock.invocationCallOrder[0]).toBeLessThan(
      AssetMock.deleteOne.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      assetId: asset._id.toString(),
      fileName: "photo.png",
      storageProvider: "ipfs",
      storageReferenceId: CID,
      pinRelease: { cid: CID, released: true, fileIds: ["f1"] },
    });
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it("lets an admin delete another user's asset", async () => {
    const asset = storedAsset();
    givenAsset(asset);
    setReferences([]);

    await expect(
      assetService.deleteAsset(asset._id.toString(), { id: oid().toString(), role: "admin" }),
    ).resolves.toMatchObject({ assetId: asset._id.toString() });
  });

  it("does not touch Pinata for non-IPFS assets", async () => {
    const asset = storedAsset({ storageProvider: "cloudinary", storageReferenceId: "https://res.cloudinary.com/x" });
    givenAsset(asset);

    const result = await assetService.deleteAsset(asset._id.toString(), {
      id: ownerId.toString(),
      role: "creator",
    });

    expect(unpinCid).not.toHaveBeenCalled();
    expect(result.pinRelease).toBeUndefined();
    expect(AssetMock.deleteOne).toHaveBeenCalled();
  });

  it("keeps the asset when Pinata fails so the delete can be retried", async () => {
    const asset = storedAsset();
    givenAsset(asset);
    setReferences([]);
    unpinCid.mockRejectedValue(new AppError("IPFS unpin failed", 502, "IPFS_UNPIN_FAILED"));

    await expect(
      assetService.deleteAsset(asset._id.toString(), { id: ownerId.toString(), role: "creator" }),
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(AssetMock.deleteOne).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid id", "not-an-id", null, 400, "INVALID_ASSET_ID"],
    ["a missing asset", new mongoose.Types.ObjectId().toString(), null, 404, "ASSET_NOT_FOUND"],
  ])("rejects %s", async (_label, id, asset, statusCode, code) => {
    givenAsset(asset);

    await expect(
      assetService.deleteAsset(id, { id: ownerId.toString(), role: "creator" }),
    ).rejects.toMatchObject({ statusCode, code });
  });

  it("forbids non-owners", async () => {
    const asset = storedAsset();
    givenAsset(asset);

    await expect(
      assetService.deleteAsset(asset._id.toString(), { id: oid().toString(), role: "creator" }),
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(unpinCid).not.toHaveBeenCalled();
  });

  it("refuses to delete assets referenced by a verification job", async () => {
    const asset = storedAsset();
    givenAsset(asset);
    JobMock.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: oid() }) });

    await expect(
      assetService.deleteAsset(asset._id.toString(), { id: ownerId.toString(), role: "creator" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "ASSET_IN_USE" });
    expect(unpinCid).not.toHaveBeenCalled();
    expect(AssetMock.deleteOne).not.toHaveBeenCalled();
  });
});

describe("CleanupService orphaned IPFS assets", () => {
  const givenOrphans = (orphans: Array<Record<string, unknown>>) => {
    process.env.CLEANUP_ORPHAN_AGE_HOURS = "24";
    JobMock.distinct.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    AssetMock.find.mockImplementation((filter: Record<string, unknown>) => {
      if ("createdAt" in filter) return mockQuery(orphans);
      const excluded = ((filter._id as { $nin: mongoose.Types.ObjectId[] })?.$nin ?? []).map(String);
      return mockQuery(
        orphans.filter((o) => o.storageProvider === "ipfs" && !excluded.includes(String(o._id))),
      );
    });
    ManifestMock.find.mockImplementation(() => mockQuery([]));
  };

  it("releases the pin and deletes the orphaned asset", async () => {
    const orphan = { _id: oid(), storageProvider: "ipfs", storageReferenceId: CID };
    givenOrphans([orphan]);

    const result = await cleanupService.runOrphanedAssetCleanup();

    expect(unpinCid).toHaveBeenCalledWith(CID);
    expect(AssetMock.deleteOne).toHaveBeenCalledWith({ _id: orphan._id });
    expect(result).toMatchObject({ totalFound: 1, totalDeleted: 1, totalFailed: 0 });
    expect(result.assets[0].remoteDeleteSuccess).toBe(true);
  });

  it("keeps the asset for the next cycle when the unpin fails", async () => {
    const orphan = { _id: oid(), storageProvider: "ipfs", storageReferenceId: CID };
    givenOrphans([orphan]);
    unpinCid.mockRejectedValue(new Error("pinata down"));

    const result = await cleanupService.runOrphanedAssetCleanup();

    expect(AssetMock.deleteOne).not.toHaveBeenCalled();
    expect(result).toMatchObject({ totalFound: 1, totalDeleted: 0, totalFailed: 1 });
    expect(result.errors[0]).toContain("will retry next cycle");
  });

  it("releases a shared CID only once the last orphan referencing it is removed", async () => {
    const first = { _id: oid(), storageProvider: "ipfs", storageReferenceId: CID };
    const second = { _id: oid(), storageProvider: "ipfs", storageReferenceId: CID };
    const remaining = [first, second];
    givenOrphans(remaining);
    AssetMock.deleteOne.mockImplementation(({ _id }: { _id: mongoose.Types.ObjectId }) => {
      remaining.splice(remaining.findIndex((a) => a._id === _id), 1);
      return { exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    });
    // Orphan query snapshot is taken up front; reference lookups see live state.
    const snapshot = [...remaining];
    AssetMock.find.mockImplementation((filter: Record<string, unknown>) => {
      if ("createdAt" in filter) return mockQuery(snapshot);
      const excluded = ((filter._id as { $nin: mongoose.Types.ObjectId[] })?.$nin ?? []).map(String);
      return mockQuery(remaining.filter((o) => !excluded.includes(String(o._id))));
    });

    const result = await cleanupService.runOrphanedAssetCleanup();

    expect(unpinCid).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ totalDeleted: 2, totalFailed: 0 });
  });
});
