export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { buildRegOptions, rpFromRequest } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';
import { webauthnRL } from '@/lib/rl';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await webauthnRL.limit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const existing = await getUser(email);
  const user = existing ?? { userId: uuidv4(), email, credentials: [], createdAt: Date.now() };
  const rp = rpFromRequest(request);
  const options = await buildRegOptions(user as any, { rpID: rp.rpID, rpName: rp.rpName }); // <-- await
  await setChallenge(`reg:${email}`, options.challenge);
  await audit('reg_options', email, ip);

  return NextResponse.json(options);
}
