import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const outputs = [
  { name: 'Yumurta', qty: 320, unit: 'adet', avgCost: '₺2,10', sellable: true },
  { name: 'Süt', qty: 145, unit: 'litre', avgCost: '₺9,50', sellable: true },
  { name: 'Bal', qty: 52, unit: 'kg', avgCost: '₺65,00', sellable: true }
];

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Envanter</h1>
        <p className="text-sm text-slate-600">
          Ürettiğiniz tarımsal ve hayvansal ürünleri görüntüleyin, sistem borsasına veya pazar
          yerine yönlendirin.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {outputs.map((output) => (
          <Card key={output.name} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{output.name}</h2>
              <p className="text-sm text-slate-500">
                {output.qty} {output.unit} · Ortalama maliyet {output.avgCost}
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">Borsada sat</Button>
              <Button className="flex-1" variant="outline">
                Pazar ilanı
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
