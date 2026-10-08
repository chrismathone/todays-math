/**
 * **계산 판정의 공용 짓기** — «다음 중 계산이 옳지 않은 것은?» · «옳은 것은?» 의 보기 다섯을 짓는 한 곳.
 *
 * 1단계(`addSub.ts` — 덧셈 · 뺄셈)에 있던 짓기를 2단계(2026-10-08)에서 뽑아냈다. 곱셈 · 나눗셈 · 거듭제곱 ·
 * 식의 값이 같은 문형을 쓰므로 규칙을 한 벌만 둔다 — 같은 꼴에서 다섯 · 틀린 값의 세 갈래 · 부호 반대는 한
 * 문항에 하나까지 · 오른쪽 값 겹침 금지 · 재시도 상한. 연산마다 다른 것(식의 글 · 값 · 풀이 · **그 연산의 실제
 * 실수**)은 재료(`Material`)가 들고 온다.
 *
 * 🔴 **1단계의 난수 소비 차례를 그대로 지킨다.** 재료 한 번 뽑기 → (거짓 보기면) 갈래 고르기 한 번 → 그 갈래에서
 *    고르기 한 번. 이 차례가 바뀌면 같은 씨앗이 다른 문제를 내고, 이미 실린 36행이 «같은 열쇠 · 다른 문제»가
 *    된다(`judgeStep1Pin.test.ts` 가 글자로 얼려 두었다).
 *
 * ## «틀린 등식» 만들기 — 후보일 뿐이다
 *
 * 틀린 값의 후보는 세 갈래다. 어느 쪽도 «거짓이다»를 보증하지 않는다 — 후보는 교차곱으로 참값과 다른지 거르고,
 * 최종 지면은 등록부가 `truthOf` 로 **다시 재서** «다른 하나가 정확히 하나»를 확인한다(`registry.ts`).
 *
 *   `실수`  그 연산에서 학생이 실제로 하는 실수로 계산한 값(까닭 문장이 그 값에 대해 참이다) — 재료가 준다
 *   `부호`  계산 결과의 부호만 반대로 — 한 문항에 **하나까지**(넷이 다 부호면 부호만 보고 지워 낸다)
 *   `공용`  공용 오답 자리 `numericMistakes` 가 흔든 값(정답 ±1 · 분자 +1 …) — 계산해 봐야 갈린다
 *
 * ## 모양 단서를 지운다
 *
 * 보기 다섯은 재료가 적은 **같은 꼴**(`shape`)에서만 모은다. 틀린 값도 참값과 같은 종류(정수/분수)이고
 * 자릿수가 비슷한 것만 쓴다. `numericMistakes` 의 값은 `\frac` 로 찍혀 나오므로 수로 읽어 `\dfrac` 로 다시
 * 찍는다. 공용 후보의 분모는 재료가 적은 «나올 수 있는 분모»(`denominatorBound`)의 약수일 때만 쓴다.
 */
import { numericMistakes } from "../../engine/deriveFormats";
import { pick } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { m1Rational, type M1Q as Q } from "../m1Calc";

import type { JudgeBody, JudgeOption, TruthAsk } from "./contract";

const { q, negQ, nice, texQ } = m1Rational;

/** 재료를 이만큼 뽑아도 다섯을 못 채우면 멈춘다. */
export const MAX_DRAWS = 120;

export type MistakeKind = "실수" | "부호" | "공용";
/** 틀린 값 하나 — 값 · «어디가 틀렸나» · 갈래. */
export type Mistake = { value: Q; reason: string; kind: MistakeKind };

/**
 * 보기 하나의 재료 — 왼쪽 식과 그 **정확한 값**, 그리고 그 연산의 사정.
 * `work` · `mistakes` 는 고른 재료에만 부른다(함수로 둔 까닭).
 */
export type Material = {
  /** 왼쪽 식의 글(`$` 없이) */
  left: string;
  value: Q;
  /** 같은 유형 · 같은 꼴의 기준 — 이 글이 같은 재료끼리만 한 문항에 선다 */
  shape: string;
  /** 정답 보기의 풀이 — «통분하면 $…$»(뒤에 «이므로 옳다.»가 붙는다). 보기 식을 다시 적지 않는다. */
  work: () => string;
  /** 그 연산의 실제 실수(`실수`)와 부호 반대(`부호`) — `공용` 은 여기서 붙인다 */
  mistakes: () => readonly Mistake[];
  /** 공용 후보의 분모가 나눠야 하는 수 — «나올 수 없는 분모»를 거른다 */
  denominatorBound: number;
};

