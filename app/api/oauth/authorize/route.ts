import { parse } from 'cookie';
import { oauthRL } from '@/lib/rl';
import { setAuthCode } from '@/lib/db';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { verifySession } from '@/lib/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id')!;
  const redirectUri = url.searchParams.get('redirect_uri')!;
  const state = url.searchParams.get('state')!;
  const codeChallenge = url.searchParams.get('code_challenge')!;

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);

  const token = cookies['__Host-session'];
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifySession(token);
  const sub = payload?.sub as string | undefined;
  if (!sub) return NextResponse.redirect(new URL('/login', request.url));

  const code = uuidv4();
  await setAuthCode(code, {
    sub,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  const ip = request.headers.get('x-forwarded-for') || '';
  await audit('oauth_authorize', sub, ip);

  const redirect = new URL(redirectUri);
  redirect.searchParams.set('code', code);
  redirect.searchParams.set('state', state);

  return NextResponse.redirect(redirect.toString());
}
