"use client";

import { useState } from "react";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import s from "@/components/math-srs/student-course.module.css";

const section =
  COURSE_SECTIONS.find(
    (item) => item.grade === 5 && item.chapterTitle === "약수와 배수",
  ) ?? COURSE_SECTIONS[0];
const now = new Date().toISOString();
const ids = Array.from(
  { length: 5 },
  (_, index) =>
    `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
);

function makeSession(kind: string): CoursePublicSession {
  const denominator = kind === "fraction12" ? 12 : 4;
  const problems = ids.map((id, index) => ({
    id,
    sectionId: section.id,
    tier: "연산" as const,
    content:
      index === 0
        ? kind.startsWith("fraction")
          ? `아래 막대에서 전체의 ${denominator === 12 ? "5/12" : "2/4"}만큼 칠해 보세요.`
          : "36의 약수 중에서 두 번째로 작은 수를 구하시오."
        : "1 + 1 = ?",
    figureUrl: null,
    input: {
      mode: "number" as const,
      label: "나의 답",
      placeholder: "답 입력",
      help: "숫자로 적어 주세요.",
    },
    answerChoices:
      index === 0 && !kind.startsWith("fraction") ? ["2", "3", "4", "6"] : null,
    interactive:
      index === 0 && kind.startsWith("fraction")
        ? {
            kind: "fraction-parts" as const,
            denominator,
            shape: "bar" as const,
          }
        : null,
    hint: null,
    feedback: null,
  })) as CoursePublicSession["problems"];
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: section.id,
    mode: "learn",
    problems,
    attempts: [],
    startedAt: now,
    completedAt: null,
    retry: null,
  } as CoursePublicSession;
}

const summary = {
  status: "learning",
  currentSectionId: section.id,
  dueCount: 0,
  todayAnswered: 0,
  todayCorrect: 0,
  todayGoal: 5,
  completedSections: 0,
  lastPracticedAt: null,
  nextReviewAt: null,
  recommendation: null,
} as CourseSummary;

export default function MobilePracticeQa({ kind }: { kind: string }) {
  const [session, setSession] = useState(() => makeSession(kind));
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  return (
    <div className={`${s.page} ${s.practicePage}`}>
      <LearnTopBar student={{ name: "test_s", className: "테스트반" }} />
      <main className={s.practiceMain}>
        <div className={s.practiceStage}>
          <StudentCoursePractice
            session={session}
            summary={summary}
            feedbackId={feedbackId}
            busy={false}
            onAnswer={(input) => {
              setSession(
                (current) =>
                  ({
                    ...current,
                    attempts: [
                      ...current.attempts,
                      {
                        problemId: input.problemId,
                        submittedAnswer: input.submittedAnswer,
                        correct:
                          input.submittedAnswer ===
                          (kind === "fraction12"
                            ? "5/12"
                            : kind === "fraction4"
                              ? "2/4"
                              : "2"),
                        usedHint: false,
                        selfAssessed: false,
                        answeredAt: now,
                      },
                    ],
                    problems: current.problems.map((problem) =>
                      problem.id === input.problemId
                        ? {
                            ...problem,
                            feedback: {
                              correct:
                                input.submittedAnswer ===
                                (kind === "fraction12"
                                  ? "5/12"
                                  : kind === "fraction4"
                                    ? "2/4"
                                    : "2"),
                            },
                          }
                        : problem,
                    ),
                  }) as CoursePublicSession,
              );
              setFeedbackId(input.problemId);
            }}
            onHint={(problemId) =>
              setSession((current) => ({
                ...current,
                problems: current.problems.map((problem) =>
                  problem.id === problemId
                    ? {
                        ...problem,
                        hint: {
                          answer: kind.startsWith("fraction")
                            ? kind === "fraction12"
                              ? "5/12"
                              : "2/4"
                            : "2",
                          solution: "문제를 차근차근 다시 살펴보세요.",
                        },
                      }
                    : problem,
                ),
              }))
            }
            onNext={() => setFeedbackId(null)}
            onContinue={() => {}}
            onExit={() => {}}
            onAuthFailure={() => {}}
          />
        </div>
      </main>
    </div>
  );
}
