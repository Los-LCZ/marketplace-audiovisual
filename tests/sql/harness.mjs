// Banco de pruebas SQL: aplica todas las migraciones sobre PGlite (Postgres en WASM) con
// stubs mínimos de Supabase (roles, auth.uid(), auth.role(), storage) y expone helpers
// para actuar como distintos usuarios. Se ejecuta con `npm run test:sql`.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

for (const ev of ["uncaughtException", "unhandledRejection"]) {
  process.on(ev, (e) => {
    console.log(`CRASH: ${e?.message ?? e}${e?.where ? ` [${e.where}]` : ""}`);
    process.exit(1);
  });
}

const STUBS = `
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
do $$ begin
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select string_to_array(name, '/') $$;
`;

export async function setup(repoDir = REPO_ROOT) {
  const db = await PGlite.create({ extensions: { btree_gist, pg_trgm, pgcrypto } });
  await db.exec(STUBS);
  const dir = join(repoDir, "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"))
    .sort((a, b) => (a === "init.sql" ? -1 : b === "init.sql" ? 1 : a.localeCompare(b)));
  for (const f of files) {
    try {
      // Cada archivo en una sola transacción implícita, como el SQL Editor de Supabase.
      await db.exec(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      console.log(`FAIL ${f}: ${e.message}`);
      throw e;
    }
  }
  return db;
}

// Ejecuta `sql` como un usuario (uid) o como anon (uid null) o service_role.
export async function as(db, who, sql, params = []) {
  const role = who === "service" ? "service_role" : who ? "authenticated" : "anon";
  const sub = who && who !== "service" ? who : "";
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false);
    select set_config('request.jwt.claim.role', '${role}', false); set role ${role};`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    // Vuelve al contexto "SQL Editor" (sin JWT) para los db.exec que siguen.
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);
      select set_config('request.jwt.claim.role', '', false);`);
  }
}

export async function expectError(promise, pattern, label) {
  try {
    await promise;
    console.log(`FAIL ${label}: se esperaba error ~ ${pattern}`);
    process.exitCode = 1;
  } catch (e) {
    if (new RegExp(pattern, "i").test(e.message)) console.log(`ok   ${label} (${e.message})`);
    else { console.log(`FAIL ${label}: error inesperado: ${e.message}`); process.exitCode = 1; }
  }
}

export function check(cond, label, detail = "") {
  if (cond) console.log(`ok   ${label}`);
  else { console.log(`FAIL ${label} ${detail}`); process.exitCode = 1; }
}
