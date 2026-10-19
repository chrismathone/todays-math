import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
import { fadingActionSchema } from "@/contracts/fadingApi.contract";
import { applyFadingAction } from "@/lib/fading/actions";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingContentKey, fadingSessionToken } from "@/lib/fading/contentKey";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { FSRS_RATINGS } from "@/lib/fading/fsrs";
import {
  NEW_FADING_PROGRESS,
  applyFadingRating,
  fadingDayOfDate,
  previewFadingIntervals,
  type FadingProgress,
} from "@/lib/fading/schedule";
import {
  FADING_PARTIAL_HARD_MAX_DAYS,
  allowedRatings,
  closeWithRating,
  fadingPartialMiss,
  fadingRatingsAfterJudging,
  giveUpCard,
  placeText,
  resumeFadingSession,
  type FadingRatingContext,
} from "@/lib/fading/session";
import {
  FadingConflict,
  emptyFading,
  fadingRatingsFor,
} from "@/lib/fading/state";
import { fadingStateView } from "@/lib/fading/view";

/**
 * 결정 1(원장님 승인 2026-10-16) — 카드 풀이 4단계의 **부분 틀림**에 «어려움»을 허용한다.
 *   N = 그 4단계 풀이의 빈칸 수 · M = 한 번이라도 틀린 빈칸 ∪ 대조 «다름» 빈칸(고유 개수).
 *   카드 풀이 · 대조를 다 마침 · 포기 없음(`gaveUpAtFour === false` 가 적혀 있어야) · 1 ≤ M ≤ ⌊N/4⌋ 이면 «다시 · 어려움».
 *   N < 4 · 내용이 바뀜 · 틀린 빈칸이 지금 내용에 없음 · 칸이 없는 옛 풀이는 예외가 아니다(«다시»뿐).
 *   부분 틀림의 «어려움»은 간격이 2일을 넘지 않는다(미리 보기와 적용 둘 다). 깨끗한 «어려움»은 계산기 그대로다.
 */

