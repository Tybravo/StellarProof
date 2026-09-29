import { verificationService } from '../services/verification.service';
import { VerificationJobModel } from '../models/verificationJob.model';
import Manifest from '../models/Manifest.model';
import { ipfsService } from '../services/ipfs.service';
import { VerificationStatus } from '../types/verification.types';
import mongoose from 'mongoose';

jest.mock('../models/verificationJob.model');
jest.mock('../models/Manifest.model');
jest.mock('../services/ipfs.service');

describe('verificationService.verifyManifestIntegrity', () => {
  const jobId = new mongoose.Types.ObjectId().toString();
  const manifestId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leaves the job untouched when the recomputed hash matches the stored hash', async () => {
    const fetchedJson = { contentHash: 'abc', creator: 'GXYZ', timestamp: '2026-01-01T00:00:00.000Z', metadata: {} };

    const mockJob = {
      _id: jobId,
      manifestId,
      status: VerificationStatus.PENDING,
      toObject: jest.fn().mockReturnValue({ _id: jobId, status: VerificationStatus.PENDING }),
    };

    (VerificationJobModel.findById as jest.Mock).mockResolvedValue(mockJob);

    const crypto = require('../utils/crypto');
    const expectedHash = crypto.generateDeterministicHash(fetchedJson);

    (Manifest.findById as jest.Mock).mockResolvedValue({
      _id: manifestId,
      ipfsCid: 'bafy123',
      ipfsUrl: undefined,
      manifestHash: expectedHash,
    });

    (ipfsService.fetchManifestJson as jest.Mock).mockResolvedValue(fetchedJson);

    const result = await verificationService.verifyManifestIntegrity(jobId);

    expect(ipfsService.fetchManifestJson).toHaveBeenCalledWith('bafy123');
    expect(result).toEqual({ _id: jobId, status: VerificationStatus.PENDING });
  });

  it('marks the job failed when the recomputed hash does not match the stored hash', async () => {
    const fetchedJson = { contentHash: 'tampered', creator: 'GXYZ', timestamp: '2026-01-01T00:00:00.000Z', metadata: {} };

    const mockJob = {
      _id: jobId,
      manifestId,
      status: VerificationStatus.PENDING,
      toObject: jest.fn(),
    };

    (VerificationJobModel.findById as jest.Mock)
      .mockResolvedValueOnce(mockJob) // initial lookup in verifyManifestIntegrity
      .mockResolvedValueOnce({
        ...mockJob,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: jobId, status: VerificationStatus.FAILED }),
      }); // lookup inside updateJobStatus

    (Manifest.findById as jest.Mock).mockResolvedValue({
      _id: manifestId,
      ipfsCid: 'bafy123',
      ipfsUrl: undefined,
      manifestHash: 'a-completely-different-hash',
    });

    (ipfsService.fetchManifestJson as jest.Mock).mockResolvedValue(fetchedJson);

    const result = await verificationService.verifyManifestIntegrity(jobId);

    expect(result.status).toBe(VerificationStatus.FAILED);
  });
});