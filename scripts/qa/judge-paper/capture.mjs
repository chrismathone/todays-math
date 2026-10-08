/**
 * **판정형 표본 지면** — 제품의 일일테스트 지면(`TestPrint` — 문제지 · 정답지)을 Chromium 으로 떠서 PNG · PDF 로
 * 남기고, 통합 시험지 2단(`WorksheetEditor`)의 첫 화면도 한 장 뜬다 (2026-10-08 엔진 보강 2단계).
 *
 *   npx tsx scripts/qa/judge-paper/samples.ts plan <계획.json>      # 묶음 s1 … (차시별)
 *   npx vite --config scripts/qa/judge-paper/vite.config.mts        # 다른 창에서 띄워 둔다
 *   node scripts/qa/judge-paper/capture.mjs <출력 폴더> s1 s2 …
 *
 * 문제지에서 ⑴ 접힌 보기 ⑵ KaTeX 오류 ⑶ 제품 경고를, 정답지에서 ⑷ 해설 칸 밖으로 밀린 항목(실물 잘림)을 센다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const [out, ...sets] = process.argv.slice(2);
if (!out || sets.length === 0) {
  console.error("쓰는 법: capture.mjs <출력 폴더> <묶음 …>");
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 1200 },
  deviceScaleFactor: 1.5,
});
page.setDefaultTimeout(240000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

/** 브라우저 안 — 접힌 보기(수식 조각이 앞 조각보다 왼쪽에서 시작한다)의 수. */
function foldedChoices() {
  let folded = 0;
  for (const katex of document.querySelectorAll(".katex-html")) {
    const rects = [
      ...katex.querySelectorAll(":scope > .katex-base, :scope > .base"),
    ].map((b) => b.getBoundingClientRect());
    if (rects.some((r, i) => i > 0 && r.left < rects[i - 1].right - 1))
      folded += 1;
  }
  return folded;
}
const ready = async () => {
  await page.waitForFunction(
    () => (document.body.innerText.match(/①/g) ?? []).length >= 1,
  );
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
};

const summary = [];
for (const set of sets) {
  const dir = path.join(out, set);
  mkdirSync(dir, { recursive: true });
  for (const mode of ["questions", "answers"]) {
    await page.goto(`http://127.0.0.1:4237/?mode=${mode}&set=${set}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-print-page="true"]');
    await ready();
    const katexErrors = await page.locator(".katex-error").count();
    const warnings = await page.locator('[role="status"]').allInnerTexts();
    // 화면용 미리보기 도구 막대(인쇄에는 안 나감)가 쪽 그림 위에 겹쳐 찍히지 않게 숨긴다.
    await page.addStyleTag({
      content: "[class*=previewToolbar]{display:none !important}",
    });
    const pages = page.locator('[data-print-page="true"]');
    const n = await pages.count();
    for (let i = 0; i < n; i += 1)
      await pages
        .nth(i)
        .screenshot({ path: path.join(dir, `${mode}-p${i + 1}.png`) });
    const folded = await page.evaluate(foldedChoices);
    // 정답지 — 해설 칸(2단 · 넘침 숨김) 밖으로 밀린 항목(셋째 단 · 아래로 넘침)을 실제 상자로 센다.
    const clipped =
      mode === "answers"
        ? await page.evaluate(() => {
            const lost = [];
            let items = 0;
            for (const box of document.querySelectorAll(
              '[data-testid="answer-solutions"]',
            )) {
              const r = box.getBoundingClientRect();
              for (const item of box.querySelectorAll("article")) {
                items += 1;
                const q = item.getBoundingClientRect();
                if (q.left >= r.right - 1 || q.bottom > r.bottom + 1)
                  lost.push(item.textContent.trim().slice(0, 12));
              }
            }
            return { items, lost };
          })
        : { items: 0, lost: [] };
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: path.join(dir, `${mode}.pdf`),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.emulateMedia({ media: "screen" });
    const row = {
      paper: "daily",
      set,
      mode,
      pages: n,
      katexErrors,
      warnings,
      folded,
      solutionItems: clipped.items,
      clipped: clipped.lost,
    };
    summary.push(row);
    console.log(JSON.stringify(row));
  }
  // 통합 시험지 2단 — 화면 한 장(지면 미리보기)과 접힌 보기 수.
  await page.goto(`http://127.0.0.1:4237/worksheet.html?set=${set}`, {
    waitUntil: "domcontentloaded",
  });
  await ready();
  const row = {
    paper: "worksheet",
    set,
    katexErrors: await page.locator(".katex-error").count(),
    folded: await page.evaluate(foldedChoices),
  };
  await page.screenshot({
    path: path.join(dir, "worksheet.png"),
    fullPage: true,
  });
  summary.push(row);
  console.log(JSON.stringify(row));
}
console.log(JSON.stringify({ errors }));
writeFileSync(
  path.join(out, "capture-summary.json"),
  JSON.stringify({ summary, errors }, null, 1),
);
await browser.close();
