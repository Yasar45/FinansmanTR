import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ciftlik-pazar',
    timestamp: new Date().toISOString()
  });
}
