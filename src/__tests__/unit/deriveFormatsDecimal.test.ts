/** Q-P01 — 인쇄된 보기의 유리수 값·정밀도·단일 정답을 독립 계산한다. */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import { elementaryUnits } from "@/lib/elementary/generate";
import { generateElementaryForm, listedForms } from "@/lib/elementary/forms";
import {
  asMultipleChoice,
  numericMistakes,
  type StemProblem,
} from "@/lib/engine/deriveFormats";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { hasChoices } from "@/lib/problem/choiceCountRule";

type Rational = { n: bigint; d: bigint; places: number };
const zero = BigInt(0);
const one = BigInt(1);
const ten = BigInt(10);

// 제품의 parseNumericAnswer/formatRat 를 쓰면 같은 버그가 양쪽을 속인다.
function decimal(text: string): Rational {
  const match = /(-?)(\d+)\.(\d+)/.exec(text);
  if (!match) throw new Error(`소수 표기가 없습니다: ${text}`);
  return {
    n: BigInt(`${match[1]}${match[2]}${match[3]}`),
    d: ten ** BigInt(match[3]!.length),
    places: match[3]!.length,
  };
}

function gcd(a: bigint, b: bigint): bigint {
  return b === zero ? (a < zero ? -a : a) : gcd(b, a % b);
}

function valueKey(value: Pick<Rational, "n" | "d">): string {
  const divisor = gcd(value.n, value.d) * (value.d < zero ? -one : one);
  return `${value.n / divisor}/${value.d / divisor}`;
}

function stem(answer: string): StemProblem {
  return {
    content: "계산한 값을 구하시오.",
    answer,
    solution: "풀이.",
    familyKey: "decimal-regression",
    problemType: "계산",
  };
}

function options(content: string): string[] {
  return content
    .split("\n")
    .slice(-5)
    .map((line) => line.slice(2));
}

const SAMPLES = [
  "0.8290",
  "8.29",
  "0.2",
  "0.3",
  "0.04",
  "0.125",
  "1.25",
  "12.5000",
  "0.0000",
  "0.0",
  "1.0",
  "-0.3",
  "-0.04",
  "-1.25",
];

