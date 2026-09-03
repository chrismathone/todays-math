/**
 * 중3 **확대 갈래 4차 물결**(`심화중`·`심화상`) — `src/lib/middle/m3Top4.ts` (D-116, `W` 접미사).
 *
 * ## 🔴 이 시험이 3차 물결과 무엇이 다른가
 *
 * 3차가 **실제로 낸 결함** 여덟(모듈 머리말 ⑶ ㉮~㉵)은 전부 **값은 맞고 KaTeX 도 초록**
 * 이라 어느 자도 구조적으로 못 보던 부류다. 그래서 이 시험은 축을 셋 더 세운다.
 *
 * ```
 * ㉮ 해설 높이   제품 `estimateSolutionPx` 로 **씨앗 2,880판**을 재어 최대를 못 박는다
 *                (3차 중1 53V 가 1242px 로 정답지 한 단을 넘겨 옆 해설을 지웠다)
 * ㉳ 해설의 «말»  논리 낱말(자연수/정수 · 같다/다르다 · 크다/작다)을 맞바꾸면 빨개진다
 *                — 값만 지키면 절반이다(3차 중1 51V 는 「배수↔약수」를 바꿔도 초록이었다)
 * ㉵ 미설명 수    해설에 나온 **모든 수**가 독립 재계산으로 설명되는가 (설명 못 하는 수 0)
 * ```
 *
 * ## 🔴 검산이 어디서 오나 — 생성기 규칙을 한 줄도 옮겨 적지 않는다
 *
 *   · `55W` — 발문에서 $S$ 만 읽고 **정수 $m$ 을 $-3000$부터 $3000$까지 훑어**
 *             $m+n+mn=S$ 를 만족하는 짝을 전부 만든다. 약수쌍이라는 생성기의 길을
 *             안 쓰므로 「모두」라는 주장이 **훑은 범위 밖까지** 반증된다.
 *   · `56W` — 정수 부분을 `Math.sqrt` 가 아니라 **정수 곱 탐색**으로 구하고,
 *             그와 **별개로** 부동소수로 $b^2+2ab+c$ 를 직접 계산해 맞댄다(두 길).
 *   · `57W` — 발문의 여섯 값만 읽고 $x$ 를 $1$부터 넉넉히 훑어 **정렬해서** 사분위수를
 *             다시 만든다. 경우 나누기라는 생성기의 길을 안 쓴다.
 *   · `58W` — $\binom82=28$ 쌍을 **전부** 만들어 「국어 합 $=$ 영어 합」을 직접 견준다.
 *             차 $d_i$ 라는 굳힘을 안 쓴다.
 *
 * ## ⚠️ 왜 `generateMiddleProblem` 을 (아직) 안 부르나
 *
 * `generate.ts` 에 `...M3_TOP_4` 를 넣는 것은 **리드가 한다**(이 세션은 공유 파일을 안
 * 건드린다). 그래서 이 시험은 그 함수가 하는 일을 **그 함수가 부르는 바로 그 함수들**
 * (`tidySolution`·`wrapDanClause`·`resolveMiddleTier`)로 다시 밟는다. 그리고
 * **등록된 뒤에는** 「`generateMiddleProblem` 과 글자까지 같은가」가 켜진다(맨 아래).
 * 등록 전에는 그 검사가 «아직 등록 안 됨»을 **찍는다** — 조용히 통과시키면 「등록
 * 뒤에도 같은가」가 영영 안 재어진다.
 *
 * ## ⚠️ 지면 수식 파서를 왜 또 적나
 *
 * 아래 `checkEquations` 는 3차 물결 시험의 것과 무늬가 같다. 그것은 **제품 규칙이
 * 아니라 시험의 연장**이라 두 벌이어도 «규칙이 갈라지는» 부류가 아니고(제품은 이
 * 파서를 한 번도 안 부른다), 물결마다 다루는 기호가 다르다 — 여기서는 `\div` 가
 * 더 필요하다(`57W` 의 평균). 대신 **눈금**을 이 파일에서 다시 세워, 이 파서가
 * «아니오»를 낼 수 있음을 회차마다 증명한다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  isThin,
  skipsWork,
} from "../../../scripts/qa/probe-middle-solution-depth";
import {
  edgeScore,
  oneStepAll,
  siftScore,
  spreadScore,
  topEntries,
} from "../../../scripts/qa/probe-middle-top-m3";
import { createRng } from "../../lib/elementary/rng";
import { bareNumbers } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import { pointsAtFigure } from "../../lib/middle/figureReference";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import type { Sift } from "../../lib/middle/m3Top";
import {
  M3_TOP_4,
  boxMeanPool,
  divisors,
  factorAnswers,
  factorSumPool,
  foldParts,
  fracAnswers,
  fracPartPool,
  intSqrt,
  oneStepReach,
  planBoxMean,
  planFactorSum,
  planFracPart,
  planScatterPair,
  quartilesOfSeven,
  slotQuartiles,
  solveBoxCases,
  solveFactorA,
  solveFactorB,
  solvePairSum,
} from "../../lib/middle/m3Top4";
import { tidySolution } from "../../lib/middle/solutionText";
import { resolveMiddleTier } from "../../lib/middle/tier";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";
import { JASEUP_MEASURED_PX } from "../../lib/printGeometry";
import { estimateSolutionPx } from "../../lib/printOverflow";
import { wrapDanClause } from "../../lib/problemText";
import { josaMismatches, pageSmells } from "../helpers/midPage";
import { catalogMaxNumber, extensionNumberReason } from "../helpers/rpmCatalog";

const KEY_FACTOR = "3-1|다항식의 인수분해|55W";
const KEY_FRAC = "3-1|무리수와 실수|56W";
const KEY_BOX = "3-2|상자그림과 산점도|57W";
const KEY_SCATTER = "3-2|상자그림과 산점도|58W";

/** 씨앗 몇 개 × 변형 셋 — 지면 글자를 눈으로 견주는 검사에 쓴다. */
const SEEDS = [20260903, 7, 4242, 31337, 5150131, 777003, 424242, 99, 13579];
/** 값 검산·설계 검사에 쓰는 넓은 씨앗 — 브리프가 「최소 200」이라 못 박은 자리. */
const WIDE = Array.from({ length: 240 }, (_, i) => 20260903 + i * 7919);
/** 해설 등식 검산은 파싱이 많아 조금 좁게 — 그래도 씨앗 공간을 다 덮는다. */
const EQ_SEEDS = WIDE.slice(0, 90);

const BY_KEY = new Map(M3_TOP_4.map((e) => [e.key, e]));

/** `generate.ts` 의 소금. 등록 뒤에는 아래 마지막 검사가 «글자까지 같은가»로 잠근다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * `generateMiddleProblem` 이 하는 일 — **그 함수가 부르는 함수들로** 다시 밟는다.
 * (보기·「모두 고르시오」 가드는 이 넷에 보기가 없어 아무것도 안 한다.)
 */
function make(key: string, seed: number, variant = 0): MidProblem {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`m3Top4 에 없는 키: ${key}`);
  const p = entry.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  return {
    ...p,
    content,
    solution: tidySolution(p.solution),
    difficulty: resolveMiddleTier(p.difficulty, content, !!p.figureSpec),
  };
}

