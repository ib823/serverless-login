import { Redis } from '@upstash/redis';
import type { User, AuthCode, RefreshRecord, AuditEvent } from './types';

// Use in-memory store for development if Redis not configured
class InMemoryStore {
  private store = new Map<string, any>();

  async get(key: string) {
    const item = this.store.get(key);
    if (item && item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item?.value || null;
  }

  async set(key: string, value: any, options?: { ex?: number }) {
    const item: any = { value };
    if (options?.ex) {
      item.expires = Date.now() + (options.ex * 1000);
    }
    this.store.set(key, item);
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async keys(pattern: string) {
    return Array.from(this.store.keys()).filter(k => k.includes(pattern.replace('*', '')));
  }

  async llen(key: string) {
    const value = this.store.get(key)?.value;
    return Array.isArray(value) ? value.length : 0;
  }

  async lpush(key: string, value: any) {
    const list = this.store.get(key)?.value || [];
    list.unshift(value);
    this.store.set(key, { value: list });
  }

  async ltrim(key: string, start: number, stop: number) {
    const list = this.store.get(key)?.value || [];
    this.store.set(key, { value: list.slice(start, stop + 1) });
  }

  async expire(key: string, seconds: number) {
    const item = this.store.get(key);
    if (item) {
      item.expires = Date.now() + (seconds * 1000);
    }
  }
}

let redis: Redis | InMemoryStore;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  console.warn('⚠️ Using in-memory store. Configure UPSTASH_* for production.');
  redis = new InMemoryStore();
}

export { redis };

const USER_KEY = (email: string) => `user:${email.toLowerCase()}`;
const CHAL_KEY = (k: string) => `challenge:${k}`;
const CODE_KEY = (code: string) => `authcode:${code}`;
const REFRESH_KEY = (id: string) => `refresh:${id}`;
const AUDIT_KEY = (t: string) => `audit:${t}`;

export async function getUser(email: string): Promise<User | null> {
  return await redis.get(USER_KEY(email));
}

export async function createUser(user: User): Promise<User> {
  await redis.set(USER_KEY(user.email), user);
  return user;
}

export async function updateUser(user: User): Promise<void> {
  await redis.set(USER_KEY(user.email), user);
}

export async function setChallenge(key: string, challenge: string): Promise<void> {
  await redis.set(CHAL_KEY(key), challenge, { ex: 600 });
}

export async function popChallenge(key: string): Promise<string | null> {
  const k = CHAL_KEY(key);
  const challenge = await redis.get<string>(k);
  if (challenge) await redis.del(k);
  return challenge;
}

export async function setAuthCode(code: string, data: AuthCode): Promise<void> {
  await redis.set(CODE_KEY(code), data, { ex: 300 });
}

export async function popAuthCode(code: string): Promise<AuthCode | null> {
  const k = CODE_KEY(code);
  const data = await redis.get<AuthCode>(k);
  if (data) await redis.del(k);
  return data;
}

export async function setRefreshToken(id: string, rec: RefreshRecord): Promise<void> {
  const ttl = Math.max(1, rec.exp - Math.floor(Date.now()/1000));
  await redis.set(REFRESH_KEY(id), rec, { ex: ttl });
}

export async function getRefreshToken(id: string): Promise<RefreshRecord | null> {
  return await redis.get(REFRESH_KEY(id));
}

export async function deleteRefreshToken(id: string): Promise<void> {
  await redis.del(REFRESH_KEY(id));
}

export async function logAudit(event: AuditEvent): Promise<void> {
  const key = AUDIT_KEY(event.type);
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, 499);
}
