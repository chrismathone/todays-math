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
import {
  survivingNumbers,
  swapDiffNumbers,
} from "../../src/lib/middle/m2Top5c";
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

  // ── 5차 물결(D-116, 2026-09-04) — 접미사 `X` ─────────────────────────────
  if (key === "2-2|피타고라스 정리|109X") {
    // 굳힘은 「막대 다섯에서 만들 수 있는 세 짝 열 개를 **다 견주어** 직각인 것을
    // 남김없이 찾는다」다. 첫 직각삼각형에서 멈추면 그 하나의 넓이만 나온다.
    //
    // ⚠️ **여기 🟢 은 «측정했다»가 아니라 «그렇게 될 수밖에 없다»** 다 — 넓이는
    //    늘 양수라 부분합이 전체합과 같을 수 없다(3차 `35V` 가 선 자리와 같다).
    //    이 갈래에서 「다 찾는다」를 실제로 지키는 것은 생성기의 `rights.length !== 2`
    //    와 `hitCount !== 2` 두 줄이고, 그것은 갈래의 자기 시험이 문다.
    const { area1 } = f as Record<string, number>;
    return [
      { name: "첫 직각삼각형에서 멈춤 (다 안 셈)", values: [String(area1)] },
    ];
  }
  if (key === "2-2|도형의 닮음|110X") {
    // 굳힘은 「닮음비가 $k$ 이면 **부피비는 $k^{3}$**」이다. 그 세제곱을 안 쓰면
    // 조각이 다 같은 부피로 보여, 물은 조각의 부피가 **주어진 조각과 같아진다.**
    // $i$ 와 $j$ 가 다르고 세제곱 차 $i^{3}-(i-1)^{3}$ 는 $i$ 마다 다르므로 늘 갈린다.
    const { given } = f as Record<string, number>;
    return [
      { name: "부피비를 닮음비의 세제곱으로 안 봄", values: [String(given)] },
    ];
  }
  if (key === "2-1|일차부등식의 활용|111X") {
    // 굳힘은 「$m$배가 두 경계 사이」라는 **부등식 둘이 후보를 자른다**는 것이다.
    // 그것을 지우면 자리 조건만 남아 후보 **전체**의 합이 답이 된다.
    //
    // 후보 목록은 `facts` 에 없지만 되만들 수 있다 — 두 자리 수 $10a+b$ 의 자리를
    // 바꾼 차가 $9(a-b)$ 이므로 `d/9` 가 곧 자리 숫자의 차다. 바꾼 수가 큰지
    // 작은지는 facts 에 없어서 **두 방향을 다 대 보고 살아남는 합이 답과 같은
    // 쪽**을 고른다(추론이 아니라 맞춰 보는 것이다).
    const { x, d, m, low, high } = f as Record<string, number>;
    const sum = (xs: readonly number[]): number =>
      xs.reduce((a, b) => a + b, 0);
    for (const larger of [true, false]) {
      const cands = swapDiffNumbers(d! / 9, larger);
      if (sum(survivingNumbers(cands, m!, low!, high!)) !== x!) continue;
      return [
        {
          name: "부등식 걸음 지움 (후보를 안 자름)",
          values: [String(sum(cands))],
        },
      ];
    }
    // 되만들기가 실패하면 «깨끗»이라 하지 않는다 — 빈 목록을 내면 위에서
    // 「지울 조건을 안 적었다」로 빨개진다.
    return [];
  }
  // 🔴 소단원 이름의 **가는 공백**(U+2009) 주의 — 위 `34U` 머리말과 같은 자리다.
  if (key === "2-1|일차함수와 그 그래프  ⑵|112X") {
    // 굳힘은 「**빠진 사분면**이 $a$·$b$ 의 부호를 정한다」다. 그것을 지우면 부호가
    // 안 정해지고, 합 $b\dfrac{a-1}{a}$ 의 **크기가 둘로 갈린다** —
    // $a=p$ 면 $\dfrac{q(p-1)}{p}$, $a=-p$ 면 $\dfrac{q(p+1)}{p}$ 다
    // ($\gcd(p,q)=1$ 이고 $\gcd(p\pm1,p)=1$ 이라 분자가 곧 기약 분자다).
    //
    // ⚠️ **정직하게 적어 둘 것** — 이 자의 견줌은 `answerNumber` 가 뽑는 «첫 정수»,
    //    곧 분자의 **크기**다. 그래서 $b$ 의 부호만 뒤집힌 경우는 크기가 같아
    //    이 축이 **구조적으로 못 본다.** 여기서 실제로 갈라 주는 것은 $a$ 의
    //    부호이고, 값을 둘 내놓는 것은 「지우면 답이 하나로 안 정해진다」는
    //    사실을 그대로 적은 것이다(2차 `34U` 가 선 자리와 같다).
    const { p: pp, q: qq } = f as Record<string, number>;
    return [
      {
        name: "사분면으로 부호를 정하는 걸음 지움",
        values: [String(qq! * (pp! - 1)), String(qq! * (pp! + 1))],
      },
    ];
  }
  // ══ 5차 물결 중2 — 갈래 a·b·d·e (2026-09-04) ═══════════════════
  //
  // ⚠️ 값은 «굳힘을 지웠을 때 나오는 답»이고, `answerNumber` 가 읽는 것은
  //    **정답의 첫 정수**(분수면 분자)다. 그래서 분수 답의 지운 값도 분자로 적는다.

  if (key === "2-2|확률|101X") {
    // 굳힘은 「셋 중 둘이 맞히는 갈래가 셋이고 그 셋을 다 세워 더한다」.
    // 한 갈래에서 멈추면 그 갈래의 분자 하나만 남는다(분모는 같다).
    const { t1, t2, t3 } = f as Record<string, number>;
    return [
      {
        name: "한 갈래에서 멈춤 (셋을 안 더함)",
        values: [String(t1), String(t2), String(t3)],
      },
    ];
  }
  if (key === "2-2|평행선 사이의 선분의 길이의 비|102X") {
    // 굳힘은 「대응하는 세 변의 비가 같으므로 둘레의 비도 같은 비」다.
    // 지우면 둘레를 길이로 곧장 읽어 «둘레의 차»를 답으로 낸다.
    const { whole, small } = f as Record<string, number>;
    return [
      {
        name: "둘레의 비를 안 쓰고 둘레의 차를 답으로",
        values: [String(whole - small)],
      },
    ];
  }
  if (key === "2-1|연립일차방정식의 활용|103X") {
    // 굳힘은 가감법이다. 생성기가 「단순평균으로 읽은 값」을 `naive` 로 적어 두고
    // 그것이 참 답과 다른 판만 낸다 — 그 값을 그대로 쓴다(규칙을 옮겨 적지 않는다).
    const { naive } = f as Record<string, number>;
    return [{ name: "가감법 대신 단순평균으로 읽음", values: [String(naive)] }];
  }
  if (key === "2-2|평행선 사이의 선분의 길이의 비|104X") {
    // 굳지 않는다 — 배수 목록을 만들어 삼각형이 되는 범위로 거른 뒤 남은 것을 다 더한다.
    const { first, last } = f as Record<string, number>;
    return [
      { name: "첫 후보에서 멈춤 (다 안 더함)", values: [String(first)] },
      { name: "끝 후보만 봄", values: [String(last)] },
    ];
  }
  if (key === "2-2|삼각형의 외심과 내심|105X") {
    // 굳힘은 「외심이면 세 삼각형이 이등변이라 여섯 각이 두 개씩 묶인다」이고,
    // 그 결과가 「중심각은 원주각의 두 배」다. 두 배를 잊으면 꼭지각 그대로가 나온다.
    const { vertexAngle } = f as Record<string, number>;
    return [
      { name: "두 배를 잊음 (꼭지각 그대로)", values: [String(vertexAngle)] },
    ];
  }
  if (key === "2-1|일차부등식의 활용|106X") {
    // 굳힘은 일차부등식 둘이 만드는 닫힌 범위다. 한쪽 경계를 잘못 잡으면 하나를 더 센다.
    const { deadX } = f as Record<string, number>;
    return [{ name: "경계를 잘못 잡아 하나 더 셈", values: [String(deadX)] }];
  }
  if (key === "2-1|일차함수와 그 그래프  ⑴|107X") {
    // 굳지 않는다 — 살아남는 짝을 다 세우고 각각의 함숫값을 더해야 한다.
    const { first, last } = f as Record<string, number>;
    return [
      { name: "첫 후보에서 멈춤 (다 안 더함)", values: [String(first)] },
      { name: "끝 후보만 봄", values: [String(last)] },
    ];
  }
  if (key === "2-2|여러 가지 사각형|108X") {
    // 굳지 않는다 — 약수 짝을 다 적고 「차가 D 이상」으로 거른 뒤 남은 합을 견준다.
    // 거르지 않으면 버려야 할 짝의 합이 더 작아 그것을 고른다.
    const { deadMin } = f as Record<string, number>;
    return [
      { name: "거르지 않고 가장 작은 합을 고름", values: [String(deadMin)] },
    ];
  }
  if (key === "2-2|삼각형의 성질|113X") {
    // 굳힘은 각의 이등분선의 성질(두 변까지의 거리가 같다)이다. 지우면 D 를 밑변의
    // 중점으로 보아 두 조각의 넓이를 같게 놓는다.
    // ⚠️ 지면은 절반이 정수면 정수로, 아니면 분수로 적힌다 — 첫 정수가 갈리므로
    //    두 꼴을 나누어 적는다(안 나누면 홀수 판에서 이 자가 헛돈다).
    const { whole } = f as Record<string, number>;
    return [
      {
        name: "이등분선의 성질을 안 씀 (두 조각을 같게 봄)",
        values: [whole! % 2 === 0 ? String(whole! / 2) : String(whole)],
      },
    ];
  }
  if (key === "2-2|경우의 수|114X") {
    // 굳힘은 「두 번 센 것은 최소공배수의 배수」다. 지우면 두 개수를 그냥 더해
    // 겹친 것을 두 번 센다.
    const { n, cp, cq } = f as Record<string, number>;
    return [
      {
        name: "겹친 것을 안 뺌 (합의 법칙의 전제를 지움)",
        values: [String(n! - (cp! + cq!))],
      },
    ];
  }
  if (key === "2-1|연립일차방정식|115X") {
    // 굳지 않는다 — M 의 약수를 다 세우고 해가 창 안인지 걸러야 한다.
    // 지우면 거르지 않고 모든 약수를 더한다(후보 목록은 facts 에 없지만 되만든다).
    const { m, b } = f as Record<string, number>;
    let all = 0;
    for (let d = 1; d <= m!; d += 1) if (m! % d === 0) all += d + b!;
    return [{ name: "거르지 않고 약수를 다 더함", values: [String(all)] }];
  }
  if (key === "2-2|평행사변형|116X") {
    // 굳지 않는다 — 180 의 약수를 다 세우고 두 번 걸러 남은 것을 더한다.
    const { smallest, largest } = f as Record<string, number>;
    return [
      { name: "하나만 구하고 멈춤 (가장 큰 것)", values: [String(smallest)] },
      { name: "하나만 구하고 멈춤 (가장 작은 것)", values: [String(largest)] },
    ];
  }
  if (key === "2-2|도형의 닮음|117X") {
    // 굳힘은 SAS 닮음으로 «어느 두 삼각형이 닮았는지»를 하나로 정하는 것이다.
    // 지우면 대응을 거꾸로 잡아 비가 뒤집힌다.
    const { ratioDen, bc } = f as Record<string, number>;
    return [
      {
        name: "대응을 거꾸로 잡아 닮음비를 뒤집음",
        values: [String(ratioDen! * bc!)],
      },
    ];
  }
  if (key === "2-1|일차부등식|118X") {
    // 굳지 않는다 — 부호가 셋으로 갈리고 살아남는 값이 여럿이라 다 세어 더해야 한다.
    const { lo, hi } = f as Record<string, number>;
    return [
      { name: "하나만 세고 멈춤 (작은 쪽)", values: [String(lo)] },
      { name: "하나만 세고 멈춤 (큰 쪽)", values: [String(hi)] },
    ];
  }
  if (key === "2-1|일차함수와 그 그래프  ⑵|119X") {
    // 굳지 않는다 — 기준 점에서 나머지 셋으로 가는 기울기를 다 구해 견주어야
    // «어느 점이 직선 밖인지»가 나온다. 그 걸음을 지우면 기준 점을 그대로 쓰고,
    // 그때의 y절편이 곧 그 직선 자신의 y절편이다(생성기가 `lineIntercept` 로 적어 둔다).
    const { lineIntercept } = f as Record<string, number>;
    return [
      {
        name: "직선 밖의 점을 안 가림 (기준 점을 그대로 씀)",
        values: [String(lineIntercept)],
      },
    ];
  }
  if (key === "2-2|평행사변형|120X") {
    // 굳힘은 「두 대각선이 서로 다른 것을 이등분하면 평행사변형」이라 «어느 두 선분이
    // 같은가»를 하나로 정하는 것이다. 지우면 다른 짝을 같다고 놓아 x 가 달라진다.
    // 되만들기가 안 되면(기울기가 같아 해가 없으면) 빈 목록을 낸다 — 지어내지 않는다.
    const { p1, q1, p2, q2, p3, q3, p4, q4 } = f as Record<string, number>;
    const out: Erasure[] = [];
    for (const [pa, qa, pb, qb, nm] of [
      [p1!, q1!, p4!, q4!, "1과 4를 같다고 놓음"],
      [p3!, q3!, p2!, q2!, "3과 2를 같다고 놓음"],
    ] as [number, number, number, number, string][]) {
      if (pa === pb) continue;
      const t = (qb - qa) / (pa - pb);
      if (!Number.isInteger(t) || t <= 0) continue;
      const ae = pa * t + qa;
      const ec = p3! * t + q3!;
      if (ae <= 0 || ec <= 0) continue;
      out.push({
        name: `다른 짝을 같다고 놓음 (${nm})`,
        values: [String(2 * (ae + ec))],
      });
    }
    return out;
  }

  // ══ 5차 물결 중2 — 갈래 f·g·h·i·j (2026-09-04) ═══════════════════
  //
  // 갈래마다 **다른 사람이** 재서 적었다. 각자 자기 파일에만 쓰고 리드가 한 번에
  // 붙였다 — 다섯이 이 파일을 같이 고치면 말없이 덮어쓴다(오늘 실제로 겪었다).
  // ══ 5차 물결 중2 — 갈래 f (2026-09-04) ═══════════════════════════
  //
  // ⚠️ 값은 «굳힘을 지웠을 때 나오는 답»이고, `answerNumber` 가 읽는 것은
  //    **정답의 첫 정수**다. `121X`·`122X` 는 넓이·길이라 그 정수가 곧 답이고,
  //    `123X` 는 합, `124X` 는 단항식의 **계수**다(모듈 계약 ⑹.2 가 그렇게 못 박는다).
  //
  // ⚠️ **지운 값이 정수로 안 떨어지는 갈래가 둘 있다**(`121X`·`122X` — 실측으로
  //    `121X` ⒜ 는 161 중 7, ⒝ 는 23, `122X` ⒜ 는 123 중 4 만 정수다). 그때
  //    `19.8` 같은 부동소수 글자를 내면 「꼴이 달라 영영 안 맞는」 축이 되어
  //    **늘 🟢 이면서 아무것도 안 재게** 된다(4차 `37W` 가 적어 둔 함정). 그래서
  //    ㉠ 값을 **정확한 유리수**(`"198/10"`)로 내어 부동소수 오차를 아예 없애고,
  //    ㉡ 「같아질 수 없다」를 **대수로** 따로 증명해 아래 주석에 적고,
  //    ㉢ 갈래마다 **정수로 떨어지는 축을 하나씩 더** 두었다(`121X` 의 「$3$ 으로 안
  //    나눔」, `122X` 의 「마무리 곱셈 지움」). 그 축들은 꼴이 같은 자리에서 잰다.

  if (key === "2-2|삼각형의 무게중심|121X") {
    // 이 유형이 재는 마디는 셋이다. 값은 `facts` 에서 **다시 세운다** — 제품 함수
    // (`centroidPieceArea`)를 부르지 않는다(부르면 제품이 틀릴수록 좋은 점수가
    // 된다, 2026-08-18).
    //
    // 참: $[\mathrm{AMGN}]=\dfrac12\cdot\dfrac13S+\dfrac{m}{m+n}\cdot\dfrac13S
    //     =\dfrac{3m+n}{6(m+n)}S$ 이고 답은 $\dfrac13S=\dfrac{2(m+n)}{3m+n}s$ 다.
    //
    // ⒜ $\mathrm{M}$ 이 **중점**임을 잊으면 $[\mathrm{AMG}]$ 를 반으로 안 나누어
    //    $\dfrac13S$ 로 본다 → $[\mathrm{AMGN}]=\dfrac{2m+n}{3(m+n)}S$, 답은
    //    $\dfrac{m+n}{2m+n}s$. **답과 같을 수 없다** —
    //    $\dfrac{m+n}{2m+n}=\dfrac{2(m+n)}{3m+n}$ 이면 $3m+n=4m+2n$, 곧 $m+n=0$ 이다.
    // ⒝ $\overline{\mathrm{AN}}:\overline{\mathrm{NC}}=m:n$ 을
    //    $\overline{\mathrm{AN}}:\overline{\mathrm{AC}}=m:n$ 으로 읽으면
    //    $[\mathrm{AGN}]=\dfrac{m}{3n}S$ → $[\mathrm{AMGN}]=\dfrac{2m+n}{6n}S$, 답은
    //    $\dfrac{2n}{2m+n}s$. **답과 같을 수 없다** — $n(3m+n)=(m+n)(2m+n)$ 이면
    //    $2m^2=0$ 이다.
    // ⒞ 마지막에 $\dfrac13$ 을 안 곱하고 **삼각형 $\mathrm{ABC}$ 의 넓이**를 그대로
    //    낸다. $S=3\times$답 이고 답은 양수이므로 늘 다르다. 이 축은 **정수 대 정수**로
    //    견주는 자리다(위 ⚠️ ㉢).
    const { m, n, quad, total } = f as Record<string, number>;
    const exact = (num: number, den: number): string =>
      num % den === 0 ? String(num / den) : `${num}/${den}`;
    const d = 2 * m! + n!;
    return [
      {
        name: "중점 걸음 지움 (삼각형 AMG 를 반으로 안 나눔)",
        values: [exact(quad! * (m! + n!), d)],
      },
      {
        name: "AN:NC 를 AN:AC 로 읽음 (비를 안 고침)",
        values: [exact(2 * quad! * n!, d)],
      },
      {
        name: "마지막에 3 으로 안 나눔 (삼각형 ABC 의 넓이를 답으로)",
        values: [String(total)],
      },
    ];
  }

  if (key === "2-2|여러 가지 사각형|122X") {
    // 굳힘 마디 둘.
    //
    // ⒜ **평행사변형 걸음** — $\square\mathrm{ABED}$ 가 평행사변형이라
    //    $\overline{\mathrm{BE}}=\overline{\mathrm{AD}}$ 이므로
    //    $\overline{\mathrm{EC}}=\overline{\mathrm{BC}}-\overline{\mathrm{AD}}$ 다.
    //    그 걸음을 지우면 $\overline{\mathrm{EC}}$ 를 $\overline{\mathrm{BC}}$ 로
    //    읽어 다리가 $n$ 칸이 되고 둘레가 $m+n+2n=m+3n$ 칸이 된다 → 답이
    //    $\dfrac{nP}{m+3n}$. **답과 같을 수 없다** — 참이 $\dfrac{(n-m)P}{3n-m}$ 이라
    //    $(n-m)(m+3n)=n(3n-m)$ 이면 $m(m+n)=0$ 이다.
    // ⒝ **마무리 곱셈** — 답은 $k$ 가 아니라 $(n-m)k$ 다. 그 걸음을 지우고 $k$ 를
    //    그대로 내면 답과 다르다. 다르게 만드는 것은 모듈의 `TRAPEZOID_PAIRS` 가 건
    //    $n-m\ge2$ 다 — $n-m=1$ 이면 $1\times k=k$ 라 이 축이 **장식이 된다**(모듈
    //    머리말 ⑺ 3 이 「아무 일도 안 하는 곱셈」이라 적어 둔 바로 그 자리). 그러니
    //    이 줄은 그 가드를 **바깥에서** 재는 자다. 정수 대 정수로 견준다.
    const { m, n, perimeter, unit } = f as Record<string, number>;
    const exact = (num: number, den: number): string =>
      num % den === 0 ? String(num / den) : `${num}/${den}`;
    return [
      {
        name: "평행사변형 걸음 지움 (EC 를 BC 로 읽음)",
        values: [exact(n! * perimeter!, m! + 3 * n!)],
      },
      {
        name: "마무리 곱셈 지움 (k 를 그대로 답으로)",
        values: [String(unit)],
      },
    ];
  }

  // 🔴 소단원 이름의 **가는 공백**(U+2009) 주의 — 위 `34U`·`112X` 와 같은 자리다.
  //    `registeredTypes()` 가 낸 글자를 그대로 옮겼다(손으로 치면 안 맞는다).
  if (key === "2-1|일차함수와 그 그래프  ⑵|123X") {
    // 굳지 않는다 — $(a-b)t=P-Q$ 에서 나오는 것은 「$t$ 는 $P-Q$ 의 약수」라는
    // **후보 목록**뿐이고, 거기서 「$t<Q$ 라야 양초 $\mathrm{B}$ 가 남는다」로 걸러
    // 남은 것을 **다 더해야** 답이다. 약수 목록은 `facts` 에 없지만 $D$ 로 되만든다.
    //
    // ⒜ **버리는 걸음 지움** — 안 거르면 버려야 할 약수까지 더해 답이 커진다.
    //    생성기가 「버리는 것이 하나 이상」(`dead.length < 1` 이면 버린다)을 걸어
    //    두므로 그 차는 **늘 양수**다.
    // ⒝⒞ **다 안 더함** — 발문의 「처음으로 같아졌고」를 「$t$ 가 하나뿐」으로 읽어
    //    후보 하나에서 멈춘다. 살아남는 것이 $3$~$7$개이고 모두 양수이므로 합은
    //    어느 하나보다도 **크다**. 셋 다 정수 대 정수로 견준다.
    const { diff, shorter } = f as Record<string, number>;
    const divs: number[] = [];
    for (let d = 1; d <= diff!; d += 1) if (diff! % d === 0) divs.push(d);
    const live = divs.filter((d) => d < shorter!);
    const out: Erasure[] = [
      {
        name: "「t < Q 라야 한다」 지움 (약수를 다 더함)",
        values: [String(divs.reduce((a, b) => a + b, 0))],
      },
    ];
    // 되만들기가 빈 목록을 내면 «깨끗»이라 하지 않는다 — 지어낸 값을 내느니
    // 축을 줄이고, 줄었다는 사실이 표의 «잰 판 수»로 드러나게 둔다(`111X` 와 같은 뜻).
    if (live.length > 0) {
      out.push({
        name: "첫 후보에서 멈춤 (다 안 더함)",
        values: [String(live[0])],
      });
      out.push({
        name: "끝 후보만 봄 (다 안 더함)",
        values: [String(live[live.length - 1])],
      });
    }
    return out;
  }

  if (key === "2-1|단항식의 계산|124X") {
    // 굳지 않는다 — 세 계산 $A\times B\div C$, $B\times C\div A$, $C\times A\div B$ 를
    // **다 해 보고** 「지수가 둘 다 자연수」인 하나를 골라야 한다. 세 결과는 발문의
    // 정의에서 곧장 나오므로 `facts` 의 계수·지수 아홉으로 **다시 세운다**
    // (`monomialResults` 를 부르지 않는다).
    //
    // ⒜ **「지수가 자연수라야 단항식」 지움** — 계수는 셋 다 자연수라(모듈의
    //    `MONO_COEF_TRIOS` 가 보장) 계수만 보면 셋이 다 살아 답이 안 굳는다.
    //    `new Set(c).size < 2` 가드가 있어 세 계수가 한 값으로 모이는 일은 없다 —
    //    그 가드를 빼면 이 줄이 빨개진다(바깥에서 그것을 재는 자다).
    // ⒝ **계수의 나누는 걸음 지움** — 계수는 $\dfrac{c_ic_j}{c_k}$ 인데 나누기를
    //    빼면 $c_ic_j$ 다. `MONO_COEF_TRIOS` 가 $c\ge2$ 로 묶으므로 지운 값은 답의
    //    $c_k(\ge2)$ 배라 **늘 크다**(실측 계수 최솟값 $2$).
    //
    // 🔴 **여기에 「한 축만 따짐」을 넣지 마라 — 넣어 보고 뺐다.** 「$y$ 의 지수를 안
    //    봄」·「$x$ 의 지수를 안 봄」을 축으로 두면 600건 중 **154·135건이 «장식»으로
    //    찍힌다.** 그런데 그 154건의 **단항식 전체가 같은 판은 0건**이다 — 남은 두
    //    후보는 지수가 달라 서로 다른 답인데 `answerNumber` 가 **계수만** 읽어 둘이
    //    한 값으로 보일 뿐이다. 답은 굳지 않았고 결함도 아니다(모듈이
    //    `filter(ex>=1).length === 2` 로 「한 축으로는 못 고른다」를 이미 못 박는다).
    //    그대로 두면 25.7% 가 늘 빨간 자가 되고, **늘 우는 가드는 꺼진다**(2026-08-20).
    const { ca, cb, cc, xa, xb, xc, ya, yb, yc, win } = f as Record<
      string,
      number
    >;
    const coefs = [ca!, cb!, cc!];
    const xs = [xa!, xb!, xc!];
    const ys = [ya!, yb!, yc!];
    const rs = [0, 1, 2].map((i) => {
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      return {
        coef: (coefs[i]! * coefs[j]!) / coefs[k]!,
        ex: xs[i]! + xs[j]! - xs[k]!,
        ey: ys[i]! + ys[j]! - ys[k]!,
      };
    });
    return [
      {
        name: "「지수가 자연수라야 단항식」 지움 (계수만 봄)",
        values: rs.map((r) => String(r.coef)),
      },
      {
        name: "계수의 나누는 걸음 지움 (두 계수를 곱하기만 함)",
        values: [String(coefs[win!]! * coefs[(win! + 1) % 3]!)],
      },
    ];
  }
  // ══ 5차 물결 중2 — 갈래 g (2026-09-04) ═══════════════════════════
  //
  // `scripts/qa/probe-middle-extending-tiers.ts` 의 `erasures()` 에 그대로 이어 붙인다.
  // 네 키는 손으로 치지 않고 `registeredTypes()` 로 뽑아 옮겼다 — 이 갈래의 소단원
  // 이름에는 가는 공백(U+2009)이 **없다**(네 키의 모든 코드포인트를 훑어 확인했다.
  // 한글·ASCII 밖의 글자 0개).
  //
  // ⚠️ 값은 «굳힘을 지웠을 때 학생이 실제로 종이에 적을 답»이고, `answerNumber` 가 읽는
  //    것은 **정답의 첫 정수**다. `128X` 의 정답은 다항식이고 `poly` 가 $x^{2}$ 의 계수를
  //    맨 앞에 찍으므로(그 계수는 늘 $2$ 이상 양수 — 모듈 계약 ⑹.2) 지운 값도 **$x^{2}$의
  //    계수**로 적는다.
  //
  // 아래에 「🟢 늘 다르다」라고 적은 자리는 **식으로 증명한 것**이고(3차 `35V` 가 선 자리),
  // 「측정」이라 적은 자리는 서로 다른 문항을 세어 잰 것이다. 잰 값은 씨앗 200 × 변형 3 을
  // `facts` 로 중복 제거한 모집단이다(판정기 `samples`/`runErase` 와 같은 수·같은 식).

  if (key === "2-1|유리수와 순환소수|125X") {
    // 굳힘은 **분수 표현 두 개**다 — $0.\overline{ab}=\dfrac{ab}{99}$ 와 $0.ab=\dfrac{ab}{100}$.
    // 그 둘을 세워야 «한 번 곱할 때의 차»가 $\dfrac{ab}{9900}$ 하나로 굳는다.
    //
    // ⚠️ **여기 🟢 은 «측정했다»가 아니라 «그렇게 될 수밖에 없다»** 다 — 근거를 식으로
    //    적는다. (서로 다른 문항 432건 전량에서 실제로도 달랐다.)
    const { block, gapNum, gapDen } = f as Record<string, number>;
    return [
      // ⑴ **빼는 걸음**을 지움 — 주어진 차를 «바르게 계산한 값» 자체로 읽고
      //    $\dfrac{ab}{99}\times N=\dfrac{gapNum}{gapDen}$ 으로 놓는다. 그러면
      //    $N=\dfrac{gapNum\times99}{gapDen\times ab}=\dfrac{N_{\text{참}}}{100}$ 이라
      //    **자연수가 아니다**(모듈이 `multiplierFromGap` 의 인자 `subtractFinite` 로
      //    적어 둔 그 마디다). 이 값이 참 답과 같으려면 $N_{\text{참}}=0$ 이어야 하는데
      //    생성기가 $N\in[6,150]$ 이므로 늘 다르다. $N=100$ 이면 값은 $1$ 이라 역시 다르다.
      {
        name: "유한소수를 빼는 걸음 지움 (차를 바른 값으로 읽음)",
        values: [String((gapNum! * 99) / (gapDen! * block!))],
      },
      // ⑵ **통분한 분자**를 지움 — 해설은 「분자가 $ab\times100-ab\times99=ab$」라고 적는다.
      //    분모만 $9900$ 으로 맞추고 분자에 $ab$ 를 안 곱하면 단위 차가 $\dfrac{1}{9900}$ 이
      //    되어 $N=\dfrac{gapNum}{gapDen}\times9900=N_{\text{참}}\times ab$ 가 나온다.
      //    같으려면 $ab=1$ 이어야 하는데 `REPEAT_BLOCKS` 의 최솟값이 $13$ 이라 늘 다르다.
      {
        name: "통분한 분자를 지움 (단위 차를 $1/9900$ 으로 봄)",
        values: [String((gapNum! * 9900) / gapDen!)],
      },
    ];
  }
  if (key === "2-1|일차부등식의 활용|126X") {
    // 굳힘이 **셋**이다 — ㉠ 아래끝을 주는 조건, ㉡ 「섞으면 소금물의 양이 $amount+x$ 로
    // 는다」(모듈이 `mixBound` 의 인자 `dilutes` 로 적어 둔 마디), ㉢ 「$x$는 자연수」.
    const {
      p: p0,
      q: q0,
      r: r0,
      s: s0,
      amount,
      hi,
    } = f as Record<string, number>;
    const g2 = (a: number, b: number): number => (b === 0 ? a : g2(b, a % b));
    /** 한 조건을 $x$ 에 대해 정리한다 — 계수가 음수면 **방향이 뒤집힌다**. */
    const tidy = (
      target: number,
      dilutes: boolean,
      dir: "ge" | "le",
    ): { coef: number; konst: number; dir: "ge" | "le" } | null => {
      let coef = dilutes ? q0! - target : q0!;
      let konst = (target - p0!) * amount!;
      let d = dir;
      if (coef < 0) {
        coef = -coef;
        konst = -konst;
        d = d === "ge" ? "le" : "ge";
      }
      if (coef <= 0 || konst <= 0) return null;
      const gg = g2(coef, konst) || 1;
      return { coef: coef / gg, konst: konst / gg, dir: d };
    };
    const out: Erasure[] = [];
    // ㉠ **아래끝을 주는 조건**을 안 읽으면 남는 것은 「$x$는 자연수」뿐이라 가장 작은 값이
    //    $1$ 이 된다. 생성기가 $lo\ge2$ 를 못 박으므로 $1+hi$ 는 $lo+hi$ 와 **늘 다르다**
    //    (그 가드가 이 축을 떠받친다 — 서로 다른 문항 590건 전량 확인).
    //    ⚠️ 반대쪽(«위끝을 주는 조건»)은 지우면 $x$ 가 위로 안 막혀 **답 자체가 없어지므로**
    //    적을 값이 없다. 그 자리는 «깨끗»이 아니라 «잴 것이 없다»이다.
    out.push({
      name: "아래끝을 주는 조건 지움 (자연수라 최소 $1$)",
      values: [String(1 + hi!)],
    });
    // ㉡ 섞으면 소금물의 **양이 는다**는 걸음을 지우고 농도의 분모를 처음 양으로 둔다.
    //    계수가 $q-target$ 이 아니라 $q$ 가 되어 두 경계가 함께 움직인다. 생성기가 막는 것은
    //    «두 끝이 **둘 다** 그대로»인 조합뿐이라(`naive.lo===lo && naive.hi===hi`)
    //    **합까지 같아지는 판**은 안 막힌다 — 그래서 이것은 «측정»이다(290건 전량 달랐다).
    //
    //    🔴 **이 축은 «나중에 섞는 쪽이 진한» 판에서만 잴 것이 있다.** 묽은 판($up=0$)에서
    //    분모를 $amount$ 로 두면 상수가 음수가 되어 두 조건이 자연수 해를 하나도 안 남긴다
    //    — 학생이 «해가 없다»로 끝내므로 견줄 값이 없다. 그래서 그 판에는 줄을 **안 낸다**
    //    (모듈이 `boundLine` 주석에 같은 뜻을 적어 두었다). 실측 — 서로 다른 문항 590건
    //    가운데 줄이 선 판 **290건이고, 그 290건이 정확히 $up=1$ 판 전량이다**(우연이
    //    아님을 세어 확인했다. 묽은 판 300건).
    const nR = tidy(r0!, false, "ge");
    const nS = tidy(s0!, false, "le");
    if (nR !== null && nS !== null && nR.dir !== nS.dir) {
      const low = nR.dir === "ge" ? nR : nS;
      const high = nR.dir === "le" ? nR : nS;
      out.push({
        name: "섞으면 양이 는다는 걸음 지움 (분모를 처음 양으로)",
        values: [
          String(
            Math.ceil(low.konst / low.coef) +
              Math.floor(high.konst / high.coef),
          ),
        ],
      });
    }
    // ㉢ 「$x$는 자연수」를 지우면 두 경계가 **분수 그대로** 답이 된다(닫힌 구간이라
    //    최소·최대가 그 두 끝이다). 올림·내림을 안 하므로 참 답과 갈린다 —
    //    다만 **두 경계의 소수 부분이 합해서 꼭 $1$ 인 판**에서는 올림 하나와 내림 하나가
    //    서로 상쇄되어 합이 같아진다.
    //
    //    🔴 **이 줄도 «회귀 잠금»이다 — 실제로 결함을 물었고, 그 결함은 고쳐졌다.**
    //    처음 잴 때 **590건 중 17건(2.9%)** 이 그랬다. ㉯ 가드는 「두 경계 가운데 적어도
    //    하나가 안 나누어떨어질 것」만 요구해서 이 자리를 구조적으로 못 본다 — 답이
    //    **두 끝의 합**이라 올림 하나와 내림 하나가 상쇄되면 걸음을 통째로 건너뛰어도
    //    답이 맞기 때문이다. 그래서 생성기가 «소수 부분의 합이 $1$ 인 조합»을 함께 버리는
    //    줄을 얻었고(`m2Top5g.mixWindowCase` 의 ㉯ 가드 바로 아래 — 유리수 그대로 견준다.
    //    생성기와 D-20 원장이 **그 함수 하나**를 부르므로 한쪽만 고칠 수 없다),
    //    지금은 **590건 중 0건**이다.
    //    ⚠️ 그러니 이 «0» 도 «못 셈»이 아니다 — 가드가 없던 엔진에서 17을 찍은 이력이
    //    곧 그 대조다. 가드를 빼면 이 줄이 다시 빨개진다.
    //
    //    ⚠️ 합을 부동소수로 더하면 안 된다 — $\frac{a}{c}+\frac{b}{d}$ 가 정확히 정수인
    //    판에서 $123.99999\ldots$ 가 나와 **장식을 놓친다.** 정수 산술로 딱 가른다.
    const tR = tidy(r0!, true, "ge");
    const tS = tidy(s0!, true, "le");
    if (tR !== null && tS !== null) {
      const num = tR.konst * tS.coef + tS.konst * tR.coef;
      const den = tR.coef * tS.coef;
      out.push({
        name: "「$x$는 자연수」 지움 (분수 경계를 그대로 더함)",
        // 나누어떨어지지 않으면 정수 답과 같아질 수 없다 — 그때는 분수 꼴 그대로 적는다.
        values: [num % den === 0 ? String(num / den) : `${num}/${den}`],
      });
    }
    return out;
  }
  if (key === "2-1|일차함수와 일차방정식의 관계|127X") {
    // 굳지 않는다 — 「삼각형을 이루지 않는다」는 **후보 셋**(평행 둘 + 한 점에서 만나기
    // 하나)을 다 세워 더해야 답이 나온다. 그래서 지울 것은 «후보를 몇 갈래나 세우는가»다
    // (모듈이 `noTriangleValues` 의 인자 `includeConcurrent` 로 적어 둔 마디).
    const { m1, m2, a3 } = f as Record<string, number>;
    return [
      // ⑴ **한 점에서 만나는 경우**를 빠뜨리면 평행 둘의 합만 남는다.
      //    $m_1+m_2=(m_1+m_2+a_3)-a_3$ 이고 생성기가 $|a_3|\ge2$ 를 못 박으므로 늘 다르다
      //    (서로 다른 문항 598건 전량 확인).
      {
        name: "한 점에서 만나는 경우 빠뜨림 (평행 둘만 셈)",
        values: [String(m1! + m2!)],
      },
      // ⑵ 거꾸로 **평행 두 경우**를 빠뜨리면 한 점에서 만나는 $a$ 하나만 남는다.
      //
      //    🔴 **이 줄은 «회귀 잠금»이다 — 실제로 결함을 물었고, 그 결함은 고쳐졌다.**
      //    처음 잴 때 이 축이 **598건 중 124건(20.7%)** 을 «장식»으로 찍었다. $m_1+m_2=0$
      //    이면 답이 곧 $a_3$ 라, 세 경우 가운데 **㉢ 하나만** 찾은 학생도 만점이다 —
      //    심화상이 재려는 마디가 「경우 셋을 스스로 센다」인데 다섯 판에 한 판은 둘이
      //    공짜였다. 걸린 판 수가 $m_1+m_2=0$ 인 판 수(124)와 **정확히 같았다.**
      //    `shortcutHits` 는 발문의 다섯 수만 보므로 $a_3$ 를 구조적으로 못 본다.
      //    그래서 생성기가 `if (m1 + m2 === 0) return null;` 한 줄을 얻었고
      //    (`m2Top5g.noTriangleCase` — `a3 === 0` 줄의 **거울**이다. 대칭인 두 자리에
      //    가드가 한쪽만 걸려 있었다. 그 받아들임 규칙을 함수 하나로 뺀 까닭도 이 결함이다
      //    — 손실 원장 시험이 조건을 손으로 옮겨 적어 **초록인 채로** 옛 수를 잠갔다),
      //    지금은 **597건 중 0건**이다.
      //    ⚠️ 그러니 이 «0» 은 «못 셈»이 아니다 — 같은 자가 가드가 없던 엔진에서 124를
      //    찍은 이력이 곧 음성·양성 대조다. 가드를 빼면 이 줄이 다시 빨개진다.
      { name: "평행 두 경우 빠뜨림 (한 점만 셈)", values: [String(a3!)] },
    ];
  }
  if (key === "2-1|다항식의 계산|128X") {
    // 굳힘은 **괄호를 푸는 규칙** 하나다 — $A-(B-C)=A-B+C$ 이므로 바른 식과 잘못된 식의
    // 차가 $C$ 가 아니라 **$2C$** 다(모듈이 `recoverA` 의 인자 `halveGap` 으로 적어 둔 마디).
    //
    // ⚠️ **정직하게 적어 둘 것** — 견줄 수 있는 것은 정답 다항식의 **첫 수**, 곧 $x^{2}$의
    //    계수 하나뿐이다(서로 다른 문항 600건인데 답의 첫 수는 $2$~$9$ 의 **8종**밖에 없다).
    //    그래서 이 축은 «$x$의 계수나 상수항만 틀린 오답»을 구조적으로 못 본다. 아래 둘은
    //    $x^{2}$의 계수에서 이미 갈리므로 그 한계에 안 걸린다.
    const { x: a2, c2 } = f as Record<string, number>;
    return [
      // ⑴ 차가 $2C$ 임을 안 보고 $C=(\text{차})$ 로 두면
      //    $A=(A-B-C)+B+2C=A+C$ 라 $x^{2}$의 계수가 $a_2+c_2$ 가 된다.
      //    생성기가 $C$ 의 모든 계수를 절댓값 $2$ 이상으로 묶으므로(모듈 ⑺ 5) 늘 다르다
      //    (600건 전량 확인).
      {
        name: "차가 두 배임을 안 봄 ($C$를 차 그대로 둠)",
        values: [String(a2! + c2!)],
      },
      // ⑵ $A=(A-B-C)+B+C$ 에서 **$+C$ 를 되더하는 걸음**을 빠뜨리면 $A-C$ 가 나온다.
      //    같은 까닭($|c_2|\ge2$)으로 $a_2-c_2\ne a_2$ 다.
      {
        name: "$C$를 되더하는 걸음 지움",
        values: [String(a2! - c2!)],
      },
    ];
  }
  // ── 5차 물결(D-116, 2026-09-04) — 갈래 `m2Top5h` (`133X`·`134X`·`135X`) ──────
  //
  // ⚠️ 세 키는 손으로 치지 않고 `registeredTypes()` 에서 뽑아 적었다. 이 셋의
  //    소단원 이름에는 가는 공백(U+2009)이 **없다** — 공백류가 전부 U+0020 임을
  //    코드포인트로 확인했다(`34U` 자리와 다르다).
  if (key === "2-1|유리수와 순환소수|133X") {
    // 이 유형의 굳힘은 셋이고, 셋 다 «순환소수를 분수로 고치는 마디»와
    // «발문이 못 박은 창»이다. 지운 값은 전부 **생성기와 같은 걸음**으로 다시
    // 세되 마디 하나씩만 흔든다 — 답을 옮겨 적지 않는다.
    const { a, b, r, plus, cmax, den } = f as Record<string, number>;
    // `plus` 는 발문의 부호 — $1$ 이면 $+0.\overline{r}$, $0$ 이면 $-0.\overline{r}$.
    const sigma = plus === 1 ? 1 : -1;
    // 양변에 $90$ 을 곱한 뒤 $x=\dfrac{90c-\sigma k}{D}$ 가 자연수인 $c$ 를
    // $1$ 부터 `lim` 까지 훑어 그 해를 더한다. `D`·`k` 를 인자로 두어 마디를 흔든다.
    const sumWith = (D: number, konst: number, lim: number): number => {
      let s = 0;
      for (let c = 1; c <= lim; c += 1) {
        const top = 90 * c - sigma * konst;
        if (top <= 0) continue;
        if (top % D !== 0) continue;
        s += top / D;
      }
      return s;
    };
    return [
      // ㉠ 혼합순환소수 $0.a\overline{b}=\dfrac{(10a+b)-a}{90}$ 에서 **앞자리 $a$ 를
      //    빼는** 마디를 지우면 분모가 $D=9a+b$ 대신 $10a+b$ 가 된다. 모듈이
      //    「학생이 가장 흔히 틀리는 자리」라고 적어 둔 그 마디이고, 생성기가
      //    `subtractLead` 인자로 흔들 수 있게 열어 둔 자리이기도 하다.
      //    살아남는 $c$ 가 하나도 없으면 합이 $0$ 인데, 진짜 답은 해가 $2$ 이상인
      //    것이 둘 이상이라 **늘 $4$ 이상**이므로 $0$ 과는 절대 안 겹친다.
      //    실측(씨앗 200×변형 3, 서로 다른 문항 **144**건): 장식 **0**.
      //    그중 **74**건이 「후보가 아예 없다(합 $0$)」이고 나머지 70건은 다른 합이다.
      {
        name: "혼합순환소수의 앞자리 빼기 지움",
        values: [String(sumWith(10 * a! + b!, 10 * r!, cmax!))],
      },
      // ㉡ $0.\overline{r}=\dfrac{r}{9}$ 를 유한소수 $0.r=\dfrac{r}{10}$ 으로 읽으면
      //    양변에 $90$ 을 곱한 상수항이 $10r$ 이 아니라 $9r$ 이 된다. 분모는 그대로다.
      //    이 축은 **대수적 보장이 없다** — 144건을 재서 장식 **0**이었다는 것뿐이다.
      {
        name: "순순환 마디를 유한소수로 읽음",
        values: [String(sumWith(den!, 9 * r!, cmax!))],
      },
      // ㉢ 발문이 못 박은 「$c$ 는 $18$ 이하」를 안 읽으면 $c$ 가 더 커도 되고, 그러면
      //    합이 **반드시 커진다**. $90c\equiv\sigma\cdot10r \pmod D$ 는 이미 해가
      //    있으므로 주기 $D/\gcd(90,D)\le D$ 마다 해가 하나씩 더 나오고, $c\ge19$ 에서
      //    $90c-\sigma\cdot10r\ge 90\times19-80>0$ 이라 더해지는 해가 전부 양수다.
      //    그러니 창을 한 주기($+D$) 넓힌 이 값은 **답보다 늘 크다** — 측정이 아니라
      //    대수적으로 그렇다(`35V` 자리의 문체를 따랐다). 144건 실측으로도 늘 컸고
      //    **가장 적게 늘어난 판이 $+190$** 이었다.
      {
        name: "「$c$ 는 18 이하」 상한 지움 (창을 한 주기 넓힘)",
        values: [String(sumWith(den!, 10 * r!, cmax! + den!))],
      },
    ];
  }
  if (key === "2-2|여러 가지 사각형|134X") {
    // 굳힘은 「높이가 같은 두 삼각형의 넓이의 비 = 밑변의 길이의 비」를 **두 번**
    // 쓰는 것이고, 두 번 다 «밑변을 어느 선분 전체로 보는가»가 마디다.
    //
    // ⚠️ 모듈이 내보내는 `triangleWholeArea` 는 **생성기가 한 번도 안 부른다**(적대
    //    검문 지적). 그래서 여기서도 그 함수를 안 쓰고 `facts` 로만 짓는다.
    //    같은 까닭으로 제목의 「중선」도 근거로 안 쓴다 — 생성기가 $(m,n)=(1,1)$ 을
    //    막으므로 $\overline{AD}$ 는 이 유형에서 **한 번도 중선이 아니다**.
    const { m, n, s, t, k, abd } = f as Record<string, number>;
    return [
      // ㉠ 두 번째 비의 밑변은 $\overline{AD}$ 전체다 —
      //    $\triangle EBD:\triangle ABD=\overline{ED}:\overline{AD}=t:(s+t)$.
      //    그 마디를 지우고 발문에 찍힌 $\overline{AE}:\overline{ED}=s:t$ 를 넓이비로
      //    그대로 읽으면 $\triangle ABD=k\cdot\dfrac st$ 가 된다.
      //    참값과의 차는 $\dfrac{m+n}m\left(k\dfrac{s+t}t-k\dfrac st\right)=\dfrac{k(m+n)}m>0$
      //    이라 **늘 작다** — 대수적으로 절대 안 겹친다. 실측 549건 장식 **0**.
      //    이 값은 정수가 아닐 수 있다(549건 중 **69**건). 그래도 답은 늘 정수라
      //    문자열이 겹칠 일이 없다.
      {
        name: "두 번째 비의 밑변을 선분 AD 가 아니라 AE 로 읽음",
        values: [String((((k! * s!) / t!) * (m! + n!)) / m!)],
      },
      // ㉡ 첫 번째 비의 밑변도 $\overline{BC}$ **전체**다 —
      //    $\triangle ABD:\triangle ABC=\overline{BD}:\overline{BC}=m:(m+n)$.
      //    발문의 $\overline{BD}:\overline{DC}=m:n$ 을 그대로 넓이비로 읽으면
      //    $\triangle ABC=\triangle ABD\cdot\dfrac nm$ 이고, 참값과의 차는
      //    $\triangle ABD\cdot\dfrac{(m+n)-n}m=\triangle ABD>0$ 이라 **늘 작다**.
      //    실측 549건 장식 **0**.
      {
        name: "첫 번째 비의 밑변을 선분 BC 가 아니라 DC 로 읽음",
        values: [String((abd! * n!) / m!)],
      },
      // ㉢ 비를 **두 번** 쓰는 것 자체가 굳힘이다(모듈 머리말). 한 번에서 멈추면
      //    답이 $\triangle ABD$ 다. $\triangle ABC=\triangle ABD\cdot\dfrac{m+n}m$ 이고
      //    $n\ge1$ 이라 **늘 크다**. 실측 549건 장식 **0**.
      {
        name: "비를 한 번만 씀 (삼각형 ABD 에서 멈춤)",
        values: [String(abd!)],
      },
    ];
  }
  if (key === "2-1|다항식의 계산|135X") {
    // 답이 다항식이라 `answerNumber` 는 **첫 항의 계수**를 본다(`facts.x` 가 그 값이고,
    // 계수 절댓값을 $2$ 이상으로 좁힌 까닭이 바로 그것이다 — 모듈 ⑺ 5).
    //
    // 단항식 $M$ 을 곱하거나 나누면 **모든 항의 차수가 같은 만큼** 옮겨 가므로
    // `sortTerms` 의 차례가 보존된다. 그래서 지운 판의 첫 계수는 참 첫 계수에
    // $\pm$ 배수만 곱하면 나온다 — 다항식을 통째로 다시 짓지 않아도 된다.
    //
    // ⚠️ 그 «차례가 보존된다»를 추론으로만 두지 않았다. 서로 다른 **600**건에서
    //    ㉡ 의 값을 **발문 둘째 줄**(잘못 계산한 식)의 첫 계수와, ㉠ 의 값을 해설
    //    첫 줄의 어떤 식 $A$ 와 맞대어 **어긋남 0**을 확인했다.
    const { x, mode, monoC } = f as Record<string, number>;
    return [
      // ㉠ 「**두 번**」을 지우고 한 번만 되돌리면 그것은 어떤 식 $A$ 이지 바르게
      //    계산한 식이 아니다 — 모듈이 「가장 흔한 오답 둘」 중 하나로 지목한 자리.
      //    $A=B\times M$ 이므로 첫 계수는 `mode 0` 에서 $x\cdot monoC$,
      //    `mode 1` 에서 $x/monoC$ 다. $|monoC|\ge2$ 이고 $x\ne0$ 이라 **늘 다르다**.
      //    실측 600건 장식 **0**.
      {
        name: "「두 번」 지움 (한 번만 되돌려 어떤 식 A 를 답함)",
        values: [String(mode === 0 ? x! * monoC! : x! / monoC!)],
      },
      // ㉡ 「곱셈과 나눗셈을 **서로 바꾸어**」를 안 읽으면 발문의 식이 이미 바르게
      //    계산한 것이 되어 그것을 그대로 답한다 — 흔한 오답의 나머지 하나.
      //    잘못 계산한 식은 답의 $M^{2}$ 배(`mode 0`) 또는 $M^{2}$ 분의 일(`mode 1`)이고
      //    $monoC^{2}\ge4$ 라 **늘 다르다**. 실측 600건 장식 **0**.
      {
        name: "「서로 바꾸어」 지움 (잘못 계산한 식을 그대로 답함)",
        values: [
          String(mode === 0 ? x! * monoC! * monoC! : x! / (monoC! * monoC!)),
        ],
      },
    ];
  }
  // ══ 5차 물결 중2 — 갈래 `m2Top5i` (2026-09-04) ═══════════════════
  //
  // ⚠️ 키 문자열은 **손으로 치지 않았다** — `registeredTypes()` 를 돌려 코드 포인트까지
  //    찍어 그대로 옮겼다(넷 다 보통 공백 `0x20` 뿐이다. `34U`·`112X` 처럼 가는 공백
  //    U+2009 가 든 자리는 이 갈래에 없다).
  // ⚠️ 넷 다 **`facts` 만** 본다 — 모듈 함수를 부르지 않으므로 리드가 `import` 를
  //    더할 것이 없다. 굳힘 함수(`recoverXY`·`trapezoidBases`·`isoscelesTargetAngles`)를
  //    그대로 부르면 「제품이 쓰는 판단으로 제품을 채점」하게 되므로(2026-08-18),
  //    지운 값은 `facts` 에서 **다시 만든다.**
  // ⚠️ 아래 「잰 판 수」는 판정기와 **같은 씨앗**(`SEED_BASE=20260901`·`SEEDS=200`·
  //    `VARIANTS=[0,1,2]`)으로 **서로 다른 `facts`** 만 세어 얻은 실측이다.
  //    모듈 주석의 수치는 근거로 쓰지 않았다.

  if (key === "2-1|일차함수와 일차방정식의 관계|136X") {
    // 굳힘은 「삼각형이 안 되는 경우가 **셋**이고 그 셋을 다 세운다」이다.
    // 두 마디를 따로 지운다.
    //
    // ⑴ 「세 직선이 **한 점에서 만나는** 경우」를 통째로 빠뜨리면 평행 두 갈래만 남아
    //    합이 $m_1+m_2$ 가 된다. 학생이 가장 흔히 빠뜨리는 갈래이고, 생성기 주석이
    //    `includeConcurrent` 로 이름 붙인 바로 그 마디다.
    //    🟢 은 «측정했다»이자 «그렇게 될 수밖에 없다»다 — 답과의 차가 $a_3$ 인데
    //    $a_3$ 는 기울기 풀 $\{-6,\dots,-1,1,\dots,6\}$ 에서 뽑혀 **$0$ 이 아니다.**
    //
    // ⑵ 거꾸로 「**평행** 두 갈래」를 빠뜨리고 한 점에서 만나는 것만 세면 $a_3$ 만 남는다.
    //    답과의 차는 $m_1+m_2$ 인데, 생성기가 `m1 + m2 === 0` 인 판을 **버리므로**
    //    이 값도 답과 늘 다르다(그 줄이 없으면 이 축이 침묵한다).
    const { m1, m2, a3 } = f as Record<string, number>;
    return [
      { name: "한 점에서 만나는 경우를 빠뜨림", values: [String(m1! + m2!)] },
      { name: "평행 두 경우를 빠뜨림 (한 점만 셈)", values: [String(a3!)] },
    ];
  }
  if (key === "2-1|연립일차방정식|137X") {
    // 굳힘 둘 — 치환한 뒤 **되돌리는** 걸음이 각각 한 마디다.
    //
    // ⑴ 「변끼리 더하고 빼서 $2$로 나눈다」에서 **$2$로 나누기**를 빠뜨리면
    //    $x'=A+B=u+v$, $y'=A-B=u-v$ 가 되어 곱이 $u^2-v^2$ 다(참값의 네 배).
    //    ⚠️ 규칙을 옮겨 적지 않으려고 «네 배»라 쓰지 않고 `facts` 의 $u$, $v$ 에서
    //    **다시 만든다.** 답과 늘 다르다 — 차가 $3xy$ 인데 생성기가 $|x|,|y|\ge2$ 를
    //    요구하므로 $xy\ne0$ 이다.
    //
    // ⑵ 「$A$, $B$ 를 $x$, $y$ 로 **되돌린다**」를 통째로 빠뜨리고 $AB$ 를 답으로 내면
    //    $uv$ 다. 답과 늘 다르다 — $uv=x^2-y^2$ 이므로 $uv=xy$ 이려면
    //    $x^2-xy-y^2=0$ 이어야 하는데 $y\ne0$ 이면 $x/y=\frac{1\pm\sqrt5}2$ 가 되어
    //    정수 해가 없다.
    const { u, v } = f as Record<string, number>;
    return [
      { name: "$2$로 나누는 걸음 지움", values: [String(u! * u! - v! * v!)] },
      { name: "치환을 안 되돌림 ($AB$ 를 답으로)", values: [String(u! * v!)] },
    ];
  }
  if (key === "2-2|평행선 사이의 선분의 길이의 비|138X") {
    // 굳힘 셋 — 그중 ⑶ 은 얇다(아래에 실측으로 적는다).
    //
    // ⑴ 「$\overline{AE}:\overline{EB}=m:n$ 을 $\overline{AE}:\overline{AB}=m:(m+n)$ 으로
    //    **고쳐 잡는** 걸음」을 지우고 $\overline{EP}:\overline{BC}=m:n$ 이라 그대로 쓰면
    //    $\overline{BC}=\dfrac{ep\,n}{m}=n\beta$, $\overline{AD}=\dfrac{pf\,m}{n}=m\alpha$ 다.
    //    답과 늘 다르다 — 차가 $m\beta+n\alpha$ 인데 생성기가 $m,n\ge2$·$\alpha\ge2$·
    //    $\beta\ge3$ 을 요구하므로 양수다. (전 판에서 값이 나온다: 정수 조건이
    //    $m\mid ep\,n=m\beta n$ 와 $n\mid pf\,m=n\alpha m$ 이라 **늘 참**이다.)
    //
    // ⑵ 「두 조각을 **따로** 본다」를 안 하고 $\overline{EF}$ 를 두 밑변의 **평균**으로
    //    보면(중점연결정리로 착각) 합이 $2\overline{EF}$ 다. 답과 늘 다르다 —
    //    $(m+n)(\alpha+\beta)-2(m\beta+n\alpha)=(m-n)(\alpha-\beta)$ 이고
    //    생성기가 $m\ne n$ 과 $\alpha<\beta$ 를 요구한다.
    //
    // ⑶ 「앞 조각은 $\triangle ABC$ 에, 뒤 조각은 $\triangle CAD$ 에 걸린다」를 **뒤집어**
    //    걸면 $\overline{BC}=\dfrac{ep\,s}{n}$, $\overline{AD}=\dfrac{pf\,s}{m}$ 가 된다.
    //    생성기가 「뒤집어도 두 밑변의 합이 같은」 판을 **버리므로**(`flipped.ad+flipped.bc
    //    === ad+bc` 줄) 값이 나오는 판에서는 답과 늘 다르다.
    //    🔴 **이 축은 얇다 — 정직하게 적는다.** 뒤집으면 나누어떨어지지 않는 판이
    //    대부분이라, 그때는 **값을 지어내지 않고** 이 축을 안 낸다. 실측으로
    //    서로 다른 `facts` **229** 가운데 값이 나온 판이 **17**뿐이다
    //    ($\gcd(m,n)=1$ 이므로 $n\mid\beta$ 이고 $m\mid\alpha$ 여야 정수다).
    //    그러니 이 유형을 실제로 지키는 것은 ⑴·⑵ 이고 ⑶ 은 덤이다.
    const { m, n, ep, pf, ef } = f as Record<string, number>;
    const s = m! + n!;
    const out: Erasure[] = [
      {
        name: "비의 뒷항을 $\\overline{EB}$ 로 봄 ($m:s$ 로 안 고침)",
        values: [String((ep! * n!) / m! + (pf! * m!) / n!)],
      },
      {
        name: "두 조각을 안 가르고 $\\overline{EF}$ 를 두 밑변의 평균으로 봄",
        values: [String(2 * ef!)],
      },
    ];
    if ((ep! * s) % n! === 0 && (pf! * s) % m! === 0) {
      out.push({
        name: "어느 조각이 어느 삼각형인지 뒤집음",
        values: [String((ep! * s) / n! + (pf! * s) / m!)],
      });
    }
    return out;
  }
  if (key === "2-2|삼각형의 외심과 내심|139X") {
    // 굳힘 셋. $\alpha$ 가 $90^\circ$ 보다 큰가로 **지울 수 있는 마디가 갈린다** —
    // 그래서 축 ⑴ 과 ⑶ 은 그 갈래에서만 값을 낸다(반대쪽에서 내면 그 조건이 애초에
    // 아무 일도 안 하는 자리라 «장식»으로 찍힌다).
    // ⚠️ 이 유형은 판이 얇다 — 발문에 찍히는 수가 $\alpha$ 하나뿐이라 서로 다른
    //    `facts` 가 **42**밖에 없다(600판을 뽑아도 그렇다). 그 42 가운데
    //    $\alpha>90$ 이 **21**, $\alpha<90$ 이 **21** 이다(둘로 정확히 갈린다).
    //
    // ⑴ ($\alpha>90$ 일 때만) 「$180^\circ-2\alpha$ 가 양수가 아니면 그런 삼각형은
    //    없다」를 빠뜨리면 죽은 두 경우가 답에 섞인다. 느슨한 합은
    //    $\left(90+\frac\alpha2\right)+\left(90+\frac{rest}2\right)+\left(90+\frac{half}2\right)$ 다.
    //    답과 늘 다르다 — 참값 $135-\frac\alpha4$ 와 느슨한 합 $405-\frac{3\alpha}4$ 가
    //    같으려면 $\alpha=540$ 이어야 한다.
    //
    // ⑵ (전 판) 내심 성질 $\angle YIZ=90^\circ+\frac12\angle W$ 를 안 쓰고 **꼭짓점의 각을
    //    그대로** 답으로 내면, 살아남은 경우의 $\angle W$ 들의 합 $S$ 가 된다.
    //    답은 $90k+\frac S2$ 이므로($k$ 는 살아남은 경우의 수) 차가 $90k-\frac S2$ 인데,
    //    생성기가 각 값에 $90<90+\frac t2<180$ 을 요구해 $0<t<180$ 이 보장되므로
    //    $S<180k$ 다. 곧 **늘 양수**다.
    //
    // ⑶ ($\alpha<90$ 일 때만) 「경우가 **셋**」을 안 세고 ⑶ 하나만 구하고 멈추면
    //    $90+\frac{half}2$ 하나가 남는다. 답과의 차가 $270-\frac\alpha2$ 인데
    //    $\alpha<90$ 이므로 $>225$ 다.
    const { alpha, rest, half } = f as Record<string, number>;
    const inc = (t: number): number => 90 + t / 2;
    const out: Erasure[] = [];
    if (alpha! > 90) {
      out.push({
        name: "「각의 크기가 될 수 없다」를 안 버림",
        values: [String(inc(alpha!) + inc(rest!) + inc(half!))],
      });
    }
    out.push({
      name: "내심 성질을 안 씀 (꼭짓점의 각을 그대로)",
      values: [String(alpha! > 90 ? half! : alpha! + rest! + half!)],
    });
    if (alpha! < 90) {
      out.push({
        name: "경우 ⑶ 하나만 구하고 멈춤",
        values: [String(inc(half!))],
      });
    }
    return out;
  }
  // ══ 5차 물결 중2 — 갈래 `m2Top5j` (2026-09-04) ═══════════════════
  //
  // `scripts/qa/probe-middle-extending-tiers.ts` 의 `erasures()` 안에 그대로 이어 붙일
  // 블록 넷이다(리드 몫). **유형 키는 손으로 치지 않았다** — `registeredTypes()` 를 돌려
  // 뽑은 문자열을 그대로 옮겼고, 네 키의 소단원 이름에는 가는 공백(U+2009)이 없다는 것을
  // 코드포인트로 확인했다(`2-2|확률` · `2-1|연립일차방정식` · `2-2|도형의 닮음` ·
  // `2-2|삼각형의 무게중심` — 사이 공백은 전부 `0x20`).
  //
  // ## 값을 어디서 얻나
  //
  // 넷 다 **발문에 찍히는 수**만으로 되만든다(`facts` 가 적어 둔 파생값 `whole`·`first`·
  // `p1`·`p2`·`mid`·`top`·`arms` 를 **안 읽는다**). 그래야 「그 걸음을 안 밟은 학생이
  // 실제로 내놓을 값」이 되고, 생성기가 적어 둔 답을 되풀이하지 않는다. 되만들기가
  // 옳은지는 **그 파생값들과 전량 대조**해 확인했다 — 네 유형 1,378문항 전량 일치
  // (`141X` 의 `first`·`last`·`count`·`x`, `142X` 의 `perimeter`·`p1`·`p2`·`x`,
  // `143X` 의 `sum`·`mid`·`top`·`arms`·`x`, `140X` 의 `whole`·`r`·`x`).
  //
  // ## 🔴 0 이 «깨끗»인지 «못 셈»인지 먼저 갈랐다
  //
  // 유형마다 **일부러 장식인 줄**(`values: [String(f.x)]`)을 한 줄 더 넣어 돌려 봤다 —
  // 네 유형 전부 🔴 **100.0%**(466·332·432·148건 전량)였다. 그러니 아래 🟢 는 이 자가
  // «아니오»를 낼 수 있는 자리에서 나온 🟢 다. (그 대조 줄은 여기 안 넣는다.)
  //
  // ## 잰 값 (판정기와 같은 표본 — `SEED_BASE 20260901` · 200씨앗 × 변형 3)
  //
  // | 유형 | 지운 조건 | 서로 다른 문항 | 답과 다른 판 |
  // |---|---|---|---|
  // | `140X` | 여사건으로 방향을 뒤집는 걸음 | 466 | **466** |
  // | `140X` | 전체 개수에서 처음 개수를 빼는 걸음 | 466 | **466** |
  // | `141X` | 「$y$ 도 자연수」로 거르는 걸음 | 332 | **332** |
  // | `141X` | 하나만 구하고 멈춤 | 332 | **332** |
  // | `142X` | 「나머지 두 변도 자연수」로 거르는 걸음 | 432 | **432** |
  // | `142X` | 하나만 구하고 멈춤 | 432 | **432** |
  // | `143X` | $\overline{PQ}$ 에 둘째 층 | 148 | **148** |
  // | `143X` | $\overline{PM}+\overline{QN}$ 에 둘째 층 | 148 | **148** |
  //
  // ## ⚠️ 이 축이 **못 보는 것** — 정직하게
  //
  // `140X` 는 「$r=1$ 이면 발문의 세 수로 $a\times p-b$ 가 곧 답」인 판이 **223/466
  // (47.9%)** 이다(적대 검문이 짚은 자리를 이 표본에서 다시 셌다 — $r=1$ 인 판의 수와
  // $a\times p-b$ 가 답인 판의 수가 **223 으로 정확히 같다**. $r=1$ 이면
  // $x=aq-a-b=a(q-1)-b=ap-b$ 이므로 필연이다). ㉡ 은 「그 걸음을 **지우면** 답이
  // 바뀌는가」를 묻지 「그 걸음을 **안 밟고도** 답에 닿는 다른 길이 있는가」를 못 묻는다.
  // 아래 첫 줄이 🟢 인 것과 그 지름길은 **서로 어긋나지 않는다** — 다른 물음이다.
  // 막으려면 `shortcutHits` 가 세 수의 조합까지 보게 하거나 $r\ge2$ 를 요구해야 하는데,
  // 그것은 이 파일이 아니라 생성기 쪽 결정이라 여기서는 **적어만 둔다.**

  if (key === "2-2|확률|140X") {
    // 굳힘은 **여사건 성질** 하나다 — 발문이 주는 $\dfrac{p}{q}$ 는 «묻는 색이 아닐»
    // 확률이므로, 먼저 $1-\dfrac{p}{q}=\dfrac{q-p}{q}$ 로 방향을 뒤집어야 비로소
    // $\dfrac{a}{a+b+x}$ 와 같다고 놓을 수 있다.
    //
    // ⑴ 그 걸음을 지우면 학생은 $\dfrac{a}{a+b+x}=\dfrac{p}{q}$ 를 풀어 전체를
    //    $\dfrac{aq}{p}$ 로 읽는다 → $x'=\dfrac{aq}{p}-a-b$.
    // ⑵ 마지막 걸음(전체에서 처음 개수를 뺀다)을 지우면 **전체 개수** $\dfrac{aq}{q-p}$
    //    를 그대로 답으로 낸다 — 묻는 것이 «더 넣은 개수»인 역방향 유형이라 이 걸음이
    //    빠지면 답이 $a+b$ 만큼 커진다.
    //
    // 🟢 은 **측정이자 대수**다. ⑴ 이 답과 같아지려면 $p=q-p$, 곧 $q=2p$ 여야 하는데
    // $\gcd(q-p,q)=\gcd(p,q)=1$ 이므로 그때 $p=1,q=2$ 다 — 생성기의 $q\ge3$ 이 이미
    // 막는다(표본 466판에서 $q=2p$ 인 판 **0**). ⑵ 는 $a\ge2$·$b\ge1$ 이라 늘 $a+b\ge3$
    // 만큼 크다. 실측 |지운 값 − 답| 의 최솟값은 ⑴ 이 $4.4$ 다.
    //
    // 나눗셈이 안 떨어지는 판(466 중 343)은 학생이 자연수를 못 얻는 자리다 — 그것도
    // «답이 그대로가 아니다»이므로 **떠 있는 소수로 적지 않고 기약분수 꼴**로 낸다
    // (`12.399999999999999` 같은 값이 판정 기록에 남으면 이 자가 고장 난 것처럼 읽힌다).
    const { target: a, other: b, p: pp, q: qq } = f as Record<string, number>;
    const g0 = (u: number, v: number): number => (v === 0 ? u : g0(v, u % v));
    const exact = (num: number, den: number): string => {
      const g = g0(Math.abs(num), Math.abs(den)) || 1;
      return den / g === 1 ? String(num / g) : `${num / g}/${den / g}`;
    };
    return [
      {
        name: "여사건으로 방향을 뒤집는 걸음 지움",
        values: [exact(a! * qq! - (a! + b!) * pp!, pp!)],
      },
      {
        name: "전체 개수에서 처음 개수를 빼는 걸음 지움",
        values: [exact(a! * qq!, qq! - pp!)],
      },
    ];
  }
  if (key === "2-1|연립일차방정식|141X") {
    // 굳지 않는다 — 「$a+1$ 이 $N=S+T$ 의 약수」는 **후보 목록을 만들 뿐**이고, 거기서
    // ㉠ $y=S-x$ 도 자연수인가로 **걸러야** 하고 ㉡ 살아남은 것을 **다 더해야** 한다.
    //
    // ⑴ 거르는 걸음을 지우면 $2$ 이상인 약수를 전부 받아들여 $\sum(d-1)$ 이 된다.
    //    생성기가 「버리는 후보가 하나 이상」을 못 박았고 버려지는 $d$ 는 $d-1\ge1$ 을
    //    보태므로 그 합은 **늘 답보다 크다**(실측 차의 최솟값 $1$).
    // ⑵ 「모두 구하여 그 합」을 안 읽고 하나에서 멈추면 첫 값이나 끝 값이 나온다.
    //    살아남는 값이 둘 이상이고 전부 자연수라 부분은 늘 전체보다 작다.
    //
    // 약수 목록은 `divisorsOf` 를 안 부르고 여기서 다시 센다 — 이 블록이 판정기 밖
    // 모듈에 기대지 않게(그리고 「제품이 쓰는 판단을 그대로 불러오면」이 되지 않게).
    const { sum: S, diff: T } = f as Record<string, number>;
    const N = S! + T!;
    const keep: number[] = [];
    let all = 0;
    for (let d = 2; d <= N; d += 1) {
      if (N % d !== 0) continue;
      all += d - 1;
      if (N / d <= S! - 1) keep.push(d - 1);
    }
    return [
      { name: "「$y$ 도 자연수」로 거르는 걸음 지움", values: [String(all)] },
      {
        name: "하나만 구하고 멈춤 (다 안 더함)",
        values: [String(keep[0]), String(keep[keep.length - 1])],
      },
    ];
  }
  if (key === "2-2|도형의 닮음|142X") {
    // 굳지 않는다 — 발문이 닮음 기호를 안 쓰므로 «어느 변이 대응하는가»가 세 갈래이고,
    // ㉠ 「나머지 두 변도 자연수」로 걸러 ㉡ 살아남은 둘을 더해야 한다.
    //
    // ⑴ 거르는 걸음을 지우면 셋이 다 살아나 $\dfrac{(둘레)\times t}{s}$ 를 셋 다 더한다.
    //    죽는 후보의 둘레는 양수이므로 합은 **늘 답보다 크고**, 게다가 432판 중 342판은
    //    자연수도 아니다(실측). 부동소수 잡음이 판정 기록에 남지 않게 **기약분수**로 낸다.
    // ⑵ 「모두 구하여 그 합」을 안 읽고 한 갈래에서 멈추면 살아남은 둘 중 하나가 나온다
    //    (생성기가 둘이 서로 다름을 못 박았으므로 값이 둘이라 그 자체로 «하나로 안 굳음»).
    //
    // 죽는 후보가 **정확히 하나**임은 가정하지 않고 재확인했다 — 표본 432판 전량이 그랬다.
    const { s1, s2, s3, given: t } = f as Record<string, number>;
    const sides = [s1!, s2!, s3!];
    const per = s1! + s2! + s3!;
    const kept = sides.filter((s) => sides.every((v) => (v * t!) % s === 0));
    const g0 = (u: number, v: number): number => (v === 0 ? u : g0(v, u % v));
    const exact = (num: number, den: number): string => {
      const g = g0(Math.abs(num), Math.abs(den)) || 1;
      return den / g === 1 ? String(num / g) : `${num / g}/${den / g}`;
    };
    // 세 후보의 합을 정확한 분수로 — $\sum \dfrac{(둘레)\times t}{s_i}$.
    let num = 0;
    let den = 1;
    for (const s of sides) {
      num = num * s + per * t! * den;
      den *= s;
    }
    return [
      {
        name: "하나만 구하고 멈춤 (다 안 더함)",
        values: kept.map((s) => String((per * t!) / s)),
      },
      {
        name: "「나머지 두 변도 자연수」로 거르는 걸음 지움",
        values: [exact(num, den)],
      },
    ];
  }
  if (key === "2-2|삼각형의 무게중심|143X") {
    // 굳힘은 **중점연결정리를 두 층에 적는 것**이다. 발문은 둘레와 $\overline{BC}$ 만
    // 주므로 $\overline{AB}$·$\overline{AC}$ 는 끝까지 안 정해지는데,
    // $\overline{PM}+\overline{QN}=\dfrac14(\overline{AB}+\overline{AC})$ 라 **합만
    // 알면 충분해진다** — 정해지지 않은 마디가 답에서 사라지는 자리가 여기다.
    //
    // ⑴ $\overline{PQ}$ 에 둘째 층을 안 적으면 $\overline{PQ}=\overline{MN}
    //    =\dfrac12\overline{BC}$ 로 읽어 답이 $\dfrac14\overline{BC}$ 만큼 커진다.
    //    생성기의 $\overline{BC}=4\times(\ge2)$ 라 그 차는 늘 $\ge2$ 다(실측 최솟값 $2$).
    // ⑵ 팔 쪽($\overline{PM}$·$\overline{QN}$)에 둘째 층을 안 적으면 $\dfrac12$ 로 읽어
    //    $\dfrac14(\overline{AB}+\overline{AC})$ 만큼 커진다 — 그 값도 늘 $\ge3$ 이다.
    //
    // ⚠️ 「둘레에서 $\overline{BC}$ 를 안 뺐다」도 지울 만한 마디인데 **안 적었다** —
    //    그 값 $\dfrac34\overline{BC}+\dfrac14(둘레)$ 는 ⑴ 의 값과 **대수적으로 같다**
    //    (둘 다 $\overline{BC}+\dfrac14(\overline{AB}+\overline{AC})$). 이름만 다른
    //    같은 수를 두 줄로 적으면 세는 것이 늘지 않고 분모만 부푼다.
    const { total, base } = f as Record<string, number>;
    const sum = total! - base!;
    return [
      {
        name: "$\\overline{PQ}$ 에 둘째 층을 안 적용",
        values: [String(base! / 2 + base! / 2 + sum / 4)],
      },
      {
        name: "$\\overline{PM}+\\overline{QN}$ 에 둘째 층을 안 적용",
        values: [String(base! / 4 + base! / 2 + sum / 2)],
      },
    ];
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
