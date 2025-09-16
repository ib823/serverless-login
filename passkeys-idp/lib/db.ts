import type { User, AuthCode, RefreshRecord, AuditEvent } from './types';

interface KVStore {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  ping(): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  ltrim(key: string, start: number, stop: number): Promise<void>;
}

class InMemoryStore implements KVStore {
  private data = new Map<string, any>();
  private ttlTimers = new Map<string, NodeJS.Timeout>();

  async get<T = any>(key: string): Promise<T | null> {
    const value = this.data.get(key);
    return value ?? null;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    this.data.set(key, value);
    if (options?.ex) {
      const existingTimer = this.ttlTimers.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        this.data.delete(key);
        this.ttlTimers.delete(key);
      }, options.ex * 1000);
      this.ttlTimers.set(key, timer);
    }
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  async ping(): Promise<void> {
    return;
  }

  async lpush(key: string, value: string): Promise<void> {
    const list = this.data.get(key) || [];
    list.unshift(value);
    this.data.set(key, list);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const list = this.data.get(key) || [];
    this.data.set(key, list.slice(start, stop + 1));
  }
}

let redis: KVStore;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }) as KVStore;
} else {
  console.warn('⚠️  Using in-memory store for development. Configure UPSTASH_* for production.');
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
