#!/usr/bin/env node
// Read-only deployment QA. No env-file loader, application server, DB or AI calls.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  validateManifest,
  manifestSha256,
} from "../storage/shared-figures.mjs";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
class QaError extends Error {}
function ensure(condition, message) {
  if (!condition) throw new QaError(message);
}
function git(...args) {
  return execFileSync("git", ["--no-optional-locks", "-C", repo, ...args], {
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
const help = `Shared figure deployment / export QA
  node scripts/qa/verify-shared-figure-deployment.mjs --origin https://DEPLOYED-HOST --out .qa-artifacts/production
  node scripts/qa/verify-shared-figure-deployment.mjs --fixture --out .qa-artifacts/fixture

Options:
  --dependencies PATH  Installed node_modules directory (default: checkout/node_modules).
  --png PATH --svg PATH Override sample paths; both must exist in the live manifest.
  --pdf-proxy          Explicit loopback PDF asset bridge; see QA notes for limits.
  --fixture-fault TYPE Fixture-only: redirect, mime, bytes, head-mime, missing-200, static-headers.
  --help              Print this usage without requests or artifacts.

Origin must be HTTPS with no path, query, credentials or fragment. Output must be empty.
Optional protection header: VERCEL_AUTOMATION_BYPASS_SECRET (environment only).
With protection, --pdf-proxy is required because buildPdf has no header/cookie hook.
See docs/qa/shared-figure-deployment-harness.md for evidence and scope.`;

function options() {
  const { values } = parseArgs({
    options: {
      origin: { type: "string" },
      out: { type: "string" },
      dependencies: { type: "string" },
      png: { type: "string" },
      svg: { type: "string" },
      fixture: { type: "boolean", default: false },
      "pdf-proxy": { type: "boolean", default: false },
      "fixture-fault": { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return { help: true };
  ensure(values.out, "Supply --out with an empty artifact directory.");
  ensure(
    values.fixture !== Boolean(values.origin),
    "Supply either --origin or --fixture.",
  );
  if (values.origin) {
    let url;
    try {
      url = new URL(values.origin);
    } catch {
      throw new QaError("Invalid deployed origin.");
    }
    ensure(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        [url.origin, `${url.origin}/`].includes(values.origin),
      "Origin must be a bare HTTPS origin; secrets belong only in the environment.",
    );
    values.origin = url.origin;
  }
  ensure(
    !values["fixture-fault"] ||
      (values.fixture &&
        [
          "redirect",
          "mime",
          "bytes",
          "head-mime",
          "missing-200",
          "static-headers",
        ].includes(values["fixture-fault"])),
    "Invalid fixture fault (or supplied outside fixture mode).",
  );
  ensure(
    !process.env.VERCEL_AUTOMATION_BYPASS_SECRET || values["pdf-proxy"],
    "Protection bypass requires explicit --pdf-proxy; buildPdf cannot attach its header.",
  );
  return values;
}

async function samples(opts) {
  const manifest = validateManifest(
    JSON.parse(
      await readFile(
        path.join(repo, "src/config/shared-figures.manifest.json"),
        "utf8",
      ),
    ),
  );
  // Read Git objects even if deployment preparation removed checkout/public assets.
  const styled = git(
    "grep",
    "-l",
    "-e",
    "<style",
    "-e",
    "style=",
    manifest.sourceCommit,
    "--",
    "public/figures-svg",
  )
    .toString("utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.slice(`${manifest.sourceCommit}:public`.length))
    .filter((p) => manifest.entries[p]?.mimeType === "image/svg+xml")
    .sort(
      (a, b) =>
        manifest.entries[a].size - manifest.entries[b].size ||
        a.localeCompare(b),
    );
  const png =
    opts.png ||
    Object.keys(manifest.entries)
      .sort()
      .find((p) => manifest.entries[p].mimeType === "image/png");
  const svg = opts.svg || styled[0];
  const selected = [png, svg].map((p, i) => {
    const entry = manifest.entries[p];
    ensure(
      entry?.mimeType === ["image/png", "image/svg+xml"][i],
      "Samples must be real manifest PNG and SVG paths.",
    );
    const bytes = git("show", `${manifest.sourceCommit}:public${p}`);
    ensure(
      bytes.length === entry.size && hash(bytes) === entry.sha256,
      "Canonical Git bytes disagree with manifest.",
    );
    if (i === 1)
      ensure(
        /<style\b|\sstyle\s*=/i.test(bytes.toString("utf8")),
        "SVG sample must use inline CSS/style.",
      );
    return {
      path: p,
      ...entry,
      bytes,
      dataUrl: `data:${entry.mimeType};base64,${bytes.toString("base64")}`,
    };
  });
  return { manifest, selected };
}

async function loadHelpers(dependencies, out) {
  const require = createRequire(path.join(dependencies, "../package.json"));
  const { build } = require(
    require.resolve("esbuild", {
      paths: [path.dirname(require.resolve("tsx"))],
    }),
  );
  const common = {
    bundle: true,
    write: false,
    logLevel: "silent",
    nodePaths: [dependencies],
    absWorkingDir: repo,
  };
  const runtime = await build({
    ...common,
    platform: "node",
    format: "cjs",
    stdin: {
      resolveDir: repo,
      contents: `
      export { buildPdf, launchExportBrowser } from './src/lib/export/pdfServer.ts';
      export { buildHwpxParts, HwpxPayloadSchema } from './src/lib/export/hwpxServer.ts';
      export { createSharedFigureAssetHandler } from './src/lib/sharedFigureAssets.ts';`,
    },
    plugins: [
      {
        name: "explicit-installed-dependencies",
        setup(builder) {
          builder.onResolve({ filter: /^[^./]|^@/ }, (args) => {
            if (
              args.path.startsWith("node:") ||
              builtinModules.includes(args.path)
            )
              return { path: args.path, external: true };
            if (path.isAbsolute(args.path) || args.path.startsWith("@/"))
              return;
            return { path: require.resolve(args.path), external: true };
          });
        },
      },
    ],
  });
  const runtimePath = path.join(out, "runtime.cjs");
  await writeFile(runtimePath, runtime.outputFiles[0].text);
  const browserBundle = await build({
    ...common,
    platform: "browser",
    format: "iife",
    globalName: "FigureQa",
    stdin: {
      resolveDir: repo,
      contents: `
      export { collectHwpxLayout } from './src/lib/export/hwpxLayout.ts';
      export { hwpxZip } from './src/lib/export/hwpxZip.ts';`,
    },
  });
  return {
    ...require(runtimePath),
    browserBundle: browserBundle.outputFiles[0].text,
    pdfJs: await readFile(require.resolve("pdfjs-dist/build/pdf.mjs"), "utf8"),
    pdfWorker: await readFile(
      require.resolve("pdfjs-dist/build/pdf.worker.mjs"),
      "utf8",
    ),
  };
}

async function listen(handler) {
  const server = createServer((req, res) => {
    void handler(req, res).catch(() => {
      res.statusCode = 502;
      res.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

async function fixtureServer(helpers, manifest, selected, fault, headers) {
  const subset = {
    ...manifest,
    entries: Object.fromEntries(
      selected.map((s) => [s.path, manifest.entries[s.path]]),
    ),
  };
  const handler = helpers.createSharedFigureAssetHandler({
    manifest: subset,
    baseUrl: "https://fixture.invalid/storage/v1/object/public/shared-figures",
    fetch: async (input) => {
      const sample = selected.find((s) => String(input).endsWith(s.objectPath));
      ensure(sample, "Fixture requested an unexpected object.");
      return new Response(sample.bytes, {
        headers: { "Content-Type": sample.mimeType },
      });
    },
  });
  return listen(async (req, res) => {
    if (
      headers["x-vercel-protection-bypass"] &&
      req.headers["x-vercel-protection-bypass"] !==
        headers["x-vercel-protection-bypass"]
    ) {
      res.statusCode = 401;
      res.end();
      return;
    }
    const p = new URL(req.url, "http://fixture.invalid").pathname;
    const sample = selected.find((s) => s.path === p);
    if (fault === "redirect" && sample) {
      res.writeHead(307, { Location: "/redirect-must-not-be-followed" });
      res.end();
      return;
    }
    if (fault === "missing-200" && !sample) {
      res.statusCode = 200;
      res.end();
      return;
    }
    const [, kind, ...parts] = p.split("/");
    const response = await handler(
      new Request(`http://fixture.invalid${p}`, { method: req.method }),
      { params: Promise.resolve({ kind, path: parts }) },
    );
    res.statusCode = response.status;
    response.headers.forEach((value, name) => res.setHeader(name, value));
    if (sample && fault === "static-headers") {
      res.removeHeader("ETag");
      res.removeHeader("Content-Security-Policy");
    }
    if (
      sample &&
      (fault === "mime" || (fault === "head-mime" && req.method === "HEAD"))
    )
      res.setHeader("Content-Type", "text/plain");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sample && fault === "bytes" && bytes.length)
      bytes[bytes.length - 1] ^= 1;
    res.end(bytes);
  });
}

async function checkedRequest(
  origin,
  sample,
  method,
  headers,
  expectedStatus = 200,
) {
  const url = new URL(sample.path, origin).href;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { ...headers, "Accept-Encoding": "identity" },
      redirect: "manual",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    ensure(
      response.status === expectedStatus &&
        !response.redirected &&
        response.url === url &&
        !response.headers.has("location"),
      `${method} ${sample.path}: expected ${expectedStatus}, received ${response.status}; redirects forbidden.`,
    );
    if (expectedStatus === 200) {
      ensure(
        response.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() === sample.mimeType,
        `${method} ${sample.path}: MIME mismatch.`,
      );
      ensure(
        response.headers.get("etag") === `"sha256-${sample.sha256}"`,
        `${method} ${sample.path}: manifest SHA ETag missing; static originals are not proxy proof.`,
      );
      if (sample.mimeType === "image/svg+xml")
        ensure(
          response.headers.get("content-security-policy") ===
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          `${method} ${sample.path}: restrictive SVG proxy CSP mismatch.`,
        );
      const length = response.headers.get("content-length");
      if (length !== null)
        ensure(
          Number(length) === sample.size,
          `${method} ${sample.path}: Content-Length mismatch.`,
        );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (method === "HEAD")
      ensure(bytes.length === 0, `${method} ${sample.path}: unexpected body.`);
    else if (expectedStatus === 200)
      ensure(
        bytes.length === sample.size && hash(bytes) === sample.sha256,
        `${method} ${sample.path}: canonical SHA/size mismatch.`,
      );
    return {
      bytes,
      evidence: {
        path: sample.path,
        method,
        status: response.status,
        redirects: 0,
        ...(expectedStatus === 200
          ? {
              mimeType: sample.mimeType,
              contentLength: response.headers.has("content-length")
                ? Number(response.headers.get("content-length"))
                : null,
              etag: `"sha256-${sample.sha256}"`,
              ...(sample.mimeType === "image/svg+xml"
                ? {
                    contentSecurityPolicy:
                      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
                  }
                : {}),
              bodyBytes: bytes.length,
              ...(method === "GET" ? { sha256: hash(bytes) } : {}),
            }
          : {}),
      },
    };
  } finally {
    await response?.body?.cancel().catch(() => {});
  }
}

const paper = (sources) =>
  `<main data-mathgen-document><section data-unified-paper style="width:794px;height:1122px;box-sizing:border-box;background:white;padding:36px"><h1 style="font:20px Arial;margin:0 0 24px">Shared figure QA</h1>${sources.map((src) => `<img src="${src}" style="display:block;width:320px;height:220px;margin:0 0 36px">`).join("")}</section></main>`;

async function browserPage(browser, origin, html, selected, headers, evidence) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  const documentUrl = `${origin}/__shared_figure_qa_${randomUUID()}`;
  const allowed = new Map(
    selected.map((s) => [new URL(s.path, origin).href, s.path]),
  );
  page.on("request", (request) => {
    let action;
    if (request.url() === documentUrl && request.isNavigationRequest()) {
      // Only this synthetic document is intercepted; figure bytes come from the deployed origin.
      action = request.respond({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><style>html,body{margin:0;padding:0}</style>${html}`,
      });
    } else if (
      allowed.has(request.url()) &&
      request.redirectChain().length === 0 &&
      request.resourceType() === "image"
    ) {
      action = request.continue({
        headers: { ...request.headers(), ...headers },
      });
    } else if (/^(data:|blob:)/.test(request.url()))
      action = request.continue();
    else action = request.abort();
    void action.catch(() => {
      evidence.push({ failure: "request interception failed" });
    });
  });
  page.on("response", (response) => {
    if (allowed.has(response.url()))
      evidence.push({
        path: allowed.get(response.url()),
        status: response.status(),
        redirects: response.request().redirectChain().length,
      });
  });
  page.on("requestfailed", (request) => {
    if (allowed.has(request.url()))
      evidence.push({
        path: allowed.get(request.url()),
        failure: "image request failed",
      });
  });
  await page.goto(documentUrl, { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images, (img) => img.decode()));
  });
  return page;
}

async function imagePixels(page, sources) {
  return page.evaluate(async (sources) => {
    const results = [];
    for (const src of sources) {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", rgba)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      let inkPixels = 0;
      for (let i = 0; i < rgba.length; i += 4)
        if (
          rgba[i + 3] > 0 &&
          Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) < 245
        )
          inkPixels++;
      results.push({
        width: canvas.width,
        height: canvas.height,
        sha256,
        inkPixels,
      });
    }
    return results;
  }, sources);
}

async function collectLayout(page, bundle) {
  await page.addScriptTag({ content: bundle });
  return page.evaluate(async () => {
    const { pages, assets } = await window.FigureQa.collectHwpxLayout(
      document.querySelector("main"),
    );
    const encoded = {};
    for (const [name, blob] of Object.entries(assets)) {
      encoded[name] = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(blob);
      });
    }
    return { pages, assets: encoded };
  });
}

// The existing ZIP writer emits stored entries. Check actual archive contents, not just a PK signature.
function storedZipEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (
    offset + 30 <= bytes.length &&
    bytes.readUInt32LE(offset) === 0x04034b50
  ) {
    ensure(
      bytes.readUInt16LE(offset + 8) === 0 &&
        (bytes.readUInt16LE(offset + 6) & 8) === 0,
      "Unexpected HWPX ZIP encoding.",
    );
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26),
      extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes
      .subarray(offset + 30, offset + 30 + nameLength)
      .toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    ensure(
      start + size <= bytes.length && !entries.has(name),
      "Invalid HWPX ZIP entry.",
    );
    entries.set(name, bytes.subarray(start, start + size));
    offset = start + size;
  }
  ensure(
    entries.size > 0 && bytes.readUInt32LE(offset) === 0x02014b50,
    "HWPX central directory missing.",
  );
  return entries;
}

async function renderPdf(page, helpers, bytes, imageBoxes) {
  // PDF.js runs locally with its installed worker; neither PDF bytes nor references leave this browser.
  await page.evaluate(
    async ({ source, worker }) => {
      const url = URL.createObjectURL(
        new Blob([source], { type: "text/javascript" }),
      );
      window.FigurePdf = await import(url);
      window.FigurePdf.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
        new Blob([worker], { type: "text/javascript" }),
      );
    },
    { source: helpers.pdfJs, worker: helpers.pdfWorker },
  );
  return page.evaluate(
    async ({ encoded, imageBoxes }) => {
      const pdf = await window.FigurePdf.getDocument({
        data: Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
        isEvalSupported: false,
      }).promise;
      const pages = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const p = await pdf.getPage(number),
          viewport = p.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        await p.render({ canvasContext: ctx, viewport }).promise;
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const sha256 = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", rgba)),
          (n) => n.toString(16).padStart(2, "0"),
        ).join("");
        const operations = await p.getOperatorList();
        const imagePaints = operations.fnArray.filter((fn) =>
          [
            window.FigurePdf.OPS.paintImageXObject,
            window.FigurePdf.OPS.paintInlineImageXObject,
          ].includes(fn),
        ).length;
        const scale = viewport.width / 794;
        const imageRegions = imageBoxes.map((box) => {
          let inkPixels = 0;
          for (
            let y = Math.ceil(box.y * scale);
            y < Math.floor((box.y + box.height) * scale);
            y++
          ) {
            for (
              let x = Math.ceil(box.x * scale);
              x < Math.floor((box.x + box.width) * scale);
              x++
            ) {
              const i = (y * canvas.width + x) * 4;
              if (Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) < 245)
                inkPixels++;
            }
          }
          return { path: box.path, inkPixels };
        });
        pages.push({
          width: canvas.width,
          height: canvas.height,
          sha256,
          imagePaints,
          imageRegions,
          png: canvas.toDataURL("image/png").split(",")[1],
        });
      }
      await pdf.loadingTask.destroy();
      return pages;
    },
    { encoded: bytes.toString("base64"), imageBoxes },
  );
}

async function main() {
  let out,
    stage = "arguments",
    browser,
    fixture,
    bridge;
  const report = {
    schemaVersion: 1,
    status: "running",
    startedAt: new Date().toISOString(),
    http: [],
    browserRequests: [],
  };
  try {
    const opts = options();
    if (opts.help) {
      console.log(help);
      return;
    }
    const requestedOut = path.resolve(opts.out);
    await mkdir(requestedOut, { recursive: true });
    ensure(
      (await readdir(requestedOut)).length === 0,
      "Output directory must be empty; use a fresh run directory.",
    );
    out = requestedOut;
    // Never let the HWPX helper select its signed remote engine in a QA process.
    delete process.env.STUDIO_ENGINE_URL;
    delete process.env.VERCEL;
    process.chdir(repo);
    const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass":
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : {};
    report.mode = opts.fixture ? "local-fixture" : "live-deployment";
    report.protectionBypass = Boolean(headers["x-vercel-protection-bypass"]);
    report.pdfTransport = opts["pdf-proxy"]
      ? "explicit-loopback-bridge"
      : "direct-origin";
    report.gitHead = git("rev-parse", "HEAD").toString("utf8").trim();
    report.harnessSha256 = hash(await readFile(fileURLToPath(import.meta.url)));
    stage = "canonical samples";
    const { manifest, selected } = await samples(opts);
    report.sourceCommit = manifest.sourceCommit;
    report.manifestSha256 = manifestSha256(manifest);
    report.manifestCount = Object.keys(manifest.entries).length;
    report.samples = selected.map(({ path, sha256, size, mimeType }) => ({
      path,
      sha256,
      size,
      mimeType,
    }));
    stage = "installed helpers";
    const helpers = await loadHelpers(
      path.resolve(opts.dependencies || path.join(repo, "node_modules")),
      out,
    );
    let origin = opts.origin;
    if (opts.fixture) {
      fixture = await fixtureServer(
        helpers,
        manifest,
        selected,
        opts["fixture-fault"],
        headers,
      );
      origin = fixture.origin;
    }
    report.origin = origin;
    stage = "same-origin GET and HEAD";
    for (const sample of selected)
      for (const method of ["GET", "HEAD"]) {
        const result = await checkedRequest(origin, sample, method, headers);
        report.http.push(result.evidence);
        if (method === "GET")
          await writeFile(
            path.join(
              out,
              `deployed-${selected.indexOf(sample)}${path.extname(sample.path)}`,
            ),
            result.bytes,
          );
      }
    stage = "missing-path 404";
    for (const root of ["figures", "figures-svg"]) {
      const missing = {
        path: `/${root}/__qa_missing_${randomUUID()}.${root === "figures" ? "png" : "svg"}`,
      };
      ensure(
        !manifest.entries[missing.path],
        "Missing-path probe unexpectedly exists in manifest.",
      );
      for (const method of ["GET", "HEAD"])
        report.http.push(
          (await checkedRequest(origin, missing, method, headers, 404))
            .evidence,
        );
    }
    stage = "browser canonical pixels";
    browser = await helpers.launchExportBrowser();
    report.browserVersion = await browser.version();
    const html = paper(selected.map((s) => s.path));
    const canonicalHtml = paper(selected.map((s) => s.dataUrl));
    const page = await browserPage(
      browser,
      origin,
      html,
      selected,
      headers,
      report.browserRequests,
    );
    const canonicalPage = await browserPage(
      browser,
      origin,
      canonicalHtml,
      [],
      {},
      [],
    );
    const actual = await imagePixels(
      page,
      selected.map((s) => s.path),
    );
    const expected = await imagePixels(
      canonicalPage,
      selected.map((s) => s.dataUrl),
    );
    ensure(
      JSON.stringify(actual) === JSON.stringify(expected),
      "Browser decoded pixels differ from canonical Git assets.",
    );
    ensure(
      expected.every((s) => s.inkPixels > 0),
      "A canonical sample has no visible ink.",
    );
    const stripped = selected[1].bytes
      .toString("utf8")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
      .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
    const [withoutStyles] = await imagePixels(canonicalPage, [
      `data:image/svg+xml;base64,${Buffer.from(stripped).toString("base64")}`,
    ]);
    report.pixels = actual.map((s, i) => ({
      path: selected[i].path,
      ...s,
      canonicalMatch: true,
    }));
    report.svgContainsInlineStyle = true;
    // Real corpus styles can be blend modes on nonoverlapping shapes. Report the
    // observed sensitivity honestly; never invent a styled live manifest fixture.
    report.svgStyleChangesPixels = withoutStyles.sha256 !== expected[1].sha256;
    await page.bringToFront();
    await page.screenshot({
      path: path.join(out, "browser-deployed.png"),
      fullPage: true,
    });
    await canonicalPage.bringToFront();
    await canonicalPage.screenshot({
      path: path.join(out, "browser-canonical.png"),
      fullPage: true,
    });
    stage = "HWPX layout, assets and archive";
    const liveLayout = await collectLayout(page, helpers.browserBundle);
    const canonicalLayout = await collectLayout(
      canonicalPage,
      helpers.browserBundle,
    );
    ensure(
      JSON.stringify(liveLayout.pages) ===
        JSON.stringify(canonicalLayout.pages),
      "HWPX layout differs from canonical layout.",
    );
    ensure(
      liveLayout.pages.length === 1 &&
        liveLayout.pages[0].objects.filter((o) => o.type === "image").length ===
          selected.length,
      "HWPX image objects are missing.",
    );
    const assetNames = Object.keys(liveLayout.assets).sort();
    ensure(
      assetNames.length === selected.length &&
        JSON.stringify(assetNames) ===
          JSON.stringify(Object.keys(canonicalLayout.assets).sort()),
      "HWPX image assets are missing.",
    );
    const liveAssetPixels = await imagePixels(
      page,
      assetNames.map(
        (name) => `data:image/png;base64,${liveLayout.assets[name]}`,
      ),
    );
    const canonicalAssetPixels = await imagePixels(
      canonicalPage,
      assetNames.map(
        (name) => `data:image/png;base64,${canonicalLayout.assets[name]}`,
      ),
    );
    ensure(
      JSON.stringify(liveAssetPixels) ===
        JSON.stringify(canonicalAssetPixels) &&
        liveAssetPixels.every((p) => p.inkPixels > 0),
      "HWPX raster assets differ or are blank.",
    );
    const parts = await helpers.buildHwpxParts(
      helpers.HwpxPayloadSchema.parse({
        title: "Shared figure QA",
        pages: liveLayout.pages,
      }),
    );
    const archiveBase64 = await page.evaluate(
      async ({ parts, assets }) => {
        const blobs = Object.fromEntries(
          Object.entries(assets).map(([name, value]) => [
            name,
            new Blob([Uint8Array.from(atob(value), (c) => c.charCodeAt(0))], {
              type: "image/png",
            }),
          ]),
        );
        const blob = await window.FigureQa.hwpxZip(parts, blobs);
        return new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result.split(",")[1]);
          r.readAsDataURL(blob);
        });
      },
      { parts, assets: liveLayout.assets },
    );
    const archive = Buffer.from(archiveBase64, "base64"),
      entries = storedZipEntries(archive);
    ensure(
      entries.get("mimetype")?.toString() === "application/hwp+zip" &&
        entries.has("Contents/section0.xml"),
      "HWPX document parts missing.",
    );
    for (const name of assetNames) {
      ensure(
        entries
          .get(name)
          ?.equals(Buffer.from(liveLayout.assets[name], "base64")),
        "HWPX archive changed or omitted an image.",
      );
      const id = path.posix.basename(name, ".png");
      ensure(
        entries
          .get("Contents/section0.xml")
          .toString()
          .includes(`binaryItemIDRef="${id}"`),
        "HWPX section lacks image reference.",
      );
      await writeFile(path.join(out, `hwpx-${id}.png`), entries.get(name));
    }
    await writeFile(path.join(out, "shared-figures.hwpx"), archive);
    report.hwpx = {
      pages: liveLayout.pages.length,
      images: assetNames.map((name, i) => ({
        name,
        ...liveAssetPixels[i],
        canonicalMatch: true,
      })),
      bytes: archive.length,
      sha256: hash(archive),
      engine: "local-python",
    };
    stage = "PDF export and rendered canonical comparison";
    let pdfOrigin = origin;
    report.pdfBridgeRequests = [];
    if (opts["pdf-proxy"]) {
      bridge = await listen(async (req, res) => {
        const sample = selected.find((s) => req.url === s.path);
        if (!sample || !["GET", "HEAD"].includes(req.method)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        const result = await checkedRequest(
          origin,
          sample,
          req.method,
          headers,
        );
        report.pdfBridgeRequests.push(result.evidence);
        res.writeHead(200, {
          "Content-Type": sample.mimeType,
          "Content-Length": sample.size,
        });
        res.end(result.bytes);
      });
      pdfOrigin = bridge.origin;
    }
    const payload = {
      title: "Shared figure QA",
      html,
      cssUrls: [],
      cssText: "",
    };
    const pdf = Buffer.from(await helpers.buildPdf(payload, pdfOrigin));
    const canonicalPdf = Buffer.from(
      await helpers.buildPdf({ ...payload, html: canonicalHtml }, pdfOrigin),
    );
    ensure(pdf.subarray(0, 5).toString() === "%PDF-", "Invalid PDF output.");
    await writeFile(path.join(out, "shared-figures.pdf"), pdf);
    await writeFile(path.join(out, "canonical.pdf"), canonicalPdf);
    const imageBoxes = await page.evaluate(
      (paths) =>
        Array.from(document.images, (img, i) => {
          const r = img.getBoundingClientRect();
          return {
            path: paths[i],
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          };
        }),
      selected.map((s) => s.path),
    );
    const rendered = await renderPdf(canonicalPage, helpers, pdf, imageBoxes);
    const canonicalRendered = await renderPdf(
      canonicalPage,
      helpers,
      canonicalPdf,
      imageBoxes,
    );
    ensure(
      rendered.length === 1 && canonicalRendered.length === 1,
      "Expected one PDF page.",
    );
    ensure(
      rendered[0].sha256 === canonicalRendered[0].sha256 &&
        rendered[0].imagePaints > 0 &&
        rendered[0].imageRegions.every((r) => r.inkPixels > 0),
      "PDF rendered pixels differ from canonical or raster image is missing.",
    );
    await writeFile(
      path.join(out, "pdf-deployed.png"),
      Buffer.from(rendered[0].png, "base64"),
    );
    await writeFile(
      path.join(out, "pdf-canonical.png"),
      Buffer.from(canonicalRendered[0].png, "base64"),
    );
    report.pdf = {
      bytes: pdf.length,
      sha256: hash(pdf),
      pages: rendered.map((p) => ({
        width: p.width,
        height: p.height,
        sha256: p.sha256,
        imagePaints: p.imagePaints,
        imageRegions: p.imageRegions,
        canonicalMatch: true,
      })),
    };
    if (bridge)
      ensure(
        selected.every((s) =>
          report.pdfBridgeRequests.some(
            (r) => r.path === s.path && r.method === "GET",
          ),
        ),
        "PDF bridge did not fetch every sample.",
      );
    ensure(
      selected.every((s) =>
        report.browserRequests.some((r) => r.path === s.path),
      ) &&
        report.browserRequests.every(
          (r) => r.status === 200 && r.redirects === 0 && !r.failure,
        ),
      "Browser image request failed or redirected.",
    );
    report.status = "passed";
    report.scope =
      "Two real manifest samples; local export helpers and synthetic document; no deployed export API/auth/UI verification.";
  } catch (error) {
    report.status = "failed";
    report.failure = {
      stage,
      message:
        error instanceof QaError
          ? error.message
          : "Operation failed; raw diagnostics suppressed to protect request secrets.",
    };
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await bridge?.close();
    await fixture?.close();
    report.finishedAt = new Date().toISOString();
    if (out)
      await writeFile(
        path.join(out, "result.json"),
        `${JSON.stringify(report, null, 2)}\n`,
      );
  }
  console.log(
    JSON.stringify({
      status: report.status,
      mode: report.mode,
      stage: report.failure?.stage,
      failure: report.failure?.message,
      samples: report.samples?.map((s) => s.path),
      browserPixelMatches: report.pixels?.length,
      hwpxImages: report.hwpx?.images.length,
      pdfPageMatches: report.pdf?.pages.length,
      pdfTransport: report.pdfTransport,
    }),
  );
}

main().catch(() => {
  console.error("QA failed during setup/cleanup; raw diagnostics suppressed.");
  process.exitCode = 1;
});
