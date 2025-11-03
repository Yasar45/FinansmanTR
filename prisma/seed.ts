import {
  CropStatus,
  KycStatus,
  MarketplaceListingStatus,
  OutputKind,
  PlotStatus,
  PlotType,
  PrismaClient,
  Role,
  WalletTransactionType
} from '@prisma/client';
import bcrypt from 'bcryptjs';

import { simulateTicks } from '../scripts/simulate-ticks';

const prisma = new PrismaClient();

const NOW = new Date();
const PASSWORD = 'Password123!';

interface SeedUserSpec {
  email: string;
  fullName: string;
  role: Role;
  abilities?: string[];
  walletBalance: number;
  kycStatus: KycStatus;
  nationalId: string;
  phone: string;
  birthDate: Date;
  city: string;
  district: string;
  consentIp: string;
}

async function upsertSeedUser(passwordHash: string, spec: SeedUserSpec) {
  return prisma.user.upsert({
    where: { email: spec.email },
    update: {},
    create: {
      email: spec.email,
      passwordHash,
      role: spec.role,
      abilities: spec.abilities ?? [],
      profile: {
        create: {
          fullName: spec.fullName,
          preferredLocale: 'tr-TR',
          phoneNumber: spec.phone,
          nationalId: spec.nationalId,
          birthDate: spec.birthDate,
          address: {
            country: 'Türkiye',
            city: spec.city,
            district: spec.district
          },
          consentTermsAt: NOW,
          consentKvkkAt: NOW,
          consentRiskAt: NOW,
          consentCookieAt: NOW,
          consentIp: spec.consentIp,
          kycStatus: spec.kycStatus,
          kycSubmittedAt: spec.kycStatus === KycStatus.UNVERIFIED ? null : NOW,
          kycReviewedAt: spec.kycStatus === KycStatus.VERIFIED ? NOW : null,
          kycDecisionReason: spec.kycStatus === KycStatus.VERIFIED ? 'Seeded approval' : null
        }
      },
      wallets: {
        create: {
          balance: spec.walletBalance,
          ledger: {
            create: {
              type: WalletTransactionType.DEPOSIT,
              amount: spec.walletBalance,
              balance: spec.walletBalance,
              metadata: {
                seed: true,
                reason: 'Initial funding'
              }
            }
          }
        }
      }
    }
  });
}

