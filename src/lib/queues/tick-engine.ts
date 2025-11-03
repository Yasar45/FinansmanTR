import { Queue, Worker, QueueScheduler, type Job } from 'bullmq';
import Decimal from 'decimal.js';
import {
  AnimalStatus,
  CropStatus,
  OutputKind,
  PlotStatus,
  PlotType,
  WalletTransactionType
} from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  EconomySettings,
  diseaseMultiplier,
  droughtMultiplier,
  loadEconomySettings,
  seasonalityMultiplier
} from '@/lib/economy';
import { toDecimal } from '@/lib/money';
import { env } from '@/lib/env';

const redisUrl = new URL(env.REDIS_URL);
const redisConnection = {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || '6379'),
    password: redisUrl.password || undefined
  }
};

export interface TickPayload {
  tickAt: string;
}

export const hourlyQueue = new Queue<TickPayload>('production:hourly', redisConnection);
export const hourlyScheduler = new QueueScheduler('production:hourly', redisConnection);
export const dailyQueue = new Queue<TickPayload>('production:daily', redisConnection);
export const dailyScheduler = new QueueScheduler('production:daily', redisConnection);
export const notificationsQueue = new Queue('notifications', redisConnection);
export const payoutsQueue = new Queue('payouts', redisConnection);
export const kycQueue = new Queue('kyc', redisConnection);

export const hourlyWorker = new Worker<TickPayload>(
  'production:hourly',
  async (job) => {
    logger.info({ scope: 'hourly', jobId: job.id, tickAt: job.data.tickAt }, 'Processing hourly tick');
    await processHourlyTick(job);
  },
  redisConnection
);

export const dailyWorker = new Worker<TickPayload>(
  'production:daily',
  async (job) => {
    logger.info({ scope: 'daily', jobId: job.id, tickAt: job.data.tickAt }, 'Processing daily tick');
    await processDailyTick(job);
  },
  redisConnection
);

async function processHourlyTick(job: Job<TickPayload>) {
  const tickAt = new Date(job.data.tickAt);
  const settings = await loadEconomySettings();
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    const result = await processUserHourlyTick(user.id, tickAt, settings);
    if (result.notifications.length > 0) {
      await notificationsQueue.add('dispatch', {
        userId: user.id,
        notificationIds: result.notifications.map((n) => n.id)
      });
    }
  }
}

async function processDailyTick(job: Job<TickPayload>) {
  const tickAt = new Date(job.data.tickAt);
  const settings = await loadEconomySettings();
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    await processUserDailyTick(user.id, tickAt, settings);
  }
}

