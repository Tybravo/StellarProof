import { verificationService } from '../services/verification.service';
import { VerificationJobModel } from '../models/verificationJob.model';
import { VerificationRequestEventModel } from '../models/verificationRequestEvent.model';
import Manifest from '../models/Manifest.model';
import { ipfsService } from '../services/ipfs.service';
import { VerificationStatus } from '../types/verification.types';
import mongoose from 'mongoose';

jest.mock('../models/verificationJob.model');
jest.mock('../models/verificationRequestEvent.model');
jest.mock('../models/Manifest.model');
jest.mock('../services/ipfs.service');
jest.mock('../services/statusStream.service', () => ({
  statusStreamService: { broadcast: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/webhook.service', () => ({
  webhookService: { dispatchJobEvent: jest.fn().mockResolvedValue(true) },
}));

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

describe('verificationService job history and retry', () => {
  const jobId = new mongoose.Types.ObjectId().toString();
  const ownerPublicKey = 'G'.padEnd(56, 'A');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stored timeline entries to the owner and fills legacy actor values', async () => {
    const job = {
      _id: jobId,
      ownerPublicKey,
      timeline: [
        { stage: VerificationStatus.PENDING, at: new Date(), actor: undefined },
        { stage: VerificationStatus.MINTING, at: new Date(), actor: 'oracle', txHash: 'tx-1' },
      ],
    };
    (VerificationJobModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(job),
    });

    const timeline = await verificationService.getJobTimeline(jobId, {
      role: 'creator',
      stellarPublicKey: ownerPublicKey,
    });

    expect(timeline[0].actor).toBe('worker');
    expect(timeline[1]).toMatchObject({ actor: 'oracle', txHash: 'tx-1', timestamp: job.timeline[1].at });
  });

  it("allows an admin to read another owner's timeline", async () => {
    (VerificationJobModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: jobId,
        ownerPublicKey,
        timeline: [],
      }),
    });

    await expect(
      verificationService.getJobTimeline(jobId, { role: 'admin' })
    ).resolves.toEqual([]);
  });

  it('creates a pending retry with the original content hash and a new request ID', async () => {
    const failedJob = {
      _id: jobId,
      ownerPublicKey,
      contentHash: 'a'.repeat(64),
      requestId: 'request-original',
      status: VerificationStatus.FAILED,
      timeline: [],
    };
    (VerificationRequestEventModel.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        eventId: failedJob.requestId,
        mediaCid: 'media-cid',
        manifestCid: 'manifest-cid',
        requester: ownerPublicKey,
      }),
    });
    (VerificationRequestEventModel.create as jest.Mock).mockResolvedValue({});
    const retryDocument = {
      _id: new mongoose.Types.ObjectId(),
      toObject: jest.fn().mockReturnValue({ _id: 'retry-id', status: VerificationStatus.PENDING }),
    };
    (VerificationJobModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(failedJob),
    });
    (VerificationJobModel.create as jest.Mock).mockResolvedValue(retryDocument);

    await verificationService.retryJob(jobId, {
      role: 'creator',
      stellarPublicKey: ownerPublicKey,
    });

    const newJob = (VerificationJobModel.create as jest.Mock).mock.calls[0][0];
    expect(newJob).toMatchObject({
      ownerPublicKey,
      contentHash: failedJob.contentHash,
      status: VerificationStatus.PENDING,
      timeline: [{ stage: VerificationStatus.PENDING, actor: 'user' }],
    });
    expect(newJob.requestId).not.toBe(failedJob.requestId);
    expect(VerificationRequestEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: newJob.requestId,
        mediaCid: 'media-cid',
        manifestCid: 'manifest-cid',
        requester: ownerPublicKey,
        verificationJobId: retryDocument._id,
      })
    );
  });
});