import { loadEconomySettings } from '@/lib/economy';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { EconomySettingsForm } from './_components/economy-settings-form';
import { KycReviewQueue } from './_components/kyc-review-queue';
import { WithdrawalQueue } from './_components/withdrawal-queue';
import { PaymentProviderCard } from './_components/payment-provider-card';

export default async function AdminPage() {
  const [settings, pendingProfiles, pendingWithdrawals, recentIntents] = await Promise.all([
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
    })
  ]);

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

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Yönetim Paneli</h1>
        <p className="text-sm text-slate-600">
          Ekonomi ayarları, ödeme sağlayıcıları ve uyum süreçleri için merkezi panel.
        </p>
      </header>
      <EconomySettingsForm initialSettings={settings} />
      <PaymentProviderCard
        provider={env.PAYMENT_PROVIDER}
        maxDepositsPerHour={env.PAYMENT_MAX_DEPOSITS_PER_HOUR}
        maxDepositAmount={env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR}
        recentIntents={paymentIntents}
      />
      <section className="grid gap-6 lg:grid-cols-2">
        <KycReviewQueue profiles={kycQueue} />
        <WithdrawalQueue withdrawals={withdrawalQueue} />
      </section>
    </div>
  );
}
