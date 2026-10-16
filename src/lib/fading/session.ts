import type { StoredFadingUnjudged } from "@/contracts/fading.contract";
import { chipFits, chipTray, type FadingTrap } from "./chips";
import { fadingTargets, type FadingConcept } from "./concepts";
import { erasedTargets, type FadingStep } from "./erasure";
import { FSRS_RATINGS, type FsrsRating } from "./fsrs";
import { fadingTypedOutcome, type FadingTypedOutcome } from "./typed";

/**
 * 한 개념의 풀이 — 화면 없는 상태 기계 (`docs/planning/srs-overhaul-20261006.md` §4).
 *
 * - 서 있는 단계에서 시작해 4단계까지 한 자리에서 내려간다. 새 개념은 1단계 정독부터다.
 * - 맞지 않는 칩은 들어가지 않는다. 다시 맞게 넣을 수는 있지만 **그 빈칸은 틀린 것으로 남는다**.
 * - 막히면 «아직 모르겠어요» — 남은 빈칸을 전부 틀림으로 두고 그 단계를 마친다. 기준안은 단계를 마친 뒤에만 열린다
 *   (채우는 중에는 답도 해설도 없다 — 바로 알려 주는 것은 «그 칩이 맞는가»뿐이다).
 * - 자가 평가는 4단계를 마친 뒤 한 번이다. 4단계에서 하나라도 틀렸으면 «다시»뿐이다.
 * - «다시»면 시작한 단계보다 한 단계 앞에 선다(2단계까지). 그 밖에는 4단계에 선다.
 * - 중간에 나가면 풀던 단계에 선다 — 평가는 없다.
 *
 * **카드 풀이(`mode: "cards"` — 4단계 A′ 합의 2026-10-07)** 는 풀이를 열 때 정해져 끝까지 그대로다. 다른 것은 둘이다.
 * - 1단계는 카드(문장)마다 앞면 → 뒷면 → «사전 확인»이다. 진단일 뿐이라 여기서는 정독과 같다(값은 `read` 에 실어 보낸다).
 * - 4단계는 칩이 없다 — 빈칸마다 답을 **자판으로 쓴다**(`placeText`). 그 개념의 다른 답 · 함정의 글이면 틀림이고(그 자리에서 적는다),
 *   어느 답의 글도 아니면 받아 두었다가 단계를 다 마친 뒤 학생이 기준안과 대조한다(`unknown` — 그 자리에서 답을 보이지 않는다).
 *   «다름»으로 고른 것 · 틀림 · «아직 모르겠어요»가 하나라도 있으면 평가는 «다시»뿐이다. 2 · 3단계는 칩 그대로다.
 *
 * **결정 1(원장님 승인 2026-10-16)** — 카드 풀이 4단계의 부분 틀림에는 «어려움»도 고를 수 있다(`fadingPartialMiss`).
 * 포기가 없었다고 **적힌** 풀이에서만이고(`gaveUpAtFour === false`), 틀린 빈칸이 4단계 빈칸의 4분의 1(버림) 이하일 때만이다.
 * 그 «어려움»의 간격은 2일을 넘지 않는다(`schedule.ts`). 정답 확률을 그렇게 읽는 것이 맞는지는 못 확인했다 — 운영 정책이다.
 *
 * 모든 함수는 받은 풀이를 바꾸지 않고 새 값을 돌려준다. 화면과 서버가 같은 함수를 쓴다.
 */
export type FadingPhase = "reading" | "filling" | "rating" | "done";

/** 풀이의 방식 — `chips` 는 지금의 칩 풀이, `cards` 는 1단계 카드 · 4단계 자판(A′). */
export type FadingMode = "chips" | "cards";

/** 지금 단계에서 받는 입력 — 정독(카드) · 칩 · 자판. */
export type FadingInput = "reading" | "chips" | "typed";

/** 넣은 것 하나의 결과. `unknown` 은 쓴 글이 어느 답의 글도 아닌 것이다 — 맞다고도 틀리다고도 하지 않는다. */
export type FadingOutcome = FadingTypedOutcome;