/** 답에서 처음 나오는 수 — 이웃 모듈의 제네릭 가드가 `facts.x` 와 견주는 그 값. */
function firstNumber(answer: string): number {
  const m = /-?\d+/.exec(answer);
  if (!m) throw new Error(`답에 수가 없다: ${answer}`);
  return Number(m[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// 지면 수식을 «값»으로 되돌리는 작은 파서
//   — 해설이 적은 수를 **다시 계산**하려면 이것이 있어야 한다.
//     없으면 「해설에 이 문자열이 있나」밖에 못 물어보고, 그것은 가드가 아니다.
// ════════════════════════════════════════════════════════════════════════════

type Frac = { n: number; d: number };

function fgcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}
function F(n: number, d = 1): Frac {
  if (d === 0) throw new Error("0으로 나눔");
  const s = d < 0 ? -1 : 1;
  const g = fgcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
const fAdd = (a: Frac, b: Frac): Frac => F(a.n * b.d + b.n * a.d, a.d * b.d);
const fSub = (a: Frac, b: Frac): Frac => F(a.n * b.d - b.n * a.d, a.d * b.d);
const fMul = (a: Frac, b: Frac): Frac => F(a.n * b.n, a.d * b.d);
const fDiv = (a: Frac, b: Frac): Frac => {
  if (b.n === 0) throw new Error("0으로 나눔");
  return F(a.n * b.d, a.d * b.n);
};
const fEq = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d;
function fPow(a: Frac, e: Frac): Frac {
  if (e.d !== 1) throw new Error("지수가 정수가 아니다");
  let r = F(1);
  const k = Math.abs(e.n);
  if (k > 8) throw new Error("지수가 너무 크다");
  for (let i = 0; i < k; i += 1) r = fMul(r, a);
  return e.n < 0 ? fDiv(F(1), r) : r;
}
function fSqrt(a: Frac): Frac {
  const n = intSqrt(a.n);
  const d = intSqrt(a.d);
  if (n === null || d === null) throw new Error("무리수라 값으로 못 잰다");
  return F(n, d);
}

type Tok =
  | { t: "num"; v: number }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" | "=" }
  | { t: "open"; v: "(" | "{" }
  | { t: "close"; v: ")" | "}" }
  | { t: "frac" }
  | { t: "sqrt" };

/** 이 파서가 못 다루는 것 — 등호가 아니거나(부등호), 값이 하나로 안 정해지는 것. */
const UNSUPPORTED = ["\\ne", "\\ge", "\\le", "\\pm", "\\ldots", "\\cdots"];

function tokenize(body: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < body.length) {
    const c = body[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "\\") {
      const m = /^[a-zA-Z]+/.exec(body.slice(i + 1));
      if (!m) throw new Error(`모르는 이스케이프: ${body.slice(i, i + 4)}`);
      const name = m[0];
      i += 1 + name.length;
      if (name === "dfrac" || name === "frac") out.push({ t: "frac" });
      else if (name === "sqrt") out.push({ t: "sqrt" });
      else if (name === "times" || name === "cdot")
        out.push({ t: "op", v: "*" });
      // 🔴 `\div` — `57W` 의 평균이 `$70\div 7=10$` 이다. 3차 파서에는 없어서
      //    그대로 쓰면 그 줄이 통째로 «건너뜀»이 된다(0 은 「못 셈」이다).
      else if (name === "div") out.push({ t: "op", v: "/" });
      else if (name === "left" || name === "right") {
        /* 괄호 크기 지시 — 값에 영향이 없다 */
      } else throw new Error(`못 다루는 명령: ${name}`);
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+/.exec(body.slice(i))!;
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      out.push({ t: "var", v: c });
      i += 1;
      continue;
    }
    if (c === "(" || c === "{") {
      out.push({ t: "open", v: c });
      i += 1;
      continue;
    }
    if (c === ")" || c === "}") {
      out.push({ t: "close", v: c });
      i += 1;
      continue;
    }
    if ("+-*/^=".includes(c)) {
      out.push({ t: "op", v: c as "+" });
      i += 1;
      continue;
    }
    if (c === ",") {
      i += 1;
      continue;
    }
    throw new Error(`모르는 글자: ${c}`);
  }
  return out;
}

/** 맨 바깥 `=` 로 가른다 — 괄호·중괄호 안의 것은 안 가른다. */
function splitEquals(toks: Tok[]): Tok[][] {
  const parts: Tok[][] = [[]];
  let depth = 0;
  for (const tk of toks) {
    if (tk.t === "open") depth += 1;
    if (tk.t === "close") depth -= 1;
    if (tk.t === "op" && tk.v === "=" && depth === 0) {
      parts.push([]);
      continue;
    }
    parts[parts.length - 1]!.push(tk);
  }
  return parts;
}

type Env = Record<string, number | Frac>;

function evalToks(toks: Tok[], env: Env): Frac {
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];

  function startsPrimary(tk: Tok | undefined): boolean {
    if (!tk) return false;
    return (
      tk.t === "num" ||
      tk.t === "var" ||
      tk.t === "frac" ||
      tk.t === "sqrt" ||
      (tk.t === "open" && (tk.v === "(" || tk.v === "{"))
    );
  }

  function primary(): Frac {
    const tk = peek();
    if (!tk) throw new Error("식이 갑자기 끝났다");
    if (tk.t === "num") {
      pos += 1;
      return F(tk.v);
    }
    if (tk.t === "var") {
      pos += 1;
      if (!(tk.v in env)) throw new Error(`값이 안 정해진 문자: ${tk.v}`);
      const v = env[tk.v]!;
      return typeof v === "number" ? F(v) : v;
    }
    if (tk.t === "open") {
      pos += 1;
      const v = expr();
      const cl = peek();
      if (!cl || cl.t !== "close") throw new Error("괄호가 안 닫혔다");
      pos += 1;
      return v;
    }
    if (tk.t === "frac") {
      pos += 1;
      const a = group();
      const b = group();
      return fDiv(a, b);
    }
    if (tk.t === "sqrt") {
      pos += 1;
      return fSqrt(group());
    }
    throw new Error("식이 아닌 자리");
  }

  /** `{...}` 한 덩어리 — 없으면 홑 원소 하나. */
  function group(): Frac {
    const tk = peek();
    if (tk && tk.t === "open" && tk.v === "{") {
      pos += 1;
      const v = expr();
      const cl = peek();
      if (!cl || cl.t !== "close") throw new Error("중괄호가 안 닫혔다");
      pos += 1;
      return v;
    }
    return primary();
  }

  function power(): Frac {
    const base = primary();
    const tk = peek();
    if (tk && tk.t === "op" && tk.v === "^") {
      pos += 1;
      return fPow(base, group());
    }
    return base;
  }

  function unary(): Frac {
    const tk = peek();
    if (tk && tk.t === "op" && tk.v === "-") {
      pos += 1;
      return fMul(F(-1), unary());
    }
    if (tk && tk.t === "op" && tk.v === "+") {
      pos += 1;
      return unary();
    }
    return power();
  }

  function term(): Frac {
    let v = unary();
    for (;;) {
      const tk = peek();
      if (tk && tk.t === "op" && (tk.v === "*" || tk.v === "/")) {
        pos += 1;
        const rhs = unary();
        v = tk.v === "*" ? fMul(v, rhs) : fDiv(v, rhs);
        continue;
      }
      // 이어 붙여 쓴 곱 — `(m+n)x` · `mn` · `2ab`
      if (startsPrimary(tk)) {
        v = fMul(v, unary());
        continue;
      }
      return v;
    }
  }

  function expr(): Frac {
    let v = term();
    for (;;) {
      const tk = peek();
      if (tk && tk.t === "op" && (tk.v === "+" || tk.v === "-")) {
        pos += 1;
        const rhs = term();
        v = tk.v === "+" ? fAdd(v, rhs) : fSub(v, rhs);
        continue;
      }
      return v;
    }
  }

  const v = expr();
  if (pos !== toks.length) throw new Error("식 뒤에 남은 것이 있다");
  return v;
}

/** 이 식이 쓰는 자유 문자 — 환경에 없으면 판정을 못 한다. */
function freeVars(toks: Tok[]): Set<string> {
  const out = new Set<string>();
  for (const tk of toks) if (tk.t === "var") out.add(tk.v);
  return out;
}

type EqReport = {
  /** 실제로 판정한 등식 수 — $0$ 이면 판정을 **거부**해야 한다 */
  checked: number;
  numeric: number;
  identity: number;
  conditional: number;
  skipped: number;
  bad: string[];
};

/**
 * 🔴 **해설이 적은 등식을 전부 다시 계산한다.**
 *
 * `identityEnvs` 는 「이 대수 변형이 늘 옳은가」를 재는 대입이고, `solutionEnvs` 는
 * 해설이 **주장한 값**이다. 둘 다 어디에도 안 걸리면 그 줄은 거짓이다.
 */
function checkEquations(
  text: string,
  identityEnvs: readonly Env[],
  solutionEnvs: readonly Env[],
): EqReport {
  const rep: EqReport = {
    checked: 0,
    numeric: 0,
    identity: 0,
    conditional: 0,
    skipped: 0,
    bad: [],
  };
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    const body = m[1]!;
    if (!body.includes("=")) continue;
    if (UNSUPPORTED.some((u) => body.includes(u))) {
      rep.skipped += 1;
      continue;
    }
    let parts: Tok[][];
    try {
      parts = splitEquals(tokenize(body));
    } catch {
      rep.skipped += 1;
      continue;
    }
    if (parts.length < 2 || parts.some((p) => p.length === 0)) {
      rep.skipped += 1;
      continue;
    }
    const vars = new Set<string>();
    for (const p of parts) for (const v of freeVars(p)) vars.add(v);

    const evalAll = (env: Env): Frac[] | null => {
      try {
        return parts.map((p) => evalToks(p, env));
      } catch {
        return null;
      }
    };
    const allEqual = (vals: Frac[]): boolean =>
      vals.every((v) => fEq(v, vals[0]!));

    if (vars.size === 0) {
      const vals = evalAll({});
      if (vals === null) {
        rep.skipped += 1;
        continue;
      }
      rep.checked += 1;
      rep.numeric += 1;
      if (!allEqual(vals)) rep.bad.push(`수치 등식이 안 맞는다: $${body}$`);
      continue;
    }

    // 항등식인가 — 여러 대입에서 «모두» 같아야 한다.
    let identityOk = identityEnvs.length > 0;
    let identitySeen = 0;
    for (const env of identityEnvs) {
      const vals = evalAll(env);
      if (vals === null) continue;
      identitySeen += 1;
      if (!allEqual(vals)) identityOk = false;
    }
    if (identityOk && identitySeen >= 3) {
      rep.checked += 1;
      rep.identity += 1;
      continue;
    }
    // 「푸는 식」인가 — 해설이 주장한 값 가운데 적어도 하나가 만족해야 한다.
    let hit = false;
    let solSeen = 0;
    for (const env of solutionEnvs) {
      const vals = evalAll(env);
      if (vals === null) continue;
      solSeen += 1;
      if (allEqual(vals)) hit = true;
    }
    if (solSeen === 0) {
      rep.skipped += 1;
      continue;
    }
    rep.checked += 1;
    rep.conditional += 1;
    if (!hit)
      rep.bad.push(
        `항등식도 아니고 주장한 값도 만족하지 않는다: $${body}$ (문자 ${[...vars]})`,
      );
  }
  return rep;
}

// ════════════════════════════════════════════════════════════════════════════
// 발문 읽기 — 검산의 «참»은 **지면 글자**에서 온다
// ════════════════════════════════════════════════════════════════════════════

function readFactorStem(content: string): number {
  const m = /\$a\+b=(\d+)\$/.exec(content);
  if (!m) throw new Error(`55W 발문을 못 읽었다\n${content}`);
  return Number(m[1]);
}

function readFracStem(content: string): { n: number; c: number } {
  const m = /\$\\sqrt\{(\d+)\}\$의 정수 부분을 \$a\$/.exec(content);
  const c = /\$b\^\{2\}\+2ab\+(\d+)\$의 값/.exec(content);
  if (!m || !c) throw new Error(`56W 발문을 못 읽었다\n${content}`);
  return { n: Number(m[1]), c: Number(c[1]) };
}

function readBoxStem(content: string): { vs: number[]; m: number; q: number } {
  const line = content.split("\n").find((l) => l.endsWith("$x$"));
  const cond = /중앙값이 \$(\d+)\$이고 사분위수범위가 \$(\d+)\$/.exec(content);
  if (!line || !cond) throw new Error(`57W 발문을 못 읽었다\n${content}`);
  const vs = [...line.matchAll(/\$(\d+)\$/g)].map((g) => Number(g[1]));
  if (vs.length !== 6) throw new Error(`57W 자료가 여섯이 아니다: ${vs}`);
  return { vs, m: Number(cond[1]), q: Number(cond[2]) };
}

