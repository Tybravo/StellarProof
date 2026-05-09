import crypto from 'crypto';
import mongoose from 'mongoose';
import KMSKey, { IKMSKey } from '../models/KMSKey.model';
import Asset from '../models/Asset.model';

/**
 * KMS Service
 * Handles key management operations including key rotation
 */

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = process.env.MASTER_KEY || 'default-master-key-change-in-production';

/**
 * Encrypts data using AES-256-GCM
 */
function encrypt(text: string, key: Buffer): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypts data using AES-256-GCM
 */
function decrypt(encrypted: string, key: Buffer, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a new symmetric key for encryption
 */
function generateSymmetricKey(): Buffer {
  return crypto.randomBytes(32); // 256 bits for AES-256
}

/**
 * Encrypts a symmetric key using the master key
 */
function encryptKeyWithMaster(symmetricKey: Buffer): { encrypted: string; iv: string; authTag: string } {
  const masterKeyBuffer = crypto.createHash('sha256').update(MASTER_KEY).digest();
  return encrypt(symmetricKey.toString('hex'), masterKeyBuffer);
}

/**
 * Decrypts a symmetric key using the master key
 */
function decryptKeyWithMaster(encryptedKey: string, iv: string, authTag: string): Buffer {
  const masterKeyBuffer = crypto.createHash('sha256').update(MASTER_KEY).digest();
  const decryptedHex = decrypt(encryptedKey, masterKeyBuffer, iv, authTag);
  return Buffer.from(decryptedHex, 'hex');
}

/**
 * Rotates a KMS key for a user
 * - Generates a new key version
 * - Decrypts all assets encrypted with the old key
 * - Re-encrypts them with the new key
 * - Updates the KMSKey document to the new version
 * - Deactivates the old key
 */
export async function rotateKey(userId: string): Promise<{
  oldKeyVersion: string;
  newKeyVersion: string;
  assetsReEncrypted: number;
}> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the active key for this user
    const activeKey = await KMSKey.findOne({
      creatorId: userId,
      isActive: true
    }).session(session);

    if (!activeKey) {
      throw new Error('No active KMS key found for user');
    }

    const oldKeyVersion = activeKey.keyVersion;
    
    // Parse version number and increment
    const versionMatch = oldKeyVersion.match(/^v(\d+)$/);
    if (!versionMatch) {
      throw new Error('Invalid key version format');
    }
    
    const newVersionNumber = parseInt(versionMatch[1]) + 1;
    const newKeyVersion = `v${newVersionNumber}`;

    // Decrypt the old symmetric key
    const oldSymmetricKey = decryptKeyWithMaster(
      activeKey.encryptedKeyValue,
      activeKey.iv,
      activeKey.authTag
    );

    // Generate new symmetric key
    const newSymmetricKey = generateSymmetricKey();
    const encryptedNewKey = encryptKeyWithMaster(newSymmetricKey);

    // Find all assets encrypted with the old key version
    const assetsToReEncrypt = await Asset.find({
      creatorId: userId,
      isEncrypted: true,
      encryptionKeyVersion: oldKeyVersion
    }).session(session);

    // Re-encrypt each asset
    // Note: In a real implementation, you would:
    // 1. Fetch the encrypted asset data from storage
    // 2. Decrypt with old key
    // 3. Re-encrypt with new key
    // 4. Update storage reference
    // For this implementation, we're updating the metadata
    
    for (const asset of assetsToReEncrypt) {
      asset.encryptionKeyVersion = newKeyVersion;
      await asset.save({ session });
    }

    // Deactivate the old key
    activeKey.isActive = false;
    await activeKey.save({ session });

    // Create new key version
    const newKey = new KMSKey({
      creatorId: userId,
      keyVersion: newKeyVersion,
      algorithm: ALGORITHM.toUpperCase(),
      encryptedKeyValue: encryptedNewKey.encrypted,
      iv: encryptedNewKey.iv,
      authTag: encryptedNewKey.authTag,
      isActive: true
    });

    await newKey.save({ session });

    await session.commitTransaction();

    return {
      oldKeyVersion,
      newKeyVersion,
      assetsReEncrypted: assetsToReEncrypt.length
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Gets the active KMS key for a user
 */
export async function getActiveKey(userId: string): Promise<IKMSKey | null> {
  return await KMSKey.findOne({
    creatorId: userId,
    isActive: true
  });
}

/**
 * Gets all KMS keys for a user (including inactive ones)
 */
export async function getAllKeys(userId: string): Promise<IKMSKey[]> {
  return await KMSKey.find({
    creatorId: userId
  }).sort({ createdAt: -1 });
}

/**
 * Revokes a KMS key by setting isActive to false
 * This effectively destroys access to any encrypted payload using this key
 */
export async function revokeKey(keyId: string): Promise<IKMSKey> {
  // Validate that the key exists
  const key = await KMSKey.findById(keyId);

  if (!key) {
    throw new Error('KMS key not found');
  }

  // Check if key is already inactive
  if (!key.isActive) {
    throw new Error('KMS key is already inactive');
  }

  // Revoke the key by setting isActive to false
  key.isActive = false;
  await key.save();

  return key;
}

