import {
  FADING_RECEIPTS_MAX,
  type FadingPlacement,
  type StoredFading,
  type StoredFadingConcept,
  type StoredFadingDay,
  type StoredFadingSession,
} from "@/contracts/fading.contract";
import { chipFits, chipTray, type FadingTrap } from "./chips";
import {
  fadingConceptDigest,
  fadingTargets,
  type FadingConcept,
} from "./concepts";
import type { FadingStep } from "./erasure";
import { FSRS_RATINGS, type FsrsRating } from "./fsrs";
import {
  FADING_DAILY_CAP,
  advanceFadingStreak,
  currentFadingStreak,
  fadingIdleDays,
  fadingLongBreak,
  fadingQueue,
  nextReviewDay,
  overdueCount,
  recordFadingDay,
  standingStepCounts,
  type FadingDay,
  type FadingQueueMode,
  type FadingStreak,
} from "./numbers";
import {
  applyFadingRating,
  fadingDateOf,
  fadingDayOfDate,
  type FadingProgress,
} from "./schedule";
import { giveUpStep, placeChip, type FadingSession } from "./session";

/**
 * 저장 칸을 옮기는 함수들 — 화면도 DB 도 모른다 (`docs/planning/srs-overhaul-20261006.md` §13).
 *
 * 받은 칸을 바꾸지 않고 새 값을 돌려준다. **바뀐 것이 없으면 받은 값을 그대로** 돌려준다 — 저장 쪽이 «그대로면 쓰지 않는다»로
 * 같은 요청의 되풀이를 안전하게 받는다(단계를 마친 요청이 두 번 와도 한 번만 반영된다).
 * 풀이를 건드리는 요청은 전부 **풀이의 번호**를 싣는다 — 늦게 도착한 옛 풀이의 요청이 지금 풀이에 적용되지 않는다.
 * 할 수 없는 일은 `FadingConflict` 로 던진다. 날짜는 한국 날짜 글(YYYY-MM-DD)로 받는다 — «오늘»은 서버가 정한다.
 */
export class FadingConflict extends Error {}

const conflict = (message: string) => new FadingConflict(message);

export function emptyFading(): StoredFading {
  return {
    version: 1,
    concepts: {},
    session: null,
    days: [],
    streak: { current: 0, best: 0, lastOn: null },
    allOn: null,
    receipts: [],
  };
}

const unrated = (addedOn: string): StoredFadingConcept => ({
  step: 1,
  stability: null,
  difficulty: null,
  reviewedOn: null,
  dueOn: null,
  digest: null,
  reviews: 0,
  lapses: 0,
  addedOn,
});

/** 저장된 개념 하나를 계산의 꼴로. */
export function fadingProgressOf(stored: StoredFadingConcept): FadingProgress {
  const rated =
    stored.stability !== null &&
    stored.difficulty !== null &&
    stored.reviewedOn !== null &&
    stored.dueOn !== null;
  return {
    step: stored.step,
    memory: rated
      ? { stability: stored.stability!, difficulty: stored.difficulty! }
      : null,
    reviewedDay: rated ? fadingDayOfDate(stored.reviewedOn!) : null,
    dueDay: rated ? fadingDayOfDate(stored.dueOn!) : null,
    reviews: stored.reviews,
    lapses: stored.lapses,
  };
}

/** 마지막으로 평가한 뒤에 은행의 문장이 바뀌었는가 — 평가 전이면 `false`. */
export function fadingContentChanged(
  stored: StoredFadingConcept,
  concept: FadingConcept,
): boolean {
  return (
    stored.digest !== null && stored.digest !== fadingConceptDigest(concept)
  );
}

const withConcept = (
  state: StoredFading,
  id: string,
  concept: StoredFadingConcept,
): StoredFading => ({
  ...state,
  concepts: { ...state.concepts, [id]: concept },
});

/** 개념 목록에서 고른다 — 1단계에 선다. 이미 있으면 그대로다. */
export function pickFadingConcept(
  state: StoredFading,
  conceptId: string,
  today: string,
): StoredFading {
  return state.concepts[conceptId]
    ? state
    : withConcept(state, conceptId, unrated(today));
}

/** 고른 것을 뺀다 — 평가한 적이 없는 개념만. 그 개념의 풀이가 열려 있으면 같이 닫는다. */
export function dropFadingConcept(
  state: StoredFading,
  conceptId: string,
): StoredFading {
  const stored = state.concepts[conceptId];
  if (!stored) return state;
  if (stored.reviews > 0)
    throw conflict("복습 기록이 있는 개념은 뺄 수 없습니다.");
  const concepts = { ...state.concepts };
  delete concepts[conceptId];
  return {
    ...state,
    concepts,
    session: state.session?.conceptId === conceptId ? null : state.session,
  };
}

