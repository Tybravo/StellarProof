import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db';
import KMSKey from '../models/KMSKey.model';
import Asset from '../models/Asset.model';
import User from '../models/User.model';

dotenv.config();

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
 * Seeds the database with sample KMS data for testing
 */
async function seedKMSData() {
  try {
    await connectDB();

    console.log('🌱 Starting KMS data seeding...\n');

    // Create a test user
    const testUser = new User({
      email: 'test@stellarproof.com',
      passwordHash: 'hashedpassword123', // In real app, this would be bcrypt hashed
      stellarPublicKey: null,
      role: 'creator'
    });

    await testUser.save();
    console.log(`✅ Created test user: ${testUser._id}`);

    // Generate and encrypt a symmetric key
    const symmetricKey = generateSymmetricKey();
    const encryptedKey = encryptKeyWithMaster(symmetricKey);

    // Create a KMS key for the user
    const kmsKey = new KMSKey({
      creatorId: testUser._id,
      keyVersion: 'v1',
      algorithm: 'AES-256-GCM',
      encryptedKeyValue: encryptedKey.encrypted,
      iv: encryptedKey.iv,
      authTag: encryptedKey.authTag,
      isActive: true
    });

    await kmsKey.save();
    console.log(`✅ Created KMS key v1 for user: ${kmsKey._id}`);

    // Create sample encrypted assets
    const assetNames = [
      'contract_document.pdf',
      'identity_verification.jpg',
      'financial_statement.xlsx',
      'legal_agreement.docx',
      'medical_record.pdf'
    ];

    for (const fileName of assetNames) {
      const asset = new Asset({
        creatorId: testUser._id,
        fileName,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 
                  fileName.endsWith('.jpg') ? 'image/jpeg' :
                  fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: Math.floor(Math.random() * 1000000) + 100000,
        storageProvider: 'mongodb',
        storageReferenceId: new mongoose.Types.ObjectId().toString(),
        isEncrypted: true,
        encryptionKeyVersion: 'v1',
        accessPolicy: 'private'
      });

      await asset.save();
      console.log(`✅ Created encrypted asset: ${fileName}`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`\n📝 Test User ID: ${testUser._id}`);
    console.log(`\nYou can now test the key rotation API with this userId.`);
    console.log(`\nExample Postman request:`);
    console.log(`POST http://localhost:4000/api/v1/kms/rotate`);
    console.log(`Body: { "userId": "${testUser._id}" }`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
}

// Run the seeder
seedKMSData();
