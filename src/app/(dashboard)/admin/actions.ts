'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import type { Ability } from '@/lib/auth';
import { hasAbility } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import {
  dailyQueue,
  hourlyQueue,
  dailyWorker,
  hourlyWorker,
  runManualTickForUser
} from '@/lib/queues/tick-engine';
import { BlacklistType } from '@prisma/client';

interface RequireOptions {
  abilities?: Ability[];
  roles?: Role[];
}

async function requireAdmin(options: RequireOptions = {}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const allowedRoles = options.roles ?? ['ADMIN', 'MOD'];
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }

  if (options.abilities && options.abilities.length > 0) {
    const can = options.abilities.some((ability) => hasAbility(session.user, ability));
    if (!can && session.user.role !== 'ADMIN') {
      throw new Error('Forbidden');
    }
  }

  return session.user;
}

const systemPriceSchema = z.object({
  symbol: z.string().min(2),
  midPriceTRY: z.number().positive(),
  spreadBps: z.number().int().min(0)
});

const economySettingsSchema = z.object({
  tick: z.object({
    tickLengthMinutes: z.number().positive(),
    animalProductivityMultiplier: z.number().positive(),
    cropProductivityMultiplier: z.number().positive(),
    mortalityRateBps: z.number().nonnegative(),
    diseaseEvent: z
      .object({
        active: z.boolean(),
        penalty: z.number().min(0).max(1),
        affectedSeasonalityKeys: z.array(z.string()).optional()
      })
      .optional(),
    droughtEvent: z
      .object({
        active: z.boolean(),
        penalty: z.number().min(0).max(1)
      })
      .optional(),
    seasonality: z.record(z.string(), z.record(z.string(), z.number())).default({})
  }),
  pricing: z.object({
    exchange: z.object({
      defaultSpreadBps: z.number().nonnegative(),
      tradeFeeBps: z.number().nonnegative()
    }),
    marketplace: z.object({
      makerFeeBps: z.number().nonnegative(),
      takerFeeBps: z.number().nonnegative(),
      floorPrices: z.record(z.string(), z.number()).default({}),
      ceilingPrices: z.record(z.string(), z.number()).default({}),
      relistCooldownHours: z.number().nonnegative(),
      dailyListingLimit: z.number().nonnegative()
    }),
    wallet: z.object({
      depositFeeBps: z.number().nonnegative(),
      withdrawFeeBps: z.number().nonnegative()
    }),
    guardrails: z.object({
      maxAnimalsPerUser: z.number().nonnegative(),
      maxPlotsPerUser: z.number().nonnegative()
    }),
    rentEscalationBps: z.number().nonnegative()
  }),
  events: z.object({
    disease: z.object({ active: z.boolean(), affectedSeasonalityKeys: z.array(z.string()).default([]) }),
    drought: z.object({ active: z.boolean(), severity: z.number().min(0).max(1) })
  })
});

export async function updateSystemPriceAction(input: z.infer<typeof systemPriceSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = systemPriceSchema.parse(input);

  const before = await prisma.systemPrice.findUnique({ where: { symbol: payload.symbol } });
  const price = await prisma.systemPrice.upsert({
    where: { symbol: payload.symbol },
    update: { midPriceTRY: payload.midPriceTRY, spreadBps: payload.spreadBps, source: 'ADMIN' },
    create: { ...payload, source: 'ADMIN' }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'UPDATE_SYSTEM_PRICE',
      entity: 'SystemPrice',
      before,
      after: price
    }
  });

  revalidatePath('/(dashboard)/admin');
  return price;
}

export async function updateEconomySettingsAction(input: z.infer<typeof economySettingsSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = economySettingsSchema.parse(input);

  await prisma.$transaction([
    prisma.economyRule.upsert({
      where: { key: 'tick.config' },
      update: { value: payload.tick },
      create: { key: 'tick.config', value: payload.tick }
    }),
    prisma.economyRule.upsert({
      where: { key: 'pricing.controls' },
      update: { value: payload.pricing },
      create: { key: 'pricing.controls', value: payload.pricing }
    }),
    prisma.economyRule.upsert({
      where: { key: 'events.state' },
      update: { value: payload.events },
      create: { key: 'events.state', value: payload.events }
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'UPDATE_ECONOMY_SETTINGS',
        entity: 'EconomyRule',
        before: null,
        after: payload
      }
    })
  ]);

  revalidatePath('/(dashboard)/admin');
  return payload;
}

