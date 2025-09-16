import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse, rpID, origin } from '@/lib/webauthn';
import { getUser, updateUser, popChallenge } from '@/lib/db';
import { audit } from '@/lib/audit';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { email, response } = await request.json();

  const challenge = await popChallenge(email);
  if (!challenge) {
    return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
  }

  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 });
  }

  const credential = user.credentials.find(
    c => c.credId === response.id
  );

  if (!credential) {
    await audit('auth_verify_fail', email, ip, { reason: 'credential_not_found' });
    return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credId, 'base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
      },
    });

    if (!verification.verified) {
      await audit('auth_verify_fail', email, ip);
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    credential.counter = verification.authenticationInfo.newCounter;
    credential.lastUsedAt = Date.now();
    await updateUser(user);

    await audit('auth_verify', email, ip);

    const sessionCookie = serialize('__Host-session', email, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return NextResponse.json(
      { verified: true },
      { headers: { 'Set-Cookie': sessionCookie } }
    );
  } catch (error) {
    await audit('auth_verify_error', email, ip, { error: String(error) });
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}
