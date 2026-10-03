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
  readableEditionSql,
} from "../access";
import { aggregateRevision, editionStructure } from "./editions";
import { conflict, invalid, notFound, revisionMismatch } from "./errors";
import { requireStudentScope } from "./operationalScope";
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

/**
 * 개념 한 줄의 **내용만** — 권한을 묻지 않고 집계 revision 도 읽지 않는다.
 * 🔴 부르는 쪽이 **이미 권한을 판정한 뒤에만** 쓴다(학생 화면: QR · 배정으로 판정한 뒤 / 교사의 백지 인쇄: 판본 읽기 권한을 본 뒤).
 *    이 함수만 불러서는 아무것도 지켜지지 않는다.
 */
export async function readConceptContent(
  sql: TextbookSql,
  editionId: string,
  conceptKey: string,
): Promise<TextbookConcept | null> {
  const row = await loadConcept(sql, editionId, conceptKey);
  return row ? toRecord(row, 0).concept : null;
}

export interface ConceptLookupMatch {
  bookId: string;
  bookTitle: string;
  editionId: string;
  editionLabel: string;
  status: "draft" | "published";
  access: "owner" | "branch";
  conceptKey: string;
  conceptTitle: string;
  /** 발행 때 굳힌 내용이 있는가 — 있으면 백지 인쇄가 그 선택 그대로 열린다 */
  hasFrozen: boolean;
  entries: Array<{
    entryKind: TextbookConcept["blankItems"][number]["entryKind"];
    entryId: string;
    reviewStatus: TextbookConcept["blankItems"][number]["review"]["status"];
  }>;
}

/**
 * 개념 백지의 소단원 하나를 가리키는 교재 개념들 — 백지 화면이 «이 소단원이 실린 교재»를 보여 줄 때 쓴다.
 *
 * 🔴 맞추는 것은 **`blankSectionKey` 글자 그대로**다. 이름이 비슷한 소단원 · 다른 이름공간(탐험 카드 · 강의 구획)으로
 *    바꿔 찾지 않는다 — 없으면 없는 것이다.
 * 🔴 읽는 범위는 판본 읽기와 같다: 내 것은 초안 · 발행본, 동료 것은 **지점에 공유된 발행본만**(세 겹 판정은 SQL 이 한다).
 *    폐기한 판본 · 보관한 책은 내지 않는다.
 */
export async function lookupConceptsByBlankSection(
  sql: TextbookSql,
  actor: TextbookActor,
  blankSectionKey: string,
): Promise<ConceptLookupMatch[]> {
  return sql.query<ConceptLookupMatch>(
    `SELECT t."id" AS "bookId", t."title" AS "bookTitle", e."id" AS "editionId", e."label" AS "editionLabel",
            e."status", CASE WHEN t."user_id" = $1::uuid THEN 'owner' ELSE 'branch' END AS "access",
            c."concept_key" AS "conceptKey", c."title" AS "conceptTitle", (c."frozen" IS NOT NULL) AS "hasFrozen",
            (SELECT jsonb_agg(jsonb_build_object('entryKind', b ->> 'entryKind', 'entryId', b ->> 'entryId',
                                                 'reviewStatus', b -> 'review' ->> 'status')
                              ORDER BY b ->> 'entryKind', b ->> 'entryId')
               FROM jsonb_array_elements(c."blank_items") b
              WHERE b ->> 'blankSectionKey' = $2::text) AS "entries"
       FROM "textbook_concept" c
       JOIN "textbook_edition" e ON e."id" = c."edition_id"
       JOIN "textbook" t ON t."id" = e."textbook_id"
       JOIN "user" o ON o."id" = t."user_id"
      WHERE t."archived_at" IS NULL
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(c."blank_items") b WHERE b ->> 'blankSectionKey' = $2::text)
        AND e."status" IN ('draft', 'published') AND ${readableEditionSql("$1", "$3")}
      ORDER BY (t."user_id" = $1::uuid) DESC, t."title", e."ordinal" DESC, c."concept_key"
      LIMIT 500`,
    [actor.id, blankSectionKey, actor.branchId],
  );
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

/** 백지 활동 한 줄을 계약 모양으로 읽는 SELECT — 학생 쪽 코드(루트)도 같은 문장을 쓴다 */
export const textbookAttemptSelectSql = `
  SELECT a."id" AS "attemptId", a."request_id" AS "requestId", a."body_hash" AS "bodyHash", a."student_id" AS "studentId",
         a."edition_id" AS "editionId", a."concept_key" AS "conceptKey", a."frozen_hash" AS "frozenHash", a."form",
         a."channel", a."response", ${isoColumn(`a."submitted_at"`)} AS "submittedAt", a."revision",
         a."review_status" AS "reviewStatus", a."reviewed_by" AS "reviewedBy",
         ${isoColumn(`a."reviewed_at"`)} AS "reviewedAt", a."note"
    FROM "textbook_concept_attempt" a`;

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
    await requireStudentScope(tx, actor, input.studentId, "progress:write", {
      lock: true,
    });
    const [existing] = await tx.query<TextbookConceptAttempt>(
      `${textbookAttemptSelectSql} WHERE a."student_id" = $1::uuid AND a."request_id" = $2::uuid`,
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
      `${textbookAttemptSelectSql} WHERE a."id" = $1::uuid`,
      [id],
    );
    return { attempt: attempt!, replayed: false };
  });
}

