/**
 * 중1 **비교형** 객관식 둘 — 보기 다섯이 **식**이고, 값을 견주어 하나를 고른다 (2026-10-08 엔진 보강 2단계).
 *
 *   «다음 중 계산 결과가 나머지 넷과 다른 하나는?»     값의 묶음이 정확히 4+1
 *   «다음 중 계산 결과가 가장 큰(작은) 것은?»          다섯 값이 서로 다르다
 *
 * 관문은 등록부의 `assembleCompare` 다 — 지면의 식을 `expressionValue` 로 **다시 계산해** 묶음(4+1) · 동점을
 * 확인한다. 여기는 보기 다섯을 짓는 쪽이다.
 *
 * ## 4+1 — 목표값을 먼저 정하고 식 넷을 **역산**한다
 *
 * 공통 목표값 $v$ 를 뽑고, 값이 $v$ 가 되게 서로 다른 식 넷을 거꾸로 짓는다(둘째 수 · 나누어지는 수 · 상수항을
 * 역산). «다른 하나»는 값이 $v$ 가 아닌 식인데, 아무 값이나 쓰지 않는다 — 그 연산의 **실수로 계산하면 $v$ 가
 * 되는 식**(함정)을 가장 자주 쓴다. 실수하는 학생에게는 다섯이 다 같아 보이고, 바르게 계산해야 하나가 갈린다.
 *
 *   덧셈 · 뺄셈   빼는 수의 부호를 안 바꾸고 더하면 $v$ 가 되는 뺄셈
 *   나눗셈        나누는 수를 역수로 안 바꾸고 곱하면 $v$ 가 되는 나눗셈
 *   식의 값       괄호 없이 대입하거나 부호를 빼고 대입하면 $v$ 가 되는 식
 *   거듭제곱      $-a^{n}$ · $(-a)^{n}$ · $-(-a)^{n}$ … 절댓값은 같고 부호만 갈린다
 *
 * ## 극값 — 다섯 값이 서로 다르고, 부호만 보고는 못 고른다
 *
 * 값이 겹치면 다시 뽑는다(동점이면 등록부가 던진다). «가장 큰 것»이면 양수가 둘 이상, «가장 작은 것»이면
 * 음수가 둘 이상이 되게 한다 — 양수가 하나뿐이면 부호만 보고 답이 나온다. 다섯 값의 분모는 한 문항 안에서
 * 같은 수의 약수로 맞춘다(크기 비교가 통분 다섯 번이 되지 않게).
 *
 * ## 재시도 상한
 *
 * 목표값(또는 다섯 값)을 `MAX_ROUNDS` 번 다시 뽑아도 못 채우면 **사유를 달고 던진다** — 모자란 문항을 조용히
 * 내지 않는다.
 */
import { intBetween, pick } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { m1Rational, type M1Q as Q } from "../m1Calc";
import { eulReul } from "../m2Josa";

import { addSubMaterial } from "./addSub";
import { sameValue, type Material } from "./calcJudge";
import type {
  CompareAsk,
  CompareBody,
  CompareJudgeDefinition,
  CompareOption,
} from "./contract";
import { div2Material, mul2Material, MUL_DIV_SRC } from "./mulDiv";
import { expressionValue, readEnv } from "./texArith";
import {
  drawValueForm,
  MAX_PER_TEMPLATE,
  solveValueForm,
  type ValueForm,
} from "./valueForms";
import {
  drawSubstitution,
  substituteText,
  VALUE_SECTION,
  VALUE_SOURCES,
  whenText,
} from "./valueJudge";

const { q, addQ, subQ, mulQ, divQ, negQ, nice, texQ } = m1Rational;

/** 목표값(다섯 값)을 이만큼 다시 뽑아도 못 채우면 멈춘다. */
export const MAX_ROUNDS = 40;
/** 한 번 뽑은 목표값에서 식을 이만큼 지어 보고 안 차면 목표값을 다시 뽑는다. */
const TRIES_PER_ROUND = 80;

