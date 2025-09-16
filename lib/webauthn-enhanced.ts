import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { User } from "@/lib/types";
import crypto from 'crypto';

const TRUSTED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? [process.env.NEXT_PUBLIC_APP_URL!]
  : ['http://localhost:3000', 'https://localhost:3000'];

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'Passkeys IdP';

// Verify origin against allowlist
function verifyOrigin(origin: string): boolean {
  return TRUSTED_ORIGINS.includes(origin);
}

export function rpFromRequest(req: Request) {
  const origin = req.headers.get('origin') || '';
  
  if (!verifyOrigin(origin)) {
    throw new Error('Invalid origin');
  }
  
  return {
    rpID: RP_ID,
    origin: origin,
    rpName: RP_NAME,
  };
}

export function buildRegOptions(user: User, rp: { rpID: string; rpName: string }) {
  return generateRegistrationOptions({
    rpID: rp.rpID,
    rpName: rp.rpName,
    userID: user.userId,
    userName: user.email,
    attestationType: "direct", // Changed from "none" for better security
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required", // Changed from "preferred"
      authenticatorAttachment: "platform", // Restrict to platform authenticators
      requireResidentKey: false,
    },
    supportedAlgorithmIDs: [-7, -257, -8], // Added EdDSA
    excludeCredentials: (user.credentials || []).map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })),
    timeout: 60000,
    extensions: {
      credProps: true,
      minPinLength: true,
    },
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
    userVerification: "required", // Changed from "preferred"
    timeout: 60000,
  });
}

export async function verifyReg(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }) {
  const verification = await verifyRegistrationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: [rp.origin],
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  });

  // Verify attestation if present
  if (verification.verified && resp.response?.attestationObject) {
    // Add attestation verification logic here
    // You can use libraries like @fidosecurity/fido2-lib for detailed attestation validation
  }

  return verification;
}

export async function verifyAuth(
  resp: any,
  expectedChallenge: string,
  rp: { rpID: string; origin: string },
  pubKeyB64: string,
  prevCounter: number
) {
  const verification = await verifyAuthenticationResponse({
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

  // Check counter increment
  if (verification.verified && verification.authenticationInfo.newCounter <= prevCounter) {
    throw new Error('Authenticator counter did not increment - possible cloned authenticator');
  }

  return verification;
}
