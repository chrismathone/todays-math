/** Product H2/S2 browser probe. Synthetic inventory only; all network is blocked.
 * node scripts/qa/measure-builder-h2-impl.mjs
 * Keeps the existing 3008 Next server untouched. Output and profiles stay in /tmp.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { build } from "vite";
const require = createRequire(import.meta.url);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const out = await mkdtemp(path.join(os.tmpdir(), "builder-h2-impl-"));
const entry = "virtual:builder-h2-probe";
const fixture = `
import ${JSON.stringify(require.resolve("katex/dist/katex.min.css"))};
import React, {useState} from ${JSON.stringify(require.resolve("react"))};
import {createRoot} from ${JSON.stringify(require.resolve("react-dom/client"))};
import MathExamBuilder from ${JSON.stringify(path.join(root, "src/components/exam-builder/MathExamBuilder.tsx"))};
import {CURRICULUM_UNITS} from ${JSON.stringify(path.join(root, "prisma/seed-data/units.ts"))};
import {DIFFICULTY_LADDER} from ${JSON.stringify(path.join(root, "src/contracts/difficulty.ts"))};
const units = CURRICULUM_UNITS.map((row,i)=>({...row,id:'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}));
const tally={held:48,available:48};
const inventory={view:'available',version:2,countUnit:'question',queryKey:'qa',held:35280,available:35280,facets:{units:Object.fromEntries(units.map(u=>[u.id,tally])),unitFamilies:Object.fromEntries(units.map(u=>[u.id,48])),difficulties:Object.fromEntries(DIFFICULTY_LADDER.map(t=>[t,tally])),sources:Object.fromEntries(['total','engine','school_textbook','past_exam','other'].map(k=>[k,tally])),textbook:{...tally,books:[]}}};
const questions=Array.from({length:40},(_,i)=>({id:'question-'+i,questionId:'qa-'+i,unitId:units[120].id,grade:units[120].grade,chapter:units[120].chapter,section:units[120].section,content:(i+1)+'번. 다음 식을 계산하세요.\\n\\n$'+(i+12)+' + '+(i+3)+' = ?$',answer:String(i*2+15),solution:'두 수를 더합니다.',difficulty:DIFFICULTY_LADDER[i%6],questionType:['multiple-choice','short-answer','descriptive'][i%3],source:'manual',eligible:true,figureUrls:[],figureSvg:null}));
let pendingCheck;
globalThis.__qaRequests=[];
globalThis.fetch=async (url,init={})=>{
  const text=String(url);const body=init.body?JSON.parse(String(init.body)):{};
  globalThis.__qaRequests.push({url:text,method:init.method||'GET'});
  if(text.includes('exam-conditions'))return Response.json({data:[],meta:{limit:50}});
  if(text.endsWith('/sources')&&body.view==='available')return Response.json(inventory);
  if(text.endsWith('/check'))return new Promise(resolve=>{pendingCheck=resolve;init.signal?.addEventListener('abort',()=>resolve(Response.json({})));});
  throw new Error('Unexpected fixture request: '+text);
};
function App(){
  const [scene,setScene]=useState('scope');const [key,setKey]=useState(0);
  const [items,setItems]=useState([]);const [title,setTitle]=useState('3학년 덧셈과 뺄셈 확인');
  globalThis.__builderQA={units,questions,scene,setScene:(next)=>{pendingCheck?.(Response.json({}));pendingCheck=undefined;setScene(next);setItems(next==='scope'?[]:next==='empty'?[questions[0]]:questions);setKey(k=>k+1);}};
  return React.createElement('main',{style:{padding:'16px 20px',minWidth:0}},React.createElement(MathExamBuilder,{key,initialData:{problems:[],total:35280,page:1,pageSize:12,grades:[],chapters:[],units,countUnit:'question',unitCounts:Object.fromEntries(units.map(u=>[u.id,48]))},initialStep:scene==='scope'?'scope':'review',canOutput:scene!=='permission',onQuestionsChange:setItems,editor:{selected:items,title,setTitle,printMeta:{},navigate:()=>{},toggle:()=>{},reorder:setItems}}));
}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
const result = await build({
  configFile: false,
  envDir: false,
  publicDir: false,
  root: out,
  cacheDir: path.join(out, "vite-cache"),
  logLevel: "error",
  resolve: { alias: { "@": path.join(root, "src") } },
  css: { postcss: { plugins: [] } },
  plugins: [
    {
      name: "h2-isolated",
      resolveId(id) {
        if (id === entry) return `\0${entry}`;
        if (id === "next/dynamic") return "\0h2-dynamic";
        if (id === "@/components/unified/WorksheetEditor") return "\0h2-output";
        if (/^(?:@prisma|server-only|node:)/.test(id))
          throw new Error(`Server dependency forbidden: ${id}`);
      },
      load(id) {
        if (id === `\0${entry}`) return fixture;
        if (id === "\0h2-dynamic")
          return `export default function dynamic(){return function OutputBoundary(){return null}}`;
        if (id === "\0h2-output")
          return "export default function OutputBoundary(){return null}";
      },
    },
  ],
  build: {
    write: false,
    outDir: path.join(out, "bundle"),
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    minify: false,
    rollupOptions: {
      input: entry,
      output: { format: "iife" },
    },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap(
  (r) => r.output ?? [],
);
const js = outputs
  .filter((r) => r.type === "chunk")
  .map((r) => r.code)
  .join("\n");
const css = outputs
  .filter((r) => r.type === "asset" && r.fileName.endsWith(".css"))
  .map((r) => String(r.source))
  .join("\n");
const globals = await readFile(path.join(root, "src/app/globals.css"), "utf8");
const tokens = globals.match(/:root\s*\{[^}]*\}/)?.[0];
const font = (
  await readFile(path.join(root, "public/fonts/PretendardVariable.woff2"))
).toString("base64");
await writeFile(
  path.join(out, "standalone.html"),
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}\n@font-face{font-family:Pretendard;src:url(data:font/woff2;base64,${font});font-weight:100 900}*{box-sizing:border-box}html,body{margin:0}body{font-family:Pretendard,sans-serif;font-size:14px;background:var(--learn-bg)}button,input,select{font:inherit}${css}</style><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></html>`,
);
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(out, "profile"),
  args: [
    "--no-sandbox",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--host-resolver-rules=MAP * ~NOTFOUND",
  ],
});
const errors = [];
const external = [];
const measurements = [];
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
}
async function clickText(page, selector, text) {
  await page.evaluate(
    (selector, text) => {
      const button = [...document.querySelectorAll(selector)].find(
        (e) => e.textContent.trim() === text,
      );
      if (!button) throw new Error("Missing " + selector + " " + text);
      button.click();
    },
    selector,
    text,
  );
  await settle(page);
}
async function inputValue(page, selector, value) {
  await page.evaluate(
    (selector, value) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing input ${selector}`);
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    selector,
    value,
  );
  await settle(page);
}
async function dragOrder(page) {
  const before = await page.$$eval("[data-exam-question]", (nodes) =>
    nodes.map((node) => node.dataset.questionId),
  );
  const handles = await page.$$("[data-exam-order] button");
  await handles[0].evaluate((node) => node.scrollIntoView({ block: "center" }));
  const source = await handles[0].boundingBox();
  const target = await handles[2].evaluate((node) => {
    const r = node.closest("tr").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(target.x + 22, target.y + target.height - 4, {
    steps: 12,
  });
  await page.mouse.up();
  await settle(page);
  const after = await page.$$eval("[data-exam-question]", (nodes) =>
    nodes.map((node) => node.dataset.questionId),
  );
  const expected = [...before];
  expected.splice(2, 0, expected.splice(0, 1)[0]);
  if (JSON.stringify(after) !== JSON.stringify(expected))
    throw new Error("Order-table pointer drag changed the wrong global slot");
}
async function measure(page, width, scene) {
  await settle(page);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector("[data-exam-builder]");
    const problems = [];
    const outside = [];
    for (const e of root.querySelectorAll("*")) {
      // KaTeX intentionally clips its accessible MathML alongside visible HTML.
      // It is not a clipped product control or missing visible math content.
      if (e.closest(".katex-mathml")) continue;
      if (
        !e.getClientRects().length ||
        getComputedStyle(e).visibility === "hidden"
      )
        continue;
      const r = e.getBoundingClientRect();
      const style = getComputedStyle(e);
      if (r.width > 0 && (r.left < -0.5 || r.right > innerWidth + 0.5))
        outside.push(e.tagName + "." + e.className);
      if (
        e.clientWidth > 0 &&
        e.scrollWidth - e.clientWidth > 1 &&
        ["hidden", "clip"].includes(style.overflowX)
      )
        problems.push(e.tagName + "." + e.className);
    }
    const rail = root.querySelector("[data-exam-review-rail]");
    const reason = rail?.querySelector('[aria-label="다음 단계 안내"]');
    const order = rail?.querySelector('[aria-label="문항 순서표"]');
    return {
      blockText: reason?.innerText ?? "",
      blocked:
        reason?.querySelector("button[aria-describedby]")?.disabled ?? null,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      width: root.getBoundingClientRect().width,
      clipped: problems,
      outside,
      reasonAfterOrder: reason ? order?.nextElementSibling === reason : null,
      questions: root.querySelectorAll("[data-exam-question]").length,
      detailInputs: root.querySelectorAll(
        '[data-scope-stage="lesson"] input[type="checkbox"]',
      ).length,
    };
  });
  const expectedReason = {
    busy: "출력할 문항을 확인하는 중",
    permission: "양식 구성·출력 권한이 없습니다",
    empty: "담은 문항이 없습니다",
    total: "총 40문항 지정 · 현재 39문항",
    format: "객관식 40문항 지정",
  }[scene];
  if (expectedReason && !geometry.blockText.includes(expectedReason))
    errors.push(`${width}/${scene}: expected reason missing`);
  if (scene === "scope" && geometry.detailInputs)
    errors.push(`${width}: initial lesson DOM rendered`);
  measurements.push({ width, scene, ...geometry });
  if (
    [
      "scope",
      "lessons",
      "selected",
      "review",
      "permission",
      "total",
      "empty",
      "busy",
      "format",
    ].includes(scene)
  ) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await settle(page);
    const el = await page.$("[data-exam-builder]");
    await el.screenshot({ path: path.join(out, `${width}-${scene}.png`) });
  }
}
try {
  for (const width of [1440, 1040, 390, 320]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width >= 1000 ? 1000 : 844 });
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (/^(file:|data:|blob:)/.test(r.url())) void r.continue();
      else {
        external.push(r.url());
        void r.abort();
      }
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(out, "standalone.html")).href, {
      waitUntil: "load",
    });
    await page.waitForSelector(
      '[data-scope-stage="group"] button:not(:disabled)',
    );
    await measure(page, width, "scope");
    await clickText(page, '[data-scope-stage="group"] button', "공통수학1");
    await measure(page, width, "chapters");
    await clickText(
      page,
      '[data-scope-stage="detail"] button',
      "2. 방정식과 부등식",
    );
    await measure(page, width, "lessons");
    await clickText(page, "button", "다음 차시");
    await measure(page, width, "lessons-page2");
    await page.click('[data-scope-stage="lesson"] input[type="checkbox"]');
    await measure(page, width, "selected");
    await clickText(page, "button", "구성 조건");
    await measure(page, width, "conditions-dialog");
    await clickText(page, "dialog button", "취소");
    await page.evaluate(() => globalThis.__builderQA.setScene("review"));
    await page.waitForSelector("[data-exam-review-rail]");
    await measure(page, width, "review");
    await clickText(page, '[aria-label="순서표 쪽 이동"] button', "다음");
    await measure(page, width, "review-page2");
    await dragOrder(page);
    await measure(page, width, "review-page2-drag");
    await clickText(page, "button", "정답·해설 보기");
    await measure(page, width, "answers");
    await clickText(page, "button", "정답·해설 숨기기");
    await clickText(page, "button", "다음: 양식 구성·출력");
    await measure(page, width, "busy");
    await page.evaluate(() => globalThis.__builderQA.setScene("permission"));
    await page.waitForSelector("[data-exam-review-rail]");
    await measure(page, width, "permission");
    await page.evaluate(() => globalThis.__builderQA.setScene("empty"));
    await page.waitForSelector("[data-exam-question]");
    await clickText(page, "button", "삭제");
    await measure(page, width, "empty");
    await page.evaluate(() => globalThis.__builderQA.setScene("review"));
    await page.waitForSelector("[data-exam-question]");
    await clickText(page, "button", "범위 설정 고치기");
    await clickText(page, "button", "구성 조건");
    await page.evaluate(() => {
      const e = document.querySelector('dialog input[aria-label="총 문항"]');
      if (!e) throw new Error("No total input");
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(e, "40");
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle(page);
    await clickText(page, "dialog button", "적용");
    await clickText(page, "button", "2 문항 검토");
    await clickText(page, "button", "삭제");
    await measure(page, width, "total");
    await page.evaluate(() => globalThis.__builderQA.setScene("review"));
    await page.waitForSelector("[data-exam-question]");
    await clickText(page, "button", "범위 설정 고치기");
    await clickText(page, "button", "구성 조건");
    for (const [name, count] of [
      ["객관식", "40"],
      ["단답형", "0"],
      ["서술형", "0"],
    ])
      await inputValue(
        page,
        `dialog input[aria-label="${name} 문항 수"]`,
        count,
      );
    await clickText(page, "dialog button", "적용");
    await clickText(page, "button", "2 문항 검토");
    await measure(page, width, "format");
    await page.close();
  }
} finally {
  await browser.close();
}
const failures = measurements.filter(
  (r) =>
    r.overflow ||
    r.clipped.length ||
    r.outside.length ||
    r.reasonAfterOrder === false,
);
const summary = {
  out,
  browser: "Chromium",
  measurements: measurements.length,
  errors,
  external,
  failures,
  results: measurements,
};
await writeFile(
  path.join(out, "measurements.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify(
    {
      out,
      measurements: summary.measurements,
      errors,
      externalRequests: external.length,
      failures,
    },
    null,
    2,
  ),
);
if (errors.length || external.length || failures.length) process.exitCode = 1;
