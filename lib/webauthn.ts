import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { User } from "@/lib/types";

export function rpFromRequest(req: Request) {
  const url = new URL(req.url);
  let rpID = url.hostname;
  
  // For GitHub Codespaces, use the full hostname
  // For localhost, use localhost
  if (rpID === '127.0.0.1' || rpID === '::1') {
    rpID = 'localhost';
  }
  
  console.log('Using RP ID:', rpID);
  console.log('Origin:', `${url.protocol}//${url.host}`);
  
  return {
    rpID: rpID,
    origin: `${url.protocol}//${url.host}`,
    rpName: process.env.RP_NAME || "Passkeys IdP",
  };
}

export function buildRegOptions(user: User, rp: { rpID: string; rpName: string }) {
  // Convert string userId to Uint8Array
  const encoder = new TextEncoder();
  const userIDAsBuffer = encoder.encode(user.userId);
  
  return generateRegistrationOptions({
    rpID: rp.rpID,
    rpName: rp.rpName,
    userID: userIDAsBuffer,
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    attestationType: "none",
    authenticatorSelection: { 
      residentKey: "preferred", 
      userVerification: "preferred",
      authenticatorAttachment: undefined, // Allow both platform and cross-platform
    },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: (user.credentials || []).map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })),
  });
}

export function buildAuthOptions(user: User | null, rpID: string) {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: user ? user.credentials.map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })) : undefined,
    userVerification: "preferred",
  });
}

export async function verifyReg(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }) {
  return verifyRegistrationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: false,
  });
}

export async function verifyAuth(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }, pubKeyB64: string, prevCounter: number) {
  return verifyAuthenticationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    authenticator: {
      credentialID: Buffer.from(resp.rawId || resp.id, "base64url"),
      credentialPublicKey: Buffer.from(pubKeyB64, "base64url"),
      counter: prevCounter,
      transports: resp.response?.transports,
    },
    requireUserVerification: false,
  });
}
