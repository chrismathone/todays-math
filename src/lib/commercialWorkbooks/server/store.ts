import "server-only";
import { Prisma } from "@prisma/client";
import type {
  WorkbookAssignment,
  WorkbookEdition,
  WorkbookEditionDetail,
  WorkbookGradeEvent,
  WorkbookKeyRevision,
  WorkbookMetadata,
  WorkbookWrongNote,
} from "@/contracts/commercialWorkbook.contract";
import type { WorkbookReceipt, WorkbookStore } from "../store";
import { fail } from "../errors";

type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
type EditionRow = {
  id: string;
  metadata: WorkbookMetadata;
  revision: number;
  createdAt: Date;
  revisions: WorkbookKeyRevision[];
};
type AssignmentRow = {
  snapshot: WorkbookAssignment;
  grades: { studentId: string; event: WorkbookGradeEvent }[];
};
function editionDto(row: EditionRow): WorkbookEditionDetail {
  const latest = row.revisions.at(-1);
  if (!latest || latest.revision !== row.revision)
    fail("UNAVAILABLE", "저장된 교재 버전을 확인해야 합니다.");
  return {
    id: row.id,
    metadata: row.metadata,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    provenance: latest.provenance,
    exercises: latest.exercises,
    revisions: row.revisions,
    exerciseCount: latest.exercises.length,
    reviewedKeyCount: latest.exercises.filter(
      (e) => e.key?.status === "reviewed",
    ).length,
    missingKeyCount: latest.exercises.filter((e) => !e.key).length,
  };
}
function assignmentDto(row: AssignmentRow): WorkbookAssignment {
  const result = structuredClone(row.snapshot);
  for (const { studentId, event } of row.grades) {
    const target = result.targets.find((t) => t.studentId === studentId);
    if (!target || event.previousRevision !== target.revision)
      fail("UNAVAILABLE", "저장된 채점 이력을 확인해야 합니다.");
    target.revision = event.revision;
    target.history.push(event);
    for (const mark of event.marks) target.marks[mark.exerciseId] = mark.mark;
  }
  return result;
}
/** Typed parameterized SQL avoids generating into shared node_modules. */
export function createSqlWorkbookStore(
  tx: SqlClient,
  ownerId: string,
): WorkbookStore {
  const editions = async (id?: string) =>
    (
      await tx.$queryRaw<EditionRow[]>(Prisma.sql`
    SELECT e.id, e.metadata, e.revision, e.created_at AS "createdAt",
      (SELECT jsonb_agg(r.snapshot ORDER BY r.revision) FROM commercial_workbook_revision r WHERE r.edition_id = e.id) AS revisions
    FROM commercial_workbook_edition e WHERE e.owner_id = ${ownerId}::uuid
      ${id ? Prisma.sql`AND e.id = ${id}::uuid` : Prisma.empty}
    ORDER BY e.created_at DESC, e.id DESC`)
    ).map(editionDto);
  const assignments = async (id?: string, after?: string, limit = 21) =>
    (
      await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
    SELECT a.snapshot, COALESCE((SELECT jsonb_agg(jsonb_build_object('studentId', g.student_id, 'event', g.snapshot) ORDER BY g.revision, g.id)
      FROM commercial_workbook_grade_event g WHERE g.assignment_id = a.id), '[]'::jsonb) AS grades
    FROM commercial_workbook_assignment a WHERE a.owner_id = ${ownerId}::uuid
      ${id ? Prisma.sql`AND a.id = ${id}::uuid` : Prisma.empty}
      ${after ? Prisma.sql`AND (a.created_at, a.id) < (SELECT created_at, id FROM commercial_workbook_assignment WHERE id = ${after}::uuid AND owner_id = ${ownerId}::uuid)` : Prisma.empty}
    ORDER BY a.created_at DESC, a.id DESC LIMIT ${limit}`)
    ).map(assignmentDto);
  return {
    listEditions: async () =>
      (
        await tx.$queryRaw<
          (Omit<WorkbookEdition, "createdAt"> & { createdAt: Date })[]
        >`
      SELECT e.id, e.metadata, e.revision, e.created_at AS "createdAt",
        jsonb_array_length(r.snapshot->'exercises') AS "exerciseCount",
        (SELECT count(*)::integer FROM jsonb_array_elements(r.snapshot->'exercises') x WHERE x->'key'->>'status' = 'reviewed') AS "reviewedKeyCount",
        (SELECT count(*)::integer FROM jsonb_array_elements(r.snapshot->'exercises') x WHERE x->'key' = 'null'::jsonb) AS "missingKeyCount"
      FROM commercial_workbook_edition e JOIN commercial_workbook_revision r ON r.edition_id = e.id AND r.revision = e.revision
      WHERE e.owner_id = ${ownerId}::uuid ORDER BY e.created_at DESC, e.id DESC`
      ).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    getEdition: async (id) => (await editions(id))[0] ?? null,
    putEdition: async (value) => {
      if (value.revision === 1)
        await tx.$executeRaw`
        INSERT INTO commercial_workbook_edition(id, owner_id, metadata, revision, created_at)
        VALUES (${value.id}::uuid, ${ownerId}::uuid, ${JSON.stringify(value.metadata)}::jsonb, 1, ${new Date(value.createdAt)})`;
      const latest = value.revisions.at(-1)!;
      await tx.$executeRaw`
        INSERT INTO commercial_workbook_revision(edition_id, revision, snapshot)
        SELECT id, ${latest.revision}, ${JSON.stringify(latest)}::jsonb FROM commercial_workbook_edition
        WHERE id = ${value.id}::uuid AND owner_id = ${ownerId}::uuid`;
      if (value.revision > 1) {
        const changed =
          await tx.$executeRaw`UPDATE commercial_workbook_edition SET revision = ${value.revision}
          WHERE id = ${value.id}::uuid AND owner_id = ${ownerId}::uuid AND revision = ${value.revision - 1}`;
        if (changed !== 1)
          fail("STALE_REVISION", "교재 정답이 변경되었습니다.");
      }
    },
    listAssignments: (after, limit) => assignments(undefined, after, limit),
    getAssignment: async (id) => (await assignments(id))[0] ?? null,
    insertAssignment: async (value) => {
      await tx.$executeRaw`
      INSERT INTO commercial_workbook_assignment(id, owner_id, class_id, edition_id, key_revision, snapshot, created_at)
      VALUES (${value.id}::uuid, ${ownerId}::uuid, ${value.classId}::uuid, ${value.edition.id}::uuid,
        ${value.edition.revision}, ${JSON.stringify(value)}::jsonb, ${new Date(value.createdAt)})`;
    },
    appendGrade: async (assignmentId, studentId, event) => {
      await tx.$executeRaw`
      INSERT INTO commercial_workbook_grade_event(id, assignment_id, student_id, revision, snapshot)
      SELECT ${event.id}::uuid, id, ${studentId}::uuid, ${event.revision}, ${JSON.stringify(event)}::jsonb
      FROM commercial_workbook_assignment WHERE id = ${assignmentId}::uuid AND owner_id = ${ownerId}::uuid`;
    },
    listNotes: async () =>
      (
        await tx.$queryRaw<{ snapshot: WorkbookWrongNote }[]>`
      SELECT snapshot FROM commercial_workbook_wrong_note WHERE owner_id = ${ownerId}::uuid
      ORDER BY snapshot->>'updatedAt' DESC, id DESC`
      ).map((r) => r.snapshot),
    getNote: async (id) =>
      (
        await tx.$queryRaw<{ snapshot: WorkbookWrongNote }[]>`
      SELECT snapshot FROM commercial_workbook_wrong_note WHERE id = ${id}::uuid AND owner_id = ${ownerId}::uuid`
      )[0]?.snapshot ?? null,
    putNote: async (value) => {
      if (value.revision === 0) {
        await tx.$executeRaw`INSERT INTO commercial_workbook_wrong_note(id, owner_id, assignment_id, student_id, exercise_id, event_id, revision, snapshot)
          VALUES (${value.id}::uuid, ${ownerId}::uuid, ${value.assignmentId}::uuid, ${value.studentId}::uuid,
            ${value.exerciseId}::uuid, ${value.originalWrongEvent.id}::uuid, 0, ${JSON.stringify(value)}::jsonb)`;
      } else {
        const changed =
          await tx.$executeRaw`UPDATE commercial_workbook_wrong_note SET revision = ${value.revision}, snapshot = ${JSON.stringify(value)}::jsonb
          WHERE id = ${value.id}::uuid AND owner_id = ${ownerId}::uuid AND revision = ${value.revision - 1}`;
        if (changed !== 1)
          fail("STALE_REVISION", "오답 기록이 변경되었습니다.");
      }
    },
    getReceipt: async (requestId) =>
      (
        await tx.$queryRaw<WorkbookReceipt[]>`
      SELECT request_id AS "requestId", fingerprint, response AS result FROM commercial_workbook_request
      WHERE owner_id = ${ownerId}::uuid AND request_id = ${requestId}`
      )[0] ?? null,
    insertReceipt: async (value) => {
      await tx.$executeRaw`
      INSERT INTO commercial_workbook_request(owner_id, request_id, fingerprint, response)
      VALUES (${ownerId}::uuid, ${value.requestId}, ${value.fingerprint}, ${JSON.stringify(value.result)}::jsonb)`;
    },
  };
}
