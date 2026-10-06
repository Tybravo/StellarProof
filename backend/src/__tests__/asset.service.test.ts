import mongoose from "mongoose";
import Asset from "../models/Asset.model";
import { assetService } from "../services/asset.service";
import type { UploadResult } from "../types/storage.types";

jest.mock("../models/Asset.model");

const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const CID_V0 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

describe("AssetService.createFromUpload", () => {
  const creatorId = new mongoose.Types.ObjectId().toString();
  const assetId = new mongoose.Types.ObjectId();

  const ipfsUpload: UploadResult = {
    provider: "ipfs",
    url: `https://gateway.pinata.cloud/ipfs/${CID_V1}`,
    cid: CID_V1,
    size: 2048,
    mimetype: "image/png",
    uploadedAt: new Date(),
    requestedProvider: "ipfs",
    fallbackUsed: false,
  };

  let save: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    save = jest.fn().mockResolvedValue({ _id: assetId });
    (Asset as unknown as jest.Mock).mockImplementation((data) => ({ ...data, save }));
  });

  it("persists the CIDv1 mediaCid as storageReferenceId and returns the stored asset", async () => {
    const stored = { _id: assetId, storageProvider: "ipfs", storageReferenceId: CID_V1 };
    (Asset.findById as jest.Mock).mockResolvedValue(stored);

    const result = await assetService.createFromUpload({
      creatorId,
      fileName: "photo.png",
      upload: ipfsUpload,
    });

    const persisted = (Asset as unknown as jest.Mock).mock.calls[0][0];
    expect(persisted).toEqual(
      expect.objectContaining({
        fileName: "photo.png",
        mimeType: "image/png",
        sizeBytes: 2048,
        storageProvider: "ipfs",
        storageReferenceId: CID_V1,
        isEncrypted: false,
      })
    );
    expect(persisted.creatorId.toString()).toBe(creatorId);
    expect(Asset.findById).toHaveBeenCalledWith(String(assetId));
    expect(result).toBe(stored);
  });

  it("refuses to link an IPFS upload whose CID is not CIDv1", async () => {
    await expect(
      assetService.createFromUpload({
        creatorId,
        fileName: "photo.png",
        upload: { ...ipfsUpload, cid: CID_V0 },
      })
    ).rejects.toMatchObject({ statusCode: 502, code: "IPFS_CID_VERSION_MISMATCH" });
    expect(save).not.toHaveBeenCalled();
  });

  it("uses the provider URL as the reference for non-IPFS uploads", async () => {
    (Asset.findById as jest.Mock).mockResolvedValue({ _id: assetId });
    const url = "https://res.cloudinary.com/demo/image/upload/v1/photo.png";

    await assetService.createFromUpload({
      creatorId,
      fileName: "photo.png",
      upload: { ...ipfsUpload, provider: "cloudinary", cid: undefined, publicId: "photo", url },
    });

    expect((Asset as unknown as jest.Mock).mock.calls[0][0].storageReferenceId).toBe(url);
  });

  it("fails loudly when the created asset cannot be read back", async () => {
    (Asset.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      assetService.createFromUpload({ creatorId, fileName: "photo.png", upload: ipfsUpload })
    ).rejects.toMatchObject({ statusCode: 500, code: "DB_RETRIEVAL_FAILED" });
  });
});