async function seedUsers(passwordHash: string) {
  const adminSpecs: SeedUserSpec[] = [
    {
      email: 'selin.aksoy@ciftlikpazar.tr',
      fullName: 'Selin Aksoy',
      role: Role.ADMIN,
      abilities: ['manage:pricing', 'manage:listings', 'manage:users'],
      walletBalance: 150_000,
      kycStatus: KycStatus.VERIFIED,
      nationalId: '10000000010',
      phone: '+905551110001',
      birthDate: new Date('1985-03-12'),
      city: 'İstanbul',
      district: 'Kadıköy',
      consentIp: '192.168.10.10'
    },
    {
      email: 'murat.demir@ciftlikpazar.tr',
      fullName: 'Murat Demir',
      role: Role.ADMIN,
      abilities: ['manage:pricing', 'manage:listings', 'manage:users'],
      walletBalance: 135_000,
      kycStatus: KycStatus.VERIFIED,
      nationalId: '10000000011',
      phone: '+905551110002',
      birthDate: new Date('1982-11-02'),
      city: 'Ankara',
      district: 'Çankaya',
      consentIp: '192.168.10.11'
    }
  ];

  const modSpecs: SeedUserSpec[] = [
    {
      email: 'elif.kaya@ciftlikpazar.tr',
      fullName: 'Elif Kaya',
      role: Role.MOD,
      abilities: ['manage:listings'],
      walletBalance: 45_000,
      kycStatus: KycStatus.VERIFIED,
      nationalId: '10000000012',
      phone: '+905551110101',
      birthDate: new Date('1990-07-23'),
      city: 'İzmir',
      district: 'Konak',
      consentIp: '192.168.11.10'
    },
    {
      email: 'kerem.yilmaz@ciftlikpazar.tr',
      fullName: 'Kerem Yılmaz',
      role: Role.MOD,
      abilities: ['manage:listings'],
      walletBalance: 37_500,
      kycStatus: KycStatus.VERIFIED,
      nationalId: '10000000013',
      phone: '+905551110102',
      birthDate: new Date('1992-02-14'),
      city: 'Bursa',
      district: 'Nilüfer',
      consentIp: '192.168.11.11'
    }
  ];

  const userNames = [
    'Ahmet Yıldız',
    'Ayşe Kara',
    'Fatma Öztürk',
    'Mehmet Kaya',
    'Zeynep Çelik',
    'Mustafa Arslan',
    'Elif Aydın',
    'Burak Şahin',
    'Emre Yıldırım',
    'Deniz Polat',
    'Gizem Koç',
    'Onur Güneş',
    'Seda Uçar',
    'Caner Kılıç',
    'Büşra Taş',
    'Volkan Sezer',
    'Melike Çetin',
    'Hakan Kaplan',
    'İrem Demirel',
    'Cemre Boz'
  ];

  const userSpecs: SeedUserSpec[] = userNames.map((fullName, index) => {
    const emailHandle = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '.');
    const kycStatus = index < 10 ? KycStatus.VERIFIED : index < 15 ? KycStatus.PENDING : KycStatus.UNVERIFIED;
    return {
      email: `${emailHandle}${index.toString().padStart(2, '0')}@demo.ciftlikpazar.tr`,
      fullName,
      role: Role.USER,
      walletBalance: 12_000 + index * 750,
      kycStatus,
      nationalId: `200000000${index.toString().padStart(2, '0')}`,
      phone: `+9055500${(4000 + index).toString().padStart(4, '0')}`,
      birthDate: new Date(1993, (index % 12), (index % 27) + 1),
      city: index % 2 === 0 ? 'İstanbul' : 'Ankara',
      district: index % 3 === 0 ? 'Üsküdar' : index % 3 === 1 ? 'Çankaya' : 'Karşıyaka',
      consentIp: `10.0.0.${20 + index}`
    };
  });

  const specs = [...adminSpecs, ...modSpecs, ...userSpecs];
  const createdUsers = [];
  for (const spec of specs) {
    const user = await upsertSeedUser(passwordHash, spec);
    createdUsers.push(user);
  }

  return createdUsers;
}

