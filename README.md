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

Tras el deploy, la app usa la misma base de datos Supabase que en local.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `web/` | App Next.js |
| `supabase/migrations/` | Migraciones SQL |
| `scripts/` | Utilidades (`db:migrate`, test de conexión) |
