import { NextRequest, NextResponse } from 'next/server';
import { popAuthCode, setRefreshToken } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { audit } from '@/lib/audit';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const formData = await request.formData();
  
  const grantType = formData.get('grant_type');
  const clientId = formData.get('client_id');
  const clientSecret = formData.get('client_secret');
  const redirectUri = formData.get('redirect_uri');
  const code = formData.get('code');
  const codeVerifier = formData.get('code_verifier');

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'Unsupported grant_type' }, { status: 400 });
  }

  if (clientId !== process.env.OAUTH_CLIENT_ID || clientSecret !== process.env.OAUTH_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 401 });
  }

  const authCode = await popAuthCode(code as string);
  if (!authCode) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  if (authCode.client_id !== clientId || authCode.redirect_uri !== redirectUri) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const challengeVerify = createHash('sha256')
    .update(codeVerifier as string)
    .digest('base64url');

  if (challengeVerify !== authCode.code_challenge) {
    return NextResponse.json({ error: 'Invalid verifier' }, { status: 400 });
  }

  const accessTokenTTL = parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600');
  const refreshTokenTTL = parseInt(process.env.REFRESH_TOKEN_TTL_SEC || '1209600');
  
  const accessToken = await signJWT({
    sub: authCode.sub,
    scope: 'openid email',
  }, \`\${accessTokenTTL}s\`);

  const refreshTokenId = uuidv4();
  const rotationId = uuidv4();
  
  await setRefreshToken(refreshTokenId, {
    sub: authCode.sub,
    rot: rotationId,
    exp: Math.floor(Date.now() / 1000) + refreshTokenTTL,
  });

  await audit('oauth_token', authCode.sub, ip);

  const refreshCookie = serialize('__Host-refresh', refreshTokenId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshTokenTTL,
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: accessTokenTTL,
      scope: 'openid email',
    },
    { headers: { 'Set-Cookie': refreshCookie } }
  );
}
