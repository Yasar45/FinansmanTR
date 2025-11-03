import { PrismaClient } from '@prisma/client';

import { simulateTicks } from './simulate-ticks';

const prisma = new PrismaClient();

async function main() {
  const daysArg = process.argv.slice(2).find((arg) => /^\d+$/.test(arg));
  const days = daysArg ? Number(daysArg) : 30;

  console.info(`Fast-forwarding the economy by ${days} day(s)...`);
  await simulateTicks(prisma, days);
  console.info('Simulation complete.');
}

main()
  .catch((error) => {
    console.error('Failed to fast-forward demo data', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
