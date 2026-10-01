import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadDatabaseUrl() {
  const raw = readFileSync(resolve(root, ".ENV"), "utf8");
  for (const line of raw.split("\n")) {
    if (line.startsWith("DATABASE_URL=")) {
      return line.slice("DATABASE_URL=".length).trim();
    }
  }
  throw new Error("DATABASE_URL no encontrado en .ENV");
}

const client = new pg.Client({
  connectionString: loadDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(`
  create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`);
await client.query(
  `insert into public.schema_migrations (filename) values ($1) on conflict do nothing`,
  ["001_ventas_inventario.sql"]
);
await client.end();
console.log("Marcada 001 como aplicada");
