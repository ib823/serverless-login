const fs = require('fs');

// Fix credentials/[id]/route.ts
const credIdRoute = fs.readFileSync('app/api/credentials/[id]/route.ts', 'utf8');
if (!credIdRoute.trim().endsWith('}')) {
  fs.writeFileSync('app/api/credentials/[id]/route.ts', credIdRoute + '\n  return NextResponse.json({ success: true });\n}\n');
}

// Fix credentials/route.ts  
const credRoute = fs.readFileSync('app/api/credentials/route.ts', 'utf8');
if (credRoute.includes('return NextResponse.json(credentials);') && !credRoute.includes('}\n}')) {
  fs.writeFileSync('app/api/credentials/route.ts', credRoute + '\n}\n');
}

// Fix metrics/route.ts
const metricsRoute = fs.readFileSync('app/api/metrics/route.ts', 'utf8');
if (!metricsRoute.trim().endsWith('}')) {
  fs.writeFileSync('app/api/metrics/route.ts', metricsRoute + '\n}\n');
}

// Fix oauth/refresh/route.ts - add missing closing brace
let refreshRoute = fs.readFileSync('app/api/oauth/refresh/route.ts', 'utf8');
refreshRoute = refreshRoute.replace(
  '  return NextResponse.json(',
  '  });\n  return NextResponse.json('
);
fs.writeFileSync('app/api/oauth/refresh/route.ts', refreshRoute);

// Fix oauth/token/route.ts - add missing closing brace
let tokenRoute = fs.readFileSync('app/api/oauth/token/route.ts', 'utf8');
tokenRoute = tokenRoute.replace(
  '  return NextResponse.json(',
  '  });\n  return NextResponse.json('
);
fs.writeFileSync('app/api/oauth/token/route.ts', tokenRoute);

console.log('Syntax fixed!');
