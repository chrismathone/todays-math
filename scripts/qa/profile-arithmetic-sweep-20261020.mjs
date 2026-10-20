// node scripts/qa/profile-arithmetic-sweep-20261020.mjs --phase before --runs 3
// Raw CPU profiles, LongTasks, DOM snapshots and screenshots stay outside git.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect as playwrightExpect } from "@playwright/test";

const expect = playwrightExpect.configure({ timeout: 30000 });

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const phase = option("phase", "before");
const runCount = Number(option("runs", "3"));
const base = option("base", "http://127.0.0.1:3184");
const output = option("output", "/tmp/arithmetic-sweep-20261020");
const baseline = option("compare", "");
const behaviorOnly = process.argv.includes("--behavior-only");
assert(["before", "after"].includes(phase));
assert(Number.isInteger(runCount) && runCount > 0);
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const directory = path.join(output, phase);
await mkdir(directory, { recursive: true });
const sha = (value) => createHash("sha256").update(value).digest("hex");
const browser = await chromium.launch({ headless: true });
const results = [];
const settle = (page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });

function cpuSummary(profile) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parents.set(child, node.id);
  const self = new Map();
  const inclusive = new Map();
  const culprits = {
    familySampleMs: 0,
    listArithmeticV2Types: 0,
    threeTermAllowed: 0,
    isProper: 0,
    tuples: 0,
  };
  for (let i = 0; i < (profile.samples ?? []).length; i++) {
    const id = profile.samples[i];
    const duration = (profile.timeDeltas?.[i] ?? 0) / 1000;
    self.set(id, (self.get(id) ?? 0) + duration);
    const matched = new Set();
    for (
      let current = id;
      current !== undefined;
      current = parents.get(current)
    ) {
      inclusive.set(current, (inclusive.get(current) ?? 0) + duration);
      const frame = nodes.get(current).callFrame;
      if (frame.url.includes("src_lib_arithmetic-v2_families"))
        matched.add("familySampleMs");
      if (Object.hasOwn(culprits, frame.functionName))
        matched.add(frame.functionName);
    }
    for (const name of matched) culprits[name] += duration;
  }
  const summarize = (table) =>
    [...table]
      .map(([id, ms]) => {
        const { functionName, url, lineNumber, columnNumber } =
          nodes.get(id).callFrame;
        return {
          functionName,
          url,
          line: lineNumber + 1,
          column: columnNumber + 1,
          ms: Number(ms.toFixed(2)),
        };
      })
      .sort((a, b) => b.ms - a.ms);
  return {
    self: summarize(self).slice(0, 40),
    inclusive: summarize(inclusive).slice(0, 60),
    culprits: Object.fromEntries(
      Object.entries(culprits).map(([name, ms]) => [
        name,
        Number(ms.toFixed(2)),
      ]),
    ),
  };
}

