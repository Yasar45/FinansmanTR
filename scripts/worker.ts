import { hourlyWorker, dailyWorker, hourlyScheduler, dailyScheduler } from '@/lib/queues/tick-engine';
import { bootstrapTickWorker } from '@/server/jobs/tickWorker';
import { logger } from '@/lib/logger';

async function main() {
  logger.info('Starting Çiftlik Pazar worker');
  bootstrapTickWorker();

  // Ensure schedulers are initialized
  await Promise.allSettled([
    hourlyScheduler.waitUntilReady?.(),
    dailyScheduler.waitUntilReady?.()
  ]);

  logger.info('Workers are ready and listening for jobs');
}

async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Stopping worker');

  await Promise.allSettled([
    hourlyWorker.close?.(),
    dailyWorker.close?.(),
    hourlyScheduler.close?.(),
    dailyScheduler.close?.()
  ]);

  process.exit(0);
}

process.on('SIGTERM', (signal) => {
  void shutdown(signal);
});
process.on('SIGINT', (signal) => {
  void shutdown(signal);
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception in worker');
  void shutdown('SIGTERM');
});

void main();