async function seedCatalogs() {
  const feedTypeData = [
    { sku: 'FEED-POULTRY', name: 'Kanatlı Karma Yem', unit: 'kg', unitCostTRY: 8.25 },
    { sku: 'FEED-WATERFOWL', name: 'Su Kuşu Yemi', unit: 'kg', unitCostTRY: 9.1 },
    { sku: 'FEED-RUMINANT', name: 'Ruminant Enerji', unit: 'kg', unitCostTRY: 6.9 },
    { sku: 'FEED-HIVE', name: 'Arı Besini Şurubu', unit: 'kg', unitCostTRY: 22.5 },
    { sku: 'FEED-GOAT', name: 'Keçi Besi Karışımı', unit: 'kg', unitCostTRY: 7.4 }
  ];

  for (const feed of feedTypeData) {
    await prisma.feedType.upsert({
      where: { sku: feed.sku },
      update: {
        name: feed.name,
        unit: feed.unit,
        unitCostTRY: feed.unitCostTRY
      },
      create: feed
    });
  }

  const supplyTypeData = [
    { sku: 'SUP-SEED-TOM', name: 'Domates Fidesi', unit: 'paket', unitCostTRY: 95 },
    { sku: 'SUP-SEED-PEP', name: 'Biber Fidesi', unit: 'paket', unitCostTRY: 82 },
    { sku: 'SUP-SEED-LET', name: 'Marul Fidesi', unit: 'paket', unitCostTRY: 64 },
    { sku: 'SUP-HY-NUT', name: 'Hidroponik Besin Çözeltisi', unit: 'litre', unitCostTRY: 48 },
    { sku: 'SUP-HIVE-CARE', name: 'Kovan Bakım Seti', unit: 'set', unitCostTRY: 210 }
  ];

  for (const supply of supplyTypeData) {
    await prisma.supplyType.upsert({
      where: { sku: supply.sku },
      update: {
        name: supply.name,
        unit: supply.unit,
        unitCostTRY: supply.unitCostTRY
      },
      create: supply
    });
  }

  const feedTypes = await prisma.feedType.findMany();
  const feedMap = new Map(feedTypes.map((feed) => [feed.sku, feed.id]));

  const animalTypeData = [
    {
      name: 'Tavuk',
      purchasePriceTRY: 780,
      feedSku: 'FEED-POULTRY',
      feedPerTick: 0.22,
      productionUnit: 'adet',
      baseHourlyOutput: 0.78,
      maturityDays: 60,
      baseSellPriceTRY: 13.5,
      agingCurve: { base: 1, decayAfter: 480, slope: 0.004 },
      lifespanDays: 540,
      seasonalityKey: 'eggs',
      outputIntervalHours: 24,
      healthFloor: 45,
      mortalityRateBps: 12
    },
    {
      name: 'Ördek',
      purchasePriceTRY: 1_150,
      feedSku: 'FEED-WATERFOWL',
      feedPerTick: 0.28,
      productionUnit: 'adet',
      baseHourlyOutput: 0.55,
      maturityDays: 80,
      baseSellPriceTRY: 18.5,
      agingCurve: { base: 1, decayAfter: 520, slope: 0.003 },
      lifespanDays: 600,
      seasonalityKey: 'eggs',
      outputIntervalHours: 24,
      healthFloor: 50,
      mortalityRateBps: 14
    },
    {
      name: 'Keçi',
      purchasePriceTRY: 4_800,
      feedSku: 'FEED-GOAT',
      feedPerTick: 0.65,
      productionUnit: 'litre',
      baseHourlyOutput: 0.42,
      maturityDays: 180,
      baseSellPriceTRY: 22.4,
      agingCurve: { base: 1.1, decayAfter: 900, slope: 0.002 },
      lifespanDays: 1200,
      seasonalityKey: 'milk',
      outputIntervalHours: 12,
      healthFloor: 55,
      mortalityRateBps: 10
    },
    {
      name: 'Koyun',
      purchasePriceTRY: 5_500,
      feedSku: 'FEED-RUMINANT',
      feedPerTick: 0.72,
      productionUnit: 'litre',
      baseHourlyOutput: 0.48,
      maturityDays: 200,
      baseSellPriceTRY: 24.6,
      agingCurve: { base: 1.05, decayAfter: 960, slope: 0.0025 },
      lifespanDays: 1300,
      seasonalityKey: 'milk',
      outputIntervalHours: 12,
      healthFloor: 60,
      mortalityRateBps: 11
    },
    {
      name: 'İnek',
      purchasePriceTRY: 18_500,
      feedSku: 'FEED-RUMINANT',
      feedPerTick: 1.35,
      productionUnit: 'litre',
      baseHourlyOutput: 1.65,
      maturityDays: 240,
      baseSellPriceTRY: 27.8,
      agingCurve: { base: 1.08, decayAfter: 1_200, slope: 0.0015 },
      lifespanDays: 2000,
      seasonalityKey: 'milk',
      outputIntervalHours: 12,
      healthFloor: 62,
      mortalityRateBps: 9
    },
    {
      name: 'Arı Kovanı',
      purchasePriceTRY: 9_600,
      feedSku: 'FEED-HIVE',
      feedPerTick: 0.12,
      productionUnit: 'kg',
      baseHourlyOutput: 0.025,
      maturityDays: 120,
      baseSellPriceTRY: 96,
      agingCurve: { base: 1.2, decayAfter: 840, slope: 0.003 },
      lifespanDays: 1_400,
      seasonalityKey: 'honey',
      outputIntervalHours: 720,
      healthFloor: 55,
      mortalityRateBps: 15
    }
  ];

  for (const animal of animalTypeData) {
    const feedTypeId = feedMap.get(animal.feedSku);
    if (!feedTypeId) continue;
    await prisma.animalType.upsert({
      where: { name: animal.name },
      update: {
        purchasePriceTRY: animal.purchasePriceTRY,
        feedTypeId,
        feedPerTick: animal.feedPerTick,
        productionUnit: animal.productionUnit,
        baseHourlyOutput: animal.baseHourlyOutput,
        maturityDays: animal.maturityDays,
        baseSellPriceTRY: animal.baseSellPriceTRY,
        agingCurve: animal.agingCurve,
        lifespanDays: animal.lifespanDays,
        seasonalityKey: animal.seasonalityKey,
        outputIntervalHours: animal.outputIntervalHours,
        healthFloor: animal.healthFloor,
        mortalityRateBps: animal.mortalityRateBps
      },
      create: {
        name: animal.name,
        purchasePriceTRY: animal.purchasePriceTRY,
        feedTypeId,
        feedPerTick: animal.feedPerTick,
        productionUnit: animal.productionUnit,
        baseHourlyOutput: animal.baseHourlyOutput,
        maturityDays: animal.maturityDays,
        baseSellPriceTRY: animal.baseSellPriceTRY,
        agingCurve: animal.agingCurve,
        lifespanDays: animal.lifespanDays,
        seasonalityKey: animal.seasonalityKey,
        outputIntervalHours: animal.outputIntervalHours,
        healthFloor: animal.healthFloor,
        mortalityRateBps: animal.mortalityRateBps
      }
    });
  }

  const cropTypeData = [
    {
      name: 'Domates',
      plantingCostTRY: 2_700,
      cycleDays: 45,
      yieldPerCycle: 360,
      outputUnit: 'kg',
      baseSellPriceTRY: 24.5,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 320,
      droughtResilient: false
    },
    {
      name: 'Domates Hidroponik',
      plantingCostTRY: 3_800,
      cycleDays: 28,
      yieldPerCycle: 320,
      outputUnit: 'kg',
      baseSellPriceTRY: 26.5,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 540,
      droughtResilient: true
    },
    {
      name: 'Biber',
      plantingCostTRY: 2_200,
      cycleDays: 38,
      yieldPerCycle: 280,
      outputUnit: 'kg',
      baseSellPriceTRY: 22.8,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 270,
      droughtResilient: false
    },
    {
      name: 'Biber Hidroponik',
      plantingCostTRY: 3_250,
      cycleDays: 26,
      yieldPerCycle: 250,
      outputUnit: 'kg',
      baseSellPriceTRY: 24.2,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 510,
      droughtResilient: true
    },
    {
      name: 'Patlıcan',
      plantingCostTRY: 2_050,
      cycleDays: 42,
      yieldPerCycle: 310,
      outputUnit: 'kg',
      baseSellPriceTRY: 21.6,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 260,
      droughtResilient: false
    },
    {
      name: 'Marul',
      plantingCostTRY: 1_250,
      cycleDays: 25,
      yieldPerCycle: 420,
      outputUnit: 'adet',
      baseSellPriceTRY: 11.2,
      seasonalityKey: 'leafy',
      electricityCostTRY: 150,
      droughtResilient: true
    },
    {
      name: 'Marul Hidroponik',
      plantingCostTRY: 1_850,
      cycleDays: 18,
      yieldPerCycle: 400,
      outputUnit: 'adet',
      baseSellPriceTRY: 12.6,
      seasonalityKey: 'leafy',
      electricityCostTRY: 340,
      droughtResilient: true
    }
  ];

  for (const crop of cropTypeData) {
    await prisma.cropType.upsert({
      where: { name: crop.name },
      update: crop,
      create: crop
    });
  }
}

