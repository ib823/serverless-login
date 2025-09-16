import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST() {
  const sessionCookie = serialize('__Host-session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return NextResponse.json(
    { success: true },
    { headers: { 'Set-Cookie': sessionCookie } }
  );
}
