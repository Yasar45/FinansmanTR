import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasAbility } from '@/lib/rbac';

const resolveSchema = z.object({
  resolution: z.string().min(5)
});

export async function PATCH(request: Request, { params }: { params: { disputeId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!hasAbility(session.user, 'manage:listings')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = await request.json();
  const parsed = resolveSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const dispute = await prisma.marketplaceDispute.update({
    where: { id: params.disputeId },
    data: {
      status: 'RESOLVED',
      resolution: parsed.data.resolution,
      resolvedById: session.user.id,
      resolvedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'marketplace.dispute.resolve',
      entity: `MarketplaceDispute:${dispute.id}`,
      before: null,
      after: dispute
    }
  });

  return NextResponse.json(dispute);
}
