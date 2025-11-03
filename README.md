# Çiftlik Pazar · FarmHub TR

Çiftlik Pazar, Türkiye odaklı dijital çiftlik ekonomisi simülasyonudur. Kullanıcılar hayvan ve sera varlıklarını yönetir, üretim çıktıları için sistem borsası veya P2P pazarında işlem yapar ve gerçek para cüzdanlarıyla etkileşir.

## Özellikler

- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui arayüzü
- NextAuth ile e-posta & Google kimlik doğrulaması, RBAC ve yetenek tabanlı kontrol
- Prisma + PostgreSQL şeması (cüzdan, hayvan, sera, pazar, üretim günlükleri, KYC)
- BullMQ tabanlı üretim turu kuyruğu, manuel/planlı oracle fiyat güncellemeleri
- TRY cüzdanı, ödeme sağlayıcı adaptörleri (MOCK / Iyzico / PayTR) ve oran limitleri
- Admin paneli: ekonomi kuralları, sistem fiyatları, katalog yönetimi, KYC incelemesi
- Vitest, Playwright, ESLint, TypeScript typecheck ve GitHub Actions CI hattı

## Başlangıç

```bash
pnpm install
cp .env.example .env
# PostgreSQL ve Redis bağlantılarını .env dosyasında tanımlayın
pnpm prisma:migrate
pnpm db:seed
pnpm dev
```

Demo verilerini hızlıca ileri almak için:

```bash
pnpm demo:fastforward        # varsayılan 30 gün
pnpm demo:fastforward 7      # isteğe bağlı gün parametresi
```

Saatlik üretim turları için ayrı bir worker sürecinde `pnpm worker:start` komutunu çalıştırmanız yeterlidir.

## Ortam Değişkenleri

`.env` dosyasında aşağıdaki değerleri tanımlayın (bkz. `.env.example`):

- `DATABASE_URL`, `REDIS_URL`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `PAYMENT_PROVIDER` (`MOCK`, `IYZICO` veya `PAYTR`) ve ilgili sağlayıcı anahtarları
- S3 uyumlu depolama için `STORAGE_BUCKET_URL`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
- TRY cüzdan limiti ayarları: `PAYMENT_MAX_DEPOSITS_PER_MINUTE`, `PAYMENT_MAX_DEPOSITS_PER_HOUR`, `PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR`
- Opsiyonel: `LOGFLARE_API_KEY`, `LOGFLARE_SOURCE_TOKEN`, `LOG_LEVEL`

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `pnpm dev` | Next.js geliştirme sunucusu |
| `pnpm build` / `pnpm start` | Üretim build ve başlatma |
| `pnpm worker:start` | BullMQ worker/bootstrap (Fly/Render gibi ortamlarda) |
| `pnpm db:seed` | Prisma seed scripti |
| `pnpm demo:fastforward [gün]` | Üretim simülasyonunu hızlı ileri alma |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Kalite ve test komutları |
| `pnpm test:e2e` | Playwright uçtan uca senaryoları |

## Sağlık ve Gözlemlenebilirlik

- `/api/healthz`: servis canlılık kontrolü
- `/api/readyz`: PostgreSQL ve Redis bağlantı kontrolleri
- `/api/metrics`: kullanıcı sayısı, TVL ve kuyruk derinliği metrikleri
- Pino logları stdout + Logflare (konfigüre edildiğinde) üzerinden erişilebilir

## Üretim Kılavuzları

- [Dağıtım rehberi](docs/production/deployment.md)
- [Operasyon runbookları](docs/production/runbooks.md)
- [Mimari diyagramlar](docs/production/diagrams.md)

Bu belgeler Vercel, Fly/Render worker dağıtımı, Upstash Scheduler yapılandırması, yedekleme stratejileri ve olay müdahale adımlarını kapsar.

## Lisans

MIT

