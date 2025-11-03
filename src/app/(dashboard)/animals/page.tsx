import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const animalTypes = [
  {
    name: 'Tavuk',
    purchasePrice: 750,
    feed: 'Karma yem',
    output: 'Yumurta (günlük 2 adet)'
  },
  {
    name: 'İnek',
    purchasePrice: 14500,
    feed: 'Saman + Konsantre',
    output: 'Süt (günlük 18 litre)'
  },
  {
    name: 'Arı Kovanı',
    purchasePrice: 9800,
    feed: 'Şurup + Bakım',
    output: 'Bal (aylık 12 kg)'
  }
];

export default function AnimalsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Hayvan Yönetimi</h1>
        <p className="text-sm text-slate-600">
          Sürü varlıklarınızı izleyin, besleme programları oluşturun ve üretim performansını takip
          edin.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {animalTypes.map((animal) => (
          <Card key={animal.name} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{animal.name}</h2>
              <p className="text-sm text-slate-500">Başlangıç maliyeti: {animal.purchasePrice}₺</p>
            </div>
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="font-medium text-slate-700">Yem</dt>
                <dd>{animal.feed}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Üretim</dt>
                <dd>{animal.output}</dd>
              </div>
            </dl>
            <Button variant="outline">Satın al</Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
