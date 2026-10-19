/**
 * **진술 문형** — 문형 열 개 · 확대 11 · 12 · 그림 문형 21~ **밖에** 붙는 문형(31 · 32).
 *
 * 매쓰홀릭 10월 월말평가 초3 ~ 초6 100문항 가운데 «〈보기〉에서 옳은 것을 모두 고른 것»(㉠㉡ · ㄱㄴㄷ 조합 보기) 9 ·
 * «옳은(옳지 않은) 것은?»(진술 고르기) 4 — 우리 엔진은 둘 다 0 이었다(계획서 §13).
 * 지면은 새것이 아니다: 〈보기〉 상자는 `parseProblemContent` 가 `<보기>` 다음 `ㄱ.` 줄을 상자로 세우고,
 * 조합 보기(`① ㄱ, ㄷ`)는 «모두 고르시오» 관문(D-79)이 조합형이라 비켜 간다(`choicesAreLabelCombos`).
 *
 * 진술은 **틀(template)** 이 만든다 — 같은 틀이 수를 받아 «옳은 말»과 «틀린 말»을 둘 다 낼 수 있어야 한다.
 * 틀린 말은 아무 거짓이 아니라 그 차시의 **헷갈리는 자리**다(이상 ↔ 초과 · 진분수 ↔ 가분수 · 외항 ↔ 내항 …).
 *
 *   31 · 기본 — 진술 다섯 가운데 «옳은 것» 하나(또는 «옳지 않은 것» 하나).
 *   32 · 응용 — 〈보기〉 ㄱ ㄴ ㄷ 셋을 각각 판정해 옳은 것의 조합을 고른다.
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import { canonicalCircled } from "../math/circledNumber";

import { tierKey } from "./difficulty";
import { n } from "./format";
import { make } from "./make";
import { gcd } from "./math";
import { intBetween } from "./rng";
import type { ElemForm, ElemProblem, Rng } from "./types";

/** 한 틀이 낸 말 하나 — 글 · 참거짓 · 까닭(해설에 그대로 실린다). */
type Statement = { text: string; truth: boolean; why: string };
/** 틀 — 수를 받은 뒤 `truth` 대로 말을 낸다. */
type Template = (want: boolean) => Statement;
/** 소단원 하나의 틀 묶음 — 변형마다 수를 새로 뽑는다. 틀은 다섯 이상. */
type TemplateSet = (rng: Rng) => Template[];

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

/* ── 수 뒤 조사 — 그 수를 읽은 소리가 정한다(g5 `nj` 와 같은 규칙) ── */
const FINAL_DIGITS = new Set([0, 1, 3, 6, 7, 8]);
function lastDigit(value: number): number {
  const digits = String(Math.abs(value)).replace(/\D/g, "");
  return Number(digits[digits.length - 1] ?? "0");
}
function hasFinal(value: number): boolean {
  return FINAL_DIGITS.has(lastDigit(value));
}
/** `$27$이` · `$25$가` — 수 하나 + 조사. */
function nj(value: number, withFinal: string, without: string): string {
  return `${n(value)}${hasFinal(value) ? withFinal : without}`;
}
/** 분수 · 대분수는 **분자**를 마지막에 읽는다(«3분의 2»). */
function fj(latex: string, numerator: number, withFinal: string, without: string): string {
  return `$${latex}$${hasFinal(numerator) ? withFinal : without}`;
}
const frac = (a: number, b: number) => `\\frac{${a}}{${b}}`;
const mixed = (w: number, a: number, b: number) => `${w}\\frac{${a}}{${b}}`;

/* ── 초5 2-1-1 이상과 이하 ── */
const RANGE_INCLUSIVE: TemplateSet = (rng) => {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 4, 9);
  return [
    (t) => ({
      text: `${n(a)} 이상인 수에는 ${nj(t ? a : a - 1, "이", "가")} 들어갑니다.`,
      truth: t,
      why: `${n(a)} 이상은 ${nj(a, "과", "와")} 같거나 큰 수입니다.`,
    }),
    (t) => ({
      text: `${n(b)} 이하인 수에는 ${nj(t ? b : b + 1, "이", "가")} 들어갑니다.`,
      truth: t,
      why: `${n(b)} 이하는 ${nj(b, "과", "와")} 같거나 작은 수입니다.`,
    }),
    (t) => ({
      text: `${n(a)} 이상 ${n(b)} 이하인 자연수는 ${n(t ? b - a + 1 : b - a)}개입니다.`,
      truth: t,
      why: `양 끝을 모두 넣으므로 ${n(b - a + 1)}개입니다.`,
    }),
    (t) => ({
      text: `${n(a)} 이상인 자연수 가운데 가장 작은 수는 ${n(t ? a : a + 1)}입니다.`,
      truth: t,
      why: `${nj(a, "이", "가")} 들어가므로 가장 작은 수는 ${n(a)}입니다.`,
    }),
    (t) => ({
      text: `${n(b)} 이하인 자연수 가운데 가장 큰 수는 ${n(t ? b : b - 1)}입니다.`,
      truth: t,
      why: `${nj(b, "이", "가")} 들어가므로 가장 큰 수는 ${n(b)}입니다.`,
    }),
  ];
};

