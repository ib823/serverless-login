import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { User } from "@/lib/types";

export function rpFromRequest(req: Request){
  const url = new URL(req.url);
  return {
    rpID: url.hostname,
    origin: `${url.protocol}//${url.host}`,
    rpName: process.env.RP_NAME || "Passkeys IdP",
  };
}

export function buildRegOptions(user: User, rp: { rpID:string; rpName:string }){
  return generateRegistrationOptions({
    rpID: rp.rpID,
    rpName: rp.rpName,
    userID: user.userId,
    userName: user.email,
    attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: (user.credentials || []).map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })),
  });
}

export function buildAuthOptions(user: User | null, rpID: string){
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

export async function verifyReg(resp: any, expectedChallenge: string, rp: { rpID:string; origin:string }){
  return verifyRegistrationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: [rp.origin],
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  });
}

export async function verifyAuth(resp: any, expectedChallenge: string, rp: { rpID:string; origin:string }, pubKeyB64: string, prevCounter: number){
  return verifyAuthenticationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: [rp.origin],
    expectedRPID: rp.rpID,
    authenticator: {
      credentialID: Buffer.from(resp.rawId || resp.id, "base64url"),
      credentialPublicKey: Buffer.from(pubKeyB64, "base64url"),
      counter: prevCounter,
      transports: resp.response?.transports,
    },
    requireUserVerification: true,
  });
}
