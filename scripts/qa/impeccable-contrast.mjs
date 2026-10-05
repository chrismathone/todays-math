// Read-only browser evidence for audit A1/A3/A4/A5/A6. No application API writes.
// Start this worktree's Next dev server, then run:
// node scripts/qa/impeccable-contrast.mjs --phase before --output <temporary.json>
// node scripts/qa/impeccable-contrast.mjs --output <evidence.json>
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const base = arg("base-url", "http://127.0.0.1:3112");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) {
  throw new Error("Use a local worktree dev server.");
}
const phase = arg("phase", "after");
const output = resolve(arg("output", "impeccable-contrast-evidence.json"));
const browser = await chromium.launch();
const context = await browser.newContext();
await context.route("**/*", (route) =>
  ["GET", "HEAD", "OPTIONS"].includes(route.request().method())
    ? route.continue()
    : route.abort(),
);
const page = await context.newPage();
page.setDefaultTimeout(60000);
const evidence = { phase, labStates: [], workspaceCssFixtures: [] };
const axe = await readFile(resolve("node_modules/axe-core/axe.min.js"), "utf8");

async function contrast(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rgba = (color) => {
      const values = color.match(/[\d.]+/g).map(Number);
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    const overlays = [];
    const composite = (color) => overlays.toReversed().reduce((base, overlay) =>
      base.map((channel, index) => channel * (1 - overlay[3]) + overlay[index] * overlay[3]),
      color.slice(0, 3),
    );
    let ancestor = element;
    let background;
    let backgrounds;
    do {
      const ancestorStyle = getComputedStyle(ancestor);
      const gradientStops = ancestorStyle.backgroundImage.match(/rgba?\([^)]+\)/g);
      if (gradientStops) {
        background = ancestorStyle.backgroundImage;
        backgrounds = gradientStops.map((stop) => composite(rgba(stop)));
        break;
      }
      const candidate = rgba(ancestorStyle.backgroundColor);
      if (candidate[3] > 0) {
        if (candidate[3] === 1) {
          background = ancestorStyle.backgroundColor;
          backgrounds = [composite(candidate)];
          break;
        }
        overlays.push(candidate);
      }
      ancestor = ancestor.parentElement;
    } while (ancestor);
    background ??= "rgb(255, 255, 255)";
    backgrounds ??= [composite([255, 255, 255, 1])];
    const luminance = (channels) => {
      const [r, g, b] = channels.slice(0, 3).map((n) => {
        const channel = n / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    };
    const ratios = backgrounds.map((color) => {
      const [light, dark] = [luminance(rgba(style.color)), luminance(color)].sort((a, b) => b - a);
      return (light + 0.05) / (dark + 0.05);
    });
    return {
      foreground: style.color,
      background,
      ratio: Number(Math.min(...ratios).toFixed(3)),
      fontSize: style.fontSize,
      disabled: element.closest("button, select")?.disabled ?? false,
    };
  });
}
async function settle(locator) {
  await locator.evaluate(async (element) => {
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
  });
}
async function overflow() {
  return page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
}
async function selectNames() {
  await page.addScriptTag({ content: axe });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ["select-name"] });
    return result.violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) }));
  });
}
try {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, learnerId] of [["/lab/math-srs", "course-learner"], ["/lab/math-srs/algebra", "srs-learner"]]) {
      console.log(`${phase}: ${width}px ${route}`);
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      const select = page.locator(`#${learnerId}`);
      await page.waitForFunction((id) => document.getElementById(id)?.disabled === false, learnerId);
      const names = await selectNames();
      const row = { width, route, selectNameViolations: names, overflow: await overflow() };
      await select.focus();
      row.selectFocusable = await select.evaluate((element) => document.activeElement === element);
      row.labelDisplay = await page.locator(`label[for="${learnerId}"]`).evaluate((element) => getComputedStyle(element).display);
      if (learnerId === "srs-learner") {
        const filters = page.locator('[class*="memoryFilters"] button');
        row.filters = [];
        for (let index = 0; index < 2; index++) {
          const button = filters.nth(index);
          await page.mouse.move(0, 0);
          await settle(button);
          const normal = await contrast(button);
          await button.hover();
          await settle(button);
          const hover = await contrast(button);
          await button.click();
          await settle(button);
          const selectedHover = await contrast(button);
          await page.mouse.move(0, 0);
          await settle(button);
          const selected = await contrast(button);
          row.filters.push({ index, normal, hover, selectedHover, selected, pressed: await button.getAttribute("aria-pressed") });
        }
      }
      evidence.labStates.push(row);
      await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
    }
    await page.goto(`${base}/lab/cube-3-1`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => document.querySelector('[class*="workspace"][aria-busy]')?.getAttribute("aria-busy") === "false");
    const row = { width, route: "/lab/cube-3-1", text: [], overflow: await overflow() };
    for (const selector of ['[class*="lessonHeading"] [class*="eyebrow"]', '[class*="lessonHeading"] p', '[class*="keyboardHint"]', '[class*="hintButton"]', '[class*="footnote"] > span', '[class*="mobileBar"] > span']) {
      const matches = page.locator(selector);
      for (let index = 0; index < await matches.count(); index++) {
        const element = matches.nth(index);
        if (await element.isVisible()) row.text.push({ selector, ...await contrast(element) });
      }
    }
    const activeLesson = page.locator('[class*="lessonButton"][aria-current]');
    if (await activeLesson.isVisible()) {
      row.selectedLesson = {
        subtitle: await contrast(activeLesson.locator("small")),
        number: await contrast(activeLesson.locator('[class*="lessonNumber"]')),
      };
    }
    const hint = page.locator('[class*="hintButton"]').first();
    await hint.click();
    row.hintExpanded = await hint.getAttribute("aria-expanded");
    await page.getByRole("button", { name: "2번째 활동", exact: true }).click();
    row.activityChanged = await page.getByRole("button", { name: "2번째 활동", exact: true }).getAttribute("aria-current");
    evidence.labStates.push(row);
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  // Authenticated workroom data is out of scope. Render the real, unmodified
  // module CSS against representative DOM and the actual global root tokens.
  const globalUrls = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => link.href).filter((href) => href.includes("/app/layout")),
  );
  if (!globalUrls.length) throw new Error("The rendered layout stylesheet is required for accurate backgrounds.");
  const globals = (await Promise.all(globalUrls.map(async (url) => {
    const response = await context.request.get(url);
    if (!response.ok()) throw new Error(`Could not load the rendered layout stylesheet: ${response.status()}`);
    return response.text();
  }))).join("\n");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fixture of [
      { file: "unified/Workroom", html: '<div class="workspace"><aside class="sidebar"><nav class="navigation"><button><span class="navShort" data-sample>문제 추출</span></button><button class="navActive"><span class="navShort" data-sample>시험지</span></button></nav></aside></div>' },
      { file: "english/EnglishStudio", html: '<div class="studio"><section class="card"><p class="kick" data-sample>이번 시험 준비</p><p class="desc" data-sample>자료 설명</p><p class="footnote" data-sample>자료 안내</p><p class="setMeta" data-sample>세트 상태</p><p class="count" data-sample>문항 수</p><p class="under" data-sample>안내</p><button class="quiet" data-sample>자료 추가</button><button class="step"><span class="dot" data-sample>1</span><small data-sample>자료 모으기</small></button><span class="num" data-sample>2</span><span class="pill" data-tone="review" data-sample>검토 중</span><button class="libraryRow"><span class="rowBody"><span class="rowTitle">자료</span><span class="rowMeta" data-sample>보관함 자료 상태</span></span></button></section></div>' },
      { file: "unified/ConceptView", html: '<div class="concept"><div class="summary"><ul class="summaryParts"><li class="none"><span data-sample>영상 없음</span><b data-sample>2</b></li></ul><span class="pill none" data-sample>없음</span></div></div>' },
    ]) {
      const css = await readFile(`src/components/${fixture.file}.module.css`, "utf8");
      await page.setContent(`<style>${globals} ${css}</style>${fixture.html}`);
      const row = { width, file: fixture.file, samples: [] };
      const samples = page.locator("[data-sample]");
      for (let index = 0; index < await samples.count(); index++) {
        const element = samples.nth(index);
        if (await element.isVisible()) row.samples.push({ text: await element.innerText(), ...await contrast(element) });
      }
      if (fixture.file.endsWith("EnglishStudio")) {
        await page.locator(".libraryRow").hover();
        row.libraryHover = await contrast(page.locator(".rowMeta"));
      }
      evidence.workspaceCssFixtures.push(row);
    }
  }
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  const contrastSamples = [
    ...evidence.labStates.flatMap((row) => [...(row.text ?? []), ...Object.values(row.selectedLesson ?? {}), ...(row.filters ?? []).flatMap((filter) => [filter.normal, filter.hover, filter.selected, filter.selectedHover])]),
    ...evidence.workspaceCssFixtures.flatMap((row) => [...row.samples, ...(row.libraryHover ? [row.libraryHover] : [])]),
  ];
  const failures = contrastSamples.filter((sample) => !sample.disabled && sample.ratio < 4.5);
  const nameFailures = evidence.labStates.flatMap((row) => row.selectNameViolations ?? []);
  const interactionFailures = evidence.labStates.filter((row) =>
    row.selectFocusable === false || row.filters?.some((filter) => filter.pressed !== "true") ||
    (row.route === "/lab/cube-3-1" && (row.hintExpanded !== "true" || row.activityChanged !== "step")),
  );
  const overflowing = evidence.labStates.filter((row) => row.overflow > 0);
  console.log(JSON.stringify({ output, states: evidence.labStates.length, contrastSamples: contrastSamples.length, contrastFailures: failures.length, selectNameFailures: nameFailures.length, interactionFailures: interactionFailures.length, overflow: overflowing }, null, 2));
  if (phase === "after" && (failures.length || nameFailures.length || interactionFailures.length || overflowing.length)) process.exitCode = 1;
} finally {
  await browser.close();
}
