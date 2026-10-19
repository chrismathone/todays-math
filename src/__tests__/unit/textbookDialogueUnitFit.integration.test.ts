// @vitest-environment node
/** Real Chromium; actual bytes stay outside Git. Enable both gates for the complete actual proof. */
import path from "node:path";
import { build } from "vite";
import type { Browser, Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { canonicalJson } from "@/lib/textbook/canonical";
import { loadTextbookLocalBundle } from "@/lib/textbook/render/bundle.server";
import {
  measurementHtml,
  textbookHtmlDocument,
} from "@/lib/textbook/render/html";
import {
  dialogueMeasurementModel,
  recoveryMeasurePlan,
  measureRecoveryDom,
  recallMeasurementModel,
  assertRecoveryMeasurementBudget,
  type RecoveryMeasureResult,
} from "@/lib/textbook/render/recoveryMeasurement";
import { renderTextbookChunk } from "@/lib/textbook/render/server";
import {
  createTextbookRenderModel,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";
import {
  openArtifact,
  witnessBrowser,
  type WitnessedPage,
} from "../../../scripts/qa/textbook/recovery/intro-proof";
import {
  blockCount,
  buildFrozenDialoguePreview,
  dialogueIds,
  DIALOGUE_UNIT_PAGE_PROBE,
  frozenDialogueInput,
  judgeDialogueUnit,
  syntheticDialogueUnit,
  type DialoguePageWitness,
} from "../helpers/textbookDialogueUnitProof";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const actual = !!process.env.TEXTBOOK_DIALOGUE_UNIT_FIXTURE;
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PREVIEW_URL = "https://textbook.invalid/__dialogue_unit_preview__.html";
const capture = (page: Page) =>
  page.evaluate(DIALOGUE_UNIT_PAGE_PROBE) as Promise<DialoguePageWitness[]>;

describe.skipIf(!run)("bounded dialogue unit in real Chromium", () => {
  let browser: Browser;
  let code: string;
  beforeAll(async () => {
    browser = await launchExportBrowser();
    const entry = path
      .join(process.cwd(), "__dialogue_unit_preview_entry__.ts")
      .replaceAll("\\", "/");
    const output = await build({
      configFile: false,
      logLevel: "error",
      root: process.cwd(),
      resolve: { tsconfigPaths: true },
      plugins: [
        {
          name: "dialogue-unit-preview-entry",
          enforce: "pre",
          resolveId: (id) =>
            id
              .replaceAll("\\", "/")
              .endsWith("__dialogue_unit_preview_entry__.ts")
              ? entry
              : null,
          load: (id) =>
            id.replaceAll("\\", "/") === entry
              ? 'export { measureTextbookPreview } from "@/lib/textbook/render/browser"; export { renderPageHtml, TEXTBOOK_CSS } from "@/lib/textbook/render/html";'
              : null,
        },
      ],
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ["iife"], name: "DialogueUnitPreviewProof" },
      },
    });
    const bundle = (Array.isArray(output) ? output[0] : output) as {
      output: Array<{ code?: string }>;
    };
    code = bundle.output[0].code!;
    expect(code).toContain("measureTextbookPreview");
    expect(/\b__name\b/.test(code)).toBe(false);
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  async function preview(
    model: TextbookRenderModel,
    context?: TextbookRenderModel,
    frozen?: ReturnType<typeof frozenDialogueInput>,
    recall?: TextbookRenderModel,
  ) {
    const bundle = await loadTextbookLocalBundle();
    const page = await browser.newPage();
    const blocked: string[] = [];
    await page.setRequestInterception(true);
    await page.emulateMediaType("print");
    const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>${bundle.fontCss}${bundle.katexCss}</style></head><body><div id="pages"></div></body></html>`;
    page.on("request", (request) => {
      const resource = bundle.resources.get(request.url());
      if (resource)
        void request.respond({
          status: 200,
          contentType: resource.mimeType,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: Buffer.from(resource.bytes),
        });
      else if (request.url() === PREVIEW_URL)
        void request.respond({
          status: 200,
          contentType: "text/html",
          body: html,
        });
      else if (
        frozen &&
        request.url().startsWith("https://textbook.invalid/assets/")
      ) {
        const id = decodeURIComponent(request.url().split("/").at(-1)!);
        void frozen
          .readAsset(id)
          .then((bytes) =>
            request.respond({
              status: 200,
              contentType: frozen.exchange.assets.find((a) => a.assetId === id)!
                .mimeType,
              body: Buffer.from(bytes),
            }),
          );
      } else if (request.url().startsWith("data:")) void request.continue();
      else {
        blocked.push(request.url());
        void request.abort();
      }
    });
    try {
      await page.goto(PREVIEW_URL, { waitUntil: "load" });
      await page.addScriptTag({ content: code });
      const outcome =
        (await page.evaluate(`(async function (model, context, recall, fonts, katex, png, actualAssets) {
        var P = window.DialogueUnitPreviewProof, maxBlocks = 0, maxSections = 0, sectionById = {};
        (context || model).sections.concat(model.sections).forEach(function(s) { s.blocks.forEach(function(b) { sectionById[b.id] = s.unitKey+':'+s.sectionKey; }); });
        var observer = new MutationObserver(function () {
          document.querySelectorAll('[data-recovery-measure-host]').forEach(function (host) {
            maxBlocks = Math.max(maxBlocks, host.querySelectorAll('[data-measure-id],[data-recall-probe-id]').length);
            maxSections = Math.max(maxSections, new Set(Array.from(host.querySelectorAll('[data-measure-id]')).map(function (b) { return sectionById[b.dataset.measureId]; }).filter(Boolean)).size);
          });
        }); observer.observe(document.body,{childList:true,subtree:true});
        var resources = { assetUrl: function(id) { return actualAssets ? 'https://textbook.invalid/assets/'+encodeURIComponent(id) : png; }, qrDataUrl: function() { return png; }, editorialAssetUrl: function(name) { return 'https://textbook.invalid/editorial/'+name; } };
        var layout;
        try { layout = await P.measureTextbookPreview(model, resources, { fontCss:fonts, katexCss:katex, dialogueMeasurementModel:context, recallMeasurementModel:recall }); } finally { observer.disconnect(); }
        var style = document.createElement('style'); style.textContent = P.TEXTBOOK_CSS; document.head.appendChild(style);
        document.getElementById('pages').innerHTML = layout.pages.map(function(p) { return P.renderPageHtml(p,model,resources); }).join('');
        await document.fonts.ready; await Promise.all(Array.from(document.images).map(function(i) { return i.decode(); }));
        return { sizes:model.sections.flatMap(function(s) { return s.blocks.filter(function(b) { return b.dialogueSizePt!==undefined; }).map(function(b) { return [b.id,b.dialogueSizePt]; }); }), errors:layout.issues.filter(function(i) { return i.severity==='error'; }), hostsLeft:document.querySelectorAll('[data-recovery-measure-host]').length, maxBlocks:maxBlocks, maxSections:maxSections };
      })(${JSON.stringify(model)},${JSON.stringify(context ?? null)},${JSON.stringify(recall ?? null)},${JSON.stringify(bundle.fontCss)},${JSON.stringify(bundle.katexCss)},${JSON.stringify(PNG)},${!!frozen})`)) as {
          sizes: Array<[string, number]>;
          errors: unknown[];
          hostsLeft: number;
          maxBlocks: number;
          maxSections: number;
        };
      expect(blocked).toEqual([]);
      expect(outcome.hostsLeft).toBe(0);
      expect(outcome.maxBlocks).toBeLessThanOrEqual(600);
      expect(outcome.maxSections).toBeLessThanOrEqual(8);
      expect(outcome.errors).toEqual([]);
      return { page, outcome, pages: await capture(page) };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  it("three synthetic sections share one allowed size with no clipping in the real bundled preview", async () => {
    const model = syntheticDialogueUnit();
    const p = await preview(model);
    try {
      const sizes = new Set(p.outcome.sizes.map(([, pt]) => pt));
      expect(sizes.size).toBe(1);
      const pt = [...sizes][0];
      expect(pt).toBeGreaterThanOrEqual(9.2);
      expect(pt).toBeLessThan(10.5);
      expect(Math.round(pt * 10)).toBeCloseTo(pt * 10, 6);
      expect(judgeDialogueUnit(p.pages, dialogueIds(model), pt)).toEqual([]);
      expect(
        p.pages
          .flatMap((page) => page.blocks)
          .reduce((n, b) => n + b.mathCount, 0),
      ).toBeGreaterThan(0);
    } finally {
      await p.page.close();
    }
  }, 180_000);

  it("selected-only input demonstrates why whole-unit preview matching requires sibling context", async () => {
    const model = syntheticDialogueUnit();
    const whole = await preview(model);
    const selected = {
      ...syntheticDialogueUnit(),
      sections: [syntheticDialogueUnit().sections[0]],
    };
    const one = await preview(selected);
    try {
      expect(one.outcome.sizes[0][1]).toBe(10.5);
      expect(whole.outcome.sizes[0][1]).toBeLessThan(one.outcome.sizes[0][1]);
    } finally {
      await whole.page.close();
      await one.page.close();
    }
  }, 180_000);

  it("bounded sibling context changes fitting while the final preview keeps only the selected section", async () => {
    const whole = syntheticDialogueUnit();
    const selected = { ...whole, sections: [whole.sections[0]] };
    const p = await preview(selected, whole);
    try {
      const pt = p.outcome.sizes[0][1];
      expect(pt).toBeLessThan(10.5);
      expect(judgeDialogueUnit(p.pages, dialogueIds(selected), pt)).toEqual([]);
      expect(
        p.pages
          .flatMap((page) => page.blocks)
          .some((block) => block.id.startsWith("dialogue-unit-synthetic-1")),
      ).toBe(false);
    } finally {
      await p.page.close();
    }
  }, 180_000);

  it("real DOM controls reject one section's wrong font and a smaller page height", async () => {
    const model = syntheticDialogueUnit();
    const p = await preview(model);
    try {
      const pt = p.outcome.sizes[0][1];
      await p.page.evaluate(
        "document.querySelector('.tb-bubble').style.fontSize='20pt'",
      );
      expect(
        judgeDialogueUnit(await capture(p.page), dialogueIds(model), pt),
      ).toContain("common-unit-font");
      await p.page.evaluate(
        "document.querySelector('[data-textbook-page]').style.height='220mm'",
      );
      expect(
        judgeDialogueUnit(await capture(p.page), dialogueIds(model), pt),
      ).toContain("paper-size");
    } finally {
      await p.page.close();
    }
  }, 180_000);

  it("a missing unit measurement probe fails honestly rather than returning a partial shared fit", async () => {
    const model = syntheticDialogueUnit();
    const bundle = await loadTextbookLocalBundle();
    const page = await browser.newPage();
    try {
      await page.setContent(
        textbookHtmlDocument(
          model.title,
          measurementHtml(model, { assetUrl: () => PNG, qrDataUrl: () => PNG }),
          bundle.fontCss,
          bundle.katexCss,
        ),
      );
      const plan = recoveryMeasurePlan(model);
      const id = dialogueIds(model)[0];
      await page.evaluate(
        (missing) =>
          document.querySelector(`[data-measure-id="${missing}"]`)!.remove(),
        id,
      );
      await expect(page.evaluate(measureRecoveryDom, plan)).rejects.toThrow(
        /Missing.*dialogue/i,
      );
    } finally {
      await page.close();
    }
  }, 120_000);

  // A unit beyond one measurement DOM (9 dialogue sections, as 중2 «방정식») is no longer refused:
  // its siblings are measured in bounded passes and still decide the one unit font.
  it("the bundled preview measures a unit beyond one DOM in bounded passes with the same font", async () => {
    const whole = syntheticDialogueUnit();
    const first = whole.sections[0];
    const selected = { ...whole, sections: [first] };
    const reference = await preview(selected, whole);
    const copies = Array.from({ length: 6 }, (_, index) => ({
      ...first,
      sectionKey: `dialogue-unit-browser-cap-${index}`,
      blocks: first.blocks.map((block) => ({
        ...block,
        id: `${block.id}-cap-${index}`,
        sectionKey: `dialogue-unit-browser-cap-${index}`,
      })),
    }));
    const overSections = {
      ...whole,
      sections: [first, ...copies, whole.sections[1], whole.sections[2]],
    };
    expect(overSections.sections).toHaveLength(9);
    const split = await preview(selected, overSections);
    try {
      expect(split.outcome.sizes.map(([, pt]) => pt)).toEqual(
        reference.outcome.sizes.map(([, pt]) => pt),
      );
      expect(split.outcome.sizes[0][1]).toBeLessThan(10.5);
      expect(
        judgeDialogueUnit(
          split.pages,
          dialogueIds(selected),
          split.outcome.sizes[0][1],
        ),
      ).toEqual([]);
    } finally {
      await reference.page.close();
      await split.page.close();
    }
  }, 180_000);

  it("the bundled preview rejects the selected section's combined private block cap before measuring", async () => {
    const whole = syntheticDialogueUnit();
    const first = whole.sections[0];
    const selected = { ...whole, sections: [first] };
    const recall = {
      ...whole,
      sections: [
        {
          ...first,
          blocks: Array.from(
            { length: 601 - blockCount(selected) },
            (_, index) => ({
              ...first.blocks[0],
              id: `dialogue-unit-browser-private-${index}`,
            }),
          ),
        },
      ],
    };
    await expect(preview(selected, whole, undefined, recall)).rejects.toThrow(
      "including private helpers",
    );
  }, 180_000);

  it.skipIf(!actual)(
    "actual frozen E5-1: every same-unit section/chunk and bounded preview use the same font",
    async () => {
      const frozen = frozenDialogueInput();
      const before = canonicalJson(frozen.exchange);
      expect(frozen.indices).toHaveLength(2); // Frozen actual14 has two; its third lesson belongs to another BANK unit.
      const allPages: DialoguePageWitness[] = [];
      const allSizes: number[] = [];
      const budgets: Array<{
        selected: number;
        sizing: number;
        recall: number;
        total: number;
        sections: number;
      }> = [];
      const previews: Array<{
        maxBlocks: number;
        maxSections: number;
        hostsLeft: number;
        selectedDialogue: number;
      }> = [];
      for (const index of frozen.indices) {
        const selected = {
          ...frozen.model,
          sections: [frozen.model.sections[index]],
        };
        const sizing = dialogueMeasurementModel(frozen.model, selected);
        const recall = recallMeasurementModel(
          createTextbookRenderModel(frozen.exchange, "answers"),
          selected,
        );
        assertRecoveryMeasurementBudget(sizing, recall);
        budgets.push({
          selected: blockCount(selected),
          sizing: blockCount(sizing),
          recall: blockCount(recall),
          total: blockCount(sizing) + blockCount(recall),
          sections: sizing.sections.length,
        });
        const log: WitnessedPage[] = [];
        const rendered = await renderTextbookChunk({
          exchange: frozen.exchange,
          sectionIndices: [index],
          firstPhysicalPageIndex: 8,
          variant: "student",
          mode: "draft",
          officialOrigin: new URL(
            frozen.exchange.qrTargets[0]?.url ?? "https://school.example.test",
          ).origin,
          readAsset: frozen.readAsset,
          browser: witnessBrowser(browser, log),
        });
        expect(
          rendered.issues.filter((issue) => issue.severity === "error"),
        ).toEqual([]);
        const result = log
          .flatMap((entry) => entry.evaluations)
          .find((evaluation) => evaluation.source.includes("dialogueSizesPt"))
          ?.value as RecoveryMeasureResult;
        expect(Object.keys(result.dialogueSizesPt).sort()).toEqual(
          dialogueIds(sizing).sort(),
        );
        const pt = Object.values(result.dialogueSizesPt)[0];
        expect(new Set(Object.values(result.dialogueSizesPt)).size).toBe(1);
        allSizes.push(pt);
        const artifact = await openArtifact(browser, rendered.html);
        try {
          const pages = await capture(artifact.page);
          expect(
            judgeDialogueUnit(pages, dialogueIds(selected), pt),
            JSON.stringify(
              pages
                .flatMap((page) => page.blocks)
                .filter(
                  (block) =>
                    block.clipped ||
                    (dialogueIds(selected).includes(block.id) &&
                      block.bottomMm > 266.5),
                ),
            ),
          ).toEqual([]);
          expect(artifact.blocked).toEqual([]);
          allPages.push(...pages);
        } finally {
          await artifact.page.close();
        }
        // The studio's real client parser and input builder, with synthetic read-only transport metadata.
        const { built, material, calls } = await buildFrozenDialoguePreview(
          frozen,
          index,
        );
        expect(calls).toHaveLength(3);
        expect(
          material.dialogueUnits?.find(
            (unit) => unit.unitKey === selected.sections[0].unitKey,
          )?.sections,
        ).toHaveLength(2);
        expect(built.model.sections).toHaveLength(1);
        expect(built.dialogueMeasurementModel?.sections).toHaveLength(2);
        expect(dialogueIds(built.dialogueMeasurementModel!).sort()).toEqual(
          dialogueIds(sizing).sort(),
        );
        const p = await preview(
          built.model,
          built.dialogueMeasurementModel,
          frozen,
          built.recallMeasurementModel,
        );
        try {
          expect(new Set(p.outcome.sizes.map(([, size]) => size))).toEqual(
            new Set([pt]),
          );
          expect(
            judgeDialogueUnit(p.pages, dialogueIds(built.model), pt),
          ).toEqual([]);
          expect(p.outcome.maxBlocks).toBe(budgets.at(-1)!.total);
          expect(p.outcome.maxSections).toBe(2);
          previews.push({
            maxBlocks: p.outcome.maxBlocks,
            maxSections: p.outcome.maxSections,
            hostsLeft: p.outcome.hostsLeft,
            selectedDialogue: dialogueIds(built.model).length,
          });
          expect(
            p.pages
              .flatMap((page) => page.blocks)
              .some((block) =>
                dialogueIds(sizing)
                  .filter((id) => !dialogueIds(selected).includes(id))
                  .includes(block.id),
              ),
          ).toBe(false);
        } finally {
          await p.page.close();
        }
        expect(log[0].contents[0].match(/data-measure-id=/g)?.length).toBe(
          budgets.at(-1)!.sizing,
        );
      }
      expect(new Set(allSizes).size).toBe(1);
      expect(canonicalJson(frozen.exchange)).toBe(before);
      expect(
        judgeDialogueUnit(
          allPages,
          dialogueIds({
            ...frozen.model,
            sections: frozen.indices.map(
              (index) => frozen.model.sections[index],
            ),
          }),
          allSizes[0],
        ),
      ).toEqual([]);
      const speech = allPages
        .flatMap((page) => page.blocks)
        .filter((block) => block.pt !== null);
      process.stdout.write(
        `dialogue-unit actual witness ${JSON.stringify({ inputSha256: frozen.sha256, indices: frozen.indices, commonPt: allSizes[0], computedSpeechPt: [...new Set(speech.flatMap((block) => block.speechPt))], fontFamilies: [...new Set(speech.flatMap((block) => block.families))], pages: allPages.length, budgets, previews })}\n`,
      );
    },
    600_000,
  );
});
