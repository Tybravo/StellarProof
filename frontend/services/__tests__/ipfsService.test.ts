type IpfsModule = typeof import('../ipfsService');

const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const TEST_JWT = 'test-pinata-jwt';
const TEST_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

/**
 * PINATA_JWT is read once when ipfsService is imported, so each test loads a
 * fresh copy of the module with the env value it needs.
 */
function loadService(jwt?: string): IpfsModule {
  if (jwt === undefined) {
    delete process.env.NEXT_PUBLIC_PINATA_JWT;
  } else {
    process.env.NEXT_PUBLIC_PINATA_JWT = jwt;
  }

  let mod!: IpfsModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../ipfsService');
  });
  return mod;
}

function mockResponse(init: { ok: boolean; status?: number; json: () => Promise<unknown> }): Response {
  return { status: 200, ...init } as unknown as Response;
}

function createFile(name = 'photo.png'): File {
  return new File(['hello world'], name, { type: 'image/png' });
}

describe('ipfsService.uploadFileToIPFS', () => {
  const originalFetch = global.fetch;
  const originalJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  let fetchMock: jest.Mock;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalJwt === undefined) {
      delete process.env.NEXT_PUBLIC_PINATA_JWT;
    } else {
      process.env.NEXT_PUBLIC_PINATA_JWT = originalJwt;
    }
  });

  describe('success', () => {
    it('returns the CID from the Pinata IpfsHash field', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({ ok: true, json: async () => ({ IpfsHash: TEST_CID, PinSize: 11 }) }),
      );

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: true, cid: TEST_CID });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('POSTs to the Pinata pinFileToIPFS endpoint with a Bearer token', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({ ok: true, json: async () => ({ IpfsHash: TEST_CID }) }),
      );

      await uploadFileToIPFS(createFile());

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(PINATA_URL);
      expect(init.method).toBe('POST');
      // No Content-Type: the browser must set the multipart boundary itself.
      expect(init.headers).toEqual({ Authorization: `Bearer ${TEST_JWT}` });
    });

    it('sends the file, its name as metadata, and a CIDv1 option as multipart form data', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({ ok: true, json: async () => ({ IpfsHash: TEST_CID }) }),
      );

      await uploadFileToIPFS(createFile('certificate.png'));

      const body = fetchMock.mock.calls[0][1].body as FormData;
      expect(body).toBeInstanceOf(FormData);

      const sent = body.get('file') as File;
      expect(sent.name).toBe('certificate.png');
      expect(sent.size).toBe(11);

      expect(JSON.parse(body.get('pinataMetadata') as string)).toEqual({ name: 'certificate.png' });
      expect(JSON.parse(body.get('pinataOptions') as string)).toEqual({ cidVersion: 1 });
    });

    it('reports success with an undefined cid if Pinata omits IpfsHash', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: async () => ({}) }));

      const result = await uploadFileToIPFS(createFile());

      expect(result.success).toBe(true);
      expect(result.cid).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('fails without calling the API when the Pinata JWT is not configured', async () => {
      const { uploadFileToIPFS } = loadService(undefined);

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: false, error: 'Storage configuration error.' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Pinata JWT is missing'));
    });

    it('treats an empty JWT as not configured', async () => {
      const { uploadFileToIPFS } = loadService('');

      const result = await uploadFileToIPFS(createFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage configuration error.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the Pinata error details on an HTTP error response', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 401,
          json: async () => ({ error: { reason: 'INVALID_CREDENTIALS', details: 'Invalid or expired API key' } }),
        }),
      );

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: false, error: 'Invalid or expired API key' });
      expect(result.cid).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('falls back to the HTTP status when the error body has no details', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({ ok: false, status: 429, json: async () => ({ message: 'rate limited' }) }),
      );

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: false, error: 'HTTP error! status: 429' });
    });

    it('falls back to the HTTP status when the error body is not valid JSON', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON');
          },
        }),
      );

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: false, error: 'HTTP error! status: 500' });
    });

    it('returns the error message when the network request rejects', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({ success: false, error: 'Network error' });
      expect(errorSpy).toHaveBeenCalledWith('Error uploading media to IPFS:', expect.any(Error));
    });

    it('returns a generic message when a non-Error value is thrown', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockRejectedValueOnce('boom');

      const result = await uploadFileToIPFS(createFile());

      expect(result).toEqual({
        success: false,
        error: 'An unexpected error occurred during IPFS upload',
      });
    });

    it('returns a failure when a successful response body cannot be parsed', async () => {
      const { uploadFileToIPFS } = loadService(TEST_JWT);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: async () => {
            throw new SyntaxError('Unexpected end of JSON input');
          },
        }),
      );

      const result = await uploadFileToIPFS(createFile());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected end of JSON input');
    });
  });
});