export async function processUserHourlyTick(userId: string, tickAt: Date, settings: EconomySettings) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findFirst({ where: { userId } });
    let walletBalance = wallet ? new Decimal(wallet.balance) : new Decimal(0);
    const walletEntries: { amount: Decimal; balance: Decimal; metadata: Record<string, unknown> }[] = [];

    const animals = await tx.animal.findMany({
      where: { ownerId: userId, status: { not: AnimalStatus.DEAD } },
      include: { type: { include: { feedType: true } } }
    });
    const feedInventories = await tx.feedInventory.findMany({ where: { ownerId: userId } });
    const feedIndex = new Map(feedInventories.map((feed) => [feed.feedTypeId, { ...feed, qtyDecimal: new Decimal(feed.qty) }]));

    const plots = await tx.plot.findMany({
      where: { ownerId: userId },
      include: {
        crops: { include: { cropType: true }, where: { status: { in: [CropStatus.PLANTED, CropStatus.GROWING, CropStatus.SUSPENDED] } } }
      }
    });

    const summary = {
      outputs: [] as Array<{ kind: OutputKind; qty: Decimal }>,
      costs: [] as Array<{ type: string; amount: Decimal }>,
      events: [] as string[]
    };
    const notifications: Array<{ id: string }> = [];

    const tickFactor = new Decimal(settings.tick.tickLengthMinutes).div(60);

    for (const animal of animals) {
      const type = animal.type;
      const feedEntry = feedIndex.get(type.feedTypeId);
      const requiredFeed = toDecimal(type.feedPerTick).mul(toDecimal(animal.productivityMod));
      const availableFeed = feedEntry?.qtyDecimal ?? new Decimal(0);
      const consumedFeed = Decimal.min(requiredFeed, availableFeed);

      let penalty = 0;
      if (availableFeed.lt(requiredFeed) && !availableFeed.isZero()) {
        const ratio = availableFeed.div(requiredFeed);
        if (ratio.lt(0.5)) {
          penalty = 0.5;
        } else {
          penalty = 0.25;
        }
      } else if (availableFeed.isZero() && requiredFeed.gt(0)) {
        penalty = 1;
      }

      if (feedEntry) {
        feedEntry.qtyDecimal = feedEntry.qtyDecimal.sub(consumedFeed);
      }

      let nextStatus = penalty === 1 ? AnimalStatus.STALLED : AnimalStatus.ACTIVE;
      let feedDeficitTicks = penalty > 0 ? animal.feedDeficitTicks + 1 : Math.max(0, animal.feedDeficitTicks - 1);
      if (penalty === 0) {
        feedDeficitTicks = Math.max(0, animal.feedDeficitTicks - 1);
      }

      const healthFloor = new Decimal(type.healthFloor).div(100);
      let healthFactor = new Decimal(animal.health).div(100);
      if (penalty >= 0.5) {
        const healthPenalty = Math.ceil(penalty * 20);
        const adjusted = Math.max(type.healthFloor, animal.health - healthPenalty);
        healthFactor = new Decimal(adjusted).div(100);
      } else if (animal.health < 100 && penalty === 0) {
        const recovered = Math.min(100, animal.health + 1);
        healthFactor = new Decimal(recovered).div(100);
      }
      if (healthFactor.lt(healthFloor)) {
        healthFactor = healthFloor;
      }

      let productivity = toDecimal(animal.productivityMod)
        .mul(new Decimal(1 - penalty))
        .mul(new Decimal(settings.tick.animalProductivityMultiplier))
        .mul(seasonalityMultiplier(settings, type.seasonalityKey, tickAt))
        .mul(diseaseMultiplier(settings, type.seasonalityKey));

      if (type.lifespanDays && animal.ageDays > type.lifespanDays) {
        const overAge = animal.ageDays - type.lifespanDays;
        const lifespanPenalty = Decimal.max(new Decimal(0.2), new Decimal(1).sub(new Decimal(overAge).mul(0.02)));
        productivity = productivity.mul(lifespanPenalty);
      }

      if (penalty === 1) {
        productivity = new Decimal(0);
        summary.events.push(`Hayvan ${animal.id} yem yetersizliği nedeniyle durdu.`);
      }

      const output = toDecimal(type.baseHourlyOutput).mul(productivity).mul(healthFactor).mul(tickFactor);

      if (output.gt(0)) {
        const outputKind = mapOutputKind(type.name);
        summary.outputs.push({ kind: outputKind, qty: output });
        await tx.outputInventory.upsert({
          where: { ownerId_kind: { ownerId: userId, kind: outputKind } },
          update: {
            qty: { increment: output.toNumber() },
            avgCostTRY: type.baseSellPriceTRY
          },
          create: {
            ownerId: userId,
            kind: outputKind,
            qty: output.toNumber(),
            unit: type.productionUnit,
            avgCostTRY: type.baseSellPriceTRY
          }
        });
      }

      const feedCost = toDecimal(type.feedType.unitCostTRY ?? 0).mul(consumedFeed);
      if (feedCost.gt(0)) {
        summary.costs.push({ type: 'FEED', amount: feedCost });
      }

      await tx.animal.update({
        where: { id: animal.id },
        data: {
          lastTickAt: tickAt,
          status: nextStatus,
          feedDeficitTicks,
          health: Math.round(healthFactor.mul(100).toNumber())
        }
      });
    }

    for (const feedEntry of feedIndex.values()) {
      await tx.feedInventory.update({
        where: { id: feedEntry.id },
        data: { qty: feedEntry.qtyDecimal.toNumber() }
      });
    }

    for (const plot of plots) {
      const maintenanceBase = toDecimal(plot.maintenanceTRY);
      const maintenanceMultiplier = new Decimal(1).add(toDecimal(settings.pricing.rentEscalationBps).div(10_000));
      const maintenancePerTick = maintenanceBase.mul(maintenanceMultiplier).mul(new Decimal(settings.tick.tickLengthMinutes).div(1_440));

      if (maintenancePerTick.gt(0)) {
        if (wallet && walletBalance.gte(maintenancePerTick)) {
          walletBalance = walletBalance.sub(maintenancePerTick);
          walletEntries.push({
            amount: maintenancePerTick.neg(),
            balance: walletBalance,
            metadata: { plotId: plot.id, reason: 'MAINTENANCE' }
          });
          summary.costs.push({ type: 'MAINTENANCE', amount: maintenancePerTick });
        } else {
          if (plot.status !== PlotStatus.SUSPENDED) {
            const notification = await tx.notification.create({
              data: {
                userId,
                type: 'PLOT_SUSPENDED',
                payload: { plotId: plot.id, reason: 'INSUFFICIENT_FUNDS', tickAt }
              }
            });
            notifications.push(notification);
            summary.events.push(`Seranız (${plot.id}) bakım ödemesi yapılamadığı için durduruldu.`);
          }
          await tx.plot.update({
            where: { id: plot.id },
            data: { status: PlotStatus.SUSPENDED }
          });
          plot.status = PlotStatus.SUSPENDED;
          continue;
        }
      }

      await tx.plot.update({
        where: { id: plot.id },
        data: { status: PlotStatus.ACTIVE, lastMaintenanceAt: tickAt }
      });
      plot.status = PlotStatus.ACTIVE;

      for (const crop of plot.crops) {
        if (crop.status === CropStatus.SUSPENDED && plot.status === PlotStatus.SUSPENDED) {
          continue;
        }

        const baseProgress = new Decimal(settings.tick.tickLengthMinutes)
          .div(new Decimal(crop.cropType.cycleDays).mul(1_440));
        const productivity = new Decimal(settings.tick.cropProductivityMultiplier)
          .mul(seasonalityMultiplier(settings, crop.cropType.seasonalityKey, tickAt))
          .mul(droughtMultiplier(settings, crop.cropType.droughtResilient || plot.type === PlotType.HYDROPONIC));
        const progress = baseProgress.mul(productivity);
        let growth = toDecimal(crop.growthPercent).add(progress.mul(100));

        let cropStatus = crop.status === CropStatus.SUSPENDED ? CropStatus.GROWING : crop.status;

        if (growth.gte(100)) {
          growth = new Decimal(100);
          cropStatus = CropStatus.READY;
          const kind = mapCropKind(crop.cropType.name);
          const qty = toDecimal(crop.expectedYield);
          summary.outputs.push({ kind, qty });
          await tx.outputInventory.upsert({
            where: { ownerId_kind: { ownerId: userId, kind } },
            update: {
              qty: { increment: qty.toNumber() },
              avgCostTRY: crop.cropType.baseSellPriceTRY
            },
            create: {
              ownerId: userId,
              kind,
              qty: qty.toNumber(),
              unit: crop.cropType.outputUnit,
              avgCostTRY: crop.cropType.baseSellPriceTRY
            }
          });

          const notification = await tx.notification.create({
            data: {
              userId,
              type: 'CROP_READY',
              payload: { cropId: crop.id, plotId: plot.id, qty: qty.toNumber(), unit: crop.cropType.outputUnit, tickAt }
            }
          });
          notifications.push(notification);
        }

        await tx.cropInstance.update({
          where: { id: crop.id },
          data: {
            growthPercent: growth.toNumber(),
            status: cropStatus,
            lastTickAt: tickAt
          }
        });

        if (plot.type === PlotType.HYDROPONIC && settings.tick.droughtEvent?.active) {
          const electricityCost = toDecimal(crop.cropType.electricityCostTRY).mul(new Decimal(settings.tick.tickLengthMinutes).div(1_440));
          if (electricityCost.gt(0) && wallet && walletBalance.gte(electricityCost)) {
            walletBalance = walletBalance.sub(electricityCost);
            walletEntries.push({
              amount: electricityCost.neg(),
              balance: walletBalance,
              metadata: { plotId: plot.id, reason: 'ELECTRICITY_DROUGHT' }
            });
            summary.costs.push({ type: 'ELECTRICITY', amount: electricityCost });
          }
        }
      }
    }

    if (wallet && walletEntries.length > 0) {
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: walletBalance } });
      for (const entry of walletEntries) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.MAINTENANCE,
            amount: entry.amount.toNumber(),
            balance: entry.balance.toNumber(),
            metadata: entry.metadata
          }
        });
      }
    }

    const log = await tx.productionLog.create({
      data: {
        ownerId: userId,
        tickAt,
        details: {
          scope: 'HOURLY',
          tickMinutes: settings.tick.tickLengthMinutes,
          outputs: summary.outputs.map((item) => ({ kind: item.kind, qty: item.qty.toString() })),
          costs: summary.costs.map((item) => ({ type: item.type, amount: item.amount.toString() })),
          events: summary.events
        }
      }
    });

    logger.debug({ userId, logId: log.id }, 'Hourly production log recorded');

    return { notifications };
  });
}

