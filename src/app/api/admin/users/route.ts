import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasAbility } from '@/lib/rbac';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (!hasAbility(session.user, 'manage:users') && session.user.role !== 'ADMIN')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { profile: { fullName: { contains: query, mode: 'insensitive' } } }
      ]
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      profile: true,
      wallets: true
    }
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isFrozen: user.isFrozen,
      fullName: user.profile?.fullName ?? null,
      kycStatus: user.profile?.kycStatus ?? null,
      totpEnabled: Boolean(user.profile?.totpSecret),
      wallets: user.wallets.map((wallet) => ({
        id: wallet.id,
        balance: Number(wallet.balance),
        currency: wallet.currency
      }))
    }))
  });
}
