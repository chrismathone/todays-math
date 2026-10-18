/**
 * **그림 문형** — 소단원의 문형 열 개(원장님 확정 2026-08-26 안 3) · 확대 11 · 12(D-114) **밖에** 붙는 문형.
 *
 * 왜 따로 두나 — 매쓰홀릭 10월 월말평가 초3 ~ 초6 100문항을 대 보니(계획서
 * `docs/planning/monthly-exam-plan-20261017.md` §13) 우리 수 · 연산 소단원은 그림 문항이 0% 였다.
 * 기존 문형을 그림 문항으로 **바꾸면** 이미 실린 행이 다른 문제가 된다(D-155 의 298행 — 문지기가 막는다).
 * 그래서 고치지 않고 **더한다**: id 는 `21` 부터(11 · 12 는 확대 갈래 자리).
 *
 * 문항류(`familyKey`)는 기존과 같은 모양 `elem:학년|소단원|21` — 적재기는 `listedForms` 를 돌 뿐이다.
 *
 * 수직선 범위는 원장님 확정 2026-10-18 Wire R1 · Hi-fi H1(`/dev/elem-numberline-hifi`) —
 * 그림 모양은 `scripts/figure/elementary.py` `numberLine.ranges` 가 정한다. 여기서는 끝과 포함 여부만 고른다.
 * 🔴 수직선이 **보기**인 문항(«…를 수직선에 나타낸 것은?»)은 아직 없다 — 엔진 문항은 그림을 하나만 단다(§13).
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import { canonicalCircled } from "../math/circledNumber";

import { tierKey } from "./difficulty";
import { expr, josa, n } from "./format";
import { fig, make } from "./make";
import { intBetween, pick } from "./rng";
import type { ElemForm, ElemProblem, Rng } from "./types";

/** 끝 하나. `at` 이 없으면 그쪽으로 끝이 없다. */
type End = { at: number; inside: boolean } | null;
type Span = { from: End; to: End };

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    const swap = out[i]!;
    out[i] = out[j]!;
    out[j] = swap;
  }
  return out;
}

/** «$27$ 이상 $30$ 미만인 수» — 교과서 말투. */
function spanText(s: Span): string {
  const parts: string[] = [];
  if (s.from) parts.push(`${n(s.from.at)} ${s.from.inside ? "이상" : "초과"}`);
  if (s.to) parts.push(`${n(s.to.at)} ${s.to.inside ? "이하" : "미만"}`);
  return `${parts.join(" ")}인 수`;
}

function spanKey(s: Span): string {
  const end = (e: End) => (e ? `${e.at}${e.inside ? "]" : ")"}` : "-");
  return `${end(s.from)}~${end(s.to)}`;
}

function contains(s: Span, v: number): boolean {
  if (s.from && (s.from.inside ? v < s.from.at : v <= s.from.at)) return false;
  if (s.to && (s.to.inside ? v > s.to.at : v >= s.to.at)) return false;
  return true;
}

type Axis = { min: number; max: number; tick: number; step: number };

/** 수직선 그림 — 끝이 없는 쪽은 엔진이 축 끝까지 긋는다. */
function lineSpec(axis: Axis, s: Span): Record<string, unknown> {
  return fig("numberLine", {
    min: axis.min,
    max: axis.max,
    tick: axis.tick,
    step: axis.step,
    ranges: [
      {
        from: s.from?.at ?? null,
        to: s.to?.at ?? null,
        ...(s.from ? { fromIn: s.from.inside } : {}),
        ...(s.to ? { toIn: s.to.inside } : {}),
      },
    ],
  });
}

/**
 * 정수 축 — 한 칸 1 · 숫자는 칸마다. 끝이 축 끝에 붙지 않게 양옆을 비운다
 * (끝이 축 끝이면 «끝이 없는 범위»와 구별이 안 된다).
 */
function intAxis(rng: Rng, lo: number, hi: number): Axis {
  const left = intBetween(rng, 1, 2);
  const right = intBetween(rng, 1, 2);
  return { min: lo - left, max: hi + right, tick: 1, step: 1 };
}

/**
 * 보기 다섯을 섞어 붙인다 — 정답 하나 + 오답 넷. 오답은 그림을 잘못 읽는 자리에서 온다:
 * ●/○ 를 바꿔 읽기(이상↔초과 · 이하↔미만) · 방향을 바꿔 읽기(이상↔이하) · 끝을 한 칸 옮겨 읽기.
 */
function withSpanChoices(
  rng: Rng,
  stem: string,
  correct: Span,
  wrongs: readonly Span[],
): { content: string; answer: string } {
  const seen = new Set([spanKey(correct)]);
  const pool: Span[] = [];
  for (const w of shuffled(rng, wrongs)) {
    const key = spanKey(w);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(w);
  }
  if (pool.length < 4)
    throw new Error(`수의 범위 보기의 오답이 ${pool.length}개뿐입니다`);
  const options = shuffled(rng, [correct, ...pool.slice(0, 4)]);
  const index = options.indexOf(correct);
  const mark = canonicalCircled(index + 1);
  if (!mark) throw new Error("보기 번호 1..5 밖입니다");
  const lines = options.map(
    (s, i) => `${canonicalCircled(i + 1)} ${spanText(s)}`,
  );
  return { content: `${stem}\n${lines.join("\n")}`, answer: mark };
}

