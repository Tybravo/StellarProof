import cron from "node-cron";
import { verificationService } from "../services/verification.service";

export const startVerificationTimeoutJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000);
      const failedCount = await verificationService.failStaleJobs(cutoff);
      if (failedCount > 0) {
        console.log(`[Job] Marked ${failedCount} stale verification jobs as failed.`);
      }
    } catch (error) {
      console.error("[Job Error] Failed to process verification timeouts:", error);
    }
  });
};
