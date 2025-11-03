import {
  PrismaClient,
  Role,
  WalletTransactionType,
  OutputKind,
  PlotType,
  PlotStatus,
  MarketplaceListingStatus,
  CropStatus,
  KycStatus
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('Seeding Çiftlik Pazar verileri...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ciftlikpazar.tr' },
    update: {},
    create: {
      email: 'admin@ciftlikpazar.tr',
      passwordHash,
      role: Role.ADMIN,
      abilities: ['manage:pricing', 'manage:listings', 'manage:users'],
      profile: {
        create: {
          fullName: 'Admin User',
          preferredLocale: 'tr-TR',
          consentTermsAt: new Date(),
          consentKvkkAt: new Date(),
          consentRiskAt: new Date(),
          consentCookieAt: new Date(),
          consentIp: '127.0.0.1',
          kycStatus: KycStatus.VERIFIED
        }
      },
      wallets: {
        create: {
          balance: 25000
        }
      }
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@ciftlikpazar.tr' },
    update: {},
    create: {
      email: 'demo@ciftlikpazar.tr',
      passwordHash,
      role: Role.USER,
      profile: {
        create: {
          fullName: 'Demo Çiftçi',
          preferredLocale: 'tr-TR',
          phoneNumber: '+905551112233',
          consentTermsAt: new Date(),
          consentKvkkAt: new Date(),
          consentRiskAt: new Date(),
          consentCookieAt: new Date(),
          consentIp: '127.0.0.1'
        }
      },
      wallets: {
        create: {
          balance: 12500
        }
      }
    }
  });

  await prisma.feedType.upsert({
    where: { sku: 'FEED-POULTRY' },
    update: {},
    create: {
      sku: 'FEED-POULTRY',
      name: 'Kanatlı Karma Yem',
      unit: 'kg',
      unitCostTRY: 7.5
    }
  });

  await prisma.feedType.upsert({
    where: { sku: 'FEED-HIVE' },
    update: {},
    create: {
      sku: 'FEED-HIVE',
      name: 'Arı Besini',
      unit: 'kg',
      unitCostTRY: 18.4
    }
  });

  const poultryFeed = await prisma.feedType.findUniqueOrThrow({ where: { sku: 'FEED-POULTRY' } });
  const hiveFeed = await prisma.feedType.findUniqueOrThrow({ where: { sku: 'FEED-HIVE' } });

  await prisma.animalType.upsert({
    where: { name: 'Tavuk' },
    update: {},
    create: {
      name: 'Tavuk',
      purchasePriceTRY: 750,
      feedTypeId: poultryFeed.id,
      feedPerTick: 0.25,
      productionUnit: 'adet',
      baseHourlyOutput: 0.8,
      maturityDays: 60,
      baseSellPriceTRY: 120,
      agingCurve: { base: 1, decayAfter: 540 },
      lifespanDays: 600,
      seasonalityKey: 'eggs',
      outputIntervalHours: 24,
      healthFloor: 40,
      mortalityRateBps: 15
    }
  });

  await prisma.animalType.upsert({
    where: { name: 'Arı Kovanı' },
    update: {},
    create: {
      name: 'Arı Kovanı',
      purchasePriceTRY: 9800,
      feedTypeId: hiveFeed.id,
      feedPerTick: 0.1,
      productionUnit: 'kg',
      baseHourlyOutput: 0.02,
      maturityDays: 120,
      baseSellPriceTRY: 650,
      agingCurve: { base: 1.2, decayAfter: 720 },
      lifespanDays: 960,
      seasonalityKey: 'honey',
      outputIntervalHours: 720,
      healthFloor: 55,
      mortalityRateBps: 20
    }
  });

  await prisma.cropType.upsert({
    where: { name: 'Domates' },
    update: {},
    create: {
      name: 'Domates',
      plantingCostTRY: 2500,
      cycleDays: 45,
      yieldPerCycle: 350,
      outputUnit: 'kg',
      baseSellPriceTRY: 26,
      seasonalityKey: 'summer-produce',
      electricityCostTRY: 320,
      droughtResilient: false
    }
  });

  await prisma.cropType.upsert({
    where: { name: 'Marul' },
    update: {},
    create: {
      name: 'Marul',
      plantingCostTRY: 1350,
      cycleDays: 28,
      yieldPerCycle: 450,
      outputUnit: 'adet',
      baseSellPriceTRY: 12,
      seasonalityKey: 'leafy',
      electricityCostTRY: 180,
      droughtResilient: true
    }
  });

  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: user.id } });

  const existingTx = await prisma.walletTransaction.findFirst({ where: { walletId: wallet.id } });
  if (!existingTx) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: wallet.id,
          type: WalletTransactionType.DEPOSIT,
          amount: 5000,
          balance: 5000
        },
        {
          walletId: wallet.id,
          type: WalletTransactionType.BUY_ASSET,
          amount: -1250,
          balance: 3750,
          metadata: { asset: 'Tavuk', qty: 5 }
        }
      ]
    });
  }

  const tavuk = await prisma.animalType.findUniqueOrThrow({ where: { name: 'Tavuk' } });

  const animalCount = await prisma.animal.count({ where: { ownerId: user.id, typeId: tavuk.id } });
  if (animalCount === 0) {
    await prisma.animal.createMany({
      data: Array.from({ length: 5 }).map((_, index) => ({
        ownerId: user.id,
        typeId: tavuk.id,
        ageDays: 45 + index * 2,
        isMature: index > 1,
        productivityMod: 1
      }))
    });
  }

  await prisma.feedInventory.upsert({
    where: {
      ownerId_feedTypeId: {
        ownerId: user.id,
        feedTypeId: tavuk.feedTypeId
      }
    },
    update: {
      qty: 120
    },
    create: {
      ownerId: user.id,
      feedTypeId: tavuk.feedTypeId,
      qty: 120,
      avgCostTRY: 7.5
    }
  });

  const existingPlot = await prisma.plot.findFirst({ where: { ownerId: user.id } });
  if (!existingPlot) {
    await prisma.plot.create({
      data: {
        ownerId: user.id,
        type: PlotType.GREENHOUSE,
        size: '1 dönüm',
        rentOrBuy: 'RENT',
        rentPriceTRY: 2500,
        maintenanceTRY: 320,
        maintenanceEscalationBps: 120,
        status: PlotStatus.ACTIVE,
        lastMaintenanceAt: new Date(),
        crops: {
          create: {
            cropType: { connect: { name: 'Domates' } },
            plantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
            harvestAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
            expectedYield: 320,
            status: CropStatus.GROWING,
            growthPercent: 45
          }
        }
      }
    });
  }

  const outputs = await prisma.outputInventory.count({ where: { ownerId: user.id } });
  if (outputs === 0) {
    await prisma.outputInventory.createMany({
      data: [
        {
          ownerId: user.id,
          kind: OutputKind.EGG,
          qty: 320,
          unit: 'adet',
          avgCostTRY: 2.1
        },
        {
          ownerId: user.id,
          kind: OutputKind.TOMATO,
          qty: 150,
          unit: 'kg',
          avgCostTRY: 18.5
        }
      ]
    });
  }

  await prisma.marketplaceListing.deleteMany({ where: { refId: 'output-eggs', assetRef: 'OUTPUT' } });
  await prisma.marketplaceListing.create({
    data: {
      sellerId: user.id,
      assetRef: 'OUTPUT',
      refId: 'output-eggs',
      symbol: 'EGG_TRY',
      priceTRY: 21.0,
      qty: 200,
      metadata: { unit: 'adet' },
      status: MarketplaceListingStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4)
    }
  });

  const systemSymbols = [
    { symbol: 'EGG_TRY', midPriceTRY: 12.0, spreadBps: 30 },
    { symbol: 'MILK_TRY', midPriceTRY: 14.8, spreadBps: 40 },
    { symbol: 'HONEY_TRY', midPriceTRY: 85.0, spreadBps: 55 },
    { symbol: 'TOMATO_TRY', midPriceTRY: 20.4, spreadBps: 70 },
    { symbol: 'PEPPER_TRY', midPriceTRY: 18.5, spreadBps: 65 },
    { symbol: 'EGGPLANT_TRY', midPriceTRY: 16.2, spreadBps: 60 },
    { symbol: 'LETTUCE_TRY', midPriceTRY: 10.4, spreadBps: 45 }
  ];

  for (const quote of systemSymbols) {
    await prisma.systemPrice.upsert({
      where: { symbol: quote.symbol },
      update: { midPriceTRY: quote.midPriceTRY, spreadBps: quote.spreadBps },
      create: {
        symbol: quote.symbol,
        midPriceTRY: quote.midPriceTRY,
        spreadBps: quote.spreadBps,
        source: 'ADMIN'
      }
    });
  }

  await prisma.economyRule.upsert({
    where: { key: 'tick.config' },
    update: {
      value: {
        tickLengthMinutes: 60,
        animalProductivityMultiplier: 1,
        cropProductivityMultiplier: 1,
        mortalityRateBps: 25,
        diseaseEvent: { active: false, penalty: 0.3 },
        droughtEvent: { active: false, penalty: 0.25 },
        seasonality: {
          eggs: { winter: 0.85, summer: 1.05 },
          honey: { summer: 1.15 },
          'summer-produce': { summer: 1.2 },
          leafy: { winter: 0.9 }
        }
      }
    },
    create: {
      key: 'tick.config',
      value: {
        tickLengthMinutes: 60,
        animalProductivityMultiplier: 1,
        cropProductivityMultiplier: 1,
        mortalityRateBps: 25,
        diseaseEvent: { active: false, penalty: 0.3 },
        droughtEvent: { active: false, penalty: 0.25 },
        seasonality: {
          eggs: { winter: 0.85, summer: 1.05 },
          honey: { summer: 1.15 },
          'summer-produce': { summer: 1.2 },
          leafy: { winter: 0.9 }
        }
      }
    }
  });
  await prisma.economyRule.upsert({
    where: { key: 'pricing.controls' },
    update: {
      value: {
        exchange: {
          defaultSpreadBps: 40
        },
        marketplace: {
          makerFeeBps: 25,
          takerFeeBps: 45,
          floorPrices: {
            EGG: 8,
            TOMATO: 12
          },
          ceilingPrices: {
            EGG: 32,
            TOMATO: 48
          },
          relistCooldownHours: 6
        },
        wallet: {
          depositFeeBps: 10,
          withdrawFeeBps: 25
        },
        guardrails: {
          maxAnimalsPerUser: 150,
          maxPlotsPerUser: 12
        },
        rentEscalationBps: 150
      }
    },
    create: {
      key: 'pricing.controls',
      value: {
        exchange: {
          defaultSpreadBps: 40
        },
        marketplace: {
          makerFeeBps: 25,
          takerFeeBps: 45,
          floorPrices: {
            EGG: 8,
            TOMATO: 12
          },
          ceilingPrices: {
            EGG: 32,
            TOMATO: 48
          },
          relistCooldownHours: 6
        },
        wallet: {
          depositFeeBps: 10,
          withdrawFeeBps: 25
        },
        guardrails: {
          maxAnimalsPerUser: 150,
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
        drought: { active: false, severity: 0.2 }
      }
    },
    create: {
      key: 'events.state',
      value: {
        disease: { active: false, affectedSeasonalityKeys: ['eggs'] },
        drought: { active: false, severity: 0.2 }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SEED_INITIAL_DATA',
      entity: 'SYSTEM',
      after: { message: 'Initial seed complete' }
    }
  });

  console.info('Seed tamamlandı.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
