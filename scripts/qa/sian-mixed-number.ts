/**
 * 시안 — 「가분수 → 대분수」 자동 변환을 **끄면 지면이 어떻게 되는지** 나란히 보여 준다.
 *
 *   npx tsx scripts/qa/sian-mixed-number.ts
 *   → docs/planning/tracks/mixed-number-sian.html
 *
 * ## 어떻게 «끈 쪽»을 만드는가
 *
 * 손으로 흉내 내지 않는다. 제품 파일을 읽어 **그 한 줄(`s = improperToMixed(s);`)만**
 * 주석 처리한 임시 사본을 만들고, 렌더러도 그 사본을 보게 한 사본을 만들어 돌린다.
 * 즉 **실제로 고쳤을 때의 지면**이다. 다 그리면 임시 사본은 지운다.
 * (2026-08-19 교훈 — 시안은 실물로 보여야 한다. ASCII 로 고른 것은 확정이 아니다.)
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MATH_DIR = "src/lib/math";
const PRE_SRC = `${MATH_DIR}/textPreprocess.ts`;
const REN_SRC = `${MATH_DIR}/renderMathHtml.ts`;
const PRE_TMP = `${MATH_DIR}/__sianTextPreprocess.ts`;
const REN_TMP = `${MATH_DIR}/__sianRenderMathHtml.ts`;
const OUT = "docs/planning/tracks/mixed-number-sian.html";

/** 임시 사본을 만든다 — 제품 원본은 **읽기만** 한다. */
function makeOffCopies(): void {
  const pre = readFileSync(PRE_SRC, "utf8");
  const line = "  s = improperToMixed(s);";
  const n = pre.split(line).length - 1;
  if (n !== 1)
    throw new Error(`끄려는 줄이 ${n}개다 — 제품이 바뀌었다. 시안을 다시 짜라`);
  writeFileSync(
    PRE_TMP,
    pre.replace(
      line,
      "  // [시안] 이 줄을 껐다: s = improperToMixed(s);" +
        String.fromCharCode(10) +
        "  void improperToMixed;",
    ),
    "utf8",
  );
  const ren = readFileSync(REN_SRC, "utf8");
  const imp = 'from "./textPreprocess"';
  if (ren.split(imp).length - 1 !== 1)
    throw new Error("렌더러의 import 모양이 바뀌었다");
  writeFileSync(
    REN_TMP,
    ren.replace(imp, 'from "./__sianTextPreprocess"'),
    "utf8",
  );
}

function cleanup(): void {
  for (const f of [PRE_TMP, REN_TMP])
    if (existsSync(f)) rmSync(f, { force: true });
}

interface Row {
  자리: string;
  본문: string;
}

