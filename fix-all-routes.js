const fs = require('fs');
const path = require('path');

// Function to fix audit calls
function fixAuditCalls(content) {
  // Fix 4-parameter audit calls to 3-parameter
  return content.replace(
    /await audit\('([^']+)',\s*([^,]+),\s*([^,]+),\s*\{[^}]*\}\);/g,
    "await audit('$1', $2, $3);"
  );
}

// Function to ensure imports
function ensureImports(content, filePath) {
  const requiredImports = {
    'audit': "import { audit } from '@/lib/audit';",
    'webauthnRL|oauthRL|credentialsRL|metricsRL': "import { webauthnRL, oauthRL, credentialsRL, metricsRL } from '@/lib/rl';",
  };
  
  let updatedContent = content;
  
  // Check each required import
  for (const [pattern, importStatement] of Object.entries(requiredImports)) {
    if (content.match(new RegExp(pattern)) && !content.includes(importStatement)) {
      // Add import after other imports
      const importMatch = content.match(/^import .* from .*/m);
      if (importMatch) {
        const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
        updatedContent = content.slice(0, lastImportIndex) + '\n' + importStatement + content.slice(lastImportIndex);
      }
    }
  }
  
  return updatedContent;
}

// Process all route files
function processRouteFiles() {
  const apiDir = path.join(__dirname, 'app', 'api');
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file === 'route.ts') {
        console.log(`Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix audit calls
        content = fixAuditCalls(content);
        
        // Ensure imports
        content = ensureImports(content, filePath);
        
        fs.writeFileSync(filePath, content);
        console.log(`✓ Fixed: ${filePath}`);
      }
    });
  }
  
  walkDir(apiDir);
}

processRouteFiles();
console.log('\n✅ All route files processed!');