/* ── 초5 2-1-2 초과와 미만 ── */
const RANGE_EXCLUSIVE: TemplateSet = (rng) => {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 4, 9);
  return [
    (t) => ({
      text: `${n(a)} 초과인 수에는 ${nj(a, "이", "가")} ${t ? "들어가지 않습니다" : "들어갑니다"}.`,
      truth: t,
      why: `초과는 ${n(a)}보다 큰 수라서 ${nj(a, "은", "는")} 빠집니다.`,
    }),
    (t) => ({
      text: `${n(b)} 미만인 수에는 ${nj(t ? b - 1 : b, "이", "가")} 들어갑니다.`,
      truth: t,
      why: `미만은 ${n(b)}보다 작은 수라서 ${nj(b, "은", "는")} 빠지고 ${nj(b - 1, "은", "는")} 들어갑니다.`,
    }),
    (t) => ({
      text: `${n(a)} 초과 ${n(b)} 미만인 자연수는 ${n(t ? b - a - 1 : b - a + 1)}개입니다.`,
      truth: t,
      why: `양 끝을 모두 빼므로 ${n(a + 1)}부터 ${n(b - 1)}까지 ${n(b - a - 1)}개입니다.`,
    }),
    (t) => ({
      text: `${n(a)} 초과인 자연수 가운데 가장 작은 수는 ${n(t ? a + 1 : a)}입니다.`,
      truth: t,
      why: `${nj(a, "은", "는")} 빠지므로 가장 작은 수는 ${n(a + 1)}입니다.`,
    }),
    (t) => ({
      text: `${n(b)} 미만인 자연수 가운데 가장 큰 수는 ${n(t ? b - 1 : b)}입니다.`,
      truth: t,
      why: `${nj(b, "은", "는")} 빠지므로 가장 큰 수는 ${n(b - 1)}입니다.`,
    }),
  ];
};

/* ── 초5 2-1-6 반올림(올림 · 버림과 함께) ── */
const ROUNDING: TemplateSet = (rng) => {
  // 어느 자리에서도 올림과 버림이 갈리게 — 일 · 십 · 백의 자리 숫자가 0 이 아니다.
  const x =
    intBetween(rng, 1, 9) * 1000 +
    intBetween(rng, 1, 9) * 100 +
    intBetween(rng, 1, 9) * 10 +
    intBetween(rng, 1, 9);
  const up = (p: number) => Math.ceil(x / p) * p;
  const down = (p: number) => Math.floor(x / p) * p;
  const round = (p: number) => Math.round(x / p) * p;
  const other = (p: number) => (round(p) === up(p) ? down(p) : up(p));
  const place = (p: number) => (p === 10 ? "십" : p === 100 ? "백" : "천");
  const roundT =
    (p: number): Template =>
    (t) => ({
      text: `${nj(x, "을", "를")} 반올림하여 ${place(p)}의 자리까지 나타내면 ${n(t ? round(p) : other(p))}입니다.`,
      truth: t,
      why: `${place(p)}의 자리 바로 아래 숫자가 ${n(Math.floor((x % p) / (p / 10)))}이므로 ${round(p) === up(p) ? "올려" : "버려"} ${n(round(p))}입니다.`,
    });
  return [
    roundT(10),
    roundT(100),
    roundT(1000),
    (t) => ({
      text: `${nj(x, "을", "를")} 올림하여 백의 자리까지 나타내면 ${n(t ? up(100) : down(100))}입니다.`,
      truth: t,
      why: `올림은 아래 자리를 올리므로 ${n(up(100))}입니다.`,
    }),
    (t) => ({
      text: `${nj(x, "을", "를")} 버림하여 백의 자리까지 나타내면 ${n(t ? down(100) : up(100))}입니다.`,
      truth: t,
      why: `버림은 아래 자리를 버리므로 ${n(down(100))}입니다.`,
    }),
  ];
};

