import type { CourseStudentState } from "@/contracts/mathSrsCourse.contract";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";

// Synthetic saved snapshots for the actual screens. No account or database access.
export const today = "2026-10-21";
export const studentId = "11111111-1111-4111-8111-111111111111";
export function courseState(
  mode: "ready" | "paused" | "setup" = "ready",
): CourseStudentState {
  return {
    student: {
      id: studentId,
      name: "로컬 검증",
      classId: "22222222-2222-4222-8222-222222222222",
      className: "초5",
    },
    revision: 7,
    plan:
      mode === "setup"
        ? null
        : {
            startSectionId: "5-2-1-1",
            dailyQuestionCount: 15,
            enabled: mode !== "paused",
            configuredAt: `${today}T00:00:00.000Z`,
          },
    session: null,
    summary: {
      status: mode,
      currentSectionId: mode === "setup" ? null : "5-2-1-1",
      dueCount: 0,
      todayAnswered: 0,
      todayCorrect: 0,
      todayGoal: 15,
      completedSections: 0,
      lastPracticedAt: null,
      nextReviewAt: null,
      recommendation:
        mode === "ready"
          ? {
              sectionId: "5-2-1-1",
              mode: "learn",
              reason: "이제 다음 소단원을 배울 차례예요.",
            }
          : null,
    },
  };
}

export function explorerState(): ExplorerState {
  const stored = createExplorerState(studentId, 5);
  stored.profile.definitions = {
    courseGrade: 5,
    goalUnitId: "g5-fractions",
    runs: 1,
    history: [],
    cards: {
      "g5-common-denominator": {
        level: 1,
        due: "2026-10-22",
        lastDate: today,
        attemptedAt: today,
        missed: 0,
      },
    },
  };
  return {
    ...explorerView(stored, today),
    student: { id: studentId, name: "로컬 검증", className: "초5" },
    revision: 7,
    feedback: null,
  };
}
