import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const createDisputeSchema = z.object({
  listingId: z.string().min(1),
  orderId: z.string().optional(),
  reason: z.string().min(5)
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = createDisputeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) {
    return NextResponse.json({ message: 'İlan bulunamadı' }, { status: 404 });
  }

  if (listing.sellerId !== session.user.id) {
    if (!parsed.data.orderId) {
      return NextResponse.json({ message: 'İlgili işlem belirtilmeli' }, { status: 400 });
    }
    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
    if (!order || (order.takerId !== session.user.id && order.makerId !== session.user.id)) {
      return NextResponse.json({ message: 'İşlem erişimi yok' }, { status: 403 });
    }
  }

  const dispute = await prisma.marketplaceDispute.create({
    data: {
      listingId: parsed.data.listingId,
      orderId: parsed.data.orderId,
      openedById: session.user.id,
      reason: parsed.data.reason,
      status: 'OPEN'
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'marketplace.dispute.open',
      entity: `MarketplaceDispute:${dispute.id}`,
      before: null,
      after: dispute
    }
  });

  return NextResponse.json(dispute, { status: 201 });
}
