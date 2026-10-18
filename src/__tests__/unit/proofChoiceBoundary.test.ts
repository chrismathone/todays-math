import { describe, expect, it } from "vitest";

import {
  normalizeOcrText,
  parseProblemContent,
  parseProblemContentLabeled,
} from "@/lib/problem/parseProblemContent";

import {
  PROOF_CHOICE_CASES,
  withCircledChoices,
} from "./__fixtures__/proofChoiceBoundary";

describe("FLOW-F01: reasoning references before a separate choice block", () => {
  for (const fixture of PROOF_CHOICE_CASES) {
    it(`preserves the whole authored proof: ${fixture.observed.code}`, () => {
      const raw = withCircledChoices(fixture.stem, fixture.choices);
      const parsed = parseProblemContentLabeled(raw);
      expect(parsed).toEqual({
        question: normalizeOcrText(fixture.stem),
        choices: fixture.choices,
        labels: [1, 2, 3, 4, 5],
        dropped: [],
        deduped: false,
      });
      expect(parseProblemContent(raw)).toEqual({
        question: parsed.question,
        choices: parsed.choices,
      });
      for (const mark of ["①", "②", "③", "④", "⑤"])
        expect(parsed.question).toContain(mark);
      expect(parsed.question).toContain("[그림]");
    });
  }

  it.each([4, 6])(
    "accepts a verified tail of %i choices without a last-five rule",
    (n) => {
      const stem = PROOF_CHOICE_CASES[1].stem;
      const choices = Array.from({ length: n }, (_, i) => `합성 보기 ${i + 1}`);
      expect(parseProblemContent(withCircledChoices(stem, choices))).toEqual({
        question: normalizeOcrText(stem),
        choices,
      });
    },
  );

  it("also preserves a complete referenced ①..④ reasoning run", () => {
    const stem = PROOF_CHOICE_CASES[1].stem
      .replace("①~⑤", "①~④")
      .replace(/\n⑤[^\n]*$/, "");
    const choices = PROOF_CHOICE_CASES[1].choices;
    expect(parseProblemContent(withCircledChoices(stem, choices))).toEqual({
      question: normalizeOcrText(stem),
      choices,
    });
  });

  it.each([4, 5])(
    "keeps two different complete %i-choice blocks visible to QA",
    (n) => {
      const first = Array.from({ length: n }, (_, i) => `첫 묶음 ${i + 1}`);
      const second = Array.from({ length: n }, (_, i) => `다른 묶음 ${i + 1}`);
      const raw = withCircledChoices(
        withCircledChoices("적절한 항목은?", first),
        second,
      );
      expect(parseProblemContentLabeled(raw)).toMatchObject({
        choices: [...first, ...second],
        labels: [...first.map((_, i) => i + 1), ...second.map((_, i) => i + 1)],
        deduped: false,
      });
    },
  );

  it.each(["별개의 물음에서 구할 값은?", "별개의 값을 구하시오."])(
    "rejects a proof joined to a new prompt: %s",
    (prompt) => {
      const { stem, choices } = PROOF_CHOICE_CASES[1];
      const parsed = parseProblemContentLabeled(
        withCircledChoices(`${stem}\n${prompt}`, choices),
      );
      expect(parsed.choices).toHaveLength(10);
      expect(parsed.labels).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    },
  );

  it.each([
    [
      "without a reasoning instruction",
      (s: string) => s.replace("풀이 과정", "조건 목록"),
    ],
    ["without an explicit range", (s: string) => s.replace("①~⑤", "각 표시")],
    [
      "without a marker inside parentheses",
      (s: string) =>
        s.replace("이유는(\n③", "이유는\n③").replace("때문)이다", "때문이다"),
    ],
    [
      "with only a formula containing the range",
      (s: string) => s.replace("①~⑤", "$①~⑤$"),
    ],
    [
      "with only a formula containing the opening parenthesis",
      (s: string) => s.replace("이유는(\n③", "이유는 $(x+1)$\n③"),
    ],
  ] as const)("does not excuse earlier choices %s", (_, change) => {
    const { stem, choices } = PROOF_CHOICE_CASES[1];
    expect(
      parseProblemContentLabeled(withCircledChoices(change(stem), choices))
        .labels,
    ).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  });

  it("keeps formula-internal numbers and newlines inside the stem", () => {
    const stem = PROOF_CHOICE_CASES[1].stem.replace(
      "이제 별도의 계산 기록을 살펴본다.",
      "이제 식 $x=1\n①+2\n②+3$과 $f(1)$을 살펴본다.",
    );
    expect(
      parseProblemContent(
        withCircledChoices(stem, ["가", "나", "다", "라", "마"]),
      ).question,
    ).toBe(normalizeOcrText(stem));
  });

  it.each([
    [
      "subquestions",
      "다음 세부 물음에 답하여라.\n(1) 첫 값을 구하시오.\n(2) 둘째 값을 구하시오.",
      "다음 세부 물음에 답하여라.\n\n(1) 첫 값을 구하시오.\n\n(2) 둘째 값을 구하시오.",
    ],
    [
      "conditions",
      "주어진 조건을 읽는다.\n(가) 이름을 붙인다.\n(나) 순서를 적는다.",
      "주어진 조건을 읽는다.\n(가) 이름을 붙인다.\n(나) 순서를 적는다.",
    ],
    [
      "matching",
      "알맞게 연결하시오.\n⑴ 첫 대상\n⑵ 둘째 대상\n㉠ 첫 설명\n㉡ 둘째 설명",
      "알맞게 연결하시오.\n\n⑴ 첫 대상\n\n⑵ 둘째 대상\n㉠ 첫 설명\n㉡ 둘째 설명",
    ],
  ])("preserves normal %s before clean choices", (_, stem, question) => {
    const choices = ["가", "나", "다", "라", "마"];
    expect(parseProblemContent(withCircledChoices(stem, choices))).toEqual({
      question,
      choices,
    });
  });

  it("keeps the existing recovery for three numbered conditions", () => {
    const stem = "조건을 읽는다.\n① 첫 조건\n② 둘째 조건\n③ 셋째 조건";
    const choices = [
      "첫 보기",
      "둘째 보기",
      "셋째 보기",
      "넷째 보기",
      "다섯째 보기",
    ];
    expect(parseProblemContent(withCircledChoices(stem, choices))).toEqual({
      question: normalizeOcrText(stem),
      choices,
    });
  });

  it("keeps longer matching lists intact instead of taking five items", () => {
    const choices = [
      "대상 가",
      "대상 나",
      "대상 다",
      "대상 라",
      "대상 마",
      "대상 바",
      "대상 사",
    ];
    expect(
      parseProblemContent(
        withCircledChoices("설명과 알맞게 연결하시오.", choices),
      ),
    ).toEqual({
      question: "설명과 알맞게 연결하시오.",
      choices,
    });
  });

  it("does not reclassify an earlier numeric block as circled references", () => {
    const { stem, choices } = PROOF_CHOICE_CASES[1];
    const numericStem = stem.replace(
      /\n([①-⑤])/g,
      (_, mark: string) => `\n${mark.charCodeAt(0) - 0x2460 + 1}. `,
    );
    expect(
      parseProblemContentLabeled(withCircledChoices(numericStem, choices))
        .labels,
    ).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  });
});
