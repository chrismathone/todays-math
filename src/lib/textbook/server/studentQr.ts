/**
 * 학생이 QR 하나를 열 수 있는가 — 판정은 여기 **한 곳**이다. QR 내용 · QR 그림 · 개념 QR 이 같이 쓴다.
 *
 * 학생 S 가 대상(배치 또는 개념)을 열 수 있는 조건 — 전부 참이어야 한다:
 *   ⑴ 판본이 발행됨이고 QR 이 켜져 있으며(active) 중지되지 않았다
 *   ⑵ 배정이 있다: 같은 판본 · 회수 안 됨 · 지금이 시작 ~ 만료 안
 *   ⑶ 그 배정이 S 를 가리킨다: 학생 본인이거나 S 의 **지금** 반
 *   ⑷ 그 배정이 대상을 덮는다: 판본 전체 · 대상의 구획 · 대상 배치
 *   ⑸ 판본의 주인과 그 반의 주인이 **지금도** 같은 범위다: 같은 계정이거나, 책이 지점 공유이고 둘 다 지금 그 지점의 살아 있는 계정
 *   ⑹ 판본의 주인 계정이 정지 · 삭제 상태가 아니다
 *
 * 🔴 진도 표를 읽지도 쓰지도 않는다 · 교사의 `textbook` 메뉴를 꺼도 학생 열람은 그대로다(여기서 메뉴를 묻지 않는다).
 * 🔴 학생 id 는 **세션에서만** 온다 — 이 함수에 넘기는 `studentId` 를 요청 본문에서 읽지 않는다.
 * 🔴 예약(reserved) · 무효(void) QR 은 학생에게 «없는 것»이다. 사유를 갈라 알리지 않는다.
 */
import type { TextbookSql } from "./sql";

export type StudentQrDenial =
  /** 없는 주소 · 예약만 된 주소 · 무효가 된 주소 — 학생에게는 같은 것이다 */
  | "not-found"
  /** 인쇄된 QR 이지만 판본이 종료됐거나 QR 이 중지됐다 — 안내 화면을 보인다 */
  | "closed"
  /** 배정이 없거나 회수 · 만료됐다 */
  | "not-assigned";

export interface StudentQrTarget {
  qrTargetId: string;
  slug: string;
  kind: "item" | "concept";
  editionId: string;
  ownerId: string;
  itemId: string | null;
  snapshotId: string | null;
  conceptKey: string | null;
  sectionId: string | null;
}

export type StudentQrAccess =
  | { ok: true; target: StudentQrTarget }
  | { ok: false; reason: StudentQrDenial };

interface QrRow extends StudentQrTarget {
  state: string;
  suspended: boolean;
  editionStatus: string;
  visibility: string;
  sharedBranchId: string | null;
  ownerBranchId: string | null;
  ownerActive: boolean;
  /** 이 개념을 연습하는 배치들 — 개념 QR 을 «배치 범위» 배정이 덮는지 볼 때 쓴다 */
  conceptItemIds: string[];
}

interface StudentRow {
  classId: string;
  classOwnerId: string;
  classOwnerBranchId: string | null;
  classOwnerActive: boolean;
}

export interface AssignmentRow {
  classId: string | null;
  studentId: string | null;
  scopeKind: "edition" | "sections" | "items";
  scopeIds: string[];
  /** DB 의 지금으로 본 값 — 열려 있고(시작함 · 만료 전) 회수되지 않았다 */
  open: boolean;
}

/** ⑸ 판본의 주인과 반의 주인이 지금 같은 범위인가 */
export function ownersShareScope(
  qr: Pick<
    QrRow,
    "ownerId" | "visibility" | "sharedBranchId" | "ownerBranchId"
  >,
  student: StudentRow,
): boolean {
  if (qr.ownerId === student.classOwnerId) return true;
  return (
    qr.visibility === "branch" &&
    qr.sharedBranchId !== null &&
    qr.ownerBranchId === qr.sharedBranchId &&
    student.classOwnerBranchId === qr.sharedBranchId &&
    student.classOwnerActive
  );
}

/** ⑷ 배정이 대상을 덮는가 */
export function assignmentCovers(
  assignment: Pick<AssignmentRow, "scopeKind" | "scopeIds">,
  target: Pick<QrRow, "kind" | "itemId" | "sectionId" | "conceptItemIds">,
): boolean {
  if (assignment.scopeKind === "edition") return true;
  if (assignment.scopeKind === "sections")
    return (
      target.sectionId !== null &&
      assignment.scopeIds.includes(target.sectionId)
    );
  if (target.kind === "item")
    return (
      target.itemId !== null && assignment.scopeIds.includes(target.itemId)
    );
  return target.conceptItemIds.some((itemId) =>
    assignment.scopeIds.includes(itemId),
  );
}

