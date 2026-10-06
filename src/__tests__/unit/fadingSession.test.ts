import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { chipFits, chipTray, type FadingTrap } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { FSRS_RATINGS } from "@/lib/fading/fsrs";
import {
  allowedRatings,
  finishReading,
  giveUpStep,
  placeChip,
  closeWithRating,
  standingStepAfter,
  startFadingSession,
  type FadingSession,
} from "@/lib/fading/session";

const ENTRIES: ConceptEntry[] = (
  [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ] as const
).map((definition, i): ConceptEntry => ({
  id: `t${i + 1}`,
  section: "중2::4. 삼각형의 성질::삼각형의 외심",
  term: `용어 ${i + 1}`,
  kind: "정의",
  level: "하",
  definition,
}));
const CONCEPT: FadingConcept = buildFadingConcepts(
  ENTRIES,
  proposeFadingGroups(ENTRIES),
)[0]!;
const SEED = 20_000;

/** 지금 단계의 빈칸 하나에 맞는 칩(아직 안 쓴 것)을 넣는다. */
function fillOne(
  session: FadingSession,
  concept: FadingConcept,
  targetId: string,
  traps?: readonly FadingTrap[],
) {
  const used = new Set(Object.values(session.filled));
  const chip = chipTray(concept, session.step, {
    seed: session.seed,
    traps,
  }).find((c) => !used.has(c.id) && chipFits(concept, targetId, c))!;
  return placeChip(session, concept, targetId, chip.id, traps);
}

/** 지금 단계를 하나도 안 틀리고 끝낸다. */
function fillStep(session: FadingSession, concept: FadingConcept) {
  const { step, phase } = session;
  for (const target of erasedTargets(concept, step)) {
    const placed = fillOne(session, concept, target.id);
    expect(placed.correct).toBe(true);
    session = placed.session;
  }
  // 단계가 나아가지 않으면 여기서 멈춘다 — 부르는 쪽의 반복문이 끝없이 돌지 않게.
  if (session.step === step && session.phase === phase)
    throw new Error("빈칸을 다 채웠는데 단계가 그대로다");
  return session;
}

/** 지금 단계의 첫 빈칸에 맞지 않는 칩을 넣는다. */
function missOnce(session: FadingSession, concept: FadingConcept) {
  const target = erasedTargets(concept, session.step)[0]!;
  const wrong = chipTray(concept, session.step, { seed: session.seed }).find(
    (c) => !chipFits(concept, target.id, c),
  )!;
  return { target, placed: placeChip(session, concept, target.id, wrong.id) };
}

function playTo(step: FadingStep, standing: FadingStep = 1) {
  let session = startFadingSession(CONCEPT, standing, SEED);
  if (session.phase === "reading") session = finishReading(session);
  while (session.step < step) session = fillStep(session, CONCEPT);
  return session;
}

describe("풀이 — 서 있는 단계에서 4단계까지 한 자리에서", () => {
  it("새 개념은 1단계 정독에서 시작하고, 읽으면 2단계로 간다", () => {
    const session = startFadingSession(CONCEPT, 1, SEED);
    expect(session).toMatchObject({
      conceptId: "t1",
      startStep: 1,
      step: 1,
      phase: "reading",
      results: [],
      rating: null,
    });
    expect(finishReading(session)).toMatchObject({ step: 2, phase: "filling" });
  });

  it("복습은 서 있는 단계의 빈칸 채우기에서 바로 시작한다", () => {
    expect(startFadingSession(CONCEPT, 4, SEED)).toMatchObject({
      startStep: 4,
      step: 4,
      phase: "filling",
    });
    expect(startFadingSession(CONCEPT, 3, SEED)).toMatchObject({
      step: 3,
      phase: "filling",
    });
  });

  it("빈칸을 다 채우면 다음 단계로 가고, 4단계를 마치면 평가 차례다", () => {
    let session = playTo(2);
    session = fillStep(session, CONCEPT);
    expect(session).toMatchObject({ step: 3, phase: "filling", filled: {} });
    session = fillStep(session, CONCEPT);
    expect(session).toMatchObject({ step: 4, phase: "filling" });
    session = fillStep(session, CONCEPT);
    expect(session.phase).toBe("rating");
    expect(session.results).toEqual([
      { step: 2, blanks: 2, missed: [] },
      { step: 3, blanks: 3, missed: [] },
      { step: 4, blanks: 5, missed: [] },
    ]);
  });

  it("평가는 4단계를 마친 뒤 한 번이다 — 그 전에는 고를 것이 없다", () => {
    expect(allowedRatings(playTo(3))).toEqual([]);
    const done = fillStep(playTo(4), CONCEPT);
    expect(allowedRatings(done)).toEqual([...FSRS_RATINGS]);
    const rated = closeWithRating(done, "good");
    expect(rated).toMatchObject({ phase: "done", rating: "good" });
    expect(() => closeWithRating(rated, "easy")).toThrow();
    expect(standingStepAfter(rated)).toBe(4);
  });
});

