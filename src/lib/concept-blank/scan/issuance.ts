import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import {
  scanSnapshotSchema,
  type ScanSnapshot,
} from "@/contracts/conceptBlankScan.contract";
import {
  scanIssueInputSchema,
  scanIssuedLayoutSchema,
  scanPaperArtifactSchema,
  type ScanIssuedLayout,
  type ScanPaperArtifact,
} from "@/contracts/conceptBlankScanIssued.contract";
import { withinOwnerScope, type ScopeViewer } from "@/lib/ownerScope";
import { workspaceMenuPolicy } from "@/lib/workspaceMenuPolicy";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import { matchScanLayout } from "./layout";
import { scanIssueViewSchema } from "@/contracts/conceptBlankScanApi.contract";

export type ScanIdentity = Readonly<{
  kind: "student" | "teacher";
  id: string;
}>;
export class ScanAccessError extends Error {
  constructor(
    message: string,
    readonly status = 403,
  ) {
    super(message);
    this.name = "ScanAccessError";
  }
}
export type ScanIssue = {
  id: string;
  userId: string;
  branchId: string | null;
  snapshot: ScanSnapshot;
  layout: ScanIssuedLayout;
};
type AccountRow = {
  id: string;
  role: string;
  approvalStatus: string;
  deletedAt: Date | null;
  suspendedAt: Date | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  branchId: string | null;
  branchRole: "owner" | "manager" | "teacher" | null;
  disabledMenus: string[];
  branchDisabled: string[] | null;
  ownerDisabled: string[] | null;
  branchMenuRevision: number | null;
};
export type ScanStudent = {
  id: string;
  name: string;
  classId: string;
  className: string;
  ownerId: string;
  branchId: string | null;
};
export { scanIssueInputSchema } from "@/contracts/conceptBlankScanIssued.contract";

/** Issuer eligibility uses today's account/menu/scope, not a claim in the QR. */
export async function scanTeacher(
  sql: ScanSql,
  id: string,
): Promise<ScopeViewer> {
  const [row] = await sql.query<AccountRow>(
    `SELECT u.id,u.role,u.approval_status AS "approvalStatus",u.deleted_at AS "deletedAt",u.suspended_at AS "suspendedAt",
    u.is_admin AS "isAdmin",u.is_super_admin AS "isSuperAdmin",u.branch_id AS "branchId",u.branch_role AS "branchRole",u.disabled_menus AS "disabledMenus",
    b.disabled_menus AS "branchDisabled",b.owner_disabled_menus AS "ownerDisabled",b.menu_revision AS "branchMenuRevision"
    FROM "user" u LEFT JOIN branch b ON b.id=u.branch_id WHERE u.id=$1::uuid`,
    [z.uuid().parse(id)],
  );
  if (
    !row ||
    row.role !== "director" ||
    row.approvalStatus !== "approved" ||
    row.deletedAt ||
    row.suspendedAt
  )
    throw new ScanAccessError("발행 교사의 현재 권한을 확인할 수 없습니다.");
  const policy = workspaceMenuPolicy({
    ...row,
    branch:
      row.branchId && row.branchMenuRevision !== null
        ? {
            disabledMenus: row.branchDisabled ?? [],
            ownerDisabledMenus: row.ownerDisabled ?? [],
            menuRevision: row.branchMenuRevision,
          }
        : null,
  });
  if (!policy.menus.includes("conceptBlank"))
    throw new ScanAccessError("개념 백지 메뉴가 꺼져 있습니다.");
  return {
    id: row.id,
    branchId: row.branchId,
    branchRole: row.branchRole,
    isSuperAdmin: row.isSuperAdmin,
    // Same fresh-account normalization as auth.ts; ownerScope owns the scope predicate.
    isAdmin:
      row.isSuperAdmin ||
      (row.isAdmin &&
        !!row.branchId &&
        (row.branchRole === "owner" || row.branchRole === "manager")),
  };
}

export async function loadScanIssue(
  id: string,
  sql: ScanSql,
): Promise<ScanIssue> {
  const [row] = await sql
    .query<{
      id: string;
      user_id: string;
      branch_id: string | null;
      snapshot: unknown;
      layout: unknown;
    }>(
      `SELECT id,user_id,branch_id,snapshot,layout FROM concept_blank_printed_sheet WHERE id=$1::uuid`,
      [z.uuid().parse(id)],
    )
    .catch(scanDatabaseError);
  if (!row)
    throw new ScanAccessError(
      "저장된 발행 지면이 없습니다. 새로 발행해 주세요.",
      404,
    );
  return {
    id: row.id,
    userId: row.user_id,
    branchId: row.branch_id,
    snapshot: scanSnapshotSchema.parse(row.snapshot),
    layout: scanIssuedLayoutSchema.parse(row.layout),
  };
}