async function seedEconomy() {
  const systemPrices = [
    { symbol: 'EGG_TRY', midPriceTRY: 12.8, spreadBps: 35 },
    { symbol: 'MILK_TRY', midPriceTRY: 15.6, spreadBps: 42 },
    { symbol: 'HONEY_TRY', midPriceTRY: 97.5, spreadBps: 60 },
    { symbol: 'TOMATO_TRY', midPriceTRY: 21.4, spreadBps: 70 },
    { symbol: 'PEPPER_TRY', midPriceTRY: 20.2, spreadBps: 68 },
    { symbol: 'EGGPLANT_TRY', midPriceTRY: 19.6, spreadBps: 64 },
    { symbol: 'LETTUCE_TRY', midPriceTRY: 11.4, spreadBps: 50 }
  ];

  for (const price of systemPrices) {
    await prisma.systemPrice.upsert({
      where: { symbol: price.symbol },
      update: {
        midPriceTRY: price.midPriceTRY,
        spreadBps: price.spreadBps,
        source: 'ADMIN'
      },
      create: {
        symbol: price.symbol,
        midPriceTRY: price.midPriceTRY,
        spreadBps: price.spreadBps,
        source: 'ADMIN'
      }
    });
  }

  await prisma.oraclePriceReference.createMany({
    data: systemPrices.map((price) => ({
      symbol: price.symbol,
      midPriceTRY: price.midPriceTRY,
      effectiveDate: NOW,
      source: 'MOCK',
      payload: { seed: true }
    })),
    skipDuplicates: true
  });

  await prisma.economyRule.upsert({
    where: { key: 'tick.config' },
    update: {
      value: {
        tickLengthMinutes: 60,
        animalProductivityMultiplier: 1,
        cropProductivityMultiplier: 1,
        mortalityRateBps: 18,
        diseaseEvent: { active: false, penalty: 0.35 },
        droughtEvent: { active: false, penalty: 0.25 },
        seasonality: {
          eggs: { winter: 0.82, summer: 1.08 },
          honey: { spring: 1.1, summer: 1.2 },
          'summer-produce': { spring: 1.05, summer: 1.18 },
          leafy: { winter: 0.9, spring: 1.05 }
        }
      }
    },
    create: {
      key: 'tick.config',
      value: {
        tickLengthMinutes: 60,
        animalProductivityMultiplier: 1,
        cropProductivityMultiplier: 1,
        mortalityRateBps: 18,
        diseaseEvent: { active: false, penalty: 0.35 },
        droughtEvent: { active: false, penalty: 0.25 },
        seasonality: {
          eggs: { winter: 0.82, summer: 1.08 },
          honey: { spring: 1.1, summer: 1.2 },
          'summer-produce': { spring: 1.05, summer: 1.18 },
          leafy: { winter: 0.9, spring: 1.05 }
        }
      }
    }
  });

  await prisma.economyRule.upsert({
    where: { key: 'pricing.controls' },
    update: {
      value: {
        exchange: { defaultSpreadBps: 45 },
        marketplace: {
          makerFeeBps: 25,
          takerFeeBps: 45,
          floorPrices: {
            EGG_TRY: 8,
            MILK_TRY: 10,
            TOMATO_TRY: 12,
            PEPPER_TRY: 10,
            LETTUCE_TRY: 6
          },
          ceilingPrices: {
            EGG_TRY: 32,
            MILK_TRY: 34,
            TOMATO_TRY: 44,
            PEPPER_TRY: 38,
            LETTUCE_TRY: 18
          },
          relistCooldownHours: 6
        },
        wallet: {
          depositFeeBps: 10,
          withdrawFeeBps: 25
        },
        guardrails: {
          maxAnimalsPerUser: 180,
          maxPlotsPerUser: 12
        },
        rentEscalationBps: 150
      }
    },
    create: {
      key: 'pricing.controls',
      value: {
        exchange: { defaultSpreadBps: 45 },
        marketplace: {
          makerFeeBps: 25,
          takerFeeBps: 45,
          floorPrices: {
            EGG_TRY: 8,
            MILK_TRY: 10,
            TOMATO_TRY: 12,
            PEPPER_TRY: 10,
            LETTUCE_TRY: 6
          },
          ceilingPrices: {
            EGG_TRY: 32,
            MILK_TRY: 34,
            TOMATO_TRY: 44,
            PEPPER_TRY: 38,
            LETTUCE_TRY: 18
          },
          relistCooldownHours: 6
        },
        wallet: {
          depositFeeBps: 10,
          withdrawFeeBps: 25
        },
        guardrails: {
          maxAnimalsPerUser: 180,
          maxPlotsPerUser: 12
        },
        rentEscalationBps: 150
      }
    }
  });

  await prisma.economyRule.upsert({
    where: { key: 'events.state' },
    update: {
      value: {
        disease: { active: false, affectedSeasonalityKeys: ['eggs'] },
        drought: { active: false, severity: 0.18 }
      }
    },
    create: {
      key: 'events.state',
      value: {
        disease: { active: false, affectedSeasonalityKeys: ['eggs'] },
        drought: { active: false, severity: 0.18 }
      }
    }
  });
}

