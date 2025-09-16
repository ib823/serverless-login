import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, rpFromRequest } from '@/lib/webauthn-enhanced';
import { getUser, updateUser, popChallenge, validateSession } from '@/lib/db-secure';
import { logAudit } from '@/lib/db-secure';
import { serialize } from 'cookie';
import { signJWT } from '@/lib/jwt-enhanced';
import { webauthnRL, isBlocked, blockIP } from '@/lib/rl-enhanced';
import { checkLoginAnomaly, generateDeviceFingerprint } from '@/lib/anomaly-detection';
import { constantTimeCompare } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Check if IP is blocked
  if (await isBlocked(ip)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Rate limiting
  const { success, remaining } = await webauthnRL.limit(ip);
  if (!success) {
    if (remaining === 0) {
      await blockIP(ip); // Block IP after rate limit exceeded
    }
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, response } = body;

    // Timing attack prevention - add random delay
    const delay = Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    const challenge = await popChallenge(`auth:${email}`);
    if (!challenge) {
      await logAudit({
        type: 'auth_verify_failed',
        sub: email,
        timestamp: Date.now(),
        ip,
        details: 'Invalid or expired challenge',
      });
      return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }

    const user = await getUser(email);
    if (!user) {
      // Don't reveal user doesn't exist
      return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }

    const credential = user.credentials.find(c => 
      constantTimeCompare(c.credId, response.id)
    );
    
    if (!credential) {
      await logAudit({
        type: 'auth_verify_failed',
        sub: email,
        timestamp: Date.now(),
        ip,
        details: 'Unknown credential',
      });
      return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }

    // Check for anomalies
    const deviceFingerprint = generateDeviceFingerprint(request);
    const { suspicious, reasons } = await checkLoginAnomaly(
      user.userId,
      ip,
      request.headers.get('user-agent') || '',
      request.headers.get('cf-ipcountry')
    );

    if (suspicious) {
      // Require additional verification or notify user
      await logAudit({
        type: 'suspicious_login',
        sub: email,
        timestamp: Date.now(),
        ip,
        details: reasons.join(', '),
      });
    }

    const rp = rpFromRequest(request);
    const verification = await verifyAuth(
      response,
      challenge,
      rp,
      credential.publicKey,
      credential.counter
    );

    if (!verification.verified) {
      await logAudit({
        type: 'auth_verify_failed',
        sub: email,
        timestamp: Date.now(),
        ip,
        details: 'Verification failed',
      });
      return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }

    // Update credential with new counter and last used time
    credential.counter = verification.authenticationInfo.newCounter;
    credential.lastUsedAt = Date.now();
    
    await updateUser(user);

    // Create secure session
    const sessionId = await createSession(user.userId, deviceFingerprint);
    
    const jwt = await signJWT(
      { 
        sub: email,
        sid: sessionId,
        fingerprint: deviceFingerprint,
      },
      process.env.ACCESS_TOKEN_TTL_SEC || '3600'
    );

    const sessionCookie = serialize('__Host-session', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'),
    });

    await logAudit({
      type: 'auth_verify_success',
      sub: email,
      timestamp: Date.now(),
      ip,
    });

    return NextResponse.json(
      { success: true },
      { 
        status: 200,
        headers: { 
          'Set-Cookie': sessionCookie,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        }
      }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