/**
 * 풀이를 연다 — 서 있는 단계에서 시작한다. 고르지 않은 개념이면 같이 고른다.
 * 같은 개념의 풀이가 이미 열려 있으면 그대로 둔다(번호 · 씨앗 · 평가만 남은 풀이도) — 다시 들어와도 칩이 같은 자리에 있다.
 * 🔴 **복습일이 안 된 개념의 풀이는 열지 않는다.** 그런 풀이는 연습이다 — 화면이 받은 내용으로 그 자리에서 돌리고,
 * 평가도 기록도 없다(일정 · 집계 · 서 있는 단계가 안 바뀐다). 같은 날 두 번 평가하는 길이 그래서 없다.
 */
export function openFadingSession(
  state: StoredFading,
  concept: FadingConcept,
  today: string,
  fresh: { sessionId: string; seed: number },
): StoredFading {
  if (state.session?.conceptId === concept.id) return state;
  const picked = pickFadingConcept(state, concept.id, today);
  const stored = picked.concepts[concept.id]!;
  if (stored.dueOn !== null && stored.dueOn > today)
    throw conflict(
      "아직 복습일이 아닙니다 — 지금 푸는 것은 연습이라 기록하지 않습니다.",
    );
  return {
    ...picked,
    session: {
      id: fresh.sessionId,
      conceptId: concept.id,
      startStep: stored.step,
      seed: fresh.seed,
      phase: "steps",
      missedAtFour: [],
    },
  };
}

function openSession(
  state: StoredFading,
  conceptId: string,
  sessionId: string,
) {
  const session = state.session;
  const stored = state.concepts[conceptId];
  if (
    !session ||
    !stored ||
    session.conceptId !== conceptId ||
    session.id !== sessionId
  )
    throw conflict("이 풀이는 열려 있지 않습니다.");
  return { session, stored };
}

/** 1단계 정독을 마친다 — 2단계에 선다. 이미 지났으면 그대로다. */
export function completeFadingReading(
  state: StoredFading,
  conceptId: string,
  sessionId: string,
): StoredFading {
  const { stored } = openSession(state, conceptId, sessionId);
  return stored.step > 1
    ? state
    : withConcept(state, conceptId, { ...stored, step: 2 });
}

/**
 * 4단계에서 틀리게 넣은 것 하나를 **그 자리에서** 적는다 — 새로고침으로 지우고 다시 풀 수 없게.
 * 서버가 그 칩이 정말 그 빈칸의 답이 아닌지 다시 본다. 이미 적힌 빈칸이면 그대로다.
 */
export function reportFadingMiss(
  state: StoredFading,
  concept: FadingConcept,
  sessionId: string,
  placement: FadingPlacement,
  traps?: readonly FadingTrap[],
): StoredFading {
  const { session, stored } = openSession(state, concept.id, sessionId);
  if (stored.step !== 4 || session.phase !== "steps")
    throw conflict("4단계를 푸는 중이 아닙니다.");
  if (!fadingTargets(concept).some((t) => t.id === placement.targetId))
    throw conflict("이 개념에 없는 빈칸입니다.");
  const chip = chipTray(concept, 4, { seed: session.seed, traps }).find(
    (c) => c.id === placement.chipId,
  );
  if (!chip) throw conflict("이 단계에 없는 칩입니다.");
  if (chipFits(concept, placement.targetId, chip))
    throw conflict("맞게 넣은 칩입니다.");
  return session.missedAtFour.includes(placement.targetId)
    ? state
    : {
        ...state,
        session: {
          ...session,
          missedAtFour: [...session.missedAtFour, placement.targetId],
        },
      };
}

/**
 * 한 단계를 마친다 — 화면이 보낸 «넣은 칩의 차례»(틀린 것까지 전부)를 같은 규칙으로 다시 돌려 확인한다.
 * `gaveUp` 은 «아직 모르겠어요» — 남은 빈칸을 전부 틀림으로 두고 마친다.
 * 이미 지난 단계의 요청은 그대로 둔다. 건너뛴 단계 · 덜 채운 단계 · 다 채운 뒤의 넣기는 거절한다.
 * 4단계를 마치면 틀린 빈칸을 (그 자리에서 적어 둔 것과 합쳐) 적고 평가만 남긴다.
 */
