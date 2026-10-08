/**
 * 고등 적재 배선 시험의 **픽스처 등록부** — 살아 있는 168유형만 보면 «도장»이 된다
 * (`unloadedTypes.test.ts` 머리말 「지어낸 표로 두 쪽을 직접 댄다」).
 *
 * 세 유형을 둔다. 번호 `03` 과 확장 번호 `03A` 가 **같은 중단원에 나란히** 있다 — 포함으로 대는 검사가
 * `…|03A` 만 실린 적재본에서 `…|03` 을 «나갔다»로 읽는 반례다.
 *
 * | 키 | 차시 | 답 | 오답 |
 * |---|---|---|---|
 * | `…|03`  | 다항식의 덧셈과 뺄셈 | 수 | 공용 경로(`numericMistakes`) |
 * | `…|03A` | 다항식의 덧셈과 뺄셈 | 일차식 | 생성기가 낸 넷(`distractors`) |
 * | `…|04`  | 다항식의 곱셈 | 수 | 공용 경로 |
 */
import type { Difficulty } from "@/contracts/difficulty";
import { intBetween } from "@/lib/elementary/rng";
import type { Rng } from "@/lib/elementary/types";
import type { HighProblem, HighTypeEntry } from "@/lib/high/types";

export const FIXTURE_BOOK = "공통수학1";
export const FIXTURE_MINOR = "가짜 중단원";
export const FIXTURE_SECTION_A = "다항식의 덧셈과 뺄셈";
export const FIXTURE_SECTION_B = "다항식의 곱셈";

function meta(number: string, unitSection: string) {
  return {
    grade: FIXTURE_BOOK,
    unitSection,
    rpmBook: FIXTURE_BOOK,
    rpmMinor: FIXTURE_MINOR,
    rpmType: number,
    rpmTitle: `픽스처 ${number}`,
  };
}

const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

/** 수 정답 — 두 수의 합. 변형 번호가 짝수면 `기본`, 홀수면 `응용`(꼴마다 칸이 다른 고등 관례). */
function numeric(number: string, unitSection: string, base: number) {
  return (rng: Rng): HighProblem => {
    const a = intBetween(rng, 11, 97);
    const b = intBetween(rng, 11, 97);
    const difficulty: Difficulty = (a + b) % 2 === 0 ? "기본" : "응용";
    return {
      ...meta(number, unitSection),
      content: `두 다항식의 상수항이 각각 $${a + base}$, $${b}$일 때, 두 상수항의 합을 구하시오.`,
      answer: `$${a + base + b}$`,
      solution: `두 상수항을 더하면 $${a + base}+${b}=${a + base + b}$이다.\n따라서 구하는 값은 $${a + base + b}$이다.`,
      difficulty,
      facts: { a: a + base, b },
    };
  };
}

/** 식 정답 — 일차식의 합. 오답 넷은 생성기가 낸다(부호 · 계수 자리 실수). */
function linear(number: string, unitSection: string) {
  return (rng: Rng): HighProblem => {
    const p = intBetween(rng, 2, 9);
    const q = intBetween(rng, 2, 9);
    const r = intBetween(rng, 2, 9);
    const s = intBetween(rng, 11, 19);
    const coef = p + r;
    const cons = q - s;
    const tex = (c: number, k: number) => `$${c}x${signed(k)}$`;
    return {
      ...meta(number, unitSection),
      content: `두 다항식 $A=${p}x+${q}$, $B=${r}x-${s}$에 대하여 $A+B$를 구하시오.`,
      answer: tex(coef, cons),
      solution: `동류항끼리 모으면 $A+B=(${p}+${r})x+(${q}-${s})$이다.\n따라서 $A+B$는 ${tex(coef, cons)}이다.`,
      difficulty: "기본",
      facts: { p, q, r, s },
      distractors: [
        tex(coef, q + s),
        tex(p - r === 0 ? coef + 1 : p - r, cons),
        tex(coef, -cons),
        tex(coef + 10, cons),
      ],
    };
  };
}

/** 픽스처 등록 셋 — 차시 A 에 둘(`03` · `03A`), 차시 B 에 하나(`04`). */
export function fixtureHighEntries(): HighTypeEntry[] {
  return [
    {
      key: `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03`,
      ...meta("03", FIXTURE_SECTION_A),
      handler: numeric("03", FIXTURE_SECTION_A, 0),
    },
    {
      key: `${FIXTURE_BOOK}|${FIXTURE_MINOR}|03A`,
      ...meta("03A", FIXTURE_SECTION_A),
      handler: linear("03A", FIXTURE_SECTION_A),
    },
    {
      key: `${FIXTURE_BOOK}|${FIXTURE_MINOR}|04`,
      ...meta("04", FIXTURE_SECTION_B),
      handler: numeric("04", FIXTURE_SECTION_B, 100),
    },
  ];
}
