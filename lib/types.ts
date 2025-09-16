export type User = {
  userId: string;
  email: string;
  credentials: Credential[];
  createdAt: number;
};

export type Credential = {
  credId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  credentialDeviceType?: "singleDevice" | "multiDevice";
  credentialBackedUp?: boolean;
  friendlyName?: string;
  createdAt?: number;
  lastUsedAt?: number;
};

export type AuthCode = {
  sub: string;
  code_challenge: string;
  code_challenge_method: "S256";
  client_id: string;
  redirect_uri: string;
};

export type RefreshRecord = {
  sub: string;
  rot: string;
  exp: number;
};

export type AuditEvent = {
  type: string;
  timestamp: number;
  sub?: string;
  ip?: string;
  details?: Record<string, any>;
};
