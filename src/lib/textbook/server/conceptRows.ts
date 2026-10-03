/**
 * 교재의 개념 — 판본 속 개념 한 줄의 읽기 · 저장, 그리고 백지 활동(교사의 종이 확인 · 확인 표시).
 *
 * 연결의 **확인**은 서버가 찍는다: 화면이나 가져온 패키지가 «확인됨»이라고 적어 보내도 그대로 믿지 않고,
 * 확인하는 순간의 대상 내용 해시를 서버가 계산해 적는다(`review` — 루트의 `resolveReviewedConcept`).
 * 초안에서 개념을 저장하면 굳은 내용(`frozen`)은 비운다 — 굳히는 것은 발행 예약이 한다.
 *
 * 🔴 학생의 글은 판본의 불변 바이트나 교환 패키지에 들어가지 않는다. 낸 글은 덮어쓰지 못한다(DB 트리거) —
 *    교사가 바꾸는 것은 확인 칸뿐이다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookConceptRecord } from "@/contracts/textbook.contract";
import type {
  TextbookConcept,
  TextbookConceptAttempt,
} from "@/contracts/textbookConcept.contract";

import {
  type TextbookActor,
  requireOwnedDraft,
  requireReadableEdition,
} from "../access";
import { aggregateRevision, editionStructure } from "./editions";
import { conflict, invalid, notFound, revisionMismatch } from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, isoColumn } from "./sql";

export const EDITION_MAX_CONCEPTS = 500;

/** 연결 확인 — 서버가 확인자 · 시각 · 대상 해시를 찍는다(루트의 `resolveReviewedConcept`) */
export type ConceptReviewer = (
  input: TextbookConcept,
  options: {
    prior: TextbookConcept | null;
    reviewerId: string;
    now: string;
    confirmBlankEntryIds?: readonly string[];
    confirmLinkIds?: readonly string[];
  },
) => TextbookConcept;

type ConceptRow = Omit<TextbookConcept, "blankForms"> & {
  blankForms: TextbookConcept["blankForms"] | null;
  revision: number;
};

const CONCEPT_SQL = `
  SELECT c."concept_key" AS "conceptKey", c."unit_key" AS "unitKey", s."section_key" AS "sectionKey", c."title",
         c."kind", c."unit_id" AS "unitId", c."body", c."blank_items" AS "blankItems", c."blank_forms" AS "blankForms",
         c."links", c."mapping_version" AS "mappingVersion", c."derived_from_concept_key" AS "derivedFromConceptKey",
         c."frozen", c."revision"
    FROM "textbook_concept" c
    LEFT JOIN "textbook_section" s ON s."edition_id" = c."edition_id" AND s."id" = c."section_id"
   WHERE c."edition_id" = $1::uuid`;

function toRecord(row: ConceptRow, aggregate: number): TextbookConceptRecord {
  const { revision, blankForms, ...concept } = row;
  return {
    concept: blankForms ? { ...concept, blankForms } : concept,
    revision,
    aggregateRevision: aggregate,
  };
}

export async function listConcepts(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
): Promise<TextbookConceptRecord[]> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const rows = await sql.query<ConceptRow>(
    `${CONCEPT_SQL} ORDER BY c."unit_key", c."concept_key"`,
    [editionId],
  );
  return rows.map((row) => toRecord(row, access.revision));
}

async function loadConcept(
  sql: TextbookSql,
  editionId: string,
  conceptKey: string,
): Promise<ConceptRow | null> {
  const rows = await sql.query<ConceptRow>(
    `${CONCEPT_SQL} AND c."concept_key" = $2::text`,
    [editionId, conceptKey],
  );
  return rows[0] ?? null;
}

export async function getConcept(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
): Promise<TextbookConceptRecord> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const row = await loadConcept(sql, editionId, conceptKey);
  if (!row) throw notFound("개념");
  return toRecord(row, access.revision);
}

export interface SaveConceptInput {
  /** 0 = 새 개념 */
  expectedRevision: number;
  concept: TextbookConcept;
  confirmBlankEntryIds?: string[];
  confirmLinkIds?: string[];
}

