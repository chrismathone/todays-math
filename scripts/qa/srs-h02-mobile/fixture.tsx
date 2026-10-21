import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import { StudentChromeContext } from "@/components/learn/StudentChromeContext";
import { StudentReviewPage } from "@/components/math-srs/StudentReviewHome";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import type {
  CourseAttemptInput,
  CourseFollowUpInput,
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import s from "@/components/math-srs/student-course.module.css";
import "@/app/globals.css";
import "./fixture.css";

// The real shell + review-page + course stage reproduce the production size
// chain. Only session replies are fixtures; there is no account or database.
const params = new URLSearchParams(location.search);
const kind = params.get("kind") ?? "choice";
const standalone = params.get("shell") === "standalone";
const now = "2026-10-21T00:00:00Z";
const sectionId = "5-2-1-1";
const list = kind === "list";
const long = kind === "long";
const answer = list ? "12, 13" : "12";
const solution = {
  answer,
  solution: list
    ? "12 이상인 수는 12와 같거나 큰 수예요. 11, 12, 13 중에서는 12와 13이에요."
    : "12 이상인 수는 12와 같거나 큰 수예요. 보기에서 이 조건에 맞는 수는 12예요." +
      (long ? "\n\n수직선의 12에 있는 점도 범위에 포함돼요.".repeat(15) : ""),
};
function initialSession(): CoursePublicSession {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId,
    mode: "review",
    startedAt: now,
    completedAt: null,
    retry: null,
    attempts: [],
    problems: Array.from({ length: 2 }, (_, i) => ({
      id: `problem-${i}`,
      sectionId,
      tier: "기본",
      content:
        i === 1
          ? "다음 문제예요. 12 이상인 수를 고르세요."
          : (long ? "수직선과 조건을 차례로 살펴보세요.\n\n".repeat(18) : "") +
            (list
              ? "11, 12, 13 중에서 12 이상인 수를 모두 쓰시오."
              : "12 이상인 수를 고르세요."),
      figureUrl:
        long && i === 0
          ? "/api/learn/math-srs/course/figure?fixture=h02"
          : null,
      answerChoices: list ? null : ["10", "11", "12", "9"],
      interactive: null,
      input: {
        mode: list ? "text" : "number",
        label: "나의 답",
        placeholder: list ? "예: 12, 13" : "답",
        help: list ? "답을 쉼표로 나누어 적어 주세요." : "숫자로 적어 주세요.",
      },
      hint: null,
      feedback: null,
      followUp: null,
    })),
  };
}
const noop = () => {};
function Fixture() {
  const [session, setSession] = useState(initialSession);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  function reply(input: CourseAttemptInput | CourseFollowUpInput) {
    const follow = "action" in input;
    const done = follow && input.action === "done";
    const submittedAnswer =
      "submittedAnswer" in input ? input.submittedAnswer : "";
    const correct = submittedAnswer === answer;
    const reveal = !follow && input.giveUp;
    setSession((current) => ({
      ...current,
      attempts: follow
        ? current.attempts
        : [
            ...current.attempts,
            {
              problemId: input.problemId,
              submittedAnswer: submittedAnswer ?? "",
              correct,
              usedHint: false,
              selfAssessed: false,
              answeredAt: now,
            },
          ],
      problems: current.problems.map((problem) =>
        problem.id !== input.problemId
          ? problem
          : {
              ...problem,
              feedback: { correct },
              hint:
                reveal || (follow && !done && !correct)
                  ? solution
                  : problem.hint,
              followUp:
                done && problem.followUp
                  ? { ...problem.followUp, done: true }
                  : follow
                    ? { state: correct ? "correct" : "solution", done: false }
                    : reveal
                      ? { state: "solution", done: false }
                      : !correct
                        ? { state: "awaiting", done: false }
                        : null,
            },
      ),
    }));
    setFeedbackId(follow || reveal || !correct ? null : input.problemId);
  }
  const practice = (
    <StudentReviewPage
      kind="explorers"
      student={{ name: "로컬 검증" }}
      practicing
      practiceTitle="초등 수학 자동 복습"
      practicePageClassName={`${s.page} ${s.practicePage}`}
      practiceMainClassName={s.practiceMain}
    >
      <div className={s.practiceStage}>
        <StudentCoursePractice
          session={session}
          summary={{} as CourseSummary}
          journeyTheme="sea"
          busy={false}
          feedbackId={feedbackId}
          onAnswer={reply}
          onFollowUp={reply}
          onHint={noop}
          onNext={() => setFeedbackId(null)}
          onContinue={noop}
          onExit={noop}
          onAuthFailure={noop}
        />
      </div>
    </StudentReviewPage>
  );
  return standalone ? (
    <StudentChromeContext.Provider
      value={{ managed: false, preview: true, enabled: [] }}
    >
      {practice}
    </StudentChromeContext.Provider>
  ) : (
    <StudentAppShell student={{ name: "로컬 검증" }} preview>
      {practice}
    </StudentAppShell>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
