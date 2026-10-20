/** Actual MathExamBuilder + deterministic API fixture, no live DB or writes.
 * Run once to build, then with --capture after the build process has exited.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

function memoryGate(stage) {
  const free = Number(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB",
      ],
      { encoding: "utf8" },
    ).trim(),
  );
  assert.ok(
    free >= 3,
    `${stage}: requires 3GB free, found ${free.toFixed(2)}GB`,
  );
  console.log(`${stage}: ${free.toFixed(2)}GB free`);
}
const require = createRequire(import.meta.url);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const captureOnly = process.argv.includes("--capture");
const pointer = path.join(os.tmpdir(), "scope-availability-fixture.json");
const temp = captureOnly
  ? JSON.parse(await readFile(pointer, "utf8")).temp
  : await mkdtemp(path.join(os.tmpdir(), "scope-availability-"));
const out = path.join(
  root,
  "docs/planning/tracks/reports/scope-availability-20261020",
);
await mkdir(out, { recursive: true });
const entry = "virtual:scope-availability";
const fixture = `
import React,{useState} from ${JSON.stringify(require.resolve("react"))};
import {createRoot} from ${JSON.stringify(require.resolve("react-dom/client"))};
import MathExamBuilder from ${JSON.stringify(path.join(root, "src/components/exam-builder/MathExamBuilder.tsx"))};
const grades=['초1','초2','초3','초4','초5','초6','중1','중2','중3','공통수학1','공통수학2','대수','미적분Ⅰ','미적분Ⅱ','확률과 통계'];
const meta={version:2,countUnit:'question',queryKey:'scope-qa'};
globalThis.__requests=[];
globalThis.fetch=async(url,init={})=>{
 const text=String(url),p=init.body?new URLSearchParams(JSON.parse(String(init.body))):new URL(text,'http://fixture').searchParams;
 globalThis.__requests.push(Object.fromEntries(p));
 if(text.includes('exam-conditions'))return Response.json({data:[],meta:{limit:50}});
 if(p.get('view')==='picker-groups')return Response.json({view:'picker-groups',...meta,sources:{total:300,engine:200,school_textbook:100,past_exam:0,other:0}});
 if(p.get('view')==='picker-books')return Response.json({view:'picker-books',...meta,grades:['초3'],kinds:[],books:[]});
 if(p.get('view')==='curriculum'){
  const grade=p.get('grade'),book=p.get('sourceGroup')==='school_textbook';
  return Response.json({view:'curriculum',grades:grade?[]:grades,chapters:grade?['평면도형']:[],units:[],...(p.has('availability')?{gradeCounts:Object.fromEntries(grades.map(g=>[g,book&&!['초3','초4','초5','초6'].includes(g)?0:20])),chapterCounts:{평면도형:20}}:{})});
 }
 throw new Error('Unexpected fixture request '+text);
};
const data={problems:[],total:0,page:1,pageSize:12,grades:[],chapters:[],units:[],unitCounts:{},countUnit:'question'};
function App(){const [items,setItems]=useState([]),[title,setTitle]=useState('시험지');return <MathExamBuilder initialData={data} canOutput onQuestionsChange={setItems} editor={{selected:items,title,setTitle,columns:2,answers:false,savedAt:'',setColumns:()=>{},setAnswers:()=>{},save:()=>{},restore:()=>{},download:()=>{},move:()=>{},printMeta:{},navigate:()=>{},toggle:()=>{},reorder:setItems}}/>}
createRoot(document.getElementById('root')).render(<App/>);`;
const htmlPath = path.join(temp, "fixture.html");
if (!captureOnly) {
  memoryGate("Vite");
  const { build } = await import("vite");
  const result = await build({
    configFile: false,
    envDir: false,
    publicDir: false,
    root: temp,
    cacheDir: path.join(temp, "vite-cache"),
    logLevel: "error",
    resolve: { alias: { "@": path.join(root, "src") } },
    css: { postcss: { plugins: [] } },
    plugins: [
      {
        name: "scope-fixture",
        resolveId(id) {
          if (id === entry) return "\0scope-fixture.jsx";
          if (id === "next/dynamic") return "\0scope-output";
          if (/^(?:@prisma|server-only|node:)/.test(id))
            throw new Error(`Server dependency forbidden: ${id}`);
        },
        load(id) {
          if (id === "\0scope-fixture.jsx") return fixture;
          if (id === "\0scope-output")
            return "export default function dynamic(){return function Output(){return null}}";
        },
      },
    ],
    build: {
      write: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      rollupOptions: { input: entry, output: { format: "iife" } },
    },
  });
  const assets = (Array.isArray(result) ? result : [result]).flatMap(
    (r) => r.output ?? [],
  );
  const js = assets
    .filter((r) => r.type === "chunk")
    .map((r) => r.code)
    .join("\n");
  const css = assets
    .filter((r) => r.type === "asset" && r.fileName.endsWith(".css"))
    .map((r) => String(r.source))
    .join("\n");
  const tokens = (
    await readFile(path.join(root, "src/app/globals.css"), "utf8")
  ).match(/:root\s*\{[^}]*\}/)[0];
  const font = (
    await readFile(path.join(root, "public/fonts/PretendardVariable.woff2"))
  ).toString("base64");
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${tokens}
@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font});font-weight:100 900}*{box-sizing:border-box}body{margin:0;font:14px/1.5 Pretendard,sans-serif;background:var(--learn-bg);--workspace-sticky-inset:68px}button,input,select{font:inherit}.sidebar{position:fixed;inset:0 auto 0 0;width:240px;padding:24px;background:var(--learn-nav);color:var(--learn-on-nav)}.shellbar{position:fixed;z-index:30;top:0;left:240px;right:0;height:52px;padding:14px 20px;background:var(--learn-surface)}#root{margin-left:240px;padding:84px 20px 20px}${css}</style><aside class="sidebar">오늘의수학</aside><header class="shellbar">시험지 만들기 · 예시 자료 검증</header><main id="root"></main><script>${js.replace(/<\/script/gi, "<\\/script")}</script></html>`;
  await writeFile(htmlPath, html);
  await writeFile(pointer, JSON.stringify({ temp }));
  console.log(
    "Fixture built. Run this script with --capture after this process exits.",
  );
  process.exit(0);
}
const { chromium } = await import("@playwright/test");
memoryGate("Chromium");
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(htmlPath).href);
  await page.getByRole("button", { name: "초1", exact: true }).waitFor();
  await page.getByRole("button", { name: "교과서만", exact: true }).click();
  const empty = page.getByRole("button", {
    name: "초1 · 출제 가능 문항 없음",
    exact: true,
  });
  await empty.waitFor();
  assert.equal(await empty.isDisabled(), true);
  assert.equal(
    await page.getByRole("button", { name: "초3", exact: true }).isEnabled(),
    true,
  );
  const cursor = await empty.evaluate((el) => getComputedStyle(el).cursor);
  assert.notEqual(cursor, "pointer");
  await page.screenshot({
    path: path.join(out, "1366-textbooks-grades.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "전체", exact: true }).click();
  const restored = page.getByRole("button", { name: "초1", exact: true });
  await restored.waitFor();
  assert.equal(await restored.isEnabled(), true);
  assert.deepEqual(errors, []);
  const requests = await page.evaluate(() => globalThis.__requests);
  await writeFile(
    path.join(out, "browser-checks.json"),
    JSON.stringify(
      {
        viewport: { width: 1366, height: 900 },
        emptyGradeDisabled: true,
        availableGradeEnabled: true,
        allSourcesReenabled: true,
        disabledCursor: cursor,
        pageErrors: errors,
        requests,
      },
      null,
      2,
    ),
  );
  console.log("PASS: disabled grade, cursor, source reload, zero page errors");
} finally {
  await browser.close();
}
