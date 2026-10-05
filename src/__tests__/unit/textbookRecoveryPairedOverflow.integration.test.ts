// @vitest-environment node
/**
 * The frozen 중3-2 book whose answers did not paginate (EXAMPLE_GROUP_OVERFLOW), in real Chromium.
 *
 *   TEXTBOOK_PDF_TEST=1 TEXTBOOK_PAIRED_OVERFLOW_RUN_DIR=<private run folder> \
 *     node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts \
 *     src/__tests__/unit/textbookRecoveryPairedOverflow.integration.test.ts
 *
 * The run folder is the private QA output of the failed run: `exchange.private.json`, `assets/`,
 * `failure.json` and the chunk placements it printed. Nothing of it is in the repository. This
 * check writes PDFs and a record of sizes and identifiers into TEXTBOOK_RECOVERY_EVIDENCE_DIR
 * (a private folder) — never question, answer or solution text. Without the run folder the
 * suite is skipped.
 *
 * TEXTBOOK_PAIRED_OVERFLOW_PIN_FROZEN=1 also requires every chunk the failed run printed to be
 * placed exactly as it was. That holds at the commit of this check. It is a pin on the frozen
 * run, not a rule of the layout: leave it off after an intended change of block sizes.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
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
  paginateTextbookSections,
  studentPageMapFromPages,
  textbookBodyTopMm,
  TextbookLayoutError,
  type BlockMeasurement,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import { codexRenderer } from "@/lib/textbook/publish/codexRenderer";
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
import {
  mergeTextbookPdfs,
  renderTextbookChunk,
  type TextbookChunkResult,
} from "@/lib/textbook/render/server";

const RUN = process.env.TEXTBOOK_PAIRED_OVERFLOW_RUN_DIR ?? "";
const run =
  process.env.TEXTBOOK_PDF_TEST === "1" &&
  !!RUN &&
  existsSync(path.join(RUN, "exchange.private.json")) &&
  existsSync(path.join(RUN, "failure.json"));
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-paired-overflow");
const PIN = process.env.TEXTBOOK_PAIRED_OVERFLOW_PIN_FROZEN === "1";
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

type Problem = Extract<RenderBlock, { kind: "problem" }>;
type Group = Extract<
  NonNullable<NonNullable<RenderBlock["semantic"]>["node"]>,
  { kind: "exampleGroup" }
>;
const groupOf = (block: RenderBlock): Group | undefined =>
  block.semantic?.node?.kind === "exampleGroup"
    ? block.semantic.node
    : undefined;
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** One block as a document prints it, in mm from the top left of its page. */
interface DomBlock {
  page: number | null;
  id: string;
  itemId: string | null;
  continuation: boolean;
  box: Box;
  text: string;
  formulas: number;
  images: Array<{
    alt: string;
    widthMm: number;
    heightMm: number;
    /** The data URL, or the name the renderer gave a data URL it shares between images. */
    source: string;
    shared: boolean;
    loaded: boolean;
    box: Box;
  }>;
  answerHead: string | null;
  answerText: string | null;
  answerBox: Box | null;
  spillMm: number;
}

