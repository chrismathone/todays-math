// Reproducible UI evidence with authored fixtures; no Next server, session, API or DB.
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const root = process.cwd();
const output = resolve(root, ".qa-artifacts/print-info-color");
await mkdir(output, { recursive: true });
const css = await readFile(resolve(root, "src/app/globals.css"), "utf8");
const tokens = css.match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
if (!tokens) throw new Error("공유 토큰을 찾을 수 없습니다.");
await writeFile(
  resolve(output, "index.html"),
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}
@font-face{font-family:DemoSans;src:url(/@fs/${root}/public/fonts/PretendardVariable.woff2);font-weight:45 920}
@font-face{font-family:DemoSerif;src:url(/@fs/${root}/public/fonts/NotoSerifKR-subset.woff2);font-weight:100 900}
:root{--font-pretendard:DemoSans;--font-noto-serif-kr:DemoSerif}*{box-sizing:border-box}body{margin:0}
</style></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`,
);
await writeFile(
  resolve(output, "entry.tsx"),
  `import React from "react";import {createRoot} from "react-dom/client";import "${root}/node_modules/katex/dist/katex.min.css";import {PrintColorHifi} from "${root}/src/app/dev/print-color-hifi/PrintColorHifi.tsx";createRoot(document.getElementById("root")!).render(<PrintColorHifi/>);`,
);
const server = await createServer({
  configFile: false,
  root: output,
  cacheDir: resolve(output, "vite-cache"),
  plugins: [react()],
  resolve: { alias: { "@": resolve(root, "src") } },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(resolve(root, "node_modules"))] },
  },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  blocked = [],
  measurements = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.hostname !== "127.0.0.1" || url.pathname.startsWith("/api/")) {
    blocked.push(url.href);
    return route.abort();
  }
  return route.continue();
});
try {
  const address = server.httpServer.address();
  await page.goto(`http://127.0.0.1:${address.port}/dev/print-color-hifi`);
  await page
    .getByRole("heading", { name: "정보 구성과 지면 색상", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const template of ["평가원", "정통", "모던", "워크북", "자습", "유형"]) {
    await page
      .getByRole("group", { name: "비교할 템플릿" })
      .getByRole("button", { name: new RegExp(`^${template}`) })
      .click();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      );
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        sheets: [...document.querySelectorAll("[data-demo-sheet]")].map(
          (node) => {
            const paper =
              node.dataset.variant === "C5" ? node.firstElementChild : node;
            return {
              variant: node.dataset.variant,
              width: paper.clientWidth,
              height: paper.clientHeight,
              overflowX: paper.scrollWidth - paper.clientWidth,
              overflowY: paper.scrollHeight - paper.clientHeight,
              questions: paper.querySelectorAll("[data-problem-body]").length,
            };
          },
        ),
        gray: document.querySelectorAll("[data-gray]").length,
        examTypes: [...document.querySelectorAll("[data-exam-type]")].map(
          (node) => node.textContent,
        ),
      }));
      measurements.push({ template, width, ...result });
      if (
        result.overflow > 1 ||
        result.sheets.length !== 21 ||
        result.gray !== 5 ||
        result.examTypes.length !== 17 ||
        result.examTypes.some((text) => text !== "일일TEST") ||
        result.sheets.some(
          (sheet) =>
            sheet.overflowX > 1 || sheet.overflowY > 1 || sheet.questions !== 4,
        )
      )
        throw new Error(
          `지면 크기·넘침·문항 누락: ${template}/${width} ${JSON.stringify(result)}`,
        );
      if (width === 1440)
        await page
          .locator("#color-comparison")
          .screenshot({ path: resolve(output, `comparison-${template}.png`) });
      if (width === 320)
        await page
          .getByRole("region", { name: new RegExp(`^${template} · C1`) })
          .screenshot({ path: resolve(output, `detail-${template}-320.png`) });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("group", { name: "비교할 템플릿" })
    .getByRole("button", { name: /^정통/ })
    .click();
  const school = page
    .locator("#panel-preview")
    .getByRole("textbox", { name: /학교\/기관명/ });
  await school.fill("입력 보존 확인 학교");
  await page
    .getByRole("group", { name: "비교할 템플릿" })
    .getByRole("button", { name: /^유형/ })
    .click();
  if (!(await school.isDisabled()))
    throw new Error("기본 P1에서 미사용 칸에 입력할 수 있습니다.");
  await page.getByRole("button", { name: "P2 · 쓰는 칸만 표시" }).click();
  if (await school.count())
    throw new Error("P2에서 미출력 칸이 숨겨지지 않았습니다.");
  await page
    .getByRole("group", { name: "비교할 템플릿" })
    .getByRole("button", { name: /^정통/ })
    .click();
  if (
    (await page
      .locator("#panel-preview")
      .getByRole("textbox", { name: "학교/기관명" })
      .inputValue()) !== "입력 보존 확인 학교"
  )
    throw new Error("양식 전환 중 값이 손실되었습니다.");
  await page
    .getByRole("group", { name: "비교할 템플릿" })
    .getByRole("button", { name: /^유형/ })
    .click();
  await page
    .getByRole("combobox", { name: "시험 종류", exact: true })
    .selectOption("없음");
  if (await page.locator("[data-exam-type]").count())
    throw new Error("시험 종류 없음이 지면에 남아 있습니다.");
  await page
    .getByRole("combobox", { name: "시험 종류", exact: true })
    .selectOption("주간TEST");
  if (
    (await page
      .locator("[data-exam-type]")
      .filter({ hasText: "주간TEST" })
      .count()) !== 17
  )
    throw new Error("바꾼 시험 종류가 지면에 반영되지 않습니다.");
  await page
    .getByRole("group", { name: "크게 볼 색상안" })
    .getByRole("button", { name: "C4", exact: true })
    .click();
  await page.getByLabel("강조 색상", { exact: true }).selectOption("#0EA5E9");
  const detail = page.getByRole("region", { name: /^유형 · C4/ });
  await detail.screenshot({ path: resolve(output, "C4-cyan-detail.png") });
  await page.getByRole("checkbox", { name: "회색조로 보기" }).check();
  await detail.screenshot({ path: resolve(output, "C4-cyan-gray-detail.png") });
  await page.getByRole("button", { name: "P1 · 미사용 칸 비활성" }).click();
  await page
    .locator("#panel-preview")
    .screenshot({ path: resolve(output, "panel-P1.png") });
  await page.getByRole("button", { name: "P2 · 쓰는 칸만 표시" }).click();
  await page
    .locator("#panel-preview")
    .screenshot({ path: resolve(output, "panel-P2.png") });
  // Inspect the same A4 DOM under print CSS, without an API export or DB access.
  await page.emulateMedia({ media: "print" });
  await detail.screenshot({ path: resolve(output, "C4-print-media.png") });
  if (errors.length || blocked.length)
    throw new Error(JSON.stringify({ errors, blocked }));
  await writeFile(
    resolve(output, "browser.json"),
    JSON.stringify(
      {
        measurements,
        errors,
        blocked,
        interactions:
          "P1 비활성+까닭/P2 숨김・입력 보존・6양식・5색상안・3색・회색조・시험 종류 표시/없음/변경・print media",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      output,
      combinations: 6 * 5 * 3,
      graySheets: 6 * 5,
      viewportChecks: measurements.length,
      errors: errors.length,
      blocked: blocked.length,
    }),
  );
} finally {
  await browser.close();
  await server.close();
}
