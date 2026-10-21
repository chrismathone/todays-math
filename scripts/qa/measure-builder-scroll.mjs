/** Real-shell scroll probe for 시험지 만들기 (원장님 2026-10-21 «이중스크롤»).
 * BASE=http://127.0.0.1:3000 node scripts/qa/measure-builder-scroll.mjs
 * Needs a running `next dev`. It drives /dev/workspace-alignment — the real
 * workspace shell, builder and output editor with in-page fixture APIs — so no
 * DB or account is used. Any request that reaches the network /api fails it.
 *
 * Wide screens (901px+ and taller than 600px): the page itself never scrolls,
 * a column scrolls inside only when its content is taller than the room, and
 * the output preview fits its paper strip — horizontal bar included — inside
 * the column. Narrow and low screens keep their earlier scrolling.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const out = path.resolve(process.env.OUT ?? ".qa-artifacts/builder-scroll");
await mkdir(out, { recursive: true });
const WIDE = [
  [1440, 900],
  [1680, 1000],
  [1280, 800],
];
const KEPT = [
  [1366, 600],
  [800, 900],
];

/** Page-side reading of the visible frame, its columns and the paper strip. */
function readFrame() {
  const frame = document.querySelector(
    "[data-scope-layout], [data-review-layout], [data-output-layout]",
  );
  const bottom = parseFloat(
    frame.style.getPropertyValue("--builder-viewport-bottom") || "0",
  );
  const columns = [...frame.children].map((column) => {
    const rect = column.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      scrollHeight: column.scrollHeight,
      clientHeight: column.clientHeight,
      overflowY: getComputedStyle(column).overflowY,
    };
  });
  const desk = frame.querySelector("[data-paper-desk]");
  let strip = null;
  if (desk) {
    const rect = desk.getBoundingClientRect();
    strip = {
      top: rect.top,
      bottom: rect.bottom,
      bar: desk.offsetHeight - desk.clientHeight,
      overflowX: desk.scrollWidth - desk.clientWidth,
      // The strip hides vertical overflow, so pages taller than it are cut.
      overflowY: desk.scrollHeight - desk.clientHeight,
      scale: Number(desk.style.getPropertyValue("--paper-strip-scale")),
    };
  }
  return {
    viewport: [innerWidth, innerHeight],
    pageScroll: document.scrollingElement.scrollHeight - innerHeight,
    reserve: Math.max(12, bottom),
    columns,
    strip,
  };
}

/** The frame once two readings agree — a layout still moving is a failure. */
async function settled(page, label) {
  await page.evaluate(() => document.fonts.ready);
  let last = "";
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(200);
    const now = JSON.stringify(await page.evaluate(readFrame));
    if (now === last) return JSON.parse(now);
    last = now;
  }
  throw new Error(`${label}: the layout did not settle ${last}`);
}

/** How far the page lets itself be scrolled, following any growth on scroll. */
async function reach(page) {
  let last = "";
  let now = { x: 0, y: 0 };
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollTo(1e6, 1e6));
    await page.waitForTimeout(150);
    now = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    if (JSON.stringify(now) === last) break;
    last = JSON.stringify(now);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  return now;
}

function assertWide(label, m) {
  assert.equal(m.pageScroll, 0, `${label}: page scrolls ${JSON.stringify(m)}`);
  assert.equal(m.reach.y, 0, `${label}: the page scrolled`);
  // Under the room there is only the shell's and the editor's 16px padding.
  assert.ok(m.reserve <= 32, `${label}: ${m.reserve}px kept under the room`);
  const limit = m.viewport[1] - m.reserve;
  for (const [i, c] of m.columns.entries()) {
    assert.ok(c.bottom <= limit + 1, `${label}: column ${i} below the room`);
    // A column scrolls inside only when it already uses all of the room.
    if (c.scrollHeight > c.clientHeight + 1)
      assert.ok(
        Math.abs(c.bottom - limit) <= 1,
        `${label}: column ${i} scrolls before it fills the room ${JSON.stringify(c)}`,
      );
  }
}

function assertStrip(label, m) {
  const preview = m.columns[1];
  assert.ok(
    preview.scrollHeight <= preview.clientHeight + 1,
    `${label}: the preview column scrolls vertically ${JSON.stringify(preview)}`,
  );
  // The strip fills the rest of the column, and it and its horizontal bar
  // end inside the column and the viewport, with whole pages above the bar.
  assert.ok(
    Math.abs(m.strip.bottom - preview.bottom) <= 1,
    `${label}: strip does not reach the column bottom ${JSON.stringify(m.strip)}`,
  );
  assert.ok(m.strip.bottom <= m.viewport[1], `${label}: strip below viewport`);
  assert.ok(m.strip.overflowY <= 1, `${label}: pages cut by the strip`);
  if (m.strip.overflowX > 0)
    assert.ok(m.strip.bar > 0, `${label}: overflowing strip has no bar`);
}

