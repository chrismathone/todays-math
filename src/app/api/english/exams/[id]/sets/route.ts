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
  clientKeyConflict,
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

/** 같은 clientKey 인데 본문이 다르다 — 트랜잭션 안에서 던져 만들기를 건너뛴다 */
class ClientKeyConflict extends Error {
  constructor() {
    super("CLIENT_KEY_CONFLICT");
    this.name = "ClientKeyConflict";
  }
}

/** 객체 키 나열 순서는 무시하고, 배열 순서는 본다 */
function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort())
      out[key] = sortKeys(source[key]);
    return out;
  }
  return value;
}

function clientKeyOf(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const key = (meta as { clientKey?: unknown }).clientKey;
  return typeof key === "string" ? key : null;
}

function sameStoredBody(
  row: {
    title: string;
    source: string;
    passage: string;
    questions: unknown;
  },
  draft: {
    title: string;
    source: string;
    passage: string;
    questions: unknown;
  },
): boolean {
  return (
    canonical({
      title: row.title,
      source: row.source,
      passage: row.passage,
      questions: row.questions,
    }) ===
    canonical({
      title: draft.title,
      source: draft.source,
      passage: draft.passage,
      questions: draft.questions,
    })
  );
}

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
  // 만든 조건(meta)은 초안이 아니다 — 검증기에는 초안만 넘긴다
  const { meta, ...draft } = parsed.data;
  const verdict = validateEnglishDraft(draft);
  if (!verdict.ok) return draftRejected(verdict.issues);

  // 시험 행을 잠근 뒤 같은 트랜잭션에서 키를 찾고 만든다.
  // update 로 잠그면 updatedAt 이 바뀌어 시험 목록 순서가 흔들린다 — SELECT … FOR UPDATE.
  // 메모리 대역의 트랜잭션 큐는 이 잠금이 아니다.
  try {
    const saved = await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT id FROM english_exam WHERE id = CAST(${id} AS uuid) FOR UPDATE
      `;
      const key = meta?.clientKey;
      if (key) {
        const rows = await tx.englishQuestionSet.findMany({
          where: { examId: id },
        });
        const matches = rows.filter((row) => clientKeyOf(row.meta) === key);
        if (matches.some((row) => !sameStoredBody(row, verdict.draft)))
          throw new ClientKeyConflict();
        const existing = matches[0];
        if (existing) return { row: existing, created: false as const };
      }
      const created = await tx.englishQuestionSet.create({
        data: {
          examId: id,
          title: verdict.draft.title,
          source: verdict.draft.source,
          passage: verdict.draft.passage,
          questions: verdict.draft.questions,
          // 만든 조건 — 만들기 화면이 보낸 것만(옛 클라이언트 · 손으로 만든 세트는 NULL)
          ...(meta ? { meta } : {}),
          status: "초안",
          revision: 1,
        },
      });
      return { row: created, created: true as const };
    });
    return jsonOk(
      englishSetResponseSchema,
      { data: serializeEnglishSet(saved.row) },
      saved.created ? { status: 201 } : undefined,
    );
  } catch (error) {
    if (error instanceof ClientKeyConflict) return clientKeyConflict();
    throw error;
  }
}

export const GET = withErrorLog("/api/english/exams/[id]/sets", handleGet);
export const POST = withErrorLog("/api/english/exams/[id]/sets", handlePost);
