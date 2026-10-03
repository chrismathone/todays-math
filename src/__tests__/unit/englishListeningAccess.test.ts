// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  canReadListeningAssignment,
  canUseListeningTeacher,
  canOwnListeningResource,
  type ListeningStudentAccessFacts,
} from "@/lib/english/listening/access";

const teacher: AccountAccess = {
  id: "teacher-a",
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  branchId: "branch-a",
  menus: ["english-listening"],
};
const pilot = { enabled: true, grantedUserIds: [teacher.id] };
const mediaTarget = { setId: "set-a", assetId: "asset-a" };
function facts(): ListeningStudentAccessFacts {
  return {
    session: {
      accountId: "account-a",
      studentId: "student-a",
      name: "학생",
      mustChangePassword: false,
    },
    account: {
      id: "account-a",
      studentId: "student-a",
      active: true,
      mustChangePassword: false,
    },
    student: {
      id: "student-a",
      classId: "class-a",
      branchId: "branch-a",
      enrolled: true,
    },
    assignment: {
      id: "assignment-a",
      publicationId: "publication-a",
      ownerUserId: "teacher-a",
      branchId: "branch-a",
      classId: "class-a",
      availableFrom: 100,
      revokedAt: null,
      audioSource: "student_device",
    },
    target: {
      assignmentId: "assignment-a",
      studentId: "student-a",
      classId: "class-a",
      revokedAt: null,
    },
    publication: {
      id: "publication-a",
      setId: "set-a",
      audioAssetIds: ["asset-a"],
      ownerUserId: "teacher-a",
      branchId: "branch-a",
      withdrawnAt: null,
    },
    attempt: null,
    now: 200,
  };
}

describe("listening pilot teacher access", () => {
  it("does not let a pilot grant bypass the effective staff menu cap", () => {
    for (const isSuperAdmin of [false, true])
      expect(
        canUseListeningTeacher(
          { ...teacher, isAdmin: true, isSuperAdmin, menus: [] },
          pilot,
          [],
        ),
      ).toBe(false);
  });
  it("preserves the stored normalized legacy English block until explicitly overridden", () => {
    const disabled = ["english-school", "english-maker", "english-library"];
    expect(canUseListeningTeacher(teacher, pilot, disabled)).toBe(false);
    expect(
      canUseListeningTeacher(
        teacher,
        { ...pilot, legacyBlockOverrideUserIds: [teacher.id] },
        disabled,
      ),
    ).toBe(true);
    expect(
      canUseListeningTeacher(
        teacher,
        { ...pilot, legacyBlockOverrideUserIds: [teacher.id] },
        [...disabled, "english-listening"],
      ),
    ).toBe(false);
  });
  it("requires explicit pilot grant, including for administrators", () => {
    expect(canUseListeningTeacher(teacher, pilot, [])).toBe(true);
    expect(
      canUseListeningTeacher(teacher, { ...pilot, enabled: false }, []),
    ).toBe(false);
    expect(
      canUseListeningTeacher(
        { ...teacher, isSuperAdmin: true },
        { ...pilot, grantedUserIds: [] },
        [],
      ),
    ).toBe(false);
    expect(
      canUseListeningTeacher(
        { ...teacher, approvalStatus: "pending" },
        pilot,
        [],
      ),
    ).toBe(false);
    expect(canUseListeningTeacher(null, pilot, [])).toBe(false);
  });
  it.each(["english", "english-listening"])(
    "preserves explicit disabled %s even with a pilot grant",
    (disabled) => {
      expect(canUseListeningTeacher(teacher, pilot, [disabled])).toBe(false);
      expect(
        canUseListeningTeacher({ ...teacher, isSuperAdmin: true }, pilot, [
          disabled,
        ]),
      ).toBe(false);
    },
  );
  it("does not require unrelated teaching menus and retains owner/branch scope", () => {
    expect(
      canUseListeningTeacher(teacher, pilot, ["english-school", "teaching"]),
    ).toBe(true);
    expect(
      canOwnListeningResource(teacher, {
        userId: "teacher-a",
        branchId: "branch-a",
      }),
    ).toBe(true);
    expect(
      canOwnListeningResource(teacher, {
        userId: "teacher-b",
        branchId: "branch-a",
      }),
    ).toBe(false);
    expect(
      canOwnListeningResource(
        { ...teacher, isAdmin: true },
        { userId: "teacher-b", branchId: "branch-a" },
      ),
    ).toBe(true);
    expect(
      canOwnListeningResource(
        { ...teacher, isAdmin: true },
        { userId: "teacher-b", branchId: "branch-b" },
      ),
    ).toBe(false);
    expect(
      canOwnListeningResource(teacher, { userId: "", branchId: "branch-a" }),
    ).toBe(false);
  });
});

