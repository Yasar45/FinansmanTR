import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CropStatus, WalletTransactionType } from '@prisma/client';

const plantSchema = z.object({
  plotId: z.string().cuid(),
  cropTypeId: z.string().cuid()
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const plots = await prisma.plot.findMany({
    where: { ownerId: session.user.id },
    include: { crops: { include: { cropType: true } } }
  });

  return NextResponse.json(plots);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  const parsed = plantSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const plot = await prisma.plot.findFirstOrThrow({ where: { id: parsed.data.plotId, ownerId: session.user.id } });
  const cropType = await prisma.cropType.findUniqueOrThrow({ where: { id: parsed.data.cropTypeId } });
  const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId: session.user.id } });

  const plantingCost = Number(cropType.plantingCostTRY);
  const currentBalance = Number(wallet.balance);
  if (currentBalance < plantingCost) {
    return NextResponse.json({ message: 'Yetersiz bakiye' }, { status: 422 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const crop = await tx.cropInstance.create({
      data: {
        plotId: plot.id,
        cropTypeId: cropType.id,
        plantedAt: new Date(),
        harvestAt: new Date(Date.now() + cropType.cycleDays * 24 * 60 * 60 * 1000),
        expectedYield: cropType.yieldPerCycle,
        status: CropStatus.PLANTED
      }
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: currentBalance - plantingCost }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.SUPPLY_PURCHASE,
        amount: -plantingCost,
        balance: updatedWallet.balance,
        metadata: { cropType: cropType.name }
      }
    });

    return { crop, wallet: updatedWallet };
  });

  return NextResponse.json(result);
}
