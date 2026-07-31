import { validateManifest } from '../schemas/manifest-schema';

type ValidManifestPayload = {
  contentHash: string;
  creator: string;
  timestamp: string;
  metadata: {
    device: string;
    location: string;
    aiModel: string;
  };
};

describe('Manifest Schema Validation', () => {
  const validPayload: ValidManifestPayload = {
    contentHash: 'sha256:d2a84f4b8b650937ec8f73cd8be2c74add5a911ba64df27458ed8229da804a26',
    creator: 'GA2C5RFPE6GCKIG3EQKTNIQ6PRRQIHIRDIUCAUKENRXCVZBD4T6K2K2H',
    timestamp: '2023-10-27T10:00:00Z',
    metadata: {
      device: 'Camera Model X',
      location: 'Lat/Long',
      aiModel: 'None',
    },
  };

  it('should validate a correct manifest payload successfully', () => {
    const result = validateManifest(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentHash).toBe(validPayload.contentHash);
      expect(result.data.creator).toBe(validPayload.creator);
      expect(result.data.timestamp).toBe(validPayload.timestamp);
    }
  });

  it('should allow passthrough properties', () => {
    const extendedPayload = {
      ...validPayload,
      extraField: 'some extra value',
    };
    const result = validateManifest(extendedPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ extraField: 'some extra value' });
    }
  });

  describe('Invalid Payloads', () => {
    it('should fail if contentHash is missing', () => {
      const invalidPayload = Object.fromEntries(
        Object.entries(validPayload).filter(([key]) => key !== 'contentHash'),
      );
      const result = validateManifest(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('contentHash');
      }
    });

    it('should fail if contentHash is empty', () => {
      const invalidPayload = { ...validPayload, contentHash: '' };
      const result = validateManifest(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('contentHash is required');
      }
    });

    it('should fail if creator is invalid stellar public key', () => {
      const invalidPayload = { ...validPayload, creator: 'invalid-creator' };
      const result = validateManifest(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid Stellar public key');
      }
    });

    it('should fail if timestamp is not valid ISO 8601 datetime', () => {
      const invalidPayload = { ...validPayload, timestamp: '10/27/2023' };
      const result = validateManifest(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid timestamp format');
      }
    });
  });

  describe('Form Submission Logic', () => {
    it('should simulate form submission failure with invalid schema', () => {
      const formSubmit = (data: unknown) => {
        const result = validateManifest(data);
        if (!result.success) {
          throw new Error('Validation failed');
        }
        return true;
      };

      const invalidPayload = { ...validPayload, timestamp: 'invalid' };
      expect(() => formSubmit(invalidPayload)).toThrow('Validation failed');
    });

    it('should simulate form submission success with valid schema', () => {
      const formSubmit = (data: unknown) => {
        const result = validateManifest(data);
        if (!result.success) {
          throw new Error('Validation failed');
        }
        return true;
      };

      expect(formSubmit(validPayload)).toBe(true);
    });
  });
});
