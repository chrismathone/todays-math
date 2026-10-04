/** Read an explicitly selected existing draft, render locally, never publish or change the DB.
 * node --conditions=react-server --import tsx scripts/qa/textbook/saved-draft-proof.ts EDITION_ID OWNER_EMAIL OUTPUT_DIR
 * Add --capture-only to save read-only browser evidence before the renderer is ready.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { textbookExchangeSchema } from "../../../src/contracts/textbookExchange.contract";
import { assembleExchange } from "../../../src/lib/textbook/server/exchange";
import { orderedSectionIds } from "../../../src/lib/textbook/server/exchange";
import { getEditionDetail } from "../../../src/lib/textbook/server/editions";
import { getSection } from "../../../src/lib/textbook/server/sections";
import { getConcept } from "../../../src/lib/textbook/server/conceptRows";
import { verifyPdfQrPixels } from "../../../src/lib/textbook/render/qrVerify.server";
import type { TextbookSql } from "../../../src/lib/textbook/server/sql";
import { launchExportBrowser } from "../../../src/lib/export/pdfServer";
import {
  renderTextbookChunk,
  planTextbookChunks,
  mergeTextbookPdfs,
} from "../../../src/lib/textbook/render/server";

async function main() {
  const [editionId, ownerEmail, outputDirectory] = process.argv.slice(2);
  assert(
    editionId && ownerEmail && outputDirectory,
    "Edition, owner and output directory are required",
  );
  const db = new PrismaClient();
  const assets = new Map<string, Uint8Array>();
  const responses: Record<string, unknown> = {};
  const exchange = await db
    .$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const edition = await tx.textbookEdition.findFirst({
          where: {
            id: editionId,
            status: "draft",
            textbook: { user: { email: ownerEmail } },
          },
          select: {
            id: true,
            textbook: {
              select: {
                user: { select: { id: true, name: true, branchId: true } },
              },
            },
          },
        });
        assert(edition, "The selected owner's draft was not found");
        const sql: TextbookSql = {
          query: (text, params = []) => tx.$queryRawUnsafe(text, ...params),
          execute: async () => {
            throw new Error("QA database writes are disabled");
          },
        };
        const exchange = textbookExchangeSchema.parse(
          await assembleExchange(sql, editionId, {
            exportedAt: new Date().toISOString(),
          }),
        );
        const owner = edition.textbook.user;
        const actor = {
          id: owner.id,
          name: owner.name ?? "선생님",
          branchId: owner.branchId,
        };
        const base = `/api/textbook/editions/${editionId}`;
        const detail = await getEditionDetail(sql, actor, editionId);
        responses[base] = { data: detail };
        responses[`${base}/export`] = { data: exchange };
        responses["/api/textbook/books"] = { data: [detail.book] };
        for (const sectionId of await orderedSectionIds(sql, editionId))
          responses[`${base}/sections/${sectionId}`] = {
            data: await getSection(sql, actor, editionId, sectionId),
          };
        for (const concept of exchange.conceptIntegration?.concepts ?? [])
          responses[`${base}/concepts/${concept.conceptKey}`] = {
            data: await getConcept(sql, actor, editionId, concept.conceptKey),
          };
        for (const asset of exchange.assets) {
          const rows = await sql.query<{ bytes: Uint8Array }>(
            `SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1::text`,
            [asset.sha256],
          );
          assert(rows[0], "Missing frozen asset");
          assets.set(asset.assetId, new Uint8Array(rows[0].bytes));
        }
        return exchange;
      },
      { timeout: 120_000 },
    )
    .finally(() => db.$disconnect());
  const out = path.resolve(outputDirectory);
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, "browser-fixture.json"),
    JSON.stringify({
      editionId,
      responses,
      assets: exchange.assets.map((a) => ({
        id: a.assetId,
        mime: a.mimeType,
        base64: Buffer.from(assets.get(a.assetId)!).toString("base64"),
      })),
    }),
  );
  if (process.argv.includes("--capture-only")) {
    console.log(
      JSON.stringify({
        source: "read-only saved production draft",
        editionId,
        questions: exchange.items.length,
        output: out,
      }),
    );
    return;
  }
  const browser = await launchExportBrowser();
  try {
    const students = [];
    const plans = planTextbookChunks(exchange, 4);
    const counts: Record<string, number> = {};
    for (const variant of ["student", "answers"] as const) {
      const chunks = [];
      let next = exchange.config.print.firstPhysicalPageIndex;
      for (const [index, sectionIndices] of plans.entries()) {
        const result = await renderTextbookChunk({
          exchange,
          officialOrigin: "https://today.aywa.co.kr",
          readAsset: async (id) => {
            const bytes = assets.get(id);
            assert(bytes, "Missing asset");
            return bytes;
          },
          sectionIndices,
          firstPhysicalPageIndex: next,
          variant,
          mode: "draft",
          browser,
          ...(variant === "answers"
            ? { studentPages: students[index].pages }
            : {}),
        });
        chunks.push(result);
        if (variant === "student") students.push(result);
        next = result.nextPhysicalPageIndex;
        console.log(
          JSON.stringify({
            variant,
            chunk: index + 1,
            pages: result.pages.length,
            issues: result.issues,
          }),
        );
      }
      const merged = await mergeTextbookPdfs(chunks, undefined, browser);
      counts[variant] = merged.pageCount;
      await writeFile(path.join(out, `${variant}.pdf`), merged.pdf);
      if (variant === "student") {
        const selected = [1, 6, 8, 12, 20, merged.pageCount].filter(
          (n) => n <= merged.pageCount,
        );
        await verifyPdfQrPixels(browser, merged.pdf, [], merged.pageCount, {
          rasterPages: selected,
          onRaster: async (page, png) => {
            await writeFile(path.join(out, `student-page-${page}.png`), png);
          },
        });
      }
    }
    const report = {
      source: "read-only saved production draft",
      editionId,
      title: exchange.config.title,
      sections: exchange.units.reduce(
        (sum, unit) => sum + unit.sections.length,
        0,
      ),
      questions: exchange.items.length,
      concepts: exchange.conceptIntegration?.concepts.length ?? 0,
      pdfPages: counts,
      published: false,
    };
    await writeFile(
      path.join(out, "saved-draft-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify({ ...report, output: out }));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Saved draft QA failed",
  );
  if (error && Array.isArray(error.issues))
    console.error(JSON.stringify(error.issues));
  process.exitCode = 1;
});
