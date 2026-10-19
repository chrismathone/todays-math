import type { UnitSeed } from "../../../../prisma/seed-data/units";
import type { ElemTier } from "../../elementary/difficulty";

export type CourseGrade = 3 | 4 | 5 | 6;
export interface CourseSection {
  id: string;
  grade: CourseGrade;
  semester: 1 | 2;
  chapterId: string;
  chapterTitle: string;
  title: string;
  order: number;
  unit: UnitSeed;
}
export interface CourseChapter {
  id: string;
  grade: CourseGrade;
  semester: 1 | 2;
  number: number;
  title: string;
  sections: CourseSection[];
}
export interface CourseProblem {
  id: string;
  sectionId: string;
  tier: ElemTier;
  seed: number;
  content: string;
  answer: string;
  solution: string;
  figureSpec: Record<string, unknown> | null;
  /** Fixed for the life of the session; null falls back to manual input. */
  answerChoices?: string[] | null;
  interactive?: {
    kind: "fraction-parts";
    denominator: number;
    shape: "bar";
  } | null;
  input: {
    mode: "number" | "text" | "self-check";
    label: string;
    placeholder: string;
    help: string;
  };
}
export interface CourseAttempt {
  problemId: string;
  submittedAnswer: string;
  correct: boolean;
  usedHint: boolean;
  selfAssessed: boolean;
  answeredAt: string;
}
/**
 * What happened right after a wrong first answer (plan §3.2, decisions 2 and 6):
 * a second answer (`retry`), or the solution opened without one (`reveal` — the
 * first answer gave up, or a self-check was marked «다시 연습»). The first attempt
 * and the section's memory stay as they were; a followed-up problem leaves the
 * end-of-session retry queue and comes back at the next review.
 */
export type CourseFollowUp =
  | {
      problemId: string;
      kind: "retry";
      /** "" when the student gave up again (`giveUp`). */
      submittedAnswer: string;
      giveUp?: true;
      correct: boolean;
      answeredAt: string;
      /** When the student pressed «알겠어요» · «다음»; null keeps the screen open. */
      doneAt: string | null;
    }
  | {
      problemId: string;
      kind: "reveal";
      correct: false;
      /** The first attempt's own time — written by the same transition. */
      answeredAt: string;
      doneAt: string | null;
    };
export interface CourseSession {
  id: string;
  sectionId: string;
  mode: "learn" | "review";
  problems: CourseProblem[];
  attempts: CourseAttempt[];
  startedAt: string;
  completedAt: string | null;
  hintedProblemIds?: string[];
  revealedProblemIds?: string[];
  followUps?: CourseFollowUp[];
  retry?: {
    pendingProblemIds: string[];
    attempts: CourseAttempt[];
    requests: {
      sessionId: string;
      problemId: string;
      submittedAnswer: string;
      giveUp?: boolean;
      selfCorrect?: boolean;
      retryIndex?: number;
    }[];
    completedAt: string | null;
  };
}
export interface SectionProgress {
  sectionId: string;
  completedSessions: number;
  attempts: number;
  correct: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  intervalDays: number;
}
export interface CourseLearnerState {
  selectedSectionId: string;
  progress: Record<string, SectionProgress>;
  session: CourseSession | null;
  pausedSessions?: Record<string, CourseSession>;
}
export interface CourseStore {
  version: 1;
  learners: Record<string, CourseLearnerState>;
}
