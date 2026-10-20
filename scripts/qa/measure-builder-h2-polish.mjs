/** Real Chrome regression probe; synthetic bank, no DB or network.
 * node scripts/qa/measure-builder-h2-polish.mjs
 * The existing Next dev server on 3010 is left running.
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
  "docs/planning/tracks/reports/builder-h2-polish-codex-20261020",
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
const questions=Array.from({length:40},(_,i)=>({id:'question-'+i,questionId:'qa-'+i,unitId:units[0].id,grade:'초3',chapter:'평면도형',section:units[0].section,content:(i+1)+'번. 다음 식을 계산하세요.\\n\\n$'+(i+12)+' + '+(i+3)+' = ?$\\n\\n계산 과정을 쓰고 답을 확인하세요.',answer:String(i*2+15),solution:'두 수를 자릿수에 맞추어 더합니다.',difficulty:DIFFICULTY_LADDER[i%6],questionType:'short-answer',questionFormats:[{problemId:'question-'+i,format:'short_answer',revision:'qa',state:'available',reasonCode:null},{problemId:'other-'+i,format:'multiple_choice',revision:'qa',state:'available',reasonCode:null}],source:'manual',eligible:true,figureUrls:[],figureSvg:null}));
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
 const [scene,setScene]=useState('scope');const [key,setKey]=useState(0);const [items,setItems]=useState([]);const [title,setTitle]=useState('3학년 평면도형 확인');
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
const external = [];
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
}
async function release(page) {
  await page.evaluate(() => globalThis.__releaseCounts());
  await settle(page);
}
async function shot(page, name) {
  await settle(page);
  await page.screenshot({
    path: path.join(out, `${name}.png`),
    fullPage: false,
  });
}
async function geometry(page, stage) {
  return page.evaluate((stage) => {
    const frame = document.querySelector(
      stage === "scope" ? "[data-scope-layout]" : "[data-review-layout]",
    );
    const band = document
      .querySelector("[data-studio-band]")
      .getBoundingClientRect();
    return {
      stage,
      viewport: innerWidth,
      rootWidth: document.querySelector("[data-exam-builder]").clientWidth,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      bandBottom: band.bottom,
      columns: [...frame.children].map((e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return {
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          position: s.position,
          overflow: s.overflowY,
          maxHeight: s.maxHeight,
          scrollHeight: e.scrollHeight,
          clientHeight: e.clientHeight,
          scrollTop: e.scrollTop,
          horizontalOverflow: Math.max(0, e.scrollWidth - e.clientWidth),
        };
      }),
    };
  }, stage);
}
async function checkScroll(page, width, stage) {
  await page
    .locator(
      stage === "scope"
        ? "[data-scope-layout] > *"
        : "[data-review-layout] > *",
    )
    .evaluateAll((nodes) => nodes.forEach((e) => (e.scrollTop = 0)));
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  const before = await geometry(page, stage);
  assert.equal(before.overflow, 0, `${width}/${stage}: horizontal overflow`);
  before.columns.forEach((col) =>
    assert.equal(
      col.horizontalOverflow,
      0,
      `${width}/${stage}: column horizontal overflow`,
    ),
  );
  const wide = before.rootWidth > 900;
  const columns = page.locator(
    stage === "scope" ? "[data-scope-layout] > *" : "[data-review-layout] > *",
  );
  if (wide) {
    for (const col of before.columns) {
      assert.equal(col.position, "sticky");
      assert.equal(col.overflow, "auto");
      assert.ok(
        col.top >= before.bandBottom,
        `${width}/${stage}: column hidden by step band`,
      );
      assert.ok(
        col.bottom <= (await page.viewportSize()).height,
        `${width}/${stage}: column exceeds viewport`,
      );
      assert.ok(
        col.scrollHeight > col.clientHeight,
        `${width}/${stage}: fixture must exercise scrolling`,
      );
    }
    await columns.nth(0).hover();
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(200);
    await page.waitForFunction(
      (sel) => document.querySelector(sel).scrollTop > 0,
      stage === "scope"
        ? "[data-scope-layout] > :first-child"
        : "[data-review-layout] > :first-child",
    );
    const left = await geometry(page, stage);
    assert.equal(left.columns[1].scrollTop, 0, "left wheel moved right column");
    await columns.nth(1).hover();
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(200);
    await page.waitForFunction(
      (sel) => document.querySelector(sel).scrollTop > 0,
      stage === "scope"
        ? "[data-scope-layout] > :last-child"
        : "[data-review-layout] > :last-child",
    );
    const both = await geometry(page, stage);
    assert.equal(
      both.columns[0].scrollTop,
      left.columns[0].scrollTop,
      "right wheel moved left column",
    );
    await shot(page, `${width}-${stage}-scrolled`);
    await columns.evaluateAll((nodes) =>
      nodes.forEach((e) => (e.scrollTop = 0)),
    );
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await settle(page);
    const sticky = await geometry(page, stage);
    for (const col of sticky.columns)
      assert.ok(
        col.top >= sticky.bandBottom - 1,
        `${width}/${stage}: sticky column overlaps band after page scroll`,
      );
    measurements.push({
      width,
      ...before,
      independentScroll: true,
      afterPageScroll: sticky,
    });
  } else {
    for (const col of before.columns) {
      assert.equal(col.position, "static");
      assert.equal(col.overflow, "visible");
      assert.equal(col.maxHeight, "none");
    }
    measurements.push({ width, ...before, independentScroll: false });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
try {
  for (const width of [1440, 1920, 1040, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: width < 600 ? 844 : 1000 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => {
      if (/^(file:|data:|blob:)/.test(route.request().url()))
        return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    await page.goto(pathToFileURL(htmlPath).href);
    await page.getByRole("button", { name: "초3", exact: true }).click();
    await page.getByRole("button", { name: "평면도형", exact: true }).click();
    const lessons = page.locator('[data-scope-stage="lesson"]');
    await lessons.getByRole("checkbox").first().waitFor();
    assert.equal(
      await lessons.getByRole("checkbox").count(),
      20,
      "lesson names must precede counts",
    );
    assert.equal(
      await lessons.getByRole("checkbox").first().isDisabled(),
      true,
    );
    await page.waitForFunction(() => globalThis.__qaRequests.length === 1);
    await shot(page, `${width}-lessons-before-counts`);
    await release(page);
    await lessons.getByRole("checkbox").first().waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-scope-stage="lesson"] input').disabled,
    );
    const requestsBefore = await page.evaluate(
      () => globalThis.__qaRequests.length,
    );
    await lessons.getByRole("checkbox").first().check();
    await lessons.getByRole("checkbox").first().uncheck();
    assert.equal(
      await lessons.getByRole("checkbox").count(),
      20,
      "checking hid lessons",
    );
    assert.equal(
      await page.evaluate(() => globalThis.__qaRequests.length),
      requestsBefore,
      "checking requested counts again",
    );
    for (let i = 0; i < 8; i++)
      await lessons.getByRole("checkbox").nth(i).check();
    await page
      .locator("[data-scope-layout] > *")
      .evaluateAll((nodes) => nodes.forEach((e) => (e.scrollTop = 0)));
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, `${width}-scope`);
    await checkScroll(page, width, "scope");
    await lessons
      .getByRole("button", { name: "다음 차시", exact: true })
      .click();
    await page.waitForFunction(() => globalThis.__qaRequests.length === 2);
    const queries = await page.evaluate(() => globalThis.__qaRequests);
    assert.equal(queries[0].ids.length, 20);
    assert.equal(queries[1].ids.length, 4, "page 2 must count only new ids");
    assert.ok(
      await page
        .locator("[data-selected-scope]")
        .first()
        .innerText()
        .then((text) => text.includes("출제 가능 24갈래")),
      "previous counts disappeared while page 2 loaded",
    );
    measurements.push({
      width,
      stage: "requests",
      entry: 1,
      checkAndUncheck: 0,
      page2Ids: queries[1].ids.length,
    });
    await release(page);
    await page.evaluate(() => globalThis.__setScene("review"));
    await page.locator("[data-exam-question]").first().waitFor();
    await page.waitForFunction(() => globalThis.__qaRequests.length >= 3);
    await release(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, `${width}-review`);
    const headerActions = page.locator(
      '[aria-label="문항 검토"] > div:first-child button',
    );
    const buttons = await headerActions.evaluateAll((nodes) =>
      nodes.map((e) => {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return {
          text: e.textContent,
          height: r.height,
          top: r.top,
          border: s.borderTopWidth,
        };
      }),
    );
    assert.equal(buttons.length, 3);
    buttons.forEach((b) => {
      assert.equal(b.height, 44);
      assert.equal(b.border, "1px");
    });
    if (width >= 1440)
      assert.equal(
        new Set(buttons.map((b) => b.top)).size,
        1,
        "header actions split across lines",
      );
    const questionButtons = page
      .locator("[data-exam-question]")
      .first()
      .locator(":scope > div:last-child");
    assert.equal(
      await questionButtons.locator("small").count(),
      0,
      "format metadata remained in action row",
    );
    await checkScroll(page, width, "review");
    await page.locator('[aria-label="문항 검토"]').scrollIntoViewIfNeeded();
    await shot(page, `${width}-review-questions`);
    await page
      .getByRole("button", { name: "범위 설정 고치기", exact: true })
      .click();
    await page.waitForTimeout(450);
    await settle(page);
    const title = page.getByRole("textbox", { name: "제목", exact: true });
    const saved = page.getByRole("button", { name: /저장한 조건/ }).first();
    const bandBottom = await page
      .locator("[data-studio-band]")
      .evaluate((e) => e.getBoundingClientRect().bottom);
    assert.ok(
      (await title.boundingBox()).y >= bandBottom,
      "title hidden under step band after returning",
    );
    assert.ok(
      (await saved.boundingBox()).y >= bandBottom,
      "saved conditions hidden under step band",
    );
    await shot(page, `${width}-scope-return`);
    if (width < 1200) {
      await page.locator('[aria-label="출제 구성표"]').scrollIntoViewIfNeeded();
      await shot(page, `${width}-scope-composition`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(external, []);
await writeFile(
  path.join(out, "browser-measurements.json"),
  JSON.stringify(
    {
      browser: "Google Chrome",
      data: "synthetic",
      errors,
      external,
      measurements,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      out,
      scenes: measurements.length,
      errors,
      external,
      requestChecks: measurements.filter((m) => m.stage === "requests"),
    },
    null,
    2,
  ),
);
