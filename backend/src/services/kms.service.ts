import crypto from 'crypto';
import mongoose from 'mongoose';
import KMSKey, { IKMSKey } from '../models/KMSKey.model';
import Asset from '../models/Asset.model';
import { cloudinaryService } from './cloudinary.service';
import { ipfsService } from './ipfs.service';
import { v2 as cloudinary } from 'cloudinary';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce is standard for GCM buffers
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const MASTER_KEY = process.env.MASTER_KEY || 'default-master-key-change-in-production';

export class KmsService {
  /**
   * Generates a new 256-bit symmetric key for encryption
   */
  generateSymmetricKey(): Buffer {
    return crypto.randomBytes(32); 
  }

  /**
   * Encrypts a buffer using AES-256-GCM.
   * Returns a concatenated buffer: [IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)]
   * @param buffer The plaintext buffer to encrypt
   * @param key A 32-byte (256-bit) encryption key
   */
  encryptBuffer(buffer: Buffer, key: Buffer): Buffer {
    if (key.length !== 32) {
      throw new Error('Invalid KMS key length. AES-256 requires exactly a 32-byte key.');
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Ensure the auth tag is appended to the payload per requirements
      return Buffer.concat([iv, ciphertext, authTag]);
    } catch (error) {
      throw new Error(`KMS Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypts an AES-256-GCM encrypted buffer.
   * Expects the exact packed format: [IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)]
   * @param encryptedBuffer The packed encrypted payload
   * @param key A 32-byte (256-bit) decryption key
   */
  decryptBuffer(encryptedBuffer: Buffer, key: Buffer): Buffer {
    if (key.length !== 32) {
      throw new Error('Invalid KMS key length. AES-256 requires exactly a 32-byte key.');
    }

    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted payload is too short. Missing IV or Auth Tag.');
    }

    try {
      const iv = encryptedBuffer.subarray(0, IV_LENGTH);
      const authTag = encryptedBuffer.subarray(encryptedBuffer.length - AUTH_TAG_LENGTH);
      const ciphertext = encryptedBuffer.subarray(IV_LENGTH, encryptedBuffer.length - AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (error) {
      throw new Error(`KMS Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypts a symmetric key using the master key (Hex output for DB storage)
   */
  private encryptKeyWithMaster(symmetricKey: Buffer): { encrypted: string; iv: string; authTag: string } {
    const masterKeyBuffer = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const iv = crypto.randomBytes(16); // 16 bytes for hex storage format
    const cipher = crypto.createCipheriv(ALGORITHM, masterKeyBuffer, iv);
    
    let encrypted = cipher.update(symmetricKey.toString('hex'), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypts a symmetric key using the master key (Hex input from DB)
   */
  private decryptKeyWithMaster(encryptedKey: string, iv: string, authTag: string): Buffer {
    const masterKeyBuffer = crypto.createHash('sha256').update(MASTER_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKeyBuffer, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decryptedHex = decipher.update(encryptedKey, 'hex', 'utf8');
    decryptedHex += decipher.final('utf8');
    return Buffer.from(decryptedHex, 'hex');
  }

  /**
   * Gets the active KMS key for a user
   */
  async getActiveKey(userId: string): Promise<IKMSKey | null> {
    return await KMSKey.findOne({ creatorId: userId, isActive: true });
  }

  /**
   * Gets all KMS keys for a user
   */
  async getAllKeys(userId: string): Promise<IKMSKey[]> {
    return await KMSKey.find({ creatorId: userId }).sort({ createdAt: -1 });
  }

  /**
   * Revokes a KMS key
   */
  async revokeKey(keyId: string): Promise<IKMSKey> {
    const key = await KMSKey.findById(keyId);
    if (!key) throw new Error('KMS key not found');
    if (!key.isActive) throw new Error('KMS key is already inactive');

    key.isActive = false;
    await key.save();
    return key;
  }

  /**
   * Rotates a KMS key for a user
   */
  async rotateKey(userId: string): Promise<{
    oldKeyVersion: string;
    newKeyVersion: string;
    assetsReEncrypted: number;
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const activeKey = await KMSKey.findOne({ creatorId: userId, isActive: true }).session(session);
      if (!activeKey) throw new Error('No active KMS key found for user');

      const oldKeyVersion = activeKey.keyVersion;
      const versionMatch = oldKeyVersion.match(/^v(\d+)$/);
      if (!versionMatch) throw new Error('Invalid key version format');
      
      const newKeyVersion = `v${parseInt(versionMatch[1]) + 1}`;

      // Generate new symmetric key and encrypt with master
      const newSymmetricKey = this.generateSymmetricKey();
      const encryptedNewKey = this.encryptKeyWithMaster(newSymmetricKey);

      // Decrypt old symmetric key to access existing asset data
      const oldSymmetricKey = this.decryptKeyWithMaster(
        activeKey.encryptedKeyValue,
        activeKey.iv,
        activeKey.authTag
      );

      // Find all assets encrypted with the old key
      const assetsToReEncrypt = await Asset.find({
        creatorId: userId,
        isEncrypted: true,
        encryptionKeyVersion: oldKeyVersion
      }).session(session);

      // Re-encrypt actual asset data and update metadata
      for (const asset of assetsToReEncrypt) {
        try {
          // 1. Resolve URL and fetch the encrypted blob from storage
          let downloadUrl = '';
          if (asset.storageProvider === 'cloudinary') {
            downloadUrl = cloudinary.url(asset.storageReferenceId, { resource_type: 'raw', secure: true });
          } else if (asset.storageProvider === 'ipfs') {
            downloadUrl = `${process.env.PINATA_GATEWAY_URL}/${asset.storageReferenceId}`;
          } else {
            throw new Error(`Storage provider ${asset.storageProvider} not supported for rotation`);
          }

          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error(`Failed to fetch blob from ${asset.storageProvider}`);
          const encryptedBlob = Buffer.from(await response.arrayBuffer());

          // 2. Decrypt with old key, Re-encrypt with new key
          const decryptedPayload = this.decryptBuffer(encryptedBlob, oldSymmetricKey);
          const newEncryptedBlob = this.encryptBuffer(decryptedPayload, newSymmetricKey);

          // 3. Upload the newly encrypted blob
          if (asset.storageProvider === 'cloudinary') {
            const uploadResult = await cloudinaryService.uploadBuffer(newEncryptedBlob, `stellarproof/spv-rotated/${userId}`);
            asset.storageReferenceId = uploadResult.public_id;
          } else if (asset.storageProvider === 'ipfs') {
            const uploadResult = await ipfsService.upload({ content: newEncryptedBlob, name: asset.fileName });
            asset.storageReferenceId = uploadResult.cid;
          }
        } catch (error) {
          throw new Error(`Failed to re-encrypt asset ${asset._id}: ${(error as Error).message}`);
        }

        asset.encryptionKeyVersion = newKeyVersion;
        await asset.save({ session });
      }

      // Deactivate old key
      activeKey.isActive = false;
      await activeKey.save({ session });

      // Save new key
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
}

export const kmsService = new KmsService();