import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { getUser, updateUser } from '@/lib/db';
import { credentialsRL } from '@/lib/rl';
import { audit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { friendlyName } = await request.json();
  
  const user = await getUser(session);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const credential = user.credentials.find(c => c.credId === params.id);
  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  credential.friendlyName = friendlyName;
  await updateUser(user);

  await audit('cred_rename', session, ip, { credId: params.id });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  if (user.credentials.length <= 1) {
    return NextResponse.json({ error: 'Cannot delete last credential' }, { status: 400 });
  }

  const index = user.credentials.findIndex(c => c.credId === params.id);
  if (index === -1) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  user.credentials.splice(index, 1);
  await updateUser(user);

  await audit('cred_delete', session, ip, { credId: params.id });

  return NextResponse.json({ success: true });
}
