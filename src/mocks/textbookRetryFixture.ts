/** Synthetic client QA data only. No database, imported textbook, or AI calls. */
import type { GradeSheetResponse } from "@/contracts/testresult.contract";
import type { RetryPlan } from "@/components/test/retryClient";

const uuid = (n: number) =>
  `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const RETRY_QA_TEST_ID = uuid(1);
export function textbookRetrySheet(): GradeSheetResponse {
  const problems = Array.from({ length: 8 }, (_, index) => ({
    problemId: uuid(100 + index),
    no: index + 1,
    sequence: index + 1,
    problemCode: `교과서-예시-${index + 1}`,
    difficulty: "기본" as const,
  }));
  const latest = (n: number, wrong: number[], absent = false) => ({
    testResultId: uuid(300 + n),
    takenAt: "2026-10-11T01:00:00.000Z",
    gradingMode: "marks" as const,
    absent,
    score: absent ? null : 100 - wrong.length * 12.5,
    wrongProblemIds: wrong.map((i) => problems[i].problemId),
    correctCount: absent ? 0 : 8 - wrong.length,
  });
  return {
    data: {
      testId: RETRY_QA_TEST_ID,
      className: "중2 교과서 복습반 · 긴 이름 검증",
      studentName: null,
      testType: "daily",
      testDate: "2026-10-11",
      status: "printed",
      problems,
      students: [
        { studentId: uuid(200), name: "김하윤", latest: latest(0, [0, 1]) },
        { studentId: uuid(201), name: "이서준", latest: null },
        { studentId: uuid(202), name: "박지호", latest: latest(2, [], true) },
        { studentId: uuid(203), name: "최수빈", latest: latest(3, []) },
        { studentId: uuid(204), name: "정다은", latest: latest(4, [0]) },
        { studentId: uuid(205), name: "강민준", latest: latest(5, [1]) },
        {
          studentId: uuid(206),
          name: "채점미완료",
          latest: { ...latest(6, [0]), correctCount: 1 },
        },
      ],
    },
  };
}

export function textbookRetryPlan(
  sheet = textbookRetrySheet().data,
  studentId = sheet.students[0].studentId,
): RetryPlan {
  const student = sheet.students.find((row) => row.studentId === studentId)!;
  const wrong = student.latest!.wrongProblemIds;
  return {
    testId: sheet.testId,
    studentId,
    testResultId: student.latest!.testResultId,
    wrongProblemIds: wrong,
    requestedCount: wrong.length * 2,
    picked: wrong.flatMap((id, index) =>
      [1, 2].map((slot) => ({
        wrongProblemId: id,
        origin: "형제" as const,
        problem: {
          id: uuid(500 + index * 10 + slot),
          userId: uuid(10),
          unitId: uuid(20),
          source: "transformed" as const,
          originProblemId: id,
          familyKey: `solo:${id}`,
          externalId: `tb-retry-v1:${id}:${slot}`,
          problemCode: `J22026-A01-${String(index * 2 + slot).padStart(3, "0")}`,
          difficulty: "기본" as const,
          problemType: "계산" as const,
          questionType: "단답형",
          content:
            index === 0
              ? `다음 식을 계산하시오. $${slot + 2}x+${slot}$에서 $x=2$일 때의 값을 구하시오.`
              : `밑변이 $${slot + 3}$ cm, 높이가 $${slot + 2}$ cm인 삼각형의 넓이를 구하시오.`,
          answer:
            index === 0
              ? String((slot + 2) * 2 + slot)
              : String(((slot + 3) * (slot + 2)) / 2),
          solution:
            index === 0
              ? `$x=2$를 대입하면 $${slot + 2}\\times2+${slot}=${(slot + 2) * 2 + slot}$이다.`
              : "삼각형의 넓이는 밑변과 높이의 곱의 절반이다.",
          reviewStatus: "approved" as const,
          directUseAllowed: true,
          pool: "private" as const,
          figureUrls: [],
          figureSvg:
            index === 1
              ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" width="200" height="110"><path d="M20 85 L160 85 L60 15 Z" fill="none" stroke="#172b4d" stroke-width="2"/><path d="M60 15 L60 85" stroke="#172b4d" stroke-dasharray="4 3"/><text x="90" y="105" font-size="14">${slot + 3} cm</text><text x="66" y="60" font-size="14">${slot + 2} cm</text></svg>`
              : null,
          figureDims: [],
          figureSourceMm: [],
          choiceFigureIndex: [],
          createdAt: "2026-10-11T01:00:00.000Z",
          updatedAt: "2026-10-11T01:00:00.000Z",
        },
      })),
    ),
    shortfall: 0,
    foldedWrong: 0,
    textbookShortfalls: [],
  };
}

export function missingTextbookRetryPlan(
  plan = textbookRetryPlan(),
): RetryPlan {
  return {
    ...plan,
    picked: plan.picked.filter(
      (seat) =>
        seat.wrongProblemId === plan.wrongProblemIds[0] &&
        seat.problem.externalId?.endsWith(":2"),
    ),
    shortfall: plan.requestedCount - 1,
    textbookShortfalls: plan.wrongProblemIds.map((id, index) => ({
      wrongProblemId: id,
      required: 2,
      available: index === 0 ? 1 : 0,
    })),
  };
}
