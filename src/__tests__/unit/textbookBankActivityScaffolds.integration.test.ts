// @vitest-environment node
/** Opt-in real export path; synthetic books, canonical bank rows, no DB access.
 * TEXTBOOK_BANK_ACTIVITY_PDF_QA=1 TEXTBOOK_BANK_ACTIVITY_EVIDENCE_DIR=... npx vitest run ...
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
} from "@/contracts/textbookQuickCreate.contract";
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import { bank as e3 } from "@/lib/concept-blank/bank/e3";
import { bank as m2 } from "@/lib/concept-blank/bank/m2";
import { canonicalJson } from "@/lib/textbook/canonical";
import { conceptMemoryRows } from "@/lib/textbook/conceptRows";
import { additionalConceptActivities } from "@/lib/textbook/server/quickCreateRecovery";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  renderTextbookChunk,
  planTextbookChunks,
} from "@/lib/textbook/render/server";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { SYNTHETIC_ORIGIN, textbookFixture } from "../helpers/textbookFixture";

const output =
  process.env.TEXTBOOK_BANK_ACTIVITY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-bank-activity-scaffolds");
const sha = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const off = Object.fromEntries(
  Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, false]),
) as QuickCreateComponents;

describe.skipIf(process.env.TEXTBOOK_BANK_ACTIVITY_PDF_QA !== "1")(
  "bounded bank activities through the real renderer",
  () => {
    let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
    beforeAll(async () => {
      browser = await launchExportBrowser();
      await mkdir(output, { recursive: true });
    }, 120_000);
    afterAll(async () => {
      await browser?.close();
    }, 60_000);

    it.each([
      ["E3", e3, "elementary", 3],
      ["M2", m2, "middle", 2],
    ] as const)(
      "exports and measures every selected %s activity in student and answers PDFs",
      async (name, bank, schoolLevel, grade) => {
        // A real canonical section crossing the four-card boundary. Selection is
        // deterministic; no problem/answer substitutes or authored relationships.
        const groups = [
          ...Map.groupBy(bank.concepts, (entry) => entry.section).entries(),
        ];
        const [sectionKey, entries] =
          groups.find(([, list]) => list.length === 5) ??
          groups.find(([, list]) => list.length > 4)!;
        expect(entries.length).toBeGreaterThan(4);
        const exchange = textbookFixture(1, 0);
        Object.assign(exchange.config, {
          schoolLevel,
          grade,
          displayCode: `SYNTHETIC-${name}-ACTIVITIES`,
          title: `${name} 합성 활동 검증`,
        });
        exchange.config.print.coverMode = "separate";
        exchange.units[0].title = sectionKey.split("::")[1];
        const section = exchange.units[0].sections[0];
        section.title = sectionKey.split("::")[2];
        section.templateKey = "auto-lesson";
        section.startPolicy = "continue";
        section.blocks = additionalConceptActivities({
          entries,
          sectionKey,
          conceptKey: `${name}.concept`,
          components: {
            ...off,
            conceptBlankTest: true,
            explainActivity: true,
            conceptMap: true,
          },
        });
        const frozen = canonicalJson(exchange);
        textbookExchangeSchema.parse(exchange);
        expect(planTextbookChunks(exchange)).toEqual([[0]]);
        expect(section.blocks.length).toBeLessThanOrEqual(300);
        const manifest: unknown[] = [];
        const studentPages: Awaited<
          ReturnType<typeof renderTextbookChunk>
        >["pages"] = [];
        for (const variant of ["student", "answers"] as const) {
          const model = createTextbookRenderModel(exchange, variant);
          expect(model.sections[0].blocks.length).toBeLessThanOrEqual(600);
          const rendered = await renderTextbookChunk({
            exchange,
            browser,
            variant,
            mode: "draft",
            sectionIndices: [0],
            firstPhysicalPageIndex: 1,
            officialOrigin: SYNTHETIC_ORIGIN,
            maxPages: 32,
            readAsset: async () => {
              throw new Error(
                "Synthetic activity books have no external assets",
              );
            },
            ...(variant === "answers" ? { studentPages } : {}),
          });
          if (variant === "student") studentPages.push(...rendered.pages);
          const pdf = await PDFDocument.load(rendered.pdf);
          expect(pdf.getPageCount()).toBe(rendered.pages.length);
          expect(rendered.pages.length).toBeLessThanOrEqual(32);
          const page = await browser.newPage();
          try {
            await page.emulateMediaType("print");
            await page.setContent(rendered.html, { waitUntil: "load" });
            await page.evaluate(() => document.fonts.ready);
            const geometry = await page.evaluate(() => {
              const scale = 25.4 / 96;
              const rect = (element: Element) => {
                const box = element.getBoundingClientRect();
                return {
                  x: box.x * scale,
                  y: box.y * scale,
                  width: box.width * scale,
                  height: box.height * scale,
                };
              };
              const clipping: string[] = [];
              for (const card of document.querySelectorAll<HTMLElement>(
                ".tb-bank-map-card",
              )) {
                const parent = card.getBoundingClientRect();
                for (const child of card.querySelectorAll<HTMLElement>(
                  "strong,.tb-bank-rules",
                )) {
                  const box = child.getBoundingClientRect();
                  if (
                    box.left < parent.left - 1 ||
                    box.right > parent.right + 1 ||
                    box.top < parent.top - 1 ||
                    box.bottom > parent.bottom + 1
                  )
                    clipping.push(card.dataset.rowKey ?? "empty-slot");
                }
              }
              return {
                fontsLoaded:
                  document.fonts.check(
                    "400 13px TextbookPretendard",
                    "가나다",
                  ) &&
                  document.fonts.check("700 13px TextbookPretendard", "가나다"),
                sheets: Array.from(document.querySelectorAll(".tb-paper")).map(
                  (sheet) => ({
                    activities: sheet.querySelectorAll("[data-bank-activity]")
                      .length,
                    ...rect(sheet),
                  }),
                ),
                activities: Array.from(
                  document.querySelectorAll<HTMLElement>(
                    "[data-bank-activity]",
                  ),
                ).map((activity) => ({
                  kind: activity.dataset.bankActivity,
                  rowCount: Number(activity.dataset.canonicalRowCount),
                  ...rect(activity),
                })),
                rules: Array.from(
                  document.querySelectorAll<HTMLElement>(".tb-bank-rule"),
                ).map((rule) => ({
                  ...rect(rule),
                  borderMm:
                    parseFloat(getComputedStyle(rule).borderBottomWidth) *
                    scale,
                })),
                mapGroups: Array.from(
                  document.querySelectorAll(".tb-bank-map-canvas"),
                ).map((canvas) => ({
                  cards: canvas.querySelectorAll(".tb-bank-map-card").length,
                  rowKeys: Array.from(
                    canvas.querySelectorAll<HTMLElement>("[data-row-key]"),
                  ).map((card) => card.dataset.rowKey),
                })),
                oralRowKeys: Array.from(
                  document.querySelectorAll<HTMLElement>(".tb-bank-oral-task"),
                ).map((task) => task.dataset.rowKey),
                clipping,
              };
            });
            expect(geometry.fontsLoaded).toBe(true);
            expect(geometry.clipping).toEqual([]);
            expect(geometry.activities).toHaveLength(section.blocks.length);
            expect(geometry.sheets.every((sheet) => sheet.activities > 0)).toBe(
              true,
            );
            for (const rule of geometry.rules) {
              expect(rule.height).toBeCloseTo(7, 1);
              expect(rule.borderMm).toBeGreaterThanOrEqual(0.2);
              expect(rule.borderMm).toBeLessThanOrEqual(0.35);
            }
            expect(geometry.mapGroups.every((group) => group.cards === 4)).toBe(
              true,
            );
            const keys = conceptMemoryRows(entries).map((row) => row.rowKey);
            expect(
              geometry.mapGroups.flatMap((group) => group.rowKeys),
            ).toEqual(keys);
            expect(geometry.oralRowKeys).toEqual(keys);
            for (const activity of [
              "conceptBlankTest",
              "explainActivity",
              "conceptMap",
            ])
              expect(
                geometry.activities
                  .filter((block) => block.kind === activity)
                  .reduce((sum, block) => sum + block.rowCount, 0),
              ).toBe(entries.length);
            await writeFile(
              path.join(output, `${name}-${variant}.pdf`),
              rendered.pdf,
            );
            await writeFile(
              path.join(output, `${name}-${variant}.html`),
              rendered.html,
            );
            await writeFile(
              path.join(output, `${name}-${variant}-geometry.json`),
              JSON.stringify(geometry, null, 2),
            );
            manifest.push({
              name,
              variant,
              sectionKey,
              canonicalTerms: entries.length,
              rowSha256: sha(canonicalJson(conceptMemoryRows(entries))),
              pdfSha256: sha(rendered.pdf),
              htmlSha256: sha(rendered.html),
              pages: rendered.pages.length,
              manuscriptBlocks: section.blocks.length,
              projectedBlocks: model.sections[0].blocks.length,
              rules: geometry.rules.length,
              mapGroups: geometry.mapGroups.length,
              clipping: geometry.clipping.length,
            });
          } finally {
            await page.close();
          }
        }
        expect(canonicalJson(exchange)).toBe(frozen);
        await writeFile(path.join(output, `${name}-fixture.json`), frozen);
        await writeFile(
          path.join(output, `${name}-manifest.json`),
          JSON.stringify(manifest, null, 2),
        );
        console.info(JSON.stringify(manifest));
        // A durable exact hash identifies each immutable bank file used by this run.
        await writeFile(
          path.join(output, `${name}-source-hash.txt`),
          sha(
            await readFile(
              path.join(
                process.cwd(),
                `src/lib/concept-blank/bank/${name.toLowerCase()}.ts`,
              ),
            ),
          ),
        );
      },
      120_000,
    );
  },
);
