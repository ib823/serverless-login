import { NextRequest, NextResponse } from 'next/server';
import { credentialsRL } from '@/lib/rl';
import { parse } from 'cookie';
import { getUser } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await credentialsRL.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const cookies = parse(request.headers.get('cookie') || '');
  const sessionToken = cookies['__Host-session'];
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify session and get user
  const user = await getUser(sessionToken);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await audit('cred_list', user.email, ip);
  
  const credentials = user.credentials.map(c => ({
    id: c.credId,
    friendlyName: c.friendlyName || 'Unnamed passkey',
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  }));
  
  return NextResponse.json(credentials);
}
