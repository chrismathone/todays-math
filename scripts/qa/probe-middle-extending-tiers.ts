/**
 * 🔴 **중2 확대 갈래(`심화중`·`심화상`)를 재는 자** — D-116, `src/lib/middle/m2Top.ts`.
 *
 * 브리프 `tracks/briefs/mid-extending-tiers.md` §3 이 「초등이 네 물결에 걸쳐 물린
 * 함정 셋을 **반드시 재라**」고 했다. 이 파일이 그 셋을 잰다. 그리고 넷째로
 * 「값은 맞고 **지면만 흉한**」 부류를 훑는다 — 값 검산으로는 구조적으로 안 잡힌다.
 *
 * ```bash
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --selftest   # 눈금 (양성 10 · 음성 11)
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts              # 전부 (아래 넷을 차례로)
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --smell      # ㈃ 지면 냄새·조사
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --anchor     # ㉠ 굳힘이 자리를 고르는가
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --erase      # ㉡ 조건을 지우면 답이 바뀌는가
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --overlap    # ㉢ 아래 갈래와 겹치는가
 * npx tsx scripts/qa/probe-middle-extending-tiers.ts --dump       # 변이 하네스가 쓰는 산출물 지문
 * ```
 *
 * ## 참이 어디서 오나
 *
 * **엔진**이다 — `generateMiddleProblem` 을 그대로 부른다(적재본이 아니다.
 * 둘은 다른 것이고 고친 시각과 적재한 시각의 순서가 결함의 유무를 정한다,
 * 2026-08-27·08-30). 그리고 ㉠·㉡ 의 «참»은 **제품 상수가 아니라** 이 파일이
 * 문항의 `facts` 에서 후보를 **다시 만들어** 얻는다 — 제품이 쓰는 판단을 그대로
 * 불러오면 「제품이 틀릴수록 좋은 점수」가 된다(2026-08-18).
 *
 * ## ⚠️ 이 자가 못 보는 것 — 정직하게
 *
 * 1. **㉠ 은 «후보 중 하나를 고르는» 갈래에만 선다.** 답이 개수·합인 갈래
 *    (`2-2|경우의 수|91` · `2-2|피타고라스 정리|90`)에는 «어느 후보인가»라는
 *    물음 자체가 없다. 그 갈래에 대한 ㉠ 의 `—` 는 «깨끗»이 아니라 **«잴 축이
 *    없다»** 이다. 대신 ㉡ 로 잰다.
 * 2. **냄새 목록은 손으로 쓴 것이다.** 목록에 없는 부류는 구조적으로 0이 된다
 *    (2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 *    그래서 눈금에 **양성 대조군**을 두어 「이 자가 «예»를 낼 수 있는가」를 먼저
 *    확인하고, 그래도 **자기가 지은 해설은 눈으로 읽으라**고 보고서에 적었다.
 * 3. **㉢ 의 «수+정답» 열쇠에는 천장이 있다.** 그래서 쌍마다 **자기 자신과의
 *    닮음(천장)을 먼저 찍고**, 천장이 낮으면 «겹침 없음»이 아니라 «판정 불가»로
 *    적는다(초6 §7.6).
 */
import { createHash } from "node:crypto";

import {
  registeredTypes,
  generateMiddleProblem,
} from "../../src/lib/middle/generate";
import { eulReul, euroRo, waGwa } from "../../src/lib/middle/m2Josa";
import { isPrime, naturalSolutions } from "../../src/lib/middle/m2Top";
import type { MidProblem } from "../../src/lib/middle/types";
import { isDirectScript } from "../import/isDirectScript";

const SEED_BASE = 20260901;
const SEEDS = 200;
const VARIANTS = [0, 1, 2];

/** 이 자가 맡는 갈래 — 중2 확대 갈래만. 손 목록이 아니라 **등록에서 뽑는다**. */
function topKeys(): string[] {
  return registeredTypes()
    .filter((e) => e.grade === "중2")
    .filter((e) => {
      const p = generateMiddleProblem(e.key, SEED_BASE, 0);
      return p.difficulty === "심화중" || p.difficulty === "심화상";
    })
    .map((e) => e.key);
}

function samples(key: string): MidProblem[] {
  const out: MidProblem[] = [];
  for (let s = 0; s < SEEDS; s += 1) {
    for (const v of VARIANTS) {
      out.push(generateMiddleProblem(key, SEED_BASE + s * 7919, v));
    }
  }
  return out;
}

// ── ㈃ 지면 냄새 · 조사 ──────────────────────────────────

/** 값은 맞고 **지면만 흉한** 부류. 손 목록이라 새는 자리가 있다(머리말 ⚠️2). */
const SMELLS: ReadonlyArray<readonly [RegExp, string]> = [
  // ⚠️ `1\times64`(인수 짝 나열)는 **멀쩡한 표기**다. 잡으려는 것은 «계수 $1$»이므로
  //    뒤에 문자가 오는 것만 문다 — 안 그러면 피타고라스 갈래가 600/600 거짓 경보였다.
  //    **늘 우는 가드는 꺼진다**(2026-08-20).
  //
  //    🔴 그러고도 **앞을 안 봤다.** 3차 물결 `36V` 를 등록하니 `$\dfrac{81\times3y+…}`
  //    의 「$81$」이 걸려 **600 중 67 이 거짓 경보**였다(그 지면은 멀쩡하다). 계수 $1$
  //    이라는 말은 「$1$ 이 **수의 첫 자리**」라는 뜻이므로 앞자리를 막는다 —
  //    `midPage.pageSmells` 의 「계수 1 을 적었다」가 같은 이유로 `(?<![\d.])` 를 단다.
  [/(?<![\d.])1\\times-?\d*[a-zA-Z]/, "계수 1 곱셈기호"],
  [/\+-|\\times-|--/, "부호 겹침"],
  [/\$1[a-zA-Z](?![a-zA-Z0-9])/, "계수 1"],
  [/\\dfrac\{\}|\\dfrac\{[^{}]*\}\{\}/, "빈 분수"],
  [/\*\*/, "마크다운 굵게"],
  [/undefined|NaN|Infinity/, "undefined/NaN"],
  // 🔴 `\s` 는 **줄바꿈을 넘는다.** 그래서 수식만 있는 줄이 잇달으면(`$…$\n$…$`)
  //    「빈 수식」으로 걸렸다 — 32U 해설이 지수를 고쳐 쓰는 두 줄이 그 모양이라
  //    600/600 이 빨갛게 나왔고, 그 지면은 **멀쩡하다.** 늘 우는 가드는 꺼진다
  //    (2026-08-20). 뜻은 「빈 수식」이므로 **같은 줄 안**으로 좁힌다.
  [/\$[ \t]*\$/, "빈 수식"],
  [/\\frac\{(\d+)\}\{\1\}/, "약분 안 한 분수(같은 수)"],
];