/** 대조에서 학생이 고른 것 — 기준안과 «같은 뜻»인가, «다름»인가. «다름»은 틀림이다. */
export type FadingJudgement = "same" | "different";
export type FadingJudged = Readonly<Record<string, FadingJudgement>>;

/** 끝낸 단계 하나 — 빈칸 수와, 한 번이라도 틀리게 넣은 빈칸. */
export type FadingStepResult = {
  step: FadingStep;
  blanks: number;
  missed: string[];
  /** 자판으로 푼 단계에서만 — 어느 답의 글도 아니어서 학생의 대조를 기다리는 것(틀린 빈칸은 뺀다 · 빈칸 차례). */
  unjudged?: StoredFadingUnjudged[];
  /** 자판으로 푼 단계에서만 — 빈칸마다 마지막으로 쓴 글(대조 화면의 «내 답»). 쓰지 않은 빈칸은 없다. */
  answers?: Record<string, string>;
};

export type FadingSession = {
  conceptId: string;
  /** 이 풀이를 시작할 때 서 있던 단계. */
  startStep: FadingStep;
  step: FadingStep;
  phase: FadingPhase;
  /** 칩 차례의 씨앗 — 같은 풀이를 다시 열어도 칩이 같은 자리에 놓인다. */
  seed: number;
  /** 지금 단계에서 채운 빈칸 → 넣은 칩의 id(자판으로 푸는 단계에서는 쓴 글). */
  filled: Record<string, string>;
  /** 지금 단계에서 한 번이라도 틀리게 넣은 빈칸. */
  missed: string[];
  results: FadingStepResult[];
  rating: FsrsRating | null;
  /** 카드 풀이 — 없으면 칩 풀이다. */
  mode?: "cards";
  /** 자판으로 푸는 단계 — 빈칸마다 마지막으로 쓴 글(틀린 것까지). */
  typed?: Record<string, string>;
  /** 자판으로 푸는 단계 — 어느 답의 글도 아니어서 받아 둔 빈칸(채워진 것으로 친다). */
  pending?: string[];
  /** 자판으로 푸는 단계 — «아직 모르겠어요»로 넘긴 카드의 빈칸(틀림이고, 더 쓸 수 없다). */
  skipped?: string[];
  /**
   * 이 풀이의 4단계에서 «아직 모르겠어요»를 고른 적이 있는가(결정 1) — 서버의 칸에서 이어받고(`resumeFadingSession`),
   * 4단계에서 넘기면 `true` 가 된다. 없으면 모른다 — 부분 틀림의 «어려움»을 열지 않는다.
   */
  gaveUpAtFour?: boolean;
};

export function startFadingSession(
  concept: FadingConcept,
  standingStep: FadingStep,
  seed: number,
  mode: FadingMode = "chips",
): FadingSession {
  return {
    conceptId: concept.id,
    startStep: standingStep,
    step: standingStep,
    phase: standingStep === 1 ? "reading" : "filling",
    seed,
    filled: {},
    missed: [],
    results: [],
    rating: null,
    ...(mode === "cards" ? { mode } : {}),
  };
}

/** 풀이의 방식 — 없으면 칩. */
export const fadingModeOf = (session: { mode?: FadingMode }): FadingMode =>
  session.mode === "cards" ? "cards" : "chips";

/** 지금 단계에서 받는 입력 — 카드 풀이의 4단계만 자판이다(2 · 3단계는 칩 그대로). */
export function fadingStepInput(session: {
  phase: FadingPhase;
  step: FadingStep;
  mode?: FadingMode;
}): FadingInput {
  if (session.phase === "reading") return "reading";
  return fadingModeOf(session) === "cards" && session.step === 4
    ? "typed"
    : "chips";
}

/**
 * 4단계의 카드마다 입력란을 열기 전에 확신(1/2/3)을 묻는가 — **복습으로 연 카드 풀이**(4단계에서 시작)에서만.
 * 배우는 풀이(1 ~ 3단계에서 시작)에서는 묻지 않는다(방금 본 직후라 신호가 섞인다). 확신은 결과를 바꾸지 않는다.
 */
