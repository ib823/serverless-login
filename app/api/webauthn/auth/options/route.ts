import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions, rpID } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';
import { webauthnRL } from '@/lib/rl';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await webauthnRL.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const user = await getUser(email);
  const allowCredentials = user?.credentials.map(c => ({
    id: c.credId,
    type: 'public-key' as const,
    transports: c.transports,
  })) || [];

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
  });

  await setChallenge(email, options.challenge);
  await audit('auth_options', email, ip);

  return NextResponse.json(options);
}
