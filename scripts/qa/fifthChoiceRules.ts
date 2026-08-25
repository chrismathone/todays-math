/**
 * **보기를 다섯으로 만드는 규칙** — 「정답을 방해하지 않는 5번 보기」를 만든다 (D-80).
 *
 * 원장님 지시 2026-08-25: *「일부 4지선다 문항들이 있는데 전부 삭제후 5지선다로 교체.
 * 혹은 **정답을 방해하지 않는 5번 보기 생성**」*. 뒤엣것을 **우선**한다 — 문항을 잃지
 * 않고 해설·정답·출처가 그대로 남는다.
 *
 * ## 🔴 이 파일의 규율: **못 가르면 손대지 않는다**
 *
 * 보탠 보기가 **또 하나의 정답이 되면** 그 문항은 조용히 망가진다 — 지면은 멀쩡해
 * 보이고 KaTeX 도 초록이고 아무도 신고하지 않는다(이 저장소가 「그럴듯하게 틀린 값」으로
 * 여러 번 데인 자리). 그래서 규칙마다 **값 검산**을 붙이고, 검산을 못 하거나 통과 못 하면
 * `null` 을 돌려 **그 문항은 안 건드린다.** 부르는 쪽은 그것을 목록에 남겨 보고한다.
 *
 * ## 왜 유형마다 규칙이 따로인가
 *
 * 「정답을 방해하지 않는 보기」가 무엇인지는 **그 유형의 수학**이 정한다. 일반 규칙은
 * 없다. 그래서 `familyKey` 로 찾는 등록부를 두고, 등록이 없으면 안 건드린다 —
 * 「모르면 버리는 쪽」이다.
 */

import { FUNC_POOL } from "../../src/lib/middle/m2Func";

/** 기약 유리수 `[분자, 분모]`, 분모는 늘 양수. */
export type Rat = readonly [number, number];

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}
export function rat(n: number, d: number): Rat {
  if (d === 0) throw new Error("분모가 0이다");
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}
/** |a| 와 |b| 를 견준다 — 부동소수 없이 교차곱으로. */
export function cmpAbs(a: Rat, b: Rat): number {
  const l = Math.abs(a[0]) * b[1];
  const r = Math.abs(b[0]) * a[1];
  return l === r ? 0 : l < r ? -1 : 1;
}
export function eqRat(a: Rat, b: Rat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * `$y=<계수>x^2$` 에서 계수를 읽는다. **모르는 모양이면 `null`** — 지어내지 않는다.
 *
 * 받는 모양: `y=4x^2` · `y=-3x^2` · `y=x^2` · `y=-x^2`
 *            `y=\dfrac{5}{2}x^2` · `y=-\dfrac{1}{3}x^2` (`\frac` 도 같이 받는다)
 */
export function parseQuadCoef(tex: string): Rat | null {
  const body = tex
    .trim()
    .replace(/^\$|\$$/g, "")
    .trim();
  const m = /^y=(-?)(?:\\d?frac\{(\d+)\}\{(\d+)\}|(\d+))?x\^2$/.exec(body);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  if (m[2] !== undefined && m[3] !== undefined) {
    return rat(sign * Number(m[2]), Number(m[3]));
  }
  if (m[4] !== undefined) return rat(sign * Number(m[4]), 1);
  return rat(sign, 1); // 계수가 안 적혀 있으면 ±1
}

/** 정답 문자열에서 유리수 하나를 읽는다. 모르는 모양이면 `null`. */
export function parseRatAnswer(answer: string): Rat | null {
  const body = answer
    .trim()
    .replace(/^\$|\$$/g, "")
    .trim();
  const f = /^(-?)\\d?frac\{(\d+)\}\{(\d+)\}$/.exec(body);
  if (f) return rat((f[1] === "-" ? -1 : 1) * Number(f[2]), Number(f[3]));
  const i = /^(-?\d+)$/.exec(body);
  if (i) return rat(Number(i[1]), 1);
  return null;
}

/** 계수 풀 — 엔진 `A_MAGS` 와 같은 값들. 여기 없는 값은 안 만든다. */
const MAGS: readonly Rat[] = [
  [1, 4],
  [1, 3],
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 2],
  [4, 3],
  [2, 1],
  [5, 2],
  [3, 1],
  [4, 1],
  [5, 1],
];

