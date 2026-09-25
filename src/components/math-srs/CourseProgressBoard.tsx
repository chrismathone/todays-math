"use client";

import { useEffect, useRef } from "react";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import s from "./elementary-practice.module.css";

interface Props {
  summary: CourseSummary;
  session?: CoursePublicSession | null;
  busy?: boolean;
  onNext?: () => void;
  onHint?: (problemId: string, opener: HTMLButtonElement) => void;
  pageScroll?: boolean;
}

/** A day's real question count, drawn as a scrollable board. No projected wins. */
export default function CourseProgressBoard({
  summary,
  session,
  busy = false,
  onNext,
  onHint,
  pageScroll = false,
}: Props) {
  const completed = summary.todayAnswered;
  const totalSteps = Math.max(summary.todayGoal, completed);
  const canContinue =
    !!onNext &&
    !!summary.recommendation &&
    summary.status !== "paused" &&
    summary.status !== "done" &&
    completed < summary.todayGoal;
  const sessionStart = session
    ? Math.max(0, completed - session.attempts.length)
    : 0;
  const canShowHint =
    !!onHint && !!session && (!session.retry || !!session.retry.completedAt);
  const pathRef = useRef<HTMLOListElement>(null);
  const currentStepRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const current = currentStepRef.current;
    if (!path || !current) return;
    if (pageScroll) {
      const target =
        current.getBoundingClientRect().top +
        window.scrollY -
        Math.min(window.innerHeight * 0.58, 350);
      window.scrollTo({ top: Math.max(0, target), behavior: "instant" });
    } else {
      path.scrollTop = Math.max(0, current.offsetTop - 140);
    }
  }, [completed, canContinue, pageScroll]);

  return (
    <>
      <p className={s.completeSection}>
        오늘 <strong>{completed}</strong> / {summary.todayGoal}문제 완료
      </p>
      <div className={s.pathIntro}>
        <span aria-hidden="true">✦</span>
        <span>위에서 아래로, 오늘의 발걸음</span>
      </div>
      {completed === 0 ? (
        <p className={s.boardStart} aria-label="내 말, 출발 전">
          <span aria-hidden="true">♟</span> 출발 준비
        </p>
      ) : null}
      <ol
        ref={pathRef}
        className={`${s.progressPath} ${pageScroll ? s.progressPathPage : ""}`}
        aria-label="오늘의 세로 진도 길"
        tabIndex={0}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isComplete = step <= completed;
          const isCurrent = step === completed + 1 && canContinue;
          const sessionProblem = session?.problems[step - sessionStart - 1];
          const showHint =
            canShowHint &&
            isComplete &&
            !!sessionProblem &&
            session!.attempts.some(
              (attempt) => attempt.problemId === sessionProblem.id,
            );
          const nodeContent = (
            <>
              <span className={s.pathNodeIcon} aria-hidden="true">
                {step}
              </span>
              <span className={s.pathNodeCaption}>
                {isComplete
                  ? "완료"
                  : isCurrent
                    ? "다음 5문제"
                    : step === totalSteps
                      ? "목표"
                      : "예정"}
              </span>
            </>
          );
          return (
            <li
              key={step}
              ref={
                isCurrent || (completed >= totalSteps && step === totalSteps)
                  ? currentStepRef
                  : undefined
              }
              className={s.pathStep}
              data-side={index % 2 ? "right" : "left"}
              data-state={
                isComplete ? "complete" : isCurrent ? "current" : "upcoming"
              }
            >
              {step === completed ? (
                <span
                  className={s.playerPiece}
                  data-moved={completed > 1}
                  aria-label={`내 말, ${completed}번까지 완료`}
                >
                  ♟
                </span>
              ) : null}
              {index < totalSteps - 1 ? (
                <svg
                  className={s.pathConnector}
                  viewBox="0 0 300 140"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d={
                      index % 2
                        ? "M230 42 C230 95 70 55 70 140"
                        : "M70 42 C70 95 230 55 230 140"
                    }
                  />
                </svg>
              ) : null}
              {isCurrent ? (
                <button
                  type="button"
                  className={s.pathNode}
                  onClick={onNext}
                  disabled={busy}
                  aria-label={`${step}번부터 다음 5문제 시작`}
                >
                  {nodeContent}
                </button>
              ) : showHint && sessionProblem ? (
                <button
                  type="button"
                  className={s.pathNode}
                  onClick={(event) =>
                    onHint?.(sessionProblem.id, event.currentTarget)
                  }
                  disabled={busy}
                  aria-label={`${step}번 완료, 풀이 보기`}
                >
                  {nodeContent}
                </button>
              ) : (
                <span
                  className={s.pathNode}
                  aria-label={`${step}번 ${isComplete ? "완료" : "예정"}`}
                >
                  {nodeContent}
                </span>
              )}
              {isCurrent ? (
                <span className={s.pathCallout}>다음 5문제</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
