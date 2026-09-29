import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import type { RegistryContract } from "./contracts/RegistryContract";
import type { OracleContract } from "./contracts/OracleContract";

type AuthorizationLogger = Pick<typeof logger, "warn">;

export class RegistryAuthorizationService {
  constructor(
    private readonly registry: Pick<RegistryContract, "isVerified">,
    private readonly oracle: Pick<OracleContract, "isProvider">,
    private readonly log: AuthorizationLogger = logger
  ) {}

  async assertAuthorized(teeHash: string, providerPublicKey: string): Promise<void> {
    const [registryAuthorized, oracleAuthorized] = await Promise.all([
      this.registry.isVerified(teeHash, providerPublicKey),
      this.oracle.isProvider(providerPublicKey),
    ]);

    if (registryAuthorized && oracleAuthorized) return;

    this.log.warn("Attestation authorization precheck failed", {
      providerPublicKey,
      teeHash,
      registryAuthorized,
      oracleAuthorized,
    });
    throw new AppError(
      "TEE hash or provider is not authorized for attestation",
      StatusCodes.FORBIDDEN,
      "ATTESTATION_NOT_AUTHORIZED"
    );
  }
}