async function open(context) {
  const blocked = [];
  await context.route("**/api/**", async (route) => {
    blocked.push(new URL(route.request().url()).pathname);
    await route.abort("blockedbyclient");
  });
  await context.route(
    /https?:\/\/(?!127\.0\.0\.1:3184|localhost:3184)/,
    (route) => route.abort("blockedbyclient"),
  );
  await context.addInitScript(() => {
    let counter = 0;
    Object.defineProperty(crypto, "randomUUID", {
      value: () =>
        `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
    });
    window.__arithmeticLongTasks = [];
    new PerformanceObserver((list) => {
      window.__arithmeticLongTasks.push(
        ...list.getEntries().map(({ startTime, duration, name }) => ({
          startTime,
          duration,
          name,
        })),
      );
    }).observe({ type: "longtask", buffered: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/dev/arithmetic-sweep`);
  await expect(
    page.getByRole("button", { name: "연산대장 열기", exact: true }),
  ).toBeVisible();
  await settle(page);
  return { page, blocked, errors };
}

async function ready(page) {
  await expect(
    page.getByLabel("학년별 연산 유형", { exact: true }).getByRole("button"),
  ).toHaveCount(24);
  await expect(
    page.getByRole("button", { name: "연습지 만들기", exact: true }),
  ).toBeEnabled();
  await settle(page);
}

async function behavior(page) {
  const snapshots = [];
  async function capture(name) {
    await page.mouse.move(0, 0);
    if (await page.getByRole("tooltip").count())
      await page.keyboard.press("Escape");
    await settle(page);
    // Let the existing 120–180ms hover transitions finish before pixel checks.
    await page.waitForTimeout(220);
    const state = await page
      .locator('section[aria-label="연산대장"]')
      .first()
      .evaluate((element) => {
        const ids = new Map();
        const normalize = (value) =>
          value.replace(/_r_[a-z0-9]+_/g, (id) => {
            if (!ids.has(id)) ids.set(id, `_react_${ids.size}_`);
            return ids.get(id);
          });
        // Attribute insertion order, empty Suspense styles and opaque React IDs
        // have no behavioral meaning; preserve every other node/attribute/value.
        const dom = (node) =>
          node instanceof Element
            ? {
                tag: node.tagName,
                attributes: [...node.attributes]
                  .filter((attr) => attr.name !== "style" || attr.value)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((attr) => [attr.name, normalize(attr.value)]),
                children: [...node.childNodes]
                  .filter((child) => child.nodeType !== Node.COMMENT_NODE)
                  .map(dom),
              }
            : node.textContent;
        return {
          text: element.textContent,
          dom: dom(element),
          fields: [...element.querySelectorAll("input,select")].map(
            (input) => ({
              label:
                input.getAttribute("aria-label") ??
                input.closest("label")?.textContent,
              value: input.value,
              checked: input.checked,
              disabled: input.disabled,
            }),
          ),
        };
      });
    const screenshot = await page
      .locator("main")
      .first()
      .screenshot({ animations: "disabled", caret: "hide" });
    await writeFile(path.join(directory, `${name}.png`), screenshot);
    snapshots.push({
      name,
      state,
      stateHash: sha(JSON.stringify(state)),
      screenshotHash: sha(screenshot),
    });
  }
  const grid = page.getByLabel("학년별 연산 유형", { exact: true });
  await capture("initial");
  await page
    .getByLabel("연산 유형 페이지", { exact: true })
    .getByRole("button", { name: "다음", exact: true })
    .click();
  await capture("page-2");
  await page
    .getByRole("combobox", { name: "학년", exact: true })
    .selectOption("중3");
  await page
    .getByRole("combobox", { name: "학기", exact: true })
    .selectOption("2");
  await capture("grade-semester");
  await grid.getByRole("button").first().hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  const tooltip = await page
    .getByRole("tooltip")
    .evaluate((element) => element.outerHTML);
  snapshots.push({ name: "tooltip", state: tooltip, stateHash: sha(tooltip) });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByLabel("유형 찾기", { exact: true }).fill("없는유형-qa");
  await expect(
    page.getByText("조건에 맞는 유형이 없습니다.", { exact: true }),
  ).toBeVisible();
  await capture("empty-search");
  await page.getByLabel("유형 찾기", { exact: true }).fill("");
  await page
    .getByRole("checkbox", { name: "담은 유형 전체 선택", exact: true })
    .check();
  await page
    .getByRole("button", { name: "선택한 유형 빼기", exact: true })
    .click();
  await grid.getByRole("button").first().click();
  await capture("basket");
  await page.getByLabel("회차", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "연습지 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "1회차 10문항", exact: true }),
  ).toBeVisible();
  await capture("review");
  await page.getByRole("button", { name: "정답 보기", exact: true }).click();
  await capture("answers");
  await page.getByRole("tab", { name: "2회차 10문항", exact: true }).click();
  await capture("round-2");
  await page
    .getByRole("button", { name: "양식 구성·출력으로", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "내 시험지에 저장", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("[data-mathgen-document]").first()).toBeAttached();
  await capture("output");
  await page.getByRole("button", { name: "1 범위 설정", exact: true }).click();
  await capture("return-scope");
  await page
    .getByRole("combobox", { name: "학년", exact: true })
    .selectOption("기초 연산");
  await expect(
    page.getByRole("button", { name: "연습지 만들기", exact: true }),
  ).toBeEnabled();
  await capture("basic");
  await page
    .getByRole("combobox", { name: "학년", exact: true })
    .selectOption("중3");
  await capture("grade-draft-preserved");
  return snapshots;
}

async function saveBehavior(snapshots, page) {
  await writeFile(
    path.join(directory, "behavior.json"),
    JSON.stringify(snapshots, null, 2),
  );
  if (!baseline) return;
  const before = JSON.parse(
    await readFile(path.join(baseline, "behavior.json"), "utf8"),
  );
  const fingerprint = (rows) =>
    rows.map(({ name, stateHash }) => ({ name, stateHash }));
  assert.deepEqual(
    fingerprint(snapshots),
    fingerprint(before),
    "Behavior / DOM changed",
  );
  const pixels = [];
  for (let index = 0; index < snapshots.length; index++) {
    const current = snapshots[index];
    if (!current.screenshotHash) continue;
    const exact = current.screenshotHash === before[index].screenshotHash;
    if (exact) {
      pixels.push({ name: current.name, exact: true });
      continue;
    }
    const images = await Promise.all(
      [baseline, directory].map(
        async (folder) =>
          `data:image/png;base64,${(await readFile(path.join(folder, `${current.name}.png`))).toString("base64")}`,
      ),
    );
    const difference = await page.evaluate(async ([before, after]) => {
      const read = async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        };
      };
      const [a, b] = await Promise.all([read(before), read(after)]);
      if (a.width !== b.width || a.height !== b.height)
        return { dimensionsEqual: false };
      let changedPixels = 0,
        maxChannelDifference = 0;
      for (let pixel = 0; pixel < a.data.length; pixel += 4) {
        let changed = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(
            a.data[pixel + channel] - b.data[pixel + channel],
          );
          maxChannelDifference = Math.max(maxChannelDifference, delta);
          changed ||= delta > 0;
        }
        if (changed) changedPixels++;
      }
      return { dimensionsEqual: true, changedPixels, maxChannelDifference };
    }, images);
    // A strict DOM match is required. Allow only <=100 anti-aliased border
    // pixels differing by one 8-bit channel unit; preserve the exact raw PNGs.
    assert(
      difference.dimensionsEqual &&
        difference.changedPixels <= 100 &&
        difference.maxChannelDifference <= 1,
      `Visual difference in ${current.name}: ${JSON.stringify(difference)}`,
    );
    pixels.push({ name: current.name, exact: false, ...difference });
  }
  await writeFile(
    path.join(directory, "behavior-comparison.json"),
    JSON.stringify(
      { stages: snapshots.length, dom: "identical", pixels },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ behavior: "identical", stages: snapshots.length, pixels }),
  );
}

