/**
 * Offline layout probe for the four «간단하게» hi-fi options.
 *
 *   node scripts/qa/measure-builder-simple-hifi.mjs
 *   node scripts/qa/measure-builder-simple-hifi.mjs --build-only
 *   node scripts/qa/measure-builder-simple-hifi.mjs --screenshots
 *   node scripts/qa/measure-builder-simple-hifi.mjs --browser /path/to/chrome
 *
 * Does not start Next, read .env, use a database, or allow network requests.
 * All generated files (including Vite's cache) stay in the OS temp directory.
 * Exit codes: 0 = passed (or explicitly build-only), 1 = build/QA failure,
 * 2 = browser unavailable and layout measurements were skipped.
 */
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer-core";
import { build } from "vite";

const require = createRequire(import.meta.url);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const surfaceDir = path.join(repo, "src/app/dev/exam-builder-simple-hifi");
const purePlanFile = path.join(
  repo,
  "src/components/exam-builder/conditionsPlan.ts",
);
const options = ["H1", "H2", "H3", "H4"];
const step1Options = ["S1", "S2", "S3", "S4"];
const screenIds = [
  ...options.flatMap((option) => [`${option}-1`, `${option}-2`]),
  ...step1Options.map((option) => `${option}-1`),
];
const sharedFiles = new Set([
  purePlanFile,
  path.join(repo, "prisma/seed-data/units.ts"),
  path.join(repo, "src/components/picker-dialog/PickerDialog.tsx"),
  path.join(repo, "src/components/picker-dialog/picker-dialog.module.css"),
]);
const blockers = ["checking", "empty", "permission", "total", "format"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact-desktop", width: 1050, height: 900 },
  { name: "width-1040", width: 1040, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "small-phone", width: 320, height: 640 },
  { name: "short-height", width: 1440, height: 600 },
];

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} needs a value`);
  return value;
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

async function executable(candidate) {
  try {
    await access(candidate, constants.X_OK);
    return candidate;
  } catch {
    return null;
  }
}

async function findBrowser(explicit) {
  if (explicit) return executable(path.resolve(explicit));
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/opt/google/chrome/chrome",
  ];
  // Only inspect existing local browser caches. Nothing is downloaded.
  const caches = [
    path.join(os.homedir(), "Library/Caches/ms-playwright"),
    path.join(os.homedir(), ".cache/ms-playwright"),
    path.join(os.homedir(), ".cache/puppeteer/chrome"),
  ];
  for (const cache of caches) {
    let entries = [];
    try {
      entries = await readdir(cache);
    } catch {
      continue;
    }
    for (const entry of entries.sort().reverse()) {
      const base = path.join(cache, entry);
      candidates.push(
        path.join(
          base,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        path.join(
          base,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        path.join(base, "chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
        path.join(base, "chrome-linux/chrome"),
        path.join(base, "chrome-linux64/chrome"),
      );
    }
  }
  for (const candidate of candidates) {
    const found = await executable(candidate);
    if (found) return found;
  }
  return null;
}

async function bundleStandalone(outDir) {
  const entry = "virtual:builder-simple-hifi-probe";
  const resolvedEntry = `\0${entry}`;
  const source = path.join(surfaceDir, "SimpleHifi.tsx");
  await access(source, constants.R_OK);
  const result = await build({
    configFile: false,
    envDir: false,
    publicDir: false,
    root: outDir,
    cacheDir: path.join(outDir, "vite-cache"),
    logLevel: "error",
    css: { postcss: { plugins: [] } },
    plugins: [
      {
        name: "isolated-builder-hi-fi",
        resolveId(id) {
          if (id === entry) return resolvedEntry;
          if (
            /^(?:https?:|node:|next(?:\/|$)|@prisma(?:\/|$)|server-only$)/.test(
              id,
            )
          ) {
            throw new Error(`Forbidden dependency in offline probe: ${id}`);
          }
        },
        load(id) {
          if (id === resolvedEntry) {
            return [
              `import React from ${JSON.stringify(require.resolve("react"))};`,
              `import { createRoot } from ${JSON.stringify(require.resolve("react-dom/client"))};`,
              `import { SimpleHifi } from ${JSON.stringify(source)};`,
              `import { STEP1_SCOPES } from ${JSON.stringify(path.join(surfaceDir, "step1Fixtures.ts"))};`,
              "globalThis.__builderStep1QA = { longest: STEP1_SCOPES.reduce((a,b) => b.name.length > a.name.length ? b : a) };",
              'createRoot(document.getElementById("root")).render(React.createElement(SimpleHifi));',
            ].join("\n");
          }
          const filename = id.split("?")[0];
          if (
            filename.startsWith(`${repo}/src/`) &&
            !filename.startsWith(`${surfaceDir}/`) &&
            !sharedFiles.has(filename)
          ) {
            throw new Error(
              `Probe imports product code outside its allowed surface: ${filename}`,
            );
          }
          if (/(?:^|\/)\.env(?:\.|$)/.test(filename)) {
            throw new Error("Environment files are forbidden in this probe");
          }
        },
      },
    ],
    build: {
      write: false,
      outDir: path.join(outDir, "bundle"),
      emptyOutDir: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      minify: false,
      rollupOptions: {
        input: entry,
        output: {
          format: "iife",
          name: "BuilderSimpleHifiProbe",
        },
      },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (item) => item.output ?? [],
  );
  const js = outputs
    .filter((item) => item.type === "chunk")
    .map((item) => item.code)
    .join("\n");
  const css = outputs
    .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
    .map((item) => String(item.source))
    .join("\n");
  if (!js) throw new Error("Vite produced no executable bundle");
  const globals = await readFile(
    path.join(repo, "src/app/globals.css"),
    "utf8",
  );
  const tokens = globals.match(/:root\s*\{[^}]*\}/)?.[0];
  if (!tokens) throw new Error("globals.css :root tokens were not found");
  const font = await readFile(
    path.join(repo, "public/fonts/PretendardVariable.woff2"),
  );
  // The global stylesheet contains Tailwind and product-wide overrides. Read its
  // token block only; importing it would defeat the isolated rendering boundary.
  const styles = `${tokens}\n@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2");font-weight:100 900;font-style:normal;font-display:block}html,body{margin:0;padding:0}*,*::before,*::after{box-sizing:border-box}body{font-family:Pretendard,sans-serif;color:var(--ink);background:var(--bg)}button,input,select,textarea{font:inherit}\n${css}`;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>시험지 만들기 간단하게 Hi-fi · 오프라인 QA</title><style>${styles.replace(/<\/style/gi, "<\\/style")}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
  const htmlPath = path.join(outDir, "standalone.html");
  await writeFile(htmlPath, html);
  return {
    htmlPath,
    javascriptBytes: Buffer.byteLength(js),
    cssBytes: Buffer.byteLength(css),
    fontBytes: font.length,
  };
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}

