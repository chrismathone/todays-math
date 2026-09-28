"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ExplorerAction,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import DailyJourneyBoard, {
  type DailyJourney,
  type DailyJourneyDay,
} from "@/components/math-srs/DailyJourneyBoard";
import { kstDateOf } from "@/lib/kstDate";
import {
  conceptTarget,
  planSlots,
  unitForecast,
  unitPosition,
  type ForecastUnit,
} from "@/lib/math-explorers/journeyForecast";
import {
  baseStageName,
  baseUpgradeCost,
} from "@/lib/math-explorers/starEconomy";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerChests, TileStars } from "./ExplorerPieces";
import { SupplementLine, SupplementShelf } from "./ExplorerSupplementPieces";
import r from "./chest-reward.module.css";
import s from "./math-explorers.module.css";

export type ExplorerCard = ExplorerState["units"][number]["cards"][number];
export const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;

// A chest press changes one chest row and the star count. The journey board
// behind the sheet and the other rows keep their props, so they skip the render
// (before, one press re-rendered the whole home twice — reward-latency §2).
const JourneyBoard = memo(DailyJourneyBoard);
type Chest = ExplorerState["chests"][number];
const sameChests = (a: readonly Chest[], b: readonly Chest[]) =>
  a.length === b.length &&
  a.every(
    (chest, index) =>
      chest.id === b[index]!.id &&
      chest.ready === b[index]!.ready &&
      chest.claimed === b[index]!.claimed &&
      chest.solved === b[index]!.solved &&
      chest.after === b[index]!.after,
  );
/** A saved-press failure, one per chest, shown under its row (05 §8.21). */
export type ChestNotice = {
  chestId: string;
  text: string;
  tone: "alert" | "status";
};
type ChestRowProps = {
  title: string;
  chests: Chest[];
  busy: boolean;
  notices: ChestNotice[];
  onClaim: (chestId: string) => void;
};
const ChestRow = memo(
  function ChestRow({ title, chests, busy, notices, onClaim }: ChestRowProps) {
    // Two chests of a row can fail alike — the same sentence is said once.
    const lines = notices.filter(
      (notice, index) =>
        notices.findIndex((other) => other.text === notice.text) === index,
    );
    return (
      <section className={s.chestGroup}>
        <h4>{title}</h4>
        <ExplorerChests chests={chests} busy={busy} onClaim={onClaim} />
        {lines.map((notice) => (
          <p key={notice.chestId} className={r.notice} role={notice.tone}>
            {notice.text}
          </p>
        ))}
      </section>
    );
  },
  (a, b) =>
    a.title === b.title &&
    a.busy === b.busy &&
    a.onClaim === b.onClaim &&
    a.notices.length === b.notices.length &&
    a.notices.every((notice, index) => notice === b.notices[index]) &&
    sameChests(a.chests, b.chests),
);

const NO_CLAIMS: readonly string[] = [];
const NO_NOTICES: Readonly<Record<string, ChestNotice>> = {};

/** The same function for the whole mount, always calling the latest handler. */
function useStableHandler<Args extends unknown[]>(
  handler: (...args: Args) => void,
) {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}

