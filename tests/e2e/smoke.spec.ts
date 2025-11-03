import { test, expect } from '@playwright/test';

test('landing page has hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Türkiye'nin dijital çiftlik/i })).toBeVisible();
});