/**
 * 「$수$ + 조사」가 읽는 소리와 맞나 — 판정은 **`m2Josa` 한 곳**에서 온다
 * (규칙을 옮겨 적으면 세는 쪽과 고치는 쪽이 갈린다).
 *
 * ⚠️ 조사 뒤에 **공백**을 요구한다. 안 그러면 `$240$가지`(단위 명사)와
 *    `$5$이다`(서술격)를 조사로 잘못 읽는다 — 처음에 그렇게 짰다가
 *    1,505건이 전부 거짓 양성이었다.
 */
export function josaFaults(text: string): string[] {
  const out: string[] = [];
  // ⚠️ **수식 안이 숫자뿐인 것만 보면 안 된다.** 우리 해설은 `$x=24$를` 처럼
  //    쓰므로 「$…$ 의 **끝**에 오는 수」를 봐야 한다. 처음에 `\$(-?\d+)\$` 로
  //    짰다가 눈금의 양성 하나(`$x=27$를`)를 놓쳤다 — 그 눈금이 없었으면
  //    이 자의 「조사 0」은 «깨끗»이 아니라 «못 셈»이었다.
  const re = /\$[^$]*?(-?\d+)\$(을|를|이|가|와|과|으로|로)(?=\s)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const v = Number(m[1]);
    const j = m[2]!;
    let want: string;
    if (j === "을" || j === "를") want = eulReul(v);
    else if (j === "와" || j === "과") want = waGwa(v);
    else if (j === "로" || j === "으로") want = euroRo(v);
    else want = eulReul(v) === "을" ? "이" : "가";
    if (j !== want) out.push(`${m[0].trim()} → ${want}`);
  }
  return out;
}

export function smellFaults(text: string): string[] {
  return SMELLS.filter(([re]) => re.test(text)).map(([, name]) => name);
}

/**
 * 🔴 **정수 경계 걸음을 건너뛰었나** — D-116 계약 ⑹「해설이 걸음을 건너뛰지 않는다」.
 *
 * `$cx\le R$이다.` 에서 `$x\le B$이다.` 로 뛸 때 $R/c$ 가 정수가 아니면 해설은
 * **그 분수와 「$x$는 자연수」를 반드시 적어야** 한다. 안 적으면 쓴 대로 읽었을 때
 * **거짓 함의**다 — 3차 물결 `38V` 의 첫 판이 「$22-2x\ge1$에서 $x\le10$이다」라고
 * 적었는데 그 부등식의 참 해는 $x\le10.5$ 였다(800씨앗 중 574 = 71.8%).
 *
 * **값은 늘 맞으므로** 값 검산·KaTeX·위 냄새 목록·조사 자가 **구조적으로 못 본다.**
 *
 * ⚠️ 못 보는 것 — 이 축이 서는 갈래는 지금 **하나뿐이다**(`38V`, 실측 600문항에
 *    걸음 1,200). 나머지 열둘은 그런 모양을 아예 안 적으므로 그 갈래의 «0» 은
 *    «깨끗»이 아니라 **«잴 것이 없다»** 다. 그래서 `runSmell` 이 걸린 수와 함께
 *    **「걸음 N」을 같이 찍는다** — 0 이 «깨끗»인지 «못 셈»인지 사람이 가르게.
 *
 * ⚠️ 관계 기호를 글에서 **찾아 쓰지 않고** 둘 다 대 본다. 위 경계 줄에는
 *    `\ge`(조건 $y\ge1$)와 `\le`(경계)가 **함께** 있어서, 「어느 쪽인가」를
 *    글자로 물으면 틀린 쪽을 고른다.
 */
const BOUND_STEP = [
  {
    sign: "\\le",
    claim: /\$(\d*)x\\le(\d+)\$이다\./,
    final: /\$x\\le(\d+)\$이다\./g,
    frac: /\$x\\le\\dfrac\{(\d+)\}\{(\d+)\}\$/,
    round: (v: number): number => Math.floor(v),
  },
  {
    sign: "\\ge",
    claim: /\$(\d*)x\\ge(\d+)\$이다\./,
    final: /\$x\\ge(\d+)\$이다\./g,
    frac: /\$x\\ge\\dfrac\{(\d+)\}\{(\d+)\}\$/,
    round: (v: number): number => Math.ceil(v),
  },
] as const;

/** 이 자가 **잴 것을 몇 개나 봤나** — 판정 옆에 같이 찍는다. */
export function boundStepClaims(text: string): number {
  let n = 0;
  for (const line of text.split("\n"))
    for (const P of BOUND_STEP) if (P.claim.test(line)) n += 1;
  return n;
}

