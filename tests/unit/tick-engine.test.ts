import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EconomySettings } from '@/lib/economy';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER ?? 'MOCK';
process.env.PAYMENT_MAX_DEPOSITS_PER_MINUTE = process.env.PAYMENT_MAX_DEPOSITS_PER_MINUTE ?? '5';
process.env.PAYMENT_MAX_DEPOSITS_PER_HOUR = process.env.PAYMENT_MAX_DEPOSITS_PER_HOUR ?? '20';
process.env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR = process.env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR ?? '100000';
process.env.DISABLE_QUEUE_CONNECTIONS = 'true';

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn()
};

vi.mock('@/lib/logger', () => ({ logger: loggerMock }));

let wallet: any;
let animals: any[];
let feedInventories: any[];
let plots: any[];
let outputUpserts: any[];
let walletTransactions: any[];
let notifications: any[];
let productionLogs: any[];

const walletFindFirstMock = vi.fn();
const walletUpdateMock = vi.fn();
const walletTransactionCreateMock = vi.fn();
const animalFindManyMock = vi.fn();
const animalUpdateMock = vi.fn();
const feedFindManyMock = vi.fn();
const feedUpdateMock = vi.fn();
const plotFindManyMock = vi.fn();
const plotUpdateMock = vi.fn();
const cropUpdateMock = vi.fn();
const outputUpsertMock = vi.fn();
const notificationCreateMock = vi.fn();
const productionLogCreateMock = vi.fn();

const transaction = {
  wallet: {
    findFirst: walletFindFirstMock,
    update: walletUpdateMock
  },
  animal: {
    findMany: animalFindManyMock,
    update: animalUpdateMock
  },
  feedInventory: {
    findMany: feedFindManyMock,
    update: feedUpdateMock
  },
  plot: {
    findMany: plotFindManyMock,
    update: plotUpdateMock
  },
  cropInstance: {
    update: cropUpdateMock
  },
  outputInventory: {
    upsert: outputUpsertMock
  },
  walletTransaction: {
    create: walletTransactionCreateMock
  },
  notification: {
    create: notificationCreateMock
  },
  productionLog: {
    create: productionLogCreateMock
  }
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<any>) => callback(transaction))
  }
}));

const settings: EconomySettings = {
  tick: {
    tickLengthMinutes: 60,
    animalProductivityMultiplier: 1,
    cropProductivityMultiplier: 1,
    mortalityRateBps: 0,
    diseaseEvent: { active: false, penalty: 0.25, affectedSeasonalityKeys: [] },
    droughtEvent: { active: false, penalty: 0 },
    seasonality: {}
  },
  pricing: {
    exchange: { defaultSpreadBps: 40, tradeFeeBps: 15 },
    marketplace: {
      makerFeeBps: 20,
      takerFeeBps: 40,
      floorPrices: {},
      ceilingPrices: {},
      relistCooldownHours: 0,
      dailyListingLimit: 0
    },
    wallet: { depositFeeBps: 0, withdrawFeeBps: 0 },
    guardrails: { maxAnimalsPerUser: 0, maxPlotsPerUser: 0 },
    rentEscalationBps: 0,
    oracle: { enabled: false, provider: 'MOCK', mockOffsets: {}, bounds: {} }
  },
  events: {
    disease: { active: false, affectedSeasonalityKeys: [] },
    drought: { active: false, severity: 0 }
  }
};

const tickAt = new Date('2024-02-01T10:00:00Z');

let processUserHourlyTick: (userId: string, tickAt: Date, settings: EconomySettings) => Promise<any>;

