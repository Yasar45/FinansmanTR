import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const systemPrices = [
  { symbol: 'EGG_TRY', buy: '₺13,20', sell: '₺12,90', spread: '30 bps' },
  { symbol: 'MILK_TRY', buy: '₺15,50', sell: '₺15,10', spread: '40 bps' },
  { symbol: 'TOMATO_TRY', buy: '₺22,60', sell: '₺21,90', spread: '70 bps' }
];

export default function ExchangePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Sistem Borsası</h1>
        <p className="text-sm text-slate-600">
          Admin tarafından yönetilen sabit spreadli fiyatlardan hızlı alım/satım yapın.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        {systemPrices.map((price) => (
          <Card key={price.symbol} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{price.symbol}</h2>
              <p className="text-sm text-slate-500">Spread: {price.spread}</p>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <p>Alış: {price.buy}</p>
              <p>Satış: {price.sell}</p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">Sat</Button>
              <Button className="flex-1" variant="outline">
                Satın al
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