export function boundStepFaults(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    for (const P of BOUND_STEP) {
      const claim = P.claim.exec(line);
      if (claim === null) continue;
      const c = claim[1] === "" ? 1 : Number(claim[1]);
      const r = Number(claim[2]);
      const finals = [...line.matchAll(P.final)];
      if (finals.length === 0) {
        out.push(`정수 경계 「$x${P.sign}B$이다.」가 없다`);
        continue;
      }
      const b = Number(finals[finals.length - 1]![1]);
      const exact = r / c;
      if (P.round(exact) !== b) {
        out.push(
          `경계를 ${b} 로 적었는데 ${r}/${c} 에서 참은 ${P.round(exact)}`,
        );
        continue;
      }
      if (Number.isInteger(exact)) continue; // 나누어떨어지면 뛴 걸음이 없다
      const fr = P.frac.exec(line);
      if (fr === null || Number(fr[1]) !== r || Number(fr[2]) !== c) {
        out.push(`참 경계 ${r}/${c} 를 안 적고 정수로 뛰었다`);
        continue;
      }
      if (!line.includes("$x$는 자연수이므로"))
        out.push("「$x$는 자연수」 걸음을 안 적고 정수로 뛰었다");
    }
  }
  return out;
}

function runSmell(keys: string[]): number {
  let faults = 0;
  let total = 0;
  console.log("\n## ㈃ 지면 냄새 · 조사 — 값 검산이 구조적으로 못 보는 부류");
  for (const key of keys) {
    const rows = samples(key);
    const hits: string[] = [];
    const stems = new Set<string>();
    const answers = new Set<string>();
    let boundClaims = 0;
    for (const p of rows) {
      total += 1;
      const text = `${p.content}\n${p.solution}`;
      for (const s of smellFaults(text))
        hits.push(`[${s}] ${text.slice(0, 90)}`);
      for (const j of josaFaults(text)) hits.push(`[조사] ${j}`);
      boundClaims += boundStepClaims(text);
      for (const s of boundStepFaults(text)) hits.push(`[정수 경계] ${s}`);
      stems.add(
        p.content
          .replace(/\$[^$]*\$/g, "◇")
          .replace(/\s+/g, " ")
          .trim(),
      );
      answers.add(p.answer);
    }
    faults += hits.length;
    console.log(
      `  ${hits.length === 0 ? "🟢" : "🔴"} ${key}` +
        ` · 표본 ${rows.length} · 뼈대 ${stems.size} · 서로 다른 정답 ${answers.size}` +
        // 「정수 경계 걸음」을 **몇 개나 봤는지** 같이 찍는다 — 0 이면 그 갈래에서
        // 이 축은 «깨끗»이 아니라 **«잴 것이 없다»** 다.
        ` · 정수 경계 걸음 ${boundClaims}` +
        ` · 걸린 것 ${hits.length}`,
    );
    for (const h of hits.slice(0, 5)) console.log(`      ${h}`);
  }
  console.log(`  표본 ${total} · 걸린 것 ${faults}`);
  return faults;
}

// ── ㉠ 굳힘이 «어느 후보인가»를 고르는가 ─────────────────

/**
 * 후보 목록이 있는 갈래만. 「굳힘 조건을 **안 읽고** 후보의 첫·끝·가운데를 집으면
 * 몇 %가 맞나」를 재고 우연 수준($1/k$)과 견준다.
 *
 * 후보는 `facts` 에서 **다시 만든다** — 제품의 선택을 그대로 불러오면 동어반복이다.
 */
type Candidates = { list: string[]; answerIndex: number };

function candidatesOf(key: string, p: MidProblem): Candidates | null {
  if (key === "2-1|연립일차방정식|91") {
    const pc = p.facts.p!;
    const q = p.facts.q!;
    const n = p.facts.n!;
    const list: string[] = [];
    let answerIndex = -1;
    for (const [x, y] of naturalSolutions(pc, q, n)) {
      if (isPrime(x + y)) answerIndex = list.length;
      list.push(`${x},${y}`);
    }
    return answerIndex < 0 ? null : { list, answerIndex };
  }
  return null;
}

function runAnchor(keys: string[]): void {
  console.log(
    "\n## ㉠ 굳힘이 «어느 후보인가»를 고르는가 (첫·끝을 집으면 맞는 비율 ↔ 우연)",
  );
  for (const key of keys) {
    const rows = samples(key);
    // 🔴 **분모는 «표본»이 아니라 «서로 다른 문항»이다.** 같은 (q, n) 을 마흔 번
    //    뽑아도 새로 아는 것이 없는데, 표본으로 세면 우연 수준과의 차이가
    //    있는 것처럼 보인다(실제로 처음에 그렇게 읽혔다).
    const uniq = new Map<string, MidProblem>();
    for (const p of rows) uniq.set(JSON.stringify(p.facts), p);
    const cs = [...uniq.values()]
      .map((p) => candidatesOf(key, p))
      .filter((c): c is Candidates => c !== null);
    if (cs.length === 0) {
      console.log(
        `  —  ${key} · 후보 목록이 없는 꼴이라 이 축이 안 선다(㉡ 로 잰다)`,
      );
      continue;
    }
    const rate = (f: (c: Candidates) => number): number =>
      cs.filter((c) => f(c) === c.answerIndex).length / cs.length;
    const chance = cs.reduce((s, c) => s + 1 / c.list.length, 0) / cs.length;
    const first = rate(() => 0);
    const last = rate((c) => c.list.length - 1);
    const mid = rate((c) => Math.floor((c.list.length - 1) / 2));
    const pos = new Map<string, number>();
    for (const c of cs) {
      const r = (c.answerIndex / (c.list.length - 1)).toFixed(2);
      pos.set(r, (pos.get(r) ?? 0) + 1);
    }
    const worst = Math.max(first, last);
    console.log(
      `  ${worst <= chance ? "🟢" : "🔴"} ${key} · 표본 ${cs.length} · 우연 ${(chance * 100).toFixed(1)}%` +
        ` · 첫 ${(first * 100).toFixed(1)}% · 끝 ${(last * 100).toFixed(1)}%` +
        ` · 가운데 ${(mid * 100).toFixed(1)}%`,
    );
    console.log(
      `      답의 상대 자리: ` +
        [...pos]
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([k, v]) => `${k}:${v}`)
          .join(" "),
    );
  }
}

