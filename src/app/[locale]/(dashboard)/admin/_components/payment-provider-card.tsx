import { Card } from '@/components/ui/card';

interface PaymentIntentSummary {
  id: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
}

interface Props {
  provider: string;
  maxDepositsPerHour: number;
  maxDepositAmount: number;
  recentIntents: PaymentIntentSummary[];
}

export function PaymentProviderCard({
  provider,
  maxDepositsPerHour,
  maxDepositAmount,
  recentIntents
}: Props) {
  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ödeme Sağlayıcı Yapılandırması</h2>
        <p className="text-sm text-slate-600">
          Aktif sağlayıcı: <span className="font-medium text-slate-900">{provider}</span>. Saatlik limit{' '}
          {maxDepositsPerHour} işlem, toplam{' '}
          {maxDepositAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Son Hareketler</p>
        <div className="space-y-2">
          {recentIntents.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz ödeme oturumu oluşturulmadı.</p>
          ) : (
            recentIntents.map((intent) => (
              <div
                key={intent.id}
                className="flex flex-col rounded-lg border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {intent.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                  <p className="text-xs text-slate-500">Ref: {intent.reference}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{intent.status}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(intent.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
