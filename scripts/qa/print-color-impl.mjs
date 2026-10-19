// Real C2/P1 components, local fixtures, measured pagination and native export builders.
// No authentication, workspace API or database access. Run: node scripts/qa/print-color-impl.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { register } from "tsx/cjs/api";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const root = process.cwd();
const out = resolve(root, ".qa-artifacts/print-color-impl");
await mkdir(out, { recursive: true });
const unregister = register({ tsconfig: resolve(root, "tsconfig.json") });
const require = createRequire(import.meta.url);
const { buildPdf, PdfPayloadSchema } = require(
  resolve(root, "src/lib/export/pdfServer.ts"),
);
const { buildHwpxParts, HwpxPayloadSchema } = require(
  resolve(root, "src/lib/export/hwpxServer.ts"),
);
const { hwpxZip } = require(resolve(root, "src/lib/export/hwpxZip.ts"));
const { TEMPLATES, COLORS } = require(
  resolve(root, "src/components/unified/print/settings.ts"),
);
const { INITIAL_META } = require(
  resolve(root, "src/app/dev/print-color-hifi/fixtures.ts"),
);
const { DEFAULT_PRINT_OPTIONS } = require(
  resolve(root, "src/components/unified/print/types.ts"),
);
const tokens = (
  await readFile(resolve(root, "src/app/globals.css"), "utf8")
).match(/:root\s*\{[\s\S]*?\n\}/)[0];
await writeFile(
  resolve(out, "index.html"),
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}
@font-face{font-family:Pretendard;src:url(/@fs/${root}/public/fonts/PretendardVariable.woff2);font-weight:45 920}
@font-face{font-family:"Noto Sans KR";src:url(/@fs/${root}/public/fonts/PretendardVariable.woff2);font-weight:45 920}
@font-face{font-family:"Noto Serif KR";src:url(/@fs/${root}/public/fonts/NotoSerifKR-subset.woff2);font-weight:100 900}
:root{--font-pretendard:Pretendard;--font-noto-serif-kr:"Noto Serif KR"}*{box-sizing:border-box}body{margin:0;background:var(--learn-bg);font:14px/1.6 Pretendard,sans-serif}button{font-family:inherit;background:transparent}.qa-title{font-size:24px;margin:0 0 20px}
</style></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`,
);
await writeFile(
  resolve(out, "entry.tsx"),
  `import React,{useState,useEffect,useCallback,useMemo} from "react";
