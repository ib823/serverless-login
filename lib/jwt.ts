import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const privateKey = process.env.JWT_PRIVATE_KEY_PEM!.replace(/\\n/g, '\n');
const publicKey = process.env.JWT_PUBLIC_KEY_PEM!.replace(/\\n/g, '\n');

export async function signJWT(payload: Record<string, any>, expiresIn = '1h'): Promise<string> {
  const key = await importPKCS8(privateKey, 'RS256');
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'main' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(uuidv4())
    .sign(key);
}

export async function verifyJWT(token: string): Promise<any> {
  const key = await importSPKI(publicKey, 'RS256');
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export function getJWKS() {
  return {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'main',
        alg: 'RS256',
        n: extractModulus(publicKey),
        e: 'AQAB'
      }
    ]
  };
}

function extractModulus(pem: string): string {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\n/g, '');
  const binary = Buffer.from(b64, 'base64');
  const mod = binary.slice(-257, -1);
  return Buffer.from(mod).toString('base64url');
}
