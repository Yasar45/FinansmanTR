import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MarketplaceListingStatus } from '@prisma/client';

const createListingSchema = z.object({
  assetRef: z.enum(['ANIMAL', 'PLOT', 'OUTPUT']),
  refId: z.string().min(3),
  priceTRY: z.number().positive(),
  qty: z.number().positive(),
  expiresAt: z.string().datetime().optional()
});

export async function GET() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { status: MarketplaceListingStatus.ACTIVE },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json(listings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = createListingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const listing = await prisma.marketplaceListing.create({
    data: {
      sellerId: session.user.id,
      assetRef: parsed.data.assetRef,
      refId: parsed.data.refId,
      priceTRY: parsed.data.priceTRY,
      qty: parsed.data.qty,
      status: MarketplaceListingStatus.ACTIVE,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    }
  });

  return NextResponse.json(listing);
}
