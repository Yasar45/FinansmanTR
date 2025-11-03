export default function RiskPage() {
  return (
    <main className="container-responsive space-y-8 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">Risk Bildirimi</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Çiftlik Pazar sanal bir ekonomi simülasyonudur. Üretim değerleri, fiyatlar ve verimlilikler değişkenlik
          gösterebilir.
        </p>
      </header>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">1. Piyasa Riski</h2>
          <p className="text-sm text-slate-600">
            Ürün ve çıktılar sistem içi kurallar veya yönetici aksiyonlarına göre değer kaybedebilir. Simülasyon sonuçları
            gerçek dünyadaki tarımsal getiriler için referans teşkil etmez.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">2. Operasyonel Riskler</h2>
          <p className="text-sm text-slate-600">
            Hastalık, kuraklık, enerji maliyeti gibi olaylar üretimi azaltabilir. Feed yetersizliği üretimi durdurabilir ve
            sistem kurgusunda hayvan kaybı meydana gelebilir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">3. Teknik Riskler</h2>
          <p className="text-sm text-slate-600">
            Platform çevrimiçi hizmet verdiğinden kesinti, veri kaybı veya planlı bakım durumları yaşanabilir. Kritik
            işlemlerde yedekleme mekanizmaları uygulanmaktadır ancak %100 süreklilik taahhüt edilmez.
          </p>
        </article>
      </section>
    </main>
  );
}