export async function processUserDailyTick(userId: string, tickAt: Date, settings: EconomySettings) {
  const since = new Date(tickAt.getTime() - 24 * 60 * 60 * 1000);
  const animals = await prisma.animal.findMany({
    where: { ownerId: userId, status: { not: AnimalStatus.DEAD } },
    include: { type: true }
  });

  const animalEvents: string[] = [];
  const mortalityRate = toDecimal(settings.tick.mortalityRateBps ?? 0).div(10_000);

  for (const animal of animals) {
    const nextAge = animal.ageDays + 1;
    const isMature = nextAge >= animal.type.maturityDays;
    await prisma.animal.update({
      where: { id: animal.id },
      data: { ageDays: nextAge, isMature, lastAgedAt: tickAt }
    });

    if (mortalityRate.gt(0)) {
      let risk = mortalityRate;
      if (animal.feedDeficitTicks > 6) {
        risk = risk.mul(2);
      }
      if (animal.type.lifespanDays && nextAge > animal.type.lifespanDays) {
        risk = risk.mul(1.5);
      }
      if (Math.random() < risk.toNumber()) {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { status: AnimalStatus.DEAD }
        });
        const notification = await prisma.notification.create({
          data: {
            userId,
            type: 'ANIMAL_LOSS',
            payload: { animalId: animal.id, reason: 'MORTALITY', tickAt }
          }
        });
        animalEvents.push(`Hayvan ${animal.id} mortalite nedeniyle kaybedildi.`);
        await notificationsQueue.add('dispatch', {
          userId,
          notificationIds: [notification.id]
        });
      }
    }
  }

  const logs = await prisma.productionLog.findMany({
    where: { ownerId: userId, tickAt: { gte: since, lt: tickAt } },
    orderBy: { tickAt: 'asc' }
  });

  const dailySummary = logs.reduce(
    (acc, log) => {
      const scope = (log.details as any)?.scope ?? 'HOURLY';
      if (scope !== 'HOURLY') return acc;
      const details = log.details as Record<string, any>;
      for (const output of details.outputs ?? []) {
        const key = output.kind as string;
        const value = toDecimal(output.qty ?? 0);
        acc.outputs[key] = (acc.outputs[key] ?? new Decimal(0)).add(value);
      }
      for (const cost of details.costs ?? []) {
        const key = cost.type as string;
        const value = toDecimal(cost.amount ?? 0);
        acc.costs[key] = (acc.costs[key] ?? new Decimal(0)).add(value);
      }
      acc.events.push(...(details.events ?? []));
      return acc;
    },
    { outputs: {} as Record<string, Decimal>, costs: {} as Record<string, Decimal>, events: [] as string[] }
  );

  const events = [...animalEvents];

  await prisma.productionLog.create({
    data: {
      ownerId: userId,
      tickAt,
      details: {
        scope: 'DAILY',
        outputs: Object.entries(dailySummary.outputs).map(([kind, qty]) => ({
          kind,
          qty: qty.toString()
        })),
        costs: Object.entries(dailySummary.costs).map(([type, amount]) => ({
          type,
          amount: amount.toString()
        })),
        events: [...dailySummary.events, ...events]
      }
    }
  });

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'DAILY_ECONOMY',
      payload: {
        tickAt,
        outputs: dailySummary.outputs,
        costs: dailySummary.costs,
        events: [...dailySummary.events, ...events]
      }
    }
  });

  await notificationsQueue.add('dispatch', {
    userId,
    notificationIds: [notification.id]
  });

  await payoutsQueue.add('settle-daily', { userId, tickAt });
}

export async function runManualTickForUser(userId: string) {
  const tickAt = new Date();
  const settings = await loadEconomySettings();
  await processUserHourlyTick(userId, tickAt, settings);
  await processUserDailyTick(userId, tickAt, settings);
}

function mapOutputKind(name: string): OutputKind {
  switch (name) {
    case 'Tavuk':
      return OutputKind.EGG;
    case 'İnek':
      return OutputKind.MILK;
    case 'Arı Kovanı':
      return OutputKind.HONEY;
    default:
      return OutputKind.CUSTOM;
  }
}

function mapCropKind(name: string): OutputKind {
  switch (name) {
    case 'Domates':
      return OutputKind.TOMATO;
    case 'Biber':
      return OutputKind.PEPPER;
    case 'Patlıcan':
      return OutputKind.EGGPLANT;
    case 'Marul':
      return OutputKind.LETTUCE;
    default:
      return OutputKind.CUSTOM;
  }
}
