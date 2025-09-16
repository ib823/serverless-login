import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { redis } from './db-secure';

interface KeyPair {
  kid: string;
  privateKey: string;
  publicKey: string;
  createdAt: number;
  expiresAt: number;
}

// Key rotation management
export async function getCurrentKeyPair(): Promise<KeyPair> {
  const currentKey = await redis.get<KeyPair>('jwt:current-key');
  
  if (!currentKey || Date.now() > currentKey.expiresAt) {
    return await rotateKeys();
  }
  
  return currentKey;
}

export async function rotateKeys(): Promise<KeyPair> {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const kid = crypto.randomBytes(16).toString('hex');
  const keyPair: KeyPair = {
    kid,
    privateKey,
    publicKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Store current as previous
  const current = await redis.get<KeyPair>('jwt:current-key');
  if (current) {
    await redis.set('jwt:previous-key', current, { ex: 86400 }); // Keep for 1 day
  }

  await redis.set('jwt:current-key', keyPair);
  
  return keyPair;
}

export async function signJWT(payload: any, expiresIn: string = '1h'): Promise<string> {
  const keyPair = await getCurrentKeyPair();
  
  return jwt.sign(payload, keyPair.privateKey, {
    algorithm: 'RS256',
    expiresIn,
    keyid: keyPair.kid,
    issuer: process.env.NEXT_PUBLIC_APP_URL,
    audience: process.env.NEXT_PUBLIC_APP_URL,
    jwtid: crypto.randomBytes(16).toString('hex'),
  });
}

export async function verifyJWT(token: string): Promise<any> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token');
  }

  const kid = decoded.header.kid;
  
  // Try current key
  const currentKey = await redis.get<KeyPair>('jwt:current-key');
  if (currentKey && currentKey.kid === kid) {
    return jwt.verify(token, currentKey.publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.NEXT_PUBLIC_APP_URL,
      audience: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  // Try previous key (for rotation period)
  const previousKey = await redis.get<KeyPair>('jwt:previous-key');
  if (previousKey && previousKey.kid === kid) {
    return jwt.verify(token, previousKey.publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.NEXT_PUBLIC_APP_URL,
      audience: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  throw new Error('Unknown key ID');
}

// Token revocation list
export async function revokeToken(jti: string): Promise<void> {
  await redis.set(`revoked:${jti}`, true, { ex: 86400 });
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const revoked = await redis.get(`revoked:${jti}`);
  return !!revoked;
}
