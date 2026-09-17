/**
 * 🔴 RED → 🟢 — **채점 입력 계약** (D-134 트랙 1 · 브리프 `tracks/briefs/grading-input.md` §1.1·§3).
 *
 * 계약: `src/contracts/testresult.contract.ts`
 *
 * ## 무엇을 잠그나 — «세 상태»가 계약에 자리를 갖는가
 *
 * 지금까지 `TestResult` 는 「몇 점」 하나만 담았다. 그래서 **결시**를 적을 자리가 없어
 * `score = 0` 으로 적을 수밖에 없었고, 그 0 이 평균·추이·리포트에 **진짜 0점처럼** 실린다
 * (23 §4 ③ · 20번 «칸이 없다»를 0점으로 채우면 합계가 유일한 그물이 된다).
 *
 *   · `score` · `predictedScore` 가 **null 을 받는다** — 결시의 자리.
 *   · `absent` 가 「칸을 전부 ✕ 로 찍은 것」과 **다른 뜻**을 가진다.
 *   · `gradingMode` 가 「오답 표시로 채점함(marks)」과 「응답을 전사함(answers)」을 가른다.
 *     🔴 **없으면 `answers`** — 기존 `POST /api/tests/{id}/submit` 의 뜻을 한 글자도 안 바꾼다.
 *   · 「**아직 안 봄**」은 계약에 칸이 없다 — **행이 없는 것**이다(`latest: null`).
 *
 * ## 🔴 0 과 null 을 갈라서 잰다
 *
 * 「null 이 통과한다」만 재면 구현이 `score: z.number().nullable()` 대신
 * `z.number().optional()` 이거나 `.catch(0)` 여도 초록일 수 있다. 그래서 **0 을 넣은 짝**을
 * 나란히 두고 «파싱 뒤에도 서로 다른 값»임을 단언한다.
 */
import { describe, expect, it } from "vitest";

import {
  gradeSubmitRequestSchema,
  testResultSchema,
} from "@/contracts/testresult.contract";

const TEST_ID = "90000000-0000-4000-8000-000000000050";
const STUDENT_1 = "30000000-0000-4000-8000-000000000001";
const STUDENT_2 = "30000000-0000-4000-8000-000000000002";
const PROBLEM_1 = "50000000-0000-4000-8000-000000000301";
const PROBLEM_2 = "50000000-0000-4000-8000-000000000302";

/** 채점된 학생 한 줄 — 칸을 바꿔 가며 쓴다. */
function resultBody(over: Record<string, unknown> = {}) {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    testId: TEST_ID,
    studentId: STUDENT_1,
    takenAt: "2026-09-17T09:00:00.000Z",
    score: 75,
    predictedScore: 78,
    gradingMode: "marks",
    absent: false,
    createdAt: "2026-09-17T09:00:00.000Z",
    ...over,
  };
}

describe("TestResult 계약 — 결시의 자리", () => {
  it("🔴 결시면 score · predictedScore 가 null 로 통과한다", () => {
    const parsed = testResultSchema.parse(
      resultBody({ absent: true, score: null, predictedScore: null }),
    );
    expect(parsed.absent).toBe(true);
    expect(parsed.score).toBeNull();
    expect(parsed.predictedScore).toBeNull();
  });

  it("🔴 0점과 결시는 파싱 뒤에도 **다른 값**이다 — 0 이 null 로 뭉개지지 않는다", () => {
    const zero = testResultSchema.parse(
      resultBody({ absent: false, score: 0, predictedScore: 0 }),
    );
    const absent = testResultSchema.parse(
      resultBody({ absent: true, score: null, predictedScore: null }),
    );
    expect(zero.score).toBe(0);
    expect(absent.score).toBeNull();
    expect(zero.score).not.toBe(absent.score);
    expect(zero.absent).not.toBe(absent.absent);
  });

  it("점수는 여전히 숫자를 받는다 — 문자열은 거부한다", () => {
    expect(
      testResultSchema.safeParse(resultBody({ score: "75" })).success,
    ).toBe(false);
  });

  it("🔴 gradingMode 가 없는 옛 본문은 answers 로 읽힌다", () => {
    const body = resultBody();
    delete (body as Record<string, unknown>).gradingMode;
    expect(testResultSchema.parse(body).gradingMode).toBe("answers");
  });

  it("🔴 absent 가 없는 옛 본문은 결시가 아니다(false)", () => {
    const body = resultBody();
    delete (body as Record<string, unknown>).absent;
    expect(testResultSchema.parse(body).absent).toBe(false);
  });

  it("gradingMode 는 marks · answers 둘뿐이다", () => {
    expect(testResultSchema.parse(resultBody()).gradingMode).toBe("marks");
    expect(
      testResultSchema.parse(resultBody({ gradingMode: "answers" }))
        .gradingMode,
    ).toBe("answers");
    expect(
      testResultSchema.safeParse(resultBody({ gradingMode: "partial" }))
        .success,
    ).toBe(false);
  });
});

describe("채점 입력 요청 계약 — 한 시험지의 여러 학생을 한 번에", () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    studentId: STUDENT_1,
    absent: false,
    wrongProblemIds: [PROBLEM_1],
    ...over,
  });

  it("학생 여럿을 한 요청으로 받는다", () => {
    const parsed = gradeSubmitRequestSchema.parse({
      entries: [entry(), entry({ studentId: STUDENT_2, wrongProblemIds: [] })],
    });
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[1]!.wrongProblemIds).toEqual([]);
  });

  it("🔴 결시 학생에 오답 번호가 붙으면 거부한다 — 두 뜻이 섞인다", () => {
    const res = gradeSubmitRequestSchema.safeParse({
      entries: [entry({ absent: true, wrongProblemIds: [PROBLEM_1] })],
    });
    expect(res.success).toBe(false);
  });

  it("결시 학생은 오답 번호가 비어 있어야 통과한다", () => {
    const parsed = gradeSubmitRequestSchema.parse({
      entries: [entry({ absent: true, wrongProblemIds: [] })],
    });
    expect(parsed.entries[0]!.absent).toBe(true);
  });

  it("🔴 같은 학생이 두 번 들어오면 거부한다 — 뒤엣것이 조용히 이기면 안 된다", () => {
    const res = gradeSubmitRequestSchema.safeParse({
      entries: [entry(), entry({ wrongProblemIds: [PROBLEM_2] })],
    });
    expect(res.success).toBe(false);
  });

  it("🔴 한 학생 줄에 같은 문항이 두 번 들어오면 거부한다", () => {
    const res = gradeSubmitRequestSchema.safeParse({
      entries: [entry({ wrongProblemIds: [PROBLEM_1, PROBLEM_1] })],
    });
    expect(res.success).toBe(false);
  });

  it("빈 요청은 거부한다 — «아무도 안 채점했다»를 저장으로 읽지 않는다", () => {
    expect(gradeSubmitRequestSchema.safeParse({ entries: [] }).success).toBe(
      false,
    );
  });

  it("🔴 absent 를 빠뜨린 줄은 거부한다 — 기본값으로 «응시»를 지어내지 않는다", () => {
    const line = entry();
    delete (line as Record<string, unknown>).absent;
    expect(
      gradeSubmitRequestSchema.safeParse({ entries: [line] }).success,
    ).toBe(false);
  });

  it("모르는 칸이 붙으면 거부한다(strict)", () => {
    expect(
      gradeSubmitRequestSchema.safeParse({
        entries: [entry({ score: 100 })],
      }).success,
    ).toBe(false);
  });
});
