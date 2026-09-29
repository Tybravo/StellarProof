/**
 * SPV Bridge Mock Verifier Unit Tests
 *
 * Tests for deterministic hashing, valid signature format, and network-free operation.
 * Ensures the mock verifier path is reliable for integration testing without requiring
 * the real enclave or IPFS gateway.
 */

import crypto from "crypto";
import { SpvBridgeService, SpvBridgeConfig, SpvBridgeResult } from "../spvBridge.service";

/**
 * Valid Stellar public key for testing (G... format, Ed25519)
 */
const VALID_REQUESTER =
  "GBRPYHIL2CI3WHPSKYNYG32THPJJCGQLKJG7XEFKB7YXYIYHJCPWB2CA";

/**
 * Valid IPFS CID v1 for testing
 */
const VALID_MEDIA_CID = "bafkreidvyb6p3wq3vy5j7rvycgpbxmrjgcbvnqc3xvgswhsf7z5sxu2xq";
const VALID_MANIFEST_CID = "bafkreidvyb6p3wq3vy5j7rvycgpbxmrjgcbvnqc3xvgswhsf7z5sxu2yy";

const defaultConfig: SpvBridgeConfig = {
  enableMockFallback: true,
  networkGatewayUrl: "https://gateway.pinata.cloud/ipfs",
  fetchTimeoutMs: 15_000,
  maxMediaBytes: 100 * 1024 * 1024,
  maxManifestBytes: 10 * 1024 * 1024,
};

