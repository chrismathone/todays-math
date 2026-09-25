"use client";

import { useEffect, useRef, useState } from "react";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
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

const answerFor = (kind: string) =>
  kind === "fraction12"
    ? "5/12"
    : kind === "fraction4"
      ? "2/4"
      : kind === "embedded"
        ? "$23$"
        : "2";

function makeSession(kind: string): CoursePublicSession {
  const denominator = kind === "fraction12" ? 12 : 4;
  const problems = ids.map((id, index) => ({
    id,
    sectionId: section.id,
    tier:
      kind === "embedded" && index === 2
        ? ("기본" as const)
        : ("연산" as const),
    content:
      kind === "embedded" && index === 2
        ? "다음 수 중에서 $28$의 약수가 아닌 수를 찾아 쓰시오."
        : index === 0
          ? kind.startsWith("fraction")
            ? `아래 막대에서 전체의 ${denominator === 12 ? "5/12" : "2/4"}만큼 칠해 보세요.`
            : "36의 약수 중에서 두 번째로 작은 수를 구하시오."
          : kind === "long" && index === 1
            ? "다음 조건을 읽고 알맞은 답을 고르세요.\n\n" +
              "사과가 한 상자에 6개씩 들어 있습니다. 상자에 있는 사과의 수를 차례로 세어 봅시다.\n\n".repeat(
                12,
              ) +
              "마지막으로 1 + 1의 값을 고르세요."
            : "1 + 1 = ?",
    figureUrl: null,
    input: {
      mode:
        kind === "selfcheck" && index === 0
          ? ("self-check" as const)
          : ("number" as const),
      label: "나의 답",
      placeholder: "답 입력",
      help: "숫자로 적어 주세요.",
    },
    answerChoices:
      kind === "embedded" && index === 2
        ? ["$2$", "$7$", "$23$", "$14$"]
        : !(index === 0 && kind.startsWith("fraction")) && kind !== "selfcheck"
          ? ["2", "3", "4", "6"]
          : null,
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
    attempts:
      kind === "path"
        ? problems.map((problem) => ({
            problemId: problem.id,
            submittedAnswer: "2",
            correct: true,
            usedHint: false,
            selfAssessed: false,
            answeredAt: now,
          }))
        : kind === "embedded"
          ? problems.slice(0, 2).map((problem) => ({
              problemId: problem.id,
              submittedAnswer: "2",
              correct: true,
              usedHint: false,
              selfAssessed: false,
              answeredAt: now,
            }))
          : [],
    startedAt: now,
    completedAt: kind === "path" ? now : null,
    retry:
      kind === "path"
        ? { pendingProblemIds: [], attempts: [], completedAt: now }
        : null,
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
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (frame.current) frame.current.dataset.qaReady = "true";
  }, []);
  const [session, setSession] = useState(() => makeSession(kind));
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  return (
    <div ref={frame} className={`${s.page} ${s.practicePage}`}>
      <LearnTopBar student={{ name: "test_s", className: "테스트반" }} />
      <main className={s.practiceMain}>
        <div className={s.practiceStage}>
          <StudentCoursePractice
            session={session}
            summary={
              kind === "path"
                ? {
                    ...summary,
                    todayAnswered: 5,
                    todayCorrect: 5,
                    todayGoal: 10,
                    recommendation: {
                      sectionId: section.id,
                      mode: "learn",
                      reason: "다음 5문제로 이어가요.",
                    },
                  }
                : summary
            }
            feedbackId={feedbackId}
            busy={false}
            onAnswer={(input) => {
              const correct =
                input.selfCorrect ?? input.submittedAnswer === answerFor(kind);
              setSession(
                (current) =>
                  ({
                    ...current,
                    attempts: [
                      ...current.attempts,
                      {
                        problemId: input.problemId,
                        submittedAnswer: input.submittedAnswer,
                        correct,
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
                              correct,
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
                          answer: answerFor(kind),
                          solution: "문제를 차근차근 다시 살펴보세요.",
                        },
                      }
                    : problem,
                ),
              }))
            }
            onNext={() => setFeedbackId(null)}
            onContinue={() => {
              setSession(makeSession("choice"));
              setFeedbackId(null);
            }}
            onExit={() => {}}
            onAuthFailure={() => {}}
          />
        </div>
      </main>
      <StudentMobileNav previewPath="/learn/math-srs" />
    </div>
  );
}
