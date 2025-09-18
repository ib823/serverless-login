import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { User } from "@/lib/types";

export function rpFromRequest(req: Request) {
  const url = new URL(req.url);
  // CRITICAL: Use actual hostname, never localhost for GitHub Codespaces
  const rpID = url.hostname;
  
  console.log('🔴 CRITICAL DEBUG - RP ID:', rpID);
  console.log('🔴 CRITICAL DEBUG - Full URL:', url.toString());
  return {
    rpID: rpID,
    origin: `${url.protocol}//${url.host}`,
    rpName: process.env.RP_NAME || "Passkeys IdP",
  };
}
export function buildRegOptions(user: User, rp: { rpID: string; rpName: string }) {
  const encoder = new TextEncoder();
  const userIDAsBuffer = encoder.encode(user.userId);
  return generateRegistrationOptions({
    rpID: rp.rpID,
    rpName: rp.rpName,
    userID: userIDAsBuffer,
    userName: user.email,
    userDisplayName: user.email.split('@')[0],
    attestationType: "direct",
    authenticatorSelection: { 
      residentKey: "required",
      userVerification: "required"
    },
    supportedAlgorithmIDs: [-7, -257],
    excludeCredentials: (user.credentials || []).map(c => ({
      id: Buffer.from(c.credId, "base64url"),
      type: "public-key" as const,
      transports: c.transports,
    })),
    timeout: 60000, // Add timeout for security
  });
export function buildAuthOptions(user: User | null, rpID: string) {
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: user ? user.credentials.map(c => ({
    })) : undefined,
    userVerification: "required",
export async function verifyReg(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }) {
  const verification = await verifyRegistrationResponse({
    response: resp,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  // Store device metadata if available
  if (verification.verified && verification.registrationInfo) {
    const { credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    console.log('Device metadata:', { credentialDeviceType, credentialBackedUp });
  }
  return verification;
export async function verifyAuth(resp: any, expectedChallenge: string, rp: { rpID: string; origin: string }, pubKeyB64: string, prevCounter: number) {
  const verification = await verifyAuthenticationResponse({
    authenticator: {
      credentialID: Buffer.from(resp.rawId || resp.id, "base64url"),
      credentialPublicKey: Buffer.from(pubKeyB64, "base64url"),
      counter: prevCounter,
      transports: resp.response?.transports,
  // Critical: Enhanced counter verification to detect cloned authenticators
  if (verification.verified && verification.authenticationInfo) {
    const { newCounter } = verification.authenticationInfo;
    
    // Only check counter if the authenticator supports it (newCounter > 0)
    // Some authenticators don't increment counters (they stay at 0)
    if (newCounter > 0 && newCounter <= prevCounter) {
      // This is a critical security event - possible cloned authenticator
      console.error('🚨 SECURITY ALERT: Counter did not increment!', {
        prevCounter,
        newCounter,
        credentialId: resp.id,
        timestamp: new Date().toISOString()
      });
      throw new Error('SECURITY_ALERT: Counter did not increment - possible cloned authenticator detected');
    }
    // Log successful counter increment for audit
    if (newCounter > prevCounter) {
      console.log('✅ Counter verified:', { prevCounter, newCounter });
