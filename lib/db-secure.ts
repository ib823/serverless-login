import { Redis } from '@upstash/redis';
import type { User, AuthCode, RefreshRecord, AuditEvent } from './types';
import { encrypt, decrypt, hashData } from './crypto';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Encrypted user storage
const USER_KEY = (email: string) => `user:${hashData(email.toLowerCase())}`;
const CHAL_KEY = (k: string) => `challenge:${k}`;
const CODE_KEY = (code: string) => `authcode:${code}`;
const REFRESH_KEY = (id: string) => `refresh:${id}`;
const AUDIT_KEY = (t: string) => `audit:${t}`;
const SESSION_KEY = (sid: string) => `session:${sid}`;

export async function getUser(email: string): Promise<User | null> {
  const encryptedUser = await redis.get<string>(USER_KEY(email));
  if (!encryptedUser) return null;
  
  try {
    const decrypted = decrypt(encryptedUser);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export async function createUser(user: User): Promise<void> {
  const encrypted = encrypt(JSON.stringify(user));
  await redis.set(USER_KEY(user.email), encrypted);
}

export async function updateUser(user: User): Promise<void> {
  const encrypted = encrypt(JSON.stringify(user));
  await redis.set(USER_KEY(user.email), encrypted);
}

// Anti-replay mechanism for challenges
export async function setChallenge(key: string, challenge: string): Promise<void> {
  const challengeData = {
    challenge,
    timestamp: Date.now(),
    used: false,
  };
  await redis.set(CHAL_KEY(key), JSON.stringify(challengeData), { ex: 300 }); // 5 min TTL
}

export async function popChallenge(key: string): Promise<string | null> {
  const k = CHAL_KEY(key);
  const data = await redis.get<string>(k);
  if (!data) return null;

  const challengeData = JSON.parse(data);
  
  // Check if already used
  if (challengeData.used) {
    // Log potential replay attack
    await logAudit({
      type: 'replay_attack_detected',
      sub: key,
      timestamp: Date.now(),
      ip: '',
    });
    return null;
  }

  // Check timestamp (prevent old challenges)
  if (Date.now() - challengeData.timestamp > 300000) { // 5 minutes
    await redis.del(k);
    return null;
  }

  // Mark as used before deleting
  challengeData.used = true;
  await redis.set(k, JSON.stringify(challengeData), { ex: 10 });
  
  return challengeData.challenge;
}

// Session management with device fingerprinting
export async function createSession(
  userId: string,
  deviceFingerprint: string
): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    userId,
    deviceFingerprint,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  
  await redis.set(
    SESSION_KEY(sessionId),
    encrypt(JSON.stringify(sessionData)),
    { ex: 3600 }
  );
  
  return sessionId;
}

export async function validateSession(
  sessionId: string,
  deviceFingerprint: string
): Promise<boolean> {
  const encryptedData = await redis.get<string>(SESSION_KEY(sessionId));
  if (!encryptedData) return false;
  
  try {
    const sessionData = JSON.parse(decrypt(encryptedData));
    
    // Validate device fingerprint
    if (sessionData.deviceFingerprint !== deviceFingerprint) {
      await logAudit({
        type: 'session_hijack_attempt',
        sub: sessionData.userId,
        timestamp: Date.now(),
        ip: '',
      });
      return false;
    }
    
    // Update last activity
    sessionData.lastActivity = Date.now();
    await redis.set(
      SESSION_KEY(sessionId),
      encrypt(JSON.stringify(sessionData)),
      { ex: 3600 }
    );
    
    return true;
  } catch {
    return false;
  }
}

// Enhanced audit logging with encryption
export async function logAudit(event: AuditEvent): Promise<void> {
  const key = AUDIT_KEY(event.type);
  const encryptedEvent = encrypt(JSON.stringify({
    ...event,
    timestamp: Date.now(),
    hash: hashData(JSON.stringify(event)),
  }));
  
  await redis.lpush(key, encryptedEvent);
  await redis.ltrim(key, 0, 999); // Keep last 1000
  await redis.expire(key, 2592000); // 30 days retention
}
