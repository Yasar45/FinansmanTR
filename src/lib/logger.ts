import pino from 'pino';
import { env } from '@/lib/env';

export const logger = pino({
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  level: env.LOG_LEVEL ?? 'info'
});