/** 비교형 보기 하나의 재료 — 식 · 값 · 계산 과정 · 겉모양. */
export type Piece = {
  /** 식의 글(`$` 없이) */
  tex: string;
  value: Q;
  /** 정답일 때 해설 둘째 줄에 서는 계산 과정(문장 끝 없이) */
  work: string;
  /** 겉모양 — 이것이 같은 식끼리만 한 문항에 선다(분수 항의 수 …) */
  look: string;
  /** 같은 계산인가 — 항의 차례만 바꾼 식을 «다른 식»으로 세지 않게 */
  key: string;
  /** 틀 이름(선택) — 한 문항에 같은 틀이 몰리지 않게 */
  template?: string;
};

function option(p: Piece): CompareOption {
  return {
    text: `$${p.tex}$`,
    claimed: { n: BigInt(p.value.n), d: BigInt(p.value.d) },
    brief: `$${texQ(p.value)}$`,
    work: p.work,
  };
}

/** 계산 판정의 재료를 비교형 재료로 — 식의 글 · 풀이를 한 벌만 둔다. 겉모양은 꼴에서 결과의 종류를 뗀 것. */
function fromMaterial(m: Material, key = m.left): Piece {
  return {
    tex: m.left,
    value: m.value,
    work: m.work(),
    look: m.shape.split("|")[0]!,
    key,
  };
}

function fromForm(f: ValueForm): Piece {
  return {
    tex: f.tex,
    value: f.value,
    work: `$${f.chain}$`,
    look: "식의 값",
    key: f.tex,
    template: f.template,
  };
}

/** 한 문항의 보기를 모으는 그릇 — 식 겹침 · 겉모양 · 틀 상한을 한 곳에서 본다. */
class Tray {
  readonly pieces: Piece[] = [];
  private readonly keys = new Set<string>();
  private readonly templates = new Map<string, number>();
  private look: string | null = null;

  constructor(private readonly maxPerTemplate?: number) {}

  /** 넣을 수 있으면 넣고 true. */
  add(p: Piece): boolean {
    if (this.keys.has(p.key)) return false;
    if (this.look !== null && p.look !== this.look) return false;
    const used = p.template ? (this.templates.get(p.template) ?? 0) : 0;
    if (this.maxPerTemplate !== undefined && used >= this.maxPerTemplate)
      return false;
    this.look ??= p.look;
    this.keys.add(p.key);
    if (p.template) this.templates.set(p.template, used + 1);
    this.pieces.push(p);
    return true;
  }
}

type Style = { lead: string; briefLead: string; maxPerTemplate?: number };

/** 목표값 한 번 — 값이 목표값인 식(역산)과 목표값이 아닌 식을 짓는 손잡이. */
export type OddRound = {
  target: Q;
  /** 값이 목표값인 식 하나 — 못 지으면 null */
  same: (rng: Rng) => Piece | null;
  /** 값이 목표값과 다른 식 하나 — 못 지으면 null(값이 목표값과 같게 나오면 짓는 쪽이 버린다) */
  other: (rng: Rng) => Piece | null;
};

/**
 * «나머지 넷과 다른 하나» — 첫째가 «다른 하나»다(차례는 등록부가 섞는다).
 * `begin` 을 밖에서 받는 까닭은 재시도 상한을 시험이 직접 재게 하려는 것이다.
 */
export function buildOddBody(
  rng: Rng,
  style: Style,
  begin: (rng: Rng) => OddRound,
): CompareBody {
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const r = begin(rng);
    const tray = new Tray(style.maxPerTemplate);
    for (let t = 0; t < TRIES_PER_ROUND && tray.pieces.length < 4; t += 1) {
      const p = r.same(rng);
      if (p === null) continue;
      // 역산이 틀리면 조용히 넘기지 않는다 — 넷이 같은 값이라는 것이 이 문형의 뼈대다.
      if (!sameValue(p.value, r.target))
        throw new Error(
          `역산한 식의 값(${texQ(p.value)})이 목표값(${texQ(r.target)})과 다르다 — ${p.tex}`,
        );
      tray.add(p);
    }
    if (tray.pieces.length < 4) continue;
    for (let t = 0; t < TRIES_PER_ROUND && tray.pieces.length < 5; t += 1) {
      const p = r.other(rng);
      if (p === null || sameValue(p.value, r.target)) continue;
      tray.add(p);
    }
    if (tray.pieces.length < 5) continue;
    const [a, b, c, d, odd] = tray.pieces as [
      Piece,
      Piece,
      Piece,
      Piece,
      Piece,
    ];
    return {
      lead: style.lead,
      briefLead: style.briefLead,
      options: [odd, a, b, c, d].map(option),
      facts: {
        tn: r.target.n,
        td: r.target.d,
        on: odd.value.n,
        od: odd.value.d,
        rounds: round,
      },
    };
  }
  throw new Error(
    `«나머지 넷과 다른 하나»를 못 채웠다 — 목표값 ${MAX_ROUNDS}번 다시 뽑기 초과`,
  );
}

