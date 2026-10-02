import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { StudentSession } from "@/contracts/studentAccount.contract";
import { withinOwnerScope } from "@/lib/ownerScope";

export interface ListeningPilotAccess {
  enabled: boolean;
  grantedUserIds: readonly string[];
}

/** L0 policy only. Route adapters must load these grants and raw disabled menus server-side. */
export function canUseListeningTeacher(
  account: AccountAccess | null,
  pilot: ListeningPilotAccess,
  disabledMenus: readonly string[],
): boolean {
  return (
    !!account?.id &&
    account.approvalStatus === "approved" &&
    pilot.enabled === true &&
    pilot.grantedUserIds.includes(account.id) &&
    !disabledMenus.includes("english") &&
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
  if (action === "media") return assignment.audioSource === "student_device";
  return action === "read";
}
