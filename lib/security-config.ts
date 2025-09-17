export const SECURITY_CONFIG = {
  webauthn: {
    rpID: process.env.RP_ID || 'localhost',
    rpName: process.env.RP_NAME || 'Passkeys IdP',
    userVerification: 'required' as const,
  },
  session: {
    recentAuthWindow: 300, // 5 minutes
  },
};
