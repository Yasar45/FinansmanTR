import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OUTPUT_KIND_TO_SYMBOL } from '@/lib/marketplace';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const outputs = await prisma.outputInventory.findMany({
    where: { ownerId: session.user.id }
  });

  const formatted = outputs.map((output) => ({
    id: output.id,
    kind: output.kind,
    symbol: OUTPUT_KIND_TO_SYMBOL[output.kind as keyof typeof OUTPUT_KIND_TO_SYMBOL] ?? output.kind,
    qty: Number(output.qty),
    unit: output.unit,
    avgCostTRY: Number(output.avgCostTRY)
  }));

  return NextResponse.json({ outputs: formatted });
}
