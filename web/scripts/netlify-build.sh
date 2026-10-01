#!/usr/bin/env bash
# Instalación limpia en Linux: el package-lock generado en macOS hace que npm
# omita @tailwindcss/oxide-linux-* y lightningcss-linux-* (npm/cli#4828).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Node $(node -v) / npm $(npm -v) on $(uname -s)-$(uname -m)"

rm -rf node_modules
rm -f package-lock.json

echo "==> npm install (sin lockfile; resuelve bins nativos de esta plataforma)"
npm install --no-audit --no-fund

if [ "$(uname -s)" = "Linux" ]; then
  echo "==> Instalar bins Linux (no confiar en optional deps del lockfile de macOS)"
  npm install \
    "@tailwindcss/oxide-linux-x64-gnu@4.3.3" \
    "lightningcss-linux-x64-gnu@1.32.0" \
    --no-audit --no-fund --no-save --force

  echo "==> Verificar bins nativos Tailwind v4 (linux x64 gnu)"
  node <<'NODE'
const oxide = "@tailwindcss/oxide-linux-x64-gnu";
const lightning = "lightningcss-linux-x64-gnu";
for (const pkg of [oxide, lightning]) {
  try {
    require(pkg);
    console.log("  OK", pkg);
  } catch (e) {
    console.error("  FALTA", pkg, e.message);
    process.exit(1);
  }
}
NODE
fi

echo "==> next build"
npm run build
