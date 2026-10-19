"use client";

import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import type { MathSrsJourney } from "@/contracts/mathSrsJourney.contract";
import StudentJourney from "./StudentJourney";

interface Props {
  summary: CourseSummary;
  journey?: MathSrsJourney;
  session?: CoursePublicSession | null;
  busy?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  nextAriaLabel?: string;
  /** Kept for existing callers; the whole board now fits without scrolling. */
  pageScroll?: boolean;
}

export default function CourseProgressBoard({
  summary,
  journey,
  session,
  busy = false,
  onNext,
  nextLabel,
}: Props) {
  const sectionId =
    session?.sectionId ??
    summary.recommendation?.sectionId ??
    summary.currentSectionId;
  const section = sectionId ? getCourseSection(sectionId) : undefined;
  const completed = summary.todayAnswered;
  const canContinue =
    !!onNext &&
    !!summary.recommendation &&
    summary.status !== "paused" &&
    (summary.status !== "done" || summary.recommendation.mode === "resume");

  return (
    <StudentJourney
      kind="elementary"
      journey={
        journey ?? {
          completedDays: 0,
          todayComplete: false,
          todayAnswered: completed,
          todayGoal: summary.todayGoal,
          days: [],
          upcoming: [
            {
              title: section?.title ?? "오늘 수학",
              subtitle: section
                ? `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`
                : "초등 복습",
            },
          ],
        }
      }
      nextLabel={nextLabel ?? (completed ? "다음 5문제" : "학습 시작")}
      onNext={canContinue ? onNext : undefined}
      busy={busy}
    />
  );
}