import{createRoot}from"react-dom/client";import"${root}/node_modules/katex/dist/katex.min.css";
import{PrintOptionsPanel}from"${root}/src/components/unified/print/PrintOptionsPanel";
import{WorksheetPrint}from"${root}/src/components/unified/print/WorksheetPrint";
import SheetTagPicker from"${root}/src/components/unified/print/SheetTagPicker";
import{DEFAULT_PRINT_OPTIONS}from"${root}/src/components/unified/print/types";
import{INITIAL_META,PROBLEMS}from"${root}/src/app/dev/print-color-hifi/fixtures";
import{exportPreviewPdf}from"${root}/src/lib/export/pdfClient";
import{collectHwpxLayout}from"${root}/src/lib/export/hwpxLayout";
import{useMeasuredPages}from"${root}/src/components/unified/print/useMeasuredPages";
import{arithmeticGroupFrom,arithmeticGroupInstruction,arithmeticGroupStarts}from"${root}/src/lib/arithmeticOutputLayout";
import{PyeonggaTemplate}from"${root}/src/app/dev/print-color-hifi/previous/PyeonggaTemplate";
import{JeongtongTemplate}from"${root}/src/app/dev/print-color-hifi/previous/JeongtongTemplate";
import{ModernTemplate}from"${root}/src/app/dev/print-color-hifi/previous/ModernTemplate";
import{WorkbookTemplate}from"${root}/src/app/dev/print-color-hifi/previous/WorkbookTemplate";
import{JaseupTemplate}from"${root}/src/app/dev/print-color-hifi/previous/JaseupTemplate";
import{YuhyungTemplate}from"${root}/src/app/dev/print-color-hifi/previous/YuhyungTemplate";
import styles from"${root}/src/components/unified/WorksheetEditor.module.css";
function App(){const[config,setConfig]=useState({options:DEFAULT_PRINT_OPTIONS,meta:INITIAL_META,tag:"일일TEST",profile:"short"});
const[ready,setReady]=useState(false);const onReady=useCallback(setReady,[]);
const selected=useMemo(()=>Array.from({length:config.profile==="short"?4:40},(_,i)=>({...PROBLEMS[i%4].variant,id:"qa-"+i,...(config.profile==="arithmetic"?{content:(i+1)+" + 1 =",arithmetic:{round:i<20?1:2,number:i+1,groupKey:"group-"+Math.floor(i/10),groupTitle:"연산 유형 "+(Math.floor(i/10)+1)}}:{})})),[config.profile]);
const reviewers=useMemo(()=>selected.map((p,i)=>({id:p.id,variant:{...p,topic:p.section||p.chapter},sectionHeading:arithmeticGroupStarts(p,selected[i-1])?p.arithmetic?.groupTitle:undefined,sectionInstruction:arithmeticGroupStarts(p,selected[i-1])?arithmeticGroupInstruction(arithmeticGroupFrom(selected,i)):undefined})),[selected]);
const printMeta=useMemo(()=>({...config.meta,sheetTag:config.tag||undefined}),[config.meta,config.tag]);
const baseline=useMeasuredPages({pyeongga:PyeonggaTemplate,jeongtong:JeongtongTemplate,modern:ModernTemplate,workbook:WorkbookTemplate,jaseup:JaseupTemplate,yuhyung:YuhyungTemplate}[config.options.template],reviewers,config.options,printMeta);
useEffect(()=>{window.printQA={set:(patch)=>{const request=(window.printQARequest||0)+1;window.printQARequest=request;setReady(false);setConfig(v=>({...v,...patch,request,options:{...v.options,...patch.options},meta:{...v.meta,...patch.meta}}));return request},
 pdf:()=>exportPreviewPdf(document.querySelector("[data-mathgen-document]"),config.meta.title),
 hwpx:async()=>{const result=await collectHwpxLayout(document.querySelector("[data-mathgen-document]"));return{pages:result.pages,assets:Object.keys(result.assets)}}};},[config]);
return <main className={styles.exportContent} data-qa-baseline={baseline.pages.length} data-qa-ready={String(ready&&baseline.ready)} data-qa-request={config.request||0}><h1 className="qa-title">확정 C2 · P1 실제 출력 검증</h1><div className={styles.exportGrid}><aside className={styles.exportInspector} aria-label="시험지 설정"><div className={styles.settingsPanel}><PrintOptionsPanel title={config.meta.title} setTitle={title=>setConfig(v=>({...v,meta:{...v.meta,title}}))} options={config.options} meta={config.meta} onMeta={patch=>setConfig(v=>({...v,meta:{...v.meta,...patch}}))} onOptions={patch=>setConfig(v=>({...v,options:{...v.options,...patch}}))} slots={{metaTop:<SheetTagPicker value={config.tag||null} onChange={tag=>setConfig(v=>({...v,tag}))}/>}}/></div></aside><WorksheetPrint selected={selected} title={config.meta.title} options={config.options} printMeta={printMeta} onReady={onReady}/></div>{baseline.measureNode}</main>}
createRoot(document.getElementById("root")!).render(<App/>);`,
);
const server = await createServer({
  configFile: false,
  root: out,
  cacheDir: resolve(out, "vite-cache"),
  plugins: [react()],
  resolve: { alias: { "@": resolve(root, "src") } },
  server: {
    host: "127.0.0.1",
    port: 0,
    cors: true,
    fs: { allow: [root, await realpath(resolve(root, "node_modules"))] },
  },
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  blocked = [],
  measurements = [],
  exports = [];
page.on("pageerror", (error) => errors.push(error.message));
let capturedPdf;
const blank = await PDFDocument.create();
blank.addPage();
const blankPdf = Buffer.from(await blank.save());
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.origin === origin && url.pathname === "/api/exports/pdf") {
    capturedPdf = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: blankPdf,
    });
  }
  if (url.origin !== origin || url.pathname.startsWith("/api/")) {
    blocked.push(url.href);
    return route.abort();
  }
  return route.continue();
});
async function ready() {
  await page.waitForSelector('[data-qa-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
}
async function set(patch) {
  const request = await page.evaluate(
    (patch) => window.printQA.set(patch),
    patch,
  );
  await page.waitForFunction(
    (request) =>
      document
        .querySelector("[data-qa-ready]")
        ?.getAttribute("data-qa-request") === String(request) &&
      document
        .querySelector("[data-qa-ready]")
        ?.getAttribute("data-qa-ready") === "true",
    request,
  );
  await ready();
}
async function inspect() {
  return page.evaluate(() => {
    const root = document.querySelector("[data-mathgen-document]");
    const papers = [...root.querySelectorAll("[data-unified-paper]")];
    const sheets = papers.map((paper) => {
      const node = paper.firstElementChild;
      const rect = node.getBoundingClientRect();
      const body = node.querySelector(".measure-body");
      const b = body.getBoundingClientRect();
      const items = [...body.querySelectorAll("[data-measure-idx]")].map(
        (item) => {
          const r = item.getBoundingClientRect();
          return { bottom: r.bottom - b.bottom, right: r.right - b.right };
        },
      );
      return {
        width: rect.width,
        height: rect.height,
        overflowX: node.scrollWidth - node.clientWidth,
        overflowY: node.scrollHeight - node.clientHeight,
        items,
        numbers: [...node.querySelectorAll("[data-question-number]")].map(
          (n) => n.textContent,
        ),
        round: node.querySelector("[data-arithmetic-round]")?.textContent,
        fields: [...node.querySelectorAll("[data-meta-field]")].map(
          (n) => n.dataset.metaField,
        ),
        tag: node.querySelector("[data-exam-type]")?.textContent,
        headColor: node.querySelector("[data-print-header]")
          ? getComputedStyle(node.querySelector("[data-print-header]"))
              .getPropertyValue("--head-accent")
              .trim()
          : null,
      };
    });
    return {
      viewportOverflow: document.documentElement.scrollWidth - innerWidth,
      baselineQuestionPages: Number(
        document
          .querySelector("[data-qa-baseline]")
          .getAttribute("data-qa-baseline"),
      ),
      questionPages: papers.filter((p) => p.dataset.pageKind === "questions")
        .length,
      previewHeaderMatches:
        document.querySelector("#worksheet-preview [data-print-header]")
          ?.outerHTML === root.querySelector("[data-print-header]")?.outerHTML,
      previewOverlay: getComputedStyle(
        document.querySelector(
          '#worksheet-preview button[aria-label$="쪽 확대"]',
        ),
      ).backgroundColor,
      sheets,
    };
  });
}
function valid(result, count) {
  assert(result.previewHeaderMatches, "화면 미리보기와 출력 머리가 다름");
  assert.equal(
    result.previewOverlay,
    "rgba(0, 0, 0, 0)",
    "확대 조작이 지면을 가림",
  );
  assert(
    result.viewportOverflow <= 1,
    `화면 가로 넘침 ${result.viewportOverflow}`,
  );
  assert.equal(
    result.sheets.flatMap((sheet) => sheet.numbers).length,
    count,
    "문항 누락/중복",
  );
  assert.deepEqual(
    result.sheets.flatMap((sheet) => sheet.numbers).map(Number),
    Array.from({ length: count }, (_, i) => i + 1),
    "문항 순서",
  );
  for (const sheet of result.sheets) {
    assert(Math.abs(sheet.width - 793.7) < 1);
    assert(Math.abs(sheet.height - 1122.52) < 1);
    assert(
      sheet.overflowX <= 1 && sheet.overflowY <= 1,
      `A4 넘침 ${JSON.stringify(sheet)}`,
    );
    assert(
      sheet.items.every((item) => item.bottom <= 1 && item.right <= 1),
      `본문 밖 문항 ${JSON.stringify(sheet.items)}`,
    );
  }
}
try {
  await page.goto(origin);
  await ready();
  // Actual heads and question boxes: six forms × all nine colors.
  for (const { value: template, label } of TEMPLATES) {
    for (const [, color] of [
      ["남색", DEFAULT_PRINT_OPTIONS.color],
      ...COLORS,
    ]) {
      await set({
        options: {
          template,
          color,
          columns: 1,
          layoutMode: "spacing",
          spacing: 18,
          solvingArea: "off",
          showAnswers: false,
        },
        profile: "short",
      });
      const result = await inspect();
      valid(result, 4);
      assert.equal(result.sheets[0].tag, "일일TEST");
      assert.equal(result.sheets[0].headColor, color);
      measurements.push({ template, color, profile: "short", ...result });
    }
    // Real measured pages: two layout modes × two column counts, plus round boundaries.
    for (const columns of [1, 2])
      for (const layoutMode of ["spacing", "count"]) {
        await set({ options: { columns, layoutMode }, profile: "long" });
        const result = await inspect();
        valid(result, 40);
        measurements.push({
          template,
          columns,
          layoutMode,
          profile: "long",
          ...result,
        });
      }
    await set({
      options: { columns: 2, layoutMode: "count" },
      profile: "arithmetic",
    });
    const arithmetic = await inspect();
    valid(arithmetic, 40);
    for (const sheet of arithmetic.sheets) {
      assert(sheet.round);
      const nums = sheet.numbers.map(Number);
      assert(nums.every((n) => n <= 20 === nums[0] <= 20));
    }
    measurements.push({ template, profile: "arithmetic", ...arithmetic });
    await set({
      options: { columns: 1, layoutMode: "spacing", marginPreset: "wide" },
      profile: "long",
      meta: {
        title:
          "긴 제목 줄바꿈과 새 정보 상자의 지면 배치를 확인하는 일차부등식 학습지입니다. ".repeat(
            2,
          ),
        schoolName: "입력값을 줄이지 않고 모두 표시하는 한빛중학교",
        patternStrategy:
          "이항하여 정리하고 음수로 나눌 때 부등호 방향을 바꾸며 마지막에 해를 확인한다. ".repeat(
            6,
          ),
        conceptNote:
          "부등식의 양변에 같은 수를 더하거나 빼도 부등호의 방향은 바뀌지 않는다.\n\n".repeat(
            8,
          ),
      },
    });
    const longMeta = await inspect();
    valid(longMeta, 40);
    measurements.push({ template, profile: "long-meta-wide", ...longMeta });
    await set({
      options: {
        color: "#0EA5E9",
        columns: 1,
        layoutMode: "spacing",
        marginPreset: "normal",
      },
      profile: "short",
      meta: INITIAL_META,
    });
    // Put only the unscaled export copy onscreen for direct A4 screenshots, without changing pagination.
    await page.addStyleTag({
      content:
        "[data-qa-shot]{position:static!important;visibility:visible!important;}",
    });
    const documentRoot = page.locator("[data-mathgen-document]");
    await documentRoot.evaluate((node) => {
      node.parentElement.setAttribute("data-qa-shot", "");
      node.parentElement.style.cssText = "position:static;visibility:visible";
    });
    await documentRoot
      .locator("[data-unified-paper]")
      .first()
      .screenshot({ path: resolve(out, `C2-${template}-cyan.png`) });
    await documentRoot.evaluate((node) => {
      node.parentElement.removeAttribute("data-qa-shot");
      node.parentElement.style.cssText = "";
    });
    // The real PDF client creates this payload; no API reaches the Next server.
    capturedPdf = undefined;
    await page.evaluate(() => window.printQA.pdf().then((blob) => blob.size));
    assert(capturedPdf);
    const input = PdfPayloadSchema.parse({
      ...capturedPdf,
      fontPolicy: "self-hosted",
    });
    process.env.PDF_CHROMIUM_EXECUTABLE = chromium.executablePath();
    const pdf = await buildPdf(input, origin);
    await writeFile(resolve(out, `C2-${template}.pdf`), pdf);
    const pdfPages = (await PDFDocument.load(pdf)).getPageCount();
    assert.equal(pdfPages, (await inspect()).sheets.length, "PDF 쪽 수");
    const hwpx = await page.evaluate(() => window.printQA.hwpx());
    assert.deepEqual(hwpx.assets, []);
    const payload = HwpxPayloadSchema.parse({
      title: "C2 " + label,
      pages: hwpx.pages,
    });
    const objects = payload.pages.flatMap((p) => p.objects);
    assert(
      objects.some(
        (o) => o.type === "rect" && o.color?.toLowerCase() === "#0ea5e9",
      ),
      "HWPX 선택색 면",
    );
    assert(
      objects.some((o) => o.type === "text" && o.text.includes("일일TEST")),
      "HWPX 시험 종류",
    );
    if (template === "workbook")
      for (const text of ["일차부등식의 풀이", "이항하여 정리하고"]) {
        assert(
          objects.some((o) => o.type === "text" && o.text.includes(text)),
          "HWPX 워크북 새 칸 " + text,
        );
      }
    delete process.env.STUDIO_ENGINE_URL;
    delete process.env.VERCEL;
    process.env.PYTHON_BIN = "python3";
    const parts = await buildHwpxParts(payload);
    const zip = await hwpxZip(parts, {});
    await writeFile(
      resolve(out, `C2-${template}.hwpx`),
      Buffer.from(await zip.arrayBuffer()),
    );
    const xml = Object.values(parts).join("\n");
    assert(xml.includes("일일TEST"));
    assert(/faceColor="#0ea5e9"/i.test(xml), "HWPX XML 선택색 면");
    assert(/textColor="#000000"/i.test(xml), "HWPX XML 면 위 검정 글자");
    if (template === "workbook")
      for (const text of ["일차부등식의 풀이", "이항하여 정리하고"])
        assert(xml.includes(text), "HWPX XML 새 칸 " + text);
    exports.push({
      template,
      pdfPages,
      pdfBytes: pdf.byteLength,
      hwpxBytes: zip.size,
      objects: objects.length,
      accentRects: objects.filter(
        (o) => o.type === "rect" && o.color?.toLowerCase() === "#0ea5e9",
      ).length,
    });
  }
  // A multi-page PDF must preserve the measured question and answer page count.
  await set({
    options: {
      template: "workbook",
      columns: 2,
      layoutMode: "count",
      showAnswers: true,
      quickAnswerOnly: true,
    },
    profile: "arithmetic",
  });
  const multi = await inspect();
  valid(multi, 40);
  measurements.push({
    template: "workbook",
    profile: "multi-export",
    ...multi,
  });
  capturedPdf = undefined;
  await page.evaluate(() => window.printQA.pdf().then((blob) => blob.size));
  const multiPdf = await buildPdf(
    PdfPayloadSchema.parse({ ...capturedPdf, fontPolicy: "self-hosted" }),
    origin,
  );
  const multiPages = (await PDFDocument.load(multiPdf)).getPageCount();
  assert.equal(multiPages, multi.sheets.length, "여러 쪽 PDF 쪽 나눔");
  await writeFile(
    resolve(out, "C2-workbook-rounds-with-answers.pdf"),
    multiPdf,
  );
  exports.push({
    template: "workbook-rounds-with-answers",
    pdfPages: multiPages,
    pdfBytes: multiPdf.byteLength,
  });
  // P1 input behavior and small-screen product controls.
  await set({
    options: { template: "jeongtong", columns: 1, showAnswers: false },
    profile: "short",
  });
  await page
    .getByLabel("학교/기관명", { exact: true })
    .fill("브라우저 보존 학교");
  await page
    .getByRole("group", { name: "템플릿", exact: true })
    .getByRole("button", { name: /^워크북/ })
    .click();
  await ready();
  assert(await page.getByLabel("학교/기관명", { exact: true }).isDisabled());
  assert.equal(
    await page.getByLabel("학교/기관명", { exact: true }).inputValue(),
    "브라우저 보존 학교",
  );
  await page
    .getByLabel("핵심 전략", { exact: true })
    .fill("브라우저 보존 전략");
  await page
    .getByRole("group", { name: "템플릿", exact: true })
    .getByRole("button", { name: /^정통/ })
    .click();
  await ready();
  assert.equal(
    await page.getByLabel("학교/기관명", { exact: true }).inputValue(),
    "브라우저 보존 학교",
  );
  await page
    .getByRole("group", { name: "템플릿", exact: true })
    .getByRole("button", { name: /^워크북/ })
    .click();
  await ready();
  assert.equal(
    await page.getByLabel("핵심 전략", { exact: true }).inputValue(),
    "브라우저 보존 전략",
  );
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await ready();
    await page
      .getByLabel("학교/기관명", { exact: true })
      .scrollIntoViewIfNeeded();
    const result = await inspect();
    valid(result, 4);
    measurements.push({ width, profile: "responsive", ...result });
    await page.screenshot({
      path: resolve(out, `P1-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "1쪽 확대", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("[data-print-header]").first().waitFor();
  await dialog.screenshot({ path: resolve(out, "C2-expanded-320.png") });
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("group", { name: "시험 종류", exact: true })
    .getByRole("button", { name: "없음", exact: true })
    .click();
  await ready();
  assert.equal(
    await page.locator("[data-mathgen-document] [data-exam-type]").count(),
    0,
  );
  await page
    .getByRole("checkbox", { name: "날짜 표시", exact: true })
    .uncheck();
  await ready();
  assert.equal(
    await page
      .locator('[data-mathgen-document] [data-meta-field="examDate"]')
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  await writeFile(
    resolve(out, "browser.json"),
    JSON.stringify({ measurements, exports, errors, blocked }, null, 2),
  );
  console.log(
    JSON.stringify(
      { cases: measurements.length, exports, errors, blocked },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
  unregister();
}
