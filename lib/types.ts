export interface User {
  userId: string;
  email: string;
  credentials: Credential[];
  createdAt: number;
}

export interface Credential {
  credId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  credentialDeviceType?: "singleDevice" | "multiDevice";
  credentialBackedUp?: boolean;
  friendlyName?: string;
  createdAt?: number;
  lastUsedAt?: number;
}

export interface AuthCode {
  sub: string;
  code_challenge: string;
  code_challenge_method: string;
  client_id: string;
  redirect_uri: string;
}

export interface RefreshRecord {
  sub: string;
  rot: string;
  exp: number;
}

export interface AuditEvent {
  type: string;
  sub: string;
  timestamp: number;
  ip: string;
  details?: string;
}
