"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import s from "./student-progress-board.module.css";

export interface StudentProgressBoardProps {
  completed: number;
  goal: number;
  title: string;
  subtitle?: string;
  nextLabel?: string;
  nextAriaLabel?: string;
  onNext?: () => void;
  busy?: boolean;
  reviewableSteps?: ReadonlyArray<number>;
  onReviewStep?: (step: number, opener: HTMLButtonElement) => void;
  ariaLabel?: string;
}

/** Start at the bottom right and travel clockwise around the four edges. */
function perimeter(size: number) {
  const cells: Array<{ row: number; column: number }> = [];
  for (let column = size - 1; column >= 0; column--)
    cells.push({ row: size - 1, column });
  for (let row = size - 2; row >= 0; row--) cells.push({ row, column: 0 });
  for (let column = 1; column < size; column++) cells.push({ row: 0, column });
  for (let row = 1; row < size - 1; row++)
    cells.push({ row, column: size - 1 });
  return cells;
}

const pawn = (
  <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="42" rx="17" ry="5" fill="#172d4d" opacity=".18" />
    <path
      d="M10 37c1-7 6-11 6-19h8c0 8 5 12 6 19Z"
      fill="#edab38"
      stroke="#fff"
      strokeWidth="2.5"
    />
    <path d="M15 20h10M12 35h16" stroke="#ad681a" strokeWidth="2" />
    <circle
      cx="20"
      cy="11"
      r="9"
      fill="#ffd572"
      stroke="#fff"
      strokeWidth="3"
    />
    <path
      d="M16 7a5 5 0 0 1 5-2"
      stroke="#fff5d8"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <rect
      x="7"
      y="36"
      width="26"
      height="7"
      rx="3.5"
      fill="#d48a24"
      stroke="#fff"
      strokeWidth="2.5"
    />
  </svg>
);