function readScatterStem(content: string): { xs: number[]; ys: number[] } {
  const pts = [...content.matchAll(/\$\((\d+),\\ (\d+)\)\$/g)];
  if (pts.length !== 8) throw new Error(`58W 발문을 못 읽었다\n${content}`);
  return {
    xs: pts.map((g) => Number(g[1])),
    ys: pts.map((g) => Number(g[2])),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 독립 재계산 — 생성기의 길(약수쌍·경우 나누기·차)을 **한 번도 안 쓴다**
// ════════════════════════════════════════════════════════════════════════════

/**
 * 55W — 「$a$ 의 값을 **모두**」라는 주장을 정수 전 범위로 반증한다.
 *
 * $m$ 을 $-3000$부터 $3000$까지 훑어 $n=\dfrac{S-m}{1+m}$ 이 정수인 짝을 모두 만들고,
 * 자연수·서로 다름을 대어 살아남은 $a=m+n$ 을 모은다. 약수쌍을 한 번도 안 쓴다.
 */
function bruteFactorA(s: number): number[] {
  const out = new Set<number>();
  for (let m = -3000; m <= 3000; m += 1) {
    if (m + 1 === 0) continue;
    const num = s - m;
    if (num % (m + 1) !== 0) continue;
    const n = num / (m + 1);
    if (m + n + m * n !== s) continue;
    if (m < 1 || n < 1) continue;
    if (m === n) continue;
    out.add(m + n);
  }
  return [...out].sort((a, b) => a - b);
}

/** 56W — 정수 부분을 `Math.sqrt` 없이 **정수 곱 탐색**으로 구한다. */
function intFloorSqrt(n: number): number {
  let a = 0;
  while ((a + 1) * (a + 1) <= n) a += 1;
  return a;
}

/**
 * 57W — $x$ 를 훑어 **정렬해서** 조건을 만족하는 값을 모두 모은다.
 *
 * ⚠️ **자료값과 같은 $x$ 는 발문이 뺀다** — 「값이 서로 다른 일곱 개의 자료」이기
 *    때문이다. 그 한마디가 없으면 조건을 만족하는 $x$ 가 **둘**이 되는 씨앗이 생긴다
 *    (정렬에 같은 값이 둘이면 $x$ 의 «자리»가 두 경우에 걸친다). 그래서 아래 값 검산이
 *    발문에 그 말이 실제로 있는지 먼저 확인한다 — 없으면 이 함수가 거짓말을 한다.
 */
function bruteBoxX(vs: readonly number[], m: number, q: number): number[] {
  const out: number[] = [];
  const top = Math.max(...vs) + 500;
  for (let x = 1; x <= top; x += 1) {
    if (vs.includes(x)) continue;
    const s = [...vs, x].sort((a, b) => a - b);
    if (s[3] !== m) continue;
    if (s[5]! - s[1]! !== q) continue;
    out.push(x);
  }
  return out;
}

/** 58W — 28쌍을 **전부** 만들어 「국어 합 $=$ 영어 합」을 직접 견준다. */
function bruteScatterPairs(
  xs: readonly number[],
  ys: readonly number[],
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      if (xs[i]! + xs[j]! === ys[i]! + ys[j]!) out.push([i, j]);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// 🔴 해설의 «말» — 논리 낱말을 맞바꾸면 빨개져야 한다 (3차 ㉳ 가 흘린 자리)
//   판정은 **독립 재계산**으로 하고, 글은 그 판정과 맞는 낱말을 써야 한다.
// ════════════════════════════════════════════════════════════════════════════

function factorWords(content: string, solution: string): string[] {
  const bad: string[] = [];
  const s = readFactorStem(content);
  const t = s + 1;
  if (!solution.includes("부호가 서로 같고")) bad.push("부호 근거가 없다");
  if (!solution.includes("모두 자연수이다")) bad.push("자연수 근거가 없다");
  // 🔴 굳힘 줄과 나열이 **서로 어긋나면 안 된다.** 2026-09-03 검문에서 이 해설은
  //    「$m+1$과 $n+1$은 모두 $2$ 이상이다」라고 적고 **바로 다음 줄에서
  //    $m+1=1$ 을 훑고 있었다**(리드 실측 1,200/1,200판 = 100%). 게다가 버리는
  //    근거마저 그 제약이 아니라 「$b=mn=0$」이었다. 값도 KaTeX 도 초록이라
  //    어느 자도 구조적으로 못 보는 부류다 — 그래서 여기 못 박는다.
  const saysTwoUp = solution.includes("모두 $2$ 이상이다");
  if (!saysTwoUp) bad.push("굳힘 줄(«$m+1$·$n+1$ 은 모두 $2$ 이상»)이 없다");
  if (saysTwoUp && solution.includes("$m+1=1$")) {
    bad.push("「모두 $2$ 이상」이라 적고 $m+1=1$ 을 훑는다 (자기모순)");
  }
  if (saysTwoUp && !solution.includes("$2$ 이상인 두 자연수의 곱")) {
    bad.push("나열 줄이 「$2$ 이상인 두 자연수의 곱」이라고 적지 않았다");
  }
  const lines = solution.split("\n").filter((l) => /^[㉠-㉧]/.test(l));
  // 굳힘 줄이 「$m+1$·$n+1$ 은 모두 $2$ 이상」이라 못 박으므로 $(1,\,T)$ 는
  // 애초에 나열하지 않는다 — 제품과 같은 창을 여기서도 독립으로 만든다.
  const pairs = divisors(t).filter((d) => d >= 2 && d * d <= t);
  if (lines.length !== pairs.length) {
    bad.push(`후보 줄이 ${lines.length}개인데 약수쌍은 ${pairs.length}개다`);
  }
  lines.forEach((line, i) => {
    const g = /\$m=(-?\d+)\$, \$n=(-?\d+)\$/.exec(line);
    if (!g) {
      bad.push(`후보 줄에서 $m$·$n$ 을 못 읽었다: ${line}`);
      return;
    }
    const m = Number(g[1]);
    const n = Number(g[2]);
    // 🔴 판정은 **여기서 다시** 한다 — 해설의 말을 근거로 삼지 않는다.
    const alive = m >= 1 && n >= 1 && m !== n;
    const saysNo = line.includes("조건에 맞지 않는다");
    const saysYes = line.includes("조건에 맞고");
    if (alive) {
      if (!saysYes || saysNo)
        bad.push(`살아야 하는데 죽었다고 적었다: ${line}`);
      if (!line.includes("서로 다르므로"))
        bad.push(`사는 근거(상수항이 «서로 다르다»)가 없다: ${line}`);
    } else if (m < 1 || n < 1) {
      // 굳힘 줄이 $(1,\,T)$ 를 이미 죽였으므로 여기 오면 안 된다.
      bad.push(`「모두 $2$ 이상」을 어기는 줄이 나왔다: ${line}`);
    } else {
      if (!saysNo || saysYes)
        bad.push(`죽어야 하는데 살았다고 적었다: ${line}`);
      if (!line.includes("서로 같으므로"))
        bad.push(`죽는 근거(상수항이 «서로 같다»)가 없다: ${line}`);
    }
    void i;
  });
  return bad;
}

function fracWords(content: string, solution: string): string[] {
  const bad: string[] = [];
  const { n } = readFracStem(content);
  const a = intFloorSqrt(n);
  if (!solution.includes(`정수 부분은 $a=${a}$`))
    bad.push("정수 부분을 $a$ 로 옳게 적지 않았다");
  if (!solution.includes(`소수 부분은 $b=\\sqrt{${n}}-${a}$`))
    bad.push("소수 부분을 $b$ 로 옳게 적지 않았다");
  // 🔴 둘을 맞바꾸면 여기서 잡힌다.
  if (/정수 부분은 \$b=/.test(solution)) bad.push("정수 부분에 $b$ 를 적었다");
  if (/소수 부분은 \$a=/.test(solution)) bad.push("소수 부분에 $a$ 를 적었다");
  // 가두는 두 제곱수의 **차례**가 뒤바뀌면 부등식이 거짓이 된다.
  if (!solution.startsWith(`$${a}^{2}=${a * a}$, $${a + 1}^{2}=`))
    bad.push("가두는 두 제곱을 작은 것부터 적지 않았다");
  if (!solution.includes(`$${a}<\\sqrt{${n}}<${a + 1}$`))
    bad.push("가둔 결과를 적지 않았다");
  return bad;
}

function boxWords(content: string, solution: string): string[] {
  const bad: string[] = [];
  const { vs, m, q } = readBoxStem(content);
  // 굳힘의 방향 — 중앙값이 셋째 값이면 $x$ 가 아래쪽, 넷째 값이면 위쪽이다.
  const lo = m === vs[2];
  if (lo) {
    if (!solution.includes("보다 커지므로") || !solution.includes(`$x<${m}$`))
      bad.push("아래 갈래인데 굳힘의 방향이 틀렸다");
    if (solution.includes("보다 작아지므로"))
      bad.push("아래 갈래인데 «작아지므로»라고 적었다");
  } else {
    if (!solution.includes("보다 작아지므로") || !solution.includes(`$x>${m}$`))
      bad.push("위 갈래인데 굳힘의 방향이 틀렸다");
    if (solution.includes("보다 커지므로"))
      bad.push("위 갈래인데 «커지므로»라고 적었다");
  }
  const lines = solution.split("\n").filter((l) => /^[㉠-㉧]/.test(l));
  const cases = solveBoxCases(vs, m, q, true);
  if (lines.length !== cases.length) {
    bad.push(`경우 줄이 ${lines.length}개인데 경우는 ${cases.length}개다`);
    return bad;
  }
  let alive = 0;
  lines.forEach((line, i) => {
    const c = cases[i]!;
    const sq = slotQuartiles(vs, c.slot);
    const isConst = sq.q1 !== null && sq.q3 !== null;
    const hit = c.hits.length > 0;
    const saysNo = line.includes("조건에 맞지 않는다");
    const saysYes =
      line.includes("조건을 만족한다") || line.includes("조건에 맞는다");
    if (hit) alive += 1;
    if (hit && (!saysYes || saysNo)) bad.push(`살아야 하는데 죽었다: ${line}`);
    if (!hit && (saysNo === false || saysYes))
      bad.push(`죽어야 하는데 살았다: ${line}`);
    if (isConst && !line.includes("일정"))
      bad.push(`상수인데 안 적었다: ${line}`);
    if (!isConst && line.includes("일정")) bad.push(`변수인데 «일정»: ${line}`);
    // ㉯ — 상수 구간이 살면 「이 구간의 자연수는 하나뿐」을 **셈으로** 적어야 한다.
    if (isConst && hit && !line.includes("뿐이다"))
      bad.push(`자연수가 하나뿐이라는 근거가 없다: ${line}`);
  });
  if (alive !== 1) bad.push(`사는 경우가 ${alive}개다`);
  return bad;
}

function scatterWords(content: string, solution: string): string[] {
  const bad: string[] = [];
  const { xs, ys } = readScatterStem(content);
  const ds = xs.map((v, i) => v - ys[i]!);
  if (!solution.includes("절댓값이 같고 부호가 서로 다른"))
    bad.push("굳힘의 말(«절댓값이 같고 부호가 다르다»)이 없다");
  if (solution.includes("부호가 서로 같은"))
    bad.push("부호를 «같은»으로 적었다");
  if (!solution.includes(`차례로 $${ds.join("$, $")}$이다`))
    bad.push("차의 목록이 독립 재계산과 다르다");
  const abs = ds.map((d) => Math.abs(d));
  if (!solution.includes(`나열하면 $${abs.join("$, $")}$이고`))
    bad.push("절댓값 목록이 독립 재계산과 다르다");
  const dup = [...new Set(abs.filter((v, i) => abs.indexOf(v) !== i))];
  if (dup.length !== 1) bad.push(`두 번 나오는 절댓값이 ${dup.length}개다`);
  else if (!solution.includes(`두 번 나오는 것은 $${dup[0]}$뿐이다`))
    bad.push("두 번 나오는 값을 옳게 짚지 않았다");
  return bad;
}

// ════════════════════════════════════════════════════════════════════════════
// 🔴 미설명 수 — 해설에 나온 **모든 수**가 독립 재계산으로 설명되는가
//   ⚠️ 부호는 여기서 안 본다(`16-2` 의 `-2` 가 거짓 경보가 된다).
//      부호는 위 `checkEquations` 가 값으로 본다 — 두 자가 다른 축을 맡는다.
// ════════════════════════════════════════════════════════════════════════════

function unexplained(text: string, explained: Set<number>): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d+/g)) {
    const v = Number(m[0]);
    if (!explained.has(v)) out.push(v);
  }
  return [...new Set(out)];
}