/** 재료 하나를 뽑는 함수 — 시험이 «늘 같은 재료»를 넣어 재시도 상한을 잰다. */
export type MaterialDraw = (rng: Rng) => Material;

/** 발문과 해설 첫 줄의 머리 — 식의 값 판정은 대입값이 발문에 선다. */
export type CalcStyle = {
  lead: (ask: TruthAsk) => string;
  briefLead: string;
};

/** 교차곱으로 같은 값인가 — 약분 여부에 기대지 않는다. */
export function sameValue(a: Q, b: Q): boolean {
  return a.n * b.d === b.n * a.d;
}

/** 공용 후보에는 «어디서 틀렸나»를 지어내지 않는다 — 틀린 자리는 오른쪽 값이다. */
export const GENERIC_REASON = "계산 결과와 다름";

/** 공용 오답 자리의 값 — `\frac` 로 찍혀 오므로 수로 읽어 둔다(지면에는 `\dfrac` 로 다시 찍는다). */
function readMistakeValue(tex: string): Q | null {
  const m = /^\$(-)?(?:\\d?frac\{(\d+)\}\{(\d+)\}|(\d+))\$$/.exec(tex.trim());
  if (!m) return null;
  const [, minus, fn, fd, int] = m;
  const n = Number(fn ?? int);
  const d = Number(fd ?? "1");
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    return null;
  return q(minus ? -n : n, d);
}

/** `numericMistakes` 가운데 자릿수를 통째로 바꾸는 둘은 뺀다 — 학생이 크기만 보고 지워 낸다. */
const WEAK_TAGS = new Set(["times-ten", "div-ten"]);

function genericMistakes(value: Q): Mistake[] {
  const out: Mistake[] = [];
  for (const m of numericMistakes(`$${texQ(value)}$`)) {
    if (WEAK_TAGS.has(m.tag)) continue;
    const v = readMistakeValue(m.value);
    if (v) out.push({ value: v, reason: GENERIC_REASON, kind: "공용" });
  }
  return out;
}

const digits = (v: Q) => `${Math.abs(v.n)}${v.d === 1 ? "" : v.d}`.length;

/** 틀린 값으로 쓸 수 있나 — 참값과 다르고 · 같은 종류 · 비슷한 자릿수 · 지면에 낼 만큼 깔끔. */
function usable(value: Q, wrong: Q, kindIsInt: boolean): boolean {
  if (sameValue(wrong, value)) return false;
  if ((wrong.d === 1) !== kindIsInt) return false;
  if (!nice(wrong, 300, 60)) return false;
  return Math.abs(digits(wrong) - digits(value)) <= 1;
}

/** 갈래를 고르는 무게 — 실제 실수를 가장 많이, 부호 반대는 가장 적게. */
const KIND_WEIGHT: Record<MistakeKind, number> = { 실수: 5, 공용: 3, 부호: 2 };

/**
 * 재료 하나에 붙일 틀린 값 — 쓸 수 있는 후보가 있는 갈래 가운데 무게대로 하나, 그 안에서 하나. 못 고르면 null.
 * `allowSign` 이 거짓이면 부호 반대를 안 쓴다(한 문항에 하나까지). 공용 후보의 부호 반대는 `부호` 갈래와 같은 값이라 뺀다.
 */
function chooseMistake(
  rng: Rng,
  m: Material,
  kindIsInt: boolean,
  allowSign: boolean,
): Mistake | null {
  const ok = (x: Mistake) => usable(m.value, x.value, kindIsInt);
  const flipped = negQ(m.value);
  const own = m.mistakes();
  const pools: Record<MistakeKind, Mistake[]> = {
    실수: own.filter((x) => x.kind === "실수" && ok(x)),
    부호: allowSign ? own.filter((x) => x.kind === "부호" && ok(x)) : [],
    // 공용 후보는 실제 실수가 아니라 정답을 흔든 값이다 — 분모가 «나올 수 있는 분모»의 약수가 아니면
    // 계산 없이 지워 낸다(2026-10-08 표본 — 분모 5 · 2 · 5 인 식에 $-\frac{19}{11}$).
    공용: genericMistakes(m.value).filter(
      (x) =>
        ok(x) &&
        !sameValue(x.value, flipped) &&
        m.denominatorBound % x.value.d === 0,
    ),
  };
  const kinds = (Object.keys(pools) as MistakeKind[]).filter(
    (k) => pools[k].length > 0,
  );
  if (kinds.length === 0) return null;
  const total = kinds.reduce((acc, k) => acc + KIND_WEIGHT[k], 0);
  let roll = rng() * total;
  let kind = kinds[kinds.length - 1]!;
  for (const k of kinds) {
    roll -= KIND_WEIGHT[k];
    if (roll < 0) {
      kind = k;
      break;
    }
  }
  return pick(rng, pools[kind]);
}