/**
 * «가장 큰 것» · «가장 작은 것» — 다섯 값이 서로 다르고, 극값 쪽 부호의 값이 둘 이상이다.
 * `begin` 은 한 판의 뽑기 함수를 돌려준다(한 판 안에서 분모를 맞추려고).
 */
export function buildExtremeBody(
  rng: Rng,
  ask: CompareAsk,
  style: Style,
  begin: (rng: Rng) => (rng: Rng) => Piece | null,
): CompareBody {
  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const draw = begin(rng);
    const tray = new Tray(style.maxPerTemplate);
    for (let t = 0; t < TRIES_PER_ROUND && tray.pieces.length < 5; t += 1) {
      const p = draw(rng);
      if (p === null) continue;
      // 값이 겹치면 안 둔다 — 동점이면 «가장 큰 것»이 하나로 안 정해진다.
      if (tray.pieces.some((x) => sameValue(x.value, p.value))) continue;
      tray.add(p);
    }
    if (tray.pieces.length < 5) continue;
    // 양수(음수)가 하나뿐이면 부호만 보고 답이 나온다 — 크기를 견주게 둘 이상.
    const side = tray.pieces.filter((p) =>
      ask === "가장 큰 것" ? p.value.n > 0 : p.value.n < 0,
    ).length;
    if (side < 2) continue;
    return {
      lead: style.lead,
      briefLead: style.briefLead,
      options: tray.pieces.map(option),
      facts: { rounds: round },
    };
  }
  throw new Error(
    `«${ask}»의 보기 다섯을 못 채웠다 — ${MAX_ROUNDS}번 다시 뽑기 초과`,
  );
}

// ── 수 뽑기 — 원천 유형(m1Calc)과 같은 분모 · 같은 크기 ──────────────────────────

/** 원천 01 · 03 · 12 · 19 가 쓰는 분모. */
const DENS = [2, 3, 4, 5, 6, 8, 10, 12] as const;
/** 극값 문항의 «결과 분모» — 한 문항의 다섯 값이 이 수의 약수를 분모로 갖는다. */
const RESULT_DENS = [1, 2, 3, 4, 5, 6] as const;

function nonzero(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const v = intBetween(rng, lo, hi);
    if (v !== 0) return v;
  }
}
const randQ = (rng: Rng, dens: readonly number[], maxAbsN: number): Q =>
  q(nonzero(rng, -maxAbsN, maxAbsN), pick(rng, dens));
/** 반드시 «진짜 분수»(분모 ≥ 2). */
function randFrac(rng: Rng, dens: readonly number[], maxAbsN: number): Q {
  for (;;) {
    const v = randQ(rng, dens, maxAbsN);
    if (v.d !== 1) return v;
  }
}

// ── 덧셈 · 뺄셈 (원천 01 · 03 의 꼴 — 두 유리수, 분수가 적어도 하나) ────────────────

function addSubPiece(a: Q, op: "+" | "-", b: Q): Piece | null {
  if (a.n === 0 || b.n === 0) return null;
  if (a.d === 1 && b.d === 1) return null;
  const value = op === "+" ? addQ(a, b) : subQ(a, b);
  if (value.n === 0 || !nice(a) || !nice(b) || !nice(value)) return null;
  // 뺄셈을 덧셈으로 고친 두 수가 같으면 같은 계산이다 — 차례 · 부호 표기만 바꾼 식을 또 싣지 않는다.
  const added = [a, op === "+" ? b : negQ(b)].map(texQ).sort();
  return fromMaterial(
    addSubMaterial({
      terms: [
        { op: "+", v: a },
        { op, v: b },
      ],
      value,
    }),
    added.join(" & "),
  );
}

