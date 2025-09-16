import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse, rpID, origin } from '@/lib/webauthn';
import { getUser, createUser, updateUser, popChallenge } from '@/lib/db';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { email, response } = await request.json();

  const challenge = await popChallenge(email);
  if (!challenge) {
    return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 });
  }

  let user = await getUser(email);
  
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await audit('reg_verify_fail', email, ip);
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { registrationInfo } = verification;
    const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

    const credential = {
      credId: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      transports: response.response.transports,
      credentialDeviceType,
      credentialBackedUp,
      friendlyName: \`Device \${(user?.credentials.length || 0) + 1}\`,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    if (!user) {
      user = {
        userId: uuidv4(),
        email,
        credentials: [credential],
        createdAt: Date.now(),
      };
      await createUser(user);
    } else {
      user.credentials.push(credential);
      await updateUser(user);
    }

    await audit('reg_verify', email, ip);

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
    await audit('reg_verify_error', email, ip, { error: String(error) });
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}
