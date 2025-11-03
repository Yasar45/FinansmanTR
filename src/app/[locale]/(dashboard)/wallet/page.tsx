import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { DepositForm } from './_components/deposit-form';
import { WithdrawForm } from './_components/withdraw-form';

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const [wallet, profile] = await Promise.all([
    prisma.wallet.findFirst({
      where: { userId: session.user.id },
      include: {
        ledger: { orderBy: { createdAt: 'desc' }, take: 10 },
        paymentIntents: { orderBy: { createdAt: 'desc' }, take: 5 },
        withdrawalRequests: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    }),
    prisma.profile.findUnique({ where: { userId: session.user.id } })
  ]);

  const balance = wallet ? Number(wallet.balance) : 0;
  const ledger = wallet?.ledger ?? [];
  const paymentIntents = wallet?.paymentIntents ?? [];
  const withdrawals = wallet?.withdrawalRequests ?? [];
  const kycStatus = profile?.kycStatus ?? 'UNVERIFIED';

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">TRY Cüzdanı</h1>
        <p className="text-sm text-slate-600">
          Bakiye ekleyin, çekim talep edin, işlem geçmişi ve uyum durumunuzu görüntüleyin.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Cüzdan Özeti</h2>
            <p className="text-3xl font-bold text-slate-900">
              {balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <p className="text-xs text-slate-500">KYC durumu: {kycStatus}</p>
          </div>
          <p className="text-xs text-slate-500">
            Para yatırma sağlayıcısı: {env.PAYMENT_PROVIDER}. Saatlik maksimum işlem: {env.PAYMENT_MAX_DEPOSITS_PER_HOUR}.
          </p>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Para Yatır</h2>
            <p className="text-xs text-slate-500">TRY cüzdanınıza fon ekleyin.</p>
          </div>
          <DepositForm
            providers={['MOCK', 'IYZICO', 'PAYTR']}
            defaultProvider={env.PAYMENT_PROVIDER}
            hourlyLimit={env.PAYMENT_MAX_DEPOSITS_PER_HOUR}
            amountLimit={env.PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR}
          />
        </Card>
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Para Çek</h2>
            <p className="text-xs text-slate-500">Onay için IBAN talebi oluşturun.</p>
          </div>
          <WithdrawForm kycStatus={kycStatus} />
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">İşlem Geçmişi</h2>
            <p className="text-xs text-slate-500">Son 10 muhasebe hareketi.</p>
          </div>
          <div className="space-y-3">
            {ledger.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz işlem bulunmuyor.</p>
            ) : (
              ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{entry.type}</p>
                    <p className="text-xs text-slate-500">
                      {entry.createdAt.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-700">
                      {Number(entry.amount).toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Bakiye:{' '}
                      {Number(entry.balance).toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Bekleyen Hareketler</h2>
            <p className="text-xs text-slate-500">Ödeme oturumları ve çekim talepleri.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ödeme Oturumları</p>
              {paymentIntents.length === 0 ? (
                <p className="text-sm text-slate-500">Kayıt yok.</p>
              ) : (
                paymentIntents.map((intent) => (
                  <div key={intent.id} className="rounded-lg border border-slate-200 p-3 text-xs">
                    <p className="font-medium text-slate-700">{intent.status}</p>
                    <p className="text-slate-500">
                      {Number(intent.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} · Ref:
                      {' '}
                      {intent.reference}
                    </p>
                    <p className="text-slate-400">{intent.createdAt.toLocaleString('tr-TR')}</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Çekim Talepleri</p>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-slate-500">Aktif çekim talebiniz yok.</p>
              ) : (
                withdrawals.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-3 text-xs">
                    <p className="font-medium text-slate-700">{request.status}</p>
                    <p className="text-slate-500">
                      {Number(request.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} · IBAN:
                      {' '}
                      {request.iban}
                    </p>
                    <p className="text-slate-400">{request.createdAt.toLocaleString('tr-TR')}</p>
                    {request.reason ? <p className="text-slate-400">Not: {request.reason}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
