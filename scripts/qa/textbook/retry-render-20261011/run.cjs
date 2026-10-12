/** node run.cjs --input packet.json --out evidence --repo-root production-checkout */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const { runBrowser } = require("./browser_qa.cjs");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

function normalizePacket(packet) {
  const groups = Array.isArray(packet) ? packet : [packet];
  const candidates = [];
  for (const group of groups) {
    if (!group || !Array.isArray(group.candidates))
      throw new Error("Expected {candidates:[]} or [{sourceId,candidates:[]}]");
    for (const candidate of group.candidates) {
      if (
        group.sourceId &&
        candidate.sourceId &&
        group.sourceId !== candidate.sourceId
      )
        throw new Error(
          `Source ID mismatch: ${group.sourceId}/${candidate.sourceId}`,
        );
      candidates.push({
        ...candidate,
        sourceId:
          candidate.sourceId ?? group.sourceId ?? candidate.originProblemId,
      });
    }
  }
  if (!candidates.length) throw new Error("Empty packet cannot qualify");
  return candidates;
}

function domTools(parse5) {
  const attr = (node, key) => node.attrs?.find((a) => a.name === key)?.value;
  const walk = (node) => [node, ...(node.childNodes ?? []).flatMap(walk)];
  const text = (node) =>
    node.nodeName === "#text"
      ? node.value
      : (node.childNodes ?? []).map(text).join("");
  const visibleText = (node) =>
    ["math", "annotation", "style", "script"].includes(node.tagName)
      ? ""
      : node.nodeName === "#text"
        ? node.value
        : (node.childNodes ?? []).map(visibleText).join("");
  const svgInfo = (svg) => {
    const nodes = walk(svg);
    return {
      labels: nodes
        .filter((n) => n.tagName === "text")
        .map((n) => text(n).trim())
        .filter(Boolean),
      ids: nodes.map((n) => attr(n, "id")).filter(Boolean),
      svgCount: nodes.filter((n) => n.tagName === "svg").length,
    };
  };
  return {
    attr,
    walk,
    text,
    visibleText,
    svgInfo,
    parse: (html) => parse5.parseFragment(html),
  };
}