export function fadingAsksSure(session: {
  startStep: FadingStep;
  mode?: FadingMode;
}): boolean {
  return fadingModeOf(session) === "cards" && session.startStep === 4;
}

/**
 * 서버의 열린 풀이(학생 API 의 `session`)에서 화면의 풀이를 다시 세운다 — 다시 들어왔을 때 이어 간다.
 * 평가만 남은 풀이는 4단계의 결과(틀린 빈칸 · 대조를 기다리는 글)까지 세운다. 화면이 이 규칙을 다시 짓지 않는다.
 */
export function resumeFadingSession(
  concept: FadingConcept,
  remote: {
    startStep: FadingStep;
    step: FadingStep;
    seed: number;
    phase: "steps" | "rating";
    missedAtFour: readonly string[];
    mode?: FadingMode;
    unjudged?: readonly StoredFadingUnjudged[];
    gaveUpAtFour?: boolean;
  },
): FadingSession {
  const local = {
    ...startFadingSession(
      concept,
      remote.step,
      remote.seed,
      remote.mode ?? "chips",
    ),
    startStep: remote.startStep,
    ...(remote.gaveUpAtFour !== undefined
      ? { gaveUpAtFour: remote.gaveUpAtFour }
      : {}),
  };
  if (remote.phase === "steps")
    return {
      ...local,
      missed: remote.step === 4 ? [...remote.missedAtFour] : [],
    };
  const unjudged = (remote.unjudged ?? []).map((u) => ({ ...u }));
  return {
    ...local,
    step: 4,
    phase: "rating",
    results: [
      {
        step: 4,
        blanks: erasedTargets(concept, 4).length,
        missed: [...remote.missedAtFour],
        ...(fadingModeOf(remote) === "cards"
          ? {
              unjudged,
              answers: Object.fromEntries(
                unjudged.map((u) => [u.targetId, u.text]),
              ),
            }
          : {}),
      },
    ],
  };
}

/** 1단계 정독을 마친다 — 2단계로. */
export function finishReading(session: FadingSession): FadingSession {
  if (session.phase !== "reading") throw new Error("정독 단계가 아닙니다.");
  return { ...session, step: 2, phase: "filling" };
}

/** 지금 넣을 수 있는 빈칸인가 — 칩이든 글이든 같은 문을 지난다. 그 단계의 빈칸을 돌려준다. */
function openBlanks(
  session: FadingSession,
  concept: FadingConcept,
  targetId: string,
) {
  if (session.conceptId !== concept.id)
    throw new Error("이 풀이의 개념이 아닙니다.");
  if (session.phase !== "filling")
    throw new Error("빈칸을 채우는 단계가 아닙니다.");
  const erased = erasedTargets(concept, session.step);
  if (!erased.some((t) => t.id === targetId))
    throw new Error(`이 단계의 빈칸이 아닙니다: ${targetId}`);
  if (targetId in session.filled)
    throw new Error(`이미 채운 빈칸입니다: ${targetId}`);
  if (session.skipped?.includes(targetId))
    throw new Error(`«아직 모르겠어요»로 넘긴 빈칸입니다: ${targetId}`);
  return erased;
}

/** 그 빈칸을 «틀림»으로 적는다 — 이미 적혀 있으면 그대로다. */
function missedAt(session: FadingSession, targetId: string): FadingSession {
  return session.missed.includes(targetId)
    ? session
    : { ...session, missed: [...session.missed, targetId] };
}

/** 빈칸을 다 채웠거나 넘겼으면 단계를 마친다. */
function settled(
  session: FadingSession,
  concept: FadingConcept,
  erased: number,
): FadingSession {
  const done =
    Object.keys(session.filled).length + (session.skipped?.length ?? 0);
  return done < erased ? session : finishStep(session, concept, erased);
}

