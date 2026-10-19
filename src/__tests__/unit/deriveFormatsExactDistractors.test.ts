import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/elementary/rng";
import {
  asMultipleChoice,
  numericMistakes,
  surdMistakes,
  tidyFallbackMistakes,
} from "@/lib/engine/deriveFormats";
import { exactChoiceValue } from "@/lib/math/exactChoiceValue";

/**
 * 근호·분수에 단위가 붙은 정답에서 «맨 앞의 수»만 흔들면 지면에 덜 정리된 보기가 나간다 —
 * `$0\sqrt{3}\,\mathrm{cm}$` · `$1\sqrt{3}$` · `$\dfrac{\sqrt{4}}{2}$` · `$\dfrac{30}{2}\,\mathrm{cm}$`.
 * 학생이 계산 없이 모양만 보고 지워 낸다(2026-10-14 중등 엔진 21,888판 훑기 — 33유형 225판).
 */
const values = (answer: string) => numericMistakes(answer).map((m) => m.value);
const unsimplified = (v: string) => exactChoiceValue(v)?.unsimplified ?? [];

describe("numericMistakes — 정리된 정답에는 정리된 오답만", () => {
  it.each([
    "$2\\sqrt{3}\\,\\mathrm{cm}$",
    "$\\dfrac{\\sqrt{3}}{2}$",
    "$\\dfrac{36}{5}\\,\\mathrm{cm}$",
    "$\\dfrac{31}{2}\\,\\mathrm{cm}$",
    "$\\dfrac{5\\sqrt{3}}{3}$",
    "$3\\sqrt{2}$",
    "$-\\dfrac{\\sqrt{7}}{7}$",
  ])("%s 의 오답에 덜 정리된 꼴이 없다", (answer) => {
    expect(unsimplified(answer)).toEqual([]);
    const got = values(answer);
    expect(got.length).toBeGreaterThan(0);
    for (const v of got)
      expect({ v, issues: unsimplified(v) }).toEqual({ v, issues: [] });
  });

  it("계수 0·1 과 근호 안의 제곱수를 내지 않는다", () => {
    const got = values("$2\\sqrt{3}\\,\\mathrm{cm}$");
    expect(got).not.toContain("$1\\sqrt{3}\\,\\mathrm{cm}$");
    expect(got).not.toContain("$0\\sqrt{3}\\,\\mathrm{cm}$");
    expect(got).toContain("$3\\sqrt{3}\\,\\mathrm{cm}$");
    const half = values("$\\dfrac{\\sqrt{3}}{2}$");
    expect(half).not.toContain("$\\dfrac{\\sqrt{4}}{2}$");
    expect(half).not.toContain("$\\dfrac{\\sqrt{1}}{2}$");
    expect(half).toContain("$\\dfrac{\\sqrt{2}}{2}$");
  });

  it("근호의 흔한 실수(맞바꾸기 · 접어 넣기 · 근호 안 ±1)를 보충 후보로 낸다", () => {
    expect(
      surdMistakes("$2\\sqrt{3}\\,\\mathrm{cm}$").map((m) => m.value),
    ).toEqual([
      "$3\\sqrt{2}\\,\\mathrm{cm}$",
      "$\\sqrt{6}\\,\\mathrm{cm}$",
      "$2\\sqrt{4}\\,\\mathrm{cm}$",
      "$2\\sqrt{2}\\,\\mathrm{cm}$",
    ]);
    // 보충 후보도 같은 거름을 지난다 — 덜 정리된 2√4 는 빠진다.
    const fill = tidyFallbackMistakes("$2\\sqrt{3}\\,\\mathrm{cm}$").map(
      (m) => m.value,
    );
    expect(fill).toEqual([
      "$3\\sqrt{2}\\,\\mathrm{cm}$",
      "$\\sqrt{6}\\,\\mathrm{cm}$",
      "$2\\sqrt{2}\\,\\mathrm{cm}$",
    ]);
    expect(surdMistakes("$7$")).toEqual([]);
    // 계수 없는 근호: 계수 2·3 · 근호 빠뜨리기(표준편차 ↔ 분산) · 반으로
    expect(
      surdMistakes("$\\sqrt{2}\\,\\mathrm{점}$").map((m) => m.value),
    ).toEqual([
      "$\\sqrt{3}\\,\\mathrm{점}$",
      "$2\\sqrt{2}\\,\\mathrm{점}$",
      "$3\\sqrt{2}\\,\\mathrm{점}$",
      "$2\\,\\mathrm{점}$",
      "$\\frac{\\sqrt{2}}{2}\\,\\mathrm{점}$",
    ]);
    // 분수 정답은 분자 ±2·±1·±4 · 분모 ±1·±2 가운데 기약인 것만
    expect(
      tidyFallbackMistakes("$\\dfrac{9}{2}\\,\\mathrm{cm}$").map(
        (m) => m.value,
      ),
    ).toEqual([
      "$\\dfrac{11}{2}\\,\\mathrm{cm}$",
      "$\\dfrac{7}{2}\\,\\mathrm{cm}$",
      "$\\dfrac{13}{2}\\,\\mathrm{cm}$",
      "$\\dfrac{5}{2}\\,\\mathrm{cm}$",
      "$\\dfrac{9}{4}\\,\\mathrm{cm}$",
    ]);
    // 정답부터 덜 정리된 꼴이면 보충하지 않는다
    expect(tidyFallbackMistakes("$\\sqrt{27}$")).toEqual([]);
  });

  it("후보가 넉넉하면 보충 후보를 쓰지 않는다 — 덜 정리된 보기가 없던 판은 그대로", () => {
    // `$\dfrac{\sqrt{3}}{2}$` 은 거른 뒤에도 넷이 넘는다: 보기는 numericMistakes 에서만 온다.
    const own = new Set(values("$\\dfrac{\\sqrt{3}}{2}$"));
    for (let seed = 1; seed <= 20; seed += 1) {
      const mc = asMultipleChoice(
        {
          content: "값을 구하시오.",
          answer: "$\\dfrac{\\sqrt{3}}{2}$",
          solution: "",
          familyKey: "t",
          problemType: "계산",
        },
        createRng(seed),
      );
      const wrong = mc.content
        .split("\n")
        .slice(1)
        .map((l) => l.slice(1).trim())
        .filter((c) => c !== "$\\dfrac{\\sqrt{3}}{2}$");
      for (const w of wrong) expect(own.has(w)).toBe(true);
    }
  });

  it("정답부터 덜 정리된 꼴이면(그것이 묻는 것이면) 손대지 않는다", () => {
    // 「$3\sqrt{3}$ 을 $\sqrt{a}$ 꼴로」의 정답은 $\sqrt{27}$ 이다 — 오답도 같은 꼴이어야 한다.
    expect(values("$\\sqrt{27}$")).toEqual(
      expect.arrayContaining(["$\\sqrt{28}$", "$\\sqrt{26}$", "$\\sqrt{25}$"]),
    );
  });

  it("값이 정답과 같은 보기를 내지 않는다", () => {
    for (const answer of [
      "$\\dfrac{1}{2}$",
      "$2\\sqrt{2}$",
      "$\\dfrac{3\\sqrt{2}}{2}\\,\\mathrm{cm}$",
    ]) {
      const key = exactChoiceValue(answer)!.key;
      for (const v of values(answer))
        expect(exactChoiceValue(v)?.key).not.toBe(key);
    }
  });
});