describe("Q-P01 소수 보기", () => {
  it("재현: 삼각비 18 씨앗 15에서 발문으로 계산되는 정답은 정확히 한 보기다", () => {
    const source = generateMiddleProblem("3-2|삼각비|18", 15);
    const mcq = asMultipleChoice(
      { ...source, familyKey: "x", problemType: "활용" },
      createRng(0x9e37),
    );
    // sin(90°-a)=cos(a): 정답 필드 대신 발문의 표에서 직접 값을 읽는다.
    const table =
      /\\sin (\d+)\^\\circ=(\d+\.\d+).*\\cos \1\^\\circ=(\d+\.\d+)/.exec(
        source.content,
      )!;
    const asksSin = source.content.match(/일 때, \$\\sin (\d+)\^\\circ/)!;
    expect(Number(table[1]) + Number(asksSin[1])).toBe(90);
    const expected = valueKey(decimal(table[3]!));
    const values = options(mcq.content).map((value) =>
      valueKey(decimal(value)),
    );
    expect(values.filter((value) => value === expected)).toHaveLength(1);
    expect(new Set(values).size).toBe(5);
  });

  it.each(SAMPLES)(
    "%s의 후보는 태그의 계산과 유리수 값이 같고 정답 정밀도를 지킨다",
    (answer) => {
      const source = decimal(answer);
      const divisor = gcd(source.n, source.d);
      const n = source.n / divisor;
      const d = source.d / divisor;
      const operations: Record<string, { n: bigint; d: bigint }> = {
        "off-by-one-up": { n: n + d, d },
        "off-by-one-down": { n: n - d, d },
        "sign-flip": { n: -n, d },
        double: { n: n * BigInt(2), d },
        half: { n, d: d * BigInt(2) },
        "times-ten": { n: n * ten, d },
        "div-ten": { n, d: d * ten },
        reciprocal: { n: d, d: n },
        "numerator-plus": { n: n + one, d },
        "denominator-plus": { n, d: d + one },
        "decimal-last-up": { n: source.n + one, d: source.d },
        "decimal-last-down": { n: source.n - one, d: source.d },
        "decimal-next-up": { n: source.n + ten, d: source.d },
        "decimal-next-down": { n: source.n - ten, d: source.d },
        "decimal-last-two-up": { n: source.n + BigInt(2), d: source.d },
        "decimal-last-two-down": { n: source.n - BigInt(2), d: source.d },
        "off-by-two-up": { n: n + BigInt(2) * d, d },
        "off-by-two-down": { n: n - BigInt(2) * d, d },
        "off-by-three-up": { n: n + BigInt(3) * d, d },
      };
      const mistakes = numericMistakes(answer);
      expect(mistakes.length).toBeGreaterThanOrEqual(4);
      const seen = new Set([valueKey(source)]);
      for (const mistake of mistakes) {
        const value = decimal(mistake.value);
        expect(value.places, mistake.value).toBe(source.places);
        expect(operations[mistake.tag], mistake.tag).toBeDefined();
        expect(valueKey(value), `${answer}: ${mistake.tag}`).toBe(
          valueKey(operations[mistake.tag]!),
        );
        expect(seen.has(valueKey(value)), `${answer}: ${mistake.value}`).toBe(
          false,
        );
        seen.add(valueKey(value));
      }
    },
  );

  it("유한소수가 아니거나 정답 자릿수로 정확히 적을 수 없는 후보는 버린다", () => {
    const tags = new Set(numericMistakes("0.8290").map((m) => m.tag));
    expect(tags.has("denominator-plus"), "829/1001은 순환소수다").toBe(false);
    expect(tags.has("reciprocal"), "1000/829는 순환소수다").toBe(false);
    const short = new Map(numericMistakes("0.2").map((m) => [m.tag, m.value]));
    expect(short.has("denominator-plus"), "1/6은 순환소수다").toBe(false);
    expect(
      short.has("div-ten"),
      "0.02는 소수 첫째 자리로 정확히 못 적는다",
    ).toBe(false);
    expect(short.get("reciprocal")).toBe("5.0");
  });

  it("정수 부분이 0인 음수의 부호도 보존한다", () => {
    const mistakes = new Map(
      numericMistakes("-0.3").map((m) => [m.tag, m.value]),
    );
    expect(mistakes.get("sign-flip")).toBe("0.3");
    expect(mistakes.get("double")).toBe("-0.6");
  });

  it("단위 있는 소수·정수 값의 소수도 씨앗 0~299에서 서로 다른 다섯 보기를 낸다", () => {
    let checked = 0;
    for (const answer of SAMPLES) {
      for (const wrap of [
        (s: string) => s,
        (s: string) => `$${s}$`,
        (s: string) => `$${s}\\,\\mathrm{cm}^{2}$`,
      ]) {
        for (let seed = 0; seed < 300; seed += 1) {
          const source = stem(wrap(answer));
          let rngCalls = 0;
          const rng = createRng(seed);
          const mcq = asMultipleChoice(source, () => {
            rngCalls += 1;
            return rng();
          });
          const choices = options(mcq.content);
          const keys = choices.map((value) => valueKey(decimal(value)));
          expect(choices).toHaveLength(5);
          expect(new Set(keys).size, mcq.content).toBe(5);
          expect(
            keys.filter((key) => key === valueKey(decimal(answer))),
          ).toHaveLength(1);
          expect(choices["①②③④⑤".indexOf(mcq.answer)]).toBe(source.answer);
          for (const choice of choices) {
            expect(decimal(choice).places, choice).toBe(decimal(answer).places);
            expect(choice.replace(/-?\d+\.\d+/, "N")).toBe(wrap("N"));
          }
          expect(rngCalls, "후보 네 번 + Fisher–Yates 네 번").toBe(8);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(SAMPLES.length * 3 * 300);
  }, 60_000);

  it("삼각비 18의 씨앗 0~299도 정답은 하나이고 보기 정밀도가 같다", () => {
    let checked = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const source = generateMiddleProblem("3-2|삼각비|18", seed);
      const mcq = asMultipleChoice(
        { ...source, familyKey: "x", problemType: "활용" },
        createRng(0x9e37),
      );
      const values = options(mcq.content).map(decimal);
      expect(new Set(values.map(valueKey)).size, mcq.content).toBe(5);
      expect(
        values.filter(
          (value) => valueKey(value) === valueKey(decimal(source.answer)),
        ),
      ).toHaveLength(1);
      expect(values.map((value) => value.places)).toEqual(
        Array(5).fill(decimal(source.answer).places),
      );
      checked += 1;
    }
    expect(checked).toBe(300);
  });

  it("소수점 자리 이동은 다른 실수로 넷을 채울 수 있으면 뒤로 민다", () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const mcq = asMultipleChoice(stem("0.8290"), createRng(seed));
      expect(
        options(mcq.content).map((value) => valueKey(decimal(value))),
      ).not.toContain("829/100");
    }
  });

  it("생성기가 직접 낸 소수 오답도 표기만 다른 같은 값은 거절한다", () => {
    for (const distractors of [
      ["0.829", "0.8280", "0.8300", "0.8390"],
      ["0.828", "0.8280", "0.8300", "0.8390"],
    ]) {
      expect(() =>
        asMultipleChoice({ ...stem("0.8290"), distractors }, createRng(1)),
      ).toThrow();
    }
  });

  it("생성기가 직접 낸 유한소수는 정답 자릿수로 쓰고 정확히 못 쓰는 값은 거절한다", () => {
    const source = {
      ...stem("0.8290"),
      distractors: ["0.828", "0.83", "1", "0.8390"],
    };
    expect(
      options(asMultipleChoice(source, createRng(1)).content)
        .map(decimal)
        .map((v) => v.places),
    ).toEqual(Array(5).fill(4));
    expect(() =>
      asMultipleChoice(
        { ...source, distractors: ["0.828", "0.83", "0.83901", "0.8390"] },
        createRng(1),
      ),
    ).toThrow();
  });

  it("초등·중등 등록부에서 발견한 소수 문항류는 씨앗 0~99에서도 정답이 하나다", () => {
    const families = [
      ...elementaryUnits().flatMap((unit) =>
        listedForms(unit).map((form) => ({
          key: `elem:${unit.grade}|${unit.section}|${form.id}`,
          generate: (seed: number) =>
            generateElementaryForm(unit, seed, form.id),
        })),
      ),
      ...registeredTypes().map((entry) => ({
        key: `mid:${entry.key}`,
        generate: (seed: number) => generateMiddleProblem(entry.key, seed),
      })),
    ];
    const hasDecimalFirst = (answer: string) => /^\D*?-?\d+\.\d+/.test(answer);
    let discovered = 0;
    let checked = 0;
    for (const family of families) {
      // 유형 이름 목록을 손으로 옮기지 않는다. 모든 등록 문형의 세 씨앗을 본다.
      const first = [0, 1, 2].map((seed) => family.generate(seed));
      if (
        !first.some((p) => hasDecimalFirst(p.answer) && !hasChoices(p.content))
      )
        continue;
      discovered += 1;
      for (let seed = 0; seed < 100; seed += 1) {
        const source = family.generate(seed);
        if (!hasDecimalFirst(source.answer) || hasChoices(source.content))
          continue;
        const mcq = asMultipleChoice(
          { ...source, familyKey: family.key, problemType: "활용" },
          createRng(seed),
        );
        const values = options(mcq.content).map(decimal);
        expect(
          new Set(values.map(valueKey)).size,
          `${family.key}/${seed}: ${mcq.content}`,
        ).toBe(5);
        expect(
          values.filter(
            (v) => valueKey(v) === valueKey(decimal(source.answer)),
          ),
        ).toHaveLength(1);
        expect(values.map((v) => v.places)).toEqual(
          Array(5).fill(decimal(source.answer).places),
        );
        checked += 1;
      }
    }
    expect(families.length).toBeGreaterThan(3900);
    expect(discovered).toBeGreaterThan(150);
    expect(checked).toBeGreaterThan(15000);
  }, 120_000);
});
