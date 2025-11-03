import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="container-responsive space-y-16 py-16">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">
            Çiftlik Pazar · FarmHub TR
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Türkiye&apos;nin dijital çiftlik ekonomisine hoş geldiniz.
          </h1>
          <p className="text-lg text-slate-600">
            Hayvanlarınızı büyütün, seralarda üretim yapın, ürünlerinizi sistem borsasına veya P2P
            pazara satın. TRY cüzdanı, KYC uyumluluğu ve modern arayüz ile güvenle yönetin.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/auth/sign-in">Başla</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/help">Nasıl çalışır?</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-8 shadow-xl">
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Varlık kategorileri</dt>
              <dd className="text-3xl font-semibold">20+</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Saatlik üretim turları</dt>
              <dd className="text-3xl font-semibold">BullMQ ile</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">TRY cüzdanı</dt>
              <dd className="text-3xl font-semibold">Çift yönlü kayıt</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Pazar yeri</dt>
              <dd className="text-3xl font-semibold">P2P teklif/ilan</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="grid gap-8 lg:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm text-slate-600">{item.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

const highlights = [
  {
    title: 'Gerçekçi üretim döngüsü',
    description:
      'Hayvan ve bitki üretimini saatlik, günlük ve aylık turlarla modelleyin. Besleme eksikliği ve mevsimsellik etkilerini yönetin.'
  },
  {
    title: 'TRY cüzdanı ve KYC',
    description:
      'Fon ekleme, çekme, işlem kayıtları ve uyum logları. KYC durumuna göre otomatik kısıtlamalar.'
  },
  {
    title: 'Yönetici ekonomisi',
    description:
      'Fiyatlar, spreadler, ücretler ve risk kontrolleri için kapsamlı yönetici paneli.'
  }
];
