"use client";

import { BackButton } from "@/components/ui/BackLink";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Submitted } from "@/components/learn/learnApi";
import { Button } from "@/components/ui/Button";
import { formatDayWithWeekday } from "@/components/unified/conceptFormat";
import type {
  MathSrsAttemptInput,
  MathSrsPublicMission,
  MathSrsPublicProblem,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import { kstDateOf } from "@/lib/kstDate";
import { comboToShow } from "@/lib/math-srs/combo";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import type { Rating } from "@/lib/math-srs/types";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import {
  fetchMathSrs,
  startMathSrs,
  submitMathSrsAttempt,
  submitMathSrsReplay,
} from "./mathSrsApi";
import { SrsMemoryGrid } from "./SrsMemoryGrid";
import {
  StudentReviewPage,
  StudentReviewStatus,
  StudentReviewOverview,
} from "./StudentReviewHome";
import s from "./authenticated.module.css";
import pageTurn from "./question-page-turn.module.css";
import StudentJourney from "./StudentJourney";
import AnswerFeedbackEffect from "./AnswerFeedbackEffect";
import { useQuestionPageTurn } from "./useQuestionPageTurn";
import { NumberKey } from "./AnswerKeyCaps";
import { answerKey, useAnswerKeys } from "./useAnswerKeys";
import type { ExpeditionActivityCallbacks } from "@/components/math-explorers/ExplorerBankActivity";
import { useLearningSounds } from "./LearningSounds";
import { learningSoundCue } from "./learningSoundCue";
import {
  usePausedFeedback,
  usePausedQuestionClock,
} from "./usePausedQuestionClock";

const ProblemContent = dynamic(() =>
  import("@/components/math/ProblemContent").then((mod) => mod.ProblemContent),
);
const MathText = dynamic(() =>
  import("@/components/math/MathText").then((mod) => mod.MathText),
);
type Failure = { status: number; message: string };

function remainingRetrySteps(
  mission: MathSrsPublicMission | null,
): number[] | null {
  if (!mission?.completedAt) return null;
  const resolved = new Set(mission.resolvedRetryProblemIds ?? []);
  return mission.attempts.flatMap((attempt, index) =>
    !attempt.correct && !resolved.has(attempt.problemId) ? [index + 1] : [],
  );
}

export function StudentMathSrs({
  expedition,
  paused = false,
}: { expedition?: ExpeditionActivityCallbacks; paused?: boolean } = {}) {
  const router = useRouter();
  const { gesture, play, resetStudent } = useLearningSounds();
  const soundEpoch = useRef(0);
  const soundStudent = useRef<string | null>(null);
  const [state, setState] = useState<MathSrsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  // A lost response may already have been saved. Retry the exact same submission.
  const lastSubmission = useRef<MathSrsAttemptInput | null>(null);
  const alive = useRef(true);
  const [practicing, setPracticing] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [retrySteps, setRetrySteps] = useState<number[] | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<boolean | null>(null);
  const [retryTurn, setRetryTurn] = useState(0);
  const expeditionRef = useRef(expedition);
  useEffect(() => {
    expeditionRef.current = expedition;
  }, [expedition]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    void fetchMathSrs().then(async (result) => {
      if (!current) return;
      if (result.ok) {
        soundEpoch.current++;
        soundStudent.current = result.data.student.id;
        resetStudent(result.data.student.id);
        setState(result.data);
        setRetrySteps(remainingRetrySteps(result.data.mission));
        setError(null);
        if (expeditionRef.current) {
          const session = result.data.mission;
          if (
            session &&
            (!session.completedAt || remainingRetrySteps(session)?.length)
          )
            setPracticing(true);
          else if (result.data.journey?.todayComplete)
            expeditionRef.current.onComplete();
          else {
            const started = await startMathSrs();
            if (!current) return;
            if (started.ok) {
              setState(started.data);
              setRetrySteps(remainingRetrySteps(started.data.mission));
              setPracticing(!!started.data.mission);
            } else setError(started);
          }
        }
      } else if (result.status === 401) router.replace("/learn/login");
      else if (
        result.status === 403 &&
        result.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        router.replace("/learn/password");
      else setError(result);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [reload, router, resetStudent]);

  async function mutate(
    action: () => Promise<Submitted<MathSrsState>>,
    after?: (data: MathSrsState) => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!alive.current) return;
      if (result.ok) {
        setState(result.data);
        after?.(result.data);
      } else if (result.status === 401) router.replace("/learn/login");
      else if (
        result.status === 403 &&
        result.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        router.replace("/learn/password");
      else setError(result);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const mission = state?.mission;
  const missionInProgress = !!mission && !mission.completedAt;
  const finishedToday =
    state?.journey?.todayComplete ??
    (!!mission?.completedAt &&
      !remainingRetrySteps(mission)?.length &&
      mission.date === kstDateOf(new Date()));
  const feedbackProblem = feedbackId
    ? mission?.problems.find((problem) => problem.id === feedbackId)
    : null;
  const hasPendingRetry = !!mission?.completedAt && !!retrySteps?.length;
  const retryStep = retrySteps?.[0];
  const currentProblem = retryStep
    ? mission?.problems[retryStep - 1]
    : mission?.problems[mission.attempts.length];
  const displayedProblem = feedbackProblem ?? currentProblem;
  const turnPage = useQuestionPageTurn(
    displayedProblem
      ? `${mission!.id}:${displayedProblem.id}:${retryTurn}`
      : null,
  );
  const correct = retryStep
    ? retryFeedback
    : feedbackId
      ? (mission?.attempts.find((attempt) => attempt.problemId === feedbackId)
          ?.correct ?? null)
      : null;
  // 콤보(05 §8.15) — 첫 풀이의 정답 연출에서만. 서버가 돌려준 기록으로 센다(오답 다시 풀기는 세지 않는다).
  const streak =
    !retryStep && feedbackId && mission
      ? comboToShow(mission, feedbackId)
      : null;

  usePausedFeedback(
    () => {
      if (retryFeedback !== null) {
        if (retryFeedback && retrySteps?.length === 1) {
          setPracticing(false);
          expeditionRef.current?.onComplete();
        }
        setRetrySteps((steps) => {
          if (!steps?.length) return steps;
          return retryFeedback ? steps.slice(1) : [...steps.slice(1), steps[0]];
        });
        setRetryFeedback(null);
        setRetryTurn((turn) => turn + 1);
      } else {
        setFeedbackId(null);
        if (mission?.completedAt) {
          const remaining = remainingRetrySteps(mission);
          setRetrySteps(remaining);
          if (!remaining?.length) {
            setPracticing(false);
            expeditionRef.current?.onComplete();
          }
        }
      }
    },
    practicing && (feedbackId || retryFeedback !== null)
      ? `${mission?.id}:${feedbackId ?? "retry"}:${retryTurn}`
      : null,
    paused,
  );

  async function retryAnswer(answer: string) {
    if (
      pending.current ||
      !mission ||
      !retryStep ||
      !currentProblem ||
      retryFeedback !== null
    )
      return;
    gesture();
    const studentId = state!.student.id;
    const soundTurn = soundEpoch.current;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await submitMathSrsReplay({
        kind: "middle",
        step: retryStep,
        missionId: mission.id,
        problemId: currentProblem.id,
        submittedAnswer: answer,
        recordRetry: true,
      });
      if (!alive.current) return;
      if (result.ok) {
        if (result.data.correct) {
          setState((previous) =>
            previous
              ? {
                  ...previous,
                  ...(result.data.journey
                    ? { journey: result.data.journey }
                    : {}),
                  mission:
                    previous.mission?.id === mission.id
                      ? {
                          ...previous.mission,
                          resolvedRetryProblemIds: [
                            ...new Set([
                              ...(previous.mission.resolvedRetryProblemIds ??
                                []),
                              currentProblem.id,
                            ]),
                          ],
                        }
                      : previous.mission,
                }
              : previous,
          );
        }
        setRetryFeedback(result.data.correct);
        if (
          soundEpoch.current === soundTurn &&
          soundStudent.current === studentId &&
          result.data.kind === "middle" &&
          result.data.problemId === currentProblem.id &&
          result.data.step === retryStep &&
          typeof result.data.correct === "boolean"
        ) {
          const cue = learningSoundCue(
            { type: "middle", submittedAnswer: answer },
            result.data.correct,
          );
          if (cue)
            play(
              cue,
              `${studentId}:${mission.id}:${currentProblem.id}:${retryTurn}`,
            );
          expeditionRef.current?.onConfirmedAnswer?.(studentId);
        }
      } else if (result.status === 401) router.replace("/learn/login");
      else if (
        result.status === 403 &&
        result.message === STUDENT_MUST_CHANGE_MESSAGE
      )
        router.replace("/learn/password");
      else setError(result);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const progressCount =
    missionInProgress || finishedToday || hasPendingRetry
      ? mission!.attempts.length
      : 0;
  const progressTitle =
    missionInProgress && mission.date !== kstDateOf(new Date())
      ? "진행 중인 복습"
      : "오늘의 학습";
  const nextConcept = missionInProgress
    ? CONCEPTS.find((concept) => concept.id === currentProblem?.conceptId)
        ?.title
    : null;
  const resetLoad = () => {
    soundEpoch.current++;
    lastSubmission.current = null;
    setLoading(true);
    setError(null);
    setFeedbackId(null);
    setRetryFeedback(null);
    setReload((value) => value + 1);
  };
  const beginPractice = () => {
    gesture();
    if (hasPendingRetry) {
      setPracticing(true);
      setFeedbackId(null);
      setRetryFeedback(null);
    } else {
      void mutate(startMathSrs, (next) => {
        setPracticing(true);
        setFeedbackId(null);
        setRetrySteps(remainingRetrySteps(next.mission));
        setRetryFeedback(null);
      });
    }
  };
  const journeyBoard = state ? (
    <StudentJourney
      kind="middle"
      journey={
        state.journey ?? {
          completedDays: 0,
          todayComplete: false,
          todayAnswered: progressCount,
          todayGoal: 12,
          days: [],
          upcoming: CONCEPTS.map((concept) => ({
            title: concept.title,
            subtitle: "중1 · 일차방정식",
          })),
        }
      }
      busy={busy}
      onNext={finishedToday ? undefined : beginPractice}
      nextLabel={
        hasPendingRetry
          ? `오답 다시 풀기 · ${retrySteps!.length}문제`
          : missionInProgress
            ? "이어서 학습하기"
            : "오늘의 복습 시작"
      }
    />
  ) : null;

  return (
    <StudentReviewPage
      kind={expedition ? "explorers" : "middle"}
      student={state?.student ?? null}
      practicing={practicing || !!expedition}
      boardReady={!!state && !loading && error?.status !== 503}
      practiceTitle="오늘의 수학 복습"
      practicePageClassName={`${s.student} ${s.practiceViewport}`}
      practiceMainClassName={`${s.body} ${s.practiceBody}`}
    >
      <StudentReviewStatus
        loading={loading}
        error={error}
        busy={busy}
        onReload={resetLoad}
      />
      {!loading && state && (practicing || error?.status !== 503) ? (
        <>
          {practicing && mission ? (
            <>
              <div className={s.practiceHeader}>
                <BackButton
                  disabled={busy}
                  onClick={() => {
                    soundEpoch.current++;
                    setPracticing(false);
                    setFeedbackId(null);
                    setRetryFeedback(null);
                    setRetrySteps(remainingRetrySteps(mission));
                    expedition?.onExit();
                  }}
                >
                  학습 홈
                </BackButton>
                <span>중1 · 일차방정식</span>
              </div>
              <div className={s.progress}>
                <span>
                  {retryStep ? "모아 둔 오답 다시 풀기" : "오늘의 복습"}
                </span>
                <progress
                  aria-label="미션 진행"
                  value={mission.attempts.length}
                  max={mission.problems.length}
                />
                <span>
                  {retryStep
                    ? `${retrySteps!.length}문제 남음`
                    : `${Math.min(mission.attempts.length + (feedbackId ? 0 : 1), mission.problems.length)}/${mission.problems.length}`}
                </span>
              </div>
              {displayedProblem &&
              (retryStep || feedbackId || !mission.completedAt) ? (
                <Question
                  key={`${mission.id}:${displayedProblem.id}:${retryTurn}`}
                  problem={displayedProblem}
                  busy={paused || busy || error?.status === 409}
                  paused={paused}
                  correct={correct}
                  streak={streak}
                  retry={!!retryStep}
                  eventKey={`${displayedProblem.id}:${retryTurn}`}
                  turnPage={turnPage}
                  onReload={resetLoad}
                  onAnswer={(submittedAnswer, elapsedSeconds, rating) => {
                    if (retryStep) {
                      void retryAnswer(submittedAnswer);
                      return;
                    }
                    if (!currentProblem || feedbackId) return;
                    gesture();
                    const studentId = state.student.id;
                    const soundTurn = soundEpoch.current;
                    void mutate(
                      () => {
                        const previous = lastSubmission.current;
                        const payload =
                          previous &&
                          previous.missionId === mission.id &&
                          previous.problemId === currentProblem.id &&
                          previous.submittedAnswer === submittedAnswer &&
                          previous.rating === rating
                            ? previous
                            : {
                                missionId: mission.id,
                                problemId: currentProblem.id,
                                submittedAnswer,
                                elapsedSeconds,
                                rating,
                              };
                        lastSubmission.current = payload;
                        return submitMathSrsAttempt(payload);
                      },
                      (next) => {
                        lastSubmission.current = null;
                        if (
                          next.mission?.id === mission.id &&
                          next.mission.attempts.some(
                            (attempt) =>
                              attempt.problemId === currentProblem.id,
                          )
                        ) {
                          setFeedbackId(currentProblem.id);
                          const attempt = next.mission.attempts.find(
                            (item) => item.problemId === currentProblem.id,
                          )!;
                          if (
                            soundEpoch.current === soundTurn &&
                            soundStudent.current === studentId &&
                            next.student.id === studentId
                          ) {
                            const cue = learningSoundCue(
                              { type: "middle", submittedAnswer },
                              attempt.correct,
                            );
                            if (cue)
                              play(
                                cue,
                                `${studentId}:${mission.id}:${currentProblem.id}`,
                              );
                            expeditionRef.current?.onConfirmedAnswer?.(
                              studentId,
                            );
                          }
                        }
                      },
                    );
                  }}
                />
              ) : (
                <div className={s.resultCard}>{journeyBoard}</div>
              )}
            </>
          ) : expedition ? (
            <div className={s.resultCard}>
              <p>같은 탐험을 이어 갈 수 있어요.</p>
              <Button onClick={expedition.onExit}>탐험판으로</Button>
            </div>
          ) : (
            <>
              <StudentReviewOverview
                board={journeyBoard}
                recommendation={{
                  id: "mission-heading",
                  eyebrow: finishedToday
                    ? "오늘의 복습 완료"
                    : missionInProgress
                      ? "이어서 학습"
                      : "오늘의 추천 복습",
                  title: finishedToday
                    ? "오늘의 복습을 마쳤어요."
                    : hasPendingRetry
                      ? "모아 둔 오답을 다시 풀어요."
                      : missionInProgress
                        ? "풀던 복습을 이어 가요."
                        : "일차방정식을 복습해요.",
                  section: "중1 · 일차방정식",
                  reason: finishedToday
                    ? "하루 학습을 마쳐 진도판에서 한 칸 전진했어요."
                    : hasPendingRetry
                      ? "오답 재풀이까지 마치면 한 칸 전진해요."
                      : missionInProgress
                        ? `${12 - mission.attempts.length}문제가 남았어요. 이어서 풀어 보세요.`
                        : "워밍업부터 다시 도전하는 문제까지, 풀이 기록에 맞춰 복습해요.",
                  action: finishedToday
                    ? undefined
                    : {
                        label: busy
                          ? "복습을 준비하는 중…"
                          : mission && !mission.completedAt
                            ? `이어서 학습하기 · ${mission.attempts.length}/12`
                            : "오늘의 복습 시작",
                        disabled: busy,
                        onClick: beginPractice,
                      },
                  note: "한 번에 12문제 · 약 10~15분",
                }}
                progress={{
                  title: progressTitle,
                  ariaLabel: "복습 진행",
                  completed: progressCount,
                  goal: 12,
                  rows: [
                    {
                      label: "남은 문제",
                      value: `${12 - progressCount}문제`,
                    },
                    {
                      label: "다음 개념",
                      value:
                        nextConcept ??
                        (finishedToday ? "내일 다시 만나요" : "시작하면 안내"),
                    },
                  ],
                }}
              />
              <div className={s.homeGrid}>
                <section
                  className={`${s.card} ${s.memorySection}`}
                  aria-labelledby="my-memory-heading"
                >
                  <p className={s.eyebrow}>개념별 복습 현황</p>
                  <h2 id="my-memory-heading">나의 개념 기억</h2>
                  <p className={s.muted}>
                    정답·힌트·지난 학습 시간을 바탕으로 추정한 값이에요. 처음
                    푸는 개념은 측정 전으로 표시해요.
                  </p>
                  <SrsMemoryGrid memories={state.memories} />
                </section>
                <section
                  className={s.card}
                  aria-labelledby="my-progress-heading"
                >
                  <p className={s.eyebrow}>수업과 연결하기</p>
                  <h2 id="my-progress-heading">수업과 함께 복습하기</h2>
                  {state.currentProgress ? (
                    <p>
                      <strong>{state.currentProgress.section}</strong>
                      <br />
                      <span className={s.muted}>
                        {state.currentProgress.source === "individual"
                          ? "개인 진도"
                          : "반 진도"}{" "}
                        ·{" "}
                        {formatDayWithWeekday(state.currentProgress.recordedAt)}
                      </span>
                    </p>
                  ) : (
                    <p className={s.muted}>아직 등록된 수업 진도가 없어요.</p>
                  )}
                  {state.lectures.length ? (
                    <ul className={s.links}>
                      {state.lectures.map((lecture) => (
                        <li key={lecture.id}>
                          <Link
                            href={`/learn/watch/${encodeURIComponent(lecture.id)}`}
                          >
                            <strong>{lecture.title}</strong>
                            <span className={s.muted}>
                              {lecture.section} · 개념 강의 보기 →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={s.muted}>
                      열린 개념 강의는 강의 목록에서 확인할 수 있어요.
                    </p>
                  )}
                </section>
                {state.recentMissions.length ? (
                  <section className={s.card}>
                    <p className={s.eyebrow}>나의 학습 기록</p>
                    <h2>최근 학습</h2>
                    <ul className={s.history}>
                      {state.recentMissions.slice(0, 7).map((item) => (
                        <li key={item.id}>
                          <span>{formatDayWithWeekday(item.date)}</span>
                          <span>
                            {item.completedAt
                              ? "완료"
                              : `${item.answered}/${item.total} 진행`}{" "}
                            · {item.correct}문제 정답
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </>
          )}
        </>
      ) : null}
    </StudentReviewPage>
  );
}

function Question({
  problem,
  busy,
  correct,
  streak,
  retry,
  eventKey,
  turnPage,
  onReload,
  onAnswer,
  paused,
}: {
  problem: MathSrsPublicProblem;
  busy: boolean;
  correct: boolean | null;
  streak: number | null;
  retry: boolean;
  eventKey: string;
  turnPage: "true" | undefined;
  onReload: () => void;
  onAnswer: (answer: string, elapsed: number, rating: Rating) => void;
  paused: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submittedAction, setSubmittedAction] = useState<
    "answer" | "give-up" | null
  >(null);
  const elapsed = usePausedQuestionClock(paused);
  const heading = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLElement>(null);
  useAnswerKeys(card);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [problem.id]);
  const disabled = busy || correct !== null;
  const choices = problem.answerChoices;
  function choose(answer: string) {
    if (disabled) return;
    setSelected(answer);
    setSubmittedAction(answer ? "answer" : "give-up");
    onAnswer(
      answer,
      Math.min(86_400, Math.max(0, elapsed())),
      answer ? "good" : "again",
    );
  }
  return (
    <section
      ref={card}
      className={`${s.card} ${s.questionCard} ${s.fixedQuestion}`}
      aria-label="현재 문제"
      aria-busy={busy}
    >
      <div
        className={`${s.problemScroll} ${pageTurn.page}`}
        data-page-turn="true"
        data-question-transition={turnPage}
        key={eventKey}
      >
        <p ref={heading} tabIndex={-1} className={s.eyebrow}>
          {CONCEPTS.find((concept) => concept.id === problem.conceptId)?.title}
          {problem.source ? ` · ${problem.source.tier}` : ""}
        </p>
        <div className={s.question}>
          <ProblemContent content={problem.prompt} practiceLayout />
          {problem.equation ? (
            <MathText text={problem.equation} as="div" className={s.equation} />
          ) : null}
          {problem.answerUnit ? (
            <p className={s.unitNote}>답의 단위: {problem.answerUnit}</p>
          ) : null}
        </div>
      </div>
      <div className={s.answerDock}>
        {choices?.length === 4 ? (
          <>
            <div className={s.answerDockHeading}>
              {correct !== null ? (
                <AnswerFeedbackEffect
                  correct={correct}
                  eventKey={eventKey}
                  streak={streak}
                  message={
                    submittedAction === "give-up"
                      ? "모르는 부분을 확인했어요"
                      : retry
                        ? correct
                          ? "이번에는 해결했어요"
                          : "아직 해결하지 못했어요"
                        : undefined
                  }
                />
              ) : (
                <span>
                  {busy ? "확인하고 있어요…" : "답을 하나 골라 주세요"}
                </span>
              )}
              {!retry ? (
                <button
                  type="button"
                  className={s.skipAnswer}
                  disabled={disabled}
                  onClick={() => choose("")}
                >
                  아직 모르겠어요
                </button>
              ) : null}
            </div>
            <div
              className={s.answerChoices}
              role="group"
              aria-label="답 고르기"
            >
              {choices.map((choice, index) => (
                <button
                  key={choice}
                  type="button"
                  disabled={disabled}
                  aria-keyshortcuts={answerKey(index)}
                  aria-pressed={selected === choice}
                  data-answer-control=""
                  onClick={() => choose(choice)}
                  data-result={
                    selected === choice && correct !== null
                      ? correct
                        ? "correct"
                        : "incorrect"
                      : undefined
                  }
                >
                  <NumberKey
                    index={index}
                    className={s.choiceNumber}
                    aria-hidden="true"
                  />
                  <MathText text={choice} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div role="alert" className={s.choiceError}>
            <p>보기를 불러오지 못했어요.</p>
            <Button onClick={onReload} disabled={busy}>
              보기를 다시 불러오기
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
