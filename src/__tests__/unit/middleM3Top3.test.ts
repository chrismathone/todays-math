/**
 * 중3 **확대 갈래 3차 물결**(`심화중`·`심화상`) — `src/lib/middle/m3Top3.ts` (D-116, `V` 접미사).
 *
 * ## 🔴 이 시험이 2차 물결과 무엇이 다른가 — 해설의 «중간값»을 스스로 검산한다
 *
 * 2차 물결의 치명 결함은 **해설이 틀린 수를 적은 것**이었다(문항의 42.5%). 값 검산도
 * KaTeX 도 조사 자도 그것을 **구조적으로 못 본다** — 정답은 맞고 해설 한 줄만 틀렸기
 * 때문이다. 그리고 「해설에 이 문자열이 있나」(`toContain`)는 **가드가 아니다**:
 * 마지막 줄 하나로 충족된다.
 *
 * 그래서 이 시험은 해설 글에서 **`$…=…$` 등식을 전부 뽑아** 좌·우변을 각각 파싱하고
 * 값을 견준다. 갈래가 셋이다.
 *
 * ```
 * 순수 수치   자유 문자가 없다 → 두 변이 **정확히** 같아야 한다  (가장 센 그물)
 * 항등식      여러 대입에서 모두 같다 → 대수 변형이 옳다
 * 조건식      「푸는 식」이다 → 해설이 주장한 값 가운데 **적어도 하나**가 만족해야 한다
 * ```
 *
 * 🔴 그리고 **「등식을 몇 개 봤나」를 찍고 $0$ 이면 판정을 거부한다** — $0$ 은 「깨끗」과
 * 「못 셈」을 안 가른다(2026-08-21). 파서가 죽어 전부 «건너뜀»이 되면 이 시험은
 * 아무것도 안 지키면서 초록이 되기 때문이다.
 *
 * ## 🔴 검산이 어디서 오나 — 생성기 규칙을 한 줄도 옮겨 적지 않는다
 *
 *   · `51V` — 발문에서 $a$, $p$, 상수항을 읽어 **두 후보를 원 방정식에 직접 대입**한다.
 *             (인수분해 공식을 안 쓴다. 「둘 다 $x=1$ 을 해로 갖는다」가 이 문항의
 *             함정 그 자체이므로 그것을 **값으로** 확인한다.)
 *   · `52V` — 발문의 곱을 **그대로 펴서** $x=-9\ldots9$ 에 넣어 전부 같은 값인지 본다.
 *             (곱셈 공식 $A^2-B^2$ 를 안 쓴다.)
 *   · `53V` — 창 안의 $k$ 를 **전부** 훑어 판별식의 정수 제곱근을 실제로 계산한다.
 *             (근의 공식으로 역산하지 않는다. 죽은 $k$ 도 전부 본다 — 반대쪽 표본.)
 *   · `54V` — $1$ 부터 $N$ 까지 **전수**로 $\sqrt n+\dfrac d{\sqrt n}$ 이 자연수인지
 *             **정수 산술로** 만든다. (제곱수·약수라는 생성기의 길을 안 쓴다.)
 *
 * ## ⚠️ 왜 `generateMiddleProblem` 을 (아직) 안 부르나
 *
 * `generate.ts` 에 `...M3_TOP_3` 를 넣는 것은 **리드가 한다**(이 세션은 공유 파일을 안
 * 건드린다). 그래서 이 시험은 그 함수가 하는 일을 **그 함수가 부르는 바로 그 함수들**
 * (`tidySolution`·`wrapDanClause`·`resolveMiddleTier`)로 다시 밟는다. 그리고
 * **등록된 뒤에는** 「`generateMiddleProblem` 과 글자까지 같은가」가 켜진다(맨 아래).
 * 등록 전에는 그 검사가 «아직 등록 안 됨»을 **찍는다** — 조용히 통과시키면 「등록
 * 뒤에도 같은가」가 영영 안 재어진다.
 *
 * ## 이 시험이 지키는 것
 *
 * ```
 * ㉠ 등록 메타   — 개수·키·소단원 이름·갈래 선언을 얼린다
 * ㉡ 값 검산     — 지면 정답이 «조건을 만족하는 값 전부»와 같다 (독립 재계산, 240씨앗)
 * ㉢ 굳힘이 산다  — 굳힘을 인자로 받는 순수 함수를 흔들면 답이 실제로 달라진다
 * ㉣ 굳힘이 «선택»을 한다 — 극단만 집으면 우연 수준. 52V 는 «잴 축 없음»으로 따로 찍는다
 * ㉤ 해설의 중간값 — 등식을 전부 뽑아 다시 계산한다 (2차 물결의 치명 결함 자리)
 * ㉥ 해설이 걸음을 안 건너뛴다 (D-116 ⑸)
 * ㉦ 지면 냄새 + 조사 + KaTeX — 값은 맞는데 글자가 나쁜 부류 (공용 계량기 필수)
 * ㉧ 계약 — facts.x · 맨 숫자 없음 · 그림을 안 가리킨다 · 조용한 기본값 없음
 * ```
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  isThin,
  skipsWork,
} from "../../../scripts/qa/probe-middle-solution-depth";
import {
  edgeScore,
  siftScore,
  topEntries,
} from "../../../scripts/qa/probe-middle-top-m3";
import { bareNumbers } from "../../lib/elementary/rules";
import { createRng } from "../../lib/elementary/rng";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import type { Sift } from "../../lib/middle/m3Top";
import {
  CANCEL_ANSWERS,
  M3_TOP_3,
  cancelExprValue,
  divisors,
  fracTex,
  intSqrt,
  otherRootAtOne,
  planCancel,
  planQuadraticAlive,
  planRationalRoots,
  planRootSum,
  quadAlivePool,
  rationalRootPool,
  solveCancelCoef,
  solveQuadraticAlive,
  solveRationalRoots,
  solveRootSumNatural,
} from "../../lib/middle/m3Top3";
import { tidySolution } from "../../lib/middle/solutionText";
import { resolveMiddleTier } from "../../lib/middle/tier";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";
import { wrapDanClause } from "../../lib/problemText";
import { josaMismatches, pageSmells } from "../helpers/midPage";
import { catalogMaxNumber, extensionNumberReason } from "../helpers/rpmCatalog";

const KEY_QUAD = "3-1|이차방정식의 풀이|51V";
const KEY_CANCEL = "3-1|다항식의 곱셈|52V";
const KEY_ROOTS = "3-1|이차방정식의 활용|53V";
const KEY_ROOTSUM = "3-1|근호를 포함한 식의 계산|54V";

/** 씨앗 몇 개 × 변형 셋 — 지면 글자를 눈으로 견주는 검사에 쓴다. */
const SEEDS = [20260902, 7, 4242, 31337, 5150131, 777003, 424242, 99, 13579];
/** 값 검산·설계 검사에 쓰는 넓은 씨앗 — 브리프가 「최소 200」이라 못 박은 자리. */
const WIDE = Array.from({ length: 240 }, (_, i) => 20260902 + i * 7919);
/** 해설 등식 검산은 파싱이 많아 조금 좁게 — 그래도 씨앗 공간을 다 덮는다. */
const EQ_SEEDS = WIDE.slice(0, 90);

const BY_KEY = new Map(M3_TOP_3.map((e) => [e.key, e]));

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
  if (!entry) throw new Error(`m3Top3 에 없는 키: ${key}`);
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

/**
 * 문자에 넣을 값 — **유리수도 받는다.**
 *
 * 🔴 처음엔 정수만 받게 짰다가 `53V` 의 「두 근은 $x=\dfrac{9-7}{8}=\dfrac14$」를
 *    통째로 «거짓»으로 잡았다. 이 문항의 근은 **유리수**이고, 그것이 발문이 묻는
 *    바로 그 성질이다 — 자가 정수만 알면 그 축을 구조적으로 못 본다.
 */
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
      // 이어 붙여 쓴 곱 — `5(k-3)` · `35a^{2}` · `2x^{2}`
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

