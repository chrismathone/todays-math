/**
 * **확대 갈래(D-116)의 «지우기» 축 — 채점을 한 곳에 둔다.**
 *
 * 이 축은 「굳힘 걸음을 **지워도** 답이 그대로면 그 조건은 장식이다」를 잰다. 값 검산은
 * 「답이 맞나」를, KaTeX 는 「그려지나」를, 지면 잠금은 「글자가 그대로인가」를 볼 뿐이라
 * **굳힘이 실제로 답을 바꾸는지**는 아무 관문도 안 본다. 굳힘이 장식이면 학생이 그
 * 걸음을 건너뛰어도 답이 나오고, 그건 이 갈래가 존재할 까닭 자체가 없어지는 결함인데
 * **값은 맞으므로 아무도 못 본다.**
 *
 * ## 🔴 왜 모듈로 뺐나
 *
 * 채점이 `probe-middle-top-m1.ts` 안에 **인라인**으로 있었고, 중3 판정기에는 이 축이
 * **아예 없었다**(2026-09-04). 중3에 세우면서 그 채점을 옮겨 적으면 규칙이 두 벌이
 * 되고, 그러면 한쪽만 고쳐도 아무도 모른다(2026-08-18 「같은 규칙을 쓰는 자리가
 * 둘이면 한 숫자를 두 곳이 쓰게 하라」). 그래서 **채점만** 여기 두고 표를 그리는
 * 일은 각 판정기가 한다.
 *
 * ## 세 갈래를 반드시 갈라 센다
 *
 * - **축 없음**(`withoutBinding` 이 `null`) — 조건을 지우면 문제가 사라진다.
 * - **못 잼**(값이 안 섰다 = 던졌거나 유한하지 않다) — 「깨끗」이 아니다.
 * - **맞힘** — 그때가 결함이다.
 *
 * 셋을 뭉개면 표가 «못 셈»을 «깨끗»으로 읽는다(2026-08-21 「0은 깨끗과 못 셈을 안
 * 가른다」). 그래서 `scorePerturb` 는 못 잰 판이 있으면 판정을 **보류**하도록
 * 그 수를 따로 돌려준다.
 */

/**
 * 유형마다 ⑴ 굳힘 조건을 **지운** 답 ⑵ 굳힘 인자를 **흔든** 답.
 *
 * `null` 은 「그 축이 이 유형에 **없다**」는 뜻이다 — 「0%」와 **다른 말**이라
 * 표에서도 따로 찍는다.
 */
export type Axis = {
  /** 굳힘 조건을 안 읽고 낼 수 있는 답. 없으면 `null`(축 없음). */
  withoutBinding: (f: Record<string, number>) => number | null;
  /** 굳힘 인자를 흔든 답. 원래와 같으면 굳힘이 장식이다. */
  perturbed: (f: Record<string, number>) => number;
  /** 후보 개수 — 우연 수준 $1/k$ 를 찍기 위해. `null` 이면 후보 목록이 없다. */
  candidateCount: (f: Record<string, number>) => number | null;
};

/** 채점에 필요한 것은 이 둘뿐이다 — 판정기마다 다른 `Row` 를 안 물고 온다. */
export type AxisRow = { facts: Record<string, number>; answer: number };

export type ShortcutScore = {
  /** 지름길이 참 답을 맞힌 판. */
  hit: number;
  /** `withoutBinding` 이 `null` 이라 축이 아예 없는 판. */
  noAxis: number;
  /** 값이 안 선 판(던졌거나 유한하지 않다) — 「맞다·틀리다」와 **다른 말**이다. */
  noValue: number;
  /** 실제로 견준 판 = 표본 − 축없음 − 못잼. */
  scored: number;
};

/**
 * ㉠ — 굳힘 조건을 지우고도 답이 나오나.
 *
 * ⚠️ **판마다 따로 본다.** 표본 하나가 `null` 이라고 그 유형을 통째로 「축 없음」으로
 *    적으면, 판에 따라 축이 서고 안 서는 유형에서 나머지를 구조적으로 못 본다.
 */
