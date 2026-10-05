/** Production bank READ ONLY capture. All private bodies/assets stay outside Git. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadProblemRows } from "../../../../src/lib/textbook/server/items";
import { quickCreateSemester } from "../../../../src/lib/textbook/server/quickCreate";
import type { UnitRow } from "../../../../src/lib/textbook/server/quickCreate/context";
import type { TextbookSql } from "../../../../src/lib/textbook/server/sql";
import { classifyFormat } from "../../../../src/lib/problem/provenance";
import { DEFAULT_PROBLEM_POOL } from "../../../../src/lib/problemPool";
import { MISSING_ANSWER } from "../../../../src/lib/missingAnswer";

const hash = (v: string | Uint8Array) =>
  createHash("sha256").update(v).digest("hex");
async function main() {
  const [mainRoot, outputDirectory] = process.argv.slice(2);
  assert(mainRoot && outputDirectory);
  const output = path.resolve(outputDirectory);
  assert(
    !output
      .toLowerCase()
      .startsWith(path.resolve(process.cwd(), "..").toLowerCase() + path.sep),
  );
  // Read only specific configuration keys; never print credentials or connection errors.
  for (const name of [".env", ".env.development.local"]) {
    let env: string;
    try {
      env = await readFile(path.join(mainRoot, name), "utf8");
    } catch {
      continue;
    }
    for (const match of env.matchAll(
      /^(DATABASE_URL|DIRECT_URL|SHARED_FIGURE_CDN_BASE_URL)\s*=\s*(.*)$/gm,
    )) {
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  assert(
    process.env.DATABASE_URL,
    "Main environment lacks a database credential",
  );
  const db = new PrismaClient({
    datasources: {
      db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
    },
  });
  try {
    await mkdir(output, { recursive: true });
    const captured = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const mode = await tx.$queryRawUnsafe<Array<{ readOnly: string }>>(
          "SELECT current_setting('transaction_read_only') AS \"readOnly\"",
        );
        assert.equal(mode[0].readOnly, "on");
        const units = await tx.$queryRawUnsafe<UnitRow[]>(
          "SELECT id,grade,chapter,section,order_index AS \"orderIndex\",0::int AS \"problemCount\", problem_code_prefix AS \"problemCodePrefix\" FROM unit WHERE grade IN ('초3','초4','초5','초6','중1','중2','중3') ORDER BY order_index,id",
        );
        const sql: TextbookSql = {
          query: async <T>(text: string, params = []) =>
            tx.$queryRawUnsafe<T[]>(text, ...params),
          execute: async () => {
            throw new Error("Read-only fixture adapter rejects writes");
          },
        };
        const meta = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            unitId: string;
            content: string;
            answer: string;
            questionType: string | null;
            problemType: string;
            familyKey: string | null;
            figure: boolean;
            source: string;
            difficulty: string;
            problemCode: string;
          }>
        >(
          `SELECT id,unit_id AS "unitId",content,answer,question_type AS "questionType",problem_type::text AS "problemType",family_key AS "familyKey",(figure_svg IS NOT NULL OR cardinality(figure_urls)>0) AS figure,source::text AS source,difficulty::text AS difficulty,problem_code AS "problemCode" FROM problem WHERE pool::text=$1::text AND review_status::text='approved' AND direct_use_allowed=true AND answer<>$2::text AND unit_id IN (SELECT id FROM unit WHERE grade IN ('초3','초4','초5','초6','중1','중2','중3')) ORDER BY problem_code,id`,
          DEFAULT_PROBLEM_POOL,
          MISSING_ANSWER,
        );
        const combinations = [];
        const cache = new Map<
          string,
          {
            total: number;
            written: number;
            longestWritten: number;
            fractions: number;
            figures: number;
            longWritten: number;
          }
        >();
        for (const grade of ["초3", "초4", "초5", "초6", "중1", "중2", "중3"])
          for (const semester of [1, 2] as const) {
            const catalog = units.filter(
              (u) => u.grade === grade && quickCreateSemester(u) === semester,
            );
            const features = (id: string) => {
              const cached = cache.get(id);
              if (cached) return cached;
              const rows = meta.filter((p) => p.unitId === id);
              const result = {
                total: rows.length,
                written: rows.filter((p) => classifyFormat(p) === "descriptive")
                  .length,
                longestWritten: Math.max(
                  0,
                  ...rows
                    .filter((p) => classifyFormat(p) === "descriptive")
                    .map((p) => p.content.length),
                ),
                fractions: rows.filter((p) =>
                  /\\(?:dfrac|tfrac|frac)\b/.test(p.content),
                ).length,
                figures: rows.filter((p) => p.figure).length,
                longWritten: rows.filter(
                  (p) =>
                    classifyFormat(p) === "descriptive" &&
                    p.content.length >= 160,
                ).length,
              };
              cache.set(id, result);
              return result;
            };
            let chosen = catalog
              .filter((u) => features(u.id).total > 0)
              .slice(0, 1);
            // Pick the shortest actual contiguous range containing the three demanding features.
            let best: {
              units: UnitRow[];
              score: number;
              length: number;
            } | null = null;
            for (let start = 0; start < catalog.length; start++)
              for (
                let end = start;
                end < Math.min(start + 4, catalog.length);
                end++
              ) {
                const range = catalog.slice(start, end + 1),
                  f = range.map((u) => features(u.id));
                const score = ["fractions", "figures", "written"].filter((k) =>
                  f.some((v) => v[k as keyof typeof v] > 0),
                ).length;
                if (!f.some((v) => v.total > 0)) continue;
                if (
                  !best ||
                  score > best.score ||
                  (score === best.score && range.length < best.length)
                )
                  best = { units: range, score, length: range.length };
              }
            // G0b middle-2 semester-1 retains the U01 rational/recurring-decimal curriculum.
            if (grade === "중2" && semester === 1)
              chosen = catalog.filter(
                (u) =>
                  u.chapter === "1. 수와 식" &&
                  ["유리수와 소수", "순환소수"].includes(u.section),
              );
            else if (best) chosen = best.units;
            const chosenMeta = chosen.flatMap((u) => {
              const rows = meta.filter((p) => p.unitId === u.id);
              const wanted = new Set<string>();
              for (const predicate of [
                (p: (typeof rows)[number]) =>
                  /\\(?:dfrac|tfrac|frac)\b/.test(p.content),
                (p: (typeof rows)[number]) => p.figure,
                (p: (typeof rows)[number]) =>
                  classifyFormat(p) === "descriptive",
              ])
                for (const p of rows.filter(predicate).slice(0, 5))
                  wanted.add(p.id);
              const families = new Map<string, typeof rows>();
              for (const p of rows) {
                if (!/^(elem:|mid:)/.test(p.familyKey ?? "")) continue;
                const key = `${p.familyKey}:${p.difficulty}:${p.problemType}`;
                const peers = families.get(key) ?? [];
                peers.push(p);
                families.set(key, peers);
              }
              for (const peers of [...families.values()]
                .filter((v) => v.length >= 2)
                .slice(0, 5))
                for (const p of peers.slice(0, 2)) wanted.add(p.id);
              for (const p of rows) if (wanted.size < 30) wanted.add(p.id);
              return rows.filter((p) => wanted.has(p.id));
            });
            const problems = [
              ...(
                await loadProblemRows(
                  sql,
                  chosenMeta.map((p) => p.id),
                )
              ).values(),
            ].map((p) => ({
              ...p,
              source: chosenMeta.find((m) => m.id === p.id)!.source,
            }));
            combinations.push({
              key: `${grade}-${semester}`,
              schoolLevel: grade.startsWith("초") ? "elementary" : "middle",
              grade: Number(grade.slice(1)),
              semester,
              units: chosen,
              problems,
              catalogDescriptive: meta
                .filter(
                  (p) =>
                    catalog.some((u) => u.id === p.unitId) &&
                    classifyFormat(p) === "descriptive",
                )
                .map((p) => ({
                  id: p.id,
                  unitId: p.unitId,
                  contentLength: p.content.length,
                })),
              features: {
                written: problems
                  .filter((p) => classifyFormat(p) === "descriptive")
                  .map((p) => ({ id: p.id, contentLength: p.content.length })),
                fractions: problems
                  .filter((p) => /\\(?:dfrac|tfrac|frac)\b/.test(p.content))
                  .map((p) => p.id),
                figures: problems
                  .filter((p) => p.figureSvg || p.figureUrls.length)
                  .map((p) => p.id),
                longWritten: problems
                  .filter(
                    (p) =>
                      classifyFormat(p) === "descriptive" &&
                      p.content.length >= 160,
                  )
                  .map((p) => p.id),
              },
              catalogUnits: catalog.length,
              catalogFeatures: catalog.map((u) => ({
                unitId: u.id,
                ...features(u.id),
              })),
            });
          }
        return {
          capturedAt: new Date().toISOString(),
          transactionReadOnly: mode[0].readOnly,
          pool: DEFAULT_PROBLEM_POOL,
          combinations,
        };
      },
      { timeout: 180_000, maxWait: 30_000 },
    );
    const fixture = JSON.stringify(captured, null, 2) + "\n";
    await writeFile(
      path.join(output, "real-bank-fixtures.private.json"),
      fixture,
    );
    const summary = {
      capturedAt: captured.capturedAt,
      transactionReadOnly: captured.transactionReadOnly,
      sha256: hash(fixture),
      combinations: captured.combinations.map((c) => ({
        key: c.key,
        units: c.units.map((u) => ({
          id: u.id,
          chapter: u.chapter,
          section: u.section,
        })),
        problems: c.problems.length,
        features: Object.fromEntries(
          Object.entries(c.features).map(([k, v]) => [k, v.length]),
        ),
        featureIds: c.features,
        catalogDescriptive: c.catalogDescriptive,
        catalogUnits: c.catalogUnits,
      })),
    };
    await writeFile(
      path.join(output, "real-bank-fixtures-summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    console.info(
      JSON.stringify({
        ...summary,
        combinations: summary.combinations.map((c) => ({
          key: c.key,
          units: c.units,
          problems: c.problems,
          features: c.features,
          catalogDescriptive: c.catalogDescriptive,
          catalogUnits: c.catalogUnits,
        })),
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "failed",
      errorClass: error instanceof Error ? error.name : "unknown",
      code: (error as { code?: string }).code ?? null,
      detail:
        "Read-only bank capture failed; credentials and database message deliberately omitted",
    }),
  );
  process.exitCode = 1;
});
