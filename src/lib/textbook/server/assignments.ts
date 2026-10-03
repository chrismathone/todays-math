/**
 * 배정 — 반 또는 학생 하나에, 판본 전체 · 구획들 · 배치들을. 회수는 줄을 지우지 않고 시각을 찍는다.
 *
 * 배정하는 사람은 ⑴ 그 판본을 **읽을 수 있어야** 하고(주인, 또는 지점에 공유된 발행본의 동료) ⑵ 그 반 · 학생이
 * 현재 담당 권한이 있어야 한다. 책의 소유권만으로 반·학생에게 배정할 수는 없다.
 * 🔴 발행본에만 건다(DB 트리거도 다시 본다). 범위의 id 는 그 판본의 구획 · 놓인 배치여야 한다 — 없는 id 를 건너뛰지 않는다.
 * 🔴 진도 표를 읽지도 쓰지도 않는다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookAssignment } from "@/contracts/textbook.contract";

import { type TextbookActor, requireReadableEdition } from "../access";
import { conflict, invalid, notFound } from "./errors";
import {
  mayUseClass,
  mayUseStudent,
  requireClassScope,
  requireStudentScope,
} from "./operationalScope";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, isoColumn } from "./sql";

type Subject = TextbookAssignment["subject"];
type Scope = TextbookAssignment["scope"];

interface AssignmentRow {
  id: string;
  editionId: string;
  classId: string | null;
  studentId: string | null;
  scopeKind: Scope["kind"];
  scopeIds: string[];
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

const ASSIGNMENT_SQL = `
  SELECT a."id", a."edition_id" AS "editionId", a."class_id" AS "classId", a."student_id" AS "studentId",
         a."scope_kind" AS "scopeKind", a."scope_ids" AS "scopeIds", ${isoColumn(`a."opens_at"`)} AS "startsAt",
         ${isoColumn(`a."expires_at"`)} AS "expiresAt", ${isoColumn(`a."revoked_at"`)} AS "revokedAt"
    FROM "textbook_assignment" a`;

function toAssignment(row: AssignmentRow): TextbookAssignment {
  const subject: Subject = row.classId
    ? { kind: "class", classId: row.classId }
    : { kind: "student", studentId: row.studentId! };
  const scope: Scope =
    row.scopeKind === "edition"
      ? { kind: "edition" }
      : row.scopeKind === "sections"
        ? { kind: "sections", sectionIds: row.scopeIds }
        : { kind: "items", itemIds: row.scopeIds };
  return {
    id: row.id,
    editionId: row.editionId,
    subject,
    scope,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

export async function listAssignments(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
): Promise<TextbookAssignment[]> {
  await requireReadableEdition(sql, actor, editionId);
  const rows = await sql.query<AssignmentRow>(
    `${ASSIGNMENT_SQL} WHERE a."edition_id" = $1::uuid ORDER BY a."created_at" DESC, a."id"`,
    [editionId],
  );
  const visible: TextbookAssignment[] = [];
  for (const row of rows) {
    const allowed = row.classId
      ? await mayUseClass(sql, actor, row.classId, "progress:read")
      : row.studentId &&
        (await mayUseStudent(sql, actor, row.studentId, "progress:read"));
    if (allowed) visible.push(toAssignment(row));
  }
  return visible;
}

export interface CreateAssignmentInput {
  subject: Subject;
  scope: Scope;
  startsAt: string;
  expiresAt: string | null;
}

export async function createAssignment(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  key: RequestKey,
  input: CreateAssignmentInput,
): Promise<{ assignment: TextbookAssignment; replayed: boolean }> {
  return db.transaction(async (tx) => {
    // 🔴 지금의 범위를 재전송 기록보다 먼저 본다 — 끝난 요청이 다시 와도(일을 건너뛰어도) 이 둘은 지금의 것으로 본다:
    //    그 판본을 지금 읽을 수 있는가 · 그 반 · 학생이 지금 내 것인가. 공유가 닫히거나 학생이 옮겨 간 뒤의 재전송은 404 다
    const access = await requireReadableEdition(tx, actor, editionId);
    if (input.subject.kind === "class")
      await requireClassScope(
        tx,
        actor,
        input.subject.classId,
        "progress:write",
        { lock: true },
      );
    else
      await requireStudentScope(
        tx,
        actor,
        input.subject.studentId,
        "progress:write",
        { lock: true },
      );
    const { result, replayed } = await runOnce(tx, key, async () => {
      if (access.status !== "published")
        throw conflict("발행한 판본만 배정할 수 있습니다.");

      const scopeIds =
        input.scope.kind === "edition"
          ? []
          : input.scope.kind === "sections"
            ? input.scope.sectionIds
            : input.scope.itemIds;
      if (new Set(scopeIds).size !== scopeIds.length)
        throw invalid("범위에 같은 것이 두 번 들어 있습니다.");
      if (input.scope.kind !== "edition") {
        const [{ found }] = await tx.query<{ found: number }>(
          input.scope.kind === "sections"
            ? `SELECT count(*)::int AS found FROM "textbook_section"
                WHERE "edition_id" = $1::uuid AND "id"::text IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`
            : `SELECT count(*)::int AS found FROM "textbook_item"
                WHERE "edition_id" = $1::uuid AND "section_id" IS NOT NULL
                  AND "id"::text IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
          [editionId, JSON.stringify(scopeIds)],
        );
        if (found !== scopeIds.length)
          throw invalid("이 판본에 없는 구획이나 문항이 범위에 들어 있습니다.");
      }

      const id = randomUUID();
      await tx.execute(
        `INSERT INTO "textbook_assignment" ("id", "edition_id", "class_id", "student_id", "scope_kind", "scope_ids",
              "opens_at", "expires_at", "assigned_by")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::text, $6::jsonb, $7::timestamp, $8::timestamp, $9::uuid)`,
        [
          id,
          editionId,
          input.subject.kind === "class" ? input.subject.classId : null,
          input.subject.kind === "student" ? input.subject.studentId : null,
          input.scope.kind,
          JSON.stringify(scopeIds),
          new Date(input.startsAt).toISOString(),
          input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
          actor.id,
        ],
      );
      const [row] = await tx.query<AssignmentRow>(
        `${ASSIGNMENT_SQL} WHERE a."id" = $1::uuid`,
        [id],
      );
      return toAssignment(row!);
    });
    return { assignment: result, replayed };
  });
}

/** 회수 — 현재 그 반·학생의 기록을 쓸 수 있는 담당자만. 이미 회수한 것을 다시 회수해도 같은 결과다 */
export async function revokeAssignment(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  assignmentId: string,
  key: RequestKey,
): Promise<{ assignment: TextbookAssignment; replayed: boolean }> {
  return db.transaction(async (tx) => {
    // 🔴 지금의 범위를 재전송 기록보다 먼저 본다 — 그 반 · 학생이 지금 내 것일 때만(재전송도 같다)
    const [mine] = await tx.query<AssignmentRow>(
      `${ASSIGNMENT_SQL} WHERE a."id" = $2::uuid AND a."edition_id" = $1::uuid`,
      [editionId, assignmentId],
    );
    if (!mine) throw notFound("배정");
    if (mine.classId)
      await requireClassScope(tx, actor, mine.classId, "progress:write", {
        lock: true,
      });
    else if (mine.studentId)
      await requireStudentScope(tx, actor, mine.studentId, "progress:write", {
        lock: true,
      });
    else throw notFound("배정");
    const { result, replayed } = await runOnce(tx, key, async () => {
      const [current] = await tx.query<AssignmentRow>(
        `${ASSIGNMENT_SQL} WHERE a."id" = $2::uuid AND a."edition_id" = $1::uuid FOR UPDATE OF a`,
        [editionId, assignmentId],
      );
      if (!current) throw notFound("배정");
      if (!current.revokedAt)
        await tx.execute(
          `UPDATE "textbook_assignment" SET "revoked_at" = ${SQL_NOW} WHERE "id" = $1::uuid AND "revoked_at" IS NULL`,
          [assignmentId],
        );
      const [row] = await tx.query<AssignmentRow>(
        `${ASSIGNMENT_SQL} WHERE a."id" = $1::uuid`,
        [assignmentId],
      );
      return toAssignment(row!);
    });
    return { assignment: result, replayed };
  });
}
