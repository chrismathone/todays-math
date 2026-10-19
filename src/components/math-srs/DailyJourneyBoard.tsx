"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import s from "./daily-journey-board.module.css";
import { useLearningMotion } from "./LearningMotion";
import { tileTitle } from "@/lib/math-srs/elementary/sectionShortTitles";
import { titlePieces } from "./journeyTitle";
import {
  JOURNEY_THEMES,
  type JourneyTheme,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";

export interface DailyJourneyDay {
  id: string;
  date: string;
  completedAt: string;
  title: string;
  subtitle: string;
  reviewCount: number;
}

/** The board centre «나의 진행» (D-142): the n-th unit of the grade (elementary: lesson of the chapter). */
export interface DailyJourneyPosition {
  caption: string;
  ordinal: number;
  title: string;
  /** Today's elementary lesson — shown instead of the memory count. */
  note?: string;
  collected: number;
  total: number;
  due: number;
}

export interface DailyJourney {
  completedDays: number;
  todayComplete: boolean;
  todayAnswered: number;
  todayGoal: number;
  /** Completed learning days, oldest first. */
  days: ReadonlyArray<DailyJourneyDay>;
  /** Planned stages, starting with the next incomplete learning day. */
  upcoming: ReadonlyArray<{
    title: string;
    subtitle: string;
    /** First tile of a new grade — «중3» · «초5». */
    gradeStart?: string;
  }>;
  position?: DailyJourneyPosition;
}

export interface DailyJourneyBoardProps {
  journey: DailyJourney;
  onNext?: () => void;
  nextLabel?: string;
  busy?: boolean;
  variant?: "full" | "map";
  /** A surrounding book page already names this board. Keep its totals and navigation. */
  hideTitle?: boolean;
  /** 진도판 테마(학원 전체 한 벌) — 없으면 지금 판. */
  theme?: JourneyThemeId;
  onReviewDay: (day: DailyJourneyDay, opener: HTMLButtonElement) => void;
}

const PAGE_SIZE = 12;
/** 한 칸 갈 때 말이 뜨는 높이 — 8px 이하(가는 거리와는 별개다). */
const HOP_PX = 8;
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

/**
 * 탈것이 바라보는 쪽 — `step` 칸에서 다음 칸으로 가는 방향. 아래 줄은 왼쪽 · 왼쪽 줄은 위 · 위 줄은 오른쪽 · 오른쪽 줄은 아래
 * (원장님 2026-09-30 «움직임이 4방향» — 탈것이 가는 쪽을 본다). 출발 자리(0)는 첫 칸으로 왼쪽.
 */
export type RiderHeading = "left" | "up" | "right" | "down";
export function riderHeading(step: number): RiderHeading {
  const at = ((step % PAGE_SIZE) + PAGE_SIZE) % PAGE_SIZE;
  return at < 4 ? "left" : at < 7 ? "up" : at < 10 ? "right" : "down";
}

/** 테마 탈것 — 네 방향 그림을 다 두고 `data-heading` 으로 하나만 보인다(오른쪽은 왼쪽 그림을 뒤집는다). */
function Rider({ look }: { look: JourneyTheme }) {
  const images = look.riderImages!;
  return (
    <span className={s.riderFigure} data-pawn-figure="true">
      <span className={s.riderSide} data-view="side">
        {images.wheels ? (
          <>
            <img src={images.body} alt="" draggable={false} />
            {images.wheels.map((wheel, index) => (
              <img
                key={index}
                className={s.wheel}
                src={images.wheel}
                alt=""
                draggable={false}
                data-wheel
                style={{
                  left: `${wheel.x * 100}%`,
                  top: `${wheel.y * 100}%`,
                  width: `${wheel.d * 100}%`,
                }}
              />
            ))}
          </>
        ) : (
          <img src={images.left} alt="" draggable={false} />
        )}
      </span>
      <img
        className={s.riderView}
        data-view="up"
        src={images.up}
        alt=""
        draggable={false}
      />
      <img
        className={s.riderView}
        data-view="down"
        src={images.down}
        alt=""
        draggable={false}
      />
    </span>
  );
}

function position(step: number): CSSProperties {
  if (step === 0) return { left: "91%", top: "103%" };
  const [row, column] = CELLS[step - 1];
  return {
    left: `${(column - 0.22) * 25}%`,
    top: `${(row - 0.89) * 25}%`,
  };
}

/**
 * Unit names break only where their meaning allows (D-142): a word never breaks inside
 * (`nowrap` — WebKit otherwise split «(소수)÷» at the bracket), lines break at spaces and at
 * the `<wbr>` of `titlePieces` («연립|일차방정식»).
 */
function Title({ text }: { text: string }) {
  return titlePieces(text).map((piece, index) => (
    <Fragment key={index}>
      {index ? <wbr /> : null}
      {piece.split(" ").map((word, at) => (
        <Fragment key={at}>
          {at ? " " : null}
          {word ? <span className={s.word}>{word}</span> : null}
        </Fragment>
      ))}
    </Fragment>
  ));
}

/**
 * 줄여 보는 차례 — 들어가면 그대로, 안 들어갈 때만 한 단계씩(보기 단추 `ExplorerChoiceText` 와 같은 방식 · 같은 바닥 0.7배).
 * 실측(이름 360개 · Chromium · WebKit 같음): 폰 390 은 9개가 줄고 가장 작게 8px, 320 은 31개 · 가장 긴 초3 소단원 7개가 7px,
 * PC 는 27개가 12.8~14.4px. 0.7배 밑은 한 번도 쓰이지 않았다.
 */
const FIT_STEPS = [1, 0.9, 0.8, 0.7] as const;

/**
 * 칸 이름 — 초등 소단원은 35자까지 있어(«받아올림이 두 번, 세 번 있는 (세 자리 수)+(세 자리 수)») 칸 줄 수를 넘는다.
 * 칸 안에 다 들어갈 때까지 글자를 한 단계씩 줄인다. 그린 뒤 재고, 폭이 바뀌거나 글꼴이 늦게 오면 다시 잰다.
 */
function TileTitle({ title }: { title: string }) {
  // D-142 ⑺ 칸 줄임말 — 칸에 보이는 글만. 칸의 화면 읽기 · 툴팁 · 가운데는 원래 이름(부르는 쪽이 그대로 둔다).
  const text = tileTitle(title);
  const box = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ scale: number; size: number } | null>(null);
  useLayoutEffect(() => {
    const label = box.current;
    if (!label) return;
    let frame = 0;
    let live = true;
    const fits = () =>
      label.scrollHeight <= label.clientHeight + 1 &&
      label.scrollWidth <= label.clientWidth + 1;
    const run = () => {
      if (!live || !label.isConnected) return;
      const drawn = label.style.fontSize;
      // 줄이는 기준은 이 폭에서 CSS 가 정한 크기(폰 10px · PC 16px) — 부모 글자 크기가 아니다.
      label.style.fontSize = "";
      const base = parseFloat(getComputedStyle(label).fontSize) || 10;
      let next: number = FIT_STEPS[FIT_STEPS.length - 1];
      for (const step of FIT_STEPS) {
        label.style.fontSize = step === 1 ? "" : `${base * step}px`;
        if (fits()) {
          next = step;
          break;
        }
      }
      label.style.fontSize = drawn;
      setFit((current) =>
        next === 1
          ? null
          : current?.scale === next && current.size === base * next
            ? current
            : { scale: next, size: base * next },
      );
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    run();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(later);
    observer?.observe(label.parentElement ?? label);
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    fonts?.addEventListener?.("loadingdone", later);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", later);
    };
  }, [text]);
  return (
    <span
      ref={box}
      className={s.tileTitle}
      style={fit ? { fontSize: `${fit.size}px` } : undefined}
      data-tile-title
      data-short={text !== title ? "true" : undefined}
      data-fit={fit ? String(fit.scale) : undefined}
    >
      <Title text={text} />
    </span>
  );
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
  variant = "full",
  hideTitle = false,
  theme = "classic",
  onReviewDay,
}: DailyJourneyBoardProps) {
  const look = JOURNEY_THEMES[theme] ?? JOURNEY_THEMES.classic;
  const themed = !!look.boardImage && !!look.riderImages;
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

  // 기기(OS) 또는 앱의 «움직임 줄이기» — 하나라도 켜져 있으면 말은 움직임 없이 새 칸에 선다.
  const { reduceMotion } = useLearningMotion();

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
      reduceMotion
    )
      return;
    const options = { duration: 650, easing: "cubic-bezier(.2,.8,.25,1)" };
    // 테마 탈것은 가는 동안 가는 쪽을 보고 바퀴가 돈다 — 도착하면 다음에 갈 쪽을 본다.
    token.dataset.heading = riderHeading(pawnStep - 1);
    token.dataset.moving = "true";
    const arrive = () => {
      token.dataset.heading = riderHeading(pawnStep);
      delete token.dataset.moving;
    };
    const travel = token.animate(
      [position(pawnStep - 1), position(pawnStep)] as Keyframe[],
      options,
    );
    travel.onfinish = arrive;
    travel.oncancel = arrive;
    const animations = [travel];
    // 가는 길(650ms)과 작은 뜀 · 그림자를 층으로 나눈다. 뜀은 세로 8px 이하 — 기울임 · 눌림 · 착지 링은
    // 없다(3자 합의 v2 9항, 2026-10-04). Only a completed daily stage triggers this hop.
    const figure = token.querySelector<HTMLElement>("[data-pawn-figure]");
    const shadow = token.querySelector<HTMLElement>("[data-pawn-shadow]");
    if (figure)
      animations.push(
        figure.animate(
          [
            { transform: "translateY(0)", offset: 0 },
            { transform: `translateY(-${HOP_PX}px)`, offset: 0.45 },
            { transform: "translateY(0)", offset: 1 },
          ],
          options,
        ),
      );
    if (shadow)
      animations.push(
        shadow.animate(
          [
            { transform: "scale(1)", opacity: 0.3 },
            { transform: "scale(.85)", opacity: 0.22, offset: 0.45 },
            { transform: "scale(1)", opacity: 0.3 },
          ],
          options,
        ),
      );
    // 화면을 떠나거나 가는 중에 줄이기가 켜지면 여기서 멈춘다(`oncancel` 이 도착 모양으로 되돌린다).
    return () => animations.forEach((animation) => animation.cancel());
  }, [completed, pawnStep, pawnVisible, reduceMotion]);

  return (
    <section
      className={`${s.root} ${variant === "map" ? s.map : ""}`}
      aria-label="전체 학습 진도"
      data-daily-journey="true"
      data-journey-variant={variant}
      data-journey-theme={look.id}
    >
      <header className={s.header}>
        <div>
          {variant === "full" ? (
            <p className={s.eyebrow}>하루 한 칸, 차곡차곡</p>
          ) : null}
          {!hideTitle ? (
            <h2 className={s.heading}>
              {variant === "map" ? "나의 수학 여정" : "전체 학습 진도"}
            </h2>
          ) : null}
        </div>
        <p className={s.total} aria-live="polite">
          <strong>{completed}</strong>
          <span>일 학습 완료</span>
        </p>
      </header>

      {currentUnit && variant === "full" ? (
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

      <div
        className={s.board}
        data-journey-page={page + 1}
        style={
          themed
            ? ({
                "--journey-board": `url(${look.boardImage})`,
              } as CSSProperties)
            : undefined
        }
      >
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
            // D-142: every planned tile names its unit; «다음 여정» only beyond the plan.
            const topic = done ? day : planned;
            const gradeStart = !done ? planned?.gradeStart : undefined;
            const reviewable = done && !!day && day.reviewCount > 0;
            const clickable = reviewable || (next && canContinue);
            const title =
              topic?.title ??
              (done ? "완료한 학습" : next ? "다음 학습" : "다음 여정");
            const state = done ? "complete" : next ? "current" : "upcoming";
            const label = `${ordinal}일차, ${title}${gradeStart ? `, ${gradeStart}` : ""}, ${done ? "학습 완료" : next ? "오늘의 학습" : "예정"}${reviewable ? ", 다시 풀기" : ""}`;
            const content = (
              <>
                <span className={s.dayNumber}>
                  {ordinal}
                  <small>일차</small>
                  {gradeStart ? (
                    <em className={s.gradeTag} data-grade-start>
                      {gradeStart}
                    </em>
                  ) : null}
                </span>
                <TileTitle title={title} />
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

        {variant === "map" && journey.position ? (
          // D-142 «나의 진행» — plain text, never a control (D-30).
          <div className={s.progressCentre} data-journey-progress>
            <p className={s.progressCaption}>{journey.position.caption}</p>
            <p className={s.progressOrdinal}>
              {journey.position.ordinal}
              <small>번째</small>
            </p>
            <p className={s.progressUnit}>
              <Title text={journey.position.title} />
            </p>
            <p className={s.progressNote}>
              {journey.position.note ? (
                <>
                  {journey.position.note} · 모은 개념{" "}
                  <b>
                    {journey.position.collected} / {journey.position.total}
                  </b>
                </>
              ) : (
                <>
                  모은 개념{" "}
                  <b>
                    {journey.position.collected} / {journey.position.total}
                  </b>{" "}
                  · 기억 복습 <b>{journey.position.due}</b>
                </>
              )}
            </p>
          </div>
        ) : variant === "map" ? (
          <div className={s.mapCenter}>
            <span aria-hidden="true">✦</span>
            <strong>하루 한 칸</strong>
            <p>
              오늘의 학습을 마치면
              <br />
              말이 앞으로 이동해요.
            </p>
          </div>
        ) : (
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
                data-journey-continue
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
        )}
        {pawnVisible ? (
          <span
            ref={pawnRef}
            className={themed ? `${s.pawn} ${s.rider}` : s.pawn}
            style={position(pawnStep)}
            data-pawn-day={completed}
            data-heading={themed ? riderHeading(pawnStep) : undefined}
            data-motion={themed ? look.motion : undefined}
            aria-label={`내 ${look.rider}, ${completed}일 학습 완료`}
          >
            <span className={s.pawnShadow} data-pawn-shadow="true" />
            {themed ? (
              <Rider look={look} />
            ) : (
              <span className={s.pawnFigure} data-pawn-figure="true">
                {pawn}
              </span>
            )}
          </span>
        ) : null}
      </div>

      {/* 출발 자리(`position(0)`)와 쪽마다 첫 칸은 판 오른쪽 아래이고 길은 거기서 왼쪽으로 간다 — 출발 표시는
          오른쪽 1일차 칸 밑, 화살표는 길 방향(원장님 제보 2026-09-28 «말은 5시에 있는데 출발은 왜 7시에»). */}
      <div className={s.boardFooter}>
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
        <span className={s.departure} data-journey-departure>
          {firstStep === 0 ? "← 출발" : `← ${firstStep}일차에서 이어서`}
        </span>
      </div>
      {variant === "full" ? (
        <p className={s.legend}>
          오늘의 학습과 오답 복습을 마치면 한 칸 전진해요.
        </p>
      ) : null}
      {completed > 0 ? (
        <p className={s.reviewNote}>
          완료한 날짜의 칸을 눌러 다시 풀 수 있어요.
        </p>
      ) : null}
      {variant === "full" ? (
        <p className={s.planNote}>
          앞으로 배울 단원은 학습 진도에 맞춰 안내해요.
        </p>
      ) : null}
    </section>
  );
}
