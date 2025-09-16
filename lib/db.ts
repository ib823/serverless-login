import { Redis } from '@upstash/redis';
import { User, AuthCode, RefreshRecord, AuditEvent } from './types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getUser(email: string): Promise<User | null> {
  return await redis.get(`user:${email}`);
}

export async function createUser(user: User): Promise<void> {
  await redis.set(`user:${user.email}`, user);
}

export async function updateUser(user: User): Promise<void> {
  await redis.set(`user:${user.email}`, user);
}

export async function setChallenge(email: string, challenge: string): Promise<void> {
  await redis.set(`challenge:${email}`, challenge, { ex: 600 });
}

export async function popChallenge(email: string): Promise<string | null> {
  const key = `challenge:${email}`;
  const challenge = await redis.get<string>(key);
  if (challenge) {
    await redis.del(key);
  }
  return challenge;
}

export async function setAuthCode(code: string, data: AuthCode): Promise<void> {
  await redis.set(`authcode:${code}`, data, { ex: 300 });
}

export async function popAuthCode(code: string): Promise<AuthCode | null> {
  const key = `authcode:${code}`;
  const data = await redis.get<AuthCode>(key);
  if (data) {
    await redis.del(key);
  }
  return data;
}

export async function setRefreshToken(tokenId: string, record: RefreshRecord): Promise<void> {
  await redis.set(`refresh:${tokenId}`, record, { ex: record.exp - Math.floor(Date.now() / 1000) });
}

export async function getRefreshToken(tokenId: string): Promise<RefreshRecord | null> {
  return await redis.get(`refresh:${tokenId}`);
}

export async function deleteRefreshToken(tokenId: string): Promise<void> {
  await redis.del(`refresh:${tokenId}`);
}

export async function logAudit(event: AuditEvent): Promise<void> {
  const key = `audit:${event.type}`;
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, 499);
}

export { redis };