try {
  // Compile the fixture and lazy chunks once; all recorded runs use fresh contexts.
  const warmContext = await browser.newContext({
    viewport: { width: 1685, height: 1000 },
  });
  const warm = await open(warmContext);
  await warm.page
    .getByRole("button", { name: "연산대장 열기", exact: true })
    .click();
  await ready(warm.page);
  if (behaviorOnly) {
    await saveBehavior(await behavior(warm.page), warm.page);
    assert.deepEqual(warm.blocked, []);
    assert.deepEqual(warm.errors, []);
  }
  await warmContext.close();
  for (let run = 1; !behaviorOnly && run <= runCount; run++) {
    const context = await browser.newContext({
      viewport: { width: 1685, height: 1000 },
    });
    try {
      const { page, blocked, errors } = await open(context);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
      await cdp.send("Profiler.start");
      await page
        .getByRole("button", { name: "연산대장 열기", exact: true })
        .click();
      await ready(page);
      const readyTime = await page.evaluate(() => performance.now());
      await page.waitForTimeout(300);
      const { profile } = await cdp.send("Profiler.stop");
      await writeFile(
        path.join(directory, `run-${run}.cpuprofile`),
        JSON.stringify(profile),
      );
      const timing = await page.evaluate(() => ({
        start: performance.getEntriesByName("arithmetic-sweep-open")[0]
          .startTime,
        longTasks: window.__arithmeticLongTasks,
      }));
      const longTasks = timing.longTasks.filter(
        (task) => task.startTime >= timing.start,
      );
      const entry = {
        run,
        openToReadyMs: Number((readyTime - timing.start).toFixed(2)),
        longTaskCount: longTasks.length,
        longTaskTotalMs: Number(
          longTasks
            .reduce((total, task) => total + task.duration, 0)
            .toFixed(2),
        ),
        maxLongTaskMs: Math.max(0, ...longTasks.map((task) => task.duration)),
        longTasks,
        cpu: cpuSummary(profile),
        blocked,
        errors,
      };
      results.push(entry);
      await writeFile(
        path.join(directory, "summary.json"),
        JSON.stringify(
          { phase, base, viewport: "1685x1000", cpuThrottle: 1, runs: results },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          run,
          phase,
          openToReadyMs: entry.openToReadyMs,
          longTaskCount: entry.longTaskCount,
          maxLongTaskMs: entry.maxLongTaskMs,
        }),
      );
      assert.deepEqual(blocked, [], "Fixture attempted an API request");
      assert.deepEqual(errors, [], "Fixture had a page error");
      if (run === runCount) {
        const snapshots = await behavior(page);
        await saveBehavior(snapshots, page);
        assert.deepEqual(blocked, [], "Behavior attempted an API request");
        assert.deepEqual(errors, [], "Behavior had a page error");
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
