/** Local production component rendering and source metadata; no DB connection. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { PaperProblemView } from "../../../../src/components/print/PaperProblemView";
import {
  parseSourceBook,
  parseSourceMaterial,
} from "../../../../src/lib/import/schoolTextbook/sourceMeta";
import "katex/dist/katex.min.css";

interface CandidateRow {
  id: string;
  key: string;
  book: string;
  grade: string;
  path: string;
  content: string;
  answer: string;
  solution: string;
  unit: { section: string };
  calculation: { calculation: string };
  [field: string]: unknown;
}

const [input, evidencePath, output, cssPath, rawPath] = process.argv.slice(2);
if (!input || !evidencePath || !output || !cssPath)
  throw new Error("input evidence output css required");
const packet = JSON.parse(readFileSync(input, "utf8")) as {
  entries: CandidateRow[];
};
const raw = rawPath
  ? new Map(
      readFileSync(rawPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .map((line) => {
          const row = JSON.parse(line);
          return [`tb-${row.key}-${row.section}-${row.number}`, row] as const;
        }),
    )
  : new Map();
const evidence = new Map(
  readFileSync(evidencePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const row = JSON.parse(line);
      return [row.id, row] as const;
    }),
);
const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const render = (content: string) =>
  renderToStaticMarkup(createElement(PaperProblemView, { content }));
const cards: string[] = [];
const entries = packet.entries.map((row) => {
  const sourceBook = parseSourceBook({
    bookFolder: row.book,
    grade: row.grade,
  });
  const sourceMaterial = parseSourceMaterial({
    path: row.path,
    bookFolder: row.book,
    key: row.key,
  });
  const body = render(row.content),
    answer = render(row.answer),
    solution = render(row.solution);
  const html = body + answer + solution;
  if (
    /katex-error|math-error|math-render-error/.test(html) ||
    row.content.includes("$$")
  ) {
    throw new Error(`Rendering defect: ${row.id}`);
  }
  cards.push(
    `<article id="${escape(row.id)}"><header><b>${escape(row.id)}</b> · ${escape(row.unit.section)}</header><section data-kind="content">${body}</section><details open><summary>정답과 원본 풀이</summary><section data-kind="answer">${answer}</section><section data-kind="solution">${solution}</section></details><p class="witness">${escape(row.calculation.calculation)}</p></article>`,
  );
  return {
    ...row,
    sourceBook,
    sourceMaterial,
    sourceEvidence: {
      ...(evidence.get(row.id) ?? {}),
      rawExtractedWitness: raw.get(row.id) ?? null,
    },
    renderEvidence: {
      component: "PaperProblemView",
      htmlSha256: hash(html),
      cssSha256: hash(readFileSync(cssPath, "utf8")),
      katexErrors: 0,
      visualReviewApproved: false,
    },
    remainingGates: [
      "coordinator independent review receipt",
      "final page review",
      "fresh loaded-ID exclusion at load",
    ],
  };
});
const css = readFileSync(cssPath, "utf8");
mkdirSync(output, { recursive: true });
writeFileSync(
  path.join(output, "candidate-packet.json"),
  JSON.stringify(
    {
      ...packet,
      entries,
      status: "source_grounded_calculated_candidates_pending_coordinator_load",
      renderer: "PaperProblemView with bundled production CSS",
      databaseWrites: 0,
      humanReviewApprovals: 0,
    },
    null,
    2,
  ) + "\n",
);
const envelopeCss = `body{margin:0;background:#f4f5f7;font-family:'Malgun Gothic',sans-serif;color:#111827}
main{max-width:960px;margin:auto;padding:24px}h1{font-size:24px}
article{background:white;border:1px solid #ddd;border-radius:8px;padding:20px;margin:20px 0}
header{font-size:14px;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:12px}
summary{padding:12px 0;font-weight:600}.witness{font-size:13px;color:#4b5563;line-height:1.7}
section{margin:12px 0;overflow-x:auto}
/* Preserve the product's fixed paper column width, fitting the 390px envelope. */
@media(max-width:500px){main{padding:4px}article{padding:2px}header{overflow-wrap:anywhere}}
@media print{body{background:white}main{padding:0}article{break-inside:avoid;border:0}}`;
writeFileSync(
  path.join(output, "review.html"),
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>교과서 보강 후보 20문항</title><style>${css}</style><style>${envelopeCss}</style><main><h1>교과서 보강 후보 20문항</h1><p>원본에서 추출한 문안과 풀이 · 계산 대조 완료 · 출제 승인 대기</p>${cards.join("\n")}</main></html>`,
);
writeFileSync(
  path.join(output, "component-render.json"),
  JSON.stringify(
    {
      rows: entries.length,
      mathErrors: 0,
      component: "PaperProblemView",
      productionCss: true,
      visualReviewApproved: false,
      htmlSha256: hash(readFileSync(path.join(output, "review.html"), "utf8")),
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ rows: entries.length, mathErrors: 0, output }));
