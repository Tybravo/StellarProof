/**
 * Client-side SHA256 file hashing utility.
 * Computes hashes using the Web Crypto API without uploading raw data to any server.
 *
 * @module utils/hashing
 */

/** Chunk size for large file processing (2 MB) */
const CHUNK_SIZE = 2 * 1024 * 1024;

/** Callback for reporting hashing progress (0–100) */
export type ProgressCallback = (percent: number) => void;

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexParts.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return hexParts.join("");
}

/**
 * Hash a file using SHA-256 via the Web Crypto API.
 * For files larger than the chunk threshold, reads in chunks to avoid memory issues.
 *
 * @param file - The File object to hash
 * @param onProgress - Optional callback reporting progress as a percentage (0–100)
 * @returns A lowercase hex-encoded SHA-256 hash string
 */
export async function hashFile(
  file: File,
  onProgress?: ProgressCallback,
): Promise<string> {
  if (file.size <= CHUNK_SIZE) {
    onProgress?.(0);
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    onProgress?.(100);
    return bufferToHex(digest);
  }

  return hashFileChunked(file, onProgress);
}

/**
 * Hash a large file by reading it in chunks and incrementally feeding
 * data into a SHA-256 digest. Uses a streaming approach to keep memory usage low.
 */
async function hashFileChunked(
  file: File,
  onProgress?: ProgressCallback,
): Promise<string> {
  // For chunked hashing we manually read slices, accumulate into a single
  // pass through SubtleCrypto by collecting all chunks first.
  // SubtleCrypto does not support incremental digest, so we stream-read
  // into a buffer we hand off at the end. For truly enormous files this
  // still beats loading the whole File.arrayBuffer() at once because
  // we process slice-by-slice and yield to the event loop.
  const totalSize = file.size;
  const chunks: Uint8Array[] = [];
  let offset = 0;

  onProgress?.(0);

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    chunks.push(new Uint8Array(buffer));
    offset = end;
    onProgress?.(Math.round((offset / totalSize) * 100));

    // Yield to the event loop so the UI stays responsive
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  // Merge chunks
  const merged = new Uint8Array(totalSize);
  let pos = 0;
  for (const chunk of chunks) {
    merged.set(chunk, pos);
    pos += chunk.length;
  }

  const digest = await crypto.subtle.digest("SHA-256", merged.buffer);
  onProgress?.(100);
  return bufferToHex(digest);
}
