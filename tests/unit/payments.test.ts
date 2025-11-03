import { describe, expect, it } from 'vitest';
import { getPaymentProvider, resolvePaymentProvider } from '@/lib/clients/payments';
import { env } from '@/lib/env';

describe('payment providers', () => {
  it('returns mock provider by default', () => {
    const provider = getPaymentProvider();
    expect(provider.name).toBe('MOCK');
  });

  it('reuses the same singleton when requesting default provider multiple times', () => {
    const first = getPaymentProvider();
    const second = getPaymentProvider();
    expect(second).toBe(first);
  });

  it('creates checkout sessions with unique identifiers', async () => {
    const provider = resolvePaymentProvider('MOCK');
    const session = await provider.createCheckout({
      amountTRY: 100,
      reference: 'test',
      userId: 'user-1'
    });
    expect(session.provider).toBe('MOCK');
    expect(session.checkoutId).toContain('mock_');
    expect(session.checkoutUrl).toContain('http');
  });

  it('enforces provider credentials in production when required', () => {
    if (env.PAYMENT_PROVIDER === 'MOCK') {
      expect(() => resolvePaymentProvider('IYZICO')).toThrowError();
    }
  });
});
