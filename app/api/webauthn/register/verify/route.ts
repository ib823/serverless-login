import { NextRequest, NextResponse } from 'next/server';
import { verifyReg, rpFromRequest } from '@/lib/webauthn';
import { getUser, createUser, updateUser, popChallenge } from '@/lib/db';
import { audit } from '@/lib/audit';
import { serialize } from 'cookie';
import { signSession } from '@/lib/jwt';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, response } = body;
    const challenge = await popChallenge(`reg:${email}`);
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge expired' }, { status: 400 });
    }
    const rp = rpFromRequest(request);
    const verification = await verifyReg(response, challenge, rp);
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Invalid registration' }, { status: 400 });
    // Extract the credential information properly
    const regInfo = verification.registrationInfo;
    const credentialPublicKey = regInfo.credential.publicKey;
    const credentialID = regInfo.credential.id;
    const counter = regInfo.credential.counter || 0;
    let user = await getUser(email);
    
    if (!user) {
      // Create new user
      user = {
        userId: uuidv4(),
        email: email.toLowerCase(),
        credentials: [],
        createdAt: Date.now(),
      };
    // Add credential
    user.credentials.push({
      credId: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter: counter,
      transports: response.response?.transports,
      createdAt: Date.now(),
    });
    // Save user
    if (user.credentials.length === 1) {
      await createUser(user);
    } else {
      await updateUser(user);
    const jwt = await signSession(email, parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'));
    const sessionCookie = serialize('__Host-session', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: parseInt(process.env.ACCESS_TOKEN_TTL_SEC || '3600'),
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await audit('reg_verify', email, ip);
    return NextResponse.json({ success: true }, {
      headers: { 'Set-Cookie': sessionCookie }
  } catch (error) {
    console.error('Registration verify error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