export function judgeStudentQr(
  studentId: string,
  qr: QrRow | null,
  student: StudentRow | null,
  assignments: readonly AssignmentRow[],
): StudentQrAccess {
  if (!qr || !student || qr.state !== "active")
    return { ok: false, reason: "not-found" };
  // ⑹ 주인 계정이 닫혔으면 인쇄된 QR 은 «닫힘»이다
  if (qr.editionStatus !== "published" || qr.suspended || !qr.ownerActive)
    return { ok: false, reason: "closed" };
  if (!ownersShareScope(qr, student))
    return { ok: false, reason: "not-assigned" };
  const covered = assignments.some(
    (assignment) =>
      assignment.open &&
      (assignment.studentId === studentId ||
        assignment.classId === student.classId) &&
      assignmentCovers(assignment, qr),
  );
  if (!covered) return { ok: false, reason: "not-assigned" };
  return {
    ok: true,
    target: {
      qrTargetId: qr.qrTargetId,
      slug: qr.slug,
      kind: qr.kind,
      editionId: qr.editionId,
      ownerId: qr.ownerId,
      itemId: qr.itemId,
      snapshotId: qr.snapshotId,
      conceptKey: qr.conceptKey,
      sectionId: qr.sectionId,
    },
  };
}

const ACTIVE = (alias: string) =>
  `(${alias}."deleted_at" IS NULL AND ${alias}."suspended_at" IS NULL AND ${alias}."approval_status" = 'approved')`;

/** 매 요청마다 부른다 — 회수 · 만료 · 반 이동 · 지점 이동이 다음 요청에 바로 반영된다 */
export async function resolveStudentQr(
  sql: TextbookSql,
  studentId: string,
  slug: string,
): Promise<StudentQrAccess> {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(slug))
    return { ok: false, reason: "not-found" };
  const [qr] = await sql.query<QrRow>(
    `SELECT q."id" AS "qrTargetId", q."slug", q."kind", q."edition_id" AS "editionId", t."user_id" AS "ownerId",
            q."item_id" AS "itemId", i."snapshot_id" AS "snapshotId", q."concept_key" AS "conceptKey",
            COALESCE(i."section_id", c."section_id") AS "sectionId",
            q."state", q."suspended_at" IS NOT NULL AS "suspended", e."status" AS "editionStatus",
            t."visibility", t."shared_branch_id" AS "sharedBranchId", o."branch_id" AS "ownerBranchId",
            ${ACTIVE("o")} AS "ownerActive",
            COALESCE((SELECT jsonb_agg(ci."id") FROM "textbook_item" ci
                       WHERE q."kind" = 'concept' AND ci."edition_id" = q."edition_id" AND ci."section_id" IS NOT NULL
                         AND ci."concept_keys" ? q."concept_key"), '[]'::jsonb) AS "conceptItemIds"
       FROM "textbook_qr_target" q
       JOIN "textbook_edition" e ON e."id" = q."edition_id"
       JOIN "textbook" t ON t."id" = e."textbook_id"
       JOIN "user" o ON o."id" = t."user_id"
       LEFT JOIN "textbook_item" i ON i."edition_id" = q."edition_id" AND i."id" = q."item_id"
       LEFT JOIN "textbook_concept" c ON c."edition_id" = q."edition_id" AND c."concept_key" = q."concept_key"
      WHERE q."slug" = $1::text`,
    [slug],
  );
  if (!qr) return { ok: false, reason: "not-found" };
  const [student] = await sql.query<StudentRow>(
    `SELECT s."class_id" AS "classId", c."user_id" AS "classOwnerId", u."branch_id" AS "classOwnerBranchId",
            ${ACTIVE("u")} AS "classOwnerActive"
       FROM "student" s JOIN "class" c ON c."id" = s."class_id" JOIN "user" u ON u."id" = c."user_id"
      WHERE s."id" = $1::uuid`,
    [studentId],
  );
  if (!student) return { ok: false, reason: "not-found" };
  const assignments = await sql.query<AssignmentRow>(
    `SELECT a."class_id" AS "classId", a."student_id" AS "studentId", a."scope_kind" AS "scopeKind",
            a."scope_ids" AS "scopeIds",
            (a."revoked_at" IS NULL AND a."opens_at" <= (now() AT TIME ZONE 'UTC')
             AND (a."expires_at" IS NULL OR a."expires_at" > (now() AT TIME ZONE 'UTC'))) AS "open"
       FROM "textbook_assignment" a
      WHERE a."edition_id" = $1::uuid AND (a."student_id" = $2::uuid OR a."class_id" = $3::uuid)`,
    [qr.editionId, studentId, student.classId],
  );
  return judgeStudentQr(studentId, qr, student, assignments);
}

/**
 * 그 QR 의 대상이 가리키는 자산인가 — 학생용 그림 경로가 매 요청마다 묻는다.
 * 배치면 그 확정본의 그림들, 개념이면 굳은 개념의 자산 해시들. 판본의 다른 그림은 열지 못한다.
 */
export async function qrTargetReferencesAsset(
  sql: TextbookSql,
  target: StudentQrTarget,
  assetId: string,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(assetId)) return false;
  const [row] =
    target.kind === "item"
      ? await sql.query<{ found: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM "textbook_problem_snapshot" s, jsonb_array_elements(s."payload" -> 'figures') f
              WHERE s."id" = $1::uuid AND f ->> 'assetId' = $2::text) AS found`,
          [target.snapshotId, assetId],
        )
      : await sql.query<{ found: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM "textbook_concept" c, jsonb_array_elements(c."frozen" -> 'assetHashes') a
              WHERE c."edition_id" = $1::uuid AND c."concept_key" = $2::text AND a ->> 'assetId' = $3::text) AS found`,
          [target.editionId, target.conceptKey, assetId],
        );
  return row?.found === true;
}
