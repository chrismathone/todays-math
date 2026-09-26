"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./daily-journey-board.module.css";

export interface DailyJourneyDay {
  id: string;
  date: string;
  completedAt: string;
  title: string;
  subtitle: string;
  reviewCount: number;
}

export interface DailyJourney {
  completedDays: number;
  todayComplete: boolean;
  todayAnswered: number;
  todayGoal: number;
  /** Completed learning days, oldest first. */
  days: ReadonlyArray<DailyJourneyDay>;
  /** Planned stages, starting with the next incomplete learning day. */
  upcoming: ReadonlyArray<{ title: string; subtitle: string }>;
}

export interface DailyJourneyBoardProps {
  journey: DailyJourney;
  onNext?: () => void;
  nextLabel?: string;
  busy?: boolean;
  onReviewDay: (day: DailyJourneyDay, opener: HTMLButtonElement) => void;
}

const PAGE_SIZE = 12;
// Clockwise from the bottom right. Keep twelve spacious daily stages on each board.
const CELLS = [
  [4, 4],
  [4, 3],
  [4, 2],
  [4, 1],
  [3, 1],
  [2, 1],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [3, 4],
] as const;

function position(step: number): CSSProperties {
  if (step === 0) return { left: "91%", top: "103%" };
  const [row, column] = CELLS[step - 1];
  return {
    left: `${(column - 0.22) * 25}%`,
    top: `${(row - 0.89) * 25}%`,
  };
}