// ── ㉡ 굳힘 조건을 지우면 답이 바뀌는가 ──────────────────

/**
 * 갈래마다 «굳힘 조건 하나를 지운 세계»에서 **답이 될 수 있는 값들**을
 * 이 파일이 따로 계산한다.
 *
 * 🔴 판정은 **「값이 하나로 남고 그것이 진짜 답과 같은가」**다. 처음에는
 *    「지운 값 하나가 진짜 답과 같은가」로 셌는데, 그러면 «후보 목록»형
 *    (`|91`)에서 **진짜 답인 후보가 목록에 들어 있다는 이유만으로** 늘 $1/k$ 가
 *    나온다 — 재는 것이 굳힘이 아니라 목록의 크기였다. 조건이 «장식»이라는 말은
 *    **지워도 답이 하나로 그대로 정해진다**는 뜻이다.
 */
type Erasure = { name: string; values: string[] };

/**
 * ⚠️ **왜 내보내나** — 이 자의 모집단은 `registeredTypes()` 다(손 목록이 아니다,
 * `d93eeeed`). 그래서 **리드가 `generate.ts` 에 넣기 전에는** 새 물결의 유형이
 * 여기 안 들어오고, 그 사이 이 표에 적은 줄이 **한 번도 안 돌아 본 채로** 남는다.
 * 「지울 조건을 안 적었다」가 안 뜬다고 «적었다»가 아니다 — 안 세어졌을 뿐이다.
 * 등록 전에도 모듈이 낸 문항을 이 표에 직접 대 볼 수 있게 내보낸다.
 */
