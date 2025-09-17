import { NextRequest, NextResponse } from 'next/server';
import { webauthnRL } from '@/lib/rl';
import { buildAuthOptions, rpFromRequest } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  const { success } = await webauthnRL.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email } = body;
    
    const user = await getUser(email);
    
    // CRITICAL: Use rpFromRequest to get correct RP ID
    const rp = rpFromRequest(request);
    console.log('Auth options RP:', rp);
    
    const options = await buildAuthOptions(user, rp.rpID);
    
    await setChallenge(`auth:${email}`, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Auth options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}