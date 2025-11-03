import { Card } from '@/components/ui/card';
import { formatTRY } from '@/lib/money';

const metrics = [
  { title: 'Cüzdan Bakiyesi', value: formatTRY('12500.50') },
  { title: 'Bekleyen Hasatlar', value: '3 parti' },
  { title: 'Son 24s Pazar İşlemleri', value: formatTRY('3460.00') }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <h3 className="text-sm font-medium text-slate-500">{metric.title}</h3>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
          </Card>
        ))}
      </section>
      <Card className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Hızlı Aksiyonlar</h2>
          <p className="text-sm text-slate-600">
            Hayvan besleme, tohum ekme veya ürün satışı için hızlı bağlantıları kullanın.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <li key={action.label} className="rounded-xl border border-dashed border-emerald-200 p-4">
              <p className="text-sm font-medium text-slate-700">{action.label}</p>
              <p className="text-xs text-slate-500">{action.description}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const quickActions = [
  {
    label: 'Yem satın al',
    description: 'Tüm hayvan tipleri için yem stoklarınızı dengede tutun.'
  },
  {
    label: 'Yeni hayvan ekle',
    description: 'Kümes, ağıl ve ahır kapasitenizi planlayın.'
  },
  {
    label: 'Seraya tohum ek',
    description: 'Domates, biber veya marul gibi ürünleri planlayın.'
  },
  {
    label: 'Borsada sat',
    description: 'Sistem fiyatları ile hızlı satış gerçekleştirin.'
  },
  {
    label: 'Pazara ilan ver',
    description: 'P2P pazarında özel fiyatlarla satış yapın.'
  },
  {
    label: 'Cüzdan işlem geçmişi',
    description: 'Tüm hareketlerinizi TRY bazında inceleyin.'
  }
];
