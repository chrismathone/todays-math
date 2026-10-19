// DB·인증·외부 API 없이 동일 서버 HTML과 미리보기만 검사한다. PDF는 리드가 별도로 만든다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const root = process.cwd();
const htmlOnly = process.argv.includes("--html-only");
const previewOrigin = process.argv
  .find((arg) => arg.startsWith("--preview-origin="))
  ?.slice("--preview-origin=".length);
if (
  previewOrigin &&
  !["127.0.0.1", "localhost"].includes(new URL(previewOrigin).hostname)
)
  throw new Error("미리보기 서버는 로컬 주소만 사용합니다.");
const output = resolve(root, ".qa-artifacts/exam-report-styles");
await mkdir(output, { recursive: true });
const tokens = (
  await readFile(resolve(root, "src/app/globals.css"), "utf8")
).match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
if (!tokens) throw new Error("화면 토큰을 찾지 못했습니다.");
await writeFile(
  resolve(output, "index.html"),
  `<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}*{box-sizing:border-box}body{margin:0;font-family:Pretendard,sans-serif}:root{--font-pretendard:Pretendard}</style></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`,
);
await writeFile(
  resolve(output, "entry.tsx"),
  `import React from "react";import {createRoot} from "react-dom/client";import {ExamReportStyles} from ${JSON.stringify(`${root}/src/app/dev/exam-report-styles/ExamReportStyles.tsx`)};createRoot(document.getElementById("root")).render(<ExamReportStyles/>);`,
);
let currentDocument = "";
const server = await createServer({
  configFile: false,
  root: output,
  publicDir: resolve(root, "public"),
  cacheDir: resolve(output, "vite-cache"),
  plugins: [
    react(),
    {
      name: "qa-server-only",
      enforce: "pre",
      resolveId(id) {
        if (id === "server-only") return "\0qa-server-only";
      },
      load(id) {
        if (id === "\0qa-server-only") return "export {};";
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/__paper") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(currentDocument);
          } else next();
        });
      },
    },
  ],
  resolve: { alias: { "@": resolve(root, "src") } },
  ssr: { noExternal: ["server-only"] },
  server: {
    host: "127.0.0.1",
    port: 0,
    middlewareMode: htmlOnly,
    hmr: htmlOnly ? false : undefined,
    ws: htmlOnly ? false : undefined,
    fs: { allow: [root] },
  },
});
if (!htmlOnly) await server.listen();
const origin = htmlOnly
  ? ""
  : `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = htmlOnly ? null : await chromium.launch({ headless: true });
const errors = [];
const blocked = [];
const measurements = [];
const ui = [];
async function localOnly(context) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname.startsWith("/api/")
    ) {
      blocked.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
}
try {
  const { renderStyleCandidate } = await server.ssrLoadModule(
    resolve(root, "src/app/dev/exam-report-styles/renderStyleCandidate.ts"),
  );
  const { STYLE_CANDIDATES } = await server.ssrLoadModule(
    resolve(root, "src/app/dev/exam-report-styles/candidates.tsx"),
  );
  const { styleFixture, STYLE_SCENARIOS, PREVIEW_HEADER, PREVIEW_FOOTER } =
    await server.ssrLoadModule(
      resolve(root, "src/app/dev/exam-report-styles/fixtures.ts"),
    );
  const { REPORT_BLOCK_PRESETS } = await server.ssrLoadModule(
    resolve(root, "src/lib/examReport/blocks.ts"),
  );
  const paperContext = await browser?.newContext({
    javaScriptEnabled: false,
    viewport: { width: 850, height: 1200 },
  });
  if (paperContext) await localOnly(paperContext);
  const page = await paperContext?.newPage();
  page?.on("pageerror", (error) => errors.push(error.message));
  await page?.emulateMedia({ media: "print" });
  const quick = process.argv.includes("--quick");
  const cases = quick
    ? ["normal", "wrong16", "zero", "long", "gapHistory"]
    : Object.keys(STYLE_SCENARIOS);
  for (const { id } of STYLE_CANDIDATES) {
    for (const composition of quick
      ? ["summary"]
      : Object.keys(REPORT_BLOCK_PRESETS)) {
      for (const scenario of cases) {
        const { report, average } = styleFixture(scenario);
        const payload = await renderStyleCandidate(id, report, {
          blocks: REPORT_BLOCK_PRESETS[composition],
          header: PREVIEW_HEADER,
          footer: PREVIEW_FOOTER,
          average,
        });
        currentDocument = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}*{box-sizing:border-box}${payload.cssText}</style></head><body>${payload.html}</body></html>`;
        if (htmlOnly) {
          measurements.push({
            id,
            composition,
            scenario,
            htmlPages: (payload.html.match(/data-print-page=/g) ?? []).length,
          });
          if (scenario === "normal") {
            await writeFile(
              resolve(output, `${id}-${composition}.html`),
              currentDocument,
            );
            await writeFile(
              resolve(output, `${id}-${composition}.payload.json`),
              JSON.stringify(payload),
            );
          }
          continue;
        }
        await page.goto(`${origin}/__paper`);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await document.fonts.load('11pt "Noto Serif KR"');
          await document.fonts.load("10pt Pretendard");
        });
        const sheets = await page.locator(".sc-sheet").evaluateAll((nodes) =>
          nodes.map((node) => {
            const box = node.getBoundingClientRect();
            const end = node
              .querySelector(".sc-pageEnd")
              .getBoundingClientRect();
            const blocks = [
              ...node.querySelectorAll("[data-report-block]"),
            ].map((block) => ({
              id: block.dataset.reportBlock,
              bottom: +(block.getBoundingClientRect().bottom - box.top).toFixed(
                2,
              ),
              height: +block.getBoundingClientRect().height.toFixed(2),
            }));
            const textParents = [...node.querySelectorAll("*")].filter(
              (child) =>
                !child.closest(".katex") &&
                [...child.childNodes].some(
                  (text) => text.nodeType === 3 && text.textContent.trim(),
                ),
            );
            return {
              width: node.clientWidth,
              height: node.clientHeight,
              scrollWidth: node.scrollWidth,
              scrollHeight: node.scrollHeight,
              footerTop: +(end.top - box.top).toFixed(2),
              footerBottom: +(end.bottom - box.top).toFixed(2),
              minFont: Math.min(
                ...textParents.map((child) =>
                  parseFloat(getComputedStyle(child).fontSize),
                ),
              ),
              blocks,
            };
          }),
        );
        const fonts = await page.evaluate(() =>
          [...document.fonts]
            .filter((face) =>
              ["Noto Serif KR", "Pretendard"].includes(
                face.family.replaceAll('"', ""),
              ),
            )
            .map((face) => ({ family: face.family, status: face.status })),
        );
        const entry = { id, composition, scenario, fonts, sheets };
        measurements.push(entry);
        const failure = sheets.find(
          (sheet) =>
            sheet.scrollHeight > sheet.height + 1 ||
            sheet.scrollWidth > sheet.width + 1 ||
            sheet.footerBottom > sheet.height - 25 ||
            sheet.blocks.some((block) => block.bottom > sheet.footerTop + 1) ||
            sheet.minFont < 12,
        );
        if (
          fonts.length !== 2 ||
          fonts.some((font) => font.status !== "loaded") ||
          failure
        )
          throw new Error(
            `글꼴·지면 검사 실패: ${id}/${composition}/${scenario}\n${JSON.stringify(entry)}`,
          );
        if (scenario === "normal") {
          await writeFile(
            resolve(output, `${id}-${composition}.html`),
            currentDocument,
          );
          await page
            .locator(".sc-sheet")
            .first()
            .screenshot({ path: resolve(output, `${id}-${composition}.png`) });
        }
        if (measurements.length % 20 === 0)
          process.stdout.write(`지면 ${measurements.length}조건 통과\n`);
      }
    }
  }
  if (htmlOnly) {
    process.stdout.write(
      `서버 HTML ${measurements.length}조건 생성. 브라우저 실측은 하지 않았습니다. ${output}\n`,
    );
  } else {
    await paperContext.close();
    const uiContext = await browser.newContext();
    await localOnly(uiContext);
    const preview = await uiContext.newPage();
    preview.on("pageerror", (error) => errors.push(error.message));
    await preview.goto(
      previewOrigin
        ? new URL("/dev/exam-report-styles", previewOrigin).href
        : origin,
    );
    await preview
      .getByRole("heading", { name: "월말평가 성적표 · 지면 스타일" })
      .waitFor();
    for (const width of [1280, 390, 320]) {
      await preview.setViewportSize({ width, height: 900 });
      await preview.evaluate(() => document.fonts.ready);
      await preview.screenshot({
        path: resolve(output, `preview-${width}.png`),
        fullPage: true,
      });
      const overflow = await preview.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      ui.push({ width, overflow });
      if (overflow > 1) throw new Error(`미리보기 가로 넘침: ${width}`);
    }
    await preview
      .getByRole("button", { name: "요약 한 장", exact: true })
      .click();
    if (
      await preview
        .getByRole("button", { name: "풀이 포함", exact: true })
        .count()
    )
      throw new Error("풀이 구성 선택지가 남았습니다.");
    await preview.getByLabel("예시 상황").selectOption("wrong16");
    if (
      await preview
        .locator("[data-solution-no], [data-report-question]")
        .count()
    )
      throw new Error("성적표에 풀이가 남았습니다.");
    await preview.getByLabel("월말평가 추이", { exact: true }).uncheck();
    if (await preview.locator("[data-exam-report-trend]").count())
      throw new Error("추이 선택 해제 실패");
    await preview.getByRole("button", { name: "숫자만", exact: true }).click();
    if (await preview.locator('[data-report-block="wrongTable"]').count())
      throw new Error("구성 선택 실패");
    const enlarge = preview.getByRole("button", {
      name: "시험지 얼굴 1쪽 확대",
      exact: true,
    });
    await enlarge.click();
    await preview.getByRole("dialog").waitFor();
    await preview.keyboard.press("Escape");
    if (!(await enlarge.evaluate((node) => document.activeElement === node)))
      throw new Error("확대 창 초점 복귀 실패");
    if (errors.length || blocked.length)
      throw new Error(JSON.stringify({ errors, blocked }));
  }
} finally {
  await writeFile(
    resolve(output, htmlOnly ? "html-generation.json" : "measurements.json"),
    JSON.stringify(
      {
        mode: htmlOnly ? "html-only" : "browser",
        previewOrigin: previewOrigin ?? origin,
        measurements,
        ui,
        errors,
        blocked,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await server.close();
}
if (!htmlOnly)
  process.stdout.write(
    `서버 지면 ${measurements.length}조건 · 화면 ${ui.length}폭 통과. ${output}\n`,
  );
