# Çiftlik Pazar · FarmHub TR

Çiftlik Pazar, Türkiye odaklı dijital çiftlik ekonomisi simülasyonudur. Kullanıcılar hayvan ve sera
varlıklarını yönetir, üretim çıktıları için sistem borsası veya P2P pazarında işlem yapar.

## Özellikler
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- NextAuth ile e-posta & Google kimlik doğrulaması, RBAC ve yetenekler
- Prisma + PostgreSQL şeması: cüzdan, hayvan, sera, pazar, üretim günlükleri
- BullMQ tabanlı üretim turu kuyruğu ve işleyicisi
- TRY cüzdanı, ödeme sağlayıcı adaptörleri (iyzico/PayTR için mock)
- Admin API uç noktaları, ekonomi kuralları ve sistem fiyatları
- Vitest ve Playwright test yapılandırması

## Başlangıç

```bash
npm install
cp .env.example .env
# PostgreSQL ve Redis bağlantılarını .env dosyasında tanımlayın
npx prisma migrate dev
npm run seed
npm run dev
```

Saatlik üretim turları için Upstash/Redis gibi bir ortamda `src/server/jobs/tickWorker.ts` içindeki
`bootstrapTickWorker` fonksiyonunu kendi worker sürecinizde çağırın.

## Testler

```bash
npm run lint
npm run test
npx playwright test
```
