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
import { useLearningMotion } from "@/components/math-srs/LearningMotion";
import {
  useHasLearningSounds,
  useLearningSounds,
} from "@/components/math-srs/LearningSounds";
import type { LearningSoundStatus } from "@/lib/math-srs/learningSoundEngine";
import { studentDateLabel } from "@/components/fading/labels";
import { kstDateOf } from "@/lib/kstDate";
import type { JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
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
import { ExplorerStudyBook } from "./ExplorerStudyBook";
import { ExplorerMath } from "./ExplorerMath";
import { ExplorerChests, TileStars } from "./ExplorerPieces";
import { BaseArt, StarMark } from "./JourneyArt";
import { SupplementLine, SupplementShelf } from "./ExplorerSupplementPieces";
import r from "./chest-reward.module.css";
import s from "./math-explorers.module.css";
import a from "./explorer-home-atelier.module.css";

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
      className={`${s.dialog} ${s.resourceSheet} ${a.sheet}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={`${s.dialogHeader} ${a.sheetHeader}`}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label={`${title} 닫기`} onClick={onClose}>
          ×
        </button>
      </header>
      <div className={s.dialogBody}>{children}</div>
    </dialog>
  );
}

/**
 * 이 기기의 «움직임 줄이기»(3자 합의 v2 9항, 2026-10-04) — 학습 기록이 아니라 기기 설정이다.
 * 학년 · 단원 잠금, 상자 저장, 다른 요청과 무관하게 눌리고 서버에 아무것도 보내지 않는다.
 * 기기(OS)가 이미 줄이고 있으면 앱에서 끌 수 없다 — 켜진 채 잠기고 까닭을 말한다(보이는 값 = 실제 상태).
 * 같은 덩이의 «효과음»은 `SoundSetting` 이 그린다.
 */
function DeviceSettings() {
  const {
    reduceMotion,
    appReducedMotion,
    osReducedMotion,
    setAppReducedMotion,
  } = useLearningMotion();
  const hasSounds = useHasLearningSounds();
  const headingId = useId();
  const noteId = useId();
  return (
    <section className={a.device} aria-labelledby={headingId}>
      <h3 id={headingId}>이 기기 설정</h3>
      <button
        type="button"
        role="switch"
        className={a.motionSwitch}
        aria-checked={reduceMotion}
        aria-describedby={noteId}
        disabled={osReducedMotion}
        onClick={() => setAppReducedMotion(!appReducedMotion)}
      >
        <span>움직임 줄이기</span>
        <span className={a.switchState} aria-hidden="true">
          {reduceMotion ? "켜짐" : "꺼짐"}
          <span className={a.switchTrack} />
        </span>
      </button>
      <p id={noteId} className={a.deviceNote}>
        {osReducedMotion
          ? "기기 설정에 따라 움직임을 줄이고 있어요."
          : "말이 움직이는 모습과 효과를 줄여요. 이 기기에만 저장돼요."}
      </p>
      {hasSounds ? <SoundSetting /> : null}
    </section>
  );
}

/** 효과음이 지금 어떤지는 이 줄만 말한다 — 풀이 화면에서는 실패도 조용하다. */
const SOUND_NOTE: Record<LearningSoundStatus, string> = {
  off: "켜면 답을 확인할 때 짧은 소리가 나요. 이 기기에만 저장돼요.",
  idle: "미리 듣기를 누르면 소리를 준비해요. 이 기기에만 저장돼요.",
  loading: "소리를 준비하는 중이에요. 이 기기에만 저장돼요.",
  ready: "소리가 준비됐어요. 이 기기에만 저장돼요.",
  unavailable: "지금은 소리를 낼 수 없어요. 풀이는 그대로 할 수 있어요.",
};

/**
 * 이 기기의 «효과음»(3자 합의 사운드 v3 2항, 2026-10-04) — 움직임 줄이기와 같은 문법이고 서로 독립이다.
 * 기본은 꺼짐. 켜기는 소리를 준비만 하고, «미리 듣기»는 켜진 때만 눌리며 준비된 뒤 누를 때 한 번 난다
 * (준비 중에 누른 것은 버린다 — 나중에 저절로 나지 않는다).
 * 효과음 공급자 밖(교사 · 개발 화면)에서는 그리지 않는다 — 눌러도 소리가 없는 스위치가 되기 때문이다.
 */
function SoundSetting() {
  const { enabled, status, setEnabled, preview } = useLearningSounds();
  const noteId = useId();
  return (
    // `data-learning-sound-status` 는 브라우저 검증이 준비됨을 기다리는 표지다.
    <div className={a.sound} data-learning-sound-status={status}>
      <div className={a.soundControls}>
        <button
          type="button"
          role="switch"
          className={a.motionSwitch}
          aria-checked={enabled}
          aria-describedby={noteId}
          onClick={() => setEnabled(!enabled)}
        >
          <span>효과음</span>
          <span className={a.switchState} aria-hidden="true">
            {enabled ? "켜짐" : "꺼짐"}
            <span className={a.switchTrack} />
          </span>
        </button>
        <button
          type="button"
          className={a.soundPreview}
          aria-describedby={noteId}
          disabled={!enabled}
          onClick={preview}
        >
          미리 듣기
        </button>
      </div>
      <p id={noteId} className={a.deviceNote} aria-live="polite">
        {SOUND_NOTE[status]}
      </p>
    </div>
  );
}

export default function ExplorerHome({
  state,
  journeyTheme,
  conceptMemory,
  studyBook = false,
  separateExpedition = false,
  dailyUnit,
  readOnly = false,
  dailyStartAllowed,
  dailyStartNote,
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
  /** 진도판 테마 — 학원 전체 한 벌, 관리자가 고른다(없으면 지금 판). */
  journeyTheme?: JourneyThemeId;
  /** Inline concept memory; its schedule and results belong to its own source. */
  conceptMemory?: ReactNode;
  studyBook?: boolean;
  separateExpedition?: boolean;
  dailyUnit?: string;
  /** Read-only previews keep their action names instead of pretending to load. */
  readOnly?: boolean;
  dailyStartAllowed?: boolean;
  dailyStartNote?: string;
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
  const prerequisiteContext = state.expedition?.prerequisiteContext;
  const unavailable =
    prerequisiteContext?.kind === "unavailable" &&
    !prerequisiteContext.canStart;
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
    : (plan?.title ?? currentUnit?.title ?? "오늘 수학 탐험");
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
  const upgradeCost = baseUpgradeCost(state.profile.level);
  const closeSheet = () => {
    if (sheet === "base") onCloseBase?.();
    setSheet(null);
    if (initialView) onCloseView?.();
  };

  return (
    // 순서는 미션 → 지도 → 도구 → 다시 살펴볼 개념 — 넓은 PC 의 두 열은 CSS 만 바꾼다(explorer-home-atelier).
    <div
      className={`${s.expeditionHome} ${a.home} ${studyBook ? a.bookHome : conceptMemory ? a.withMemory : ""}`}
      data-explorer-home="true"
    >
      {studyBook ? (
        <ExplorerStudyBook
          grade={gradeLabel(state.profile.courseGrade)}
          unit={dailyUnit ?? currentUnit?.title ?? title}
          theme={journeyTheme}
          study={conceptMemory}
          journey={
            <JourneyBoard
              hideTitle
              journey={journey}
              variant="map"
              theme={journeyTheme}
              busy={busy || (saving && sheet !== "base")}
              onReviewDay={reviewDay}
            />
          }
        />
      ) : (
        <>
          <section
            className={`${s.todayMission} ${a.mission}`}
            aria-labelledby="today-mission-title"
            data-expedition-mission="true"
            data-explorer-home-part="mission"
          >
            <div className={s.missionMeta}>
              <span>
                {activeReview
                  ? "다시 걷는 여정"
                  : complete && !active
                    ? "오늘의 한 칸 완료"
                    : dailyStartAllowed === undefined
                      ? "오늘의 한 칸"
                      : "탐험의 한 칸"}
              </span>
              <span>
                {answered} / {goal}{" "}
                {plan?.kind === "explorers" || activeReview || !plan
                  ? "활동"
                  : "문제"}
              </span>
            </div>
            <p className={`${s.missionSubtitle} ${a.muted}`}>{subtitle}</p>
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
              <p className={`${s.missionRetry} ${a.retry}`}>
                다시 풀 문제 {retryRemaining}개를 마치면 한 칸 전진해요.
              </p>
            ) : null}
            {prerequisiteContext?.reason ? (
              <p
                className={`${s.missionRetry} ${a.retry}`}
                role={unavailable ? "status" : undefined}
              >
                {prerequisiteContext.reason}
              </p>
            ) : null}
            {dailyStartAllowed === false && dailyStartNote ? (
              <p className={`${s.missionRetry} ${a.retry}`} role="status">
                {dailyStartNote}
              </p>
            ) : null}
            {activeReview || active || pendingRetry || !complete ? (
              <button
                type="button"
                className={
                  dailyStartAllowed === undefined ? s.primary : s.secondary
                }
                disabled={
                  busy ||
                  saving ||
                  dailyStartAllowed === false ||
                  (!activeReview && !pendingRetry && unavailable) ||
                  (!activeReview &&
                    !active &&
                    !pendingRetry &&
                    state.expedition?.canStart === false)
                }
                data-expedition-start="true"
                data-expedition-retry={pendingRetry ? "true" : undefined}
                onClick={
                  activeReview ? onResume : pendingRetry ? onRetry : onStart
                }
              >
                {busy && !readOnly
                  ? "준비하고 있어요…"
                  : activeReview
                    ? "지난 학습 이어하기"
                    : pendingRetry
                      ? "남은 문제 다시 풀기"
                      : active
                        ? "이어서 탐험하기"
                        : dailyStartAllowed === undefined
                          ? "오늘의 탐험 시작"
                          : "탐험 문제 시작"}
                <span aria-hidden="true"> →</span>
              </button>
            ) : (
              <p className={`${s.missionComplete} ${a.done}`}>
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
                busy={busy || saving}
                onStart={(cardId) => onStartSupplement?.(cardId)}
              />
            ) : null}
          </section>

          {conceptMemory ? (
            <div className={a.memory} data-explorer-home-part="concept-memory">
              {conceptMemory}
            </div>
          ) : null}

          <section
            className={`${s.journeyPanel} ${a.journey}`}
            data-explorer-home-part="journey"
          >
            <JourneyBoard
              journey={journey}
              variant="map"
              theme={journeyTheme}
              // Behind the open base sheet the board cannot be pressed, so a chest
              // save does not re-render it; once the sheet closes it waits too.
              busy={busy || (saving && sheet !== "base")}
              onReviewDay={reviewDay}
            />
          </section>
        </>
      )}
      {studyBook &&
      separateExpedition &&
      (activeReview || active || pendingRetry || !complete) ? (
        <button
          type="button"
          className={s.secondary}
          disabled={
            busy ||
            saving ||
            dailyStartAllowed === false ||
            (!activeReview && !pendingRetry && unavailable) ||
            (!activeReview &&
              !active &&
              !pendingRetry &&
              state.expedition?.canStart === false)
          }
          onClick={activeReview ? onResume : pendingRetry ? onRetry : onStart}
        >
          탐험 문제 시작
        </button>
      ) : null}
      <div
        className={`${s.resourceLinks} ${a.tools}`}
        aria-label="탐험 도구"
        data-explorer-home-part="tools"
      >
        <button type="button" onClick={() => setSheet("collection")}>
          <span aria-hidden="true">▤</span>도감
        </button>
        <button type="button" onClick={() => setSheet("settings")}>
          <span aria-hidden="true">⚙</span>
          {studyBook ? "이 기기 설정" : "학습 설정"}
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
              <StarMark /> {shown.stars}
            </em>
          ) : null}
        </button>
      </div>

      {pendingRetry ? (
        <section
          className={`${s.pendingReview} ${a.review}`}
          data-explorer-home-part="review"
        >
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
          <p className={`${s.quietNote} ${a.sheetNote}`}>
            모은 카드와 먼저 알아둘 개념을 살펴보세요. 기억 복습은 오늘의 탐험에
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
                      ? `${studentDateLabel(card.progress.due, state.today)} 복습`
                      : "아직 수집 전"}
                </small>
              </button>
            ))}
          </div>
          <p className={s.scheduleNote}>
            복습할 때가 되면 오늘의 탐험에서 다시 만나요.
          </p>
          <SupplementShelf state={state} onInspect={onInspectSupplement} />
        </ExplorerSheet>
      ) : null}

      {sheet === "settings" ? (
        <ExplorerSheet
          title={studyBook ? "이 기기 설정" : "학습 설정"}
          onClose={closeSheet}
        >
          <DeviceSettings />
        </ExplorerSheet>
      ) : null}

      {sheet === "base" ? (
        <ExplorerSheet title="우리 기지" onClose={closeSheet}>
          <section className={s.baseInside}>
            <BaseArt level={state.profile.level} />
            <p>{state.profile.level}단계</p>
            <h3>{baseStageName(state.profile.level)}</h3>
            <p>
              모은 별{" "}
              <strong>
                <StarMark /> {shown.stars}
              </strong>
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
              기지 키우기 · <StarMark /> {upgradeCost}
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
