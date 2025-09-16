import { verifyAuth, rpFromRequest } from '@/lib/webauthn';
import { getUser, updateUser, popChallenge } from '@/lib/db';
import { audit } from '@/lib/audit';
import { serialize } from 'cookie';
import { signSession } from '@/lib/jwt';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, response } = body;

  const challenge = await popChallenge(`auth:${email}`);
  if (!challenge) return new Response('Challenge expired', { status: 400 });

  const user = await getUser(email);
  if (!user) return new Response('User not found', { status: 404 });

  const credential = user.credentials.find(c => c.credId === response.id);
  if (!credential) return new Response('Credential not found', { status: 404 });

  const rp = rpFromRequest(request);
  const verification = await verifyAuth(response, challenge, rp, credential.publicKey, credential.counter);

  if (!verification.verified) return new Response('Invalid authentication', { status: 400 });

  await updateUser(email, verification.authenticationInfo);

  const jwt = await signSession(email, parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'));
  const sessionCookie = serialize('__Host-session', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'),
  });

  await audit('auth_verify', email, request.headers.get('x-forwarded-for') || '');

  return new Response(null, { status: 200, headers: { 'Set-Cookie': sessionCookie } });
}
