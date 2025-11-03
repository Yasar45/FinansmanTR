export default function TermsPage() {
  return (
    <main className="container-responsive space-y-8 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">Kullanım Koşulları</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Çiftlik Pazar&apos;a erişerek bu koşulları kabul etmiş sayılırsınız. Platform sanal ekonomi
          simülasyonu olup gerçek yatırım tavsiyesi sunmaz.
        </p>
      </header>
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">1. Hizmet Kapsamı</h2>
          <p className="text-sm text-slate-600">
            Platform; hayvancılık, sera ve pazaryeri işlemlerini sanal ortamda deneyimlemenizi sağlar. Kullanıcılar
            TRY cüzdan bakiyelerini kullanarak varlık alım-satımı yapabilir, üretim çıktıları toplayabilir ve
            sistemi test edebilir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">2. Kullanıcı Yükümlülükleri</h2>
          <p className="text-sm text-slate-600">
            Hesabınızı oluştururken doğru bilgiler sağlamak, şifrenizi korumak ve mevzuata aykırı davranışlardan kaçınmak
            yükümlülüğünüzdedir. Şüpheli faaliyetler tespit edildiğinde hesabınız askıya alınabilir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">3. Ücretler ve Vergiler</h2>
          <p className="text-sm text-slate-600">
            Para yatırma/çekme, pazar yeri işlemleri ve sistem alış-satışlarında bildirilen oranlarda ücret ve vergiler
            uygulanabilir. Ücretler yönetim paneli üzerinden güncellenebilir ve kullanıcıya bildirilir.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">4. Fikri Mülkiyet</h2>
          <p className="text-sm text-slate-600">
            Tasarım, marka, içerik ve yazılımlar Çiftlik Pazar&apos;a aittir. İzinsiz kopyalanamaz, çoğaltılamaz.
          </p>
        </article>
        <article className="space-y-3">
          <h2 className="text-xl font-semibold">5. Fesih</h2>
          <p className="text-sm text-slate-600">
            Şartların ihlali halinde hesabınız bildirimsiz askıya alınabilir. Kalan bakiyenin iadesi mevzuat ve uyum
            kontrollerine tabidir.
          </p>
        </article>
      </section>
    </main>
  );
}