async function controlValues(page) {
  return page.evaluate(() =>
    Object.fromEntries(
      Array.from(
        document.querySelectorAll(
          "select[data-preview-loading],select[data-preview-blocker]",
        ),
      ).map((select) => [
        `${select.closest("[data-hifi-screen]")?.getAttribute("data-hifi-screen")}:${select.hasAttribute("data-preview-loading") ? "loading" : "blocker"}`,
        select.value,
      ]),
    ),
  );
}

async function changeState(page, screen, kind, value, problems) {
  const before = await controlValues(page);
  const key = `${screen}:${kind}`;
  const attribute =
    kind === "loading" ? "data-preview-loading" : "data-preview-blocker";
  await page.select(
    `[data-hifi-screen="${screen}"] select[${attribute}]`,
    value,
  );
  await settle(page);
  const after = await controlValues(page);
  if (after[key] !== value)
    problems.push(`State did not change: ${key}=${value}`);
  for (const [other, previous] of Object.entries(before)) {
    if (other !== key && after[other] !== previous)
      problems.push(`State leaked from ${key} to ${other}`);
  }
  if (kind === "loading" && value !== "ready") {
    const hasListState = await page.$(
      `[data-hifi-screen="${screen}"] [data-list-state="${value}"]`,
    );
    if (!hasListState)
      problems.push(`${screen}: no actual list state for ${value}`);
  }
}

