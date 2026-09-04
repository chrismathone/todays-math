/**
 * 중3 **확대 갈래 5차 물결 (갈래 b)** — `src/lib/middle/m3Top5b.ts` (D-116, `X` 접미사).
 *
 * ## 🔴 이 시험이 무엇을 지키려는가
 *
 * 앞 물결들이 실제로 낸 결함은 전부 **값은 맞고 KaTeX 도 초록**이라 어느 자도
 * 구조적으로 못 보던 부류였다. 그래서 여기서는 축을 이렇게 세운다.
 *
 * ```
 * ㉮ 해설 높이   제품 `estimateSolutionPx` 로 **660판 이상**을 재어 최대를 못 박는다
 * ㉯ 걸음        정수로 뛰는 자리마다 근거가 그 자리에 있는가
 * ㉰ 분수        지면의 모든 `dfrac{정수}{정수}` 가 기약이고 분모가 $1$ 이 아닌가
 *                — **찾은 자리 수도 같이 찍는다**($0$ 은 「깨끗」과 「못 셈」을 안 가른다)
 * ㉱ 선언 상한   공용 `declaredUpperBound` 가 `null` 인가 (그 함수가 «있다»도 낼 수
 *                있음을 양성으로 같이 보인다)
 * ㉳ 해설의 «말»  논리 낱말을 맞바꾸면 빨개지는가 (양성·음성 눈금)
 * ㉵ 미설명 수    해설에 나온 **모든 수**가 독립 재계산으로 설명되는가
 * ㉶ 손실 원장    모듈 주석의 D-20 수를 **다시 세어** 대조한다
 * ㉷ 주석의 단언  「죽는 자리」에 대한 단언을 시험이 실제로 문다
 * ```
 *
 * ## 🔴 검산이 어디서 오나 — 생성기 규칙을 한 줄도 옮겨 적지 않는다
 *
 *   · `144X` — 발문에서 $b$, $c$, $k$ 만 읽고 **$x$ 를 $1$부터 $bc$ 까지 전부 훑어**
 *              「$xy$ 가 정수이고 $x\le c$, $y\le b$」인 $x$ 를 모은다. 약수라는
 *              생성기의 길을 안 쓰므로 「모두」라는 주장이 **훑은 범위 전체**에서
 *              반증된다.
 *   · `145X` — 발문에서 $p$, $q$ 만 읽고 **$r$ 를 $1$부터 넉넉히 훑어** 세 변이
 *              피타고라스를 만족시키는 $r$ 를 찾는다. 이차방정식·인수분해라는
 *              생성기의 길을 안 쓴다.
 *   · `146X` — 발문에서 $m$ 만 읽고 **네 내각 $(a,b)$ 를 $1$부터 $179$ 까지 전부
 *              훑어** 「$\angle P\times\angle Q=m$」인 사각형을 직접 만든다.
 *              약수쌍도, $x+y$ 로 접는 것도 쓰지 않는다.
 *
 * ## ⚠️ 왜 `generateMiddleProblem` 을 (아직) 안 부르나
 *
 * `generate.ts` 에 `...M3_TOP_5B` 를 넣는 것은 **리드가 한다**(이 세션은 공유 파일을
 * 안 건드린다). 그래서 이 시험은 그 함수가 하는 일을 **그 함수가 부르는 바로 그
 * 함수들**(`wrapDanClause`·`tidySolution`·`resolveMiddleTier`)로 다시 밟는다.
 * 등록된 뒤에는 「`generateMiddleProblem` 과 글자까지 같은가」가 켜지고, 등록 전에는
 * 그 사실을 **찍는다** — 조용히 통과시키면 「등록 뒤에도 같은가」가 영영 안 재어진다.
 *
 * ## ⚠️ 지면 수식 파서를 왜 또 적나
 *
 * 아래 `checkEquations` 는 앞 물결 시험의 것과 무늬가 같다. 그것은 **제품 규칙이
 * 아니라 시험의 연장**이라 두 벌이어도 «규칙이 갈라지는» 부류가 아니고(제품은 이
 * 파서를 한 번도 안 부른다), 물결마다 다루는 기호가 다르다 — 여기서는 `\angle`·
 * `\overline`·`\triangle`·`\sin` 을 **«값을 모르는 것»으로 지우는** 처리와 `\div`
 * 가 더 필요하다. 대신 **눈금**을 이 파일에서 다시 세워, 이 파서가 «아니오»를 낼 수
 * 있음을 회차마다 증명한다.
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
} from "../../../scripts/qa/probe-middle-top-m3";
import { createRng } from "../../lib/elementary/rng";
import { bareNumbers } from "../../lib/elementary/rules";
import { declaredUpperBound } from "../../lib/engine/deriveFormats";
import { expandFamily } from "../../lib/engine/expandEngine";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import { pointsAtFigure } from "../../lib/middle/figureReference";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import {
  BRIEF_SECTION_NAMES,
  M3_TOP_5B,
  VARIANT_FLOORS,
  angleAnswers,
  anglePool,
  angleValuesOf,
  divisorPairsOf,
  divisorsOf,
  incircleAnswers,
  incirclePool,
  intSqrt,
  oneStepReach,
  planCyclicAngle,
  planIncircle,
  planSegmentRatio,
  segmentAnswers,
  segmentRatioPool,
  solveAnglePairs,
  solveIncircleRadius,
  solveSegmentDivisors,
} from "../../lib/middle/m3Top5b";
import { tidySolution } from "../../lib/middle/solutionText";
import { resolveMiddleTier } from "../../lib/middle/tier";
import type { MidProblem } from "../../lib/middle/types";
import { JASEUP_MEASURED_PX } from "../../lib/printGeometry";
import { estimateSolutionPx } from "../../lib/printOverflow";
import { wrapDanClause } from "../../lib/problemText";
import { josaMismatches, pageSmells } from "../helpers/midPage";
import { catalogMaxNumber, extensionNumberReason } from "../helpers/rpmCatalog";

const KEY_SEG = "3-2|삼각비의 활용|144X";
const KEY_INC = "3-2|원과 직선|145X";
const KEY_ANG = "3-2|원주각의 활용|146X";
const KEYS = [KEY_SEG, KEY_INC, KEY_ANG] as const;

/** 씨앗 몇 개 × 변형 셋 — 지면 글자를 눈으로 견주는 검사에 쓴다. */
const SEEDS = [20260904, 7, 4242, 31337, 5150131, 777003, 424242, 99, 13579];
/** 값 검산·설계 검사에 쓰는 넓은 씨앗. */
const WIDE = Array.from({ length: 240 }, (_, i) => 20260904 + i * 7919);
/** 해설 등식 검산은 파싱이 많아 조금 좁게 — 그래도 씨앗 공간을 다 덮는다. */
const EQ_SEEDS = WIDE.slice(0, 90);

const BY_KEY = new Map(M3_TOP_5B.map((e) => [e.key, e]));

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
 * (보기·「모두 고르시오」 가드는 이 셋에 보기가 없어 아무것도 안 한다.)
 */
function make(key: string, seed: number, variant = 0): MidProblem {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`m3Top5b 에 없는 키: ${key}`);
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

