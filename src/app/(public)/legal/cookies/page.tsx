export default function CookiesPage() {
  return (
    <main className="container-responsive space-y-8 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">Çerez Politikası</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Çiftlik Pazar deneyimi iyileştirmek, güvenliği sağlamak ve analitik ölçümler için çerezler kullanır.
        </p>
      </header>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">1. Zorunlu Çerezler</h2>
          <p className="text-sm text-slate-600">
            Oturum açma, kimlik doğrulama, CSRF koruması ve güvenlik için gerekli çerezlerdir. Devre dışı bırakılamazlar.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">2. Analitik Çerezler</h2>
          <p className="text-sm text-slate-600">
            Site trafiği ve özellik kullanımını ölçmek için anonim analitik çerezler kullanabiliriz. Tarayıcı ayarlarınızdan
            bu çerezleri kontrol edebilirsiniz.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">3. Üçüncü Taraf Çerezleri</h2>
          <p className="text-sm text-slate-600">
            Ödeme sağlayıcıları veya kimlik doğrulama hizmetleri, entegrasyonları kapsamında ek çerezler yerleştirebilir.
            Bu tarafların politikalarını incelemeniz önerilir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">4. Çerez Yönetimi</h2>
          <p className="text-sm text-slate-600">
            Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Çerezleri devre dışı bırakmak platform
            işlevlerini kısıtlayabilir.
          </p>
        </article>
      </section>
    </main>
  );
}
