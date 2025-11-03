export type PaymentProvider = 'iyzico' | 'paytr';

export interface PaymentRequest {
  amount: number;
  currency: 'TRY';
  reference: string;
  cardToken?: string;
  customerId: string;
}

export interface PaymentResponse {
  provider: PaymentProvider;
  status: 'AUTHORIZED' | 'SETTLED' | 'FAILED';
  providerReference: string;
  errorCode?: string;
  raw?: unknown;
}

export interface WithdrawalRequest {
  amount: number;
  iban: string;
  customerId: string;
}

export interface WithdrawalResponse {
  provider: PaymentProvider;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  providerReference: string;
  errorCode?: string;
}

export interface PaymentAdapter {
  authorize(request: PaymentRequest): Promise<PaymentResponse>;
  withdraw(request: WithdrawalRequest): Promise<WithdrawalResponse>;
}

class MockPaymentAdapter implements PaymentAdapter {
  constructor(private provider: PaymentProvider) {}

  async authorize(request: PaymentRequest): Promise<PaymentResponse> {
    return {
      provider: this.provider,
      status: 'AUTHORIZED',
      providerReference: `${this.provider}-${request.reference}`,
      raw: { capturedAt: new Date().toISOString() }
    };
  }

  async withdraw(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    return {
      provider: this.provider,
      status: 'PENDING',
      providerReference: `${this.provider}-wd-${request.customerId}`
    };
  }
}

const adapters: Record<PaymentProvider, PaymentAdapter> = {
  iyzico: new MockPaymentAdapter('iyzico'),
  paytr: new MockPaymentAdapter('paytr')
};

export function getPaymentAdapter(provider: PaymentProvider = 'iyzico'): PaymentAdapter {
  return adapters[provider];
}