/** 글 안의 수를 **절댓값**으로 모은다 — 부호는 「미설명 수」 판정의 축이 아니다. */
function numbersIn(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map(Number);
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

type Tok =
  | { t: "num"; v: number }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" | "=" }
  | { t: "open"; v: "(" | "{" }
  | { t: "close"; v: ")" | "}" }
  | { t: "frac" };

/** 이 파서가 못 다루는 것 — 등호가 아니거나(부등호), 값이 하나로 안 정해지는 것. */
const UNSUPPORTED = [
  "\\ne",
  "\\ge",
  "\\le",
  "\\pm",
  "\\ldots",
  "\\cdots",
  ">",
  "<",
  ":",
  ",",
];

/**
 * 🔴 **값을 모르는 덩어리는 «Ω» 한 글자로 지운다.**
 *
 * `\overline{AB}`·`\angle PBC`·`\triangle ADE`·`\sin 60^{\circ}` 는 이 파서가 값을
 * 낼 수 없다. 그렇다고 그 span 을 통째로 버리면
 * `$\overline{AB}+\overline{BC}+\overline{CA}=65+52+39=156$` 같은 줄에서 **숫자 쪽
 * 주장까지 같이 사라진다** — 그러면 「$65+52+39$ 이 정말 $156$ 인가」를 아무도 안 센다.
 * Ω 로 바꾸면 그 조각만 «판정 불가»가 되고 나머지 조각은 그대로 판정된다.
 */
function normalizeMath(body: string): string {
  return body
    .replace(/\\left|\\right/g, "")
    .replace(/\^\{\\circ\}/g, "")
    .replace(/\^\\circ/g, "")
    .replace(/\\overline\{[A-Za-z]+\}/g, "Ω")
    .replace(/\\triangle\s*[A-Za-z]+/g, "Ω")
    .replace(/\\angle\s*[A-Za-z]+/g, "Ω")
    .replace(/\\sin/g, "Ω")
    .replace(/\\,|\\;/g, " ")
    .replace(/\\ /g, " ");
}

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
      else if (name === "times" || name === "cdot")
        out.push({ t: "op", v: "*" });
      else if (name === "div") out.push({ t: "op", v: "/" });
      else throw new Error(`못 다루는 명령: ${name}`);
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+/.exec(body.slice(i))!;
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-ZΩ]/.test(c)) {
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

type Env = Record<string, number>;

function evalToks(toks: Tok[], env: Env): Frac {
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];

  function startsPrimary(tk: Tok | undefined): boolean {
    if (!tk) return false;
    return (
      tk.t === "num" ||
      tk.t === "var" ||
      tk.t === "frac" ||
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
      return F(env[tk.v]!);
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
      // 이어 붙여 쓴 곱 — `65r` · `xy` · `(r-13)(r+78)`
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

type EqReport = {
  /** 실제로 «양쪽 이상»을 견준 등식 수 — $0$ 이면 판정을 **거부**해야 한다 */
  checked: number;
  /** 「$x=1$」처럼 값을 **정해 주는** 자리 (판정이 아니라 대입이다) */
  assigned: number;
  skipped: number;
  bad: string[];
};

/**
 * 🔴 **해설이 적은 등식을 줄 단위로 다시 계산한다.**
 *
 * 한 줄 안에서 앞의 `$x=1$` 이 뒤의 `$x+y=17$` 을 판정 가능하게 만들므로 환경은
 * **줄마다 새로** 만든다(다음 줄의 $x$ 는 다른 값이다). 값이 안 정해지는 조각은
 * 버리고, **판정 가능한 조각이 둘 이상일 때만** 견준다.
 */
function checkEquations(solution: string, baseEnv: Env): EqReport {
  const rep: EqReport = { checked: 0, assigned: 0, skipped: 0, bad: [] };
  for (const line of solution.split("\n")) {
    const env: Env = { ...baseEnv };
    for (const m of line.matchAll(/\$([^$]*)\$/g)) {
      const raw = m[1]!;
      if (!raw.includes("=")) continue;
      if (UNSUPPORTED.some((u) => raw.includes(u))) {
        rep.skipped += 1;
        continue;
      }
      let parts: Tok[][];
      try {
        parts = splitEquals(tokenize(normalizeMath(raw)));
      } catch {
        rep.skipped += 1;
        continue;
      }
      if (parts.length < 2) {
        rep.skipped += 1;
        continue;
      }
      const values: (Frac | null)[] = parts.map((p) => {
        try {
          return evalToks(p, env);
        } catch {
          return null;
        }
      });
      const known = values.filter((v): v is Frac => v !== null);
      if (known.length >= 2) {
        const first = known[0]!;
        if (known.every((v) => fEq(v, first))) rep.checked += 1;
        else rep.bad.push(raw);
        continue;
      }
      if (known.length === 1) {
        // 「$x=1$」 꼴 — 홑 문자 하나가 남았으면 그 값을 **정해 준다**.
        const blanks = parts.filter((_, i) => values[i] === null);
        const only = blanks.length === 1 ? blanks[0]! : null;
        const head = only && only.length === 1 ? only[0]! : null;
        if (head && head.t === "var" && head.v !== "Ω") {
          const v = known[0]!;
          if (v.d === 1) {
            env[head.v] = v.n;
            rep.assigned += 1;
            continue;
          }
        }
      }
      rep.skipped += 1;
    }
  }
  return rep;
}

// ════════════════════════════════════════════════════════════════════════════
// 눈금 — 이 시험의 연장들이 «아니오» 를 낼 수 있는가
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] 눈금 — 해설 검산기가 «아니오»를 낼 수 있다", () => {
  const run = (s: string, env: Env = {}): EqReport => checkEquations(s, env);

  it("수치 등식이 틀리면 잡는다 (양성)", () => {
    const r = run("$2+4+8=15$이다.");
    expect(r.bad).toHaveLength(1);
    expect(r.checked).toBe(0);
  });

  it("맞는 수치 등식은 안 잡는다 (음성)", () => {
    const r = run("$2+4+8=14$이다.");
    expect(r.bad).toEqual([]);
    expect(r.checked).toBe(1);
  });

  it("대입한 값으로 판정한다 — 앞의 정의가 뒤의 등식을 판정 가능하게 한다", () => {
    const ok = run("$x=17$, $y=57$이면 $x+y=74$이다.");
    expect(ok.assigned).toBe(2);
    expect(ok.checked).toBe(1);
    expect(ok.bad).toEqual([]);
    const bad = run("$x=17$, $y=57$이면 $x+y=75$이다.");
    expect(bad.bad).toEqual(["x+y=75"]);
  });

  it("환경으로 준 값이 틀리면 잡는다 (양성)", () => {
    const r = run("$r^{2}+65r-1014=0$이다.", { r: 12 });
    expect(r.bad).toHaveLength(1);
  });

  it("🔴 `\\div` 를 읽는다 — 못 읽으면 세 유형의 나눗셈 줄이 통째로 «건너뜀»이다", () => {
    const r = run("$xy=80\\div 5=16$이다.");
    expect(r.checked).toBe(1);
    expect(run("$xy=80\\div 5=17$이다.").bad).toHaveLength(1);
  });

  it("🔴 값을 모르는 덩어리는 지우되 **숫자 쪽 주장은 남긴다**", () => {
    const good = run(
      "$\\overline{AB}+\\overline{BC}+\\overline{CA}=65+52+39=156$이다.",
    );
    expect(good.checked).toBe(1);
    const bad = run(
      "$\\overline{AB}+\\overline{BC}+\\overline{CA}=65+52+39=157$이다.",
    );
    expect(bad.bad).toHaveLength(1);
  });

  it("분수·거듭제곱·이어 붙인 곱을 읽는다", () => {
    expect(run("$\\dfrac{180-74}{2}=53$이다.").checked).toBe(1);
    expect(run("$(26+13)^{2}+(39+13)^{2}=65^{2}$이다.").checked).toBe(1);
    expect(run("$(r-13)(r+78)=0$이다.", { r: 13 }).checked).toBe(1);
  });

  it("못 재는 것은 «건너뜀»으로 세고 판정하지 않는다", () => {
    // 부등호가 든 등식과, 값을 모르는 것끼리의 등식 — 둘 다 «건너뜀»이다.
    const r = run("$x=3\\le 5$이고 $\\angle PBC=\\angle ADC$이다.");
    expect(r.bad).toEqual([]);
    expect(r.skipped).toBe(2);
    // 등호가 아예 없는 조각은 등식이 아니므로 세지도 않는다.
    expect(run("$x\\le 8$이다.").skipped).toBe(0);
  });

  it("$0$ 은 「깨끗」이 아니라 「못 셈」이다 — 등식이 없으면 `checked` 가 $0$ 이다", () => {
    expect(run("수식이 하나도 없는 줄이다.").checked).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 해설의 «말» — 논리 낱말이 독립 재계산과 어긋나지 않는가 (㉳)
// ════════════════════════════════════════════════════════════════════════════

/** `㉠ …` 로 시작하는 후보 줄만. */
function markLines(solution: string): string[] {
  return solution.split("\n").filter((l) => /^[㉠㉡㉢㉣㉤㉥㉦㉧]/.test(l));
}

/**
 * 🔴 **144X 의 «말»** — 후보마다 «왜 살고 죽는지»가 독립 재계산과 맞나.
 *
 * 판정의 참은 발문에서 읽은 $b$, $c$, $n$ 뿐이고 생성기의 `kept` 를 안 본다.
 */
function segWordProblems(
  solution: string,
  n: number,
  b: number,
  c: number,
): string[] {
  const out: string[] = [];
  if (!/\$x\$는 \$\d+\$의 약수/.test(solution))
    out.push("「약수」라고 안 했다");
  if (/배수/.test(solution)) out.push("「배수」라고 했다");
  if (!/자연수/.test(solution)) out.push("「자연수」라고 안 했다");
  if (!/\$\\angle A\$가 공통이므로/.test(solution))
    out.push("「$\\angle A$가 공통」이라고 안 했다");
  const lines = markLines(solution);
  if (lines.length === 0) out.push("후보 줄이 없다");
  for (const line of lines) {
    const mx = /\$x=(\d+)\$/.exec(line);
    if (!mx) {
      out.push(`후보 줄에 $x$ 값이 없다: ${line}`);
      continue;
    }
    const x = Number(mx[1]);
    const y = n / x;
    const alive = x <= c && y <= b;
    const saysAlive = /조건에 맞는다/.test(line);
    const saysDeadD = /점 \$D\$가 변 \$AB\$ 위에 있을 수 없다/.test(line);
    const saysDeadE = /점 \$E\$가 변 \$AC\$ 위에 있을 수 없다/.test(line);
    if (alive && !(saysAlive && !saysDeadD && !saysDeadE))
      out.push(`살아야 하는데 말이 다르다: ${line}`);
    if (!alive && saysAlive) out.push(`죽어야 하는데 «맞는다»고 했다: ${line}`);
    if (!alive && x > c && !saysDeadD)
      out.push(`$D$ 때문에 죽는데 그렇게 안 적었다: ${line}`);
    if (!alive && y > b && !saysDeadE)
      out.push(`$E$ 때문에 죽는데 그렇게 안 적었다: ${line}`);
  }
  return out;
}

/** 🔴 **145X 의 «말»** — 개념 낱말과 «양수 근을 골랐다»가 맞나. */
function incWordProblems(solution: string, r: number): string[] {
  const out: string[] = [];
  if (!/두 접선의 길이는 서로 같으므로/.test(solution))
    out.push("접선의 길이가 «같다»고 안 했다");
  if (/두 접선의 길이는 서로 다르므로/.test(solution))
    out.push("접선의 길이가 «다르다»고 했다");
  if (!/접선과 수직이므로/.test(solution)) out.push("«수직»이라고 안 했다");
  if (/접선과 평행이므로/.test(solution)) out.push("«평행»이라고 했다");
  if (!/사각형 \$OECF\$는 정사각형이다/.test(solution))
    out.push("«정사각형»이라고 안 했다");
  if (!/반지름의 길이이므로\s*\$r>0\$이어야 한다/.test(solution))
    out.push("«반지름이므로 $r>0$»이라고 안 했다");
  if (/\$r<0\$이어야 한다/.test(solution)) out.push("«$r<0$»이라고 했다");
  const m = /따라서 \$r=(-?\d+)\$이다/.exec(solution);
  if (!m) out.push("고른 $r$ 를 안 적었다");
  else if (Number(m[1]) !== r) out.push(`고른 $r$ 가 ${m[1]} 이다`);
  const two = /두 값 \$(-?\d+)\$[와과] \$(-?\d+)\$/.exec(solution);
  if (!two) out.push("두 값을 나란히 안 적었다");
  else {
    const vs = [Number(two[1]), Number(two[2])];
    if (vs.filter((v) => v > 0).length !== 1)
      out.push(`두 값의 부호가 하나씩이 아니다: ${vs.join(", ")}`);
  }
  return out;
}

/** 🔴 **146X 의 «말»** — 개념 낱말과 홀짝·범위 근거가 맞나. */
function angWordProblems(solution: string, m: number): string[] {
  const out: string[] = [];
  if (!/한 외각의 크기는 그 내대각의 크기와 같으므로/.test(solution))
    out.push("«한 외각 = 내대각»이라고 안 했다");
  if (/맞각/.test(solution)) out.push("«맞각»이라고 했다");
  if (!/\$a\$가 자연수이어야 하므로 \$x\+y\$는 짝수이고/.test(solution))
    out.push("«자연수 → 짝수» 근거가 없다");
  const lines = markLines(solution);
  if (lines.length === 0) out.push("후보 줄이 없다");
  for (const line of lines) {
    const mx = /\$x=(\d+)\$, \$y=(\d+)\$/.exec(line);
    if (!mx) {
      out.push(`후보 줄에 $x$, $y$ 가 없다: ${line}`);
      continue;
    }
    const x = Number(mx[1]);
    const y = Number(mx[2]);
    if (x * y !== m) out.push(`$xy$ 가 $${m}$ 이 아니다: ${line}`);
    const sum = x + y;
    const odd = sum % 2 !== 0;
    const big = sum > 178;
    if (odd && !/홀수이므로 \$a\$가 자연수가 아니다/.test(line))
      out.push(`홀수인데 그렇게 안 적었다: ${line}`);
    if (!odd && big && !/\$178\$보다 크므로/.test(line))
      out.push(`범위를 넘는데 그렇게 안 적었다: ${line}`);
    if (!odd && !big && !/짝수이고 \$178\$ 이하이므로/.test(line))
      out.push(`사는데 그렇게 안 적었다: ${line}`);
    if ((odd || big) && /\\angle BCD\$의 크기는/.test(line))
      out.push(`죽는 후보에 값을 적었다: ${line}`);
  }
  return out;
}

describe("[중3 5차 b] 눈금 — 「말 검사기」가 «아니오»를 낼 수 있다", () => {
  it("144X — 「약수↔배수」·「$D$↔$E$」·「맞는다↔없다」를 맞바꾸면 빨개진다", () => {
    const p = make(KEY_SEG, SEEDS[0]!);
    const plan = planSegmentRatio(
      createRng(SEEDS[0]! + keySalt(KEY_SEG) + 0 * 0x9e37),
    );
    expect(segWordProblems(p.solution, plan.n, plan.b, plan.c)).toEqual([]);
    for (const [from, to] of [
      ["의 약수", "의 배수"],
      [
        "점 $E$가 변 $AC$ 위에 있을 수 없다",
        "점 $D$가 변 $AB$ 위에 있을 수 없다",
      ],
      ["조건에 맞는다", "조건에 맞지 않는다"],
      ["$\\angle A$가 공통이므로", "$\\angle A$가 서로 다르므로"],
    ] as const) {
      const broken = p.solution.replace(from, to);
      expect(broken, `치환이 안 먹었다: ${from}`).not.toBe(p.solution);
      expect(
        segWordProblems(broken, plan.n, plan.b, plan.c).length,
        `«${from}» → «${to}» 가 안 걸렸다`,
      ).toBeGreaterThan(0);
    }
  });

  it("145X — 「같으므로↔다르므로」·「수직↔평행」·고른 근을 바꾸면 빨개진다", () => {
    const p = make(KEY_INC, SEEDS[0]!);
    const plan = planIncircle(
      createRng(SEEDS[0]! + keySalt(KEY_INC) + 0 * 0x9e37),
    );
    expect(incWordProblems(p.solution, plan.r)).toEqual([]);
    for (const [from, to] of [
      ["두 접선의 길이는 서로 같으므로", "두 접선의 길이는 서로 다르므로"],
      ["접선과 수직이므로", "접선과 평행이므로"],
      ["는 정사각형이다", "는 마름모이다"],
      [`따라서 $r=${plan.r}$이다`, `따라서 $r=${plan.negative}$이다`],
      [
        "반지름의 길이이므로 $r>0$이어야 한다",
        "반지름의 길이이므로 $r<0$이어야 한다",
      ],
    ] as const) {
      const broken = p.solution.replace(from, to);
      expect(broken, `치환이 안 먹었다: ${from}`).not.toBe(p.solution);
      expect(
        incWordProblems(broken, plan.r).length,
        `«${from}» → «${to}» 가 안 걸렸다`,
      ).toBeGreaterThan(0);
    }
  });

  it("146X — 「짝수↔홀수」·「내대각↔맞각」·「크므로↔작으므로」를 바꾸면 빨개진다", () => {
    const p = make(KEY_ANG, SEEDS[0]!);
    const plan = planCyclicAngle(
      createRng(SEEDS[0]! + keySalt(KEY_ANG) + 0 * 0x9e37),
    );
    expect(angWordProblems(p.solution, plan.m)).toEqual([]);
    for (const [from, to] of [
      [
        "한 외각의 크기는 그 내대각의 크기와 같으므로",
        "한 외각의 크기는 그 맞각의 크기와 같으므로",
      ],
      [
        "$a$가 자연수이어야 하므로 $x+y$는 짝수이고",
        "$a$가 자연수이어야 하므로 $x+y$는 홀수이고",
      ],
      ["짝수이고 $178$ 이하이므로", "홀수이고 $178$ 이하이므로"],
    ] as const) {
      const broken = p.solution.replace(from, to);
      expect(broken, `치환이 안 먹었다: ${from}`).not.toBe(p.solution);
      expect(
        angWordProblems(broken, plan.m).length,
        `«${from}» → «${to}» 가 안 걸렸다`,
      ).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉠ 등록 메타
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉠ 등록 메타", () => {
  it("유형은 정확히 셋이고 키가 그대로다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M3_TOP_5B).toHaveLength(3);
    expect(M3_TOP_5B.map((e) => e.key)).toEqual([...KEYS]);
    for (const e of M3_TOP_5B) {
      expect(e.grade).toBe("중3");
      expect(e.rpmBook).toBe("3-2");
      expect(e.rpmTitle.length).toBeGreaterThan(6);
    }
  });

  it("확장 번호는 «숫자+영문 대문자 한 글자» 라 RPM 색인과 영영 안 겹친다", () => {
    for (const e of M3_TOP_5B) {
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
      expect(e.rpmType).toMatch(/^\d+X$/);
      const maxNo = catalogMaxNumber(e.rpmBook, e.rpmMinor);
      expect(maxNo, `${e.key} 중단원이 색인에 없다`).not.toBeNull();
      // 글자를 떼도 색인 번호대를 **넘는다** — 두 겹으로 막는다.
      expect(Number(e.rpmType.slice(0, -1))).toBeGreaterThan(maxNo!);
    }
  });

  it("소단원 이름이 시드 정본과 **글자 그대로** 같다 (가는 공백 U+2009 포함)", () => {
    const mid3 = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    // 눈금 — 이 검사가 «아니오»를 낼 수 있나. 없는 이름은 반드시 걸려야 한다.
    expect(mid3.has("원의 접선")).toBe(true);
    expect(mid3.has("원의접선")).toBe(false);
    for (const e of M3_TOP_5B) {
      expect(mid3.has(e.unitSection), `${e.key} → ${e.unitSection}`).toBe(true);
      expect(
        [...e.unitSection].some((c) => c.charCodeAt(0) === 0x2009),
        `${e.key}: 가는 공백(U+2009)이 들어 있다`,
      ).toBe(false);
    }
  });

  it("🔴 리드가 준 소단원 이름 셋이 **정본에 그대로 있다** — 손으로 적으면 어긋난다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    for (const name of BRIEF_SECTION_NAMES) {
      expect(sections.has(name), `브리프 이름이 정본에 없다: ${name}`).toBe(
        true,
      );
    }
    expect([...BRIEF_SECTION_NAMES].sort()).toEqual(
      M3_TOP_5B.map((e) => e.unitSection).sort(),
    );
  });

  it("🔴 소단원 이름과 RPM 중단원 이름이 **다른 것이 하나**다 — 「원의 접선」↔「원과 직선」", () => {
    const diff = M3_TOP_5B.filter((e) => e.unitSection !== e.rpmMinor);
    expect(diff.map((e) => `${e.unitSection}↔${e.rpmMinor}`)).toEqual([
      "원의 접선↔원과 직선",
    ]);
  });

  it("갈래를 스스로 선언한다 — 밑단 규칙(`resolveMiddleTier`)이 안 내린다", () => {
    const want: Record<string, MidProblem["difficulty"]> = {
      [KEY_SEG]: "심화상",
      [KEY_INC]: "심화중",
      [KEY_ANG]: "심화상",
    };
    for (const key of KEYS) {
      for (const seed of SEEDS) {
        const p = make(key, seed);
        expect(p.difficulty, `${key} s${seed}`).toBe(want[key]);
      }
    }
  });

  it("확대 갈래가 **둘 다** 선다 — 하나만 세우고 «세웠다»고 하지 않는다", () => {
    const tiers = new Set(KEYS.map((k) => make(k, SEEDS[0]!).difficulty));
    expect(tiers.has("심화중")).toBe(true);
    expect(tiers.has("심화상")).toBe(true);
  });

  it("씨앗을 넓게 훑어도 던지지 않는다", () => {
    for (const key of KEYS) {
      for (const seed of WIDE) {
        for (const v of [0, 1, 2]) {
          expect(
            () => make(key, seed, v),
            `${key} s${seed} v${v}`,
          ).not.toThrow();
        }
      }
    }
  });

  it("같은 씨앗이면 같은 결과 — AI 가 아니다", () => {
    for (const key of KEYS) {
      for (const seed of SEEDS) {
        const a = make(key, seed);
        const b = make(key, seed);
        expect(a).toEqual(b);
      }
    }
  });

  it("🔴 변형 폭 — **적재기가 부르는 그 함수**(`expandFamily`)로 바닥을 채운다", () => {
    // 2026-08-29 「가드가 초록이면 모집단부터 의심하라 — 적재기가 부르는 그 함수여야
    // 한다」. `collectDistinctVariantsResult` 는 변형을 `n*30` 까지 시도하며 **다른
    // 것만** 모으므로, 「variant 0..n-1 이 전부 다르다」로 재면 제품이 안 쓰는 길을
    // 재게 된다. 그래서 제품 경로를 그대로 부르고 `shortBy` 가 $0$ 인지 본다.
    for (const e of M3_TOP_5B) {
      const floor = VARIANT_FLOORS[e.key]!;
      expect(floor, `${e.key} 바닥이 없다`).toBeGreaterThan(0);
      for (const seedBase of [20260904, 7, 4242, 31337]) {
        const got = expandFamily((v) => {
          const p = e.handler(
            createRng(seedBase + keySalt(e.key) + v * 0x9e37),
          );
          const content = wrapDanClause(p.content);
          return {
            content,
            answer: p.answer,
            solution: tidySolution(p.solution),
            familyKey: `mid:${e.key}`,
            problemType: "활용" as const,
            difficulty: resolveMiddleTier(p.difficulty, content, false),
            figureSpec: null,
            variant: v,
          };
        }, floor);
        expect(got.shortBy, `${e.key} s${seedBase} 변형 부족`).toBe(0);
        // ㉲ — 정답이 한 수라서 객관식이 **한 벌도** 안 빠지는 것을 같이 못 박는다.
        expect(got.skippedMcq, `${e.key} s${seedBase} 객관식 누락`).toBe(0);
        expect(got.items.length).toBe(floor * 2);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉡ 값 검산 — 생성기 길을 옮겨 적지 않는다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉡ 값 검산 — 생성기 길을 옮겨 적지 않는다", () => {
  it("144X — $x$ 를 $1$부터 $bc$ 까지 **전부** 훑어 「모두」를 반증한다", () => {
    let seen = 0;
    for (const seed of WIDE) {
      const p = make(KEY_SEG, seed);
      const b = Number(/\\overline\{AC\}=(\d+)/.exec(p.content)![1]);
      const c = Number(/\\overline\{AB\}=(\d+)/.exec(p.content)![1]);
      const k = Number(/\\dfrac\{1\}\{(\d+)\}/.exec(p.content)![1]);
      // 약수라는 생성기의 길을 **안 쓴다** — 나누어떨어지는지부터 직접 본다.
      const mine: number[] = [];
      for (let x = 1; x <= b * c; x += 1) {
        if ((b * c) % (k * x) !== 0) continue;
        const y = (b * c) / (k * x);
        if (x <= c && y <= b) mine.push(x);
      }
      expect(mine.length, `${seed}: 살아남는 후보가 없다`).toBeGreaterThan(1);
      const sum = mine.reduce((t, v) => t + v, 0);
      expect(firstNumber(p.answer), `s${seed}`).toBe(sum);
      expect(p.facts.x).toBe(sum);
      // 지면이 적은 «모두»가 내 목록과 **글자까지** 같은가.
      const printed = /길이는 \$([\d$, ]+)\$이고/.exec(p.solution)![1]!;
      expect(printed.split("$, $").map(Number)).toEqual(mine);
      seen += 1;
    }
    expect(seen).toBe(WIDE.length);
  });

  it("145X — $r$ 를 훑어 **피타고라스로** 다시 찾는다 (유일해)", () => {
    for (const seed of WIDE) {
      const p = make(KEY_INC, seed);
      const q1 = Number(/\\overline\{AD\}=(\d+)/.exec(p.content)![1]);
      const q2 = Number(/\\overline\{BD\}=(\d+)/.exec(p.content)![1]);
      // 이차방정식·인수분해라는 생성기의 길을 **안 쓴다.**
      const hits: number[] = [];
      for (let r = 1; r <= 4 * (q1 + q2); r += 1) {
        if ((q1 + r) ** 2 + (q2 + r) ** 2 === (q1 + q2) ** 2) hits.push(r);
      }
      expect(hits, `s${seed}: 해가 하나가 아니다`).toHaveLength(1);
      const r = hits[0]!;
      expect(firstNumber(p.answer), `s${seed}`).toBe(2 * (q1 + q2 + r));
      expect(p.facts.x).toBe(2 * (q1 + q2 + r));
      expect(p.facts.r).toBe(r);
    }
  });

  it("146X — 네 내각 $(a,b)$ 를 전부 훑어 사각형을 **직접** 만든다", () => {
    for (const seed of WIDE) {
      const p = make(KEY_ANG, seed);
      const m = Number(/xy=(\d+)/.exec(p.content)![1]);
      // 약수쌍도, $x+y$ 로 접는 것도 **안 쓴다** — 각을 직접 훑는다.
      const values = new Set<number>();
      for (let a = 1; a <= 179; a += 1) {
        for (let b = a + 1; b <= 179; b += 1) {
          const x = b - a;
          const y = 180 - a - b;
          if (y <= 0) continue;
          if (x * y !== m) continue;
          values.add(180 - a);
        }
      }
      const mine = [...values].sort((u, v) => u - v);
      expect(mine.length, `s${seed}: 후보가 모자라다`).toBeGreaterThan(1);
      const sum = mine.reduce((t, v) => t + v, 0);
      expect(firstNumber(p.answer), `s${seed}`).toBe(sum);
      expect(p.facts.x).toBe(sum);
      const printed = /크기는 \$([\d^{}\\circ$, ]+)\$이고/.exec(
        p.solution,
      )![1]!;
      expect(
        printed.split("$, $").map((t) => Number(/\d+/.exec(t)![0])),
      ).toEqual(mine);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉢ 굳힘을 지우면 답이 달라진다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉢ 굳힘을 지우면 답이 달라진다", () => {
  it("144X — 굳힘이 **둘**이고, 켠 조합마다 답이 다르다", () => {
    let both = 0;
    let onlyD = 0;
    let onlyE = 0;
    for (const seed of WIDE) {
      const plan = planSegmentRatio(
        createRng(seed + keySalt(KEY_SEG) + 0 * 0x9e37),
      );
      const { n, b, c } = plan;
      const sum = (xs: number[]): number => xs.reduce((t, v) => t + v, 0);
      const on = sum(solveSegmentDivisors(n, b, c, true, true));
      const off = sum(solveSegmentDivisors(n, b, c, false, false));
      const noD = sum(solveSegmentDivisors(n, b, c, false, true));
      const noE = sum(solveSegmentDivisors(n, b, c, true, false));
      expect(on, `s${seed}: 굳힘을 다 끄면 답이 그대로다`).not.toBe(off);
      if (on !== noD && on !== noE) both += 1;
      if (on !== noD) onlyD += 1;
      if (on !== noE) onlyE += 1;
    }
    // 굳힘 **각각**이 혼자서도 일하는 씨앗이 있어야 한다 — 없으면 하나는 장식이다.
    expect(onlyD).toBeGreaterThan(0);
    expect(onlyE).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(0);
  });

  it("145X — 「반지름은 양수」를 끄면 값이 하나로 안 정해진다", () => {
    for (const seed of WIDE.slice(0, 60)) {
      const plan = planIncircle(
        createRng(seed + keySalt(KEY_INC) + 0 * 0x9e37),
      );
      const kept = solveIncircleRadius(plan.p, plan.q, true);
      const all = solveIncircleRadius(plan.p, plan.q, false);
      expect(kept).toEqual([plan.r]);
      expect(all).toHaveLength(2);
      expect(all).toContain(plan.r);
      // 굳힘이 실제로 하나를 지운다 — 그리고 지워지는 쪽은 **언제나 음수**다.
      expect(all.filter((v) => v > 0)).toEqual([plan.r]);
      expect(plan.negative).toBeLessThan(0);
      expect(plan.negative).toBe(-(plan.p * plan.q) / plan.r);
    }
  });

  it("146X — 홀짝·범위 굳힘이 **각각** 일하는 씨앗이 있다", () => {
    let parityOnly = 0;
    let rangeOnly = 0;
    for (const seed of WIDE) {
      const plan = planCyclicAngle(
        createRng(seed + keySalt(KEY_ANG) + 0 * 0x9e37),
      );
      const on = solveAnglePairs(plan.m, true, true);
      const noParity = solveAnglePairs(plan.m, false, true);
      const noRange = solveAnglePairs(plan.m, true, false);
      const off = solveAnglePairs(plan.m, false, false);
      expect(off.length, `s${seed}`).toBeGreaterThan(on.length);
      if (noParity.length > on.length) parityOnly += 1;
      if (noRange.length > on.length) rangeOnly += 1;
    }
    expect(parityOnly, "홀짝 굳힘이 한 번도 안 일했다").toBeGreaterThan(0);
    expect(rangeOnly, "범위 굳힘이 한 번도 안 일했다").toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉣ 굳힘을 **안 읽고** 찍으면 우연 수준을 못 넘는다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉣ 굳힘을 안 읽고 찍으면", () => {
  const segSifts = WIDE.map(
    (s) => planSegmentRatio(createRng(s + keySalt(KEY_SEG))).sift,
  );
  const angSifts = WIDE.map(
    (s) => planCyclicAngle(createRng(s + keySalt(KEY_ANG))).sift,
  );

  it("후보를 견주는 둘에서 `kept` 가 `candidates` 의 진부분집합이다", () => {
    for (const [label, sifts] of [
      ["144X", segSifts],
      ["146X", angSifts],
    ] as const) {
      const sc = siftScore(sifts);
      expect(sc.broken, `${label}: 후보 밖의 것이 살아남았다`).toBe(0);
      expect(sc.identity, `${label}: 굳힘이 아무도 안 걸렀다`).toBe(0);
      expect(sc.keptAvg).toBeGreaterThan(1);
    }
  });

  it("극단만 집으면 «우연 수준 + 10%p» 를 못 넘는다", () => {
    for (const [label, sifts] of [
      ["144X", segSifts],
      ["146X", angSifts],
    ] as const) {
      const sc = edgeScore(sifts);
      expect(sc.n).toBe(WIDE.length);
      expect(sc.maxHit, `${label} 최댓값 집기 ${sc.maxHit}`).toBeLessThan(
        sc.chance + 0.1,
      );
      expect(sc.minHit, `${label} 최솟값 집기 ${sc.minHit}`).toBeLessThan(
        sc.chance + 0.1,
      );
    }
  });

  it("🔴 145X 는 ㉠ 을 **«잴 축 없음»으로 찍는다** — 후보 목록이 아예 없다", () => {
    // 4차 `56W` 와 같은 처방이다. 이차방정식의 두 근을 후보로 내보이면 **양수 근이
    // 언제나 큰 쪽**이라 `edgeScore.maxHit` 가 $1$ 이 되고, 그것은 이 설계의 사실이지
    // 결함이 아니다. 「축이 없다」와 「축이 초록이다」는 다른 말이므로 따로 적는다.
    const plan = planIncircle(createRng(SEEDS[0]! + keySalt(KEY_INC)));
    expect(Object.keys(plan)).not.toContain("sift");
    const roots = solveIncircleRadius(plan.p, plan.q, false);
    expect(Math.max(...roots)).toBe(plan.r);
  });

  it("🔴 144X — 죽는 자리는 목록의 **양 끝**이다 (주석의 단언을 문다)", () => {
    // 모듈 머리말 ⑷㉠ 이 「구간 굳힘이라 죽는 것은 양 끝에 몰린다」고 적어 두었다.
    // 단언을 적었으면 시험이 물어야 한다(4차 ㉷).
    let sawHead = 0;
    let sawTail = 0;
    for (const seed of WIDE) {
      const plan = planSegmentRatio(createRng(seed + keySalt(KEY_SEG)));
      const idx = plan.candidates
        .map((x, i) => (plan.kept.includes(x) ? i : -1))
        .filter((i) => i >= 0);
      // 살아남는 색인이 **이어져** 있어야 «구간»이다.
      expect(idx[idx.length - 1]! - idx[0]!, `s${seed}`).toBe(idx.length - 1);
      if (idx[0]! > 0) sawHead += 1;
      if (idx[idx.length - 1]! < plan.candidates.length - 1) sawTail += 1;
    }
    expect(sawHead, "앞쪽이 한 번도 안 죽었다").toBeGreaterThan(0);
    expect(sawTail, "뒤쪽이 한 번도 안 죽었다").toBeGreaterThan(0);
  });

  it("🔴 146X — 죽는 자리가 목록의 **여기저기**다 (주석의 단언을 문다)", () => {
    // 모듈 머리말이 「홀짝 굳힘은 앞·중간·뒤에 흩어져 죽는다」고 적어 두었다.
    const deadIdx = new Set<number>();
    let notContiguous = 0;
    for (const seed of WIDE) {
      const plan = planCyclicAngle(createRng(seed + keySalt(KEY_ANG)));
      const keptSums = new Set(plan.kept.map(([x, y]) => x + y));
      const idx = plan.pairs
        .map(([x, y], i) => (keptSums.has(x + y) ? -1 : i))
        .filter((i) => i >= 0);
      for (const i of idx) deadIdx.add(i);
      const alive = plan.pairs
        .map(([x, y], i) => (keptSums.has(x + y) ? i : -1))
        .filter((i) => i >= 0);
      if (alive[alive.length - 1]! - alive[0]! !== alive.length - 1)
        notContiguous += 1;
    }
    expect(deadIdx.size, `죽은 색인 ${[...deadIdx].join(",")}`).toBeGreaterThan(
      2,
    );
    expect([...deadIdx].some((i) => i >= 2)).toBe(true);
    // 144X 와 달리 «구간»이 아닌 씨앗이 실제로 있다 — 그것이 두 유형을 가른다.
    expect(notContiguous, "살아남는 자리가 늘 이어져 있다").toBeGreaterThan(0);
  });

  it("🔴 답이 발문에서 **한 걸음**에 안 닿는다 + 우연 수준을 같이 잰다", () => {
    /**
     * 🔴 **«0» 만 적으면 절반이다.** 「자기 답이 한 걸음 안에 없다」는 그 자루가
     * 원래 헐렁하면 공짜로 얻어진다. 그래서 **같은 자루에 다른 판의 답**을 넣어
     * 우연 수준을 함께 재고, 그 값에 **아래위 창**을 건다 —
     *   · 위: 자루가 너무 넓으면 «0» 을 지키느라 풀이 기형이 된다
     *   · 아래: 우연 수준이 $0$ 이면 «self $=0$» 이 아무것도 안 뜻한다
     *
     * 실측(2026-09-04, 240씨앗 × 48 대조):
     *   `144X` 33.00% · `145X` 7.10% · `146X` 0.39%
     * `144X` 가 높은 것은 발문에 수가 넷($\angle A$·$b$·$c$·$k$)이라 자루가 넓기
     * 때문이고, 그래서 이 유형의 «self $=0$» 은 **가드가 실제로 일한 결과**다
     * (풀 원장에서도 ㉵ 혼자 $2{,}367\to710$ 을 남긴다).
     */
    const CHANCE: Record<string, [number, number]> = {
      [KEY_SEG]: [0.28, 0.38],
      [KEY_INC]: [0.04, 0.11],
      [KEY_ANG]: [0.001, 0.02],
    };
    for (const key of KEYS) {
      const rows = WIDE.map((seed) => {
        const p = make(key, seed);
        return { all: numbersIn(p.content), answer: firstNumber(p.answer) };
      });
      let self = 0;
      let cross = 0;
      let pairs = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const reach = oneStepAll(rows[i]!.all);
        if (reach.has(rows[i]!.answer)) self += 1;
        // 치환 대조 — **같은 자루에 다른 판의 답**을 넣어 우연 수준을 잰다.
        for (let j = 0; j < rows.length; j += 5) {
          if (i === j) continue;
          pairs += 1;
          if (reach.has(rows[j]!.answer)) cross += 1;
        }
      }
      expect(self, `${key}: 지름길이 열렸다`).toBe(0);
      const [lo, hi] = CHANCE[key]!;
      const rate = cross / pairs;
      const label = `${key} 우연 ${(rate * 100).toFixed(2)}%`;
      expect(rate, label).toBeGreaterThan(lo);
      expect(rate, label).toBeLessThan(hi);
    }
  });

  it("🔴 정답이 한 값에 안 쏠린다 — 최빈 비율과 겹칠 확률을 잠근다", () => {
    for (const key of KEYS) {
      const answers: number[] = [];
      for (const seed of WIDE) {
        for (const v of [0, 1, 2])
          answers.push(firstNumber(make(key, seed, v).answer));
      }
      const sc = spreadScore(answers);
      expect(sc.n).toBe(WIDE.length * 3);
      expect(sc.top, `${key} 최빈 ${(sc.top * 100).toFixed(2)}%`).toBeLessThan(
        0.12,
      );
      expect(sc.kinds, `${key} 답 종류 ${sc.kinds}`).toBeGreaterThanOrEqual(20);
    }
  });

  it("🔴 풀이 낼 수 있는 답을 **하나도 안 빠뜨린다** — 「고르게」의 반대편", () => {
    const seen: Record<string, Set<number>> = {
      [KEY_SEG]: new Set(),
      [KEY_INC]: new Set(),
      [KEY_ANG]: new Set(),
    };
    for (const key of KEYS) {
      for (const seed of WIDE) {
        for (const v of [0, 1, 2])
          seen[key]!.add(firstNumber(make(key, seed, v).answer));
      }
    }
    expect([...seen[KEY_SEG]!].sort((a, b) => a - b)).toEqual(segmentAnswers());
    expect([...seen[KEY_INC]!].sort((a, b) => a - b)).toEqual(
      incircleAnswers(),
    );
    expect([...seen[KEY_ANG]!].sort((a, b) => a - b)).toEqual(angleAnswers());
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤ 해설이 적은 등식을 전부 다시 계산한다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉤ 해설이 적은 등식을 전부 다시 계산한다", () => {
  it("144X — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let checked = 0;
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_SEG, seed);
      const rep = checkEquations(p.solution, {});
      expect(rep.bad, `s${seed}`).toEqual([]);
      expect(rep.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThan(3);
      checked += rep.checked;
    }
    expect(checked).toBeGreaterThan(EQ_SEEDS.length * 4);
  });

  it("145X — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let checked = 0;
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_INC, seed);
      const rep = checkEquations(p.solution, { r: p.facts.r! });
      expect(rep.bad, `s${seed}`).toEqual([]);
      expect(rep.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThan(4);
      checked += rep.checked;
    }
    expect(checked).toBeGreaterThan(EQ_SEEDS.length * 5);
  });

  it("146X — 등식마다 값을 견주고, 본 자리 수를 찍는다", () => {
    let checked = 0;
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_ANG, seed);
      const rep = checkEquations(p.solution, {});
      expect(rep.bad, `s${seed}`).toEqual([]);
      expect(rep.checked, `s${seed}: 판정한 등식이 없다`).toBeGreaterThan(4);
      checked += rep.checked;
    }
    expect(checked).toBeGreaterThan(EQ_SEEDS.length * 5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤-2 미설명 수가 없다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉤-2 미설명 수가 없다", () => {
  it("144X — 발문의 $b$·$c$·$k$ 만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_SEG, seed);
      const b = Number(/\\overline\{AC\}=(\d+)/.exec(p.content)![1]);
      const c = Number(/\\overline\{AB\}=(\d+)/.exec(p.content)![1]);
      const k = Number(/\\dfrac\{1\}\{(\d+)\}/.exec(p.content)![1]);
      const ang = Number(/\\angle A=(\d+)/.exec(p.content)![1]);
      const n = (b * c) / k;
      const ok = new Set<number>([1, 2, 180, ang, b, c, k, b * c, n]);
      for (const d of divisorsOf(n)) {
        ok.add(d);
        ok.add(n / d);
      }
      ok.add(
        divisorsOf(n)
          .filter((d) => d <= c && n / d <= b)
          .reduce((t, v) => t + v, 0),
      );
      for (const v of numbersIn(p.solution)) {
        expect(ok.has(v), `s${seed}: 설명 못 하는 수 ${v}`).toBe(true);
      }
    }
  });

  it("145X — 발문의 $p$·$q$ 만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_INC, seed);
      const u = Number(/\\overline\{AD\}=(\d+)/.exec(p.content)![1]);
      const w = Number(/\\overline\{BD\}=(\d+)/.exec(p.content)![1]);
      let r = 0;
      for (let t = 1; t <= 4 * (u + w); t += 1)
        if ((u + t) ** 2 + (w + t) ** 2 === (u + w) ** 2) r = t;
      const ok = new Set<number>([
        0,
        2,
        90,
        u,
        w,
        r,
        (u * w) / r,
        u + w,
        2 * (u + w),
        u * u + w * w,
        (u + w) ** 2,
        u * w,
        u + r,
        w + r,
        2 * (u + w + r),
      ]);
      for (const v of numbersIn(p.solution)) {
        expect(ok.has(v), `s${seed}: 설명 못 하는 수 ${v}`).toBe(true);
      }
    }
  });

  it("146X — 발문의 $m$ 만 읽고 설명 가능한 수를 다시 만든다", () => {
    for (const seed of EQ_SEEDS) {
      const p = make(KEY_ANG, seed);
      const m = Number(/xy=(\d+)/.exec(p.content)![1]);
      const ok = new Set<number>([1, 2, 178, 180, m]);
      let sum = 0;
      for (const [x, y] of divisorPairsOf(m)) {
        ok.add(x);
        ok.add(y);
        ok.add(x + y);
        if ((x + y) % 2 === 0 && x + y <= 178) {
          const a = (180 - (x + y)) / 2;
          ok.add(a);
          ok.add(180 - a);
          sum += 180 - a;
        }
      }
      ok.add(sum);
      for (const v of numbersIn(p.solution)) {
        expect(ok.has(v), `s${seed}: 설명 못 하는 수 ${v}`).toBe(true);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉥ 해설이 걸음을 건너뛰지 않는다 · 해설의 «말»
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉥ 해설이 걸음을 건너뛰지 않는다", () => {
  it("전 씨앗에서 «생략 표지 뒤에 중간 결과 없음»이 0건이다", () => {
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        expect(skipsWork(p.solution), `${key} s${seed}`).toBe(false);
        expect(isThin(p.content, p.solution), `${key} s${seed}`).toBe(false);
      }
    }
  });

  it("🔴 해설의 «말»이 독립 재계산과 어긋나지 않는다 (240씨앗)", () => {
    for (const seed of WIDE) {
      const s = make(KEY_SEG, seed);
      const sPlan = planSegmentRatio(createRng(seed + keySalt(KEY_SEG)));
      expect(segWordProblems(s.solution, sPlan.n, sPlan.b, sPlan.c)).toEqual(
        [],
      );

      const i = make(KEY_INC, seed);
      expect(incWordProblems(i.solution, i.facts.r!)).toEqual([]);

      const a = make(KEY_ANG, seed);
      expect(angWordProblems(a.solution, a.facts.m!)).toEqual([]);
    }
  });

  it("144X — 약수를 **하나씩 세우고** 각각 왜 살고 죽는지 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_SEG, seed);
      const plan = planSegmentRatio(createRng(seed + keySalt(KEY_SEG)));
      expect(markLines(p.solution)).toHaveLength(plan.candidates.length);
      expect(p.solution).toContain("가 공통이므로");
      expect(p.solution).toContain("약분되므로");
      expect(p.solution).toMatch(/점 \$D\$는 변 \$AB\$ 위의 점이므로/);
    }
  });

  it("145X — 접선·수직·정사각형·이차방정식·부호 다섯 걸음을 다 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_INC, seed);
      for (const piece of [
        "두 접선의 길이는 서로 같으므로",
        "접선과 수직이므로",
        "정사각형이다",
        "피타고라스 정리에 의하여",
        "인수분해하면",
        "$r>0$이어야 한다",
      ]) {
        expect(p.solution, `s${seed}: «${piece}» 가 없다`).toContain(piece);
      }
    }
  });

  it("146X — 두 삼각형·접기·홀짝·범위·후보 다섯 걸음을 다 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_ANG, seed);
      const plan = planCyclicAngle(createRng(seed + keySalt(KEY_ANG)));
      expect(markLines(p.solution)).toHaveLength(plan.pairs.length);
      for (const piece of [
        "삼각형 $PBC$",
        "삼각형 $QDC$",
        "두 식을 변끼리 더하면",
        "짝수이고",
        "$x+y\\le 178$",
      ]) {
        expect(p.solution, `s${seed}: «${piece}» 가 없다`).toContain(piece);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉦ 지면 냄새 · 조사 · KaTeX · 분수 · 해설 높이
// ════════════════════════════════════════════════════════════════════════════

/** 지면에 나온 `dfrac{정수}{정수}` 전부 — 기약이고 분모가 $1$ 이 아니어야 한다. */
function integerFractions(text: string): [number, number][] {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

describe("[중3 5차 b] ㉦ 지면 냄새 · 조사 · KaTeX · 분수", () => {
  it("눈금 — 이 검사들이 «아니오» 를 낼 수 있다 (양성 5 · 음성 4)", () => {
    expect(pageSmells("$1x+2$")).not.toEqual([]);
    expect(pageSmells("$3+-4$")).not.toEqual([]);
    expect(pageSmells("$x^{1}$")).not.toEqual([]);
    expect(josaMismatches("$15$과 $2$")).not.toEqual([]);
    expect(josaMismatches("$63$와")).not.toEqual([]);
    expect(pageSmells("$2x+3$")).toEqual([]);
    expect(pageSmells("$x^{2}+1$")).toEqual([]);
    expect(josaMismatches("$15$와 $2$와")).toEqual([]);
    expect(josaMismatches("$63$과")).toEqual([]);
    // 분수 자도 산다.
    expect(integerFractions("$\\dfrac{50}{4}$")).toEqual([[50, 4]]);
    expect(integerFractions("한글만 있는 줄")).toEqual([]);
  });

  it("전 씨앗의 발문·정답·해설에 냄새·조사 어긋남이 없다", () => {
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          expect(pageSmells(text), `${key} s${seed} ${field}`).toEqual([]);
          expect(josaMismatches(text), `${key} s${seed} ${field}`).toEqual([]);
        }
      }
    }
  });

  it("🔴 공용 조사 자가 **구조적으로 0 이 아니다** — 실제로 읽은 자리를 센다", () => {
    // 자가 한 자리도 안 읽는다면 「어긋남 0」은 「깨끗」이 아니라 「못 셈」이다.
    let sites = 0;
    for (const key of KEYS) {
      for (const seed of SEEDS) {
        const p = make(key, seed);
        for (const m of p.solution.matchAll(
          /\$([^$]*)\$(을|를|은|는|와|과|가)/g,
        )) {
          if (/(\d+)$/.test(m[1]!)) sites += 1;
        }
      }
    }
    expect(sites, "조사 자가 읽은 자리가 없다").toBeGreaterThan(
      SEEDS.length * 2,
    );
  });

  it("🔴 지면의 모든 정수 분수가 기약이고 분모가 $1$ 이 아니다 (본 자리 수도 찍는다)", () => {
    let seen = 0;
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          for (const [num, den] of integerFractions(text)) {
            seen += 1;
            expect(den, `${key} s${seed} ${field}: 분모 $1$`).toBeGreaterThan(
              1,
            );
            expect(
              fgcd(num, den),
              `${key} s${seed} ${field}: 기약이 아니다 ${num}/${den}`,
            ).toBe(1);
          }
        }
      }
    }
    expect(seen, "정수 분수를 한 자리도 못 봤다").toBeGreaterThan(WIDE.length);
  });

  it("KaTeX 로 실제 그려지고 붉은 글씨·중립 폴백이 없다", () => {
    for (const key of KEYS) {
      for (const seed of SEEDS) {
        const p = make(key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          const html = renderMathHtml(text);
          expect(html, `${key} s${seed} ${field}`).not.toContain("katex-error");
          expect(html, `${key} s${seed} ${field}`).not.toMatch(
            /color:\s*#cc0000/i,
          );
          expect(html, `${key} s${seed} ${field}`).not.toContain("math-raw");
        }
      }
    }
  });

  it("🔴 해설이 정답지 한 단을 안 넘는다 — 720판을 제품 자로 잰다", () => {
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
    for (const key of KEYS) {
      for (const seed of WIDE) {
        for (const v of [0, 1, 2]) {
          const px = estimateSolutionPx(make(key, seed, v).solution);
          measured += 1;
          if (px > (worst.get(key) ?? 0)) worst.set(key, px);
        }
      }
    }
    expect(measured).toBeGreaterThanOrEqual(660);
    for (const key of KEYS) {
      expect(
        worst.get(key)!,
        `${key}: 해설 최대 ${Math.round(worst.get(key)!)}px (한 단 ${COLUMN}px)`,
      ).toBeLessThan(700);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉧ 계약
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉧ 계약", () => {
  it("`facts.x` 가 답의 첫 수다 (이웃 모듈과 같은 계약)", () => {
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        expect(p.facts.x, `${key} s${seed}`).toBe(firstNumber(p.answer));
      }
    }
  });

  it("숫자는 전부 `$...$` 안에 있다", () => {
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        expect(bareNumbers(p.content), `${key} s${seed} 발문`).toEqual([]);
        expect(bareNumbers(p.answer), `${key} s${seed} 정답`).toEqual([]);
        expect(bareNumbers(p.solution), `${key} s${seed} 해설`).toEqual([]);
      }
    }
  });

  it("그림이 없고, 발문이 **지면을 가리키지도 않는다**", () => {
    // 눈금 — `pointsAtFigure` 가 «있다»도 낸다(0 이 「못 셈」이 아님을 보인다).
    expect(pointsAtFigure("다음 그림에서 $x$의 값을 구하시오.")).not.toBeNull();
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        expect(p.figureSpec, `${key} s${seed}`).toBeNull();
        expect(pointsAtFigure(p.content), `${key} s${seed}`).toBeNull();
      }
    }
  });

  it("🔴 ㉱ 발문이 상한을 **선언하지 않는다** (공용 자가 «있다»도 낼 수 있다)", () => {
    expect(
      declaredUpperBound("전체 일의 양을 $1$로 놓고 생각하시오."),
    ).not.toBeNull();
    let seen = 0;
    for (const key of KEYS) {
      for (const seed of WIDE) {
        const p = make(key, seed);
        expect(declaredUpperBound(p.content), `${key} s${seed}`).toBeNull();
        seen += 1;
      }
    }
    expect(seen).toBe(KEYS.length * WIDE.length);
  });

  it("조용한 기본값을 안 낸다 — 못 만들면 **던진다**", () => {
    // 두 굳힘이 함께 죽는 자리는 산술로 올 수 없다(모듈 주석의 단언).
    // 그 자리가 오면 렌더가 **던진다** — 단언을 적었으면 시험이 물게 한다(㉷).
    expect(() => solveIncircleRadius(3, 4, true)).toThrow();
    expect(() => solveIncircleRadius(1, 1, false)).toThrow();
    // 풀이 비면 계획이 던진다.
    expect(segmentRatioPool().length).toBeGreaterThan(50);
    expect(incirclePool().length).toBeGreaterThan(20);
    expect(anglePool().length).toBeGreaterThan(50);
  });

  it("🔴 `oneStepReach` 가 «아니오»를 낼 수 있다 (양성 3 · 음성 1)", () => {
    const r = oneStepReach([3, 4]);
    expect(r.has(7)).toBe(true);
    expect(r.has(12)).toBe(true);
    expect(r.has(-1)).toBe(true);
    expect(r.has(97)).toBe(false);
  });

  it("`intSqrt`·`divisorsOf`·`divisorPairsOf` 가 산다 (양성·음성)", () => {
    expect(intSqrt(169)).toBe(13);
    expect(intSqrt(170)).toBeNull();
    expect(divisorsOf(16)).toEqual([1, 2, 4, 8, 16]);
    expect(divisorPairsOf(16)).toEqual([
      [1, 16],
      [2, 8],
      [4, 4],
    ]);
    expect(angleValuesOf([[2, 12] as [number, number]])).toEqual([97]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉶ D-20 손실 원장 — 모듈 주석의 수를 **다시 센다**
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] ㉶ D-20 손실 원장을 다시 센다", () => {
  const SEG_ANGLES = [30, 45, 60, 120, 135, 150];

  it("144X — 분모 2,367 · 가드마다 하나씩", () => {
    let base = 0;
    let div = 0;
    let kept = 0;
    let dead = 0;
    let cut = 0;
    let all = 0;
    for (let b = 5; b <= 30; b += 1)
      for (let c = 5; c <= 30; c += 1)
        for (let k = 2; k <= 9; k += 1) {
          if ((b * c) % k !== 0) continue;
          base += 1;
          const n = (b * c) / k;
          const cand = divisorsOf(n);
          const live = solveSegmentDivisors(n, b, c, true, true);
          const ans = live.reduce((t, v) => t + v, 0);
          const a = cand.length >= 4 && cand.length <= 6;
          const bb = live.length >= 2 && live.length <= 4;
          const cc = cand.length - live.length >= 2;
          const dd = !oneStepReach([1, 2, 180, k, b, c, ...SEG_ANGLES]).has(
            ans,
          );
          if (a) div += 1;
          if (bb) kept += 1;
          if (cc) dead += 1;
          if (dd) cut += 1;
          if (a && bb && cc && dd) all += 1;
        }
    expect([base, div, kept, dead, cut, all]).toEqual([
      2367, 1048, 1535, 2161, 710, 160,
    ]);
    expect(segmentRatioPool()).toHaveLength(160);
    expect(segmentAnswers()).toHaveLength(27);
  });

  it("145X — 분모 63 · $r=2$ 를 넣으면 ㉵ 가 그 둘을 버린다", () => {
    const count = (lo: number): number[] => {
      let base = 0;
      let size = 0;
      let cut = 0;
      let all = 0;
      for (let r = lo; r <= 15; r += 1)
        for (const [u, v] of divisorPairsOf(2 * r * r)) {
          base += 1;
          const p = r + u;
          const q = r + v;
          const per = 2 * (p + q + r);
          const s = q <= 80 && per <= 300;
          const c = !oneStepReach([2, 90, p, q]).has(per);
          if (s) size += 1;
          if (c) cut += 1;
          if (s && c) all += 1;
        }
      return [base, size, cut, all];
    };
    expect(count(3)).toEqual([63, 41, 53, 31]);
    // 🔴 $r=2$ 를 넣으면 분모와 크기 창은 둘씩 늘고 ㉵ 는 그대로다 —
    //    곧 그 둘을 ㉵ 가 **전부** 버린다. 「0 을 버렸다」와 「가드가 죽었다」는 다르다.
    expect(count(2)).toEqual([65, 43, 53, 31]);
    expect(incirclePool()).toHaveLength(31);
    expect(incircleAnswers()).toHaveLength(24);
  });

  it("146X — 분모 1,180 · 가드마다 하나씩 (값 겹침은 이 범위에서 0 을 버린다)", () => {
    let pair = 0;
    let kept = 0;
    let dead = 0;
    let uniq = 0;
    let cut = 0;
    let all = 0;
    for (let m = 20; m <= 1199; m += 1) {
      const pairs = divisorPairsOf(m);
      const live = solveAnglePairs(m, true, true);
      const values = angleValuesOf(live);
      const ans = values.reduce((t, v) => t + v, 0);
      const a = pairs.length >= 3 && pairs.length <= 5;
      const b = live.length >= 2 && live.length <= 3;
      const c = pairs.length - live.length >= 1;
      const d = values.length === live.length;
      const e = !oneStepReach([2, 90, 180, m]).has(ans);
      if (a) pair += 1;
      if (b) kept += 1;
      if (c) dead += 1;
      if (d) uniq += 1;
      if (e) cut += 1;
      if (a && b && c && d && e) all += 1;
    }
    expect([1180, pair, kept, dead, uniq, cut, all]).toEqual([
      1180, 391, 250, 1101, 1180, 615, 123,
    ]);
    // 🔴 「값 겹침 가드가 0 을 버린다」가 «죽었다»는 뜻이 아님을 손으로 보인다 —
    //    합이 같은 두 쌍을 지어 주면 그 가드가 **실제로 아니오를 낸다.**
    expect(
      angleValuesOf([
        [2, 12],
        [4, 10],
      ]),
    ).toHaveLength(1);
    expect(anglePool()).toHaveLength(123);
    expect(angleAnswers()).toHaveLength(72);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// `generate.ts` 등록
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 5차 b] `generate.ts` 등록", () => {
  it("등록되면 `generateMiddleProblem` 과 글자까지 같다 (등록 전이면 그 사실을 찍는다)", () => {
    const registered = new Set(registeredTypes().map((e) => e.key));
    const missing = [...KEYS].filter((k) => !registered.has(k));
    if (missing.length > 0) {
      // 🔴 조용히 통과시키지 않는다 — 「등록 뒤에도 같은가」가 영영 안 재어진다.
      console.warn(
        `[m3Top5b] 아직 generate.ts 에 없다: ${missing.join(", ")}` +
          " — 리드가 ...M3_TOP_5B 한 줄을 넣어야 한다",
      );
      expect(missing.length).toBe(KEYS.length);
      return;
    }
    for (const key of KEYS) {
      for (const seed of SEEDS) {
        const mine = make(key, seed);
        const theirs = generateMiddleProblem(key, seed, 0);
        expect(theirs.content, `${key} s${seed}`).toBe(mine.content);
        expect(theirs.answer, `${key} s${seed}`).toBe(mine.answer);
        expect(theirs.solution, `${key} s${seed}`).toBe(mine.solution);
        expect(theirs.difficulty, `${key} s${seed}`).toBe(mine.difficulty);
      }
    }
  });

  it("등록 목록에 넣을 항목이 `TypeEntry` 모양을 갖췄다", () => {
    for (const e of M3_TOP_5B) {
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(typeof e.handler).toBe("function");
      const p = e.handler(createRng(1234));
      expect(p.grade).toBe(e.grade);
      expect(p.unitSection).toBe(e.unitSection);
      expect(p.rpmType).toBe(e.rpmType);
      expect(p.rpmTitle).toBe(e.rpmTitle);
    }
  });
});