async function pickDbRows(): Promise<Row[]> {
  const { countRewrites } = await import("./census-mixed-number");
  const prisma = new PrismaClient();
  const want = new Map<string, number>([
    ["중1", 2],
    ["중2", 2],
    ["중3", 2],
    ["대수", 2],
    ["미적분1", 2],
    ["확률과 통계", 1],
  ]);
  const out: Row[] = [];
  let skip = 0;
  for (;;) {
    const rows = await prisma.problem.findMany({
      select: {
        id: true,
        content: true,
        solution: true,
        unit: { select: { grade: true } },
      },
      orderBy: { id: "asc" },
      skip,
      take: 2000,
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      const g = r.unit?.grade ?? "?";
      const left = want.get(g) ?? 0;
      if (left <= 0) continue;
      for (const f of ["content", "solution"] as const) {
        const raw = (r[f] ?? "") as string;
        if (!raw || raw.length > 220) continue;
        if (countRewrites(raw).mixed <= 0) continue;
        out.push({ 자리: `${g} · ${r.id.slice(0, 8)} · ${f}`, 본문: raw });
        want.set(g, left - 1);
        break;
      }
    }
    if ([...want.values()].every((v) => v <= 0)) break;
    skip += 2000;
  }
  await prisma.$disconnect();
  return out;
}

async function engineRows(): Promise<Row[]> {
  const { elementaryUnits, generateElementaryProblem } =
    await import("../../src/lib/elementary/generate");
  const { registeredTypes, generateMiddleProblem } =
    await import("../../src/lib/middle/generate");
  const { countRewrites } = await import("./census-mixed-number");
  const out: Row[] = [];
  for (const u of elementaryUnits()) {
    for (let s = 0; s < 10 && out.length < 2; s += 1) {
      let p;
      try {
        p = generateElementaryProblem(u, 20260821 + s * 7919);
      } catch {
        continue;
      }
      const body = String(p.content ?? "");
      if (
        /(대분수|가분수)로 (나타|고치|바꾸)/.test(body) &&
        countRewrites(body).mixed > 0
      ) {
        out.push({
          자리: `초등 엔진 · ${u.grade} ${u.chapter} · 발문 (정답 ${String(p.answer)})`,
          본문: body,
        });
      }
    }
    if (out.length >= 2) break;
  }
  for (const e of registeredTypes()) {
    if (out.length >= 4) break;
    for (let s = 0; s < 6; s += 1) {
      const p = generateMiddleProblem(e.key, s * 7919 + 13);
      const sol = String(p.solution ?? "");
      if (countRewrites(sol).fold > 0) {
        out.push({ 자리: `중학 엔진 · ${e.key} · 해설`, 본문: sol });
        break;
      }
    }
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main(): Promise<void> {
  const rows = [...(await engineRows()), ...(await pickDbRows())];
  makeOffCopies();
  try {
    const { renderMathHtml: now } =
      await import("../../src/lib/math/renderMathHtml");
    const { renderMathHtml: off } =
      await import("../../src/lib/math/__sianRenderMathHtml");
    const cards = rows
      .map(
        (r) => `<section class="card">
  <h3>${esc(r.자리)}</h3>
  <div class="pair">
    <div class="col now"><div class="tag">지금 (자동 변환 켜짐)</div><div class="body">${now(r.본문)}</div></div>
    <div class="col off"><div class="tag">끄면</div><div class="body">${off(r.본문)}</div></div>
  </div>
  <details><summary>DB 원문</summary><pre>${esc(r.본문)}</pre></details>
</section>`,
      )
      .join(chr10());
    writeFileSync(OUT, page(cards, rows.length), "utf8");
    console.log(`${OUT} — ${rows.length}건`);
  } finally {
    cleanup();
  }
}

function chr10(): string {
  return "" + String.fromCharCode(10);
}

function page(cards: string, n: number): string {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>가분수 → 대분수 자동 변환 시안</title>
<link rel="stylesheet" href="../../../node_modules/katex/dist/katex.min.css">
<style>
  body { font-family: "Malgun Gothic", sans-serif; margin: 24px; color: #1a2028; line-height: 1.7; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .lead { color: #4a5560; font-size: 14px; margin: 0 0 20px; }
  .card { border: 1px solid #d7dee5; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
  .card h3 { font-size: 12px; color: #6b7784; font-weight: 600; margin: 0 0 8px; letter-spacing: .02em; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .col { border: 1px solid #e4e9ee; border-radius: 4px; padding: 8px 10px; }
  .col.now { background: #fff7f6; border-color: #f0cfc9; }
  .col.off { background: #f6faf7; border-color: #cbe0d1; }
  .tag { font-size: 11px; color: #6b7784; margin-bottom: 6px; }
  .body { font-size: 12.5px; }
  details { margin-top: 8px; }
  summary { font-size: 11px; color: #8b96a1; cursor: pointer; }
  pre { font-size: 11px; background: #f4f6f8; padding: 8px; overflow-x: auto; white-space: pre-wrap; }
</style></head>
<body>
<h1>가분수 → 대분수 자동 변환 — 끄면 지면이 이렇게 됩니다</h1>
<p class="lead">${n}건. 왼쪽이 <b>지금 종이에 나가는 것</b>, 오른쪽이 <b>그 한 줄을 껐을 때</b>입니다.
둘 다 제품 렌더러(<code>renderMathHtml</code>)로 실제로 그린 것입니다 — 흉내가 아닙니다.
본문 글자 크기 12.5px 로 맞췄습니다. 측정은
<code>docs/planning/tracks/mixed-number-preprocess-20260823.md</code>.</p>
${cards}
</body></html>`;
}

void main().catch((e) => {
  cleanup();
  throw e;
});
