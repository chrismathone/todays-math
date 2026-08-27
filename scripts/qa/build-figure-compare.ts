/**
 * **전학년 그림 1:1 대조 페이지** — 조판 전(엔진 `<text>`) vs 조판 후(MathJax).
 *
 *   npx tsx scripts/qa/build-figure-compare.ts [출력.html] [씨앗수]
 *
 * ## 무엇을 견주나
 * 같은 스펙을 **두 번** 그린다 — `typeset:false`(2026-08-28 이전 경로 그대로)와
 * 기본값(조판본). 옛 커밋을 꺼내 돌리는 것보다 싸고, 두 벌이 갈라질 자리가 없다.
 *
 * ## 모집단
 * 초등: 등록된 소단원 전량을 씨앗으로 돌려 **나온 `kind` 를 관측**한다(손 목록을 두지
 * 않는다 — 손 목록은 샌다). 중등: 등록된 유형 전량. 종류마다 **처음 하나**만 싣는다.
 *
 * ⚠️ 이 페이지는 `.tmp-orca/` 에 둔다. 지면 인상을 눈으로 보려는 물건이고,
 *    커밋 대상이 아니다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { svgLabels } from "../../src/lib/figure/svgLabels";

const outPath =
  process.argv[2] ?? path.join(".tmp-orca", "figure-compare.html");
const seeds = Number(process.argv[3] ?? 6);

interface Row {
  grade: string;
  kind: string;
  where: string;
  before: string;
  after: string;
  typeset: number;
  kept: string[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function pairOf(spec: unknown): Promise<[string, string] | null> {
  const [b, a] = await Promise.all([
    renderFigureSpec(spec, { typeset: false }),
    renderFigureSpec(spec),
  ]);
  if (!b.ok || !a.ok) return null;
  return [b.svg, a.svg];
}

async function collectElementary(rows: Row[]): Promise<void> {
  const seen = new Set<string>();
  for (const unit of elementaryUnits()) {
    for (let seed = 1; seed <= seeds; seed += 1) {
      let p;
      try {
        p = generateElementaryProblem(unit, seed);
      } catch {
        continue;
      }
      const spec = p?.figureSpec as Record<string, unknown> | undefined;
      if (!spec) continue;
      const kind = String(spec.kind ?? `v${spec.version ?? "?"}`);
      if (seen.has(kind)) continue;
      const pair = await pairOf(spec);
      if (!pair) continue;
      seen.add(kind);
      const labels = svgLabels(pair[1]);
      rows.push({
        grade: unit.grade,
        kind,
        where: `${unit.grade} ${unit.chapter} · ${unit.section}`,
        before: pair[0],
        after: pair[1],
        typeset: labels.filter((l) => l.typeset).length,
        kept: labels.filter((l) => !l.typeset).map((l) => l.text),
      });
    }
  }
}

async function collectMiddle(rows: Row[]): Promise<void> {
  const { generateMiddleProblem, registeredTypes } =
    await import("../../src/lib/middle/generate");
  const seen = new Set<string>();
  for (const { key } of registeredTypes()) {
    for (let seed = 1; seed <= seeds; seed += 1) {
      for (let v = 0; v < 3; v += 1) {
        let p;
        try {
          p = generateMiddleProblem(key, seed, v);
        } catch {
          continue;
        }
        const spec = p?.figureSpec as Record<string, unknown> | undefined;
        if (!spec) continue;
        const shape = JSON.stringify(Object.keys(spec).sort());
        const tag = `${key}|${shape}`;
        if (seen.has(tag)) continue;
        const pair = await pairOf(spec);
        if (!pair) continue;
        seen.add(tag);
        const labels = svgLabels(pair[1]);
        rows.push({
          grade: key.split("|")[0] ?? "중등",
          kind: key,
          where: key,
          before: pair[0],
          after: pair[1],
          typeset: labels.filter((l) => l.typeset).length,
          kept: labels.filter((l) => !l.typeset).map((l) => l.text),
        });
        break;
      }
    }
  }
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  await collectElementary(rows);
  await collectMiddle(rows);

  const totalTypeset = rows.reduce((a, r) => a + r.typeset, 0);
  const totalKept = rows.reduce((a, r) => a + r.kept.length, 0);
  const body = rows
    .map(
      (r) => `<section>
  <h3>${esc(r.kind)} <small>${esc(r.where)}</small></h3>
  <p class="m">조판 ${r.typeset}${r.kept.length ? ` · 그대로 ${r.kept.length} (${esc(r.kept.slice(0, 8).join(", "))})` : ""}</p>
  <div class="pair">
    <figure><figcaption>조판 전</figcaption>${r.before}</figure>
    <figure><figcaption>조판 후 (MathJax)</figcaption>${r.after}</figure>
  </div>
</section>`,
    )
    .join("\n");

  const html = `<!doctype html><meta charset="utf-8"><title>그림 1:1 — 조판 전후</title>
<style>
 body{font:14px/1.6 system-ui,"Malgun Gothic",sans-serif;margin:24px;background:#fafafa;color:#111}
 h1{font-size:20px;margin:0 0 4px}
 .lead{color:#555;margin:0 0 20px}
 section{background:#fff;border:1px solid #e3e3e3;border-radius:8px;padding:12px 16px;margin:0 0 14px}
 h3{font-size:15px;margin:0 0 2px}
 h3 small{font-weight:400;color:#777;margin-left:8px}
 .m{color:#777;margin:0 0 8px;font-size:12px}
 .pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
 figure{margin:0;border:1px dashed #ddd;padding:8px;background:#fff;overflow-x:auto}
 figcaption{font-size:11px;color:#888;margin-bottom:6px}
 svg{max-width:100%;height:auto}
</style>
<h1>전학년 그림 1:1 — 조판 전후</h1>
<p class="lead">종류 ${rows.length}개 · 조판된 라벨 ${totalTypeset}자리 · 글리프가 없어 그대로 둔 라벨 ${totalKept}자리(한글·㎠ 따위).
왼쪽이 2026-08-28 이전 경로, 오른쪽이 MathJax 조판본. <b>같은 스펙</b>을 두 번 그린 것이다.</p>
${body}`;

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  console.log(
    `종류 ${rows.length} · 조판 ${totalTypeset} · 그대로 ${totalKept}`,
  );
  console.log(`→ ${outPath}`);
}

void main();
