import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ref = readFileSync(resolve(root, ".ENV"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("SUPABASE_PROJECT_REF="))
  ?.split("=")[1]
  ?.trim();

const password = readFileSync(resolve(root, ".ENV"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="))
  ?.split("=")
  .slice(1)
  .join("=")
  .match(/postgres(?:\.[^:]*)?:(.+?)@/)?.[1];

const hosts = [
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-us-east-2.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-us-west-2.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com",
];

for (const host of hosts) {
  for (const port of [6543, 5432]) {
    const user = `postgres.${ref}`;
    const client = new pg.Client({
      host,
      port,
      user,
      password: decodeURIComponent(password ?? ""),
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      const r = await client.query("SELECT 1 AS ok");
      await client.end();
      console.log(JSON.stringify({ ok: true, host, port, user, row: r.rows[0] }));
      process.exit(0);
    } catch (e) {
      const msg = e.message?.slice(0, 120) ?? String(e);
      if (!msg.includes("ENOTFOUND") && !msg.includes("timeout")) {
        console.log(JSON.stringify({ host, port, hint: msg }));
      }
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
}
console.log(JSON.stringify({ ok: false, message: "No pooler host matched" }));