/* ── 초3 2-4-4 진분수와 가분수 ── */
const PROPER_IMPROPER: TemplateSet = (rng) => {
  const d = intBetween(rng, 4, 9);
  const p = intBetween(rng, 1, d - 1); // 진분수의 분자
  const q = intBetween(rng, d + 1, d + 6); // 가분수의 분자
  return [
    (t) => {
      const top = t ? p : q;
      return {
        text: `${fj(frac(top, d), top, "은", "는")} 진분수입니다.`,
        truth: t,
        why: `분자가 분모보다 작은 분수가 진분수입니다.`,
      };
    },
    (t) => ({
      text: `${fj(frac(d, d), d, "은", "는")} ${t ? "가분수" : "진분수"}입니다.`,
      truth: t,
      why: `분자와 분모가 같은 분수도 가분수입니다.`,
    }),
    (t) => ({
      text: `분모가 ${n(d)}인 진분수는 모두 ${n(t ? d - 1 : d)}개입니다.`,
      truth: t,
      why: `분자가 ${n(1)}부터 ${n(d - 1)}까지라 ${n(d - 1)}개입니다.`,
    }),
    (t) => {
      const top = t ? q : p;
      return {
        text: `${fj(frac(top, d), top, "은", "는")} ${n(1)}보다 큽니다.`,
        truth: t,
        why: `분자가 분모보다 크면 ${n(1)}보다 큽니다.`,
      };
    },
    (t) => ({
      text: `${fj(frac(d, d), d, "은", "는")} ${n(1)}${t ? "과 같습니다" : "보다 큽니다"}.`,
      truth: t,
      why: `분자와 분모가 같으면 ${n(1)}입니다.`,
    }),
  ];
};

/* ── 초3 2-4-5 대분수 ── */
const MIXED: TemplateSet = (rng) => {
  const c = intBetween(rng, 3, 9);
  const b = intBetween(rng, 1, c - 1);
  const w = intBetween(rng, 1, 4);
  const top = w * c + b;
  // 가분수 → 대분수(따로 뽑는다)
  const q = intBetween(rng, 1, 4);
  const r = intBetween(rng, 1, c - 1);
  const m = q * c + r;
  return [
    (t) => ({
      text: `${fj(mixed(w, b, c), b, "을", "를")} 가분수로 나타내면 $${frac(t ? top : w * c - b, c)}$입니다.`,
      truth: t,
      why: `${nj(w, "은", "는")} $${frac(w * c, c)}$이므로 $${frac(w * c, c)}$와 $${frac(b, c)}$를 더해 $${frac(top, c)}$입니다.`,
    }),
    (t) => ({
      text: `${fj(frac(m, c), m, "을", "를")} 대분수로 나타내면 $${t ? mixed(q, r, c) : mixed(q + 1, r, c)}$입니다.`,
      truth: t,
      why: `${nj(m, "을", "를")} ${n(c)}씩 묶으면 ${n(q)}묶음과 ${nj(r, "이", "가")} 남으므로 $${mixed(q, r, c)}$입니다.`,
    }),
    (t) => ({
      text: `$${mixed(w, b, c)}$${hasFinal(b) ? "은" : "는"} ${t ? `${n(w)}보다 크고 ${n(w + 1)}보다 작습니다` : `${n(w + 1)}보다 큽니다`}.`,
      truth: t,
      why: `$${mixed(w, b, c)}$${hasFinal(b) ? "은" : "는"} ${n(w)}에 진분수를 더한 수라 ${nj(w, "과", "와")} ${n(w + 1)} 사이에 있습니다.`,
    }),
    (t) => ({
      text: `대분수는 자연수와 ${t ? "진분수" : "가분수"}로 이루어진 분수입니다.`,
      truth: t,
      why: `대분수는 자연수와 진분수로 이루어진 분수입니다.`,
    }),
    (t) => ({
      text: `$${mixed(w, b, c)}$${hasFinal(b) ? "과" : "와"} $${frac(t ? top : top + 1, c)}$${hasFinal(t ? top : top + 1) ? "은" : "는"} 크기가 같습니다.`,
      truth: t,
      why: `$${mixed(w, b, c)}$${hasFinal(b) ? "을" : "를"} 가분수로 나타내면 $${frac(top, c)}$입니다.`,
    }),
  ];
};

