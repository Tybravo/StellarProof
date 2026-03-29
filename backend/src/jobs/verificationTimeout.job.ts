import cron from 'node-cron';
import VerificationJob from '../models/VerificationJob.model';

export const startVerificationTimeoutJob = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const result = await VerificationJob.updateMany(
        {
          status: { $in: ['processing', 'minting'] },
          updatedAt: { $lt: tenMinutesAgo }
        },
        {
          $set: {
            status: 'failed',
            errorMessage: 'Job timed out after being stuck in processing or minting for over 10 minutes.'
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Job] Marked ${result.modifiedCount} verification jobs as failed due to timeout.`);
      }
    } catch (error) {
      console.error('[Job Error] Failed to process verification timeouts:', error);
    }
  });
};
