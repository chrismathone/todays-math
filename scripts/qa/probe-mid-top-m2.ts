/**
 * 🔴 **중2 확대 갈래(`심화중`·`심화상`)를 재는 자** — D-116, `src/lib/middle/m2Top.ts`.
 *
 * 브리프 `tracks/briefs/mid-extending-tiers.md` §3 이 「초등이 네 물결에 걸쳐 물린
 * 함정 셋을 **반드시 재라**」고 했다. 이 파일이 그 셋을 잰다. 그리고 넷째로
 * 「값은 맞고 **지면만 흉한**」 부류를 훑는다 — 값 검산으로는 구조적으로 안 잡힌다.
 *
 * ```bash
 * npx tsx scripts/qa/probe-mid-top-m2.ts --selftest   # 눈금 (양성 6 · 음성 6)
 * npx tsx scripts/qa/probe-mid-top-m2.ts              # 전부 (아래 넷을 차례로)
 * npx tsx scripts/qa/probe-mid-top-m2.ts --smell      # ㈃ 지면 냄새·조사
 * npx tsx scripts/qa/probe-mid-top-m2.ts --anchor     # ㉠ 굳힘이 자리를 고르는가
 * npx tsx scripts/qa/probe-mid-top-m2.ts --erase      # ㉡ 조건을 지우면 답이 바뀌는가
 * npx tsx scripts/qa/probe-mid-top-m2.ts --overlap    # ㉢ 아래 갈래와 겹치는가
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
  [/1\\times-?\d*[a-zA-Z]/, "계수 1 곱셈기호"],
  [/\+-|\\times-|--/, "부호 겹침"],
  [/\$1[a-zA-Z](?![a-zA-Z0-9])/, "계수 1"],
  [/\\dfrac\{\}|\\dfrac\{[^{}]*\}\{\}/, "빈 분수"],
  [/\*\*/, "마크다운 굵게"],
  [/undefined|NaN|Infinity/, "undefined/NaN"],
  [/\$\s*\$/, "빈 수식"],
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

function runSmell(keys: string[]): number {
  let faults = 0;
  let total = 0;
  console.log("\n## ㈃ 지면 냄새 · 조사 — 값 검산이 구조적으로 못 보는 부류");
  for (const key of keys) {
    const rows = samples(key);
    const hits: string[] = [];
    const stems = new Set<string>();
    const answers = new Set<string>();
    for (const p of rows) {
      total += 1;
      const text = `${p.content}\n${p.solution}`;
      for (const s of smellFaults(text))
        hits.push(`[${s}] ${text.slice(0, 90)}`);
      for (const j of josaFaults(text)) hits.push(`[조사] ${j}`);
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

function erasures(key: string, p: MidProblem): Erasure[] {
  const f = p.facts;
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

/** 정답 문자열에서 수만 뽑는다 — `$840\,\mathrm{cm}^2$` → `840`. */
function answerNumber(answer: string): string {
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

function overlapPair(
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
  readonly [string, boolean, "smell" | "josa", string]
> = [
  ["$2a+b=1\\times4t$이다.", true, "smell", "1× 곱셈기호"],
  ["$x=3+-4$이다.", true, "smell", "부호 겹침"],
  ["$\\dfrac{5}{}$이다.", true, "smell", "빈 분수"],
  ["여기는 **굵게** 썼다.", true, "smell", "마크다운 굵게"],
  ["$x=27$를 대입하면", true, "josa", "27 → 을"],
  ["양변에 $6$를 곱하면", true, "josa", "6 → 을"],
  ["$2a+b=4t$이고 $a-b=t$이다.", false, "smell", "멀쩡하다"],
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
];

function runSelftest(): number {
  console.log("## 눈금 — 이 자가 «예»와 «아니오»를 둘 다 낼 수 있나");
  let wrong = 0;
  for (const [text, expected, kind, why] of CALIBRATION) {
    const got =
      kind === "smell"
        ? smellFaults(text).length > 0
        : josaFaults(text).length > 0;
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

function main(): void {
  const args = process.argv.slice(2);
  const only = (name: string): boolean =>
    args.includes(`--${name}`) || args.length === 0;

  if (args.includes("--selftest")) {
    process.exitCode = runSelftest() === 0 ? 0 : 1;
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
