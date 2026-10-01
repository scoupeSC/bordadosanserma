import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, ".ENV"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } =
  env;

async function testRest(label, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return { label, ok: res.ok, status: res.status };
}

async function testDb() {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return { ok: false, error: "pg no instalado (npm install pg)" };
  }
  const client = new pg.default.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const r = await client.query("SELECT current_database() AS db, now() AS ts");
    await client.end();
    return { ok: true, row: r.rows[0] };
  } catch (e) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return { ok: false, error: e.message };
  }
}

console.log("=== Supabase REST (anon) ===");
console.log(await testRest("anon", SUPABASE_ANON_KEY));
console.log("=== Supabase REST (service_role) ===");
console.log(await testRest("service", SUPABASE_SERVICE_ROLE_KEY));
console.log("=== PostgreSQL (DATABASE_URL) ===");
console.log(await testDb());