const flip = (e: End): End => (e ? { at: e.at, inside: !e.inside } : null);
const shift = (e: End, d: number): End =>
  e ? { at: e.at + d, inside: e.inside } : null;

/** 그림을 잘못 읽은 범위들 — 정답과 같은 것은 `withSpanChoices` 가 거른다. */
function misreadings(s: Span, allowOpen: boolean): Span[] {
  const out: Span[] = [];
  if (allowOpen) {
    out.push({ from: flip(s.from), to: s.to });
    out.push({ from: s.from, to: flip(s.to) });
    out.push({ from: flip(s.from), to: flip(s.to) });
  }
  for (const d of [-2, -1, 1, 2]) {
    if (s.from) out.push({ from: shift(s.from, d), to: s.to });
    if (s.to) out.push({ from: s.from, to: shift(s.to, d) });
  }
  // 방향 바꿔 읽기 — 한 끝만 있을 때(이상 a ↔ 이하 a).
  if (s.from && !s.to) {
    out.push({ from: null, to: { at: s.from.at, inside: s.from.inside } });
    if (allowOpen)
      out.push({ from: null, to: { at: s.from.at, inside: !s.from.inside } });
  }
  if (s.to && !s.from) {
    out.push({ from: { at: s.to.at, inside: s.to.inside }, to: null });
    if (allowOpen)
      out.push({ from: { at: s.to.at, inside: !s.to.inside }, to: null });
  }
  // 경계를 서로 뒤집어 읽기(오른쪽 끝을 왼쪽 끝으로) — 두 끝이 있을 때.
  if (s.from && s.to && allowOpen)
    out.push({
      from: { at: s.from.at, inside: !s.from.inside },
      to: { at: s.to.at, inside: s.to.inside },
    });
  return out;
}

/** 2-1-1 은 이상 · 이하만(초과 · 미만은 다음 차시) · 2-1-2 는 넷 다. */
function pickSpan(rng: Rng, open: boolean, a: number, b: number): Span {
  const end = (at: number) => ({ at, inside: open ? rng() < 0.5 : true });
  const shape = intBetween(rng, 0, 2);
  if (shape === 0) return { from: end(a), to: null };
  if (shape === 1) return { from: null, to: end(b) };
  const from = end(a);
  const to = end(b);
  // 2-1-2 의 두 끝 범위에서 둘 다 «포함»이면 2-1-1 문항이다 — 적어도 하나는 뺀다.
  if (open && from.inside && to.inside) to.inside = false;
  return { from, to };
}

/** 문형 21 · 기본 — 수직선에 나타낸 범위를 말로(보기 다섯). 그림 한 겹(D-72 2단). */
function readSpan(open: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const a = intBetween(rng, 12, 60);
    const b = a + intBetween(rng, 3, 6);
    const span = pickSpan(rng, open, a, b);
    const axis = intAxis(rng, a, b);
    const { content, answer } = withSpanChoices(
      rng,
      "수직선에 나타낸 수의 범위를 바르게 나타낸 것은 어느 것입니까?",
      span,
      misreadings(span, open),
    );
    const ends: string[] = [];
    if (span.from)
      ends.push(
        `${n(span.from.at)}에 ${span.from.inside ? "●" : "○"}(${span.from.inside ? "포함" : "포함하지 않음"})`,
      );
    if (span.to)
      ends.push(
        `${n(span.to.at)}에 ${span.to.inside ? "●" : "○"}(${span.to.inside ? "포함" : "포함하지 않음"})`,
      );
    return make(
      unit,
      content,
      answer,
      `${ends.join(", ")}이고 선이 ${span.from && span.to ? "그 사이에" : span.from ? "오른쪽으로" : "왼쪽으로"} 이어집니다. 그래서 ${spanText(span)}입니다.`,
      lineSpec(axis, span),
    );
  };
}

/** 문형 22 · 응용 — 수직선에 나타낸 범위에 드는 자연수의 개수(두 끝 · 두 단계: 읽고 센다). */
function countSpan(open: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const a = intBetween(rng, 12, 60);
    const b = a + intBetween(rng, 4, 8);
    const from = { at: a, inside: open ? rng() < 0.5 : true };
    const to = { at: b, inside: open ? !from.inside || rng() < 0.5 : true };
    if (open && from.inside && to.inside) to.inside = false;
    const span: Span = { from, to };
    const hits: number[] = [];
    for (let v = a; v <= b; v += 1) if (contains(span, v)) hits.push(v);
    return make(
      unit,
      "수직선에 나타낸 수의 범위에 들어가는 자연수는 모두 몇 개입니까?",
      n(hits.length),
      `수직선은 ${spanText(span)}를 나타냅니다. 들어가는 자연수는 ${expr(hits.join(",\\ "))}로 ${n(hits.length)}개입니다.`,
      lineSpec(intAxis(rng, a, b), span),
    );
  };
}

