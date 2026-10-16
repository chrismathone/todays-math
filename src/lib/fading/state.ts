import {
  FADING_RECEIPTS_MAX,
  FADING_TARGETS_MAX,
  type FadingPlacement,
  type StoredFading,
  type StoredFadingConcept,
  type StoredFadingDay,
  type StoredFadingMarks,
  type StoredFadingSession,
} from "@/contracts/fading.contract";
import { chipFits, chipTray, type FadingTrap } from "./chips";
import {
  fadingConceptDigest,
  fadingTargets,
  type FadingConcept,
} from "./concepts";
import { erasedTargets, type FadingStep } from "./erasure";
import type { FsrsRating } from "./fsrs";
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
import {
  fadingAsksSure,
  fadingJudgingComplete,
  fadingModeOf,
  fadingPartialMiss,
  fadingRatingsAfterJudging,
  giveUpStep,
  placeAnswer,
  startFadingSession,
  type FadingJudged,
  type FadingRatingContext,
  type FadingSession,
} from "./session";
import { fadingTypedOutcome } from "./typed";

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

/**
 * 4단계를 푼 뒤에 은행의 문장이 고쳐졌는가 — 평가 차례의 풀이에 적힌 «푼 내용의 지문»(`digest`)과 지금 내용을 견준다.
 * 지문이 없는 풀이(이 칸 이전)는 견주지 않는다. 대조를 기다리는 글은 그 푼 내용의 답과 견줄 것이라, 바뀌었으면 «같은 뜻»으로 받지 않는다.
 */
export function fadingSolvedContentChanged(
  session: Pick<StoredFadingSession, "digest">,
  concept: FadingConcept,
): boolean {
  return (
    session.digest !== undefined &&
    session.digest !== fadingConceptDigest(concept)
  );
}

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
  options: { cards?: boolean } = {},
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
      // 카드 풀이는 4단계의 포기 여부를 처음부터 적는다(결정 1 — `false` 가 적힌 풀이만 부분 틀림 «어려움»의 대상이다).
      ...(options.cards ? { mode: "cards" as const, gaveUpAtFour: false } : {}),
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

/**
 * 1단계 정독을 마친다 — 2단계에 선다. 이미 지났으면 그대로다.
 * 카드 풀이면 카드마다의 «사전 확인»(`seen` — 명제 차례로 한 글자씩)을 같이 적는다. 진단일 뿐이다 — 글자 수가 명제 수와 다르거나
 * 카드 풀이가 아니면 적지 않고 넘어간다(정독은 그대로 마친다).
 */