beforeEach(async () => {
  vi.clearAllMocks();
  wallet = { id: 'wallet-1', userId: 'user-1', balance: 200 };
  animals = [
    {
      id: 'animal-1',
      ownerId: 'user-1',
      status: 'ACTIVE',
      feedDeficitTicks: 0,
      productivityMod: 1,
      health: 100,
      ageDays: 10,
      lastTickAt: new Date('2024-01-31T10:00:00Z'),
      type: {
        id: 'type-1',
        name: 'Tavuk',
        feedTypeId: 'feed-1',
        feedPerTick: 2,
        baseHourlyOutput: 4,
        baseSellPriceTRY: 12,
        productionUnit: 'adet',
        healthFloor: 60,
        feedType: { unitCostTRY: 3 }
      }
    }
  ];
  feedInventories = [
    { id: 'feed-inv-1', ownerId: 'user-1', feedTypeId: 'feed-1', qty: 1 }
  ];
  plots = [];
  outputUpserts = [];
  walletTransactions = [];
  notifications = [];
  productionLogs = [];

  walletFindFirstMock.mockResolvedValue(wallet);
  walletUpdateMock.mockImplementation(async ({ data }: any) => {
    wallet = { ...wallet, balance: data.balance };
    return wallet;
  });
  walletTransactionCreateMock.mockImplementation(async (args: any) => {
    walletTransactions.push(args);
    return { id: `txn-${walletTransactions.length}`, ...args.data };
  });
  animalFindManyMock.mockResolvedValue(animals);
  animalUpdateMock.mockImplementation(async ({ where, data }: any) => {
    const index = animals.findIndex((animal) => animal.id === where.id);
    animals[index] = { ...animals[index], ...data };
    return animals[index];
  });
  feedFindManyMock.mockResolvedValue(feedInventories.map((feed) => ({ ...feed })));
  feedUpdateMock.mockImplementation(async ({ where, data }: any) => {
    const index = feedInventories.findIndex((feed) => feed.id === where.id);
    feedInventories[index] = { ...feedInventories[index], ...data };
    return feedInventories[index];
  });
  plotFindManyMock.mockResolvedValue(plots.map((plot) => ({
    ...plot,
    crops: plot.crops?.map((crop: any) => ({ ...crop, cropType: { ...crop.cropType } })) ?? []
  })));
  plotUpdateMock.mockImplementation(async ({ where, data }: any) => {
    const index = plots.findIndex((plot) => plot.id === where.id);
    plots[index] = { ...plots[index], ...data };
    return plots[index];
  });
  cropUpdateMock.mockImplementation(async ({ where, data }: any) => {
    for (const plot of plots) {
      const cropIndex = plot.crops?.findIndex((crop: any) => crop.id === where.id) ?? -1;
      if (cropIndex >= 0) {
        plot.crops[cropIndex] = { ...plot.crops[cropIndex], ...data };
        return plot.crops[cropIndex];
      }
    }
    return null;
  });
  outputUpsertMock.mockImplementation(async (args: any) => {
    outputUpserts.push(args);
    return { id: `inventory-${outputUpserts.length}` };
  });
  notificationCreateMock.mockImplementation(async ({ data }: any) => {
    const notification = { id: `notif-${notifications.length}`, ...data };
    notifications.push(notification);
    return notification;
  });
  productionLogCreateMock.mockImplementation(async ({ data }: any) => {
    productionLogs.push(data);
    return { id: `log-${productionLogs.length}`, ...data };
  });

  const module = await import('@/lib/queues/tick-engine');
  processUserHourlyTick = module.processUserHourlyTick;
});

describe('processUserHourlyTick', () => {
  it('consumes feed and applies productivity penalties when inventory is low', async () => {
    await processUserHourlyTick('user-1', tickAt, settings);

    expect(feedUpdateMock).toHaveBeenCalledWith({ where: { id: 'feed-inv-1' }, data: { qty: 0 } });
    expect(animalUpdateMock).toHaveBeenCalled();
    const upsertCall = outputUpsertMock.mock.calls[0][0];
    expect(upsertCall.update.qty.increment).toBeCloseTo(3);
  });

  it('moves ready crops to inventory and notifies the user', async () => {
    plots = [
      {
        id: 'plot-1',
        ownerId: 'user-1',
        status: 'ACTIVE',
        maintenanceTRY: 0,
        type: 'GREENHOUSE',
        crops: [
          {
            id: 'crop-1',
            plotId: 'plot-1',
            status: 'GROWING',
            growthPercent: 96,
            expectedYield: 25,
            lastTickAt: new Date('2024-01-31T10:00:00Z'),
            cropType: {
              id: 'crop-type-1',
              name: 'Domates',
              cycleDays: 1,
              outputUnit: 'kg',
              baseSellPriceTRY: 18,
              droughtResilient: false,
              electricityCostTRY: 0,
              seasonalityKey: 'tomato'
            }
          }
        ]
      }
    ];

    plotFindManyMock.mockResolvedValue(plots.map((plot) => ({
      ...plot,
      crops: plot.crops.map((crop: any) => ({ ...crop, cropType: { ...crop.cropType } }))
    })));

    await processUserHourlyTick('user-1', tickAt, settings);

    expect(outputUpsertMock).toHaveBeenCalled();
    const createPayload = outputUpsertMock.mock.calls[0][0];
    expect(createPayload.create.qty).toBeCloseTo(25);
    expect(notificationCreateMock).toHaveBeenCalled();
    expect(cropUpdateMock).toHaveBeenCalledWith({
      where: { id: 'crop-1' },
      data: expect.objectContaining({ status: 'READY', growthPercent: expect.any(Number) })
    });
  });

  it('is idempotent when rerun for the same tick timestamp', async () => {
    await processUserHourlyTick('user-1', tickAt, settings);

    outputUpsertMock.mockClear();
    animalUpdateMock.mockClear();

    await processUserHourlyTick('user-1', tickAt, settings);

    expect(outputUpsertMock).not.toHaveBeenCalled();
    expect(animalUpdateMock).not.toHaveBeenCalled();
  });
});