/** 서로소인 두 수 `a ≠ b` — 비의 성질 · 비례식에서 «뒤집어도 같은» 우연을 막는다. */
function coprimePair(rng: Rng): [number, number] {
  for (;;) {
    const a = intBetween(rng, 2, 9);
    const b = intBetween(rng, 2, 9);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

/* ── 초6 2-4-1 비의 성질 ── */
const RATIO_PROPERTY: TemplateSet = (rng) => {
  const [a, b] = coprimePair(rng);
  const k = intBetween(rng, 2, 6);
  return [
    (t) => ({
      text: t
        ? `$${a}:${b}$의 전항과 후항에 ${nj(k, "을", "를")} 곱한 $${a * k}:${b * k}$${hasFinal(b * k) ? "은" : "는"} $${a}:${b}$${hasFinal(b) ? "과" : "와"} 비율이 같습니다.`
        : `$${a}:${b}$의 전항에만 ${nj(k, "을", "를")} 곱한 $${a * k}:${b}$${hasFinal(b) ? "은" : "는"} $${a}:${b}$${hasFinal(b) ? "과" : "와"} 비율이 같습니다.`,
      truth: t,
      why: `전항과 후항에 같은 수를 곱해야 비율이 같습니다.`,
    }),
    (t) => ({
      text: `$${a}:${b}$에서 전항은 ${n(t ? a : b)}입니다.`,
      truth: t,
      why: `기호 «:» 앞의 수가 전항, 뒤의 수가 후항입니다.`,
    }),
    (t) => ({
      text: `$${a * k}:${b * k}$의 전항과 후항을 ${nj(k, "으로", "로")} 나누면 $${t ? `${a}:${b}` : `${b}:${a}`}$${hasFinal(t ? b : a) ? "이" : "가"} 됩니다.`,
      truth: t,
      why: `$${a * k}\\div${k}=${a}$, $${b * k}\\div${k}=${b}$입니다.`,
    }),
    (t) => ({
      text: `$${a}:${b}$의 비율을 분수로 나타내면 $${t ? frac(a, b) : frac(b, a)}$입니다.`,
      truth: t,
      why: `비율은 (전항)$\\div$(후항)이므로 $${frac(a, b)}$입니다.`,
    }),
    (t) => ({
      text: `전항과 후항에 ${t ? `$0$이 아닌 같은 수를 곱하거나 나누어도` : "같은 수를 더해도"} 비율은 같습니다.`,
      truth: t,
      why: `비율이 같게 하려면 $0$이 아닌 같은 수를 곱하거나 나누어야 합니다.`,
    }),
  ];
};

/* ── 초6 2-4-4 비례식의 성질 ── */
const PROPORTION: TemplateSet = (rng) => {
  const [a, b] = coprimePair(rng);
  const k = intBetween(rng, 2, 5);
  const c = a * k;
  const d = b * k;
  const eq = `${a}:${b}=${c}:${d}`;
  return [
    (t) => ({
      text: `비례식에서 외항의 곱과 내항의 곱은 ${t ? "같습니다" : "다릅니다"}.`,
      truth: t,
      why: `비례식에서 외항의 곱과 내항의 곱은 같습니다.`,
    }),
    (t) => ({
      text: `비례식 $${eq}$에서 외항은 ${t ? `${nj(a, "과", "와")} ${n(d)}` : `${nj(b, "과", "와")} ${n(c)}`}입니다.`,
      truth: t,
      why: `바깥쪽 두 수 ${n(a)}, ${nj(d, "이", "가")} 외항, 안쪽 두 수 ${n(b)}, ${nj(c, "이", "가")} 내항입니다.`,
    }),
    (t) => ({
      text: `비례식 $${a}:${b}=${c}:\\square$에서 $\\square$는 ${n(t ? d : b + c - a)}입니다.`,
      truth: t,
      why: `외항의 곱과 내항의 곱이 같으므로 $${a}\\times\\square=${b}\\times${c}$, $\\square=${d}$입니다.`,
    }),
    (t) => ({
      text: t
        ? `비례식 $${eq}$에서 $${a}\\times${d}$와 $${b}\\times${c}$는 같습니다.`
        : `비례식 $${eq}$에서 $${a}\\times${c}$와 $${b}\\times${d}$는 같습니다.`,
      truth: t,
      why: `외항의 곱 $${a}\\times${d}=${a * d}$, 내항의 곱 $${b}\\times${c}=${b * c}$로 같습니다.`,
    }),
    (t) => ({
      text: `$${a}:${b}=${c}:${t ? d : d + 1}$${hasFinal(t ? d : d + 1) ? "은" : "는"} 비례식입니다.`,
      truth: t,
      why: `비율이 같은 두 비를 등호로 이은 식이 비례식입니다. $${a}:${b}$${hasFinal(b) ? "과" : "와"} $${c}:${d}$의 비율이 같습니다.`,
    }),
  ];
};

const MARK = (i: number) => canonicalCircled(i + 1)!;

/** 31 · 기본 — 다섯 가운데 하나만 다르다(옳은 것 하나 또는 옳지 않은 것 하나). */
function pickOne(set: TemplateSet, topic: string) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const templates = shuffled(rng, set(rng)).slice(0, 5);
    const askTrue = rng() < 0.5;
    const odd = intBetween(rng, 0, 4);
    const items = templates.map((tpl, i) => tpl(i === odd ? askTrue : !askTrue));
    const lines = items.map((s, i) => `${MARK(i)} ${s.text}`);
    const reasons = items.map(
      (s, i) => `${MARK(i)} ${s.truth ? "옳습니다" : "틀립니다"} — ${s.why}`,
    );
    return make(
      unit,
      `${topic}에 대한 설명으로 ${askTrue ? "옳은" : "옳지 않은"} 것은 어느 것입니까?\n${lines.join("\n")}`,
      MARK(odd),
      reasons.join(" "),
    );
  };
}

