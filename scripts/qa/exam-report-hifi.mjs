// DB·인증·외부 API 없이 시안 컴포넌트만 Vite에서 그린다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const root = process.cwd();
const output = resolve(root, ".qa-artifacts/exam-report-hifi");
await mkdir(output, { recursive: true });
const globalCss = await readFile(resolve(root, "src/app/globals.css"), "utf8");
const tokens = globalCss.match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
if (!tokens) throw new Error("화면 토큰을 찾을 수 없습니다.");
await writeFile(
  resolve(output, "index.html"),
  `<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}
@font-face{font-family:Pretendard;src:url(/@fs/${root}/public/fonts/PretendardVariable.woff2);font-weight:45 920}
@font-face{font-family:ReportSerif;src:url(/@fs/${root}/public/fonts/NotoSerifKR-subset.woff2);font-weight:100 900}
:root{--font-noto-serif-kr:ReportSerif}*{box-sizing:border-box}body{margin:0;font-family:Pretendard,sans-serif}</style></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`,
);
await writeFile(
  resolve(output, "entry.tsx"),
  `import React from "react"; import {createRoot} from "react-dom/client"; import {ExamReportHifi} from ${JSON.stringify(`${root}/src/app/dev/exam-report-hifi/ExamReportHifi.tsx`)}; createRoot(document.getElementById("root")!).render(<ExamReportHifi/>);`,
);
const server = await createServer({
  configFile: false,
  root: output,
  cacheDir: resolve(output, "vite-cache"),
  plugins: [react()],
  resolve: { alias: { "@": resolve(root, "src") } },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [root] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const blocked = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.hostname !== "127.0.0.1" || url.pathname.startsWith("/api/")) {
    blocked.push(url.href);
    return route.abort();
  }
  return route.continue();
});
const measurements = [];
try {
  const address = server.httpServer.address();
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page
    .getByRole("heading", { name: "월말평가 성적표 · Hi-fi" })
    .waitFor();
  for (const variant of ["H1", "H2", "H3", "H4"]) {
    await page
      .getByRole("button", { name: new RegExp(`^${variant} ·`) })
      .click();
    for (const mode of ["S1", "C2"]) {
      await page
        .getByRole("button", { name: new RegExp(`^${mode} ·`) })
        .click();
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: resolve(output, `${variant}-${mode}-${width}.png`),
          fullPage: true,
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        measurements.push({ variant, mode, width, overflow });
        if (overflow > 1)
          throw new Error(`가로 넘침: ${variant}/${mode}/${width}`);
      }
      for (const scenario of mode === "S1"
        ? ["normal", "many", "zero", "perfect", "absent", "ungraded", "long"]
        : ["normal", "many", "long"]) {
        await page.getByLabel("예시 상황").selectOption(scenario);
        await page.emulateMedia({ media: "print" });
        const sheets = await page
          .locator('[data-print-page="true"]:visible')
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              width: node.clientWidth,
              height: node.clientHeight,
              scrollWidth: node.scrollWidth,
              scrollHeight: node.scrollHeight,
              minFont: Math.min(
                ...[...node.querySelectorAll("*")].map((child) =>
                  parseFloat(getComputedStyle(child).fontSize),
                ),
              ),
            })),
          );
        measurements.push({ variant, mode, scenario, sheets });
        if (
          sheets.some(
            (sheet) =>
              sheet.scrollHeight > sheet.height + 1 ||
              sheet.scrollWidth > sheet.width + 1 ||
              sheet.minFont < 12,
          )
        )
          throw new Error(
            `지면 넘침 또는 9pt 미만: ${variant}/${mode}/${scenario}`,
          );
        if (scenario === "normal")
          await page.pdf({
            path: resolve(output, `${variant}-${mode}.pdf`),
            preferCSSPageSize: true,
            printBackground: false,
          });
        await page.emulateMedia({ media: "screen" });
      }
      await page.getByLabel("예시 상황").selectOption("normal");
    }
  }
  // 공용 확대 창을 실제로 열고 Esc 초점 복귀까지 확인한다.
  const enlarge = page.getByRole("button", { name: "1쪽 확대" });
  await enlarge.click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  if (!(await enlarge.evaluate((node) => document.activeElement === node)))
    throw new Error("확대 창 초점 복귀 실패");
  if (errors.length || blocked.length)
    throw new Error(JSON.stringify({ errors, blocked }));
} finally {
  await writeFile(
    resolve(output, "measurements.json"),
    JSON.stringify({ measurements, errors, blocked }, null, 2),
  );
  await browser.close();
  await server.close();
}
process.stdout.write(`시안 ${measurements.length}조건 통과. ${output}\n`);
