import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const privateKey = process.env.JWT_PRIVATE_KEY_PEM || '';
const publicKey = process.env.JWT_PUBLIC_KEY_PEM || '';
export async function signSession(email: string, ttl: number): Promise<string> {
  return signJWT({ sub: email }, `${ttl}s`);
}
export async function signJWT(payload: any, expiresIn: string = '1h'): Promise<string> {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn,
    issuer: process.env.NEXT_PUBLIC_APP_URL,
    audience: process.env.NEXT_PUBLIC_APP_URL,
  });
export async function verifySession(token: string): Promise<any> {
  try {
    return jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.NEXT_PUBLIC_APP_URL,
      audience: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch {
    return null;
  }
export async function getJWKS() {
  const publicKey = process.env.JWT_PUBLIC_KEY_PEM || '';
  
  // Basic JWKS structure for RS256
  return {
    keys: [
      {
        kty: 'RSA',
        kid: process.env.JWT_KID || 'default',
        use: 'sig',
        alg: 'RS256',
        n: Buffer.from(publicKey.split('\n').slice(1, -2).join(''), 'base64').toString('base64url'),
        e: 'AQAB',
      }
    ]
  };