export async function saveConcept(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
  key: RequestKey,
  input: SaveConceptInput,
  review: ConceptReviewer,
  now: () => Date = () => new Date(),
): Promise<TextbookConceptRecord & { replayed: boolean }> {
  if (input.concept.conceptKey !== conceptKey)
    throw invalid("주소의 개념 열쇠와 본문의 개념 열쇠가 다릅니다.");
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<TextbookConceptRecord>(
      tx,
      key,
      async () => {
        await requireOwnedDraft(tx, actor, editionId);
        const current = await loadConcept(tx, editionId, conceptKey);
        if (input.expectedRevision === 0) {
          if (current) throw revisionMismatch("개념", current.revision);
          const [{ total }] = await tx.query<{ total: number }>(
            `SELECT count(*)::int AS total FROM "textbook_concept" WHERE "edition_id" = $1::uuid`,
            [editionId],
          );
          if (total >= EDITION_MAX_CONCEPTS)
            throw invalid(
              `한 판본의 개념은 ${EDITION_MAX_CONCEPTS}개까지입니다.`,
            );
        } else {
          if (!current) throw notFound("개념");
          if (current.revision !== input.expectedRevision)
            throw revisionMismatch("개념", current.revision);
        }
        const { outline } = await editionStructure(tx, editionId);
        if (
          !outline.units.some((unit) => unit.unitKey === input.concept.unitKey)
        )
          throw invalid("목차에 없는 단원입니다. 단원을 먼저 만들어 주세요.");
        if (input.concept.unitId) {
          const [unit] = await tx.query<{ id: string }>(
            `SELECT "id" FROM "unit" WHERE "id" = $1::uuid`,
            [input.concept.unitId],
          );
          if (!unit) throw invalid("없는 차시입니다.");
        }

        let prior: TextbookConcept | null = null;
        if (current) {
          const { revision: _revision, blankForms, ...rest } = current;
          void _revision;
          prior = blankForms ? { ...rest, blankForms } : rest;
        }
        let reviewed: TextbookConcept;
        try {
          // 저장하는 것은 초안이다 — 굳은 내용은 받지 않는다(발행 예약이 굳힌다)
          reviewed = review(
            { ...input.concept, frozen: null },
            {
              prior,
              reviewerId: actor.id,
              now: now().toISOString(),
              confirmBlankEntryIds: input.confirmBlankEntryIds,
              confirmLinkIds: input.confirmLinkIds,
            },
          );
        } catch (error) {
          throw invalid(error instanceof Error ? error.message : String(error));
        }

        const params = [
          editionId,
          conceptKey,
          reviewed.unitKey,
          reviewed.title,
          reviewed.kind,
          reviewed.unitId,
          JSON.stringify(reviewed.body),
          JSON.stringify(reviewed.blankItems),
          reviewed.blankForms ? JSON.stringify(reviewed.blankForms) : null,
          JSON.stringify(reviewed.links),
          reviewed.mappingVersion,
          reviewed.derivedFromConceptKey,
        ];
        if (current) {
          const updated = await tx.execute(
            `UPDATE "textbook_concept" SET "unit_key" = $3::text, "title" = $4::text, "kind" = $5::text,
                    "unit_id" = $6::uuid, "body" = $7::jsonb, "blank_items" = $8::jsonb, "blank_forms" = $9::jsonb,
                    "links" = $10::jsonb, "mapping_version" = $11::text, "derived_from_concept_key" = $12::text,
                    "frozen" = NULL, "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
              WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text AND "revision" = $13::int`,
            [...params, input.expectedRevision],
          );
          if (updated !== 1) throw revisionMismatch("개념", current.revision);
        } else {
          await tx.execute(
            `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "unit_id", "body",
                  "blank_items", "blank_forms", "links", "mapping_version", "derived_from_concept_key", "updated_at")
             VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::uuid, $7::jsonb, $8::jsonb, $9::jsonb,
                     $10::jsonb, $11::text, $12::text, ${SQL_NOW})`,
            params,
          );
        }
        const saved = await loadConcept(tx, editionId, conceptKey);
        return toRecord(saved!, await aggregateRevision(tx, editionId));
      },
    );
    return { ...result, replayed };
  });
}

// ─────────────────────────────────────────────
// 백지 활동
// ─────────────────────────────────────────────

const ATTEMPT_SQL = `
  SELECT a."id" AS "attemptId", a."request_id" AS "requestId", a."body_hash" AS "bodyHash", a."student_id" AS "studentId",
         a."edition_id" AS "editionId", a."concept_key" AS "conceptKey", a."frozen_hash" AS "frozenHash", a."form",
         a."channel", a."response", ${isoColumn(`a."submitted_at"`)} AS "submittedAt", a."revision",
         a."review_status" AS "reviewStatus", a."reviewed_by" AS "reviewedBy",
         ${isoColumn(`a."reviewed_at"`)} AS "reviewedAt", a."note"
    FROM "textbook_concept_attempt" a`;

/** 이 교사의 학생인가 — 학생은 반을 거쳐 교사에게 속한다. 관리자 범위를 쓰지 않는다(개인 자료) */
async function requireOwnStudent(
  sql: TextbookSql,
  actor: TextbookActor,
  studentId: string,
): Promise<void> {
  const [row] = await sql.query<{ ownerId: string }>(
    `SELECT c."user_id" AS "ownerId" FROM "student" s JOIN "class" c ON c."id" = s."class_id" WHERE s."id" = $1::uuid`,
    [studentId],
  );
  if (!row || row.ownerId !== actor.id) throw notFound("학생");
}