describe("풀이 — 틀리게 넣은 빈칸은 «틀림»으로 남는다", () => {
  it("맞지 않는 칩은 들어가지 않고, 다시 맞게 넣어도 그 빈칸은 틀린 것으로 센다", () => {
    const start = playTo(2);
    const { target, placed } = missOnce(start, CONCEPT);
    expect(placed.correct).toBe(false);
    expect(placed.session.filled).toEqual({});
    expect(placed.session.missed).toEqual([target.id]);
    const again = missOnce(placed.session, CONCEPT);
    expect(again.placed.session.missed).toEqual([target.id]);
    const fixed = fillOne(again.placed.session, CONCEPT, target.id);
    expect(fixed.correct).toBe(true);
    expect(fixed.session.missed).toEqual([target.id]);
    expect(start.missed).toEqual([]);
  });

  it("4단계에서 하나라도 틀리면 평가는 «다시»뿐이고, 시작한 단계보다 한 단계 앞에 선다(2단계까지)", () => {
    const expected: [FadingStep, FadingStep][] = [
      [4, 3],
      [3, 2],
      [2, 2],
      [1, 2],
    ];
    for (const [standing, after] of expected) {
      let session = playTo(4, standing);
      session = missOnce(session, CONCEPT).placed.session;
      session = fillStep(session, CONCEPT);
      expect(session.results.at(-1)!.missed.length).toBe(1);
      expect(allowedRatings(session)).toEqual(["again"]);
      expect(() => closeWithRating(session, "good")).toThrow();
      expect(standingStepAfter(closeWithRating(session, "again"))).toBe(after);
    }
  });

  it("2 · 3단계에서 틀린 것은 평가를 묶지 않는다", () => {
    let session = missOnce(playTo(2), CONCEPT).placed.session;
    session = fillStep(session, CONCEPT);
    session = missOnce(session, CONCEPT).placed.session;
    session = fillStep(fillStep(session, CONCEPT), CONCEPT);
    expect(session.results.map((r) => r.missed.length)).toEqual([1, 1, 0]);
    expect(allowedRatings(session)).toEqual([...FSRS_RATINGS]);
  });

  it("다 맞히고도 «다시»를 고르면 똑같이 한 단계 앞에 선다", () => {
    const session = fillStep(playTo(4, 4), CONCEPT);
    expect(standingStepAfter(closeWithRating(session, "again"))).toBe(3);
    expect(standingStepAfter(closeWithRating(session, "hard"))).toBe(4);
  });

  it("함정 칩도 같은 규칙이다 — 넣으면 틀리고 그 빈칸은 틀림으로 남는다", () => {
    const traps = [{ text: "내심" }];
    const session = playTo(2);
    const target = erasedTargets(CONCEPT, 2)[0]!;
    const trap = chipTray(CONCEPT, 2, { seed: SEED, traps }).find(
      (c) => c.text === "내심",
    )!;
    const placed = placeChip(session, CONCEPT, target.id, trap.id, traps);
    expect(placed.correct).toBe(false);
    expect(placed.session.missed).toEqual([target.id]);
    expect(
      chipTray(CONCEPT, 2, { seed: SEED }).some((c) => c.text === "내심"),
    ).toBe(false);
  });
});

describe("풀이 — «아직 모르겠어요»", () => {
  it("남은 빈칸을 전부 틀림으로 두고 그 단계를 마친다 — 이미 맞게 채운 빈칸은 틀림이 아니다", () => {
    const start = playTo(3);
    const [first, second, third] = erasedTargets(CONCEPT, 3);
    const one = fillOne(start, CONCEPT, first!.id).session;
    const gaveUp = giveUpStep(one, CONCEPT);
    expect(gaveUp).toMatchObject({ step: 4, phase: "filling", filled: {} });
    expect(gaveUp.results.at(-1)).toEqual({
      step: 3,
      blanks: 3,
      missed: [second!.id, third!.id],
    });
    expect(one.results.length).toBe(1);
  });

  it("틀리게 넣었다가 맞힌 빈칸도 틀림으로 남는다", () => {
    const { target, placed } = missOnce(playTo(2), CONCEPT);
    const fixed = fillOne(placed.session, CONCEPT, target.id).session;
    const other = erasedTargets(CONCEPT, 2).find((t) => t.id !== target.id)!;
    expect(giveUpStep(fixed, CONCEPT).results.at(-1)!.missed).toEqual(
      [target.id, other.id].sort(
        (a, b) =>
          erasedTargets(CONCEPT, 2).findIndex((t) => t.id === a) -
          erasedTargets(CONCEPT, 2).findIndex((t) => t.id === b),
      ),
    );
  });

  it("4단계에서 모르겠다고 하면 평가는 «다시»뿐이다", () => {
    const gaveUp = giveUpStep(playTo(4, 4), CONCEPT);
    expect(gaveUp.phase).toBe("rating");
    expect(gaveUp.results.at(-1)!.missed.length).toBe(5);
    expect(allowedRatings(gaveUp)).toEqual(["again"]);
    expect(standingStepAfter(closeWithRating(gaveUp, "again"))).toBe(3);
  });

  it("채우는 단계가 아니면 거절한다", () => {
    expect(() =>
      giveUpStep(startFadingSession(CONCEPT, 1, SEED), CONCEPT),
    ).toThrow();
    expect(() => giveUpStep(fillStep(playTo(4), CONCEPT), CONCEPT)).toThrow();
    expect(() => giveUpStep(playTo(2), { ...CONCEPT, id: "other" })).toThrow();
  });
});

