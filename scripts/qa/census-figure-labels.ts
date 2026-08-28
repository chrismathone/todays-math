/**
 * **그림 라벨 전수 조사** — 어떤 글이 라벨로 나가는가, 그리고 그중 **MathJax 로
 * 조판할 수 있는 것이 몇인가**.
 *
 *   npx tsx scripts/qa/census-figure-labels.ts            # 초등 전 학년
 *   npx tsx scripts/qa/census-figure-labels.ts --json out.json
 *
 * ── 왜 세는가 ───────────────────────────────────────────────────────────────
 * 「전학년 MathJax」를 붙이기 전에 **분모**를 봐야 한다. MathJax 의 TeX 글꼴에는
 * 한글이 **없다** — 「바닐라」·「(개)」를 그대로 먹이면 글자가 사라진다. 그러니
 * 「초등에도 붙인다」는 곧 「무엇에 붙이고 무엇을 남기나」를 정하는 일이고,
 * 그 경계는 손으로 정할 것이 아니라 **실제로 나오는 라벨을 세어** 정해야 한다.
 *
 * ⚠️ 이 도구는 조판을 **하지 않는다.** 지금 나가는 SVG 의 `<text>` 를 그대로 읽는다.
 *    (초등은 아직 옛 경로라 `<text>` 가 그대로 있다. 중등은 `data-mj` 로 나오므로
 *     그 속성에서 원문을 읽는다 — 두 경로를 한 자로 센다.)
 */
import { writeFileSync } from "node:fs";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const args = process.argv.slice(2);
const seedCount = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);
const jsonAt = args.indexOf("--json");
const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : undefined;

/** 한글·한자·가나가 한 글자라도 있으면 TeX 글꼴로 못 그린다. */
const CJK_RE = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/;

const TEXT_RE = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;

function labelsOf(svg: string): string[] {
  const out: string[] = [];
  for (const m of svg.matchAll(TEXT_RE)) {
    const mj = /\bdata-mj="([^"]*)"/.exec(m[1]!);
    const raw = mj ? mj[1]! : m[2]!.replace(/<[^>]+>/g, "");
    const text = raw
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
    if (text) out.push(text);
  }
  // 이미 조판된 것(중등)은 `<g data-label>` 로 나온다 — 그것도 라벨이다.
  for (const m of svg.matchAll(/<g data-label="([^"]*)"/g)) {
    const text = m[1]!
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

async function main(): Promise<void> {
  const counts = new Map<string, number>();
  const byKind = new Map<string, { cjk: number; math: number }>();
  let rendered = 0;
  let failed = 0;

  for (const unit of elementaryUnits()) {
    for (let seed = 1; seed <= seedCount; seed += 1) {
      let p: ReturnType<typeof generateElementaryProblem> | null = null;
      try {
        p = generateElementaryProblem(unit, seed);
      } catch {
        continue;
      }
      const spec = p?.figureSpec as Record<string, unknown> | undefined;
      if (!spec) continue;
      const kind = String(spec.kind ?? `v${spec.version ?? "?"}`);
      const r = await renderFigureSpec(spec);
      if (!r.ok) {
        failed += 1;
        continue;
      }
      rendered += 1;
      const slot = byKind.get(kind) ?? { cjk: 0, math: 0 };
      for (const label of labelsOf(r.svg)) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
        if (CJK_RE.test(label)) slot.cjk += 1;
        else slot.math += 1;
      }
      byKind.set(kind, slot);
    }
  }

  const all = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const cjk = all.filter(([t]) => CJK_RE.test(t));
  const math = all.filter(([t]) => !CJK_RE.test(t));
  const sum = (rows: typeof all) => rows.reduce((a, [, n]) => a + n, 0);

  console.log(`그린 그림 ${rendered} · 실패 ${failed}`);
  console.log(
    `라벨 자리 ${sum(all)} · 종류 ${all.length}` +
      `  —  한글 자리 ${sum(cjk)}(${cjk.length}종) · ` +
      `조판 가능 ${sum(math)}(${math.length}종)`,
  );
  console.log(
    "\n── 한글 라벨 상위 20 (MathJax 로 못 그린다 → `<text>` 로 남긴다)",
  );
  for (const [t, n] of cjk.slice(0, 20))
    console.log(`  ${String(n).padStart(5)}  ${t}`);
  console.log("\n── 조판 가능 라벨 상위 20");
  for (const [t, n] of math.slice(0, 20))
    console.log(`  ${String(n).padStart(5)}  ${t}`);
  console.log("\n── kind 별 (한글/조판가능)");
  for (const [k, v] of [...byKind.entries()].sort(
    (a, b) => b[1].cjk - a[1].cjk,
  )) {
    console.log(
      `  ${k.padEnd(22)} 한글 ${String(v.cjk).padStart(4)} · 조판 ${String(v.math).padStart(4)}`,
    );
  }

  if (jsonPath) {
    writeFileSync(
      jsonPath,
      `${JSON.stringify({ rendered, failed, labels: all, byKind: [...byKind] }, null, 1)}\n`,
      "utf8",
    );
    console.log(`\n→ ${jsonPath}`);
  }
}

void main();
