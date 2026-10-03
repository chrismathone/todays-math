/**
 * GET  /api/english/exams — 내 범위의 시험 목록 + 요약(자료 수 · 세트 수 · 검토 완료 수)
 * POST /api/english/exams — 새 시험 `{school, grade, title, examDate?}` → 201
 * 대응 계약: src/contracts/english.contract.ts (D-148 · 25 §3)
 * 소유 범위(D-130 — 지점 관리자는 지점 전체 · 강사는 자기 것): src/lib/ownerScope.ts `ownedRowsWhere`
 */
import type { NextRequest } from "next/server";

import {
  englishExamCreateSchema,
  englishExamListResponseSchema,
  englishExamResponseSchema,
} from "@/contracts/english.contract";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { fromDateOnly, serializeEnglishExam } from "@/lib/english/serialize";
import {
  loadEnglishExams,
  readJson,
  requireEnglishSession,
} from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { ownedRowsWhere } from "@/lib/ownerScope";

async function handleGet(request: NextRequest) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;

  const exams = await loadEnglishExams(ownedRowsWhere(gate.session));
  const res = jsonOk(englishExamListResponseSchema, { data: exams });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

async function handlePost(request: NextRequest) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const parsed = englishExamCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const created = await db.englishExam.create({
    data: {
      userId: gate.session.id,
      branchId: gate.session.branchId ?? null,
      school: parsed.data.school,
      grade: parsed.data.grade,
      title: parsed.data.title,
      examDate: fromDateOnly(parsed.data.examDate),
      types: [],
    },
  });
  return jsonOk(
    englishExamResponseSchema,
    {
      data: serializeEnglishExam(created, {
        materials: 0,
        sets: 0,
        reviewed: 0,
      }),
    },
    { status: 201 },
  );
}

export const GET = withErrorLog("/api/english/exams", handleGet);
export const POST = withErrorLog("/api/english/exams", handlePost);
