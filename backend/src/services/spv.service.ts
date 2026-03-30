import crypto from 'crypto';
import mongoose from 'mongoose';
import KMSKey from '../models/KMSKey.model';
import SPVRecord from '../models/SPVRecord.model';
import Asset from '../models/Asset.model';

/**
 * SPV Service
 * Handles Sealed Provenance Vault operations including file encryption
 * and SPV record management
 */

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = process.env.MASTER_KEY || 'default-master-key-change-in-production';

interface EncryptedFileData {
  encryptedBuffer: Buffer;
  iv: string;
  authTag: string;
  keyVersion: string;
}

interface SPVRecordData {
  assetId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  kmsKeyId: mongoose.Types.ObjectId;
  accessType: 'private' | 'public_with_conditions' | 'nft_holders_only' | 'specific_users';
  allowedUsers?: mongoose.Types.ObjectId[];
  nftContractAddress?: string;
  isSealed: boolean;
}

/**
 * Decrypts a symmetric key using the master key
 */
function decryptKeyWithMaster(encryptedKey: string, iv: string, authTag: string): Buffer {
  const masterKeyBuffer = crypto.createHash('sha256').update(MASTER_KEY).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKeyBuffer, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return Buffer.from(decrypted, 'hex');
}

/**
 * Encrypts a file buffer using the user's active KMS key
 */
export async function encryptFileForSPV(
  fileBuffer: Buffer,
  userId: string
): Promise<EncryptedFileData> {
  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId format');
  }

  // Get the active KMS key for the user
  const activeKey = await KMSKey.findOne({
    creatorId: userId,
    isActive: true
  });

  if (!activeKey) {
    throw new Error('No active KMS key found for user');
  }

  // Decrypt the symmetric key from KMS
  const symmetricKey = decryptKeyWithMaster(
    activeKey.encryptedKeyValue,
    activeKey.iv,
    activeKey.authTag
  );

  // Generate a new IV for this file encryption
  const iv = crypto.randomBytes(16);
  
  // Encrypt the file buffer
  const cipher = crypto.createCipheriv(ALGORITHM, symmetricKey, iv);
  const encryptedBuffer = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();

  return {
    encryptedBuffer,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    keyVersion: activeKey.keyVersion
  };
}

/**
 * Creates an SPV record for an encrypted asset
 */
export async function createSPVRecord(data: SPVRecordData) {
  const spvRecord = new SPVRecord(data);
  await spvRecord.save();
  return spvRecord;
}

/**
 * Gets an SPV record by asset ID
 */
export async function getSPVRecordByAssetId(assetId: string) {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw new Error('Invalid assetId format');
  }

  return await SPVRecord.findOne({ assetId })
    .populate('assetId')
    .populate('creatorId', 'email username')
    .populate('kmsKeyId', 'keyVersion algorithm isActive');
}

/**
 * Gets all SPV records for a user
 */
export async function getSPVRecordsByUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId format');
  }

  return await SPVRecord.find({ creatorId: userId })
    .populate('assetId')
    .populate('kmsKeyId', 'keyVersion algorithm isActive')
    .sort({ createdAt: -1 });
}

/**
 * Updates the sealed status of an SPV record
 */
export async function updateSealedStatus(
  spvRecordId: string,
  isSealed: boolean
) {
  if (!mongoose.Types.ObjectId.isValid(spvRecordId)) {
    throw new Error('Invalid SPV record ID format');
  }

  const spvRecord = await SPVRecord.findById(spvRecordId);

  if (!spvRecord) {
    throw new Error('SPV record not found');
  }

  spvRecord.isSealed = isSealed;
  await spvRecord.save();

  return spvRecord;
}

/**
 * Decrypts a file buffer using the specified KMS key version
 */
export async function decryptFileFromSPV(
  encryptedBuffer: Buffer,
  iv: string,
  authTag: string,
  userId: string,
  keyVersion: string
): Promise<Buffer> {
  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId format');
  }

  // Get the specific KMS key version
  const kmsKey = await KMSKey.findOne({
    creatorId: userId,
    keyVersion: keyVersion
  });

  if (!kmsKey) {
    throw new Error(`KMS key version ${keyVersion} not found for user`);
  }

  // Decrypt the symmetric key from KMS
  const symmetricKey = decryptKeyWithMaster(
    kmsKey.encryptedKeyValue,
    kmsKey.iv,
    kmsKey.authTag
  );

  // Decrypt the file buffer
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    symmetricKey,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decryptedBuffer = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final()
  ]);

  return decryptedBuffer;
}
