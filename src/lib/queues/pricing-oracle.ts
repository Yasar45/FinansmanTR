import { Queue, Worker, QueueScheduler, type Job } from 'bullmq';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { runPricingOracle } from '@/lib/oracle';

export interface PricingOracleJobPayload {
  runAt?: string;
  reason?: string;
  triggeredBy?: string | null;
}

const redisUrl = new URL(env.REDIS_URL);
const redisConnection = {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || '6379'),
    password: redisUrl.password || undefined
  }
};

export const pricingOracleQueue = new Queue<PricingOracleJobPayload>('pricing:oracle', redisConnection);
export const pricingOracleScheduler = new QueueScheduler('pricing:oracle', redisConnection);

export const pricingOracleWorker = new Worker<PricingOracleJobPayload>(
  'pricing:oracle',
  async (job: Job<PricingOracleJobPayload>) => {
    const runAt = job.data.runAt ? new Date(job.data.runAt) : new Date(job.timestamp);
    await runPricingOracle({
      runAt,
      triggeredBy: job.data.triggeredBy ?? null,
      reason: job.data.reason ?? 'QUEUE'
    });
  },
  redisConnection
);

pricingOracleWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Pricing oracle job completed');
});

pricingOracleWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Pricing oracle job failed');
});

export async function ensureDailyOracleCron() {
  await pricingOracleQueue.add(
    'oracle-daily-0600',
    { reason: 'CRON' },
    {
      jobId: 'oracle-daily-0600',
      repeat: {
        cron: '0 6 * * *',
        tz: 'Europe/Istanbul'
      },
      removeOnComplete: true,
      removeOnFail: true
    }
  );
}