/** 값이 `v` 가 되게 둘째 수를 역산한 덧셈(뺄셈). 항의 분모는 `m` 의 약수다. */
function addSubFor(rng: Rng, m: number, v: Q): Piece | null {
  const a = q(intBetween(rng, -24, 24), m);
  const op = pick(rng, ["+", "-"] as const);
  return addSubPiece(a, op, op === "+" ? subQ(v, a) : subQ(a, v));
}

function addSubOddRound(rng: Rng): OddRound {
  const m = pick(rng, DENS);
  const v = q(nonzero(rng, -24, 24), m);
  return {
    target: v,
    same: (r) => addSubFor(r, m, v),
    other: (r) => {
      const roll = intBetween(r, 1, 10);
      if (roll <= 5) {
        // 함정 — 빼는 수의 부호를 안 바꾸고 더하면 $v$ 가 되는 뺄셈($a-b$ 인데 $a+b=v$).
        const a = q(intBetween(r, -24, 24), m);
        return addSubPiece(a, "-", subQ(v, a));
      }
      if (roll <= 8) return addSubFor(r, m, negQ(v));
      return addSubFor(r, m, addQ(v, q(pick(r, [1, -1] as const))));
    },
  };
}

// ── 곱셈 (원천 12 의 꼴 — 답을 먼저, 첫째 수는 분수) ──────────────────────────────

function mulFor(rng: Rng, p: Q): Piece | null {
  const a = randFrac(rng, DENS, 12);
  const b = divQ(p, a);
  if (!nice(a) || !nice(b, 60, 40) || !nice(p)) return null;
  return fromMaterial(mul2Material(a, b), [a, b].map(texQ).sort().join(" & "));
}

// ── 나눗셈 (원천 19 의 꼴 — 몫을 먼저, 나누는 수는 분수) ───────────────────────────

function divPiece(a: Q, b: Q): Piece | null {
  if (a.n === 0 || b.n === 0) return null;
  if (a.d === 1 && b.d === 1) return null;
  if (!nice(a, 200, 48) || !nice(b) || !nice(divQ(a, b))) return null;
  return fromMaterial(div2Material(a, b));
}

/** 몫이 `s` 가 되게 나누어지는 수를 역산한 나눗셈. */
function divFor(rng: Rng, s: Q): Piece | null {
  const b = randFrac(rng, DENS, 12);
  return divPiece(mulQ(s, b), b);
}

function divOddRound(rng: Rng): OddRound {
  // 몫이 $\pm1$ 이면 «같은 수로 나눈다»가 보인다 — 뺀다.
  let v = randQ(rng, DENS, 18);
  while (Math.abs(v.n) === v.d) v = randQ(rng, DENS, 18);
  return {
    target: v,
    same: (r) => divFor(r, v),
    other: (r) => {
      const roll = intBetween(r, 1, 10);
      if (roll <= 4) {
        // 함정 — 나누는 수를 역수로 안 바꾸고 곱하면 $v$ 가 되는 나눗셈($a\div b$ 인데 $a\times b=v$).
        const b = randFrac(r, DENS, 12);
        return divPiece(divQ(v, b), b);
      }
      if (roll <= 7) return divFor(r, negQ(v));
      // 몫의 역수 — 나누어지는 수와 나누는 수를 바꿔 계산한 값.
      return divFor(r, divQ(q(1), v));
    },
  };
}

// ── 거듭제곱의 부호 (원천 15 — $-a^{n}$ 과 $(-a)^{n}$) ──────────────────────────

/**
 * 밑 $a$(자연수) · 지수 $n$ 으로 절댓값이 $a^{n}$ 인 식 아홉 — 부호만 갈린다.
 * 앞의 넷은 거듭제곱 하나, 뒤의 다섯은 $a^{n-1}$ 에 $a$ 를 한 번 더 곱한 꼴이다.
 */