export function erasures(key: string, p: MidProblem): Erasure[] {
  const f = p.facts;
  // ── 2차 물결(D-116, 2026-09-02) — 접미사 `U` ────────────────────────────
  if (key === "2-1|유리수와 순환소수|31U") {
    // 굳힘은 「$x$ 가 분자의 홀수 소인수와 **약분된다**」이다. 그것을 지우면
    // 「$x$ 자체가 $2$·$5$ 만으로 이루어져야 한다」가 되어 살아남는 자리가 줄어든다.
    const { den, limit } = f as Record<string, number>;
    const oddPart = (n: number): number => {
      let d = n;
      while (d % 2 === 0) d /= 2;
      while (d % 5 === 0) d /= 5;
      return d;
    };
    let s = 0;
    for (let v = 1; v <= limit!; v += 1) if (oddPart(den! * v) === 1) s += v;
    return [{ name: "약분 축 지움", values: [String(s)] }];
  }
  if (key === "2-1|단항식의 계산|32U") {
    // 굳힘은 「지수를 맞추면 **밑만** 견주면 된다」이다. 그 걸음을 지우고
    // 밑을 그대로 견주면(= 지수를 안 맞추면) 다른 대소가 나와야 한다.
    const { b1, b2, b3 } = f as Record<string, number>;
    const naive = [
      ["a", b1!],
      ["b", b2!],
      ["c", b3!],
    ] as [string, number][];
    naive.sort((x, y) => x[1] - y[1]);
    return [
      {
        name: "지수 맞추기 걸음 지움 (밑만 견줌)",
        values: [`$${naive.map(([n]) => n).join("<")}$`],
      },
    ];
  }
  if (key === "2-1|일차부등식|33U") {
    // 굳힘은 「자연수 해가 **정확히 그 개수**」다. 개수를 안 주면 상수의 범위가
    // 개수마다 통째로 달라져야 한다 — 안 달라지면 그 조건은 장식이다.
    const { total } = f as Record<string, number>;
    const values: string[] = [];
    for (let c = 1; c <= total!; c += 1) values.push(String(total! - c - 1));
    return [{ name: "「해가 N개」 지움", values }];
  }
  // 🔴 이 소단원 이름에는 **가는 공백**(U+2009)이 들어 있다 — 눈으로는 두 칸으로
  //    보이지만 `"그래프  ⑵"` 라고 손으로 치면 **안 맞는다.** 그래서 escape 로 적는다.
  //    처음에 보통 공백 둘로 쳤더니 이 갈래만 「지울 조건을 안 적었다」로 남았다.
  if (key === "2-1|일차함수와 그 그래프  ⑵|34U") {
    // 심화상 — 굳지 않는다. 만나기 «전»과 «뒤» **두 구간을 다 만들어** 견주어야
    // 답이 정해진다. 한 구간만 보면 답이 갈리는 것을 값 둘로 보인다.
    const { head, target, fast, slow } = f as Record<string, number>;
    const rel = fast! - slow!;
    return [
      {
        name: "한 구간만 봄 (후보를 다 안 만듦)",
        values: [
          String((head! - target!) / rel),
          String((head! + target!) / rel),
        ],
      },
    ];
  }
  // ── 3차 물결(D-116, 2026-09-02) — 접미사 `V` ─────────────────────────────
  if (key === "2-1|일차부등식|35V") {
    // 굳힘은 「$x-y$ 의 각 변에 **음수 $-1$ 을 곱해** 부등호의 방향을 바꾼 뒤 더한다」.
    // 그 걸음을 지우면 두 범위를 그대로 빼게 되어 답의 두 끝이 안쪽으로 밀린다.
    //
    // ⚠️ **여기 🟢 은 «측정했다»가 아니라 «그렇게 될 수밖에 없다»** 다. 아래 두 값은
    //    답과 **늘** 다르다 — $truth.lo-\text{지운 값} = \frac{d_2-d_1}2 = \frac w2$ 이고
    //    $w\in\{2,4,6\}$ 이라 $\ge1$, 둘째 것도 늘 $y_1-1$ 이다(400씨앗 358문항 전량
    //    장식 0). 이 갈래에서 「뒤집기가 항등식이 되는 자리」를 실제로 막는 것은
    //    ㉡ 축이 아니라 생성기의 `d1 + d2 === 0` 줄이다(그 줄을 끄면 시험이 빨개진다).
    const { s1, d1, d2 } = f as Record<string, number>;
    return [
      { name: "뒤집기 걸음 지움", values: [String((s1! - d1!) / 2)] },
      // $x-y$ 의 위끝을 안 읽으면(= 흔들면) 답의 왼쪽 끝이 따라 움직인다.
      {
        name: "$x-y$ 의 위끝 흔들기",
        values: [String((s1! - (d2! + 2)) / 2)],
      },
    ];
  }
  if (key === "2-1|연립일차방정식의 활용|36V") {
    // 굳힘은 **전체 평균**이다 — 그것이 두 인원의 비를 정한다. 지우면 비를 모르므로
    // 다음 시험의 전체 평균이 비마다 달라진다(값이 하나로 안 남는다).
    const { avgA, avgB, riseA, riseB } = f as Record<string, number>;
    const values: string[] = [];
    for (let p2 = 1; p2 <= 6; p2 += 1) {
      for (let q2 = 1; q2 <= 6; q2 += 1) {
        const numer = (avgA! + riseA!) * p2 + (avgB! + riseB!) * q2;
        if (numer % (p2 + q2) !== 0) continue;
        values.push(String(numer / (p2 + q2)));
      }
    }
    return [{ name: "전체 평균 지움", values }];
  }
  if (key === "2-1|연립일차방정식|37V") {
    // 굳힘은 **상수항 견주기**다 — 계수비만으로는 후보 둘이 다 산다.
    const { r } = f as Record<string, number>;
    return [{ name: "상수항 견주기 지움", values: [String(r!), String(-r!)] }];
  }
  if (key === "2-1|연립일차방정식의 활용|38V") {
    // 굳힘은 「각 종류를 **적어도 한 개씩**」이다 — 지우면 $x$ 의 창이 양쪽으로
    // 넓어져 가짓수가 달라진다. 소거를 안 쓰고 전수 대입으로 다시 센다.
    const { p1, p2, p3, n, total } = f as Record<string, number>;
    let c = 0;
    for (let x = 0; x <= n!; x += 1) {
      for (let y = 0; x + y <= n!; y += 1) {
        const z = n! - x - y;
        if (p1! * x + p2! * y + p3! * z === total!) c += 1;
      }
    }
    return [{ name: "「각각 적어도 한 개씩」 지움", values: [String(c)] }];
  }
  // ── 4차 물결(D-116, 2026-09-03) — 접미사 `W` ─────────────────────────────
  //
  // ⚠️ 이 넷은 **아직 등록 전일 수 있다**(리드 몫). `topKeys()` 는 `registeredTypes()`
  //    에서 뽑으므로, 등록 전에는 이 네 줄이 **한 번도 안 돌아 본 채로** 남는다 —
  //    「지울 조건을 안 적었다」가 안 뜬다고 «적었다»가 아니다(위 `erasures` 머리말).
  if (key === "2-1|유리수와 순환소수|36W") {
    // 굳힘은 「순환마디의 **합**으로 나눈 **나머지**를 부분합 목록에서 되찾는다」이다.
    // 그 걸음을 지우면 마디를 다 지난 자리에서 멈춰 답이 짧아진다.
    const { times, len, sum, cycle } = f as Record<string, number>;
    const prop = (sum! * len!) / cycle!;
    return [
      { name: "나머지를 되찾는 걸음 지움", values: [String(times! * len!)] },
      {
        name: "비례로 어림 (마디의 평균 숫자로 나눔)",
        values: [
          String(Math.floor(prop)),
          String(Math.round(prop)),
          String(Math.ceil(prop)),
        ],
      },
    ];
  }
  if (key === "2-1|연립일차방정식의 활용|37W") {
    // 굳힘은 「세 식을 변끼리 더하면 좌변이 **두 배**가 된다」이다. 그 걸음을 지우면
    // 답이 두 배가 된다.
    //
    // ⚠️ `answerNumber` 는 정답 문자열의 **첫 수**(= 분자)만 읽는다. 그래서 지운 값도
    //    **답과 같은 분모로 맞춘 분자**로 낸다 — 안 그러면 꼴이 달라 영영 안 맞고,
    //    그 축은 «늘 🟢» 이 되어 아무것도 안 잰다.
    const { p: pp, q: qq, r: rr } = f as Record<string, number>;
    const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
    const l = (a: number, b: number): number => (a / g(a, b)) * b;
    const M = l(l(pp!, qq!), rr!);
    const sumNum = M / pp! + M / qq! + M / rr!;
    const td = (2 * M) / g(sumNum, 2 * M);
    return [
      {
        name: "반으로 나누는 걸음 지움 (답의 분모로 맞춘 분자)",
        values: [String((sumNum * td) / M)],
      },
    ];
  }
  if (key === "2-1|일차부등식의 활용|38W") {
    // 굳지 않는다 — 후보 셋을 **쌍마다** 견주어야 창이 양쪽에서 닫힌다. 한 쌍만
    // 견주면 창이 한쪽으로 열려 개수가 달라진다. 금액을 **직접 계산**해 다시 센다.
    const { p0, p1, p2, s0, s1, s2, ask, freeIdx, cheapIdx } = f as Record<
      string,
      number
    >;
    const price = [p0!, p1!, p2!];
    const ship = [s0!, s1!, s2!];
    const cost = (i: number, x: number): number => price[i]! * x + ship[i]!;
    const countAgainst = (foes: number[]): number => {
      let c = 0;
      for (let x = 1; x <= 400; x += 1)
        if (foes.every((foe) => cost(ask!, x) < cost(foe, x))) c += 1;
      return c;
    };
    return [
      {
        name: "배송료 없는 가게 한 쪽만 견줌",
        values: [String(countAgainst([freeIdx!]))],
      },
      {
        name: "단가가 가장 싼 가게 한 쪽만 견줌",
        values: [String(countAgainst([cheapIdx!]))],
      },
    ];
  }
  if (key === "2-1|일차함수와 그 그래프  ⑴|39W") {
    // 굳지 않는다 — 후보가 여럿 살아남는다. 지울 것은 「$x$절편이 **자연수**」라는
    // 조건이다. 「정수」로 늦추면 부호가 반대인 $a$ 까지 살아나 절편이 짝을 이루고
    // 합이 $0$ 이 된다.
    return [{ name: "«자연수» 를 «정수» 로 늦춤", values: ["0"] }];
  }
  if (key === "2-1|연립일차방정식|90") {
    // 비 조건을 지운다 — 비를 모르면 $k$ 가 안 굳고 $m$ 도 안 굳어야 한다.
    const { ca, cb, u, v, c, d } = f as Record<string, number>;
    const values: string[] = [];
    for (let p2 = 1; p2 <= 8; p2 += 1) {
      for (let q2 = p2 + 1; q2 <= 9; q2 += 1) {
        const num = ca! * q2 + cb! * p2;
        if (num % (q2 - p2) !== 0) continue;
        const k2 = num / (q2 - p2);
        values.push(String((u! * v! * d! - v! * k2 + u! * (k2 - c!)) / v!));
      }
    }
    return [{ name: "비 조건 지움", values }];
  }
  if (key === "2-1|연립일차방정식|91") {
    // 「$x+y$ 가 소수」를 지운다 — 후보 어느 것이나 답이 될 수 있어야 한다.
    const values = naturalSolutions(f.p!, f.q!, f.n!).map(([x, y]) =>
      String(x * y),
    );
    return [{ name: "「합이 소수」 지움", values }];
  }
  if (key === "2-2|경우의 수|90") {
    const base = f.base!;
    const n = f.n!;
    const orderSize = f.orderSize!;
    const fact = (x: number): number => (x <= 1 ? 1 : x * fact(x - 1));
    return [
      // 이웃 조건을 지우면 나눌 밑이 $n!$ 이 된다.
      { name: "이웃 조건 지움", values: [String(fact(n) / fact(orderSize))] },
      // 순서 조건을 지우면 나누지 않는다.
      { name: "순서 조건 지움", values: [String(base)] },
    ];
  }
  if (key === "2-2|경우의 수|91") {
    return [
      { name: "조건 (가) 지움", values: [String(f.onlyB!)] },
      { name: "조건 (나) 지움", values: [String(f.onlyA!)] },
    ];
  }
  if (key === "2-2|피타고라스 정리|90") {
    // 해설의 「$c+b$, $c-b$ 가 둘 다 짝수」 걸음을 지운다 — 그 걸음 없이
    // $a^2$ 의 인수 짝을 그대로 세면 $b$, $c$ 가 자연수가 아닌 것까지 딸려 온다.
    const a = f.a!;
    const ask = f.ask!;
    const naive: { b: number; c: number }[] = [];
    for (let m = 1; m * m < a * a; m += 1) {
      if ((a * a) % m !== 0) continue;
      const n2 = (a * a) / m;
      naive.push({ b: (n2 - m) / 2, c: (n2 + m) / 2 });
    }
    const value =
      ask === 0
        ? String(naive.length)
        : ask === 1
          ? String(naive.reduce((s, t) => s + (a * t.b) / 2, 0))
          : String(naive.reduce((s, t) => s + t.c, 0));
    return [{ name: "「둘 다 짝수」 걸음 지움", values: [value] }];
  }
  return [];
}

