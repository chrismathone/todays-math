"use client";

import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import StudentProgressBoard from "./StudentProgressBoard";

interface Props {
  summary: CourseSummary;
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
  session,
  busy = false,
  onNext,
  nextLabel,
  nextAriaLabel,
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
    summary.status !== "done" &&
    completed < summary.todayGoal;

  return (
    <StudentProgressBoard
      replayKind="elementary"
      completed={completed}
      goal={summary.todayGoal}
      title={section?.title ?? "오늘의 수학"}
      subtitle={
        section
          ? `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`
          : "초등 복습"
      }
      nextLabel={nextLabel ?? (completed ? "다음 5문제" : "학습 시작")}
      nextAriaLabel={nextAriaLabel ?? `${completed + 1}번부터 다음 5문제 시작`}
      onNext={canContinue ? onNext : undefined}
      busy={busy}
    />
  );
}
