import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { canAccessListeningPilot } from "@/lib/listeningPilot";
import {
  listeningStudentCommandInputSchema,
  listeningStudentDetailSchema,
  type ListeningStudentListItem,
} from "@/contracts/englishListeningStudentHttp.contract";
import { canReadListeningAssignment } from "../access";
import { createListeningAttempt, transitionListeningAttempt } from "../attempt";
import { projectListeningStudentView } from "../projection";
import {
  decideListeningRelease,
  type ListeningReleaseContext,
} from "../release";
import {
  attemptAssignment,
  expireAttempt,
  latestAttempt,
  publicationRow,
  saveAttempt,
  type BroadcastRow,
} from "./assignments";
import {
  audit,
  denied,
  invalid,
  one,
  student,
  type AssignmentRow,
  type ListeningActor,
  type ListeningTx,
  type SetRow,
} from "./database";
import { verifiedMedia } from "./sets";

export async function studentState(
  tx: ListeningTx,
  actor: ListeningActor,
  id: string,
  now: string,
  mediaTarget?: { setId: string; assetId: string },
) {
  const account = await student(tx, actor);
  if (actor.kind !== "student") throw denied();
  const row = await one<AssignmentRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_assignment WHERE id=${id}::uuid`,
  );
  if (!row) throw denied();
  const pub = await publicationRow(tx, row.publication_id);
  const set = await one<SetRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_set WHERE id=${pub.set_id}::uuid`,
  );
  const target = await one<{ class_id: string; revoked_at: Date | null }>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_target WHERE assignment_id=${id}::uuid AND student_id=${account.studentId}::uuid`,
  );
  const attempt = await latestAttempt(tx, id, account.studentId);
  if (
    !set ||
    set.deleted_at ||
    !target ||
    set.owner_id !== row.owner_id ||
    set.branch_id !== row.branch_id ||
    (row.branch_id === null && account.student.class.userId !== row.owner_id)
  )
    throw denied();
  if (
    !set.document.rightsReview ||
    set.document.rights.rightsStatus !== "approved" ||
    !set.document.rights.allowedUses.includes("distribution")
  )
    throw denied();
  const contentOwner = await tx.user.findUnique({
    where: { id: set.owner_id },
  });
  if (
    !contentOwner ||
    contentOwner.deletedAt ||
    contentOwner.suspendedAt ||
    !canAccessListeningPilot(contentOwner, contentOwner.disabledMenus)
  )
    throw denied();
  const allowed = canReadListeningAssignment(
    {
      session: actor.session,
      account: {
        id: account.id,
        studentId: account.studentId,
        active: true,
        mustChangePassword: account.mustChangePassword,
      },
      student: {
        id: account.studentId,
        classId: account.student.classId,
        branchId: account.student.class.user.branchId,
        enrolled: !account.student.eywaWithdrawnAt,
      },
      assignment: {
        id: row.id,
        publicationId: row.publication_id,
        ownerUserId: row.owner_id,
        branchId: row.branch_id,
        classId: row.class_id,
        availableFrom: Date.parse(row.snapshot.opensAt),
        revokedAt: row.cancelled_at?.getTime() ?? null,
        audioSource: row.snapshot.audioSource,
      },
      target: {
        assignmentId: id,
        studentId: account.studentId,
        classId: target.class_id,
        revokedAt: target.revoked_at?.getTime() ?? null,
      },
      publication: {
        id: pub.id,
        setId: pub.set_id,
        audioAssetIds: pub.snapshot.document.groups.map((g) => g.audio.assetId),
        ownerUserId: pub.snapshot.document.ownerId,
        branchId: pub.snapshot.document.branchId,
        withdrawnAt: pub.withdrawn_at?.getTime() ?? null,
      },
      attempt: attempt?.snapshot ?? null,
      now: Date.parse(now),
    },
    mediaTarget ? "media" : "read",
    mediaTarget,
  );
  if (!allowed || attempt?.snapshot.status === "cancelled") throw denied();
  const assignment = await attemptAssignment(tx, row, attempt);
  const releases = await tx.$queryRaw<
    { group_id: string; publication_id: string; released_at: Date }[]
  >(
    Prisma.sql`SELECT group_id,publication_id,released_at FROM english_listening_release WHERE assignment_id=${id}::uuid AND student_id=${account.studentId}::uuid`,
  );
  const context: ListeningReleaseContext = {
    now,
    studentId: account.studentId,
    manualRelease: row.manual_release,
    releaseHistory: releases.map((r) => ({
      assignmentId: id,
      publicationId: r.publication_id,
      studentId: account.studentId,
      groupId: r.group_id,
      releasedAt: r.released_at.toISOString(),
    })),
  };
  return { account, row, pub, set, attempt, assignment, context };
}
export async function studentDetail(
  tx: ListeningTx,
  actor: ListeningActor,
  id: string,
  now: string,
) {
  const state = await studentState(tx, actor, id, now);
  if (state.attempt)
    state.attempt = await expireAttempt(
      tx,
      state.row,
      state.pub,
      state.attempt,
      now,
    );
  const { assignment, pub, context, attempt } = state;
  // An exposure is durable even before any attempt exists, and survives a later teacher retry.
  for (const release of decideListeningRelease(
    pub.snapshot,
    assignment,
    attempt?.snapshot ?? null,
    context,
  )) {
    if (!release.released) continue;
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_release(assignment_id,student_id,group_id,publication_id,released_at,reason,early_exposure) VALUES(${id}::uuid,${state.account.studentId}::uuid,${release.groupId}::uuid,${pub.id}::uuid,${new Date(now)},${release.reason},${release.earlyExposure}) ON CONFLICT(assignment_id,student_id,group_id) DO NOTHING`,
    );
  }
  const snapshot = attempt?.snapshot;
  const expired =
    !!snapshot?.deadlineAt &&
    Date.parse(now) >= Date.parse(snapshot.deadlineAt);
  const view = projectListeningStudentView(
    pub.snapshot,
    assignment,
    snapshot ?? null,
    context,
  );
  return listeningStudentDetailSchema.parse({
    view,
    mode: assignment.mode,
    serverNow: now,
    attempt: snapshot
      ? {
          id: snapshot.id,
          revision: snapshot.revision,
          status: snapshot.status,
          startedAt: snapshot.startedAt,
          deadlineAt: snapshot.deadlineAt,
          submittedAt: snapshot.submittedAt,
          firstAnswers: snapshot.firstAnswers,
          reviewAnswers: snapshot.reviewAnswers,
          ...(snapshot.draftAnswers
            ? { draftAnswers: snapshot.draftAnswers }
            : {}),
        }
      : null,
    ...(assignment.audioSource === "student_device"
      ? {
          media: {
            urlsByAssetId: Object.fromEntries(
              view.groups.flatMap((g) =>
                "audio" in g
                  ? [
                      [
                        g.audio.assetId,
                        `/api/english/learn/listening/${id}/media/${g.audio.assetId}`,
                      ],
                    ]
                  : [],
              ),
            ),
            soundCheckUrl: "/api/english/learn/listening/sound-check",
            playbackPolicy: {
              canPlay:
                assignment.mode === "practice" ||
                (snapshot?.status === "in_progress" && !expired) ||
                view.groups.every((g) => g.state === "review"),
              canPause: assignment.mode === "practice",
              canSeek: assignment.mode === "practice",
              canRepeat: assignment.mode === "practice",
            },
          },
        }
      : {}),
  });
}
export async function prepareStudent(
  tx: ListeningTx,
  actor: ListeningActor,
  id: string,
  now: string,
) {
  const state = await studentState(tx, actor, id, now);
  if (!state.attempt) {
    const attempt = createListeningAttempt(
      state.pub.snapshot,
      state.assignment,
      { id: randomUUID(), studentId: state.account.studentId, now },
    );
    await saveAttempt(tx, null, attempt);
    await audit(
      tx,
      id,
      state.account.studentId,
      "attempt_prepared",
      { attemptId: attempt.id },
      now,
    );
  }
  return studentDetail(tx, actor, id, now);
}
export async function studentCommand(
  tx: ListeningTx,
  actor: ListeningActor,
  id: string,
  input: unknown,
  now: string,
) {
  const data = listeningStudentCommandInputSchema.parse(input);
  const state = await studentState(tx, actor, id, now);
  if (!state.attempt || state.attempt.id !== data.attemptId)
    throw invalid("현재 응시 식별자와 다릅니다. 다시 열어 주세요.");
  let audioReady = false;
  if (
    data.command.kind === "start" &&
    state.assignment.audioSource === "student_device"
  ) {
    for (const group of state.pub.snapshot.document.groups) {
      const ready = await verifiedMedia(tx, state.set, group.audio.assetId);
      if (
        ready.sha256 !== group.audio.sha256 ||
        ready.durationMs !== group.audio.durationMs
      )
        throw denied();
    }
    audioReady = true;
  }
  const broadcast = await one<BroadcastRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_broadcast WHERE assignment_id=${id}::uuid`,
  );
  const next = transitionListeningAttempt(
    state.pub.snapshot,
    state.assignment,
    state.attempt.snapshot,
    data.command,
    {
      ...state.context,
      soundChecked: data.soundChecked,
      audioReady,
      ...(broadcast && !broadcast.ended_at
        ? { broadcast: broadcast.snapshot }
        : {}),
    },
  );
  if (next.revision !== state.attempt.revision) {
    await saveAttempt(tx, state.attempt, next);
    await audit(
      tx,
      id,
      state.account.studentId,
      "attempt_" + data.command.kind,
      { attemptId: next.id, revision: next.revision },
      now,
    );
  }
  return studentDetail(tx, actor, id, now);
}
export async function listStudentAssignments(
  tx: ListeningTx,
  actor: ListeningActor,
  now: string,
): Promise<ListeningStudentListItem[]> {
  const account = await student(tx, actor);
  const rows = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT a.id FROM english_listening_assignment a JOIN english_listening_target t ON t.assignment_id=a.id WHERE t.student_id=${account.studentId}::uuid AND t.revoked_at IS NULL AND a.cancelled_at IS NULL ORDER BY a.created_at DESC LIMIT 200`,
  );
  const result: ListeningStudentListItem[] = [];
  for (const row of rows) {
    try {
      const state = await studentState(tx, actor, row.id, now);
      result.push({
        id: row.id,
        title: state.pub.snapshot.document.title,
        mode: state.assignment.mode,
        audioSource: state.assignment.audioSource,
        opensAt: state.assignment.opensAt,
        closesAt: state.assignment.closesAt,
        status: state.attempt?.snapshot.status ?? "ready",
      });
    } catch (error) {
      if (!(
        error instanceof Error &&
        "status" in error &&
        error.status === 404
      ))
        throw error;
    }
  }
  return result;
}
export async function authorizeStudentMedia(
  tx: ListeningTx,
  actor: ListeningActor,
  id: string,
  assetId: string,
  now: string,
) {
  const state = await studentState(tx, actor, id, now);
  await studentState(tx, actor, id, now, { setId: state.pub.set_id, assetId });
  if (state.assignment.mode === "exam") {
    const releases = decideListeningRelease(
      state.pub.snapshot,
      state.assignment,
      state.attempt?.snapshot ?? null,
      state.context,
    );
    const group = state.pub.snapshot.document.groups.find(
      (g) => g.audio.assetId === assetId,
    );
    const released = releases.some(
      (r) => r.groupId === group?.id && r.released,
    );
    if (
      !released &&
      (state.attempt?.snapshot.status !== "in_progress" ||
        Date.parse(now) >= Date.parse(state.attempt.snapshot.deadlineAt!))
    )
      throw denied();
  }
  const ready = await verifiedMedia(tx, state.set, assetId);
  const expected = state.pub.snapshot.document.groups.find(
    (g) => g.audio.assetId === assetId,
  )!.audio;
  if (
    ready.sha256 !== expected.sha256 ||
    ready.durationMs !== expected.durationMs
  )
    throw denied();
  return {
    setId: state.set.id,
    ownerId: state.set.owner_id,
    branchId: state.set.branch_id,
  };
}
