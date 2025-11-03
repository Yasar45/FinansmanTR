import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER ?? 'MOCK';
process.env.PAYMENT_MAX_DEPOSITS_PER_MINUTE = process.env.PAYMENT_MAX_DEPOSITS_PER_MINUTE ?? '5';
process.env.PAYMENT_MAX_DEPOSITS_PER_HOUR = process.env.PAYMENT_MAX_DEPOSITS_PER_HOUR ?? '20';
process.env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR = process.env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR ?? '100000';
process.env.DISABLE_QUEUE_CONNECTIONS = 'true';

const auditLogCreate = vi.fn();
const systemPriceFind = vi.fn();
const systemPriceUpsert = vi.fn();
const animalTypeFind = vi.fn();
const animalTypeUpsert = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
      abilities: ['manage:pricing']
    }
  })
}));
vi.mock('@/lib/rbac', () => ({ hasAbility: () => true }));
vi.mock('@/lib/queues/tick-engine', () => ({
  hourlyQueue: { pause: vi.fn(), resume: vi.fn(), add: vi.fn(), getJobCounts: vi.fn() },
  dailyQueue: { pause: vi.fn(), resume: vi.fn(), add: vi.fn(), getJobCounts: vi.fn() },
  hourlyWorker: { pause: vi.fn(), resume: vi.fn(), isRunning: vi.fn(), on: vi.fn() },
  dailyWorker: { pause: vi.fn(), resume: vi.fn(), isRunning: vi.fn(), on: vi.fn() },
  runManualTickForUser: vi.fn()
}));
vi.mock('@/lib/queues/pricing-oracle', () => ({ ensureDailyOracleCron: vi.fn() }));
vi.mock('@/lib/oracle', () => ({ runPricingOracle: vi.fn() }));
vi.mock('@/lib/oracle-utils', () => ({ parseOracleUpload: vi.fn().mockReturnValue([]) }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemPrice: {
      findUnique: systemPriceFind,
      upsert: systemPriceUpsert
    },
    animalType: {
      findUnique: animalTypeFind,
      upsert: animalTypeUpsert
    },
    auditLog: {
      create: auditLogCreate
    },
    economyRule: {
      upsert: vi.fn()
    },
    $transaction: vi.fn(async (operations: any) => {
      if (typeof operations === 'function') {
        return operations({
          auditLog: { create: auditLogCreate },
          oraclePriceReference: { create: vi.fn() }
        });
      }
      return Promise.all(operations.map((operation: any) => operation));
    })
  }
}));

const settingsMock = {
  tick: {
    tickLengthMinutes: 60,
    animalProductivityMultiplier: 1,
    cropProductivityMultiplier: 1,
    mortalityRateBps: 0,
    diseaseEvent: { active: false, penalty: 0.2, affectedSeasonalityKeys: [] },
    droughtEvent: { active: false, penalty: 0 },
    seasonality: {}
  },
  pricing: {
    exchange: { defaultSpreadBps: 40, tradeFeeBps: 10 },
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

vi.mock('@/lib/economy', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadEconomySettings: vi.fn().mockResolvedValue(settingsMock)
  };
});

describe('admin actions audit logging', () => {
  beforeEach(() => {
    auditLogCreate.mockReset();
    systemPriceFind.mockReset();
    systemPriceUpsert.mockReset();
    animalTypeFind.mockReset();
    animalTypeUpsert.mockReset();
  });

  it('writes audit log when updating system price', async () => {
    systemPriceFind.mockResolvedValue({ symbol: 'EGG_TRY', midPriceTRY: 8.5, spreadBps: 40 });
    systemPriceUpsert.mockResolvedValue({ symbol: 'EGG_TRY', midPriceTRY: 9.2, spreadBps: 35 });

    const { updateSystemPriceAction } = await import(
      '@/app/[locale]/(dashboard)/admin/actions'
    );

    await updateSystemPriceAction({ symbol: 'EGG_TRY', midPriceTRY: 9.2, spreadBps: 35 });

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATE_SYSTEM_PRICE',
        entity: 'SystemPrice',
        before: expect.objectContaining({ symbol: 'EGG_TRY' }),
        after: expect.objectContaining({ midPriceTRY: 9.2 })
      })
    });
  });

  it('writes audit log when creating a new animal type', async () => {
    animalTypeFind.mockResolvedValue(null);
    animalTypeUpsert.mockResolvedValue({
      id: 'animal-type-1',
      name: 'Test Tavuk',
      feedTypeId: 'feed-1'
    });

    const { upsertAnimalTypeAction } = await import(
      '@/app/[locale]/(dashboard)/admin/actions'
    );

    await upsertAnimalTypeAction({
      name: 'Test Tavuk',
      purchasePriceTRY: 1200,
      feedTypeId: 'feed-1',
      feedPerTick: 1,
      productionUnit: 'adet',
      baseHourlyOutput: 2,
      maturityDays: 30,
      baseSellPriceTRY: 15,
      agingCurve: { base: 1 },
      lifespanDays: 400,
      seasonalityKey: 'eggs',
      outputIntervalHours: 1,
      healthFloor: 70,
      mortalityRateBps: 10
    });

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CREATE_ANIMAL_TYPE',
        entity: 'AnimalType',
        after: expect.objectContaining({ name: 'Test Tavuk' })
      })
    });
  });
});
