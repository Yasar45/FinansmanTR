import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { enqueueTick } from '@/lib/queues/tick-engine';

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  await enqueueTick('HOURLY');
  return NextResponse.json({ status: 'queued' });
}