function issueAllowed(viewer: ScopeViewer, issue: ScanIssue) {
  if (!withinOwnerScope(viewer, issue.userId, issue.branchId))
    throw new ScanAccessError("이 발행 지면을 볼 권한이 없습니다.");
}

export async function scanSubmissionAccess(
  actor: ScanIdentity,
  issueId: string,
  studentId: string,
  sql: ScanSql,
) {
  if (actor.kind === "student" && actor.id !== studentId)
    throw new ScanAccessError("학생은 본인 답안만 제출할 수 있습니다.");
  const issue = await loadScanIssue(issueId, sql);
  const issuer = await scanTeacher(sql, issue.userId);
  issueAllowed(issuer, issue);
  const [student] = await sql.query<ScanStudent>(
    `SELECT s.id,s.name,s.class_id AS "classId",c.name AS "className",c.user_id AS "ownerId",c.branch_id AS "branchId"
    FROM student s JOIN "class" c ON c.id=s.class_id WHERE s.id=$1::uuid AND s.eywa_withdrawn_at IS NULL`,
    [z.uuid().parse(studentId)],
  );
  if (!student || !withinOwnerScope(issuer, student.ownerId, student.branchId))
    throw new ScanAccessError(
      "발행 교사가 현재 맡은 학생의 답안만 제출할 권한이 있습니다.",
    );
  if (actor.kind === "teacher") {
    const viewer = await scanTeacher(sql, actor.id);
    issueAllowed(viewer, issue);
    if (!withinOwnerScope(viewer, student.ownerId, student.branchId))
      throw new ScanAccessError("이 학생의 답안을 볼 권한이 없습니다.");
  }
  return { issue, student };
}

type RenderedPaper = {
  snapshot: ScanSnapshot;
  layout: ScanIssuedLayout;
  artifact: ScanPaperArtifact;
};
export async function issueScanPaper(
  actor: ScanIdentity,
  input: { requestId: string; selection: ConceptBlankSelection },
  deps: {
    db: ScanDatabase;
    render: (
      id: string,
      selection: ConceptBlankSelection,
    ) => Promise<RenderedPaper>;
  },
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("교사만 지면을 발행할 수 있습니다.");
  const parsed = scanIssueInputSchema.parse(input);
  const viewer = await scanTeacher(deps.db, actor.id);
  const existing = async () => {
    const [row] = await deps.db
      .query<{ id: string }>(
        `SELECT id FROM concept_blank_printed_sheet WHERE user_id=$1::uuid AND request_id=$2::uuid`,
        [actor.id, parsed.requestId],
      )
      .catch(scanDatabaseError);
    if (!row) return null;
    const issue = await loadScanIssue(row.id, deps.db);
    issueAllowed(viewer, issue);
    if (
      JSON.stringify(issue.snapshot.selection) !==
      JSON.stringify(parsed.selection)
    )
      throw new ScanAccessError(
        "같은 발행 요청에 다른 고르기를 보낼 수 없습니다.",
        409,
      );
    return { id: issue.id };
  };
  const prior = await existing();
  if (prior) return prior;
  const id = randomUUID();
  const rendered = await deps.render(id, parsed.selection);
  const snapshot = scanSnapshotSchema.parse(rendered.snapshot);
  if (JSON.stringify(snapshot.selection) !== JSON.stringify(parsed.selection))
    throw new Error("발행한 고르기가 요청과 다릅니다.");
  const layout = matchScanLayout(snapshot, rendered.layout);
  const artifact = scanPaperArtifactSchema.parse(rendered.artifact);
  if (
    artifact.pages.length !== layout.pages.length ||
    artifact.pages.some(
      (page, i) =>
        page.part !== layout.pages[i].part ||
        page.number !== layout.pages[i].number,
    )
  )
    throw new Error("발행 지면 산출물과 좌표의 쪽 차례가 다릅니다.");
  const hash = createHash("sha256")
    .update(JSON.stringify(artifact))
    .digest("hex");
  await deps.db
    .transaction(async (tx) => {
      const current = await scanTeacher(tx, actor.id);
      if (current.branchId !== viewer.branchId)
        throw new ScanAccessError(
          "발행 중 소속이 바뀌었습니다. 다시 발행해 주세요.",
          409,
        );
      await tx.query(
        `INSERT INTO concept_blank_printed_sheet
      (id,user_id,created_by,branch_id,request_id,sheet_code,snapshot,layout,render_artifact,artifact_sha256)
      VALUES ($1::uuid,$2::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::jsonb,$7::jsonb,$8::jsonb,$9::text) ON CONFLICT (user_id,request_id) DO NOTHING`,
        [
          id,
          actor.id,
          current.branchId ?? null,
          parsed.requestId,
          snapshot.sheetCode,
          JSON.stringify(snapshot),
          JSON.stringify(layout),
          JSON.stringify(artifact),
          hash,
        ],
      );
    })
    .catch(scanDatabaseError);
  return (await existing())!;
}

