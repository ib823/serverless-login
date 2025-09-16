import { buildRegOptions, rpFromRequest } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email;
  if (!email) return new Response('Missing email', { status: 400 });

  const existing = await getUser(email);
  const user = existing ?? { userId: uuidv4(), email, credentials: [], createdAt: Date.now() };
  const rp = rpFromRequest(request);
  const options = buildRegOptions(user as any, { rpID: rp.rpID, rpName: rp.rpName });

  await setChallenge(`reg:${email}`, options.challenge);
  return Response.json(options);
}