/**
 * 교사가 종이 활동을 보고 적는 기록. 발행본의 굳은 개념에만 쌓인다(DB 도 다시 본다).
 * 같은 (학생, requestId)가 다시 오면 있던 줄을 돌려준다 — 본문이 다르면 409.
 */
export async function recordObservation(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
  input: {
    requestId: string;
    studentId: string;
    form: TextbookConceptAttempt["form"];
    observation: string;
  },
  bodyHash: string,
): Promise<{ attempt: TextbookConceptAttempt; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const access = await requireReadableEdition(tx, actor, editionId);
    await requireOwnStudent(tx, actor, input.studentId);
    const [existing] = await tx.query<TextbookConceptAttempt>(
      `${ATTEMPT_SQL} WHERE a."student_id" = $1::uuid AND a."request_id" = $2::uuid`,
      [input.studentId, input.requestId],
    );
    if (existing) {
      if (
        existing.bodyHash !== bodyHash ||
        existing.editionId !== editionId ||
        existing.conceptKey !== conceptKey
      )
        throw conflict(
          "같은 요청 번호가 다른 내용에 쓰였습니다. 새로 고친 뒤 다시 시도해 주세요.",
        );
      return { attempt: existing, replayed: true };
    }
    if (access.status !== "published")
      throw conflict("발행한 판본의 개념에만 활동을 기록합니다.");
    const [concept] = await tx.query<{ frozenHash: string | null }>(
      `SELECT "frozen" ->> 'contentHash' AS "frozenHash" FROM "textbook_concept"
        WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text`,
      [editionId, conceptKey],
    );
    if (!concept?.frozenHash) throw notFound("개념");
    const id = randomUUID();
    await tx.execute(
      `INSERT INTO "textbook_concept_attempt" ("id", "edition_id", "concept_key", "student_id", "request_id", "body_hash",
            "frozen_hash", "form", "channel", "response", "recorded_by", "submitted_at")
       VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, $5::uuid, $6::text, $7::text, $8::text, 'teacher-observed',
               $9::text, $10::uuid, ${SQL_NOW})`,
      [
        id,
        editionId,
        conceptKey,
        input.studentId,
        input.requestId,
        bodyHash,
        concept.frozenHash,
        input.form,
        input.observation,
        actor.id,
      ],
    );
    const [attempt] = await tx.query<TextbookConceptAttempt>(
      `${ATTEMPT_SQL} WHERE a."id" = $1::uuid`,
      [id],
    );
    return { attempt: attempt!, replayed: false };
  });
}

/** 교사의 확인 — `expectedRevision` 으로 충돌을 본다. 학생의 글은 바뀌지 않는다 */
export async function reviewAttempt(
  db: TextbookDb,
  actor: TextbookActor,
  attemptId: string,
  key: RequestKey,
  input: {
    expectedRevision: number;
    reviewStatus: "checked" | "needs-review";
    note: string | null;
  },
): Promise<{ attempt: TextbookConceptAttempt; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const [current] = await tx.query<TextbookConceptAttempt>(
        `${ATTEMPT_SQL} WHERE a."id" = $1::uuid FOR UPDATE OF a`,
        [attemptId],
      );
      if (!current) throw notFound("활동 기록");
      await requireOwnStudent(tx, actor, current.studentId);
      if (current.revision !== input.expectedRevision)
        throw revisionMismatch("활동 기록", current.revision);
      await tx.execute(
        `UPDATE "textbook_concept_attempt" SET "review_status" = $2::text, "reviewed_by" = $3::uuid,
                "reviewed_at" = ${SQL_NOW}, "note" = $4::text, "revision" = "revision" + 1
          WHERE "id" = $1::uuid AND "revision" = $5::int`,
        [
          attemptId,
          input.reviewStatus,
          actor.id,
          input.note,
          input.expectedRevision,
        ],
      );
      const [attempt] = await tx.query<TextbookConceptAttempt>(
        `${ATTEMPT_SQL} WHERE a."id" = $1::uuid`,
        [attemptId],
      );
      return attempt!;
    });
    return { attempt: result, replayed };
  });
}

/** 내 학생 한 명의 백지 활동 — 새것부터 */
export async function studentConceptAttempts(
  sql: TextbookSql,
  actor: TextbookActor,
  studentId: string,
): Promise<TextbookConceptAttempt[]> {
  await requireOwnStudent(sql, actor, studentId);
  return sql.query<TextbookConceptAttempt>(
    `${ATTEMPT_SQL} WHERE a."student_id" = $1::uuid ORDER BY a."submitted_at" DESC, a."id" LIMIT 500`,
    [studentId],
  );
}