function texOfRat(r: Rat): string {
  const sign = r[0] < 0 ? "-" : "";
  const n = Math.abs(r[0]);
  return r[1] === 1 ? `${sign}${n}` : `${sign}\\dfrac{${n}}{${r[1]}}`;
}

/** 문항 코드에서 만드는 결정적 고르기 — 같은 문항은 늘 같은 보기를 받는다. */
function pickDeterministic<T>(items: readonly T[], salt: string): T {
  let h = 0;
  for (let i = 0; i < salt.length; i += 1) {
    h = (Math.imul(h, 31) + salt.charCodeAt(i)) | 0;
  }
  return items[Math.abs(h) % items.length]!;
}

export type FifthChoiceResult =
  | { ok: true; content: string; added: string; why: string }
  | { ok: false; why: string };

/**
 * `3-1|이차함수의 그래프 ⑴|04` — 「폭이 가장 넓은/좁은 것의 $x^2$의 계수」.
 *
 * 정답은 **|계수| 가 가장 작은(넓은) / 가장 큰(좁은)** 보기의 계수다. 그러므로
 * 보태는 보기는 |계수| 가 **정답 쪽 극단을 넘지 않아야** 하고, 이미 있는 어떤
 * |계수| 와도 **같으면 안 된다**(같으면 극단이 둘이 되어 답이 안 정해진다).
 *
 * 그리고 보탠 뒤 **다섯 개로 정답을 다시 계산해** 저장된 정답과 값이 같은지 본다.
 * 다르면 `ok:false` — 그 문항은 안 건드린다.
 */
export function addFifthToWidthType(
  content: string,
  answer: string,
  salt: string,
): FifthChoiceResult {
  const lines = content.split("\n");
  const head = lines[0] ?? "";
  const wantNarrow = head.includes("좁은");
  const wantWide = head.includes("넓은");
  if (wantNarrow === wantWide) {
    return { ok: false, why: "발문이 «넓은»인지 «좁은»인지 안 갈린다" };
  }

  const MARKS = ["①", "②", "③", "④", "⑤"];
  const items: { mark: string; tex: string; coef: Rat }[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line === "") continue;
    const mk = MARKS.findIndex((m) => line.startsWith(m));
    if (mk < 0)
      return { ok: false, why: `보기 줄이 아닌 줄이 있다: «${line}»` };
    const tex = line.slice(MARKS[mk]!.length).trim();
    const coef = parseQuadCoef(tex);
    if (!coef) return { ok: false, why: `계수를 못 읽는 보기: «${tex}»` };
    items.push({ mark: MARKS[mk]!, tex, coef });
  }
  if (items.length !== 4) {
    return { ok: false, why: `보기가 ${items.length}개다 (넷이어야 한다)` };
  }

  const stored = parseRatAnswer(answer);
  if (!stored) return { ok: false, why: `정답을 못 읽는다: «${answer}»` };

  // 지금 정답이 정말 그 극단인지부터 확인한다 — 아니면 이 규칙의 대상이 아니다.
  const extremeOf = (list: Rat[]): Rat | null => {
    let best = list[0]!;
    for (const c of list.slice(1)) {
      const cmp = cmpAbs(c, best);
      if (cmp === 0) return null; // 극단이 둘 — 답이 안 정해진다
      if (wantNarrow ? cmp > 0 : cmp < 0) best = c;
    }
    // 최종 극단이 하나뿐인지 다시 본다
    const ties = list.filter((c) => cmpAbs(c, best) === 0);
    return ties.length === 1 ? best : null;
  };
  const before = extremeOf(items.map((i) => i.coef));
  if (!before || !eqRat(before, stored)) {
    return {
      ok: false,
      why: "지금 보기 넷으로 계산한 정답이 저장된 정답과 다르다",
    };
  }

  // 보탤 수 있는 계수 — |값| 이 극단을 넘지 않고, 있는 것과 겹치지 않는 것.
  const usable = MAGS.filter((m) => {
    if (items.some((i) => cmpAbs(i.coef, m) === 0)) return false;
    const c = cmpAbs(m, stored);
    return wantNarrow ? c < 0 : c > 0;
  });
  if (usable.length === 0) {
    return { ok: false, why: "정답을 안 건드리는 계수가 풀에 없다" };
  }
  const mag = pickDeterministic(usable, salt);
  const signed: Rat =
    pickDeterministic([1, -1] as const, `${salt}#sign`) === 1
      ? mag
      : rat(-mag[0], mag[1]);
  const addedTex = `$y=${texOfRat(signed)}x^2$`;

  // 🔴 **값 검산** — 다섯으로 다시 계산한 정답이 저장된 정답과 같은가.
  const after = extremeOf([...items.map((i) => i.coef), signed]);
  if (!after || !eqRat(after, stored)) {
    return { ok: false, why: "보탠 보기가 정답을 바꾼다 — 안 건드린다" };
  }

  return {
    ok: true,
    content: `${content}\n⑤ ${addedTex}`,
    added: `⑤ ${addedTex}`,
    why: `|계수| ${Math.abs(signed[0])}/${signed[1]} 는 정답 쪽 극단을 안 넘는다`,
  };
}

