/**
 * GET  /api/english/exams/{id}/sets — 세트 요약 목록(id · title · status · source · 문항 수 · 유형들 · updatedAt)
 * POST /api/english/exams/{id}/sets — `{title, source, passage, questions}` → 검증기(25 §4.4) 통과해야
 *      저장 · 항상 «초안» · `revision: 1` → 201. 실패는 422 ENGLISH_DRAFT_REJECTED + `details.issues`.
 * 대응 계약: src/contracts/english.contract.ts (D-148 · 25 §3)
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import {
  englishSetCreateSchema,
  englishSetListResponseSchema,
  englishSetResponseSchema,
} from "@/contracts/english.contract";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  draftRejected,
  readJson,
  requireEnglishSession,
} from "@/lib/english/routeSupport";
import {
  serializeEnglishSet,
  serializeEnglishSetSummary,
} from "@/lib/english/serialize";
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

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  // 최근에 고친 것이 먼저 — 색인 (exam_id, updated_at)
  const rows = await db.englishQuestionSet.findMany({
    where: { examId: id },
    orderBy: { updatedAt: "desc" },
  });
  const res = jsonOk(englishSetListResponseSchema, {
    data: rows.map(serializeEnglishSetSummary),
  });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  const parsed = englishSetCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  // 세 길(ChatGPT 붙여넣기 · 원문 복원 · DeepSeek)이 같은 규칙을 지난다 — 검증 통과 ≠ 검토 완료
  const verdict = validateEnglishDraft(parsed.data);
  if (!verdict.ok) return draftRejected(verdict.issues);

  const created = await db.englishQuestionSet.create({
    data: {
      examId: id,
      title: verdict.draft.title,
      source: verdict.draft.source,
      passage: verdict.draft.passage,
      questions: verdict.draft.questions,
      status: "초안",
      revision: 1,
    },
  });
  return jsonOk(
    englishSetResponseSchema,
    { data: serializeEnglishSet(created) },
    { status: 201 },
  );
}

export const GET = withErrorLog("/api/english/exams/[id]/sets", handleGet);
export const POST = withErrorLog("/api/english/exams/[id]/sets", handlePost);