async function measure(page, viewport, state) {
  const geometry = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      return (
        element.getClientRects().length > 0 && style.visibility !== "hidden"
      );
    };
    const box = (element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowPx: Math.max(0, element.scrollWidth - element.clientWidth),
      width: Math.round(element.getBoundingClientRect().width * 100) / 100,
      overflowX: getComputedStyle(element).overflowX,
    });
    const identity = (element) =>
      [
        element.tagName.toLowerCase(),
        element.getAttribute("data-hifi-screen"),
        element.getAttribute("data-hifi-option"),
        element.getAttribute("class"),
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 200);
    const screens = Array.from(
      document.querySelectorAll("[data-hifi-screen]"),
    ).map((element) => ({
      id: element.getAttribute("data-hifi-screen"),
      ...box(element),
    }));
    const clipped = [];
    const escaped = [];
    for (const element of document.querySelectorAll("body *")) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      // Text inputs scroll internally by design; a long title must not widen its
      // containing layout. Other clipping is recorded instead of concealing it.
      if (element.matches("input,select,textarea,option,script,style"))
        continue;
      const style = getComputedStyle(element);
      const overflowPx = Math.max(0, element.scrollWidth - element.clientWidth);
      if (overflowPx > 0 && /^(hidden|clip)$/.test(style.overflowX)) {
        clipped.push({ element: identity(element), overflowPx });
      }
      const screen = element.closest("[data-hifi-screen]");
      // Native top-layer pickers are bounded by the viewport, not their frame.
      if (screen && !element.closest("dialog[open]")) {
        const rect = element.getBoundingClientRect();
        const frame = screen.getBoundingClientRect();
        const outside = Math.max(
          0,
          frame.left - rect.left,
          rect.right - frame.right,
        );
        if (outside > 1)
          escaped.push({
            screen: screen.getAttribute("data-hifi-screen"),
            element: identity(element),
            outsidePx: Math.round(outside * 100) / 100,
          });
      }
    }
    return {
      document: box(document.documentElement),
      body: box(document.body),
      gallery: box(document.querySelector("[data-hifi-gallery]")),
      screens,
      dialogs: Array.from(document.querySelectorAll("dialog[open]")).map(
        (dialog) => {
          const rect = dialog.getBoundingClientRect();
          return {
            ...box(dialog),
            outsideViewport: Math.max(
              0,
              -rect.left,
              rect.right - innerWidth,
              -rect.top,
              rect.bottom - innerHeight,
            ),
          };
        },
      ),
      clipped,
      escaped: escaped.slice(0, 30),
      escapedCount: escaped.length,
    };
  });
  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    state,
    ...geometry,
  };
}

async function inspectContract(page) {
  return page.evaluate(
    ({ expectedOptions, expectedScreens, expectedBlockers, expectedStep1 }) => {
      const problems = [];
      if (document.querySelectorAll("[data-hifi-gallery]").length !== 1)
        problems.push("Expected one hi-fi gallery");
      const actualOptions = Array.from(
        document.querySelectorAll("[data-hifi-option]"),
      ).map((element) => element.getAttribute("data-hifi-option"));
      const actualScreens = Array.from(
        document.querySelectorAll("[data-hifi-screen]"),
      ).map((element) => element.getAttribute("data-hifi-screen"));
      if (
        JSON.stringify(actualOptions.sort()) !==
        JSON.stringify([...expectedOptions].sort())
      )
        problems.push(`Unexpected options: ${actualOptions}`);
      if (
        JSON.stringify(actualScreens.sort()) !==
        JSON.stringify([...expectedScreens].sort())
      )
        problems.push(`Unexpected screens: ${actualScreens}`);
      const step1 = Array.from(
        document.querySelectorAll("[data-step1-option]"),
      ).map((element) => element.getAttribute("data-step1-option"));
      if (JSON.stringify(step1) !== JSON.stringify(expectedStep1))
        problems.push(`Unexpected H2 step-one options: ${step1}`);
      for (const id of expectedStep1) {
        const frame = document.querySelector(`[data-step1-screen="${id}"]`);
        if (frame?.querySelector("[data-scope-chapter],[data-scope-lesson]"))
          problems.push(`${id}: detail lists rendered before choosing a grade`);
      }
      for (const id of expectedScreens) {
        const screen = document.querySelector(`[data-hifi-screen="${id}"]`);
        if (!screen) continue;
        if (!screen.querySelector("[data-screen-title]"))
          problems.push(`${id}: missing title input`);
        const loading = screen.querySelector("select[data-preview-loading]");
        for (const value of ["ready", "loading", "error"]) {
          if (!loading?.querySelector(`option[value="${value}"]`))
            problems.push(`${id}: missing loading value ${value}`);
        }
        if (id.endsWith("-2")) {
          const blocker = screen.querySelector("select[data-preview-blocker]");
          for (const value of ["ready", ...expectedBlockers]) {
            if (!blocker?.querySelector(`option[value="${value}"]`))
              problems.push(`${id}: missing blocker value ${value}`);
          }
        }
      }
      return problems;
    },
    {
      expectedOptions: options,
      expectedScreens: screenIds,
      expectedBlockers: blockers,
      expectedStep1: step1Options,
    },
  );
}

