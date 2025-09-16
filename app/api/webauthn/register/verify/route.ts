import { verifyReg, rpFromRequest } from '@/lib/webauthn';
import { getUser, createUser, updateUser, popChallenge } from '@/lib/db';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';
import { signSession } from '@/lib/jwt';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, response } = body;
  const challenge = await popChallenge(`reg:${email}`);
  if (!challenge) return new Response('Challenge expired', { status: 400 });

  const rp = rpFromRequest(request);
  const verification = await verifyReg(response, challenge, rp);

  if (!verification.verified) return new Response('Invalid registration', { status: 400 });

  let user = await getUser(email);
  if (!user) {
    user = await createUser({ userId: uuidv4(), email, credentials: [], createdAt: Date.now() });
  }
  await updateUser(email, verification.registrationInfo);

  const jwt = await signSession(email, parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'));
  const sessionCookie = serialize('__Host-session', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'),
  });

  await audit('register_verify', email, request.headers.get('x-forwarded-for') || '');

  return new Response(null, { status: 200, headers: { 'Set-Cookie': sessionCookie } });
}
