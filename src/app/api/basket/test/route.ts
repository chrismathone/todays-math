import type { NextRequest } from "next/server";
import {
  basketTestRequestSchema,
  basketTestResponseSchema,
} from "@/contracts/basket.contract";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { renumberForTest } from "@/lib/basket/readBasket";
import { basketTransaction, lockQuestionRows } from "@/lib/basket/transaction";
import { assertClassWrite, assertStudentEnrollment } from "@/lib/classAccess";
import { personalViewer } from "@/lib/ownerScope";
import { requireOwnedClass, requireOwnedStudentInClass } from "@/lib/ownership";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { validateQuestionSelections } from "@/lib/problem/questionQueries";
import { QuestionSelectionConflict } from "@/lib/problem/questionSelection";
import { loadRecentProblemIds } from "@/lib/tests/recentProblemIds";

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const parsed = basketTestRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;
  // A personal basket is issued only to an owned class, including for administrators.
  const viewer = personalViewer(session);
  const owned = await requireOwnedClass(input.classId, viewer, "test:write");
  if (!owned.ok) return owned.response;
  if (input.studentId) {
    const student = await requireOwnedStudentInClass(
      input.studentId,
      input.classId,
      viewer,
    );
    if (!student.ok) return student.response;
  }
  const recent = input.recent
    ? new Set(await loadRecentProblemIds(session.id, input.testDate))
    : null;
  try {
    const result = await basketTransaction(session.id, async (tx) => {
      await assertClassWrite(tx, viewer, input.classId, "test:write");
      if (input.studentId)
        await assertStudentEnrollment(tx, input.studentId, input.classId);
      const ids = await tx.basketItem.findMany({
        where: { userId: session.id },
        select: { problemId: true },
      });
      await lockQuestionRows(
        tx,
        ids.map((item) => item.problemId),
      );
      const items = await tx.basketItem.findMany({
        where: { userId: session.id },
        orderBy: { orderIndex: "asc" },
        include: { problem: true },
      });
      if (!items.length)
        return jsonError(
          "VALIDATION_ERROR",
          "담은 문항이 없습니다. 문제은행에서 먼저 담아 주세요.",
          422,
        );
      if (
        new Set(items.map((item) => questionIdOf(item.problem))).size !==
        items.length
      )
        return jsonError(
          "VALIDATION_ERROR",
          "같은 문항의 여러 형식이 담겨 있습니다. 유지할 형식을 선택해 주세요.",
          422,
        );
      if (input.identity === "question" || input.selections) {
        if (
          !input.selections ||
          input.selections.length !== items.length ||
          input.selections.some(
            (selection, i) => selection.problemId !== items[i].problemId,
          )
        )
          throw new QuestionSelectionConflict(
            "다른 화면에서 바구니가 바뀌었습니다. 담긴 문항을 다시 확인해 주세요.",
          );
        await validateQuestionSelections(input.selections, tx);
      }
      const blocked = items.flatMap((item) => {
        const reason = problemIneligibleReason(item.problem);
        return reason ? [`${item.problem.problemCode}(${reason})`] : [];
      });
      if (blocked.length)
        return jsonError(
          "VALIDATION_ERROR",
          `낼 수 없는 문항 ${blocked.length}건이 담겨 있습니다. ${blocked.slice(0, 3).join(" · ")}`,
          422,
        );
      if (recent && items.some((item) => recent.has(item.problemId)))
        return jsonError(
          "VALIDATION_ERROR",
          "최근 사용한 문항이 담겨 있습니다. 형식을 바꾸어도 같은 문항이므로 새 문항을 선택해 주세요.",
          422,
        );
      const units = await tx.unit.findMany({
        where: {
          id: { in: [...new Set(items.map((item) => item.problem.unitId))] },
        },
        select: { id: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      });
      const first = units[0],
        last = units[units.length - 1];
      if (!first || !last)
        return jsonError(
          "VALIDATION_ERROR",
          "담은 문항의 단원을 찾지 못했습니다.",
          422,
        );
      const test = await tx.test.create({
        data: {
          userId: session.id,
          classId: input.classId,
          studentId: input.studentId ?? null,
          testType: "review",
          rangeStartUnitId: first.id,
          rangeEndUnitId: last.id,
          status: "draft",
          modified: false,
          testDate: new Date(`${input.testDate}T00:00:00.000Z`),
        },
      });
      await tx.testProblem.createMany({
        data: renumberForTest(items).map(({ item, orderIndex }) => ({
          testId: test.id,
          problemId: item.problemId,
          orderIndex,
          replaced: false,
        })),
      });
      await tx.basketItem.deleteMany({ where: { userId: session.id } });
      return { testId: test.id, problemCount: items.length };
    });
    return result instanceof Response
      ? result
      : jsonOk(basketTestResponseSchema, { data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof QuestionSelectionConflict)
      return jsonError("CONFLICT", error.message, 409);
    throw error;
  }
}

export const POST = withErrorLog("/api/basket/test", handlePost);
