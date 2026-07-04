import cron from 'node-cron';
import { cleanupService } from '../services/cleanup';
import { CleanupResult } from '../types/cleanup';
import logger from '../utils/logger';


let isRunning = false;


async function runCleanupCycle(): Promise<void> {
  if (isRunning) {
    logger.warn('Cleanup job skipped — previous run has not finished yet');
    return;
  }

  isRunning = true;

  try {
    logger.info('Cleanup job: cycle starting');
    const result: CleanupResult = await cleanupService.runOrphanedAssetCleanup();

    logger.info('Cleanup job: cycle completed', {
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      totalFound: result.totalFound,
      totalDeleted: result.totalDeleted,
      totalFailed: result.totalFailed,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.warn('Cleanup job: non-fatal errors encountered', {
        errors: result.errors,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Cleanup job: unhandled exception in cycle', { error: message });
  } finally {
    isRunning = false;
  }
}


export function startCleanupJob() {
  const schedule = process.env.CLEANUP_CRON_SCHEDULE ?? '0 * * * *';

  if (!cron.validate(schedule)) {
    throw new Error(
      `Invalid cron expression in CLEANUP_CRON_SCHEDULE: "${schedule}". ` +
        'Expected a valid 5-part cron expression, e.g. "0 * * * *".',
    );
  }

  logger.info('Cleanup job: scheduling', { schedule });

  const task = cron.schedule(
    schedule,
    () => {
      // Fire-and-forget — runCleanupCycle handles its own errors.
      void runCleanupCycle();
    },
    {
      // Run in the server's local timezone by default; override with
      // CLEANUP_CRON_TIMEZONE if your deployment spans multiple zones.
      timezone: process.env.CLEANUP_CRON_TIMEZONE ?? 'UTC',
    //   scheduled: true,
    },
  );

  logger.info('Cleanup job: started successfully', { schedule });

  return task;
}

/**
 * Manually trigger one cleanup cycle outside of the cron schedule.
 *
 * Useful for integration tests and the manual HTTP trigger endpoint.
 * Respects the same isRunning guard as the scheduled runs.
 */
export async function triggerImmediateCleanup(): Promise<CleanupResult | null> {
  if (isRunning) {
    logger.warn('Immediate cleanup skipped — a scheduled run is already in progress');
    return null;
  }

  logger.info('Cleanup job: immediate (manual) trigger');
  isRunning = true;

  try {
    const result = await cleanupService.runOrphanedAssetCleanup();
    return result;
  } finally {
    isRunning = false;
  }
}