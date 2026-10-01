// @vitest-environment node
/**
 * 🔴 D-141 ⑵ — 교사 응답 꼴에 문항 글 · 보기 · 답 열쇠가 **들어갈 수 없다**(키 이름으로 잠근다).
 * `mathSrsRecordIsolation.test.ts` 의 «강사 반 현황 데이터는 문항 전문·보기·정답을 싣지 않는다»와 같은 결.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  EXPLORER_TEACHER_LEARNING_FLAG_CODES,
  EXPLORER_TEACHER_OPERATION_FLAG_CODES,
  explorerTeacherClassResponseSchema,
  explorerTeacherStudentResponseSchema,
} from "@/contracts/mathExplorersTeacher.contract";

const CLASS_ID = "7e7c388b-c264-4d39-809b-527723b8b74b";
const STUDENT_ID = "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2";

/** 문항 글 · 보기 · 답 · 풀이 · 학생이 낸 답 — 탐험 엔진과 복습 기록이 쓰는 키 이름 전부. */
const CONTENT_KEYS = [
  "prompt",
  "definition",
  "reading",
  "pieces",
  "words",
  "choices",
  "choiceIds",
  "answerChoices",
  "examples",
  "exampleTitle",
  "statement",
  "trap",
  "truth",
  "explanation",
  "note",
  "label",
  "answer",
  "answers",
  "answerText",
  "submittedAnswer",
  "solution",
  "hint",
  "problems",
  "equation",
  "tiles",
  "queue",
  "next",
  "passed",
  "receipts",
  "feedback",
  "prediction",
  "questions",
];

function keysOf(schema: z.ZodType) {
  const keys = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const properties = (node as { properties?: Record<string, unknown> })
      .properties;
    if (properties) Object.keys(properties).forEach((key) => keys.add(key));
    Object.values(node).forEach(walk);
  };
  walk(z.toJSONSchema(schema));
  return keys;
}

const summary = {
  started: true,
  collected: 4,
  total: 230,
  units: [
    { id: "factors", title: "소인수분해", grade: 7, collected: 4, total: 5 },
  ],
  dueToday: 1,
  overdue: { cards: 1, maxDays: 2 },
  recentSessions: [
    {
      date: "2026-10-01",
      route: "unit",
      unitId: "factors",
      unitTitle: "소인수분해",
      targetCardName: null,
      first: 12,
      total: 15,
      unresolved: 3,
      stars: 4,
    },
  ],
  openSession: {
    startedOn: "2026-10-01",
    route: "unit",
    unitId: "factors",
    unitTitle: "소인수분해",
    status: "retry",
    solved: 12,
    total: 15,
    round: 3,
    continuation: 0,
    unresolved: 3,
  },
  lastCompletedDate: null,
  learningFlags: [
    {
      code: "unresolved",
      value: 3,
      date: "2026-10-01",
      cards: [{ id: "prime", name: "소수" }],
    },
  ],
  operationFlags: [],
};
const card = {
  id: "prime",
  name: "소수",
  unitId: "factors",
  unitTitle: "소인수분해",
  grade: 7,
  level: 0,
  due: "2026-10-02",
  lastRecall: "retry",
  missed: 3,
  reviewStep: 0,
  overdueDays: 0,
};
const classResponse = {
  data: {
    class: { id: CLASS_ID, name: "중1 A" },
    today: "2026-10-01",
    policy: 2,
    students: [
      { id: STUDENT_ID, name: "가짜 학생", hasAccount: true, summary },
    ],
  },
};
const studentResponse = {
  data: {
    student: {
      id: STUDENT_ID,
      name: "가짜 학생",
      classId: CLASS_ID,
      className: "중1 A",
      hasAccount: true,
    },
    today: "2026-10-01",
    policy: 2,
    detail: { ...summary, cards: [card] },
  },
};

