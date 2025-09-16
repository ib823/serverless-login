import { NextRequest, NextResponse } from 'next/server';
import { buildAuthOptions } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';
import { webauthnRL } from '@/lib/rl';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Rate limiting
  const { success } = await webauthnRL.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    const user = await getUser(email);
    const url = new URL(request.url);
    const rpID = url.hostname;
    
    const options = await buildAuthOptions(user, rpID);
    
    // Store challenge
    await setChallenge(`auth:${email}`, options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error('Auth options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
