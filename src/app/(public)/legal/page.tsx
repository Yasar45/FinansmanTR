import Link from 'next/link';

const documents = [
  {
    title: 'Kullanım Koşulları',
    href: '/legal/terms',
    summary:
      'Platform hizmet kapsamı, kullanıcı yükümlülükleri ve fesih koşulları hakkında detayları inceleyin.'
  },
  {
    title: 'KVKK & Gizlilik',
    href: '/legal/privacy',
    summary:
      'Kişisel verilerinizin hangi amaçlarla işlendiğini, saklama sürelerini ve haklarınızı öğrenin.'
  },
  {
    title: 'Risk Bildirimi',
    href: '/legal/risk',
    summary:
      'Sanal ekonomi deneyimindeki piyasa, operasyonel ve teknik riskleri gözden geçirin.'
  },
  {
    title: 'Çerez Politikası',
    href: '/legal/cookies',
    summary: 'Platform performansı ve güvenliği için kullanılan çerez türleri hakkında bilgi alın.'
  }
];

export default function LegalPage() {
  return (
    <main className="container-responsive space-y-12 py-16">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">Hukuki Bilgilendirme</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Çiftlik Pazar, kullanıcı verilerini KVKK ve uluslararası düzenlemelere uygun şekilde işler. Aşağıdaki
          dokümanlar kayıt, KYC ve işlem süreçlerindeki yükümlülüklerimizi açıklar.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        {documents.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 group-hover:text-brand">{doc.title}</h2>
              <p className="text-sm text-slate-600">{doc.summary}</p>
            </div>
            <span className="mt-4 text-sm font-medium text-brand">Detayları görüntüle →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
