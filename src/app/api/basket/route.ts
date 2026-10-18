import type { NextRequest } from "next/server";
import {
  basketAddRequestSchema,
  basketChangeRequestSchema,
  basketResponseSchema,
} from "@/contracts/basket.contract";
import { uuidSchema } from "@/contracts/common.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { readBasket, type BasketData } from "@/lib/basket/readBasket";
import { basketTransaction, lockQuestionRows } from "@/lib/basket/transaction";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import {
  expandQuestionProblemIds,
  validateQuestionSelections,
} from "@/lib/problem/questionQueries";
import {
  QUESTION_REVISION_SELECT,
  QuestionSelectionConflict,
} from "@/lib/problem/questionSelection";

const questionView = (request?: NextRequest) =>
  request
    ? new URL(request.url).searchParams.get("identity") === "question"
    : false;
async function response(work: () => Promise<BasketData | Response>) {
  try {
    const result = await work();
    return result instanceof Response
      ? result
      : jsonOk(basketResponseSchema, { data: result });
  } catch (error) {
    if (error instanceof QuestionSelectionConflict)
      return jsonError("CONFLICT", error.message, 409);
    throw error;
  }
}

async function handleGet(request?: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  return jsonOk(basketResponseSchema, {
    data: await readBasket(session.id, questionView(request)),
  });
}

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const parsed = basketAddRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data,
    grouped = input.identity === "question" || !!input.selection;
  return response(() =>
    basketTransaction(session.id, async (tx) => {
      await lockQuestionRows(tx, [input.problemId]);
      const problem = await tx.problem.findFirst({
        where: {
          id: input.problemId,
          OR: [{ pool: "shared" }, { userId: session.id }],
        },
        select: QUESTION_REVISION_SELECT,
      });
      if (!problem) return notFoundError("문항");
      const blocked = problemIneligibleReason(problem);
      if (blocked) return jsonError("VALIDATION_ERROR", blocked, 422);
      if (input.selection)
        await validateQuestionSelections([input.selection], tx);
      const items = await tx.basketItem.findMany({
        where: { userId: session.id },
        include: { problem: { select: { id: true, questionGroupKey: true } } },
      });
      const same = items.filter(
        (item) => questionIdOf(item.problem) === questionIdOf(problem),
      );
      if (same.length) {
        if (same.length !== 1 || same[0].problemId !== input.problemId)
          throw new QuestionSelectionConflict(
            "같은 문항이 이미 담겨 있습니다. 담긴 문항에서 형식을 변경해 주세요.",
          );
      } else {
        const orderIndex =
          items.reduce((max, item) => Math.max(max, item.orderIndex), 0) + 1;
        await tx.basketItem.upsert({
          where: {
            userId_problemId: { userId: session.id, problemId: problem.id },
          },
          create: { userId: session.id, problemId: problem.id, orderIndex },
          update: {},
        });
      }
      return readBasket(session.id, grouped, tx);
    }),
  );
}

async function handlePatch(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const parsed = basketChangeRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  const { fromProblemId, selection } = parsed.data;
  return response(() =>
    basketTransaction(session.id, async (tx) => {
      await lockQuestionRows(tx, [fromProblemId, selection.problemId]);
      await validateQuestionSelections([selection], tx);
      const items = await tx.basketItem.findMany({
        where: { userId: session.id },
        orderBy: { orderIndex: "asc" },
        include: { problem: { select: { id: true, questionGroupKey: true } } },
      });
      const from = items.find((item) => item.problemId === fromProblemId);
      if (!from || questionIdOf(from.problem) !== selection.questionId)
        throw new QuestionSelectionConflict(
          "담긴 문항이 바뀌었습니다. 바구니를 다시 확인해 주세요.",
        );
      const group = items.filter(
        (item) => questionIdOf(item.problem) === selection.questionId,
      );
      const keeper =
        group.find((item) => item.problemId === selection.problemId) ??
        group[0];
      const orderIndex = Math.min(...group.map((item) => item.orderIndex));
      await tx.basketItem.deleteMany({
        where: {
          userId: session.id,
          id: {
            in: group
              .filter((item) => item.id !== keeper.id)
              .map((item) => item.id),
          },
        },
      });
      await tx.basketItem.update({
        where: { id: keeper.id },
        data: { problemId: selection.problemId, orderIndex },
      });
      return readBasket(session.id, true, tx);
    }),
  );
}

async function handleDelete(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const raw = new URL(request.url).searchParams.get("problemId");
  const parsed = raw === null ? null : uuidSchema.safeParse(raw);
  if (parsed && !parsed.success) return validationError(parsed.error);
  return response(() =>
    basketTransaction(session.id, async (tx) => {
      const ids = parsed?.success
        ? questionView(request)
          ? await expandQuestionProblemIds([parsed.data], tx)
          : [parsed.data]
        : null;
      await tx.basketItem.deleteMany({
        where: {
          userId: session.id,
          ...(ids ? { problemId: { in: ids } } : {}),
        },
      });
      return readBasket(session.id, questionView(request), tx);
    }),
  );
}

export const GET = withErrorLog("/api/basket", handleGet);
export const POST = withErrorLog("/api/basket", handlePost);
export const PATCH = withErrorLog("/api/basket", handlePatch);
export const DELETE = withErrorLog("/api/basket", handleDelete);