describe.skipIf(!run)(
  "the frozen 중3-2 answer group that did not paginate",
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
        path.join(RUN, "exchange.private.json"),
      );
      const exchange = textbookExchangeSchema.parse(
        JSON.parse(exchangeBytes.toString("utf8")),
      );
      const failure = JSON.parse(
        readFileSync(path.join(RUN, "failure.json"), "utf8"),
      ) as {
        rendererGitCommit: string;
        details: Array<{
          code: string;
          message: string;
          severity: string;
          path: string[];
          physicalPageIndex: number;
        }>;
        activeRender: {
          variant: string;
          chunkIndex: number;
          sectionIndices: number[];
          firstPhysicalPageIndex: number;
        };
      };
      const files = readdirSync(path.join(RUN, "assets"));
      const bytesOf = (assetId: string) => {
        const asset = exchange.assets.find((a) => a.assetId === assetId);
        const file = asset && files.find((f) => f.startsWith(asset.sha256));
        if (!asset || !file)
          throw new Error(`Missing private asset ${assetId}`);
        const bytes = readFileSync(path.join(RUN, "assets", file));
        if (sha256(bytes) !== asset.sha256)
          throw new Error(`Private asset changed ${assetId}`);
        return { asset, bytes };
      };
      /** The pages the failed run printed for a chunk, or null where it printed none. */
      const frozenPages = (variant: TextbookVariant, chunkIndex: number) => {
        const file = path.join(
          RUN,
          `${variant}-chunk-${chunkIndex}-placements.json`,
        );
        return existsSync(file)
          ? (
              JSON.parse(readFileSync(file, "utf8")) as {
                pages: TextbookPage[];
              }
            ).pages
          : null;
      };
      return {
        exchange,
        exchangeSha256: sha256(exchangeBytes),
        failure,
        frozenPages,
        resources: {
          assetUrl: (assetId: string) => {
            const { asset, bytes } = bytesOf(assetId);
            return `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
          },
          qrDataUrl: () => PNG,
        },
        readAsset: async (assetId: string) =>
          new Uint8Array(bytesOf(assetId).bytes),
      };
    }
    type Data = ReturnType<typeof load>;

    /** The chunk through the production renderer, with the sizes it measured. */
    async function render(
      data: Data,
      variant: TextbookVariant,
      sectionIndices: number[],
      firstPhysicalPageIndex: number,
      studentPages?: readonly TextbookPage[],
    ) {
      const before = paginated.length;
      const chunk = await renderTextbookChunk({
        exchange: data.exchange,
        officialOrigin: "https://local-qa.invalid",
        readAsset: data.readAsset,
        sectionIndices,
        firstPhysicalPageIndex,
        variant,
        browser,
        mode: "draft",
        ...(studentPages ? { studentPages } : {}),
      });
      expect(paginated.length).toBe(before + 1);
      return { chunk, ...paginated[before] };
    }

    /** Every block of a document: a final chunk (`paged`) or the blocks as they are measured. */
    async function readBlocks(
      html: string,
      paged: boolean,
    ): Promise<DomBlock[]> {
      const page = await browser.newPage();
      try {
        await page.emulateMediaType("print");
        await page.evaluate("globalThis.__name = (fn) => fn");
        await page.setContent(html, { waitUntil: "load", timeout: 120_000 });
        return (await page.evaluate(async (paged: boolean) => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map((i) => i.decode()));
          const mm = 25.4 / 96;
          const box = (el: Element, origin: DOMRect) => {
            const r = el.getBoundingClientRect();
            return {
              left: (r.left - origin.left) * mm,
              top: (r.top - origin.top) * mm,
              right: (r.right - origin.left) * mm,
              bottom: (r.bottom - origin.top) * mm,
            };
          };
          return Array.from(
            document.querySelectorAll<HTMLElement>(
              paged ? "[data-block-id]" : "[data-measure-id]",
            ),
          ).map((el) => {
            const paper = el.closest<HTMLElement>("[data-textbook-page]");
            const origin = (paper ?? el).getBoundingClientRect();
            const copy = el.cloneNode(true) as HTMLElement;
            for (const mark of copy.querySelectorAll("[data-continuation]"))
              mark.remove();
            const answer = el.querySelector(".tb-answer");
            const inner = paged
              ? el.querySelector<HTMLElement>(".tb-block-inner")!
              : el;
            return {
              page: paper ? Number(paper.dataset.textbookPage) : null,
              id: (paged ? el.dataset.blockId : el.dataset.measureId)!,
              itemId: el.dataset.itemId ?? null,
              continuation: el.classList.contains("tb-continuation"),
              box: box(el, origin),
              text: copy.textContent ?? "",
              formulas: el.querySelectorAll(".katex").length,
              images: Array.from(el.querySelectorAll("img")).map((image) => {
                const r = image.getBoundingClientRect();
                return {
                  alt: image.alt,
                  widthMm: r.width * mm,
                  heightMm: r.height * mm,
                  source: image.dataset.textbookInlineImage ?? image.src,
                  shared: image.dataset.textbookInlineImage !== undefined,
                  loaded: image.complete && image.naturalWidth > 0,
                  box: box(image, origin),
                };
              }),
              answerHead: answer?.querySelector("h4")?.textContent ?? null,
              answerText: answer?.textContent ?? null,
              answerBox: answer ? box(answer, origin) : null,
              spillMm: (inner.scrollHeight - inner.clientHeight) * mm,
            };
          });
        }, paged)) as DomBlock[];
      } finally {
        await page.close();
      }
    }

    it("is the failure the measured sizes still give students, and three pages of answers", async () => {
      const data = load();
      const failed = data.failure.details[0];
      const active = data.failure.activeRender;
      expect(failed.code).toBe("EXAMPLE_GROUP_OVERFLOW");
      expect(active.variant).toBe("answers");
      const [, unitKey, , sectionKey, , failedBlockId] = failed.path;
      const frozenStudent = data.frozenPages("student", active.chunkIndex)!;
      expect(data.frozenPages("answers", active.chunkIndex)).toBeNull();

      // The student pages first, through the production renderer: they give the answers their
      // «문제 N쪽» references.
      const student = await render(
        data,
        "student",
        active.sectionIndices,
        frozenStudent[0].physicalPageIndex,
      );
      const answers = await render(
        data,
        "answers",
        active.sectionIndices,
        active.firstPhysicalPageIndex,
        student.chunk.pages,
      );
      const section = answers.sections[0];
      expect([section.unitKey, section.sectionKey]).toEqual([
        unitKey,
        sectionKey,
      ]);
      const size = new Map(answers.measurements.map((m) => [m.blockId, m]));
      const title = section.blocks.find((b) => b.id === failedBlockId)!;
      const group = groupOf(title)!;
      const members = [group.exampleItemId, ...group.confirmItemIds].map(
        (itemId) =>
          section.blocks.find(
            (b): b is Problem => b.kind === "problem" && b.itemId === itemId,
          )!,
      );
      const heading = section.blocks.find((b) => b.kind === "heading")!;
      const [titleMm, exampleMm, ...confirmMm] = [title, ...members].map(
        (block) => size.get(block.id)!.heightMm,
      );
      const room =
        A4.bodyBottomMm -
        (textbookBodyTopMm(section, title) +
          size.get(heading.id)!.heightMm +
          A4.gapMm);
      const rightColumn = confirmMm.reduce((sum, mm) => sum + mm, 0);
      const together = titleMm + Math.max(exampleMm, 3 + rightColumn);

      // 1. The frozen failure. The group is taller than a continued page, and so is its
      //    confirmation alone while it keeps the 3 mm it stands below an example.
      expect(members.map((m) => m.answer !== undefined)).toEqual(
        members.map(() => true),
      );
      expect(together).toBeGreaterThan(room);
      expect(titleMm + 3 + rightColumn).toBeGreaterThan(room);
      // With the same measured sizes, the layout students get — where a group never continues —
      // fails at the block and the page the frozen run reported.
      const studentBlocks = createTextbookRenderModel(
        data.exchange,
        "student",
      ).sections.find((s) => s.sectionKey === sectionKey)!;
      expect(studentBlocks.blocks.map((b) => b.id)).toEqual(
        section.blocks.map((b) => b.id),
      );
      let error: unknown;
      try {
        paginateTextbookSections(
          [studentBlocks],
          answers.measurements,
          data.exchange.config,
          {
            firstPhysicalPageIndex: active.firstPhysicalPageIndex,
            maxPages: 32,
          },
        );
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TextbookLayoutError);
      expect((error as TextbookLayoutError).issues).toEqual([failed]);

      // 2. The answers now: the example with its title, then the confirmation under the
      //    repeated title, in its own column and at the title's bottom edge.
      const pages = answers.chunk.pages;
      const placed = (blockId: string) =>
        pages.flatMap((page) =>
          page.blocks
            .filter((p) => p.blockId === blockId)
            .map((p) => ({ ...p, page: page.physicalPageIndex })),
        );
      const titles = placed(title.id);
      expect(titles.map((p) => p.continuation ?? false)).toEqual([false, true]);
      expect(titles[1].page).toBe(titles[0].page + 1);
      const [example, ...confirms] = members.map((m) => {
        const own = placed(m.id);
        expect(own, m.id).toHaveLength(1);
        expect(own[0].itemId).toBe(m.itemId);
        expect(own[0].continuation).toBeUndefined();
        return own[0];
      });
      expect(example.page).toBe(titles[0].page);
      expect(example.column).toBe(1);
      expect(example.yMm).toBe(titles[0].yMm + titleMm);
      expect(confirms.map((c) => [c.page, c.column])).toEqual(
        confirms.map(() => [titles[1].page, 2]),
      );
      expect(confirms[0].yMm).toBe(titles[1].yMm + titleMm);
      expect(confirms[0].xMm - titles[1].xMm).toBeCloseTo(
        example.widthMm + A4.columnGapMm,
        6,
      );
      for (const page of pages)
        for (const p of page.blocks)
          expect(p.yMm + p.heightMm).toBeLessThanOrEqual(A4.bodyBottomMm);
      expect(pages.map((p) => p.physicalPageIndex)).toEqual(
        pages.map((_, i) => active.firstPhysicalPageIndex + i),
      );
      expect(answers.chunk.nextPhysicalPageIndex).toBe(
        active.firstPhysicalPageIndex + pages.length,
      );
      expect((await PDFDocument.load(answers.chunk.pdf)).getPageCount()).toBe(
        pages.length,
      );
      // Every block of the section is placed; only headings and the continued title repeat.
      const all = pages.flatMap((page) => page.blocks);
      for (const block of section.blocks)
        expect(
          all.filter((p) => p.blockId === block.id && !p.continuation),
          block.id,
        ).toHaveLength(1);
      expect(
        all
          .filter((p) => p.continuation)
          .map((p) => section.blocks.find((b) => b.id === p.blockId)!.kind)
          .filter((kind) => kind !== "heading"),
      ).toEqual(["text"]);
      expect(answers.chunk.pageMap.map((p) => p.itemId).sort()).toEqual(
        student.chunk.pageMap.map((p) => p.itemId).sort(),
      );

      // 3. The student pages are the pages the failed run printed, and the answer pages before
      //    the group are untouched: the first group stands 3 mm below its example as always.
      expect(student.chunk.pages.map((p) => p.physicalPageIndex)).toEqual(
        frozenStudent.map((p) => p.physicalPageIndex),
      );
      if (PIN) expect(student.chunk.pages).toEqual(frozenStudent);
      const others = section.blocks.filter(
        (b) => b.kind === "text" && groupOf(b) && b.id !== title.id,
      );
      for (const other of others) {
        const own = placed(other.id);
        expect(own).toHaveLength(1);
        const node = groupOf(other)!;
        const [first, ...rest] = [
          node.exampleItemId,
          ...node.confirmItemIds,
        ].map((itemId) => all.find((p) => p.itemId === itemId)!);
        const top = own[0].yMm + size.get(other.id)!.heightMm;
        expect(first.yMm).toBe(top);
        let y = top + 3;
        for (const confirm of rest) {
          expect(confirm.yMm).toBe(y);
          y += confirm.heightMm;
        }
      }

      writeFileSync(
        path.join(OUT, "student-failed-chunk.pdf"),
        student.chunk.pdf,
      );
      writeFileSync(
        path.join(OUT, "answers-failed-chunk.pdf"),
        answers.chunk.pdf,
      );
      writeFileSync(
        path.join(OUT, "paired-overflow-chunk.json"),
        JSON.stringify(
          {
            exchangeSha256: data.exchangeSha256,
            failedAtRendererCommit: data.failure.rendererGitCommit,
            failed,
            chunk: active,
            measuredMm: {
              bodyTop: textbookBodyTopMm(section, title),
              bodyBottom: A4.bodyBottomMm,
              heading: size.get(heading.id)!.heightMm,
              gap: A4.gapMm,
              roomOnContinuedPage: room,
              title: titleMm,
              example: exampleMm,
              confirmations: confirmMm,
              groupOnOnePage: together,
              overBy: together - room,
              confirmationsAloneWithInset: titleMm + 3 + rightColumn,
              confirmationsAloneWithoutInset: titleMm + rightColumn,
              spareAfterContinuation: room - (titleMm + rightColumn),
            },
            studentPagesEqualFrozenRun:
              JSON.stringify(student.chunk.pages) ===
              JSON.stringify(frozenStudent),
            studentPdfSha256: student.chunk.artifactHash,
            answersPdfSha256: answers.chunk.artifactHash,
            answerPages: pages,
            answerPageMap: answers.chunk.pageMap,
          },
          null,
          2,
        ),
      );
    }, 300_000);

    it("prints every block of the failed chunk whole: text, figures, items and student pages", async () => {
      const data = load();
      const active = data.failure.activeRender;
      const failedBlockId = data.failure.details[0].path[5];
      const frozenStudent = data.frozenPages("student", active.chunkIndex)!;
      const student = await render(
        data,
        "student",
        active.sectionIndices,
        frozenStudent[0].physicalPageIndex,
      );
      const answers = await render(
        data,
        "answers",
        active.sectionIndices,
        active.firstPhysicalPageIndex,
        student.chunk.pages,
      );
      const pages = answers.chunk.pages;
      // The same blocks as they are measured, one by one: the reference for what must be printed.
      const studentModel = createTextbookRenderModel(data.exchange, "student");
      const pageMap = studentPageMapFromPages(
        active.sectionIndices.map((i) => studentModel.sections[i]),
        student.chunk.pages,
        data.exchange.config,
      );
      const whole = createTextbookRenderModel(
        { ...data.exchange, pageMap },
        "answers",
      );
      const model = {
        ...whole,
        sections: active.sectionIndices.map((i) => whole.sections[i]),
      };
      const section = model.sections[0];
      const measured = await readBlocks(
        textbookHtmlDocument(
          "paired-overflow",
          measurementHtml(model, data.resources),
          css.font,
          css.katex,
        ),
        false,
      );
      const printed = await readBlocks(answers.chunk.html, true);
      const reference = new Map(measured.map((block) => [block.id, block]));
      expect([...reference.keys()]).toEqual(section.blocks.map((b) => b.id));
      const sourceName = (source: string, shared: boolean) =>
        shared ? source : sha256(new TextEncoder().encode(source));

      // Every placement is one printed block, where the layout put it.
      const placements = pages.flatMap((page) =>
        page.blocks.map((p) => ({ ...p, page: page.physicalPageIndex })),
      );
      expect(printed.map((b) => [b.page, b.id])).toEqual(
        placements.map((p) => [p.page, p.blockId]),
      );
      let figures = 0,
        formulas = 0,
        characters = 0;
      printed.forEach((block, i) => {
        const placement = placements[i];
        const original = reference.get(block.id)!;
        const tag = `${block.page}:${block.id}`;
        expect(block.continuation, tag).toBe(placement.continuation ?? false);
        expect(block.itemId, tag).toBe(placement.itemId ?? null);
        expect(block.box.left, tag).toBeCloseTo(placement.xMm, 1);
        expect(block.box.top, tag).toBeCloseTo(placement.yMm, 1);
        expect(block.box.right - block.box.left, tag).toBeCloseTo(
          placement.widthMm,
          1,
        );
        expect(block.box.bottom - block.box.top, tag).toBeCloseTo(
          placement.heightMm,
          1,
        );
        expect(block.box.bottom, tag).toBeLessThanOrEqual(
          A4.bodyBottomMm + A4.toleranceMm,
        );
        // Text: every character of the measured block, nothing more, nothing cut off below.
        expect(block.text, tag).toBe(original.text);
        expect(block.text.length, tag).toBeGreaterThan(0);
        expect(block.formulas, tag).toBe(original.formulas);
        expect(block.spillMm, tag).toBeLessThan(A4.toleranceMm);
        // Figures: the same images, at the size they were measured, inside the block.
        expect(block.images.map((image) => image.alt)).toEqual(
          original.images.map((image) => image.alt),
        );
        block.images.forEach((image, n) => {
          const source = original.images[n];
          expect(image.loaded, tag).toBe(true);
          expect(sourceName(image.source, image.shared), tag).toBe(
            sourceName(source.source, source.shared),
          );
          expect(image.widthMm, tag).toBeCloseTo(source.widthMm, 1);
          expect(image.heightMm, tag).toBeCloseTo(source.heightMm, 1);
          expect(image.box.top, tag).toBeGreaterThanOrEqual(
            block.box.top - 0.05,
          );
          expect(image.box.bottom, tag).toBeLessThanOrEqual(
            block.box.bottom + 0.05,
          );
          expect(image.box.left, tag).toBeGreaterThanOrEqual(
            block.box.left - 0.05,
          );
          expect(image.box.right, tag).toBeLessThanOrEqual(
            block.box.right + 0.05,
          );
        });
        figures += block.images.length;
        formulas += block.formulas;
        characters += block.text.length;
      });

      // Items and student pages: each problem once, its answer inside its block, with the page
      // the student book prints it on.
      const problems = section.blocks.filter(
        (b): b is Problem => b.kind === "problem",
      );
      const studentPage = new Map(
        student.chunk.pageMap.map((p) => [p.itemId, p.printedPageLabel]),
      );
      const frozenStudentPage = new Map(
        frozenStudent.flatMap((page) =>
          page.blocks.flatMap((p) =>
            p.itemId ? [[p.itemId, page.printedPageLabel] as const] : [],
          ),
        ),
      );
      expect(problems.length).toBeGreaterThanOrEqual(4);
      expect(problems.reduce((n, p) => n + p.figures.length, 0)).toBe(
        printed
          .filter((b) => b.itemId)
          .reduce((n, b) => n + b.images.length, 0),
      );
      for (const problem of problems) {
        const own = printed.filter((b) => b.itemId === problem.itemId);
        expect(own, problem.itemId).toHaveLength(1);
        expect(own[0].id).toBe(problem.id);
        const label = studentPage.get(problem.itemId)!;
        expect(label).toBe(frozenStudentPage.get(problem.itemId));
        expect(problem.sourcePageLabel).toBe(label);
        expect(own[0].answerHead).toBe(`정답 · 문제 ${label}쪽`);
        expect(own[0].answerText).toBe(reference.get(problem.id)!.answerText);
        expect(own[0].answerText!.length).toBeGreaterThan(
          own[0].answerHead!.length,
        );
        expect(own[0].answerBox!.bottom).toBeLessThanOrEqual(
          own[0].box.bottom + A4.toleranceMm,
        );
        expect(own[0].images).toHaveLength(problem.figures.length);
      }

      // The continued title: «계속» at the right end of its title row, clear of the title.
      const continued = await (async () => {
        const page = await browser.newPage();
        try {
          await page.emulateMediaType("print");
          await page.evaluate("globalThis.__name = (fn) => fn");
          await page.setContent(answers.chunk.html, {
            waitUntil: "load",
            timeout: 120_000,
          });
          return await page.evaluate(async (blockId: string) => {
            await document.fonts.ready;
            const mm = 25.4 / 96;
            const rect = (r: DOMRect) => ({
              left: r.left * mm,
              top: r.top * mm,
              right: r.right * mm,
              bottom: r.bottom * mm,
            });
            return Array.from(
              document.querySelectorAll<HTMLElement>(".tb-paired-group"),
            ).map((group) => {
              const label = group.querySelector<HTMLElement>(
                ":scope > [data-continuation]",
              );
              const row = group.querySelector<HTMLElement>(".tb-paired-title")!;
              const heading = row.querySelector("h3")!;
              const range = document.createRange();
              range.selectNodeContents(heading);
              const style = label ? getComputedStyle(label) : null;
              return {
                page: Number(
                  group.closest<HTMLElement>("[data-textbook-page]")!.dataset
                    .textbookPage,
                ),
                group: group.dataset.exampleGroup,
                own: !!group.querySelector(`[data-block-id="${blockId}"]`),
                box: rect(group.getBoundingClientRect()),
                row: rect(row.getBoundingClientRect()),
                titleText: rect(range.getBoundingClientRect()),
                worked: group.querySelectorAll(".tb-paired-worked").length,
                twins: group.querySelectorAll(".tb-paired-twins").length,
                items: Array.from(
                  group.querySelectorAll<HTMLElement>("[data-item-id]"),
                ).map((item) => item.dataset.itemId),
                roles: Array.from(
                  group.querySelectorAll<HTMLElement>("[data-example-role]"),
                ).map((item) => item.dataset.exampleRole),
                label: label
                  ? {
                      text: label.textContent,
                      box: rect(label.getBoundingClientRect()),
                      fontPt: (parseFloat(style!.fontSize) * 72) / 96,
                      visible:
                        style!.visibility === "visible" &&
                        style!.display !== "none",
                    }
                  : null,
              };
            });
          }, failedBlockId);
        } finally {
          await page.close();
        }
      })();
      const node = groupOf(
        section.blocks.find((b) => b.id === failedBlockId)!,
      )!;
      const parts = continued.filter((g) => g.own);
      expect(parts.map((g) => g.group)).toEqual([node.groupId, node.groupId]);
      expect(parts[1].page).toBe(parts[0].page + 1);
      expect(parts.map((g) => [g.worked, g.twins])).toEqual([
        [1, 0],
        [0, 1],
      ]);
      expect(parts.map((g) => g.roles)).toEqual([["example"], ["confirm"]]);
      expect(parts.flatMap((g) => g.items)).toEqual([
        node.exampleItemId,
        ...node.confirmItemIds,
      ]);
      expect(parts[0].label).toBeNull();
      const label = parts[1].label!;
      expect(label.text).toBe("계속");
      expect(label.visible).toBe(true);
      expect(label.fontPt).toBeCloseTo(7, 1);
      expect(label.box.right).toBeCloseTo(parts[1].box.right, 1);
      expect(label.box.top).toBeGreaterThanOrEqual(parts[1].row.top - 0.05);
      expect(label.box.bottom).toBeLessThanOrEqual(parts[1].row.bottom + 0.05);
      expect(label.box.right - label.box.left).toBeGreaterThan(4);
      expect(parts[1].titleText.right).toBeLessThan(label.box.left - 2);
      // It stands on the title's line: the two are centred within half a millimetre.
      const middle = (box: Box) => (box.top + box.bottom) / 2;
      expect(
        Math.abs(middle(label.box) - middle(parts[1].titleText)),
      ).toBeLessThan(0.5);
      // No other group of the chunk is marked.
      expect(continued.filter((g) => !g.own).every((g) => !g.label)).toBe(true);
      expect(
        continued.filter((g) => !g.own).map((g) => [g.worked, g.twins]),
      ).toEqual(continued.filter((g) => !g.own).map(() => [1, 1]));

      writeFileSync(
        path.join(OUT, "paired-overflow-conservation.json"),
        JSON.stringify(
          {
            exchangeSha256: data.exchangeSha256,
            sectionKey: section.sectionKey,
            answersPdfSha256: answers.chunk.artifactHash,
            blocksOfSection: section.blocks.length,
            placements: placements.length,
            printedBlocks: printed.length,
            problems: problems.length,
            figures,
            formulas,
            characters,
            studentPages: Object.fromEntries(studentPage),
            groups: continued,
            blocks: printed.map((block) => ({
              page: block.page,
              id: block.id,
              itemId: block.itemId,
              continuation: block.continuation,
              box: block.box,
              characters: block.text.length,
              formulas: block.formulas,
              figures: block.images.map((image) => ({
                widthMm: image.widthMm,
                heightMm: image.heightMm,
                source: sourceName(image.source, image.shared),
              })),
              answerHead: block.answerHead,
              answerCharacters: block.answerText?.length ?? null,
            })),
          },
          null,
          2,
        ),
      );
    }, 300_000);

    it("paginates the whole book in both variants, within the publisher's bounds", async () => {
      const data = load();
      const plan = codexRenderer.planChunks!(data.exchange);
      const manuscript = data.exchange.units.flatMap((unit) => unit.sections);
      type Row = Record<string, unknown>;
      const rows: Record<TextbookVariant, Row[]> = { student: [], answers: [] };
      const chunks: Record<TextbookVariant, TextbookChunkResult[]> = {
        student: [],
        answers: [],
      };
      const studentLabel = new Map<string, string>();
      const continuedTitles: string[] = [];
      for (const variant of ["student", "answers"] as const) {
        let physical = 1;
        for (const [chunkIndex, sectionIndices] of plan.entries()) {
          const manuscriptBlocks = sectionIndices.reduce(
            (n, i) => n + manuscript[i].blocks.length,
            0,
          );
          expect(sectionIndices.length).toBeLessThanOrEqual(4);
          expect(manuscriptBlocks).toBeLessThanOrEqual(300);
          const { chunk, sections, measurements } = await render(
            data,
            variant,
            sectionIndices,
            physical,
            variant === "answers"
              ? chunks.student[chunkIndex].pages
              : undefined,
          );
          const tag = `${variant}:${chunkIndex}`;
          expect(sections.length, tag).toBeLessThanOrEqual(8);
          expect(
            sections.reduce((n, s) => n + s.blocks.length, 0),
            tag,
          ).toBeLessThanOrEqual(600);
          expect(chunk.metrics.measuredBlocks, tag).toBeLessThanOrEqual(600);
          expect(chunk.pages.length, tag).toBeLessThanOrEqual(32);
          expect(chunk.pages.map((p) => p.physicalPageIndex)).toEqual(
            chunk.pages.map((_, i) => physical + i),
          );
          // Every block is placed where it starts exactly once; a problem is never repeated.
          const blocks = new Map(
            sections.flatMap((s) => s.blocks).map((b) => [b.id, b]),
          );
          const size = new Map(
            measurements.map((m) => [m.blockId, m.heightMm]),
          );
          const all = chunk.pages.flatMap((page) =>
            page.blocks.map((p) => ({ ...p, page: page.physicalPageIndex })),
          );
          for (const block of blocks.values()) {
            const own = all.filter((p) => p.blockId === block.id);
            if (block.unitIntroPart) continue;
            expect(
              own.filter((p) => !p.continuation),
              `${tag}:${block.id}`,
            ).toHaveLength(1);
            if (block.kind === "problem") {
              expect(own, `${tag}:${block.id}`).toHaveLength(1);
              expect(own[0].itemId).toBe(block.itemId);
            }
          }
          for (const p of all)
            expect(
              p.yMm + p.heightMm,
              `${tag}:${p.blockId}`,
            ).toBeLessThanOrEqual(A4.bodyBottomMm + A4.toleranceMm);
          // Groups. One that stands on one page is laid out by the rule it always had; only a
          // bank group of the answer book may continue.
          const continuedHere: string[] = [];
          for (const title of blocks.values()) {
            const node = title.kind === "text" ? groupOf(title) : undefined;
            if (!node) continue;
            const own = all.filter((p) => p.blockId === title.id);
            const members = [node.exampleItemId, ...node.confirmItemIds].map(
              (itemId) => all.find((p) => p.itemId === itemId)!,
            );
            if (own.length === 1) {
              const top = own[0].yMm + size.get(title.id)!;
              expect(members.map((m) => m.page)).toEqual(
                members.map(() => own[0].page),
              );
              expect(members[0].yMm, `${tag}:${title.id}`).toBe(top);
              expect(members[0].column).toBe(1);
              let y = top + 3;
              for (const confirm of members.slice(1)) {
                expect(confirm.yMm, `${tag}:${title.id}`).toBe(y);
                expect(confirm.column).toBe(2);
                y += confirm.heightMm;
              }
            } else {
              expect(variant, `${tag}:${title.id}`).toBe("answers");
              expect(title.semantic?.source).toBeUndefined();
              expect(own.slice(1).every((p) => p.continuation)).toBe(true);
              continuedHere.push(title.id);
            }
          }
          // Nothing but a heading or the title of such a group is ever repeated.
          expect(
            [
              ...new Set(
                all
                  .filter(
                    (p) =>
                      p.continuation &&
                      blocks.get(p.blockId)?.kind !== "heading",
                  )
                  .map((p) => p.blockId),
              ),
            ],
            tag,
          ).toEqual(continuedHere);
          continuedTitles.push(...continuedHere);
          // The «문제 N쪽» each answer prints is the page the student book prints the problem on.
          if (variant === "student")
            for (const p of chunk.pageMap)
              studentLabel.set(p.itemId, p.printedPageLabel);
          else {
            const ids = chunk.pageMap.map((p) => p.itemId);
            expect([...ids].sort(), tag).toEqual(
              chunks.student[chunkIndex].pageMap.map((p) => p.itemId).sort(),
            );
            const starts = ids
              .map((itemId) => ({
                itemId,
                at: chunk.html.indexOf(`data-item-id="${itemId}"`),
              }))
              .sort((a, b) => a.at - b.at);
            starts.forEach(({ itemId, at }, n) => {
              expect(at, `${tag}:${itemId}`).toBeGreaterThan(-1);
              expect(
                chunk.html.indexOf(`data-item-id="${itemId}"`, at + 1),
                `${tag}:${itemId}`,
              ).toBe(-1);
              const own = chunk.html.slice(at, starts[n + 1]?.at);
              expect(
                [...own.matchAll(/정답 · 문제 (\d+)쪽/g)].map((m) => m[1]),
                `${tag}:${itemId}`,
              ).toEqual([studentLabel.get(itemId)]);
            });
          }
          const frozen = data.frozenPages(variant, chunkIndex);
          const asFrozen =
            frozen && JSON.stringify(frozen) === JSON.stringify(chunk.pages);
          if (PIN && frozen) expect(chunk.pages, tag).toEqual(frozen);
          rows[variant].push({
            chunkIndex,
            sectionIndices,
            manuscriptBlocks,
            measuredBlocks: chunk.metrics.measuredBlocks,
            firstPhysicalPageIndex: physical,
            pages: chunk.pages.length,
            items: chunk.pageMap.length,
            pdfSha256: chunk.artifactHash,
            printedByFailedRun: !!frozen,
            placedAsFailedRun: asFrozen,
          });
          physical = chunk.nextPhysicalPageIndex;
          chunks[variant].push({ ...chunk, html: "" });
        }
      }
      // The one group that could not be printed is the one that continues.
      expect(continuedTitles).toEqual([data.failure.details[0].path[5]]);
      const items = data.exchange.items.map((item) => item.itemId).sort();
      for (const variant of ["student", "answers"] as const)
        expect(
          chunks[variant].flatMap((c) => c.pageMap.map((p) => p.itemId)).sort(),
          variant,
        ).toEqual(items);
      const merged = {
        student: await mergeTextbookPdfs(chunks.student, undefined, browser),
        answers: await mergeTextbookPdfs(chunks.answers, undefined, browser),
      };
      for (const variant of ["student", "answers"] as const) {
        expect(merged[variant].pageCount).toBe(
          chunks[variant].reduce((n, c) => n + c.pages.length, 0),
        );
        writeFileSync(path.join(OUT, `${variant}.pdf`), merged[variant].pdf);
      }
      writeFileSync(
        path.join(OUT, "paired-overflow-book.json"),
        JSON.stringify(
          {
            exchangeSha256: data.exchangeSha256,
            failedAtRendererCommit: data.failure.rendererGitCommit,
            pinnedToFailedRun: PIN,
            chunksPlanned: plan.length,
            items: items.length,
            continuedGroupTitles: continuedTitles,
            student: {
              pages: merged.student.pageCount,
              pdfSha256: merged.student.artifactHash,
              chunks: rows.student,
            },
            answers: {
              pages: merged.answers.pageCount,
              pdfSha256: merged.answers.artifactHash,
              chunks: rows.answers,
            },
          },
          null,
          2,
        ),
      );
    }, 1_200_000);
  },
);
