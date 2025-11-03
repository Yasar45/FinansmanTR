import { expect, test } from '@playwright/test';

const shouldRun = process.env.PLAYWRIGHT_ENABLE_FARM_FLOW === 'true';

test.describe('Çiftlik Pazar onboarding flow', () => {
  test.skip(!shouldRun, 'requires running Next.js server, database, and seeded data');

  test('user can progress from deposit to exchange sell with KYC gating', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /kayıt ol/i }).click();
    await page.getByLabel(/e-posta/i).fill(`test-${Date.now()}@example.com`);
    await page.getByLabel(/şifre/i).fill('P@ssw0rd123');
    await page.getByLabel(/ad soyad/i).fill('Test Kullanıcı');
    await page.getByLabel(/kvkk/i).check();
    await page.getByLabel(/kullanım/i).check();
    await page.getByRole('button', { name: /kaydı tamamla/i }).click();

    await page.getByLabel(/email/i).fill(`test-${Date.now()}@example.com`);
    await page.getByLabel(/password/i).fill('P@ssw0rd123');
    await page.getByRole('button', { name: /giriş yap/i }).click();

    await page.getByRole('button', { name: /para yatır/i }).click();
    await page.getByLabel(/tutar/i).fill('250');
    await page.getByRole('button', { name: /ödeme oluştur/i }).click();

    await page.getByRole('link', { name: /hayvan satın al/i }).click();
    await page.getByText(/tavuk/i).click();
    await page.getByRole('button', { name: /satın al/i }).click();

    await page.getByRole('link', { name: /envanter/i }).click();
    await page.getByRole('button', { name: /yem satın al/i }).click();
    await page.getByLabel(/miktar/i).fill('10');
    await page.getByRole('button', { name: /satın almayı onayla/i }).click();

    await page.waitForTimeout(2_000);
    await page.getByRole('button', { name: /yumurta topla/i }).click();
    await page.getByRole('button', { name: /borsada sat/i }).click();

    await page.getByRole('link', { name: /cüzdan/i }).click();
    await page.getByRole('button', { name: /para çek/i }).click();
    await expect(page.getByText(/KYC doğrulaması gerekli/i)).toBeVisible();
  });

  test('admin approves KYC and adjusts exchange pricing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /giriş yap/i }).click();
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('P@ssw0rd123');
    await page.getByRole('button', { name: /giriş yap/i }).click();

    await page.getByRole('link', { name: /yönetim paneli/i }).click();
    await page.getByRole('tab', { name: /kyc/i }).click();
    await page.getByRole('button', { name: /onayla/i }).first().click();

    await page.getByRole('tab', { name: /ekonomi/i }).click();
    await page.getByLabel(/egg_try/i).fill('12.5');
    await page.getByRole('button', { name: /fiyatı güncelle/i }).click();

    await expect(page.getByText(/fiyat güncellendi/i)).toBeVisible();
  });
});