async function seedAssets() {
  const animalTypes = await prisma.animalType.findMany({ include: { feedType: true } });
  const animalTypeMap = new Map(animalTypes.map((type) => [type.name, type]));
  const cropTypes = await prisma.cropType.findMany();
  const cropMap = new Map(cropTypes.map((crop) => [crop.name, crop]));

  const demoUsers = await prisma.user.findMany({
    where: { role: Role.USER },
    orderBy: { email: 'asc' }
  });

  const herdPlans = [
    {
      userIndex: 0,
      animals: [
        { name: 'Tavuk', count: 24, baseAge: 58 },
        { name: 'Ördek', count: 6, baseAge: 70 }
      ]
    },
    {
      userIndex: 1,
      animals: [
        { name: 'Keçi', count: 8, baseAge: 185 },
        { name: 'Koyun', count: 6, baseAge: 210 }
      ]
    },
    {
      userIndex: 2,
      animals: [
        { name: 'İnek', count: 4, baseAge: 240 }
      ]
    },
    {
      userIndex: 3,
      animals: [
        { name: 'Arı Kovanı', count: 10, baseAge: 140 }
      ]
    },
    {
      userIndex: 4,
      animals: [
        { name: 'Tavuk', count: 18, baseAge: 75 },
        { name: 'Keçi', count: 4, baseAge: 170 }
      ]
    },
    {
      userIndex: 5,
      animals: [
        { name: 'Koyun', count: 7, baseAge: 180 }
      ]
    }
  ];

  for (const plan of herdPlans) {
    const user = demoUsers[plan.userIndex];
    if (!user) continue;

    for (const animalPlan of plan.animals) {
      const type = animalTypeMap.get(animalPlan.name);
      if (!type) continue;

      await prisma.animal.createMany({
        data: Array.from({ length: animalPlan.count }).map((_, idx) => ({
          ownerId: user.id,
          typeId: type.id,
          ageDays: animalPlan.baseAge + idx % 12,
          health: 96 - (idx % 5) * 2,
          productivityMod: 1,
          isMature: animalPlan.baseAge + idx % 12 >= type.maturityDays,
          status: 'ACTIVE'
        }))
      });

      const feedRequirement = Number(type.feedPerTick) * animalPlan.count * 120;
      const feedQty = Math.round(feedRequirement + animalPlan.count * 8);
      const feedCost = Number(type.feedType?.unitCostTRY ?? 10);
      await prisma.feedInventory.upsert({
        where: {
          ownerId_feedTypeId: {
            ownerId: user.id,
            feedTypeId: type.feedTypeId
          }
        },
        update: {
          qty: feedQty,
          avgCostTRY: feedCost
        },
        create: {
          ownerId: user.id,
          feedTypeId: type.feedTypeId,
          qty: feedQty,
          avgCostTRY: feedCost
        }
      });
    }
  }

  const plotSeeds = [
    {
      userIndex: 0,
      type: PlotType.GREENHOUSE,
      size: '1 dönüm',
      rentOrBuy: 'RENT',
      rentPriceTRY: 2_900,
      maintenanceTRY: 320,
      cropName: 'Domates',
      plantedDaysAgo: 18,
      expectedYield: 310
    },
    {
      userIndex: 1,
      type: PlotType.GREENHOUSE,
      size: '1.5 dönüm',
      rentOrBuy: 'BUY',
      buyPriceTRY: 95_000,
      maintenanceTRY: 380,
      cropName: 'Biber',
      plantedDaysAgo: 25,
      expectedYield: 260
    },
    {
      userIndex: 2,
      type: PlotType.HYDROPONIC,
      size: '800 m²',
      rentOrBuy: 'RENT',
      rentPriceTRY: 3_600,
      maintenanceTRY: 460,
      cropName: 'Marul Hidroponik',
      plantedDaysAgo: 10,
      expectedYield: 380
    },
    {
      userIndex: 3,
      type: PlotType.HYDROPONIC,
      size: '650 m²',
      rentOrBuy: 'RENT',
      rentPriceTRY: 3_150,
      maintenanceTRY: 430,
      cropName: 'Domates Hidroponik',
      plantedDaysAgo: 8,
      expectedYield: 300
    }
  ];

  for (const plotSeed of plotSeeds) {
    const user = demoUsers[plotSeed.userIndex];
    if (!user) continue;
    const cropType = cropMap.get(plotSeed.cropName);
    if (!cropType) continue;

    const plantedAt = new Date(NOW.getTime() - plotSeed.plantedDaysAgo * 24 * 60 * 60 * 1000);
    const harvestAt = new Date(plantedAt.getTime() + cropType.cycleDays * 24 * 60 * 60 * 1000);

    await prisma.plot.create({
      data: {
        ownerId: user.id,
        type: plotSeed.type,
        size: plotSeed.size,
        rentOrBuy: plotSeed.rentOrBuy,
        rentPriceTRY: plotSeed.rentPriceTRY ?? null,
        buyPriceTRY: plotSeed.buyPriceTRY ?? null,
        maintenanceTRY: plotSeed.maintenanceTRY,
        maintenanceEscalationBps: 140,
        status: PlotStatus.ACTIVE,
        lastMaintenanceAt: NOW,
        crops: {
          create: {
            cropTypeId: cropType.id,
            plantedAt,
            harvestAt,
            expectedYield: plotSeed.expectedYield,
            status: CropStatus.GROWING,
            growthPercent: Math.min(95, (plotSeed.plantedDaysAgo / cropType.cycleDays) * 100)
          }
        }
      }
    });
  }
}

