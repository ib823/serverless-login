export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { getRefreshToken, deleteRefreshToken, setRefreshToken } from '@/lib/db';
import { signJWT } from '@/lib/jwt';
import { audit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { serialize } from 'cookie';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const cookies = parse(request.headers.get('cookie') || '');
  const refreshTokenId = cookies['__Host-refresh'];
  
  if (!refreshTokenId) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }
  
  const refreshRecord = await getRefreshToken(refreshTokenId);
  if (!refreshRecord) {
    await audit('oauth_refresh_denied', '', ip);
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }
  
  if (refreshRecord.exp < Math.floor(Date.now() / 1000)) {
    await deleteRefreshToken(refreshTokenId);
    await audit('oauth_refresh_denied', refreshRecord.sub || '', ip);
    return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
  }

  // Rotate
  await deleteRefreshToken(refreshTokenId);
  
  const accessTokenTTL = parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600', 10);
  const refreshTokenTTL = parseInt(process.env.REFRESH_TOKEN_TTL_SEC || '1209600', 10);
  
  const accessToken = await signJWT({ sub: refreshRecord.sub, scope: 'openid email' }, `${accessTokenTTL}s`);
  
  const newRefreshTokenId = uuidv4();
  const newRotationId = uuidv4();
  
  await setRefreshToken(newRefreshTokenId, {
    sub: refreshRecord.sub,
    rot: newRotationId,
    exp: Math.floor(Date.now() / 1000) + refreshTokenTTL,
  });
  
  await audit('oauth_refresh_issued', refreshRecord.sub || '', ip);
  
  const refreshCookie = serialize('__Host-refresh', newRefreshTokenId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshTokenTTL,
  });
  
  return NextResponse.json(
    { access_token: accessToken, token_type: 'Bearer', expires_in: accessTokenTTL, scope: 'openid email' },
    { headers: { 'Set-Cookie': refreshCookie } }
  );
}
