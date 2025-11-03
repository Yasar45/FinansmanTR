import { NextResponse } from 'next/server';

import { dailyQueue, hourlyQueue } from '@/lib/queues/tick-engine';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [userCount, walletAggregate, hourlyCounts, dailyCounts, activeListings] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    hourlyQueue.getJobCounts(),
    dailyQueue.getJobCounts(),
    prisma.marketplaceListing.count({ where: { status: 'ACTIVE' } })
  ]);

  return NextResponse.json({
    collectedAt: new Date().toISOString(),
    users: {
      total: userCount
    },
    wallet: {
      tvlTRY: walletAggregate._sum.balance?.toString() ?? '0'
    },
    marketplace: {
      activeListings
    },
    queueDepth: {
      hourly: hourlyCounts.waiting,
      daily: dailyCounts.waiting
    }
  });
}
