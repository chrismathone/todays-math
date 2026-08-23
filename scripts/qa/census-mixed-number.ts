/**
 * 전처리가 **지면의 수를 고쳐 쓰는** 자리를 전수로 센다 (읽기 전용).
 *
 *   npx tsx scripts/qa/census-mixed-number.ts --db      # 공유 DB 전량
 *   npx tsx scripts/qa/census-mixed-number.ts --middle  # 중학 유형 엔진
 *   npx tsx scripts/qa/census-mixed-number.ts --elem    # 초등 엔진
 *
 * ## 무엇을 세는가
 *
 * `preprocessMathText` 의 `improperToMixed` 는 **정수 가분수를 대분수로** 바꾸고,
 * 정수로 떨어지면 **분수를 통째로 접는다**. 둘 다 화면·지면 렌더 경로에 있다
 * (`MarkdownRenderer`, `renderMathHtml`) — 즉 **DB 값은 그대로인데 종이에 다른 수가
 * 찍힌다.**
 *
 *   ① 가분수 → 대분수 : `-\dfrac{3}{2}x^2` → `-1\dfrac{1}{2}x^2`
 *   ② 정수로 접힘     : `\dfrac{355}{5}=71` → `71=71`  (해설 단계가 사라진다)
 *
 * ## 판정의 «참» 이 어디서 오는가
 *
 * 규칙을 옮겨 적지 않는다 — **제품 `preprocessMathText` 를 실제로 돌려** 그 앞뒤
 * 산출물의 **모양**을 견준다. 그래서 그 규칙이 바뀌면 이 계량기도 같이 따라간다.
 * 그리고 정규식이 죽어 0 을 내는 일이 실제로 있었으므로(도구 층이 역슬래시를 한 겹
 * 벗겼다), **일부러 걸리는 입력**으로 스스로를 먼저 시험한다. 0 은 「깨끗」과
 * 「못 셈」을 안 가른다.
 */
import { PrismaClient } from "@prisma/client";

import {
  decodeHtmlEntities,
  preprocessMathText,
} from "../../src/lib/math/textPreprocess";

/** 대분수 모양 — 숫자 바로 뒤에 분수가 붙은 것. */
const MIXED = /(?:^|[^\d.])(\d{1,4})\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
/** 순정수 분수 — `rac`·`\dfrac` 둘 다. */
const FRAC = /\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;

const countMixed = (s: string) => [...s.matchAll(MIXED)].length;
const fracs = (s: string) =>
  [...s.matchAll(FRAC)].map((m) => `${m[1]}/${m[2]}`);

/** 자체 시험 — 이게 빨갛지 않으면 아래 숫자는 아무것도 뜻하지 않는다. */
function selfTest(): void {
  const yes = String.raw`x^{3}-1\dfrac{1}{2}x^{2}`;
  const no = String.raw`x-\dfrac{3}{2}x`;
  if (countMixed(yes) !== 1 || countMixed(no) !== 0) {
    throw new Error(
      `대분수 정규식이 죽었다 (yes=${countMixed(yes)} no=${countMixed(no)}) — 0 은 «깨끗»이 아니다`,
    );
  }
  const f = fracs(String.raw`\dfrac{6}{3}+\frac{1}{2}`).join(",");
  if (f !== "6/3,1/2") throw new Error(`분수 정규식이 죽었다: ${f}`);
}

/** 한 칸에서 ①·② 를 센다. */
export function countRewrites(raw: string): { mixed: number; fold: number } {
  const before = decodeHtmlEntities(raw);
  const after = preprocessMathText(before);
  const mixed = Math.max(0, countMixed(after) - countMixed(before));
  const rest = fracs(after);
  const gone = fracs(before).filter((x) => {
    const i = rest.indexOf(x);
    if (i >= 0) {
      rest.splice(i, 1);
      return false;
    }
    return true;
  });
  const fold = gone.filter((x) => {
    const [a, b] = x.split("/").map(Number);
    return b !== 0 && a % b === 0 && a >= b;
  }).length;
  return { mixed, fold };
}

