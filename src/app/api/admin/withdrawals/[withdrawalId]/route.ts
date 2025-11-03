import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WithdrawalStatus, WalletTransactionType } from '@prisma/client';

const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'SETTLE']),
  notes: z.string().max(280).optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { withdrawalId: string } }
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

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: params.withdrawalId },
    include: { wallet: true, transactions: true }
  });

  if (!withdrawal) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const holdTx = withdrawal.transactions[0];
  const normalizeMetadata = (meta: unknown) =>
    meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};

  const result = await prisma.$transaction(async (tx) => {
    if (parsed.data.decision === 'REJECT') {
      const wallet = await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: { balance: Number(withdrawal.wallet.balance) + Number(withdrawal.amount) }
      });

      const refundTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEPOSIT,
          amount: Number(withdrawal.amount),
          balance: wallet.balance,
          withdrawalRequestId: withdrawal.id,
          metadata: {
            status: 'REJECTED',
            notes: parsed.data.notes ?? null
          }
        }
      });

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          reviewerId: session.user.id,
          reviewedAt: new Date(),
          reason: parsed.data.notes
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: 'WITHDRAWAL_REJECTED',
          entity: 'WithdrawalRequest',
          before: { status: withdrawal.status },
          after: { status: updated.status, notes: parsed.data.notes }
        }
      });

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL_DECISION',
          payload: { status: updated.status, notes: parsed.data.notes }
        }
      });

      if (holdTx) {
        await tx.walletTransaction.update({
          where: { id: holdTx.id },
          data: {
            metadata: {
              ...normalizeMetadata(holdTx.metadata),
              status: 'REJECTED'
            }
          }
        });
      }

      return { withdrawal: updated, wallet, refundTx };
    }

    if (parsed.data.decision === 'APPROVE') {
      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.APPROVED,
          reviewerId: session.user.id,
          reviewedAt: new Date(),
          reason: parsed.data.notes
        }
      });

      if (holdTx) {
        await tx.walletTransaction.update({
          where: { id: holdTx.id },
          data: {
            metadata: {
              ...normalizeMetadata(holdTx.metadata),
              status: 'APPROVED'
            }
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: 'WITHDRAWAL_APPROVED',
          entity: 'WithdrawalRequest',
          before: { status: withdrawal.status },
          after: { status: updated.status }
        }
      });

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL_DECISION',
          payload: { status: updated.status, notes: parsed.data.notes ?? null }
        }
      });

      return { withdrawal: updated };
    }

    const settled = await tx.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: WithdrawalStatus.SETTLED,
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        reason: parsed.data.notes ?? withdrawal.reason
      }
    });

    if (holdTx) {
      await tx.walletTransaction.update({
        where: { id: holdTx.id },
        data: {
          metadata: {
            ...normalizeMetadata(holdTx.metadata),
            status: 'SETTLED'
          }
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: 'WITHDRAWAL_SETTLED',
        entity: 'WithdrawalRequest',
        before: { status: withdrawal.status },
        after: { status: settled.status }
      }
    });

    await tx.notification.create({
      data: {
        userId: withdrawal.userId,
        type: 'WITHDRAWAL_DECISION',
        payload: { status: settled.status, notes: parsed.data.notes ?? null }
      }
    });

    return { withdrawal: settled };
  });

  return NextResponse.json(result);
}
