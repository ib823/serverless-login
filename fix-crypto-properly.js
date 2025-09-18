const fs = require('fs');
const path = require('path');

const files = [
  'lib/anomaly-detection.ts',
  'lib/csrf.ts',
  'lib/jwt.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add crypto import if not present
    if (!content.includes("import crypto from 'crypto'") && !content.includes("import * as crypto from 'crypto'")) {
      content = "import crypto from 'crypto';\n" + content;
    }
    
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
});

// Fix lib/crypto.ts if it exists
if (fs.existsSync('lib/crypto.ts')) {
  const cryptoContent = `export function getRandomValues(length: number): Uint8Array {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    return array;
  }
  // Fallback for Node.js
  const crypto = require('crypto');
  return crypto.randomBytes(length);
}
`;
  fs.writeFileSync('lib/crypto.ts', cryptoContent);
  console.log('Fixed: lib/crypto.ts');
}

console.log('All crypto imports fixed!');
