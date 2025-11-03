import { Card } from '@/components/ui/card';

interface OutputSummary {
  kind: string;
  qty: number;
}

interface Props {
  activeUsers: number;
  tvl: number;
  dailyOutputs: OutputSummary[];
  marketplaceVolume: number;
  burnTotal: number;
}

export function OverviewKpis({ activeUsers, tvl, dailyOutputs, marketplaceVolume, burnTotal }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Aktif Kullanıcı"
        value={activeUsers.toLocaleString('tr-TR')}
        hint="Son 24 saat içinde oturum açan"
      />
      <KpiCard
        title="TVL"
        value={tvl.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        hint="Toplam cüzdan bakiyesi"
      />
      <KpiCard
        title="Pazar Hacmi (7g)"
        value={marketplaceVolume.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        hint="Marketplace gerçekleşen işlemler"
      />
      <KpiCard
        title="Yakım / Sink (7g)"
        value={burnTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        hint="Ücret ve bakım tahsilatları"
      />
      <Card className="col-span-full space-y-4 p-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Günlük Üretimler</h3>
          <p className="text-xs text-slate-500">
            Son 24 saat içinde kayıtlı çıktılar. Ekonomi raporlarıyla eşleşmelidir.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dailyOutputs.length === 0 ? (
            <p className="text-sm text-slate-500">Kayıtlı üretim bulunamadı.</p>
          ) : (
            dailyOutputs.map((output) => (
              <div key={output.kind} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{output.kind}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {output.qty.toLocaleString('tr-TR')}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  hint?: string;
}

function KpiCard({ title, value, hint }: KpiCardProps) {
  return (
    <Card className="space-y-3 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