describe("listening fresh student access facts", () => {
  it("binds media to the immutable publication, not every ready audio in its set", () => {
    const f = facts();
    expect(canReadListeningAssignment(f, "media", mediaTarget)).toBe(true);
    expect(canReadListeningAssignment(f, "media")).toBe(false);
    expect(
      canReadListeningAssignment(f, "media", {
        ...mediaTarget,
        assetId: "unpublished-audio",
      }),
    ).toBe(false);
    expect(
      canReadListeningAssignment(f, "media", {
        ...mediaTarget,
        setId: "another-set",
      }),
    ).toBe(false);
  });
  it("allows this student's active assignment and keeps review readable after answer deadlines", () => {
    expect(canReadListeningAssignment(facts(), "read")).toBe(true);
    expect(
      canReadListeningAssignment({ ...facts(), now: 9_999_999 }, "read"),
    ).toBe(true);
  });
  const changes: [string, (f: ListeningStudentAccessFacts) => void][] = [
    [
      "no student session",
      (f) => {
        f.session = null;
      },
    ],
    [
      "another account",
      (f) => {
        f.account.id = "account-b";
      },
    ],
    [
      "another account link",
      (f) => {
        f.account.studentId = "student-b";
      },
    ],
    [
      "disabled account",
      (f) => {
        f.account.active = false;
      },
    ],
    [
      "first password in session",
      (f) => {
        f.session!.mustChangePassword = true;
      },
    ],
    [
      "fresh password reset",
      (f) => {
        f.account.mustChangePassword = true;
      },
    ],
    [
      "withdrawn student",
      (f) => {
        f.student.enrolled = false;
      },
    ],
    [
      "other student",
      (f) => {
        f.student.id = "student-b";
      },
    ],
    [
      "transfer",
      (f) => {
        f.student.classId = "class-b";
      },
    ],
    [
      "other branch",
      (f) => {
        f.student.branchId = "branch-b";
      },
    ],
    [
      "not this target",
      (f) => {
        f.target.studentId = "student-b";
      },
    ],
    [
      "target assignment mismatch",
      (f) => {
        f.target.assignmentId = "assignment-b";
      },
    ],
    [
      "target class mismatch",
      (f) => {
        f.target.classId = "class-b";
      },
    ],
    [
      "revoked target",
      (f) => {
        f.target.revokedAt = 190;
      },
    ],
    [
      "cancelled assignment",
      (f) => {
        f.assignment.revokedAt = 190;
      },
    ],
    [
      "not opened",
      (f) => {
        f.now = 99;
      },
    ],
    [
      "invalid server clock",
      (f) => {
        f.now = NaN;
      },
    ],
    [
      "invalid opening",
      (f) => {
        f.assignment.availableFrom = NaN;
      },
    ],
    [
      "wrong publication",
      (f) => {
        f.publication.id = "publication-b";
      },
    ],
    [
      "cross-owner publication",
      (f) => {
        f.publication.ownerUserId = "teacher-b";
      },
    ],
    [
      "cross-branch publication",
      (f) => {
        f.publication.branchId = "branch-b";
      },
    ],
    [
      "withdrawn publication",
      (f) => {
        f.publication.withdrawnAt = 190;
      },
    ],
    [
      "another student's attempt",
      (f) => {
        f.attempt = {
          studentId: "student-b",
          assignmentId: "assignment-a",
          publicationId: "publication-a",
        };
      },
    ],
    [
      "another assignment attempt",
      (f) => {
        f.attempt = {
          studentId: "student-a",
          assignmentId: "assignment-b",
          publicationId: "publication-a",
        };
      },
    ],
    [
      "another publication attempt",
      (f) => {
        f.attempt = {
          studentId: "student-a",
          assignmentId: "assignment-a",
          publicationId: "publication-b",
        };
      },
    ],
  ];
  it.each(changes)("denies %s without exposing a reason", (_name, change) => {
    const f = facts();
    change(f);
    expect(canReadListeningAssignment(f, "read")).toBe(false);
    expect(canReadListeningAssignment(f, "media", mediaTarget)).toBe(false);
  });
  it("teacher broadcast students have no audio access, even with a valid attempt", () => {
    const f = facts();
    f.attempt = {
      studentId: "student-a",
      assignmentId: "assignment-a",
      publicationId: "publication-a",
    };
    expect(canReadListeningAssignment(f, "media", mediaTarget)).toBe(true);
    f.assignment.audioSource = "teacher_device";
    expect(canReadListeningAssignment(f, "read")).toBe(true);
    expect(canReadListeningAssignment(f, "media", mediaTarget)).toBe(false);
  });
});
