import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts
} from "@simplewebauthn/server";
import type { User } from "@/lib/types";

export function rpFromRequest(req: Request) {
  const url = new URL(req.url);
  return {
    rpID: process.env.RP_ID || url.hostname,
    origin: process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`,
    rpName: process.env.RP_NAME || "Passkeys IdP",
  };
}

export async function buildRegOptions(user: User, rp: { rpID: string; rpName: string }) {
  const opts: GenerateRegistrationOptionsOpts = {
    rpID: rp.rpID,
    rpName: rp.rpName,
    userID: user.userId,
    userName: user.email,
    attestationType: "none",
    authenticatorSelection: { 
      residentKey: "preferred", 
      userVerification: "preferred" 
    },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: (user.credentials || []).map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })),
  };
  return await generateRegistrationOptions(opts);
}

export async function buildAuthOptions(user: User | null, rpID: string) {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    allowCredentials: user ? user.credentials.map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })) : undefined,
    userVerification: "preferred",
  };
  return await generateAuthenticationOptions(opts);
}

export async function verifyReg(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }) {
  const opts: VerifyRegistrationResponseOpts = {
    response: resp,
    expectedChallenge,
    expectedOrigin: [rp.origin],
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  };
  return await verifyRegistrationResponse(opts);
}

export async function verifyAuth(
  resp: any, 
  expectedChallenge: string, 
  rp: { rpID: string; origin: string }, 
  credentialID: string,
  credentialPublicKey: Uint8Array, 
  prevCounter: number
) {
  const opts: VerifyAuthenticationResponseOpts = {
    response: resp,
    expectedChallenge,
    expectedOrigin: [rp.origin],
    expectedRPID: rp.rpID,
    authenticator: {
      credentialID: Buffer.from(credentialID, "base64url"),
      credentialPublicKey: credentialPublicKey,
      counter: prevCounter
    },
    requireUserVerification: true,
  };
  return await verifyAuthenticationResponse(opts);
}
