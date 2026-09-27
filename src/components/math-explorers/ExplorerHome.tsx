"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type {
  ExplorerAction,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import DailyJourneyBoard, {
  type DailyJourney,
  type DailyJourneyDay,
} from "@/components/math-srs/DailyJourneyBoard";
import { kstDateOf } from "@/lib/kstDate";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerChests } from "./ExplorerPieces";
import s from "./math-explorers.module.css";

export type ExplorerCard = ExplorerState["units"][number]["cards"][number];
export const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;

export function explorerJourney(state: ExplorerState): DailyJourney {
  if (state.journey) return state.journey;
  const today = state.today ?? kstDateOf(new Date());
  const completed = [...state.completedDays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const todayComplete = completed.some((day) => day.date === today);
  const unit =
    state.units.find(
      (candidate) =>
        candidate.id === (state.session?.unitId ?? state.profile.goalUnitId),
    ) ??
    state.units.find(
      (candidate) => candidate.grade === state.profile.courseGrade,
    )!;
  return {
    completedDays: completed.length,
    todayComplete,
    todayAnswered: todayComplete
      ? 15
      : !state.session || state.session.reviewOnly
        ? 0
        : state.session.round > 0 || state.session.done
          ? 15
          : state.session.index,
    todayGoal: 15,
    days: completed.map((day) => {
      const completedUnit = state.units.find(
        (candidate) => candidate.id === day.unitId,
      );
      return {
        id: `explorers:${day.date}`,
        date: day.date,
        completedAt: day.date,
        title: completedUnit?.title ?? "개념 탐험",
        subtitle: completedUnit ? gradeLabel(completedUnit.grade) : "지난 학습",
        reviewCount: 15,
      };
    }),
    upcoming: unit
      ? [{ title: unit.title, subtitle: gradeLabel(unit.grade) }]
      : [],
  };
}

export function ExplorerSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => {
      node?.close();
      document.body.style.overflow = previous;
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${s.dialog} ${s.resourceSheet}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={s.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label={`${title} 닫기`} onClick={onClose}>
          ×
        </button>
      </header>
      <div className={s.dialogBody}>{children}</div>
    </dialog>
  );
}

export default function ExplorerHome({
  state,
  busy,
  onAction,
  onStart,
  onResume,
  onRetry,
  onInspect,
  onReviewDay,
  initialView,
  onCloseView,
}: {
  state: ExplorerState;
  busy: boolean;
  onAction: (action: ExplorerAction) => void;
  onStart: () => void;
  onResume: () => void;
  onRetry: () => void;
  onInspect: (card: ExplorerCard) => void;
  onReviewDay: (day: DailyJourneyDay, opener: HTMLButtonElement) => void;
  initialView?: "collection";
  onCloseView?: () => void;
}) {
  const [sheet, setSheet] = useState<"collection" | "settings" | "base" | null>(
    initialView ?? null,
  );
  const journey = explorerJourney(state);
  const mission = state.expedition?.mission;
  const next = state.expedition?.next;
  const activeReview = !!state.session?.reviewOnly && !state.session.done;
  const active = !!mission && mission.status !== "complete";
  const pendingRetry =
    !!state.session?.done &&
    state.session.unresolved.length > 0 &&
    !state.session.reviewOnly;
  const complete = state.expedition?.completedToday ?? journey.todayComplete;
  const plan = active || complete ? mission : next;
  const retryRemaining = active
    ? mission.retryRemaining
    : pendingRetry
      ? state.session!.unresolved.length
      : 0;
  const units = state.units.filter(
    (unit) => unit.grade === state.profile.courseGrade,
  );
  const allCards = state.units.flatMap((unit) => unit.cards);
  const cards = units.flatMap((unit) => unit.cards);
  const currentUnit =
    state.units.find(
      (unit) => unit.id === (state.session?.unitId ?? state.profile.goalUnitId),
    ) ?? units[0];
  const title = activeReview
    ? state.session!.title
    : (plan?.title ?? currentUnit?.title ?? "오늘의 수학 탐험");
  const subtitle = activeReview
    ? "지난 학습 복습"
    : (plan?.subtitle ?? gradeLabel(state.profile.courseGrade));
  const answered = activeReview
    ? state.session!.index
    : active || complete
      ? (mission?.answered ?? journey.todayAnswered)
      : journey.todayAnswered;
  const goal = activeReview
    ? state.session!.total
    : (plan?.goal ?? journey.todayGoal);
  const settingsLocked =
    busy ||
    active ||
    pendingRetry ||
    activeReview ||
    (!!state.session && !state.session.done);
  const closeSheet = () => {
    setSheet(null);
    if (initialView) onCloseView?.();
  };

  return (
    <div className={s.expeditionHome}>
      <section
        className={s.todayMission}
        aria-labelledby="today-mission-title"
        data-expedition-mission="true"
      >
        <div className={s.missionMeta}>
          <span>
            {activeReview
              ? "다시 걷는 여정"
              : complete && !active
                ? "오늘의 한 칸 완료"
                : "오늘의 한 칸"}
          </span>
          <span>
            {answered} / {goal}{" "}
            {plan?.kind === "explorers" || activeReview || !plan
              ? "활동"
              : "문제"}
          </span>
        </div>
        <p className={s.missionSubtitle}>{subtitle}</p>
        <h1 id="today-mission-title">
          <ExplorerMath text={title} />
        </h1>
        <div
          className={s.missionProgress}
          role="progressbar"
          aria-label="오늘의 학습"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(answered, goal)}
        >
          <span
            style={{
              width: `${Math.min(100, (answered / Math.max(goal, 1)) * 100)}%`,
            }}
          />
        </div>
        {retryRemaining > 0 ? (
          <p className={s.missionRetry}>
            다시 풀 문제 {retryRemaining}개를 마치면 한 칸 전진해요.
          </p>
        ) : null}
        {activeReview || active || pendingRetry || !complete ? (
          <button
            type="button"
            className={s.primary}
            disabled={
              busy ||
              (!activeReview &&
                !active &&
                !pendingRetry &&
                state.expedition?.canStart === false)
            }
            data-expedition-start="true"
            data-expedition-retry={pendingRetry ? "true" : undefined}
            onClick={activeReview ? onResume : pendingRetry ? onRetry : onStart}
          >
            {busy
              ? "준비하고 있어요…"
              : activeReview
                ? "지난 학습 이어하기"
                : pendingRetry
                  ? "남은 문제 다시 풀기"
                  : active
                    ? "이어서 탐험하기"
                    : "오늘의 탐험 시작"}
            <span aria-hidden="true"> →</span>
          </button>
        ) : (
          <p className={s.missionComplete}>
            <span aria-hidden="true">✓</span> 한 칸 전진했어요. 다음 탐험은 내일
            열려요.
          </p>
        )}
      </section>

      <section className={s.journeyPanel}>
        <DailyJourneyBoard
          journey={journey}
          variant="map"
          busy={busy}
          onReviewDay={onReviewDay}
        />
      </section>

      <div className={s.resourceLinks} aria-label="탐험 도구">
        <button type="button" onClick={() => setSheet("collection")}>
          <span aria-hidden="true">▤</span>도감
        </button>
        <button type="button" onClick={() => setSheet("settings")}>
          <span aria-hidden="true">⚙</span>학습 설정
        </button>
        <button type="button" onClick={() => setSheet("base")}>
          <span aria-hidden="true">⌂</span>우리 기지
        </button>
      </div>

      {pendingRetry ? (
        <section className={s.pendingReview}>
          <strong>다시 살펴볼 개념</strong>
          <p>해설이 필요하면 카드를 눌러 열어 보세요.</p>
          <div>
            {[
              ...new Set(state.session!.unresolved.map((item) => item.cardId)),
            ].map((id) => {
              const card = allCards.find((item) => item.id === id);
              return card ? (
                <button type="button" key={id} onClick={() => onInspect(card)}>
                  <ExplorerMath text={card.name} />
                  <span>해설 보기</span>
                </button>
              ) : null;
            })}
          </div>
        </section>
      ) : null}

      {sheet === "collection" ? (
        <ExplorerSheet title="나의 개념 도감" onClose={closeSheet}>
          <div className={s.sectionHeading}>
            <p>{gradeLabel(state.profile.courseGrade)}</p>
            <span>
              {cards.filter((card) => (card.progress?.level ?? 0) > 0).length} /{" "}
              {cards.length}개념
            </span>
          </div>
          <p className={s.quietNote}>
            모은 카드와 연결된 앞개념을 살펴보세요. 기억 복습은 오늘의 탐험에
            이어져요.
          </p>
          <div className={s.collection}>
            {cards.map((card) => (
              <button
                type="button"
                key={card.id}
                onClick={() => onInspect(card)}
                data-level={card.progress?.level ?? 0}
              >
                <span>
                  {units.find((unit) => unit.id === card.unitId)?.title}
                </span>
                <strong>
                  <ExplorerMath text={card.name} />
                </strong>
                <div
                  className={s.levelDots}
                  aria-label={`기억 ${card.progress?.level ?? 0}단계`}
                >
                  {[1, 2, 3].map((level) => (
                    <i
                      key={level}
                      data-earned={
                        (card.progress?.level ?? 0) >= level
                          ? "true"
                          : undefined
                      }
                    />
                  ))}
                </div>
                <small>
                  {state.dueCardIds.includes(card.id)
                    ? "다시 기억할 때"
                    : card.progress?.level
                      ? `${card.progress.due.slice(5).replace("-", "/")} 복습`
                      : "아직 수집 전"}
                </small>
              </button>
            ))}
          </div>
          <p className={s.scheduleNote}>
            도움 없이 기억하면 복습 간격이 1 → 3 → 7 → 14 → 30일로 늘어나요.
          </p>
        </ExplorerSheet>
      ) : null}

      {sheet === "settings" ? (
        <ExplorerSheet title="학습 설정" onClose={closeSheet}>
          <p className={s.quietNote}>
            {settingsLocked
              ? "진행 중인 오늘의 탐험을 마치면 설정을 바꿀 수 있어요."
              : "지금 배우는 학년과 목표 단원을 정해 주세요."}
          </p>
          <h3 className={s.subheading}>학년</h3>
          <div className={s.grades} aria-label="학년 선택">
            {[3, 4, 5, 6, 7, 8, 9].map((grade) => (
              <button
                type="button"
                key={grade}
                aria-pressed={state.profile.courseGrade === grade}
                disabled={settingsLocked}
                onClick={() => onAction({ type: "course", grade })}
              >
                {grade < 7 ? `초${grade}` : `중${grade - 6}`}
              </button>
            ))}
          </div>
          <h3 className={s.subheading}>목표 단원</h3>
          <div className={s.settingUnits}>
            {units.map((unit) => (
              <button
                type="button"
                key={unit.id}
                aria-pressed={state.profile.goalUnitId === unit.id}
                disabled={settingsLocked}
                onClick={() => onAction({ type: "goal", unitId: unit.id })}
              >
                <span>{unit.title}</span>
                <small>{unit.subtitle}</small>
              </button>
            ))}
          </div>
        </ExplorerSheet>
      ) : null}

      {sheet === "base" ? (
        <ExplorerSheet title="우리 기지" onClose={closeSheet}>
          <section className={s.baseInside}>
            <span className={s.baseEmblem} aria-hidden="true">
              ⌂
            </span>
            <p>{state.profile.level}단계</p>
            <h3>
              {
                [
                  "작은 배움터",
                  "수학 탐험소",
                  "기억 연구소",
                  "빛나는 수학 기지",
                ][Math.min(state.profile.level, 3)]
              }
            </h3>
            <p>
              모은 별 <strong>✦ {state.profile.stars}</strong>
            </p>
            <button
              type="button"
              className={s.primary}
              disabled={
                busy ||
                state.profile.level >= 3 ||
                state.profile.stars <
                  ([3, 6, 12][state.profile.level] ?? Infinity)
              }
              onClick={() => onAction({ type: "upgrade" })}
            >
              {state.profile.level >= 3
                ? "성장 완료"
                : `기지 키우기 · ✦ ${[3, 6, 12][state.profile.level]}`}
            </button>
          </section>
          <h3 className={s.subheading}>탐험 보상</h3>
          {state.units
            .filter(
              (unit) =>
                unit.cards.some((card) => (card.progress?.level ?? 0) > 0) ||
                unit.id === currentUnit?.id,
            )
            .map((unit) => (
              <section className={s.chestGroup} key={unit.id}>
                <h4>{unit.title}</h4>
                <ExplorerChests
                  chests={state.chests.filter(
                    (chest) => chest.unit === unit.id,
                  )}
                  busy={busy}
                  onClaim={(chestId) => onAction({ type: "chest", chestId })}
                />
              </section>
            ))}
        </ExplorerSheet>
      ) : null}
    </div>
  );
}