// ════════════════════════════════════════════════════════════════════════════
// 눈금 — 이 시험의 «자»가 «아니오» 를 낼 수 있나
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] 눈금 — 해설 검산기가 «아니오»를 낼 수 있다", () => {
  const ENV_I = [
    { x: 2, a: 3, b: 5, m: 4, n: 7 },
    { x: -4, a: 7, b: 2, m: 1, n: 9 },
    { x: 11, a: 1, b: 6, m: 5, n: 2 },
    { x: 0, a: 5, b: 3, m: 8, n: 6 },
  ];
  const ENV_S = [{ x: 1, a: 6, b: 8, m: 2, n: 4 }];

  it("수치 등식이 틀리면 잡는다 (양성)", () => {
    const r = checkEquations("$2+3=6$이다.", ENV_I, ENV_S);
    expect(r.numeric).toBe(1);
    expect(r.bad.length).toBe(1);
  });

  it("맞는 수치 등식은 안 잡는다 (음성)", () => {
    const r = checkEquations(
      "$(-6)^{2}-36=0$이고 $1+4+9=14$이다.",
      ENV_I,
      ENV_S,
    );
    expect(r.numeric).toBe(2);
    expect(r.bad).toEqual([]);
  });

  it("대수 변형이 틀리면 잡는다 (양성)", () => {
    expect(
      checkEquations("$(x+m)(x+n)=x^{2}+(m+n)x+mn+1$", ENV_I, ENV_S).bad.length,
    ).toBe(1);
  });

  it("맞는 항등식은 «항등식»으로 센다 (음성)", () => {
    const r = checkEquations("$(x+m)(x+n)=x^{2}+(m+n)x+mn$", ENV_I, ENV_S);
    expect(r.identity).toBe(1);
    expect(r.bad).toEqual([]);
  });

  it("「푸는 식」은 주장한 값으로 판정한다", () => {
    expect(checkEquations("$a=6$", ENV_I, ENV_S).bad).toEqual([]);
    expect(checkEquations("$a=7$", ENV_I, ENV_S).bad.length).toBe(1);
  });

  it("🔴 `\\div` 를 읽는다 — 못 읽으면 `57W` 의 평균 줄이 통째로 «건너뜀»이다", () => {
    const ok = checkEquations("$70\\div 7=10$", ENV_I, ENV_S);
    expect(ok.numeric).toBe(1);
    expect(ok.bad).toEqual([]);
    const ng = checkEquations("$70\\div 7=11$", ENV_I, ENV_S);
    expect(ng.numeric).toBe(1);
    expect(ng.bad.length).toBe(1);
  });

  it("분수·근호·이어 붙인 곱을 읽는다", () => {
    const r = checkEquations(
      "$\\dfrac{11+7}{6}=3$, $\\sqrt{36}+2=8$, $5(2-1)+2\\times3=11$",
      ENV_I,
      ENV_S,
    );
    expect(r.numeric).toBe(3);
    expect(r.bad).toEqual([]);
  });

  it("못 재는 것은 «건너뜀»으로 세고 판정하지 않는다", () => {
    const ineq = checkEquations("$121-12k\\ge 0$", ENV_I, ENV_S);
    expect(ineq.checked).toBe(0);
    expect(ineq.bad).toEqual([]);
    const irr = checkEquations("$b=\\sqrt{126}-11$", ENV_I, []);
    expect(irr.checked).toBe(0);
  });

  it("$0$ 은 「깨끗」이 아니라 「못 셈」이다 — 등식이 없으면 `checked` 가 $0$ 이다", () => {
    expect(checkEquations("등식이 없는 글이다.", ENV_I, ENV_S).checked).toBe(0);
  });
});