describe("asMultipleChoice — 보기 다섯은 값으로도 서로 다르다", () => {
  it("근호 정답의 객관식 50판에 덜 정리된 보기 · 같은 값 보기가 없다", () => {
    for (const answer of [
      "$2\\sqrt{3}\\,\\mathrm{cm}$",
      "$\\dfrac{\\sqrt{3}}{2}$",
      "$4\\sqrt{2}$",
    ]) {
      for (let seed = 1; seed <= 50; seed += 1) {
        const mc = asMultipleChoice(
          {
            content: "값을 구하시오.",
            answer,
            solution: "",
            familyKey: "t",
            problemType: "계산",
          },
          createRng(seed),
        );
        const choices = mc.content
          .split("\n")
          .slice(1)
          .map((l) => l.slice(1).trim());
        expect(choices).toHaveLength(5);
        const keys = choices.map((c) => exactChoiceValue(c)?.key);
        expect(new Set(keys).size).toBe(5);
        for (const c of choices)
          expect({ c, issues: unsimplified(c) }).toEqual({ c, issues: [] });
      }
    }
  });

  it("생성기가 낸 오답이 정답과 값이 같으면(글자가 달라도) 던진다", () => {
    expect(() =>
      asMultipleChoice(
        {
          content: "값을 구하시오.",
          answer: "$2\\sqrt{2}$",
          solution: "",
          familyKey: "t",
          problemType: "계산",
          distractors: [
            "$\\sqrt{8}$",
            "$3\\sqrt{2}$",
            "$\\sqrt{2}$",
            "$4\\sqrt{2}$",
          ],
        },
        createRng(1),
      ),
    ).toThrow();
  });
});