/** 2-1-3 문형 21 · 응용 — 범위를 생활 장면에 대 본다(놀이기구 키 · 수직선이 조건). */
const RIDES = ["바이킹", "회전목마", "범퍼카", "청룡열차"] as const;

function rideSpan(unit: UnitSeed, rng: Rng): ElemProblem {
  const ride = pick(rng, RIDES);
  const a = intBetween(rng, 120, 135);
  const b = a + intBetween(rng, 5, 8);
  const from = { at: a, inside: rng() < 0.5 };
  const to = { at: b, inside: !from.inside };
  const span: Span = { from, to };
  // 다섯 사람 — 두 끝 값을 반드시 넣는다(●/○ 를 읽어야 갈린다).
  const inner = intBetween(rng, a + 1, b - 1);
  const values = shuffled(rng, [
    a,
    b,
    inner,
    a - intBetween(rng, 1, 3),
    b + intBetween(rng, 1, 3),
  ]);
  const ok = values.filter((v) => contains(span, v));
  return make(
    unit,
    `${ride}${josa(ride, "을", "를")} 탈 수 있는 키의 범위를 수직선에 나타낸 것입니다. 키가 ${expr(values.join(",\\ "))} cm 인 다섯 사람 가운데 ${ride}${josa(ride, "을", "를")} 탈 수 있는 사람은 몇 명입니까?`,
    n(ok.length),
    `수직선은 ${spanText(span)}를 나타냅니다. 두 끝 ${n(a)}, ${n(b)} 가운데 ● 인 쪽만 들어갑니다. 탈 수 있는 키는 ${expr(ok.sort((p, q) => p - q).join(",\\ "))} cm 로 ${n(ok.length)}명입니다.`,
    lineSpec({ min: a - 4, max: b + 4, tick: 1, step: 2 }, span),
  );
}

type RoundKind = "올림" | "버림" | "반올림";

/**
 * 2-1-4 · 2-1-5 · 2-1-6 문형 21 · 응용 — 수직선에 나타낸 범위의 자연수를 어림하면 모두 같은 수가 된다.
 * 범위는 그 어림이 같은 수가 되는 **딱 그만큼**이다 — 올림 (c−10, c] · 버림 [c, c+10) · 반올림 [c−5, c+5).
 */
function roundSpan(kind: RoundKind) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    // 십의 자리(한 칸 1) · 백의 자리(한 칸 10) — 축의 눈금 수는 같다.
    const hundreds = rng() < 0.5;
    const place = hundreds ? 100 : 10;
    const unitStep = place / 10;
    const c = intBetween(rng, 3, 9) * place;
    const half = place / 2;
    const span: Span =
      kind === "올림"
        ? {
            from: { at: c - place, inside: false },
            to: { at: c, inside: true },
          }
        : kind === "버림"
          ? {
              from: { at: c, inside: true },
              to: { at: c + place, inside: false },
            }
          : {
              from: { at: c - half, inside: true },
              to: { at: c + half, inside: false },
            };
    const lo = span.from!.at;
    const hi = span.to!.at;
    const axis: Axis = {
      min: lo - half,
      max: hi + half,
      tick: unitStep,
      step: half,
    };
    const where = hundreds ? "백" : "십";
    return make(
      unit,
      `수직선에 나타낸 수의 범위에 들어가는 자연수를 ${kind}하여 ${where}의 자리까지 나타내면 모두 같은 수가 됩니다. 그 수는 얼마입니까?`,
      n(c),
      `수직선은 ${spanText(span)}를 나타냅니다. 이 범위의 자연수를 ${kind}하여 ${where}의 자리까지 나타내면 모두 ${n(c)}입니다.`,
      lineSpec(axis, span),
    );
  };
}

/** 키는 `학년|소단원 코드`(`tierKey`). 값은 그 소단원의 그림 문형. */
export const FIGURE_FORMS: Record<string, readonly ElemForm[]> = {
  "초5|2-1-1": [
    { id: "21", tier: "기본", generate: readSpan(false) },
    { id: "22", tier: "응용", generate: countSpan(false) },
  ],
  "초5|2-1-2": [
    { id: "21", tier: "기본", generate: readSpan(true) },
    { id: "22", tier: "응용", generate: countSpan(true) },
  ],
  "초5|2-1-3": [{ id: "21", tier: "응용", generate: rideSpan }],
  "초5|2-1-4": [{ id: "21", tier: "응용", generate: roundSpan("올림") }],
  "초5|2-1-5": [{ id: "21", tier: "응용", generate: roundSpan("버림") }],
  "초5|2-1-6": [{ id: "21", tier: "응용", generate: roundSpan("반올림") }],
};

export function figureForms(unit: UnitSeed): readonly ElemForm[] {
  return FIGURE_FORMS[tierKey(unit)] ?? [];
}
