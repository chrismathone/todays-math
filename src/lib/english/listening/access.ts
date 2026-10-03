import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { StudentSession } from "@/contracts/studentAccount.contract";
import { withinOwnerScope } from "@/lib/ownerScope";

export interface ListeningPilotAccess {
  enabled: boolean;
  grantedUserIds: readonly string[];
  /** Explicit permission transition for listening-only teachers; never inferred from a pilot grant. */
  legacyBlockOverrideUserIds?: readonly string[];
}

/** L0 policy only. Route adapters must load these grants and raw disabled menus server-side. */
export function canUseListeningTeacher(
  account: AccountAccess | null,
  pilot: ListeningPilotAccess,
  disabledMenus: readonly string[],
): boolean {
  const legacyBlocked =
    disabledMenus.includes("english") ||
    ["english-school", "english-maker", "english-library"].every((menu) =>
      disabledMenus.includes(menu),
    );
  return (
    !!account?.id &&
    account.approvalStatus === "approved" &&
    pilot.enabled === true &&
    pilot.grantedUserIds.includes(account.id) &&
    (!legacyBlocked ||
      pilot.legacyBlockOverrideUserIds?.includes(account.id) === true) &&
    !disabledMenus.includes("english-listening")
  );
}

/** Apply to each set, optional exam, asset and class independently after the menu gate. */
export function canOwnListeningResource(
  account: AccountAccess,
  resource: { userId: string; branchId: string | null },
): boolean {
  return (
    !!account.id &&
    !!resource.userId &&
    withinOwnerScope(account, resource.userId, resource.branchId)
  );
}

/**
 * Fresh server-side lookup projections, never request body claims or cached client state.
 * Every read/media request must reload account, enrolment, target and revocation facts.
 * This policy does not authenticate sessions, query storage or authorize writes itself.
 */
export interface ListeningStudentAccessFacts {
  session: StudentSession | null;
  account: {
    id: string;
    studentId: string;
    active: boolean;
    mustChangePassword: boolean;
  };
  student: {
    id: string;
    classId: string;
    branchId: string | null;
    enrolled: boolean;
  };
  assignment: {
    id: string;
    publicationId: string;
    ownerUserId: string;
    branchId: string | null;
    classId: string;
    availableFrom: number;
    revokedAt: number | null;
    audioSource: "student_device" | "teacher_device";
  };
  target: {
    assignmentId: string;
    studentId: string;
    classId: string;
    revokedAt: number | null;
  };
  publication: {
    id: string;
    setId: string;
    audioAssetIds: readonly string[];
    ownerUserId: string;
    branchId: string | null;
    withdrawnAt: number | null;
  };
  attempt: {
    studentId: string;
    assignmentId: string;
    publicationId: string;
  } | null;
  now: number;
}

/**
 * One opaque denial result avoids revealing another assignment's existence or owner.
 * Submission deadlines belong to attempt transitions: reading after a deadline is
 * necessary for review. An existing attempt never bypasses current authorization.
 */
export function canReadListeningAssignment(
  facts: ListeningStudentAccessFacts,
  action: "read" | "media",
  mediaTarget?: { setId: string; assetId: string },
): boolean {
  const {
    session,
    account,
    student,
    assignment,
    target,
    publication,
    attempt,
    now,
  } = facts;
  if (
    !session ||
    session.mustChangePassword !== false ||
    account.mustChangePassword !== false ||
    account.active !== true ||
    student.enrolled !== true
  )
    return false;
  if (
    ![
      session.accountId,
      session.studentId,
      student.classId,
      assignment.id,
      assignment.publicationId,
      assignment.ownerUserId,
    ].every((id) => typeof id === "string" && id.length > 0)
  )
    return false;
  if (
    account.id !== session.accountId ||
    account.studentId !== session.studentId ||
    student.id !== session.studentId ||
    target.studentId !== session.studentId ||
    target.assignmentId !== assignment.id ||
    target.classId !== assignment.classId ||
    student.classId !== assignment.classId ||
    student.branchId !== assignment.branchId
  )
    return false;
  if (
    assignment.revokedAt !== null ||
    target.revokedAt !== null ||
    publication.withdrawnAt !== null ||
    !Number.isFinite(now) ||
    !Number.isFinite(assignment.availableFrom) ||
    now < assignment.availableFrom
  )
    return false;
  if (
    publication.id !== assignment.publicationId ||
    publication.ownerUserId !== assignment.ownerUserId ||
    publication.branchId !== assignment.branchId
  )
    return false;
  if (
    attempt &&
    (attempt.studentId !== session.studentId ||
      attempt.assignmentId !== assignment.id ||
      attempt.publicationId !== publication.id)
  )
    return false;
  if (action === "media")
    return (
      assignment.audioSource === "student_device" &&
      !!mediaTarget?.setId &&
      !!mediaTarget.assetId &&
      mediaTarget.setId === publication.setId &&
      publication.audioAssetIds.includes(mediaTarget.assetId)
    );
  return action === "read";
}
