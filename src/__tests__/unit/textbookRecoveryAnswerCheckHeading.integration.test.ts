// @vitest-environment node
/**
 * The converted original pages 14–16, whose «CHECK» subheading was left alone at the foot of an
 * answer page while its questions opened the next one, in real Chromium.
 *
 *   TEXTBOOK_PDF_TEST=1 TEXTBOOK_ANSWER_CHECK_HEADING_RUN_DIR=<private source run folder> \
 *     node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts \
 *     src/__tests__/unit/textbookRecoveryAnswerCheckHeading.integration.test.ts
 *
 * The run folder is the private output of the source run that showed the defect:
 * `exchange-semantic.json`, `source-map.json` with its assets, the student chunk pages and the
 * answer placements it printed. Nothing of it is in the repository. This check writes PDFs and
 * a record of sizes and identifiers into TEXTBOOK_RECOVERY_EVIDENCE_DIR (a private folder) —
 * never manuscript, question or answer text. Without the run folder the suite is skipped.
 *
 * TEXTBOOK_ANSWER_CHECK_HEADING_PIN_FROZEN=1 requires the student pages to retain their exact
 * placements. Answer pages may grow to keep CHECK with its questions and reserve the printed
 * source guide; their identifiers, fragments, styles and student references remain conserved.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
/** What the real renderer measured and handed to the paginator, per call. */
const paginated: Array<{
  sections: readonly RenderSection[];
  measurements: readonly BlockMeasurement[];
}> = [];
vi.mock("@/lib/textbook/layout/paginate", async (original) => {
  const actual =
    await original<typeof import("@/lib/textbook/layout/paginate")>();
  return {
    ...actual,
    paginateTextbookSections: (
      ...args: Parameters<typeof actual.paginateTextbookSections>
    ) => {
      paginated.push({ sections: args[0], measurements: args[1] });
      return actual.paginateTextbookSections(...args);
    },
  };
});
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import {
  A4,
  type BlockMeasurement,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import {
  inlineBundleCss,
  loadTextbookLocalBundle,
} from "@/lib/textbook/render/bundle.server";
import {
  measurementHtml,
  textbookHtmlDocument,
} from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type RenderSection,
  type TextbookVariant,
} from "@/lib/textbook/render/model";
import { renderTextbookChunk } from "@/lib/textbook/render/server";

const RUN = process.env.TEXTBOOK_ANSWER_CHECK_HEADING_RUN_DIR ?? "";
const run =
  process.env.TEXTBOOK_PDF_TEST === "1" &&
  !!RUN &&
  existsSync(path.join(RUN, "exchange-semantic.json")) &&
  existsSync(path.join(RUN, "new-u01-semantic-student-chunks.json"));
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-answer-check-heading");
const PIN = process.env.TEXTBOOK_ANSWER_CHECK_HEADING_PIN_FROZEN === "1";
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
/** The two chunks of four sections that hold the three pages, as the source run rendered them. */
const CHUNKS = [
  { index: 1, offset: 4, studentFrom: 12 },
  { index: 2, offset: 8, studentFrom: 16 },
];
/** The distance pagination puts between two blocks of a native concept page. */
const GAP = 2.6;

type Problem = Extract<RenderBlock, { kind: "problem" }>;
const fragmentsOf = (block: RenderBlock | undefined) =>
  block?.semantic?.node?.kind === "fragments"
    ? block.semantic.node.fragments
    : [];
const closes = (block: RenderBlock | undefined) =>
  fragmentsOf(block)
    .at(-1)
    ?.attributes?.className?.split(/\s+/)
    .includes("subheading") ?? false;