async function run(options) {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const out = path.resolve(options.out);
  fs.mkdirSync(path.join(out, "runtime", "chunks"), { recursive: true });
  const runtime = path.join(out, "runtime");
  const fromRepo = createRequire(path.join(repoRoot, "package.json"));
  const esbuild = fromRepo(
    fromRepo.resolve("esbuild", {
      paths: [path.join(repoRoot, "node_modules/tsx")],
    }),
  );
  const { compile } = fromRepo("@tailwindcss/node");
  const dom = domTools(fromRepo("parse5"));
  const inputBytes = fs.readFileSync(options.input);
  const candidates = normalizePacket(JSON.parse(inputBytes));
  if (
    options.expectCount !== undefined &&
    candidates.length !== options.expectCount
  )
    throw new Error(
      `Expected ${options.expectCount} candidates; found ${candidates.length}`,
    );
  const chunkSize = options.chunkSize ?? 100;
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new Error("chunk-size must be positive integer");
  const productionFiles = new Map();
  const dependencies = new Set();
  const fontCss = `@font-face{font-family:PaperNotoSerif;src:url('${path.join(repoRoot, "public/fonts/NotoSerifKR-subset.woff2").replaceAll("\\", "/")}') format('woff2');font-weight:100 900;font-style:normal;font-display:block}
@font-face{font-family:Pretendard;src:url('${path.join(repoRoot, "public/fonts/PretendardVariable.woff2").replaceAll("\\", "/")}') format('woff2');font-weight:45 920;font-style:normal;font-display:block}
:root{--font-noto-serif-kr:PaperNotoSerif;--font-pretendard:Pretendard}`;
  const build = await esbuild.build({
    absWorkingDir: repoRoot,
    entryPoints: [path.join(__dirname, "render_packet.ts")],
    outfile: path.join(runtime, "render.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    alias: { "@": path.join(repoRoot, "src") },
    nodePaths: [path.join(repoRoot, "node_modules")],
    loader: {
      ".module.css": "local-css",
      ".woff2": "dataurl",
      ".woff": "dataurl",
      ".ttf": "dataurl",
    },
    metafile: true,
    logLevel: "silent",
    plugins: [
      {
        name: "qa-font-css",
        setup(b) {
          b.onResolve({ filter: /^qa-paper-fonts\.css$/ }, () => ({
            path: "qa-paper-fonts.css",
            namespace: "qa",
          }));
          b.onLoad({ filter: /.*/, namespace: "qa" }, () => ({
            contents: fontCss,
            loader: "css",
            resolveDir: repoRoot,
          }));
        },
      },
    ],
  });
  for (const file of Object.keys(build.metafile.inputs)) {
    const absolute = path.resolve(repoRoot, file);
    if (
      fs.existsSync(absolute) &&
      (file.startsWith("src/") || file.startsWith("public/"))
    )
      productionFiles.set(
        file.replaceAll("\\", "/"),
        hash(fs.readFileSync(absolute)),
      );
  }
  delete require.cache[require.resolve(path.join(runtime, "render.cjs"))];
  const renderer = require(path.join(runtime, "render.cjs"));
  const rows = [],
    cards = [],
    seen = new Set(),
    seenIds = new Set(),
    allClasses = new Set();
  const failures = [];
  for (const [index, candidate] of candidates.entries()) {
    const issues = [];
    const fail = (code, detail) => issues.push({ code, detail });
    const sourceId = candidate.sourceId;
    const slot = candidate.slot;
    const id = candidate.externalId ?? candidate.id ?? `${sourceId}:${slot}`;
    if (seenIds.has(id)) fail("duplicate_candidate_id", id);
    seenIds.add(id);
    if (
      !sourceId ||
      typeof sourceId !== "string" ||
      !Number.isInteger(slot) ||
      slot < 1
    )
      fail(
        "candidate_identity",
        "sourceId and a positive integer slot are required",
      );
    const key = `${sourceId}:${slot}`;
    if (seen.has(key)) fail("duplicate_source_slot", key);
    seen.add(key);
    for (const field of ["content", "answer", "solution"])
      if (typeof candidate[field] !== "string" || !candidate[field].trim())
        fail("missing_text", field);
    const urls = candidate.figureUrls ?? [];
    for (const [field, length] of [
      ["figureDims", urls.length * 2],
      ["figureSourceMm", urls.length],
      ["choiceFigureIndex", urls.length],
    ]) {
      const value = candidate[field];
      if (
        value != null &&
        (!Array.isArray(value) || (value.length && value.length !== length))
      )
        fail("figure_metadata_length", `${field}: expected ${length}`);
    }
    const payload = Object.fromEntries(
      [
        "content",
        "answer",
        "solution",
        "figureSvg",
        "figureUrls",
        "figureDims",
        "figureSourceMm",
        "choiceFigureIndex",
      ].map((key) => [
        key,
        candidate[key] ??
          (key === "figureSvg"
            ? null
            : key.startsWith("figure") || key === "choiceFigureIndex"
              ? []
              : ""),
      ]),
    );
    let rendered;
    try {
      rendered = renderer.renderCandidate(candidate);
    } catch (error) {
      fail("ssr_exception", error.message);
      rendered = {
        content: "",
        answer: "",
        solution: "",
        choiceCount: 0,
        figureMode: { mode: "none" },
      };
    }
    const parts = {};
    for (const kind of ["content", "answer", "solution"]) {
      const tree = dom.parse(rendered[kind]),
        nodes = dom.walk(tree);
      for (const n of nodes)
        for (const cls of (dom.attr(n, "class") ?? "").split(/\s+/))
          if (cls) allClasses.add(cls);
      const errors = nodes.filter(
        (n) =>
          /(?:katex-error|math-error|math-render-error)/.test(
            dom.attr(n, "class") ?? "",
          ) ||
          /(?:#cc0000|#c00|rgb\(204,\s*0,\s*0\))/.test(
            dom.attr(n, "style") ?? "",
          ),
      );
      if (errors.length)
        fail(
          "math_render_error",
          `${kind}: ${errors.map((n) => dom.attr(n, "title") ?? dom.text(n)).join("; ")}`,
        );
      const text = dom.visibleText(tree);
      const markers = text.match(
        /\[(?:그림|FIGURE)[^\]]*\]|\{\{figure[^}]*\}\}|\$\$/gi,
      );
      if (markers) fail("raw_marker", `${kind}: ${markers.join(", ")}`);
      if (
        nodes.filter((n) => dom.attr(n, "data-paper-view") !== undefined)
          .length !== 1
      )
        fail("missing_paper_view", kind);
      if (
        nodes.some(
          (n) =>
            dom.attr(n, "loading") === "lazy" ||
            dom.attr(n, "data-deferred-figure") !== undefined,
        )
      )
        fail("deferred_print_figure", kind);
      parts[kind] = {
        htmlSha256: hash(rendered[kind]),
        katexCount: nodes.filter((n) =>
          (dom.attr(n, "class") ?? "").split(/\s+/).includes("katex"),
        ).length,
      };
    }
    const contentNodes = dom.walk(dom.parse(rendered.content));
    const images = contentNodes
      .filter((n) => n.tagName === "img")
      .map((n) => ({ src: dom.attr(n, "src"), alt: dom.attr(n, "alt") }));
    for (const url of urls)
      if (
        images.filter((img) => img.src === url).length !==
        urls.filter((value) => value === url).length
      )
        fail("figure_url_correspondence", url);
    const expectedSvg = candidate.figureSvg
      ? dom.svgInfo(dom.parse(candidate.figureSvg))
      : { labels: [], ids: [], svgCount: 0 };
    const svgFrames = contentNodes.filter(
      (n) => dom.attr(n, "data-figure-svg") !== undefined,
    );
    const actualSvg = svgFrames.map(dom.svgInfo);
    if (
      expectedSvg.svgCount &&
      (actualSvg.length !== 1 ||
        actualSvg[0].svgCount !== expectedSvg.svgCount ||
        canonical(actualSvg[0].labels) !== canonical(expectedSvg.labels))
    )
      fail(
        "inline_svg_correspondence",
        "Actual geometric SVG/labels differ from candidate",
      );
    if (
      rendered.figureMode.unlinkedFigureChoices ||
      contentNodes.some(
        (n) => dom.attr(n, "data-figure-choice-notice") !== undefined,
      )
    )
      fail("unlinked_choice_figures", "Choice diagram numbering is unresolved");
    for (const [figureIndex, choice] of (
      candidate.choiceFigureIndex ?? []
    ).entries()) {
      if (choice === null || choice === 0) continue;
      if (
        !Number.isInteger(choice) ||
        choice < 0 ||
        choice > rendered.choiceCount
      )
        fail(
          "choice_figure_index",
          `figure ${figureIndex} -> ${choice}; choices ${rendered.choiceCount}`,
        );
    }
    const positiveChoices = (candidate.choiceFigureIndex ?? []).filter(
      (choice) => Number.isInteger(choice) && choice > 0,
    );
    if (new Set(positiveChoices).size !== positiveChoices.length)
      fail("duplicate_choice_figure_index", positiveChoices);
    const record = {
      index,
      id,
      sourceId,
      slot,
      candidateSha256: hash(canonical(candidate)),
      payloadSha256: hash(canonical(payload)),
      parts,
      expected: {
        urls,
        choiceFigureIndex: candidate.choiceFigureIndex ?? [],
        choiceCount: rendered.choiceCount,
        figureMode: rendered.figureMode,
        svg: expectedSvg,
      },
      passed: !issues.length,
      issues,
    };
    rows.push(record);
    failures.push(...issues.map((issue) => ({ sourceId, slot, id, ...issue })));
    const sections = ["content", "answer", "solution"]
      .map(
        (kind) =>
          `<section data-kind="${kind}"><h2>${kind}</h2><div class="qa-paper-column">${rendered[kind]}</div></section>`,
      )
      .join("");
    cards.push(
      `<article id="candidate-${index}" data-index="${index}" data-source-id="${escape(sourceId)}" data-slot="${slot}" data-candidate-id="${escape(id)}" data-payload-sha256="${record.payloadSha256}"><header>${escape(id)}</header>${sections}</article>`,
    );
  }
  // Tailwind is compiled from the actual global stylesheet and classes emitted
  // by the production component, rather than approximate QA utility styles.
  const globalPath = path.join(repoRoot, "src/app/globals.css");
  productionFiles.set("src/app/globals.css", hash(fs.readFileSync(globalPath)));
  const compiler = await compile(fs.readFileSync(globalPath, "utf8"), {
    base: path.dirname(globalPath),
    from: globalPath,
    onDependency: (file) => dependencies.add(file),
  });
  const utilities = compiler.build([...allClasses]);
  for (const file of dependencies)
    if (fs.existsSync(file))
      productionFiles.set(
        path.relative(repoRoot, file).replaceAll("\\", "/"),
        hash(fs.readFileSync(file)),
      );
  const bundledCss = fs.readFileSync(path.join(runtime, "render.css"), "utf8");
  const variableCss = Object.entries(renderer.paperVariables)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  const envelope = `body{margin:0;background:#f4f5f7}main{padding:8px;max-width:780px;margin:auto}h1{font-size:18px}article{background:white;border:1px solid #ddd;padding:4px;margin:16px 0}header{font:12px Pretendard;overflow-wrap:anywhere}section{margin:12px 0}h2{font:11px Pretendard;margin:4px 0}.qa-paper-column{${variableCss};width:${renderer.columnWidth};margin-inline:auto} @media print{body{background:white}}`;
  const css = utilities + "\n" + bundledCss + "\n" + envelope;
  fs.writeFileSync(path.join(runtime, "production.css"), css);
  const chunks = [];
  for (let start = 0; start < cards.length; start += chunkSize) {
    const end = Math.min(cards.length, start + chunkSize);
    const file = `runtime/chunks/chunk-${String(chunks.length + 1).padStart(3, "0")}.html`;
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Textbook candidate rendering QA</title><link rel="stylesheet" href="../production.css"></head><body><main><h1>Candidates ${start + 1}–${end}</h1>${cards.slice(start, end).join("\n")}</main></body></html>`;
    fs.writeFileSync(path.join(out, file), html);
    chunks.push({
      file,
      start,
      endExclusive: end,
      rows: end - start,
      htmlSha256: hash(html),
    });
  }
  const sourceFiles = [...productionFiles]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, sha256]) => ({ file, sha256 }));
  const result = {
    version: "textbook-production-render-v1",
    passed: !failures.length,
    rows: rows.length,
    sourceCount: new Set(rows.map((row) => row.sourceId)).size,
    input: path.resolve(options.input),
    inputSha256: hash(inputBytes),
    payloadSha256: hash(
      canonical(
        rows.map((row) => ({
          sourceId: row.sourceId,
          slot: row.slot,
          payloadSha256: row.payloadSha256,
        })),
      ),
    ),
    candidatePayloadSha256: renderer.candidatePayloadDigest(candidates),
    component: "PaperProblemView",
    productionCss: true,
    eagerPrintFigures: true,
    columnWidth: renderer.columnWidth,
    repoRoot,
    productionCommit: execFileSync(
      "git",
      ["-C", repoRoot, "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).trim(),
    productionFiles: sourceFiles,
    productionSourceSha256: hash(canonical(sourceFiles)),
    cssFile: "runtime/production.css",
    cssSha256: hash(css),
    chunks,
    entries: rows,
    failures,
    visualReviewApproved: false,
    databaseWrites: 0,
  };
  writeJson(path.join(out, "component-render.json"), result);
  console.log(
    JSON.stringify({
      phase: "ssr",
      rows: rows.length,
      chunks: chunks.length,
      failures: failures.length,
      inputSha256: result.inputSha256,
    }),
  );
  let browserResult;
  if (!options.renderOnly)
    browserResult = await runBrowser({
      out,
      repoRoot,
      fromRepo,
      screenshot: options.screenshot !== false,
    });
  return {
    component: result,
    browser: browserResult,
    passed: result.passed && (options.renderOnly || browserResult.passed),
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2),
    options = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--render-only") options.renderOnly = true;
    else if (flag === "--no-screenshots") options.screenshot = false;
    else if (
      [
        "--input",
        "--out",
        "--repo-root",
        "--chunk-size",
        "--expect-count",
      ].includes(flag)
    ) {
      if (!argv[i + 1]) throw new Error(`Missing value for ${flag}`);
      const key = {
        "--input": "input",
        "--out": "out",
        "--repo-root": "repoRoot",
        "--chunk-size": "chunkSize",
        "--expect-count": "expectCount",
      }[flag];
      options[key] = ["chunkSize", "expectCount"].includes(key)
        ? Number(argv[++i])
        : argv[++i];
    } else throw new Error(`Unknown option: ${flag}`);
  }
  if (!options.input || !options.out)
    throw new Error("--input and --out are required");
  run(options)
    .then((result) => {
      console.log(
        JSON.stringify({
          passed: result.passed,
          out: path.resolve(options.out),
        }),
      );
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
module.exports = { run, normalizePacket, canonical, hash };