/** 정답 문자열에서 수만 뽑는다 — `$840\,\mathrm{cm}^2$` → `840`. (내보내는 까닭은 `erasures` 와 같다.) */
export function answerNumber(answer: string): string {
  const m = /-?\d+/.exec(answer.replace(/\\,\\mathrm\{cm\}(\^2)?/g, ""));
  return m ? m[0] : answer;
}

function runErase(keys: string[]): number {
  console.log(
    "\n## ㉡ 굳힘 조건을 지우면 답이 바뀌는가 (안 바뀌면 그것은 장식이다)",
  );
  let dead = 0;
  for (const key of keys) {
    const rows = samples(key);
    // 같은 문항을 되풀이해 세면 분모만 부푼다 — **서로 다른 문항**으로 센다.
    const seen = new Map<string, MidProblem>();
    for (const p of rows) seen.set(JSON.stringify(p.facts), p);
    const distinct = [...seen.values()];
    const byName = new Map<
      string,
      { checked: number; decor: number; eg: string }
    >();
    for (const p of distinct) {
      const real = answerNumber(p.answer);
      for (const e of erasures(key, p)) {
        const uniq = new Set(e.values);
        const decorative = uniq.size === 1 && [...uniq][0] === real;
        const row = byName.get(e.name) ?? { checked: 0, decor: 0, eg: "" };
        row.checked += 1;
        if (decorative) {
          row.decor += 1;
          if (row.eg === "") row.eg = `${JSON.stringify(p.facts)} → ${real}`;
        }
        byName.set(e.name, row);
      }
    }
    if (byName.size === 0) {
      console.log(
        `  🔴 ${key} · 지울 조건을 안 적었다 — 이 줄은 «깨끗»이 아니다`,
      );
      dead += 1;
      continue;
    }
    for (const [name, row] of byName) {
      const rate = (row.decor / row.checked) * 100;
      if (rate > 0) dead += 1;
      console.log(
        `  ${rate === 0 ? "🟢" : "🔴"} ${key} · [${name}] 서로 다른 문항 ${row.checked}건 중` +
          ` 지워도 답이 하나로 그대로인 것 ${row.decor} (${rate.toFixed(1)}%)`,
      );
      if (row.eg !== "") console.log(`      ${row.eg}`);
    }
  }
  return dead;
}

