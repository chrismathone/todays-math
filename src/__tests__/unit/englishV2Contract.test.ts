// @vitest-environment node
/**
 * 오늘의 영어 2판 계약 — 모양 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 계약은 모양만 잠근다: 모르는 칸 거절 · 형식 판은 글자 그대로 2 · 정답은 표적에만 · 행위 기록 없는 «확정» 거절 ·
 * 임시 ID 거절. 뜻(자리 · ID 유일 · 보기 밖 정답)은 `englishV2Validate.test.ts`.
 * 표본은 우리가 지은 글이다(`src/mocks/englishV2Fixtures.ts`).
 */
import { describe, expect, it } from "vitest";

import {
  ENGLISH_GENERATED_TYPES,
  ENGLISH_QUESTION_TYPES,
  englishGenerateRequestSchema,
  englishSetCreateSchema,
} from "@/contracts/english.contract";
import {
  ENGLISH_SCHEMA_VERSIONS,
  ENGLISH_V2_INTERACTION_TYPES,
  ENGLISH_V2_ITEM_MAX,
  englishV2ConstraintSchema,
  englishV2DocumentSchema,
  englishV2IdSchema,
  englishV2RightsSchema,
} from "@/contracts/englishV2.contract";
import {
  V2_PASSAGE_TEXT,
  englishV1LegacySet,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

type Json = Record<string, unknown>;

/** 표본을 복사해 한 군데만 고친다 */
function edited(edit: (document: Json) => void): Json {
  const document = structuredClone(englishV2TwoTargetDocument()) as Json;
  edit(document);
  return document;
}
const item = (document: Json) => (document.items as Json[])[0]!;
const target = (document: Json, index: number) =>
  (item(document).targets as Json[])[index]!;

const rejects = (value: unknown) =>
  expect(englishV2DocumentSchema.safeParse(value).success).toBe(false);

describe("2판 계약 — 표본", () => {
  it("지문 하나 · 표적 둘 표본을 받는다 — 읽은 값이 넣은 값과 글자까지 같다(다듬지 않는다)", () => {
    const fixture = englishV2TwoTargetDocument();
    const parsed = englishV2DocumentSchema.parse(fixture);
    expect(parsed).toEqual(fixture);
    expect(parsed.items[0]!.targets).toHaveLength(2);
  });

  it("앞뒤 공백 · 줄바꿈이 든 지문도 한 글자 안 바뀐다 — 자리가 밀리지 않는다", () => {
    const text = `  ${V2_PASSAGE_TEXT}\r\n`;
    const document = edited((d) => {
      (d.passages as Json[])[0]!.text = text;
    });
    const parsed = englishV2DocumentSchema.parse(document);
    expect(parsed.passages[0]!.text).toBe(text);
  });
});

describe("2판 계약 — 형식 판", () => {
  it("읽을 줄 아는 판은 1과 2뿐이다", () => {
    expect([...ENGLISH_SCHEMA_VERSIONS]).toEqual([1, 2]);
  });

  it.each([1, 3, "2", null, undefined])(
    "schemaVersion 이 %j 면 2판 문서가 아니다",
    (version) => {
      rejects(
        edited((d) => {
          if (version === undefined) delete d.schemaVersion;
          else d.schemaVersion = version;
        }),
      );
    },
  );
});

describe("2판 계약 — 모르는 칸은 거절한다(조용히 버리지 않는다)", () => {
  it.each([
    ["문서", (d: Json) => (d.note = "x")],
    ["지문", (d: Json) => ((d.passages as Json[])[0]!.translation = "x")],
    ["문항", (d: Json) => (item(d).difficulty = "상")],
    ["표적", (d: Json) => (target(d, 0).score = 2)],
    ["자리", (d: Json) => ((target(d, 0).span as Json).page = 1)],
    [
      "보기",
      (d: Json) => ((target(d, 0).alternatives as Json[])[0]!.correct = true),
    ],
    ["해설", (d: Json) => ((target(d, 0).explanation as Json).text = "x")],
    ["출처", (d: Json) => ((d.provenance as Json).url = "https://x")],
    ["권한", (d: Json) => ((d.rights as Json).note = "x")],
  ])("%s 에 낯선 칸", (_where, edit) => {
    rejects(edited(edit));
  });
});

describe("2판 계약 — 정답은 표적마다", () => {
  it("문항에 answer 칸을 두면 거절한다 — 여러 정답을 한 글자열에 합치지 않는다", () => {
    rejects(edited((d) => (item(d).answer = "a, b")));
  });

  it("표적의 answer 가 빠지면 거절한다", () => {
    rejects(edited((d) => delete target(d, 1).answer));
  });

  it("표적의 answer 는 보기 열쇠 하나다 — 글자열이나 배열이 아니다", () => {
    rejects(edited((d) => (target(d, 0).answer = "a")));
    rejects(edited((d) => (target(d, 0).answer = { alternativeId: ["a"] })));
  });

  it("보기는 둘 이상 다섯 이하", () => {
    rejects(
      edited((d) => {
        target(d, 0).alternatives = [{ alternativeId: "a", text: "one" }];
      }),
    );
    rejects(
      edited((d) => {
        target(d, 0).alternatives = ["a", "b", "c", "d", "e", "f"].map(
          (alternativeId) => ({ alternativeId, text: alternativeId }),
        );
      }),
    );
  });
});

describe("2판 계약 — 구현 안 된 것을 된다고 하지 않는다", () => {
  it("상호작용은 inline_alternatives 하나뿐이다", () => {
    expect([...ENGLISH_V2_INTERACTION_TYPES]).toEqual(["inline_alternatives"]);
    rejects(edited((d) => (item(d).interactionType = "ordering")));
    rejects(edited((d) => (item(d).interactionType = "서술형")));
  });

  it("inline_alternatives 문항은 서술 조건(constraints)을 받지 않는다", () => {
    rejects(
      edited((d) => {
        item(d).constraints = [{ kind: "word_count", min: 5, max: 9 }];
      }),
    );
  });

  it("조건의 모양은 정해져 있다 — 배점 · 부분점수 · 감점 칸은 없다", () => {
    expect(
      englishV2ConstraintSchema.safeParse({
        kind: "word_count",
        min: 5,
        max: 9,
      }).success,
    ).toBe(true);
    expect(
      englishV2ConstraintSchema.safeParse({
        kind: "required_words",
        words: ["patience"],
        inflectionAllowed: false,
      }).success,
    ).toBe(true);
    for (const scoring of [
      { kind: "partial_credit", points: 2 },
      { kind: "word_count", min: 5, max: 9, points: 2 },
      { kind: "word_count", min: 5, max: 9, deduction: 1 },
    ])
      expect(englishV2ConstraintSchema.safeParse(scoring).success).toBe(false);
  });

  it("🔴 1판의 생성 유형 · 문항 유형 목록에 새 상호작용이 들어가지 않았다", () => {
    for (const type of ENGLISH_V2_INTERACTION_TYPES) {
      expect(ENGLISH_GENERATED_TYPES as string[]).not.toContain(type);
      expect(ENGLISH_QUESTION_TYPES as readonly string[]).not.toContain(type);
    }
  });
});

describe("2판 계약 — 실제 행위 기록이 있을 때만", () => {
  it("teacher_confirmed 해설은 확정한 사람 · 시각이 있어야 한다", () => {
    rejects(
      edited((d) => {
        target(d, 0).explanation = { status: "teacher_confirmed", text: "x" };
      }),
    );
  });

  it("none 은 글이 없고, source · ai_suggested 는 글이 있어야 한다", () => {
    rejects(
      edited((d) => (target(d, 0).explanation = { status: "none", text: "x" })),
    );
    rejects(edited((d) => (target(d, 0).explanation = { status: "source" })));
    rejects(
      edited(
        (d) =>
          (target(d, 0).explanation = { status: "ai_suggested", text: "  " }),
      ),
    );
    const ok = edited((d) => {
      target(d, 0).explanation = { status: "ai_suggested", text: "AI 해설" };
    });
    expect(englishV2DocumentSchema.safeParse(ok).success).toBe(true);
  });

  it("모르는 해설 상태(검토 완료 · verified …)는 거절한다", () => {
    for (const status of ["검토 완료", "verified", "teacher", ""])
      rejects(
        edited((d) => (target(d, 0).explanation = { status, text: "x" })),
      );
  });

  it("정답 확인 true 는 확인한 사람 · 시각이 있어야 한다", () => {
    rejects(
      edited((d) => (target(d, 0).answerVerification = { verified: true })),
    );
    rejects(edited((d) => (target(d, 0).answerVerification = true)));
    rejects(edited((d) => delete target(d, 0).answerVerification));
  });
});

describe("2판 계약 — 사용 권한 · 출처", () => {
  it("unknown · reference_only 는 허락된 용도가 없다", () => {
    for (const rightsStatus of ["unknown", "reference_only"]) {
      expect(
        englishV2RightsSchema.safeParse({ rightsStatus, allowedUses: [] })
          .success,
      ).toBe(true);
      expect(
        englishV2RightsSchema.safeParse({
          rightsStatus,
          allowedUses: ["teacher_review"],
        }).success,
      ).toBe(false);
    }
  });

  it("approved 는 용도를 하나 이상 적어야 하고, 같은 용도를 두 번 적지 못한다", () => {
    const parse = (allowedUses: string[]) =>
      englishV2RightsSchema.safeParse({ rightsStatus: "approved", allowedUses })
        .success;
    expect(parse(["teacher_review", "generation_input"])).toBe(true);
    expect(parse([])).toBe(false);
    expect(parse(["teacher_review", "teacher_review"])).toBe(false);
    expect(parse(["everything"])).toBe(false);
  });

  it("출처는 자료의 개정이거나 «직접 넣은 글» 선언이다 — 선언에는 누가 · 언제 · 근거가 다 있어야 한다", () => {
    const material = edited((d) => {
      d.provenance = {
        kind: "material",
        sourceId: "20000000-0000-4000-8000-0000000000f1",
        materialId: "20000000-0000-4000-8000-0000000000f2",
        materialRevision: 2,
      };
    });
    expect(englishV2DocumentSchema.safeParse(material).success).toBe(true);
    rejects(edited((d) => delete (d.provenance as Json).basis));
    rejects(edited((d) => delete (d.provenance as Json).declaredAt));
    rejects(edited((d) => (d.provenance = { kind: "legacy_unknown" })));
    rejects(edited((d) => delete d.provenance));
  });
});

describe("2판 계약 — ID", () => {
  it("영구 ID 는 uuid 다 — 1판 읽기 변환의 임시 ID 는 통과하지 못한다", () => {
    expect(
      englishV2IdSchema.safeParse("20000000-0000-4000-8000-0000000000c1")
        .success,
    ).toBe(true);
    for (const id of ["legacy:set:q:0", "q1", "", 1])
      expect(englishV2IdSchema.safeParse(id).success).toBe(false);
    rejects(edited((d) => (target(d, 0).targetId = "legacy:x:q:0")));
    rejects(edited((d) => (item(d).itemId = "1")));
  });
});

describe("1판 상한은 그대로다 (2판을 더하면서 늘리지 않았다)", () => {
  it("생성 요청 문항 수는 8 까지", () => {
    const request = {
      examId: "21000000-0000-4000-8000-0000000000e1",
      mode: "new",
      topic: "school garden",
      difficulty: "표준",
      count: 9,
      words: 200,
      types: ["주제"],
    };
    expect(englishGenerateRequestSchema.safeParse(request).success).toBe(false);
    expect(
      englishGenerateRequestSchema.safeParse({ ...request, count: 8 }).success,
    ).toBe(true);
  });

  it("세트 문항 수는 30 까지 — 2판 문서도 같은 30", () => {
    const { passage, questions } = englishV1LegacySet();
    const many = (count: number) => ({
      title: "세트",
      source: "manual",
      passage,
      questions: Array.from({ length: count }, () => questions[0]),
    });
    expect(englishSetCreateSchema.safeParse(many(30)).success).toBe(true);
    expect(englishSetCreateSchema.safeParse(many(31)).success).toBe(false);
    expect(ENGLISH_V2_ITEM_MAX).toBe(30);
  });
});