const queueCommandSchema = z.object({
  queue: z.enum(['hourly', 'daily']),
  command: z.enum(['pause', 'resume', 'drain'])
});

export async function toggleTickQueueAction(input: z.infer<typeof queueCommandSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { queue, command } = queueCommandSchema.parse(input);

  const targetQueue = queue === 'hourly' ? hourlyQueue : dailyQueue;
  const targetWorker = queue === 'hourly' ? hourlyWorker : dailyWorker;

  if (command === 'pause') {
    await targetWorker.pause(true);
    await targetQueue.pause(true);
  } else if (command === 'resume') {
    await targetQueue.resume();
    await targetWorker.resume();
  } else if (command === 'drain') {
    await targetQueue.drain(true);
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'TICK_QUEUE_CONTROL',
      entity: 'BullMQ',
      before: null,
      after: { queue, command }
    }
  });

  revalidatePath('/(dashboard)/admin');
}

const userTickSchema = z.object({ userId: z.string().cuid() });

export async function triggerUserTickAction(input: z.infer<typeof userTickSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { userId } = userTickSchema.parse(input);

  await runManualTickForUser(userId);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'MANUAL_TICK',
      entity: 'TickEngine',
      before: null,
      after: { userId }
    }
  });

  revalidatePath('/(dashboard)/admin');
}

const agingCurveSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error('Yaşlanma eğrisi JSON formatında olmalıdır.');
    }
  });

const animalTypeSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  purchasePriceTRY: z.number().positive(),
  feedTypeId: z.string().cuid(),
  feedPerTick: z.number().nonnegative(),
  productionUnit: z.string().min(1),
  baseHourlyOutput: z.number().nonnegative(),
  maturityDays: z.number().int().positive(),
  baseSellPriceTRY: z.number().nonnegative(),
  agingCurve: agingCurveSchema,
  lifespanDays: z.number().int().positive().optional(),
  seasonalityKey: z.string().optional(),
  outputIntervalHours: z.number().int().positive().optional(),
  healthFloor: z.number().int().min(1).max(100),
  mortalityRateBps: z.number().int().nonnegative()
});

export async function upsertAnimalTypeAction(input: z.infer<typeof animalTypeSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = animalTypeSchema.parse(input);

  const before = payload.id
    ? await prisma.animalType.findUnique({ where: { id: payload.id } })
    : null;

  const type = await prisma.animalType.upsert({
    where: { id: payload.id ?? 'new' },
    update: {
      name: payload.name,
      purchasePriceTRY: payload.purchasePriceTRY,
      feedTypeId: payload.feedTypeId,
      feedPerTick: payload.feedPerTick,
      productionUnit: payload.productionUnit,
      baseHourlyOutput: payload.baseHourlyOutput,
      maturityDays: payload.maturityDays,
      baseSellPriceTRY: payload.baseSellPriceTRY,
      agingCurve: payload.agingCurve ?? before?.agingCurve ?? { base: 1 },
      lifespanDays: payload.lifespanDays,
      seasonalityKey: payload.seasonalityKey,
      outputIntervalHours: payload.outputIntervalHours ?? before?.outputIntervalHours ?? 1,
      healthFloor: payload.healthFloor,
      mortalityRateBps: payload.mortalityRateBps
    },
    create: {
      name: payload.name,
      purchasePriceTRY: payload.purchasePriceTRY,
      feedTypeId: payload.feedTypeId,
      feedPerTick: payload.feedPerTick,
      productionUnit: payload.productionUnit,
      baseHourlyOutput: payload.baseHourlyOutput,
      maturityDays: payload.maturityDays,
      baseSellPriceTRY: payload.baseSellPriceTRY,
      agingCurve: payload.agingCurve ?? { base: 1 },
      lifespanDays: payload.lifespanDays,
      seasonalityKey: payload.seasonalityKey,
      outputIntervalHours: payload.outputIntervalHours ?? 1,
      healthFloor: payload.healthFloor,
      mortalityRateBps: payload.mortalityRateBps
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: payload.id ? 'UPDATE_ANIMAL_TYPE' : 'CREATE_ANIMAL_TYPE',
      entity: 'AnimalType',
      before,
      after: type
    }
  });

  revalidatePath('/(dashboard)/admin');
  return type;
}

const deleteEntitySchema = z.object({ id: z.string().cuid() });

export async function deleteAnimalTypeAction(input: z.infer<typeof deleteEntitySchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { id } = deleteEntitySchema.parse(input);
  const before = await prisma.animalType.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Hayvan tipi bulunamadı');
  }

  await prisma.animalType.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_ANIMAL_TYPE',
      entity: 'AnimalType',
      before,
      after: null
    }
  });
  revalidatePath('/(dashboard)/admin');
}

const cropTypeSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(2),
  plantingCostTRY: z.number().nonnegative(),
  cycleDays: z.number().int().positive(),
  yieldPerCycle: z.number().nonnegative(),
  outputUnit: z.string().min(1),
  baseSellPriceTRY: z.number().nonnegative(),
  seasonalityKey: z.string().optional(),
  electricityCostTRY: z.number().nonnegative(),
  droughtResilient: z.boolean().optional()
});

export async function upsertCropTypeAction(input: z.infer<typeof cropTypeSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = cropTypeSchema.parse(input);

  const before = payload.id ? await prisma.cropType.findUnique({ where: { id: payload.id } }) : null;

  const type = await prisma.cropType.upsert({
    where: { id: payload.id ?? 'new' },
    update: {
      name: payload.name,
      plantingCostTRY: payload.plantingCostTRY,
      cycleDays: payload.cycleDays,
      yieldPerCycle: payload.yieldPerCycle,
      outputUnit: payload.outputUnit,
      baseSellPriceTRY: payload.baseSellPriceTRY,
      seasonalityKey: payload.seasonalityKey,
      electricityCostTRY: payload.electricityCostTRY,
      droughtResilient: payload.droughtResilient ?? before?.droughtResilient ?? false
    },
    create: {
      name: payload.name,
      plantingCostTRY: payload.plantingCostTRY,
      cycleDays: payload.cycleDays,
      yieldPerCycle: payload.yieldPerCycle,
      outputUnit: payload.outputUnit,
      baseSellPriceTRY: payload.baseSellPriceTRY,
      seasonalityKey: payload.seasonalityKey,
      electricityCostTRY: payload.electricityCostTRY,
      droughtResilient: payload.droughtResilient ?? false
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: payload.id ? 'UPDATE_CROP_TYPE' : 'CREATE_CROP_TYPE',
      entity: 'CropType',
      before,
      after: type
    }
  });

  revalidatePath('/(dashboard)/admin');
  return type;
}

export async function deleteCropTypeAction(input: z.infer<typeof deleteEntitySchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { id } = deleteEntitySchema.parse(input);
  const before = await prisma.cropType.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Ürün tipi bulunamadı');
  }

  await prisma.cropType.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_CROP_TYPE',
      entity: 'CropType',
      before,
      after: null
    }
  });
  revalidatePath('/(dashboard)/admin');
}

const feedTypeSchema = z.object({
  id: z.string().cuid().optional(),
  sku: z.string().min(2),
  name: z.string().min(2),
  unit: z.string().min(1),
  unitCostTRY: z.number().nonnegative()
});

export async function upsertFeedTypeAction(input: z.infer<typeof feedTypeSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = feedTypeSchema.parse(input);
  const { id, ...data } = payload;

  const before = id ? await prisma.feedType.findUnique({ where: { id } }) : null;

  const type = await prisma.feedType.upsert({
    where: { id: id ?? 'new' },
    update: data,
    create: data
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: payload.id ? 'UPDATE_FEED_TYPE' : 'CREATE_FEED_TYPE',
      entity: 'FeedType',
      before,
      after: type
    }
  });

  revalidatePath('/(dashboard)/admin');
  return type;
}

export async function deleteFeedTypeAction(input: z.infer<typeof deleteEntitySchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { id } = deleteEntitySchema.parse(input);
  const before = await prisma.feedType.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Yem tipi bulunamadı');
  }

  await prisma.feedType.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_FEED_TYPE',
      entity: 'FeedType',
      before,
      after: null
    }
  });
  revalidatePath('/(dashboard)/admin');
}

const supplyTypeSchema = z.object({
  id: z.string().cuid().optional(),
  sku: z.string().min(2),
  name: z.string().min(2),
  unit: z.string().min(1),
  unitCostTRY: z.number().nonnegative(),
  feedTypeId: z.string().cuid().optional()
});

export async function upsertSupplyTypeAction(input: z.infer<typeof supplyTypeSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const payload = supplyTypeSchema.parse(input);
  const { id, ...rest } = payload;
  const data = { ...rest, feedTypeId: rest.feedTypeId ?? null };

  const before = id ? await prisma.supplyType.findUnique({ where: { id } }) : null;

  const type = await prisma.supplyType.upsert({
    where: { id: id ?? 'new' },
    update: data,
    create: data
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: payload.id ? 'UPDATE_SUPPLY_TYPE' : 'CREATE_SUPPLY_TYPE',
      entity: 'SupplyType',
      before,
      after: type
    }
  });

  revalidatePath('/(dashboard)/admin');
  return type;
}