/** 빈칸에 칩을 넣는다. 맞으면 채워지고, 틀리면 빈칸은 그대로 남고 «틀림»이 적힌다. 자판으로 푸는 단계에서는 받지 않는다. */
export function placeChip(
  session: FadingSession,
  concept: FadingConcept,
  targetId: string,
  chipId: string,
  traps?: readonly FadingTrap[],
): { session: FadingSession; correct: boolean } {
  if (session.phase === "filling" && fadingStepInput(session) === "typed")
    throw new Error("이 단계는 칩 없이 답을 씁니다.");
  const erased = openBlanks(session, concept, targetId);
  const chip = chipTray(concept, session.step, {
    seed: session.seed,
    traps,
  }).find((c) => c.id === chipId);
  if (!chip) throw new Error(`이 단계에 없는 칩입니다: ${chipId}`);
  if (Object.values(session.filled).includes(chipId))
    throw new Error(`이미 쓴 칩입니다: ${chipId}`);

  if (!chipFits(concept, targetId, chip))
    return { correct: false, session: missedAt(session, targetId) };
  return {
    correct: true,
    session: settled(
      { ...session, filled: { ...session.filled, [targetId]: chipId } },
      concept,
      erased.length,
    ),
  };
}

/**
 * 빈칸에 답을 써넣는다 — 카드 풀이의 4단계(칩이 없다). 견주는 규칙은 `fadingTypedOutcome` 하나다.
 * - `correct` 채워진다.
 * - `wrong` 그 개념의 다른 답 · 함정의 글이다 — 빈칸은 그대로 남고 «틀림»이 적힌다(화면은 그 자리에서 `miss` 를 보낸다). 다시 쓸 수 있다.
 * - `unknown` 어느 답의 글도 아니다 — 받아 두고 채워진 것으로 친다. 🔴 그 자리에서 맞다 · 틀리다를 보이지 않는다 —
 *   단계를 다 마친 뒤(서버에 `step` 을 보낸 뒤) 기준안과 나란히 놓고 학생이 «같은 뜻 / 다름»을 고른다.
 * 견줄 글자가 없는 글은 받지 않는다(던진다).
 */
export function placeText(
  session: FadingSession,
  concept: FadingConcept,
  targetId: string,
  text: string,
  traps?: readonly FadingTrap[],
): { session: FadingSession; outcome: FadingOutcome } {
  if (session.phase === "filling" && fadingStepInput(session) !== "typed")
    throw new Error("이 단계는 칩으로 채웁니다.");
  const erased = openBlanks(session, concept, targetId);
  const outcome = fadingTypedOutcome(concept, targetId, text, traps);
  const typed = { ...session, typed: { ...session.typed, [targetId]: text } };
  if (outcome === "wrong")
    return { outcome, session: missedAt(typed, targetId) };
  const filled = { ...typed, filled: { ...typed.filled, [targetId]: text } };
  return {
    outcome,
    session: settled(
      outcome === "unknown"
        ? { ...filled, pending: [...(filled.pending ?? []), targetId] }
        : filled,
      concept,
      erased.length,
    ),
  };
}

/** 넣은 것 하나 — 칩을 골랐거나 글을 썼다. 요청의 계약(`fadingPlacementSchema`)과 같은 꼴이다. */
export type FadingAnswer =
  { targetId: string; chipId: string } | { targetId: string; text: string };

/** 넣은 것 하나를 풀이에 적용한다 — 칩이든 글이든. 화면의 채점과 서버의 다시 돌리기가 이 함수를 같이 쓴다. */
export function placeAnswer(
  session: FadingSession,
  concept: FadingConcept,
  answer: FadingAnswer,
  traps?: readonly FadingTrap[],
): { session: FadingSession; outcome: FadingOutcome } {
  if ("text" in answer)
    return placeText(session, concept, answer.targetId, answer.text, traps);
  const placed = placeChip(
    session,
    concept,
    answer.targetId,
    answer.chipId,
    traps,
  );
  return {
    session: placed.session,
    outcome: placed.correct ? "correct" : "wrong",
  };
}

