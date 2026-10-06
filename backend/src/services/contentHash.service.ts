import { computeSha256 } from '../utils/crypto';

/**
 * Simple content hash service for controllers
 */
class ContentHashService {
  verify(buffer: Buffer, providedHash?: string): string {
    const computed = computeSha256(buffer);
    if (providedHash && providedHash !== computed) {
      throw new Error(`Content hash mismatch: expected ${providedHash}, got ${computed}`);
    }
    return computed;
  }

  async checkUpload(buffer: Buffer, providedHash?: string, userId?: string): Promise<any> {
    const hash = this.verify(buffer, providedHash);
    return {
      contentHash: hash,
      size: buffer.length,
      matches: true,
      alreadyStored: false,
      existingRecords: []
    };
  }
}

export const contentHashService = new ContentHashService();