export function explorerJourney(state: ExplorerState): DailyJourney {
  if (state.journey) return state.journey;
  const today = state.today ?? kstDateOf(new Date());
  const completed = [...state.completedDays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const todayComplete = completed.some((day) => day.date === today);
  // Without the server's journey, the same D-142 hand-over and forecast rules
  // run on the unit list this screen already has.
  const units: ForecastUnit[] = state.units.map((unit) => ({
    id: unit.id,
    grade: unit.grade,
    title: unit.title,
    cards: unit.cards.length,
    collected: unit.cards.filter((card) => (card.progress?.level ?? 0) > 0)
      .length,
  }));
  const start =
    state.session?.unitId ??
    state.profile.goalUnitId ??
    state.units.find(
      (candidate) => candidate.grade === state.profile.courseGrade,
    )!.id;
  const target = state.session ? start : conceptTarget(units, start);
  const unit = state.units.find((candidate) => candidate.id === target);
  const slots = planSlots(completed.length) - (todayComplete ? 0 : 1);
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
    upcoming: [
      ...(unit && !todayComplete
        ? [{ title: unit.title, subtitle: gradeLabel(unit.grade) }]
        : []),
      ...unitForecast(units, target, !todayComplete, slots),
    ],
    position: unitPosition(units, target, state.dueCardIds.length) ?? undefined,
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
  claims = NO_CLAIMS,
  chestNotices = NO_NOTICES,
  chestEffect,
  onCloseBase,
  onSheetChange,
  baseFailure = null,
  onAction,
  onStart,
  onResume,
  onRetry,
  onInspect,
  onReviewDay,
  initialView,
  onCloseView,
  onStartSupplement,
  onInspectSupplement,
}: {
  state: ExplorerState;
  busy: boolean;
  /** Chests pressed and shown as opened while their saves are on the way. */
  claims?: readonly string[];
  chestNotices?: Readonly<Record<string, ChestNotice>>;
  /** The reward effect, drawn inside the base sheet so the modal cannot hide it. */
  chestEffect?: ReactNode;
  onCloseBase?: () => void;
  /** Whether a home sheet (modal) is open — page-level effects wait for it. */
  onSheetChange?: (open: boolean) => void;
  /**
   * A failed «기지 키우기», said inside the base sheet (the page status sits under
   * the modal). With `retry`, pressing the button again sends the same request.
   */
  baseFailure?: { text: string; retry?: () => void } | null;
  onAction: (action: ExplorerAction) => void;
  onStart: () => void;
  onResume: () => void;
  onRetry: () => void;
  onInspect: (card: ExplorerCard) => void;
  onReviewDay: (day: DailyJourneyDay, opener: HTMLButtonElement) => void;
  initialView?: "collection";
  onCloseView?: () => void;
  /** 보충 카드(D-147) — 단원 끝 줄에서 그 장 시작 · 이어서. */
  onStartSupplement?: (cardId: string) => void;
  /** 보충 카드(D-147) — 도감 선반에서 카드 창 열기. */
  onInspectSupplement?: (cardId: string) => void;
}) {
  const [sheet, setSheet] = useState<"collection" | "settings" | "base" | null>(
    initialView ?? null,
  );
  const journey = useMemo(() => explorerJourney(state), [state]);
  const reviewDay = useStableHandler(onReviewDay);
  const sheetChange = useStableHandler((open: boolean) =>
    onSheetChange?.(open),
  );
  useEffect(() => sheetChange(sheet !== null), [sheet, sheetChange]);
  useEffect(() => () => sheetChange(false), [sheetChange]);
  const claimChest = useStableHandler((chestId: string) =>
    onAction({ type: "chest", chestId }),
  );
  // A pressed chest is shown opened, with its star, before the save returns.
  const shown = useMemo(() => {
    const opening = new Set(
      state.chests
        .filter((chest) => claims.includes(chest.id) && !chest.claimed)
        .map((chest) => chest.id),
    );
    return {
      chests: state.chests.map((chest) =>
        opening.has(chest.id) ? { ...chest, claimed: true } : chest,
      ),
      stars: state.profile.stars + opening.size,
    };
  }, [state, claims]);
  const saving = claims.length > 0;
  // A failure line stays only while the record still shows its chest unopened — a
  // newer record (another save, a reload) that shows it received takes it away.
  // The 409 line stays: it says why the chest is shown received.
  const received = useMemo(
    () => new Set(state.chests.filter((c) => c.claimed).map((c) => c.id)),
    [state.chests],
  );
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
  const upgradeCost = baseUpgradeCost(state.profile.level);
  const closeSheet = () => {
    if (sheet === "base") onCloseBase?.();
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
              saving ||
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
            <span aria-hidden="true">✓</span> 한 칸 전진했어요.
            {state.expedition?.todayStars ? (
              <TileStars {...state.expedition.todayStars} />
            ) : null}{" "}
            다음 탐험은 내일 열려요.
          </p>
        )}
        {complete && !active && !activeReview && !pendingRetry ? (
          <SupplementLine
            state={state}
            busy={busy}
            onStart={(cardId) => onStartSupplement?.(cardId)}
          />
        ) : null}
      </section>

      <section className={s.journeyPanel}>
        <JourneyBoard
          journey={journey}
          variant="map"
          // Behind the open base sheet the board cannot be pressed, so a chest
          // save does not re-render it; once the sheet closes it waits too.
          busy={busy || (saving && sheet !== "base")}
          onReviewDay={reviewDay}
        />
      </section>

      <div className={s.resourceLinks} aria-label="탐험 도구">
        <button type="button" onClick={() => setSheet("collection")}>
          <span aria-hidden="true">▤</span>도감
        </button>
        <button type="button" onClick={() => setSheet("settings")}>
          <span aria-hidden="true">⚙</span>학습 설정
        </button>
        <button
          type="button"
          onClick={() => setSheet("base")}
          aria-label={
            shown.stars ? `우리 기지, 모은 별 ${shown.stars}` : undefined
          }
        >
          <span aria-hidden="true">⌂</span>우리 기지
          {shown.stars ? (
            <em className={s.starBadge} aria-hidden="true">
              ✦ {shown.stars}
            </em>
          ) : null}
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
          <SupplementShelf state={state} onInspect={onInspectSupplement} />
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
                disabled={settingsLocked || saving}
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
                disabled={settingsLocked || saving}
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
            <h3>{baseStageName(state.profile.level)}</h3>
            <p>
              모은 별 <strong>✦ {shown.stars}</strong>
            </p>
            <button
              type="button"
              className={s.primary}
              disabled={
                baseFailure?.retry
                  ? saving
                  : busy || saving || shown.stars < upgradeCost
              }
              onClick={
                baseFailure?.retry ?? (() => onAction({ type: "upgrade" }))
              }
            >
              기지 키우기 · ✦ {upgradeCost}
            </button>
            {baseFailure ? (
              <p className={r.notice} role="alert">
                {baseFailure.text}
              </p>
            ) : null}
            {shown.stars < upgradeCost ? (
              <p className={s.baseShort}>
                별 {upgradeCost - shown.stars}개를 더 모으면{" "}
                {state.profile.level + 1}단계예요.
              </p>
            ) : null}
          </section>
          <h3 className={s.subheading}>탐험 보상</h3>
          {state.units
            .filter(
              (unit) =>
                unit.cards.some((card) => (card.progress?.level ?? 0) > 0) ||
                unit.id === currentUnit?.id,
            )
            .map((unit) => {
              const chests = shown.chests.filter(
                (chest) => chest.unit === unit.id,
              );
              return (
                <ChestRow
                  key={unit.id}
                  title={unit.title}
                  chests={chests}
                  busy={busy}
                  notices={chests.flatMap((chest) =>
                    chestNotices[chest.id]?.tone === "alert" &&
                    received.has(chest.id)
                      ? []
                      : (chestNotices[chest.id] ?? []),
                  )}
                  onClaim={claimChest}
                />
              );
            })}
          {chestEffect}
        </ExplorerSheet>
      ) : null}
    </div>
  );
}
