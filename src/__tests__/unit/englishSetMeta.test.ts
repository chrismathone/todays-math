/**
 * 세트의 «만든 조건» (원장님 2026-10-01 «수학 문제처럼 생성된 영어 문제도 입력할 수 있는 모든 메타데이터 기억되게»).
 * 만들기 화면의 칸 그대로(제작 방식 · 소재 · 원문 · 난이도 · 문항 수 · 지문 길이 · 유형 · 불러온 자료)와 서버 AI 길이면 부른 모델 ·
 * 프롬프트 판. 옛 세트 · 손으로 만든 세트는 null.
 */
import { describe, expect, it } from "vitest";

import {
  englishSetCreateSchema,
  englishSetMetaSchema,
  englishSetSchema,
} from "@/contracts/english.contract";
import { englishMetaFromConditions, englishMetaLine } from "@/lib/english/meta";
import { serializeEnglishSet } from "@/lib/english/serialize";

const conditions = {
  mode: "variation" as const,
  topic: "",
  passage:
    "Many people believe that creativity arrives as a sudden flash of inspiration. Stories about inventors support this belief.",
  difficulty: "표준" as const,
  count: 6,
  words: 200,
  types: ["주제", "어법"] as ("주제" | "어법")[],
};

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  examId: "00000000-0000-4000-8000-000000000002",
  title: "세트",
  status: "초안",
  source: "deepseek",
  passage: "A passage that is long enough.",
  questions: [
    {
      type: "서술형",
      prompt: "요약하시오.",
      options: [],
      answer: "답",
      explanation: "",
      evidence: "",
    },
  ],
  revision: 1,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};

describe("englishSetMetaSchema", () => {
  it("만들기 칸 그대로 + 모델 · 프롬프트 판을 받는다 · 모르는 칸은 막는다", () => {
    const meta = englishMetaFromConditions("api", conditions, {
      model: "gpt-6-luna",
      promptVersion: "v3",
    });
    expect(englishSetMetaSchema.parse(meta)).toEqual({
      path: "api",
      mode: "variation",
      difficulty: "표준",
      count: 6,
      words: 200,
      types: ["주제", "어법"],
      sourcePassage: conditions.passage,
      model: "gpt-6-luna",
      promptVersion: "v3",
    });
    expect(
      englishSetMetaSchema.safeParse({ ...meta, secret: "x" }).success,
    ).toBe(false);
  });

  it("원문 유지는 원문을 따로 싣지 않는다(세트 지문이 곧 원문) · 새 지문은 소재를 싣고 지문 길이도 싣는다", () => {
    expect(
      englishMetaFromConditions("chatgpt", { ...conditions, mode: "original" }),
    ).not.toHaveProperty("sourcePassage");
    expect(
      englishMetaFromConditions("chatgpt", { ...conditions, mode: "original" }),
    ).not.toHaveProperty("words");
    expect(
      englishMetaFromConditions("chatgpt", {
        ...conditions,
        mode: "new",
        topic: "학교 텃밭",
        passage: "",
      }),
    ).toMatchObject({ mode: "new", topic: "학교 텃밭", words: 200 });
  });

  it("세트 만들기 · 세트 응답에 meta 가 실린다(없어도 된다 — 옛 세트)", () => {
    const create = {
      title: "t",
      source: "chatgpt",
      passage: "p",
      questions: row.questions,
    };
    expect(englishSetCreateSchema.safeParse(create).success).toBe(true);
    expect(
      englishSetCreateSchema.safeParse({
        ...create,
        meta: { path: "cloze", count: 5 },
      }).success,
    ).toBe(true);
  });

  it("직렬화 — 표의 meta 가 계약에 맞으면 싣고, 깨졌거나 없으면 null", () => {
    const good = serializeEnglishSet({
      ...row,
      meta: { path: "cloze", count: 5 },
    });
    expect(good.meta).toEqual({ path: "cloze", count: 5 });
    expect(englishSetSchema.parse(good).meta).toEqual({
      path: "cloze",
      count: 5,
    });
    expect(serializeEnglishSet({ ...row, meta: null }).meta).toBeNull();
    expect(
      serializeEnglishSet({ ...row, meta: { path: "nope" } }).meta,
    ).toBeNull();
  });
});

describe("englishMetaLine — 편집 화면의 «만든 조건» 한 줄", () => {
  it("길 · 모델 · 제작 방식 · 난이도 · 문항 수 · 지문 길이 · 유형 · 자료", () => {
    expect(
      englishMetaLine({
        path: "api",
        mode: "variation",
        difficulty: "표준",
        count: 6,
        words: 200,
        types: ["주제", "어법"],
        materialName: "3과 지문",
        model: "gpt-6-luna",
        promptVersion: "v3",
      }),
    ).toBe(
      "API 직접 생성(gpt-6-luna · 프롬프트 v3) · 원문 변형 · 표준 · 6문항 · 약 200단어 · 주제 · 어법 · 자료 «3과 지문»",
    );
    expect(englishMetaLine({ path: "cloze", count: 5 })).toBe(
      "원문 복원 · 최대 5문항",
    );
    expect(englishMetaLine(null)).toBeNull();
    // 저장 재시도 키는 만든 조건 줄에 보이지 않는다
    expect(
      englishMetaLine({
        path: "api",
        clientKey: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe("API 직접 생성");
  });

  it("자료 이름은 255자까지 받고 256자는 거절한다", () => {
    const name = "가".repeat(255);
    expect(
      englishSetMetaSchema.safeParse({ path: "cloze", materialName: name })
        .success,
    ).toBe(true);
    expect(
      englishSetMetaSchema.safeParse({
        path: "cloze",
        materialName: `${name}나`,
      }).success,
    ).toBe(false);
  });
});
