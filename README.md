# bordadosanserma

Sistema interno de ventas, pedidos, inventario, pagos, gastos, finanzas e insumos (**Hader**). Frontend Next.js + Supabase (sin backend propio).

## Desarrollo local

```bash
cd web
npm install
npm run dev
```

Migraciones SQL (desde la raíz del repo, con Postgres/Supabase configurado en tu máquina):

```bash
npm install
npm run db:migrate
```

## Desplegar en Netlify

1. Conecta este repositorio en [Netlify](https://app.netlify.com).
2. No hace falta configurar variables de entorno en el panel: las claves públicas de Supabase van en `web/.env.production` (incluidas en el repo a propósito para uso interno).
3. Netlify lee `netlify.toml` en la raíz: carpeta base `web`, plugin de Next.js. El build usa `web/scripts/netlify-build.sh` (instalación limpia en Linux sin lockfile de macOS, para Tailwind v4).
4. En **Site configuration → Build & deploy → Build settings**:
   - **Publish directory**: déjalo **vacío** o borra `web`. Si el log dice `publishOrigin: ui` y `publish: .../web`, el plugin Next falla. `netlify.toml` fija `publish = ".next"` (relativo a `web/`).
   - **Build command** y **Base directory**: déjalos vacíos para que mande `netlify.toml` de la raíz.
5. Tras subir cambios: **Deploys → Trigger deploy → Clear cache and deploy site**.

### Error `@tailwindcss/oxide-linux-x64-gnu` en el build

Significa que Netlify **no está usando** el script nuevo. En el log debe aparecer `bash scripts/netlify-build.sh`, no `npm install --include=optional && npm run build`. Sube a GitHub el commit con `netlify.toml` y `web/scripts/netlify-build.sh` (desde tu Terminal). `web/package-lock.json` ya no va al repo (evita el bug de npm con optional deps en macOS → Linux).

### Error «unrecognized Git contributor» (repo privado)

Netlify en plan gratuito solo permite **un** contributor en repos **privados**. Cuenta también los `Co-authored-by:` de commits viejos (p. ej. Cursor), aunque el último commit sea solo tuyo.

**Opción A — recomendada:** un solo commit limpio (desde tu Terminal, no Cursor):

```bash
git config user.email "EL_MISMO_EMAIL_QUE_GITHUB"   # ver github.com/settings/emails
chmod +x scripts/netlify-fix-contributors.sh
./scripts/netlify-fix-contributors.sh
```

**Opción B:** en Netlify → **Team settings → Members → Git contributors**, vincula el email `geiner.martinez39145@ucaldas.edu.co` (o el que uses en `git log`) con tu miembro del equipo.

**Opción C:** en GitHub → **Settings → General → Danger zone** → hacer el repo **Public** (desaparece el límite de 1 contributor en muchos casos).

Tras el deploy, la app usa la misma base de datos Supabase que en local.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `web/` | App Next.js |
| `supabase/migrations/` | Migraciones SQL |
| `scripts/` | Utilidades (`db:migrate`, test de conexión) |
