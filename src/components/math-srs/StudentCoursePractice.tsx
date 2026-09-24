"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CourseAttemptInput,
  CoursePublicProblem,
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { solutionForDisplay } from "@/lib/solutionSteps";
import s from "./elementary-practice.module.css";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((mod) => mod.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((mod) => mod.MathText),
);

interface Props {
  session: CoursePublicSession;
  summary: CourseSummary;
  feedbackId: string | null;
  busy: boolean;
  onAnswer: (input: CourseAttemptInput) => void;
  onHint: (problemId: string) => void;
  onNext: () => void;
  onContinue: () => void;
  onExit: () => void;
  onAuthFailure: (status: number) => void;
}

export default function StudentCoursePractice(props: Props) {
  const { session, feedbackId, onExit } = props;
  const section = getCourseSection(session.sectionId);
  const problem = feedbackId
    ? session.problems.find((item) => item.id === feedbackId)
    : session.problems.find(
        (item) =>
          !session.attempts.some((attempt) => attempt.problemId === item.id),
      );
  if (!problem) return <CourseComplete {...props} />;
  const index = session.problems.findIndex((item) => item.id === problem.id);
  return (
    <div className={`${s.practice} ${s.studentPractice}`}>
      <header className={s.header}>
        <button
          className={s.back}
          type="button"
          onClick={onExit}
          disabled={props.busy}
        >
          <span aria-hidden="true">←</span> 학습 홈
        </button>
        <span className={s.breadcrumb}>
          초{section?.grade} · {section?.semester}학기 · {section?.chapterTitle}
        </span>
      </header>
      <div className={s.progressRow}>
        <span>
          {session.mode === "review"
            ? "기억을 꺼내는 복습"
            : "차근차근 새 학습"}
        </span>
        <span>
          <strong>{index + 1}</strong> / {session.problems.length} 문제
        </span>
      </div>
      <progress
        className={s.progress}
        value={session.attempts.length}
        max={session.problems.length}
        aria-label="이번 학습 진행"
      />
      <CourseQuestion
        key={problem.id}
        {...props}
        problem={problem}
        title={section?.title ?? "오늘의 수학"}
        last={index === session.problems.length - 1}
      />
      <p className={s.footerNote}>
        종이와 펜으로 편하게 풀어요. 시간은 재지 않아요.
      </p>
    </div>
  );
}

type Figure = { status: "loading" | "error" | "ready"; svg: string | null };
function useProblemFigure(
  url: string | null,
  onAuthFailure: Props["onAuthFailure"],
) {
  const [retry, setRetry] = useState(0);
  const [figure, setFigure] = useState<Figure>({
    status: url ? "loading" : "ready",
    svg: null,
  });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url!, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "same-origin",
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403)
          onAuthFailure(response.status);
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("image/svg+xml")
        )
          throw new Error("figure");
        const svg = await response.text();
        if (!svg.includes("<svg")) throw new Error("figure");
        if (!controller.signal.aborted) setFigure({ status: "ready", svg });
      } catch {
        if (!controller.signal.aborted)
          setFigure({ status: "error", svg: null });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, retry, onAuthFailure]);
  return {
    ...figure,
    retry: () => {
      setFigure({ status: "loading", svg: null });
      setRetry((value) => value + 1);
    },
  };
}

