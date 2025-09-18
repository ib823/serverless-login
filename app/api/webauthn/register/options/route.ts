import { NextRequest, NextResponse } from 'next/server';
import { webauthnRL } from '@/lib/rl';
import { buildRegOptions, rpFromRequest } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    let user = await getUser(email);
    
    // Create new user if doesn't exist
    if (!user) {
      user = {
        userId: uuidv4(),
        email: email.toLowerCase(),
        credentials: [],
        createdAt: Date.now(),
      };
    const rp = rpFromRequest(request);
    // Debug logging
    console.log('RP configuration:', rp);
    console.log('Request URL:', request.url);
    const options = await buildRegOptions(user, rp);
    // Store challenge
    await setChallenge(`reg:${email}`, options.challenge);
    return NextResponse.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
