import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WalletTransactionType } from '@prisma/client';

const createAnimalSchema = z.object({
  typeId: z.string().cuid(),
  qty: z.number().int().positive()
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const animals = await prisma.animal.findMany({
    where: { ownerId: session.user.id },
    include: { type: true }
  });

  return NextResponse.json(animals);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = createAnimalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const animalType = await prisma.animalType.findUniqueOrThrow({ where: { id: parsed.data.typeId } });
  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });

  const purchasePrice = Number(animalType.purchasePriceTRY);
  const currentBalance = Number(wallet.balance);
  const totalCost = purchasePrice * parsed.data.qty;
  if (currentBalance < totalCost) {
    return NextResponse.json({ message: 'Yetersiz bakiye' }, { status: 422 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.animal.createMany({
      data: Array.from({ length: parsed.data.qty }).map(() => ({
        ownerId: session.user.id,
        typeId: animalType.id,
        productivityMod: 1
      }))
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: currentBalance - totalCost }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.BUY_ASSET,
        amount: -totalCost,
        balance: updatedWallet.balance,
        metadata: { animalType: animalType.name, qty: parsed.data.qty }
      }
    });

    return { count: created.count, wallet: updatedWallet };
  });

  return NextResponse.json(result);
}
