import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { verifySession } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const token = cookies['__Host-session'];
  if (!token) return NextResponse.json({ user: null });
  const payload = await verifySession(token);
  return NextResponse.json({ user: payload?.sub || null });
}
