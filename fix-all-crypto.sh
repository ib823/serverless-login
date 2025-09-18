#!/bin/bash

echo "Fixing all crypto imports..."

# Fix all files that use crypto but don't import it
for file in $(grep -r "crypto\." lib/ app/ --include="*.ts" -l); do
  if ! grep -q "^import.*crypto" "$file"; then
    echo "Fixing crypto import in: $file"
    sed -i "1i import crypto from 'crypto';" "$file"
  fi
done

# Remove duplicate imports
for file in $(find lib app -name "*.ts"); do
  # Remove duplicate crypto imports
  awk '!seen[$0]++' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

echo "Done fixing crypto imports"