async function setLongTitles(page) {
  await page.evaluate(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    for (const input of document.querySelectorAll("input[data-screen-title]")) {
      setter?.call(
        input,
        "중학교 3학년 2학기 기말고사 대비 · 삼각비의 활용과 원의 성질 종합 확인 문제와 서술형 풀이 점검 — 제목 길이 확인",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await settle(page);
}

function failuresFor(measurement) {
  const failures = [];
  for (const key of ["document", "body", "gallery"]) {
    if (measurement[key].overflowPx > 0)
      failures.push(`${key} overflows by ${measurement[key].overflowPx}px`);
  }
  for (const screen of measurement.screens) {
    if (screen.overflowPx > 0)
      failures.push(`${screen.id} overflows by ${screen.overflowPx}px`);
    if (measurement.width === 1440 && screen.width > 1041)
      failures.push(`${screen.id} content exceeds 1040px (${screen.width}px)`);
  }
  for (const dialog of measurement.dialogs) {
    if (dialog.overflowPx > 0)
      failures.push(`picker overflows by ${dialog.overflowPx}px`);
    if (dialog.outsideViewport > 1)
      failures.push(`picker escapes viewport by ${dialog.outsideViewport}px`);
  }
  if (measurement.clipped.length)
    failures.push(
      `${measurement.clipped.length} horizontally clipped elements`,
    );
  if (measurement.escapedCount)
    failures.push(`${measurement.escapedCount} elements escape their screen`);
  return failures;
}

async function exerciseStep1(page, record, problems) {
  const longest = await page.evaluate(
    () => globalThis.__builderStep1QA.longest,
  );
  const names = { grade: "학년·과정", chapter: "단원", lesson: "차시" };
  const checkedPickers = new Set();
  for (const option of step1Options) {
    const root = `[data-step1-screen="${option}"]`;
    const open = async (stage) => {
      if (option === "S4") {
        const opener = `${root} button[aria-label="${names[stage]} 고르기"]`;
        await page.click(opener);
        await settle(page);
        if (!checkedPickers.has(stage)) {
          const modal = `${root} dialog[open]`;
          const initialFocus = await page.$eval(
            modal,
            (dialog) =>
              dialog.matches(":modal") &&
              dialog.querySelector("header button") === document.activeElement,
          );
          if (!initialFocus)
            problems.push(`S4/${stage}: native modal or initial focus missing`);
          await page.keyboard.down("Shift");
          await page.keyboard.press("Tab");
          await page.keyboard.up("Shift");
          await page.keyboard.press("Tab");
          // Chromium can visit browser chrome at a native modal's tab boundary.
          // In that case activeElement is body; the next Tab must return inside.
          if (
            await page.evaluate(() => document.activeElement === document.body)
          )
            await page.keyboard.press("Tab");
          if (
            !(await page.$eval(modal, (dialog) =>
              dialog.contains(document.activeElement),
            ))
          )
            problems.push(`S4/${stage}: keyboard focus escaped the picker`);
          await page.keyboard.press("Escape");
          await settle(page);
          if (await page.$(modal))
            problems.push(`S4/${stage}: Escape did not close the picker`);
          if (
            !(await page.$eval(
              opener,
              (button) => button === document.activeElement,
            ))
          )
            problems.push(`S4/${stage}: Escape did not restore opener focus`);
          checkedPickers.add(stage);
          await page.click(opener);
          await settle(page);
        }
        await record(`${option}/picker-${stage}`);
      }
    };
    const choose = async (stage, value) => {
      await open(stage);
      const selector = await page.evaluate(
        ({ root, stage, value }) =>
          `${root} [data-scope-${stage}="${CSS.escape(value)}"]`,
        { root, stage, value },
      );
      await page.click(selector);
      await settle(page);
    };
    const goBack = async (stage) => {
      if (option === "S2")
        await page.click(`${root} button[aria-label="${names[stage]} 변경"]`);
      if (option === "S3") {
        const buttons = await page.$$(
          `${root} nav[aria-label="범위 경로"] button`,
        );
        await buttons[stage === "grade" ? 0 : 1].click();
      }
    };
    const closePicker = async () => {
      if (option === "S4")
        await page.click(`${root} dialog[open] > header button`);
      await settle(page);
    };
    await choose("grade", "공통수학1");
    await record(`${option}/grade-selected`);
    if (await page.$(`${root} [data-scope-lesson]`))
      problems.push(`${option}: lessons appeared before a chapter was chosen`);
    await choose("chapter", "2. 방정식과 부등식");
    await open("lesson");
    await record(`${option}/lessons-first-page`);
    await page.click(`${root} [data-scope-lesson] input`);
    const firstId = await page.$eval(`${root} [data-selected-scope]`, (row) =>
      row.getAttribute("data-selected-scope"),
    );
    await page.click(
      `${root} [data-step1-stage="lesson"] > div:last-child > button:last-child`,
    );
    await settle(page);
    const pageRows = await page.$$(`${root} [data-scope-lesson]`);
    if (pageRows.length !== 12)
      problems.push(
        `${option}: expected 12 lessons on page two, received ${pageRows.length}`,
      );
    await record(`${option}/lessons-second-page`);
    await closePicker();
    await record(`${option}/selected-scope`);
    await goBack("grade");
    await choose("grade", longest.grade);
    if (await page.$(`${root} [data-scope-lesson]`))
      problems.push(`${option}: changing a grade left an old lesson list`);
    const kept = await page.$$eval(`${root} [data-selected-scope]`, (rows) =>
      rows.map((row) => row.getAttribute("data-selected-scope")),
    );
    if (kept.length !== 1 || kept[0] !== firstId)
      problems.push(`${option}: browsing reset changed the selected scopes`);
    await record(`${option}/grade-reset`);
    await choose("chapter", longest.chapter);
    await open("lesson");
    const search = await page.$(
      `${root} [data-step1-stage="lesson"] input[type="search"]`,
    );
    await search.type(longest.name);
    await settle(page);
    await record(`${option}/longest-lesson`);
    await page.click(`${root} [data-scope-lesson] input`);
    await closePicker();
    const selectedIds = await page.$$eval(
      `${root} [data-selected-scope]`,
      (rows) => rows.map((row) => row.getAttribute("data-selected-scope")),
    );
    if (selectedIds.length !== 2 || !selectedIds.includes(longest.id))
      problems.push(`${option}: ranges did not accumulate`);
    await record(`${option}/longest-selected`);
  }
}

async function main() {
  const explicitOut = argument("--out");
  const tempRoots = [path.resolve(os.tmpdir()), "/tmp", "/private/tmp"];
  const outDir = explicitOut
    ? path.resolve(explicitOut)
    : await mkdtemp("/tmp/builder-simple-hifi-");
  if (!tempRoots.some((root) => outDir.startsWith(`${root}${path.sep}`))) {
    throw new Error("--out must stay inside the OS temp directory");
  }
  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "measurements.json");
  const report = {
    status: "building",
    generatedAt: new Date().toISOString(),
    outDir,
    reportPath,
    offline: true,
    build: null,
    browser: null,
    measurements: [],
    problems: [],
    blockedRequests: [],
    browserErrors: [],
  };
  const save = async () => {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      JSON.stringify({
        status: report.status,
        reportPath,
        htmlPath: report.build?.htmlPath,
        measurements: report.measurements.length,
        problems: report.problems.length,
      }),
    );
  };
  try {
    report.build = await bundleStandalone(outDir);
  } catch (error) {
    report.status = "build-failed";
    report.problems.push(errorText(error));
    await save();
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--build-only")) {
    report.status = "build-only; browser measurements skipped by request";
    await save();
    return;
  }
  const browserPath = await findBrowser(argument("--browser"));
  if (!browserPath) {
    report.status = "skipped; local Chromium/Chrome executable not found";
    await save();
    process.exitCode = 2;
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      userDataDir: path.join(outDir, "chrome-profile"),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-sync",
        "--no-first-run",
        "--no-default-browser-check",
        "--host-resolver-rules=MAP * ~NOTFOUND",
      ],
    });
  } catch (error) {
    report.status = "skipped; local Chromium/Chrome could not launch";
    report.browser = { path: browserPath, launchError: errorText(error) };
    await save();
    process.exitCode = 2;
    return;
  }
  report.browser = { path: browserPath, version: await browser.version() };
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (/^(?:data:|file:|about:)/.test(request.url()))
        void request.continue();
      else {
        report.blockedRequests.push(request.url());
        void request.abort();
      }
    });
    page.on("pageerror", (error) =>
      report.browserErrors.push(errorText(error)),
    );
    for (const viewport of viewports) {
      console.log(
        `Measuring ${viewport.name} (${viewport.width}×${viewport.height}) offline…`,
      );
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
      });
      await page.goto(pathToFileURL(report.build.htmlPath).href, {
        waitUntil: "load",
        timeout: 30000,
      });
      await page.waitForSelector("[data-hifi-gallery]", { timeout: 15000 });
      await settle(page);
      const contractProblems = await inspectContract(page);
      report.problems.push(
        ...contractProblems.map((problem) => `${viewport.name}: ${problem}`),
      );
      if (contractProblems.length) break;
      const record = async (state) => {
        const measurement = await measure(page, viewport, state);
        report.measurements.push(measurement);
        for (const problem of failuresFor(measurement))
          report.problems.push(`${viewport.name}/${state}: ${problem}`);
        if (
          process.argv.includes("--screenshots") &&
          /^(S[1-4])\//.test(state) &&
          [1440, 1040, 390, 320].includes(viewport.width) &&
          viewport.name !== "short-height"
        ) {
          const option = state.slice(0, 2);
          if (!(await page.$("dialog[open]")))
            await page.$eval(`[data-step1-screen="${option}"]`, (element) =>
              element.scrollIntoView({ block: "start", inline: "nearest" }),
            );
          const shotDir = path.join(outDir, "screenshots");
          await mkdir(shotDir, { recursive: true });
          await page.screenshot({
            path: path.join(
              shotDir,
              `${viewport.name}-${state.replaceAll("/", "-")}.png`,
            ),
          });
        }
      };
      await record("ready");
      await setLongTitles(page);
      await record("long-title");
      if (
        process.argv.includes("--screenshots") &&
        [1440, 390].includes(viewport.width) &&
        viewport.name !== "short-height"
      ) {
        const shotDir = path.join(outDir, "screenshots");
        await mkdir(shotDir, { recursive: true });
        for (const screen of screenIds) {
          await page.$eval(`[data-hifi-screen="${screen}"]`, (element) =>
            element.scrollIntoView({ block: "start", inline: "nearest" }),
          );
          // A viewport crop keeps 34–50 problem fixtures from producing enormous
          // bitmaps while preserving the top of every stage for visual review.
          await page.screenshot({
            path: path.join(shotDir, `${viewport.name}-${screen}.png`),
          });
        }
      }
      await exerciseStep1(page, record, report.problems);
      for (const screen of screenIds) {
        for (const state of ["loading", "error"]) {
          await changeState(page, screen, "loading", state, report.problems);
          await record(`${screen}/list-${state}`);
        }
        await changeState(page, screen, "loading", "ready", report.problems);
      }
      for (const option of options) {
        for (const blocker of blockers) {
          await changeState(
            page,
            `${option}-2`,
            "blocker",
            blocker,
            report.problems,
          );
          await record(`${option}-2/blocker-${blocker}`);
        }
        await changeState(
          page,
          `${option}-2`,
          "blocker",
          "ready",
          report.problems,
        );
      }
    }
    if (report.blockedRequests.length)
      report.problems.push(
        `${report.blockedRequests.length} unexpected network requests were blocked`,
      );
    if (report.browserErrors.length)
      report.problems.push(
        ...report.browserErrors.map((error) => `Browser error: ${error}`),
      );
    report.status = report.problems.length ? "failed" : "passed";
  } catch (error) {
    report.status = "measurement-failed";
    report.problems.push(errorText(error));
  } finally {
    await browser.close();
  }
  await save();
  if (report.status !== "passed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Builder hi-fi probe failed: ${errorText(error)}`);
  process.exitCode = 1;
});
