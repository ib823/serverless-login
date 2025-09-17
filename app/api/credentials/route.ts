import { NextRequest, NextResponse } from 'next/server';
import { credentialsRL } from '@/lib/rl';
import { parse } from 'cookie';
import { getUser } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const cookies = parse(request.headers.get('cookie') || '');
  const session = cookies['__Host-session'];

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await credentialsRL.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const user = await getUser(session);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await audit('cred_list', session, ip);

  const credentials = user.credentials.map(c => ({
    credId: c.credId,
    friendlyName: c.friendlyName,
    credentialDeviceType: c.credentialDeviceType,
    credentialBackedUp: c.credentialBackedUp,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  }));

  return NextResponse.json(credentials);
}
