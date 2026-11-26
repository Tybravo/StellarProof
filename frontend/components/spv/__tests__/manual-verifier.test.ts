import { verifySpvSignature } from '@/utils/verifySpvSignature';

describe('verifySpvSignature', () => {
  const contentHashHex = 'ab'.repeat(32);
  const signatureHex = 'cd'.repeat(64);
  const publicKeyHex = 'ef'.repeat(32);
  const importKey = jest.fn().mockResolvedValue({ type: 'public' });
  const verify = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { subtle: { importKey, verify } },
    });
  });

  it('verifies the raw content hash with Ed25519', async () => {
    await expect(
      verifySpvSignature({ contentHashHex, signatureHex, publicKeyHex })
    ).resolves.toBe(true);
    expect(importKey).toHaveBeenCalledWith(
      'raw',
      expect.any(Uint8Array),
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    expect(verify).toHaveBeenCalledWith(
      { name: 'Ed25519' },
      expect.anything(),
      expect.objectContaining({ byteLength: 64 }),
      expect.objectContaining({ byteLength: 32 })
    );
  });

  it('returns false when the signature does not match', async () => {
    verify.mockResolvedValueOnce(false);
    await expect(
      verifySpvSignature({ contentHashHex, signatureHex, publicKeyHex })
    ).resolves.toBe(false);
  });

  it.each([
    ['content hash', { contentHashHex: 'bad', signatureHex, publicKeyHex }],
    ['signature', { contentHashHex, signatureHex: '00', publicKeyHex }],
    ['public key', { contentHashHex, signatureHex, publicKeyHex: 'xyz' }],
  ])('rejects malformed %s input', async (_label, input) => {
    await expect(verifySpvSignature(input)).rejects.toThrow(/bytes of hexadecimal data/);
    expect(verify).not.toHaveBeenCalled();
  });
});
