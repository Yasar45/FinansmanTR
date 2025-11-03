import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { kycQueue } from '@/lib/queues/tick-engine';
import { KycDocumentStatus, KycDocumentType, KycStatus } from '@prisma/client';

const kycSchema = z.object({
  fullName: z.string().min(3),
  nationalId: z.string().regex(/^\d{11}$/),
  birthDate: z.string().datetime(),
  phoneNumber: z.string().min(10),
  address: z.object({
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    district: z.string().min(2),
    postalCode: z.string().min(4)
  }),
  selfieKey: z.string().min(5),
  idFrontKey: z.string().min(5),
  idBackKey: z.string().min(5),
  consentKvkk: z.boolean(),
  consentTerms: z.boolean(),
  consentRisk: z.boolean(),
  consentCookie: z.boolean()
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = kycSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const now = new Date();
  const consentIp = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '0.0.0.0';

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { userId: session.user.id },
      data: {
        fullName: parsed.data.fullName,
        nationalId: parsed.data.nationalId,
        birthDate: new Date(parsed.data.birthDate),
        phoneNumber: parsed.data.phoneNumber,
        address: parsed.data.address,
        selfieObjectKey: parsed.data.selfieKey,
        idFrontObjectKey: parsed.data.idFrontKey,
        idBackObjectKey: parsed.data.idBackKey,
        consentKvkkAt: parsed.data.consentKvkk ? now : undefined,
        consentTermsAt: parsed.data.consentTerms ? now : undefined,
        consentRiskAt: parsed.data.consentRisk ? now : undefined,
        consentCookieAt: parsed.data.consentCookie ? now : undefined,
        consentIp,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: now,
        kycDecisionReason: null
      }
    });

    await Promise.all([
      tx.kycDocument.upsert({
        where: { userId_type: { userId: session.user.id, type: KycDocumentType.IDENTITY } },
        update: {
          status: KycDocumentStatus.PENDING,
          storageKey: parsed.data.idFrontKey,
          metadata: { idBack: parsed.data.idBackKey }
        },
        create: {
          userId: session.user.id,
          type: KycDocumentType.IDENTITY,
          storageKey: parsed.data.idFrontKey,
          metadata: { idBack: parsed.data.idBackKey }
        }
      }),
      tx.kycDocument.upsert({
        where: { userId_type: { userId: session.user.id, type: KycDocumentType.SELFIE } },
        update: {
          status: KycDocumentStatus.PENDING,
          storageKey: parsed.data.selfieKey
        },
        create: {
          userId: session.user.id,
          type: KycDocumentType.SELFIE,
          storageKey: parsed.data.selfieKey
        }
      })
    ]);

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'KYC_SUBMITTED',
        entity: 'Profile',
        after: { profileId: profile.id }
      }
    });

    return profile;
  });

  await kycQueue.add('review', { profileId: result.id });

  return NextResponse.json({ profile: result });
}