/** 단계를 마친다 — 결과를 적고 다음 단계로, 4단계였으면 평가 차례로. */
function finishStep(
  session: FadingSession,
  concept: FadingConcept,
  blanks: number,
  missed: string[] = session.missed,
): FadingSession {
  const typedStep = fadingStepInput(session) === "typed";
  const order = erasedTargets(concept, session.step).map((t) => t.id);
  const result: FadingStepResult = {
    step: session.step,
    blanks,
    // 칩 단계는 틀린 차례 그대로(지금까지의 꼴), 자판 단계는 빈칸 차례 — 카드를 넘기며 적힌 틀림이 섞여 있다.
    missed: typedStep ? order.filter((id) => missed.includes(id)) : missed,
  };
  if (typedStep) {
    const pending = new Set(session.pending ?? []);
    result.unjudged = order
      .filter((id) => pending.has(id) && !missed.includes(id))
      .map((id) => ({ targetId: id, text: session.filled[id]! }));
    result.answers = Object.fromEntries(
      order.flatMap((id) =>
        session.typed?.[id] === undefined ? [] : [[id, session.typed[id]]],
      ),
    );
  }
  const cleared: FadingSession = {
    ...session,
    filled: {},
    missed: [],
    results: [...session.results, result],
  };
  delete cleared.typed;
  delete cleared.pending;
  delete cleared.skipped;
  return session.step === 4
    ? { ...cleared, phase: "rating" }
    : { ...cleared, step: (session.step + 1) as FadingStep };
}

/** «아직 모르겠어요» — 아직 못 채운 빈칸을 전부 틀림으로 두고 그 단계를 마친다. */
export function giveUpStep(
  session: FadingSession,
  concept: FadingConcept,
): FadingSession {
  if (session.conceptId !== concept.id)
    throw new Error("이 풀이의 개념이 아닙니다.");
  if (session.phase !== "filling")
    throw new Error("빈칸을 채우는 단계가 아닙니다.");
  const erased = erasedTargets(concept, session.step);
  return finishStep(
    session.step === 4 ? { ...session, gaveUpAtFour: true } : session,
    concept,
    erased.length,
    erased
      .filter((t) => !(t.id in session.filled) || session.missed.includes(t.id))
      .map((t) => t.id),
  );
}

/**
 * 카드 하나의 «아직 모르겠어요» — 자판으로 푸는 단계에서, 그 카드(명제)의 아직 못 채운 빈칸을 틀림으로 두고 넘긴다.
 * 답은 보이지 않는다(기준안은 단계를 다 마친 뒤에 연다). 남은 빈칸이 없으면 단계를 마친다 — 서버에는 `gaveUp` 으로 보낸다.
 */
export function giveUpCard(
  session: FadingSession,
  concept: FadingConcept,
  propositionId: string,
): FadingSession {
  if (session.conceptId !== concept.id)
    throw new Error("이 풀이의 개념이 아닙니다.");
  if (session.phase !== "filling" || fadingStepInput(session) !== "typed")
    throw new Error("답을 쓰는 단계가 아닙니다.");
  const proposition = concept.propositions.find((p) => p.id === propositionId);
  if (!proposition)
    throw new Error(`이 개념에 없는 카드입니다: ${propositionId}`);
  const erased = erasedTargets(concept, session.step);
  const mine = new Set(
    fadingTargets({ ...concept, propositions: [proposition] }).map((t) => t.id),
  );
  const open = erased
    .filter((t) => mine.has(t.id))
    .filter((t) => !(t.id in session.filled))
    .filter((t) => !session.skipped?.includes(t.id))
    .map((t) => t.id);
  if (!open.length) return session;
  return settled(
    {
      ...session,
      gaveUpAtFour: true,
      missed: [
        ...session.missed,
        ...open.filter((id) => !session.missed.includes(id)),
      ],
      skipped: [...(session.skipped ?? []), ...open],
    },
    concept,
    erased.length,
  );
}

