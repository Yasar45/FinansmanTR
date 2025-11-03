import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3),
  consentTerms: z.literal(true),
  consentKvkk: z.literal(true),
  consentRisk: z.boolean().optional(),
  consentCookie: z.boolean().optional()
});

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.json({ message: 'Bu e-posta zaten kayıtlı.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();
  const consentIp = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '0.0.0.0';

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      profile: {
        create: {
          fullName: parsed.data.fullName,
          preferredLocale: 'tr-TR',
          consentTermsAt: now,
          consentKvkkAt: now,
          consentRiskAt: parsed.data.consentRisk ? now : undefined,
          consentCookieAt: parsed.data.consentCookie ? now : undefined,
          consentIp
        }
      },
      wallets: {
        create: {}
      }
    }
  });

  return NextResponse.json({ id: user.id });
}
