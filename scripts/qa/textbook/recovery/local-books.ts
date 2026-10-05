/** Actual quick-create/write/export in isolated PGlite using immutable real-bank fixtures. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { openTextbookDb } from "../../../../src/__tests__/helpers/textbookPglite";
import {
  insertTeacher,
  pgliteTextbookDb,
} from "../../../../src/__tests__/helpers/textbookServerWorld";
import { createQuickTextbook } from "../../../../src/lib/textbook/server/quickCreate";
import { conceptScriptFor } from "../../../../src/lib/textbook/conceptScripts";
import { prepareQuickCreateVisuals } from "../../../../src/lib/textbook/server/quickCreate/visuals";
import { createFigureLoader } from "../../../../src/lib/textbook/server/figureBytes";
import { assembleExchange } from "../../../../src/lib/textbook/server/exchange";
import { codexRenderer } from "../../../../src/lib/textbook/publish/codexRenderer";
import { readBlobRange } from "../../../../src/lib/textbook/server/blobs";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
  type QuickCreateInput,
} from "../../../../src/contracts/textbookQuickCreate.contract";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import {
  renderTextbookChunk,
  mergeTextbookPdfs,
} from "../../../../src/lib/textbook/render/server";
import {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "../../../../src/lib/textbook/render/versions";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import type { TextbookExchange } from "../../../../src/contracts/textbookExchange.contract";
import type { ProblemSourceRow } from "../../../../src/lib/textbook/snapshotFromProblem";
import { classifyFormat } from "../../../../src/lib/problem/provenance";
import {
  captureDomWitness,
  computedCoverage,
  normalizeRowPages,
  expectedRenderedRows,
} from "./dom-witness";
import { loadFinalDom } from "./load-final-dom";

const sha = (v: string | Uint8Array) =>
  createHash("sha256").update(v).digest("hex");
type Fixture = {
  key: string;
  schoolLevel: "elementary" | "middle";
  grade: number;
  semester: 1 | 2;
  units: {
    id: string;
    grade: string;
    chapter: string;
    section: string;
    orderIndex: number;
    problemCodePrefix: string;
  }[];
  problems: (ProblemSourceRow & { source: string })[];
};
async function main() {
  const [outputDirectory, mainRoot, only = "all", runTag = ""] =
    process.argv.slice(2);
  assert(outputDirectory && mainRoot);
  assert(!runTag || /^[A-Za-z0-9-]+$/.test(runTag));
  const fixtureDirectory = path.resolve(outputDirectory);
  const out = runTag
    ? path.join(fixtureDirectory, "runs", runTag)
    : fixtureDirectory;
  await mkdir(out, { recursive: true });
  const rendererGitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  assert(
    !out
      .toLowerCase()
      .startsWith(path.resolve(process.cwd(), "..").toLowerCase() + path.sep),
  );
  // Figure CDN configuration only; production DB credentials never enter the local writer.
  const mainEnv = await readFile(path.join(mainRoot, ".env"), "utf8");
  const cdn = /^SHARED_FIGURE_CDN_BASE_URL\s*=\s*(.*)$/m.exec(mainEnv)?.[1];
  if (cdn)
    process.env.SHARED_FIGURE_CDN_BASE_URL = cdn
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  const bytes = await readFile(
    path.join(fixtureDirectory, "real-bank-fixtures.private.json"),
  );
  const fixtures = JSON.parse(bytes.toString("utf8")) as {
    transactionReadOnly: string;
    combinations: Fixture[];
  };
  assert.equal(fixtures.transactionReadOnly, "on");
  const db = await openTextbookDb(),
    sql = pgliteTextbookDb(db),
    actor = await insertTeacher(db, { name: "Isolated actual-bank QA" });
  const browser = await launchExportBrowser();
  const summaries: unknown[] = [];
  try {
    const selectedCombinations = fixtures.combinations.filter(
      (c) => only === "all" || only.split(",").includes(c.key),
    );
    selectedCombinations.sort((a, b) => {
      const order = ["초3-1", "중2-1"];
      const rank = (key: string) =>
        order.includes(key) ? order.indexOf(key) : 100;
      return rank(a.key) - rank(b.key);
    });
    for (const fixture of selectedCombinations) {
      const folder = path.join(out, fixture.key);
      await mkdir(folder, { recursive: true });
      let activeRender: {
        variant: string;
        chunkIndex: number;
        sectionIndices: number[];
        firstPhysicalPageIndex: number;
        stage: string;
        sections: { sectionKey: string; blockIds: string[] }[];
        progress: { phase: string; elapsedMs: number }[];
      } | null = null;
      for (const u of fixture.units)
        await db.query(
          `INSERT INTO unit(id,grade,chapter,section,order_index,problem_code_prefix) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
          [
            u.id,
            u.grade,
            u.chapter,
            u.section,
            u.orderIndex,
            u.problemCodePrefix,
          ],
        );
      for (const p of fixture.problems)
        await db.query(
          `INSERT INTO problem(id,unit_id,problem_code,source,difficulty,problem_type,question_type,family_key,content,answer,solution,figure_svg,figure_urls,figure_dims,figure_source_mm,choice_figure_index,score,review_status,direct_use_allowed,pool,updated_at) VALUES($1,$2,$3,$4::problem_source,$5::difficulty,$6,$7,$8,$9,$10,$11,$12,ARRAY(SELECT jsonb_array_elements_text($13::jsonb)),ARRAY(SELECT (jsonb_array_elements_text($14::jsonb))::int),ARRAY(SELECT (jsonb_array_elements_text($15::jsonb))::float8),ARRAY(SELECT (jsonb_array_elements_text($16::jsonb))::int),$17,'approved',true,'shared',$18) ON CONFLICT(id) DO NOTHING`,
          [
            p.id,
            p.unitId,
            p.problemCode,
            p.source,
            p.difficulty,
            p.problemType,
            p.questionType,
            p.familyKey,
            p.content,
            p.answer,
            p.solution,
            p.figureSvg,
            JSON.stringify(p.figureUrls),
            JSON.stringify(p.figureDims),
            JSON.stringify(p.figureSourceMm),
            JSON.stringify(p.choiceFigureIndex),
            p.score,
            p.updatedAt,
          ],
        );
      // Typed student/reference invariants use all independently chosen activities; shortages stay explicit.
      const components = Object.fromEntries(
        Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((k) => [k, true]),
      ) as QuickCreateComponents;
      const input: QuickCreateInput = {
        requestId: randomUUID(),
        schoolLevel: fixture.schoolLevel,
        grade: fixture.grade,
        semester: fixture.semester,
        startUnitId: fixture.units[0].id,
        endUnitId: fixture.units.at(-1)!.id,
        difficulty: "standard",
        problemCountPerUnit: 30,
        includeConcepts: true,
        components,
        cast: {
          teacherId: "teacher-f2",
          student1Id: "student-f5",
          student2Id: "student-m4",
        },
        title: `${fixture.key} 실제 은행 검증`,
      };
      try {
        const result = await createQuickTextbook(sql, actor, input, {
          loadFigure: createFigureLoader(),
          prepareVisuals: prepareQuickCreateVisuals,
        });
        await writeFile(
          path.join(folder, "creation-result.private.json"),
          JSON.stringify(result, null, 2),
        );
        const editionId = result.book.draftEditionId!;
        const exchange = await assembleExchange(sql, editionId, {
          exportedAt: new Date().toISOString(),
        });
        const sourceRows = new Map(
          fixture.problems.map((problem) => [problem.id, problem]),
        );
        const actualBankSnapshots = exchange.snapshots.filter(
          (snapshot) => snapshot.source.system === "todays-math",
        );
        for (const snapshot of actualBankSnapshots) {
          assert(snapshot.source.system === "todays-math");
          const source = sourceRows.get(snapshot.source.problemId);
          assert(
            source,
            `Uncaptured real problem ${snapshot.source.problemId}`,
          );
          assert.equal(snapshot.source.problemCode, source.problemCode);
          assert.equal(snapshot.payload.content, source.content);
          assert.equal(snapshot.payload.answer, source.answer);
          assert.equal(snapshot.payload.solution, source.solution);
          assert.equal(snapshot.payload.questionType, source.questionType);
          assert.equal(snapshot.familyKey, source.familyKey);
          assert.deepEqual(snapshot.rawSource?.figureUrls, source.figureUrls);
          assert.deepEqual(snapshot.rawSource?.figureDims, source.figureDims);
          assert.deepEqual(
            snapshot.rawSource?.figureSourceMm,
            source.figureSourceMm,
          );
          assert.deepEqual(
            snapshot.rawSource?.choiceFigureIndex,
            source.choiceFigureIndex,
          );
        }
        const actualFeatures = {
          distinctActualBankSnapshots: actualBankSnapshots.length,
          actualProblemIds: actualBankSnapshots.map((snapshot) =>
            snapshot.source.system === "todays-math"
              ? snapshot.source.problemId
              : "",
          ),
          fractions: actualBankSnapshots.filter((snapshot) =>
            /\\(?:d?frac|tfrac)\b/.test(snapshot.payload.content),
          ).length,
          figures: actualBankSnapshots.filter(
            (snapshot) => snapshot.payload.figures.length > 0,
          ).length,
          descriptive: actualBankSnapshots.filter(
            (snapshot) =>
              snapshot.source.system === "todays-math" &&
              classifyFormat(sourceRows.get(snapshot.source.problemId)!) ===
                "descriptive",
          ).length,
          nonBankSnapshots:
            exchange.snapshots.length - actualBankSnapshots.length,
          learningStages: Object.fromEntries(
            [...new Set(exchange.items.map((item) => item.learningStage))].map(
              (stage) => [
                stage,
                exchange.items.filter((item) => item.learningStage === stage)
                  .length,
              ],
            ),
          ),
        };
        await writeFile(
          path.join(folder, "creation-manifest.json"),
          JSON.stringify(
            {
              key: fixture.key,
              bookId: result.book.id,
              editionId,
              rendererGitCommit,
              actualFeatures,
              sourceBankFixtureSha256: sha(bytes),
            },
            null,
            2,
          ),
        );
        const exchangeBytes = JSON.stringify(exchange, null, 2) + "\n",
          fixtureSha256 = sha(exchangeBytes);
        await writeFile(
          path.join(folder, "exchange.private.json"),
          exchangeBytes,
        );
        const readAsset = async (id: string) => {
          const asset = exchange.assets.find((a) => a.assetId === id);
          assert(asset);
          const rows = await sql.query<{ size: number }>(
            `SELECT size FROM textbook_blob WHERE sha256=$1`,
            [id],
          );
          const raw = await readBlobRange(sql, id, 0, rows[0].size);
          assert(raw);
          assert.equal(sha(raw), asset.sha256);
          return raw;
        };
        for (const a of exchange.assets) {
          const raw = await readAsset(a.assetId);
          await mkdir(path.join(folder, "assets"), { recursive: true });
          await writeFile(
            path.join(folder, "assets", path.basename(a.packagePath)),
            raw,
          );
        }
        const publisherPlan = codexRenderer.planChunks?.(exchange);
        assert(publisherPlan, "Actual publisher planner unavailable");
        const studentModel = createTextbookRenderModel(exchange, "student"),
          indices = studentModel.sections.map((_, i) => i),
          manuscriptSections = exchange.units.flatMap((unit) => unit.sections),
          studentChunks = new Map<number, TextbookPage[]>(),
          pageMap: TextbookExchange["pageMap"] = [];
        const exports = [];
        for (const variant of ["student", "answers"] as const) {
          const chunks = [],
            dom: Awaited<ReturnType<typeof captureDomWitness>> = [];
          let physical = 1;
          const model = createTextbookRenderModel(
            { ...exchange, pageMap },
            variant,
          );
          for (const [chunkIndex, sectionIndices] of publisherPlan.entries()) {
            assert(sectionIndices.length <= 4);
            assert(
              manuscriptSections
                .filter((_, i) => sectionIndices.includes(i))
                .reduce((n, s) => n + s.blocks.length, 0) <= 300,
              "Publisher-step block bound exceeded",
            );
            const started = Date.now();
            activeRender = {
              variant,
              chunkIndex,
              sectionIndices,
              firstPhysicalPageIndex: physical,
              stage: "production-render",
              sections: sectionIndices.map((index) => ({
                sectionKey: model.sections[index].sectionKey,
                blockIds: model.sections[index].blocks.map((block) => block.id),
              })),
              progress: [],
            };
            const saveProgress = () =>
              writeFileSync(
                path.join(folder, "active-render.json"),
                JSON.stringify({ rendererGitCommit, ...activeRender }, null, 2),
              );
            saveProgress();
            const chunk = await renderTextbookChunk({
              exchange: { ...exchange, pageMap },
              officialOrigin: "https://local-qa.invalid",
              readAsset,
              sectionIndices,
              firstPhysicalPageIndex: physical,
              variant,
              browser,
              mode: "draft",
              onProgress: (phase) => {
                activeRender!.progress.push({
                  phase,
                  elapsedMs: Date.now() - started,
                });
                saveProgress();
              },
              ...(variant === "answers"
                ? { studentPages: studentChunks.get(chunkIndex)! }
                : {}),
            });
            assert(chunk.pages.length <= 32);
            chunks.push({ ...chunk, html: "" });
            physical = chunk.nextPhysicalPageIndex;
            if (variant === "student") {
              studentChunks.set(chunkIndex, chunk.pages);
              pageMap.push(...chunk.pageMap);
            }
            await writeFile(
              path.join(folder, `${variant}-chunk-${chunkIndex}.html`),
              chunk.html,
            );
            await writeFile(
              path.join(folder, `${variant}-chunk-${chunkIndex}.pdf`),
              chunk.pdf,
            );
            await writeFile(
              path.join(
                folder,
                `${variant}-chunk-${chunkIndex}-placements.json`,
              ),
              JSON.stringify(
                {
                  rendererGitCommit,
                  artifactHash: chunk.artifactHash,
                  pages: chunk.pages,
                  qrPlacements: chunk.qrPlacements,
                },
                null,
                2,
              ),
            );
            activeRender.stage = "final-dom-recapture";
            saveProgress();
            const page = await browser.newPage();
            await loadFinalDom(
              page,
              chunk.html,
              path.join(
                folder,
                `${variant}-chunk-${chunkIndex}-dom-resources.json`,
              ),
            );
            dom.push(...(await captureDomWitness(page, model, chunk.pages)));
            await page.close();
            console.info(
              JSON.stringify({
                combo: fixture.key,
                variant,
                chunk: chunkIndex,
                sectionIndices,
                manuscriptBlocks: sectionIndices.reduce(
                  (sum, index) => sum + manuscriptSections[index].blocks.length,
                  0,
                ),
                pages: chunk.pages.length,
                blocks: chunk.metrics.measuredBlocks,
              }),
            );
          }
          if (activeRender) activeRender.stage = "merge-pdf";
          const merged = await mergeTextbookPdfs(
              chunks,
              128 * 1024 * 1024,
              browser,
            ),
            pdfSha256 = sha(merged.pdf);
          await writeFile(path.join(folder, `${variant}.pdf`), merged.pdf);
          const expectedRows = expectedRenderedRows(model);
          normalizeRowPages(dom);
          const coverage = computedCoverage(
            dom,
            chunks.flatMap((c) => c.pages),
            expectedRows,
            false,
          );
          await writeFile(
            path.join(folder, `${variant}-witness.json`),
            JSON.stringify(
              {
                version: 2,
                variant,
                pdfSha256,
                fixtureSha256,
                requiredFonts: ["NotoSansKR|Nanum"],
                requireEmbeddedFonts: true,
                pages: dom.map((p, i) => ({ ...p, pdfPageIndex: i + 1 })),
                coverage,
                coverageEvidence: {
                  pdfSha256,
                  expectedPages: merged.pageCount,
                  observedPages: dom.length,
                  expectedPlacedBlocks: chunks
                    .flatMap((c) => c.pages)
                    .reduce((n, p) => n + p.blocks.length, 0),
                  observedBlocks: dom.reduce(
                    (n, p) => n + p.accounting.actualBlocks,
                    0,
                  ),
                },
                expectedRows,
                projectedModel: model,
                publicExampleItemIds: exchange.items
                  .filter((i) => i.learningStage === "worked-example")
                  .map((i) => i.itemId),
                disabledActivities: Object.entries(components)
                  .filter(([, on]) => !on)
                  .map(([k]) => k),
              },
              null,
              2,
            ),
          );
          exports.push({
            variant,
            pdfSha256,
            pageCount: merged.pageCount,
            chunks: chunks.length,
            coverage,
          });
        }
        const sourceFiles = await Promise.all(
          ["e3", "e4", "e5", "e6", "m1", "m2", "m3"].map(async (grade) => ({
            file: `${grade}.json`,
            sha256: sha(
              await readFile(
                path.join(
                  process.cwd(),
                  "src/lib/textbook/scripts",
                  `${grade}.json`,
                ),
              ),
            ),
            gitSha256: sha(
              execFileSync(
                "git",
                [
                  "show",
                  `${rendererGitCommit}:src/lib/textbook/scripts/${grade}.json`,
                ],
                { maxBuffer: 64 * 1024 * 1024 },
              ),
            ),
          })),
        );
        const sourceMetadataFiles = await Promise.all(
          [
            "source-ledger.json",
            "static-corrections.json",
            "reference-v15.json",
          ].map(async (file) => {
            const raw = await readFile(
              path.join(process.cwd(), "src/lib/textbook/scripts", file),
            );
            return {
              file,
              sha256: sha(raw),
              gitSha256: sha(
                execFileSync(
                  "git",
                  [
                    "show",
                    `${rendererGitCommit}:src/lib/textbook/scripts/${file}`,
                  ],
                  { maxBuffer: 64 * 1024 * 1024 },
                ),
              ),
            };
          }),
        );
        const sourceScripts = fixture.units.map((unit) => {
          const key = `${unit.grade}::${unit.chapter}::${unit.section}`;
          const script = conceptScriptFor(key);
          assert(script, `Missing canonical script ${key}`);
          return {
            sectionKey: key,
            version: script.version,
            sha256: sha(JSON.stringify(script)),
            provenance: script.provenance,
          };
        });
        const summary = {
          key: fixture.key,
          status: "exported-checks-pending",
          sourceBankFixtureSha256: sha(bytes),
          fixtureSha256,
          bookId: result.book.id,
          editionId,
          input,
          creation: result,
          items: exchange.items.length,
          actualFeatures,
          sections: indices.length,
          publisherPlan,
          sourceMetadata:
            exchange.conceptIntegration?.concepts.map((c) => ({
              conceptKey: c.conceptKey,
              mappingVersion: c.mappingVersion,
              frozen: c.frozen
                ? {
                    parserVersion: c.frozen.parserVersion,
                    compositionVersion: c.frozen.compositionVersion,
                    mappingVersion: c.frozen.mappingVersion,
                    contentHash: c.frozen.contentHash,
                  }
                : null,
            })) ?? null,
          sourceFiles,
          sourceMetadataFiles,
          sourceScripts,
          canonicalSourceVersion: {
            scriptsTreeGitOid: execFileSync(
              "git",
              ["rev-parse", `${rendererGitCommit}:src/lib/textbook/scripts`],
              { encoding: "utf8" },
            ).trim(),
            scriptSchemaVersions: [
              ...new Set(sourceScripts.map((script) => script.version)),
            ],
          },
          rendererGitCommit,
          rendererVersion: TEXTBOOK_RENDERER_VERSION,
          templateVersion: TEXTBOOK_TEMPLATE_VERSION,
          exports,
          limits: [
            "Local PGlite automatic books from actual bank rows; no production write or real-account claim.",
            "A shortage is recorded and cannot satisfy demanding feature acceptance.",
            "AI image reading is not human or physical approval.",
          ],
        };
        await writeFile(
          path.join(folder, "export-manifest.json"),
          JSON.stringify(summary, null, 2),
        );
        summaries.push(summary);
      } catch (error) {
        const summary = {
          key: fixture.key,
          status: "failed",
          rendererGitCommit,
          sourceBankFixtureSha256: sha(bytes),
          errorClass: error instanceof Error ? error.name : "unknown",
          message: error instanceof Error ? error.message : String(error),
          details:
            (error as { issues?: unknown; details?: unknown }).issues ??
            (error as { details?: unknown }).details ??
            null,
          activeRender,
        };
        await writeFile(
          path.join(folder, "failure.json"),
          JSON.stringify(summary, null, 2),
        );
        summaries.push(summary);
        console.error(JSON.stringify(summary));
      }
      await writeFile(
        path.join(out, "automatic-summary.json"),
        JSON.stringify(summaries, null, 2),
      );
    }
  } finally {
    await browser.close().catch(async (error) => {
      browser.process()?.kill();
      await browser.disconnect();
      console.error(
        JSON.stringify({
          phase: "browser-cleanup",
          errorClass: error instanceof Error ? error.name : "unknown",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    });
    const dump = new Uint8Array(
      await (await db.dumpDataDir("gzip")).arrayBuffer(),
    );
    await writeFile(path.join(out, "local-pglite.tar.gz"), dump);
    await writeFile(
      path.join(out, "local-pglite-manifest.json"),
      JSON.stringify(
        {
          sha256: sha(dump),
          bytes: dump.length,
          sourceBankFixtureSha256: sha(bytes),
          books: summaries,
        },
        null,
        2,
      ),
    );
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