/** 대조를 기다리는 것을 전부 골랐는가 — 고른 것 밖의 빈칸이 섞여 있으면 `false` 다. */
export function fadingJudgingComplete(
  unjudged: readonly StoredFadingUnjudged[],
  judged: FadingJudged = {},
): boolean {
  const waiting = new Set(unjudged.map((u) => u.targetId));
  const keys = Object.keys(judged);
  return (
    keys.length === waiting.size &&
    keys.every((id) => waiting.has(id)) &&
    Object.values(judged).every((j) => j === "same" || j === "different")
  );
}

/** 부분 틀림 «어려움»의 간격 상한(날) — 결정 1 의 초기 운영 완충이다(자료로 맞춘 값이 아니다). */
export const FADING_PARTIAL_HARD_MAX_DAYS = 2;

/**
 * 부분 틀림 «어려움»을 가르는 재료(결정 1) — 서버(`state.ts`)와 화면이 같은 값을 넘긴다.
 * 주지 않으면 지금까지의 규칙이다(4단계에서 틀리면 «다시»뿐).
 */
export type FadingRatingContext = {
  /** 카드 풀이인가 — 칩 풀이에는 예외가 없다. */
  cards: boolean;
  /** 이 풀이의 4단계에서 «아직 모르겠어요»를 고른 적이 있는가 — 모르면(`undefined` · 칸이 없는 옛 풀이) 예외가 없다. */
  gaveUp: boolean | undefined;
  /** 그 4단계를 푼 **지금 내용**의 빈칸 — N 은 그 수다. 틀린 빈칸이 여기 없으면(내용이 바뀌었다) 예외가 없다. */
  blanks: readonly string[];
};

type FadingFourOutcome = {
  missedAtFour: readonly string[];
  unjudged?: readonly StoredFadingUnjudged[];
};

/** 4단계의 «다시»를 건 빈칸 — 틀린 빈칸(포기 포함) ∪ 대조에서 «다름»으로 고른 빈칸, 고유하게. */
function failedAtFour(
  outcome: FadingFourOutcome,
  judged: FadingJudged,
): Set<string> {
  return new Set([
    ...outcome.missedAtFour,
    ...(outcome.unjudged ?? [])
      .filter((u) => judged[u.targetId] === "different")
      .map((u) => u.targetId),
  ]);
}

/**
 * 결정 1 — 4단계의 부분 틀림인가: 카드 풀이 · 포기 없음이 적힘 · N ≥ 4 · 1 ≤ M ≤ ⌊N/4⌋ · 틀린 빈칸이 전부 지금 내용에 있다.
 * N 은 그 4단계 풀이의 빈칸 수, M 은 한 번이라도 틀린 빈칸 ∪ «다름» 빈칸의 고유 개수다(되풀이 횟수를 더하지 않는다).
 * 대조를 아직 다 고르지 않았으면 고른 것까지만 본다 — «어려움»을 받는 쪽이 «다 골랐는가»를 따로 본다.
 */
export function fadingPartialMiss(
  outcome: FadingFourOutcome,
  judged: FadingJudged = {},
  context?: FadingRatingContext,
): boolean {
  if (!context?.cards || context.gaveUp !== false) return false;
  const failed = failedAtFour(outcome, judged);
  const limit = Math.floor(context.blanks.length / 4);
  return (
    failed.size >= 1 &&
    failed.size <= limit &&
    [...failed].every((id) => context.blanks.includes(id))
  );
}

/**
 * 4단계의 결과와 대조로 고를 수 있는 평가 — 틀림(«아직 모르겠어요» 포함)이 있거나 «다름»을 하나라도 골랐으면 «다시»뿐이다.
 * 결정 1: 문맥(`context`)을 주었고 부분 틀림이면(`fadingPartialMiss`) «다시 · 어려움»이다.
 * 대조를 아직 다 고르지 않았으면 고른 것까지만 보고 낸다(평가를 받는 쪽이 «다 골랐는가»를 따로 본다).
 * 확신 · 사전 확인은 여기 들어오지 않는다 — 진단은 평가를 바꾸지 않는다.
 */