/**
 * 교사의 확인 — `expectedRevision` 으로 충돌을 본다. 학생의 글은 바뀌지 않는다.
 *
 * 🔴 **지금의 범위를 재전송 기록보다 먼저 본다.** 멱등 기록(`runOnce`)은 끝난 요청이 다시 오면 일을 건너뛰고 그때의 결과를
 *    돌려준다 — 범위 검사가 그 안에만 있으면, 확인한 뒤 학생이 다른 교사의 반으로 옮겨 가도 같은 요청을 다시 보내
 *    그 학생의 글 · 메모를 받아 간다. 범위는 «그때»가 아니라 «지금»의 것이다.
 */
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
    const [target] = await tx.query<{ studentId: string }>(
      `SELECT "student_id" AS "studentId" FROM "textbook_concept_attempt" WHERE "id" = $1::uuid`,
      [attemptId],
    );
    if (!target) throw notFound("활동 기록");
    await requireStudentScope(tx, actor, target.studentId, "progress:write", {
      lock: true,
    });
    const { result, replayed } = await runOnce(tx, key, async () => {
      const [current] = await tx.query<TextbookConceptAttempt>(
        `${textbookAttemptSelectSql} WHERE a."id" = $1::uuid FOR UPDATE OF a`,
        [attemptId],
      );
      if (!current) throw notFound("활동 기록");
      // 잠근 뒤에 다시 본다 — 위의 검사와 잠금 사이에 학생이 옮겨 갔을 수 있다
      await requireStudentScope(
        tx,
        actor,
        current.studentId,
        "progress:write",
        { lock: true },
      );
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
        `${textbookAttemptSelectSql} WHERE a."id" = $1::uuid`,
        [attemptId],
      );
      return attempt!;
    });
    return { attempt: result, replayed };
  });
}

export interface ConceptEvidenceReference {
  editionId: string;
  conceptKey: string;
  bookTitle: string | null;
  editionLabel: string | null;
  conceptTitle: string | null;
  canOpen: boolean;
}

/**
 * 백지 활동이 가리키는 (판본, 개념)의 **표시 정보** — 화면이 id 대신 책 · 개념의 이름을 보이게.
 *
 * 🔴 이름은 **지금 그 판본을 읽을 수 있을 때만** 낸다(내 책이거나, 지점에 공유된 동료의 발행본).
 *    내 학생이 예전에 남의 책으로 활동한 기록이 있다고 그 책의 제목이 열리지 않는다 — 읽을 수 없으면 이름은 전부 null 이고
 *    `canOpen` 이 false 다. 활동 기록 자체(형식 · 시각 · 확인 상태)는 내 학생의 것이라 그대로 보인다.
 */
export async function conceptEvidenceReferences(
  sql: TextbookSql,
  actor: TextbookActor,
  attempts: ReadonlyArray<{ editionId: string; conceptKey: string }>,
): Promise<ConceptEvidenceReference[]> {
  const pairs = [
    ...new Map(
      attempts.map((attempt) => [
        `${attempt.editionId}/${attempt.conceptKey}`,
        { editionId: attempt.editionId, conceptKey: attempt.conceptKey },
      ]),
    ).values(),
  ];
  if (!pairs.length) return [];
  const rows = await sql.query<
    ConceptEvidenceReference & { bookTitle: string; editionLabel: string }
  >(
    `SELECT r."editionId", r."conceptKey", t."title" AS "bookTitle", e."label" AS "editionLabel",
            c."title" AS "conceptTitle", ${readableEditionSql("$1", "$3")} AS "canOpen"
       FROM jsonb_to_recordset($2::jsonb) AS r("editionId" uuid, "conceptKey" text)
       JOIN "textbook_edition" e ON e."id" = r."editionId"
       JOIN "textbook" t ON t."id" = e."textbook_id"
       JOIN "user" o ON o."id" = t."user_id"
       LEFT JOIN "textbook_concept" c ON c."edition_id" = e."id" AND c."concept_key" = r."conceptKey"`,
    [actor.id, JSON.stringify(pairs), actor.branchId],
  );
  const known = new Map(
    rows.map((row) => [`${row.editionId}/${row.conceptKey}`, row]),
  );
  return pairs.map((pair) => {
    const row = known.get(`${pair.editionId}/${pair.conceptKey}`);
    return row?.canOpen
      ? {
          ...pair,
          bookTitle: row.bookTitle,
          editionLabel: row.editionLabel,
          conceptTitle: row.conceptTitle,
          canOpen: true,
        }
      : {
          ...pair,
          bookTitle: null,
          editionLabel: null,
          conceptTitle: null,
          canOpen: false,
        };
  });
}

/** 내 학생 한 명의 백지 활동 — 새것부터 */
export async function studentConceptAttempts(
  sql: TextbookSql,
  actor: TextbookActor,
  studentId: string,
): Promise<TextbookConceptAttempt[]> {
  await requireStudentScope(sql, actor, studentId, "progress:read");
  return sql.query<TextbookConceptAttempt>(
    `${textbookAttemptSelectSql} WHERE a."student_id" = $1::uuid ORDER BY a."submitted_at" DESC, a."id" LIMIT 500`,
    [studentId],
  );
}
