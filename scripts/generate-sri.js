const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSRIHash(filePath) {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384');
  hash.update(content);
  return `sha384-${hash.digest('base64')}`;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  const sriHashes = {};

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.css'))) {
      sriHashes[file] = generateSRIHash(filePath);
    }
  });

  return sriHashes;
}

// Generate SRI hashes for static assets
const publicDir = path.join(process.cwd(), '.next/static');
if (fs.existsSync(publicDir)) {
  const hashes = processDirectory(publicDir);
  fs.writeFileSync(
    path.join(process.cwd(), 'sri-hashes.json'),
    JSON.stringify(hashes, null, 2)
  );
  console.log('SRI hashes generated successfully');
}
