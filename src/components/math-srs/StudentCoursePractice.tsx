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
  const retry = (
    session as CoursePublicSession & {
      retry?: {
        pendingProblemIds: string[];
        attempts: CoursePublicSession["attempts"];
        completedAt: string | null;
      } | null;
    }
  ).retry;
  const retryActive = !!retry && !retry.completedAt;
  const problem = feedbackId
    ? session.problems.find((item) => item.id === feedbackId)
    : retryActive
      ? session.problems.find((item) => item.id === retry.pendingProblemIds[0])
      : session.problems.find(
          (item) =>
            !session.attempts.some((attempt) => attempt.problemId === item.id),
        );
  if (!problem) return <CourseComplete {...props} />;
  const index = session.problems.findIndex((item) => item.id === problem.id);
  const inRetry =
    !!retry &&
    (feedbackId
      ? retry.attempts.some((item) => item.problemId === feedbackId)
      : retryActive);
  const nextIsRetry =
    !!retry &&
    retry.pendingProblemIds.length > 0 &&
    retry.attempts.length === 0 &&
    !!feedbackId &&
    session.attempts.length === session.problems.length;
  const initialWrongCount = session.attempts.filter(
    (attempt) => !attempt.correct,
  ).length;
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
          {inRetry
            ? "틀린 문제 다시 풀기"
            : session.mode === "review"
              ? "기억을 꺼내는 복습"
              : "차근차근 새 학습"}
        </span>
        <span>
          {inRetry ? (
            <>
              남은 <strong>{retry?.pendingProblemIds.length}</strong>문제
            </>
          ) : (
            <>
              <strong>{index + 1}</strong> / {session.problems.length} 문제
            </>
          )}
        </span>
      </div>
      <progress
        className={s.progress}
        value={
          inRetry
            ? initialWrongCount - retry!.pendingProblemIds.length
            : session.attempts.length
        }
        max={inRetry ? initialWrongCount : session.problems.length}
        aria-label={inRetry ? "틀린 문제 다시 풀기 진행" : "이번 학습 진행"}
      />
      <CourseQuestion
        key={`${problem.id}:${inRetry ? retry?.attempts.length : "first"}`}
        {...props}
        problem={problem}
        title={section?.title ?? "오늘의 수학"}
        last={
          inRetry
            ? retry?.pendingProblemIds.length === 0
            : index === session.problems.length - 1 && !nextIsRetry
        }
        nextIsRetry={nextIsRetry}
        repeatNext={
          inRetry &&
          !!feedbackId &&
          retry?.pendingProblemIds[0] === problem.id &&
          problem.feedback?.correct === false
        }
        retryAttempt={
          retry?.attempts
            .slice()
            .reverse()
            .find((item) => item.problemId === problem.id) ?? null
        }
        retryIndex={inRetry ? retry!.attempts.length : null}
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
  nextIsRetry,
  repeatNext,
  retryAttempt,
  retryIndex,
  session,
  feedbackId,
  busy,
  onAnswer,
  onHint,
  onNext,
  onAuthFailure,
}: Props & {
  problem: CoursePublicProblem;
  title: string;
  last: boolean;
  nextIsRetry: boolean;
  repeatNext: boolean;
  retryAttempt: CoursePublicSession["attempts"][number] | null;
  retryIndex: number | null;
}) {
  const [answer, setAnswer] = useState("");
  const [validation, setValidation] = useState("");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const explanationDialog = useRef<HTMLDialogElement>(null);
  const explanationOpener = useRef<HTMLButtonElement>(null);
  const explanationClose = useRef<HTMLButtonElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const figure = useProblemFigure(problem.figureUrl, onAuthFailure);
  const attempt =
    retryAttempt ??
    session.attempts.find((item) => item.problemId === problem.id);
  const feedback = feedbackId === problem.id ? problem.feedback : null;
  const selfCheck = problem.input.mode === "self-check";
  const answeredInFirstRound = session.attempts.some(
    (item) => item.problemId === problem.id,
  );
  const answerChoices = (
    problem as CoursePublicProblem & { answerChoices?: string[] | null }
  ).answerChoices;
  const interactive = (
    problem as CoursePublicProblem & {
      interactive?: {
        kind: "fraction-parts";
        denominator: number;
        shape: "bar";
      } | null;
    }
  ).interactive;
  const useChoices = !selfCheck && !interactive && answerChoices?.length === 4;
  const useInteractive = !selfCheck && interactive?.kind === "fraction-parts";
  const ready = figure.status === "ready";
  const locked = busy || !ready;

  useEffect(() => {
    if (feedback) nextButton.current?.focus({ preventScroll: true });
    else questionHeading.current?.focus({ preventScroll: true });
  }, [feedback]);

  useEffect(() => {
    const dialog = explanationDialog.current;
    if (!dialog) return;
    if (explanationOpen) {
      if (!dialog.open) {
        if (dialog.showModal) dialog.showModal();
        else dialog.setAttribute("open", "");
      }
      explanationClose.current?.focus({ preventScroll: true });
    } else if (dialog.open) {
      if (dialog.close) dialog.close();
      else dialog.removeAttribute("open");
      explanationOpener.current?.focus({ preventScroll: true });
    }
  }, [explanationOpen]);

  function closeExplanation() {
    setExplanationOpen(false);
  }

  function showExplanation() {
    if (locked || (!answeredInFirstRound && !selfCheck)) return;
    setExplanationOpen(true);
    if (!problem.hint) onHint(problem.id);
  }

  function sendAnswer(
    payload: Omit<CourseAttemptInput, "sessionId" | "problemId">,
  ) {
    const request = {
      sessionId: session.id,
      problemId: problem.id,
      ...payload,
      ...(retryIndex === null ? {} : { retryIndex }),
    };
    onAnswer(request);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || feedback || selfCheck) return;
    const submittedAnswer = useInteractive
      ? selectedParts.length > 0
        ? `${selectedParts.length}/${interactive.denominator}`
        : ""
      : answer.trim();
    if (!submittedAnswer) {
      setValidation(
        useChoices
          ? "답 하나를 골라 주세요."
          : useInteractive
            ? "칠할 칸을 골라 주세요."
            : "생각한 답을 입력해 주세요.",
      );
      input.current?.focus();
      return;
    }
    setValidation("");
    sendAnswer({
      submittedAnswer,
    });
  }

  function recordSelf(selfCorrect: boolean) {
    if (locked || !problem.hint) return;
    closeExplanation();
    sendAnswer({
      submittedAnswer: answer.trim(),
      selfCorrect,
    });
  }

  function giveUp() {
    if (locked) return;
    sendAnswer({
      submittedAnswer: answer.trim(),
      giveUp: true,
    });
  }

  return (
    <section
      className={`${s.question} ${s.studentQuestion}`}
      aria-labelledby="course-question-title"
      aria-busy={busy}
    >
      <div className={s.problemPane}>
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
      </div>
      <div className={s.responsePane}>
        {feedback && attempt ? (
          <div className={s.feedback}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="풀이 결과 내용"
            >
              <p className={s.feedbackLabel}>이번 문제의 결과</p>
              <h3>
                {!feedback.correct
                  ? "다시 풀 문제로 모았어요."
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
              <button
                ref={explanationOpener}
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={showExplanation}
              >
                풀이 보기
              </button>
            </div>
            <div className={s.paneAction}>
              <button
                ref={nextButton}
                type="button"
                className={s.primary}
                onClick={onNext}
                disabled={busy}
              >
                {repeatNext
                  ? "다시 도전하기"
                  : nextIsRetry
                    ? "틀린 문제 다시 풀기"
                    : last
                      ? "이번 학습 마치기"
                      : "다음 문제"}
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
              <h3>연습장에서 풀어 보세요.</h3>
              <p className={s.paperHint}>
                다 풀었다면 풀이를 열어 내 풀이와 비교하고 결과를 골라 주세요.
              </p>
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
              <button
                ref={explanationOpener}
                type="button"
                className={s.primary}
                disabled={locked}
                onClick={showExplanation}
              >
                다 풀었어요 · 정답 확인
              </button>
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
              <p className={s.feedbackLabel}>
                {useInteractive
                  ? "모양을 눌러 답을 만드세요"
                  : useChoices
                    ? "답 하나를 골라 주세요"
                    : "생각한 답을 적어 주세요"}
              </p>
              <form
                id="course-answer-form"
                className={s.answerForm}
                onSubmit={submit}
              >
                {useInteractive ? (
                  <div
                    className={s.fractionAnswer}
                    role="group"
                    aria-label={`${interactive.denominator}칸 중 칠할 칸 선택`}
                  >
                    <div
                      className={s.fractionBar}
                      data-many={interactive.denominator > 6}
                    >
                      {Array.from(
                        { length: interactive.denominator },
                        (_, part) => (
                          <button
                            key={part}
                            type="button"
                            aria-label={`${part + 1}번째 칸`}
                            aria-pressed={selectedParts.includes(part)}
                            className={s.fractionPart}
                            disabled={locked}
                            onClick={() => {
                              setSelectedParts((current) =>
                                current.includes(part)
                                  ? current.filter((item) => item !== part)
                                  : [...current, part],
                              );
                              setValidation("");
                            }}
                          />
                        ),
                      )}
                    </div>
                    <p className={s.fractionCount}>
                      {selectedParts.length} / {interactive.denominator}
                    </p>
                  </div>
                ) : useChoices ? (
                  <div
                    className={s.answerChoices}
                    role="group"
                    aria-label="답 고르기"
                  >
                    {answerChoices.map((choice, choiceIndex) => (
                      <button
                        key={`${choiceIndex}-${choice}`}
                        type="button"
                        className={s.answerChoice}
                        aria-pressed={answer === choice}
                        disabled={locked}
                        onClick={() => {
                          setAnswer(choice);
                          setValidation("");
                        }}
                      >
                        <span className={s.choiceNumber}>
                          {choiceIndex + 1}
                        </span>
                        <MathText text={choice} as="span" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                <div className={s.inputMessage}>
                  <p
                    id="course-answer-help"
                    className={validation ? s.error : s.help}
                    role={validation ? "alert" : undefined}
                  >
                    {validation ||
                      (useChoices || useInteractive ? "" : problem.input.help)}
                  </p>
                </div>
              </form>
              <div className={s.questionActions}>
                {answeredInFirstRound ? (
                  <button
                    type="button"
                    ref={explanationOpener}
                    className={s.secondary}
                    disabled={locked}
                    onClick={showExplanation}
                  >
                    풀이 보기
                  </button>
                ) : null}
                <button
                  type="button"
                  className={s.textButton}
                  disabled={locked}
                  onClick={giveUp}
                >
                  아직 모르겠어요
                </button>
              </div>
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
      <dialog
        ref={explanationDialog}
        className={s.explanationDialog}
        aria-labelledby="course-explanation-title"
        onCancel={() => setExplanationOpen(false)}
        onClose={() => {
          setExplanationOpen(false);
          explanationOpener.current?.focus({ preventScroll: true });
        }}
      >
        <div className={s.dialogHeader}>
          <h3 id="course-explanation-title">풀이</h3>
          <button
            ref={explanationClose}
            type="button"
            className={s.dialogClose}
            onClick={closeExplanation}
            aria-label="풀이 닫기"
          >
            ×
          </button>
        </div>
        <div className={s.dialogBody}>
          {problem.hint ? (
            <Solution solution={problem.hint} />
          ) : (
            <p role={busy ? "status" : "alert"}>
              {busy
                ? "풀이를 불러오고 있어요…"
                : "풀이를 불러오지 못했어요. 닫고 다시 시도해 주세요."}
            </p>
          )}
        </div>
        {selfCheck && problem.hint && !feedback ? (
          <div className={s.dialogActions}>
            <button
              type="button"
              className={s.primary}
              disabled={busy}
              onClick={() => recordSelf(true)}
            >
              맞았어요
            </button>
            <button
              type="button"
              className={s.secondary}
              disabled={busy}
              onClick={() => recordSelf(false)}
            >
              다시 연습할래요
            </button>
          </div>
        ) : null}
      </dialog>
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

function CourseComplete({
  session,
  summary,
  busy,
  onContinue,
  onExit,
  onHint,
}: Props) {
  const nextAction = useRef<HTMLButtonElement>(null);
  const homeAction = useRef<HTMLButtonElement>(null);
  const explanationDialog = useRef<HTMLDialogElement>(null);
  const explanationClose = useRef<HTMLButtonElement>(null);
  const explanationOpener = useRef<HTMLButtonElement | null>(null);
  const [explanationProblemId, setExplanationProblemId] = useState<
    string | null
  >(null);
  const explanationProblem = session.problems.find(
    (problem) => problem.id === explanationProblemId,
  );
  const retry = (
    session as CoursePublicSession & {
      retry?: { attempts: CoursePublicSession["attempts"] } | null;
    }
  ).retry;
  const finalAttempts = session.problems.map(
    (problem) =>
      retry?.attempts
        .slice()
        .reverse()
        .find((item) => item.problemId === problem.id) ??
      session.attempts.find((item) => item.problemId === problem.id),
  );
  const remainingWrong = finalAttempts.filter(
    (attempt) => attempt && !attempt.correct,
  ).length;
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
  useEffect(() => {
    const dialog = explanationDialog.current;
    if (!dialog) return;
    if (explanationProblemId) {
      if (!dialog.open) {
        if (dialog.showModal) dialog.showModal();
        else dialog.setAttribute("open", "");
      }
      explanationClose.current?.focus({ preventScroll: true });
    } else if (dialog.open) {
      if (dialog.close) dialog.close();
      else dialog.removeAttribute("open");
      explanationOpener.current?.focus({ preventScroll: true });
    }
  }, [explanationProblemId]);
  function showExplanation(problemId: string, opener: HTMLButtonElement) {
    if (busy) return;
    explanationOpener.current = opener;
    setExplanationProblemId(problemId);
    if (
      !session.problems.some(
        (problem) => problem.id === problemId && problem.hint,
      )
    )
      onHint(problemId);
  }
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
                finalAttempts.filter(
                  (attempt) =>
                    attempt?.correct &&
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
                finalAttempts.filter(
                  (attempt) => attempt?.usedHint || attempt?.selfAssessed,
                ).length
              }
            </strong>
            <span>풀이 참고 · 직접 확인</span>
          </div>
        </div>
        <ol className={s.outcomes} aria-label="문제별 학습 결과">
          {finalAttempts.map((attempt, index) => {
            if (!attempt) return null;
            const retried = retry?.attempts.some(
              (item) => item.problemId === attempt.problemId,
            );
            const label = !attempt.correct
              ? "다음 복습"
              : attempt.usedHint
                ? "풀이 참고"
                : attempt.selfAssessed
                  ? "직접 확인"
                  : retried
                    ? "재도전 정답"
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
                <button
                  type="button"
                  className={s.outcomeHint}
                  disabled={busy}
                  onClick={(event) =>
                    showExplanation(attempt.problemId, event.currentTarget)
                  }
                  aria-label={`${index + 1}번 풀이 보기`}
                >
                  풀이 보기
                </button>
              </li>
            );
          })}
        </ol>
        <p className={s.completeMessage}>
          {remainingWrong > 0
            ? "아직 어려운 문제는 다음 복습에서 다시 만나요."
            : done
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
      <dialog
        ref={explanationDialog}
        className={s.explanationDialog}
        aria-labelledby="course-complete-explanation-title"
        onCancel={() => setExplanationProblemId(null)}
        onClose={() => {
          setExplanationProblemId(null);
          explanationOpener.current?.focus({ preventScroll: true });
        }}
      >
        <div className={s.dialogHeader}>
          <h3 id="course-complete-explanation-title">풀이</h3>
          <button
            ref={explanationClose}
            type="button"
            className={s.dialogClose}
            onClick={() => setExplanationProblemId(null)}
            aria-label="풀이 닫기"
          >
            ×
          </button>
        </div>
        <div className={s.dialogBody}>
          {explanationProblem?.hint ? (
            <Solution solution={explanationProblem.hint} />
          ) : (
            <p role={busy ? "status" : "alert"}>
              {busy
                ? "풀이를 불러오고 있어요…"
                : "풀이를 불러오지 못했어요. 닫고 다시 시도해 주세요."}
            </p>
          )}
        </div>
      </dialog>
    </section>
  );
}
