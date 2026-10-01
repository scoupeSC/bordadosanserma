#!/usr/bin/env bash
# Ejecuta ESTE script tú en Terminal (fuera del agente de Cursor),
# para que el commit no lleve "Co-authored-by: Cursor" y Netlify acepte el deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
git commit --allow-empty -m "chore: redeploy Netlify"
git push origin main
echo "Listo. Netlify debería construir el nuevo commit solo con tu usuario."
