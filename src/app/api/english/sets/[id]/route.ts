/**
 * GET    /api/english/sets/{id} — 세트 전체
 * PUT    /api/english/sets/{id} — `{title, status, passage, questions, revision}` → 검증기 → `update where {id, revision}`.
 *        읽었을 때의 `revision` 과 서버 값이 다르면 409 REVISION_MISMATCH(«다른 곳에서 먼저 저장됐습니다…»), 맞으면 +1.
 * DELETE /api/english/sets/{id}
 * 소유는 부모 시험으로 판정한다(D-148 · 25 §3 — `requireOwnedEnglishExam`).
 */
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import {
  englishSetResponseSchema,
  englishSetUpdateSchema,
} from "@/contracts/english.contract";
import { jsonOk, notFoundError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  draftRejected,
  readJson,
  requireEnglishSession,
  revisionMismatch,
} from "@/lib/english/routeSupport";
import { serializeEnglishSet } from "@/lib/english/serialize";
import { validateEnglishDraft } from "@/lib/english/validate";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const set = await db.englishQuestionSet.findUnique({ where: { id } });
  if (!set) return notFoundError("문제 세트");
  const owned = await requireOwnedEnglishExam(gate.session, set.examId);
  if (!owned.ok) return owned.response;

  const res = jsonOk(englishSetResponseSchema, {
    data: serializeEnglishSet(set),
  });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

async function handlePut(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const current = await db.englishQuestionSet.findUnique({
    where: { id },
    select: { examId: true, source: true },
  });
  if (!current) return notFoundError("문제 세트");
  const owned = await requireOwnedEnglishExam(gate.session, current.examId);
  if (!owned.ok) return owned.response;

  const parsed = englishSetUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const { title, status, passage, questions, revision } = parsed.data;
  const verdict = validateEnglishDraft({
    title,
    source: current.source,
    passage,
    questions,
  });
  if (!verdict.ok) return draftRejected(verdict.issues);

  try {
    const updated = await db.englishQuestionSet.update({
      where: { id, revision },
      data: {
        title: verdict.draft.title,
        status,
        passage: verdict.draft.passage,
        questions: verdict.draft.questions,
        revision: { increment: 1 },
      },
    });
    return jsonOk(englishSetResponseSchema, {
      data: serializeEnglishSet(updated),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // 맞는 행이 없다 — 그 사이 지워졌으면 404, 남아 있으면 남이 먼저 저장한 것(409)
      const still = await db.englishQuestionSet.findUnique({
        where: { id },
        select: { id: true },
      });
      return still ? revisionMismatch() : notFoundError("문제 세트");
    }
    throw error;
  }
}

async function handleDelete(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const set = await db.englishQuestionSet.findUnique({
    where: { id },
    select: { examId: true },
  });
  if (!set) return notFoundError("문제 세트");
  const owned = await requireOwnedEnglishExam(gate.session, set.examId);
  if (!owned.ok) return owned.response;

  await db.englishQuestionSet.delete({ where: { id } });
  return jsonOk(deleteResponseSchema, { data: { id } });
}

export const GET = withErrorLog("/api/english/sets/[id]", handleGet);
export const PUT = withErrorLog("/api/english/sets/[id]", handlePut);
export const DELETE = withErrorLog("/api/english/sets/[id]", handleDelete);