/**
 * 보기 하나와 그 해설 조각 — 판단 근거(`brief` = 왼쪽을 계산한 값) · 정답일 때의 풀이(`detail` = 계산 과정 전체) ·
 * 거짓이면 «어디가 틀렸나»(`why`). 해설을 짜는 것은 등록부다(`JudgeBody` 머리말 — 정답지 한 쪽에 8문항).
 */
function option(m: Material, shown: Q, mistake: Mistake | null): JudgeOption {
  const work = m.work();
  return {
    text: `$${m.left}=${texQ(shown)}$`,
    claimedTrue: mistake === null,
    brief: `$${texQ(m.value)}$`,
    detail:
      mistake === null
        ? `${work}이므로 옳다.`
        : `${work}이므로 옳지 않다(${mistake.reason}).`,
    why: mistake === null ? null : mistake.reason,
  };
}

/**
 * 보기 다섯을 짓는다 — 첫째가 «다른 하나»다(차례는 등록부가 섞는다).
 * `draw` 를 밖에서 받는 까닭은 재시도 상한을 시험이 직접 재게 하려는 것이다.
 */
export function buildTruthBody(
  rng: Rng,
  ask: TruthAsk,
  draw: MaterialDraw,
  style: CalcStyle,
): JudgeBody {
  /**
   * 꼴마다 따로 모은다 — **먼저 다섯이 차는 꼴**을 쓴다. 첫 재료의 꼴로 못 박으면 드문 꼴
   * («네 항 모두 분수인데 결과는 정수»)에 걸린 씨앗이 상한까지 헛돈다(2026-10-08 실측 — mix4).
   */
  type Build = {
    lefts: Set<string>;
    rights: Set<string>;
    options: JudgeOption[];
    facts: Record<string, number>;
    /** 부호 반대를 이미 썼나 — 한 문항에 하나까지 */
    signUsed: boolean;
  };
  const builds = new Map<string, Build>();
  let draws = 0;
  for (;;) {
    if (draws >= MAX_DRAWS) {
      const best = Math.max(
        0,
        ...[...builds.values()].map((b) => b.options.length),
      );
      throw new Error(
        `보기 다섯을 같은 꼴로 못 채웠다 — 재료 ${MAX_DRAWS}번 뽑기 초과(가장 많이 찬 꼴이 ${best}개까지)`,
      );
    }
    draws += 1;
    const m = draw(rng);
    const shape = m.shape;
    let b = builds.get(shape);
    if (!b) {
      b = {
        lefts: new Set(),
        rights: new Set(),
        options: [],
        facts: {},
        signUsed: false,
      };
      builds.set(shape, b);
    }
    if (b.lefts.has(m.left)) continue;
    // 첫째는 «다른 하나» — «옳지 않은 것» 물음이면 거짓, «옳은 것» 물음이면 참.
    const odd = b.options.length === 0;
    const wantTrue = ask === "옳지 않은 것" ? !odd : odd;
    const mistake = wantTrue
      ? null
      : chooseMistake(rng, m, m.value.d === 1, !b.signUsed);
    if (!wantTrue && mistake === null) continue;
    const shown = mistake ? mistake.value : m.value;
    const right = texQ(shown);
    // 오른쪽 값이 겹치는 보기는 안 둔다 — 식이 달라도 같은 값이 둘이면 보기 다섯이 덜 갈린다.
    if (b.rights.has(right)) continue;
    b.lefts.add(m.left);
    b.rights.add(right);
    if (mistake?.kind === "부호") b.signUsed = true;
    const i = b.options.length;
    b.facts[`s${i}n`] = m.value.n;
    b.facts[`s${i}d`] = m.value.d;
    b.facts[`w${i}n`] = shown.n;
    b.facts[`w${i}d`] = shown.d;
    b.options.push(option(m, shown, mistake));
    if (b.options.length === 5) {
      b.facts.draws = draws;
      return {
        lead: style.lead(ask),
        briefLead: style.briefLead,
        options: b.options,
        facts: b.facts,
      };
    }
  }
}

/** 계산 판정의 발문 — 1단계부터 쓰는 그것. */
export const CALC_STYLE: CalcStyle = {
  lead: (ask) =>
    ask === "옳지 않은 것"
      ? "다음 중 계산이 옳지 않은 것은?"
      : "다음 중 계산이 옳은 것은?",
  briefLead: "계산하면",
};
