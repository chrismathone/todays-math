import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startServer } from "./server.mjs";

// Explicit switch prevents accidentally taking another worker's browser turn.
if (!process.argv.includes("--browser-granted"))
  throw Error(
    "Wait for the lead to grant Chromium, then pass --browser-granted.",
  );
const before = process.argv.includes("--before");
const phase = before ? "before" : "after";
const output = process.env.QA_OUTPUT;
assert.ok(output, "Set QA_OUTPUT to the external evidence directory.");
await mkdir(output, { recursive: true });
const server = await startServer();
let browser;
const rows = [],
  errors = [],
  rejectedRequests = [];
const figure =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120"><title>12 이상인 수</title><path d="M20 60H380" stroke="#596c86"/><path d="M200 60H380l-12 -7m12 7l-12 7" fill="none" stroke="#3159df" stroke-width="4"/><circle cx="200" cy="60" r="6" fill="#3159df"/><text x="200" y="92" text-anchor="middle" font-size="18">12</text></svg>';
async function geometry(page) {
  return page.evaluate(() => {
    const rect = (node) => {
      const r = node.getBoundingClientRect(),
        s = getComputedStyle(node);
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
        overflow: s.overflow,
        flex: s.flex,
        rows: s.gridTemplateRows,
      };
    };
    const problem = document.querySelector('[aria-label="문제 내용"]');
    const question = document.querySelector(
      'section[aria-labelledby="course-question-title"]',
    );
    return {
      question: rect(question),
      problemPane: rect(problem.parentElement),
      problem: rect(problem),
      response: rect(question.children[1]),
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
  return locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    let left = Math.max(0, r.left),
      right = Math.min(innerWidth, r.right),
      top = Math.max(0, r.top),
      bottom = Math.min(innerHeight, r.bottom);
    for (let p = node.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p),
        box = p.getBoundingClientRect();
      if (s.overflowX !== "visible") {
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
      if (s.overflowY !== "visible") {
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
    }
    const hit = document.elementFromPoint(
      (left + right) / 2,
      (top + bottom) / 2,
    );
    return {
      width: right - left,
      height: bottom - top,
      targetHeight: r.height,
      targetWidth: r.width,
      hit: node === hit || node.contains(hit),
    };
  });
}
async function checkReachable(locator, name) {
  const r = await reachable(locator);
  assert.ok(
    r.width >= Math.min(44, r.targetWidth) &&
      r.height >= Math.min(44, r.targetHeight) &&
      r.hit,
    `${name} clipped or covered: ${JSON.stringify(r)}`,
  );
  return r;
}
async function checkReadableProblem(page, name, last = false) {
  const region = page.getByRole("region", { name: "문제 내용" });
  await region.evaluate((node) => {
    node.scrollTop = 0;
  });
  const paragraphs = region.locator("p");
  const text = last ? paragraphs.last() : paragraphs.first();
  // Center the line below the real sticky header, as a student can by scrolling.
  await text.evaluate((node) =>
    node.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "instant",
    }),
  );
  const visible = await text.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let leaf;
    while ((leaf = walker.nextNode()) && !leaf.textContent.trim()) {}
    if (!leaf) return { readable: false, reason: "no text" };
    const range = document.createRange();
    range.selectNodeContents(leaf);
    const ink = range.getClientRects()[0];
    const pane = node.closest('[role="region"]').getBoundingClientRect();
    const hit = document.elementFromPoint(
      ink.left + 2,
      (ink.top + ink.bottom) / 2,
    );
    return {
      readable:
        ink.height > 0 &&
        ink.top >= pane.top - 1 &&
        ink.bottom <= pane.bottom + 1 &&
        node.contains(hit),
      ink: { top: ink.top, bottom: ink.bottom },
      pane: { top: pane.top, bottom: pane.bottom },
      hit: hit?.outerHTML.slice(0, 160),
    };
  });
  if (!visible.readable)
    await page.screenshot({
      path: path.join(output, `${phase}-readability-failure.png`),
      fullPage: true,
    });
  assert.ok(
    visible.readable,
    `${name}: the first line of the problem is clipped or covered ${JSON.stringify(visible)}`,
  );
  return visible;
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [768, 1024],
    [1280, 900],
    [1440, 900],
  ]) {
    for (const shell of ["managed", "standalone"]) {
      for (const kind of shell === "standalone"
        ? ["choice"]
        : ["choice", "list", "long"]) {
        const page = await browser.newPage({
          viewport: { width, height },
          reducedMotion: "reduce",
        });
        page.setDefaultTimeout(15000);
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== new URL(server.resolvedUrls.local[0]).origin) {
            rejectedRequests.push(url.href);
            return route.abort();
          }
          if (url.pathname.startsWith("/api/")) {
            if (
              url.pathname === "/api/learn/math-srs/course/figure" &&
              url.search === "?fixture=h02"
            )
              return route.fulfill({
                contentType: "image/svg+xml",
                body: figure,
              });
            rejectedRequests.push(url.href);
            return route.abort();
          }
          return route.continue();
        });
        const tag = `${shell}-${kind}-${width}x${height}`;
        await page.goto(
          `${server.resolvedUrls.local[0]}?kind=${kind}&shell=${shell}`,
        );
        await page
          .getByRole("region", { name: "문제 내용" })
          .waitFor({ state: "attached" });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[aria-label="문제 내용"]')
              .textContent.includes("고르세요") ||
            document
              .querySelector('[aria-label="문제 내용"]')
              .textContent.includes("쓰시오"),
        );
        if (kind !== "list")
          await page
            .getByRole("group", { name: "답 고르기" })
            .getByText("10", { exact: true })
            .waitFor({ state: "attached" });
        await page.evaluate(() => document.fonts.ready);
        if (kind === "long")
          await page
            .locator('[aria-label="문제 내용"] svg')
            .waitFor({ state: "attached" });
        const initial = await geometry(page);
        const row = { tag, width, height, shell, kind, initial };
        rows.push(row);
        await page.screenshot({
          path: path.join(output, `${phase}-${tag}-initial.png`),
          fullPage: true,
        });
        if (before) {
          await page.close();
          continue;
        }
        assert.ok(
          initial.problemPane.height > 0 &&
            initial.problem.height > 0 &&
            initial.response.height > 0,
          `${tag}: collapsed region`,
        );
        assert.equal(initial.documentOverflow, 0, `${tag}: document overflow`);
        row.readable = await checkReadableProblem(page, tag);
        if (kind === "long") {
          row.finalLine = await checkReadableProblem(
            page,
            `${tag} final line`,
            true,
          );
          row.figure = await checkReachable(
            page.locator('[aria-label="문제 내용"] svg'),
            `${tag} figure`,
          );
          await page.screenshot({
            path: path.join(output, `${phase}-${tag}-figure-viewport.png`),
          });
        }
        if (kind === "list") {
          row.input = await checkReachable(
            page.getByRole("textbox", { name: "나의 답" }),
            `${tag} input`,
          );
          await page.getByRole("textbox", { name: "나의 답" }).fill("11");
          row.submit = await checkReachable(
            page.getByRole("button", { name: "정답 확인" }),
            `${tag} submit`,
          );
          await page.getByRole("button", { name: "정답 확인" }).click();
        } else {
          const choice = page
            .getByRole("group", { name: "답 고르기" })
            .getByRole("button")
            .first();
          row.choice = await checkReachable(choice, `${tag} choice`);
          await choice.click();
        }
        await page.getByText("다시 해 볼까요", { exact: true }).waitFor();
        row.retry = await geometry(page);
        assert.ok(
          row.retry.problem.height > 0,
          `${tag}: retry problem collapsed`,
        );
        row.retryReadable = await checkReadableProblem(page, `${tag} retry`);
        await page.screenshot({
          path: path.join(output, `${phase}-${tag}-retry.png`),
          fullPage: true,
        });
        if (kind === "list") {
          await page.getByRole("textbox", { name: "나의 답" }).fill("11");
          await page.getByRole("button", { name: "정답 확인" }).click();
        } else {
          const choice = page
            .getByRole("group", { name: "답 고르기" })
            .getByRole("button")
            .filter({ hasText: /^\s*\d+\s*10(?:앞|\s*$)/ });
          await choice.click();
        }
        await page.getByRole("heading", { name: "정답과 풀이" }).waitFor();
        row.solution = await geometry(page);
        row.understood = await checkReachable(
          page.getByRole("button", { name: "알겠어요" }),
          `${tag} understood`,
        );
        await page.screenshot({
          path: path.join(output, `${phase}-${tag}-solution.png`),
          fullPage: true,
        });
        await page.screenshot({
          path: path.join(output, `${phase}-${tag}-solution-viewport.png`),
        });
        await page.getByRole("button", { name: "알겠어요" }).click();
        await page
          .getByText("다음 문제예요. 12 이상인 수를 고르세요.")
          .waitFor();
        row.next = await geometry(page);
        assert.ok(
          row.next.problem.height > 0 && row.next.response.height > 0,
          `${tag}: next collapsed`,
        );
        row.nextReadable = await checkReadableProblem(page, `${tag} next`);
        await page.close();
      }
    }
  }
} finally {
  await writeFile(
    path.join(output, `${phase}-measurements.json`),
    JSON.stringify(
      { phase, browser: browser?.version(), rows, errors, rejectedRequests },
      null,
      2,
    ),
  );
  await browser?.close();
  await server.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(rejectedRequests, []);
console.log(
  `${phase}: ${rows.length} layouts; ${before ? "baseline captured" : "choice/list, retry, solution, understood and next reachable"}`,
);
