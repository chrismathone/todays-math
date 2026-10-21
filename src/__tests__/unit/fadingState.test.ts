import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_RECEIPTS_MAX,
  FADING_STORED_DAYS_MAX,
  FADING_TARGETS_MAX,
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { fsrsPreview } from "@/lib/fading/fsrs";
import { FADING_DAYS_KEPT } from "@/lib/fading/numbers";
import {
  FadingConflict,
  completeFadingReading,
  completeFadingStep,
  dropFadingConcept,
  emptyFading,
  fadingContentChanged,
  fadingRatingsFor,
  fadingSummary,
  giveUpFadingCard,
  openFadingSession,
  pickFadingConcept,
  rateFadingSession,
  reportFadingMiss,
  setFadingAllToday,
} from "@/lib/fading/state";
import { updateExpedition } from "@/lib/math-explorers/expedition";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

function concept(id: string, first = "수직이등분선"): FadingConcept {
  const entries: ConceptEntry[] = [
    `외심은 세 변의 {${first}}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.`,
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ].map((definition, i) => ({
    id: `${id}${i + 1}`,
    section: "중2::4. 삼각형의 성질::삼각형의 외심",
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}
const A = concept("a");
const B = concept("b");
const DAY1 = "2026-10-06";
const SEED = 77;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
/** 풀이의 번호 — 개념마다 · 여는 차례마다 다르게. */
const S = { a1: uuid(101), a2: uuid(102), a3: uuid(103), b1: uuid(201) };
const R = [uuid(1), uuid(2), uuid(3), uuid(4)] as const;

/** 저장 칸은 옮길 때마다 계약을 지나야 한다. */
function valid(state: StoredFading): StoredFading {
  return storedFadingSchema.parse(state);
}

/** 그 단계를 안 틀리고 채우는 «넣기»의 차례. `miss` 면 첫 빈칸에 맞지 않는 칩을 먼저 한 번 넣는다. */
function placements(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  miss = false,
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  const moves: FadingPlacement[] = [];
  for (const [i, target] of erasedTargets(c, step).entries()) {
    if (miss && i === 0)
      moves.push({
        targetId: target.id,
        chipId: tray.find((chip) => !chipFits(c, target.id, chip))!.id,
      });
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    moves.push({ targetId: target.id, chipId: chip.id });
  }
  return moves;
}

const open = (state: StoredFading, c: FadingConcept, day: string, id: string) =>
  openFadingSession(state, c, day, { sessionId: id, seed: SEED });

/** 새 개념을 열어 4단계까지 마친다(평가 직전). */
function learned(
  state: StoredFading,
  c: FadingConcept,
  day: string,
  sessionId: string,
) {
  state = open(state, c, day, sessionId);
  state = completeFadingReading(state, c.id, sessionId);
  for (const step of [2, 3, 4] as const)
    state = completeFadingStep(
      state,
      c,
      sessionId,
      step,
      placements(c, step, SEED),
    );
  return valid(state);
}

/** A 를 첫날 배워 «알맞음»으로 닫은 칸. */
const ratedA = () =>
  rateFadingSession(
    learned(emptyFading(), A, DAY1, S.a1),
    A,
    S.a1,
    "good",
    DAY1,
    R[0],
  );

describe("저장 칸 — 빈 꼴과 개념 고르기", () => {
  it("빈 칸은 계약을 지난다", () => {
    expect(valid(emptyFading())).toEqual({
      version: 1,
      concepts: {},
      session: null,
      days: [],
      streak: { current: 0, best: 0, lastOn: null },
      allOn: null,
      receipts: [],
    });
  });

  it("고른 개념은 1단계에 서고 기억 값이 없다 — 또 골라도 그대로다", () => {
    const picked = valid(pickFadingConcept(emptyFading(), A.id, DAY1));
    expect(picked.concepts[A.id]).toEqual({
      step: 1,
      stability: null,
      difficulty: null,
      reviewedOn: null,
      dueOn: null,
      digest: null,
      reviews: 0,
      lapses: 0,
      addedOn: DAY1,
    });
    expect(pickFadingConcept(picked, A.id, "2026-10-09")).toBe(picked);
  });

  it("평가 전인 개념은 뺄 수 있고, 평가한 개념은 못 뺀다", () => {
    const picked = pickFadingConcept(emptyFading(), A.id, DAY1);
    expect(valid(dropFadingConcept(picked, A.id)).concepts).toEqual({});
    expect(dropFadingConcept(picked, B.id)).toBe(picked);
    const opened = open(picked, A, DAY1, S.a1);
    expect(valid(dropFadingConcept(opened, A.id))).toMatchObject({
      concepts: {},
      session: null,
    });
    const withB = pickFadingConcept(opened, B.id, DAY1);
    expect(valid(dropFadingConcept(withB, B.id)).session).toEqual(
      opened.session,
    );
    expect(() => dropFadingConcept(ratedA(), A.id)).toThrow(FadingConflict);
  });
});

describe("저장 칸 — 풀이를 열고 단계를 마친다", () => {
  it("풀이를 열면 번호 · 서 있는 단계 · 씨앗이 적힌다 — 고르지 않은 개념은 같이 고른다", () => {
    const opened = valid(open(emptyFading(), A, DAY1, S.a1));
    expect(opened.concepts[A.id]).toMatchObject({ step: 1, addedOn: DAY1 });
    expect(opened.session).toEqual({
      id: S.a1,
      conceptId: A.id,
      startStep: 1,
      seed: SEED,
      phase: "steps",
      missedAtFour: [],
    });
  });

  it("같은 개념을 다시 열면 그대로다(번호도 씨앗도) — 다른 개념을 열면 풀이가 바뀐다", () => {
    const opened = open(emptyFading(), A, DAY1, S.a1);
    expect(
      openFadingSession(opened, A, DAY1, { sessionId: S.a2, seed: 5 }),
    ).toBe(opened);
    const other = valid(
      openFadingSession(opened, B, DAY1, { sessionId: S.b1, seed: 9 }),
    );
    expect(other.session).toMatchObject({ id: S.b1, conceptId: B.id, seed: 9 });
    expect(other.concepts[A.id]!.step).toBe(1);
  });

  it("복습일이 안 된 개념의 풀이는 열지 않는다 — 그날이 되면 열린다", () => {
    const rated = ratedA();
    expect(() => open(rated, A, DAY1, S.a2)).toThrow(FadingConflict);
    expect(() => open(rated, A, "2026-10-08", S.a2)).toThrow(FadingConflict);
    expect(open(rated, A, "2026-10-09", S.a2).session).toMatchObject({
      id: S.a2,
      startStep: 4,
    });
    expect(open(rated, A, "2026-10-20", S.a2).session!.id).toBe(S.a2);
  });

  it("정독을 마치면 2단계에 선다 — 같은 요청이 또 와도 그대로다", () => {
    const opened = open(emptyFading(), A, DAY1, S.a1);
    const read = valid(completeFadingReading(opened, A.id, S.a1));
    expect(read.concepts[A.id]!.step).toBe(2);
    expect(completeFadingReading(read, A.id, S.a1)).toBe(read);
  });

  it("열려 있지 않은 풀이 · 다른 개념 · 다른 번호의 요청을 거절한다", () => {
    const opened = pickFadingConcept(
      open(emptyFading(), A, DAY1, S.a1),
      B.id,
      DAY1,
    );
    expect(() => completeFadingReading(emptyFading(), A.id, S.a1)).toThrow(
      FadingConflict,
    );
    expect(() => completeFadingReading(opened, B.id, S.a1)).toThrow(
      FadingConflict,
    );
    expect(() => completeFadingReading(opened, A.id, S.a2)).toThrow(
      FadingConflict,
    );
    const read = completeFadingReading(opened, A.id, S.a1);
    expect(() =>
      completeFadingStep(read, A, S.a2, 2, placements(A, 2, SEED)),
    ).toThrow(FadingConflict);
    expect(() => completeFadingStep(read, B, S.a1, 1, [])).toThrow(
      FadingConflict,
    );
  });

  it("단계를 다 채워 보내면 다음 단계에 선다 — 중간에 나가면 거기까지만 반영돼 있다", () => {
    let state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    state = valid(
      completeFadingStep(state, A, S.a1, 2, placements(A, 2, SEED)),
    );
    expect(state.concepts[A.id]!.step).toBe(3);
    expect(state.session).toMatchObject({ phase: "steps", missedAtFour: [] });
    state = valid(
      completeFadingStep(state, A, S.a1, 3, placements(A, 3, SEED)),
    );
    expect(state.concepts[A.id]).toMatchObject({ step: 4, reviews: 0 });
    // 다음 날 다시 열면 풀이는 그대로 이어진다(4단계에서).
    expect(open(state, A, "2026-10-07", S.a2)).toBe(state);
  });

  it("이미 지난 단계의 요청은 그대로 두고, 건너뛴 단계와 덜 채운 단계는 거절한다", () => {
    let state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    expect(() =>
      completeFadingStep(state, A, S.a1, 3, placements(A, 3, SEED)),
    ).toThrow(FadingConflict);
    expect(() =>
      completeFadingStep(state, A, S.a1, 2, placements(A, 2, SEED).slice(0, 1)),
    ).toThrow(FadingConflict);
    state = completeFadingStep(state, A, S.a1, 2, placements(A, 2, SEED));
    expect(completeFadingStep(state, A, S.a1, 2, placements(A, 2, SEED))).toBe(
      state,
    );
  });

  it("없는 칩 · 이 단계의 빈칸이 아닌 자리 · 다 채운 뒤의 넣기를 거절한다", () => {
    const state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    const good = placements(A, 2, SEED);
    const later = erasedTargets(A, 4).find(
      (t) => !erasedTargets(A, 2).some((e) => e.id === t.id),
    )!;
    for (const bad of [
      [{ targetId: good[0]!.targetId, chipId: "c99" }, ...good],
      [{ targetId: later.id, chipId: "c1" }, ...good],
      [...good, good[0]!],
    ])
      expect(() => completeFadingStep(state, A, S.a1, 2, bad)).toThrow(
        FadingConflict,
      );
  });

  it("1단계는 «넣기»로도 «모르겠어요»로도 마칠 수 없다 — 읽어야 한다", () => {
    const opened = open(emptyFading(), A, DAY1, S.a1);
    expect(() => completeFadingStep(opened, A, S.a1, 1, [])).toThrow(
      FadingConflict,
    );
    expect(() =>
      completeFadingStep(opened, A, S.a1, 1, [], { gaveUp: true }),
    ).toThrow(FadingConflict);
  });

  it("«아직 모르겠어요»는 남은 빈칸을 틀림으로 두고 그 단계를 마친다", () => {
    let state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    state = valid(completeFadingStep(state, A, S.a1, 2, [], { gaveUp: true }));
    expect(state.concepts[A.id]!.step).toBe(3);
    state = completeFadingStep(state, A, S.a1, 3, placements(A, 3, SEED));
    const some = placements(A, 4, SEED).slice(0, 2);
    state = valid(
      completeFadingStep(state, A, S.a1, 4, some, { gaveUp: true }),
    );
    expect(state.session).toMatchObject({ phase: "rating" });
    expect(state.session!.missedAtFour).toEqual(
      erasedTargets(A, 4)
        .map((t) => t.id)
        .filter((id) => !some.some((p) => p.targetId === id)),
    );
    expect(fadingRatingsFor(state.session!)).toEqual(["again"]);
  });

  it("4단계를 마치면 틀린 빈칸이 적히고 평가만 남는다 — 같은 요청이 또 와도 그대로다", () => {
    const clean = learned(emptyFading(), A, DAY1, S.a1);
    expect(clean.session).toMatchObject({
      startStep: 1,
      phase: "rating",
      missedAtFour: [],
    });
    expect(clean.concepts[A.id]).toMatchObject({ step: 4, reviews: 0 });
    expect(fadingRatingsFor(clean.session!)).toEqual([
      "again",
      "hard",
      "good",
      "easy",
    ]);
    expect(completeFadingStep(clean, A, S.a1, 4, placements(A, 4, SEED))).toBe(
      clean,
    );

    let missed = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    expect(fadingRatingsFor(missed.session!)).toEqual([]);
    for (const step of [2, 3] as const)
      missed = completeFadingStep(
        missed,
        A,
        S.a1,
        step,
        placements(A, step, SEED),
      );
    missed = valid(
      completeFadingStep(missed, A, S.a1, 4, placements(A, 4, SEED, true)),
    );
    expect(missed.session!.missedAtFour).toEqual([erasedTargets(A, 4)[0]!.id]);
  });
});

describe("저장 칸 — 4단계의 틀림은 그 자리에서 적는다", () => {
  const atFour = () => {
    let state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    for (const step of [2, 3] as const)
      state = completeFadingStep(
        state,
        A,
        S.a1,
        step,
        placements(A, step, SEED),
      );
    return state;
  };
  const wrong = placements(A, 4, SEED, true)[0]!;

  it("틀리게 넣은 것을 알리면 그 빈칸이 적힌다 — 같은 빈칸은 한 번만", () => {
    const reported = valid(reportFadingMiss(atFour(), A, S.a1, wrong));
    expect(reported.session!.missedAtFour).toEqual([wrong.targetId]);
    expect(reportFadingMiss(reported, A, S.a1, wrong)).toBe(reported);
  });

  it("새로고침 뒤 안 틀리고 다시 채워 보내도 적어 둔 틀림은 남는다 — 평가는 «다시»뿐이다", () => {
    const reported = reportFadingMiss(atFour(), A, S.a1, wrong);
    const done = valid(
      completeFadingStep(reported, A, S.a1, 4, placements(A, 4, SEED)),
    );
    expect(done.session).toMatchObject({
      phase: "rating",
      missedAtFour: [wrong.targetId],
    });
    expect(() => rateFadingSession(done, A, S.a1, "good", DAY1, R[0])).toThrow(
      FadingConflict,
    );
  });

  it("맞게 넣은 것 · 없는 칩 · 없는 빈칸 · 4단계가 아닌 때 · 다른 번호는 거절한다", () => {
    const state = atFour();
    const right = placements(A, 4, SEED)[0]!;
    expect(() => reportFadingMiss(state, A, S.a1, right)).toThrow(
      FadingConflict,
    );
    expect(() =>
      reportFadingMiss(state, A, S.a1, { ...wrong, chipId: "c99" }),
    ).toThrow(FadingConflict);
    expect(() =>
      reportFadingMiss(state, A, S.a1, { ...wrong, targetId: "nope#1" }),
    ).toThrow(FadingConflict);
    expect(() => reportFadingMiss(state, A, S.a2, wrong)).toThrow(
      FadingConflict,
    );
    const early = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    expect(() => reportFadingMiss(early, A, S.a1, wrong)).toThrow(
      FadingConflict,
    );
    const done = completeFadingStep(state, A, S.a1, 4, placements(A, 4, SEED));
    expect(() => reportFadingMiss(done, A, S.a1, wrong)).toThrow(
      FadingConflict,
    );
  });
});

describe("저장 칸 — 4단계 카드의 «아직 모르겠어요»는 그 자리에서 적는다(D2)", () => {
  /** 카드 풀이로 열어 4단계(자판)에 선 칸. */
  const atFourTyped = () => {
    let state = completeFadingReading(
      openFadingSession(
        emptyFading(),
        A,
        DAY1,
        { sessionId: S.a1, seed: SEED },
        { cards: true },
      ),
      A.id,
      S.a1,
    );
    for (const step of [2, 3] as const)
      state = completeFadingStep(
        state,
        A,
        S.a1,
        step,
        placements(A, step, SEED),
      );
    return state;
  };
  const first = A.propositions[0]!;
  const mine = erasedTargets(A, 4)
    .filter((t) => t.id.startsWith(`${first.id}#`))
    .map((t) => t.id);
  const right = (id: string) => ({
    targetId: id,
    text: erasedTargets(A, 4).find((t) => t.id === id)!.text,
  });
  const other = (id: string) => ({
    targetId: id,
    text: erasedTargets(A, 4).find((t) => t.id !== id)!.text,
  });

  it("부분 입력 뒤 포기하면 그 카드의 아직 못 채운 빈칸만 틀림으로 적힌다 — 다른 카드는 그대로", () => {
    expect(mine.length).toBeGreaterThan(1);
    const given = valid(
      giveUpFadingCard(atFourTyped(), A, S.a1, first.id, [right(mine[0]!)]),
    );
    expect(given.session).toMatchObject({
      phase: "steps",
      missedAtFour: mine.slice(1),
    });
    expect(given.concepts[A.id]!.step).toBe(4);
  });

  it("어느 답의 글도 아닌 입력은 채운 것으로 쳐서 포기해도 틀림이 아니다", () => {
    const given = giveUpFadingCard(atFourTyped(), A, S.a1, first.id, [
      { targetId: mine[0]!, text: "전혀 다른 설명" },
    ]);
    expect(given.session!.missedAtFour).toEqual(mine.slice(1));
  });

  it("그 자리에서 적어 둔 틀림은 남고, 틀리게 쓴 뒤 포기한 빈칸은 한 번만 적힌다", () => {
    const wrong = other(mine[0]!);
    const reported = reportFadingMiss(atFourTyped(), A, S.a1, wrong);
    expect(reported.session!.missedAtFour).toEqual([mine[0]]);
    const given = valid(giveUpFadingCard(reported, A, S.a1, first.id, [wrong]));
    expect(given.session!.missedAtFour).toEqual(mine);
  });

  it("같은 요청이 다시 오면 그대로다 — 다 채운 카드의 포기도 그대로다", () => {
    const given = giveUpFadingCard(atFourTyped(), A, S.a1, first.id, []);
    expect(giveUpFadingCard(given, A, S.a1, first.id, [])).toBe(given);
    const filled = atFourTyped();
    expect(giveUpFadingCard(filled, A, S.a1, first.id, mine.map(right))).toBe(
      filled,
    );
  });

  it("마지막 카드까지 포기하고 단계를 마치면 틀림이 표적 차례로 합쳐지고 평가는 «다시»뿐이다", () => {
    let state = atFourTyped();
    for (const p of A.propositions)
      state = giveUpFadingCard(state, A, S.a1, p.id, []);
    const all = erasedTargets(A, 4).map((t) => t.id);
    expect(state.session!.missedAtFour).toEqual(all);
    const done = valid(
      completeFadingStep(state, A, S.a1, 4, [], { gaveUp: true }),
    );
    expect(done.session).toMatchObject({ phase: "rating", missedAtFour: all });
    expect(fadingRatingsFor(done.session!)).toEqual(["again"]);
  });

  it("복귀한 뒤 다 맞게 써서 마쳐도 적어 둔 포기는 남는다 — «알맞음»을 거절한다", () => {
    const given = giveUpFadingCard(atFourTyped(), A, S.a1, first.id, []);
    const done = valid(
      completeFadingStep(
        given,
        A,
        S.a1,
        4,
        erasedTargets(A, 4).map((t) => right(t.id)),
      ),
    );
    expect(done.session!.missedAtFour).toEqual(mine);
    expect(() => rateFadingSession(done, A, S.a1, "good", DAY1, R[0])).toThrow(
      FadingConflict,
    );
    expect(
      valid(rateFadingSession(done, A, S.a1, "again", DAY1, R[0])).concepts[
        A.id
      ],
    ).toMatchObject({ lapses: 1, marks: { missed: mine } });
  });

  it("없는 카드 · 칩 풀이 · 4단계가 아닌 때 · 평가 차례 · 다른 번호 · 틀린 차례는 거절한다", () => {
    const state = atFourTyped();
    expect(() => giveUpFadingCard(state, A, S.a1, "nope", [])).toThrow(
      FadingConflict,
    );
    expect(() => giveUpFadingCard(state, A, S.a2, first.id, [])).toThrow(
      FadingConflict,
    );
    expect(() =>
      giveUpFadingCard(state, A, S.a1, first.id, [
        { targetId: mine[0]!, chipId: "c1" },
      ]),
    ).toThrow(FadingConflict);
    let chips = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    for (const step of [2, 3] as const)
      chips = completeFadingStep(
        chips,
        A,
        S.a1,
        step,
        placements(A, step, SEED),
      );
    expect(() => giveUpFadingCard(chips, A, S.a1, first.id, [])).toThrow(
      FadingConflict,
    );
    const early = completeFadingReading(
      openFadingSession(
        emptyFading(),
        A,
        DAY1,
        { sessionId: S.a1, seed: SEED },
        { cards: true },
      ),
      A.id,
      S.a1,
    );
    expect(() => giveUpFadingCard(early, A, S.a1, first.id, [])).toThrow(
      FadingConflict,
    );
    const done = completeFadingStep(
      state,
      A,
      S.a1,
      4,
      erasedTargets(A, 4).map((t) => right(t.id)),
    );
    expect(() => giveUpFadingCard(done, A, S.a1, first.id, [])).toThrow(
      FadingConflict,
    );
  });

  it("상한에 닿아 있으면 옛 틀림을 버리지 않고 남은 자리만큼만 더한다", () => {
    const state = atFourTyped();
    const old = Array.from(
      { length: FADING_TARGETS_MAX - 1 },
      (_, i) => `old${i}#1`,
    );
    const nearly = {
      ...state,
      session: { ...state.session!, missedAtFour: old },
    };
    const given = valid(giveUpFadingCard(nearly, A, S.a1, first.id, []));
    expect(given.session!.missedAtFour).toEqual([...old, mine[0]]);
    const full = {
      ...state,
      session: { ...state.session!, missedAtFour: [...old, "old99#1"] },
    };
    expect(giveUpFadingCard(full, A, S.a1, first.id, [])).toBe(full);
  });
});

describe("저장 칸 — 평가로 닫는다", () => {
  it("마지막 학습 날짜보다 이전 평가는 거절하고 열린 풀이와 모든 기록을 보존한다", () => {
    const prior = valid(
      rateFadingSession(
        learned(emptyFading(), A, "2026-10-25", S.a1),
        A,
        S.a1,
        "good",
        "2026-10-25",
        R[0],
      ),
    );
    const pending = learned(prior, B, "2026-10-21", S.b1);
    const before = structuredClone(pending);
    expect(() =>
      rateFadingSession(pending, B, S.b1, "good", "2026-10-21", R[1]),
    ).toThrow(
      new FadingConflict(
        "마지막 학습 날짜보다 이전 날짜에는 평가를 저장할 수 없습니다. 선생님께 확인해 주세요.",
      ),
    );
    expect(pending).toEqual(before);
    expect(pending.session?.phase).toBe("rating");
    // 성공한 영수증은 날짜 검사와 현재 다른 풀이보다 먼저 반환한다.
    expect(
      rateFadingSession(pending, A, S.a1, "good", "2026-10-21", R[0]),
    ).toBe(pending);
  });

  it("날짜가 역행해도 기존 세션과 평가 검증을 먼저 한다", () => {
    const prior = valid(
      rateFadingSession(
        learned(emptyFading(), A, "2026-10-25", S.a1),
        A,
        S.a1,
        "good",
        "2026-10-25",
        R[0],
      ),
    );
    const pending = open(prior, B, "2026-10-21", S.b1);
    expect(() =>
      rateFadingSession(pending, B, S.b1, "good", "2026-10-21", R[1]),
    ).toThrow("4단계를 마친 뒤에 평가할 수 있습니다.");
    expect(() =>
      rateFadingSession(pending, B, S.a1, "good", "2026-10-21", R[1]),
    ).toThrow(FadingConflict);
  });

  it("4단계를 마치기 전에는 평가할 수 없다", () => {
    const state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    expect(() => rateFadingSession(state, A, S.a1, "good", DAY1, R[0])).toThrow(
      FadingConflict,
    );
    expect(() =>
      rateFadingSession(emptyFading(), A, S.a1, "good", DAY1, R[0]),
    ).toThrow(FadingConflict);
  });

  it("평가는 일정 계산기의 값과 내용의 지문을 적고, 풀이를 닫고, 그날의 집계와 연속에 더한다", () => {
    const first = fsrsPreview(null, 0).good;
    const rated = valid(ratedA());
    expect(rated.concepts[A.id]).toEqual({
      step: 4,
      stability: first.memory.stability,
      difficulty: first.memory.difficulty,
      reviewedOn: DAY1,
      dueOn: "2026-10-09",
      digest: fadingConceptDigest(A),
      reviews: 1,
      lapses: 0,
      addedOn: DAY1,
    });
    expect(rated.session).toBeNull();
    expect(rated.days).toEqual([
      { date: DAY1, reviews: 1, passed: 1, fresh: 1 },
    ]);
    expect(rated.streak).toEqual({ current: 1, best: 1, lastOn: DAY1 });
    expect(rated.receipts).toEqual([
      { requestId: R[0], conceptId: A.id, rating: "good", dueOn: "2026-10-09" },
    ]);
  });

  it("같은 평가 요청이 다시 오면 다시 적용하지 않는다 — 뒤에 다른 평가가 있었어도", () => {
    const rated = ratedA();
    expect(rateFadingSession(rated, A, S.a1, "good", DAY1, R[0])).toBe(rated);
    const both = rateFadingSession(
      learned(rated, B, DAY1, S.b1),
      B,
      S.b1,
      "easy",
      DAY1,
      R[1],
    );
    expect(rateFadingSession(both, A, S.a1, "good", DAY1, R[0])).toBe(both);
    expect(valid(both).receipts.map((r) => r.requestId)).toEqual([R[0], R[1]]);
  });

  it("늦게 온 옛 풀이의 평가는 지금 풀이에 적용되지 않는다", () => {
    let state = ratedA();
    const due = state.concepts[A.id]!.dueOn!;
    state = open(state, A, due, S.a2);
    state = completeFadingStep(state, A, S.a2, 4, placements(A, 4, SEED));
    // 옛 풀이(S.a1)의 번호로 온 새 요청 — 평가만 남은 지금 풀이(S.a2)가 있어도 받지 않는다.
    expect(() => rateFadingSession(state, A, S.a1, "easy", due, R[1])).toThrow(
      FadingConflict,
    );
    expect(
      valid(rateFadingSession(state, A, S.a2, "good", due, R[1])).concepts[
        A.id
      ]!.reviews,
    ).toBe(2);
  });

  it("복습에서 틀리면 «다시»만 받고 3단계에 서서 내일 다시 온다 — 그다음은 3단계에서 시작한다", () => {
    let state = ratedA();
    const due = state.concepts[A.id]!.dueOn!;
    state = open(state, A, due, S.a2);
    expect(state.session).toMatchObject({ startStep: 4, phase: "steps" });
    state = completeFadingStep(state, A, S.a2, 4, placements(A, 4, SEED, true));
    expect(() => rateFadingSession(state, A, S.a2, "good", due, R[1])).toThrow(
      FadingConflict,
    );
    state = valid(rateFadingSession(state, A, S.a2, "again", due, R[1]));
    expect(state.concepts[A.id]).toMatchObject({
      step: 3,
      reviewedOn: due,
      dueOn: "2026-10-10",
      reviews: 2,
      lapses: 1,
      addedOn: DAY1,
    });
    expect(state.days).toEqual([
      { date: DAY1, reviews: 1, passed: 1, fresh: 1 },
      { date: due, reviews: 1, passed: 0, fresh: 0 },
    ]);
    expect(state.streak).toEqual({ current: 1, best: 1, lastOn: due });

    state = open(state, A, "2026-10-10", S.a3);
    expect(state.session!.startStep).toBe(3);
    state = completeFadingStep(state, A, S.a3, 3, placements(A, 3, SEED));
    state = completeFadingStep(state, A, S.a3, 4, placements(A, 4, SEED, true));
    state = valid(
      rateFadingSession(state, A, S.a3, "again", "2026-10-10", R[2]),
    );
    // 3단계에서 시작한 풀이가 틀렸으니 2단계에 선다.
    expect(state.concepts[A.id]).toMatchObject({ step: 2, lapses: 2 });
    expect(state.streak).toEqual({ current: 2, best: 2, lastOn: "2026-10-10" });
  });

  it("새 개념이 4단계에서 틀리면 2단계에 선다", () => {
    let state = completeFadingReading(
      open(emptyFading(), A, DAY1, S.a1),
      A.id,
      S.a1,
    );
    for (const step of [2, 3] as const)
      state = completeFadingStep(
        state,
        A,
        S.a1,
        step,
        placements(A, step, SEED),
      );
    state = completeFadingStep(state, A, S.a1, 4, placements(A, 4, SEED, true));
    state = valid(rateFadingSession(state, A, S.a1, "again", DAY1, R[0]));
    expect(state.concepts[A.id]).toMatchObject({
      step: 2,
      dueOn: "2026-10-07",
      lapses: 1,
    });
    expect(state.days).toEqual([
      { date: DAY1, reviews: 1, passed: 0, fresh: 1 },
    ]);
  });

  it("영수증과 날마다의 집계는 상한까지만 남는다", () => {
    expect(FADING_STORED_DAYS_MAX).toBe(FADING_DAYS_KEPT);
    let state = emptyFading();
    for (let i = 0; i < FADING_RECEIPTS_MAX + 3; i++) {
      const c = concept(`r${i}x`);
      state = rateFadingSession(
        learned(state, c, DAY1, uuid(500 + i)),
        c,
        uuid(500 + i),
        "good",
        DAY1,
        uuid(900 + i),
      );
    }
    expect(valid(state).receipts.length).toBe(FADING_RECEIPTS_MAX);
    expect(state.receipts[0]!.requestId).toBe(uuid(903));
    expect(state.receipts.at(-1)!.requestId).toBe(
      uuid(900 + FADING_RECEIPTS_MAX + 2),
    );
  });

  it("은행의 문장이 평가 뒤에 바뀌었는지 지문으로 안다", () => {
    const stored = ratedA().concepts[A.id]!;
    expect(fadingContentChanged(stored, A)).toBe(false);
    expect(fadingContentChanged(stored, concept("a", "세 수직이등분선"))).toBe(
      true,
    );
    const fresh = pickFadingConcept(emptyFading(), A.id, DAY1).concepts[A.id]!;
    expect(fadingContentChanged(fresh, concept("a", "세 수직이등분선"))).toBe(
      false,
    );
  });
});

describe("저장 칸 — 화면에 내주는 숫자", () => {
  it("«오늘 전부»는 그날에만 먹는다", () => {
    const on = valid(setFadingAllToday(emptyFading(), DAY1, true));
    expect(on.allOn).toBe(DAY1);
    expect(setFadingAllToday(on, DAY1, true)).toBe(on);
    expect(fadingSummary(on, DAY1).mode).toBe("all");
    expect(fadingSummary(on, "2026-10-07").mode).toBe("split");
    expect(valid(setFadingAllToday(on, DAY1, false)).allOn).toBeNull();
  });

  it("요약은 대기열 · 오늘의 복습 · 연속 · 단계별 수를 한 번에 낸다 — 뭉친 점수는 없다", () => {
    const state = pickFadingConcept(ratedA(), B.id, DAY1);
    expect(fadingSummary(state, DAY1)).toEqual({
      today: DAY1,
      mode: "split",
      streak: { current: 1, best: 1 },
      learned: 1,
      stepCounts: { 1: 1, 2: 0, 3: 0, 4: 1 },
      queue: { due: [], held: [], unrated: [B.id] },
      plan: { done: 0, total: 0 },
      todayCount: { reviews: 1, passed: 1, fresh: 1 },
      lastOn: DAY1,
      idleDays: 0,
      longBreak: false,
      overdue: 0,
      nextReview: {
        dueOn: state.concepts[A.id]!.dueOn!,
        daysUntil: Math.round(
          (Date.parse(`${state.concepts[A.id]!.dueOn!}T00:00:00Z`) -
            Date.parse(`${DAY1}T00:00:00Z`)) /
            86_400_000,
        ),
        count: 1,
      },
    });
    // 밀린 복습 — 복습일이 **지난** 개념의 수. 복습일 당일은 밀린 것이 아니고, 평가 전인 개념은 세지 않는다.
    const dueOn = state.concepts[A.id]!.dueOn!;
    const after = (days: number) =>
      new Date(Date.parse(`${dueOn}T00:00:00Z`) + days * 86_400_000)
        .toISOString()
        .slice(0, 10);
    expect(fadingSummary(state, after(-1)).overdue).toBe(0);
    expect(fadingSummary(state, dueOn).overdue).toBe(0);
    expect(fadingSummary(state, after(1)).overdue).toBe(1);
    expect(fadingSummary(state, after(40)).overdue).toBe(1);
    // 은행에서 사라진 개념의 기록은 세지 않는다.
    expect(
      fadingSummary(state, after(1), { known: new Set([B.id]) }).overdue,
    ).toBe(0);
    expect(fadingSummary(state, "2026-10-07").streak).toEqual({
      current: 1,
      best: 1,
    });
    // 쉰 날 — 마지막으로 평가를 닫은 날부터. 엿새까지는 그냥 쉰 것이고 이레부터 «오래 쉼»이다.
    expect(fadingSummary(state, "2026-10-12")).toMatchObject({
      lastOn: DAY1,
      idleDays: 6,
      longBreak: false,
    });
    expect(fadingSummary(state, "2026-10-13")).toMatchObject({
      lastOn: DAY1,
      idleDays: 7,
      longBreak: true,
    });
    // 고르기만 하고 평가한 적이 없으면 쉰 것이 아니다(시작 전이다).
    expect(
      fadingSummary(pickFadingConcept(emptyFading(), B.id, DAY1), "2026-12-01"),
    ).toMatchObject({ lastOn: null, idleDays: null, longBreak: false });
    const later = fadingSummary(state, "2026-10-09");
    expect(later.queue.due).toEqual([A.id]);
    expect(later.plan).toEqual({ done: 0, total: 1 });
    expect(later.streak).toEqual({ current: 0, best: 1 });
    expect(later.todayCount).toEqual({ reviews: 0, passed: 0, fresh: 0 });
  });

  it("오늘 이미 한 복습은 하루 상한에서 빠진다 — 처음 배운 것은 상한에도 오늘의 복습에도 넣지 않는다", () => {
    let state = emptyFading();
    const three = ["k1", "k2", "k3"].map((id) => concept(id));
    for (const [i, c] of three.entries())
      state = rateFadingSession(
        learned(state, c, DAY1, uuid(300 + i)),
        c,
        uuid(300 + i),
        "good",
        DAY1,
        uuid(400 + i),
      );
    const due = "2026-10-09";
    expect(fadingSummary(state, due, { cap: 2 })).toMatchObject({
      queue: { due: [three[0]!.id, three[1]!.id], held: [three[2]!.id] },
      plan: { done: 0, total: 2 },
    });
    // 한 개념을 복습으로 닫고, 새 개념 하나를 처음 배운다 — 상한에서 빠지는 것은 복습 하나뿐이다.
    state = open(state, three[0]!, due, S.a2);
    state = completeFadingStep(
      state,
      three[0]!,
      S.a2,
      4,
      placements(three[0]!, 4, SEED),
    );
    state = rateFadingSession(state, three[0]!, S.a2, "good", due, R[0]);
    state = rateFadingSession(
      learned(state, B, due, S.b1),
      B,
      S.b1,
      "good",
      due,
      R[1],
    );
    expect(fadingSummary(state, due, { cap: 2 })).toMatchObject({
      queue: { due: [three[1]!.id], held: [three[2]!.id] },
      plan: { done: 1, total: 2 },
      todayCount: { reviews: 2, passed: 2, fresh: 1 },
    });
  });

  it("은행에 없는 열쇠의 기록은 세지 않는다", () => {
    const state = pickFadingConcept(ratedA(), B.id, DAY1);
    expect(
      fadingSummary(state, "2026-10-09", { known: new Set([B.id]) }),
    ).toMatchObject({
      learned: 0,
      stepCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
      queue: { due: [], held: [], unrated: [B.id] },
      plan: { done: 0, total: 0 },
    });
  });
});

describe("저장 칸 — 계약이 막는 것", () => {
  const rated = ratedA();
  const stored = rated.concepts[A.id]!;
  const session = {
    id: S.a2,
    conceptId: A.id,
    startStep: 4,
    seed: 1,
    phase: "steps",
    missedAtFour: [],
  };
  const reject = (state: unknown) =>
    expect(storedFadingSchema.safeParse(state).success).toBe(false);
  const accept = (state: unknown) =>
    expect(storedFadingSchema.safeParse(state).success).toBe(true);

  it("기억 값이 반만 있거나, 평가한 개념이 1단계에 서 있거나, 횟수가 안 맞으면 거절한다", () => {
    accept(rated);
    reject({ ...rated, concepts: { [A.id]: { ...stored, digest: null } } });
    reject({ ...rated, concepts: { [A.id]: { ...stored, step: 1 } } });
    reject({ ...rated, concepts: { [A.id]: { ...stored, reviews: 0 } } });
    reject({ ...rated, concepts: { [A.id]: { ...stored, lapses: 2 } } });
    reject({
      ...rated,
      concepts: { [A.id]: { ...stored, dueOn: stored.reviewedOn } },
    });
    // 평가 전인 개념에 날짜만 하나 붙은 꼴.
    const fresh = pickFadingConcept(emptyFading(), A.id, DAY1);
    accept(fresh);
    reject({
      ...fresh,
      concepts: { [A.id]: { ...fresh.concepts[A.id]!, dueOn: "2026-10-09" } },
    });
  });

  it("없는 개념의 풀이 · 서 있는 단계와 안 맞는 풀이 · 겹친 틀림을 거절한다", () => {
    accept({ ...rated, session });
    reject({ ...rated, session: { ...session, conceptId: B.id } });
    reject({
      ...rated,
      session,
      concepts: { [A.id]: { ...stored, step: 3 } },
    });
    reject({
      ...rated,
      session: { ...session, startStep: 3, phase: "rating" },
      concepts: { [A.id]: { ...stored, step: 3 } },
    });
    reject({
      ...rated,
      session: { ...session, missedAtFour: ["a1#1", "a1#1"] },
    });
  });

  it("날짜 차례가 어긋난 집계 · 집계와 안 맞는 연속 · 겹친 영수증 · 모르는 칸을 거절한다", () => {
    reject({ ...rated, days: [...rated.days, ...rated.days] });
    reject({
      ...rated,
      days: [{ date: DAY1, reviews: 1, passed: 2, fresh: 0 }],
    });
    reject({ ...rated, streak: { current: 2, best: 1, lastOn: DAY1 } });
    reject({ ...rated, streak: { current: 1, best: 1, lastOn: "2026-10-05" } });
    reject({ ...rated, streak: { current: 0, best: 0, lastOn: null } });
    reject({ ...rated, streak: { current: 0, best: 1, lastOn: DAY1 } });
    reject({ ...rated, receipts: [...rated.receipts, ...rated.receipts] });
    reject({ ...rated, attempts: [] });
    reject({ ...rated, version: 2 });
  });
});

describe("저장 칸 — 학생 기록 한 줄에 들어간다", () => {
  it("새 칸이 든 기록이 읽히고, 새 칸이 없는 옛 기록도 그대로 읽힌다", () => {
    const base = emptySrsState();
    expect(parseSrsState(base).fading).toBeUndefined();
    const rated = ratedA();
    expect(parseSrsState({ ...base, fading: rated }).fading).toEqual(rated);
  });

  it("새 칸의 꼴이 어긋난 기록은 읽지 않는다", () => {
    expect(() =>
      parseSrsState({ ...emptySrsState(), fading: { version: 1 } }),
    ).toThrow();
  });

  it("옛 쓰기 길(하루 여정 · 통합 탐험의 갱신)을 지나도 새 칸은 그대로 남는다", () => {
    const fading = ratedA();
    const previous = parseSrsState({ ...emptySrsState(), fading });
    const next = { ...previous, missions: [...previous.missions] };
    const written = parseSrsState(
      updateExpedition(
        previous,
        updateDailyJourney(previous, next),
        new Date("2026-10-06T03:00:00Z"),
      ),
    );
    expect(written.fading).toEqual(fading);
  });
});