const pawn = (
  <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="43" rx="16" ry="4" fill="#855422" opacity=".22" />
    <path
      d="M10 37c1-7 6-11 6-19h8c0 8 5 12 6 19Z"
      fill="#eca938"
      stroke="#fff"
      strokeWidth="2.5"
    />
    <path d="M15 21h10M12 35h16" stroke="#bb7521" strokeWidth="2" />
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

export default function DailyJourneyBoard({
  journey,
  onNext,
  nextLabel = "이어서 학습하기",
  busy = false,
  onReviewDay,
}: DailyJourneyBoardProps) {
  const completed = Math.max(0, Math.floor(journey.completedDays));
  const currentPage = Math.floor(
    Math.max(0, completed - (journey.todayComplete ? 1 : 0)) / PAGE_SIZE,
  );
  const totalPages = Math.max(
    1,
    Math.ceil((completed + Math.max(1, journey.upcoming.length)) / PAGE_SIZE),
  );
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const page = Math.min(selectedPage ?? currentPage, totalPages - 1);
  const firstStep = page * PAGE_SIZE;
  const pawnStep = completed - firstStep;
  const pawnVisible = pawnStep >= 0 && pawnStep <= PAGE_SIZE;
  const previousCompleted = useRef(completed);
  const pawnRef = useRef<HTMLSpanElement>(null);
  const goal = Math.max(1, journey.todayGoal);
  const answered = Math.max(0, journey.todayAnswered);
  const canContinue = !!onNext && !journey.todayComplete;
  const currentUnit = journey.todayComplete
    ? journey.days[journey.days.length - 1]
    : journey.upcoming[0];

  useEffect(() => {
    const from = previousCompleted.current;
    previousCompleted.current = completed;
    const token = pawnRef.current;
    if (
      !token ||
      !pawnVisible ||
      completed !== from + 1 ||
      pawnStep < 1 ||
      typeof token.animate !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const options = { duration: 650, easing: "cubic-bezier(.2,.8,.25,1)" };
    const animations = [
      token.animate(
        [position(pawnStep - 1), position(pawnStep)] as Keyframe[],
        options,
      ),
    ];
    // Separate the travel, hop, shadow and landing layers, as in the supplied
    // Math Explorers pieces. Only a completed daily stage triggers this hop.
    const figure = token.querySelector<HTMLElement>("[data-pawn-figure]");
    const shadow = token.querySelector<HTMLElement>("[data-pawn-shadow]");
    const landing = token.querySelector<HTMLElement>("[data-pawn-landing]");
    if (figure)
      animations.push(
        figure.animate(
          [
            {
              transform: "translateY(0) rotate(-5deg) scale(1.05,.94)",
              offset: 0,
            },
            {
              transform: "translateY(-18px) rotate(4deg) scale(.97,1.04)",
              offset: 0.45,
            },
            {
              transform: "translateY(1px) rotate(0) scale(1.08,.91)",
              offset: 0.82,
            },
            { transform: "translateY(0) rotate(0) scale(1)", offset: 1 },
          ],
          options,
        ),
      );
    if (shadow)
      animations.push(
        shadow.animate(
          [
            { transform: "scale(1)", opacity: 0.3 },
            { transform: "scale(.6)", opacity: 0.12, offset: 0.45 },
            { transform: "scale(1)", opacity: 0.3 },
          ],
          options,
        ),
      );
    if (landing)
      animations.push(
        landing.animate(
          [
            { transform: "scale(.6)", opacity: 0, offset: 0 },
            { transform: "scale(.7)", opacity: 0, offset: 0.6 },
            { transform: "scale(1)", opacity: 0.8, offset: 0.78 },
            { transform: "scale(1.8)", opacity: 0, offset: 1 },
          ],
          options,
        ),
      );
    return () => animations.forEach((animation) => animation.cancel());
  }, [completed, pawnStep, pawnVisible]);

  return (
    <section
      className={s.root}
      aria-label="전체 학습 진도"
      data-daily-journey="true"
    >
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>하루 한 칸, 차곡차곡</p>
          <h2 className={s.heading}>전체 학습 진도</h2>
        </div>
        <p className={s.total} aria-live="polite">
          <strong>{completed}</strong>
          <span>일 학습 완료</span>
        </p>
      </header>

      {currentUnit ? (
        <div className={s.unit}>
          <span className={s.unitIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5h6l2 2 2-2h6v14h-6l-2 2-2-2H4V5Zm8 2v14M7 9h2m6 0h2M7 12h2m6 0h2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className={s.unitCaption}>
              {journey.todayComplete ? "오늘 마친 단원" : "지금 배우는 단원"}
            </p>
            <p className={s.unitSubtitle}>{currentUnit.subtitle}</p>
            <p className={s.unitTitle}>{currentUnit.title}</p>
          </div>
        </div>
      ) : null}

      <nav className={s.navigation} aria-label="학습 진도판 이동">
        <button
          type="button"
          className={s.pageButton}
          aria-label="이전 진도판"
          disabled={page === 0 || busy}
          onClick={() => setSelectedPage(page - 1)}
        >
          ←
        </button>
        <p className={s.pageRange}>
          {firstStep + 1}–{firstStep + PAGE_SIZE}일차 <span>학습 여정</span>
        </p>
        <button
          type="button"
          className={s.pageButton}
          aria-label="다음 진도판"
          disabled={page + 1 >= totalPages || busy}
          onClick={() => setSelectedPage(page + 1)}
        >
          →
        </button>
      </nav>

      <div className={s.board} data-journey-page={page + 1}>
        <ol
          className={s.ring}
          start={firstStep + 1}
          aria-label={`${firstStep + 1}일부터 ${firstStep + PAGE_SIZE}일차까지의 학습`}
        >
          {CELLS.map(([row, column], index) => {
            const ordinal = firstStep + index + 1;
            const day = journey.days[ordinal - 1];
            const done = ordinal <= completed;
            const next = ordinal === completed + 1 && !journey.todayComplete;
            const planned = journey.upcoming[ordinal - completed - 1];
            const topic = done ? day : planned;
            const reviewable = done && !!day && day.reviewCount > 0;
            const clickable = reviewable || (next && canContinue);
            const title = topic?.title ?? (done ? "완료한 학습" : "다음 학습");
            const state = done ? "complete" : next ? "current" : "upcoming";
            const label = `${ordinal}일차, ${title}, ${done ? "학습 완료" : next ? "오늘의 학습" : "예정"}${reviewable ? ", 다시 풀기" : ""}`;
            const content = (
              <>
                <span className={s.dayNumber}>
                  {ordinal}
                  <small>일차</small>
                </span>
                <span className={s.tileTitle}>{title}</span>
                <span className={s.tileStatus}>
                  {done ? "✓ 완료" : next ? "오늘" : "예정"}
                </span>
              </>
            );
            return (
              <li
                key={ordinal}
                className={s.cell}
                style={{ gridRow: row, gridColumn: column }}
                data-day-step={ordinal}
                data-state={state}
                data-side={Math.floor(index / 3)}
              >
                {clickable ? (
                  <button
                    type="button"
                    className={s.tile}
                    disabled={busy}
                    aria-label={label}
                    aria-current={next ? "step" : undefined}
                    title={
                      topic?.subtitle ? `${topic.subtitle} · ${title}` : title
                    }
                    onClick={(event) => {
                      if (reviewable) onReviewDay(day, event.currentTarget);
                      else onNext?.();
                    }}
                  >
                    {content}
                  </button>
                ) : (
                  <span
                    className={s.tile}
                    aria-label={label}
                    aria-current={next ? "step" : undefined}
                    title={
                      topic?.subtitle ? `${topic.subtitle} · ${title}` : title
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
          <span className={s.centerMark} aria-hidden="true">
            {journey.todayComplete ? "✓" : "✦"}
          </span>
          <p className={s.centerLabel}>
            {journey.todayComplete ? "오늘의 한 칸 완료!" : "오늘의 학습"}
          </p>
          <p className={s.count}>
            <strong>{answered}</strong>
            <span>
              / {goal}
              <small>문제</small>
            </span>
          </p>
          <progress
            className={s.progress}
            value={Math.min(answered, goal)}
            max={goal}
            aria-label="오늘의 학습 문제 진행률"
          />
          {canContinue ? (
            <button
              type="button"
              className={s.next}
              disabled={busy}
              onClick={onNext}
            >
              {busy ? "준비 중…" : nextLabel}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className={s.centerNote}>
              {journey.todayComplete
                ? "한 칸 전진했어요"
                : "학습할 준비를 해요"}
            </p>
          )}
          {!journey.todayComplete && answered >= goal ? (
            <p className={s.retryNote}>오답 복습을 마치면 전진해요</p>
          ) : null}
        </div>

        {pawnVisible ? (
          <span
            ref={pawnRef}
            className={s.pawn}
            style={position(pawnStep)}
            data-pawn-day={completed}
            aria-label={`내 말, ${completed}일 학습 완료`}
          >
            <span className={s.pawnShadow} data-pawn-shadow="true" />
            <span className={s.pawnLanding} data-pawn-landing="true" />
            <span className={s.pawnFigure} data-pawn-figure="true">
              {pawn}
            </span>
          </span>
        ) : null}
      </div>

      <div className={s.boardFooter}>
        <span className={s.departure}>
          {firstStep === 0 ? "출발 →" : `${firstStep}일차에서 이어서 →`}
        </span>
        {page !== currentPage ? (
          <button
            type="button"
            className={s.currentPosition}
            disabled={busy}
            onClick={() => setSelectedPage(null)}
          >
            현재 위치로
          </button>
        ) : (
          <span className={s.direction}>시계 방향으로 한 칸씩</span>
        )}
      </div>
      <p className={s.legend}>
        오늘의 학습과 오답 복습을 마치면 한 칸 전진해요.
      </p>
      {completed > 0 ? (
        <p className={s.reviewNote}>
          완료한 날짜의 칸을 눌러 다시 풀 수 있어요.
        </p>
      ) : null}
      <p className={s.planNote}>
        앞으로 배울 단원은 학습 진도에 맞춰 안내해요.
      </p>
    </section>
  );
}
