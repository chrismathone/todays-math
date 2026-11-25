import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { ScanDatabase, ScanSql } from "@/lib/concept-blank/scan/database";

/** Real migration chain, local WASM Postgres only. No DATABASE_URL or shared DB.
 * A single PGlite connection proves ordering/constraints, not physical lock contention. */
export async function openScanTestDb() {
  const pg = new PGlite();
  await pg.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);
  const root = path.join(process.cwd(), "prisma/migrations");
  for (const dir of readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort()) {
    await pg.exec(readFileSync(path.join(root, dir, "migration.sql"), "utf8"));
  }
  const bind = (client: Pick<PGlite, "query">): ScanSql => ({
    async query<T extends object>(
      sql: string,
      values: readonly unknown[] = [],
    ) {
      return (await client.query<T>(sql, [...values])).rows;
    },
  });
  const db: ScanDatabase = {
    ...bind(pg),
    transaction: (run) => pg.transaction((tx) => run(bind(tx))),
  };
  return { pg, db };
}
