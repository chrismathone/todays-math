import {
  accessibleClassesWhere,
  assertClassWrite,
  classAccessAllowed,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  englishListeningAssignmentSchema,
  englishListeningBroadcastSchema,
  type EnglishListeningAssignment,
  type EnglishListeningBroadcast,
} from "@/contracts/englishListening.contract";
import {
  listeningAddTargetsSchema,
  listeningBroadcastInputSchema,
  listeningCreateAssignmentSchema,
  listeningRetrySchema,
  type ListeningAssignmentDetail,
  type ListeningAssignmentSummary,
  type ListeningClassOption,
} from "@/contracts/englishListeningHttp.contract";
import { appendListeningAssignmentTargets } from "../assignment";
import {
  createListeningAttempt,
  gradeListeningAnswers,
  transitionListeningAttempt,
} from "../attempt";
import { validateListeningPublication } from "../publication";
import { isKnownExternalListeningDocument } from "../externalSourcePolicy";
import {
  audit,
  denied,
  expected,
  invalid,
  json,
  one,
  ownedAssignment,
  ownedSet,
  type AssignmentRow,
  type AttemptRow,
  type ListeningTx,
  type PublicationRow,
} from "./database";
import { teacherMediaUrls } from "./sets";

export interface BroadcastRow {
  snapshot: EnglishListeningBroadcast;
  ended_at: Date | null;
  interrupted: boolean;
}
export async function listClasses(
  tx: ListeningTx,
  account: AccountAccess,
): Promise<ListeningClassOption[]> {
  const classes = await tx.class.findMany({
    where: await accessibleClassesWhere(account, "student:read", {
      client: tx,
    }),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return Promise.all(
    classes.map(async (cls) => ({
      ...cls,
      students: await tx.student.findMany({
        where: {
          ...studentsInClassWhere(cls.id, false),
          eywaWithdrawnAt: null,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    })),
  );
}
async function roster(
  tx: ListeningTx,
  account: AccountAccess,
  classId: string,
  ids: string[],
  ownerId: string,
  branchId: string | null,
) {
  const cls = await tx.class.findUnique({
    where: { id: classId },
    include: {
      user: true,
      students: { where: { id: { in: ids }, eywaWithdrawnAt: null } },
    },
  });
  if (
    !cls ||
    !(await classAccessAllowed(account, cls, "test:write", { client: tx })) ||
    cls.branchId !== branchId ||
    (branchId === null && cls.userId !== ownerId)
  )
    throw denied();
  await assertClassWrite(tx, account, classId, "test:write");
  const assigned = await tx.student.count({
    where: { id: { in: ids }, ...studentsInClassWhere(classId, false) },
  });
  if (new Set(ids).size !== ids.length || assigned !== ids.length)
    throw invalid("현재 반에 재학 중인 학생만 배정할 수 있습니다.");
  return cls;
}
export async function publicationRow(tx: ListeningTx, id: string) {
  const row = await one<PublicationRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_publication WHERE id=${id}::uuid`,
  );
  if (
    !row ||
    row.withdrawn_at ||
    isKnownExternalListeningDocument(row.snapshot.document)
  )
    throw denied();
  validateListeningPublication(row.snapshot);
  return row;
}
export async function latestAttempt(
  tx: ListeningTx,
  assignmentId: string,
  studentId: string,
) {
  return one<AttemptRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_attempt WHERE assignment_id=${assignmentId}::uuid AND student_id=${studentId}::uuid ORDER BY ordinal DESC LIMIT 1`,
  );
}
export async function attemptAssignment(
  tx: ListeningTx,
  row: AssignmentRow,
  attempt: AttemptRow | null,
): Promise<EnglishListeningAssignment> {
  if (!attempt) return englishListeningAssignmentSchema.parse(row.snapshot);
  const stored = await one<{ snapshot: unknown }>(
    tx,
    Prisma.sql`SELECT snapshot FROM english_listening_assignment_revision WHERE assignment_id=${row.id}::uuid AND revision=${attempt.snapshot.assignmentRevision}`,
  );
  if (!stored) throw denied();
  return englishListeningAssignmentSchema.parse(stored.snapshot);
}
export async function saveAttempt(
  tx: ListeningTx,
  previous: AttemptRow | null,
  next: AttemptRow["snapshot"],
  ordinal = 1,
) {
  if (!previous)
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_attempt(id,assignment_id,student_id,ordinal,revision,snapshot) VALUES(${next.id}::uuid,${next.assignmentId}::uuid,${next.studentId}::uuid,${ordinal},${next.revision},${json(next)})`,
    );
  else {
    const count = await tx.$executeRaw(
      Prisma.sql`UPDATE english_listening_attempt SET revision=${next.revision},snapshot=${json(next)} WHERE id=${previous.id}::uuid AND revision=${previous.revision}`,
    );
    if (count !== 1) throw invalid("응시 저장 충돌입니다.");
  }
  for (const receipt of next.receipts.filter(
    (r) => !previous?.snapshot.receipts.some((p) => p.key === r.key),
  ))
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_receipt(attempt_id,key,command_hash,accepted_revision) VALUES(${next.id}::uuid,${receipt.key},${receipt.commandHash},${receipt.acceptedRevision})`,
    );
}
export async function listAssignments(
  tx: ListeningTx,
  account: AccountAccess,
): Promise<ListeningAssignmentSummary[]> {
  const classes = await tx.class.findMany({
    where: await accessibleClassesWhere(account, "test:read", { client: tx }),
    select: { id: true },
  });
  if (!classes.length) return [];
  const rows = await tx.$queryRaw<(AssignmentRow & { title: string })[]>(
    Prisma.sql`SELECT a.*, p.snapshot->'document'->>'title' AS title FROM english_listening_assignment a JOIN english_listening_publication p ON p.id=a.publication_id WHERE a.class_id::text IN (${Prisma.join(classes.map((c) => c.id))}) ORDER BY a.created_at DESC LIMIT 200`,
  );
  return rows.map((row) => ({
    id: row.id,
    revision: row.revision,
    title: row.title,
    classId: row.class_id,
    mode: row.snapshot.mode,
    audioSource: row.snapshot.audioSource,
    opensAt: row.snapshot.opensAt,
    closesAt: row.snapshot.closesAt,
    cancelledAt: row.cancelled_at?.toISOString() ?? null,
    targetCount: row.snapshot.targetStudentIds.length,
  }));
}
export async function assignmentDetail(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  now?: string,
): Promise<ListeningAssignmentDetail> {
  const row = await ownedAssignment(tx, account, id);
  const pub = await publicationRow(tx, row.publication_id);
  const broadcast = await one<BroadcastRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_broadcast WHERE assignment_id=${id}::uuid`,
  );
  const students = await tx.student.findMany({
    where: { id: { in: row.snapshot.targetStudentIds } },
    select: { id: true, name: true },
  });
  const attempts = await tx.$queryRaw<(AttemptRow & { student_id: string })[]>(
    Prisma.sql`SELECT DISTINCT ON(student_id) * FROM english_listening_attempt WHERE assignment_id=${id}::uuid ORDER BY student_id,ordinal DESC`,
  );
  if (now && !row.cancelled_at)
    for (const attempt of attempts) {
      const updated = await expireAttempt(tx, row, pub, attempt, now);
      Object.assign(attempt, updated);
    }
  return {
    assignment: row.snapshot,
    classId: row.class_id,
    publication: pub.snapshot,
    broadcast: broadcast?.snapshot ?? null,
    broadcastStatus: !broadcast
      ? "idle"
      : broadcast.interrupted
        ? "interrupted"
        : broadcast.ended_at
          ? "ended"
          : "active",
    mediaUrlsByAssetId: teacherMediaUrls(
      pub.set_id,
      pub.snapshot.document.groups.map((g) => g.audio.assetId),
    ),
    results: students.map((s) => {
      const attempt =
        attempts.find((a) => a.student_id === s.id)?.snapshot ?? null;
      return {
        studentId: s.id,
        name: s.name,
        attempt,
        grade: attempt
          ? gradeListeningAnswers(pub.snapshot, attempt.firstAnswers)
          : null,
      };
    }),
  };
}
export async function createAssignment(
  tx: ListeningTx,
  account: AccountAccess,
  input: unknown,
  now: string,
) {
  const data = listeningCreateAssignmentSchema.parse(input);
  const pub = await publicationRow(tx, data.publicationId);
  const set = await ownedSet(tx, account, pub.set_id);
  await roster(
    tx,
    account,
    data.classId,
    data.targetStudentIds,
    set.owner_id,
    set.branch_id,
  );
  // Client clocks may be a few seconds behind. Opening in the past means open now.
  return createAssignmentRow(tx, account, data, pub, set, now);
}
async function createAssignmentRow(
  tx: ListeningTx,
  account: AccountAccess,
  data: ReturnType<typeof listeningCreateAssignmentSchema.parse>,
  pub: PublicationRow,
  set: { owner_id: string; branch_id: string | null },
  now: string,
) {
  const { classId, ...settings } = data;
  const assignment = englishListeningAssignmentSchema.parse({
    ...settings,
    schemaVersion: 1,
    id: randomUUID(),
    revision: 1,
    ownerId: set.owner_id,
    branchId: set.branch_id,
    createdAt: now,
    opensAt: new Date(
      Math.max(Date.parse(now), Date.parse(data.opensAt)),
    ).toISOString(),
    cancelledAt: null,
  });
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_assignment(id,publication_id,owner_id,branch_id,class_id,revision,snapshot,created_at) VALUES(${assignment.id}::uuid,${pub.id}::uuid,${set.owner_id}::uuid,${set.branch_id}::uuid,${classId}::uuid,1,${json(assignment)},${new Date(now)})`,
  );
  await persistVersion(tx, assignment);
  for (const studentId of assignment.targetStudentIds)
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_target(assignment_id,student_id,class_id) VALUES(${assignment.id}::uuid,${studentId}::uuid,${classId}::uuid)`,
    );
  await audit(
    tx,
    assignment.id,
    account.id,
    "assignment_created",
    { targetStudentIds: assignment.targetStudentIds },
    now,
  );
  return assignmentDetail(tx, account, assignment.id, now);
}
async function persistVersion(
  tx: ListeningTx,
  assignment: EnglishListeningAssignment,
) {
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_assignment_revision(assignment_id,revision,snapshot) VALUES(${assignment.id}::uuid,${assignment.revision},${json(assignment)})`,
  );
}
async function bump(
  tx: ListeningTx,
  row: AssignmentRow,
  assignment: EnglishListeningAssignment,
) {
  const count = await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_assignment SET revision=${assignment.revision},snapshot=${json(assignment)},cancelled_at=${assignment.cancelledAt ? new Date(assignment.cancelledAt) : null} WHERE id=${row.id}::uuid AND revision=${row.revision}`,
  );
  if (count !== 1) throw invalid("배정 저장 충돌입니다.");
  await persistVersion(tx, assignment);
}
export async function mutateAssignment(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  action: "targets" | "cancel" | "release" | "broadcast" | "retry",
  input: unknown,
  now: string,
) {
  const row = await ownedAssignment(tx, account, id, true);
  const supplied = input as { expectedRevision: number };
  expected(row.revision, supplied.expectedRevision);
  if (row.cancelled_at) throw denied();
  const pub = await publicationRow(tx, row.publication_id);
  let next = { ...row.snapshot, revision: row.revision + 1 };
  if (action === "targets") {
    const data = listeningAddTargetsSchema.parse(input);
    await roster(
      tx,
      account,
      row.class_id,
      data.addedStudentIds,
      row.owner_id,
      row.branch_id,
    );
    const result = appendListeningAssignmentTargets(row.snapshot, {
      ...data,
      addedBy: account.id,
      addedAt: now,
    });
    next = result.assignment;
    for (const studentId of data.addedStudentIds)
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO english_listening_target(assignment_id,student_id,class_id) VALUES(${id}::uuid,${studentId}::uuid,${row.class_id}::uuid)`,
      );
  } else if (action === "release") {
    if (row.snapshot.releasePolicy.kind !== "manual")
      throw invalid("수동 공개 배정만 공개할 수 있습니다.");
    if (Date.parse(now) < Date.parse(row.snapshot.opensAt))
      throw invalid("배정 시작 후 공개할 수 있습니다.");
    const release = row.manual_release ?? {
      assignmentId: id,
      publicationId: pub.id,
      releasedBy: account.id,
      releasedAt: now,
    };
    await tx.$executeRaw(
      Prisma.sql`UPDATE english_listening_assignment SET manual_release=${json(release)} WHERE id=${id}::uuid`,
    );
  } else if (action === "cancel") {
    next = { ...next, cancelledAt: now };
    await tx.$executeRaw(
      Prisma.sql`UPDATE english_listening_target SET revoked_at=${new Date(now)} WHERE assignment_id=${id}::uuid AND revoked_at IS NULL`,
    );
    await stopActiveAttempts(tx, row, pub, "cancel", now);
  } else if (action === "broadcast") {
    const data = listeningBroadcastInputSchema.parse(input);
    if (row.snapshot.audioSource !== "teacher_device")
      throw invalid("교사 방송 배정이 아닙니다.");
    const existing = await one<BroadcastRow>(
      tx,
      Prisma.sql`SELECT * FROM english_listening_broadcast WHERE assignment_id=${id}::uuid`,
    );
    if (data.action === "start") {
      if (existing)
        throw invalid(
          "방송이 이미 시작되었습니다. 새 방송은 새 배정으로 열어 주세요.",
        );
      if (
        Date.parse(now) < Date.parse(row.snapshot.opensAt) ||
        Date.parse(now) >= Date.parse(row.snapshot.closesAt)
      )
        throw invalid("배정 시간 밖입니다.");
      const targets = await tx.$queryRaw<{ student_id: string }[]>(
        Prisma.sql`SELECT student_id FROM english_listening_target WHERE assignment_id=${id}::uuid AND revoked_at IS NULL`,
      );
      const ids = targets.map((t) => t.student_id);
      await roster(tx, account, row.class_id, ids, row.owner_id, row.branch_id);
      const broadcast = englishListeningBroadcastSchema.parse({
        schemaVersion: 1,
        id: randomUUID(),
        assignmentId: id,
        publicationId: pub.id,
        participantStudentIds: ids,
        startedAt: now,
        deadlineAt: new Date(
          Math.min(
            Date.parse(row.snapshot.closesAt),
            row.snapshot.timeLimitSeconds === null
              ? Infinity
              : Date.parse(now) + row.snapshot.timeLimitSeconds * 1000,
          ),
        ).toISOString(),
      });
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO english_listening_broadcast(id,assignment_id,snapshot) VALUES(${broadcast.id}::uuid,${id}::uuid,${json(broadcast)})`,
      );
    } else {
      if (!existing || existing.ended_at)
        throw invalid("진행 중인 방송이 없습니다.");
      await tx.$executeRaw(
        Prisma.sql`UPDATE english_listening_broadcast SET ended_at=${new Date(now)},interrupted=${data.action === "interrupt"} WHERE assignment_id=${id}::uuid`,
      );
      if (data.action === "interrupt")
        await stopActiveAttempts(tx, row, pub, "interrupt", now);
    }
  } else {
    const data = listeningRetrySchema.parse(input);
    await roster(
      tx,
      account,
      row.class_id,
      [data.studentId],
      row.owner_id,
      row.branch_id,
    );
    let previous = await latestAttempt(tx, id, data.studentId);
    if (!previous || previous.id !== data.previousAttemptId)
      throw invalid("재응시 대상이 현재 응시와 다릅니다.");
    const snapshot = await attemptAssignment(tx, row, previous);
    if (
      previous.snapshot.status === "in_progress" &&
      Date.parse(now) >= Date.parse(previous.snapshot.deadlineAt!)
    ) {
      const expired = transitionListeningAttempt(
        pub.snapshot,
        snapshot,
        previous.snapshot,
        {
          kind: "expire",
          expectedRevision: previous.revision,
          idempotencyKey: "expire:" + previous.id,
        },
        { now },
      );
      await saveAttempt(tx, previous, expired);
      previous = { ...previous, revision: expired.revision, snapshot: expired };
    }
    const attempt = createListeningAttempt(pub.snapshot, row.snapshot, {
      id: randomUUID(),
      studentId: data.studentId,
      now,
      previousAttempt: previous.snapshot,
      retryAuthorization: { authorizedBy: account.id, reason: data.reason },
    });
    await saveAttempt(tx, null, attempt, previous.ordinal + 1);
  }
  await bump(tx, row, englishListeningAssignmentSchema.parse(next));
  await audit(tx, id, account.id, "assignment_" + action, input, now);
  return assignmentDetail(tx, account, id, now);
}
export async function expireAttempt(
  tx: ListeningTx,
  row: AssignmentRow,
  pub: PublicationRow,
  attempt: AttemptRow,
  now: string,
) {
  if (
    attempt.snapshot.status !== "in_progress" ||
    Date.parse(now) < Date.parse(attempt.snapshot.deadlineAt!)
  )
    return attempt;
  const assignment = await attemptAssignment(tx, row, attempt);
  const next = transitionListeningAttempt(
    pub.snapshot,
    assignment,
    attempt.snapshot,
    {
      kind: "expire",
      expectedRevision: attempt.revision,
      idempotencyKey: "expire:" + attempt.id,
    },
    { now },
  );
  await saveAttempt(tx, attempt, next);
  await audit(
    tx,
    row.id,
    attempt.snapshot.studentId,
    "attempt_expired",
    { attemptId: attempt.id, revision: next.revision },
    now,
  );
  return { ...attempt, revision: next.revision, snapshot: next };
}
async function stopActiveAttempts(
  tx: ListeningTx,
  row: AssignmentRow,
  pub: PublicationRow,
  kind: "cancel" | "interrupt",
  now: string,
) {
  const attempts = await tx.$queryRaw<AttemptRow[]>(
    Prisma.sql`SELECT * FROM english_listening_attempt WHERE assignment_id=${row.id}::uuid AND snapshot->>'status' IN ('ready','in_progress')`,
  );
  for (const previous of attempts) {
    if (kind === "interrupt" && previous.snapshot.status !== "in_progress")
      continue;
    const snapshot = await attemptAssignment(tx, row, previous);
    const expired =
      previous.snapshot.status === "in_progress" &&
      Date.parse(now) >= Date.parse(previous.snapshot.deadlineAt!);
    const command =
      expired && kind === "interrupt"
        ? { kind: "expire" as const }
        : {
            kind,
            ...(kind === "interrupt"
              ? { reason: "teacher_broadcast" as const }
              : {}),
          };
    const next = transitionListeningAttempt(
      pub.snapshot,
      snapshot,
      previous.snapshot,
      {
        ...command,
        expectedRevision: previous.revision,
        idempotencyKey: kind + ":" + row.revision,
      },
      { now },
    );
    await saveAttempt(tx, previous, next);
  }
}
