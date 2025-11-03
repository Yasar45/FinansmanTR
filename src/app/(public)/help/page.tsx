import Link from 'next/link';

const faqs = [
  {
    question: 'Çiftlik Pazar nasıl çalışır?',
    answer:
      'Gerçek hayvan ve sera ekonomisini simüle eder. Kullanıcılar varlık satın alır, üretim turlarında besleme yapar ve çıktıları TRY karşılığında satar.'
  },
  {
    question: 'TRY cüzdanı güvenli mi?',
    answer:
      'Çift yönlü kayıt, işlem günlükleri ve uyum kontrolleri uygulanır. KYC doğrulanmadan çekim yapılmaz.'
  },
  {
    question: 'Üretim turları nasıl işler?',
    answer:
      'BullMQ ile saatlik işler çalışır. Hayvanlar yem tüketir, ürün üretir. Seralar bakım maliyetlerine göre gelir sağlar.'
  }
];

export default function HelpPage() {
  return (
    <main className="container-responsive space-y-16 py-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Yardım Merkezi</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Çiftlik Pazar deneyiminizi en üst düzeye çıkarmak için sık sorulan soruları ve rehberleri
          inceleyin.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">SSS</h2>
          <dl className="mt-6 space-y-4">
            {faqs.map((item) => (
              <div key={item.question}>
                <dt className="text-lg font-medium text-slate-900">{item.question}</dt>
                <dd className="text-sm text-slate-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-sm text-slate-500">
          Daha fazla destek için{' '}
          <Link href="mailto:support@ciftlikpazar.tr" className="text-brand">
            support@ciftlikpazar.tr
          </Link>
          ile iletişime geçin.
        </p>
      </section>
    </main>
  );
}
