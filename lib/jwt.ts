import { SignJWT, importPKCS8, importSPKI, jwtVerify, generateKeyPair, exportJWK, type JWK } from "jose";

let _priv: CryptoKey | null = null;
let _pub: CryptoKey | null = null;
let _jwks: { keys: JWK[] } | null = null;

async function ensureKeys(){
  if (_priv && _pub && _jwks) return;
  const privPem = process.env.JWT_PRIVATE_KEY_PEM;
  const pubPem  = process.env.JWT_PUBLIC_KEY_PEM;
  if (privPem && pubPem){
    const priv = privPem.replace(/\\n/g, "\n");
    const pub  = pubPem.replace(/\\n/g, "\n");
    _priv = await importPKCS8(priv, "RS256");
    _pub  = await importSPKI(pub, "RS256");
    const jwk = await exportJWK(_pub); jwk.use="sig"; jwk.alg="RS256"; jwk.kid="main";
    _jwks = { keys:[jwk] };
  } else {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    _priv = privateKey; _pub = publicKey;
    const jwk = await exportJWK(_pub); jwk.use="sig"; jwk.alg="RS256"; jwk.kid="ephemeral";
    _jwks = { keys:[jwk] };
  }
}

export async function signSession(sub: string, ttlSec=3600){
  await ensureKeys();
  const now = Math.floor(Date.now()/1000);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg:"RS256", kid:_jwks!.keys[0].kid })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSec)
    .sign(_priv!);
}

export async function verifySession(token: string){
  await ensureKeys();
  try{ const { payload } = await jwtVerify(token, _pub!); return payload; } catch { return null; }
}

export async function getJWKS(){ await ensureKeys(); return _jwks!; }