export function powSignPieces(a: number, n: number): Piece[] {
  const neg = `\\left(-${a}\\right)`;
  const wrap = (v: number) => (v < 0 ? `\\left(${v}\\right)` : `${v}`);
  const k = n - 1;
  const first = "거듭제곱을 먼저 계산하면";
  const piece = (tex: string, value: number, work: string): Piece => ({
    tex,
    value: q(value),
    work,
    look: "거듭제곱의 부호",
    key: tex,
  });
  const chain = (mid: string, value: number) => `${first} $${mid}=${value}$`;
  return [
    piece(
      `-${a}^{${n}}`,
      -(a ** n),
      `$${a}^{${n}}=${a ** n}$에 $-$를 붙이면 $${-(a ** n)}$`,
    ),
    piece(
      `${neg}^{${n}}`,
      (-a) ** n,
      `$-${a}$${eulReul(a)} $${n}$번 곱하면 $${(-a) ** n}$`,
    ),
    piece(
      `-${neg}^{${n}}`,
      -((-a) ** n),
      `$${neg}^{${n}}=${(-a) ** n}$의 부호를 바꾸면 $${-((-a) ** n)}$`,
    ),
    piece(
      `${a}^{${n}}`,
      a ** n,
      `$${a}$${eulReul(a)} $${n}$번 곱하면 $${a ** n}$`,
    ),
    piece(
      `-${a}^{${k}}\\times ${a}`,
      -(a ** n),
      chain(`-${a ** k}\\times ${a}`, -(a ** n)),
    ),
    piece(
      `${neg}^{${k}}\\times ${a}`,
      (-a) ** k * a,
      chain(`${wrap((-a) ** k)}\\times ${a}`, (-a) ** k * a),
    ),
    piece(
      `${neg}^{${k}}\\times${neg}`,
      (-a) ** n,
      chain(`${wrap((-a) ** k)}\\times${neg}`, (-a) ** n),
    ),
    piece(
      `-${a}^{${k}}\\times${neg}`,
      a ** n,
      chain(`-${a ** k}\\times${neg}`, a ** n),
    ),
    piece(
      `${a}^{${k}}\\times${neg}`,
      -(a ** n),
      chain(`${a ** k}\\times${neg}`, -(a ** n)),
    ),
  ];
}

/** 밑과 지수 — 세제곱은 밑 2~5, 네제곱은 밑 2 · 3(값이 125 를 안 넘게). */
const POW_BASES = [
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
  [2, 4],
  [3, 4],
] as const;

function powOddRound(rng: Rng): OddRound {
  const [a, n] = pick(rng, POW_BASES);
  const all = powSignPieces(a, n);
  const positive = intBetween(rng, 0, 1) === 0;
  const same = all.filter((p) => p.value.n > 0 === positive);
  const other = all.filter((p) => p.value.n > 0 !== positive);
  return {
    target: q(positive ? a ** n : -(a ** n)),
    same: (r) => pick(r, same),
    other: (r) => pick(r, other),
  };
}

// ── 등록 ───────────────────────────────────────────────────────────────────

const GRADE = "중1";
const SEC = {
  덧뺄: "유리수의 덧셈과 뺄셈",
  곱: "유리수의 곱셈",
  나눗: "유리수의 나눗셈",
} as const;
const ADD_SUB_SRC = [
  "1-1|정수와 유리수의 계산|01",
  "1-1|정수와 유리수의 계산|03",
] as const;

const ODD = ["나머지 넷과 다른 하나"] as const;
const EXTREME = ["가장 큰 것", "가장 작은 것"] as const;

const CALC: Record<CompareAsk, Style> = {
  "나머지 넷과 다른 하나": {
    lead: "다음 중 계산 결과가 나머지 넷과 다른 하나는?",
    briefLead: "계산하면",
  },
  "가장 큰 것": {
    lead: "다음 중 계산 결과가 가장 큰 것은?",
    briefLead: "계산하면",
  },
  "가장 작은 것": {
    lead: "다음 중 계산 결과가 가장 작은 것은?",
    briefLead: "계산하면",
  },
};

const VALUE_ASK: Record<CompareAsk, string> = {
  "나머지 넷과 다른 하나": "나머지 넷과 다른 하나는?",
  "가장 큰 것": "가장 큰 것은?",
  "가장 작은 것": "가장 작은 것은?",
};

