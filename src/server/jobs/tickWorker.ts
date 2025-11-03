import { tickWorker, tickScheduler } from '@/lib/queues/tick-engine';
import { logger } from '@/lib/logger';

export function bootstrapTickWorker() {
  tickScheduler.on('failed', (jobId, error) => {
    logger.error({ jobId, error }, 'Tick scheduler failed');
  });

  tickWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Tick job completed');
  });

  tickWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Tick job failed');
  });
}
