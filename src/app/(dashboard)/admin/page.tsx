import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadEconomySettings } from '@/lib/economy';
import { EconomySettingsForm } from './_components/economy-settings-form';

const quickLinks = [
  {
    title: 'KYC ve Uyum',
    description: 'Bekleyen kullanıcı doğrulamalarını onaylayın, logları inceleyin ve denetim kayıtlarını yönetin.'
  },
  {
    title: 'Varlık Kataloğu',
    description: 'Hayvan, ürün ve besleme tiplerini güncelleyin; üretim parametrelerini versiyonlayın.'
  },
  {
    title: 'Pazaryeri Gözetimi',
    description: 'Relist sürelerini takip edin, manipülasyon risklerini denetleyin, ihlallere müdahale edin.'
  },
  {
    title: 'Olay ve Risk Yönetimi',
    description: 'Hastalık veya kuraklık gibi makro olayları tetikleyin ya da sonlandırın.'
  }
];

export default async function AdminPage() {
  const settings = await loadEconomySettings();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Yönetim Paneli</h1>
        <p className="text-sm text-slate-600">
          Ekonomi ayarları, varlık katalogu, kullanıcı yönetimi ve log görüntüleme için merkezi panel.
        </p>
      </header>
      <EconomySettingsForm initialSettings={settings} />
      <section className="grid gap-6 md:grid-cols-2">
        {quickLinks.map((item) => (
          <Card key={item.title} className="flex flex-col justify-between space-y-4 p-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
            <Button variant="outline">Aç</Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
