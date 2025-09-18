export function getRandomValues(length: number): Uint8Array {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    return array;
  }
  // Fallback for Node.js
  const crypto = require('crypto');
  return crypto.randomBytes(length);
}
