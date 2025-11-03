import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().url('REDIS_URL must be a valid redis url').default('redis://localhost:6379'),
    NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
    NEXTAUTH_URL: z.string().url().optional(),
    PAYMENT_PROVIDER: z.enum(['MOCK', 'IYZICO', 'PAYTR']).default('MOCK'),
    IYZICO_API_KEY: z.string().min(1).optional(),
    IYZICO_SECRET: z.string().min(1).optional(),
    PAYTR_MERCHANT_ID: z.string().min(1).optional(),
    PAYTR_MERCHANT_KEY: z.string().min(1).optional(),
    STORAGE_BUCKET_URL: z.string().url().optional(),
    STORAGE_ACCESS_KEY: z.string().min(1).optional(),
    STORAGE_SECRET_KEY: z.string().min(1).optional(),
    PAYMENT_MAX_DEPOSITS_PER_MINUTE: z.coerce.number().int().positive().default(5),
    PAYMENT_MAX_DEPOSITS_PER_HOUR: z.coerce.number().int().positive().default(20),
    PAYMENT_MAX_DEPOSIT_TRY_PER_HOUR: z.coerce.number().positive().default(100000),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
    LOGFLARE_API_KEY: z.string().optional(),
    LOGFLARE_SOURCE_TOKEN: z.string().optional(),
    DISABLE_QUEUE_CONNECTIONS: z.coerce.boolean().default(false),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && !data.NEXTAUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXTAUTH_URL'],
        message: 'NEXTAUTH_URL is required in production.'
      });
    }

    if (data.PAYMENT_PROVIDER === 'IYZICO') {
      if (!data.IYZICO_API_KEY || !data.IYZICO_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['IYZICO_API_KEY'],
          message: 'IYZICO credentials are required when PAYMENT_PROVIDER=IYZICO.'
        });
      }
    }

    if (data.PAYMENT_PROVIDER === 'PAYTR') {
      if (!data.PAYTR_MERCHANT_ID || !data.PAYTR_MERCHANT_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYTR_MERCHANT_ID'],
          message: 'PayTR credentials are required when PAYMENT_PROVIDER=PAYTR.'
        });
      }
    }

    if (data.NODE_ENV === 'production') {
      ['STORAGE_BUCKET_URL', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'].forEach((key) => {
        const value = data[key as keyof typeof data];
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production.`
          });
        }
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
