/** Real Chromium regression probe; synthetic bank and the actual output editor.
 * node scripts/qa/measure-builder-layout.mjs
 * Builds a standalone local fixture; no Next server or DB is required.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { build } from "vite";

const require = createRequire(import.meta.url);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const temp = await mkdtemp(path.join(os.tmpdir(), "builder-h2-polish-"));
const out = path.join(
  root,
  "docs/planning/tracks/reports/builder-layout-codex-20261020",
);
await mkdir(out, { recursive: true });
const entry = "virtual:builder-h2-polish";
const fixture = `
import ${JSON.stringify(require.resolve("katex/dist/katex.min.css"))};
import React, {useState} from ${JSON.stringify(require.resolve("react"))};
import {createRoot} from ${JSON.stringify(require.resolve("react-dom/client"))};
import MathExamBuilder from ${JSON.stringify(path.join(root, "src/components/exam-builder/MathExamBuilder.tsx"))};
import {DIFFICULTY_LADDER} from ${JSON.stringify(path.join(root, "src/contracts/difficulty.ts"))};
const units=Array.from({length:24},(_,i)=>({id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),grade:'초3',chapter:'평면도형',section:'도형 알아보기 '+(i+1),orderIndex:i}));
const questions=Array.from({length:40},(_,i)=>({id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),questionId:'qa-'+i,unitId:units[0].id,grade:'초3',chapter:'평면도형',section:units[0].section,content:(i+1)+'번. 다음 식을 계산하세요.\\n\\n$'+(i+12)+' + '+(i+3)+' = ?$\\n\\n계산 과정을 쓰고 답을 확인하세요.',answer:String(i*2+15),solution:'두 수를 자릿수에 맞추어 더합니다.',difficulty:DIFFICULTY_LADDER[i%6],questionType:'short-answer',questionFormats:[{problemId:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),format:'short_answer',revision:'qa',state:'available',reasonCode:null},{problemId:'other-'+i,format:'multiple_choice',revision:'qa',state:'available',reasonCode:null}],source:'manual',eligible:true,figureUrls:[],figureSvg:null}));
const initialData={problems:[],total:0,page:1,pageSize:12,grades:[],chapters:[],units,countUnit:'question',unitCounts:{}};
globalThis.__qaRequests=[];
let pending=[];
globalThis.__releaseCounts=()=>{const batch=pending;pending=[];batch.forEach(done=>done());};
globalThis.fetch=async (url,init={})=>{
 const text=String(url); if(text.endsWith('/check'))return Response.json({items:questions.map(q=>({id:q.id,state:'eligible',code:null,reason:null,reviewStatus:null,unitId:q.unitId,source:q.source})),counts:{requested:40,eligible:40,ineligible:0,missing:0}});const params=init.body?new URLSearchParams(JSON.parse(String(init.body))):new URL(text,'http://fixture').searchParams;
 if(text.includes('exam-conditions'))return Response.json({data:[],meta:{limit:50}});
 if(params.get('view')==='curriculum'){
  const grade=params.get('grade');const chapter=params.get('chapter');
  const ids=params.get('unitIds')?.split(',');
  return Response.json({view:'curriculum',grades:!grade&&!ids?['초3','초4','초5','초6','중1','중2','중3','공통수학1','공통수학2','대수','미적분Ⅰ','확률과 통계']:[],chapters:grade&&!chapter?['평면도형']:[],units:chapter||ids?units.filter(u=>!ids||ids.includes(u.id)):[]});
 }
 if(params.get('view')==='scope-counts'){
  const ids=params.get('unitIds').split(',');globalThis.__qaRequests.push({ids,recent:params.get('recent')});
  return new Promise((resolve,reject)=>{
   pending.push(()=>resolve(Response.json({view:'scope-counts',version:2,countUnit:'question',queryKey:'qa',unitCounts:Object.fromEntries(ids.map(id=>[id,48])),unitFamilies:Object.fromEntries(ids.map(id=>[id,24]))})));
   init.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));
  });
 }
 throw new Error('Unexpected synthetic request: '+text);
};
function App(){
 const [scene,setScene]=useState('scope');const [key,setKey]=useState(0);const [items,setItems]=useState([]);const [title,setTitle]=useState('3학년 평면도형 확인');
 globalThis.__setScene=next=>{setScene(next);setItems(next==='scope'?[]:questions);setKey(k=>k+1);};
 return <MathExamBuilder key={key} initialData={initialData} initialStep={scene} canOutput onQuestionsChange={setItems} editor={{selected:items,title,setTitle,columns:2,answers:false,savedAt:"",setColumns:()=>{},setAnswers:()=>{},save:()=>{},restore:()=>{},download:()=>{},move:()=>{},printMeta:{},navigate:()=>{},toggle:()=>{},reorder:setItems}}/>;
}
createRoot(document.getElementById('root')).render(<App/>);`;
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
      name: "isolated-product-probe",
      resolveId(id) {
        if (id === entry) return "\0" + entry + ".jsx";
        if (id === "next/dynamic") return "\0probe-output";
        if (/^(?:@prisma|server-only|node:)/.test(id))
          throw new Error(`Server import forbidden: ${id}`);
      },
      load(id) {
        if (id === "\0" + entry + ".jsx") return fixture;
        if (id === "\0probe-output")
          return `import Editor from ${JSON.stringify(path.join(root, "src/components/unified/WorksheetEditor.tsx"))}; export default function dynamic(){return Editor}`;
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
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}
@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font});font-weight:100 900}*{box-sizing:border-box}html,body{margin:0}body{font-family:Pretendard,sans-serif;font-size:14px;line-height:1.5;background:var(--learn-bg);--workspace-sticky-inset:68px}button,input,select{font:inherit}.shellbar{position:fixed;z-index:30;top:0;left:240px;right:0;height:52px;padding:14px 20px;background:var(--learn-surface);border-bottom:1px solid var(--learn-track)}.sidebar{position:fixed;inset:0 auto 0 0;width:240px;padding:24px;color:var(--learn-on-nav);background:var(--learn-nav)}#root{margin-left:240px;padding:84px 20px 20px;min-width:0}@media(max-width:1050px) and (min-width:761px){.sidebar{width:212px}.shellbar{left:212px}#root{margin-left:212px}}@media(max-width:760px){.sidebar{display:none}.shellbar{left:0}#root{margin-left:0;padding:82px 16px 16px}}
${css}</style><aside class="sidebar">오늘의수학</aside><header class="shellbar">시험지 만들기 · 화면 검증</header><main id="root"></main><script>${js.replace(/<\/script/gi, "<\\/script")}</script></html>`;
const htmlPath = path.join(temp, "probe.html");
await writeFile(htmlPath, html);

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

const measurements = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(htmlPath).href);
  for (const [width, height] of [
    [1280, 720],
    [1366, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const stage of ["review", "output"]) {
      await page.evaluate((stage) => globalThis.__setScene(stage), stage);
      const frame = page.locator(
        stage === "review" ? "[data-review-layout]" : "[data-output-layout]",
      );
      await frame.waitFor().catch(async (e) => {
        console.log(await page.locator("body").innerText());
        throw e;
      });
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, 0));
      const metric = await frame.evaluate((e) => ({
        top: e.getBoundingClientRect().top,
        columns: [...e.children].map((c) => {
          const r = c.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            height: r.height,
            scrollHeight: c.scrollHeight,
            clientHeight: c.clientHeight,
            overflow: getComputedStyle(c).overflow,
          };
        }),
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        pageScroll: document.documentElement.scrollHeight - innerHeight,
      }));
      if (stage === "output") {
        assert.ok(
          Math.abs(metric.columns[0].bottom - metric.columns[1].bottom) <= 2,
          JSON.stringify(metric),
        );
        assert.equal(metric.pageScroll, 0);
      }
      assert.equal(metric.horizontalOverflow, 0);
      await page.screenshot({
        path: path.join(out, `${width}x${height}-${stage}.png`),
      });
      if (stage === "review") {
        const left = frame.locator(":scope > :first-child");
        await left.evaluate((e) => (e.scrollTop = e.scrollHeight));
        for (const name of ["이전: 범위 설정", "다음: 양식 구성·출력"]) {
          const button = page.getByRole("button", { name, exact: true });
          assert.equal(await button.count(), 1);
          const bounds = await button.boundingBox();
          assert.ok(
            bounds.y >= metric.top &&
              bounds.y + bounds.height <= metric.columns[0].bottom,
          );
        }
        metric.leftScrolled = await left.evaluate((e) => ({
          scrollTop: e.scrollTop,
          bottom: e.getBoundingClientRect().bottom,
        }));
        await page.screenshot({
          path: path.join(out, `${width}x${height}-review-actions.png`),
        });
      } else {
        const nestedScrolls = () =>
          frame
            .locator(":scope > :first-child")
            .evaluate(
              (e) =>
                [...e.querySelectorAll("*")].filter(
                  (n) =>
                    /auto|scroll/.test(getComputedStyle(n).overflowY) &&
                    n.scrollHeight > n.clientHeight + 1,
                ).length,
            );
        assert.equal(await nestedScrolls(), 0);
        await page.getByRole("tab", { name: /문제 순서/ }).click();
        assert.equal(await nestedScrolls(), 0);
        await page.screenshot({
          path: path.join(out, `${width}x${height}-output-order.png`),
        });
        await page.setViewportSize({ width, height: height - 40 });
        await page.waitForTimeout(200);
        metric.resized = await frame.evaluate((e) => ({
          bottoms: [...e.children].map((c) => c.getBoundingClientRect().bottom),
          pageScroll: document.documentElement.scrollHeight - innerHeight,
        }));
        assert.ok(
          Math.abs(metric.resized.bottoms[0] - metric.resized.bottoms[1]) <= 2,
        );
        assert.equal(metric.resized.pageScroll, 0);
        assert.equal(metric.resized.bottoms[0], metric.columns[0].bottom - 40);
        await page.setViewportSize({ width, height });
      }
      measurements.push({ width, height, stage, ...metric });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify({ measurements, errors }, null, 2),
  );
  console.log(JSON.stringify({ out, measurements, errors }, null, 2));
} finally {
  await browser.close();
}
