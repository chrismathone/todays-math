/** 죽은 백슬래시 — **LaTeX 명령 이름이 맨몸으로** 나온 자리만 유형별로 센다. (내 파일) */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;
const V = 4;
type E = { key: string; grade: string; unitSection: string };

/**
 * 「LaTeX 명령 이름인가」는 **KaTeX 가 아는 이름 목록**에서 가져온다 —
 * 손으로 적으면 목록에 없는 부류가 구조적으로 0이 된다(CLAUDE.md 2026-08-18).
 */
import katex from "katex";

const KNOWN = new Set<string>();
{
  const fns = katex as unknown as { __defineMacro?: unknown } as Record<
    string,
    unknown
  >;
  void fns;
  // katex 내부 함수표는 공개 API 가 아니다 — 대신 «이 이름이 KaTeX 명령인가»를
  // 실제로 렌더해서 묻는다. 모르는 명령이면 throw 한다.
  for (const name of CANDIDATES()) {
    try {
      katex.renderToString(`\\${name}{x}`, { throwOnError: true });
      KNOWN.add(name);
    } catch {
      try {
        katex.renderToString(`\\${name}`, { throwOnError: true });
        KNOWN.add(name);
      } catch {
        /* 명령이 아니다 */
      }
    }
  }
}

/** 산출물 전량에서 뽑은 영문 덩어리 후보 — 목록을 먼저 만들지 않는다. */
function CANDIDATES(): string[] {
  const seen = new Set<string>();
  for (const e of registeredTypes() as unknown as E[]) {
    for (let v = 0; v < 2; v += 1) {
      let p;
      try {
        p = generateMiddleProblem(e.key, SEED, v);
      } catch {
        continue;
      }
      for (const field of ["content", "answer", "solution"] as const) {
        for (const m of String(p[field] ?? "").match(/\$[^$]*\$/g) ?? [])
          for (const r of m.match(/(?<![\\A-Za-z])[A-Za-z]{2,}/g) ?? [])
            seen.add(r);
      }
    }
  }
  return [...seen];
}

const perUnit = new Map<string, Map<string, number>>();
const samples = new Map<string, string>();
for (const e of registeredTypes() as unknown as E[]) {
  for (let v = 0; v < V; v += 1) {
    let p;
    try {
      p = generateMiddleProblem(e.key, SEED, v);
    } catch {
      continue;
    }
    for (const field of ["content", "answer", "solution"] as const) {
      const text = String(p[field] ?? "");
      const hits: string[] = [];
      for (const m of text.match(/\$[^$]*\$/g) ?? [])
        for (const r of m.match(/(?<![\\A-Za-z])[A-Za-z]{2,}/g) ?? [])
          if (KNOWN.has(r)) hits.push(r);
      if (/[	]/.test(text)) hits.push("<TAB>");
      if (hits.length === 0) continue;
      const uk = `${e.grade}|${e.unitSection}`;
      if (!perUnit.has(uk)) perUnit.set(uk, new Map());
      const m2 = perUnit.get(uk)!;
      for (const h of hits) m2.set(h, (m2.get(h) ?? 0) + 1);
      if (!samples.has(e.key)) samples.set(e.key, `${e.key} ${field}: ${text}`);
    }
  }
}

console.log(`KaTeX 가 아는 이름으로 확인된 후보 ${KNOWN.size}종`);
console.log(`걸린 소단원 ${perUnit.size}`);
for (const [u, m] of [...perUnit].sort())
  console.log(`  ${u}  ${JSON.stringify(Object.fromEntries(m))}`);
if (process.argv.includes("--samples"))
  for (const [, s] of [...samples].slice(0, 40)) console.log(s);