export function completeFadingStep(
  state: StoredFading,
  concept: FadingConcept,
  sessionId: string,
  step: FadingStep,
  placements: readonly FadingPlacement[],
  options: { gaveUp?: boolean; traps?: readonly FadingTrap[] } = {},
): StoredFading {
  const { session, stored } = openSession(state, concept.id, sessionId);
  // 이미 지난 단계(와 이미 마친 4단계)의 요청은 그대로 둔다 — 응답을 못 받은 화면이 다시 보낸 것이다.
  if (step < stored.step || session.phase === "rating") return state;
  if (step > stored.step) throw conflict("앞 단계를 먼저 마쳐 주세요.");

  let replay: FadingSession = {
    conceptId: concept.id,
    startStep: session.startStep,
    step,
    phase: step === 1 ? "reading" : "filling",
    seed: session.seed,
    filled: {},
    missed: [],
    results: [],
    rating: null,
  };
  try {
    for (const placement of placements) {
      // 단계가 끝난 뒤의 넣기는 다음 단계의 것으로 읽히면 안 된다.
      if (replay.results.length) throw conflict("단계를 마친 뒤의 입력입니다.");
      replay = placeChip(
        replay,
        concept,
        placement.targetId,
        placement.chipId,
        options.traps,
      ).session;
    }
    if (!replay.results.length && options.gaveUp)
      replay = giveUpStep(replay, concept);
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : "잘못된 입력");
  }
  const result = replay.results[0];
  if (!result) throw conflict("빈칸을 다 채우지 않았습니다.");
  if (step < 4)
    return withConcept(state, concept.id, {
      ...stored,
      step: (step + 1) as FadingStep,
    });
  const missed = new Set([...session.missedAtFour, ...result.missed]);
  return {
    ...state,
    session: {
      ...session,
      phase: "rating",
      missedAtFour: fadingTargets(concept)
        .map((t) => t.id)
        .filter((id) => missed.has(id)),
    },
  };
}

const toDays = (days: readonly StoredFadingDay[]): FadingDay[] =>
  days.map(({ date, ...counts }) => ({
    day: fadingDayOfDate(date),
    ...counts,
  }));

const toStreak = (streak: StoredFading["streak"]): FadingStreak => ({
  current: streak.current,
  best: streak.best,
  lastDay: streak.lastOn ? fadingDayOfDate(streak.lastOn) : null,
});

/**
 * 지금 고를 수 있는 평가 — 평가 차례가 아니면 없고, 4단계에서 틀렸으면 «다시»뿐이다.
 * 대조를 기다리는 글(`unjudged`)이 남아 있어도 «다시»뿐이다 — 이 판은 그 대조를 받지 못하므로, 판정 없이 «같은 뜻»으로 읽지 않는다
 * (그 칸을 쓰는 판에서 되돌렸을 때의 안전한 쪽).
 */
export function fadingRatingsFor(session: StoredFadingSession): FsrsRating[] {
  if (session.phase !== "rating") return [];
  return session.missedAtFour.length || session.unjudged?.length
    ? ["again"]
    : [...FSRS_RATINGS];
}

/**
 * 풀이를 평가로 닫는다 — 4단계를 마친 뒤 한 번. 4단계에서 틀렸으면 «다시»만 받는다.
 * 같은 요청 번호가 다시 오면 다시 적용하지 않는다(응답을 못 받은 화면의 되풀이 — 영수증에 그때의 평가와 다음 복습일이 있다).
 */
export function rateFadingSession(
  state: StoredFading,
  concept: FadingConcept,
  sessionId: string,
  rating: FsrsRating,
  today: string,
  requestId: string,
): StoredFading {
  if (state.receipts.some((r) => r.requestId === requestId)) return state;
  const { session, stored } = openSession(state, concept.id, sessionId);
  if (!fadingRatingsFor(session).includes(rating))
    throw conflict(
      session.phase === "rating"
        ? "4단계에서 틀린 풀이는 «다시»로만 닫을 수 있습니다."
        : "4단계를 마친 뒤에 평가할 수 있습니다.",
    );
  const day = fadingDayOfDate(today);
  const next = applyFadingRating(
    fadingProgressOf(stored),
    session.startStep,
    rating,
    day,
  );
  const dueOn = fadingDateOf(next.dueDay!);
  const days = recordFadingDay(toDays(state.days), day, {
    passed: rating !== "again",
    fresh: stored.reviews === 0,
  });
  const streak = advanceFadingStreak(toStreak(state.streak), day);
  return {
    ...state,
    concepts: {
      ...state.concepts,
      [concept.id]: {
        step: next.step,
        stability: next.memory!.stability,
        difficulty: next.memory!.difficulty,
        reviewedOn: today,
        dueOn,
        digest: fadingConceptDigest(concept),
        reviews: next.reviews,
        lapses: next.lapses,
        addedOn: stored.addedOn,
      },
    },
    session: null,
    days: days.map(({ day: number, ...counts }) => ({
      date: fadingDateOf(number),
      ...counts,
    })),
    streak: { current: streak.current, best: streak.best, lastOn: today },
    receipts: [
      ...state.receipts,
      { requestId, conceptId: concept.id, rating, dueOn },
    ].slice(-FADING_RECEIPTS_MAX),
  };
}