const browser = await chromium.launch({
  headless: true,
  // Playwright hides headless scrollbars. Keep classic ones, which take room
  // as on Windows or a Mac with a mouse, so a clipped bar shows up here.
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
const results = [];
const errors = [];
const leaked = [];
try {
  for (const [width, height] of [...WIDE, ...KEPT]) {
    const wide = WIDE.some(([w, h]) => w === width && h === height);
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route("**/api/**", (route) => {
      leaked.push(route.request().url());
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) =>
      errors.push(`${width}x${height}: ${e.message}`),
    );
    await page.goto(`${base}/dev/workspace-alignment#bank`, {
      timeout: 600000,
    });
    await page.waitForSelector("[data-scope-layout]");
    await page.getByRole("button", { name: /^중1/ }).click();
    await page.getByRole("button", { name: /^1\. 소인수분해/ }).click();
    await page.getByRole("checkbox", { name: /^소인수분해/ }).check();
    await page.getByRole("button", { name: "단원 변경" }).click();
    await page.getByRole("button", { name: /^2\. 정수와 유리수/ }).click();
    await page.getByRole("checkbox", { name: /^정수와 유리수의 덧셈/ }).check();
    const size = `${width}x${height}`;
    const seen = {};
    const measure = async (step) => {
      const m = { ...(await settled(page, `${size} ${step}`)) };
      m.reach = await reach(page);
      seen[step] = m;
      results.push({ size, step, ...m });
      await page.screenshot({ path: path.join(out, `${size}-${step}.png`) });
    };
    // The preview cannot save, so the shell shows its failed-save notice above
    // the builder once a step has questions. It arrives after the step, which
    // moves the builder down; folding it moves the builder up. Neither resizes
    // the builder itself.
    const notice = () =>
      page.getByRole("button", { name: "저장 오류 알림 닫기" }).waitFor();
    const fold = async () => {
      await page.getByRole("button", { name: "저장 오류 알림 닫기" }).click();
      await page
        .getByRole("button", { name: "저장 오류 자세히 보기" })
        .waitFor();
    };

    const compose = page.getByRole("button", { name: "문항 검토 →" });
    await page.waitForFunction(
      (button) => !button.disabled,
      await compose.elementHandle(),
    );
    await measure("scope");
    await compose.click();
    await page.waitForSelector("[data-review-layout]");
    await notice();
    await measure("review");
    await fold();
    await measure("review-folded");
    await page.getByRole("button", { name: "저장 오류 자세히 보기" }).click();
    await page.getByRole("button", { name: "다음: 양식 구성·출력" }).click();
    await page.waitForSelector('[data-paper-desk][aria-busy="false"]');
    await notice();
    await measure("output");
    // More pages than the strip can show at once: one column, two per column.
    await page.getByRole("button", { name: "1단", exact: true }).click();
    await page.getByRole("button", { name: "문항 수 지정" }).click();
    await page.getByRole("button", { name: "1단당 2" }).click();
    await page.waitForSelector('[data-paper-desk][aria-busy="false"]');
    await measure("output-pages");
    await fold();
    await measure("output-folded");

    if (wide) {
      for (const [step, m] of Object.entries(seen))
        assertWide(`${size} ${step}`, m);
      for (const step of ["output", "output-pages", "output-folded"])
        assertStrip(`${size} ${step}`, seen[step]);
      assert.ok(seen["output-pages"].strip.overflowX > 0, "fixture too short");
    } else if (width > 900) {
      // Low screens keep the earlier rule for the scope and review columns:
      // 12px under the viewport, the page scrolling to give them more room.
      for (const step of ["scope", "review", "review-folded"])
        for (const c of seen[step].columns)
          if (c.scrollHeight > c.clientHeight + 1)
            assert.ok(Math.abs(c.bottom - (height - 12)) <= 1, step);
      // The output frame was already one screen tall at every height.
      for (const step of ["output", "output-pages", "output-folded"])
        assert.equal(seen[step].reach.y, 0, `${size} ${step}`);
    } else {
      // Narrow screens stack the columns and scroll the page as before.
      for (const step of ["scope", "review", "review-folded"]) {
        assert.ok(seen[step].columns.every((c) => c.overflowY === "visible"));
        assert.ok(seen[step].pageScroll > 0);
      }
    }
    for (const [step, m] of Object.entries(seen))
      assert.equal(m.reach.x, 0, `${size} ${step}: the page scrolls sideways`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(leaked, [], "the preview must not reach a network API");
} finally {
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify({ results, errors, leaked }, null, 2),
  );
  await browser.close();
}
console.log(
  results
    .map(
      (r) =>
        `${r.size} ${r.step.padEnd(12)} page ${r.pageScroll}/${r.reach.y} · ` +
        r.columns
          .map(
            (c) =>
              `${Math.round(c.bottom)}:${c.scrollHeight}/${c.clientHeight}`,
          )
          .join(" ") +
        (r.strip
          ? ` · strip ${Math.round(r.strip.bottom)} bar ${r.strip.bar} x+${r.strip.overflowX}`
          : ""),
    )
    .join("\n"),
);
console.log(`ok — ${out}`);