async function censusDb(): Promise<void> {
  const prisma = new PrismaClient();
  const PAGE = 2000;
  let skip = 0,
    scanned = 0,
    mixedRows = 0,
    foldRows = 0,
    mixedSites = 0,
    foldSites = 0;
  const byGrade = new Map<string, number>();
  for (;;) {
    const rows = await prisma.problem.findMany({
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        unit: { select: { grade: true } },
      },
      orderBy: { id: "asc" },
      skip,
      take: PAGE,
    });
    if (rows.length === 0) break;
    for (const row of rows) {
      scanned += 1;
      let m = 0,
        f = 0;
      for (const field of ["content", "answer", "solution"] as const) {
        const raw = (row[field] ?? "") as string;
        if (!raw) continue;
        const r = countRewrites(raw);
        m += r.mixed;
        f += r.fold;
      }
      if (m) {
        mixedRows += 1;
        mixedSites += m;
        const g = row.unit?.grade ?? "?";
        byGrade.set(g, (byGrade.get(g) ?? 0) + 1);
      }
      if (f) {
        foldRows += 1;
        foldSites += f;
      }
    }
    skip += PAGE;
  }
  console.log(`[공유 DB] 훑은 문항 ${scanned}`);
  console.log(`  ① 가분수 → 대분수: 문항 ${mixedRows} · 자리 ${mixedSites}`);
  console.log(
    `     학년별 문항: ${[...byGrade]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ")}`,
  );
  console.log(`  ② 정수로 접힘: 문항 ${foldRows} · 자리 ${foldSites}`);
  await prisma.$disconnect();
}

async function censusMiddle(): Promise<void> {
  const { registeredTypes, generateMiddleProblem } =
    await import("../../src/lib/middle/generate");
  let m = 0,
    f = 0,
    total = 0;
  const types = new Set<string>();
  for (const e of registeredTypes()) {
    for (let s = 0; s < 12; s += 1) {
      const p = generateMiddleProblem(e.key, s * 7919 + 13);
      for (const field of [p.content, p.answer, p.solution]) {
        total += 1;
        const r = countRewrites(String(field));
        m += r.mixed;
        f += r.fold;
        if (r.mixed || r.fold) types.add(e.key);
      }
    }
  }
  console.log(
    `[중학 엔진] 칸 ${total} · 대분수 ${m} · 접힘 ${f} · 걸린 유형 ${types.size} / ${registeredTypes().length}`,
  );
}

async function censusElem(): Promise<void> {
  const { elementaryUnits, generateElementaryProblem } =
    await import("../../src/lib/elementary/generate");
  let hit = 0,
    ask = 0,
    askHit = 0,
    total = 0;
  for (const u of elementaryUnits()) {
    for (let s = 0; s < 10; s += 1) {
      let p;
      try {
        p = generateElementaryProblem(u, 20260821 + s * 7919);
      } catch {
        continue;
      }
      total += 1;
      const body = String(p.content ?? "");
      const asks = /(대분수|가분수)로 (나타|고치|바꾸)/.test(body);
      if (asks) ask += 1;
      if (countRewrites(body).mixed > 0) {
        hit += 1;
        if (asks) askHit += 1;
      }
    }
  }
  console.log(
    `[초등 엔진] 발문 ${total} · 전처리가 대분수를 만든 발문 ${hit} · 그중 «대분수/가분수로 나타내시오» ${askHit} / ${ask}`,
  );
  if (ask > 0 && askHit === ask) {
    console.log(
      "  ⚠️ 그 유형은 **전량**이 지면에서 제 답을 보여 준다 — 발문이 곧 정답이다.",
    );
  }
}

async function main(): Promise<void> {
  selfTest();
  const args = process.argv.slice(2);
  const all = args.length === 0;
  if (all || args.includes("--elem")) await censusElem();
  if (all || args.includes("--middle")) await censusMiddle();
  if (all || args.includes("--db")) await censusDb();
}

// 다른 스크립트가 `countRewrites` 만 빌려 갈 때 계량기가 통째로 도는 것을 막는다
// (실제로 시안 스크립트가 이 파일을 import 하자 DB 전수가 한 번 더 돌았다).
const 직접실행 = /census-mixed-number\.(ts|mjs|js)$/.test(
  process.argv[1] ?? "",
);
if (직접실행) void main();
