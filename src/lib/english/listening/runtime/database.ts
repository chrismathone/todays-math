import { Prisma, type PrismaClient } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { StudentSession } from "@/contracts/studentAccount.contract";
import { canAccessListeningPilot } from "@/lib/listeningPilot";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import { withinOwnerScope } from "@/lib/ownerScope";
import {
  activeStudentClassIds,
  accessibleClassesWhere,
  classAccessAllowed,
  assertClassWrite,
} from "@/lib/classAccess";
import type { ListeningDraft } from "@/contracts/englishListeningHttp.contract";
import {
  isKnownExternalListeningDocument,
  RETIRED_LISTENING_ASSESSMENT_KINDS,
  RETIRED_LISTENING_PROVIDERS,
  RETIRED_LISTENING_SOURCE_ID_PATTERN,
} from "../externalSourcePolicy";
import type {
  EnglishListeningAssignment,
  EnglishListeningAttempt,
  EnglishListeningPublication,
} from "@/contracts/englishListening.contract";

export type ListeningActor =
  | { kind: "teacher"; userId: string }
  | { kind: "student"; session: StudentSession };
export type ListeningTx = Prisma.TransactionClient;
export type ListeningDatabase = Pick<PrismaClient, "$transaction">;
export class ListeningRuntimeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const denied = () =>
  new ListeningRuntimeError(404, "NOT_FOUND", "듣기 자료를 찾을 수 없습니다.");
export const conflict = () =>
  new ListeningRuntimeError(
    409,
    "CONFLICT",
    "다른 요청에서 변경되었습니다. 새로고침 후 다시 시도해 주세요.",
  );
export const invalid = (message: string) =>
  new ListeningRuntimeError(400, "VALIDATION_ERROR", message);
export async function one<T>(
  tx: ListeningTx,
  sql: Prisma.Sql,
): Promise<T | null> {
  return (await tx.$queryRaw<T[]>(sql))[0] ?? null;
}
export const json = (value: unknown) =>
  Prisma.sql`${JSON.stringify(value)}::jsonb`;
/** Apply the same provenance rules before SQL pagination, including assembled questions. */
export function availableListeningDocument(document: Prisma.Sql) {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM (
      SELECT ${document}->'source' AS metadata
      UNION ALL SELECT jsonb_path_query(${document}, '$.groups[*].questions[*].metadata')
    ) listening_source
    WHERE metadata->>'kind' IN (${Prisma.join([...RETIRED_LISTENING_ASSESSMENT_KINDS])})
      OR metadata->>'assessmentKind' IN (${Prisma.join([...RETIRED_LISTENING_ASSESSMENT_KINDS])})
      OR lower(btrim(metadata->>'provider')) IN (${Prisma.join([...RETIRED_LISTENING_PROVIDERS])})
      OR metadata->>'sourceRecordId' ~ ${RETIRED_LISTENING_SOURCE_ID_PATTERN}
  )`;
}
export async function lock(tx: ListeningTx, resource: string) {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${"listening:" + resource},0))`,
  );
}
export interface SetRow {
  id: string;
  owner_id: string;
  branch_id: string | null;
  revision: number;
  document: ListeningDraft;
  updated_at: Date;
  deleted_at: Date | null;
}
export interface PublicationRow {
  id: string;
  set_id: string;
  snapshot: EnglishListeningPublication;
  withdrawn_at: Date | null;
}
export interface AssignmentRow {
  id: string;
  publication_id: string;
  owner_id: string;
  branch_id: string | null;
  class_id: string;
  revision: number;
  snapshot: EnglishListeningAssignment;
  manual_release: {
    assignmentId: string;
    publicationId: string;
    releasedBy: string;
    releasedAt: string;
  } | null;
  cancelled_at: Date | null;
}
export interface AttemptRow {
  id: string;
  revision: number;
  ordinal: number;
  snapshot: EnglishListeningAttempt;
}

