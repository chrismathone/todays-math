/** DB·환경 파일·외부 요청 없는 실제 부품 검증. --measure만 로컬 Chromium을 실행한다. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const root = process.cwd();
const output = resolve(root, ".qa-artifacts/exam-report-screen-impl");
await mkdir(output, { recursive: true });
const fonts = await Promise.all(
  ["PretendardVariable.woff2", "NotoSerifKR-subset.woff2"].map(async (name) => [
    name,
    `data:font/woff2;base64,${(await readFile(resolve(root, "public/fonts", name))).toString("base64")}`,
  ]),
);
const result = await build({
  configFile: false,
  envDir: false,
  publicDir: false,
  plugins: [
    react(),
    {
      name: "local-report-fonts",
      transform(code, id) {
        if (!id.endsWith("/exam-report/paperStyles.ts")) return;
        for (const [name, url] of fonts)
          code = code.replaceAll(`/fonts/${name}`, url);
        return code;
      },
    },
  ],
  resolve: { alias: { "@": resolve(root, "src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  css: { postcss: { plugins: [] } },
  build: {
    write: false,
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(root, "scripts/qa/exam-report-screen-impl-fixture.tsx"),
      name: "ExamReportImplFixture",
      formats: ["iife"],
    },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap(
  (item) => item.output,
);
const javascript = outputs
  .filter((item) => item.type === "chunk")
  .map((item) => item.code)
  .join("\n");
const css = outputs
  .filter((item) => item.type === "asset" && item.fileName.endsWith(".css"))
  .map((item) => item.source)
  .join("\n");
const tokens = (
  await readFile(resolve(root, "src/app/globals.css"), "utf8")
).match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
if (!tokens || !javascript || !css)
  throw new Error("실제 화면·CSS 묶음을 확인하지 못했습니다.");
const htmlPath = resolve(output, "index.html");
await writeFile(
  htmlPath,
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'"><title>실제 성적표 · 로컬 검증</title><style>${tokens}\n:root{--font-pretendard:Pretendard}*{box-sizing:border-box}body{margin:0;font-family:Pretendard,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}fieldset{min-width:0}${css}</style></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"production"}}</script><script>${javascript.replaceAll("</script", "<\\/script")}</script></body></html>`,
);
process.stdout.write(`로컬 검증 파일: ${htmlPath}\n`);
if (process.argv.includes("--measure")) {
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      void (/^(file:|data:|about:)/.test(request.url())
        ? request.continue()
        : request.abort());
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(pathToFileURL(htmlPath).href);
    await page.waitForSelector("textarea");
    const screens = [];
    for (const [width, height] of [
      [1200, 820],
      [1040, 760],
      [768, 900],
      [390, 844],
    ]) {
      await page.setViewport({ width: Math.max(width, 400), height });
      screens.push({
        ...(await page.evaluate(
          (value) => window.examReportQA.screenAt(value),
          width,
        )),
        height,
      });
      await page.screenshot({
        path: resolve(output, `screen-${width}.png`),
        fullPage: true,
      });
    }
    const paper = await page.evaluate(() => window.examReportQA.measurePaper());
    await writeFile(
      resolve(output, "measurements.json"),
      JSON.stringify(
        { browser: await browser.version(), errors, screens, paper },
        null,
        2,
      ),
    );
    process.stdout.write(`실측 결과: ${output}/measurements.json\n`);
    if (
      errors.length ||
      !paper.allBaselinesFit ||
      screens.some((row) => row.scrollWidth > row.width + 1) ||
      screens.find((row) => row.width === 1040)?.sideBySide !== true ||
      screens.find((row) => row.width === 1040).confirmBottomFromScreenTop > 760
    )
      process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
