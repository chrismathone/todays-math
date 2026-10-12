/** Complete chunk coverage in headless Chromium; loopback reads only. */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

async function runBrowser({
  out,
  repoRoot,
  fromRepo = createRequire(path.join(repoRoot, "package.json")),
  screenshot = true,
}) {
  const evidenceBytes = fs.readFileSync(
    path.join(out, "component-render.json"),
  );
  const component = JSON.parse(evidenceBytes);
  if (
    hash(fs.readFileSync(path.join(out, component.cssFile))) !==
    component.cssSha256
  )
    throw new Error("CSS hash mismatch");
  for (const chunk of component.chunks)
    if (hash(fs.readFileSync(path.join(out, chunk.file))) !== chunk.htmlSha256)
      throw new Error(`Chunk hash mismatch: ${chunk.file}`);
  const assets = new Map();
  const server = http.createServer((request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405);
      response.end();
      return;
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    const isQa = urlPath.startsWith("/qa/");
    const base = isQa ? out : path.join(repoRoot, "public");
    const file = path.resolve(base, "." + (isQa ? urlPath.slice(3) : urlPath));
    if (!file.startsWith(path.resolve(base) + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      const bytes = fs.readFileSync(file);
      const mime =
        {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".gif": "image/gif",
          ".woff2": "font/woff2",
        }[path.extname(file)] ?? "application/octet-stream";
      if (!isQa)
        assets.set(urlPath, {
          url: urlPath,
          sha256: hash(bytes),
          bytes: bytes.length,
        });
      response.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "public,max-age=3600",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = fromRepo("playwright");
  let browser;
  const checks = [],
    failures = [],
    entries = component.entries.map(
      ({ index, id, sourceId, slot, payloadSha256 }) => ({
        index,
        id,
        sourceId,
        slot,
        payloadSha256,
        checks: [],
      }),
    );
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    let blocked = [];
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(origin + "/") || url.startsWith("data:"))
        route.continue();
      else {
        blocked.push(url);
        route.abort();
      }
    });
    for (const media of ["screen", "print"]) {
      await page.emulateMedia({ media });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        for (const [chunkIndex, chunk] of component.chunks.entries()) {
          blocked = [];
          const expected = component.entries.slice(
            chunk.start,
            chunk.endExclusive,
          );
          await page.goto(`${origin}/qa/${chunk.file}`, { waitUntil: "load" });
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(
              [...document.images].map((img) => img.decode().catch(() => {})),
            );
          });
          const measured = await page.evaluate(
            ({ expected, width, media }) => {
              const visibleText = (element) => {
                const clone = element.cloneNode(true);
                clone
                  .querySelectorAll("math,annotation,style,script")
                  .forEach((n) => n.remove());
                return clone.textContent;
              };
              const rectInfo = (rect) => ({
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              });
              const isVisible = (element) => {
                const rect = element.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return false;
                for (
                  let node = element;
                  node && node.nodeType === 1;
                  node = node.parentElement
                ) {
                  const s = getComputedStyle(node);
                  if (
                    s.display === "none" ||
                    s.visibility === "hidden" ||
                    Number(s.opacity) === 0
                  )
                    return false;
                }
                return true;
              };
              const allIds = new Map();
              for (const element of document.querySelectorAll("[id]")) {
                const id = element.id;
                const group = allIds.get(id) ?? [];
                group.push(element);
                allIds.set(id, group);
              }
              const duplicateIds = [...allIds]
                .filter(([, elements]) => elements.length > 1)
                .map(([id, elements]) => ({
                  id,
                  candidates: elements.map(
                    (e) => e.closest("article")?.dataset.index ?? null,
                  ),
                }));
              const articles = [...document.querySelectorAll("article")];
              const rows = articles.map((article, localIndex) => {
                const e = expected[localIndex],
                  issues = [],
                  fail = (code, detail) => issues.push({ code, detail });
                if (
                  !e ||
                  article.dataset.sourceId !== e.sourceId ||
                  Number(article.dataset.slot) !== e.slot ||
                  article.dataset.candidateId !== e.id ||
                  Number(article.dataset.index) !== e.index ||
                  article.dataset.payloadSha256 !== e.payloadSha256
                )
                  fail("render_identity", {
                    actual: { ...article.dataset },
                    expected: e && {
                      sourceId: e.sourceId,
                      slot: e.slot,
                      id: e.id,
                    },
                  });
                const parts = [
                  ...article.querySelectorAll("section[data-kind]"),
                ].map((section) => {
                  const kind = section.dataset.kind;
                  const column = section.querySelector(".qa-paper-column"),
                    paper = column?.querySelector("[data-paper-view]");
                  if (!column || !paper || !isVisible(paper))
                    fail("missing_visible_paper_view", kind);
                  const text = visibleText(section);
                  const markers = text.match(
                    /\[(?:그림|FIGURE)[^\]]*\]|\{\{figure[^}]*\}\}|\$\$/gi,
                  );
                  if (markers) fail("raw_marker", { kind, markers });
                  const mathErrors = [
                    ...section.querySelectorAll(
                      ".katex-error,.math-error,.math-render-error,[style]",
                    ),
                  ].filter(
                    (n) =>
                      n.matches(
                        ".katex-error,.math-error,.math-render-error",
                      ) ||
                      /(?:#cc0000|#c00|rgb\(204,\s*0,\s*0\))/.test(
                        n.getAttribute("style"),
                      ),
                  );
                  if (mathErrors.length)
                    fail("math_render_error", {
                      kind,
                      errors: mathErrors.map(
                        (n) => n.getAttribute("title") ?? n.textContent,
                      ),
                    });
                  const overflowNodes = [
                    column,
                    paper,
                    ...section.querySelectorAll(
                      "[data-hwpx-grid]>div,[data-box-card],[data-box-grid],.katex-display",
                    ),
                  ].filter(
                    (node) => node && node.scrollWidth > node.clientWidth + 1,
                  );
                  if (overflowNodes.length)
                    fail("paper_content_overflow", {
                      kind,
                      nodes: overflowNodes.map((n) => ({
                        tag: n.tagName,
                        class: n.className,
                        scrollWidth: n.scrollWidth,
                        clientWidth: n.clientWidth,
                      })),
                    });
                  const body = paper?.firstElementChild;
                  const font = body && getComputedStyle(body);
                  if (
                    font &&
                    (!font.fontFamily.includes("PaperNotoSerif") ||
                      Math.abs(parseFloat(font.fontSize) - 12.5) > 0.01)
                  )
                    fail("print_font_parity", {
                      kind,
                      fontFamily: font.fontFamily,
                      fontSize: font.fontSize,
                    });
                  if (
                    column &&
                    Math.abs(
                      column.getBoundingClientRect().width -
                        (((210 * 96) / 25.4 - 100 - 14) * 1.15) / 2.15,
                    ) > 0.1
                  )
                    fail("print_column_parity", {
                      kind,
                      actualWidth: column.getBoundingClientRect().width,
                    });
                  return {
                    kind,
                    width: column?.getBoundingClientRect().width,
                    scrollWidth: column?.scrollWidth,
                    paperViews:
                      section.querySelectorAll("[data-paper-view]").length,
                    katexCount: section.querySelectorAll(".katex").length,
                    mathErrors: mathErrors.length,
                  };
                });
                if (
                  parts.length !== 3 ||
                  parts.some((part) => part.paperViews !== 1)
                )
                  fail("paper_section_coverage", parts);
                const images = [...article.querySelectorAll("img")];
                const broken = images.filter(
                  (img) =>
                    !img.complete || img.naturalWidth === 0 || !isVisible(img),
                );
                if (broken.length)
                  fail(
                    "broken_or_hidden_asset",
                    broken.map((img) => img.getAttribute("src")),
                  );
                if (
                  images.some((img) => img.loading === "lazy") ||
                  article.querySelector(
                    "[data-deferred-figure],[data-figure-placeholder]",
                  )
                )
                  fail("deferred_print_figure", "Eager print path required");
                const content = article.querySelector('[data-kind="content"]');
                const choices = content.querySelector("[data-hwpx-grid]");
                for (const [figureIndex, url] of (
                  e?.expected.urls ?? []
                ).entries()) {
                  const imgs = [...content.querySelectorAll("img")].filter(
                    (img) => img.getAttribute("src") === url,
                  );
                  if (!imgs.length) fail("missing_figure_url", url);
                  const number = e.expected.choiceFigureIndex[figureIndex];
                  if (Number.isInteger(number) && number > 0) {
                    const cell = choices?.children[number - 1];
                    if (!cell || !imgs.some((img) => cell.contains(img)))
                      fail("choice_diagram_correspondence", {
                        figureIndex,
                        choice: number,
                        url,
                      });
                  } else if (
                    number === 0 &&
                    imgs.some((img) => choices?.contains(img))
                  )
                    fail("stem_diagram_in_choice", { figureIndex, url });
                }
                const svgFrames = [
                  ...content.querySelectorAll("[data-figure-svg]"),
                ];
                const svgs = svgFrames.flatMap((frame) => [
                  ...frame.querySelectorAll("svg"),
                ]);
                if (svgs.length !== (e?.expected.svg.svgCount ?? 0))
                  fail("actual_inline_svg_count", {
                    expected: e?.expected.svg.svgCount,
                    actual: svgs.length,
                  });
                const labels = svgFrames
                  .flatMap((frame) => [...frame.querySelectorAll("text")])
                  .map((node) => node.textContent.trim())
                  .filter(Boolean);
                if (
                  JSON.stringify(labels) !==
                  JSON.stringify(e?.expected.svg.labels ?? [])
                )
                  fail("inline_svg_labels", {
                    expected: e?.expected.svg.labels,
                    actual: labels,
                  });
                const labelBounds = [];
                for (const svg of svgs) {
                  if (!isVisible(svg))
                    fail(
                      "invisible_inline_svg",
                      rectInfo(svg.getBoundingClientRect()),
                    );
                  const viewBox = svg.viewBox.baseVal;
                  for (const text of svg.querySelectorAll("text")) {
                    // Empty table cells do not contain a label to make visible.
                    // Nonempty labels must still match the source SVG and pass every check.
                    if (!text.textContent.trim()) continue;
                    if (/\\[a-zA-Z]+/.test(text.textContent))
                      fail("untypeset_svg_math", text.textContent);
                    const bbox = text.getBBox();
                    labelBounds.push({
                      text: text.textContent.trim(),
                      bbox: rectInfo(bbox),
                      visible: isVisible(text),
                    });
                    if (!isVisible(text))
                      fail("invisible_svg_label", text.textContent);
                    // getBoundingClientRect includes parent SVG transforms; compare
                    // against the rendered SVG viewport, rather than raw coordinates.
                    const bounds = text.getBoundingClientRect(),
                      viewport = svg.getBoundingClientRect();
                    if (
                      viewBox.width > 0 &&
                      (bounds.left < viewport.left - 1 ||
                        bounds.right > viewport.right + 1 ||
                        bounds.top < viewport.top - 1 ||
                        bounds.bottom > viewport.bottom + 1)
                    )
                      fail("clipped_svg_label", {
                        text: text.textContent,
                        label: rectInfo(bounds),
                        viewport: rectInfo(viewport),
                      });
                  }
                  const svgIds = new Set(
                    [...svg.querySelectorAll("[id]")].map((n) => n.id),
                  );
                  if (svg.id) svgIds.add(svg.id);
                  for (const element of [svg, ...svg.querySelectorAll("*")]) {
                    for (const attribute of element.attributes) {
                      const refs = [
                        ...attribute.value.matchAll(/url\(#([^)]*)\)/g),
                      ].map((m) => m[1]);
                      if (
                        ["href", "xlink:href"].includes(attribute.name) &&
                        attribute.value.startsWith("#")
                      )
                        refs.push(attribute.value.slice(1));
                      for (const ref of refs)
                        if (!svgIds.has(ref)) fail("unresolved_svg_id", ref);
                    }
                  }
                }
                for (const duplicate of duplicateIds)
                  if (duplicate.candidates.includes(article.dataset.index))
                    fail("duplicate_dom_id", duplicate.id);
                return {
                  index: e?.index ?? Number(article.dataset.index),
                  sourceId: article.dataset.sourceId,
                  slot: Number(article.dataset.slot),
                  passed: !issues.length,
                  parts,
                  imageCount: images.length,
                  brokenImages: broken.length,
                  svgCount: svgs.length,
                  labels,
                  labelBounds,
                  issues,
                };
              });
              const documentOverflow =
                document.documentElement.scrollWidth > innerWidth + 1 ||
                document.body.scrollWidth > innerWidth + 1;
              return {
                width,
                media,
                rows,
                articleCount: articles.length,
                paperViews:
                  document.querySelectorAll("[data-paper-view]").length,
                documentOverflow,
                documentWidth: document.documentElement.scrollWidth,
                bodyWidth: document.body.scrollWidth,
                loadedPaperFont: document.fonts.check("12.5px PaperNotoSerif"),
                duplicateIds,
              };
            },
            { expected, width, media },
          );
          const check = {
            width,
            media,
            chunk: chunk.file,
            start: chunk.start,
            endExclusive: chunk.endExclusive,
            rows: measured.articleCount,
            paperViews: measured.paperViews,
            documentOverflow: measured.documentOverflow,
            documentWidth: measured.documentWidth,
            bodyWidth: measured.bodyWidth,
            loadedPaperFont: measured.loadedPaperFont,
            blockedExternalRequests: [...new Set(blocked)],
          };
          Object.assign(check, {
            mathErrors: measured.rows.reduce(
              (sum, row) =>
                sum + row.parts.reduce((n, part) => n + part.mathErrors, 0),
              0,
            ),
            brokenImages: measured.rows.reduce(
              (sum, row) => sum + row.brokenImages,
              0,
            ),
            contentOverflow: measured.rows.flatMap((row) =>
              row.issues
                .filter((issue) => issue.code === "paper_content_overflow")
                .map((issue) => ({
                  sourceId: row.sourceId,
                  slot: row.slot,
                  kind: issue.detail.kind,
                })),
            ),
          });
          if (
            measured.articleCount !== chunk.rows ||
            measured.paperViews !== chunk.rows * 3
          )
            failures.push({ code: "chunk_coverage", ...check });
          if (measured.documentOverflow)
            failures.push({
              code: "full_body_overflow",
              ...check,
              candidates: measured.rows
                .filter((row) =>
                  row.issues.some((i) => i.code === "paper_content_overflow"),
                )
                .map((row) => ({ sourceId: row.sourceId, slot: row.slot })),
            });
          if (!measured.loadedPaperFont)
            failures.push({ code: "paper_font_missing", ...check });
          if (blocked.length)
            failures.push({ code: "external_assets_blocked", ...check });
          for (const row of measured.rows) {
            entries[row.index].checks.push({
              width,
              media,
              chunk: chunk.file,
              ...row,
            });
            failures.push(
              ...row.issues.map((issue) => ({
                sourceId: row.sourceId,
                slot: row.slot,
                width,
                media,
                ...issue,
              })),
            );
          }
          checks.push(check);
          if (screenshot && chunkIndex === 0 && media === "print")
            await page.screenshot({
              path: path.join(out, `packet-${width}.png`),
              fullPage: false,
            });
          console.log(
            JSON.stringify({
              phase: "browser",
              width,
              media,
              chunk: chunkIndex + 1,
              chunks: component.chunks.length,
              rows: measured.articleCount,
              failedRows: measured.rows.filter((row) => !row.passed).length,
              documentOverflow: measured.documentOverflow,
            }),
          );
        }
      }
    }
    for (const entry of entries)
      if (entry.checks.length !== 4)
        failures.push({
          sourceId: entry.sourceId,
          slot: entry.slot,
          code: "incomplete_browser_coverage",
          checks: entry.checks.length,
        });
    const summaryChecks = ["screen", "print"].flatMap((media) =>
      [1440, 390].map((width) => {
        const matching = checks.filter(
          (check) => check.width === width && check.media === media,
        );
        return {
          width,
          media,
          rows: matching.reduce((n, check) => n + check.rows, 0),
          chunks: matching.length,
          mathErrors: matching.reduce((n, check) => n + check.mathErrors, 0),
          documentOverflow: matching.some((check) => check.documentOverflow),
          brokenImages: matching.reduce(
            (n, check) => n + check.brokenImages,
            0,
          ),
          contentOverflow: matching.flatMap((check) => check.contentOverflow),
        };
      }),
    );
    const report = {
      version: "textbook-production-browser-v1",
      passed: component.passed && !failures.length,
      rows: component.rows,
      inspectedCandidates: entries.filter((entry) => entry.checks.length === 4)
        .length,
      candidateViewportChecks: entries.reduce(
        (sum, entry) => sum + entry.checks.length,
        0,
      ),
      componentRenderSha256: hash(evidenceBytes),
      inputSha256: component.inputSha256,
      payloadSha256: component.payloadSha256,
      productionSourceSha256: component.productionSourceSha256,
      cssSha256: component.cssSha256,
      browser: browser.version(),
      candidatePayloadSha256: component.candidatePayloadSha256,
      checks: summaryChecks,
      chunkChecks: checks,
      entries,
      failures,
      assets: [...assets.values()],
      scope:
        "All candidate content/answer/solution in production PaperProblemView SSR, real print column, local production CSS/modules and data URL fonts; screen and print media at 1440/390; no pagination, paper printer, mathematics or human approval",
      databaseWrites: 0,
    };
    fs.writeFileSync(
      path.join(out, "browser-qa.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    return report;
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
if (require.main === module) {
  const [out, repoRoot = process.cwd()] = process.argv.slice(2);
  if (!out) throw new Error("Evidence directory required");
  runBrowser({ out: path.resolve(out), repoRoot: path.resolve(repoRoot) })
    .then((report) => {
      console.log(
        JSON.stringify({
          passed: report.passed,
          rows: report.rows,
          failures: report.failures.length,
        }),
      );
      if (!report.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
module.exports = { runBrowser };