export function scoreShortcut(
  rows: readonly AxisRow[],
  axis: Axis,
): ShortcutScore {
  let hit = 0;
  let noAxis = 0;
  let noValue = 0;
  for (const r of rows) {
    let wb: number | null;
    try {
      wb = axis.withoutBinding(r.facts);
    } catch {
      wb = Number.NaN;
    }
    if (wb === null) noAxis += 1;
    else if (!Number.isFinite(wb)) noValue += 1;
    else if (wb === r.answer) hit += 1;
  }
  return { hit, noAxis, noValue, scored: rows.length - noAxis - noValue };
}

export type PerturbScore = {
  /** 흔들었는데 답이 **그대로**인 판 — 그 판에서 굳힘은 장식이다. */
  same: number;
  /** 흔들기가 값을 못 낸 판 — 「답이 안 바뀌었다」와 **다른 말**이다. */
  unmeasured: number;
  /** 실제로 견준 판. */
  measured: number;
};

/**
 * ㉡ — 굳힘 인자를 흔들면 답이 바뀌나.
 *
 * 🔴 **값을 못 낸 판을 «답이 바뀌었다»로 세지 않는다.** 종전 판은 `same` 만 세고
 * `Number.isFinite` 로 조용히 걸렀는데, 그러면 흔들기가 창 밖으로 나가 `NaN` 을 내는
 * 판이 전부 **「굳힘이 산다」**로 읽힌다 — 실측으로 `43U` 가 96판 중 **95판**을 그렇게
 * 통과하고 있었다(2026-09-04).
 */
export function scorePerturb(
  rows: readonly AxisRow[],
  axis: Axis,
): PerturbScore {
  let same = 0;
  let unmeasured = 0;
  for (const r of rows) {
    let got: number;
    try {
      got = axis.perturbed(r.facts);
    } catch {
      got = Number.NaN;
    }
    if (!Number.isFinite(got)) unmeasured += 1;
    else if (got === r.answer) same += 1;
  }
  return { same, unmeasured, measured: rows.length - unmeasured };
}

/** 우연 수준 $1/k$ — 후보 목록이 없는 판은 **분모에서 뺀다**(0 으로 세면 거짓말이다). */
export function chanceLevel(rows: readonly AxisRow[], axis: Axis): string {
  const ks: number[] = [];
  for (const r of rows) {
    let k: number | null;
    try {
      k = axis.candidateCount(r.facts);
    } catch {
      k = null;
    }
    if (k !== null && Number.isFinite(k)) ks.push(k);
  }
  if (ks.length === 0) return "— (후보 목록 없음)";
  return `1/${(ks.reduce((a, b) => a + b, 0) / ks.length).toFixed(1)}`;
}

/**
 * 답에서 처음 나오는 수 — **없으면 `null`(판정 불가)**.
 *
 * 🔴 종전 판은 수가 없으면 **던졌다.** 그런데 형제 유형의 답에는 수가 없는 것이
 * 흔하다 — 실측으로 소단원 «정비례 관계 y=ax의 그래프» 형제 12개 중 **4개**가
 * 그렇다(`06`→`$y=-x$` 등). 「이 열쇠로는 못 잰다」와 「자가 고장 났다」는 다른
 * 말인데 던지면 둘이 같아지고, 죽은 자는 아무것도 안 지킨다.
 */
export function answerNumberOrNull(answer: string): number | null {
  const m = answer.match(/-?\d+(?:\.\d+)?/);
  return m === null ? null : Number(m[0]);
}

/** 답에서 처음 나오는 수 — 확대 갈래의 답은 반드시 수다. 없으면 던진다. */
export function answerNumber(answer: string): number {
  const v = answerNumberOrNull(answer);
  if (v === null) throw new Error(`답에 수가 없다: ${answer}`);
  return v;
}