export type EqReport = {
  /** 실제로 판정한 등식 수 — $0$ 이면 판정을 **거부**해야 한다 */
  checked: number;
  /** 자유 문자가 없어 정확히 견준 것 */
  numeric: number;
  /** 여러 대입에서 모두 같은 것 */
  identity: number;
  /** 「푸는 식」 — 주장한 값 가운데 하나가 만족한 것 */
  conditional: number;
  /** 파서가 못 다뤄 건너뛴 것 (부등호·$\pm$ 등) */
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
// 눈금 — 이 시험의 «자»가 «아니오» 를 낼 수 있나
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] 눈금 — 해설 검산기가 «아니오»를 낼 수 있다", () => {
  const ENV_I = [
    { x: 2, a: 3, k: 5 },
    { x: -4, a: 7, k: -2 },
    { x: 11, a: 1, k: 9 },
    { x: 0, a: 5, k: 3 },
  ];
  const ENV_S = [{ x: 1, a: 6, k: -10 }];

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
    const r = checkEquations("$(x+a)(x-a)=x^{2}+a^{2}$", ENV_I, ENV_S);
    expect(r.bad.length).toBe(1);
  });

  it("맞는 항등식은 «항등식»으로 센다 (음성)", () => {
    const r = checkEquations("$(x+a)(x-a)=x^{2}-a^{2}$", ENV_I, ENV_S);
    expect(r.identity).toBe(1);
    expect(r.bad).toEqual([]);
  });

  it("「푸는 식」은 주장한 값으로 판정한다", () => {
    // $k=-10$ 은 항등식이 아니지만 주장한 값이 만족한다.
    expect(checkEquations("$k=-10$", ENV_I, ENV_S).bad).toEqual([]);
    // 주장한 값이 만족하지 않으면 잡는다.
    expect(checkEquations("$k=-11$", ENV_I, ENV_S).bad.length).toBe(1);
  });

  it("분수·근호·이어 붙인 곱을 읽는다", () => {
    const r = checkEquations(
      "$\\dfrac{11+7}{6}=3$, $\\sqrt{36}+\\dfrac{12}{\\sqrt{36}}=6+2=8$, " +
        "$5(2-1)+2\\times3=11$, $\\dfrac{11-9}{10}=\\dfrac{1}{5}$",
      ENV_I,
      ENV_S,
    );
    expect(r.numeric).toBe(4);
    expect(r.bad).toEqual([]);
  });

  it("못 재는 것은 «건너뜀»으로 세고 판정하지 않는다 — 못 재는 것을 «깨끗»이라 하지 않는다", () => {
    // 부등호에는 `=` 가 없으므로 애초에 «등식»이 아니다 — 세지도 않는다.
    const ineq = checkEquations("$121-12k\\ge 0$", ENV_I, ENV_S);
    expect(ineq.checked).toBe(0);
    expect(ineq.bad).toEqual([]);
    // `=` 는 있는데 값이 하나로 안 정해지는 것($\pm$)은 **건너뜀으로 센다.**
    const pm = checkEquations("$x=\\dfrac{11\\pm 9}{10}$", ENV_I, ENV_S);
    expect(pm.skipped).toBe(1);
    expect(pm.checked).toBe(0);
  });

  it("$0$ 은 「깨끗」이 아니라 「못 셈」이다 — 등식이 없으면 `checked` 가 $0$ 이다", () => {
    expect(checkEquations("등식이 없는 글이다.", ENV_I, ENV_S).checked).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉠ 등록 메타 — 개수를 **얼린다**
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉠ 등록 메타", () => {
  it("유형은 정확히 넷이고 키가 그대로다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M3_TOP_3).toHaveLength(4);
    expect(M3_TOP_3.map((e) => e.key)).toEqual([
      KEY_QUAD,
      KEY_CANCEL,
      KEY_ROOTS,
      KEY_ROOTSUM,
    ]);
  });

  it("확장 번호는 «숫자+영문 대문자 한 글자» 라 RPM 색인과 영영 안 겹친다", () => {
    for (const e of M3_TOP_3) {
      expect(e.rpmType, e.key).toMatch(/^\d+V$/);
      expect(e.key.split("|"), e.key).toHaveLength(3);
      expect(e.grade).toBe("중3");
      // 색인 정본이 실제로 그 중단원을 알고, 우리 번호를 «확장»으로 받는가.
      expect(catalogMaxNumber(e.rpmBook, e.rpmMinor), e.key).not.toBeNull();
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
    expect(new Set(M3_TOP_3.map((e) => e.rpmType)).size).toBe(4);
  });

  it("소단원 이름이 시드 정본과 **글자 그대로** 같다 (가는 공백 U+2009 포함)", () => {
    const mid3 = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    // 눈금 — 이 검사가 «아니오»를 낼 수 있나. 없는 이름은 반드시 걸려야 한다.
    expect(mid3.has("이차방정식의 풀이")).toBe(true);
    expect(mid3.has("이차방정식의풀이")).toBe(false);
    for (const e of M3_TOP_3) {
      expect(mid3.has(e.unitSection), `${e.key} → ${e.unitSection}`).toBe(true);
      expect(
        [...e.unitSection].some((c) => c.charCodeAt(0) === 0x2009),
        `${e.key}: 가는 공백(U+2009)이 들어 있다`,
      ).toBe(false);
    }
  });

  it("🔴 `53V` 는 소단원 이름과 RPM 중단원 이름이 **다르다** — 손으로 적으면 어긋난다", () => {
    const e = M3_TOP_3.find((t) => t.rpmType === "53V")!;
    expect(e.unitSection).toBe("이차방정식의 근의 공식과 응용");
    expect(e.rpmMinor).toBe("이차방정식의 활용");
    // 나머지 셋은 둘이 같다 — 이 대비가 위 한 줄을 «오타»가 아니라 «규약»으로 만든다.
    for (const t of M3_TOP_3.filter((x) => x.rpmType !== "53V")) {
      expect(t.unitSection, t.key).toBe(t.rpmMinor);
    }
  });

  it("갈래를 스스로 선언한다 — 밑단 규칙(`resolveMiddleTier`)이 안 내린다", () => {
    const got = new Map<string, Set<string>>();
    for (const e of M3_TOP_3) {
      const tiers = new Set<string>();
      for (const seed of SEEDS)
        for (const v of [0, 1, 2]) tiers.add(make(e.key, seed, v).difficulty);
      got.set(e.key, tiers);
    }
    expect([...got.get(KEY_QUAD)!]).toEqual(["심화중"]);
    expect([...got.get(KEY_CANCEL)!]).toEqual(["심화중"]);
    expect([...got.get(KEY_ROOTS)!]).toEqual(["심화상"]);
    expect([...got.get(KEY_ROOTSUM)!]).toEqual(["심화상"]);
  });

  it("확대 갈래가 **둘 다** 선다 — 하나만 세우고 «세웠다»고 하지 않는다", () => {
    const tiers = new Set(
      M3_TOP_3.map((e) => make(e.key, 20260902).difficulty),
    );
    expect(tiers).toEqual(new Set(["심화중", "심화상"]));
  });

  it("씨앗을 넓게 훑어도 던지지 않는다", () => {
    for (const e of M3_TOP_3) {
      for (let s = 0; s < 150; s += 1) {
        expect(() => make(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("같은 씨앗이면 같은 결과 — AI 가 아니다", () => {
    for (const e of M3_TOP_3) {
      const a = make(e.key, 424242, 1);
      const b = make(e.key, 424242, 1);
      expect(a.content).toBe(b.content);
      expect(a.answer).toBe(b.answer);
      expect(a.solution).toBe(b.solution);
    }
  });

  it("800씨앗에서 서로 다른 해설이 **열셋 이상** — 12벌 적재를 채울 수 있다", () => {
    const wide = Array.from({ length: 800 }, (_, i) => 20260902 + i * 7919);
    for (const e of M3_TOP_3) {
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

/** 51V 발문에서 $a$, $p$, 상수항을 읽는다. */
function readQuadStem(content: string): { a: number; p: number; c: number } {
  const m = /\$\(k\^\{2\}-(\d+)\)x\^\{2\}\+(\d+)\(k-(\d+)\)x\+(\d+)=0\$/.exec(
    content,
  );
  if (!m) throw new Error(`51V 발문을 못 읽었다\n${content}`);
  const a2 = Number(m[1]);
  const a = Number(m[3]);
  if (a * a !== a2) throw new Error(`51V 발문의 $a^2$ 과 $a$ 가 어긋난다`);
  return { a, p: Number(m[2]), c: Number(m[4]) };
}

/** 52V 발문에서 계수 셋과 일정값을 읽는다. */
function readCancelStem(content: string): {
  cs: number[];
  m: number;
  s: number;
} {
  const cs: number[] = [];
  for (const g of content.matchAll(/\(x\+(\d*)a\)\(x-(\d*)a\)/g)) {
    if (g[1] !== g[2]) throw new Error("52V 두 괄호의 계수가 다르다");
    cs.push(g[1] === "" ? 1 : Number(g[1]));
  }
  const m = /-(\d+)x\^\{2\}\$의 값이 항상 \$(-?\d+)\$/.exec(content);
  if (!m || cs.length === 0)
    throw new Error(`52V 발문을 못 읽었다\n${content}`);
  return { cs, m: Number(m[1]), s: Number(m[2]) };
}

describe("[중3 3차 물결] ㉡ 값 검산 — 생성기 식을 옮겨 적지 않는다", () => {
  it("51V — 두 후보를 **원 방정식에 직접 대입**해 함정이 실제로 성립한다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_QUAD, seed);
      const { a, p: pp, c } = readQuadStem(p.content);
      // 🔴 인수분해 공식을 한 줄도 안 쓴다 — $k$ 를 넓게 훑어 $x=1$ 이 해가 되는 $k$ 를
      //    **전부** 모은다. 그것이 곧 「후보」다.
      const cands: number[] = [];
      for (let k = -400; k <= 400; k += 1) {
        if (k * k - a * a + pp * (k - a) + c === 0) cands.push(k);
      }
      expect(cands.length, `s${seed} 후보가 둘이 아니다 (${cands})`).toBe(2);
      // 🔴 **함정 그 자체** — 두 후보 모두 $x=1$ 을 해로 갖는다. 곧 「대입해서 맞는가」로는
      //    갈리지 않고, 가르는 것은 오직 «이차방정식의 뜻»이다.
      const alive = cands.filter((k) => k * k - a * a !== 0);
      const dead = cands.filter((k) => k * k - a * a === 0);
      expect(alive.length, `s${seed} 산 후보가 하나가 아니다`).toBe(1);
      expect(dead.length, `s${seed} 죽는 후보가 하나가 아니다`).toBe(1);
      // 죽는 쪽은 일차방정식이고 그 해도 $x=1$ 이다.
      const dk = dead[0]!;
      expect(
        pp * (dk - a) * 1 + c,
        `s${seed} 죽는 쪽의 해가 $x=1$ 이 아니다`,
      ).toBe(0);
      // 산 쪽 이차방정식의 나머지 해를 **훑어서** 찾는다 (곱의 성질을 안 쓴다).
      const ak = alive[0]!;
      const lead = ak * ak - a * a;
      const lin = pp * (ak - a);
      const roots: number[] = [];
      for (let x = -400; x <= 400; x += 1) {
        if (lead * x * x + lin * x + c === 0) roots.push(x);
      }
      expect(roots, `s${seed} 두 해가 아니다 (${roots})`).toHaveLength(2);
      expect(roots).toContain(1);
      const other = roots.find((x) => x !== 1)!;
      expect(p.answer, `s${seed}\n${p.content}`).toBe(`$x=${other}$`);
      expect(p.facts.x).toBe(other);
      expect(firstNumber(p.answer)).toBe(other);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("52V — 발문의 곱을 **그대로 펴서** $x$ 를 흔들어도 값이 일정하다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_CANCEL, seed);
      const { cs, m, s } = readCancelStem(p.content);
      const a = firstNumber(p.answer);
      expect(cs.length).toBe(m); // 빼는 $mx^{2}$ 의 $m$ 이 곱의 개수와 같다
      // 🔴 곱셈 공식을 안 쓴다 — 괄호를 그냥 곱한다.
      for (let x = -9; x <= 9; x += 1) {
        let v = 0;
        for (const c of cs) v += (x + c * a) * (x - c * a);
        v -= m * x * x;
        expect(v, `s${seed} x=${x} 에서 값이 일정하지 않다\n${p.content}`).toBe(
          s,
        );
      }
      // 자연수 해가 **하나뿐**인가 — 훑어서 센다.
      const sols: number[] = [];
      for (let t = 1; t <= 300; t += 1) {
        let v = 0;
        for (const c of cs) v += (0 + c * t) * (0 - c * t);
        if (v === s) sols.push(t);
      }
      expect(sols, `s${seed} 자연수 해가 하나가 아니다 (${sols})`).toEqual([a]);
      expect(p.facts.x).toBe(a);
      // ㉠ — 답이 발문에 적힌 수 가운데 하나면 「집어 찍기」가 열린다.
      const stemNums = new Set(
        [...p.content.matchAll(/-?\d+/g)].map((g) => Number(g[0])),
      );
      expect(stemNums.has(a), `s${seed} 답 ${a} 가 발문에 적혀 있다`).toBe(
        false,
      );
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("53V — 창을 **전수**로 훑어 판별식의 정수 제곱근으로 산 것과 죽은 것을 가른다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_ROOTS, seed);
      const m = /이차방정식 \$(\d+)x\^\{2\}-(\d+)x\+k=0\$/.exec(p.content);
      if (!m) throw new Error(`53V 발문을 못 읽었다\n${p.content}`);
      const a = Number(m[1]);
      const b = Number(m[2]);
      // 🔴 근의 공식으로 역산하지 않는다 — $k$ 를 $1$ 부터 넉넉히 훑어 두 근이 «유리수»인
      //    것을 정수 산술로 가려낸다. 근이 없는 $k$ 는 저절로 빠진다.
      const live: number[] = [];
      for (let k = 1; k <= 1000; k += 1) {
        const disc = b * b - 4 * a * k;
        if (disc < 0) break;
        if (intSqrt(disc) === null) continue;
        // 두 근이 실제로 유리수인지 정수 분자·분모로 확인한다.
        const s = intSqrt(disc)!;
        expect((b + s) % 1).toBe(0);
        live.push(k);
      }
      const sum = live.reduce((t, v) => t + v, 0);
      expect(
        firstNumber(p.answer),
        `s${seed} a=${a} b=${b} 산 것 ${live}\n${p.content}`,
      ).toBe(sum);
      expect(p.facts.x).toBe(sum);
      // 「모두 구하시오」이므로 하나짜리면 설계가 무너진 것이다.
      expect(live.length).toBeGreaterThanOrEqual(2);
      // 🔴 **창 안에 중근이 없다** — 「두 근」이라는 발문을 참으로 만드는 불변식.
      //
      // ⚠️ 첫 판은 **대용품**(「$b$ 가 홀수」)을 잠갔다. 그러면 대용품을 넓히는 순간
      //    「불변식이 깨졌다」와 「대용품을 바꿨다」가 구분되지 않는다. 지키려던 것은
      //    처음부터 «창 안에 중근이 없다»이고, 판별식 $b^2-4ak$ 가 $0$ 이 되는 자연수
      //    $k$ 는 $b^2/(4a)$ **하나뿐**이므로 그것이 정수가 아니면 된다.
      //    (2026-09-02 — 창끝 몫 상한을 걸면서 $b$ 의 홀짝 제한을 풀었다.)
      expect((b * b) % (4 * a), `s${seed}: 창 안에 중근이 생긴다`).not.toBe(0);
      const win = Math.floor((b * b) / (4 * a));
      for (let k = 1; k <= win; k += 1) {
        expect(b * b - 4 * a * k, `s${seed}: $k=${k}$ 가 중근이다`).not.toBe(0);
      }
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("54V — $1$부터 $N$까지 **전수**로 값을 만들어 견준다 (제곱수·약수를 안 쓴다)", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_ROOTSUM, seed);
      const m =
        /\$(\d+)\$ 이하의 자연수 \$n\$에 대하여 \$\\sqrt\{n\}\+\\dfrac\{(\d+)\}\{\\sqrt\{n\}\}\$/.exec(
          p.content,
        );
      if (!m) throw new Error(`54V 발문을 못 읽었다\n${p.content}`);
      const n = Number(m[1]);
      const d = Number(m[2]);
      // 🔴 정수 산술로 만든다 — $\sqrt n+\dfrac d{\sqrt n}$ 이 자연수 $t$ 이려면
      //    $n+d=t\sqrt n$ 이고, 양변을 제곱하면 $(n+d)^2=t^2 n$ 이다.
      //    부동소수를 안 쓰고 이 정수 등식으로 판정한다.
      const live: number[] = [];
      for (let v = 1; v <= n; v += 1) {
        for (let t = 1; t <= 4 * (v + d); t += 1) {
          const lhs = (v + d) * (v + d);
          const rhs = t * t * v;
          if (rhs === lhs) {
            live.push(v);
            break;
          }
          if (rhs > lhs) break;
        }
      }
      const sum = live.reduce((t, v) => t + v, 0);
      expect(
        firstNumber(p.answer),
        `s${seed} d=${d} N=${n} 산 것 ${live}\n${p.content}`,
      ).toBe(sum);
      expect(p.facts.x).toBe(sum);
      expect(live.length).toBeGreaterThanOrEqual(3);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉢ 굳힘이 항등식이 아니다 — 굳힘을 **인자로 받는 순수 함수**를 흔든다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉢ 굳힘을 지우면 답이 달라진다", () => {
  it("51V — 「이차방정식인가」를 끄면 후보가 둘 다 남아 답이 하나로 안 굳는다", () => {
    for (const seed of WIDE) {
      const plan = planQuadraticAlive(createRng(seed));
      const on = solveQuadraticAlive(plan.a, plan.p, true);
      const off = solveQuadraticAlive(plan.a, plan.p, false);
      expect(on).toEqual([plan.aliveK]);
      expect(off, `s${seed} 굳힘을 지워도 후보가 하나다`).toHaveLength(2);
      expect(off).toContain(plan.deadK);
      // 죽는 쪽에서는 「나머지 해」가 **아예 없다** — 그것이 굳힘이 일하는 자리다.
      expect(otherRootAtOne(plan.a, plan.p, plan.deadK)).toBeNull();
      expect(otherRootAtOne(plan.a, plan.p, plan.aliveK)).toBe(plan.answer);
    }
  });

  it("52V — $mx^{2}$ 을 빼지 않으면 「$x$에 관계없이」를 만족하는 자연수가 **없다**", () => {
    for (const seed of WIDE) {
      const plan = planCancel(createRng(seed));
      expect(solveCancelCoef(plan.cs, plan.s, true)).toEqual([plan.a]);
      expect(
        solveCancelCoef(plan.cs, plan.s, false),
        `s${seed} 굳힘을 지워도 답이 있다`,
      ).toEqual([]);
      // 굳힘을 끄면 값이 $x$ 에 따라 실제로 **달라진다**.
      const v0 = cancelExprValue(plan.cs, plan.a, 0, false);
      const v5 = cancelExprValue(plan.cs, plan.a, 5, false);
      expect(v0).not.toBe(v5);
      expect(cancelExprValue(plan.cs, plan.a, 0, true)).toBe(
        cancelExprValue(plan.cs, plan.a, 5, true),
      );
    }
  });

  it("53V — 제곱수 조건을 끄면 창 전체가 남아 합이 달라진다", () => {
    for (const seed of WIDE) {
      const plan = planRationalRoots(createRng(seed));
      const on = solveRationalRoots(plan.a, plan.b, true);
      const off = solveRationalRoots(plan.a, plan.b, false);
      expect(on.reduce((t, v) => t + v, 0)).toBe(plan.answer);
      expect(off.length).toBe(plan.window);
      expect(
        off.reduce((t, v) => t + v, 0),
        `a=${plan.a} b=${plan.b} 굳힘을 지워도 합이 그대로다`,
      ).not.toBe(plan.answer);
      // 굳힘이 «일할 자리»가 있어야 한다 — 죽는 $k$ 가 둘 이상.
      expect(plan.window - on.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("54V — 굳힘이 **둘**이고, 켠 조합마다 답이 다르다", () => {
    for (const seed of WIDE) {
      const plan = planRootSum(createRng(seed));
      const sum = (xs: number[]): number => xs.reduce((t, v) => t + v, 0);
      const both = sum(solveRootSumNatural(plan.d, plan.n, true, true));
      const sqOnly = sum(solveRootSumNatural(plan.d, plan.n, true, false));
      const none = sum(solveRootSumNatural(plan.d, plan.n, false, false));
      expect(both).toBe(plan.answer);
      expect(
        new Set([both, sqOnly, none]).size,
        `d=${plan.d} N=${plan.n} 세 답이 다르지 않다 (${both}/${sqOnly}/${none})`,
      ).toBe(3);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉣ 굳힘이 «선택»을 한다 — 극단만 집으면 우연 수준
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉣ 굳힘을 **안 읽고** 찍으면 우연 수준을 못 넘는다", () => {
  const sifts = (plan: (r: () => number) => { sift: Sift }): Sift[] =>
    WIDE.map((s) => plan(createRng(s)).sift);

  it("후보를 견주는 셋에서 `kept` 가 `candidates` 의 진부분집합이다", () => {
    for (const [name, plan] of [
      ["51V", planQuadraticAlive],
      ["53V", planRationalRoots],
      ["54V", planRootSum],
    ] as const) {
      const s = siftScore(sifts(plan));
      expect(s.identity, `${name}: 굳힘이 아무도 안 거른 씨앗이 있다`).toBe(0);
      expect(s.broken, `${name}: 굳힘이 후보 밖 값을 냈다`).toBe(0);
      expect(s.n).toBe(WIDE.length);
    }
  });

  it("극단만 집으면 «우연 수준 + 10%p» 를 못 넘는다", () => {
    // ⚠️ **정직하게 적는다** — `53V`·`54V` 는 답이 «살아남은 것 전부의 합»이라 `kept` 의
    //    크기가 늘 $2$ 이상이고, 그래서 이 수치가 **구조적으로 0**이다. 곧 이 검사만으로는
    //    그 둘의 ㉠ 을 잰 것이 아니다. 그 둘의 진짜 ㉠ 은 아래 두 검사(「사는 자리 모양」
    //    ·「창이 실제로 자른다」)이고, 이 검사가 실제로 «선택»을 재는 것은 후보가 둘이고
    //    답이 하나인 `51V` 뿐이다.
    for (const [name, plan] of [
      ["51V", planQuadraticAlive],
      ["53V", planRationalRoots],
      ["54V", planRootSum],
    ] as const) {
      const e = edgeScore(sifts(plan));
      expect(
        Math.max(e.maxHit, e.minHit),
        `${name}: 극단 집기 max=${e.maxHit} min=${e.minHit} · 우연 ${e.chance}`,
      ).toBeLessThanOrEqual(e.chance + 0.1);
    }
  });

  it("51V — 죽는 후보가 **작은 쪽인 씨앗과 큰 쪽인 씨앗이 반반**이다", () => {
    // 🔴 자연 분포로 뽑으면 «작은 쪽이 죽는» 자리가 16 대 8 로 쏠린다(`quadAlivePool`).
    //    그러면 「늘 작은 쪽을 버린다」로 찍힌다. 그 쏠림이 돌아오면 빨개진다.
    let minDead = 0;
    for (const seed of WIDE) {
      const plan = planQuadraticAlive(createRng(seed));
      const cands = plan.sift.candidates;
      expect(cands).toHaveLength(2);
      expect(plan.deadIsMin).toBe(Math.min(...cands) === plan.deadK);
      if (plan.deadIsMin) minDead += 1;
    }
    const share = minDead / WIDE.length;
    expect(share, `죽는쪽=작은쪽 ${(share * 100).toFixed(1)}%`).toBeGreaterThan(
      0.35,
    );
    expect(share).toBeLessThan(0.65);
  });

  it("51V — 답이 발문에 적힌 수 가운데 하나인 씨앗이 **하나도 없다**", () => {
    for (const seed of WIDE) {
      const p = make(KEY_QUAD, seed);
      const nums = new Set(
        [...p.content.matchAll(/-?\d+/g)].map((g) => Number(g[0])),
      );
      expect(
        nums.has(p.facts.x!),
        `s${seed} 답 ${p.facts.x} 가 발문에 적혀 있다\n${p.content}`,
      ).toBe(false);
    }
  });

  it("51V — 답이 발문의 **두 계수를 한 번 나눈** 값도 아니다 (지름길 봉쇄)", () => {
    // 🔴 2026-09-02 적대적 검증. 답은 $r=\dfrac{2pa}{pt}$ 라 $|t|=1$ 인 씨앗에서
    //    $|r|$ 이 «상수항 $\div p$» 와 **딱 같다** — 지면의 `$…+7(k-3)x+42=0$` 에서
    //    $42\div7=6$ 이 그대로 답이었다. 실측 **57.1%**(부호까지 29.6%).
    //    「적힌 수 하나 집기」를 막는 검사는 이 자리를 **구조적으로 못 본다.**
    //
    // ⚠️ **참을 지면에서 가져온다** — 제품의 `stemReachable` 을 부르면 그 함수가
    //    망가질수록 좋은 점수가 나온다(동어반복). 발문 글자를 파싱해 몫을 여기서
    //    다시 만들고, 「읽은 값이 서로 앞뒤가 맞나」로 파서가 살아 있는지 확인한다.
    const oneStep = (coefs: number[]): Set<number> => {
      const q = new Set<number>();
      for (const x of coefs)
        for (const y of coefs) {
          if (y === 0 || x % y !== 0) continue;
          q.add(x / y);
        }
      return q;
    };
    // 눈금 — 이 검사가 «아니오» 를 낼 수 있다 (양성 2 · 음성 1).
    expect(oneStep([6, 36, 15, 180]).has(12)).toBe(true); // 180 ÷ 15
    expect(oneStep([6, 36, 9, 108]).has(4)).toBe(true); //  36 ÷ 9
    expect(oneStep([6, 36, 15, 180]).has(7)).toBe(false); // 음성

    let read = 0;
    for (const seed of WIDE) {
      const p = make(KEY_QUAD, seed);
      const m =
        /방정식 \$\(k\^\{2\}-(\d+)\)x\^\{2\}\+(\d+)\(k-(\d+)\)x\+(\d+)=0\$/.exec(
          p.content,
        );
      expect(m, `s${seed}: 발문을 못 읽었다\n${p.content}`).not.toBeNull();
      const a2 = Number(m![1]);
      const pp = Number(m![2]);
      const a = Number(m![3]);
      const konst = Number(m![4]);
      // 파서가 살아 있나 — 읽은 넷이 서로 앞뒤가 맞는가.
      expect(a2, `s${seed}: 발문의 $a^{2}$ 이 $a$ 와 안 맞는다`).toBe(a * a);
      expect(konst, `s${seed}: 발문의 상수항이 $2pa$ 가 아니다`).toBe(
        2 * pp * a,
      );
      read += 1;
      const q = oneStep([a, a2, pp, konst]);
      expect(
        q.has(Math.abs(p.facts.x!)),
        `s${seed}: 답 ${p.facts.x} 가 «${konst}÷${pp}» 류 나눗셈 한 번으로 나온다\n${p.content}`,
      ).toBe(false);
    }
    expect(read, "발문을 하나도 못 읽었다면 이 검사는 아무것도 안 지킨다").toBe(
      WIDE.length,
    );
  });

  it("52V — 정답이 **한 값에 안 쏠린다** — 최빈 비율과 겹칠 확률을 잠근다", () => {
    // 🔴 2026-09-02 적대적 검증. 「축이 없다」와 「답이 고르다」는 다른 말이다.
    //    `cancelPool()` 은 $a$ 마다 계수 조합 수가 달라(`4:16 5:6 6:5 7:2 8:1 9:1`)
    //    풀에서 그냥 뽑으면 **$a=4$ 가 51.2%** 였고, 12벌 한 벌에 서로 다른 정답이
    //    **3~4종**뿐이었다. 저술 당시 판정기는 「서로 다른 답 6종」만 찍고 **분포를
    //    안 찍었다** — 그 6종이 어떻게 나뉘는지는 아무도 안 보고 있었다.
    const hist = new Map<number, number>();
    for (const seed of WIDE) {
      for (const v of [0, 1, 2]) {
        const ans = firstNumber(make(KEY_CANCEL, seed, v).answer);
        hist.set(ans, (hist.get(ans) ?? 0) + 1);
      }
    }
    const n = [...hist.values()].reduce((t, v) => t + v, 0);
    expect(n).toBe(WIDE.length * 3);
    // 풀이 낼 수 있는 답이 **하나도 안 빠진다**.
    expect([...hist.keys()].sort((x, y) => x - y)).toEqual(CANCEL_ANSWERS);
    const share = [...hist.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([k, v]) => `${k}:${((v / n) * 100).toFixed(1)}%`)
      .join(" ");
    const top = Math.max(...hist.values()) / n;
    expect(top, `최빈 정답이 너무 무겁다 — ${share}`).toBeLessThan(0.25);
    // 한 시험지에 둘이 실렸을 때 정답이 겹칠 확률 $\sum p^2$ (고르면 $1/6=16.7\%$).
    const collide = [...hist.values()].reduce(
      (t, v) => t + (v / n) * (v / n),
      0,
    );
    expect(
      collide,
      `한 시험지의 둘이 같은 답일 확률 ${(collide * 100).toFixed(1)}% — ${share}`,
    ).toBeLessThan(0.2);
  });

  it("51V·53V — 풀이 낼 수 있는 답이 **하나도 안 빠지고**, 한 값에 안 쏠린다", () => {
    // 🔴 ㉠ 를 조인 값 — 51V 는 몫 가드로 풀이 $26\to16$(답 $20\to9$), 53V 는 창끝 몫
    //    상한으로 답이 $15\to10$ 이 됐다. 그러면 **한 시험지에 같은 답이 더 자주 겹친다**
    //    (12벌 한 벌의 서로 다른 정답 실측 $10.7\to7.9$ · $10.7\to8.0$). 그래서 52V 처럼
    //    **답을 먼저 고르고** 그에 맞는 씨앗을 뽑게 했다($\to 8.6$ · $8.5$).
    //    이 검사가 그 균형을 잠근다 — 「고르게 뽑기」를 무르면 빨개진다.
    const reach51 = new Set(
      quadAlivePool().map((s) => otherRootAtOne(s.a, s.p, s.a - s.p)!),
    );
    const reach53 = new Set(
      rationalRootPool().map((s) =>
        solveRationalRoots(s.a, s.b, true).reduce((t, v) => t + v, 0),
      ),
    );
    // ⚠️ **문턱을 실측 사이에 놓는다** — 「고르게 뽑기」를 실제로 꺼서 재 봤다(씨앗 2,400).
    //
    // ```
    //        균형 켬                    균형 끔
    //  51V   최빈 13.33% 최소 8.96%   최빈 17.33% 최소 4.63%
    //  53V   최빈 10.83% 최소 8.75%   최빈 14.46% 최소 4.33%
    // ```
    //
    //    🔴 **최빈만 보면 53V 를 못 갈라 준다**(14.46% 는 어떤 문턱을 둬도 10.83% 와 너무
    //    가깝다) — 실제로 최빈 문턱만 뒀더니 53V 변이가 **초록**이었다. 가르는 것은
    //    **최소 쪽**이다: 고르게 뽑으면 «가장 드문 답»이 올라온다. 그래서 둘 다 잠근다.
    //    씨앗을 240 으로 좁히면 흔들림이 커져($51V$ 최빈 14.9%) 최빈 문턱이 무뎌진다.
    const N = 2400;
    const seeds = Array.from({ length: N }, (_, i) => 20260902 + i * 7919);
    for (const [name, key, reach, plan] of [
      ["51V", KEY_QUAD, reach51, planQuadraticAlive],
      ["53V", KEY_ROOTS, reach53, planRationalRoots],
    ] as const) {
      const hist = new Map<number, number>();
      for (const seed of seeds) {
        const ans = plan(createRng(seed)).answer;
        hist.set(ans, (hist.get(ans) ?? 0) + 1);
      }
      // 설계의 답이 곧 지면의 답인가 — 이 히스토그램이 «다른 것»을 세고 있지 않다는 다리.
      for (const seed of WIDE.slice(0, 40)) {
        expect(firstNumber(make(key, seed).answer)).toBe(
          plan(createRng(seed + keySalt(key))).answer,
        );
      }
      // 풀이 낼 수 있는 답을 **하나도 안 빠뜨린다** — 「고르게」의 반대편 검사다.
      expect(
        [...hist.keys()].sort((x, y) => x - y),
        `${name}: 풀이 낼 수 있는 답 가운데 안 나온 것이 있다`,
      ).toEqual([...reach].sort((x, y) => x - y));
      const top = Math.max(...hist.values()) / N;
      const low = Math.min(...hist.values()) / N;
      const uniform = ((1 / reach.size) * 100).toFixed(1);
      expect(
        top,
        `${name}: 최빈 정답 ${(top * 100).toFixed(2)}% (답 ${reach.size}종이면 고를 때 ${uniform}%)`,
      ).toBeLessThan(0.16);
      expect(
        low,
        `${name}: 가장 드문 정답 ${(low * 100).toFixed(2)}% (답 ${reach.size}종이면 고를 때 ${uniform}%)`,
      ).toBeGreaterThan(0.07);
    }
  });

  it("53V — 답이 발문에 적힌 수 가운데 하나인 씨앗이 **하나도 없다**", () => {
    // 🔴 `rationalRootPool` 의 `new Set([0, 2, a, b]).has(sum)` 은 ㉠ 의 근거로
    //    주석에 적혀 있는데 **그것을 지키는 시험이 하나도 없었다**(51V 에는 짝이
    //    있었다). 지우고 돌리니 58/58 초록이라 «가드가 아니라 장식»인 자리였다.
    //
    // ⚠️ **부호를 뺀 값도 같이 막는다.** 지면의 `$16x^{2}-26x+k=0$` 은 수를 읽는 자
    //    (`/-?\d+/`)에게 **`-26`** 으로 보이는데, 학생이 읽는 계수는 $26$ 이다.
    //    한쪽만 세면 답이 $26$ 인 씨앗이 그대로 빠져나간다 — 첫 판이 그랬고,
    //    변이(가드 제거)가 **초록**이라 드러났다.
    for (const seed of WIDE) {
      const p = make(KEY_ROOTS, seed);
      const nums = new Set<number>();
      for (const g of p.content.matchAll(/-?\d+/g)) {
        nums.add(Number(g[0]));
        nums.add(-Number(g[0]));
      }
      expect(
        nums.has(p.facts.x!),
        `s${seed} 답 ${p.facts.x} 가 발문에 적혀 있다\n${p.content}`,
      ).toBe(false);
    }
  });

  it("53V — 창끝은 **언제나 산다**. 숨기지 않고 적고, 그 몫을 절반 아래로 잠근다", () => {
    // ⚠️ **정직하게 적는다** — 창끝 $k=\lfloor b^2/4a\rfloor$ 의 판별식은
    //    $b^2\bmod 4a$ 인데 이 격자에서는 **늘 제곱수**다. 그래서 「살아남은 자리가
    //    연속이 아니다」로는 «뒤에서 하나»를 못 막는다(모듈 머리말이 막았다고
    //    단언하던 자리 — 2026-09-02 에 실측 $18/18$ 로 뒤집혔다).
    //    깨는 대신 **몫에 상한**을 건다: 창끝 하나로는 답의 절반도 못 얻는다.
    //    실측 창끝 몫 평균 $58.3\% \to 41.2\%$ · 최대 $83.3\% \to 46.2\%$.
    let maxShare = 0;
    for (const seed of WIDE) {
      const plan = planRationalRoots(createRng(seed));
      expect(
        plan.kept,
        `a=${plan.a} b=${plan.b}: 창끝이 죽었다 — 구조적 사실이 바뀌었으면 머리말도 고쳐야 한다`,
      ).toContain(plan.window);
      expect(
        2 * plan.window,
        `a=${plan.a} b=${plan.b} 창=${plan.window} 합=${plan.answer}: 창끝 하나가 답의 절반을 넘는다`,
      ).toBeLessThan(plan.answer);
      // 위 상한이 이것을 머금는다 — 사는 것이 둘이면 하나가 창끝이라 합 < 2·창 이다.
      expect(plan.kept.length).toBeGreaterThanOrEqual(3);
      // 창 안에 중근이 없다 — 대용품(「$b$ 홀수」)이 아니라 원래 지키려던 것.
      expect((plan.b * plan.b) % (4 * plan.a)).not.toBe(0);
      maxShare = Math.max(maxShare, plan.window / plan.answer);
    }
    expect(
      maxShare,
      `창끝 몫 최대 ${(maxShare * 100).toFixed(1)}%`,
    ).toBeLessThan(0.5);
  });

  it("54V — 답이 발문에 적힌 수 가운데 하나인 씨앗이 **하나도 없다**", () => {
    // 🔴 `rootSumPool` 의 `new Set([0, d, n]).has(sum)` 도 같은 자리였다 —
    //    무르면 58/58 초록이었다(실제로 3짝을 버리는 살아 있는 규칙인데).
    for (const seed of WIDE) {
      const p = make(KEY_ROOTSUM, seed);
      const nums = new Set<number>();
      for (const g of p.content.matchAll(/-?\d+/g)) {
        nums.add(Number(g[0]));
        nums.add(-Number(g[0]));
      }
      expect(
        nums.has(p.facts.x!),
        `s${seed} 답 ${p.facts.x} 가 발문에 적혀 있다\n${p.content}`,
      ).toBe(false);
    }
  });

  it("53V — 사는 자리가 **연속이 아니고**, 그 모양이 씨앗마다 갈린다", () => {
    const shapes = new Set<string>();
    for (const seed of WIDE) {
      const plan = planRationalRoots(createRng(seed));
      const kept = plan.kept;
      shapes.add(`${plan.window}:${kept.join(",")}`);
      const contiguous = kept.every(
        (v, i) => i === 0 || v === kept[i - 1]! + 1,
      );
      expect(
        contiguous,
        `a=${plan.a} b=${plan.b} 사는 자리가 연속이다 (${kept})`,
      ).toBe(false);
    }
    expect(shapes.size, "자리 모양이 한 가지뿐이다").toBeGreaterThanOrEqual(8);
  });

  it("54V — 창이 **실제로 자르고**, 그 사실을 정직하게 적는다", () => {
    // ⚠️ **정직하게 적는다** — 창이 약수 목록의 큰 쪽을 자르므로 살아남는 $k$ 는 늘
    //    약수 목록의 **앞부분**이고, $k=1$ 은 어떤 $d$ 의 약수이기도 하므로 $n=1$ 이
    //    **언제나** 살아남는다. 이는 설계의 구조적 사실이지 ㉠ 을 넘긴 근거가 아니다.
    //    근거는 ⓐ 답이 «합»이고 ⓑ 창 안에서 사는 $n$ 이 띄엄띄엄 놓이며
    //    ⓒ 몇 개가 사는지는 약수를 다 만들어 봐야 안다는 것이다.
    const shapes = new Set<string>();
    for (const seed of WIDE) {
      const plan = planRootSum(createRng(seed));
      expect(plan.kept[0]).toBe(1); // 구조적 사실 — 숨기지 않고 여기 적어 둔다
      expect(
        plan.cutSquares.length,
        `d=${plan.d} N=${plan.n} 창이 아무것도 안 자른다`,
      ).toBeGreaterThanOrEqual(1);
      // 사는 $n$ 이 창 안에서 «띄엄띄엄» 놓인다 — 붙어 있으면 「앞에서 몇 개」로 찍힌다.
      const gaps = plan.kept.slice(1).map((v, i) => v - plan.kept[i]!);
      expect(
        Math.max(...gaps),
        `d=${plan.d} 사는 자리가 붙어 있다`,
      ).toBeGreaterThan(1);
      // 약수 목록이 정본과 같은가 — 규칙을 옮겨 적지 않고 다시 만든다.
      expect(plan.divs).toEqual(divisors(plan.d));
      shapes.add(`${plan.d}/${plan.n}`);
    }
    expect(shapes.size).toBeGreaterThanOrEqual(20);
  });

  it("52V — ㉣ 을 **잴 축이 없다**. 0 으로 찍지 않고 그 사실을 못 박는다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다(`m1Top.ts` 머리말 ⚠️).
    const plan = planCancel(createRng(WIDE[0]!));
    expect(Object.keys(plan)).not.toContain("sift");
    expect(Object.keys(plan)).not.toContain("candidates");
    // 대신 「발문에 적힌 수 하나 찍기」가 **구조적으로 0%** 임을 불변식으로 잠근다.
    for (const seed of WIDE) {
      const p = planCancel(createRng(seed));
      expect(p.cs).not.toContain(p.a);
      expect(p.a).not.toBe(3); // 발문의 $3x^{2}$
      expect(p.a).toBeGreaterThanOrEqual(4); // 발문의 지수 $2$ 와도 안 겹친다
      expect(Math.abs(p.s)).not.toBe(p.a);
      expect(p.s).toBe(-p.sigma * p.a * p.a);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤ 🔴 해설의 중간값을 스스로 검산한다 (2차 물결의 치명 결함 자리)
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉤ 해설이 적은 등식을 전부 다시 계산한다", () => {
  it("51V — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    let conditional = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_QUAD, seed);
      const { a, p: pp, c } = readQuadStem(p.content);
      const cands: number[] = [];
      for (let k = -400; k <= 400; k += 1) {
        if (k * k - a * a + pp * (k - a) + c === 0) cands.push(k);
      }
      const other = p.facts.x!;
      const envI = [
        { k: 3, x: 2 },
        { k: -7, x: 5 },
        { k: 11, x: -3 },
        { k: 0, x: 9 },
      ];
      const envS: Record<string, number>[] = [];
      for (const k of cands) for (const x of [1, other]) envS.push({ k, x });
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      conditional += r.conditional;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      // 🔴 «본 자리»가 0 이면 판정을 거부한다 — 0 은 「깨끗」과 「못 셈」을 안 가른다.
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        8,
      );
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(2);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(100);
    expect(conditional).toBeGreaterThan(100);
  });

  it("52V — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    let identity = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_CANCEL, seed);
      const a = p.facts.x!;
      const envI = [
        { x: 2, a: 3, A: 5, B: 7 },
        { x: -4, a: 6, A: 2, B: 9 },
        { x: 11, a: 1, A: -3, B: 4 },
        { x: 0, a: 8, A: 7, B: -2 },
        { x: 5, a: 2, A: 1, B: 6 },
      ];
      // 해설이 「$a=\pm$」 두 값을 다 적으므로 둘 다 주장한 값이다.
      const envS = [
        { x: 1, a, A: 3, B: 4 },
        { x: 1, a: -a, A: 3, B: 4 },
      ];
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      identity += r.identity;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        7,
      );
      expect(r.identity, `s${seed}: 항등식 검산이 없다`).toBeGreaterThanOrEqual(
        4,
      );
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(identity).toBeGreaterThan(200);
    // 🔴 첫 판은 `toBeGreaterThanOrEqual(0)` 이었다 — **언제나 참인 장식**이다.
    //    52V 해설의 등식은 **하나도 빠짐없이** $a$·$x$·$A$·$B$ 가운데 하나를 쓰므로
    //    «자유 문자 없는 수치 등식»이 구조적으로 $0$ 이고, 그래서 그 줄은 「아니오」를
    //    낼 수 없었다(형제 51V·53V·54V 는 같은 자리에 실효 하한이 걸려 있다).
    //    그 사실을 **못 박는다** — $0$ 이 아니게 되면 해설 구조가 바뀐 것이니 그때
    //    이 갈래의 검산을 다시 설계하라는 뜻이다(2026-09-02 적대적 검증).
    expect(
      numeric,
      "52V 해설에 «자유 문자 없는 수치 등식»이 생겼다 — 검산 설계를 다시 보라",
    ).toBe(0);
  });

  it("53V — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_ROOTS, seed);
      const plan = planRationalRoots(createRng(seed + keySalt(KEY_ROOTS)));
      const envI = [
        { k: 3, x: 2 },
        { k: -7, x: 5 },
        { k: 11, x: -3 },
        { k: 2, x: 9 },
      ];
      // 🔴 주장한 값에는 **유리수 근**도 들어간다 — 그것이 이 문항이 묻는 성질이다.
      //    근은 규칙을 옮겨 적지 않고 판별식의 정수 제곱근으로 다시 만든다.
      const envS: Env[] = [];
      for (let k = 1; k <= plan.window; k += 1) {
        envS.push({ k, x: 0 });
        const s = intSqrt(plan.b * plan.b - 4 * plan.a * k);
        if (s === null) continue;
        for (const sign of [1, -1]) {
          envS.push({ k, x: F(plan.b + sign * s, 2 * plan.a) });
        }
      }
      const r = checkEquations(p.solution, envI, envS);
      numeric += r.numeric;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        5,
      );
      // 「제곱수다」(사는 $k$ 마다 하나)와 「합이다」가 수치 등식이다 — 최소 셋.
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(3);
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(300);
  });

  it("54V — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let numeric = 0;
    let identity = 0;
    const bad: string[] = [];
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_ROOTSUM, seed);
      // 항등식 대입은 **$n=k^{2}$ 인 짝**이어야 한다 — 해설이 그 치환을 쓰기 때문이다.
      const envI = [1, 2, 3, 5, 7].map((k) => ({ n: k * k, k }));
      // 주장한 값 — 해설이 「실제로 $n=36$일 때」처럼 살아남은 $n$ 을 지목한다.
      const plan = planRootSum(createRng(seed + keySalt(KEY_ROOTSUM)));
      const envS = plan.kept.map((n) => ({ n, k: intSqrt(n)! }));
      const r = checkEquations(p.solution, envI, [...envI, ...envS]);
      numeric += r.numeric;
      identity += r.identity;
      for (const b of r.bad) bad.push(`s${seed}: ${b}`);
      expect(r.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThanOrEqual(
        5,
      );
      expect(r.numeric, `s${seed}: 수치 등식이 없다`).toBeGreaterThanOrEqual(2);
      expect(r.identity, `s${seed}: 항등식 검산이 없다`).toBeGreaterThanOrEqual(
        3,
      );
    }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(numeric).toBeGreaterThan(150);
    expect(identity).toBeGreaterThan(250);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤-2 해설이 «두 번 말한 사실»을 서로 맞댄다 — 2차 물결의 결함이 그 자리였다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉤-2 해설이 두 번 말한 것을 맞댄다", () => {
  it("51V — 세운 $k$ 이차방정식의 근이 **훑어서 찾은 후보 둘과 정확히 같다**", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_QUAD, seed);
      const { a, p: pp, c } = readQuadStem(p.content);
      const m =
        /좌변을 \$k\$에 대하여 정리하면 \$k\^\{2\}\+(\d+)k\+(\d+)=0\$/.exec(
          p.solution,
        );
      expect(m, `s${seed}: 정리한 이차방정식 줄이 없다`).not.toBeNull();
      const P = Number(m![1]);
      const Q = Number(m![2]);
      // 해설이 적은 이차방정식의 정수 근을 훑는다.
      const rootsOfWritten: number[] = [];
      for (let k = -400; k <= 400; k += 1)
        if (k * k + P * k + Q === 0) rootsOfWritten.push(k);
      // 원 발문에 $x=1$ 을 넣어 훑은 후보.
      const fromStem: number[] = [];
      for (let k = -400; k <= 400; k += 1)
        if (k * k - a * a + pp * (k - a) + c === 0) fromStem.push(k);
      expect(
        rootsOfWritten,
        `s${seed}: 해설의 $k$ 이차방정식이 발문과 다른 근을 낸다`,
      ).toEqual(fromStem);

      // 인수분해 줄과 그 이차식이 **모든 $k$ 에서** 같은가.
      const f = /좌변을 인수분해하면 \$\(k\+(-?\d+)\)\(k\+(-?\d+)\)=0\$/.exec(
        p.solution,
      );
      expect(f, `s${seed}: 인수분해 줄이 없다`).not.toBeNull();
      const A = Number(f![1]);
      const B = Number(f![2]);
      for (let k = -20; k <= 20; k += 1) {
        // `Math.abs` 는 JS 의 `-0` 을 `0` 으로 맞춘다 — 값은 같은데 `Object.is` 가
        // 다르다고 하는 자리를 피한다(뿌리 하나가 $k$ 일 때 곱이 `-0` 이 된다).
        expect(
          Math.abs((k + A) * (k + B) - (k * k + P * k + Q)),
          `s${seed}: 인수분해가 이차식과 다르다 (k=${k})`,
        ).toBe(0);
      }
    }
  });

  it("51V — 「양변을 나눈 식」·「인수분해한 식」이 원 이차방정식과 같은 해를 낸다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_QUAD, seed);
      const { a, p: pp, c } = readQuadStem(p.content);
      const ak = p.facts.aliveK!;
      const lead = ak * ak - a * a;
      const lin = pp * (ak - a);
      const m =
        /양변을 \$(-?\d+)\$(?:으로|로) 나누면 \$x\^\{2\}([-+][^=]*)=0\$/.exec(
          p.solution,
        );
      expect(m, `s${seed}: 「양변을 나누면」 줄이 없다`).not.toBeNull();
      expect(
        Number(m![1]),
        `s${seed}: 나눈 수가 $x^{2}$ 의 계수가 아니다`,
      ).toBe(lead);
      const f = /인수분해하면 \$\(x-1\)\(x([-+]\d+)\)=0\$/.exec(p.solution);
      expect(f, `s${seed}: 최종 인수분해 줄이 없다`).not.toBeNull();
      const other = -Number(f![1]);
      expect(other, `s${seed}: 인수분해가 낸 나머지 해가 답과 다르다`).toBe(
        p.facts.x,
      );
      // 그 해를 **원 발문 식**(정리한 식이 아니라)에 넣어 $0$ 인지 본다.
      for (const x of [1, other]) {
        expect(
          lead * x * x + lin * x + c,
          `s${seed}: 해 ${x} 가 원 방정식을 만족하지 않는다`,
        ).toBe(0);
      }
    }
  });

  it("53V — 나열한 판별식·제곱근·두 근·합을 **각각 다른 길로** 다시 만든다", () => {
    // 🔴 2026-09-02 — 씨앗을 `SEEDS`(9개)에서 `WIDE`(240개)로 넓혔다. 풀이 스물둘이라
    //    아홉 개로는 절반도 안 밟는다(창끝 몫 상한을 넣으며 풀이 통째로 바뀌었다).
    for (const seed of WIDE) {
      const p = make(KEY_ROOTS, seed);
      const m = /이차방정식 \$(\d+)x\^\{2\}-(\d+)x\+k=0\$/.exec(p.content)!;
      const a = Number(m[1]);
      const b = Number(m[2]);
      const win = /자연수 \$k\$는 \$1\$부터 \$(\d+)\$까지이다/.exec(p.solution);
      expect(win, `s${seed}: 창을 적은 줄이 없다`).not.toBeNull();
      const window = Number(win![1]);
      expect(window, `s${seed}: 창이 판별식으로 다시 계산한 값과 다르다`).toBe(
        Math.floor((b * b) / (4 * a)),
      );
      // 🔴 그리고 **설계값**과도 맞댄다 — 위 한 줄은 창을 «발문에서 읽은 $a,b$» 로
      //    다시 계산할 뿐이라, 발문과 해설이 같이 틀리면 스스로 맞다고 답한다.
      const plan = planRationalRoots(createRng(seed + keySalt(KEY_ROOTS)));
      expect(a, `s${seed}: 발문의 $a$ 가 설계값과 다르다`).toBe(plan.a);
      expect(b, `s${seed}: 발문의 $b$ 가 설계값과 다르다`).toBe(plan.b);
      expect(window, `s${seed}: 해설의 창이 설계값과 다르다`).toBe(plan.window);

      // ① 나열 줄의 판별식을 뽑아 $k$ 로 다시 계산해 대조한다.
      const listLine = p.solution
        .split("\n")
        .find((l) => l.includes("의 값은 차례로"))!;
      expect(listLine, `s${seed}: 나열 줄이 없다`).toBeTruthy();
      const listed = [...listLine.matchAll(/\$(-?\d+)\$/g)]
        .map((g) => Number(g[1]))
        .slice(2); // 앞 둘은 창의 시작·끝
      expect(listed, `s${seed}: 나열한 판별식 수가 창과 다르다`).toHaveLength(
        window,
      );
      listed.forEach((v, i) => {
        expect(v, `s${seed}: $k=${i + 1}$ 의 판별식이 다르다`).toBe(
          b * b - 4 * a * (i + 1),
        );
      });

      // ② 「제곱수다」한 자리는 적은 근호값을 **다시 제곱**해 대조한다.
      const sqLine = p.solution
        .split("\n")
        .find((l) => l.includes("제곱수인 것은"))!;
      const pairs = [...sqLine.matchAll(/\$(\d+)=(\d+)\^\{2\}\$/g)];
      expect(pairs.length, `s${seed}: 제곱수 짝이 없다`).toBeGreaterThanOrEqual(
        2,
      );
      for (const g of pairs) {
        expect(Number(g[2]) * Number(g[2]), `s${seed}: 제곱이 안 맞는다`).toBe(
          Number(g[1]),
        );
        expect(listed).toContain(Number(g[1]));
      }
      // 🔴 **반대쪽 표본** — 「제곱수가 아니다」한 자리도 전부 확인한다.
      const notSq = [
        ...sqLine.slice(sqLine.indexOf("나머지")).matchAll(/\$(\d+)\$/g),
      ].map((g) => Number(g[1]));
      expect(
        notSq.length + pairs.length,
        `s${seed}: 창을 다 다루지 않았다`,
      ).toBe(window);
      for (const v of notSq)
        expect(intSqrt(v), `s${seed}: ${v} 는 사실 제곱수다`).toBeNull();

      // ③ 해설이 적은 두 근을 **원 발문 식**에 대입한다 (정수 분자·분모 산술).
      for (const g of p.solution.matchAll(
        /\$k=(\d+)\$일 때 두 근은 \$x=\\dfrac\{\d+\+\d+\}\{\d+\}=([^$]+)\$, \$x=\\dfrac\{\d+-\d+\}\{\d+\}=([^$]+)\$/g,
      )) {
        const k = Number(g[1]);
        for (const tex of [g[2]!, g[3]!]) {
          const fr = /^\\dfrac\{(-?\d+)\}\{(\d+)\}$/.exec(tex);
          const num = fr ? Number(fr[1]) : Number(tex);
          const den = fr ? Number(fr[2]) : 1;
          expect(Number.isFinite(num), `s${seed}: 근을 못 읽었다 ${tex}`).toBe(
            true,
          );
          // $a x^2 - b x + k = 0$ 에 $x=num/den$ 을 넣고 $den^2$ 을 곱한 정수 등식.
          expect(
            a * num * num - b * num * den + k * den * den,
            `s${seed}: $k=${k}$ 의 근 ${tex} 가 방정식을 만족하지 않는다`,
          ).toBe(0);
        }
      }

      // ④ 합은 **해설이 나열한 수를 다시 더해** 정답·`facts.x` 와 셋을 대조한다.
      const last = p.solution.split("\n").at(-1)!;
      const kept = [...last.matchAll(/\$(\d+)\$/g)].map((g) => Number(g[1]));
      const eq = /그 합은 \$([\d+]+)=(\d+)\$이다/.exec(last)!;
      const added = eq[1]!.split("+").map(Number);
      expect(added, `s${seed}: 마지막 줄의 나열과 덧셈이 다르다`).toEqual(kept);
      expect(added.reduce((t, v) => t + v, 0)).toBe(Number(eq[2]));
      expect(Number(eq[2])).toBe(p.facts.x);
      expect(firstNumber(p.answer)).toBe(p.facts.x);
    }
  });

  it("54V — 약수 목록·제곱 목록·버린 것·합을 서로 맞댄다 (반대쪽 표본 포함)", () => {
    // 🔴 2026-09-02 — 씨앗을 `SEEDS`(9개)에서 `WIDE`(240개)로 넓혔다.
    //    이 검사는 「버린 것이 정말 창 밖인가」를 재는 **유일한** 자인데, 좁은 씨앗은
    //    **경계 짝**($N$ = 가장 큰 살아남은 값)을 한 번도 안 밟았다. 그래서 `>` 를
    //    `>=` 로 바꾸면 해설이 「$100$은 $100$보다 크므로 조건에 맞지 않는다」고 적고
    //    **바로 다음 줄에서 $100$을 살아남은 값으로 세는데** 정답은 그대로라 값 검산이
    //    구조적으로 못 보고 이 검사도 초록이었다. 아래 `boundary` 가 그 짝을 실제로
    //    밟았는지 세고, $0$ 이면 판정을 거부한다 — $0$ 은 「깨끗」과 「못 셈」을 안 가른다.
    let boundary = 0;
    for (const seed of WIDE) {
      const p = make(KEY_ROOTSUM, seed);
      const sm =
        /\$(\d+)\$ 이하의 자연수 \$n\$에 대하여 \$\\sqrt\{n\}\+\\dfrac\{(\d+)\}\{\\sqrt\{n\}\}\$/.exec(
          p.content,
        )!;
      const N = Number(sm[1]);
      const D = Number(sm[2]);
      // 🔴 **발문의 창을 «설계값»과 맞댄다.** 아래 ③ 은 $N$ 을 **발문에서 읽어** 쓰므로
      //    발문과 해설이 «같이» 틀리면 스스로 맞다고 답한다(자를 잴 대상에서 가져온
      //    자리). 실제로 발문의 `$N$ 이하` 를 `$N+1$ 이하` 로 바꾸면 발문은 「$71$ 이하」
      //    인데 해설은 「$70$보다 크므로」인 지면이 나오는데 58/58 초록이었다.
      //    설계는 `make` 와 **같은 씨앗**으로 다시 만든다(변형 0 이면 rng 가 같다).
      const plan = planRootSum(createRng(seed + keySalt(KEY_ROOTSUM)));
      expect(N, `s${seed}: 발문의 창이 설계값과 다르다`).toBe(plan.n);
      expect(D, `s${seed}: 발문의 $d$ 가 설계값과 다르다`).toBe(plan.d);
      const line = p.solution.split("\n").find((l) => l.includes("의 약수는"))!;
      const halves = line.split("이므로");
      const listedDivs = [...halves[0]!.matchAll(/\$(\d+)\$/g)]
        .map((g) => Number(g[1]))
        .slice(1); // 앞 하나는 $D$ 자신
      const listedSquares = [...halves[1]!.matchAll(/\$(\d+)\$/g)].map((g) =>
        Number(g[1]),
      );
      // ① 약수 목록을 다시 만들어 대조 — **빠뜨린 것이 없어야** 한다.
      expect(listedDivs, `s${seed}: 약수 목록이 다르다`).toEqual(divisors(D));
      // ② 제곱 목록이 그 약수의 제곱인가.
      expect(listedSquares).toEqual(listedDivs.map((k) => k * k));
      // ③ 버린 것이 정말 창 밖인가 — 그리고 하나 이상인가.
      const cutLine = p.solution
        .split("\n")
        .find((l) => l.includes("보다 크므로"))!;
      const cutNums = [...cutLine.matchAll(/\$(\d+)\$/g)].map((g) =>
        Number(g[1]),
      );
      // 🔴 마지막 하나는 **해설이 쓰는 창**이다. 버리지 말고 발문·설계와 맞댄다.
      expect(
        cutNums[cutNums.length - 1],
        `s${seed}: 해설이 쓰는 창이 발문과 다르다\n${cutLine}`,
      ).toBe(N);
      const cut = cutNums.slice(0, -1);
      expect(cut.length).toBeGreaterThanOrEqual(1);
      for (const v of cut) expect(v).toBeGreaterThan(N);
      // ④ 🔴 **반대쪽 표본** — 해설이 나열하지 않은 $1..N$ 의 모든 $n$ 은 자연수가 아니다.
      const last = p.solution.split("\n").at(-1)!;
      const eq = /그 합은 \$([\d+]+)=(\d+)\$이다/.exec(last)!;
      const kept = eq[1]!.split("+").map(Number);
      for (let v = 1; v <= N; v += 1) {
        let natural = false;
        for (let t = 1; t <= 4 * (v + D); t += 1) {
          const rhs = t * t * v;
          if (rhs === (v + D) * (v + D)) {
            natural = true;
            break;
          }
          if (rhs > (v + D) * (v + D)) break;
        }
        expect(
          natural,
          `s${seed}: $n=${v}$ 의 판정이 해설의 목록과 어긋난다`,
        ).toBe(kept.includes(v));
      }
      // ⑤ 합 대조.
      expect(kept.reduce((t, v) => t + v, 0)).toBe(Number(eq[2]));
      expect(Number(eq[2])).toBe(p.facts.x);
      expect(firstNumber(p.answer)).toBe(p.facts.x);
      // ⑥ **경계 짝을 밟았나** — $N$ 이 가장 큰 살아남은 값과 같은 씨앗.
      //    여기서만 `>` ↔ `>=` 가 갈린다.
      if (Math.max(...kept) === N) boundary += 1;
    }
    expect(
      boundary,
      "경계 짝($N$ = 가장 큰 살아남은 값)을 한 번도 안 밟았다 — 이 검사는 그 자리를 못 지킨다",
    ).toBeGreaterThanOrEqual(1);
  });

  it("52V — 발문의 계수로 일정값을 **다시 계산**한다 (제품 상수를 안 쓴다)", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_CANCEL, seed);
      const { cs, m, s } = readCancelStem(p.content);
      const a = p.facts.x!;
      const sigma = cs.reduce((t, c) => t + c * c, 0);
      expect(
        s,
        `s${seed}: 발문의 일정값이 계수로 다시 계산한 값과 다르다`,
      ).toBe(-sigma * a * a);
      expect(m).toBe(cs.length);
      // 해설이 적은 $\Sigma$ 도 계수에서 다시 만든다.
      const line = p.solution
        .split("\n")
        .find((l) => l.includes("변끼리 더하면"))!;
      const g = /=(\d+)x\^\{2\}-(\d+)a\^\{2\}\$/.exec(line);
      expect(g, `s${seed}: 더한 줄을 못 읽었다`).not.toBeNull();
      expect(Number(g![1])).toBe(cs.length);
      expect(Number(g![2]), `s${seed}: 해설의 $\\Sigma$ 가 다르다`).toBe(sigma);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉥ 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸)
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉥ 해설이 걸음을 건너뛰지 않는다", () => {
  it("전 씨앗에서 «생략 표지 뒤에 중간 결과 없음»이 0건이다", () => {
    const thin: string[] = [];
    for (const e of M3_TOP_3) {
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

  it("51V — 후보 **둘을 하나씩 세우고** 각각 왜 살고 죽는지 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_QUAD, seed);
      for (const mark of ["㉠", "㉡"]) {
        expect(p.solution, `s${seed}: ${mark} 가 해설에 없다`).toContain(mark);
      }
      // 🔴 **함정을 해설이 말한다** — 죽는 쪽도 $x=1$ 을 해로 갖는다는 것.
      expect(p.solution).toContain("이 일차방정식의 해도 $x=1$이지만");
      expect(p.solution).toContain("일차방정식이다");
      expect(p.solution).toContain("이므로 주어진 방정식은 이차방정식이다");
      expect(p.solution).toContain("조건에 맞지 않는다");
    }
  });

  it("53V — 창 안의 $k$ 를 **하나도 빠뜨리지 않고** 다루고 사는 쪽은 근까지 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_ROOTS, seed);
      const plan = planRationalRoots(createRng(seed + keySalt(KEY_ROOTS)));
      plan.kept.forEach((k, i) => {
        const mark = ["㉠", "㉡", "㉢", "㉣", "㉤"][i]!;
        expect(p.solution, `s${seed}: ${mark} 가 없다`).toContain(
          `${mark} $k=${k}$일 때 두 근은`,
        );
      });
      expect(p.solution).toContain("제곱수가 아니다");
      expect(p.solution).toContain("두 근이 모두 유리수이다");
    }
  });

  it("54V — 유리화·치환·약수·창 네 걸음을 다 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_ROOTSUM, seed);
      expect(p.solution).toContain("분모를 유리화하면");
      expect(p.solution).toContain("이 제곱수이어야 한다");
      expect(p.solution).toContain("의 약수이다");
      expect(p.solution).toContain("보다 크므로 조건에 맞지 않는다");
      expect(p.solution).toContain("실제로 $n=");
    }
  });

  it("52V — 「$x$ 에 관계없이 일정하다」를 **왜 그런지까지** 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_CANCEL, seed);
      expect(p.solution).toContain("곱셈 공식 $(A+B)(A-B)=A^{2}-B^{2}$");
      expect(p.solution).toContain("서로 지워지므로");
      expect(p.solution).toContain("관계없이 일정하다");
      // ⑷ 「$a$ 는 자연수」로 음의 근을 버린 근거를 적는다.
      expect(p.solution).toContain("$a$는 자연수이므로");
      expect(p.solution).toContain("인데,");
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉦ 지면 냄새 + 조사 + KaTeX — 값은 맞는데 글자가 나쁜 부류
// ════════════════════════════════════════════════════════════════════════════

/** 손 목록 — **공용 계량기를 대신하지 않는다.** 둘을 «같이» 댄다(㉲). */
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

describe("[중3 3차 물결] ㉦ 지면 냄새 · 조사 · KaTeX", () => {
  it("눈금 — 이 검사들이 «아니오» 를 낼 수 있다 (양성 6 · 음성 5)", () => {
    // 양성 — 걸려야 하는 것
    expect(BAD.some(([re]) => re.test("$2+-3$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("$\\dfrac{}{2}$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("다음 그림에서 넓이를"))).toBe(true);
    // 🔴 **공용 계량기의 눈금** — 손 목록이 못 보는 것을 이쪽이 본다는 증거.
    //    2차 물결의 중3 시험은 손 목록에 `+0` 이 없어 두 유형이 같이 샜다.
    expect(pageSmells("$-8+0=-8$이다.")).not.toEqual([]);
    expect(pageSmells("$y=1x+2$이다.")).not.toEqual([]);
    expect(josaMismatches("$15$과 $63$와")).not.toEqual([]);
    // 음성 — 멀쩡한 지면을 잡으면 «늘 우는 가드»가 된다(2026-08-20).
    expect(pageSmells("$-4x+34=14$에서 $-4x=-20$이므로")).toEqual([]);
    expect(pageSmells("$64x^{2}-256x+192=0$이다.")).toEqual([]);
    expect(pageSmells("$(x+a)(x-a)=x^{2}-a^{2}$")).toEqual([]);
    expect(josaMismatches("$12$는 $9$와 $6$은")).toEqual([]);
    expect(BAD.some(([re]) => re.test("$x=\\dfrac{11-9}{10}$이다."))).toBe(
      false,
    );
  });

  it("전 씨앗의 발문·정답·해설에 냄새·조사 어긋남이 없다", () => {
    const hits: string[] = [];
    for (const e of M3_TOP_3) {
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
            // 🔴 **공용 계량기를 «반드시» 같이 댄다** — 손 목록 하나만 두면 눈이 먼다.
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
    for (const e of M3_TOP_3) {
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

  it("KaTeX 로 실제 그려지고 붉은 글씨·중립 폴백이 없다", () => {
    for (const e of M3_TOP_3) {
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

  it("🔴 제품 전처리가 **가분수를 고쳐 쓰지 않는다** — 믿지 말고 재서 확인한다", () => {
    // 2차 물결의 `fracTex` 는 「지면 전처리가 대분수로 고쳐 쓴다」를 근거로 가분수면
    // 던졌다. 그 규칙은 **2026-08-24 에 제품에서 빠졌다**(원장님 확정). 전제가 뒤집혔는데
    // 가드만 남으면 멀쩡한 씨앗을 버린다 — 그래서 여기서 **제품을 실제로 돌려** 잰다.
    for (const [tex, frac] of [
      ["$\\dfrac{7}{2}$", "\\dfrac{7}{2}"],
      ["$x=\\dfrac{14}{5}$이다.", "\\dfrac{14}{5}"],
      ["$\\dfrac{8}{3}$", "\\dfrac{8}{3}"],
    ] as const) {
      const pre = preprocessMathText(tex);
      expect(pre, `전처리가 가분수를 고쳐 썼다: ${tex}`).toContain(frac);
      // 대분수가 생기면 `2\dfrac{4}{5}` 처럼 **분수 앞에 정수**가 붙는다.
      expect(pre, `대분수가 생겼다: ${tex}`).not.toMatch(/\d\s*\\d?frac/);
    }
    // 그리고 우리 `fracTex` 는 가분수를 **던지지 않고** 그대로 그린다.
    expect(fracTex(16, 6)).toBe("\\dfrac{8}{3}");
    expect(fracTex(20, 10)).toBe("2");
    expect(fracTex(2, 10)).toBe("\\dfrac{1}{5}");
    expect(() => fracTex(3, 0)).toThrow(/분모가 0/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉧ 계약
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] ㉧ 계약", () => {
  it("`facts.x` 가 답의 첫 수다 (이웃 모듈과 같은 계약)", () => {
    for (const e of M3_TOP_3) {
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
    for (const e of M3_TOP_3) {
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

  it("그림이 없다 — 이 넷은 그림 없이 완결된다", () => {
    for (const e of M3_TOP_3) {
      for (const seed of SEEDS) {
        expect(make(e.key, seed).figureSpec, e.key).toBeNull();
      }
    }
  });

  it("조용한 기본값을 안 낸다 — 못 만들면 **던진다**", () => {
    // rng 가 늘 같은 값을 내도 조용히 아무 문항이나 내면 안 된다.
    // (`pick` 은 목록이 비면 던지고, 굳힘 함수는 전제가 깨지면 그 자리에서 던진다.)
    expect(() => fracTex(1, 0)).toThrow(/분모가 0/);
    expect(intSqrt(-4)).toBeNull();
    expect(intSqrt(81)).toBe(9);
    expect(intSqrt(80)).toBeNull();
    expect(divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
    // 씨앗을 어떻게 주어도 넷 다 만들어진다 — 던지면 위 「넓게 훑어도」가 먼저 빨개진다.
    for (const r of [() => 0, () => 0.999999]) {
      expect(() => planQuadraticAlive(r)).not.toThrow();
      expect(() => planCancel(r)).not.toThrow();
      expect(() => planRationalRoots(r)).not.toThrow();
      expect(() => planRootSum(r)).not.toThrow();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 등록 뒤에 켜지는 검사 — 「`generateMiddleProblem` 과 글자까지 같은가」
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 3차 물결] `generate.ts` 등록", () => {
  it("등록되면 `generateMiddleProblem` 과 글자까지 같다 (등록 전이면 그 사실을 찍는다)", () => {
    const registered = new Set(registeredTypes().map((e) => e.key));
    const mine = M3_TOP_3.map((e) => e.key);
    const covered = mine.filter((k) => registered.has(k));

    if (covered.length === 0) {
      // 리드가 `...M3_TOP_3` 한 줄을 넣기 전 상태다. 조용히 통과시키면 「등록 뒤에도
      // 같은가」가 영영 안 재어지므로, **어느 쪽인지**를 여기서 못 박는다.
      expect(mine.some((k) => registered.has(k))).toBe(false);
      return;
    }
    // 반쪽 등록은 결함이다 — 넷 중 셋만 들어가면 나머지 하나는 아무도 안 부른다.
    expect(covered.sort()).toEqual([...mine].sort());

    for (const e of M3_TOP_3) {
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

  it("🔴 판정기 모집단에 3차 물결 넷이 들어 있다 — 등록 전에도 «아무도 안 쟀다»가 안 되게", () => {
    // `scripts/qa/probe-middle-top-m3.ts` 는 등록(`registeredTypes()`)에서 모집단을
    // 뽑는데, `...M3_TOP_3` 한 줄은 **리드의 몫**이라 저술 시점에는 아직 없다.
    // 등록만 보면 이 넷이 조용히 빠지고, 그때 판정기가 내는 「🔴 줄 없음」은
    // 「깨끗하다」가 아니라 **아무도 안 쟀다**는 뜻이 된다(2026-08-21).
    // 그래서 판정기가 소유 모듈을 합집합으로 얹는데, 그 합집합이 죽으면 여기서 빨개진다.
    const pop = new Set(topEntries().map((e) => e.key));
    for (const e of M3_TOP_3) {
      expect(pop.has(e.key), `${e.key} 가 판정기 모집단에 없다`).toBe(true);
    }
    // 모집단이 소단원까지 옳게 들고 있어야 ㉢(겹침)이 **형제를 제대로 고른다**.
    for (const e of M3_TOP_3) {
      expect(topEntries().find((t) => t.key === e.key)!.unitSection).toBe(
        e.unitSection,
      );
    }
  });

  it("등록 목록에 넣을 항목이 `TypeEntry` 모양을 갖췄다", () => {
    for (const e of M3_TOP_3 as TypeEntry[]) {
      expect(typeof e.handler).toBe("function");
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.rpmTitle.length).toBeGreaterThan(5);
    }
  });
});
