import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KycDocumentStatus, KycStatus } from '@prisma/client';

const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(280).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { profileId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = await request.json();
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: params.profileId } });
  if (!profile) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const status = parsed.data.decision === 'APPROVE' ? KycStatus.VERIFIED : KycStatus.UNVERIFIED;

    const updatedProfile = await tx.profile.update({
      where: { id: profile.id },
      data: {
        kycStatus: status,
        kycReviewedAt: now,
        kycReviewerId: session.user.id,
        kycDecisionReason: parsed.data.reason ?? null
      }
    });

    await tx.kycDocument.updateMany({
      where: { userId: profile.userId },
      data: {
        status:
          parsed.data.decision === 'APPROVE'
            ? KycDocumentStatus.APPROVED
            : KycDocumentStatus.REJECTED,
        reviewedAt: now,
        reviewerId: session.user.id,
        decisionNote: parsed.data.reason ?? null
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'KYC_DECISION',
        entity: 'Profile',
        before: { status: profile.kycStatus },
        after: { status, reason: parsed.data.reason }
      }
    });

    await tx.notification.create({
      data: {
        userId: profile.userId,
        type: 'KYC_DECISION',
        payload: {
          status,
          reason: parsed.data.reason ?? null
        }
      }
    });

    return updatedProfile;
  });

  return NextResponse.json({ profile: result });
}
