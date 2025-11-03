import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ledger = [
  {
    id: 'tx-001',
    type: 'DEPOSIT',
    amount: '+₺5.000,00',
    status: 'Tamamlandı',
    at: '2024-02-01 09:32'
  },
  {
    id: 'tx-002',
    type: 'BUY_ASSET',
    amount: '-₺1.250,00',
    status: 'Tamamlandı',
    at: '2024-02-02 14:20'
  }
];

export default function WalletPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">TRY Cüzdanı</h1>
        <p className="text-sm text-slate-600">
          Bakiye ekleyin, çekim talep edin, işlem geçmişi ve uyum durumunuzu görüntüleyin.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Bakiye</h2>
            <p className="text-2xl font-bold text-slate-900">₺12.500,00</p>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1">Bakiye ekle</Button>
            <Button className="flex-1" variant="outline">
              Çekim iste
            </Button>
          </div>
        </Card>
        <Card className="space-y-2 md:col-span-2">
          <h2 className="text-lg font-semibold">İşlem Geçmişi</h2>
          <div className="divide-y divide-slate-200">
            {ledger.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{item.type}</p>
                  <p className="text-xs text-slate-500">{item.at}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-700">{item.amount}</p>
                  <p className="text-xs text-slate-500">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
