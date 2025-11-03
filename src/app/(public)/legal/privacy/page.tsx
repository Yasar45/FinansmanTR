export default function PrivacyPage() {
  return (
    <main className="container-responsive space-y-8 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">KVKK ve Gizlilik Bildirimi</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Çiftlik Pazar veri sorumlusu olarak kişisel verilerinizi 6698 sayılı KVKK ve GDPR kapsamında işler.
        </p>
      </header>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">1. İşlenen Veriler</h2>
          <p className="text-sm text-slate-600">
            Kayıt sürecinde kimlik ve iletişim bilgileri, KYC sırasında kimlik görselleri ve selfie, işlem esnasında
            finansal hareketler, destek iletişimi ve audit kayıtları tutulur.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">2. İşleme Amaçları</h2>
          <p className="text-sm text-slate-600">
            Kullanıcı doğrulama, finansal işlemlerin yürütülmesi, yasal yükümlülüklerin yerine getirilmesi, dolandırıcılık
            tespiti ve ürün geliştirme amaçlarıyla veri işlenir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">3. Saklama ve Aktarım</h2>
          <p className="text-sm text-slate-600">
            Veriler Türkiye ve AB uyumlu sunucularda saklanır. Ödeme sağlayıcıları ve kimlik doğrulama hizmetleriyle
            paylaşım yapılabilir. Üçüncü ülkelerle aktarımda ek sözleşme ve güvenlik tedbirleri uygulanır.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">4. Haklarınız</h2>
          <p className="text-sm text-slate-600">
            KVKK madde 11 kapsamındaki erişim, düzeltme, silme, itiraz haklarınızı support@ciftlikpazar.tr adresine
            iletebilirsiniz. Talebiniz 30 gün içinde sonuçlandırılır.
          </p>
        </article>
      </section>
    </main>
  );
}
