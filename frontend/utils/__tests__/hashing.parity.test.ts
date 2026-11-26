import { createHash, webcrypto } from 'node:crypto';
import { hashFile } from '@/utils/hashing';

/**
 * Parity check: the browser-side hashFile() must produce the same lowercase hex
 * digest as the backend, which uses createHash('sha256').update(buffer).digest('hex').
 */

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function fakeFile(bytes: Buffer): File {
  return {
    size: bytes.length,
    arrayBuffer: async () => toArrayBuffer(bytes),
    slice: (start: number, end: number) => ({
      arrayBuffer: async () => toArrayBuffer(bytes.subarray(start, end)),
    }),
  } as unknown as File;
}

function backendHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('hashFile backend parity', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  afterAll(() => {
    if (original) {
      Object.defineProperty(globalThis, 'crypto', original);
    } else {
      delete (globalThis as { crypto?: unknown }).crypto;
    }
  });

  it('matches the backend digest for a small file (known vector for "abc")', async () => {
    const bytes = Buffer.from('abc');
    const hash = await hashFile(fakeFile(bytes));

    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hash).toBe(backendHash(bytes));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('matches the backend digest for a large file read in chunks', async () => {
    const bytes = Buffer.alloc(3 * 1024 * 1024, 'x');
    const progress: number[] = [];
    const hash = await hashFile(fakeFile(bytes), (percent) => progress.push(percent));

    expect(hash).toBe(backendHash(bytes));
    expect(progress[progress.length - 1]).toBe(100);
  });
});
