import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const plots = [
  {
    type: 'Sera',
    size: '1 Dönüm Domates',
    rent: '₺2.500/ay',
    buy: '₺85.000',
    cycle: 'Hasat 45 gün'
  },
  {
    type: 'Hidroponik',
    size: 'Dikey Marul Sistemi',
    rent: '₺3.100/ay',
    buy: '₺110.000',
    cycle: 'Hasat 28 gün'
  }
];

export default function FarmingPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Sera ve Hidroponik Yönetimi</h1>
        <p className="text-sm text-slate-600">
          Kiralayabileceğiniz veya satın alabileceğiniz üretim alanlarını görüntüleyin, ekim
          takviminizi planlayın.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {plots.map((plot) => (
          <Card key={plot.size} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{plot.size}</h2>
              <p className="text-sm text-slate-500">Tür: {plot.type}</p>
            </div>
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-medium text-slate-700">Kira</dt>
                <dd>{plot.rent}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Satın alma</dt>
                <dd>{plot.buy}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Üretim Döngüsü</dt>
                <dd>{plot.cycle}</dd>
              </div>
            </dl>
            <Button variant="outline">Plan oluştur</Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