describe("[중3 4차 물결] 눈금 — 「말 검사기」가 «아니오»를 낼 수 있다", () => {
  it("55W — 「자연수」·「서로 다르다」를 맞바꾸면 빨개진다", () => {
    const p = make(KEY_FACTOR, SEEDS[0]!);
    expect(factorWords(p.content, p.solution)).toEqual([]); // 음성
    // 양성 ⑴ 사는 근거의 낱말을 뒤집는다
    expect(
      factorWords(
        p.content,
        p.solution.replace("서로 다르므로", "서로 같으므로"),
      ),
    ).not.toEqual([]);
    // 양성 ⑵ 굳힘 줄이 못 박은 것을 나열이 어긴다 — 옛 결함을 그대로 되살린다
    expect(
      factorWords(
        p.content,
        `${p.solution}\n한편 $m+1=1$이면 $b=mn=0$이어서 조건에 맞지 않는다.`,
      ),
    ).not.toEqual([]);
    // 양성 ⑵′ 굳힘 줄 자체를 지운다
    expect(
      factorWords(
        p.content,
        p.solution.replace("모두 $2$ 이상이다", "모두 정수이다"),
      ),
    ).not.toEqual([]);
    // 양성 ⑶ 사는 줄의 판정을 뒤집는다 — 이 줄은 **어느 판에나** 있다
    expect(p.solution).toContain("조건에 맞고");
    expect(
      factorWords(
        p.content,
        p.solution.replace("조건에 맞고", "조건에 맞지 않고"),
      ),
    ).not.toEqual([]);
    // 양성 ⑶′ 죽는 줄의 판정을 뒤집는다.
    // ⚠️ $(1,\,T)$ 를 나열에서 뺀 뒤로 「조건에 맞지 않는다」는 **$T$ 가 제곱수일
    //    때만** 나온다(가운데 쌍 $m=n$). 그래서 그런 씨앗을 **찾아서** 대고,
    //    못 찾으면 «깨끗»이 아니라 **실패**로 찍는다 — 안 그러면 이 양성 대조가
    //    조용히 0이 된다(「0 은 «깨끗»과 «못 셈»을 안 가른다」).
    //    (씨앗은 **지면에서** 읽는다 — `planFactorSum(createRng(seed))` 은
    //    `make` 와 씨앗 뿌리는 법이 달라 다른 판을 낸다.)
    const squareSeed = WIDE.find(
      (s) => intSqrt(readFactorStem(make(KEY_FACTOR, s).content) + 1) !== null,
    );
    expect(
      squareSeed,
      "제곱수 $T$ 씨앗이 없어 «죽는 줄» 양성을 못 잰다",
    ).toBeDefined();
    const q = make(KEY_FACTOR, squareSeed!);
    expect(q.solution).toContain("조건에 맞지 않는다");
    expect(
      factorWords(
        q.content,
        q.solution.replace("조건에 맞지 않는다", "조건에 맞는다"),
      ),
    ).not.toEqual([]);
    // 양성 ⑷ 굳힘의 근거 줄을 통째로 지운다
    expect(
      factorWords(p.content, p.solution.replace("부호가 서로 같고", "그리고")),
    ).not.toEqual([]);
  });

  it("56W — 「정수 부분」과 「소수 부분」을 맞바꾸면 빨개진다", () => {
    const p = make(KEY_FRAC, SEEDS[0]!);
    expect(fracWords(p.content, p.solution)).toEqual([]);
    expect(
      fracWords(
        p.content,
        p.solution.replace("정수 부분은 $a=", "소수 부분은 $a="),
      ),
    ).not.toEqual([]);
    expect(
      fracWords(
        p.content,
        p.solution.replace("소수 부분은 $b=", "정수 부분은 $b="),
      ),
    ).not.toEqual([]);
  });

  it("57W — 「커지므로」와 「작아지므로」를 맞바꾸면 빨개진다", () => {
    // 두 갈래를 **둘 다** 밟는다 — 한쪽만 보면 다른 갈래의 가드가 죽어도 모른다.
    const seen = new Set<string>();
    for (const seed of WIDE) {
      const p = make(KEY_BOX, seed);
      const { vs, m } = readBoxStem(p.content);
      const branch = m === vs[2] ? "lo" : "hi";
      if (seen.has(branch)) continue;
      seen.add(branch);
      expect(boxWords(p.content, p.solution), branch).toEqual([]);
      const flipped =
        branch === "lo"
          ? p.solution.replace("보다 커지므로", "보다 작아지므로")
          : p.solution.replace("보다 작아지므로", "보다 커지므로");
      expect(boxWords(p.content, flipped), branch).not.toEqual([]);
      expect(
        boxWords(
          p.content,
          p.solution.replace("조건에 맞지 않는다", "조건에 맞는다"),
        ),
        branch,
      ).not.toEqual([]);
      if (seen.size === 2) break;
    }
    expect(seen.size, "두 갈래를 다 밟지 못했다").toBe(2);
  });

  it("58W — 「부호가 서로 다른」을 「같은」으로 바꾸면 빨개진다", () => {
    const p = make(KEY_SCATTER, SEEDS[0]!);
    expect(scatterWords(p.content, p.solution)).toEqual([]);
    expect(
      scatterWords(
        p.content,
        p.solution.replace("부호가 서로 다른", "부호가 서로 같은"),
      ),
    ).not.toEqual([]);
    // 나열 줄의 수를 하나만 바꿔도 잡힌다 (값 검산과 다른 축이다).
    const ds = readScatterStem(p.content).xs.map(
      (v, i) => v - readScatterStem(p.content).ys[i]!,
    );
    expect(
      scatterWords(
        p.content,
        p.solution.replace(`차례로 $${ds.join("$, $")}$이다`, "차례로 $0$이다"),
      ),
    ).not.toEqual([]);
  });

  it("🔴 「미설명 수」 자가 살아 있다 (양성 1 · 음성 1)", () => {
    expect(unexplained("값은 $12$이다.", new Set([12]))).toEqual([]);
    expect(unexplained("값은 $12$이다.", new Set([13]))).toEqual([12]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉠ 등록 메타 — 개수를 **얼린다**
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉠ 등록 메타", () => {
  it("유형은 정확히 넷이고 키가 그대로다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M3_TOP_4).toHaveLength(4);
    expect(M3_TOP_4.map((e) => e.key)).toEqual([
      KEY_FACTOR,
      KEY_FRAC,
      KEY_BOX,
      KEY_SCATTER,
    ]);
  });

  it("확장 번호는 «숫자+영문 대문자 한 글자» 라 RPM 색인과 영영 안 겹친다", () => {
    for (const e of M3_TOP_4) {
      expect(e.rpmType, e.key).toMatch(/^\d+W$/);
      expect(e.key.split("|"), e.key).toHaveLength(3);
      expect(e.grade).toBe("중3");
      expect(catalogMaxNumber(e.rpmBook, e.rpmMinor), e.key).not.toBeNull();
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
    expect(new Set(M3_TOP_4.map((e) => e.rpmType)).size).toBe(4);
  });

  it("소단원 이름이 시드 정본과 **글자 그대로** 같다 (가는 공백 U+2009 포함)", () => {
    const mid3 = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    // 눈금 — 이 검사가 «아니오»를 낼 수 있나. 없는 이름은 반드시 걸려야 한다.
    expect(mid3.has("무리수와 실수")).toBe(true);
    expect(mid3.has("무리수와실수")).toBe(false);
    for (const e of M3_TOP_4) {
      expect(mid3.has(e.unitSection), `${e.key} → ${e.unitSection}`).toBe(true);
      expect(
        [...e.unitSection].some((c) => c.charCodeAt(0) === 0x2009),
        `${e.key}: 가는 공백(U+2009)이 들어 있다`,
      ).toBe(false);
    }
  });

  it("🔴 소단원 이름과 RPM 중단원 이름이 **다른 것이 셋**이다 — 손으로 적으면 어긋난다", () => {
    const byType = new Map(M3_TOP_4.map((e) => [e.rpmType, e]));
    expect(byType.get("55W")!.unitSection).toBe("인수분해");
    expect(byType.get("55W")!.rpmMinor).toBe("다항식의 인수분해");
    expect(byType.get("57W")!.unitSection).toBe("상자그림");
    expect(byType.get("57W")!.rpmMinor).toBe("상자그림과 산점도");
    expect(byType.get("58W")!.unitSection).toBe("산점도와 상관관계");
    expect(byType.get("58W")!.rpmMinor).toBe("상자그림과 산점도");
    // 하나는 둘이 같다 — 이 대비가 위 셋을 «오타»가 아니라 **규약**으로 만든다.
    expect(byType.get("56W")!.unitSection).toBe(byType.get("56W")!.rpmMinor);
    // 🔴 그리고 **같은 중단원에 둘**이 들어간다 — 번호가 겹치면 안 된다.
    expect(byType.get("57W")!.rpmMinor).toBe(byType.get("58W")!.rpmMinor);
    expect(byType.get("57W")!.rpmType).not.toBe(byType.get("58W")!.rpmType);
  });

  it("갈래를 스스로 선언한다 — 밑단 규칙(`resolveMiddleTier`)이 안 내린다", () => {
    const got = new Map<string, Set<string>>();
    for (const e of M3_TOP_4) {
      const tiers = new Set<string>();
      for (const seed of SEEDS)
        for (const v of [0, 1, 2]) tiers.add(make(e.key, seed, v).difficulty);
      got.set(e.key, tiers);
    }
    expect([...got.get(KEY_FACTOR)!]).toEqual(["심화상"]);
    expect([...got.get(KEY_FRAC)!]).toEqual(["심화중"]);
    expect([...got.get(KEY_BOX)!]).toEqual(["심화상"]);
    expect([...got.get(KEY_SCATTER)!]).toEqual(["심화중"]);
  });

  it("확대 갈래가 **둘 다** 선다 — 하나만 세우고 «세웠다»고 하지 않는다", () => {
    const tiers = new Set(
      M3_TOP_4.map((e) => make(e.key, 20260903).difficulty),
    );
    expect(tiers).toEqual(new Set(["심화중", "심화상"]));
  });

  it("씨앗을 넓게 훑어도 던지지 않는다", () => {
    for (const e of M3_TOP_4) {
      for (let s = 0; s < 150; s += 1) {
        expect(() => make(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("같은 씨앗이면 같은 결과 — AI 가 아니다", () => {
    for (const e of M3_TOP_4) {
      const a = make(e.key, 424242, 1);
      const b = make(e.key, 424242, 1);
      expect(a.content).toBe(b.content);
      expect(a.answer).toBe(b.answer);
      expect(a.solution).toBe(b.solution);
    }
  });

  it("800씨앗에서 서로 다른 해설이 **열셋 이상** — 12벌 적재를 채울 수 있다", () => {
    const wide = Array.from({ length: 800 }, (_, i) => 20260903 + i * 7919);
    for (const e of M3_TOP_4) {
      const sols = new Set<string>();
      const stems = new Set<string>();
      for (const s of wide) {
        const p = make(e.key, s);
        sols.add(p.solution);
        stems.add(p.content);
      }
      expect(
        sols.size,
        `${e.key}: 서로 다른 해설 ${sols.size}`,
      ).toBeGreaterThan(12);
      expect(stems.size, `${e.key}: 서로 다른 발문`).toBeGreaterThan(12);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉡ 값 검산 — 발문의 수만 읽고 **다른 길로** 다시 계산한다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉡ 값 검산 — 생성기 길을 옮겨 적지 않는다", () => {
  it("55W — 정수 $m$ 을 전 범위로 훑어 「모두」를 반증한다 (빠짐 0 · 군더더기 0)", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_FACTOR, seed);
      const s = readFactorStem(p.content);
      const brute = bruteFactorA(s);
      // 지면이 나열한 $b$ 와 **글자 그대로** 맞대고, 합도 다시 더한다.
      const last = p.solution.split("\n").at(-1)!;
      const listed = [...last.matchAll(/\$(\d+)\$/g)].map((g) => Number(g[1]));
      const eq = /그 합은 \$([\d+]+)=(\d+)\$이다/.exec(last);
      expect(eq, `s${seed}: 마지막 줄을 못 읽었다\n${last}`).not.toBeNull();
      const added = eq![1]!.split("+").map(Number);
      expect(listed, `s${seed}: 나열과 덧셈이 다르다`).toEqual(added);
      expect(added, `s${seed}: 나열이 전수 훑기와 다르다 (${brute})`).toEqual(
        brute,
      );
      expect(added.reduce((t, v) => t + v, 0)).toBe(Number(eq![2]));
      expect(firstNumber(p.answer)).toBe(Number(eq![2]));
      expect(p.facts.x).toBe(Number(eq![2]));
      expect(brute.length).toBeGreaterThanOrEqual(2);
      expect(brute.length).toBeLessThanOrEqual(4);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("56W — 정수 탐색과 **부동소수** 두 길로 값을 다시 낸다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_FRAC, seed);
      const { n, c } = readFracStem(p.content);
      // ⑴ `Math.sqrt` 를 안 쓰는 정수 탐색
      const a = intFloorSqrt(n);
      expect(a * a, `s${seed}: 가둠이 깨졌다`).toBeLessThan(n);
      expect((a + 1) * (a + 1), `s${seed}: 가둠이 깨졌다`).toBeGreaterThan(n);
      expect(intSqrt(n), `s${seed}: $n$ 이 제곱수다`).toBeNull();
      const want = n - a * a + c;
      expect(firstNumber(p.answer), `s${seed}\n${p.content}`).toBe(want);
      expect(p.facts.x).toBe(want);
      // ⑵ **아예 다른 길** — 소수 부분을 실제로 계산해서 식에 넣는다.
      const b = Math.sqrt(n) - a;
      expect(Math.abs(b * b + 2 * a * b + c - want)).toBeLessThan(1e-8);
      expect(
        b,
        `s${seed}: 소수 부분이 $0$ 과 $1$ 사이가 아니다`,
      ).toBeGreaterThan(0);
      expect(b).toBeLessThan(1);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("57W — $x$ 를 훑어 **정렬해서** 사분위수를 다시 만든다 (유일해)", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_BOX, seed);
      const { vs, m, q } = readBoxStem(p.content);
      // 🔴 위 `bruteBoxX` 가 «자료값과 같은 $x$» 를 빼려면 발문이 그렇게 말해야 한다.
      //    이 한 줄이 없으면 그 자가 조용히 거짓말을 한다.
      expect(
        p.content,
        `s${seed}: 발문이 값이 서로 다르다고 말하지 않는다`,
      ).toContain("값이 서로 다른 일곱 개의 자료");
      const hits = bruteBoxX(vs, m, q);
      expect(
        hits,
        `s${seed}: 조건을 만족하는 $x$ 가 하나가 아니다`,
      ).toHaveLength(1);
      const x = hits[0]!;
      expect(vs, `s${seed}: $x$ 가 자료값과 겹친다`).not.toContain(x);
      const sum = vs.reduce((t, v) => t + v, 0) + x;
      expect(sum % 7, `s${seed}: 평균이 정수가 아니다`).toBe(0);
      expect(firstNumber(p.answer), `s${seed}\n${p.content}`).toBe(sum / 7);
      expect(p.facts.x).toBe(sum / 7);
      expect(p.facts.xValue).toBe(x);
      // 지면이 적은 $x$ 와도 맞댄다.
      const wrote = /따라서 \$x=(\d+)\$/.exec(p.solution);
      expect(wrote, `s${seed}: $x$ 를 적은 줄이 없다`).not.toBeNull();
      expect(Number(wrote![1])).toBe(x);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("58W — 28쌍을 **전부** 만들어 짝이 하나뿐임을 확인한다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_SCATTER, seed);
      const { xs, ys } = readScatterStem(p.content);
      const pairs = bruteScatterPairs(xs, ys);
      expect(
        pairs,
        `s${seed}: 짝이 하나가 아니다 (${pairs.length})`,
      ).toHaveLength(1);
      const [i, j] = pairs[0]!;
      expect(firstNumber(p.answer), `s${seed}\n${p.content}`).toBe(
        xs[i]! + xs[j]!,
      );
      expect(ys[i]! + ys[j]!).toBe(xs[i]! + xs[j]!);
      expect(p.facts.x).toBe(xs[i]! + xs[j]!);
      // ㉱ — 발문이 전제한 상·하한을 **파생되는 모든 값**이 지킨다.
      for (const v of [...xs, ...ys]) {
        expect(v, `s${seed}: 점수가 창 밖이다`).toBeGreaterThanOrEqual(40);
        expect(v).toBeLessThanOrEqual(95);
      }
      // 같은 점이 둘이면 지면이 흉하다.
      expect(new Set(xs.map((v, t) => `${v},${ys[t]}`)).size).toBe(8);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉢ 굳힘이 항등식이 아니다 — 굳힘을 **인자로 받는 순수 함수**를 흔든다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉢ 굳힘을 지우면 답이 달라진다", () => {
  it("55W — 굳힘이 **둘**이고, 켠 조합마다 답이 다르다", () => {
    for (const seed of WIDE) {
      const plan = planFactorSum(createRng(seed));
      const sum = (xs: number[]): number => xs.reduce((t, v) => t + v, 0);
      const both = sum(solveFactorA(plan.s, true, true));
      const natOnly = sum(solveFactorA(plan.s, true, false));
      const none = sum(solveFactorA(plan.s, false, false));
      expect(both).toBe(plan.answer);
      // 「자연수」 굳힘은 언제나 $(1,\,T)$ 를 죽이고, 그 쌍의 $a$ 는 $T-1=S$ 라
      // 합이 **반드시** 달라진다 — 그것이 $b$ 가 아니라 $a$ 를 묻는 까닭이다.
      // 죽는 쌍 $(1,\,T)$ 의 $a$ 는 $T-1=S$ 다. 제곱수 $T$ 에서는 가운데 쌍도 죽어
      // 더 커지므로 «이상»으로 잠근다.
      expect(
        none,
        `S=${plan.s}: 굳힘을 다 지워도 합이 그대로다`,
      ).toBeGreaterThanOrEqual(both + plan.s);
      expect(none).toBe(sum(plan.sift.candidates));
      expect(natOnly).toBeGreaterThanOrEqual(both);
      // 🔴 **왜 $b$ 를 안 묻나** — 「자연수」 굳힘을 $b$ 에 대면 합이 **그대로**다
      //    (죽는 쌍의 $b=mn=0$). 값 검산도 KaTeX 도 구조적으로 못 보는 자리라
      //    이 대비를 못 박아 다음 사람이 발문을 $b$ 로 되돌리지 못하게 한다.
      expect(
        sum(solveFactorB(plan.s, false, false)),
        `S=${plan.s}: $b$ 로 물으면 「자연수」 굳힘이 장식이라는 사실이 바뀌었다`,
      ).toBe(sum(solveFactorB(plan.s, true, false)));
    }
  });

  it("55W — 「서로 다르다」 굳힘이 **실제로 일하는 씨앗**이 있다 (죽은 규칙이 아니다)", () => {
    let works = 0;
    for (const seed of WIDE) {
      const plan = planFactorSum(createRng(seed));
      const withDistinct = solveFactorA(plan.s, true, true);
      const without = solveFactorA(plan.s, true, false);
      if (withDistinct.length !== without.length) works += 1;
      // $T$ 가 제곱수일 때만 갈린다 — 그 사실 자체를 못 박는다.
      expect(withDistinct.length !== without.length).toBe(
        intSqrt(plan.t) !== null,
      );
    }
    expect(
      works,
      "「상수항이 서로 다르다」가 한 번도 안 일했다",
    ).toBeGreaterThan(0);
  });

  it("56W — 계수가 $2$ 라야 무리수 항이 사라진다 (그것이 굳힘이다)", () => {
    for (const seed of WIDE) {
      const plan = planFracPart(createRng(seed));
      const ok = foldParts(plan.n, plan.c, 2);
      expect(ok.root, `n=${plan.n}: 계수 2 인데 무리수가 남는다`).toBe(0);
      expect(ok.rational).toBe(plan.answer);
      for (const k of [1, 3, 4]) {
        const bad = foldParts(plan.n, plan.c, k);
        expect(
          bad.root,
          `n=${plan.n} k=${k}: 계수를 바꿔도 유리수다 — 굳힘이 장식이다`,
        ).not.toBe(0);
      }
    }
  });

  it("57W — 중앙값 굳힘을 끄면 경우가 일곱으로 늘고 답이 하나로 안 정해진다", () => {
    for (const seed of WIDE) {
      const plan = planBoxMean(createRng(seed));
      const on = solveBoxCases(plan.vs, plan.m, plan.q, true);
      const off = solveBoxCases(plan.vs, plan.m, plan.q, false);
      expect(on.length, `굳힘을 켜면 셋이어야 한다`).toBe(3);
      expect(off.length).toBe(7);
      const onHits = on.flatMap((c) => c.hits);
      const offHits = off.flatMap((c) => c.hits);
      expect(onHits).toEqual([plan.x]);
      expect(
        offHits.length,
        `vs=${plan.vs} 굳힘을 지워도 답이 하나다`,
      ).toBeGreaterThan(1);
    }
  });

  it("58W — 차 굳힘을 끄면 후보가 28쌍으로 늘어난다", () => {
    for (const seed of WIDE) {
      const plan = planScatterPair(createRng(seed));
      const on = solvePairSum(plan.xs, plan.ys, true);
      const off = solvePairSum(plan.xs, plan.ys, false);
      expect(on).toEqual([plan.answer]);
      expect(off.length, "후보가 28쌍이 아니다").toBe(28);
      expect(off).toContain(plan.answer);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉣ 굳힘이 «선택»을 한다 · 지름길 · 정답 분포
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉣ 굳힘을 **안 읽고** 찍으면 우연 수준을 못 넘는다", () => {
  const sifts = (plan: (r: () => number) => { sift: Sift }): Sift[] =>
    WIDE.map((s) => plan(createRng(s)).sift);

  it("후보를 견주는 셋에서 `kept` 가 `candidates` 의 진부분집합이다", () => {
    for (const [name, plan] of [
      ["55W", planFactorSum],
      ["57W", planBoxMean],
      ["58W", planScatterPair],
    ] as const) {
      const s = siftScore(sifts(plan));
      expect(s.identity, `${name}: 굳힘이 아무도 안 거른 씨앗이 있다`).toBe(0);
      expect(s.broken, `${name}: 굳힘이 후보 밖 값을 냈다`).toBe(0);
      expect(s.n).toBe(WIDE.length);
    }
  });

  it("극단만 집으면 «우연 수준 + 10%p» 를 못 넘는다", () => {
    // ⚠️ **정직하게 적는다** — `55W` 는 답이 «살아남은 것 전부의 합»이라 `kept` 의
    //    크기가 늘 $2$ 이상이고, 그래서 이 수치가 **구조적으로 0**이다. 곧 이 검사만으로는
    //    `55W` 의 ㉠ 을 잰 것이 아니다(그쪽의 진짜 ㉠ 은 아래 「한 걸음」·「분포」다).
    //    실제로 «선택»을 재는 것은 후보에서 하나를 고르는 `57W`·`58W` 다.
    for (const [name, plan] of [
      ["55W", planFactorSum],
      ["57W", planBoxMean],
      ["58W", planScatterPair],
    ] as const) {
      const e = edgeScore(sifts(plan));
      expect(
        Math.max(e.maxHit, e.minHit),
        `${name}: 극단 집기 max=${e.maxHit} min=${e.minHit} · 우연 ${e.chance}`,
      ).toBeLessThanOrEqual(e.chance + 0.1);
    }
  });

  it("🔴 57W — 살아남는 «자리»가 다섯 갈래로 갈린다 (한 자리에 안 쏠린다)", () => {
    // 자연 분포로 뽑으면 «$x$ 가 사분위수가 되는 가운데 자리»가 $95\%$ 를 넘는다 —
    // 실측했다. `BOX_SLOT_WEIGHTS` 를 무르면 이 검사가 빨개진다.
    const hist = new Map<string, number>();
    for (const seed of WIDE) {
      const plan = planBoxMean(createRng(seed));
      const key = `${plan.branch}${plan.slot}`;
      hist.set(key, (hist.get(key) ?? 0) + 1);
    }
    const share = [...hist.entries()]
      .map(([k, v]) => `${k}:${((v / WIDE.length) * 100).toFixed(1)}%`)
      .join(" ");
    expect([...hist.keys()].sort(), `자리 분포 — ${share}`).toEqual([
      "hi5",
      "hi6",
      "lo1",
      "lo2",
      "lo3",
    ]);
    const top = Math.max(...hist.values()) / WIDE.length;
    expect(top, `한 자리에 쏠린다 — ${share}`).toBeLessThan(0.4);
    // ⚠️ **정직하게 적는다** — «가운데 자리»(변수 자리 2·6)를 합치면 아직 절반을 넘는다.
    //    구조적 사실이라 숨기지 않고 **상한을 못 박는다**(3차 53V 창끝과 같은 처방).
    const mid = ((hist.get("lo2") ?? 0) + (hist.get("hi6") ?? 0)) / WIDE.length;
    expect(
      mid,
      `가운데 자리 몫 ${(mid * 100).toFixed(1)}% — ${share}`,
    ).toBeLessThan(0.65);
  });

  it("🔴 답이 발문에서 **한 걸음**에 안 닿는다 (지름길 봉쇄)", () => {
    // ⚠️ **참을 지면에서 가져온다** — 제품의 `oneStepReach` 를 쓰면 그 함수가 망가질수록
    //    좋은 점수가 나온다(동어반복). 판정기의 `oneStepAll` 은 이 시험과 제품 어느
    //    쪽에도 안 물려 있는 **셋째 자**다.
    //
    // 눈금 — 이 자가 «아니오» 를 낼 수 있다 (양성 2 · 음성 1).
    expect(oneStepAll([0, 1, 2, 126, 13]).has(113)).toBe(true);
    expect(oneStepAll([0, 1, 2, 23]).has(46)).toBe(true);
    expect(oneStepAll([0, 1, 2, 126, 13]).has(40)).toBe(false);

    let read = 0;
    for (const seed of WIDE) {
      const f = make(KEY_FACTOR, seed);
      const s = readFactorStem(f.content);
      expect(
        oneStepAll([0, 1, 2, s]).has(firstNumber(f.answer)),
        `55W s${seed}: 답이 한 걸음에 닿는다\n${f.content}`,
      ).toBe(false);

      const r = make(KEY_FRAC, seed);
      const { n, c } = readFracStem(r.content);
      expect(
        oneStepAll([0, 1, 2, n, c]).has(firstNumber(r.answer)),
        `56W s${seed}: 답이 한 걸음에 닿는다\n${r.content}`,
      ).toBe(false);

      const b = make(KEY_BOX, seed);
      const { vs, m, q } = readBoxStem(b.content);
      const mean = firstNumber(b.answer);
      expect(
        [...vs, m, q].includes(mean),
        `57W s${seed}: 답이 발문에 적혀 있다\n${b.content}`,
      ).toBe(false);
      expect(
        oneStepAll([m, q]).has(mean),
        `57W s${seed}: 답이 (중앙값, 사분위수범위) 한 걸음이다\n${b.content}`,
      ).toBe(false);

      const sc = make(KEY_SCATTER, seed);
      const { xs, ys } = readScatterStem(sc.content);
      // ⚠️ `58W` 는 ㉵ 를 **구조적으로 못 막는다**(묻는 것이 «두 점수의 합»이다).
      //    막을 수 있는 것은 「그대로 적힌 수인가」뿐이고, 그것을 여기서 잠근다.
      expect(
        [...xs, ...ys].includes(firstNumber(sc.answer)),
        `58W s${seed}: 답이 발문에 그대로 적혀 있다`,
      ).toBe(false);
      read += 1;
    }
    expect(read, "발문을 하나도 못 읽었으면 이 검사는 아무것도 안 지킨다").toBe(
      WIDE.length,
    );
  });

  it("🔴 정답이 한 값에 안 쏠린다 — 최빈 비율과 겹칠 확률을 잠근다", () => {
    // 3차 중3 `52V` 는 최빈 정답이 **51.2%** 였고 12벌 한 벌에 서로 다른 정답이
    // 서넛뿐이었다. 넷 다 «답을 먼저 고르고» 씨앗을 뽑는데, 그 균형을 여기가 잠근다.
    const bounds: Record<string, [number, number]> = {
      [KEY_FACTOR]: [0.1, 0.15],
      [KEY_FRAC]: [0.1, 0.15],
      [KEY_BOX]: [0.2, 0.3],
      [KEY_SCATTER]: [0.1, 0.15],
    };
    for (const e of M3_TOP_4) {
      const ans: number[] = [];
      for (const seed of WIDE)
        for (const v of [0, 1, 2])
          ans.push(firstNumber(make(e.key, seed, v).answer));
      const sp = spreadScore(ans);
      const [topMax, collideMax] = bounds[e.key]!;
      expect(sp.kinds, `${e.key}: 서로 다른 답 ${sp.kinds}종`).toBeGreaterThan(
        12,
      );
      expect(
        sp.top,
        `${e.key}: 최빈 정답 ${(sp.top * 100).toFixed(1)}% (답 ${sp.kinds}종)`,
      ).toBeLessThan(topMax);
      expect(
        sp.collide,
        `${e.key}: 한 시험지의 둘이 같은 답일 확률 ${(sp.collide * 100).toFixed(1)}%`,
      ).toBeLessThan(collideMax);
    }
  });

  it("🔴 풀이 낼 수 있는 답을 **하나도 안 빠뜨린다** — 「고르게」의 반대편", () => {
    const seeds = Array.from({ length: 2400 }, (_, i) => 20260903 + i * 7919);
    const got55 = new Set<number>();
    const got56 = new Set<number>();
    for (const s of seeds) {
      got55.add(planFactorSum(createRng(s)).answer);
      got56.add(planFracPart(createRng(s)).answer);
    }
    expect([...got55].sort((a, b) => a - b)).toEqual(factorAnswers());
    expect([...got56].sort((a, b) => a - b)).toEqual(fracAnswers());
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤ 🔴 해설의 중간값을 스스로 검산한다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉤ 해설이 적은 등식을 전부 다시 계산한다", () => {
  it("55W — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    let identity = 0;
    let conditional = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_FACTOR, seed);
      const s = readFactorStem(p.content);
      const envI: Env[] = [
        { x: 2, a: 13, b: 5, m: 4, n: 7 },
        { x: -4, a: 3, b: 11, m: 1, n: 9 },
        { x: 11, a: 8, b: 6, m: 5, n: 2 },
        { x: 0, a: 2, b: 17, m: 8, n: 6 },
      ];
      // 해설이 «주장한 값» — 약수쌍마다 $(m,n)$ 과 거기서 나오는 $a$, $b$.
      const envS: Env[] = [];
      for (const d of divisors(s + 1)) {
        if (d < 2 || d * d > s + 1) continue;
        const m = d - 1;
        const n = (s + 1) / d - 1;
        envS.push({ m, n, a: m + n, b: m * n, x: 0 });
      }
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      identity += r.identity;
      conditional += r.conditional;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        10,
      );
      // ⚠️ 문턱이 $4$ 에서 $3$ 으로 **내려간 까닭을 적는다.** 2026-09-03 에
      //    약수쌍 $(1,\,T)$ 를 나열에서 뺐고(굳힘 줄이 이미 죽인 쌍이다), 그
      //    줄이 수치 등식 하나를 들고 있었다. 문턱을 «맞추려고» 내린 것이
      //    아니라 **다시 재서** 내렸다: 씨앗 90개 실측 분포 $3$ 이 40 · $4$ 가
      //    41 · $5$ 가 9 (합 329). 최솟값이 곧 문턱이다.
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(3);
      expect(r.identity, `s${seed}: 항등식 검산이 없다`).toBeGreaterThanOrEqual(
        1,
      );
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(300);
    expect(identity).toBeGreaterThan(80);
    expect(conditional).toBeGreaterThan(300);
  });

  it("56W — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    let identity = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_FRAC, seed);
      const { n } = readFracStem(p.content);
      const a = intFloorSqrt(n);
      const envI: Env[] = [
        { a: 3, b: 5 },
        { a: 7, b: 2 },
        { a: 1, b: 9 },
        { a: 5, b: 4 },
      ];
      // ⚠️ `b` 를 **주장한 값에 넣지 않는다** — $b$ 는 무리수라 어떤 유리수를 넣어도
      //    거짓이 되고, 그러면 `$(a+b)^{2}=n$` 이 거짓 경보가 된다. 그 줄은
      //    «못 잼»(건너뜀)이 맞다.
      const envS: Env[] = [{ a }];
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      identity += r.identity;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        6,
      );
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(4);
      expect(r.identity, `s${seed}: 항등식 검산이 없다`).toBeGreaterThanOrEqual(
        2,
      );
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(300);
    expect(identity).toBeGreaterThan(150);
  });

  it("57W — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_BOX, seed);
      const { vs, m, q } = readBoxStem(p.content);
      const envI: Env[] = [{ x: 2 }, { x: -4 }, { x: 11 }, { x: 0 }];
      // 주장한 값 — 최종 $x$ 와 **각 경우가 푼 $x$**(구간 밖이라 죽은 것도 포함).
      const envS: Env[] = [];
      for (const c of solveBoxCases(vs, m, q, true)) {
        const sq = slotQuartiles(vs, c.slot);
        if (sq.q1 === null) envS.push({ x: sq.q3! - q });
        else if (sq.q3 === null) envS.push({ x: sq.q1 + q });
        for (const h of c.hits) envS.push({ x: h });
      }
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        5,
      );
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(3);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(300);
  });

  it("58W — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_SCATTER, seed);
      const envI: Env[] = [{ x: 2 }, { x: -4 }, { x: 11 }, { x: 0 }];
      const envS: Env[] = [{ x: 1, y: 1 }];
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        4,
      );
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(4);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(300);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤-2 🔴 해설에 나온 **모든 수**가 독립 재계산으로 설명되는가
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉤-2 미설명 수가 없다", () => {
  it("55W — 발문의 $S$ 만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of WIDE) {
      const p = make(KEY_FACTOR, seed);
      const s = readFactorStem(p.content);
      const t = s + 1;
      const ok = new Set<number>([0, 1, 2, s, t]);
      for (const d of divisors(t)) {
        if (d * d > t) continue;
        const m = d - 1;
        const n = t / d - 1;
        for (const v of [d, t / d, m, n, m * n, m + n]) ok.add(Math.abs(v));
      }
      ok.add(bruteFactorA(s).reduce((acc, v) => acc + v, 0));
      expect(
        unexplained(p.solution, ok),
        `s${seed}: 설명 못 하는 수\n${p.solution}`,
      ).toEqual([]);
      expect(
        unexplained(p.content, ok),
        `s${seed}: 발문에 설명 못 하는 수`,
      ).toEqual([]);
    }
  });

  it("56W — 발문의 $n$·$c$ 만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of WIDE) {
      const p = make(KEY_FRAC, seed);
      const { n, c } = readFracStem(p.content);
      const a = intFloorSqrt(n);
      const ok = new Set<number>([
        1,
        2,
        n,
        c,
        a,
        a * a,
        a + 1,
        (a + 1) * (a + 1),
        n - a * a,
        n - a * a + c,
      ]);
      expect(
        unexplained(p.solution, ok),
        `s${seed}: 설명 못 하는 수\n${p.solution}`,
      ).toEqual([]);
    }
  });

  it("57W — 발문의 자료·조건만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of WIDE) {
      const p = make(KEY_BOX, seed);
      const { vs, m, q } = readBoxStem(p.content);
      const x = bruteBoxX(vs, m, q)[0]!;
      const sum = vs.reduce((t, v) => t + v, 0) + x;
      const ok = new Set<number>([1, 3, 7, m, q, x, sum, sum / 7, ...vs]);
      // 경우마다 나오는 사분위수·상수 사분위수범위·푼 $x$
      for (let k = 1; k <= 7; k += 1) {
        const sq = slotQuartiles(vs, k);
        if (sq.q1 !== null) ok.add(sq.q1);
        if (sq.q3 !== null) ok.add(sq.q3);
        if (sq.q1 !== null && sq.q3 !== null) ok.add(sq.q3 - sq.q1);
        if (sq.q1 === null && sq.q3 !== null) ok.add(Math.abs(sq.q3 - q));
        if (sq.q3 === null && sq.q1 !== null) ok.add(sq.q1 + q);
      }
      expect(
        unexplained(p.solution, ok),
        `s${seed}: 설명 못 하는 수\n${p.solution}`,
      ).toEqual([]);
    }
  });

  it("58W — 발문의 점수 열여섯만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of WIDE) {
      const p = make(KEY_SCATTER, seed);
      const { xs, ys } = readScatterStem(p.content);
      const ok = new Set<number>([0, 8, ...xs, ...ys]);
      xs.forEach((v, i) => ok.add(Math.abs(v - ys[i]!)));
      const [i, j] = bruteScatterPairs(xs, ys)[0]!;
      ok.add(xs[i]! + xs[j]!);
      expect(
        unexplained(p.solution, ok),
        `s${seed}: 설명 못 하는 수\n${p.solution}`,
      ).toEqual([]);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉥ 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸) + 해설의 «말»
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉥ 해설이 걸음을 건너뛰지 않는다", () => {
  it("전 씨앗에서 «생략 표지 뒤에 중간 결과 없음»이 0건이다", () => {
    const thin: string[] = [];
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          if (isThin(p.content, p.solution))
            thin.push(`${e.key} s${seed}v${v}`);
          expect(skipsWork(p.solution), `${e.key} s${seed}v${v}`).toBe(false);
        }
      }
    }
    expect(thin).toEqual([]);
  });

  it("🔴 해설의 «말»이 독립 재계산과 어긋나지 않는다 (240씨앗)", () => {
    const bad: string[] = [];
    for (const seed of WIDE) {
      for (const [key, fn] of [
        [KEY_FACTOR, factorWords],
        [KEY_FRAC, fracWords],
        [KEY_BOX, boxWords],
        [KEY_SCATTER, scatterWords],
      ] as const) {
        const p = make(key, seed);
        for (const why of fn(p.content, p.solution))
          bad.push(`${key} s${seed}: ${why}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("55W — 약수쌍을 **하나씩 세우고** 각각 왜 살고 죽는지 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_FACTOR, seed);
      const s = readFactorStem(p.content);
      const pairs = divisors(s + 1).filter((d) => d >= 2 && d * d <= s + 1);
      pairs.forEach((_, i) => {
        expect(p.solution, `s${seed}: ${i + 1}번째 표지가 없다`).toContain(
          ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥", "㉦", "㉧"][i]!,
        );
      });
      expect(p.solution).toContain("$m$과 $n$은 모두 자연수이다");
      expect(p.solution).toContain("따라서 $a$의 값은");
      expect(p.solution).toContain("$m+1$과 $n+1$은 모두 $2$ 이상이다");
      expect(p.solution).toContain("두 자연수의 곱으로 나타내면");
    }
  });

  it("56W — 가둠·정의·접기 세 걸음을 다 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_FRAC, seed);
      expect(p.solution).toContain("사이의 수이므로");
      expect(p.solution).toContain("정수 부분은 $a=");
      expect(p.solution).toContain("소수 부분은 $b=");
      expect(p.solution).toContain("$(a+b)^{2}=a^{2}+2ab+b^{2}$이므로");
      expect(p.solution).toContain("$b^{2}+2ab=(a+b)^{2}-a^{2}$");
    }
  });

  it("57W — 자리·굳힘·세 경우·총합·평균 다섯 걸음을 다 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_BOX, seed);
      expect(p.solution).toContain("제$1$사분위수는 둘째 값");
      expect(p.solution).toContain("다음 세 경우를 살펴본다");
      for (const mark of ["㉠", "㉡", "㉢"]) expect(p.solution).toContain(mark);
      expect(p.solution).toContain("자료의 총합은");
      expect(p.solution).toContain("\\div 7=");
    }
  });

  it("58W — 굳힘을 «왜 그런지»까지 적고 마지막에 되짚는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_SCATTER, seed);
      expect(p.solution).toContain("값의 합은 $0$이다");
      expect(p.solution).toContain("절댓값이 같고 부호가 서로 다른");
      expect(p.solution).toContain("직선 $y=x$");
      expect(p.solution).toContain("영어 점수의 합도");
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉦ 지면 — 냄새 · 조사 · KaTeX · 분수 없음 · **해설 높이**
// ════════════════════════════════════════════════════════════════════════════

/** 손 목록 — **공용 계량기를 대신하지 않는다.** 둘을 «같이» 댄다. */
const BAD: [RegExp, string][] = [
  [/\+-|-\+/, "부호가 붙어 나온다 (`+-`)"],
  [/--/, "부호가 겹쳐 나온다 (`--`)"],
  [/\\dfrac\{\}|\\frac\{\}/, "빈 분자 (2026-08-21)"],
  [/\$\$/, "빈 수식"],
  [
    /[0-9]\s*번\s*그림|다음 그림|오른쪽 그림|아래 그림/,
    "그림이 없는데 그림을 가리킨다",
  ],
  [/시간를|수을|값를|해을|것를/, "조사가 틀렸다"],
];

describe("[중3 4차 물결] ㉦ 지면 냄새 · 조사 · KaTeX · 분수", () => {
  it("눈금 — 이 검사들이 «아니오» 를 낼 수 있다 (양성 6 · 음성 5)", () => {
    expect(BAD.some(([re]) => re.test("$2+-3$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("$\\dfrac{}{2}$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("다음 그림에서 넓이를"))).toBe(true);
    // 🔴 **공용 계량기의 눈금** — 손 목록이 못 보는 것을 이쪽이 본다는 증거.
    expect(pageSmells("$-8+0=-8$이다.")).not.toEqual([]);
    expect(pageSmells("$y=1x+2$이다.")).not.toEqual([]);
    expect(josaMismatches("$15$과 $63$와")).not.toEqual([]);
    // 음성 — 멀쩡한 지면을 잡으면 «늘 우는 가드»가 된다(2026-08-20).
    expect(pageSmells("$70\\div 7=10$이다.")).toEqual([]);
    expect(pageSmells("$(x+m)(x+n)=x^{2}+(m+n)x+mn$")).toEqual([]);
    expect(pageSmells("$76-89=-13$이다.")).toEqual([]);
    expect(josaMismatches("$12$는 $9$와 $6$은")).toEqual([]);
    expect(BAD.some(([re]) => re.test("$121$과 $144$ 사이의 수"))).toBe(false);
  });

  it("전 씨앗의 발문·정답·해설에 냄새·조사 어긋남이 없다", () => {
    const hits: string[] = [];
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          for (const [field, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            for (const [re, why] of BAD) {
              if (re.test(text))
                hits.push(`${e.key} s${seed}v${v} ${field}: ${why}`);
            }
            for (const why of pageSmells(text))
              hits.push(`${e.key} s${seed}v${v} ${field}: 공용 냄새 — ${why}`);
            for (const why of josaMismatches(text))
              hits.push(`${e.key} s${seed}v${v} ${field}: 공용 조사 — ${why}`);
          }
        }
      }
    }
    expect([...new Set(hits)].slice(0, 10)).toEqual([]);
  });

  it("넓은 씨앗에서도 공용 계량기가 조용하다 (240씨앗)", () => {
    const hits: string[] = [];
    for (const e of M3_TOP_4) {
      for (const seed of WIDE) {
        const p = make(e.key, seed);
        for (const text of [p.content, p.answer, p.solution]) {
          for (const why of pageSmells(text)) hits.push(`${e.key}: ${why}`);
          for (const why of josaMismatches(text)) hits.push(`${e.key}: ${why}`);
        }
      }
    }
    expect([...new Set(hits)].slice(0, 10)).toEqual([]);
  });

  it("🔴 공용 조사 자가 **구조적으로 0 이 아니다** — 실제로 읽은 자리를 센다", () => {
    // 3차의 한 유형은 수식이 `)` 로 끝나 조사 자가 **800/800 을 건너뛰었다.**
    // 「어긋남 0」이 「깨끗」인지 「못 셈」인지 가르려면 **읽은 자리**를 세야 한다.
    const readable = (text: string): number => {
      let n = 0;
      for (const m of text.matchAll(/\$([^$]*)\$(을|를|은|는|와|과|가)/g)) {
        const body = m[1]!;
        if (/\^\d+$/.test(body)) continue;
        if (/(\d+)$/.test(body)) n += 1;
      }
      return n;
    };
    for (const e of M3_TOP_4) {
      let n = 0;
      for (const seed of WIDE) {
        const p = make(e.key, seed);
        n += readable(p.content) + readable(p.solution) + readable(p.answer);
      }
      expect(n, `${e.key}: 조사 자가 읽은 자리가 없다`).toBeGreaterThanOrEqual(
        WIDE.length,
      );
    }
  });

  it("🔴 지면에 분수를 한 번도 안 쓴다 (㉰ — 기약 규칙과 부딪히는 자리를 안 만든다)", () => {
    for (const e of M3_TOP_4) {
      for (const seed of WIDE) {
        const p = make(e.key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          expect(text, `${e.key} s${seed} ${field}`).not.toMatch(/\\d?frac/);
        }
      }
    }
  });

  it("KaTeX 로 실제 그려지고 붉은 글씨·중립 폴백이 없다", () => {
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        const p = make(e.key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          const html = renderMathHtml(text);
          expect(html, `${e.key} s${seed} ${field}`).not.toContain(
            "katex-error",
          );
          expect(html, `${e.key} s${seed} ${field}`).not.toMatch(
            /color:\s*#cc0000/i,
          );
          expect(html, `${e.key} s${seed} ${field}`).not.toContain("math-raw");
        }
      }
    }
  });

  it("🔴 해설이 정답지 한 단을 안 넘는다 — 2,880판을 제품 자로 잰다", () => {
    // 3차 중1 `53V` 는 최대 **1242px**(한 단 964.8px)이었고, 넘치면 세로로 잘리는 게
    // 아니라 **같은 쪽 다른 문항의 해설이 통째로 사라진다.** 브리프의 문턱은 700px 다.
    const COLUMN = JASEUP_MEASURED_PX.answerSolutionsFull;
    // 눈금 — 자가 살아 있다(양성 1 · 음성 1).
    const huge = Array.from(
      { length: 80 },
      (_, i) => `${i + 1}단계를 계산한다.`,
    ).join("\n");
    expect(estimateSolutionPx(huge)).toBeGreaterThan(COLUMN);
    expect(estimateSolutionPx("$x=1$이다.")).toBeLessThan(700);

    let measured = 0;
    const worst = new Map<string, number>();
    for (const e of M3_TOP_4) {
      for (const seed of WIDE) {
        for (const v of [0, 1, 2]) {
          const px = estimateSolutionPx(make(e.key, seed, v).solution);
          measured += 1;
          if (px > (worst.get(e.key) ?? 0)) worst.set(e.key, px);
        }
      }
    }
    // 「몇 판을 실제로 쟀는가」를 같이 못 박는다 — 전부 건너뛰어도 초록이면 장식이다.
    expect(measured).toBeGreaterThanOrEqual(600);
    for (const e of M3_TOP_4) {
      expect(
        worst.get(e.key)!,
        `${e.key}: 해설 최대 ${Math.round(worst.get(e.key)!)}px (한 단 ${COLUMN}px)`,
      ).toBeLessThan(700);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉧ 계약
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] ㉧ 계약", () => {
  it("`facts.x` 가 답의 첫 수다 (이웃 모듈과 같은 계약)", () => {
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          expect(firstNumber(p.answer), `${e.key} s${seed}v${v}`).toBe(
            p.facts.x,
          );
        }
      }
    }
  });

  it("숫자는 전부 `$...$` 안에 있다", () => {
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          expect(bareNumbers(p.content), `${e.key} 발문`).toEqual([]);
          expect(bareNumbers(p.answer), `${e.key} 정답`).toEqual([]);
          expect(bareNumbers(p.solution), `${e.key} 해설`).toEqual([]);
        }
      }
    }
  });

  it("그림이 없고, 발문이 **지면을 가리키지도 않는다**", () => {
    // 🔴 `58W` 는 소단원이 「산점도와 상관관계」인데 그림이 없다. 형제 `06`~`15` 는
    //    `scatterPlot` 스펙을 싣지만 우리 발문은 낱말 「산점도」를 한 번도 안 쓰고
    //    순서쌍을 본문에 다 적는다. 그 사실을 **제품 판정기로** 확인한다.
    // 눈금 — 이 자가 «아니오»를 낼 수 있다.
    expect(
      pointsAtFigure("다음은 학생 $7$명의 점수를 나타낸 산점도이다."),
    ).not.toBeNull();
    expect(
      pointsAtFigure("다음은 어느 반의 키를 나타낸 상자그림이다."),
    ).not.toBeNull();
    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          expect(p.figureSpec, e.key).toBeNull();
          expect(
            pointsAtFigure(p.content),
            `${e.key} s${seed}v${v}: 없는 그림을 가리킨다`,
          ).toBeNull();
        }
      }
    }
  });

  it("조용한 기본값을 안 낸다 — 못 만들면 **던진다**", () => {
    expect(intSqrt(-4)).toBeNull();
    expect(intSqrt(81)).toBe(9);
    expect(intSqrt(80)).toBeNull();
    expect(divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
    expect(() => quartilesOfSeven([1, 2, 3])).toThrow(/일곱 개/);
    expect(quartilesOfSeven([9, 3, 6, 13, 18, 24, 1])).toEqual({
      q1: 3,
      med: 9,
      q3: 18,
    });
    // 풀에서 뽑는 셋은 씨앗을 어떻게 주어도 만들어진다.
    for (const r of [() => 0, () => 0.999999]) {
      expect(() => planFactorSum(r)).not.toThrow();
      expect(() => planFracPart(r)).not.toThrow();
      expect(() => planBoxMean(r)).not.toThrow();
      // 🔴 `58W` 는 «되풀이해 뽑는» 갈래다. rng 가 늘 같은 값을 내면 조건을 만족하는
      //    자료를 못 만드는데, 그때 **조용히 아무 자료나 내면 안 된다** — 던져야 한다
      //    (계약 4). 실제 씨앗에서 던지지 않는 것은 위 「넓게 훑어도」가 지킨다.
      expect(() => planScatterPair(r)).toThrow(/못 만들었습니다/);
    }
    // 풀이 비면 `pick` 이 던진다 — 조용히 아무 문항이나 내지 않는다.
    expect(factorSumPool().length).toBeGreaterThan(12);
    expect(fracPartPool().length).toBeGreaterThan(100);
    expect(boxMeanPool().length).toBeGreaterThan(100);
  });

  it("🔴 제품의 `oneStepReach` 가 «아니오»를 낼 수 있다 (양성 3 · 음성 1)", () => {
    // 생성기가 이 함수로 씨앗을 거른다. 이것이 늘 `false` 를 내면 ㉵ 가드가 통째로
    // 죽는데 산출물은 그대로라 아무도 모른다 — 그래서 여기서 직접 시험한다.
    expect(oneStepReach([0, 1, 2, 23]).has(46)).toBe(true);
    expect(oneStepReach([0, 1, 2, 23]).has(24)).toBe(true);
    expect(oneStepReach([6, 36, 15, 180]).has(12)).toBe(true);
    expect(oneStepReach([0, 1, 2, 126, 13]).has(40)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 등록 뒤에 켜지는 검사 — 「`generateMiddleProblem` 과 글자까지 같은가」
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 4차 물결] `generate.ts` 등록", () => {
  it("등록되면 `generateMiddleProblem` 과 글자까지 같다 (등록 전이면 그 사실을 찍는다)", () => {
    const registered = new Set(registeredTypes().map((e) => e.key));
    const mine = M3_TOP_4.map((e) => e.key);
    const covered = mine.filter((k) => registered.has(k));

    if (covered.length === 0) {
      // 리드가 `...M3_TOP_4` 한 줄을 넣기 전 상태다. 조용히 통과시키면 「등록 뒤에도
      // 같은가」가 영영 안 재어지므로, **어느 쪽인지**를 여기서 못 박는다.
      expect(mine.some((k) => registered.has(k))).toBe(false);
      return;
    }
    // 반쪽 등록은 결함이다 — 넷 중 셋만 들어가면 나머지 하나는 아무도 안 부른다.
    expect(covered.sort()).toEqual([...mine].sort());

    for (const e of M3_TOP_4) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const mineP = make(e.key, seed, v);
          const theirs = generateMiddleProblem(e.key, seed, v);
          expect(theirs.content, `${e.key} s${seed}v${v} 발문`).toBe(
            mineP.content,
          );
          expect(theirs.answer, `${e.key} s${seed}v${v} 정답`).toBe(
            mineP.answer,
          );
          expect(theirs.solution, `${e.key} s${seed}v${v} 해설`).toBe(
            mineP.solution,
          );
          expect(theirs.difficulty, `${e.key} s${seed}v${v} 갈래`).toBe(
            mineP.difficulty,
          );
        }
      }
    }
  });

  it("🔴 판정기 모집단에 4차 물결 넷이 들어 있다 — 등록 전에도 «아무도 안 쟀다»가 안 되게", () => {
    // `scripts/qa/probe-middle-top-m3.ts` 는 등록(`registeredTypes()`)에서 모집단을
    // 뽑는데, `...M3_TOP_4` 한 줄은 **리드의 몫**이라 저술 시점에는 아직 없다.
    // 등록만 보면 이 넷이 조용히 빠지고, 그때 판정기가 내는 「🔴 줄 없음」은
    // 「깨끗하다」가 아니라 **아무도 안 쟀다**는 뜻이 된다(2026-08-21).
    const pop = new Set(topEntries().map((e) => e.key));
    for (const e of M3_TOP_4) {
      expect(pop.has(e.key), `${e.key} 가 판정기 모집단에 없다`).toBe(true);
    }
    for (const e of M3_TOP_4) {
      expect(topEntries().find((t) => t.key === e.key)!.unitSection).toBe(
        e.unitSection,
      );
    }
  });

  it("등록 목록에 넣을 항목이 `TypeEntry` 모양을 갖췄다", () => {
    for (const e of M3_TOP_4 as TypeEntry[]) {
      expect(typeof e.handler).toBe("function");
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.rpmTitle.length).toBeGreaterThan(5);
    }
  });
});
