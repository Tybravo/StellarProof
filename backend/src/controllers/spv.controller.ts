import mongoose from 'mongoose';
import { ISPVRecord, SPVRecord } from '../models/SPVRecord.model';
// import any storage/encryption utils you use

// ✅ 1. Export the type
export type SupportedStorageProvider = 'cloudinary' | 'ipfs';

// Optional: define input type for clarity
interface UploadEncryptedAssetInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  creatorId: mongoose.Types.ObjectId;
  storageProvider: SupportedStorageProvider;
  accessType: ISPVRecord['accessType'];
  allowedUsers: mongoose.Types.ObjectId[];
  nftContractAddress?: string;
}

// ✅ 2. Implement service object
export const spvService = {
  async uploadEncryptedAsset(input: UploadEncryptedAssetInput) {
    const {
      fileBuffer,
      fileName,
      mimeType,
      creatorId,
      storageProvider,
      accessType,
      allowedUsers,
      nftContractAddress,
    } = input;

    // 🔐 1. Encrypt file (stub)
    const encryptedBuffer = fileBuffer; // replace with real encryption

    // ☁️ 2. Upload to storage provider (stub)
    let storageUrl = '';
    let storageReferenceId = '';

    if (storageProvider === 'cloudinary') {
      // TODO: integrate cloudinary upload
      storageUrl = 'https://cloudinary.com/fake-url';
      storageReferenceId = 'cloudinary-id';
    } else if (storageProvider === 'ipfs') {
      // TODO: integrate IPFS upload
      storageUrl = 'https://ipfs.io/ipfs/fake-hash';
      storageReferenceId = 'ipfs-hash';
    }

    // 🗄️ 3. Create SPV record
    const spvRecord = await SPVRecord.create({
      creator: creatorId,
      accessType,
      allowedUsers,
      nftContractAddress,
      storageProvider,
      storageUrl,
      storageReferenceId,
      isSealed: true,
    });

    // (Optional) asset record if you have one
    const asset = {
      _id: new mongoose.Types.ObjectId(),
      fileName,
      mimeType,
    };

    return {
      spvRecord,
      asset,
      storageUrl,
      storageReferenceId,
    };
  },

  async getSPVRecord(spvId: string, requesterId: mongoose.Types.ObjectId) {
    const record = await SPVRecord.findById(spvId);

    if (!record) return null;

    // 🔐 Basic access control (adjust as needed)
    const isOwner = record.creator.equals(requesterId);
    const isAllowedUser = record.allowedUsers?.some((id: mongoose.Types.ObjectId) =>
      id.equals(requesterId),
    );

    if (!isOwner && !isAllowedUser) {
      return null;
    }

    return record;
  },
};
