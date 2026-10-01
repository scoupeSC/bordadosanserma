#!/usr/bin/env bash
# Netlify (repo privado, plan free): solo 1 Git contributor.
# Los commits viejos con "Co-authored-by: Cursor" siguen contando aunque el último commit sea tuyo.
#
# Ejecuta TÚ en Terminal (no desde el agente de Cursor):
#   chmod +x scripts/netlify-fix-contributors.sh
#   ./scripts/netlify-fix-contributors.sh
#
# Antes, usa el mismo email que GitHub/Netlify reconocen:
#   GitHub → Settings → Emails (marca uno como primary o usa el noreply)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Email Git actual: $(git config user.email || echo '(no configurado)')"
echo "Debe coincidir con tu cuenta Netlify/GitHub. Si no, antes ejecuta:"
echo "  git config user.email \"TU_EMAIL_DE_GITHUB\""
echo ""
read -r -p "¿Continuar y reescribir main a UN solo commit sin co-autores? [y/N] " ans
if [[ "${ans,,}" != "y" && "${ans,,}" != "yes" && "${ans,,}" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

git checkout --orphan main-netlify-clean
git add -A
git commit -m "bordadosanserma: Hader ventas e inventario (Netlify)"
git branch -M main
echo ""
echo "Historial nuevo (debe NO tener Co-authored-by):"
git log -1
echo ""
read -r -p "¿Hacer push --force a origin main? [y/N] " ans2
if [[ "${ans2,,}" != "y" && "${ans2,,}" != "yes" && "${ans2,,}" != "s" ]]; then
  echo "Quedó solo en local. Cuando quieras: git push -f origin main"
  exit 0
fi
git push -f origin main
echo "Listo. En Netlify: Publish directory VACÍO y redeploy."