/** 지면의 식을 다시 계산한다 — 대입값은 발문 줄에서 읽는다(없으면 문자 없는 식만 읽힌다). */
const readValue: CompareJudgeDefinition["readValue"] = (text, ctx) =>
  expressionValue(text, readEnv(ctx.lead));

export const COMPARE_JUDGES: readonly CompareJudgeDefinition[] = [
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.덧뺄,
    familyId: "odd-addsub2",
    title: "계산 결과가 나머지 넷과 다른 하나 — 두 유리수의 덧셈 · 뺄셈",
    asks: ODD,
    sources: ADD_SUB_SRC,
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 덧셈이나 뺄셈 하나를 계산하고, 다섯 값 가운데 혼자 다른 것을 찾는다. 계산은 원천 " +
      "01 · 03 과 같은 크기이고 값끼리는 같은가 다른가만 보면 되어 기본으로 정했다(원천의 칸을 옮긴 것이 아니다).",
    ruleVersion: 1,
    generate: (rng, ask) => buildOddBody(rng, CALC[ask], addSubOddRound),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.덧뺄,
    familyId: "max-addsub2",
    title: "계산 결과가 가장 큰 것 · 가장 작은 것 — 두 유리수의 덧셈 · 뺄셈",
    asks: EXTREME,
    sources: ADD_SUB_SRC,
    difficulty: "응용",
    difficultyBasis:
      "두 유리수의 덧셈 · 뺄셈 다섯 개를 계산한 뒤, 부호가 섞인 다섯 유리수의 크기를 다시 견주어야 한다. " +
      "계산 뒤에 비교 단계가 하나 더 있어 응용으로 정했다(원장님 확인 대상).",
    ruleVersion: 1,
    generate: (rng, ask) =>
      buildExtremeBody(rng, ask, CALC[ask], (r0) => {
        const m = pick(r0, DENS);
        return (r) => addSubFor(r, m, q(nonzero(r, -24, 24), m));
      }),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.곱,
    familyId: "odd-pow",
    title: "계산 결과가 나머지 넷과 다른 하나 — 거듭제곱의 부호",
    asks: ODD,
    sources: [MUL_DIV_SRC.거듭제곱],
    difficulty: "응용",
    difficultyBasis:
      "$-a^{n}$ · $(-a)^{n}$ · $-(-a)^{n}$ 과 거듭제곱에 수를 한 번 더 곱한 식에서, 밑이 어디까지인지와 " +
      "지수의 홀짝으로 부호를 가리는 판단을 다섯 번 해야 한다. 수는 작지만 거듭제곱의 부호 규칙 둘을 함께 써야 " +
      "갈려 응용으로 정했다(원천 15 의 칸을 옮긴 것이 아니다 — 원장님 확인 대상).",
    ruleVersion: 1,
    generate: (rng, ask) => buildOddBody(rng, CALC[ask], powOddRound),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.곱,
    familyId: "max-mul2",
    title: "계산 결과가 가장 큰 것 · 가장 작은 것 — 두 유리수의 곱셈",
    asks: EXTREME,
    sources: [MUL_DIV_SRC.곱셈],
    difficulty: "응용",
    difficultyBasis:
      "두 유리수의 곱셈 다섯 개를 계산한 뒤(부호를 정하고 절댓값을 곱한다), 부호가 섞인 다섯 유리수의 크기를 " +
      "다시 견주어야 한다. 계산 뒤에 비교 단계가 하나 더 있어 응용으로 정했다(원장님 확인 대상).",
    ruleVersion: 1,
    generate: (rng, ask) =>
      buildExtremeBody(rng, ask, CALC[ask], (r0) => {
        const m = pick(r0, RESULT_DENS);
        return (r) => mulFor(r, q(nonzero(r, -20, 20), m));
      }),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.나눗,
    familyId: "odd-div2",
    title: "계산 결과가 나머지 넷과 다른 하나 — 두 유리수의 나눗셈",
    asks: ODD,
    sources: [MUL_DIV_SRC.나눗셈],
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 나눗셈 하나(나누는 수의 역수를 곱하기)를 계산하고, 다섯 값 가운데 혼자 다른 것을 " +
      "찾는다. 계산은 원천 19 와 같은 크기이고 값끼리는 같은가 다른가만 보면 되어 기본으로 정했다.",
    ruleVersion: 1,
    generate: (rng, ask) => buildOddBody(rng, CALC[ask], divOddRound),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: SEC.나눗,
    familyId: "max-div2",
    title: "계산 결과가 가장 큰 것 · 가장 작은 것 — 두 유리수의 나눗셈",
    asks: EXTREME,
    sources: [MUL_DIV_SRC.나눗셈],
    difficulty: "응용",
    difficultyBasis:
      "두 유리수의 나눗셈 다섯 개를 계산한 뒤, 부호가 섞인 다섯 유리수의 크기를 다시 견주어야 한다. " +
      "계산 뒤에 비교 단계가 하나 더 있어 응용으로 정했다(원장님 확인 대상).",
    ruleVersion: 1,
    generate: (rng, ask) =>
      buildExtremeBody(rng, ask, CALC[ask], (r0) => {
        const m = pick(r0, RESULT_DENS);
        return (r) => divFor(r, q(nonzero(r, -18, 18), m));
      }),
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: VALUE_SECTION,
    familyId: "odd-value",
    title: "식의 값이 나머지 넷과 다른 하나 — 한 문자에 음의 정수 대입",
    asks: ODD,
    sources: VALUE_SOURCES,
    difficulty: "응용",
    difficultyBasis:
      "꼴이 서로 다른 두 항짜리 식 다섯(일차 · 제곱 · 세제곱 · 분모에 문자)에 음의 정수를 대입해 값을 구하고, " +
      "혼자 다른 값을 찾는다. 적힌 값과 견주는 식의 값 판정과 달리 견줄 값이 지면에 없어 다섯 식을 끝까지 " +
      "계산해야 한다 — 응용으로 정했다(원장님 확인 대상).",
    ruleVersion: 1,
    generate: (rng) => {
      const s = drawSubstitution(rng);
      return buildOddBody(
        rng,
        {
          lead: `${whenText(s)}다음 중 식의 값이 ${VALUE_ASK["나머지 넷과 다른 하나"]}`,
          briefLead: substituteText(s),
          maxPerTemplate: MAX_PER_TEMPLATE,
        },
        (r0) => {
          const t = intBetween(r0, -12, 12);
          const solve = (r: Rng, target: number, by?: "bare" | "dropped") => {
            const f = solveValueForm(r, s.letter, s.x0, target, by);
            return f === null ? null : fromForm(f);
          };
          return {
            target: q(t),
            same: (r) => solve(r, t),
            other: (r) => {
              const roll = intBetween(r, 1, 10);
              // 함정 — 괄호 없이 대입하거나 부호를 빼고 대입하면 $t$ 가 되는 식.
              if (roll <= 5)
                return solve(r, t, pick(r, ["bare", "dropped"] as const));
              if (roll <= 8) return solve(r, -t);
              return solve(r, t + pick(r, [1, -1, 2, -2] as const));
            },
          };
        },
      );
    },
    readValue,
  },
  {
    form: "compare",
    grade: GRADE,
    unitSection: VALUE_SECTION,
    familyId: "max-value",
    title: "식의 값이 가장 큰 것 · 가장 작은 것 — 한 문자에 음의 정수 대입",
    asks: EXTREME,
    sources: VALUE_SOURCES,
    difficulty: "기본",
    difficultyBasis:
      "한 문자에 음의 정수를 대입하는 한두 항짜리 식 다섯의 값을 구해 가장 큰(작은) 것을 고른다. 값이 모두 " +
      "정수라 크기 비교에 계산이 더 들지 않고, 식의 크기는 원천 05 와 같아 기본으로 정했다.",
    ruleVersion: 1,
    generate: (rng, ask) => {
      const s = drawSubstitution(rng);
      return buildExtremeBody(
        rng,
        ask,
        {
          lead: `${whenText(s)}다음 중 식의 값이 ${VALUE_ASK[ask]}`,
          briefLead: substituteText(s),
          maxPerTemplate: MAX_PER_TEMPLATE,
        },
        () => (r) => fromForm(drawValueForm(r, s.letter, s.x0)),
      );
    },
    readValue,
  },
];
