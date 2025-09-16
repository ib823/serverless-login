export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getUser, setChallenge } from '@/lib/db';
import { buildAuthOptions, rpFromRequest } from '@/lib/webauthn';
import { webauthnRL } from '@/lib/rl';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await webauthnRL.limit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const user = await getUser(email);
  const rp = rpFromRequest(request);
  const options = await buildAuthOptions(user, rp.rpID); // <-- await
  await setChallenge(`auth:${email}`, options.challenge);
  await audit('auth_options', email, ip);

  return NextResponse.json(options);
}
