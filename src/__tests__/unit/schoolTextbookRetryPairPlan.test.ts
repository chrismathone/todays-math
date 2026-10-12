import { describe, expect, it } from "vitest";
import type { Problem } from "@prisma/client";
import {
  matchesTextbookRetryInsertion,
  prepareTextbookRetryPair,
  textbookRetryExternalId,
  textbookRetrySourceFingerprint,
  type TextbookRetrySource,
} from "@/lib/import/schoolTextbook/retryPairPlan";

const source: TextbookRetrySource = {
  id: "2ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
  source: "school_textbook",
  unitId: "unit-1",
  familyKey: "solo:source-1",
  sourceMaterialId: "material-1",
  difficulty: "기본",
  problemType: "계산",
  questionType: "단답형",
  content: "$2+3$을 계산하시오.",
  answer: "$5$",
  solution: "$2+3=5$이다.",
  figureSvg: null,
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  pool: "shared",
  reviewStatus: "approved",
  directUseAllowed: true,
};
const draft = (slot: 1 | 2) => ({
  slot,
  content: `$${slot + 3}+3$을 계산하시오.`,
  answer: `$${slot + 6}$`,
  solution: `$${slot + 3}+3=${slot + 6}$이다.`,
  recipe: "addition-closed-test",
  mathEvidence: "두 정수의 덧셈을 독립 계산하여 확인함",
});
const prepare = (inputs: unknown[] = [draft(1), draft(2)], original = source) =>
  prepareTextbookRetryPair(
    original,
    textbookRetrySourceFingerprint(source),
    inputs,
  );

describe("교과서 복습 변형의 원문 연결과 적재 경계", () => {
  it("원문을 보존하고 같은 문항류의 서로 다른 두 자식을 검수 대기로 만든다", () => {
    const before = structuredClone(source);
    const { rows } = prepare([draft(2), draft(1)]);
    expect(source).toEqual(before);
    expect(rows.map((row) => row.externalId)).toEqual([
      textbookRetryExternalId(source.id, 1),
      textbookRetryExternalId(source.id, 2),
    ]);
    for (const row of rows)
      expect(row).toMatchObject({
        originProblemId: source.id,
        familyKey: source.familyKey,
        sourceMaterialId: source.sourceMaterialId,
        unitId: source.unitId,
        reviewStatus: "pending",
        directUseAllowed: false,
        source: "transformed",
      });
  });
  it.each([
    "content",
    "answer",
    "solution",
    "unitId",
    "familyKey",
    "sourceMaterialId",
  ] as const)("원문의 %s가 바뀐 뒤 이전 변형을 적재하지 않는다", (field) => {
    expect(() => prepare(undefined, { ...source, [field]: "changed" })).toThrow(
      "원문이 바뀌었다",
    );
  });
  it("원본 그림이나 보기 연결이 바뀌어도 이전 원문 지문을 거부한다", () => {
    expect(() =>
      prepare(undefined, { ...source, figureUrls: ["/figures/new.png"] }),
    ).toThrow("원문이 바뀌었다");
    expect(() =>
      prepare(undefined, { ...source, choiceFigureIndex: [1] }),
    ).toThrow("원문이 바뀌었다");
  });
  it("한 개만 생성되거나 같은 슬롯이 반복되면 쌍 전체를 거부한다", () => {
    expect(() => prepare([draft(1)])).toThrow("변형 두 개");
    expect(() => prepare([draft(1), draft(1)])).toThrow("번호 1과 2");
  });
  it("공백으로만 구별한 복제나 원문 재출제를 변형으로 인정하지 않는다", () => {
    expect(() =>
      prepare([draft(1), { ...draft(2), content: ` ${draft(1).content} ` }]),
    ).toThrow("달라야");
    expect(() =>
      prepare([{ ...draft(1), content: source.content }, draft(2)]),
    ).toThrow("달라야");
  });
  it("깨진 수식과 제어문자, 재사용 원본 그림을 거부한다", () => {
    expect(() =>
      prepare([
        { ...draft(1), content: "$\\frac{}{}$을 계산하시오." },
        draft(2),
      ]),
    ).toThrow();
    expect(() =>
      prepare([{ ...draft(1), solution: "TAB\times" }, draft(2)]),
    ).toThrow("제어문자");
    expect(() =>
      prepare([
        {
          ...draft(1),
          content: "[그림] 값을 구하시오.",
          figureUrls: ["/figures/original.png"],
          figureDims: [100, 100],
          figureSourceMm: [25],
          choiceFigureIndex: [0],
        },
        draft(2),
      ]),
    ).toThrow("원본 그림 URL");
  });
  it("사람이 승인한 동일 변형은 재적재하지 않고 수정한 변형도 덮어쓰지 않는다", () => {
    const planned = prepare().rows[0]!;
    const stored = {
      ...planned,
      reviewStatus: "approved",
      directUseAllowed: true,
    } as Problem;
    expect(matchesTextbookRetryInsertion(stored, planned)).toBe(true);
    expect(
      matchesTextbookRetryInsertion(
        { ...stored, content: "사람이 고친 본문" },
        planned,
      ),
    ).toBe(false);
    expect(
      matchesTextbookRetryInsertion(
        { ...stored, originProblemId: "other" },
        planned,
      ),
    ).toBe(false);
  });
});
