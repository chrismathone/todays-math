/** Local candidate paper, preserving native Markdown tables and the bank math renderer. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import { chromium } from "@playwright/test";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { UI_KATEX_OPTIONS } from "../../../src/lib/math/katexRender";
import { preprocessMarkdown } from "../../../src/lib/math/markdownPreprocess";
import { checkPaperRender } from "../../../src/lib/testchanger/mathRenderQa";
import { bindCandidate, newOutputPath, sha256 } from "./candidatePack.mjs";

const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
interface Node {
  type: string;
  value?: string;
  children?: Node[];
  ordered?: boolean;
  depth?: number;
}
function markdown(text: string): string {
  const qa = checkPaperRender(text);
  assert(qa.safe, `Unsafe product math rendering: ${qa.why.join(", ")}`);
  // Authored Markdown already has deliberate table/list/paragraph boundaries.
  // Legacy OCR reflow joins text following a table into its last row.
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(preprocessMarkdown(text));
  function walk(n: Node): string {
    const children = () => (n.children ?? []).map(walk).join("");
    if (n.type === "text") return escape(n.value ?? "");
    if (n.type === "inlineMath" || n.type === "math")
      return katex.renderToString(n.value ?? "", {
        ...UI_KATEX_OPTIONS,
        throwOnError: true,
        displayMode: n.type === "math",
      });
    if (n.type === "paragraph") return `<p>${children()}</p>`;
    if (n.type === "strong") return `<strong>${children()}</strong>`;
    if (n.type === "emphasis") return `<em>${children()}</em>`;
    if (n.type === "break") return "<br>";
    if (n.type === "heading") return `<h${n.depth}>${children()}</h${n.depth}>`;
    if (n.type === "table")
      return `<table>${(n.children ?? []).map((row, i) => `<tr>${(row.children ?? []).map((cell) => `<${i ? "td" : "th"}>${(cell.children ?? []).map(walk).join("")}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</table>`;
    if (n.type === "list")
      return `<${n.ordered ? "ol" : "ul"}>${children()}</${n.ordered ? "ol" : "ul"}>`;
    if (n.type === "listItem") return `<li>${children()}</li>`;
    if (n.value) return escape(n.value);
    return children();
  }
  return walk(tree as Node);
}

async function main() {
  const [newOutputDirectory, mode, ...files] = process.argv.slice(2);
  assert(
    newOutputDirectory && ["student", "review"].includes(mode) && files.length,
  );
  const output = newOutputPath(newOutputDirectory);
  const bindings = files
    .map(bindCandidate)
    .sort((a, b) => a.candidate.questionNumber - b.candidate.questionNumber);
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(path.join(output, "figures"));
  const styleFile = path.join(output, "katex.css");
  fs.copyFileSync(
    path.resolve("node_modules/katex/LICENSE"),
    path.join(output, "KaTeX-LICENSE.txt"),
  );
  fs.copyFileSync(
    path.resolve("node_modules/katex/dist/katex.min.css"),
    styleFile,
  );
  fs.cpSync(
    path.resolve("node_modules/katex/dist/fonts"),
    path.join(output, "fonts"),
    { recursive: true, errorOnExist: true },
  );
  const marks = ["①", "②", "③", "④", "⑤"];
  const cards = bindings
    .map((b) => {
      const c = b.candidate;
      const figure = (a: (typeof b.assets)[number]) => {
        const file = path.basename(a.studentPath);
        fs.copyFileSync(a.sourceSvgPath, path.join(output, "figures", file));
        return `<figure style="width:${a.intendedWidthMm}mm"><img src="figures/${file}" alt="새 도형 ${c.questionNumber}"></figure>`;
      };
      const figures = b.assets
        .filter((a) => a.role === "stem")
        .map(figure)
        .join("");
      const choices = c.choices
        .map(
          (v: string, i: number) =>
            `<li><span class="mark">${marks[i]}</span><div>${markdown(v)}${b.assets
              .filter((a) => a.role === `choice:${i + 1}`)
              .map(figure)
              .join("")}</div></li>`,
        )
        .join("");
      const solution =
        mode === "review"
          ? `<details class="solution"><summary>정답·해설 검토</summary><p>${markdown(c.answer)}</p>${markdown(c.solution)}</details>`
          : "";
      const graphChoices = b.assets.some((a) => a.role.startsWith("choice:"));
      return `<article id="q${c.questionNumber}"><header><b>${c.questionNumber}.</b><span>${c.score}점</span></header>${markdown(c.content)}<div class="stem-figures">${figures}</div>${choices ? `<ul class="choices${graphChoices ? " graph-choices" : ""}">${choices}</ul>` : ""}${solution}</article>`;
    })
    .join("");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>새 문항 ${mode === "review" ? "검토" : "문제지"}</title><link rel="stylesheet" href="katex.css"><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#e8e9e8;color:#15191b;font-family:'Malgun Gothic','Noto Sans KR',sans-serif;font-size:15px;line-height:1.7}.paper{width:185mm;margin:24px auto;background:white;padding:20px 26px}.title{font-size:20px;border-bottom:2px solid #202b32;padding-bottom:12px}article{padding:18px 0;break-inside:avoid;border-bottom:1px solid #c9d0d4}article header{display:flex;justify-content:space-between}header b{font-size:18px}header span{color:#556069}p{margin:10px 0}table{border-collapse:collapse;margin:12px 0;width:100%;font-size:14px}th,td{border:1px solid #788189;padding:7px 12px;text-align:center}th{background:#f4f6f7;font-weight:500}figure{margin:14px auto}figure img{width:100%;height:auto;display:block}.choices{padding:0;list-style:none;display:grid;grid-template-columns:1fr;gap:5px}.choices li{display:flex;align-items:baseline;gap:10px}.choices p{margin:0}.mark{min-width:22px}.solution{margin-top:16px;background:#f5f7f6;padding:12px}.solution summary{cursor:pointer}.katex{font-size:1.04em}.katex-display{margin:.5em 0}@media print{body{background:white}.paper{width:100%;margin:0;padding:0}.solution{display:none}}</style></head><body><main class="paper"><div class="title">새 문항 ${mode === "review" ? "검토본" : "문제지"} · 중3</div>${cards}</main></body></html>`;
  const htmlPath = path.join(output, "preview.html");
  const finalHtml = html.replace(
    "</style>",
    ".graph-choices{grid-template-columns:1fr 1fr}.graph-choices li{break-inside:avoid}.stem-figures{display:flex;justify-content:center;gap:4mm;align-items:center;flex-wrap:wrap}.stem-figures figure{margin:14px 0}@media print{.title{display:none}article{padding:14px 0}table{margin:10px 0}th,td{padding:4px 10px}p{margin:7px 0}.choices{break-inside:avoid}}</style>",
  );
  fs.writeFileSync(htmlPath, finalHtml, { flag: "wx" });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 1500 },
      deviceScaleFactor: 1.5,
    });
    await page.goto(pathToFileURL(htmlPath).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Image load failed"));
              }),
        ),
      );
    });
    assert.equal(await page.locator(".katex-error,.math-raw").count(), 0);
    assert.equal(
      await page
        .locator("img")
        .evaluateAll(
          (nodes) =>
            nodes.filter((node) => !(node as HTMLImageElement).naturalWidth)
              .length,
        ),
      0,
      "Broken figure resource",
    );
    const overflow = await page
      .locator("article")
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 1)
          .map((node) => node.id),
      );
    assert.equal(overflow.length, 0, `Preview overflow: ${overflow}`);
    await page.screenshot({
      path: path.join(output, "preview.png"),
      fullPage: true,
    });
    for (const b of bindings)
      await page.locator(`#q${b.candidate.questionNumber}`).screenshot({
        path: path.join(
          output,
          `q${String(b.candidate.questionNumber).padStart(2, "0")}.png`,
        ),
      });
    if (mode === "review") {
      await page.locator("details").evaluateAll((nodes) =>
        nodes.forEach((node) => {
          (node as HTMLDetailsElement).open = true;
        }),
      );
      for (const b of bindings)
        await page.locator(`#q${b.candidate.questionNumber}`).screenshot({
          path: path.join(
            output,
            `q${String(b.candidate.questionNumber).padStart(2, "0")}.solution.png`,
          ),
        });
    }
    if (mode === "student")
      await page.pdf({
        path: path.join(output, "student-paper.pdf"),
        printBackground: true,
        preferCSSPageSize: true,
      });
    fs.writeFileSync(
      path.join(output, "render-review.json"),
      JSON.stringify(
        {
          mode,
          questionCount: bindings.length,
          productMathRendererSafe: true,
          redOrRawMathCount: 0,
          overflowingCards: overflow,
          htmlSha256: sha256(Buffer.from(finalHtml)),
          candidates: bindings.map((b) => ({
            n: b.candidate.questionNumber,
            studentDigest: b.studentDigest,
            candidateDigest: b.candidateDigest,
            assetDigest: b.assetDigest,
          })),
          visualReviewStatus: "pending-human-agent-image-inspection",
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
  }
  console.log(
    JSON.stringify({
      rendered: bindings.length,
      mode,
      mathSafe: true,
      overflow: 0,
      output,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
