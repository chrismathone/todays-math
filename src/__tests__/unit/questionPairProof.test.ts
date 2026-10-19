import { describe, expect, it } from "vitest";
import {
  QUESTION_IDENTITY_FIELDS,
  proveQuestionPair,
  type QuestionPairRow,
} from "@/lib/problem/questionPairProof";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { questionFormatWithoutContent } from "@/lib/problem/questionFormat";

const base: QuestionPairRow = {
  id: "sa",
  externalId: "engine-mid:unit|01|s1|v0|단답형",
  questionType: "단답형",
  unitId: "u",
  source: "manual",
  familyKey: "mid:unit|01",
  difficulty: "기본",
  problemType: "계산",
  originProblemId: null,
  sourceMaterialId: null,
  content: "$x+1=3$",
  answer: "$2$",
  solution: "$x=2$",
  figureSvg: null,
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  figureSource: null,
};
const mc: QuestionPairRow = {
  ...base,
  id: "mc",
  externalId: "engine-mid:unit|01|s1|v0|객관식",
  questionType: "객관식",
  content: "$x+1=3$\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$",
  answer: "②",
};
describe("strict sufficient pair proof", () => {
  it("proves only the exact generated pair and preserves standalone fallback identity", () => {
    const proof = proveQuestionPair([base, mc]);
    expect(proof.ok).toBe(true);
    if (!proof.ok) throw Error("fixture");
    expect(proof.key).toMatch(/^q:v1:[a-f0-9]{64}$/);
    expect(questionIdOf({ id: "old" })).toBe("row:old");
    expect(
      questionFormatWithoutContent({ ...mc, questionGroupKey: proof.key }),
    ).toBe("multiple_choice");
    expect(
      questionFormatWithoutContent({ ...mc, questionGroupKey: null }),
    ).toBeNull();
  });
  it.each(QUESTION_IDENTITY_FIELDS)(
    "refuses missing actual %s evidence",
    (field) => {
      const incomplete = { ...mc, [field]: undefined };
      expect(
        proveQuestionPair([base, incomplete as unknown as QuestionPairRow]),
      ).toMatchObject({ ok: false, reason: `missingEvidence:${field}` });
    },
  );
  it.each([
    "unitId",
    "source",
    "familyKey",
    "difficulty",
    "problemType",
    "originProblemId",
    "sourceMaterialId",
    "solution",
    "figureSvg",
    "figureUrls",
    "figureDims",
    "figureSourceMm",
    "choiceFigureIndex",
    "figureSource",
  ] as const)("refuses %s disagreement instead of normalizing it", (field) => {
    const before = mc[field];
    const value = Array.isArray(before)
      ? [...before, "different"]
      : before == null
        ? "different"
        : `${before} different`;
    expect(
      proveQuestionPair([
        base,
        { ...mc, [field]: value } as unknown as QuestionPairRow,
      ]).ok,
    ).toBe(false);
  });
  it("does not merge another same-family seed or replace an existing key", () => {
    expect(
      proveQuestionPair([
        base,
        { ...mc, externalId: mc.externalId!.replace("s1", "s2") },
      ]).ok,
    ).toBe(false);
    expect(
      proveQuestionPair([
        base,
        { ...mc, questionGroupKey: `q:v1:${"f".repeat(64)}` },
      ]),
    ).toMatchObject({ ok: false, reason: "existingKeyConflict" });
  });
  it.each([
    { ...mc, content: mc.content + "\n⑥ $6$" },
    { ...mc, content: mc.content.replace("①", "➀") },
    { ...mc, content: mc.content.replace("$x+1=3$", "$x + 1=3$") },
    { ...mc, answer: "③" },
  ])("requires exact five-choice/stem/answer correspondence", (row) => {
    expect(proveQuestionPair([base, row]).ok).toBe(false);
  });
  it("does not infer native MC/descriptive siblings or algebraic answer equivalence", () => {
    expect(proveQuestionPair([mc]).ok).toBe(false);
    expect(
      proveQuestionPair([
        base,
        { ...mc, externalId: "engine-native-desc:unit|01|s1" },
      ]).ok,
    ).toBe(false);
    expect(proveQuestionPair([{ ...base, answer: "2" }, mc]).ok).toBe(false);
    expect(
      proveQuestionPair([
        { ...base, answer: "➀" },
        { ...mc, content: mc.content.replace("$2$", "➀") },
      ]).ok,
    ).toBe(false);
  });
});
