// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import ts from "typescript";
import { bindPrismaPglite, prismaPgParameter } from "../helpers/prismaPglite";
import { lockScanUsage } from "@/lib/concept-blank/scan/usageDatabase";
const pg = new PGlite();
const db = bindPrismaPglite(pg);
afterAll(() => pg.close());
it("sends Prisma 6 parameter OIDs instead of asking SQL context to infer them", async () => {
  const cases: [unknown, string][] = [
    ["bdf54749-e09e-4cd6-827a-d015bfe085c1", "text"],
    [1, "bigint"],
    [BigInt(1), "bigint"],
    [1.25, "numeric"],
    [new Prisma.Decimal("1.25"), "numeric"],
    [true, "boolean"],
    [{ a: 1 }, "jsonb"],
    [new Date(), "timestamp with time zone"],
    [Buffer.from("x"), "bytea"],
    [["a", "b"], "text[]"],
    [[1, 2], "bigint[]"],
    [[{ a: 1 }], "jsonb[]"],
    [[true], "boolean[]"],
  ];
  for (const [value, type] of cases)
    expect(
      await db.query("SELECT pg_typeof($1)::text AS type", [value]),
    ).toEqual([{ type }]);
  expect(
    [null, undefined, [], [1, "a"], [[1]]].map((v) => prismaPgParameter(v).oid),
  ).toEqual([705, 705, 705, 705, 705]);
  expect(prismaPgParameter([null, null]).oid).toBe(1007);
  expect(await db.query("SELECT $1::uuid AS id", [null])).toEqual([
    { id: null },
  ]);
});
it("reproduces uuid=text and rejects void metadata even when no rows return", async () => {
  const id = "bdf54749-e09e-4cd6-827a-d015bfe085c1";
  await expect(
    db.query(`SELECT 1 WHERE '${id}'::uuid=$1`, [id]),
  ).rejects.toMatchObject({ code: "42883" });
  expect(
    await db.query(`SELECT 1 AS ok WHERE '${id}'::uuid=$1::uuid`, [id]),
  ).toEqual([{ ok: 1 }]);
  await expect(db.query("SELECT pg_advisory_xact_lock(1)")).rejects.toThrow(
    "column of type 'void'",
  );
  await expect(
    db.query("SELECT pg_advisory_xact_lock(1) WHERE false"),
  ).rejects.toThrow("column of type 'void'");
  expect(await lockScanUsage(db)).toEqual([{ locked: 1 }]);
});
it("requires explicit casts at every SQL parameter occurrence across the scan service", () => {
  const root = "src/lib/concept-blank/scan";
  const missing: string[] = [];
  for (const file of readdirSync(root).filter(
    (f) => f.endsWith(".ts") && !f.startsWith("."),
  )) {
    const source = readFileSync(`${root}/${file}`, "utf8");
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)
      ) {
        const sql = node.getText(tree);
        if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/.test(sql))
          for (const match of sql.matchAll(/\$\d+(?!\d|::)/g))
            missing.push(`${file}: ${match[0]} in ${sql}`);
        return;
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  expect(missing).toEqual([]);
});