/**
 * 「다음 중 … 인 것은 **모두 몇 개**인지 구하시오」 — ㉠~㉤ 목록에 한 줄을 보탠다.
 *
 * 정답은 **참인 보기의 개수**다. 그러므로 보태는 보기는 반드시 **거짓**이어야 한다 —
 * 참을 보태면 정답이 하나 늘어난다.
 *
 * ## 🔴 «거짓이다»의 근거를 엔진에서 가져오지 않는다
 *
 * 엔진의 소재 표(`FUNC_POOL`)에서 거짓 항목을 골라 오면 **판정과 검산이 같은 표**를
 * 본다 — 그 표가 틀려도 영원히 초록이다(이 저장소의 「지표의 참이 제품에서 오면 안
 * 된다」). 그래서 여기 **따로 적은** 소재만 쓰고, 그 근거를 사람이 읽을 수 있게
 * 주석에 남긴다. 그리고 **본문에 이미 있는 문장**이면 안 쓴다(보기 둘이 같아진다).
 */
const NON_FUNCTION_FILLERS: readonly { text: string; why: string }[] = [
  {
    // $x=4$ 이면 $y$ 는 $1,2,4$ — 하나에 여럿이 대응하므로 함수가 아니다.
    text: "자연수 $x$의 약수 $y$",
    why: "$x$ 하나에 약수가 여럿 — 함수가 아니다",
  },
  {
    // $x=3$ 이면 $y$ 는 $1$ 뿐이지만 $x=5$ 면 $1,3$ — 여럿이다.
    text: "자연수 $x$보다 작은 홀수 $y$",
    why: "$x$ 하나에 홀수가 여럿 — 함수가 아니다",
  },
  {
    // 둘레가 같아도 가로·세로 비가 다르면 넓이가 달라진다.
    text: "둘레의 길이가 $x$인 직사각형의 넓이 $y$",
    why: "둘레가 같아도 넓이가 여럿 — 함수가 아니다",
  },
];

