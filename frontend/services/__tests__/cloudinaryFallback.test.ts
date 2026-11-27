import {
  uploadMediaWithFallback,
  uploadToCloudinary,
  isCloudinaryConfigured,
  getIpfsGatewayUrl,
  getCloudinaryUrl,
  type UploadProgressState,
} from '../cloudinaryFallback';

describe('cloudinaryFallback service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('helper functions', () => {
    it('isCloudinaryConfigured returns true with default or custom cloud name', () => {
      expect(isCloudinaryConfigured()).toBe(true);
      expect(isCloudinaryConfigured('custom-cloud')).toBe(true);
    });

    it('getIpfsGatewayUrl constructs proper gateway URL', () => {
      const url = getIpfsGatewayUrl('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
      expect(url).toContain('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
      expect(url).toMatch(/^https?:\/\//);
    });

    it('getCloudinaryUrl builds valid image transformation URLs', () => {
      const url = getCloudinaryUrl('sample-image', {
        cloudName: 'test-cloud',
        width: 300,
        height: 200,
        crop: 'fill',
      });
      expect(url).toBe('https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_300,h_200/sample-image');
    });
  });

  describe('uploadToCloudinary', () => {
    it('uploads directly to Cloudinary and returns a valid URL', async () => {
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1234/test.png',
        public_id: 'test_public_id',
        format: 'png',
        bytes: 1024,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const result = await uploadToCloudinary(file, { cloudName: 'test-cloud' });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockResponse.secure_url);
      expect(result.publicId).toBe('test_public_id');
      expect(result.provider).toBe('cloudinary');
      expect(result.fallbackUsed).toBe(true);
    });

    it('falls back to backend storage endpoint if direct Cloudinary upload returns an error', async () => {
      // First fetch (direct Cloudinary) fails
      // Second fetch (backend /api/v1/storage/upload) succeeds
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'Upload preset not found' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            url: 'https://res.cloudinary.com/test-cloud/image/upload/backend_fallback.png',
            publicId: 'backend_fallback',
            format: 'png',
            size: 2048,
          }),
        });

      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const result = await uploadToCloudinary(file, { cloudName: 'test-cloud' });

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/backend_fallback.png');
      expect(result.publicId).toBe('backend_fallback');
      expect(result.fallbackUsed).toBe(true);
    });

    it('returns error when both direct and backend upload fail', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Cloudinary server down' } }),
      });

      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const result = await uploadToCloudinary(file, { cloudName: 'test-cloud' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cloudinary server down');
    });
  });

  describe('uploadMediaWithFallback', () => {
    it('uses IPFS when IPFS upload succeeds and returns valid URL without fallback', async () => {
      const mockIpfsUploader = jest.fn().mockResolvedValue({
        success: true,
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      });

      const stateChanges: UploadProgressState[] = [];
      const onStateChange = (state: UploadProgressState) => stateChanges.push(state);

      const file = new File(['test file'], 'media.png', { type: 'image/png' });
      const result = await uploadMediaWithFallback(file, {
        customIpfsUploader: mockIpfsUploader,
        onStateChange,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ipfs');
      expect(result.cid).toBe('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
      expect(result.url).toContain('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
      expect(result.fallbackUsed).toBe(false);
      expect(stateChanges.map((s) => s.status)).toContain('uploading_ipfs');
      expect(stateChanges.map((s) => s.status)).toContain('success');
    });

    it('falls back to Cloudinary if IPFS upload fails, returning a valid Cloudinary URL', async () => {
      const mockIpfsUploader = jest.fn().mockResolvedValue({
        success: false,
        error: 'Pinata pin quota exceeded',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v999/fallback.jpg',
          public_id: 'fallback_public_id',
          format: 'jpg',
          bytes: 4096,
        }),
      });

      const stateChanges: UploadProgressState[] = [];
      const onStateChange = (state: UploadProgressState) => stateChanges.push(state);

      const file = new File(['media data'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await uploadMediaWithFallback(file, {
        customIpfsUploader: mockIpfsUploader,
        onStateChange,
        cloudName: 'test-cloud',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('cloudinary');
      expect(result.fallbackUsed).toBe(true);
      expect(result.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v999/fallback.jpg');
      expect(result.publicId).toBe('fallback_public_id');

      const statuses = stateChanges.map((s) => s.status);
      expect(statuses).toContain('uploading_ipfs');
      expect(statuses).toContain('ipfs_delayed');
      expect(statuses).toContain('uploading_cloudinary');
      expect(statuses).toContain('success');
    });

    it('falls back to Cloudinary when IPFS upload times out', async () => {
      const mockHangingIpfsUploader = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, cid: 'late-cid' }), 1000))
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v999/timeout_fallback.png',
          public_id: 'timeout_fallback',
        }),
      });

      const file = new File(['media data'], 'art.png', { type: 'image/png' });
      const result = await uploadMediaWithFallback(file, {
        customIpfsUploader: mockHangingIpfsUploader,
        ipfsTimeoutMs: 50, // Short timeout for test
        cloudName: 'test-cloud',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('cloudinary');
      expect(result.fallbackUsed).toBe(true);
      expect(result.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v999/timeout_fallback.png');
    });

    it('handles failure gracefully when both IPFS and Cloudinary fail', async () => {
      const mockIpfsUploader = jest.fn().mockRejectedValue(new Error('Network offline'));

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'Cloudinary unreachable' } }),
      });

      const stateChanges: UploadProgressState[] = [];
      const onStateChange = (state: UploadProgressState) => stateChanges.push(state);

      const file = new File(['media data'], 'art.png', { type: 'image/png' });
      const result = await uploadMediaWithFallback(file, {
        customIpfsUploader: mockIpfsUploader,
        onStateChange,
        cloudName: 'test-cloud',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('IPFS failed (Network offline)');
      expect(result.error).toContain('Cloudinary fallback failed');
      expect(stateChanges[stateChanges.length - 1].status).toBe('error');
    });
  });
});