describe("풀이 — 중간에 나가면 그 단계에 선다", () => {
  it("읽다 나가면 1단계, 3단계를 풀다 나가면 3단계, 평가만 남기고 나가면 4단계다", () => {
    expect(standingStepAfter(startFadingSession(CONCEPT, 1, SEED))).toBe(1);
    expect(standingStepAfter(playTo(3))).toBe(3);
    const half = fillOne(
      playTo(3),
      CONCEPT,
      erasedTargets(CONCEPT, 3)[0]!.id,
    ).session;
    expect(standingStepAfter(half)).toBe(3);
    expect(standingStepAfter(fillStep(playTo(4), CONCEPT))).toBe(4);
  });
});

describe("풀이 — 할 수 없는 일은 거절한다", () => {
  it("정독 중에는 칩을 못 넣고, 정독이 아니면 «읽음»을 못 누른다", () => {
    const reading = startFadingSession(CONCEPT, 1, SEED);
    const target = erasedTargets(CONCEPT, 2)[0]!;
    expect(() => placeChip(reading, CONCEPT, target.id, "c1")).toThrow();
    expect(() => finishReading(playTo(2))).toThrow();
    expect(() => closeWithRating(playTo(4), "good")).toThrow();
  });

  it("이 단계의 빈칸이 아닌 자리 · 이미 채운 자리 · 없는 칩 · 이미 쓴 칩을 거절한다", () => {
    const session = playTo(2);
    const erased = erasedTargets(CONCEPT, 2);
    const later = erasedTargets(CONCEPT, 4).find(
      (t) => !erased.some((e) => e.id === t.id),
    )!;
    expect(() => placeChip(session, CONCEPT, later.id, "c1")).toThrow();
    expect(() => placeChip(session, CONCEPT, "nope#1", "c1")).toThrow();
    expect(() => placeChip(session, CONCEPT, erased[0]!.id, "c99")).toThrow();
    const filled = fillOne(session, CONCEPT, erased[0]!.id).session;
    const used = filled.filled[erased[0]!.id]!;
    expect(() => placeChip(filled, CONCEPT, erased[0]!.id, used)).toThrow();
    const spare = chipTray(CONCEPT, 2, { seed: SEED }).find(
      (c) => c.id !== used,
    )!;
    expect(() => placeChip(filled, CONCEPT, erased[0]!.id, spare.id)).toThrow();
    expect(() => placeChip(filled, CONCEPT, erased[1]!.id, used)).toThrow();
  });

  it("다른 개념의 풀이에 이 개념을 대면 거절한다", () => {
    const other = { ...CONCEPT, id: "other" };
    expect(() =>
      placeChip(playTo(2), other, erasedTargets(CONCEPT, 2)[0]!.id, "c1"),
    ).toThrow();
  });
});

describe("풀이 — 은행 전체", () => {
  it("쉰째 개념마다 1단계에서 4단계까지 틀리지 않고 끝낼 수 있다", async () => {
    // 은행은 이 시험에서만 싣는다 — 이 묶음을 건너뛰는 실행(변이 실험의 첫 바퀴)이 9,119문장을 읽지 않게.
    const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
    const { FADING_GROUPS } = await import("@/lib/fading/groups");
    const concepts = buildFadingConcepts(
      CONCEPT_BLANK_BANK.concepts,
      FADING_GROUPS,
    ).filter((_, i) => i % 50 === 0);
    expect(concepts.length).toBeGreaterThan(30);
    for (const concept of concepts) {
      let session = finishReading(startFadingSession(concept, 1, 3));
      while (session.phase === "filling") session = fillStep(session, concept);
      expect(session.phase).toBe("rating");
      expect(session.results.map((r) => r.step)).toEqual([2, 3, 4]);
      expect(allowedRatings(session).length).toBe(4);
    }
  });
});
