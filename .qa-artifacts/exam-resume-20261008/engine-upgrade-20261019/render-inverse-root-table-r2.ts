/** Offline engine rendering evidence only. Never produces an authored candidate or approval. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import katex from "katex";
import { chromium } from "@playwright/test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { inverseRootTable } from "../../../src/lib/examStudy/families/middle/inverseRootTable";
import { UI_KATEX_OPTIONS } from "../../../src/lib/math/katexRender";
import { preprocessMarkdown } from "../../../src/lib/math/markdownPreprocess";
import { checkPaperRender } from "../../../src/lib/testchanger/mathRenderQa";
import { newOutputPath, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";

type Node = { type: string; value?: string; children?: Node[] };
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function markdown(text: string): string {
  const safe = checkPaperRender(text);
  assert(safe.safe, safe.why.join(","));
  const ast = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(preprocessMarkdown(text));
  function walk(n: Node): string {
    const children = () => (n.children ?? []).map(walk).join("");
    if (n.type === "text") return escape(n.value ?? "");
    if (n.type === "inlineMath" || n.type === "math") return katex.renderToString(n.value ?? "", { ...UI_KATEX_OPTIONS, throwOnError: true, displayMode: n.type === "math" });
    if (n.type === "paragraph") return `<p>${children()}</p>`;
    if (n.type === "table") return `<table>${(n.children ?? []).map((row, i) => `<tr>${(row.children ?? []).map(cell => `<${i ? "td" : "th"}>${(cell.children ?? []).map(walk).join("")}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</table>`;
    return children();
  }
  return walk(ast as Node);
}

async function main() {
  const output = newOutputPath(".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/inverse-root-table-preview-r2");
  fs.mkdirSync(output);
  fs.copyFileSync("node_modules/katex/dist/katex.min.css", path.join(output, "katex.css"));
  fs.cpSync("node_modules/katex/dist/fonts", path.join(output, "fonts"), { recursive: true, errorOnExist: true });
  const drafts = Array.from({ length: 45 }, (_, i) => ({ i, q: inverseRootTable.generate(0, i) }));
  for (const { q } of drafts) assert(inverseRootTable.verify(q).valid);
  const cards = drafts.map(({ i, q }) => `<article id="v${i}"><header>내부 조합 ${i + 1} · 검수 전용</header>${markdown(q.content)}<section><b>답 ${markdown(q.answer)}</b>${markdown(q.solution)}</section></article>`).join("");
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>제곱근표 역추론 내부 검토</title><link rel="stylesheet" href="katex.css"><style>*{box-sizing:border-box}body{font:15px/1.75 'Malgun Gothic',sans-serif;margin:0;background:#f0f1f0;color:#161a18}main{width:90mm;margin:20px auto;background:white;padding:12px}article{padding:18px 0;border-bottom:1px solid #bcc5bd}header{font-weight:700;color:#3d5145}p{margin:12px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:16px 0}td,th{border:1px solid #79877e;padding:8px 4px;text-align:center;font-weight:400;font-size:13px}td:first-child,th:first-child{width:25%}section{background:#f3f6f3;padding:12px;margin-top:16px}section b p{margin:0}.katex{font-size:1.05em}</style><main><h1>제곱근표 역추론 · 내부 검토</h1>${cards}</main></html>`;
  const file = path.join(output, "preview.html"); fs.writeFileSync(file, html, { flag: "wx" });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1450 }, deviceScaleFactor: 1.5 });
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(async () => { await document.fonts.ready; });
    assert.equal(await page.locator("article").count(), 45);
    assert.equal(await page.locator("table").count(), 45);
    assert.equal(await page.locator(".katex-error,.math-raw").count(), 0);
    const overflow = await page.locator("article,table,td,th").evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.id || node.tagName));
    assert.deepEqual(overflow, []);
    const images = [];
    for (const i of [0, 22, 44]) {
      const png = path.join(output, `variant-${i}.png`); await page.locator(`#v${i}`).screenshot({ path: png });
      images.push({ variant: i, path: png, sha256: sha256(fs.readFileSync(png)) });
    }
    fs.writeFileSync(path.join(output, "render-receipt-r1.json"), JSON.stringify({ utc: new Date().toISOString(), kernelSha256: sha256(fs.readFileSync("src/lib/examStudy/families/middle/inverseRootTable.ts")), engineDrafts: 45, tables: 45, images, mathSafe: true, overflow: 0, htmlSha256: sha256(Buffer.from(html)), usesProductMathOptionsPreprocessAndRenderGuard: true, nativeReaderParity: false, previewContentWidthMm: 90, newManualAuthoredQuestions: 0, newManualFigures: 0, gradeApproval: false, rightsApproval: false, publicRelease: false, dbWrites: 0 }, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ renderedEngineDrafts: 45, tables: 45, mathSafe: true, overflow: 0, output, newManualQuestions: 0 }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
