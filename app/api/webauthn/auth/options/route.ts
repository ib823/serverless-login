import { buildAuthOptions, rpFromRequest } from '@/lib/webauthn';
import { getUser, setChallenge } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email;
  if (!email) return new Response('Missing email', { status: 400 });

  const user = await getUser(email);
  const rp = rpFromRequest(request);
  const options = buildAuthOptions(user, rp.rpID);

  await setChallenge(`auth:${email}`, options.challenge);
  return Response.json(options);
}
