/**
 * Builds the oracle's signed attestation over a successful SPV verification.
 *
 * The attestation hash is a deterministic SHA-256 over the verified facts, so a
 * retried request yields the same hash. The signature is the oracle
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

export class AttestationService {
  createAttestation(
    input: AttestationInput,
    keypair: Keypair,
    codeMeasurementHash: string
  ): Attestation {
    return this.createAttestationWithHash(input, keypair, codeMeasurementHash);
  }

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
}
}

export const attestationService = new AttestationService();