export function addFifthToCountType(
  content: string,
  answer: string,
  salt: string,
): FifthChoiceResult {
  const lines = content.split("\n");
  if (!/모두 몇 개인지/.test(lines[0] ?? "")) {
    return { ok: false, why: "「모두 몇 개인지」 발문이 아니다" };
  }
  const MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤"];
  const bodies: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line === "") continue;
    const mk = MARKS.findIndex((m) => line.startsWith(m));
    if (mk < 0)
      return { ok: false, why: `보기 줄이 아닌 줄이 있다: «${line}»` };
    if (mk !== bodies.length) {
      return { ok: false, why: "표식 차례가 ㉠부터 이어지지 않는다" };
    }
    bodies.push(line.slice(MARKS[mk]!.length).trim());
  }
  if (bodies.length !== 4) {
    return { ok: false, why: `보기가 ${bodies.length}개다 (넷이어야 한다)` };
  }
  // 「$3$개」 — 정답이 개수 꼴인지부터 본다.
  const m = /^\$(\d+)\$개$/.exec(answer.trim());
  if (!m) return { ok: false, why: `정답이 «$N$개» 꼴이 아니다: «${answer}»` };
  const count = Number(m[1]);
  const usable = NON_FUNCTION_FILLERS.filter((f) => !bodies.includes(f.text));
  if (usable.length === 0) {
    return { ok: false, why: "보탤 수 있는 «거짓» 소재가 본문에 이미 다 있다" };
  }
  const filler = pickDeterministic(usable, salt);

  // 🔴 **두 출처가 맞대야 한다.** 「이 소재가 함수가 아니다」의 근거를 우리 손 표
  //    하나에만 두면, 그 표가 틀려도 아무도 못 잡는다. 그래서 **엔진의 소재 표**에도
  //    같은 문장이 있고 그쪽도 «함수 아님»이라고 하는지 본다. 둘이 어긋나면 멈춘다.
  //
  //    ⚠️ 「정답 문자열이 그대로인가」로는 못 잰다 — 우리가 정답을 안 건드리므로
  //       그 검사는 **언제나 참**이다(동어반복). 실제로 처음엔 그렇게 써 놓았다.
  const engineSays = FUNC_POOL.find((x) => x.text === filler.text);
  if (!engineSays) {
    return { ok: false, why: `엔진 소재 표에 없는 문장이다: «${filler.text}»` };
  }
  if (engineSays.isFunc) {
    return {
      ok: false,
      why: `두 출처가 어긋난다 — 엔진은 «${filler.text}» 를 함수라고 한다`,
    };
  }
  // 보태도 «참의 개수»는 그대로다: 보탠 것이 거짓이고 보기 수만 하나 는다.
  if (count > bodies.length) {
    return { ok: false, why: "정답이 보기 수보다 크다" };
  }
  return {
    ok: true,
    content: `${content}\n㉤ ${filler.text}`,
    added: `㉤ ${filler.text}`,
    why: filler.why,
  };
}

/**
 * **등록부** — `familyKey` → 보태기 규칙. 등록이 없으면 안 건드린다.
 * 새 유형을 넣을 때는 반드시 **값 검산**을 함께 넣을 것.
 */
export const FIFTH_CHOICE_ADDERS: Record<
  string,
  (content: string, answer: string, salt: string) => FifthChoiceResult
> = {
  "mid:3-1|이차함수의 그래프 ⑴|04": addFifthToWidthType,
  // ⚠️ 이 키의 중단원 이름에는 **얇은 공백(U+2009)** 이 아니라 보통 공백이 둘 있다.
  //    `census-choice-count.ts` 가 찍어 준 실측 문자열 그대로다.
  "mid:2-1|일차함수와 그 그래프  ⑴|01": addFifthToCountType,
};

/**
 * 🔴 **눈에 안 보이는 공백을 고른다.**
 *
 * 중단원 이름에는 **얇은 공백 U+2009** 가 섞여 있다 — `mid:2-1|일차함수와 그 그래프␉⑴|01`
 * 의 `␉` 가 그것이다(실측 2026-08-25). 등록부 키에 그 글자를 그대로 적으면
 * ⑴ 소스에서 안 보이고 ⑵ 다음 사람이 손으로 고치면 조용히 안 맞는다.
 * 그래서 **양쪽을 보통 공백으로 눌러** 맞춘다. `load-engine-problems.ts` 도 같은
 * 함정을 주석으로 경고하고 있다.
 */
function normalizeKey(key: string): string {
  // 유니코드 «공백» 전량 → 보통 공백. 손 목록이 아니라 정규식 부류다.
  return key.replace(/\s/g, " ");
}

export function addFifthChoice(
  familyKey: string,
  content: string,
  answer: string,
  salt: string,
): FifthChoiceResult {
  const want = normalizeKey(familyKey);
  const hit = Object.entries(FIFTH_CHOICE_ADDERS).find(
    ([k]) => normalizeKey(k) === want,
  );
  if (!hit) {
    return { ok: false, why: `이 문항류의 보태기 규칙이 없다: ${familyKey}` };
  }
  return hit[1](content, answer, salt);
}
