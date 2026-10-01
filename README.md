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
3. Netlify lee `netlify.toml` en la raíz: carpeta base `web`, plugin de Next.js.
4. En **Site configuration → Build & deploy → Build settings**:
   - **Publish directory**: **borra** el valor `web` y déjalo **vacío** (si el log dice `publishOrigin: ui` y `publish: .../web`, el deploy fallará o quedará mal).
   - **Build command** y **Base directory**: déjalos vacíos para que mande `netlify.toml` de la raíz.

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
