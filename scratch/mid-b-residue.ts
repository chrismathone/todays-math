/**
 * 갈래 B 감사 — **템플릿 리터럴에서 백슬래시가 죽었나**를 산출물에서 센다. (내 파일)
 *
 * 열쇠를 손 목록으로 짓지 않는다: `$...$` 안에서 **두 글자 이상 영문 덩어리**를
 * 전부 세고, 제어문자를 따로 센다. 「무엇이 잔재인지」를 미리 정하면
 * 목록에 없는 부류는 구조적으로 0이 된다 (CLAUDE.md 2026-08-18).
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;
const V = 4;
type E = { key: string; grade: string; unitSection: string };

/** 수식 안에서 백슬래시가 안 붙은 두 글자 이상 영문 덩어리 */
function bareRuns(s: string): string[] {
  const out: string[] = [];
  const math = s.match(/\$[^$]*\$/g) ?? [];
  for (const m of math) {
    for (const r of m.match(/(?<![\\A-Za-z])[A-Za-z]{2,}/g) ?? []) out.push(r);
  }
  return out;
}

/** 제어문자 — `\t`(times 가 죽은 자리) · `\v` · `\f` · `\b` */
function ctrl(s: string): string[] {
  return [...(s.match(/[	]/g) ?? [])].map((c) => JSON.stringify(c));
}

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const tally = new Map<string, number>();
const bad: string[] = [];
for (const e of registeredTypes() as unknown as E[]) {
  if (
    only.length &&
    !only.some((o) => e.key.includes(o) || e.unitSection.includes(o))
  )
    continue;
  for (let v = 0; v < V; v += 1) {
    let p;
    try {
      p = generateMiddleProblem(e.key, SEED, v);
    } catch {
      continue;
    }
    for (const field of ["content", "answer", "solution"] as const) {
      const text = String(p[field] ?? "");
      const hits = [...bareRuns(text), ...ctrl(text)];
      if (hits.length === 0) continue;
      for (const h of hits) tally.set(h, (tally.get(h) ?? 0) + 1);
      bad.push(
        `${e.grade}|${e.unitSection}|${e.key} v${v} ${field}: ${hits.join(" ")}`,
      );
    }
  }
}
console.log(`걸린 자리 ${bad.length}`);
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 40))
  console.log(`  ${n.toString().padStart(5)}  ${k}`);
if (process.argv.includes("--list"))
  for (const b of bad.slice(0, 300)) console.log(b);
