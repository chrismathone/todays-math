/** Browser verification of the production MathExamBuilder with synthetic questions.
 * node scripts/qa/measure-builder-review-sort.mjs — no server or database.
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
const temp = await mkdtemp(path.join(os.tmpdir(), "builder-review-sort-"));
const out = path.join(
  root,
  "docs/planning/tracks/reports/builder-review-sort-codex-20261024",
);
await mkdir(out, { recursive: true });
const entry = "virtual:builder-review-sort";
const fixture = `
import ${JSON.stringify(require.resolve("katex/dist/katex.min.css"))};
import React, {useState} from ${JSON.stringify(require.resolve("react"))};
import {createRoot} from ${JSON.stringify(require.resolve("react-dom/client"))};
import MathExamBuilder from ${JSON.stringify(path.join(root, "src/components/exam-builder/MathExamBuilder.tsx"))};
import {DIFFICULTY_LADDER} from ${JSON.stringify(path.join(root, "src/contracts/difficulty.ts"))};
const units=Array.from({length:24},(_,i)=>({id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),grade:'초3',chapter:'평면도형',section:'도형 알아보기 '+(i+1),orderIndex:i}));
const questions=Array.from({length:40},(_,i)=>({id:'question-'+i,questionId:'qa-'+i,unitId:units[(39-i)%4].id,grade:'초3',chapter:'평면도형',section:units[(39-i)%4].section,content:(i+1)+'번. 다음 식을 계산하세요.\\n\\n$'+(i+12)+' + '+(i+3)+' = ?$\\n\\n계산 과정을 쓰고 답을 확인하세요.',answer:String(i*2+15),solution:'두 수를 자릿수에 맞추어 더합니다.',difficulty:DIFFICULTY_LADDER[i%6],questionType:['short-answer','multiple-choice','descriptive'][i%3],questionFormats:[{problemId:'question-'+i,format:['short_answer','multiple_choice','descriptive'][i%3],revision:'qa',state:'available',reasonCode:null}],source:'manual',eligible:true,figureUrls:[],figureSvg:null}));
const initialData={problems:[],total:0,page:1,pageSize:12,grades:[],chapters:[],units,countUnit:'question',unitCounts:{}};
globalThis.__qaRequests=[];
let pending=[];
globalThis.__releaseCounts=()=>{const batch=pending;pending=[];batch.forEach(done=>done());};
globalThis.fetch=async (url,init={})=>{
 const text=String(url);const params=init.body?new URLSearchParams(JSON.parse(String(init.body))):new URL(text,'http://fixture').searchParams;
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
 const [scene,setScene]=useState('review');const [key,setKey]=useState(0);const [items,setItems]=useState(questions);const [title,setTitle]=useState('3학년 평면도형 확인');globalThis.__selected=items;
 globalThis.__setScene=next=>{setScene(next);setItems(next==='scope'?[]:questions);setKey(k=>k+1);};
 return <MathExamBuilder key={key} initialData={initialData} initialStep={scene==='scope'?'scope':'review'} canOutput onQuestionsChange={setItems} editor={{selected:items,title,setTitle,printMeta:{},navigate:()=>{},toggle:()=>{},reorder:setItems}}/>;
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
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}
@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font});font-weight:100 900}*{box-sizing:border-box}html,body{margin:0}body{font-family:Pretendard,sans-serif;font-size:14px;line-height:1.5;background:var(--learn-bg);--workspace-sticky-inset:68px}button,input,select{font:inherit}.shellbar{position:fixed;z-index:30;top:0;left:240px;right:0;height:52px;padding:14px 20px;background:var(--learn-surface);border-bottom:1px solid var(--learn-track)}.sidebar{position:fixed;inset:0 auto 0 0;width:240px;padding:24px;color:var(--learn-on-nav);background:var(--learn-nav)}main{margin-left:240px;padding:84px 20px 20px;min-width:0}@media(max-width:1050px) and (min-width:761px){.sidebar{width:212px}.shellbar{left:212px}main{margin-left:212px}}@media(max-width:760px){.sidebar{display:none}.shellbar{left:0}main{margin-left:0;padding:82px 16px 16px}}
${css}</style><aside class="sidebar">오늘의수학</aside><header class="shellbar">시험지 만들기 · 화면 검증</header><main id="root"></main><script>${js.replace(/<\/script/gi, "<\\/script")}</script></html>`;
const htmlPath = path.join(temp, "probe.html");
await writeFile(htmlPath, html);

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
  ],
});

const measurements = [];
const errors = [];
try {
  for (const width of [1920, 1280, 1050, 768, 760, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (error) =>
      errors.push({ width, error: String(error) }),
    );
    await page.goto(pathToFileURL(htmlPath).href);
    await page.getByLabel("문항 정렬", { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const initial = await page.evaluate(() =>
      globalThis.__selected.map((q) => q.id),
    );
    const sort = page.getByLabel("문항 정렬", { exact: true });
    await sort.scrollIntoViewIfNeeded();
    const bounds = await sort.boundingBox();
    assert.ok(bounds && bounds.height >= 44, { width, bounds });
    const apply = page.getByRole("button", { name: "정렬", exact: true });
    const tests = [];
    for (const criterion of [
      "difficulty-asc",
      "difficulty-desc",
      "multiple-choice-first",
      "subjective-first",
      "scope",
    ]) {
      await sort.selectOption(criterion);
      await apply.click();
      const rows = await page.evaluate(() =>
        globalThis.__selected.map((q) => ({
          id: q.id,
          difficulty: q.difficulty,
          format: q.questionType,
          unit: q.unitId,
        })),
      );
      assert.equal(rows.length, 40);
      assert.deepEqual([...rows.map((q) => q.id)].sort(), [...initial].sort());
      const ladder = ["연산", "기본", "응용", "심화하", "심화중", "심화상"];
      const rank = (q) =>
        criterion === "scope"
          ? Number(q.unit.slice(-12))
          : criterion.includes("difficulty")
            ? ladder.indexOf(q.difficulty) *
              (criterion.endsWith("desc") ? -1 : 1)
            : (q.format === "multiple-choice" ? 0 : 1) *
              (criterion === "subjective-first" ? -1 : 1);
      for (let i = 1; i < rows.length; i++)
        assert.ok(rank(rows[i - 1]) <= rank(rows[i]), { width, criterion, i });
      assert.equal(
        await page
          .getByRole("navigation", { name: "순서표 쪽 이동" })
          .getByRole("button", { name: "이전" })
          .isDisabled(),
        true,
      );
      tests.push(criterion);
    }
    const order = await page.evaluate(() =>
      globalThis.__selected.map((q) => q.id),
    );
    await page.getByRole("button", { name: "↶ 되돌리기" }).click();
    assert.notDeepEqual(
      await page.evaluate(() => globalThis.__selected.map((q) => q.id)),
      order,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, { width });
    const buttonBounds = await apply.boundingBox();
    assert.ok(buttonBounds && buttonBounds.height >= 44);
    await sort.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(out, `review-sort-${width}.png`),
      fullPage: width <= 900,
    });
    measurements.push({
      width,
      sortHeight: bounds.height,
      buttonHeight: buttonBounds.height,
      overflow,
      tests,
    });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(out, "measurements.json"),
    JSON.stringify(
      {
        measurements,
        errors,
        scope:
          "Real MathExamBuilder components with synthetic data; no database, authenticated session, or export network calls.",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        passedWidths: measurements.length,
        sortAssertions: measurements.length * 5,
        errors,
        out,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
