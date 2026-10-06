import { chipFits, chipTray, type FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import { erasedTargets, type FadingStep } from "./erasure";
import { FSRS_RATINGS, type FsrsRating } from "./fsrs";

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
 * 모든 함수는 받은 풀이를 바꾸지 않고 새 값을 돌려준다. 화면과 서버가 같은 함수를 쓴다.
 */
export type FadingPhase = "reading" | "filling" | "rating" | "done";

/** 끝낸 단계 하나 — 빈칸 수와, 한 번이라도 틀리게 넣은 빈칸. */
export type FadingStepResult = {
  step: FadingStep;
  blanks: number;
  missed: string[];
};

export type FadingSession = {
  conceptId: string;
  /** 이 풀이를 시작할 때 서 있던 단계. */
  startStep: FadingStep;
  step: FadingStep;
  phase: FadingPhase;
  /** 칩 차례의 씨앗 — 같은 풀이를 다시 열어도 칩이 같은 자리에 놓인다. */
  seed: number;
  /** 지금 단계에서 채운 빈칸 → 넣은 칩의 id. */
  filled: Record<string, string>;
  /** 지금 단계에서 한 번이라도 틀리게 넣은 빈칸. */
  missed: string[];
  results: FadingStepResult[];
  rating: FsrsRating | null;
};

export function startFadingSession(
  concept: FadingConcept,
  standingStep: FadingStep,
  seed: number,
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
  };
}

/** 1단계 정독을 마친다 — 2단계로. */
export function finishReading(session: FadingSession): FadingSession {
  if (session.phase !== "reading") throw new Error("정독 단계가 아닙니다.");
  return { ...session, step: 2, phase: "filling" };
}

/** 빈칸에 칩을 넣는다. 맞으면 채워지고, 틀리면 빈칸은 그대로 남고 «틀림»이 적힌다. */
export function placeChip(
  session: FadingSession,
  concept: FadingConcept,
  targetId: string,
  chipId: string,
  traps?: readonly FadingTrap[],
): { session: FadingSession; correct: boolean } {
  if (session.conceptId !== concept.id)
    throw new Error("이 풀이의 개념이 아닙니다.");
  if (session.phase !== "filling")
    throw new Error("빈칸을 채우는 단계가 아닙니다.");
  const erased = erasedTargets(concept, session.step);
  if (!erased.some((t) => t.id === targetId))
    throw new Error(`이 단계의 빈칸이 아닙니다: ${targetId}`);
  if (targetId in session.filled)
    throw new Error(`이미 채운 빈칸입니다: ${targetId}`);
  const chip = chipTray(concept, session.step, {
    seed: session.seed,
    traps,
  }).find((c) => c.id === chipId);
  if (!chip) throw new Error(`이 단계에 없는 칩입니다: ${chipId}`);
  if (Object.values(session.filled).includes(chipId))
    throw new Error(`이미 쓴 칩입니다: ${chipId}`);

  if (!chipFits(concept, targetId, chip))
    return {
      correct: false,
      session: session.missed.includes(targetId)
        ? session
        : { ...session, missed: [...session.missed, targetId] },
    };

  const filled = { ...session.filled, [targetId]: chipId };
  return {
    correct: true,
    session:
      Object.keys(filled).length < erased.length
        ? { ...session, filled }
        : finishStep(session, erased.length, session.missed),
  };
}

/** 단계를 마친다 — 결과를 적고 다음 단계로, 4단계였으면 평가 차례로. */
function finishStep(
  session: FadingSession,
  blanks: number,
  missed: string[],
): FadingSession {
  const cleared = {
    ...session,
    filled: {},
    missed: [],
    results: [...session.results, { step: session.step, blanks, missed }],
  };
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
    session,
    erased.length,
    erased
      .filter((t) => !(t.id in session.filled) || session.missed.includes(t.id))
      .map((t) => t.id),
  );
}

/** 지금 고를 수 있는 평가 — 4단계를 마치기 전에는 없고, 4단계에서 틀렸으면 «다시»뿐이다. */
export function allowedRatings(session: FadingSession): FsrsRating[] {
  if (session.phase !== "rating") return [];
  const last = session.results.at(-1);
  return last?.missed.length ? ["again"] : [...FSRS_RATINGS];
}

/** 풀이를 평가로 닫는다. */
export function closeWithRating(
  session: FadingSession,
  rating: FsrsRating,
): FadingSession {
  if (!allowedRatings(session).includes(rating))
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
