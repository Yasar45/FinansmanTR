import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const listings = [
  {
    asset: 'Yumurta Partisi',
    qty: '200 adet',
    price: '₺4.200',
    expires: '3 saat'
  },
  {
    asset: '1 Dönüm Biber Hasadı',
    qty: '350 kg',
    price: '₺9.800',
    expires: '12 saat'
  }
];

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">P2P Pazar Yeri</h1>
        <p className="text-sm text-slate-600">
          Ürünlerinizi alıcılarla buluşturun, sipariş defteri ve ücretler üzerinde tam kontrol
          sağlayın.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {listings.map((listing) => (
          <Card key={listing.asset} className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{listing.asset}</h2>
              <p className="text-sm text-slate-500">
                Miktar {listing.qty} · Fiyat {listing.price}
              </p>
            </div>
            <p className="text-xs text-slate-500">Süre: {listing.expires}</p>
            <div className="flex gap-3">
              <Button className="flex-1">Satın al</Button>
              <Button className="flex-1" variant="outline">
                Karşı teklif ver
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
