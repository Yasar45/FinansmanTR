import { redirect } from 'next/navigation';
import { loadEconomySettings } from '@/lib/economy';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth';
import { hasAbility } from '@/lib/rbac';
import { WalletTransactionType } from '@prisma/client';
import { hourlyQueue, dailyQueue, hourlyWorker, dailyWorker } from '@/lib/queues/tick-engine';
import { EconomySettingsForm } from './_components/economy-settings-form';
import { KycReviewQueue } from './_components/kyc-review-queue';
import { WithdrawalQueue } from './_components/withdrawal-queue';
import { PaymentProviderCard } from './_components/payment-provider-card';
import { AdminBreadcrumbs } from './_components/admin-breadcrumbs';
import { OverviewKpis } from './_components/overview-kpis';
import { SystemPriceEditor } from './_components/system-price-editor';
import { TickControls } from './_components/tick-controls';
import { CatalogManager } from './_components/catalog-manager';
import { UserAdminPanel } from './_components/user-admin-panel';
import { MarketplaceGuardrails } from './_components/marketplace-guardrails';
import { AuditLogPanel } from './_components/audit-log-panel';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'MOD'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    settings,
    pendingProfiles,
    pendingWithdrawals,
    recentIntents,
    systemPrices,
    animalTypes,
    cropTypes,
    feedTypes,
    supplyTypes,
    initialUsers,
    fraudFlags,
    blacklist,
    auditLogs,
    activeSessions,
    walletAggregate,
    productionLogs,
    trades,
    feeTransactions,
    hourlyCounts,
    dailyCounts,
    hourlyPaused,
    dailyPaused,
    hourlyRunning,
    dailyRunning
  ] = await Promise.all([
    loadEconomySettings(),
    prisma.profile.findMany({
      where: { kycStatus: 'PENDING' },
      orderBy: { kycSubmittedAt: 'asc' },
      include: { user: { select: { email: true } } }
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } }, wallet: { select: { currency: true } } }
    }),
    prisma.paymentIntent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.systemPrice.findMany({ orderBy: { symbol: 'asc' } }),
    prisma.animalType.findMany({ include: { feedType: true }, orderBy: { name: 'asc' } }),
    prisma.cropType.findMany({ orderBy: { name: 'asc' } }),
    prisma.feedType.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplyType.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { profile: true, wallets: true }
    }),
    prisma.fraudFlag.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.blacklistEntry.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { actor: { select: { email: true } } }
    }),
    prisma.session.findMany({ where: { expires: { gt: now } }, select: { userId: true }, distinct: ['userId'] }),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.productionLog.findMany({ where: { tickAt: { gte: dayAgo } } }),
    prisma.trade.findMany({ where: { createdAt: { gte: weekAgo } } }),
    prisma.walletTransaction.findMany({
      where: {
        type: { in: [WalletTransactionType.FEE, WalletTransactionType.MAINTENANCE] },
        createdAt: { gte: weekAgo }
      }
    }),
    hourlyQueue.getJobCounts(),
    dailyQueue.getJobCounts(),
    hourlyQueue.isPaused(),
    dailyQueue.isPaused(),
    hourlyWorker.isRunning(),
    dailyWorker.isRunning()
  ]);

  const dailyOutputMap = new Map<string, number>();
  for (const log of productionLogs) {
    const details = log.details as Record<string, any>;
    if (details?.scope !== 'HOURLY') continue;
    for (const output of details.outputs ?? []) {
      const key = String(output.kind ?? 'UNKNOWN');
      const value = Number(output.qty ?? 0);
      dailyOutputMap.set(key, (dailyOutputMap.get(key) ?? 0) + value);
    }
  }

  const dailyOutputs = Array.from(dailyOutputMap.entries()).map(([kind, qty]) => ({ kind, qty }));
  const marketplaceVolume = trades.reduce((acc, trade) => acc + Number(trade.priceTRY) * Number(trade.qty), 0);
  const burnTotal = feeTransactions.reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

  const feedOptions = feedTypes.map((feed) => ({ id: feed.id, name: feed.name }));
  const animalViews = animalTypes.map((animal) => ({
    id: animal.id,
    name: animal.name,
    feedTypeId: animal.feedTypeId,
    feedTypeName: animal.feedType?.name ?? 'Belirsiz',
    feedPerTick: Number(animal.feedPerTick),
    baseHourlyOutput: Number(animal.baseHourlyOutput),
    maturityDays: animal.maturityDays,
    lifespanDays: animal.lifespanDays ?? null,
    baseSellPriceTRY: Number(animal.baseSellPriceTRY),
    purchasePriceTRY: Number(animal.purchasePriceTRY),
    healthFloor: animal.healthFloor,
    mortalityRateBps: animal.mortalityRateBps,
    seasonalityKey: animal.seasonalityKey ?? null
  }));
  const cropViews = cropTypes.map((crop) => ({
    id: crop.id,
    name: crop.name,
    cycleDays: crop.cycleDays,
    yieldPerCycle: Number(crop.yieldPerCycle),
    plantingCostTRY: Number(crop.plantingCostTRY),
    outputUnit: crop.outputUnit,
    baseSellPriceTRY: Number(crop.baseSellPriceTRY),
    seasonalityKey: crop.seasonalityKey ?? null,
    electricityCostTRY: Number(crop.electricityCostTRY),
    droughtResilient: crop.droughtResilient
  }));
  const feedViews = feedTypes.map((feed) => ({
    id: feed.id,
    sku: feed.sku,
    name: feed.name,
    unit: feed.unit,
    unitCostTRY: Number(feed.unitCostTRY)
  }));
  const supplyViews = supplyTypes.map((supply) => ({
    id: supply.id,
    sku: supply.sku,
    name: supply.name,
    unit: supply.unit,
    unitCostTRY: Number(supply.unitCostTRY),
    feedTypeId: supply.feedTypeId
  }));
  const userSummaries = initialUsers.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    isFrozen: user.isFrozen,
    fullName: user.profile?.fullName ?? null,
    kycStatus: user.profile?.kycStatus ?? null,
    totpEnabled: Boolean(user.profile?.totpSecret),
    wallets: user.wallets.map((wallet) => ({
      id: wallet.id,
      balance: Number(wallet.balance),
      currency: wallet.currency
    }))
  }));
  const fraudFlagSummaries = fraudFlags.map((flag) => ({
    id: flag.id,
    userId: flag.userId,
    reason: flag.reason,
    createdAt: flag.createdAt.toISOString()
  }));
  const blacklistSummaries = blacklist.map((entry) => ({
    id: entry.id,
    type: entry.type,
    value: entry.value,
    reason: entry.reason ?? null,
    createdAt: entry.createdAt.toISOString()
  }));
  const auditLogSummaries = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    createdAt: log.createdAt.toISOString(),
    actorEmail: log.actor?.email ?? null
  }));

  const marketplaceFeeInfo = {
    makerFeeBps: settings.pricing.marketplace.makerFeeBps,
    takerFeeBps: settings.pricing.marketplace.takerFeeBps,
    floorPrices: settings.pricing.marketplace.floorPrices,
    ceilingPrices: settings.pricing.marketplace.ceilingPrices,
    dailyListingLimit: settings.pricing.marketplace.dailyListingLimit
  };

  const queueStates = [
    {
      name: 'hourly' as const,
      waiting: hourlyCounts.waiting ?? 0,
      active: hourlyCounts.active ?? 0,
      delayed: hourlyCounts.delayed ?? 0,
      paused: hourlyPaused,
      isRunning: hourlyRunning
    },
    {
      name: 'daily' as const,
      waiting: dailyCounts.waiting ?? 0,
      active: dailyCounts.active ?? 0,
      delayed: dailyCounts.delayed ?? 0,
      paused: dailyPaused,
      isRunning: dailyRunning
    }
  ];

  const kycQueue = pendingProfiles.map((profile) => ({
    id: profile.id,
    fullName: profile.fullName,
    nationalId: profile.nationalId,
    phoneNumber: profile.phoneNumber,
    kycSubmittedAt: profile.kycSubmittedAt?.toISOString() ?? null,
    selfieObjectKey: profile.selfieObjectKey,
    idFrontObjectKey: profile.idFrontObjectKey,
    idBackObjectKey: profile.idBackObjectKey,
    user: profile.user
  }));

  const withdrawalQueue = pendingWithdrawals.map((withdrawal) => ({
    id: withdrawal.id,
    amount: Number(withdrawal.amount),
    iban: withdrawal.iban,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
    reason: withdrawal.reason,
    user: withdrawal.user,
    wallet: withdrawal.wallet
  }));

  const paymentIntents = recentIntents.map((intent) => ({
    id: intent.id,
    amount: Number(intent.amount),
    status: intent.status,
    reference: intent.reference,
    createdAt: intent.createdAt.toISOString()
  }));

  const canManageUsers = hasAbility(session.user, 'manage:users') || session.user.role === 'ADMIN';

  const metrics = {
    activeUsers: activeSessions.length,
    tvl: Number(walletAggregate._sum.balance ?? 0),
    dailyOutputs,
    marketplaceVolume,
    burnTotal
  };

  return (
    <div className="space-y-10">
      <AdminBreadcrumbs />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Yönetim Paneli</h1>
        <p className="text-sm text-slate-600">
          Ekonomi, piyasa ve uyum kontrolleri için merkezi yönetim alanı.
        </p>
      </header>
      <OverviewKpis {...metrics} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Ekonomi</h2>
        <SystemPriceEditor
          prices={systemPrices.map((price) => ({
            symbol: price.symbol,
            midPriceTRY: Number(price.midPriceTRY),
            spreadBps: price.spreadBps,
            source: price.source
          }))}
        />
        <EconomySettingsForm initialSettings={settings} />
        <TickControls queues={queueStates} />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Kataloglar</h2>
        <CatalogManager
          animalTypes={animalViews}
          cropTypes={cropViews}
          feedTypes={feedViews}
          supplyTypes={supplyViews}
          feedOptions={feedOptions}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Kullanıcılar & KYC</h2>
        {canManageUsers ? <UserAdminPanel initialUsers={userSummaries} /> : null}
        <section className="grid gap-6 lg:grid-cols-2">
          <KycReviewQueue profiles={kycQueue} />
          <WithdrawalQueue withdrawals={withdrawalQueue} />
        </section>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Marketplace</h2>
        <PaymentProviderCard
          provider={env.PAYMENT_PROVIDER}
          maxDepositsPerHour={env.PAYMENT_MAX_DEPOSITS_PER_HOUR}
          maxDepositAmount={env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR}
          recentIntents={paymentIntents}
        />
        <MarketplaceGuardrails
          fraudFlags={fraudFlagSummaries}
          blacklist={blacklistSummaries}
          marketplaceFeeInfo={marketplaceFeeInfo}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Loglar & Sağlık</h2>
        <AuditLogPanel logs={auditLogSummaries} />
      </section>
    </div>
  );
}
