/**
 * 오늘의 영어 — DB 행 → 계약 모양 (D-148 · 25 §3). 라우트(`src/app/api/english/**`)와 인쇄 페이지(서버)가 같이 쓴다.
 *
 * `types`(시험) · `questions`(세트)는 jsonb 라 형이 `unknown` 으로 온다 — 쓰기 때 계약으로 잠갔으므로 여기서는
 * 모양만 맞추고, 응답은 `jsonOk(계약, …)` 가 다시 parse 한다(표류하면 거기서 바로 드러난다).
 */
import type {
  EnglishExam as EnglishExamRow,
  EnglishMaterial as EnglishMaterialRow,
  EnglishQuestionSet as EnglishQuestionSetRow,
} from "@prisma/client";

import {
  englishSetMetaSchema,
  type EnglishExam,
  type EnglishMaterial,
  type EnglishQuestion,
  type EnglishQuestionType,
  type EnglishSet,
  type EnglishSetSummary,
} from "@/contracts/english.contract";

export type EnglishExamCounts = {
  materials: number;
  sets: number;
  reviewed: number;
};

/** 달력 날짜 칸(`@db.Date`) → `YYYY-MM-DD` */
export function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** `YYYY-MM-DD` → 달력 날짜 칸에 넣을 값(UTC 자정 — 기존 `Test.testDate` 와 같은 결) */
export function fromDateOnly(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function serializeEnglishExam(
  row: Pick<
    EnglishExamRow,
    | "id"
    | "school"
    | "grade"
    | "title"
    | "examDate"
    | "types"
    | "createdAt"
    | "updatedAt"
  >,
  counts: EnglishExamCounts,
): EnglishExam {
  return {
    id: row.id,
    school: row.school,
    grade: row.grade as EnglishExam["grade"],
    title: row.title,
    examDate: toDateOnly(row.examDate),
    types: (Array.isArray(row.types) ? row.types : []) as EnglishExam["types"],
    materialCount: counts.materials,
    setCount: counts.sets,
    reviewedCount: counts.reviewed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeEnglishMaterial(
  row: Pick<
    EnglishMaterialRow,
    "id" | "examId" | "name" | "mimeType" | "size" | "content" | "createdAt"
  >,
  hasFile: boolean,
): EnglishMaterial {
  return {
    id: row.id,
    examId: row.examId,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    hasFile,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 문항 배열의 유형을 순서대로 · 중복 없이 — 목록 카드의 작은 딱지 */
export function englishSetTypes(
  questions: readonly Pick<EnglishQuestion, "type">[],
): EnglishQuestionType[] {
  return [...new Set(questions.map((question) => question.type))];
}

function questionsOf(row: Pick<EnglishQuestionSetRow, "questions">) {
  return (
    Array.isArray(row.questions) ? row.questions : []
  ) as EnglishQuestion[];
}

export function serializeEnglishSetSummary(
  row: Pick<
    EnglishQuestionSetRow,
    | "id"
    | "examId"
    | "title"
    | "status"
    | "source"
    | "questions"
    | "revision"
    | "createdAt"
    | "updatedAt"
  >,
): EnglishSetSummary {
  const questions = questionsOf(row);
  return {
    id: row.id,
    examId: row.examId,
    title: row.title,
    status: row.status as EnglishSetSummary["status"],
    source: row.source as EnglishSetSummary["source"],
    questionCount: questions.length,
    types: englishSetTypes(questions),
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 만든 조건 — 계약에 맞으면 싣고, 없거나 깨졌으면 null(옛 세트 · 손으로 만든 세트). 깨진 값으로 화면을 세우지 않는다 */
function metaOf(value: unknown): EnglishSet["meta"] {
  if (value === null || value === undefined) return null;
  const parsed = englishSetMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function serializeEnglishSet(
  row: Pick<
    EnglishQuestionSetRow,
    | "id"
    | "examId"
    | "title"
    | "status"
    | "source"
    | "passage"
    | "questions"
    | "revision"
    | "createdAt"
    | "updatedAt"
  > & { meta?: unknown },
): EnglishSet {
  return {
    ...serializeEnglishSetSummary(row),
    passage: row.passage,
    questions: questionsOf(row),
    meta: metaOf(row.meta),
  };
}