/** 표적이 여덟인 개념(N = 8 → 둘까지). */
function wide(id: string, edit = "중점"): FadingConcept {
  const entries: ConceptEntry[] = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    `직각삼각형의 외심은 {빗변}의 {${edit}}이다.`,
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이고 넓이는 {$\\pi R^2$}이다.",
    "내심은 세 내각의 {이등분선}이 만나는 점이고 세 변까지의 거리는 {$r$}이다.",
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
/** 표적이 셋인 개념(N = 3 → 예외 없음). */
function narrow(id: string): FadingConcept {
  const entries: ConceptEntry[] = [
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
const W = wide("w");
const W_EDITED = wide("w", "가운데 점");
const S = narrow("s");
const DAY1 = "2026-10-06";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const ids = (c: FadingConcept) => fadingTargets(c).map((t) => t.id);
/** 그 빈칸의 «틀림» 글 — 같은 개념의 다른 답. */
const wrongFor = (c: FadingConcept, targetId: string) =>
  fadingTargets(c).find(
    (t) =>
      t.id !== targetId &&
      t.tier === "text" &&
      t.text !== fadingTargets(c).find((x) => x.id === targetId)!.text,
  )!.text;
const ctx = (
  c: FadingConcept,
  over: Partial<FadingRatingContext> = {},
): FadingRatingContext => ({
  cards: true,
  gaveUp: false,
  blanks: ids(c),
  ...over,
});

describe("결정 1 — 고를 수 있는 평가(공용 함수)", () => {
  it("N = 8: 틀린 빈칸이 하나 · 둘이면 «다시 · 어려움», 셋이면 «다시»뿐 · 깨끗하면 넷 다", () => {
    expect(ids(W)).toHaveLength(8);
    const [a, b, c] = ids(W) as [string, string, string];
    expect(
      fadingRatingsAfterJudging({ missedAtFour: [a] }, {}, ctx(W)),
    ).toEqual(["again", "hard"]);
    expect(
      fadingRatingsAfterJudging({ missedAtFour: [a, b] }, {}, ctx(W)),
    ).toEqual(["again", "hard"]);
    expect(
      fadingRatingsAfterJudging({ missedAtFour: [a, b, c] }, {}, ctx(W)),
    ).toEqual(["again"]);
    expect(fadingRatingsAfterJudging({ missedAtFour: [] }, {}, ctx(W))).toEqual(
      [...FSRS_RATINGS],
    );
  });

  it("M 은 틀린 빈칸 ∪ «다름»으로 고른 빈칸의 고유 개수다 — 되풀이를 더하지 않는다", () => {
    const [a, b, c] = ids(W) as [string, string, string];
    const unjudged = [
      { targetId: b, text: "가운데" },
      { targetId: c, text: "모르는 글" },
    ];
    // a 틀림 + b «다름» = 2 → 허용 · c 까지 «다름» = 3 → «다시»뿐.
    expect(
      fadingRatingsAfterJudging(
        { missedAtFour: [a], unjudged },
        { [b]: "different", [c]: "same" },
        ctx(W),
      ),
    ).toEqual(["again", "hard"]);
    expect(
      fadingRatingsAfterJudging(
        { missedAtFour: [a], unjudged },
        { [b]: "different", [c]: "different" },
        ctx(W),
      ),
    ).toEqual(["again"]);
    // 틀림 없이 «다름» 하나만이어도 부분 틀림이다.
    expect(
      fadingRatingsAfterJudging(
        { missedAtFour: [], unjudged },
        { [b]: "different", [c]: "same" },
        ctx(W),
      ),
    ).toEqual(["again", "hard"]);
    expect(
      fadingPartialMiss({ missedAtFour: [a, a], unjudged: [] }, {}, ctx(W)),
    ).toBe(true);
  });

  it("예외가 아닌 것 — N < 4 · 포기 · 포기를 모름(옛 풀이) · 칩 풀이 · 틀린 빈칸이 지금 내용에 없음 · 문맥 없음", () => {
    const [a] = ids(W) as [string];
    const one = { missedAtFour: [a] };
    expect(ids(S)).toHaveLength(3);
    expect(
      fadingRatingsAfterJudging({ missedAtFour: [ids(S)[0]!] }, {}, ctx(S)),
    ).toEqual(["again"]);
    for (const over of [
      { gaveUp: true },
      { gaveUp: undefined },
      { cards: false },
      { blanks: ids(W).slice(1) },
    ] satisfies Partial<FadingRatingContext>[])
      expect(fadingRatingsAfterJudging(one, {}, ctx(W, over))).toEqual([
        "again",
      ]);
    expect(fadingRatingsAfterJudging(one)).toEqual(["again"]);
  });
});

/* ───────── 화면 쪽 상태 기계 ───────── */

function localAtFour(gaveUpAtFour: boolean | undefined) {
  return resumeFadingSession(W, {
    startStep: 1,
    step: 4,
    seed: 3,
    phase: "steps",
    missedAtFour: [],
    mode: "cards",
    ...(gaveUpAtFour === undefined ? {} : { gaveUpAtFour }),
  });
}
function typeAll(
  session: ReturnType<typeof localAtFour>,
  wrong: readonly string[] = [],
) {
  let s = session;
  for (const t of fadingTargets(W)) {
    if (s.phase !== "filling") break;
    if (t.id in s.filled || s.skipped?.includes(t.id)) continue;
    if (wrong.includes(t.id))
      s = placeText(s, W, t.id, wrongFor(W, t.id)).session;
    s = placeText(s, W, t.id, t.text).session;
  }
  return s;
}

describe("결정 1 — 화면의 풀이(`allowedRatings` · `closeWithRating`)", () => {
  it("포기 없음이 적힌 풀이에서 하나를 틀리면 «다시 · 어려움» — 개념을 주어야 연다", () => {
    const done = typeAll(localAtFour(false), [ids(W)[0]!]);
    expect(done.phase).toBe("rating");
    expect(allowedRatings(done, {}, W)).toEqual(["again", "hard"]);
    expect(allowedRatings(done)).toEqual(["again"]);
    expect(closeWithRating(done, "hard", {}, W).rating).toBe("hard");
    expect(() => closeWithRating(done, "good", {}, W)).toThrow();
  });

  it("카드를 넘긴 풀이 · 포기를 모르는 풀이는 «다시»뿐이다", () => {
    const skipped = typeAll(
      giveUpCard(localAtFour(false), W, W.propositions[3]!.id),
    );
    expect(skipped.phase).toBe("rating");
    expect(skipped.gaveUpAtFour).toBe(true);
    expect(allowedRatings(skipped, {}, W)).toEqual(["again"]);
    const unknown = typeAll(localAtFour(undefined), [ids(W)[0]!]);
    expect(allowedRatings(unknown, {}, W)).toEqual(["again"]);
  });

  it("평가 차례로 다시 들어와도(서버의 칸) 같은 판정이다", () => {
    const resumed = (gaveUpAtFour?: boolean) =>
      resumeFadingSession(W, {
        startStep: 1,
        step: 4,
        seed: 3,
        phase: "rating",
        missedAtFour: [ids(W)[1]!],
        mode: "cards",
        ...(gaveUpAtFour === undefined ? {} : { gaveUpAtFour }),
      });
    expect(allowedRatings(resumed(false), {}, W)).toEqual(["again", "hard"]);
    expect(allowedRatings(resumed(true), {}, W)).toEqual(["again"]);
    expect(allowedRatings(resumed(), {}, W)).toEqual(["again"]);
  });
});

/* ───────── 일정 — 부분 틀림 «어려움»의 2일 상한 ───────── */

function reviewed(): FadingProgress {
  // 몇 번 «알맞음»으로 간격이 넓어진 개념 — «어려움»이 2일보다 길다.
  let p: FadingProgress = NEW_FADING_PROGRESS;
  let day = 20_000;
  for (let i = 0; i < 4; i++) {
    p = applyFadingRating(p, p.step, "good", day);
    day = p.dueDay!;
  }
  return p;
}

describe("결정 1 — 간격 2일 상한(미리 보기 · 적용 같은 값)", () => {
  it("부분 틀림의 «어려움»만 2일로 자르고, 기억 값과 다른 평가는 그대로다", () => {
    const p = reviewed();
    const today = p.dueDay!;
    const plain = previewFadingIntervals(p, today);
    expect(plain.hard).toBeGreaterThan(FADING_PARTIAL_HARD_MAX_DAYS);
    const capped = previewFadingIntervals(p, today, { partial: true });
    expect(capped).toEqual({ ...plain, hard: FADING_PARTIAL_HARD_MAX_DAYS });
    const applied = applyFadingRating(p, 4, "hard", today, { partial: true });
    expect(applied.dueDay).toBe(today + capped.hard);
    const clean = applyFadingRating(p, 4, "hard", today);
    expect(clean.dueDay).toBe(today + plain.hard);
    expect(applied.memory).toEqual(clean.memory);
    expect(applied.step).toBe(4);
    // 다른 평가는 부분 틀림 표지와 상관없다.
    for (const rating of ["again", "good", "easy"] as const)
      expect(applyFadingRating(p, 4, rating, today, { partial: true })).toEqual(
        applyFadingRating(p, 4, rating, today),
      );
  });
});

/* ───────── 저장 칸 · 서버의 판정 ───────── */

function act(
  state: StoredFading,
  action: Parameters<typeof applyFadingAction>[1],
  concept: FadingConcept = W,
  today = DAY1,
): StoredFading {
  return storedFadingSchema.parse(
    applyFadingAction(
      state,
      fadingActionSchema.parse(action),
      concept,
      today,
      { sessionId: uuid(100), seed: 5 },
      [],
      { cards: true },
    ),
  );
}
const ref = (state: StoredFading, concept: FadingConcept = W) => ({
  conceptId: W.id,
  sessionId: fadingSessionToken(state.session!.id, fadingContentKey(concept)),
});
function chips(step: FadingStep, seed: number): FadingPlacement[] {
  const tray = chipTray(W, step, { seed });
  const used = new Set<string>();
  return erasedTargets(W, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(W, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}
function serverToFour(): StoredFading {
  let s = act(emptyFading(), { action: "open", conceptId: W.id });
  s = act(s, { action: "read", ...ref(s) });
  for (const step of [2, 3] as const)
    s = act(s, { action: "step", ...ref(s), step, placements: chips(step, 5) });
  return s;
}
const correct = (except: string[] = []): FadingPlacement[] =>
  fadingTargets(W).flatMap((t) =>
    except.some((p) => t.id.startsWith(`${p}#`))
      ? []
      : [{ targetId: t.id, text: t.text }],
  );

describe("결정 1b — 저장 칸에 쓴다(`gaveUpAtFour`)", () => {
  it("새 카드 풀이는 `false` 로 열린다 — 칩 풀이에는 칸을 쓰지 않는다", () => {
    const s = act(emptyFading(), { action: "open", conceptId: W.id });
    expect(s.session).toMatchObject({ mode: "cards", gaveUpAtFour: false });
    const chipsOnly = applyFadingAction(
      emptyFading(),
      { action: "open", conceptId: W.id },
      W,
      DAY1,
      { sessionId: uuid(100), seed: 5 },
      [],
      { cards: false },
    );
    expect(chipsOnly.session).not.toHaveProperty("gaveUpAtFour");
  });

  it("카드 하나를 넘긴 순간 · 단계째 넘긴 4단계에 `true` 가 적히고, 평가 차례까지 남는다", () => {
    const four = serverToFour();
    const card = W.propositions[3]!.id;
    const skipped = act(four, {
      action: "give-up-card",
      ...ref(four),
      propositionId: card,
      placements: [],
    });
    expect(skipped.session!.gaveUpAtFour).toBe(true);
    const rating = act(skipped, {
      action: "step",
      ...ref(skipped),
      step: 4,
      placements: correct([card]),
      gaveUp: true,
    });
    expect(rating.session).toMatchObject({
      phase: "rating",
      gaveUpAtFour: true,
    });
    // 단계째 «아직 모르겠어요»(카드 포기 없이 바로 단계를 넘김)도 같다.
    const whole = act(four, {
      action: "step",
      ...ref(four),
      step: 4,
      placements: [],
      gaveUp: true,
    });
    expect(whole.session!.gaveUpAtFour).toBe(true);
    // 다 채운 4단계는 그대로 `false` 다.
    const clean = act(four, {
      action: "step",
      ...ref(four),
      step: 4,
      placements: correct(),
    });
    expect(clean.session!.gaveUpAtFour).toBe(false);
  });
});

describe("결정 1b — 서버의 평가(`fadingRatingsFor` · `rateFadingSession`)", () => {
  const missOne = (four: StoredFading) =>
    act(four, {
      action: "miss",
      ...ref(four),
      placement: { targetId: ids(W)[0]!, text: wrongFor(W, ids(W)[0]!) },
    });

  it("하나를 틀리고 포기 없이 마치면 «어려움»을 받는다 — 4단계에 서고, 다음 복습은 2일 안이다", () => {
    let s = missOne(serverToFour());
    s = act(s, { action: "step", ...ref(s), step: 4, placements: correct() });
    expect(fadingRatingsFor(s.session!, undefined, W)).toEqual([
      "again",
      "hard",
    ]);
    const rated = act(s, {
      action: "rate",
      ...ref(s),
      rating: "hard",
      requestId: uuid(7),
    });
    const stored = rated.concepts[W.id]!;
    expect(stored.step).toBe(4);
    expect(stored.lapses).toBe(0);
    expect(
      fadingDayOfDate(stored.dueOn!) - fadingDayOfDate(DAY1),
    ).toBeLessThanOrEqual(FADING_PARTIAL_HARD_MAX_DAYS);
    expect(rated.concepts[W.id]!.marks?.missed).toEqual([ids(W)[0]]);
  });

  it("카드를 넘긴 풀이 · 칸이 없는 옛 풀이 · 셋을 틀린 풀이 · 문장이 고쳐진 풀이는 «어려움»을 받지 않는다", () => {
    const reject = (s: StoredFading, concept: FadingConcept = W) => {
      expect(() =>
        act(
          s,
          {
            action: "rate",
            ...ref(s, concept),
            rating: "hard",
            requestId: uuid(8),
          },
          concept,
        ),
      ).toThrow(FadingConflict);
    };
    const four = serverToFour();
    // 넘김.
    const card = W.propositions[3]!.id;
    let skipped = act(missOne(four), {
      action: "give-up-card",
      ...ref(four),
      propositionId: card,
      placements: [],
    });
    skipped = act(skipped, {
      action: "step",
      ...ref(skipped),
      step: 4,
      placements: correct([card]),
      gaveUp: true,
    });
    reject(skipped);
    // 옛 풀이(칸 없음).
    const missed = missOne(four);
    const old = storedFadingSchema.parse({
      ...missed,
      session: { ...missed.session!, gaveUpAtFour: undefined },
    });
    delete (old.session as { gaveUpAtFour?: boolean }).gaveUpAtFour;
    reject(
      act(old, { action: "step", ...ref(old), step: 4, placements: correct() }),
    );
    // 셋 틀림(N = 8 → 둘까지).
    let three = four;
    for (const id of ids(W).slice(0, 3))
      three = act(three, {
        action: "miss",
        ...ref(three),
        placement: { targetId: id, text: wrongFor(W, id) },
      });
    reject(
      act(three, {
        action: "step",
        ...ref(three),
        step: 4,
        placements: correct(),
      }),
    );
    // 문장이 고쳐진 뒤(푼 내용의 지문이 다르다).
    const solved = act(missed, {
      action: "step",
      ...ref(missed),
      step: 4,
      placements: correct(),
    });
    expect(fadingRatingsFor(solved.session!, undefined, W_EDITED)).toEqual([
      "again",
    ]);
  });

  it("🔴 «어려움»은 대조를 다 마쳐야 받는다 — «다시»는 틀림이 있으면 대조 없이 닫힌다(지금 규칙)", () => {
    let s = missOne(serverToFour());
    const other = ids(W)[4]!;
    s = act(s, {
      action: "step",
      ...ref(s),
      step: 4,
      placements: fadingTargets(W).map((t) => ({
        targetId: t.id,
        text: t.id === other ? "아무도 모르는 글" : t.text,
      })),
    });
    expect(s.session!.unjudged).toEqual([
      { targetId: other, text: "아무도 모르는 글" },
    ]);
    expect(() =>
      act(s, { action: "rate", ...ref(s), rating: "hard", requestId: uuid(9) }),
    ).toThrow("기준안과 대조할 답을 다 골라 주세요.");
    expect(
      act(s, {
        action: "rate",
        ...ref(s),
        rating: "hard",
        requestId: uuid(9),
        judged: { [other]: "same" },
      }).concepts[W.id]!.step,
    ).toBe(4);
    // «다름»을 고르면 M = 2 — 아직 허용이다. «다시»는 대조 없이도 닫힌다.
    expect(
      act(s, {
        action: "rate",
        ...ref(s),
        rating: "again",
        requestId: uuid(10),
      }).concepts[W.id]!.lapses,
    ).toBe(1);
  });
});

describe("결정 1b — 복습에서의 부분 틀림 «어려움»은 2일 상한이 실제로 걸린다(미리 보기 · 적용)", () => {
  /** 깨끗하게 «알맞음»을 거듭해 «어려움»의 계산기 간격이 2일보다 긴 개념 — 다음 복습일에 4단계에서 연다. */
  function seasoned() {
    let s = serverToFour();
    s = act(s, { action: "step", ...ref(s), step: 4, placements: correct() });
    s = act(s, {
      action: "rate",
      ...ref(s),
      rating: "good",
      requestId: uuid(20),
    });
    for (let n = 21; n < 24; n++) {
      const day = s.concepts[W.id]!.dueOn!;
      s = act(s, { action: "open", conceptId: W.id }, W, day);
      s = act(
        s,
        { action: "step", ...ref(s), step: 4, placements: correct() },
        W,
        day,
      );
      s = act(
        s,
        { action: "rate", ...ref(s), rating: "good", requestId: uuid(n) },
        W,
        day,
      );
    }
    const day = s.concepts[W.id]!.dueOn!;
    return { state: act(s, { action: "open", conceptId: W.id }, W, day), day };
  }
  const viewOf = (fading: StoredFading, today: string) =>
    fadingStateView({
      fading,
      revision: 1,
      today,
      concepts: new Map([[W.id, W]]),
      cards: true,
    });
  const hardDays = (fading: StoredFading, today: string) =>
    viewOf(fading, today).session!.ratings.find((r) => r.rating === "hard")!
      .intervalDays;

  it("깨끗한 풀이의 «어려움»은 2일보다 길고, 하나 틀린 풀이의 «어려움»은 2일 — 적용도 같은 날이다", () => {
    const { state, day } = seasoned();
    const clean = act(
      state,
      { action: "step", ...ref(state), step: 4, placements: correct() },
      W,
      day,
    );
    expect(hardDays(clean, day)).toBeGreaterThan(FADING_PARTIAL_HARD_MAX_DAYS);
    const missed = act(
      state,
      {
        action: "miss",
        ...ref(state),
        placement: { targetId: ids(W)[0]!, text: wrongFor(W, ids(W)[0]!) },
      },
      W,
      day,
    );
    const partial = act(
      missed,
      { action: "step", ...ref(missed), step: 4, placements: correct() },
      W,
      day,
    );
    expect(hardDays(partial, day)).toBe(FADING_PARTIAL_HARD_MAX_DAYS);
    const rated = act(
      partial,
      { action: "rate", ...ref(partial), rating: "hard", requestId: uuid(30) },
      W,
      day,
    );
    expect(
      fadingDayOfDate(rated.concepts[W.id]!.dueOn!) - fadingDayOfDate(day),
    ).toBe(FADING_PARTIAL_HARD_MAX_DAYS);
    const cleanRated = act(
      clean,
      { action: "rate", ...ref(clean), rating: "hard", requestId: uuid(31) },
      W,
      day,
    );
    expect(
      fadingDayOfDate(cleanRated.concepts[W.id]!.dueOn!) - fadingDayOfDate(day),
    ).toBe(hardDays(clean, day));
    // 기억 값은 둘 다 계산기의 «어려움» 그대로다 — 자르는 것은 다음 복습일뿐이다.
    expect(rated.concepts[W.id]!.stability).toBe(
      cleanRated.concepts[W.id]!.stability,
    );
  });
});

describe("결정 1b — 화면에 내려가는 꼴", () => {
  it("평가 차례의 풀이는 `gaveUpAtFour` 와 «다시 · 어려움»(어려움은 2일 이하)을 싣는다", () => {
    const four = serverToFour();
    const missed = act(four, {
      action: "miss",
      ...ref(four),
      placement: { targetId: ids(W)[0]!, text: wrongFor(W, ids(W)[0]!) },
    });
    const s = act(missed, {
      action: "step",
      ...ref(missed),
      step: 4,
      placements: correct(),
    });
    const view = fadingStateView({
      fading: s,
      revision: 1,
      today: DAY1,
      concepts: new Map([[W.id, W]]),
      cards: true,
    });
    expect(view.session).toMatchObject({ gaveUpAtFour: false });
    expect(view.session!.ratings.map((r) => r.rating)).toEqual([
      "again",
      "hard",
    ]);
    expect(
      view.session!.ratings.find((r) => r.rating === "hard")!.intervalDays,
    ).toBeLessThanOrEqual(FADING_PARTIAL_HARD_MAX_DAYS);
  });
});
