import { PrismaClient } from '@prisma/client';
import { loadEconomySettings } from '@/lib/economy';

export async function simulateTicks(prisma: PrismaClient, days: number, startAt = new Date()) {
  if (days <= 0) {
    return;
  }

  process.env.DISABLE_QUEUE_CONNECTIONS = 'true';

  const { processUserHourlyTick, processUserDailyTick } = await import('@/lib/queues/tick-engine');

  const settings = await loadEconomySettings();
  const users = await prisma.user.findMany({ select: { id: true } });

  if (users.length === 0) {
    return;
  }

  const baseTime = startAt.getTime();
  const hourMs = 60 * 60 * 1000;

  for (let day = 0; day < days; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const tickAt = new Date(baseTime + ((day * 24 + hour + 1) * hourMs));
      for (const user of users) {
        await processUserHourlyTick(user.id, tickAt, settings);
      }
    }

    const dailyTickAt = new Date(baseTime + ((day + 1) * 24 * hourMs));
    for (const user of users) {
      await processUserDailyTick(user.id, dailyTickAt, settings);
    }
  }
}
