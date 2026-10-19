// 로컬 파일 하나에 시안·공용 CSS·자체 글꼴을 묶는다. 서버·DB·외부 요청 없음.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const root = process.cwd();
const output = resolve(root, ".qa-artifacts/exam-report-screen-hifi");
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
      entry: resolve(root, "scripts/qa/exam-report-screen-hifi-fixture.tsx"),
      name: "ExamReportScreenFixture",
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
  throw new Error("시안·CSS·토큰 묶음을 확인하지 못했습니다.");
await writeFile(
  resolve(output, "index.html"),
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'"><title>성적표 화면 Hi-fi · 로컬 검증</title><style>${tokens}\n:root{--font-pretendard:Pretendard}*{box-sizing:border-box}body{margin:0;font-family:Pretendard,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}fieldset{min-width:0}${css}</style></head><body><div id="root"></div><script>${javascript.replaceAll("</script", "<\\/script")}</script></body></html>`,
);
process.stdout.write(`로컬 검증 파일: ${output}/index.html\n`);