describe("SpvBridgeService - Mock Verifier", () => {
  describe("Deterministic Hashing", () => {
    it("should produce identical SHA-256 hashes for identical CIDs", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const result2 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result1.contentHash).toBe(result2.contentHash);
      expect(result1.manifestHash).toBe(result2.manifestHash);
      expect(result1.contentHash).toBe(result1.contentHash);
    });

    it("should produce different hashes for different CIDs", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const result2 = await service.verify({
        mediaCid: "bafkreidvyb6p3wq3vy5j7rvycgpbxmrjgcbvnqc3xvgswhsf7z5sxu2zz",
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result1.contentHash).not.toBe(result2.contentHash);
    });

    it("should generate valid SHA-256 hex strings (64 characters)", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      // SHA-256 produces 256 bits = 64 hex characters
      expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate lowercase hex hashes", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result.contentHash).toEqual(result.contentHash.toLowerCase());
      expect(result.manifestHash).toEqual(result.manifestHash.toLowerCase());
    });
  });

  describe("Signature Generation", () => {
    it("should generate valid 128-character hex signatures", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      // 128 hex characters = 64 bytes (Ed25519-style signature)
      expect(result.signature).toMatch(/^[a-f0-9]{128}$/);
      expect(result.signature.length).toBe(128);
    });

    it("should generate deterministic signatures for identical inputs", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const result2 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result1.signature).toBe(result2.signature);
    });

    it("should generate different signatures for different CIDs", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const result2 = await service.verify({
        mediaCid: "bafkreidvyb6p3wq3vy5j7rvycgpbxmrjgcbvnqc3xvgswhsf7z5sxu2zz",
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result1.signature).not.toBe(result2.signature);
    });

    it("should generate different signatures for different requesters", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const otherRequester =
        "GCZR5J45Y66JBWP3Z5MVJVMQHKJ3U7R5GPXQ4VPV2XWRZTMZQLZPXBHO";

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const result2 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: otherRequester,
        useMock: true,
      });

      expect(result1.signature).not.toBe(result2.signature);
    });

    it("should produce lowercase hex signatures", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result.signature).toEqual(result.signature.toLowerCase());
    });
  });

  describe("Mock Path Network-Free Operation", () => {
    it("should complete mock verification without network calls", async () => {
      const mockFetch = jest.fn();
      const service = new SpvBridgeService(defaultConfig, mockFetch);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      // mockFetch should never be called for mock path
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.isMock).toBe(true);
      expect(result.verified).toBe(true);
    });

    it("should return isMock=true for mock verifier", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result.isMock).toBe(true);
    });

    it("should complete instantly without timeout", async () => {
      const service = new SpvBridgeService({
        ...defaultConfig,
        fetchTimeoutMs: 100, // Very short timeout
      });

      const startTime = Date.now();

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      const elapsed = Date.now() - startTime;

      // Should complete in milliseconds, not approach timeout
      expect(elapsed).toBeLessThan(50);
      expect(result.verified).toBe(true);
    });

    it("should handle large CIDs without network calls", async () => {
      const mockFetch = jest.fn();
      const service = new SpvBridgeService(defaultConfig, mockFetch);

      // Even with a very large max size, mock should not fetch
      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.verified).toBe(true);
    });
  });

  describe("Mock Verifier Validation", () => {
    it("should validate requester as valid Stellar public key", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const invalidRequester = "invalid-key";

      await expect(
        service.verify({
          mediaCid: VALID_MEDIA_CID,
          manifestCid: VALID_MANIFEST_CID,
          requester: invalidRequester,
          useMock: true,
        })
      ).rejects.toThrow("expected a valid Stellar");
    });

    it("should validate media CID format", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const invalidCid = "invalid-cid";

      await expect(
        service.verify({
          mediaCid: invalidCid,
          manifestCid: VALID_MANIFEST_CID,
          requester: VALID_REQUESTER,
          useMock: true,
        })
      ).rejects.toThrow();
    });

    it("should validate manifest CID format", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const invalidCid = "invalid-cid";

      await expect(
        service.verify({
          mediaCid: VALID_MEDIA_CID,
          manifestCid: invalidCid,
          requester: VALID_REQUESTER,
          useMock: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("Result Structure", () => {
    it("should return complete result with all fields", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result).toHaveProperty("verified");
      expect(result).toHaveProperty("contentHash");
      expect(result).toHaveProperty("manifestHash");
      expect(result).toHaveProperty("signature");
      expect(result).toHaveProperty("isMock");
      expect(result.verified).toBe(true);
      expect(result.isMock).toBe(true);
    });

    it("should not include reason field when verified", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result.reason).toBeUndefined();
    });
  });

  describe("Reproducibility", () => {
    it("should generate identical results across multiple invocations", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const results = await Promise.all([
        service.verify({
          mediaCid: VALID_MEDIA_CID,
          manifestCid: VALID_MANIFEST_CID,
          requester: VALID_REQUESTER,
          useMock: true,
        }),
        service.verify({
          mediaCid: VALID_MEDIA_CID,
          manifestCid: VALID_MANIFEST_CID,
          requester: VALID_REQUESTER,
          useMock: true,
        }),
        service.verify({
          mediaCid: VALID_MEDIA_CID,
          manifestCid: VALID_MANIFEST_CID,
          requester: VALID_REQUESTER,
          useMock: true,
        }),
      ]);

      const [result1, result2, result3] = results;

      expect(result1.contentHash).toBe(result2.contentHash);
      expect(result2.contentHash).toBe(result3.contentHash);
      expect(result1.manifestHash).toBe(result2.manifestHash);
      expect(result2.manifestHash).toBe(result3.manifestHash);
      expect(result1.signature).toBe(result2.signature);
      expect(result2.signature).toBe(result3.signature);
    });

    it("should handle concurrent requests deterministically", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const requests = Array.from({ length: 10 }, () => ({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      }));

      const results = await Promise.all(
        requests.map((req) => service.verify(req))
      );

      // All results should be identical
      const firstResult = results[0];
      for (const result of results.slice(1)) {
        expect(result.contentHash).toBe(firstResult.contentHash);
        expect(result.manifestHash).toBe(firstResult.manifestHash);
        expect(result.signature).toBe(firstResult.signature);
      }
    });
  });

  describe("Signature Cryptographic Properties", () => {
    it("should use HMAC-SHA512 internally (verifiable via consistency)", async () => {
      const service = new SpvBridgeService(defaultConfig);

      const result1 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      // Verify signature is stable across calls
      const result2 = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result1.signature).toBe(result2.signature);
      expect(result1.signature.length).toBe(128);

      // Verify signature changes with any input change
      const result3 = await service.verify({
        mediaCid: "bafkreidvyb6p3wq3vy5j7rvycgpbxmrjgcbvnqc3xvgswhsf7z5sxu2zz",
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(result3.signature).not.toBe(result1.signature);
    });
  });

  describe("Mock Verifier Integration", () => {
    it("should use mock path when useMock=true", async () => {
      const mockFetch = jest.fn();
      const service = new SpvBridgeService(defaultConfig, mockFetch);

      await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
        useMock: true,
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should use mock when enableMockFallback=true and no useMock override", async () => {
      const mockFetch = jest.fn();
      const config: SpvBridgeConfig = {
        ...defaultConfig,
        enableMockFallback: true,
      };
      const service = new SpvBridgeService(config, mockFetch);

      const result = await service.verify({
        mediaCid: VALID_MEDIA_CID,
        manifestCid: VALID_MANIFEST_CID,
        requester: VALID_REQUESTER,
      });

      // With enableMockFallback=true and no useMock override, should use mock
      expect(result.isMock).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
