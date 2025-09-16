#!/bin/bash

echo "🔒 Running Security Audit..."

# Check for vulnerabilities
echo "📦 Checking npm packages..."
npm audit

# Check for exposed secrets
echo "🔑 Checking for exposed secrets..."
if [ -f .env.local ]; then
  echo "⚠️ WARNING: .env.local file exists - ensure it's in .gitignore"
fi

# Check dependencies
echo "📊 Checking dependency licenses..."
npx license-checker --production --summary

# Check for outdated packages
echo "📅 Checking for outdated packages..."
npx npm-check-updates

# OWASP dependency check
echo "🛡️ Running OWASP dependency check..."
npx owasp-dependency-check --project "Passkeys IdP" --scan .

echo "✅ Security check complete!"
