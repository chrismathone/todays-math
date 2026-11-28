/** Explicit owner's baseline and source counts. Uses a READ ONLY transaction; never creates a book. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { canonicalJson } from "../../../src/lib/textbook/canonical";
import { BANK_PARTS, PLUS_OF } from "../../../src/lib/concept-blank/bank";
import { MISSING_ANSWER } from "../../../src/lib/missingAnswer";
import { DEFAULT_PROBLEM_POOL } from "../../../src/lib/problemPool";

async function main() {
  const [ownerEmail, outputDirectory] = process.argv.slice(2);
  assert(
    ownerEmail && outputDirectory,
    "An explicit owner and private output directory are required",
  );
  const db = new PrismaClient();
  try {
    const result = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const owner = await tx.user.findUnique({
          where: { email: ownerEmail },
          select: { id: true },
        });
        assert(owner, "The designated owner was not found");
        const sources = await tx.$queryRawUnsafe(
          `SELECT u.grade, u.chapter, u.section,
        count(*)::int AS total,
        count(*) FILTER (WHERE p.family_key IS NOT NULL AND btrim(p.family_key) <> '')::int AS family,
        count(*) FILTER (WHERE p.problem_type IS NOT NULL)::int AS type,
        count(*) FILTER (WHERE p.solution IS NOT NULL AND btrim(p.solution) <> '')::int AS solution
        FROM problem p JOIN unit u ON u.id=p.unit_id
        WHERE u.grade IN ('초3','초4','초5','초6','중1','중2','중3') AND p.pool::text=$1::text
          AND p.review_status::text='approved' AND p.direct_use_allowed=true AND p.answer<>$2::text
        GROUP BY u.grade,u.chapter,u.section ORDER BY u.grade,u.chapter,u.section`,
          DEFAULT_PROBLEM_POOL,
          MISSING_ANSWER,
        );
        const types = await tx.$queryRawUnsafe(
          `SELECT p.problem_type::text AS type, count(*)::int AS count
        FROM problem p JOIN unit u ON u.id=p.unit_id WHERE u.grade IN ('초3','초4','초5','초6','중1','중2','중3')
          AND p.pool::text=$1::text AND p.review_status::text='approved' AND p.direct_use_allowed=true AND p.answer<>$2::text
        GROUP BY p.problem_type ORDER BY count(*) DESC`,
          DEFAULT_PROBLEM_POOL,
          MISSING_ANSWER,
        );
        const published = await tx.textbookEdition.findMany({
          where: { userId: owner.id, status: "published" },
          select: {
            id: true,
            manifestHash: true,
            items: {
              select: {
                id: true,
                physicalPageIndex: true,
                printedPageLabel: true,
                pageColumn: true,
              },
              orderBy: { orderIndex: "asc" },
            },
            rendererVersion: true,
            templateVersion: true,
            artifacts: {
              select: {
                kind: true,
                sha256: true,
                byteSize: true,
                pageCount: true,
              },
            },
            qrTargets: { select: { id: true, url: true } },
          },
          take: 1,
          orderBy: { publishedAt: "desc" },
        });
        const draft = await tx.textbookEdition.findFirst({
          where: { userId: owner.id, status: "draft" },
          select: {
            id: true,
            sections: {
              select: { id: true, content: true },
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return { sources, types, published, draft };
      },
      { timeout: 120_000 },
    );
    await mkdir(outputDirectory, { recursive: true });
    const bytes = canonicalJson(result);
    await writeFile(
      path.join(outputDirectory, "production-baseline.private.json"),
      bytes,
    );
    const report = {
      capturedAt: new Date().toISOString(),
      sourceSections: Array.isArray(result.sources) ? result.sources.length : 0,
      sources: result.sources,
      types: result.types,
      coreConcepts: Object.entries(BANK_PARTS)
        .filter(([part]) => !PLUS_OF[part])
        .reduce((count, [, bank]) => count + bank.concepts.length, 0),
      baselineSha256: createHash("sha256").update(bytes).digest("hex"),
      publishedFound: result.published.length,
      publishedEditionId: result.published[0]?.id ?? null,
      draftEditionId: result.draft?.id ?? null,
      draftSections: result.draft?.sections.length ?? 0,
    };
    await writeFile(
      path.join(outputDirectory, "production-source-counts.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify({
        sourceSections: report.sourceSections,
        coreConcepts: report.coreConcepts,
        publishedFound: report.publishedFound,
        draftSections: report.draftSections,
        baselineSha256: report.baselineSha256,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Source proof failed");
  process.exitCode = 1;
});
