// Chromium 하나 · 실제 초5 은행/컴포넌트/Workroom · 메모리 API 대역. DB/환경파일 없이 실행한다.
// AUTH_SECRET=concept-blank-pick-local-only npx vite --config e2e/concept-blank-paper/vite.config.mts
// node scripts/qa/concept-blank-pick.mjs
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const base = "http://127.0.0.1:4233";
const output = path.resolve(
  "docs/planning/tracks/reports/concept-blank-pick-20261112",
);
await mkdir(output, { recursive: true });
const results = [],
  errors = [],
  saved = new Map();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  // Only the test browser owns these saved documents. No request reaches the service/database.
  await page.route("**/api/library/documents/**", async (route) => {
    const request = route.request(),
      id = decodeURIComponent(new URL(request.url()).pathname.split("/").pop());
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      saved.set(id, {
        ...body,
        id,
        revision: (saved.get(id)?.revision ?? 0) + 1,
        createdAt: "2026-11-12T00:00:00Z",
        updatedAt: "2026-11-12T00:00:00Z",
        problemCount: body.payload.selection.pick?.length ?? 0,
      });
    }
    await route.fulfill({
      status: saved.has(id) ? 200 : 404,
      json: { data: saved.get(id) },
    });
  });
  await page.route("**/api/**", async (route) => {
    if (
      new URL(route.request().url()).pathname.startsWith(
        "/api/library/documents/",
      )
    )
      await route.fallback();
    else
      throw new Error(
        `Unexpected API: ${route.request().method()} ${route.request().url()}`,
      );
  });
  const dialog = () => page.getByRole("dialog", { name: /문항 고르기/ });
  const open = async (label) => {
    const group = page.getByRole("group", { name: `${label} 싣는 방법` });
    if (!(await group.count()))
      await page.getByRole("switch", { name: `${label} 켜기` }).click();
    await page
      .getByRole("group", { name: `${label} 싣는 방법` })
      .getByRole("button", { name: "직접", exact: true })
      .click();
    await expect(dialog()).toBeVisible();
  };
  const measure = async (label, root = dialog()) => {
    const result = await root.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node,
        words = 0;
      const broken = [];
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,.katex,svg,[hidden]"))
          continue;
        if (!parent.getClientRects().length) continue;
        for (const match of node.textContent.matchAll(/[가-힣]{2,}/g)) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          const lines = new Set(
            [...range.getClientRects()]
              .filter((r) => r.width > 0 && r.height > 0)
              .map((r) => Math.round(r.top)),
          );
          words++;
          if (lines.size > 1) broken.push(match[0]);
        }
      }
      const rect = element.getBoundingClientRect();
      return {
        words,
        broken,
        width: rect.width,
        horizontalOverflow: element.scrollWidth - element.clientWidth,
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        font: getComputedStyle(element).fontFamily,
      };
    });
    results.push({ label, viewport: page.viewportSize().width, ...result });
    expect(result.broken, label).toEqual([]);
    expect(result.horizontalOverflow, label).toBeLessThanOrEqual(1);
    expect(result.documentOverflow, label).toBeLessThanOrEqual(1);
  };

  await page.goto(`${base}/pick.html`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page
    .getByRole("group", { name: "개념 질문 싣는 방법" })
    .waitFor({ timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check('14px "cb-harness-pretendard"'),
    ),
  ).toBe(true);

  await open("개념 질문");
  await dialog().getByRole("button", { name: "빈 칸만 자동으로" }).click();
  await dialog().getByRole("button", { name: "○×", exact: true }).click();
  await dialog().getByRole("button", { name: "빈 칸만 자동으로" }).click();
  await dialog().getByRole("button", { name: "질문", exact: true }).click();
  await expect(dialog().getByText("고름 11", { exact: true })).toBeVisible();

  // Range probe calibration: deliberately breaking one long word must be detected.
  const calibration = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.cssText =
      "display:block;width:35px;word-break:break-all;font:14px sans-serif";
    probe.textContent = "가나다라마바사아자차카타파하";
    document.body.append(probe);
    const range = document.createRange();
    range.selectNodeContents(probe);
    const lines = new Set(
      [...range.getClientRects()].map((r) => Math.round(r.top)),
    ).size;
    probe.remove();
    return lines;
  });
  expect(calibration).toBeGreaterThan(1);

  for (const width of [1440, 1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await measure("B 질문");
    await page.screenshot({ path: path.join(output, `actual-${width}.png`) });
    if (width === 390) {
      const checkbox = dialog().getByRole("checkbox").first();
      await checkbox.scrollIntoViewIfNeeded();
      await expect(checkbox).toBeInViewport();
      await page.screenshot({ path: path.join(output, "actual-390-list.png") });
      const remove = dialog()
        .getByRole("complementary", { name: "고른 문항", exact: true })
        .getByRole("button")
        .last();
      await remove.scrollIntoViewIfNeeded();
      await expect(remove).toBeInViewport();
      await page.screenshot({ path: path.join(output, "actual-390-tray.png") });
    }
    await dialog().getByRole("button", { name: "○×", exact: true }).click();
    await measure("B ○×");
    await dialog().getByRole("button", { name: "질문", exact: true }).click();
    await dialog().getByRole("button", { name: "답 보기" }).first().click();
    await measure("B 답 펼침");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("group", { name: "개념 질문 싣는 방법" })
      .getByRole("button", { name: "직접", exact: true }),
  ).toBeFocused();
  // Esc discarded the draft. Apply one question, then restore through the real client and memory API.
  await page.getByRole("button", { name: "개념 질문 문항 고르기" }).click();
  await expect(dialog().getByText("고름 0", { exact: true })).toBeVisible();
  const firstPrompt = await dialog()
    .locator("[data-pick-prompt]")
    .first()
    .innerText();
  await dialog().getByRole("checkbox").first().check();
  await dialog().getByRole("button", { name: "적용" }).click();
  await expect(page.getByLabel("개념 질문 질문 하 고른 수")).toHaveText("1");
  await expect(
    page.getByText("없음 — 직접 고른 형식이 있습니다"),
  ).toBeVisible();
  const printHref = await page
    .getByRole("link", { name: "인쇄하기" })
    .getAttribute("href");
  await page.getByRole("button", { name: "내 시험지에 저장" }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeDisabled();
  const document = [...saved.values()][0];
  expect(
    document.payload.selection.pick.filter((pick) => pick.form === "term"),
  ).toHaveLength(1);
  expect(
    document.payload.selection.pick.some((pick) => pick.form === "cloze"),
  ).toBe(true);
  await page.goto(`${base}/pick.html?blankDoc=${document.id}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("link", { name: "인쇄하기" })).toHaveAttribute(
    "href",
    printHref,
  );
  await page.screenshot({
    path: path.join(output, "applied-and-reopened.png"),
    fullPage: true,
  });
  // Same print component and bank, server auth/error path is covered in conceptBlankPrintPage.test.ts.
  const printUrl = new URL(printHref, base);
  await page.goto(`${base}/pick.html?${printUrl.searchParams}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("[data-print-page]").first()).toBeVisible();
  await expect(
    page.getByText(firstPrompt, { exact: true }).first(),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await page.screenshot({
    path: path.join(output, "print-same-selection.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });

  await page.goto(`${base}/pick.html`, { waitUntil: "domcontentloaded" });
  for (const label of [
    "완전 백지",
    "문장 빈칸",
    "개념 지도",
    "그림 보고 쓰기",
  ]) {
    await open(label);
    await dialog().getByRole("button", { name: "빈 칸만 자동으로" }).click();
    for (const width of [1440, 1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await measure(label);
      if (label === "문장 빈칸") {
        await dialog()
          .getByRole("button", { name: "적용", exact: true })
          .last()
          .click();
        await measure("C 적용");
        await dialog()
          .getByRole("button", { name: "문장", exact: true })
          .click();
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await dialog().getByRole("button", { name: "취소" }).click();
  }
  expect(errors).toEqual([]);
  await writeFile(
    path.join(output, "measurements.json"),
    JSON.stringify(
      {
        calibrationLines: calibration,
        api: "in-memory intercepted; no DB",
        browser: "Chromium",
        errors,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  const reference = pathToFileURL(
    path.resolve("docs/design/mockups/hifi-concept-blank-pick-20261112.html"),
  ).href;
  await page.goto(reference, { waitUntil: "load", timeout: 120_000 });
  await page.locator("#h2 .dlg").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("#h2 .app")
    .screenshot({ path: path.join(output, "h2-reference.png") });
  const comparison = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>H2 시안 · 실제 화면</title><style>body{margin:0;padding:20px;background:#edf0f6;font:16px sans-serif;color:#172b4d}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;height:auto}h2{font-size:18px}</style><h1>개념 백지 · 문제 고르기 H2</h1><main><section><h2>확정 시안 H2</h2><img src="h2-reference.png"></section><section><h2>실제 컴포넌트 · 초5 은행 · 1440px</h2><img src="actual-1440.png"><h2>390px</h2><img style="max-width:390px" src="actual-390.png"></section></main></html>`;
  await writeFile(path.join(output, "comparison.html"), comparison);
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.goto(pathToFileURL(path.join(output, "comparison.html")).href);
  await page.screenshot({
    path: path.join(output, "comparison.png"),
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      scenarios: results.length,
      words: results.reduce((n, result) => n + result.words, 0),
      breaks: results.reduce((n, result) => n + result.broken.length, 0),
      savedPicks: document.payload.selection.pick.length,
      errors,
      output,
    }),
  );
} finally {
  await browser.close();
}