describe.skipIf(!run)(
  "the check subheading of the converted original pages, in the answer book",
  () => {
    let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
    let css: { font: string; katex: string };
    beforeAll(async () => {
      const bundle = await loadTextbookLocalBundle();
      css = {
        font: inlineBundleCss(bundle.fontCss, bundle.resources),
        katex: inlineBundleCss(bundle.katexCss, bundle.resources),
      };
      browser = await launchExportBrowser();
      mkdirSync(OUT, { recursive: true });
    }, 120_000);
    afterAll(async () => {
      await browser?.close();
    }, 60_000);

    function load() {
      const exchangeBytes = readFileSync(
        path.join(RUN, "exchange-semantic.json"),
      );
      const exchange = textbookExchangeSchema.parse(
        JSON.parse(exchangeBytes.toString("utf8")),
      );
      const sourceMap = JSON.parse(
        readFileSync(path.join(RUN, "source-map.json"), "utf8"),
      ) as { assetFiles: Record<string, string> };
      const bytesOf = (assetId: string) => {
        const asset = exchange.assets.find((a) => a.assetId === assetId);
        const file = sourceMap.assetFiles[assetId];
        if (!asset || !file)
          throw new Error(`Missing private asset ${assetId}`);
        const bytes = readFileSync(path.join(RUN, file));
        if (sha256(bytes) !== asset.sha256)
          throw new Error(`Private asset changed ${assetId}`);
        return { asset, bytes };
      };
      const studentChunks = new Map(
        (
          JSON.parse(
            readFileSync(
              path.join(RUN, "new-u01-semantic-student-chunks.json"),
              "utf8",
            ),
          ) as { chunks: Array<[number, TextbookPage[]]> }
        ).chunks,
      );
      const frozenAnswers = (index: number) =>
        (
          JSON.parse(
            readFileSync(
              path.join(
                RUN,
                "new-u01-semantic-answers",
                `chunk-${index}-placements.json`,
              ),
              "utf8",
            ),
          ) as { pages: TextbookPage[] }
        ).pages;
      const student = createTextbookRenderModel(exchange, "student");
      const selected = student.sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.unitKey === "U01")
        .map(({ index }) => index);
      return {
        exchange,
        exchangeSha256: sha256(exchangeBytes),
        student,
        selected,
        studentChunks,
        frozenAnswers,
        renderedAnswerPages: new Map<number, TextbookPage[]>(),
        resources: {
          assetUrl: (assetId: string) => {
            const { asset, bytes } = bytesOf(assetId);
            return `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
          },
          qrDataUrl: () => "data:image/png;base64,",
          editorialAssetUrl: () => "data:image/png;base64,",
        },
        readAsset: async (assetId: string) =>
          new Uint8Array(bytesOf(assetId).bytes),
      };
    }
    type Data = ReturnType<typeof load>;

    /** A chunk through the production renderer, with the sizes it measured. */
    async function render(
      data: Data,
      variant: TextbookVariant,
      chunk: (typeof CHUNKS)[number],
    ) {
      const before = paginated.length;
      const previous = data.renderedAnswerPages.get(chunk.index - 1);
      if (variant === "answers" && chunk.index !== CHUNKS[0].index)
        expect(previous?.length).toBeGreaterThan(0);
      const answerFrom = previous
        ? previous[previous.length - 1].physicalPageIndex + 1
        : data.frozenAnswers(chunk.index)[0].physicalPageIndex;
      const result = await renderTextbookChunk({
        exchange: data.exchange,
        officialOrigin: "https://reference-qa.invalid",
        readAsset: data.readAsset,
        sectionIndices: data.selected.slice(chunk.offset, chunk.offset + 4),
        firstPhysicalPageIndex:
          variant === "answers" ? answerFrom : chunk.studentFrom,
        variant,
        browser,
        mode: "draft",
        ...(variant === "answers"
          ? { studentPages: data.studentChunks.get(chunk.offset)! }
          : {}),
      });
      expect(paginated.length).toBe(before + 1);
      if (variant === "answers")
        data.renderedAnswerPages.set(chunk.index, result.pages);
      return { chunk: result, ...paginated[before] };
    }

    /** What a document prints of the pages or blocks that hold a check subheading. */
    async function readPages(html: string) {
      const page = await browser.newPage();
      try {
        await page.emulateMediaType("print");
        await page.evaluate("globalThis.__name = (fn) => fn");
        await page.setContent(html, { waitUntil: "load", timeout: 120_000 });
        return await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map((i) => i.decode()));
          const mm = 25.4 / 96;
          const style = (el: Element, pseudo?: string) => {
            const computed = getComputedStyle(el, pseudo);
            return Object.fromEntries(
              [
                "display",
                "font-size",
                "margin-top",
                "padding-bottom",
                "border-bottom-width",
                "content",
                "background-color",
                "color",
              ].map((name) => [name, computed.getPropertyValue(name)]),
            );
          };
          return Array.from(
            document.querySelectorAll<HTMLElement>(
              "[data-textbook-page],[data-measure-id]",
            ),
          ).map((root) => {
            const origin = root.getBoundingClientRect();
            const box = (el: Element) => {
              const r = el.getBoundingClientRect();
              return {
                left: (r.left - origin.left) * mm,
                top: (r.top - origin.top) * mm,
                right: (r.right - origin.left) * mm,
                bottom: (r.bottom - origin.top) * mm,
              };
            };
            const blocks = root.matches("[data-measure-id]")
              ? [root]
              : Array.from(
                  root.querySelectorAll<HTMLElement>("[data-block-id]"),
                );
            return {
              page: root.dataset.textbookPage
                ? Number(root.dataset.textbookPage)
                : null,
              footers: root.querySelectorAll(".tb-source-page-footer").length,
              blocks: blocks.map((el) => {
                const fragments = el.querySelector<HTMLElement>(
                  ".tb-source-fragments",
                );
                const answer = el.querySelector(".tb-answer h4");
                return {
                  id: (el.dataset.blockId ?? el.dataset.measureId)!,
                  itemId: el.dataset.itemId ?? null,
                  continuation: el.classList.contains("tb-continuation"),
                  box: box(el),
                  text: el.textContent ?? "",
                  formulas: el.querySelectorAll(".katex").length,
                  images: el.querySelectorAll("img").length,
                  answerHead: answer?.textContent ?? null,
                  // The direct children of the authored container, in order.
                  children: fragments
                    ? Array.from(fragments.children).map((child) => ({
                        className: child.getAttribute("class") ?? "",
                        box: box(child),
                      }))
                    : [],
                };
              }),
              checks: Array.from(
                root.querySelectorAll<HTMLElement>(
                  ".tb-source-fragments .subheading",
                ),
              ).map((el) => {
                const title = el.querySelector("h2")!;
                return {
                  blockId: (
                    el.closest<HTMLElement>("[data-block-id]") ??
                    el.closest<HTMLElement>("[data-measure-id]")!
                  ).dataset[
                    el.closest("[data-block-id]") ? "blockId" : "measureId"
                  ]!,
                  box: box(el),
                  style: style(el),
                  titleStyle: style(title),
                  chip: style(title, "::before"),
                  text: title.textContent ?? "",
                };
              }),
            };
          });
        });
      } finally {
        await page.close();
      }
    }

    it("was left behind by the unsplit block, and now stands above its questions", async () => {
      const data = load();
      const answers = [];
      for (const chunk of CHUNKS)
        answers.push(await render(data, "answers", chunk));
      const pages = answers.flatMap(({ chunk }) => chunk.pages);
      const frozen = CHUNKS.flatMap(({ index }) => data.frozenAnswers(index));
      const size = new Map(
        answers.flatMap(({ measurements }) =>
          measurements.map((m) => [m.blockId, m.heightMm] as const),
        ),
      );
      const sections = answers.flatMap(({ sections }) => sections);
      expect(sections.map((s) => s.sectionKey)).toEqual(
        CHUNKS.flatMap(({ offset }) =>
          data.selected
            .slice(offset, offset + 4)
            .map((i) => data.student.sections[i].sectionKey),
        ),
      );
      const records = [];
      const leftMm = (page: TextbookPage) =>
        page.physicalPageIndex % 2 === 0
          ? data.exchange.config.print.outerMarginMm
          : data.exchange.config.print.innerMarginMm;
      const untouched = new Set(frozen.map((page) => page.sectionKey));
      for (const section of sections) {
        const unsplit = data.student.sections.find(
          (s) => s.sectionKey === section.sectionKey,
        )!;
        const authored = unsplit.blocks.find(closes);
        if (!authored) continue;
        untouched.delete(section.sectionKey);
        // The projection: the body, then the subheading alone, then the questions as they were.
        const at = section.blocks.findIndex((b) => b.id === authored.id);
        const [body, check, ...rest] = section.blocks.slice(at);
        expect(check.id).toBe(`${authored.id}.subheading`);
        expect(check.sourceBlockId).toBe(authored.id);
        expect(check.keepWithNext).toBe(true);
        expect(body.keepWithNext).toBeUndefined();
        const all = fragmentsOf(authored);
        expect(fragmentsOf(body)).toHaveLength(all.length - 1);
        fragmentsOf(body).forEach((fragment, i) =>
          expect(fragment).toBe(all[i]),
        );
        expect(fragmentsOf(check)).toHaveLength(1);
        expect(fragmentsOf(check)[0]).toBe(all.at(-1));
        expect(body.semantic?.sourceFooter).toBe(
          authored.semantic?.sourceFooter,
        );
        expect(check.semantic?.sourceFooter).toBeUndefined();
        expect(authored.keepWithNext).toBeUndefined();
        const questions = rest as Problem[];
        expect(questions.map((q) => [q.kind, q.id])).toEqual(
          unsplit.blocks
            .slice(unsplit.blocks.indexOf(authored) + 1)
            .map((q) => ["problem", q.id]),
        );
        expect(questions.length).toBeGreaterThanOrEqual(2);

        // What the run printed: the whole body in one block.
        const was = frozen.filter((p) => p.sectionKey === section.sectionKey);
        const whole = was[0].blocks.find((p) => p.blockId === authored.id)!;
        const heading = was[0].blocks[0];
        const bodyMm = size.get(body.id)!;
        const checkMm = size.get(check.id)!;
        const rowMm = Math.max(
          size.get(questions[0].id)!,
          size.get(questions[1].id)!,
        );
        // Body, 2.6 mm and subheading are the block they were cut from, to the hundredth each
        // of the two is rounded up to.
        const cut = bodyMm + GAP + checkMm - whole.heightMm;
        expect(cut).toBeGreaterThanOrEqual(-0.011);
        expect(cut).toBeLessThanOrEqual(0.021);
        // Historical placements are evidence of the old 277 mm boundary, not an oracle
        // for the current paginator's source-guide reservation.
        const orphaned = was.length === 2;
        if (orphaned) {
          expect(was[0].blocks.map((p) => p.blockId)).toEqual([
            heading.blockId,
            authored.id,
          ]);
          expect(was[1].blocks.every((p) => p.blockId !== authored.id)).toBe(
            true,
          );
          expect(whole.yMm + whole.heightMm + GAP + rowMm).toBeGreaterThan(
            A4.bodyBottomMm,
          );
        }

        // Now: the subheading and its questions share a page above any printed guide.
        const now = pages.filter((p) => p.sectionKey === section.sectionKey);
        const last = now[now.length - 1];
        const placedCheck = last.blocks.find((p) => p.blockId === check.id)!;
        const row = last.blocks.filter((p) => p.itemId);
        expect(row.map((p) => p.blockId)).toEqual(
          questions.slice(0, 2).map((q) => q.id),
        );
        expect(placedCheck.continuation).toBeUndefined();
        expect(row[0].yMm).toBeCloseTo(
          placedCheck.yMm + placedCheck.heightMm + GAP,
          6,
        );
        expect(row[0].heightMm).toBe(rowMm);
        expect(
          now.flatMap((p) => p.blocks).filter((p) => p.blockId === check.id),
        ).toHaveLength(1);
        const placedBody = now[0].blocks.find((p) => p.blockId === body.id)!;
        // A moved answer section uses its actual page's inner/outer margin.
        // Its vertical position and width still match the preserved source body.
        expect(whole.xMm).toBe(leftMm(was[0]));
        expect(placedBody.xMm).toBe(leftMm(now[0]));
        expect([placedBody.yMm, placedBody.widthMm]).toEqual([
          whole.yMm,
          whole.widthMm,
        ]);
        expect(now[0].blocks[0]).toEqual({
          ...heading,
          xMm: leftMm(now[0]),
        });
        const wasRow = was[was.length - 1].blocks.filter((p) => p.itemId);
        let moved: number | null = null;
        const movedToContinuation =
          last.physicalPageIndex !== now[0].physicalPageIndex;
        if (movedToContinuation) {
          // Page one ends with the body; page two opens with the subheading under the heading.
          expect(now[0].blocks.map((p) => p.blockId)).toEqual([
            heading.blockId,
            body.id,
          ]);
          expect(
            last.blocks.map((p) => [p.blockId, p.continuation ?? false]),
          ).toEqual([
            [heading.blockId, true],
            [check.id, false],
            ...row.map((p) => [p.blockId, false]),
          ]);
          expect(placedCheck.yMm).toBeCloseTo(
            last.blocks[0].yMm + last.blocks[0].heightMm + A4.gapMm,
            6,
          );
          expect(placedCheck.xMm).toBe(last.blocks[0].xMm);
        } else {
          // Everything stayed on its page: the questions stand where they stood, to the
          // hundredths the two blocks are rounded by.
          expect(last.blocks.map((p) => p.blockId)).toEqual([
            heading.blockId,
            body.id,
            check.id,
            ...row.map((p) => p.blockId),
          ]);
          moved = row[0].yMm - wasRow[0].yMm;
          expect(Math.abs(moved)).toBeLessThanOrEqual(0.021);
          expect(
            row.map((p) => [
              p.xMm - leftMm(last),
              p.widthMm,
              p.heightMm,
              p.column,
            ]),
          ).toEqual(
            wasRow.map((p) => [
              p.xMm - leftMm(was.at(-1)!),
              p.widthMm,
              p.heightMm,
              p.column,
            ]),
          );
        }
        for (const p of now.flatMap((page) => page.blocks))
          expect(p.yMm + p.heightMm).toBeLessThanOrEqual(A4.bodyBottomMm);
        records.push({
          sectionKey: section.sectionKey,
          sourceKind: authored.semantic?.source?.kind,
          pages: now.map((p) => p.physicalPageIndex),
          historicalPages: was.map((p) => p.physicalPageIndex),
          historicalBodyLeftMm: whole.xMm,
          currentBodyLeftMm: placedBody.xMm,
          leftBehindBefore: orphaned,
          movedToContinuation,
          wholeMm: whole.heightMm,
          bodyMm,
          checkMm,
          cutMinusWholeMm: cut,
          questionRowMm: rowMm,
          questionsMm: questions.slice(0, 2).map((q) => size.get(q.id)),
          questionRowMovedMm: moved,
          checkAtMm: placedCheck.yMm,
          questionRowAtMm: row[0].yMm,
        });
      }
      // The run showed two subheadings left behind and one that held; all three are covered.
      expect(records.map((r) => r.leftBehindBefore)).toEqual([
        false,
        true,
        true,
      ]);
      expect(records.map((r) => r.sourceKind)).toEqual([
        "concept1",
        "concept2",
        "concept3",
      ]);
      // The second question of the last page is the taller one: the row decides, not the first.
      const uneven = records[2];
      expect(uneven.questionsMm[0]).toBeLessThan(uneven.questionsMm[1]!);
      // Record historical placement equality without pinning intentional answer-page moves.
      expect(untouched.size).toBeGreaterThanOrEqual(5);
      const same = [...untouched].map((sectionKey) => ({
        sectionKey,
        equal:
          JSON.stringify(pages.filter((p) => p.sectionKey === sectionKey)) ===
          JSON.stringify(frozen.filter((p) => p.sectionKey === sectionKey)),
      }));
      expect(records.every((r) => r.movedToContinuation)).toBe(true);
      // Each question once; actual answer pages are consecutive even when a chunk grows.
      for (const [n, { chunk }] of answers.entries()) {
        expect(chunk.pages.map((p) => p.physicalPageIndex)).toEqual(
          chunk.pages.map((_, i) => chunk.pages[0].physicalPageIndex + i),
        );
        if (n > 0)
          expect(chunk.pages[0].physicalPageIndex).toBe(
            answers[n - 1].chunk.pages.at(-1)!.physicalPageIndex + 1,
          );
        expect((await PDFDocument.load(chunk.pdf)).getPageCount()).toBe(
          chunk.pages.length,
        );
        const items = chunk.pageMap.map((p) => p.itemId);
        expect(new Set(items).size).toBe(items.length);
        expect([...items].sort()).toEqual(
          data
            .frozenAnswers(CHUNKS[n].index)
            .flatMap((p) =>
              p.blocks.flatMap((b) => (b.itemId ? [b.itemId] : [])),
            )
            .sort(),
        );
        writeFileSync(
          path.join(OUT, `answers-chunk-${CHUNKS[n].index}.pdf`),
          chunk.pdf,
        );
      }
      writeFileSync(
        path.join(OUT, "answer-check-heading-layout.json"),
        JSON.stringify(
          {
            exchangeSha256: data.exchangeSha256,
            pinnedToSourceRun: PIN,
            gapMm: GAP,
            sections: records,
            otherSectionsPlacedAsSourceRun: same,
            answerPdfSha256: answers.map(({ chunk }) => chunk.artifactHash),
            answerPages: pages,
          },
          null,
          2,
        ),
      );
    }, 420_000);

    it("prints every fragment once, each subheading above its questions, in its own style", async () => {
      const data = load();
      const records = [];
      for (const chunk of CHUNKS) {
        const answers = await render(data, "answers", chunk);
        const printed = await readPages(answers.chunk.html);
        expect(printed.map((p) => p.page)).toEqual(
          answers.chunk.pages.map((p) => p.physicalPageIndex),
        );
        const studentLabel = new Map(
          data.studentChunks
            .get(chunk.offset)!
            .flatMap((page) =>
              page.blocks.flatMap((p) =>
                p.itemId ? [[p.itemId, page.printedPageLabel] as const] : [],
              ),
            ),
        );
        // No subheading is the last thing on its page: its questions are below it there.
        for (const page of printed)
          for (const check of page.checks) {
            const below = page.blocks.filter(
              (b) => b.itemId && b.box.top >= check.box.bottom - 0.05,
            );
            expect(
              below.length,
              `${page.page}:${check.blockId}`,
            ).toBeGreaterThanOrEqual(2);
            expect(below[0].box.top - check.box.bottom).toBeCloseTo(GAP, 1);
          }
        for (const section of answers.sections) {
          const unsplit = data.student.sections.find(
            (s) => s.sectionKey === section.sectionKey,
          )!;
          const authored = unsplit.blocks.find(closes);
          if (!authored) continue;
          // The unsplit block, as students get it, measured alone: the reference.
          const [reference] = await readPages(
            textbookHtmlDocument(
              "answer-check-heading",
              measurementHtml(
                {
                  ...data.student,
                  sections: [{ ...unsplit, blocks: [authored] }],
                },
                data.resources,
              ),
              css.font,
              css.katex,
            ),
          );
          const whole = reference.blocks[0];
          const wholeCheck = reference.checks[0];
          const own = printed.flatMap((page) =>
            page.blocks
              .filter(
                (b) =>
                  b.id === authored.id || b.id === `${authored.id}.subheading`,
              )
              .map((b) => ({ ...b, page: page.page })),
          );
          expect(own.map((b) => b.id)).toEqual([
            authored.id,
            `${authored.id}.subheading`,
          ]);
          const [body, check] = own;
          // Text, formulas, figures and the children of the container: all of them, once.
          expect(body.text + check.text).toBe(whole.text);
          expect(body.formulas + check.formulas).toBe(whole.formulas);
          expect(body.images + check.images).toBe(whole.images);
          expect(
            [...body.children, ...check.children].map((c) => c.className),
          ).toEqual(whole.children.map((c) => c.className));
          expect(check.children.map((c) => c.className)).toEqual([
            "subheading",
          ]);
          body.children.forEach((child, i) => {
            const was = whole.children[i];
            expect(child.box.top - body.box.top).toBeCloseTo(
              was.box.top - whole.box.top,
              1,
            );
            expect(child.box.bottom - child.box.top).toBeCloseTo(
              was.box.bottom - was.box.top,
              1,
            );
          });
          // The subheading looks as it did inside the body: rule, chip and type.
          const page = printed.find((p) => p.page === check.page)!;
          const printedCheck = page.checks.find((c) => c.blockId === check.id)!;
          expect(printedCheck.text).toBe(wholeCheck.text);
          expect(printedCheck.style).toEqual(wholeCheck.style);
          expect(printedCheck.titleStyle).toEqual(wholeCheck.titleStyle);
          expect(printedCheck.chip).toEqual(wholeCheck.chip);
          expect(printedCheck.chip.content).toBe('"CHECK"');
          expect(printedCheck.box.bottom - printedCheck.box.top).toBeCloseTo(
            wholeCheck.box.bottom - wholeCheck.box.top,
            1,
          );
          expect(printedCheck.box.right - printedCheck.box.left).toBeCloseTo(
            wholeCheck.box.right - wholeCheck.box.left,
            1,
          );
          // Where body and subheading share a page they are as far apart as they were.
          const lastOfBody = body.children[body.children.length - 1];
          const wasBefore = whole.children[whole.children.length - 2];
          const gapWas = wholeCheck.box.top - wasBefore.box.bottom;
          const gapNow =
            body.page === check.page
              ? printedCheck.box.top - lastOfBody.box.bottom
              : null;
          if (gapNow !== null) expect(gapNow).toBeCloseTo(gapWas, 1);
          // The page-end note is printed with the body, once.
          expect(printed.find((p) => p.page === body.page)!.footers).toBe(1);
          if (check.page !== body.page) expect(page.footers).toBe(0);
          const sectionPages = new Set(
            answers.chunk.pages
              .filter((p) => p.sectionKey === section.sectionKey)
              .map((p) => p.physicalPageIndex),
          );
          expect(
            printed
              .filter((p) => sectionPages.has(p.page!))
              .reduce((sum, p) => sum + p.footers, 0),
          ).toBe(1);
          records.push({
            sectionKey: section.sectionKey,
            bodyPage: body.page,
            checkPage: check.page,
            characters: whole.text.length,
            formulas: whole.formulas,
            figures: whole.images,
            children: whole.children.length,
            gapBeforeCheckWasMm: gapWas,
            gapBeforeCheckNowMm: gapNow,
            checkBoxMm: printedCheck.box,
            chip: printedCheck.chip.content,
          });
        }
        // Each question once, with the page the student book prints it on.
        const questions = printed.flatMap((p) =>
          p.blocks.filter((b) => b.itemId),
        );
        expect(new Set(questions.map((q) => q.itemId)).size).toBe(
          questions.length,
        );
        expect(questions.map((q) => q.itemId).sort()).toEqual(
          [...studentLabel.keys()].sort(),
        );
        for (const question of questions)
          expect(question.answerHead).toBe(
            `정답 · 문제 ${studentLabel.get(question.itemId!)}쪽`,
          );
      }
      expect(records).toHaveLength(3);
      for (const record of records)
        expect(record.checkPage).toBeGreaterThan(record.bodyPage!);
      writeFileSync(
        path.join(OUT, "answer-check-heading-conservation.json"),
        JSON.stringify(
          { exchangeSha256: data.exchangeSha256, sections: records },
          null,
          2,
        ),
      );
    }, 420_000);

    it("leaves the student pages as they were printed", async () => {
      const data = load();
      const records = [];
      for (const chunk of CHUNKS) {
        const { chunk: student, sections } = await render(
          data,
          "student",
          chunk,
        );
        // The student model has no subheading block and keeps nothing with a next row.
        expect(
          sections.flatMap((s) => s.blocks).filter((b) => b.keepWithNext),
        ).toEqual([]);
        expect(
          sections
            .flatMap((s) => s.blocks)
            .some((b) => b.id.endsWith(".subheading")),
        ).toBe(false);
        const frozen = data.studentChunks.get(chunk.offset)!;
        expect(student.pages.map((p) => p.physicalPageIndex)).toEqual(
          frozen.map((p) => p.physicalPageIndex),
        );
        expect(
          student.pages.map((p) => p.blocks.map((b) => b.blockId)),
        ).toEqual(frozen.map((p) => p.blocks.map((b) => b.blockId)));
        const equal = JSON.stringify(student.pages) === JSON.stringify(frozen);
        if (PIN) expect(student.pages).toEqual(frozen);
        writeFileSync(
          path.join(OUT, `student-chunk-${chunk.index}.pdf`),
          student.pdf,
        );
        records.push({
          chunk: chunk.index,
          pages: student.pages.map((p) => p.physicalPageIndex),
          placedAsSourceRun: equal,
          pdfSha256: student.artifactHash,
        });
      }
      writeFileSync(
        path.join(OUT, "answer-check-heading-student.json"),
        JSON.stringify(
          { exchangeSha256: data.exchangeSha256, chunks: records },
          null,
          2,
        ),
      );
    }, 420_000);
  },
);
