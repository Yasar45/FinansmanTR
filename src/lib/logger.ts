import pino from 'pino';
import type { TransportTargetOptions } from 'pino';

import { env } from '@/lib/env';

const targets: TransportTargetOptions[] = [];

if (env.NODE_ENV === 'development') {
  targets.push({
    target: 'pino-pretty',
    options: { colorize: true }
  });
} else {
  targets.push({
    target: 'pino/file',
    options: { destination: 1 }
  });

  if (env.LOGFLARE_API_KEY && env.LOGFLARE_SOURCE_TOKEN) {
    targets.push({
      target: '@logflare/pino-transport',
      options: {
        apiKey: env.LOGFLARE_API_KEY,
        sourceToken: env.LOGFLARE_SOURCE_TOKEN
      }
    });
  }
}

export const logger = pino({
  transport: targets.length > 0 ? { targets } : undefined,
  level: env.LOG_LEVEL ?? 'info'
});
