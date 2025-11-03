import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updatePriceSchema = z.object({
  symbol: z.string(),
  midPriceTRY: z.number().positive(),
  spreadBps: z.number().int().nonnegative(),
  source: z.enum(['ADMIN', 'ORACLE']).default('ADMIN')
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const payload = await request.json();
  const parsed = updatePriceSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const price = await prisma.systemPrice.upsert({
    where: { symbol: parsed.data.symbol },
    update: {
      midPriceTRY: parsed.data.midPriceTRY,
      spreadBps: parsed.data.spreadBps,
      source: parsed.data.source
    },
    create: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'UPDATE_SYSTEM_PRICE',
      entity: 'SystemPrice',
      after: price
    }
  });

  return NextResponse.json(price);
}