export default function StudentProgressBoard({
  completed,
  goal,
  title,
  subtitle,
  nextLabel = "이어서 학습하기",
  nextAriaLabel,
  onNext,
  busy = false,
  reviewableSteps = [],
  onReviewStep,
  ariaLabel = "오늘의 학습 보드",
}: StudentProgressBoardProps) {
  const answered = Math.max(0, Math.floor(completed));
  const target = Math.max(1, Math.floor(goal));
  const totalSteps = Math.max(target, answered);
  const size = Math.max(4, Math.ceil(totalSteps / 4) + 1);
  const cells = useMemo(() => perimeter(size), [size]);
  const startOffset = cells.length > totalSteps ? 1 : 0;
  const pawnIndex = Math.max(0, answered - 1 + startOffset);
  const nextStep = answered + 1;
  const reached = answered >= target;
  const canContinue = !!onNext && !reached;
  const pawnRef = useRef<HTMLSpanElement>(null);
  const previousStep = useRef(Math.max(0, answered - 1));
  const reviewable = new Set(reviewableSteps);

  function pawnPosition(index: number) {
    const cell = cells[Math.min(index, cells.length - 1)];
    return {
      left: `${((cell.column + 0.78) / size) * 100}%`,
      top: `${((cell.row + 0.26) / size) * 100}%`,
    };
  }

  // Follow each intervening square instead of crossing the center diagonally.
  useEffect(() => {
    const from = previousStep.current;
    previousStep.current = answered;
    const token = pawnRef.current;
    if (
      !token ||
      typeof token.animate !== "function" ||
      from >= answered ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const first = Math.max(0, from - 1 + startOffset);
    const frames = cells.slice(first, pawnIndex + 1).map((cell) => ({
      left: `${((cell.column + 0.78) / size) * 100}%`,
      top: `${((cell.row + 0.26) / size) * 100}%`,
    }));
    if (frames.length < 2) return;
    const animation = token.animate(frames, {
      duration: Math.min(1800, (frames.length - 1) * 260),
      easing: "ease-in-out",
    });
    return () => animation.cancel();
  }, [answered, cells, size, startOffset, pawnIndex]);

  return (
    <section className={s.root} aria-label={ariaLabel}>
      <header className={s.topic}>
        <span className={s.topicIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5.5h6.5L12 7l1.5-1.5H20v13h-6.5L12 20l-1.5-1.5H4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M12 7v13M7 9h2M15 9h2M7 12h2M15 12h2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
          <h3 className={s.title}>{title}</h3>
        </div>
      </header>
      <div
        className={s.board}
        style={{ "--board-size": size } as CSSProperties}
      >
        <ol className={s.ring} aria-label="시계 방향으로 이동하는 문제 칸">
          {cells.map((cell, index) => {
            const step = index - startOffset + 1;
            const isProblem = step > 0 && step <= totalSteps;
            const isComplete = isProblem && step <= answered;
            const isNext = isProblem && step === nextStep && canContinue;
            const isReviewable =
              isComplete && reviewable.has(step) && !!onReviewStep;
            const isStart = index === 0 && startOffset === 1;
            const content = isProblem ? (
              <>
                <span className={s.number}>{step}</span>
                <span className={s.caption}>
                  {isComplete
                    ? "완료"
                    : isNext
                      ? "다음"
                      : step === target
                        ? "목표"
                        : "문제"}
                </span>
                {isReviewable ? (
                  <span className={s.reviewDot} aria-hidden="true" />
                ) : null}
              </>
            ) : isStart ? (
              <>
                <span className={s.startArrow} aria-hidden="true">
                  ←
                </span>
                <span className={s.caption}>출발</span>
              </>
            ) : (
              <svg
                className={s.decor}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            );
            return (
              <li
                key={index}
                className={s.cell}
                style={{ gridRow: cell.row + 1, gridColumn: cell.column + 1 }}
                data-step={isProblem ? step : undefined}
                data-side={Math.floor(index / (size - 1))}
                data-state={
                  isComplete
                    ? "complete"
                    : isNext
                      ? "next"
                      : isStart
                        ? "start"
                        : isProblem
                          ? "upcoming"
                          : "decoration"
                }
                aria-hidden={!isProblem && !isStart ? true : undefined}
              >
                {isNext ? (
                  <button
                    type="button"
                    className={s.tile}
                    disabled={busy}
                    onClick={onNext}
                    aria-label={`${step}번 문제에서 이어가기`}
                  >
                    {content}
                  </button>
                ) : isReviewable ? (
                  <button
                    type="button"
                    className={s.tile}
                    disabled={busy}
                    onClick={(event) =>
                      onReviewStep?.(step, event.currentTarget)
                    }
                    aria-label={`${step}번 완료, 풀이 보기`}
                  >
                    {content}
                  </button>
                ) : (
                  <span
                    className={s.tile}
                    aria-label={
                      isProblem
                        ? `${step}번 ${isComplete ? "완료" : "예정"}`
                        : isStart
                          ? "출발 칸"
                          : undefined
                    }
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <div className={s.center}>
          <svg
            className={s.centerMark}
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="5"
              y="5"
              width="30"
              height="30"
              rx="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M14 20h12m-6-6v12"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="31"
              cy="9"
              r="5"
              fill="#efb842"
              stroke="#fff"
              strokeWidth="2"
            />
          </svg>
          <p className={s.centerLabel}>
            {reached ? "오늘의 목표 완료" : "오늘의 한 바퀴"}
          </p>
          <p className={s.count} aria-live="polite">
            <strong>{answered}</strong>
            <span>
              / {target}
              <small>문제</small>
            </span>
          </p>
          <progress
            className={s.progress}
            value={Math.min(answered, target)}
            max={target}
            aria-label="오늘의 문제 진행률"
          />
          {canContinue ? (
            <button
              type="button"
              className={s.next}
              onClick={onNext}
              disabled={busy}
              aria-label={nextAriaLabel ?? nextLabel}
            >
              {busy ? "준비 중…" : nextLabel}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className={s.centerNote}>
              {reached ? "오늘도 한 걸음 자랐어요" : "학습할 준비를 해요"}
            </p>
          )}
        </div>
        <span
          ref={pawnRef}
          className={s.pawn}
          style={pawnPosition(pawnIndex)}
          aria-label={
            answered ? `내 말, ${answered}번까지 완료` : "내 말, 출발 전"
          }
        >
          {pawn}
        </span>
      </div>
      <p className={s.legend}>
        <span className={s.legendPawn} aria-hidden="true" />한 문제를 풀 때마다
        말이 한 칸 이동해요.
      </p>
    </section>
  );
}