describe("탐험 교사 응답 계약", () => {
  it("보고서에 실은 예시 꼴이 계약을 지난다", () => {
    expect(explorerTeacherClassResponseSchema.parse(classResponse)).toEqual(
      classResponse,
    );
    expect(explorerTeacherStudentResponseSchema.parse(studentResponse)).toEqual(
      studentResponse,
    );
  });

  it("사유는 두 목록 — 학습 개입 다섯(차례대로) · 운영 확인 둘 (27번 문서 §4.2 v1.1)", () => {
    expect(EXPLORER_TEACHER_LEARNING_FLAG_CODES).toEqual([
      "unresolved",
      "review-stuck",
      "overdue",
      "carried-over",
      "idle",
    ]);
    expect(EXPLORER_TEACHER_OPERATION_FLAG_CODES).toEqual([
      "not-started",
      "no-account",
    ]);
  });

  it("두 목록은 섞이지 않는다 — 운영 사유는 학습 목록에, 학습 사유는 운영 목록에 못 들어간다", () => {
    const operation = { code: "no-account", value: null, date: null };
    const mixed = structuredClone(studentResponse);
    Object.assign(mixed.data.detail, {
      learningFlags: [{ ...operation, cards: [] }],
    });
    expect(explorerTeacherStudentResponseSchema.safeParse(mixed).success).toBe(
      false,
    );
    const swapped = structuredClone(studentResponse);
    Object.assign(swapped.data.detail, {
      operationFlags: [{ code: "idle", value: 9, date: "2026-10-01" }],
    });
    expect(
      explorerTeacherStudentResponseSchema.safeParse(swapped).success,
    ).toBe(false);
    const fine = structuredClone(studentResponse);
    Object.assign(fine.data.detail, { operationFlags: [operation] });
    expect(explorerTeacherStudentResponseSchema.safeParse(fine).success).toBe(
      true,
    );
    // 운영 사유는 많아야 하나(계정 없음이 시작 전을 대신한다) · 카드를 싣지 않는다
    Object.assign(fine.data.detail, {
      operationFlags: [
        operation,
        { code: "not-started", value: null, date: null },
      ],
    });
    expect(explorerTeacherStudentResponseSchema.safeParse(fine).success).toBe(
      false,
    );
    Object.assign(fine.data.detail, {
      operationFlags: [{ ...operation, cards: [] }],
    });
    expect(explorerTeacherStudentResponseSchema.safeParse(fine).success).toBe(
      false,
    );
  });

  it.each([
    [
      "반",
      explorerTeacherClassResponseSchema,
      ["students", "summary", "learningFlags", "operationFlags"],
    ],
    [
      "학생",
      explorerTeacherStudentResponseSchema,
      ["student", "detail", "learningFlags", "operationFlags", "cards"],
    ],
  ] as const)(
    "%s 응답의 키에 문항 글 · 보기 · 답이 없다",
    (_label, schema, expected) => {
      const keys = keysOf(schema);
      // 걷는 법이 실제로 안쪽 키까지 센다(0 을 «없다»로 읽지 않는다)
      for (const key of expected) expect(keys.has(key)).toBe(true);
      expect(keys.size).toBeGreaterThan(30);
      expect(CONTENT_KEYS.filter((key) => keys.has(key))).toEqual([]);
    },
  );

  it("반 응답에는 카드 목록이 없다 — 카드 목록은 학생 상세에만", () => {
    const keys = keysOf(explorerTeacherClassResponseSchema);
    expect(keys.has("lastRecall")).toBe(false);
    expect(keysOf(explorerTeacherStudentResponseSchema).has("lastRecall")).toBe(
      true,
    );
    const leaked = structuredClone(classResponse);
    Object.assign(leaked.data.students[0].summary, { cards: [card] });
    expect(explorerTeacherClassResponseSchema.safeParse(leaked).success).toBe(
      false,
    );
  });

  it("strict — 어느 층에 문항 칸을 끼워도 거절한다", () => {
    const inject: [string, (r: typeof studentResponse) => object][] = [
      ["data", (r) => r.data],
      ["student", (r) => r.data.student],
      ["detail", (r) => r.data.detail],
      ["card", (r) => r.data.detail.cards[0]],
      ["flag", (r) => r.data.detail.learningFlags[0]],
      ["flag card", (r) => r.data.detail.learningFlags[0].cards[0]],
      ["session", (r) => r.data.detail.recentSessions[0]],
      ["open session", (r) => r.data.detail.openSession],
      ["unit", (r) => r.data.detail.units[0]],
      ["overdue", (r) => r.data.detail.overdue],
    ];
    for (const [where, pick] of inject)
      for (const key of [
        "definition",
        "choices",
        "answer",
        "submittedAnswer",
      ]) {
        const leaked = structuredClone(studentResponse);
        Object.assign(pick(leaked), { [key]: "새는 값" });
        expect(
          explorerTeacherStudentResponseSchema.safeParse(leaked).success,
          `${where}.${key}`,
        ).toBe(false);
      }
    const leaked = structuredClone(classResponse);
    Object.assign(leaked.data.students[0], { answer: "새는 값" });
    expect(explorerTeacherClassResponseSchema.safeParse(leaked).success).toBe(
      false,
    );
  });
});
