import { describe, expect, it } from "vitest";
import type { ExamStudyDraft } from "@/contracts/examStudy.contract";
import {
  deriveStudyMultipleChoice,
  legacyStudyFamilies,
} from "@/lib/examStudy/adapters";
import { REINFORCEMENT_IDS } from "@/lib/examStudy/legacyReinforcement";
import {
  printedStatementCount,
  selectedStudyAnswer,
  countValue,
} from "@/lib/examStudy/studyChoiceBounds";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { contentDigest, logicalKey } from "@/lib/examStudy/identity";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { generateMiddleProblem } from "@/lib/middle/generate";

const families = legacyStudyFamilies();
function countDraft(n: number, answer: number): ExamStudyDraft {
  return {
    content: `다음 중 옳은 것의 개수를 구하시오.\n${Array.from({ length: n }, (_, i) => `$x+${i}=x+${i < answer ? i : i + n + 1}$`).join(", ")}`,
    answer: `$${answer}$개`,
    solution: "각 진술을 확인한다.",
    parameters: { statements: n, target: answer },
    questionType: "단답형",
    difficulty: "기본",
    difficultyBasis: ["유한 진술 집합"],
    figureSpec: null,
  };
}
function assertBounds(mc: ExamStudyDraft, n: number, answer: string): void {
  const choices = parseProblemContent(mc.content).choices;
  const values = choices.map(countValue);
  expect(values).toHaveLength(5);
  expect(new Set(values).size).toBe(5);
  expect(values.every((v) => v >= 0 && v <= n)).toBe(true);
  expect(selectedStudyAnswer(mc).answer).toBe(answer);
  expect(
    choices.filter((s) => countValue(s) === countValue(answer)),
  ).toHaveLength(1);
}

describe("examStudy statement-count choice bounds", () => {
  it.each([
    ["06", 1638860089, 0],
    ["09", 648800451, 0],
    ["09", 1360768244, 0],
  ])(
    "fixes the actual old EQ%s family-seed %s repro without modifying the general engine",
    (type, seed, variant) => {
      const p = generateMiddleProblem(
        `1-1|일차방정식의 풀이|${type}`,
        Number(seed),
        Number(variant),
      );
      const item = {
        ...countDraft(5, 2),
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        difficulty: p.difficulty,
      };
      expect(printedStatementCount(item.content)).toBe(5);
      for (let order = 0; order < 20; order++) {
        const mc = deriveStudyMultipleChoice(
          item,
          `legacy-EQ${type}`,
          order + 71,
        );
        assertBounds(mc, 5, item.answer);
        expect(contentDigest(mc)).toBe(contentDigest(item));
      }
    },
  );
  it("covers every admissible answer at counts 4..12 and 20 option orders, including 0/n", () => {
    let total = 0;
    for (let n = 4; n <= 12; n++)
      for (let a = 0; a <= n; a++)
        for (let seed = 0; seed < 20; seed++) {
          const item = countDraft(n, a),
            mc = deriveStudyMultipleChoice(item, "finite-count", seed);
          assertBounds(mc, n, item.answer);
          expect(mc.parameters).toEqual(item.parameters);
          total++;
        }
    expect(total).toBe(1620);
  });
  it("fails closed when five distinct possible choices do not exist or the claimed answer is impossible", () => {
    for (let n = 1; n < 4; n++)
      for (let a = 0; a <= n; a++)
        expect(() =>
          deriveStudyMultipleChoice(countDraft(n, a), "small-count", 71),
        ).toThrow();
    for (const a of [-1, 6, 999])
      expect(() =>
        deriveStudyMultipleChoice(countDraft(5, a), "bad-answer", 71),
      ).toThrow();
    expect(() =>
      deriveStudyMultipleChoice(
        { ...countDraft(5, 2), answer: "$2.5$개" },
        "fractional-count",
        71,
      ),
    ).toThrow();
  });
  it("rejects injected out-of-range, equivalent, fractional and malformed distractors", () => {
    const p = countDraft(5, 2);
    for (const distractors of [
      ["$0$개", "$1$개", "$3$개", "$6$개"],
      ["$-1$개", "$1$개", "$3$개", "$4$개"],
      ["$0$개", "$1$개", "$3$개", "$\\frac{6}{2}$개"],
      ["$0$개", "$1$개", "$3$개", "$2.5$개"],
      ["$0$개", "$1$개", "$3$개", "삼각형"],
      ["$0$개", "$1$개", "$3$개", "$\\frac{4}{2}$개"],
    ])
      expect(() =>
        deriveStudyMultipleChoice({ ...p, distractors }, "injection", 71),
      ).toThrow();
    assertBounds(
      deriveStudyMultipleChoice(
        { ...p, distractors: ["$0$개", "$1$개", "$3$개", "$5$개"] },
        "valid-given",
        71,
      ),
      5,
      p.answer,
    );
  });
  it.each([REINFORCEMENT_IDS.equality, REINFORCEMENT_IDS.classification])(
    "runs request seeds 71/20261019 through the actual core and rejects mutated returned choices: %s",
    async (id) => {
      const f = families.find((f) => f.id === id)!,
        requirement = f.fulfills[0]!.requirement;
      expect(f.formats).toContain("객관식");
      for (const seed of [71, 20261019]) {
        const out = await generateExamStudy(
          {
            course: "중1",
            familyIds: [id],
            requirementIds: [requirement],
            count: 3,
            maxPerFamily: 3,
            seed,
            format: "객관식",
          },
          { families: [f], profiles: [] },
        );
        expect(out.questions).toHaveLength(3);
        expect(out.requirements[0]!.status).toBe("full");
        for (const q of out.questions) {
          const base = f.generate(q.seed, q.variant);
          assertBounds(q, 5, base.answer);
          expect(f.verify(q).valid).toBe(true);
          expect(logicalKey(f, f.canonicalParams(q))).toBe(q.logicalKey);
          const options = parseProblemContent(q.content).choices;
          for (const bad of ["$6$개", "$-1$개", "$1.5$개", options[1]!]) {
            expect(
              f.verify({
                ...q,
                content: q.content.replace(`① ${options[0]}`, `① ${bad}`),
              }).valid,
            ).toBe(false);
          }
        }
      }
    },
  );
  it("keeps non-list numeric count derivation and canonical keys unchanged", () => {
    const item = {
      ...countDraft(5, 2),
      content: "서로 다른 두 상자에 연필을 넣는 방법의 수를 구하시오.",
    };
    expect(printedStatementCount(item.content)).toBeUndefined();
    const mc = deriveStudyMultipleChoice(item, "non-list-count", 71);
    expect(mc.questionType).toBe("객관식");
    expect(mc.parameters).toEqual(item.parameters);
  });
});
