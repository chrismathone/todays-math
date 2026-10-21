import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import { StudentReviewPage } from "@/components/math-srs/StudentReviewHome";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { useLearningMotion } from "@/components/math-srs/LearningMotion";
import type {
  CourseAttemptInput,
  CourseFollowUpInput,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import type { ExplorerRequest } from "@/contracts/mathExplorers.contract";
import { courseSession, explorerState, now } from "./data";
import s from "@/components/math-srs/student-course.module.css";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "course";
const manual = params.has("manual");
const first = params.has("first");
const noop = () => {};
const solution = {
  answer: "12",
  solution: "12 이상인 수는 12와 같거나 큰 수예요.",
};
let explorer = explorerState(first ? "first" : "again");
let requests = 0;
// Only the fixture endpoint is accepted; any unexpected request fails locally.
window.fetch = async (input, options) => {
  if (String(input) !== "/api/learn/math-explorers")
    throw Error(`Unexpected fixture fetch: ${String(input)}`);
  if (options?.body) {
    requests++;
    const { action } = JSON.parse(String(options.body)) as ExplorerRequest;
    if (action.type === "answer") {
      const correct = action.choiceIds[0] === 1;
      const stage = correct
        ? "next"
        : explorer.currentActivity?.followUp || !action.choiceIds.length
          ? "solution"
          : "again";
      explorer = explorerState(stage);
      explorer.feedback = {
        message: correct ? "맞았어요" : "다시 살펴봐요",
        correct,
        advance: correct,
      };
    } else if (action.type === "understood") explorer = explorerState("next");
  }
  document.documentElement.dataset.requests = String(requests);
  return new Response(JSON.stringify({ data: explorer }));
};
function Control({ onExit }: { onExit: () => void }) {
  const motion = useLearningMotion();
  return (
    <aside className="fixtureControls" aria-label="로컬 fixture 제어">
      <button
        onClick={() => motion.setAppReducedMotion(!motion.appReducedMotion)}
        aria-pressed={motion.appReducedMotion}
      >
        기기 움직임 줄이기
      </button>
      <button onClick={onExit}>fixture 닫기</button>
    </aside>
  );
}
function Course({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState(() => {
    const initial = courseSession();
    if (manual)
      initial.problems.forEach((problem) => {
        problem.answerChoices = null;
      });
    return initial;
  });
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  function reply(input: CourseAttemptInput | CourseFollowUpInput) {
    const follow = "action" in input;
    const done = follow && input.action === "done";
    const submittedAnswer =
      "submittedAnswer" in input ? input.submittedAnswer : "";
    const correct = submittedAnswer === "12";
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
  return (
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
          onNext={() => {
            document.documentElement.dataset.advances = String(
              Number(document.documentElement.dataset.advances ?? 0) + 1,
            );
            setFeedbackId(null);
          }}
          onContinue={noop}
          onExit={onExit}
          onAuthFailure={noop}
        />
      </div>
    </StudentReviewPage>
  );
}
function Fixture() {
  const [closed, setClosed] = useState(false);
  return (
    <StudentAppShell student={{ name: "로컬 검증" }} preview>
      <Control onExit={() => setClosed(true)} />
      {closed ? (
        <p>fixture 닫힘</p>
      ) : mode === "explorer" ? (
        <StudentMathExplorers initialState={explorer} journeyTheme="sea" />
      ) : (
        <Course onExit={() => setClosed(true)} />
      )}
    </StudentAppShell>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
