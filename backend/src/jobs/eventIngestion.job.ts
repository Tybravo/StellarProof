import { env } from "../config/env";
import { createEventIngestionService } from "../services/eventIngestion.service";
import logger from "../utils/logger";

export type StopEventIngestion = () => void;

/** Starts a serial polling loop; a slow cycle can never overlap the next one. */
export function startEventIngestionJob(): StopEventIngestion {
  const service = createEventIngestionService();
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async (): Promise<void> => {
    try {
      const result = await service.ingestOnce();
      if (result.matched > 0) logger.info("Soroban events ingested", result);
    } catch (error) {
      logger.error("Soroban event ingestion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (!stopped) timer = setTimeout(() => void run(), env.EVENT_INGESTION_POLL_INTERVAL_MS);
    }
  };

  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