export function completeFadingReading(
  state: StoredFading,
  conceptId: string,
  sessionId: string,
  options: { concept?: FadingConcept; seen?: string } = {},
): StoredFading {
  const { session, stored } = openSession(state, conceptId, sessionId);
  if (stored.step > 1) return state;
  const read = withConcept(state, conceptId, { ...stored, step: 2 });
  return options.seen !== undefined &&
    fadingModeOf(session) === "cards" &&
    options.concept &&
    options.seen.length === options.concept.propositions.length
    ? { ...read, session: { ...session, seen: options.seen } }
    : read;
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
  const typed = fadingModeOf(session) === "cards";
  if ("text" in placement) {
    if (!typed) throw conflict("이 풀이는 칩으로 채웁니다.");
    let outcome: string;
    try {
      outcome = fadingTypedOutcome(
        concept,
        placement.targetId,
        placement.text,
        traps,
      );
    } catch (error) {
      throw conflict(error instanceof Error ? error.message : "잘못된 입력");
    }
    if (outcome === "correct") throw conflict("맞게 쓴 답입니다.");
    if (outcome === "unknown")
      throw conflict(
        "어느 답의 글도 아니라 틀림으로 적지 않습니다 — 단계를 마친 뒤 대조합니다.",
      );
  } else {
    if (typed) throw conflict("이 풀이의 4단계는 칩 없이 답을 씁니다.");
    const chip = chipTray(concept, 4, { seed: session.seed, traps }).find(
      (c) => c.id === placement.chipId,
    );
    if (!chip) throw conflict("이 단계에 없는 칩입니다.");
    if (chipFits(concept, placement.targetId, chip))
      throw conflict("맞게 넣은 칩입니다.");
  }
  // 이미 적혔거나, 옛 틀림으로 칸이 다 찼으면 그대로다(틀림이 하나라도 있으니 평가는 어차피 «다시»뿐이다).
  return session.missedAtFour.includes(placement.targetId) ||
    session.missedAtFour.length >= FADING_TARGETS_MAX
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
 * 4단계 카드 하나의 «아직 모르겠어요»를 **그 자리에서** 적는다(D2 — 새로고침으로 지우고 다시 풀 수 없게).
 * 화면이 보낸 «이 단계에서 지금까지 넣은 차례»(`placements` — 틀린 것까지)를 같은 규칙으로 다시 돌려, 그 카드(명제)의
 * 아직 못 채운 빈칸을 `missedAtFour` 에 더한다. 이미 적힌 빈칸은 다시 적지 않고, 옛 id 는 버리지 않으며, 남은 자리만큼만 더한다
 * (`reportFadingMiss` 와 같은 규칙). 더할 것이 없으면(다 채운 카드 · 같은 요청의 되풀이) 받은 값 그대로다.
 * 카드 풀이의 4단계를 푸는 중에만 받는다 — 칩 풀이 · 다른 단계 · 평가 차례 · 없는 카드 · 틀린 차례는 거절한다.
 */
export function giveUpFadingCard(
  state: StoredFading,
  concept: FadingConcept,
  sessionId: string,
  propositionId: string,
  placements: readonly FadingPlacement[],
  traps?: readonly FadingTrap[],
): StoredFading {
  const { session, stored } = openSession(state, concept.id, sessionId);
  if (stored.step !== 4 || session.phase !== "steps")
    throw conflict("4단계를 푸는 중이 아닙니다.");
  if (fadingModeOf(session) !== "cards")
    throw conflict("이 풀이의 4단계는 칩으로 채웁니다.");
  if (!concept.propositions.some((p) => p.id === propositionId))
    throw conflict("이 개념에 없는 카드입니다.");
  let replay: FadingSession = {
    ...startFadingSession(concept, 4, session.seed, "cards"),
    startStep: session.startStep,
  };
  try {
    for (const placement of placements) {
      if (replay.results.length) throw conflict("단계를 마친 뒤의 입력입니다.");
      replay = placeAnswer(replay, concept, placement, traps).session;
    }
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : "잘못된 입력");
  }
  if (replay.results.length) throw conflict("단계를 마친 뒤의 입력입니다.");
  const open = erasedTargets(concept, 4)
    .map((t) => t.id)
    .filter((id) => id.startsWith(`${propositionId}#`))
    .filter((id) => !(id in replay.filled))
    .filter((id) => !session.missedAtFour.includes(id));
  const room = FADING_TARGETS_MAX - session.missedAtFour.length;
  if (!open.length || room <= 0) return state;
  return {
    ...state,
    session: {
      ...session,
      missedAtFour: [...session.missedAtFour, ...open.slice(0, room)],
      // 넘긴 순간 적는다(결정 1) — 새로고침 뒤에도 «포기 없음»으로 읽히지 않게.
      gaveUpAtFour: true,
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
  options: {
    gaveUp?: boolean;
    sure?: string;
    traps?: readonly FadingTrap[];
  } = {},
): StoredFading {
  const { session, stored } = openSession(state, concept.id, sessionId);
  // 이미 지난 단계(와 이미 마친 4단계)의 요청은 그대로 둔다 — 응답을 못 받은 화면이 다시 보낸 것이다.
  if (step < stored.step || session.phase === "rating") return state;
  if (step > stored.step) throw conflict("앞 단계를 먼저 마쳐 주세요.");

  let replay: FadingSession = {
    ...startFadingSession(concept, step, session.seed, fadingModeOf(session)),
    startStep: session.startStep,
  };
  let gaveUpNow = false;
  try {
    for (const placement of placements) {
      // 단계가 끝난 뒤의 넣기는 다음 단계의 것으로 읽히면 안 된다.
      if (replay.results.length) throw conflict("단계를 마친 뒤의 입력입니다.");
      replay = placeAnswer(replay, concept, placement, options.traps).session;
    }
    if (!replay.results.length && options.gaveUp) {
      replay = giveUpStep(replay, concept);
      gaveUpNow = true;
    }
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
  const order = fadingTargets(concept).map((t) => t.id);
  const missed = new Set([...session.missedAtFour, ...result.missed]);
  // 대조를 기다리는 글 — 적어 둔 틀림의 빈칸은 뺀다(평가는 어차피 «다시»다). 새로고침해도 같은 대조가 다시 선다.
  const unjudged = (result.unjudged ?? []).filter(
    (u) => !missed.has(u.targetId),
  );
  // 확신은 복습으로 연 카드 풀이에서만 · 명제마다 한 글자일 때만 적는다. 진단일 뿐이라 안 맞으면 적지 않고 넘어간다.
  const sure =
    fadingAsksSure(session) &&
    options.sure?.length === concept.propositions.length
      ? options.sure
      : session.sure;
  return {
    ...state,
    session: {
      id: session.id,
      conceptId: session.conceptId,
      startStep: session.startStep,
      seed: session.seed,
      phase: "rating",
      // 지금 표적은 표적 차례로. 지금 표적에 없는 옛 id(은행의 문장이 고쳐지기 전에 적힌 틀림)도 버리지 않는다 —
      // 버리면 고친 문장에서 다 맞히는 순간 «4단계에서 틀리면 다시뿐»이 풀린다.
      // 묶음 구성이 그대로면 합친 수는 상한에 닿지 않는다(다섯 문장 × 핵심어 넷 — 시험이 잠근다). 자르는 것은 구성이 바뀐 예외뿐이다.
      missedAtFour: [
        ...order.filter((id) => missed.has(id)),
        ...session.missedAtFour.filter((id) => !order.includes(id)),
      ].slice(0, FADING_TARGETS_MAX),
      ...(session.mode ? { mode: session.mode } : {}),
      ...(session.seen ? { seen: session.seen } : {}),
      ...(sure ? { sure } : {}),
      ...(unjudged.length ? { unjudged } : {}),
      // 이 4단계를 푼 내용 — 평가는 이 지문으로 적는다(그사이 문장이 고쳐져도 «고친 문장의 평가»로 적지 않는다).
      digest: fadingConceptDigest(concept),
      // 4단계의 포기 여부(결정 1) — 풀이를 새로 짓는 자리라 빠뜨리지 않고 옮긴다. 이 단계를 «아직 모르겠어요»로 마쳤으면
      // 카드 풀이에 `true` 를 적는다(칸이 없던 옛 풀이도 — «포기함»은 예외를 닫는 쪽이라 안전하다). 칩 풀이에는 쓰지 않는다.
      ...(gaveUpNow && fadingModeOf(session) === "cards"
        ? { gaveUpAtFour: true }
        : session.gaveUpAtFour !== undefined
          ? { gaveUpAtFour: session.gaveUpAtFour }
          : {}),
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
 * 대조를 기다리는 글(`unjudged`)이 있으면 학생이 고른 것(`judged`)으로 정한다 — «다름»이 하나라도 있으면 «다시»뿐이다.
 * 아직 고르지 않았으면 고를 수 있는 가장 넓은 것을 낸다(평가를 받을 때 «다 골랐는가»를 따로 본다).
 * 대조를 기다리는 글이 있는데 판정할 수 없으면 «다시»뿐이다 — 판정 없이 «같은 뜻»으로 읽지 않는다:
 * 카드 풀이가 아닌 풀이(쓰는 길이 없는 꼴)이거나, `current`(지금 내용)를 주었는데 4단계를 푼 뒤에 문장이 고쳐졌을 때
 * (그 글은 옛 답과 견줄 것이다 — 고친 답과 견주면 다른 답에 이름을 붙이게 된다).
 * 결정 1 의 부분 틀림 «어려움»은 지금 내용(`current`)을 주었고 4단계를 푼 뒤에 문장이 바뀌지 않았을 때만 본다(`fadingStoredRatingContext`).
 */
export function fadingRatingsFor(
  session: StoredFadingSession,
  judged?: FadingJudged,
  current?: FadingConcept,
): FsrsRating[] {
  if (session.phase !== "rating") return [];
  const waiting = session.unjudged ?? [];
  if (
    waiting.length &&
    (fadingModeOf(session) !== "cards" ||
      (current !== undefined && fadingSolvedContentChanged(session, current)))
  )
    return ["again"];
  return fadingRatingsAfterJudging(
    { missedAtFour: session.missedAtFour, unjudged: waiting },
    judged,
    fadingStoredRatingContext(session, current),
  );
}

/**
 * 저장된 풀이의 부분 틀림 판정 문맥(결정 1) — 지금 내용이 없거나, 4단계를 푼 뒤에 문장이 고쳐졌으면 없다(지금까지의 규칙).
 * N 은 지금 내용의 4단계 빈칸 수, 포기 여부는 저장 칸 그대로다(칸이 없는 옛 풀이는 «모름» — 예외가 아니다).
 */
export function fadingStoredRatingContext(
  session: StoredFadingSession,
  current?: FadingConcept,
): FadingRatingContext | undefined {
  if (!current || fadingSolvedContentChanged(session, current))
    return undefined;
  return {
    cards: fadingModeOf(session) === "cards",
    gaveUp: session.gaveUpAtFour,
    blanks: erasedTargets(current, 4).map((t) => t.id),
  };
}

/** 저장된 풀이를 그 평가로 닫을 때 부분 틀림의 «어려움»인가 — 간격을 2일로 자른다(`schedule.ts`). */
export function fadingStoredPartialMiss(
  session: StoredFadingSession,
  judged: FadingJudged | undefined,
  current?: FadingConcept,
): boolean {
  return (
    session.phase === "rating" &&
    fadingPartialMiss(
      { missedAtFour: session.missedAtFour, unjudged: session.unjudged ?? [] },
      judged,
      fadingStoredRatingContext(session, current),
    )
  );
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
  options: { judged?: FadingJudged } = {},
): StoredFading {
  if (state.receipts.some((r) => r.requestId === requestId)) return state;
  const { session, stored } = openSession(state, concept.id, sessionId);
  const waiting = session.unjudged ?? [];
  const judged = options.judged ?? {};
  if (Object.keys(judged).some((id) => !waiting.some((u) => u.targetId === id)))
    throw conflict("대조를 기다리는 빈칸이 아닙니다.");
  // 대조를 다 골라야 닫힌다 — 고른 것이 평가를 정할 때만(틀림이 있는 «다시»이거나, 푼 뒤에 문장이 고쳐져 «다시»뿐이면 고르지 않아도 된다).
  // 결정 1: 틀림이 있어도 «어려움»은 대조를 다 골라야 받는다(«다름»이 M 에 든다).
  if (
    session.phase === "rating" &&
    waiting.length &&
    (!session.missedAtFour.length || rating !== "again") &&
    !fadingSolvedContentChanged(session, concept) &&
    !fadingJudgingComplete(waiting, judged)
  )
    throw conflict("기준안과 대조할 답을 다 골라 주세요.");
  if (!fadingRatingsFor(session, judged, concept).includes(rating))
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
    { partial: fadingStoredPartialMiss(session, judged, concept) },
  );
  const dueOn = fadingDateOf(next.dueDay!);
  const days = recordFadingDay(toDays(state.days), day, {
    passed: rating !== "again",
    fresh: stored.reviews === 0,
  });
  const streak = advanceFadingStreak(toStreak(state.streak), day);
  // 4단계를 푼 내용의 지문 — 그 뒤에 문장이 고쳐졌으면 고친 문장의 평가로 적지 않는다(«바뀜»이 선다).
  // 지문이 없는 풀이(이 칸 이전에 평가 차례가 된 것)는 지금 지문이다.
  const digest = session.digest ?? fadingConceptDigest(concept);
  const marks = fadingMarksOf(session, judged, digest);
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
        digest,
        reviews: next.reviews,
        lapses: next.lapses,
        addedOn: stored.addedOn,
        ...(marks ? { marks } : {}),
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

/**
 * 평가할 때 개념에 남기는 진단 한 벌 — 카드 풀이만. 사전 확인 · 확신 · «다시»를 건 빈칸(틀림 · 넘김 · «다름»).
 * 남길 것이 없으면 `undefined` 다. 앞의 진단은 덮는다(누적 · 평균은 없다).
 */
function fadingMarksOf(
  session: StoredFadingSession,
  judged: FadingJudged,
  digest: string,
): StoredFadingMarks | undefined {
  if (fadingModeOf(session) !== "cards") return undefined;
  const different = (session.unjudged ?? [])
    .map((u) => u.targetId)
    .filter((id) => judged[id] === "different")
    .filter((id) => !session.missedAtFour.includes(id));
  const missed = [...session.missedAtFour, ...different].slice(
    0,
    FADING_TARGETS_MAX,
  );
  if (!session.seen && !session.sure && !missed.length) return undefined;
  return {
    digest,
    ...(session.seen ? { seen: session.seen } : {}),
    ...(session.sure ? { sure: session.sure } : {}),
    ...(missed.length ? { missed } : {}),
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
 * `promptsOf`(개념의 명제 수)를 주면 홈의 대기열이 «오늘의 학습» 계획과 같은 **명제 20칸**이다(결정 4) — 오늘 평가로 닫은 개념의
 * 명제(첫 평가 포함)를 칸에서 빼고, 풀던 개념은 빚진 것이다. 주지 않으면 지금까지의 개념 수 규칙이다
 * (하루 상한에서 빼는 «오늘 이미 한 복습»은 그날 닫은 풀이에서 처음 배운 것을 뺀 수).
 * «오늘의 복습»(`plan` — 한 것 · 목표)은 어느 쪽이든 **개념 수**다(처음 배운 것은 넣지 않는다).
 */
export function fadingSummary(
  state: StoredFading,
  today: string,
  options: {
    cap?: number;
    known?: ReadonlySet<string>;
    promptsOf?: (conceptId: string) => number;
  } = {},
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
  const promptsOf = options.promptsOf;
  const queue = fadingQueue(progress, day, {
    mode,
    cap: options.cap ?? FADING_DAILY_CAP,
    ...(promptsOf
      ? {
          // 오늘 평가로 닫은 기본 분량 — 계획이 «한 것»으로 세는 셈과 같다(첫 평가 포함 · 명제 수).
          reviewedToday: Object.entries(state.concepts).reduce(
            (n, [id, stored]) =>
              id in progress && stored.reviewedOn === today
                ? n + promptsOf(id)
                : n,
            0,
          ),
          slots: promptsOf,
          open: state.session?.conceptId ?? null,
        }
      : { reviewedToday: done }),
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
