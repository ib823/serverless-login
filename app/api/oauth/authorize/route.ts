import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { setAuthCode } from '@/lib/db';
import { oauthRL } from '@/lib/rl';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const cookies = parse(request.headers.get('cookie') || '');
  const session = cookies['__Host-session'];

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { success } = await oauthRL.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  if (!clientId || !redirectUri || !state || !codeChallenge || codeChallengeMethod !== 'S256') {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const allowedRedirects = (process.env.OAUTH_REDIRECT_URIS || '').split(',');
  if (!allowedRedirects.includes(redirectUri)) {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 });
  }

  const code = uuidv4();
  await setAuthCode(code, {
    sub: session,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  await audit('oauth_authorize', session, ip);

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl);
}
