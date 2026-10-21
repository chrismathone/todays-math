import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startServer } from "./server.mjs";
import { captureZoomViewport } from "./captureZoomViewport.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("A fresh coordinator browser/server grant is required.");
const output = process.env.QA_OUTPUT;
assert.ok(output);
await mkdir(output, { recursive: true });
let server, context, profile, page;
const rows = [],
  errors = [],
  rejected = [];
const consoleState = {
  loginId: "test_s",
  studentName: "로컬 검증",
  className: "테스트반",
  today: "2026-10-21",
  realToday: "2026-10-21",
  offsetDays: 0,
  revision: 0,
  explorer: { grade: 5, stars: 0, earned: 0, level: 1, cards: 0 },
  mission: null,
  course: null,
  counts: {
    srsMissions: 0,
    completedDays: 0,
    expeditionTiles: 0,
    lectureViews: 0,
  },
  sections: [],
  payload: null,
  message: null,
};
try {
  server = await startServer();
  const origin = new URL(server.resolvedUrls.local[0]).origin;
  profile = await mkdtemp(path.join(os.tmpdir(), "srs-experience-focused-"));
  const extension = path.resolve(
    "scripts/qa/srs-remaining-experience/zoom-extension",
  );
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: "chromium",
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 390, height: 900 },
  });
  page = context.pages()[0];
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (
      u.origin === origin &&
      u.pathname === "/api/learn/test-console" &&
      route.request().method() === "GET"
    )
      return route.fulfill({ json: { data: consoleState } });
    if (u.origin !== origin || u.pathname.startsWith("/api/")) {
      rejected.push(u.href);
      return route.abort();
    }
    return route.continue();
  });
  async function open(query) {
    if (page.url().startsWith(origin))
      await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${origin}/?${query}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "길잡이 바꾸기: 담비" }).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function hit(button) {
    return button.evaluate((node) => {
      const r = node.getBoundingClientRect();
      const points = [
        [r.x + r.width / 2, r.y + r.height / 2],
        [r.x + 16, r.y + 8],
        [r.right - 16, r.y + 8],
        [r.x + 16, r.bottom - 8],
        [r.right - 16, r.bottom - 8],
      ];
      return points.every(([x, y]) => {
        const at = document.elementFromPoint(x, y);
        return at === node || node.contains(at);
      });
    });
  }
  for (const width of [390, 1440])
    for (const scene of ["memory", "chips"]) {
      await page.setViewportSize({ width, height: 900 });
      await open(`scene=${scene}&step=4&test`);
      await page
        .getByRole("button", { name: "오늘 공부 시작", exact: true })
        .click();
      const input = page.getByRole("textbox", { name: /빈칸 답 입력/ });
      await input.focus();
      await input.press("Escape");
      const launcher = page.getByRole("button", {
        name: "테스트",
        exact: true,
      });
      for (
        let i = 0;
        i < 12 &&
        !(await launcher.evaluate((n) => n === document.activeElement));
        i++
      )
        await page.keyboard.press("Tab");
      assert.equal(
        await launcher.evaluate((n) => n === document.activeElement),
        true,
        "Tab reaches launcher",
      );
      assert.equal(
        await hit(launcher),
        true,
        "focused launcher centre is unobscured",
      );
      const giveup = page.getByRole("button", {
        name: "아직 모르겠어요",
        exact: true,
      });
      const boxes = await Promise.all([
        launcher.boundingBox(),
        giveup.evaluate((node) => {
          const parent = node.parentElement;
          const target =
            getComputedStyle(parent).position === "fixed" ? parent : node;
          const r = target.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      ]);
      const overlap =
        boxes[0] &&
        boxes[1] &&
        boxes[0].x < boxes[1].x + boxes[1].width &&
        boxes[0].x + boxes[0].width > boxes[1].x &&
        boxes[0].y < boxes[1].y + boxes[1].height &&
        boxes[0].y + boxes[0].height > boxes[1].y;
      assert.equal(!!overlap, false, "tool does not overlap study action");
      await captureZoomViewport(
        context,
        page,
        path.join(output, `${width}-${scene}-launcher-focused.png`),
        path.join(output, `${width}-${scene}-launcher-layout.json`),
      );
      await launcher.click();
      await page
        .getByRole("complementary", { name: "테스트 도구판" })
        .waitFor();
      await page.keyboard.press("Escape");
      await giveup.focus();
      assert.equal(
        await hit(giveup),
        true,
        "study action centre is unobscured",
      );
      await page.keyboard.press("Enter");
      if (scene === "chips")
        await page.getByRole("heading", { name: "4단계를 마쳤어요" }).waitFor();
      else
        await page.waitForFunction(() =>
          window.__qaActions.some((a) => a.action === "give-up-card"),
        );
      rows.push({
        width,
        scene,
        boxes,
        tab: true,
        toolHit: true,
        studyHit: true,
      });
    }
  await page.setViewportSize({ width: 1440, height: 900 });
  await open("scene=first");
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const zoom = await worker.evaluate(async (origin) => {
    const tab = (await chrome.tabs.query({})).find((t) =>
      t.url?.startsWith(origin),
    );
    await chrome.tabs.setZoom(tab.id, 2);
    return chrome.tabs.getZoom(tab.id);
  }, origin);
  assert.equal(zoom, 2);
  await page.waitForFunction(() => innerWidth === 720);
  await captureZoomViewport(
    context,
    page,
    path.join(output, "200-percent-viewport-top.png"),
    path.join(output, "200-percent-layout-top.json"),
  );
  const metrics = await page.evaluate(() => ({
    zoomCss: document.documentElement.style.zoom,
    width: innerWidth,
    dpr: devicePixelRatio,
    overflow: document.documentElement.scrollWidth - innerWidth,
    ua: navigator.userAgent,
  }));
  assert.equal(metrics.overflow, 0);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await captureZoomViewport(
    context,
    page,
    path.join(output, "200-percent-viewport-bottom.png"),
    path.join(output, "200-percent-layout-bottom.json"),
  );
  rows.push({ zoom, ...metrics });
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} catch (error) {
  if (page)
    await captureZoomViewport(
      context,
      page,
      path.join(output, "focused-failure.png"),
      path.join(output, "focused-failure-layout.json"),
    );
  throw error;
} finally {
  try {
    await context?.close();
  } finally {
    await server?.close();
  }
  if (profile) await rm(profile, { recursive: true, force: true });
  await writeFile(
    path.join(output, "focused-results.json"),
    JSON.stringify({ rows, errors, rejected, closed: true }, null, 2),
  );
  console.log("finally: browser/server closed; profile removed");
}
console.log("Focused launcher/zoom checks passed");
