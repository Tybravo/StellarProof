import { manifestService } from '../services/manifest.service';
import Manifest from '../models/Manifest.model';
import mongoose from 'mongoose';

jest.mock('../models/Manifest.model');

describe('Manifest Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if required schema fields are missing', async () => {
    await expect(manifestService.processManifest({ creator: 'GABCDEF...' })).rejects.toThrow(
      'Validation Error: "contentHash", "creator", "creatorId", and "timestamp" are strictly required.'
    );
  });

  it('should strip malicious scripts and truncate massive text blocks from metadata', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    (Manifest as unknown as jest.Mock).mockImplementation((data) => ({
      ...data,
      save: mockSave,
    }));

    const massiveString = 'A'.repeat(2000);
    const maliciousPayload = {
      contentHash: 'sha256:12345abcdef',
      creator: 'GABCDEF1234567890',
      creatorId: new mongoose.Types.ObjectId().toString(),
      timestamp: new Date().toISOString(),
      metadata: {
        title: 'My Video',
        description: '<script>alert("hacked")</script> This is a safe description.',
        deeply: {
          nested: {
            attack: '<img src=x onerror=alert(1)>',
            hugeText: massiveString,
          },
        },
      },
    };

    await manifestService.processManifest(maliciousPayload);

    const savedData = (Manifest as unknown as jest.Mock).mock.calls[0][0];

    // Assert scripts are stripped
    expect(savedData.metadata.description).toBe('alert("hacked") This is a safe description.');
    expect(savedData.metadata.deeply.nested.attack).toBe('');

    // Assert truncation to 1000 characters
    expect(savedData.metadata.deeply.nested.hugeText.length).toBe(1000);
  });
});