/** «오늘 전부» — 켜면 그날에만 하루 상한을 보지 않는다. */
export function setFadingAllToday(
  state: StoredFading,
  today: string,
  on: boolean,
): StoredFading {
  const allOn = on ? today : null;
  return state.allOn === allOn ? state : { ...state, allOn };
}

export type FadingSummary = {
  today: string;
  mode: FadingQueueMode;
  /** N일 연속(지금 보여 줄 값)과 지금까지의 가장 긴 연속. */
  streak: { current: number; best: number };
  /** 평가한 적이 있는 개념 수 — «배운 개념». 다 외웠다는 뜻이 아니다. */
  learned: number;
  stepCounts: Record<FadingStep, number>;
  queue: { due: string[]; held: string[]; unrated: string[] };
  /** 오늘의 복습 — 한 것과, 한 것에 오늘 남은 것을 더한 수. 처음 배운 것은 넣지 않는다. */
  plan: { done: number; total: number };
  todayCount: { reviews: number; passed: number; fresh: number };
  /** 마지막으로 평가를 닫은 날(없으면 `null`) · 그날부터 쉰 날 수 · 오래 쉬었는가(홈의 «오래 쉬고 돌아옴»). */
  lastOn: string | null;
  idleDays: number | null;
  longBreak: boolean;
  /** 밀린 복습 — 복습일이 지난 개념의 수(하루 상한으로 미룬 것도 지났으면 센다). */
  overdue: number;
  /** 다음 복습 — 오늘보다 뒤의 가장 가까운 복습일 · 그날까지의 날 수 · 그날의 개념 수. 없으면 `null`. */
  nextReview: { dueOn: string; daysUntil: number; count: number } | null;
};

/**
 * 홈과 통계가 읽는 요약. `known` 을 주면 그 안의 열쇠만 센다 — 은행에서 사라진 개념의 기록이 숫자에 섞이지 않게.
 * 하루 상한에서 빼는 «오늘 이미 한 복습»은 그날 닫은 풀이에서 처음 배운 것을 뺀 수다.
 */
export function fadingSummary(
  state: StoredFading,
  today: string,
  options: { cap?: number; known?: ReadonlySet<string> } = {},
): FadingSummary {
  const day = fadingDayOfDate(today);
  const progress: Record<string, FadingProgress> = {};
  for (const [id, stored] of Object.entries(state.concepts))
    if (!options.known || options.known.has(id))
      progress[id] = fadingProgressOf(stored);
  const all = Object.values(progress);
  const counted = state.days.find((d) => d.date === today);
  const todayCount = {
    reviews: counted?.reviews ?? 0,
    passed: counted?.passed ?? 0,
    fresh: counted?.fresh ?? 0,
  };
  const done = todayCount.reviews - todayCount.fresh;
  const mode: FadingQueueMode = state.allOn === today ? "all" : "split";
  const idleDays = fadingIdleDays(toStreak(state.streak).lastDay, day);
  const next = nextReviewDay(all, day);
  const queue = fadingQueue(progress, day, {
    mode,
    cap: options.cap ?? FADING_DAILY_CAP,
    reviewedToday: done,
  });
  return {
    today,
    mode,
    streak: {
      current: currentFadingStreak(toStreak(state.streak), day),
      best: state.streak.best,
    },
    learned: all.filter((p) => p.memory !== null).length,
    stepCounts: standingStepCounts(all),
    queue,
    plan: { done, total: done + queue.due.length },
    todayCount,
    lastOn: state.streak.lastOn,
    idleDays,
    longBreak: fadingLongBreak(idleDays),
    overdue: overdueCount(all, day),
    nextReview: next
      ? {
          dueOn: fadingDateOf(next.day),
          daysUntil: next.day - day,
          count: next.count,
        }
      : null,
  };
}
