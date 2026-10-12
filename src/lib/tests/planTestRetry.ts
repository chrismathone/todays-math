import {
  retryPlanResponseSchema,
  type RetryPlanRequest,
} from "@/contracts/retry.contract";
import { jsonError, jsonOk, notFoundError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { planRetry, retryRequestedCount } from "@/lib/generator/planRetry";
import { requireOwnedStudentInClass, requireOwnedTest } from "@/lib/ownership";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import type { SessionUser } from "@/lib/session";
import {
  findRetryCandidates,
  RETRY_CANDIDATE_SELECT,
  serializeRetryCandidate,
  serializeRetryProblem,
} from "./retryCandidates";

/** 조회만 수행한다. 시험지 생성 · 채점 변경 · 후보 승인은 호출자의 별도 작업이다. */
export async function planTestRetry(
  session: SessionUser,
  testId: string,
  input: RetryPlanRequest,
) {
  const owned = await requireOwnedTest(testId, session, "test:read");
  if (!owned.ok) return owned.response;
  if (owned.data.studentId && owned.data.studentId !== input.studentId)
    return notFoundError("시험 대상 학생");
  const student = await requireOwnedStudentInClass(
    input.studentId,
    owned.data.classId,
    session,
  );
  if (!student.ok) return student.response;
  if (owned.data.status === "draft")
    return jsonError(
      "VALIDATION_ERROR",
      "확정된 시험지의 채점 결과로 복습을 계획하십시오.",
      422,
    );

  const result = await db.testResult.findFirst({
    where: {
      testId,
      studentId: input.studentId,
      ...(input.testResultId ? { id: input.testResultId } : {}),
    },
    orderBy: [{ takenAt: "desc" }, { id: "desc" }],
    include: { answers: true },
  });
  if (!result) return notFoundError("응시 결과");
  if (result.absent)
    return jsonError(
      "VALIDATION_ERROR",
      "결시 기록으로는 오답 복습을 계획할 수 없습니다.",
      422,
    );

  const testProblems = await db.testProblem.findMany({
    where: { testId },
    select: { problemId: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  const wrongIds = new Set(
    result.answers
      .filter((answer) => !answer.isCorrect)
      .map((answer) => answer.problemId),
  );
  const testIds = new Set(testProblems.map((p) => p.problemId));
  if ([...wrongIds].some((id) => !testIds.has(id)))
    return jsonError(
      "VALIDATION_ERROR",
      "채점 기록에 이 시험지의 문항이 아닌 오답이 있습니다.",
      422,
    );
  const originalRows = wrongIds.size
    ? await db.problem.findMany({
        where: { AND: [problemVisibleWhere(), { id: { in: [...wrongIds] } }] },
        select: RETRY_CANDIDATE_SELECT,
      })
    : [];
  const originalsById = new Map(originalRows.map((row) => [row.id, row]));
  if (originalsById.size !== wrongIds.size)
    return jsonError(
      "VALIDATION_ERROR",
      "접근할 수 없는 오답 원문이 있습니다.",
      422,
    );
  const wrong = testProblems
    .filter((p) => wrongIds.has(p.problemId))
    .map((p) => serializeRetryCandidate(originalsById.get(p.problemId)!));
  if (
    wrong.some((p) => p.source === "school_textbook") &&
    input.count !== undefined &&
    input.count < retryRequestedCount(wrong)
  )
    return jsonError(
      "VALIDATION_ERROR",
      "교과서 오답마다 변형 두 문항이 필요합니다. 문항 수를 줄일 수 없습니다.",
      422,
    );
  const pool = await findRetryCandidates(wrong);
  const args = {
    wrong,
    pool,
    count: input.count,
    seed: input.seed ?? `${testId}:${result.id}`,
    excludeIds: input.excludeIds,
  };
  let plan = planRetry(args);

  // 고르는 동안 자격이 바뀌거나 삭제된 문항은 응답에 싣지 않는다.
  const pickedRows = plan.picked.length
    ? await db.problem.findMany({
        where: {
          AND: [
            problemEligibleWhere(),
            { id: { in: plan.picked.map((seat) => seat.problem.id) } },
          ],
        },
      })
    : [];
  const rowsById = new Map(pickedRows.map((row) => [row.id, row]));
  plan = planRetry({
    ...args,
    pool: pickedRows.map(serializeRetryCandidate),
    wrong: wrong.map((p) =>
      rowsById.has(p.id)
        ? serializeRetryCandidate(rowsById.get(p.id)!)
        : { ...p, directUseAllowed: false },
    ),
  });
  return jsonOk(retryPlanResponseSchema, {
    data: {
      testId,
      studentId: input.studentId,
      testResultId: result.id,
      wrongProblemIds: wrong.map((p) => p.id),
      requestedCount: plan.requestedCount,
      picked: plan.picked.map((seat) => ({
        ...seat,
        problem: serializeRetryProblem(rowsById.get(seat.problem.id)!),
      })),
      shortfall: plan.shortfall,
      foldedWrong: plan.foldedWrong,
      textbookShortfalls: plan.textbookShortfalls,
    },
  });
}