export async function deleteSupplyTypeAction(input: z.infer<typeof deleteEntitySchema>) {
  const actor = await requireAdmin({ abilities: ['manage:pricing'] });
  const { id } = deleteEntitySchema.parse(input);
  const before = await prisma.supplyType.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Tedarik tipi bulunamadı');
  }

  await prisma.supplyType.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_SUPPLY_TYPE',
      entity: 'SupplyType',
      before,
      after: null
    }
  });
  revalidatePath('/(dashboard)/admin');
}

const freezeSchema = z.object({
  userId: z.string().cuid(),
  frozen: z.boolean()
});

export async function setUserFrozenAction(input: z.infer<typeof freezeSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:users'] });
  const { userId, frozen } = freezeSchema.parse(input);

  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) {
    throw new Error('Kullanıcı bulunamadı');
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { isFrozen: frozen } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: frozen ? 'USER_FROZEN' : 'USER_UNFROZEN',
      entity: 'User',
      before,
      after: user
    }
  });

  revalidatePath('/(dashboard)/admin');
  return user;
}

const totpSchema = z.object({ userId: z.string().cuid() });

export async function resetTotpAction(input: z.infer<typeof totpSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:users'] });
  const { userId } = totpSchema.parse(input);

  const before = await prisma.profile.findUnique({ where: { userId } });
  if (!before) {
    throw new Error('Profil bulunamadı');
  }

  const profile = await prisma.profile.update({ where: { userId }, data: { totpSecret: null } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'RESET_TOTP',
      entity: 'Profile',
      before,
      after: profile
    }
  });

  revalidatePath('/(dashboard)/admin');
  return profile;
}

const fraudFlagSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(3)
});

export async function addFraudFlagAction(input: z.infer<typeof fraudFlagSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:listings'] });
  const payload = fraudFlagSchema.parse(input);

  const flag = await prisma.fraudFlag.create({
    data: {
      userId: payload.userId,
      reason: payload.reason,
      createdById: actor.id
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'CREATE_FRAUD_FLAG',
      entity: 'FraudFlag',
      before: null,
      after: flag
    }
  });

  revalidatePath('/(dashboard)/admin');
  return flag;
}

const removeFraudFlagSchema = z.object({ id: z.string().cuid() });

export async function removeFraudFlagAction(input: z.infer<typeof removeFraudFlagSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:listings'] });
  const { id } = removeFraudFlagSchema.parse(input);
  const before = await prisma.fraudFlag.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Kayıt bulunamadı');
  }

  await prisma.fraudFlag.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_FRAUD_FLAG',
      entity: 'FraudFlag',
      before,
      after: null
    }
  });

  revalidatePath('/(dashboard)/admin');
}

const blacklistSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.nativeEnum(BlacklistType),
  value: z.string().min(3),
  reason: z.string().optional()
});

export async function upsertBlacklistEntryAction(input: z.infer<typeof blacklistSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:listings'] });
  const payload = blacklistSchema.parse(input);

  const before = payload.id ? await prisma.blacklistEntry.findUnique({ where: { id: payload.id } }) : null;

  const entry = await prisma.blacklistEntry.upsert({
    where: { id: payload.id ?? 'new' },
    update: {
      type: payload.type,
      value: payload.value,
      reason: payload.reason,
      createdById: actor.id
    },
    create: {
      type: payload.type,
      value: payload.value,
      reason: payload.reason,
      createdById: actor.id
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: payload.id ? 'UPDATE_BLACKLIST_ENTRY' : 'CREATE_BLACKLIST_ENTRY',
      entity: 'BlacklistEntry',
      before,
      after: entry
    }
  });

  revalidatePath('/(dashboard)/admin');
  return entry;
}

export async function deleteBlacklistEntryAction(input: z.infer<typeof removeFraudFlagSchema>) {
  const actor = await requireAdmin({ abilities: ['manage:listings'] });
  const { id } = removeFraudFlagSchema.parse(input);
  const before = await prisma.blacklistEntry.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Kayıt bulunamadı');
  }

  await prisma.blacklistEntry.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'DELETE_BLACKLIST_ENTRY',
      entity: 'BlacklistEntry',
      before,
      after: null
    }
  });

  revalidatePath('/(dashboard)/admin');
}
