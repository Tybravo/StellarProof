/**
 * Builds the oracle's signed attestation over a successful SPV verification.
 *
 * The attestation hash is a deterministic SHA-256 over the verified facts, so
 * a retried request yields the same hash. The signature is the oracle
 * keypair's Ed25519 signature over the raw 32-byte hash.
 *
 * The code measurement hash is retrieved from the TEEConfig service to ensure
 * consistency with the trusted TEE binary configuration stored in the database.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { generateDeterministicHash } from "../utils/crypto";
import { assertHex32 } from "../utils/xdr";
import { teeConfigService } from "./teeConfig.service";
import { AppError } from "../errors/AppError";

export const ATTESTATION_VERSION = 1;

export interface AttestationInput {
  eventId: string;
  requester: string;
  mediaCid: string;
  manifestCid: string;
  contentHash: string;
  manifestHash: string;
  environment?: 'testnet' | 'mainnet' | 'development';
}

export interface Attestation {
  attestationHash: string;
  /** Hex Ed25519 signature over the attestation hash bytes. */
  signature: string;
  codeMeasurementHash: string;
}

class AttestationService {
  /**
   * Create an attestation using the active TEE config's code measurement hash
   * Retrieves the code measurement hash from the database to ensure authenticity
   */
  async createAttestationWithTEEConfig(
    input: AttestationInput,
    keypair: Keypair,
    environment: 'testnet' | 'mainnet' | 'development' = 'testnet'
  ): Promise<Attestation> {
    // Retrieve the active TEE configuration for the specified environment
    const teeConfig = await teeConfigService.getActiveTEEConfig(environment);

    if (!teeConfig) {
      throw new AppError(
        `No active TEE configuration found for environment: ${environment}`,
        500,
        'TEE_CONFIG_NOT_FOUND'
      );
    }

    // Use the persisted code measurement hash from the database
    return this.createAttestationWithHash(input, keypair, teeConfig.codeMeasurementHash);
  }

  /**
   * Create an attestation with an explicit code measurement hash
   * This method allows for flexibility when the hash is already known
   */
  createAttestationWithHash(
    input: AttestationInput,
    keypair: Keypair,
    codeMeasurementHash: string
  ): Attestation {
    const measurement = assertHex32(codeMeasurementHash, "codeMeasurementHash");

    const attestationHash = generateDeterministicHash({
      version: ATTESTATION_VERSION,
      eventId: input.eventId,
      requester: input.requester,
      mediaCid: input.mediaCid,
      manifestCid: input.manifestCid,
      contentHash: assertHex32(input.contentHash, "contentHash"),
      manifestHash: assertHex32(input.manifestHash, "manifestHash"),
      codeMeasurementHash: measurement,
      oracle: keypair.publicKey(),
    });

    const signature = keypair.sign(Buffer.from(attestationHash, "hex")).toString("hex");

    return { attestationHash, signature, codeMeasurementHash: measurement };
  }

  /**
   * Legacy method: Create an attestation with a provided code measurement hash (deprecated)
   * Use createAttestationWithTEEConfig() for new code to ensure database-backed hashes
   */
  createAttestation(
    input: AttestationInput,
    keypair: Keypair,
    codeMeasurementHash: string
  ): Attestation {
    return this.createAttestationWithHash(input, keypair, codeMeasurementHash);
  }
}

export const attestationService = new AttestationService();
