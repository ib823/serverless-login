export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { parse } from 'cookie';
import { getUser, updateUser } from '@/lib/db';
import { credentialsRL } from '@/lib/rl';
import { audit } from '@/lib/audit';

export async function PATCH(request: Request, { params }: any) {
  const id = params?.id as string;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const cookies = parse(request.headers.get('cookie') || '');
  const session = cookies['__Host-session'];
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await credentialsRL.limit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await request.json().catch(() => ({} as any));
  const friendlyName = (body?.friendlyName ?? '').toString().trim();
  if (!friendlyName) return NextResponse.json({ error: 'friendlyName required' }, { status: 400 });

  const user = await getUser(session);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const cred = user.credentials.find(c => c.credId === id);
  if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  cred.friendlyName = friendlyName;
  await updateUser(user);
  await audit('cred_rename', session, ip, { credId: id });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: any) {
  const id = params?.id as string;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const cookies = parse(request.headers.get('cookie') || '');
  const session = cookies['__Host-session'];
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await credentialsRL.limit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const user = await getUser(session);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.credentials.length <= 1) {
    return NextResponse.json({ error: 'Cannot delete last credential' }, { status: 400 });
  }

  const idx = user.credentials.findIndex(c => c.credId === id);
  if (idx === -1) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  user.credentials.splice(idx, 1);
  await updateUser(user);
  await audit('cred_delete', session, ip, { credId: id });
  return NextResponse.json({ success: true });
}
