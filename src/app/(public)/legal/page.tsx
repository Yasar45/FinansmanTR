export default function LegalPage() {
  return (
    <main className="container-responsive space-y-16 py-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold">Hukuki Bilgilendirme</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Çiftlik Pazar, KVKK ve GDPR standartlarına uygun şekilde verilerinizi işler. Aşağıda
          kullanım koşulları, risk uyarıları ve gizlilik politikasını bulabilirsiniz.
        </p>
        <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <section>
            <h2 className="text-2xl font-semibold">Kullanım Koşulları</h2>
            <p className="mt-2 text-sm text-slate-600">
              Platformu kullanarak sanal varlıklar üzerinde işlem yaptığınızı ve sistemin yatırım
              tavsiyesi olmadığını kabul edersiniz.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">KVKK &amp; GDPR</h2>
            <p className="mt-2 text-sm text-slate-600">
              Kişisel verileriniz, KYC süreçleri ve finansal uyum gereklilikleri kapsamında işlenir.
              Talep etmeniz halinde verileriniz silinir veya taşınır.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Risk Uyarısı</h2>
            <p className="mt-2 text-sm text-slate-600">
              Çiftlik ekonomileri oynak olabilir. Üretim verimi, yem maliyetleri ve piyasa fiyatları
              değişkenlik gösterir. Sanal ortamda dahi olsa kayıplar mümkün olabilir.
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
