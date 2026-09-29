/**
 * PATCH  /api/english/exams/{id} — 이름 · 날짜 · 출제 설정 `{title?, examDate?, types?}`
 * DELETE /api/english/exams/{id} — 시험과 딸린 자료·세트(FK Cascade)
 * 대응 계약: src/contracts/english.contract.ts (D-148 · 25 §3)
 * 소유권(없으면 404 · 범위 밖 403): src/lib/ownership.ts `requireOwnedEnglishExam`
 */
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import {
  englishExamResponseSchema,
  englishExamUpdateSchema,
} from "@/contracts/english.contract";
import { jsonOk, notFoundError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { fromDateOnly } from "@/lib/english/serialize";
import {
  loadEnglishExam,
  readJson,
  requireEnglishSession,
} from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePatch(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  const parsed = englishExamUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const { title, examDate, types } = parsed.data;
  const data: Prisma.EnglishExamUpdateInput = {
    ...(title !== undefined ? { title } : {}),
    ...(examDate !== undefined ? { examDate: fromDateOnly(examDate) } : {}),
    ...(types !== undefined ? { types } : {}),
  };
  await db.englishExam.update({ where: { id }, data });

  const exam = await loadEnglishExam(id);
  if (!exam) return notFoundError("시험");
  return jsonOk(englishExamResponseSchema, { data: exam });
}

async function handleDelete(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  await db.englishExam.delete({ where: { id } });
  return jsonOk(deleteResponseSchema, { data: { id } });
}

export const PATCH = withErrorLog("/api/english/exams/[id]", handlePatch);
export const DELETE = withErrorLog("/api/english/exams/[id]", handleDelete);
