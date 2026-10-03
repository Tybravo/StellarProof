import { VerificationJobModel } from "../models/verificationJob.model";
import { VerificationStatus } from "../types/verification.types";

export interface OracleHealthSnapshot {
  status: "healthy" | "degraded";
  checkedAt: string;
  lastSuccessfulAttestation: string | null;
  pendingJobQueueLength: number;
  recentFailureCount: number;
}

/** Reads operational metrics from persisted verification jobs. */
export async function getOracleHealth(): Promise<OracleHealthSnapshot> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [queued, recentFailureCount, lastSuccess] = await Promise.all([
    VerificationJobModel.countDocuments({
      status: {
        $in: [
          VerificationStatus.PENDING,
          VerificationStatus.PROCESSING,
          VerificationStatus.TEE_VERIFYING,
          VerificationStatus.MINTING,
        ],
      },
    }),
    VerificationJobModel.countDocuments({
      status: VerificationStatus.FAILED,
      updatedAt: { $gte: since },
    }),
    VerificationJobModel.findOne({
      status: VerificationStatus.COMPLETED,
      teeAttestationHash: { $exists: true, $ne: null },
    })
      .sort({ updatedAt: -1 })
      .select({ updatedAt: 1 })
      .lean<{ updatedAt?: Date }>(),
  ]);

  return {
    status: recentFailureCount > 0 ? "degraded" : "healthy",
    checkedAt: new Date().toISOString(),
    lastSuccessfulAttestation: lastSuccess?.updatedAt?.toISOString() ?? null,
    pendingJobQueueLength: queued,
    recentFailureCount,
  };
}
