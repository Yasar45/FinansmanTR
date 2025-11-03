import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { env } from '@/lib/env';

export type PaymentProviderName = 'MOCK' | 'IYZICO' | 'PAYTR';

export interface CheckoutRequest {
  amountTRY: number;
  reference: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutSession {
  provider: PaymentProviderName;
  checkoutId: string;
  amountTRY: number;
  checkoutUrl: string;
  expiresAt: Date;
  raw?: unknown;
}

export interface PaymentCaptureResult {
  provider: PaymentProviderName;
  status: 'AUTHORIZED' | 'SETTLED' | 'FAILED';
  reference: string;
  raw?: unknown;
}

export interface PaymentRefundResult {
  provider: PaymentProviderName;
  status: 'REFUNDED' | 'FAILED';
  reference: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  capture(reference: string): Promise<PaymentCaptureResult>;
  refund(reference: string, amountTRY: number): Promise<PaymentRefundResult>;
  webhookVerify(signature: string | null, payload: string): Promise<boolean>;
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK';

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const checkoutId = `mock_${randomUUID()}`;
    return {
      provider: this.name,
      checkoutId,
      amountTRY: request.amountTRY,
      checkoutUrl: `${env.NEXTAUTH_URL ?? 'https://mock.ciftlikpazar.tr'}/payments/mock/${checkoutId}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      raw: {
        reference: request.reference,
        metadata: request.metadata ?? {}
      }
    };
  }

  async capture(reference: string): Promise<PaymentCaptureResult> {
    return {
      provider: this.name,
      status: 'SETTLED',
      reference,
      raw: { capturedAt: new Date().toISOString() }
    };
  }

  async refund(reference: string, amountTRY: number): Promise<PaymentRefundResult> {
    return {
      provider: this.name,
      status: 'REFUNDED',
      reference,
      raw: { amount: amountTRY }
    };
  }

  async webhookVerify(signature: string | null, _payload: string): Promise<boolean> {
    return signature === null || signature === 'mock-signature';
  }
}

class IyzicoPaymentProvider implements PaymentProvider {
  readonly name = 'IYZICO';

  constructor(private readonly apiKey: string, private readonly secret: string) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const checkoutId = `iyzico_${randomUUID()}`;
    return {
      provider: this.name,
      checkoutId,
      amountTRY: request.amountTRY,
      checkoutUrl: `https://sandbox-iyzico.ciftlikpazar.tr/checkout/${checkoutId}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      raw: {
        apiKeyFingerprint: this.apiKey.slice(0, 4) + '***',
        reference: request.reference
      }
    };
  }

  async capture(reference: string): Promise<PaymentCaptureResult> {
    return {
      provider: this.name,
      status: 'AUTHORIZED',
      reference,
      raw: { note: 'Iyzico capture stub' }
    };
  }

  async refund(reference: string, amountTRY: number): Promise<PaymentRefundResult> {
    return {
      provider: this.name,
      status: 'REFUNDED',
      reference,
      raw: { amountTRY }
    };
  }

  async webhookVerify(signature: string | null, payload: string): Promise<boolean> {
    if (!signature) {
      return false;
    }
    const expected = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    return expected === signature;
  }
}

class PayTRPaymentProvider implements PaymentProvider {
  readonly name = 'PAYTR';

  constructor(private readonly merchantId: string, private readonly merchantKey: string) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const checkoutId = `paytr_${randomUUID()}`;
    return {
      provider: this.name,
      checkoutId,
      amountTRY: request.amountTRY,
      checkoutUrl: `https://sandbox-paytr.ciftlikpazar.tr/checkout/${checkoutId}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      raw: {
        merchantIdFingerprint: this.merchantId.slice(0, 4) + '***',
        reference: request.reference
      }
    };
  }

  async capture(reference: string): Promise<PaymentCaptureResult> {
    return {
      provider: this.name,
      status: 'AUTHORIZED',
      reference,
      raw: { note: 'PayTR capture stub' }
    };
  }

  async refund(reference: string, amountTRY: number): Promise<PaymentRefundResult> {
    return {
      provider: this.name,
      status: 'REFUNDED',
      reference,
      raw: { amountTRY }
    };
  }

  async webhookVerify(signature: string | null, payload: string): Promise<boolean> {
    if (!signature) {
      return false;
    }
    const expected = crypto.createHmac('sha256', this.merchantKey).update(payload).digest('hex');
    return expected === signature;
  }
}

let singleton: PaymentProvider | null = null;

export function resolvePaymentProvider(provider?: PaymentProviderName): PaymentProvider {
  const target = provider ?? env.PAYMENT_PROVIDER;

  if (singleton && singleton.name === target) {
    return singleton;
  }

  if (target === 'MOCK') {
    const instance = new MockPaymentProvider();
    singleton = instance;
    return instance;
  }

  if (target === 'IYZICO') {
    if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET) {
      throw new Error('IYZICO credentials are not configured.');
    }
    const instance = new IyzicoPaymentProvider(env.IYZICO_API_KEY, env.IYZICO_SECRET);
    singleton = instance;
    return instance;
  }

  if (!env.PAYTR_MERCHANT_ID || !env.PAYTR_MERCHANT_KEY) {
    throw new Error('PayTR credentials are not configured.');
  }
  const instance = new PayTRPaymentProvider(env.PAYTR_MERCHANT_ID, env.PAYTR_MERCHANT_KEY);
  singleton = instance;
  return instance;
}

export function getPaymentProvider(provider?: PaymentProviderName): PaymentProvider {
  const target = provider ?? env.PAYMENT_PROVIDER;
  if (!singleton || singleton.name !== target) {
    singleton = resolvePaymentProvider(target);
  }
  return singleton;
}