export function fadingRatingsAfterJudging(
  outcome: FadingFourOutcome,
  judged: FadingJudged = {},
  context?: FadingRatingContext,
): FsrsRating[] {
  if (!failedAtFour(outcome, judged).size) return [...FSRS_RATINGS];
  return fadingPartialMiss(outcome, judged, context)
    ? ["again", "hard"]
    : ["again"];
}

/** 화면의 풀이에서 부분 틀림 판정의 문맥 — 개념(지금 내용)을 주어야 선다. 주지 않으면 지금까지의 규칙이다. */
export function fadingSessionRatingContext(
  session: FadingSession,
  concept?: FadingConcept,
): FadingRatingContext | undefined {
  if (!concept || concept.id !== session.conceptId) return undefined;
  return {
    cards: fadingModeOf(session) === "cards",
    gaveUp: session.gaveUpAtFour,
    blanks: erasedTargets(concept, 4).map((t) => t.id),
  };
}

/**
 * 지금 고를 수 있는 평가 — 4단계를 마치기 전에는 없고, 4단계에서 틀렸거나 대조에서 «다름»을 골랐으면 «다시»뿐이다.
 * 개념(지금 내용)을 주면 결정 1 의 부분 틀림 «어려움»까지 본다.
 */
export function allowedRatings(
  session: FadingSession,
  judged?: FadingJudged,
  concept?: FadingConcept,
): FsrsRating[] {
  if (session.phase !== "rating") return [];
  const last = session.results.at(-1);
  return fadingRatingsAfterJudging(
    { missedAtFour: last?.missed ?? [], unjudged: last?.unjudged },
    judged,
    fadingSessionRatingContext(session, concept),
  );
}

/** 지금 판정으로 부분 틀림인가 — 화면이 «어려움»에 적는 날 수를 2일로 자를 때 쓴다(서버의 미리 보기는 대조 전 값이다). */
export function sessionPartialMiss(
  session: FadingSession,
  judged?: FadingJudged,
  concept?: FadingConcept,
): boolean {
  if (session.phase !== "rating") return false;
  const last = session.results.at(-1);
  return fadingPartialMiss(
    { missedAtFour: last?.missed ?? [], unjudged: last?.unjudged },
    judged,
    fadingSessionRatingContext(session, concept),
  );
}

/**
 * 풀이를 평가로 닫는다. 대조를 기다리는 것이 있고 틀림이 없으면 그것을 다 골라야 닫힌다(고른 것이 평가를 정한다).
 * 틀림이 있으면 대조는 진단일 뿐이라 «다시»는 고르지 않아도 닫힌다. 결정 1 의 «어려움»은 대조를 다 골라야 닫힌다.
 */
export function closeWithRating(
  session: FadingSession,
  rating: FsrsRating,
  judged?: FadingJudged,
  concept?: FadingConcept,
): FadingSession {
  const last = session.results.at(-1);
  const waiting = last?.unjudged ?? [];
  if (
    session.phase === "rating" &&
    (!last?.missed.length || rating !== "again") &&
    waiting.length &&
    !fadingJudgingComplete(waiting, judged)
  )
    throw new Error("기준안과 대조할 답을 다 골라 주세요.");
  if (!allowedRatings(session, judged, concept).includes(rating))
    throw new Error("지금은 고를 수 없는 평가입니다.");
  return { ...session, phase: "done", rating };
}

/** «다시» 뒤에 서는 단계 — 시작한 단계보다 한 단계 앞, 2단계까지. */
export function stepAfterLapse(startStep: FadingStep): FadingStep {
  return Math.max(2, startStep - 1) as FadingStep;
}

/** 이 풀이를 지금 닫으면 그 개념이 서는 단계 — 평가 전에는 풀던 단계다(평가만 남았으면 4단계). */
export function standingStepAfter(session: FadingSession): FadingStep {
  if (session.phase !== "done") return session.step;
  return session.rating === "again" ? stepAfterLapse(session.startStep) : 4;
}
