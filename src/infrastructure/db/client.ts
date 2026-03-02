import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema, logger: process.env["LOG_LEVEL"] === "debug" });

export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function ensurePgVector(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  const { existsSync } = await import("fs");
  // When bundled by esbuild into dist/index.js, import.meta.url points to the bundle.
  // Migrations are copied next to it at dist/infrastructure/db/migrations/.
  const bundleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(bundleDir, "infrastructure", "db", "migrations"),
    resolve(process.cwd(), "dist", "infrastructure", "db", "migrations"),
    resolve(process.cwd(), "src", "infrastructure", "db", "migrations"),
  ];
  const migrationsFolder = candidates.find((p) => existsSync(resolve(p, "meta", "_journal.json")));
  if (!migrationsFolder) {
    console.warn(
      `[migrations] no migrations folder found, checked:\n${candidates.map((c) => `  - ${c}`).join("\n")}`
    );
    return;
  }
  console.log(`[migrations] using ${migrationsFolder}`);
  try {
    await migrate(db, { migrationsFolder });
  } catch (err) {
    // If a migration fails (e.g. table already exists from a prior drizzle-kit push),
    // log and continue — startup should not crash due to migration errors.
    console.error("[migrations] migration error (non-fatal):", err instanceof Error ? err.message : err);
  }
}

/**
 * Ensures catalog tables exist using CREATE TABLE IF NOT EXISTS.
 * Safe to run even when migrations runner hasn't been applied yet.
 */
export async function ensureCatalogTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalogs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id text NOT NULL,
        name text NOT NULL,
        effective_date timestamp with time zone NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS catalog_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_id uuid NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
        code integer NOT NULL,
        name text NOT NULL,
        price_per_unit numeric(10, 2) NOT NULL,
        unit text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS catalog_items_catalog_id_idx ON catalog_items(catalog_id);
    `);
    console.log("[startup] catalog tables ready");
  } finally {
    client.release();
  }
}
