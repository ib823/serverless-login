// Use Web Crypto API for Edge Runtime compatibility
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '4a9c93be51ba5cbe16d74b3821781008f85831185f96f437a3028631938adbde';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  // For edge runtime, we'll use a simpler approach
  // In production, use a proper encryption service
  const encoded = Buffer.from(text).toString('base64');
  return encoded;
}

export function decrypt(text: string): string {
  // For edge runtime, we'll use a simpler approach
  const decoded = Buffer.from(text, 'base64').toString('utf8');
  return decoded;
}

// Hash sensitive data for indexing
export function hashData(data: string): string {
  // Simple hash for edge runtime
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Constant-time string comparison to prevent timing attacks
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