export async function teacher(
  tx: ListeningTx,
  actor: ListeningActor,
  access: "listening" | "materials" = "listening",
): Promise<AccountAccess> {
  if (actor.kind !== "teacher") throw denied();
  const user = await tx.user.findUnique({
    where: { id: actor.userId },
    include: {
      branch: { select: { disabledMenus: true, menuRevision: true } },
    },
  });
  if (
    !user ||
    user.deletedAt ||
    user.suspendedAt ||
    user.approvalStatus !== "approved"
  )
    throw denied();
  const { menus } = effectiveWorkspaceMenuPolicy(user);
  // Bank material work does not grant assignment/publication or pilot access.
  if (
    !menus.includes("english-listening") &&
    !(access === "materials" && menus.includes("english-bank"))
  )
    throw denied();
  return { ...user, menus };
}
export async function student(tx: ListeningTx, actor: ListeningActor) {
  if (actor.kind !== "student" || actor.session.mustChangePassword)
    throw denied();
  const account = await tx.studentAccount.findUnique({
    where: { id: actor.session.accountId },
    include: { student: { include: { class: { include: { user: true } } } } },
  });
  if (
    !account ||
    account.disabledAt ||
    account.mustChangePassword ||
    account.studentId !== actor.session.studentId ||
    account.student.eywaWithdrawnAt
  )
    throw denied();
  const owner = account.student.class.user;
  if (account.student.eywaBindingId) {
    if (!(await activeStudentClassIds(account.studentId, tx)).length)
      throw denied();
    return account;
  }
  if (
    owner.deletedAt ||
    owner.suspendedAt ||
    !canAccessListeningPilot(owner, owner.disabledMenus)
  )
    throw denied();
  return account;
}
export async function ownedSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
) {
  const row = await one<SetRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_set WHERE id=${id}::uuid`,
  );
  if (
    !row ||
    row.deleted_at ||
    !withinOwnerScope(account, row.owner_id, row.branch_id) ||
    isKnownExternalListeningDocument(row.document)
  )
    throw denied();
  return row;
}
/** Published assets follow the operational assignment; draft editing stays with the set owner. */
export async function readablePublishedSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  assetId?: string,
) {
  try {
    return await ownedSet(tx, account, id);
  } catch (error) {
    if (!(error instanceof ListeningRuntimeError)) throw error;
  }
  const classes = await tx.class.findMany({
    where: await accessibleClassesWhere(account, "test:read", { client: tx }),
    select: { id: true },
  });
  if (!classes.length) throw denied();
  const publications = await tx.$queryRaw<
    { snapshot: EnglishListeningPublication }[]
  >(
    Prisma.sql`SELECT p.snapshot FROM english_listening_publication p JOIN english_listening_assignment a ON a.publication_id=p.id WHERE p.set_id=${id}::uuid AND p.withdrawn_at IS NULL AND a.cancelled_at IS NULL AND a.class_id::text IN (${Prisma.join(classes.map((c) => c.id))})`,
  );
  if (
    !publications.some(
      (p) =>
        !isKnownExternalListeningDocument(p.snapshot.document) &&
        (!assetId ||
          p.snapshot.document.groups.some((g) => g.audio.assetId === assetId)),
    )
  )
    throw denied();
  const row = await one<SetRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_set WHERE id=${id}::uuid`,
  );
  if (!row || row.deleted_at || isKnownExternalListeningDocument(row.document))
    throw denied();
  return row;
}
export async function ownedAssignment(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  write = false,
) {
  const row = await one<AssignmentRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_assignment WHERE id=${id}::uuid`,
  );
  if (!row) throw denied();
  const cls = await tx.class.findUnique({ where: { id: row.class_id } });
  if (
    !cls ||
    !(await classAccessAllowed(account, cls, "test:read", { client: tx }))
  )
    throw denied();
  if (write) await assertClassWrite(tx, account, row.class_id, "test:write");
  return row;
}
export async function audit(
  tx: ListeningTx,
  resourceId: string,
  actorId: string,
  kind: string,
  payload: unknown,
  now: string,
) {
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_audit(id,resource_id,actor_id,kind,payload,created_at) VALUES(gen_random_uuid(),${resourceId}::uuid,${actorId}::uuid,${kind},${json(payload)},${new Date(now)})`,
  );
}
export function expected(actual: number, supplied: number) {
  if (actual !== supplied) throw conflict();
}
