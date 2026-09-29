/**
 * IPFS upload resilience (issue #675): configurable per-attempt timeout,
 * retry count, and exponential backoff, with typed AppError mapping.
 */
jest.mock('../../config/env', () => ({
  __esModule: true,
  env: {
    NODE_ENV: 'test',
    PINATA_JWT: 'test',
    PINATA_GATEWAY_URL: 'https://gateway.example/ipfs',
    IPFS_UPLOAD_TIMEOUT_MS: 10,
    IPFS_UPLOAD_MAX_RETRIES: 2,
    IPFS_UPLOAD_BACKOFF_MS: 1,
  },
}));

import {
  computeBackoffDelayMs,
  IPFS_CID_VERSION_MISMATCH,
  IPFS_UPLOAD_FAILED,
  IPFS_UPLOAD_TIMEOUT,
  ipfsService,
  isRetryableUploadError,
} from '../ipfs.service';
import { AppError } from '../../errors/AppError';

const VALID_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const MAX_ATTEMPTS = 3; // 1 + IPFS_UPLOAD_MAX_RETRIES

/** Minimal chainable Pinata upload builder whose `await` runs `onAwait`. */
function makeBuilder(onAwait: () => Promise<unknown>) {
  const builder: Record<string, unknown> = {};
  builder.name = jest.fn(() => builder);
  builder.cidVersion = jest.fn(() => builder);
  builder.keyvalues = jest.fn(() => builder);
  builder.then = (
    onFulfilled: (value: unknown) => unknown,
    onRejected: (reason: unknown) => unknown,
  ) => onAwait().then(onFulfilled, onRejected);
  return builder;
}

let mockFile: jest.Mock;

beforeEach(() => {
  mockFile = jest.fn();
  // Replace the SDK boundary on the singleton service.
  (ipfsService as unknown as { pinata: unknown }).pinata = {
    upload: { public: { file: mockFile } },
  };
});

describe('ipfsService.upload resilience (Tybravo/StellarProof#675)', () => {
  it('uploads successfully on the first attempt', async () => {
    mockFile.mockReturnValueOnce(
      makeBuilder(async () => ({ cid: VALID_CID, size: 3, name: 'a' })),
    );

    const result = await ipfsService.upload({ content: Buffer.from('abc'), name: 'a' });

    expect(mockFile).toHaveBeenCalledTimes(1);
    expect(result.cid).toBe(VALID_CID);
    expect(result.gatewayUrl).toBe(`https://gateway.example/ipfs/${VALID_CID}`);
  });

  it('retries transient failures with backoff and then succeeds', async () => {
    mockFile
      .mockReturnValueOnce(makeBuilder(async () => {
        throw new Error('flaky');
      }))
      .mockReturnValueOnce(makeBuilder(async () => {
        throw new Error('flaky again');
      }))
      .mockReturnValueOnce(makeBuilder(async () => ({ cid: VALID_CID })));

    const result = await ipfsService.upload({ content: Buffer.from('abc') });

    expect(mockFile).toHaveBeenCalledTimes(3);
    expect(result.cid).toBe(VALID_CID);
  });

  it('maps a hung upload to AppError(502, IPFS_UPLOAD_TIMEOUT) after exhausting attempts', async () => {
    mockFile.mockReturnValue(makeBuilder(() => new Promise(() => {})));

    await expect(ipfsService.upload({ content: Buffer.from('abc') })).rejects.toMatchObject({
      statusCode: 502,
      code: IPFS_UPLOAD_TIMEOUT,
    });
    expect(mockFile).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it('does not retry a deterministic CID-version mismatch', async () => {
    mockFile.mockReturnValue(makeBuilder(async () => ({ cid: 'not-a-valid-cid' })));

    await expect(ipfsService.upload({ content: Buffer.from('abc') })).rejects.toMatchObject({
      statusCode: 502,
      code: IPFS_CID_VERSION_MISMATCH,
    });
    expect(mockFile).toHaveBeenCalledTimes(1);
  });

  it('wraps an exhausted transient failure as AppError(502, IPFS_UPLOAD_FAILED)', async () => {
    mockFile.mockReturnValue(makeBuilder(async () => {
      throw new Error('provider down');
    }));

    await expect(ipfsService.upload({ content: Buffer.from('abc') })).rejects.toMatchObject({
      statusCode: 502,
      code: IPFS_UPLOAD_FAILED,
    });
    expect(mockFile).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });
});

describe('computeBackoffDelayMs', () => {
  it('grows exponentially and is capped', () => {
    expect(computeBackoffDelayMs(100, 0)).toBe(100);
    expect(computeBackoffDelayMs(100, 1)).toBe(200);
    expect(computeBackoffDelayMs(100, 2)).toBe(400);
    expect(computeBackoffDelayMs(1000, 10, 5000)).toBe(5000);
  });
});

describe('isRetryableUploadError', () => {
  it('retries timeouts and transient errors, but not CID mismatches or 4xx', () => {
    expect(isRetryableUploadError(new AppError('t', 502, IPFS_UPLOAD_TIMEOUT))).toBe(true);
    expect(isRetryableUploadError(new Error('network blip'))).toBe(true);
    expect(isRetryableUploadError(new AppError('cid', 502, IPFS_CID_VERSION_MISMATCH))).toBe(false);
    expect(isRetryableUploadError(new AppError('bad request', 400, 'SOME_CODE'))).toBe(false);
  });
});
