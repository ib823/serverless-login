import { Redis } from '@upstash/redis';
import type { User, AuthCode, RefreshRecord, AuditEvent } from './types';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const USER_KEY = (email: string) => `user:${email.toLowerCase()}`;
const CHAL_KEY = (k: string) => `challenge:${k}`;           // allow namespaced keys like "reg:email" / "auth:email"
const CODE_KEY = (code: string) => `authcode:${code}`;
const REFRESH_KEY = (id: string) => `refresh:${id}`;
const AUDIT_KEY = (t: string) => `audit:${t}`;

/* Users */
export async function getUser(email: string): Promise<User | null> {
  return (await redis.get<User>(USER_KEY(email))) ?? null;
}
export async function createUser(user: User): Promise<void> {
  await redis.set(USER_KEY(user.email), user);
}
export async function updateUser(user: User): Promise<void> {
  await redis.set(USER_KEY(user.email), user);
}

/* Challenges (10 min TTL) — pass a full key (e.g., "reg:email" or "auth:email"). */
export async function setChallenge(key: string, challenge: string): Promise<void> {
  await redis.set(CHAL_KEY(key), challenge, { ex: 600 });
}
export async function popChallenge(key: string): Promise<string | null> {
  const k = CHAL_KEY(key);
  const challenge = await redis.get<string>(k);
  if (challenge) await redis.del(k);
  return challenge ?? null;
}

/* OAuth Auth Codes (5 min TTL) */
export async function setAuthCode(code: string, data: AuthCode): Promise<void> {
  await redis.set(CODE_KEY(code), data, { ex: 300 });
}
export async function popAuthCode(code: string): Promise<AuthCode | null> {
  const k = CODE_KEY(code);
  const data = await redis.get<AuthCode>(k);
  if (data) await redis.del(k);
  return data ?? null;
}

/* Refresh tokens — store by server-generated id */
export async function setRefreshToken(id: string, rec: RefreshRecord): Promise<void> {
  const ttl = Math.max(1, rec.exp - Math.floor(Date.now()/1000));
  await redis.set(REFRESH_KEY(id), rec, { ex: ttl });
}
export async function getRefreshToken(id: string): Promise<RefreshRecord | null> {
  return (await redis.get<RefreshRecord>(REFRESH_KEY(id))) ?? null;
}
export async function deleteRefreshToken(id: string): Promise<void> {
  await redis.del(REFRESH_KEY(id));
}

/* Audit (keep last 500) */
export async function logAudit(event: AuditEvent): Promise<void> {
  const key = AUDIT_KEY(event.type);
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, 499);
}
