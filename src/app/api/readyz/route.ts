import { NextResponse } from 'next/server';

import { hourlyQueue } from '@/lib/queues/tick-engine';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {
    database: { ok: true },
    redis: { ok: true }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    checks.database = { ok: false, error: (error as Error).message };
  }

  if (!env.DISABLE_QUEUE_CONNECTIONS) {
    try {
      await hourlyQueue.getJobCounts();
    } catch (error) {
      checks.redis = { ok: false, error: (error as Error).message };
    }
  }

  const isReady = Object.values(checks).every((check) => check.ok);
  const status = isReady ? 200 : 503;

  return NextResponse.json(
    {
      status: isReady ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}