// ── ㉢ 아래 갈래와 겹치는가 ──────────────────────────────

const KOREAN_WORD = /[가-힣]{2,}/g;

function koreanWords(content: string): Set<string> {
  return new Set(content.replace(/\$[^$]*\$/g, " ").match(KOREAN_WORD) ?? []);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** «지면 수 + 정답» 열쇠 — 작은 집합에서 잘 듣지만 **천장이 있다**. */
function numberKey(p: MidProblem): Set<string> {
  const nums = `${p.content} ${p.answer}`.match(/-?\d+/g) ?? [];
  return new Set(nums);
}

/** 내보내는 까닭은 `erasures` 와 같다 — 등록 전에도 새 물결을 이 자로 재 볼 수 있게. */
export function overlapPair(
  as: MidProblem[],
  bs: MidProblem[],
): {
  word: number;
  num: number;
} {
  let word = 0;
  let num = 0;
  for (const a of as) {
    for (const b of bs) {
      word = Math.max(
        word,
        jaccard(koreanWords(a.content), koreanWords(b.content)),
      );
      num = Math.max(num, jaccard(numberKey(a), numberKey(b)));
    }
  }
  return { word, num };
}

function runOverlap(keys: string[]): void {
  console.log(
    "\n## ㉢ 아래 갈래와 겹치는가 — 같은 소단원의 `응용`·`심화하` 전량과 견준다",
  );
  const OVERLAP_SEEDS = [SEED_BASE, 7, 4242, 99991, 31337];
  const few = (key: string): MidProblem[] =>
    OVERLAP_SEEDS.map((s) => generateMiddleProblem(key, s, 0));
  const entries = registeredTypes();
  for (const key of keys) {
    const mine = few(key);
    const me = entries.find((e) => e.key === key)!;
    // 천장 — 자기 자신을 다른 씨앗으로. 이 값보다 낮은 «겹침 없음»은 판정 불가다.
    const half = Math.ceil(mine.length / 2);
    const ceil = overlapPair(mine.slice(0, half), mine.slice(half));
    const neighbours = entries.filter(
      (e) =>
        e.key !== key &&
        e.unitSection === me.unitSection &&
        e.rpmMinor === me.rpmMinor,
    );
    let worstWord = { key: "", v: 0 };
    let worstNum = { key: "", v: 0 };
    let scanned = 0;
    for (const nb of neighbours) {
      let rows: MidProblem[];
      try {
        rows = few(nb.key);
      } catch {
        continue;
      }
      const tier = rows[0]!.difficulty;
      if (tier !== "응용" && tier !== "심화하" && tier !== "기본") continue;
      scanned += 1;
      const r = overlapPair(mine, rows);
      if (r.word > worstWord.v) worstWord = { key: nb.key, v: r.word };
      if (r.num > worstNum.v) worstNum = { key: nb.key, v: r.num };
    }
    // 낱말 Jaccard 의 눈금은 브리프 §3 ㉢ 이 준 실측이다 —
    // 진짜 겹침 0.94~0.97 · 무관 0.03~0.06. 그 사이는 «살펴볼 것»이다.
    const verdictWord =
      worstWord.v >= 0.8 ? "🔴겹침" : worstWord.v >= 0.6 ? "🟡살펴볼것" : "🟢";
    // 🔴 «수+정답» 은 천장이 낮으면 못 가른다. 그리고 **남과 더 닮으면**
    //    그 열쇠는 겹침이 아니라 «작은 정수를 쓴다»는 사실을 재고 있는 것이다.
    const verdictNum =
      ceil.num < 0.5 || worstNum.v > ceil.num ? "⚪판정불가" : "🟢";
    console.log(
      `  ${key} · 이웃 ${scanned}유형 · 천장(자기 자신) 낱말 ${ceil.word.toFixed(2)} / 수 ${ceil.num.toFixed(2)}`,
    );
    console.log(
      `      ${verdictWord} 낱말 Jaccard 최대 ${worstWord.v.toFixed(2)} ← ${worstWord.key || "(없음)"}`,
    );
    console.log(
      `      ${verdictNum} 수+정답 최대 ${worstNum.v.toFixed(2)} ← ${worstNum.key || "(없음)"}`,
    );
  }
}

// ── 눈금 — 이 자가 «예»를 낼 수 있나 ────────────────────

/**
 * **양성 6 · 음성 6.** 음성이 없으면 재현율만 재고 거짓 경보는 구조적으로 0이 된다
 * (2026-08-20 「판정자의 성적표에는 양성과 음성 대조군이 둘 다 있어야 한다」).
 */
const CALIBRATION: ReadonlyArray<
  readonly [string, boolean, "smell" | "josa" | "bound", string]
> = [
  ["$2a+b=1\\times4t$이다.", true, "smell", "1× 곱셈기호"],
  [
    "$\\dfrac{81\\times3y+72y}{3y+y}$이다.",
    false,
    "smell",
    "「$81$」의 끝자리 $1$ 은 계수가 아니다 (36V 가 600 중 67 걸리던 자리)",
  ],
  ["$x=3+-4$이다.", true, "smell", "부호 겹침"],
  ["$\\dfrac{5}{}$이다.", true, "smell", "빈 분수"],
  ["여기는 **굵게** 썼다.", true, "smell", "마크다운 굵게"],
  ["$x=27$를 대입하면", true, "josa", "27 → 을"],
  ["양변에 $6$를 곱하면", true, "josa", "6 → 을"],
  ["$2a+b=4t$이고 $a-b=t$이다.", false, "smell", "멀쩡하다"],
  // 🔴 「빈 수식」 규칙의 눈금 — 양성은 남기고 **줄바꿈 오탐만** 죽였다.
  ["값은 $$이다.", true, "smell", "빈 수식 — 정말 비었다"],
  ["값은 $ $이다.", true, "smell", "빈 수식 — 같은 줄에 `$ $`"],
  [
    "$b=7^{30}=49^{15}$\n$c=2^{60}=16^{15}$",
    false,
    "smell",
    "수식만 있는 줄이 잇달을 뿐 — 빈 수식이 아니다 (32U 가 600/600 걸리던 자리)",
  ],
  [
    "$240$가지이므로 $480$가지를 둘로 나눈다.",
    false,
    "josa",
    "「가지」는 조사가 아니다",
  ],
  ["$x=5$이다.", false, "josa", "「이다」는 조사가 아니다"],
  ["$x=27$을 대입하면", false, "josa", "27 → 을 (맞다)"],
  ["양변에 $6$을 곱하면", false, "josa", "6 → 을 (맞다)"],
  ["$a:b=5:4$로 하나뿐이므로", false, "josa", "4 → 로 (맞다)"],
  // 🔴 정수 경계 걸음의 눈금 — 양성 둘·음성 셋.
  [
    "$y=22-2x$이고 $y\\ge1$이므로 $22-2x\\ge1$, 곧 $2x\\le21$이다. 양변을 $2$로 나누면 $x\\le10$이다.",
    true,
    "bound",
    "$21/2$ 를 안 적고 정수로 뛰었다 (38V 첫 판의 지면)",
  ],
  [
    "또 $z=2x-12$이고 $z\\ge1$이므로 $2x\\ge13$이다. 양변을 $2$로 나누면 $x\\ge\\dfrac{13}{2}$이고, $x$는 자연수이므로 $x\\ge6$이다.",
    true,
    "bound",
    "걸음은 적었는데 올림을 잘못했다 ($13/2$ 의 참은 $7$)",
  ],
  [
    "$y=22-2x$이고 $y\\ge1$이므로 $22-2x\\ge1$, 곧 $2x\\le21$이다. 양변을 $2$로 나누면 $x\\le\\dfrac{21}{2}$이고, $x$는 자연수이므로 $x\\le10$이다.",
    false,
    "bound",
    "걸음을 다 적었다",
  ],
  [
    "또 $z=x-7$이고 $z\\ge1$이므로 $x\\ge8$이다.",
    false,
    "bound",
    "계수가 $1$ 이라 나누는 걸음 자체가 없다",
  ],
  [
    "$y=22-3x$이고 $y\\ge1$이므로 $22-3x\\ge1$, 곧 $3x\\le21$이다. 양변을 $3$으로 나누면 $x\\le7$이다.",
    false,
    "bound",
    "나누어떨어지면 적을 걸음이 없다",
  ],
];

function runSelftest(): number {
  console.log("## 눈금 — 이 자가 «예»와 «아니오»를 둘 다 낼 수 있나");
  let wrong = 0;
  for (const [text, expected, kind, why] of CALIBRATION) {
    const got =
      kind === "smell"
        ? smellFaults(text).length > 0
        : kind === "josa"
          ? josaFaults(text).length > 0
          : boundStepFaults(text).length > 0;
    const ok = got === expected;
    if (!ok) wrong += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} [${kind}] ${expected ? "양성" : "음성"} — ${why}` +
        `${ok ? "" : `  (얻은 값 ${got})`}`,
    );
  }
  // 살아 있는 검출기 수 — 0 이면 「깨끗」이 아니라 「못 셈」이다.
  console.log(`  눈금 ${CALIBRATION.length}건 중 어긋난 것 ${wrong}`);
  return wrong;
}

/**
 * 변이 하네스가 **「산출물이 바뀌었나」**(브리프 §3 ㉣ ⑵)를 물을 때 쓰는 지문.
 *
 * 🔴 파일이 바뀌는 것과 **동작이 바뀌는 것**은 다르다. ⑵ 를 건너뛰면
 *    「가드가 아니다」가 거짓말이 되고 **멀쩡한 가드를 의심하고 고치러 간다**
 *    — 가드가 없는 것보다 나쁘다(2026-08-21).
 */
function runDump(keys: string[]): void {
  for (const key of keys) {
    const h = createHash("sha1");
    for (const p of samples(key)) {
      h.update(`${p.content} ${p.answer} ${p.solution} `);
      h.update(`${p.difficulty} ${JSON.stringify(p.facts)}\n`);
    }
    console.log(`${h.digest("hex").slice(0, 16)}  ${key}`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const only = (name: string): boolean =>
    args.includes(`--${name}`) || args.length === 0;

  if (args.includes("--selftest")) {
    process.exitCode = runSelftest() === 0 ? 0 : 1;
    return;
  }
  if (args.includes("--dump")) {
    runDump(topKeys());
    return;
  }

  const keys = topKeys();
  console.log(`중2 확대 갈래 ${keys.length}유형 — ${keys.join(", ")}`);
  if (keys.length === 0) {
    console.log("🔴 확대 갈래가 하나도 없다 — 아래 판정은 전부 «못 셈»이다");
    process.exitCode = 1;
    return;
  }

  let bad = 0;
  if (only("smell")) bad += runSmell(keys);
  if (only("anchor")) runAnchor(keys);
  if (only("erase")) bad += runErase(keys);
  if (only("overlap")) runOverlap(keys);
  process.exitCode = bad === 0 ? 0 : 1;
}

if (isDirectScript(import.meta.url)) main();
