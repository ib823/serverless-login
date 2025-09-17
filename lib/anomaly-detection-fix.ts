export async function generateFingerprint(headers: any): Promise<string> {
  const data = JSON.stringify(headers);
  
  // Use Web Crypto API for edge runtime compatibility
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data_bytes = encoder.encode(data);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data_bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for Node.js
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}