async function seedMarketplace() {
  const users = await prisma.user.findMany({
    where: { role: Role.USER },
    orderBy: { email: 'asc' },
    include: {
      animals: { include: { type: true } },
      plots: true,
      outputs: true
    }
  });

  type ListingSeed = {
    sellerId: string;
    assetRef: string;
    refId: string;
    symbol?: string;
    priceTRY: number;
    qty: number;
    metadata?: Record<string, unknown>;
  };

  const eggsOwner = users[0];
  const milkOwner = users[1];
  const honeyOwner = users[3];
  const produceOwner = users[2];

  const eggInventory = eggsOwner?.outputs.find((item) => item.kind === OutputKind.EGG);
  const milkInventory = milkOwner?.outputs.find((item) => item.kind === OutputKind.MILK);
  const honeyInventory = honeyOwner?.outputs.find((item) => item.kind === OutputKind.HONEY);
  const tomatoInventory = produceOwner?.outputs.find((item) => item.kind === OutputKind.TOMATO);
  const listingBuffer: ListingSeed[] = [];
  const pushListing = (entry: ListingSeed | undefined) => {
    if (entry && listingBuffer.length < 10) {
      listingBuffer.push(entry);
    }
  };

  pushListing(
    eggInventory && eggsOwner
      ? {
          sellerId: eggsOwner.id,
          assetRef: 'OUTPUT',
          refId: eggInventory.id,
          symbol: 'EGG_TRY',
          priceTRY: 24,
          qty: Math.min(180, Number(eggInventory.qty)),
          metadata: { unit: eggInventory.unit, seed: true }
        }
      : undefined
  );
  pushListing(
    milkInventory && milkOwner
      ? {
          sellerId: milkOwner.id,
          assetRef: 'OUTPUT',
          refId: milkInventory.id,
          symbol: 'MILK_TRY',
          priceTRY: 27.5,
          qty: Math.min(240, Number(milkInventory.qty)),
          metadata: { unit: milkInventory.unit, seed: true }
        }
      : undefined
  );
  pushListing(
    honeyInventory && honeyOwner
      ? {
          sellerId: honeyOwner.id,
          assetRef: 'OUTPUT',
          refId: honeyInventory.id,
          symbol: 'HONEY_TRY',
          priceTRY: 118,
          qty: Math.min(35, Number(honeyInventory.qty)),
          metadata: { unit: honeyInventory.unit, seed: true }
        }
      : undefined
  );
  pushListing(
    tomatoInventory && produceOwner
      ? {
          sellerId: produceOwner.id,
          assetRef: 'OUTPUT',
          refId: tomatoInventory.id,
          symbol: 'TOMATO_TRY',
          priceTRY: 28,
          qty: Math.min(220, Number(tomatoInventory.qty)),
          metadata: { unit: tomatoInventory.unit, seed: true }
        }
      : undefined
  );

  const animalCandidates = [users[0], users[1], users[2], users[4], users[5]];
  for (const seller of animalCandidates) {
    if (!seller || listingBuffer.length >= 7) break;
    const animal = seller.animals.find((item) => item.typeId);
    if (!animal) continue;
    const type = animal.type;
    const ask = Number(type?.purchasePriceTRY ?? 950) * 0.92;
    pushListing({
      sellerId: seller.id,
      assetRef: 'ANIMAL',
      refId: animal.id,
      priceTRY: Math.round(ask),
      qty: 1,
      metadata: {
        typeName: type?.name ?? 'Bilinmeyen',
        ageDays: animal.ageDays,
        productivity: Number(animal.productivityMod),
        seed: true
      }
    });
  }

  const plotCandidates = users.slice(0, 6);
  for (const seller of plotCandidates) {
    if (!seller || listingBuffer.length >= 10) break;
    const plot = seller.plots[0];
    if (!plot) continue;
    const basePrice = Number(plot.buyPriceTRY ?? plot.rentPriceTRY ?? 40_000);
    pushListing({
      sellerId: seller.id,
      assetRef: 'PLOT',
      refId: plot.id,
      priceTRY: Math.round(basePrice * 1.02),
      qty: 1,
      metadata: {
        type: plot.type,
        size: plot.size,
        rentOrBuy: plot.rentOrBuy,
        seed: true
      }
    });
  }

  const finalListings = listingBuffer;

  await prisma.marketplaceListing.createMany({
    data: finalListings.map((item) => ({
      sellerId: item.sellerId,
      assetRef: item.assetRef,
      refId: item.refId,
      symbol: item.symbol,
      priceTRY: item.priceTRY,
      qty: item.qty,
      metadata: item.metadata,
      status: MarketplaceListingStatus.ACTIVE,
      expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000)
    })),
    skipDuplicates: true
  });
}

