import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "supabase/migrations");

function loadDatabaseUrl() {
  const raw = readFileSync(resolve(root, ".ENV"), "utf8");
  for (const line of raw.split("\n")) {
    if (line.startsWith("DATABASE_URL=")) {
      return line.slice("DATABASE_URL=".length).trim();
    }
  }
  throw new Error("DATABASE_URL no encontrado en .ENV");
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

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

const applied = new Set(
  (
    await client.query("select filename from public.schema_migrations")
  ).rows.map((r) => r.filename)
);

for (const file of files) {
  if (applied.has(file)) {
    console.log(`Omitido (ya aplicado): ${file}`);
    continue;
  }
  const sql = readFileSync(resolve(migrationsDir, file), "utf8");
  console.log(`Aplicando ${file}...`);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public.schema_migrations (filename) values ($1)",
      [file]
    );
    await client.query("commit");
    console.log(`OK: ${file}`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

await client.end();
