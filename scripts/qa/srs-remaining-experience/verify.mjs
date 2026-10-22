import assert from "node:assert/strict";
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "@playwright/test";
import { startServer } from "./server.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("Coordinator browser/server grant required.");
const output = process.env.QA_OUTPUT;
assert.ok(output);
await mkdir(output, { recursive: true });
const rows = [],
  errors = [],
  expectedErrors = [],
  rejected = [],
  checks = [];
let server, browser, profile;
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-fading-math-ready]")].every(
      (n) => n.getAttribute("data-fading-math-ready") === "true",
    ),
  );
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete),
  );
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    dpr: devicePixelRatio,
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    shell: !!document.querySelector("[data-student-shell]"),
    font: getComputedStyle(document.querySelector("h1,h2")).fontFamily,
    loaded: document.fonts.check("18px HomePretendard"),
    katexCss: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((r) => r.cssText.includes(".katex"));
      } catch {
        return false;
      }
    }),
    brokenImages: [...document.images]
      .filter((i) => !i.naturalWidth)
      .map((i) => i.src),
    session: document.querySelector("[data-fading-session] > header")
      ?.textContent,
    notes: [...document.querySelectorAll("[data-journey-progress] p")].map(
      (n) => ({ text: n.textContent, size: getComputedStyle(n).fontSize }),
    ),
  }));
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
  rows.push({ name, ...metrics });
  console.log("captured", name);
  assert.equal(metrics.overflow, 0, name);
  assert.ok(
    metrics.shell &&
      metrics.loaded &&
      metrics.font.includes("HomePretendard") &&
      metrics.katexCss,
    JSON.stringify(metrics),
  );
  assert.deepEqual(metrics.brokenImages, []);
}
try {
  server = await startServer();
  const origin = new URL(server.resolvedUrls.local[0]).origin;
  profile = await mkdtemp(path.join(os.tmpdir(), "srs-experience-browser-"));
  const extension = path.resolve(
    "scripts/qa/srs-remaining-experience/zoom-extension",
  );
  browser = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: "chromium",
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 390, height: 900 },
  });
  const page = browser.pages()[0];
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") {
      if (page.url().includes("fault=401") && m.text().includes("401"))
        expectedErrors.push(m.text());
      else errors.push(m.text());
    }
  });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== origin) {
      rejected.push(u.href);
      return route.abort();
    }
    if (u.pathname === "/api/learn/fading" && page.url().includes("fault=401"))
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "UNAUTHORIZED", message: "다시 로그인해 주세요." },
        },
      });
    if (u.pathname === "/api/learn/math-srs/replay")
      return route.fulfill({
        json: {
          data: {
            kind: "elementary",
            step: 1,
            problemId: "11111111-1111-4111-8111-111111111111",
            title: "로컬 복습",
            subtitle: "이상과 이하",
            content: "$3+2$의 값을 구하세요.",
            figureUrl: null,
            answerChoices: ["5", "4", "3", "2"],
            interactive: null,
            correct: route.request().method() === "POST" ? true : null,
            canRevealSolution: true,
            solution: null,
          },
        },
      });
    if (u.pathname.startsWith("/api/")) {
      rejected.push(u.href);
      return route.abort();
    }
    return route.continue();
  });
  const open = async (query) => {
    if (page.url().startsWith(origin))
      await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${origin}/?${query}`, { waitUntil: "networkidle" });
    await page.locator("[data-student-shell]").waitFor();
    await page.getByRole("button", { name: "길잡이 바꾸기: 담비" }).waitFor();
  };
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scene of ["first", "done", "mixed", "recall", "short"]) {
      await open(`scene=${scene}`);
      await page
        .getByRole("heading", {
          name:
            scene === "first"
              ? "오늘도 한 칸씩 배워요"
              : "오늘 공부를 마쳤어요",
        })
        .waitFor();
      assert.equal(
        await page.getByRole("button", { name: "테스트" }).count(),
        0,
      );
      await capture(page, `${width}-${scene}`);
    }
    await open("scene=progress");
    const journey = page.getByRole("button", {
      name: "나의 수학 여정",
      exact: true,
    });
    if (await journey.isVisible()) {
      await journey.focus();
      await page.keyboard.press("Enter");
    }
    if (width === 390) {
      const cdp = await browser.newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      // Touch right returns from the map to today's study; left opens the map again.
      for (const [from, to, expected] of [
        [80, 280, "0"],
        [280, 80, "1"],
      ]) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: from, y: 230 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: to, y: 230 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.equal(
          await page
            .locator("[data-testid=study-spread]")
            .getAttribute("data-page"),
          expected,
        );
      }
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await cdp.detach();
      checks.push(
        "390: CDP touch left/right switches actual book pages; not a physical-device test",
      );
    }
    await page.getByRole("button", { name: "이전 진도판" }).click();
    assert.equal(
      await page
        .locator("[data-journey-page]")
        .getAttribute("data-journey-page"),
      "1",
    );
    const replay = page
      .getByRole("button", { name: /1일차, .*다시 풀기/ })
      .first();
    await replay.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.getByText("로컬 복습", { exact: true }).waitFor();
    await capture(page, `${width}-replay`);
    await page.keyboard.press("Escape");
    assert.equal(
      await replay.evaluate((n) => n === document.activeElement),
      true,
    );
    await page.getByRole("button", { name: "다음 진도판" }).click();
    assert.equal(
      await page
        .locator("[data-journey-page]")
        .getAttribute("data-journey-page"),
      "2",
    );
    await capture(page, `${width}-progress-14days`);
    checks.push(
      `${width}: 14 days, previous/next, replay opens via Enter, Escape returns focus`,
    );
    for (const failed of [false, true]) {
      await open(`scene=done&save=${failed ? "fail" : "ok"}`);
      await page.getByRole("button", { name: "길잡이 바꾸기: 담비" }).focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("button", { name: "종이 제비", exact: true })
        .click();
      await page.getByRole("button", { name: "이 친구와 시작" }).click();
      await page
        .getByRole("button", { name: "길잡이 바꾸기: 종이 제비" })
        .waitFor();
      await capture(page, `${width}-guide-${failed ? "failure" : "success"}`);
      await page.locator("[data-qa-visit]").click();
      await page.locator("[data-qa-visit]").click();
      await page
        .getByRole("button", {
          name: failed ? "길잡이 바꾸기: 담비" : "길잡이 바꾸기: 종이 제비",
        })
        .waitFor();
    }
    for (const step of [2, 3]) {
      await open(`scene=memory&step=${step}`);
      await page
        .getByRole("button", { name: "오늘 공부 시작", exact: true })
        .click();
      await page.locator("[data-fading-session]").waitFor();
      assert.equal(
        await page.getByRole("textbox", { name: /빈칸 답 입력/ }).count(),
        0,
      );
      await capture(page, `${width}-step${step}-zero-blanks`);
      for (
        let i = 0;
        i < 4 &&
        !(await page.getByRole("textbox", { name: /빈칸 답 입력/ }).count());
        i++
      ) {
        await page
          .getByRole("button", { name: "다음 문장", exact: true })
          .focus();
        await page.keyboard.press("Enter");
      }
      const input = page.getByRole("textbox", { name: /빈칸 답 입력/ });
      await input.focus();
      await input.fill("오답");
      await input.press("Enter");
      await page.getByText(/다시 써 볼까요/).waitFor();
      await input.press("Escape");
      await input.press("Tab");
      assert.equal(
        await input.evaluate((n) => n === document.activeElement),
        false,
      );
      await capture(page, `${width}-step${step}-keyboard-retry`);
      checks.push(
        `${width}: step ${step} zero blanks, Enter pager, wrong answer, Escape then native Tab`,
      );
    }
    for (const scene of ["memory", "chips"]) {
      await open(`scene=${scene}&step=4&test`);
      await page
        .getByRole("button", { name: /오늘 공부 시작/ })
        .first()
        .click();
      await page.locator("[data-fading-session]").waitFor();
      await capture(page, `${width}-${scene}-input`);
      if (scene === "memory") {
        await page.reload({ waitUntil: "networkidle" });
        await page
          .getByRole("button", { name: "오늘 공부 시작", exact: true })
          .click();
        await page.locator("[data-fading-session]").waitFor();
        await capture(page, `${width}-memory-restored`);
        checks.push(
          `${width}: reload restores local snapshot at step 4 without a review write`,
        );
      }
      const ax = await page.locator("[data-fading-session]").ariaSnapshot();
      await writeFile(
        path.join(output, `${width}-${scene}-accessibility.yml`),
        ax,
      );
      assert.match(ax, /빈칸 답 입력/);
      // Give-up is an actual UI action through local source transitions.
      for (let i = 0; i < (scene === "memory" ? 4 : 1); i++)
        await page
          .getByRole("button", { name: "아직 모르겠어요", exact: true })
          .click();
      await page.getByRole("heading", { name: "4단계를 마쳤어요" }).waitFor();
      await capture(page, `${width}-${scene}-complete`);
      if (scene === "memory") {
        assert.ok(await page.getByText(/쓴 답이 없어요/).count());
        for (let i = 0; i < 3; i++)
          await page
            .getByRole("button", { name: "다음 문장 보기", exact: true })
            .click();
        await page.getByRole("button", { name: "살펴보기 마치기" }).click();
        await page.getByRole("button", { name: /^다시 / }).click();
        await page
          .getByRole("button", { name: "학습 홈으로", exact: true })
          .waitFor();
        const back = page.getByRole("button", {
          name: "학습 홈으로",
          exact: true,
        });
        await page
          .getByRole("button", { name: "다음 활동으로 이어가기" })
          .waitFor();
        assert.match(await back.getAttribute("class"), /secondary/);
        await capture(page, `${width}-completion-actions`);
      }
    }
  }
  await open("scene=memory&step=4&fault=401");
  await page
    .getByRole("button", { name: "오늘 공부 시작", exact: true })
    .click();
  await page
    .getByRole("button", { name: "아직 모르겠어요", exact: true })
    .click();
  await page.waitForFunction(() => window.__qaNavigation === "/learn/login");
  assert.equal(await page.evaluate(() => window.__qaActions.length), 1);
  await capture(page, "1440-session-expired");
  checks.push(
    "Intercepted local API 401 during card give-up reaches existing owner login redirect; no actual login/navigation or DB request.",
  );
  // Real browser per-tab zoom: no CSS zoom or viewport substitution.
  await page.setViewportSize({ width: 1440, height: 900 });
  await open("scene=first");
  const worker =
    browser.serviceWorkers()[0] ??
    (await browser.waitForEvent("serviceworker"));
  const zoom = await worker.evaluate(async (origin) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url?.startsWith(origin));
    await chrome.tabs.setZoom(tab.id, 2);
    return chrome.tabs.getZoom(tab.id);
  }, origin);
  assert.equal(zoom, 2);
  await page.waitForFunction(() => innerWidth === 720);
  await capture(page, "1440-browser-200-percent");
  checks.push({
    browserZoom: zoom,
    viewport: 1440,
    layoutWidth: await page.evaluate(() => innerWidth),
  });
  await worker.evaluate(async (origin) => {
    const tabs = await chrome.tabs.query({});
    await chrome.tabs.setZoom(
      tabs.find((t) => t.url?.startsWith(origin)).id,
      1,
    );
  }, origin);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open("scene=progress");
  assert.equal(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    true,
  );
  await capture(page, "1440-platform-reduced-motion");
  const motion = await page
    .locator("[data-daily-journey] button")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        animation: getComputedStyle(n).animationName,
        transition: getComputedStyle(n).transitionDuration,
      })),
    );
  assert.ok(
    motion.every(
      (m) =>
        m.animation === "none" &&
        m.transition.split(",").every((d) => parseFloat(d) === 0),
    ),
  );
  checks.push({
    platformReducedMotion: motion,
    limitation:
      "Browser emulation of OS reduced-motion media preference; no global OS setting changed.",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} catch (error) {
  const page = browser?.pages()[0];
  if (page) {
    await page.screenshot({
      path: path.join(output, "failure.png"),
      fullPage: true,
    });
    await writeFile(
      path.join(output, "failure-tree.yml"),
      await page.locator("body").ariaSnapshot(),
    );
  }
  throw error;
} finally {
  const version = browser?.browser()?.version();
  try {
    await browser?.close();
  } finally {
    await server?.close();
  }
  if (profile) await rm(profile, { recursive: true, force: true });
  await writeFile(
    path.join(output, "browser-results.json"),
    JSON.stringify(
      { version, rows, checks, errors, expectedErrors, rejected, closed: true },
      null,
      2,
    ),
  );
  console.log("finally: browser and server closed");
}
console.log(`${rows.length} captures; all assertions passed`);