async function ensureInventoriesAfterSimulation() {
  const trackedOutputs: Array<[OutputKind, { unit: string; ownerIndex: number; qty: number; avgCost: number }]> = [
    [OutputKind.EGG, { unit: 'adet', ownerIndex: 0, qty: 240, avgCost: 12 }],
    [OutputKind.MILK, { unit: 'litre', ownerIndex: 1, qty: 260, avgCost: 24 }],
    [OutputKind.HONEY, { unit: 'kg', ownerIndex: 3, qty: 40, avgCost: 80 }],
    [OutputKind.TOMATO, { unit: 'kg', ownerIndex: 2, qty: 260, avgCost: 18 }],
    [OutputKind.PEPPER, { unit: 'kg', ownerIndex: 1, qty: 160, avgCost: 16 }],
    [OutputKind.LETTUCE, { unit: 'adet', ownerIndex: 2, qty: 220, avgCost: 8 }]
  ];

  const users = await prisma.user.findMany({ where: { role: Role.USER }, orderBy: { email: 'asc' } });

  for (const [kind, config] of trackedOutputs) {
    const owner = users[config.ownerIndex];
    if (!owner) continue;
    const existing = await prisma.outputInventory.findUnique({
      where: { ownerId_kind: { ownerId: owner.id, kind } }
    });
    const targetQty = Math.max(existing ? Number(existing.qty) : 0, config.qty);
    if (existing) {
      await prisma.outputInventory.update({
        where: { id: existing.id },
        data: {
          unit: config.unit,
          qty: targetQty,
          avgCostTRY: config.avgCost
        }
      });
    } else {
      await prisma.outputInventory.create({
        data: {
          ownerId: owner.id,
          kind,
          unit: config.unit,
          qty: targetQty,
          avgCostTRY: config.avgCost
        }
      });
    }
  }
}

async function main() {
  try {
    console.info('Seeding Çiftlik Pazar verileri...');
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const users = await seedUsers(passwordHash);
    console.info(`Seeded ${users.length} users with wallets.`);

    await seedCatalogs();
    await seedEconomy();
    await seedAssets();

    console.info('Running tick simulation for 3 virtual days...');
    await simulateTicks(prisma, 3);

    await ensureInventoriesAfterSimulation();
    await seedMarketplace();

    await prisma.auditLog.create({
      data: {
        actorId: users.find((user) => user.role === Role.ADMIN)?.id,
        action: 'SEED_INITIAL_DATA',
        entity: 'SYSTEM',
        after: { message: 'Seed complete with demo economy and listings' }
      }
    });

    console.info('Seed tamamlandı.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
