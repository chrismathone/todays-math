import { describe, expect, it } from "vitest";
import { db } from "./harness";
describe("exact additive ontology SQL", () => {
 it("protects every new table with RLS and no direct browser-role privileges", async () => {
  const tables = await db.$queryRaw<{ name: string; rls: boolean; anon_read: boolean; browser_write: boolean }[]>`SELECT c.relname as name, c.relrowsecurity as rls, has_table_privilege('anon',c.oid,'SELECT') as anon_read, has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') as browser_write FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'ontology_%' ORDER BY c.relname`;
  expect(tables).toHaveLength(14);
  expect(tables.every(t => t.rls && !t.anon_read && !t.browser_write)).toBe(true);
 });
 it("the browser role cannot read private proposal bytes even when the table is empty", async () => {
  await expect(db.$transaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL ROLE anon"); return tx.ontologyProposal.findMany(); })).rejects.toThrow();
 });
});
