"use client";

import dynamic from "next/dynamic";
import { BackButton } from "@/components/ui/BackLink";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import {
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import type {
  CourseAttemptInput,
  CourseFollowUpInput,
  CoursePublicProblem,
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import type { MathSrsJourney } from "@/contracts/mathSrsJourney.contract";
import type { PrerequisiteContext } from "@/contracts/mathPrerequisite.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { previewCardFor } from "@/lib/math-srs/preview";
import { solutionForDisplay } from "@/lib/solutionSteps";
import CourseProgressBoard from "./CourseProgressBoard";
import AnswerFeedbackEffect from "./AnswerFeedbackEffect";
import { EnterKey, NumberKey, SwapArrow } from "./AnswerKeyCaps";
import { answerKey, useAnswerKeys } from "./useAnswerKeys";
import s from "./elementary-practice.module.css";
import pageTurn from "./question-page-turn.module.css";
import { useQuestionPageTurn } from "./useQuestionPageTurn";
import { useLearningMotion } from "./LearningMotion";
import f from "./course-follow-up.module.css";
import {
  FollowUpSolution,
  FollowUpWarning,
  PreviousAnswerMark,
} from "./FollowUpFeedback";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((mod) => mod.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((mod) => mod.MathText),
);
const StudentCoursePreview = dynamic(() => import("./StudentCoursePreview"));

interface Props {
  session: CoursePublicSession;
  summary: CourseSummary;
  journey?: MathSrsJourney;
  journeyTheme?: JourneyThemeId;
  prerequisiteContext?: PrerequisiteContext;
  feedbackId: string | null;
  busy: boolean;
  onAnswer: (input: CourseAttemptInput) => void;
  onFollowUp?: (input: CourseFollowUpInput) => void;
  onHint: (problemId: string) => void;
  onNext: () => void;
  onContinue: () => void;
  onExit: () => void;
  onAuthFailure: (status: number) => void;
}

export default function StudentCoursePractice(props: Props) {
  const { session, feedbackId, onExit } = props;
  const [previewDismissedFor, setPreviewDismissedFor] = useState<string | null>(
    null,
  );
  const [previewOpenedFor, setPreviewOpenedFor] = useState<string | null>(null);
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
  const pendingFollowUp = session.problems.find(
    (item) => item.followUp && !item.followUp.done,
  );
  const problem =
    pendingFollowUp ??
    (feedbackId
      ? session.problems.find((item) => item.id === feedbackId)
      : retryActive
        ? session.problems.find(
            (item) => item.id === retry.pendingProblemIds[0],
          )
        : session.problems.find(
            (item) =>
              !session.attempts.some(
                (attempt) => attempt.problemId === item.id,
              ),
          ));
  const inRetry =
    !pendingFollowUp &&
    !!retry &&
    (feedbackId
      ? retry.attempts.some((item) => item.problemId === feedbackId)
      : retryActive);
  const paperKey = problem
    ? `${problem.id}:${inRetry ? retry!.attempts.length - (feedbackId ? 1 : 0) : "first"}`
    : null;
  const questionKey = paperKey
    ? `${paperKey}:${pendingFollowUp?.followUp?.state ?? "initial"}`
    : null;
  const turnPage = useQuestionPageTurn(paperKey);
  if (!problem) return <CourseComplete {...props} />;
  const preview =
    session.mode === "learn" &&
    session.attempts.length === 0 &&
    !session.completedAt &&
    !pendingFollowUp &&
    !retryActive &&
    ((!session.relearn && previewDismissedFor !== session.id) ||
      previewOpenedFor === session.id)
      ? previewCardFor(session.sectionId)
      : null;
  if (preview) {
    return (
      <StudentCoursePreview
        key={session.id}
        card={preview}
        journeyTheme={props.journeyTheme}
        busy={props.busy}
        onStart={() => {
          setPreviewDismissedFor(session.id);
          setPreviewOpenedFor(null);
        }}
        onExit={onExit}
      />
    );
  }
  const index = session.problems.findIndex((item) => item.id === problem.id);
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
    <div
      className={`${s.practice} ${s.studentPractice} ${s.fixedPractice} ${pendingFollowUp ? f.practice : ""}`}
      style={
        props.journeyTheme && JOURNEY_THEMES[props.journeyTheme].boardImage
          ? ({
              "--learn-course-theme": `url("${JOURNEY_THEMES[props.journeyTheme].boardImage}")`,
            } as CSSProperties)
          : undefined
      }
    >
      <header className={s.header}>
        <BackButton type="button" onClick={onExit} disabled={props.busy}>
          학습 홈
        </BackButton>
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
      {props.prerequisiteContext?.reason ? (
        <p className={s.prerequisiteReason}>
          {props.prerequisiteContext.reason}
        </p>
      ) : null}
      {session.relearn &&
      session.mode === "learn" &&
      session.attempts.length === 0 &&
      !session.completedAt &&
      !pendingFollowUp &&
      !retryActive &&
      previewCardFor(session.sectionId) ? (
        <div>
          <button
            type="button"
            className={s.secondary}
            disabled={props.busy}
            onClick={() => setPreviewOpenedFor(session.id)}
          >
            개념 다시 보기
          </button>
        </div>
      ) : null}
      <CourseQuestion
        key={questionKey}
        {...props}
        problem={problem}
        title={section?.title ?? "오늘 수학"}
        turnPage={turnPage}
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
          (inRetry ? retry?.attempts : undefined)
            ?.slice()
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
        const { COURSE_FOLLOW_UP_HEADER } =
          await import("@/contracts/mathSrsCourse.contract");
        if (controller.signal.aborted) return;
        const response = await fetch(url!, {
          headers: { [COURSE_FOLLOW_UP_HEADER]: "1" },
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
  turnPage,
  session,
  feedbackId,
  busy,
  onAnswer,
  onFollowUp,
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
  turnPage: "true" | undefined;
}) {
  const [answer, setAnswer] = useState("");
  const [validation, setValidation] = useState("");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const explanationDialog = useRef<HTMLDialogElement>(null);
  const explanationOpener = useRef<HTMLButtonElement>(null);
  const explanationClose = useRef<HTMLButtonElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const questionRoot = useRef<HTMLElement>(null);
  useAnswerKeys(questionRoot);
  const submitted = useRef(false);
  const [submittedAction, setSubmittedAction] = useState<
    "answer" | "give-up" | "self-check" | null
  >(null);
  const figure = useProblemFigure(problem.figureUrl, onAuthFailure);
  const attempt =
    retryAttempt ??
    session.attempts.find((item) => item.problemId === problem.id);
  const followUp =
    retryIndex === null && problem.followUp && !problem.followUp.done
      ? problem.followUp
      : null;
  const awaiting = followUp?.state === "awaiting";
  // Opening the retry queue can redact problem.feedback in the same response
  // that saved the final first attempt. Its persisted grade still drives the
  // brief overlay before we move into that queue.
  const feedback =
    feedbackId === problem.id
      ? (problem.feedback ?? (attempt ? { correct: attempt.correct } : null))
      : null;
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
  const hasFeedback = !awaiting && !!feedback && !!attempt;
  const resultMessage =
    submittedAction === "give-up"
      ? retryIndex === null
        ? "모르는 부분을 확인했어요"
        : "아직 모르겠어요로 기록했어요"
      : submittedAction === "self-check" || attempt?.selfAssessed
        ? feedback?.correct
          ? "혼자 풀었다고 기록했어요"
          : "다시 볼 내용으로 기록했어요"
        : retryIndex !== null
          ? feedback?.correct
            ? "이번에는 해결했어요"
            : "아직 해결하지 못했어요"
          : undefined;
  const result = (
    <AnswerFeedbackEffect
      correct={hasFeedback ? feedback.correct : null}
      eventKey={`${problem.id}:${retryIndex ?? "first"}`}
      message={resultMessage}
    />
  );
  const selectedAnswer = followUp
    ? answer
    : hasFeedback
      ? attempt.submittedAnswer
      : answer;
  // Rotate only the displayed values. Submission and number keys use this order's actual value.
  const displayedChoices =
    awaiting && answerChoices
      ? [...answerChoices.slice(1), answerChoices[0]!]
      : answerChoices;
  const ready = figure.status === "ready";
  const locked = busy || !ready;
  const instantAnswer = useChoices || useInteractive;
  const { reduceMotion } = useLearningMotion();
  const advanced = useRef(false);
  const advance = useCallback(() => {
    if (advanced.current || busy) return;
    advanced.current = true;
    onNext();
  }, [busy, onNext]);

  useEffect(() => {
    if (!busy && !hasFeedback) {
      submitted.current = false;
      advanced.current = false;
    }
  }, [busy, hasFeedback]);

  useEffect(() => {
    if (
      !hasFeedback ||
      !feedback?.correct ||
      busy ||
      !instantAnswer ||
      followUp ||
      reduceMotion
    )
      return;
    const timer = window.setTimeout(advance, 2000);
    return () => window.clearTimeout(timer);
  }, [
    hasFeedback,
    feedback?.correct,
    busy,
    instantAnswer,
    advance,
    followUp,
    reduceMotion,
  ]);

  useEffect(() => {
    if (hasFeedback || (followUp && !awaiting))
      nextButton.current?.focus({ preventScroll: true });
    else questionHeading.current?.focus({ preventScroll: true });
  }, [hasFeedback, followUp, awaiting]);

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
    if (submitted.current || locked || hasFeedback) return;
    submitted.current = true;
    setSubmittedAction(
      payload.giveUp
        ? "give-up"
        : payload.selfCorrect !== undefined
          ? "self-check"
          : "answer",
    );
    const request = {
      sessionId: session.id,
      problemId: problem.id,
      ...payload,
      ...(retryIndex === null ? {} : { retryIndex }),
    };
    if (awaiting)
      onFollowUp?.({
        sessionId: session.id,
        problemId: problem.id,
        action: "answer",
        ...(payload.giveUp
          ? { giveUp: true }
          : { submittedAnswer: payload.submittedAnswer }),
      });
    else onAnswer(request);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || hasFeedback || selfCheck) return;
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
    if (locked) return;
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
      ref={questionRoot}
      className={`${s.question} ${s.studentQuestion} ${s.fixedQuestion} ${followUp ? f.question : ""}`}
      data-answer-mode={
        useChoices ? "choices" : useInteractive ? "fraction" : "written"
      }
      aria-labelledby="course-question-title"
      aria-busy={busy}
    >
      <div
        className={`${s.problemPane} ${pageTurn.page} ${followUp ? f.problem : ""}`}
        data-page-turn="true"
        data-question-transition={turnPage}
      >
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
            practiceLayout
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
      <div className={`${s.responsePane} ${followUp ? f.response : ""}`}>
        {followUp && !awaiting ? (
          followUp.state === "correct" ? (
            <div className={f.correct}>
              <p role="status">맞았어요</p>
              <button
                ref={nextButton}
                type="button"
                className={s.primary}
                disabled={busy}
                onClick={() =>
                  onFollowUp?.({
                    sessionId: session.id,
                    problemId: problem.id,
                    action: "done",
                  })
                }
              >
                다음
              </button>
            </div>
          ) : (
            <FollowUpSolution
              headingId="course-inline-solution-title"
              footerText="이 문제는 다음 복습에서 다시 만나요."
              buttonRef={nextButton}
              busy={busy || !problem.hint}
              onUnderstood={() =>
                onFollowUp?.({
                  sessionId: session.id,
                  problemId: problem.id,
                  action: "done",
                })
              }
              figure={
                problem.figureUrl ? (
                  figure.svg ? (
                    <div dangerouslySetInnerHTML={{ __html: figure.svg }} />
                  ) : (
                    <p role="status">문제의 그림을 확인해 주세요.</p>
                  )
                ) : undefined
              }
            >
              {problem.hint ? (
                <Solution solution={problem.hint} />
              ) : (
                <p role="alert">
                  풀이를 불러오지 못했어요. 다시 불러와 주세요.
                </p>
              )}
            </FollowUpSolution>
          )
        ) : hasFeedback && selfCheck ? (
          <div className={s.feedback}>
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="풀이 결과 내용"
            >
              {result}
            </div>
            <div className={s.paneAction}>
              <button
                ref={nextButton}
                type="button"
                className={s.primary}
                aria-keyshortcuts="Enter"
                onClick={advance}
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
                다 풀었다면 정답을 보지 않고 내 풀이를 평가해 주세요. 풀이는
                재도전까지 마친 뒤 볼 수 있어요.
              </p>
              {session.retry?.completedAt ? (
                <button
                  ref={explanationOpener}
                  type="button"
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
            <div className={s.paneAction}>
              {selfReady ? (
                <div className={s.selfCheckActions}>
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={locked}
                    onClick={() => recordSelf(true)}
                  >
                    혼자 풀었다고 생각해요
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
                  onClick={() => setSelfReady(true)}
                >
                  다 풀었어요
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`${s.automatic} ${hasFeedback ? s.answered : ""}`}
            data-correct={hasFeedback ? feedback.correct : undefined}
          >
            <div
              className={s.responseScroll}
              tabIndex={0}
              role="region"
              aria-label="답안 작성"
            >
              <div className={s.answerDockHeader}>
                {awaiting ? (
                  <FollowUpWarning />
                ) : hasFeedback ? (
                  result
                ) : (
                  <p className={s.feedbackLabel}>
                    {useInteractive
                      ? "모양을 눌러 답을 만드세요"
                      : useChoices
                        ? "답을 누르면 바로 확인해요"
                        : "생각한 답을 적어 주세요"}
                  </p>
                )}
                <button
                  type="button"
                  className={s.textButton}
                  disabled={locked || hasFeedback}
                  onClick={giveUp}
                >
                  아직 모르겠어요
                </button>
              </div>
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
                            data-answer-control=""
                            className={s.fractionPart}
                            disabled={locked || hasFeedback}
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
                    {displayedChoices!.map((choice, choiceIndex) => (
                      <button
                        key={`${choiceIndex}-${choice}`}
                        type="button"
                        className={s.answerChoice}
                        aria-keyshortcuts={answerKey(choiceIndex)}
                        aria-pressed={selectedAnswer === choice}
                        data-answer-control=""
                        data-previous={
                          awaiting && attempt?.submittedAnswer === choice
                            ? "true"
                            : undefined
                        }
                        data-result={
                          hasFeedback && selectedAnswer === choice
                            ? feedback.correct
                              ? "correct"
                              : "incorrect"
                            : undefined
                        }
                        disabled={locked || hasFeedback}
                        onClick={() => {
                          if (submitted.current) return;
                          setAnswer(choice);
                          setValidation("");
                          sendAnswer({ submittedAnswer: choice });
                        }}
                      >
                        <NumberKey
                          index={choiceIndex}
                          className={s.choiceNumber}
                        />
                        <MathText text={choice} as="span" />
                        {awaiting && attempt?.submittedAnswer === choice ? (
                          <PreviousAnswerMark />
                        ) : null}
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
                      disabled={locked || hasFeedback}
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
            </div>
            {!useChoices || hasFeedback ? (
              <div className={s.paneAction}>
                {hasFeedback ? (
                  <button
                    ref={nextButton}
                    type="button"
                    className={s.primary}
                    aria-keyshortcuts="Enter"
                    onClick={advance}
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
                ) : (
                  <button
                    type="submit"
                    form="course-answer-form"
                    className={s.primary}
                    aria-keyshortcuts="Enter"
                    disabled={locked || hasFeedback}
                  >
                    {busy
                      ? "저장 중…"
                      : useInteractive
                        ? "완성했어요"
                        : "정답 확인"}
                    <SwapArrow />
                    <EnterKey />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {!followUp ? (
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
      ) : null}
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
  journey,
  busy,
  onContinue,
  onExit,
  prerequisiteContext,
}: Props) {
  const completeHeading = useRef<HTMLHeadingElement>(null);
  const goalReached = summary.todayAnswered >= summary.todayGoal;
  const done = goalReached || summary.status === "done";
  const unavailable =
    prerequisiteContext?.kind === "unavailable" &&
    !prerequisiteContext.canStart;
  useEffect(() => {
    if (!busy) {
      const next =
        completeHeading.current?.parentElement?.querySelector<HTMLButtonElement>(
          "button[data-journey-continue]",
        );
      (next ?? completeHeading.current)?.focus({ preventScroll: true });
    }
  }, [busy]);
  return (
    <section className={`${s.practice} ${s.studentPractice} ${s.complete}`}>
      <div
        className={s.completeBody}
        tabIndex={0}
        role="region"
        aria-label="이번 학습 결과"
      >
        <p className={s.completionLabel}>
          {unavailable
            ? "다음 학습 준비"
            : done
              ? "오늘의 길을 완주했어요"
              : "한 걸음 더 앞으로"}
        </p>
        <h2 id="course-complete-title" ref={completeHeading} tabIndex={-1}>
          {unavailable
            ? "지금은 새 문제를 열 수 없어요."
            : done
              ? "오늘의 목표 도착!"
              : "다음 발걸음이 기다려요"}
        </h2>
        <CourseProgressBoard
          journey={journey}
          summary={summary}
          session={session}
          busy={busy}
          onNext={unavailable ? undefined : onContinue}
        />
        <p className={s.completeMessage}>
          {unavailable
            ? prerequisiteContext.reason
            : done
              ? "오늘의 발걸음을 모두 채웠어요."
              : "길을 따라 다음 5문제로 이어가요."}
        </p>
      </div>
      <div className={s.completeActions}>
        <button
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
