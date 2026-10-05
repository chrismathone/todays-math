/** Bounded original-template DOM/CSS measurements, never a replacement reference PDF. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";

const sha = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const selected = Array.from({ length: 36 }, (_, index) => index + 8);
const selectors = [
  ".running",
  ".page-head",
  ".page-head h1",
  ".page-head p",
  ".progress",
  ".edge-tab",
  ".content",
  ".foot",
  ".foot b",
  ".foot .name",
  ".checkbar",
  ".daily-banner",
  ".return-strip",
  ".script-continue",
  ".script-head",
  ".script-guide",
  ".script-body",
  ".chat-person",
  ".chat-name",
  ".chat-bubble",
  ".script-board",
  ".script-turn",
  ".speech",
  ".portrait",
  ".portrait-frame",
  ".bubble",
  ".board",
  ".master-block",
  ".master-title",
  ".master-row",
  ".master-row .label",
  ".paired-group",
  ".paired-title",
  ".paired-cols",
  ".worked",
  ".paired-cols > .worked",
  ".study-footer",
  ".study-footer > span",
  ".page-end-note",
  ".twins",
  ".question",
  ".q",
  ".qhead",
  ".qid",
  ".question-grid",
  ".drill-grid",
  ".reason-grid",
  ".prompt",
  ".work",
  ".chapter-title",
  ".chapter-hero",
  ".chapter-hero img",
  ".section-label",
  ".rule-box",
  ".concept-grid",
  "table",
  ".math",
];

async function main() {
  const [sourceDirectory, outputDirectory, mode = "geometry"] =
    process.argv.slice(2);
  assert(sourceDirectory && outputDirectory);
  assert(["geometry", "allocation-only", "native-writing-only"].includes(mode));
  const source = path.resolve(sourceDirectory),
    output = path.resolve(outputDirectory);
  assert(
    !output
      .toLowerCase()
      .startsWith(path.resolve(process.cwd(), "..").toLowerCase() + path.sep),
  );
  await mkdir(output, { recursive: true });
  const raw = await readFile(path.join(source, "manuscript.json"));
  assert.equal(
    sha(raw),
    "520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb",
  );
  const files: Record<string, string> = { "manuscript.json": sha(raw) };
  const mime = (file: string) =>
    file.endsWith(".ttf")
      ? "font/ttf"
      : file.endsWith(".woff2")
        ? "font/woff2"
        : file.endsWith(".woff")
          ? "font/woff"
          : file.endsWith(".svg")
            ? "image/svg+xml"
            : "image/png";
  const inline = async (file: string) =>
    `data:${mime(file)};base64,${(await readFile(path.join(source, file))).toString("base64")}`;
  let css = "";
  for (const name of [
    "vendor/katex/katex.min.css",
    "styles.css",
    "editorial.css",
    "full.css",
    "chapters.css",
  ]) {
    const bytes = await readFile(path.join(source, name));
    files[name] = sha(bytes);
    let content = bytes.toString("utf8");
    for (const match of Array.from(
      content.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g),
    )) {
      if (match[1].startsWith("data:")) continue;
      content = content.replace(
        match[0],
        `url('${await inline(path.posix.join(path.posix.dirname(name), match[1]))}')`,
      );
    }
    css += content + "\n";
  }
  let code = "";
  for (const name of ["full.js", "chapters.js", "app.js"]) {
    let content = await readFile(path.join(source, name), "utf8");
    files[name] = sha(content);
    if (name === "app.js") {
      const boundary = content.indexOf(
        "\ndocument.querySelectorAll('[data-book]').forEach",
      );
      assert(boundary > 0);
      content = content.slice(0, boundary);
    }
    code += content + "\n";
  }
  const browser = await launchExportBrowser();
  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setContent(
      `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style></head><body><main id="book"></main></body></html>`,
    );
    await page.evaluate("globalThis.__name = (fn) => fn");
    await page.addScriptTag({
      path: path.join(source, "vendor/katex/katex.min.js"),
    });
    await page.evaluate((json) => {
      (window as unknown as { MANUSCRIPT: unknown }).MANUSCRIPT =
        JSON.parse(json);
    }, raw.toString("utf8"));
    await page.addScriptTag({
      content:
        code +
        `\nwindow.qaSourceSheet = (number) => {const p=data.pages.find(p=>p.page===number); return fullSheet(p,number,body(p));};`,
    });
    const geometry = [];
    await page.evaluate((numbers) => {
      document
        .getElementById("book")!
        .replaceChildren(
          ...numbers.map((n) =>
            (
              window as unknown as { qaSourceSheet: (n: number) => Element }
            ).qaSourceSheet(n),
          ),
        );
    }, selected);
    // Make every source image self-contained without changing its original attributes/geometry.
    const sources = await page.evaluate(() =>
      Array.from(document.images)
        .map((i) => i.getAttribute("src")!)
        .filter((s) => !s.startsWith("data:")),
    );
    for (const src of new Set(sources)) {
      const url = await inline(src);
      await page.evaluate(
        ({ src, url }) => {
          for (const img of document.images)
            if (img.getAttribute("src") === src) img.src = url;
        },
        { src, url },
      );
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => i.decode()));
    });
    await page.evaluate("alignQuestionRows(); alignSpreadRows();");
    const captureAllocation = () =>
      page.evaluate(() => {
        const native = window as unknown as {
          writingGrid: (sheet: Element) => HTMLElement | null;
          matchingSpread: (sheet: Element) => HTMLElement | null;
          MANUSCRIPT: { questions: Record<string, { lines?: number }> };
        };
        const mm = 25.4 / 96;
        return Array.from(
          document.querySelectorAll<HTMLElement>(
            ".sheet.exercise,.sheet.typepage,.sheet.reasoning,.sheet.practice",
          ),
        ).map((sheet) => {
          const paper = sheet.getBoundingClientRect();
          const grid = native.writingGrid(sheet);
          const content = sheet
            .querySelector(".content")!
            .getBoundingClientRect();
          const stop = (sheet.querySelector(".page-end-note") ??
            sheet.querySelector(".foot"))!.getBoundingClientRect();
          const next = native.matchingSpread(sheet);
          const box = (element: Element) => {
            const r = element.getBoundingClientRect();
            return [
              r.left - paper.left,
              r.top - paper.top,
              r.right - paper.left,
              r.bottom - paper.top,
            ].map((v) => v * mm);
          };
          return {
            sourcePage: Number(sheet.dataset.page),
            unit: sheet.dataset.unit,
            section: sheet.dataset.section,
            classes: sheet.className,
            dailyBanner: !!sheet.querySelector(".daily-banner"),
            matchedNextPage: next ? Number(next.dataset.page) : null,
            contentTopMm: (content.top - paper.top) * mm,
            contentBottomMm: (content.bottom - paper.top) * mm,
            stopTopMm: (stop.top - paper.top) * mm,
            preEqualizationBudgetMm:
              Math.max(0, stop.top - 8 - content.bottom) * mm,
            grid: grid
              ? {
                  className: grid.className,
                  directChildCount: grid.children.length,
                  directChildOrder: Array.from(grid.children).map((q) =>
                    q.getAttribute("data-qid"),
                  ),
                  boxMm: box(grid),
                  columns: grid.classList.contains("reason-grid") ? 1 : 2,
                  css: {
                    columnGap: getComputedStyle(grid).columnGap,
                    rowGap: getComputedStyle(grid).rowGap,
                  },
                }
              : null,
            questions: grid
              ? Array.from(grid.children).flatMap((q) => {
                  const work = q.matches(".q")
                    ? q.querySelector<HTMLElement>(".work")
                    : null;
                  if (!work) return [];
                  const questionId = q.getAttribute("data-qid")!;
                  const r = q.getBoundingClientRect(),
                    w = work.getBoundingClientRect();
                  const style = getComputedStyle(q),
                    workStyle = getComputedStyle(work);
                  return [
                    {
                      questionId,
                      rawBaseLines:
                        native.MANUSCRIPT.questions[questionId].lines ?? 2,
                      observedLines: work.children.length,
                      declaredLines: work.dataset.lines ?? null,
                      capLines: q.classList.contains("reason") ? 8 : 6,
                      questionBoxMm: box(q),
                      workBoxMm: box(work),
                      questionHeightMm: r.height * mm,
                      workHeightMm: w.height * mm,
                      workTopOffsetMm: (w.top - r.top) * mm,
                      workMarginTopMm: parseFloat(workStyle.marginTop) * mm,
                      paddingBottomMm: parseFloat(style.paddingBottom) * mm,
                      borderBottomMm: parseFloat(style.borderBottomWidth) * mm,
                      fixedMm:
                        (w.top -
                          r.top +
                          parseFloat(style.paddingBottom) +
                          parseFloat(style.borderBottomWidth)) *
                        mm,
                      minimumHeight: style.minHeight,
                    },
                  ];
                })
              : [],
          };
        });
      });
    const beforeAllocation = await captureAllocation();
    await page.evaluate("expandWritingSpace(); fitConversations();");
    const afterAllocation = await captureAllocation();
    await writeFile(
      path.join(output, "source-writing-allocation.json"),
      JSON.stringify(
        {
          manuscriptSha256: sha(raw),
          files,
          selectedPhysicalPages: selected,
          method:
            "Loaded exact original functions/CSS/assets; immutable source DOM measured after native row alignment, before and after native expandWritingSpace; no inferred default geometry",
          before: beforeAllocation,
          after: afterAllocation,
        },
        null,
        2,
      ) + "\n",
    );
    const nativeWriting = await page.evaluate(() => {
      const mm = 25.4 / 96;
      return Array.from(document.querySelectorAll<HTMLElement>(".sheet")).map(
        (sheet) => {
          const paper = sheet.getBoundingClientRect();
          const box = (element: Element) => {
            const r = element.getBoundingClientRect();
            return [
              r.left - paper.left,
              r.top - paper.top,
              r.right - paper.left,
              r.bottom - paper.top,
            ].map((v) => v * mm);
          };
          return {
            sourcePage: Number(sheet.dataset.page),
            fontsLoaded:
              document.fonts.check("400 12px NotoKR", "가나다") &&
              document.fonts.check("700 12px NotoKR", "가나다"),
            containers: [".work", ".recall-rules"].flatMap((selector) =>
              Array.from(sheet.querySelectorAll<HTMLElement>(selector)).map(
                (element, ordinal) => ({
                  id: `${selector}:${ordinal}`,
                  selector,
                  ordinal,
                  questionId:
                    element.closest("[data-qid]")?.getAttribute("data-qid") ??
                    null,
                  boxMm: box(element),
                  lines: Array.from(
                    element.querySelectorAll<HTMLElement>(":scope > span"),
                  ).map((line, index) => ({
                    index,
                    boxMm: box(line),
                    thicknessMm:
                      parseFloat(getComputedStyle(line).borderBottomWidth) * mm,
                  })),
                }),
              ),
            ),
          };
        },
      );
    });
    await writeFile(
      path.join(output, "source-native-writing-geometry.json"),
      JSON.stringify(
        {
          manuscriptSha256: sha(raw),
          files,
          selectedPhysicalPages: selected,
          method:
            "Actual original source DOM after exact native alignment/writing/fit helpers and loaded assets; native work/recall containers and each direct rule measured independently of generic bank defaults",
          pages: nativeWriting,
        },
        null,
        2,
      ) + "\n",
    );
    if (mode === "native-writing-only") {
      console.info(
        JSON.stringify({
          output: path.join(output, "source-native-writing-geometry.json"),
          pages: nativeWriting.length,
          containers: nativeWriting.reduce(
            (n, p) => n + p.containers.length,
            0,
          ),
          lines: nativeWriting.reduce(
            (n, p) => n + p.containers.reduce((m, c) => m + c.lines.length, 0),
            0,
          ),
        }),
      );
      await page.close();
      return;
    }
    if (mode === "allocation-only") {
      console.info(
        JSON.stringify({
          output: path.join(output, "source-writing-allocation.json"),
          eligibleSheets: beforeAllocation.length,
        }),
      );
      await page.close();
      return;
    }
    for (const number of selected) {
      const measured = await page.evaluate(
        ({ selectors, number }) => {
          const paper = document.querySelector<HTMLElement>(
              `.sheet[data-page='${number}']`,
            )!,
            pr = paper.getBoundingClientRect(),
            mm = 25.4 / 96;
          const rect = (e: Element) => {
            const r = e.getBoundingClientRect();
            return [
              r.left - pr.left,
              r.top - pr.top,
              r.right - pr.left,
              r.bottom - pr.top,
            ].map((v) => v * mm);
          };
          return {
            physicalPageIndex: Number(paper.dataset.page),
            kind: paper.className,
            widthMm: pr.width * mm,
            heightMm: pr.height * mm,
            fontsLoaded:
              document.fonts.check("400 12px NotoKR", "가나다") &&
              document.fonts.check("700 12px NotoKR", "가나다"),
            anchors: selectors.flatMap((selector) =>
              Array.from(paper.querySelectorAll(selector)).map((e, i) => {
                const s = getComputedStyle(e);
                const range = document.createRange();
                range.selectNodeContents(e);
                const rr = range.getBoundingClientRect();
                const textRangeBoxMm = [
                  rr.left - pr.left,
                  rr.top - pr.top,
                  rr.right - pr.left,
                  rr.bottom - pr.top,
                ].map((v) => v * mm);
                return {
                  id: `${selector}:${i}`,
                  selector,
                  ordinal: i,
                  boxMm: rect(e),
                  textRangeBoxMm,
                  tag: e.tagName.toLowerCase(),
                  classes: e.className,
                  css: Object.fromEntries(
                    [
                      "font-family",
                      "font-size",
                      "font-weight",
                      "line-height",
                      "display",
                      "position",
                      "width",
                      "height",
                      "min-height",
                      "grid-template-columns",
                      "column-gap",
                      "padding",
                      "margin",
                      "border-width",
                      "color",
                      "background-color",
                      "overflow",
                      "align-items",
                    ].map((k) => [k, s.getPropertyValue(k)]),
                  ),
                };
              }),
            ),
          };
        },
        { selectors, number },
      );
      geometry.push(measured);
      const html = await page.evaluate(
        (number) =>
          `<!doctype html><html lang="ko"><head>${document.head.innerHTML.replace(/<script[\s\S]*?<\/script>/g, "")}</head><body><main id="book">${document.querySelector(`.sheet[data-page='${number}']`)!.outerHTML}</main></body></html>`,
        number,
      );
      await writeFile(
        path.join(
          output,
          `source-dom-r${String(number).padStart(3, "0")}.html`,
        ),
        html,
      );
      console.info(
        JSON.stringify({
          sourcePage: number,
          anchors: measured.anchors.length,
          fontsLoaded: measured.fontsLoaded,
        }),
      );
    }
    await writeFile(
      path.join(output, "source-computed-geometry.json"),
      JSON.stringify(
        {
          version: 1,
          method:
            "Original source functions, selected sheets, print-media CSS and loaded original font assets; Exact alignQuestionRows/alignSpreadRows/expandWritingSpace/fitConversations run after assets/fonts load over selected sheets and all four U01 opening pages; DOM measurements only, pinned PDF remains visual reference",
          manuscriptSha256: sha(raw),
          files,
          selectedPhysicalPages: selected,
          pages: geometry,
        },
        null,
        2,
      ) + "\n",
    );
    await writeFile(
      path.join(output, "source-computed-key-geometry.json"),
      JSON.stringify(
        {
          files,
          pages: geometry.map((p) => ({
            ...p,
            anchors: p.anchors.filter((a) =>
              [
                ".content",
                ".page-head",
                ".edge-tab",
                ".checkbar",
                ".master-row",
                ".master-row .label",
                ".portrait-frame",
                ".chat-bubble",
                ".script-body",
                ".script-board",
              ].includes(a.selector),
            ),
          })),
        },
        null,
        2,
      ) + "\n",
    );
    await page.close();
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
