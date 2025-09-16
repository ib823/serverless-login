import { Redis } from '@upstash/redis';
import { User, AuthCode, RefreshRecord, AuditEvent } from './types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CHAL = (k: string) => `challenge:${k}`;

export async function setChallenge(key: string, challenge: string): Promise<void> {
  await redis.set(CHAL(key), challenge, { ex: 600 });
}

export async function popChallenge(key: string): Promise<string | null> {
  const k = CHAL(key);
  const challenge = await redis.get<string>(k);
  if (challenge) await redis.del(k);
  return challenge;
}