export async function readIssuedScanArtifact(
  actor: ScanIdentity,
  id: string,
  part: "student" | "key" | "both",
  sql: ScanSql,
) {
  if (actor.kind === "student") {
    if (part !== "student")
      throw new ScanAccessError("학생은 채점표를 열 수 없습니다.");
    await scanSubmissionAccess(actor, id, actor.id, sql);
  } else
    issueAllowed(
      await scanTeacher(sql, actor.id),
      await loadScanIssue(id, sql),
    );
  const [row] = await sql
    .query<{ render_artifact: unknown; artifact_sha256: string }>(
      `SELECT render_artifact,artifact_sha256 FROM concept_blank_printed_sheet WHERE id=$1::uuid`,
      [id],
    )
    .catch(scanDatabaseError);
  const artifact = scanPaperArtifactSchema.parse(row.render_artifact);
  if (
    createHash("sha256").update(JSON.stringify(artifact)).digest("hex") !==
    row.artifact_sha256
  )
    throw new Error("저장된 발행 지면의 지문을 확인해야 합니다.");
  return {
    ...artifact,
    pages: artifact.pages.filter((p) => part === "both" || p.part === part),
  };
}

export async function readIssuedScanPaper(
  actor: ScanIdentity,
  id: string,
  part: "student" | "key" | "both",
  sql: ScanSql,
) {
  const artifact = await readIssuedScanArtifact(actor, id, part, sql);
  const { scanPaperDocument } = await import("./paperDocument");
  return scanPaperDocument(artifact);
}

/** Roster picker intersects issuer and viewer scope. The QR itself grants no access. */
export async function getScanIssueView(
  actor: ScanIdentity,
  id: string,
  sql: ScanSql,
  search = "",
) {
  const issue = await loadScanIssue(id, sql),
    issuer = await scanTeacher(sql, issue.userId);
  issueAllowed(issuer, issue);
  let students: ScanStudent[];
  if (actor.kind === "student")
    students = [(await scanSubmissionAccess(actor, id, actor.id, sql)).student];
  else {
    const viewer = await scanTeacher(sql, actor.id);
    issueAllowed(viewer, issue);
    // Coarse server-side selection first; withinOwnerScope is the sole final authorization predicate.
    const candidates = await sql.query<ScanStudent>(
      `SELECT s.id,s.name,s.class_id AS "classId",c.name AS "className",c.user_id AS "ownerId",c.branch_id AS "branchId" FROM student s JOIN "class" c ON c.id=s.class_id WHERE s.eywa_withdrawn_at IS NULL AND (c.user_id=$1::uuid OR c.branch_id=$2::uuid OR $3::boolean) ORDER BY c.name,s.name,s.id`,
      [issuer.id, issuer.branchId ?? null, issuer.isSuperAdmin === true],
    );
    students = candidates.filter(
      (s) =>
        withinOwnerScope(issuer, s.ownerId, s.branchId) &&
        withinOwnerScope(viewer, s.ownerId, s.branchId),
    );
  }
  const submissions = students.length
    ? await sql.query<{
        id: string;
        student_id: string;
        name: string;
        state: string;
        created_at: Date;
      }>(
        `SELECT sub.id,sub.student_id,s.name,sub.state,sub.created_at FROM concept_blank_scan_submission sub JOIN student s ON s.id=sub.student_id WHERE sub.printed_sheet_id=$1::uuid AND sub.student_id=ANY($2::uuid[]) ORDER BY sub.created_at DESC,sub.id DESC LIMIT 50`,
        [id, students.map((s) => s.id)],
      )
    : [];
  const query = search.trim().slice(0, 100).toLocaleLowerCase();
  const filtered = students.filter((s) =>
    `${s.name} ${s.className}`.toLocaleLowerCase().includes(query),
  );
  return scanIssueViewSchema.parse({
    id: issue.id,
    title: issue.snapshot.selection.title || "개념 백지",
    pageCount: issue.snapshot.pageCount,
    role: actor.kind,
    students: filtered
      .slice(0, 50)
      .map((s) => ({ id: s.id, name: s.name, className: s.className })),
    hasMoreStudents: filtered.length > 50,
    submissions: submissions.map((s) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: s.name,
      state: s.state,
      createdAt: s.created_at.toISOString(),
    })),
  });
}