function CourseQuestion({
  problem,
  title,
  last,
  session,
  busy,
  onAnswer,
  onHint,
  onNext,
  onAuthFailure,
}: Props & { problem: CoursePublicProblem; title: string; last: boolean }) {
  const [answer, setAnswer] = useState("");
  const [validation, setValidation] = useState("");
  const [panel, setPanel] = useState<"problem" | "answer">("problem");
  const questionSection = useRef<HTMLElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const figure = useProblemFigure(problem.figureUrl, onAuthFailure);
  const attempt = session.attempts.find(
    (item) => item.problemId === problem.id,
  );
  const feedback = problem.feedback;
  const selfCheck = problem.input.mode === "self-check";
  const ready = figure.status === "ready";
  const locked = busy || !ready;

  function showPanel(next: "problem" | "answer") {
    setPanel(next);
    if (window.matchMedia?.("(max-width: 430px)").matches)
      requestAnimationFrame(() =>
        questionSection.current?.scrollIntoView({ block: "start" }),
      );
  }

  useEffect(() => {
    if (
      panel === "problem" &&
      window.matchMedia?.("(max-width: 900px)").matches
    )
      questionHeading.current?.focus({ preventScroll: true });
    else if (feedback) nextButton.current?.focus({ preventScroll: true });
    else if (ready && !selfCheck) input.current?.focus({ preventScroll: true });
    else questionHeading.current?.focus({ preventScroll: true });
  }, [panel, feedback, ready, selfCheck]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || feedback || selfCheck) return;
    if (!answer.trim()) {
      setValidation("생각한 답을 입력해 주세요.");
      input.current?.focus();
      return;
    }
    setValidation("");
    onAnswer({
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: answer.trim(),
    });
  }

  function recordSelf(selfCorrect: boolean) {
    if (locked || !problem.hint) return;
    onAnswer({
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: answer.trim(),
      selfCorrect,
    });
  }

  function giveUp() {
    if (locked) return;
    setPanel("answer");
    onAnswer({
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: answer.trim(),
      giveUp: true,
    });
  }

  return (
    <section
      ref={questionSection}
      className={s.question}
      aria-labelledby="course-question-title"
      aria-busy={busy}
    >
      <div className={s.mobileSwitch} role="group" aria-label="학습 화면">
        <button
          type="button"
          aria-pressed={panel === "problem"}
          onClick={() => showPanel("problem")}
        >
          문제
        </button>
        <button
          type="button"
          aria-pressed={panel === "answer"}
          onClick={() => showPanel("answer")}
        >
          {feedback ? "결과 · 풀이" : "답안"}
        </button>
      </div>
      <div className={s.problemPane} data-active={panel === "problem"}>
        <div className={s.problemTitle}>
          <div className={s.problemHeading}>
            <span className={s.tier}>{problem.tier}</span>
            {selfCheck ? (
              <span className={s.selfCheckLabel}>직접 확인하는 문제</span>
            ) : null}
          </div>
          <h2 id="course-question-title" ref={questionHeading} tabIndex={-1}>
            {title}
          </h2>
        </div>
        <div
          className={s.problemScroll}
          tabIndex={0}
          role="region"
          aria-label="문제 내용"
        >
          <ProblemContent
            content={problem.content}
            figureSvg={figure.svg}
            className={s.problem}
            deferFigures={false}
          />
          {figure.status === "loading" ? (
            <p className={s.figureStatus} role="status">
              문제의 그림을 준비하고 있어요.
            </p>
          ) : figure.status === "error" ? (
            <div className={s.figureStatus} role="alert">
              <p>
                그림을 불러오지 못했어요. 연결을 확인하고 그림을 다시 불러와
                주세요.
              </p>
              <button
                type="button"
                className={s.secondary}
                onClick={figure.retry}
              >
                그림 다시 불러오기
              </button>
            </div>
          ) : null}
        </div>
        <div className={s.mobileProblemAction}>
          <button
            type="button"
            className={s.primary}
            onClick={() => showPanel("answer")}
          >
            {feedback ? "결과와 풀이 보기" : "답 입력하기"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div className={s.responsePane} data-active={panel === "answer"}>
        {feedback && attempt ? (
          <div className={s.feedback}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="풀이 결과 내용"
            >
              <p className={s.feedbackLabel}>저장된 학습 결과</p>
              <h3>
                {!feedback.correct
                  ? "괜찮아요, 풀이를 살펴봐요."
                  : attempt.usedHint
                    ? "풀이를 참고해 확인했어요."
                    : attempt.selfAssessed
                      ? "내 풀이를 직접 확인했어요."
                      : "정확하게 풀었어요!"}
              </h3>
              {attempt.usedHint || attempt.selfAssessed ? (
                <p className={s.help}>
                  풀이 참고와 직접 확인은 혼자 맞힌 문제와 구분해 기록해요.
                </p>
              ) : null}
              {attempt.submittedAnswer ? (
                <p className={s.submittedAnswer}>
                  나의 답 <span>{attempt.submittedAnswer}</span>
                </p>
              ) : null}
              <Solution solution={feedback} />
            </div>
            <div className={s.paneAction}>
              <button
                ref={nextButton}
                type="button"
                className={s.primary}
                onClick={onNext}
                disabled={busy}
              >
                {last ? "이번 학습 마치기" : "다음 문제"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : !ready ? (
          <div className={s.selfCheck}>
            <div className={s.responseScroll}>
              <h3>그림을 먼저 확인해요.</h3>
              <p className={s.help}>
                {figure.status === "loading"
                  ? "그림을 불러온 다음 답을 입력할 수 있어요."
                  : "그림을 다시 불러온 뒤 문제를 풀어 주세요."}
              </p>
              {figure.status === "error" ? (
                <button
                  type="button"
                  className={s.secondary}
                  onClick={figure.retry}
                >
                  그림 다시 불러오기
                </button>
              ) : null}
            </div>
          </div>
        ) : selfCheck ? (
          <div className={s.selfCheck}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="내 풀이 확인"
            >
              <p className={s.feedbackLabel}>연습장에 차근차근</p>
              <h3>
                {problem.hint
                  ? "연습장의 풀이와 비교해 보세요."
                  : "나의 풀이를 남겨요."}
              </h3>
              {!problem.hint ? (
                <>
                  <p className={s.paperHint}>
                    연습장에 답과 풀이를 적어 주세요. 다 풀고 나면 정답과
                    비교해요.
                  </p>
                  <label htmlFor="course-answer-note">
                    나의 답 또는 풀이 메모 (선택)
                  </label>
                  <textarea
                    id="course-answer-note"
                    className={s.noteInput}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    disabled={locked}
                  />
                </>
              ) : (
                <>
                  <Solution solution={problem.hint} />
                  <p className={s.help}>
                    정답을 보고 직접 확인한 문제로 기록해요. 혼자 맞힌 문제로
                    계산하지 않아요.
                  </p>
                </>
              )}
              <button
                type="button"
                className={s.textButton}
                disabled={locked}
                onClick={giveUp}
              >
                아직 모르겠어요
              </button>
            </div>
            <div className={s.paneAction}>
              {problem.hint ? (
                <div className={s.selfCheckActions}>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={locked}
                    onClick={() => recordSelf(true)}
                  >
                    맞았어요
                  </button>
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={locked}
                    onClick={() => recordSelf(false)}
                  >
                    다시 연습할래요
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={s.primary}
                  disabled={locked}
                  onClick={() => onHint(problem.id)}
                >
                  {busy ? "저장 중…" : "다 풀었어요 · 정답 확인"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={s.automatic}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="답안 작성"
            >
              <p className={s.feedbackLabel}>생각한 답을 적어 주세요</p>
              <h3 className={s.answerTitle}>어떤 답이 나왔나요?</h3>
              <form
                id="course-answer-form"
                className={s.answerForm}
                onSubmit={submit}
              >
                <label htmlFor="course-answer">{problem.input.label}</label>
                <input
                  ref={input}
                  id="course-answer"
                  className={s.answerInput}
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setValidation("");
                  }}
                  placeholder={problem.input.placeholder}
                  aria-describedby="course-answer-help"
                  aria-invalid={!!validation}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  maxLength={2000}
                  disabled={locked}
                />
                <div className={s.inputMessage}>
                  <p
                    id="course-answer-help"
                    className={validation ? s.error : s.help}
                    role={validation ? "alert" : undefined}
                  >
                    {validation || problem.input.help}
                  </p>
                </div>
              </form>
              <div className={s.questionActions}>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={locked || !!problem.hint}
                  onClick={() => onHint(problem.id)}
                  aria-expanded={!!problem.hint}
                  aria-controls="course-solution"
                >
                  {problem.hint ? "풀이를 확인했어요" : "풀이 보기"}
                </button>
                <button
                  type="button"
                  className={s.textButton}
                  disabled={locked}
                  onClick={giveUp}
                >
                  아직 모르겠어요
                </button>
              </div>
              {problem.hint ? (
                <div id="course-solution" className={s.revealedSolution}>
                  <p className={s.help}>풀이를 참고한 문제로 기록해요.</p>
                  <Solution solution={problem.hint} />
                </div>
              ) : null}
            </div>
            <div className={s.paneAction}>
              <button
                type="submit"
                form="course-answer-form"
                className={s.primary}
                disabled={locked}
              >
                {busy ? "저장 중…" : "정답 확인"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Solution({
  solution,
}: {
  solution: { answer: string; solution: string };
}) {
  return (
    <div className={s.solution}>
      <div className={s.correctAnswer}>
        <span>정답</span>
        <MathText text={solution.answer} as="div" />
      </div>
      <MathText
        text={solutionForDisplay(solution.solution) ?? ""}
        as="div"
        className={s.explanation}
      />
    </div>
  );
}

function CourseComplete({ session, summary, busy, onContinue, onExit }: Props) {
  const nextAction = useRef<HTMLButtonElement>(null);
  const homeAction = useRef<HTMLButtonElement>(null);
  const goalReached = summary.todayAnswered >= summary.todayGoal;
  const done = goalReached || summary.status === "done";
  const canContinue =
    !done && summary.status !== "paused" && !!summary.recommendation;
  useEffect(() => {
    if (!busy)
      (canContinue ? nextAction : homeAction).current?.focus({
        preventScroll: true,
      });
  }, [canContinue, busy]);
  return (
    <section className={`${s.practice} ${s.studentPractice} ${s.complete}`}>
      <div
        className={s.completeBody}
        tabIndex={0}
        role="region"
        aria-label="이번 학습 결과"
      >
        <p className={s.completionLabel}>
          {goalReached
            ? "오늘의 목표 완료"
            : done
              ? "오늘의 추천 학습 완료"
              : "5문제 학습 완료"}
        </p>
        <h2 id="course-complete-title" tabIndex={-1}>
          {done ? "오늘의 수학을 마쳤어요." : "차근차근, 한 걸음 배웠어요."}
        </h2>
        <p className={s.completeSection}>
          오늘 {summary.todayAnswered} / {summary.todayGoal}문제 · 학습 기록이
          저장되었어요.
        </p>
        <div className={s.results}>
          <div>
            <strong>{session.attempts.length}</strong>
            <span>풀어 본 문제</span>
          </div>
          <div>
            <strong>
              {
                session.attempts.filter(
                  (attempt) =>
                    attempt.correct &&
                    !attempt.usedHint &&
                    !attempt.selfAssessed,
                ).length
              }
            </strong>
            <span>혼자 맞힌 문제</span>
          </div>
          <div>
            <strong>
              {
                session.attempts.filter(
                  (attempt) => attempt.usedHint || attempt.selfAssessed,
                ).length
              }
            </strong>
            <span>풀이 참고 · 직접 확인</span>
          </div>
        </div>
        <ol className={s.outcomes} aria-label="문제별 학습 결과">
          {session.attempts.map((attempt, index) => {
            const label = !attempt.correct
              ? "다시 연습"
              : attempt.usedHint
                ? "풀이 참고"
                : attempt.selfAssessed
                  ? "직접 확인"
                  : "정답";
            return (
              <li
                key={attempt.problemId}
                data-review={
                  !attempt.correct || attempt.usedHint || attempt.selfAssessed
                }
                aria-label={`${index + 1}번: ${label}`}
              >
                <strong>{index + 1}</strong>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className={s.completeMessage}>
          {done
            ? "오늘은 여기까지! 다음 학습 때 필요한 복습을 안내할게요."
            : (summary.recommendation?.reason ??
              "지금 필요한 학습을 모두 마쳤어요. 다음 복습 때 다시 만나요.")}
        </p>
      </div>
      <div className={s.completeActions}>
        {canContinue ? (
          <button
            ref={nextAction}
            type="button"
            className={s.primary}
            onClick={onContinue}
            disabled={busy}
            aria-describedby="course-complete-title"
          >
            {busy ? "다음 학습 준비 중…" : "다음 추천 학습 · 5문제"}
          </button>
        ) : null}
        <button
          ref={homeAction}
          type="button"
          className={s.secondary}
          onClick={onExit}
          disabled={busy}
          aria-describedby="course-complete-title"
        >
          학습 홈으로
        </button>
      </div>
    </section>
  );
}