const LABELS = ["ㄱ", "ㄴ", "ㄷ"] as const;
/** 조합 일곱 — 교과서 차례(개수 → 글자). */
const SUBSETS: number[][] = [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]];
const subsetText = (s: readonly number[]) => s.map((i) => LABELS[i]).join(", ");

/** 32 · 응용 — 〈보기〉 ㄱ ㄴ ㄷ 를 각각 판정해 옳은 것의 조합을 고른다. */
function comboPick(set: TemplateSet, topic: string) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const templates = shuffled(rng, set(rng)).slice(0, 3);
    let truths: boolean[];
    do truths = templates.map(() => rng() < 0.5);
    while (!truths.some(Boolean));
    const items = templates.map((tpl, i) => tpl(truths[i]!));
    const correct = truths.flatMap((t, i) => (t ? [i] : []));
    const key = subsetText(correct);
    const others = shuffled(
      rng,
      SUBSETS.filter((s) => subsetText(s) !== key),
    ).slice(0, 4);
    const options = SUBSETS.filter(
      (s) => subsetText(s) === key || others.some((o) => subsetText(o) === subsetText(s)),
    );
    const index = options.findIndex((s) => subsetText(s) === key);
    const box = items.map((s, i) => `${LABELS[i]}. ${s.text}`);
    const reasons = items.map(
      (s, i) => `${LABELS[i]}. ${s.truth ? "옳습니다" : "틀립니다"} — ${s.why}`,
    );
    return make(
      unit,
      `${topic}에 대한 설명으로 옳은 것을 <보기>에서 모두 고른 것은 어느 것입니까?\n<보기>\n${box.join("\n")}\n${options.map((s, i) => `${MARK(i)} ${subsetText(s)}`).join("\n")}`,
      MARK(index),
      `${reasons.join(" ")} 옳은 것은 ${key}입니다.`,
    );
  };
}

function pair(set: TemplateSet, topic: string): readonly ElemForm[] {
  return [
    { id: "31", tier: "기본", generate: pickOne(set, topic) },
    { id: "32", tier: "응용", generate: comboPick(set, topic) },
  ];
}

/** 키는 `학년|소단원 코드`(`tierKey`). */
export const STATEMENT_FORMS: Record<string, readonly ElemForm[]> = {
  "초3|2-4-4": pair(PROPER_IMPROPER, "진분수와 가분수"),
  "초3|2-4-5": pair(MIXED, "대분수"),
  "초5|2-1-1": pair(RANGE_INCLUSIVE, "이상과 이하"),
  "초5|2-1-2": pair(RANGE_EXCLUSIVE, "초과와 미만"),
  "초5|2-1-6": pair(ROUNDING, "어림하기"),
  "초6|2-4-1": pair(RATIO_PROPERTY, "비의 성질"),
  "초6|2-4-4": pair(PROPORTION, "비례식의 성질"),
};

export function statementForms(unit: UnitSeed): readonly ElemForm[] {
  return STATEMENT_FORMS[tierKey(unit)] ?? [];
}

/** 시험이 쓴다 — 틀이 «참» · «거짓»을 정말로 갈라 내는지 소단원마다 본다. */
export const STATEMENT_TEMPLATE_SETS: Record<string, TemplateSet> = {
  "초3|2-4-4": PROPER_IMPROPER,
  "초3|2-4-5": MIXED,
  "초5|2-1-1": RANGE_INCLUSIVE,
  "초5|2-1-2": RANGE_EXCLUSIVE,
  "초5|2-1-6": ROUNDING,
  "초6|2-4-1": RATIO_PROPERTY,
  "초6|2-4-4": PROPORTION,
};
