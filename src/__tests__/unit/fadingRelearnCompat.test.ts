import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_RELEARN_STORED_ITEMS_MAX,
  FADING_RELEARN_STORED_RECEIPTS_MAX,
  FADING_RELEARN_STORED_SEEN_MAX,
  storedFadingRelearnSchema,
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
  type StoredFadingRelearn,
} from "@/contracts/fading.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import {
  completeFadingReading,
  completeFadingStep,
  dropFadingConcept,
  emptyFading,
  openFadingSession,
  pickFadingConcept,
  rateFadingSession,
  reportFadingMiss,
  setFadingAllToday,
} from "@/lib/fading/state";
import { updateExpedition } from "@/lib/math-explorers/expedition";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

/**
 * 단기 재학습 대기열(선택 칸 `relearn`)의 **읽기 호환** — 이 칸을 읽고 보존하는 판.
 * 🔴 옛 기록은 글자 하나 다르지 않게 읽고 되쓴다. 대기열이 든 기록은 어느 쓰기 길을 지나도 대기열이 글자 그대로 남는다.
 * 지금 있는 쓰기 길(풀이 · 평가 · 고르기 · 하루 여정 · 통합 탐험)은 이 칸을 **만들지 않는다.**
 */

function concept(id: string): FadingConcept {
  const entries: ConceptEntry[] = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
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
const DAY4 = "2026-10-09";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const json = (value: unknown) => JSON.stringify(value);
const T0 = Date.UTC(2026, 9, 6, 3, 0, 0);

/** 옛 판이 쓴 기록 — 평가한 개념 하나와 영수증. 대기열이 없다. */
const LEGACY: StoredFading = {
  version: 1,
  concepts: {
    [A.id]: {
      step: 4,
      stability: 3.2602,
      difficulty: 4.8846,
      reviewedOn: DAY1,
      dueOn: DAY4,
      digest: "0a1b2c3d",
      reviews: 1,
      lapses: 0,
      addedOn: DAY1,
    },
  },
  session: null,
  days: [{ date: DAY1, reviews: 1, passed: 1, fresh: 1 }],
  streak: { current: 1, best: 1, lastOn: DAY1 },
  allOn: null,
  receipts: [
    { requestId: uuid(1), conceptId: A.id, rating: "good", dueOn: DAY4 },
  ],
};

/** 쓰는 판이 남길 수 있는 칸을 전부 채운 대기열 — 두 단계의 줄 · 대조를 기다리는 확인 · 증거의 열쇠 · 영수증 · 그날의 집계. */
const QUEUE: StoredFadingRelearn = {
  version: 1,
  items: [
    {
      conceptId: A.id,
      propositionId: "a1",
      digest: "00c0ffee",
      stage: "retry",
      dueAt: T0 + 60_000,
      origin: "missed",
      since: T0,
      fails: 2,
      checks: 1,
    },
    {
      conceptId: A.id,
      propositionId: "a2",
      digest: "0badf00d",
      stage: "confirm",
      dueAt: T0 + 300_000,
      origin: "exposed",
      since: T0,
      fails: 0,
      checks: 1,
      pending: {
        attemptId: uuid(70),
        at: T0 + 301_000,
        digest: "0badf00d",
        answers: [
          { targetId: "a2#1", text: "가장 긴 변" },
          { targetId: "a2#2", text: "중점" },
        ],
      },
    },
    {
      conceptId: "gone-concept",
      propositionId: "x9",
      digest: "12345678",
      stage: "retry",
      dueAt: 0,
      origin: "lapsed",
      since: 0,
      fails: 1,
      checks: 0,
    },
    {
      conceptId: A.id,
      propositionId: "a3",
      digest: "89abcdef",
      stage: "retry",
      dueAt: T0 + 60_000,
      origin: "assisted",
      since: T0,
      fails: 0,
      checks: 3,
    },
  ],
  seen: [`r|${A.id}|1`, `s|${A.id}|2|3`],
  graded: [
    {
      attemptId: uuid(71),
      conceptId: A.id,
      propositionId: "a1",
      verdict: "failed",
      next: { stage: "retry", dueAt: T0 + 60_000 },
      marks: "cw",
      at: T0,
    },
    {
      attemptId: uuid(72),
      conceptId: A.id,
      propositionId: "a3",
      verdict: "passed",
      next: null,
      marks: "u",
      at: T0 + 1,
    },
    {
      attemptId: uuid(73),
      conceptId: A.id,
      propositionId: "a3",
      verdict: "assisted",
      next: { stage: "retry", dueAt: T0 + 60_001 },
      marks: "",
      at: T0 + 2,
    },
  ],
  day: { on: DAY1, checks: 3, cleared: 1, entered: 4 },
};
const ARRIVING: StoredFading = { ...LEGACY, relearn: QUEUE };

function placements(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

describe("단기 재학습 대기열 — 읽기 호환", () => {
  it("대기열이 없는 옛 기록은 그대로 읽히고, 읽은 값에 대기열 칸이 생기지 않는다", () => {
    const parsed = storedFadingSchema.parse(LEGACY);
    expect(parsed).toStrictEqual(LEGACY);
    expect(json(parsed)).toBe(json(LEGACY));
    expect("relearn" in parsed).toBe(false);
    const row = parseSrsState({ ...emptySrsState(), fading: LEGACY });
    expect(json(row.fading)).toBe(json(LEGACY));
  });

  it("칸이 전부 든 대기열이 읽히고, 되쓰면 같은 글이다 — 학생 기록 전체로도", () => {
    const parsed = storedFadingSchema.parse(ARRIVING);
    expect(parsed).toStrictEqual(ARRIVING);
    expect(json(parsed)).toBe(json(ARRIVING));
    const row = parseSrsState({ ...emptySrsState(), fading: ARRIVING });
    expect(json(row.fading)).toBe(json(ARRIVING));
  });

  it("빈 대기열과 집계가 없는 대기열도 읽힌다", () => {
    const empty = { version: 1, items: [], seen: [], graded: [], day: null };
    expect(storedFadingRelearnSchema.parse(empty)).toStrictEqual(empty);
    expect(
      storedFadingSchema.safeParse({ ...LEGACY, relearn: empty }).success,
    ).toBe(true);
  });

  it("대기열의 줄은 고른 개념 · 은행의 개념과 짝을 묻지 않는다 — 읽는 쪽이 좁아 기록 전체가 안 읽히는 일이 없게", () => {
    // 위의 `gone-concept` 줄: 고른 개념에도 은행에도 없다. 시각이 0 이어도, 확인 시각이 든 시각보다 앞서도 읽힌다.
    const odd = structuredClone(QUEUE);
    odd.items[0]!.dueAt = 1;
    odd.items[0]!.since = 2;
    expect(storedFadingRelearnSchema.safeParse(odd).success).toBe(true);
  });

  it("읽는 쪽의 상한까지 찬 대기열이 읽힌다", () => {
    const item = QUEUE.items[0]!;
    const receipt = QUEUE.graded[0]!;
    const full: StoredFadingRelearn = {
      version: 1,
      items: Array.from(
        { length: FADING_RELEARN_STORED_ITEMS_MAX },
        (_, i) => ({
          ...item,
          propositionId: `p${i}`,
        }),
      ),
      seen: Array.from(
        { length: FADING_RELEARN_STORED_SEEN_MAX },
        (_, i) => `r|${A.id}|${i}`,
      ),
      graded: Array.from(
        { length: FADING_RELEARN_STORED_RECEIPTS_MAX },
        (_, i) => ({ ...receipt, attemptId: uuid(1000 + i) }),
      ),
      day: null,
    };
    expect(storedFadingRelearnSchema.safeParse(full).success).toBe(true);
    expect(
      storedFadingRelearnSchema.safeParse({
        ...full,
        items: [...full.items, { ...item, propositionId: "over" }],
      }).success,
    ).toBe(false);
  });

  it("모르는 키 · 겹친 줄 · 겹친 영수증 · 정수가 아닌 시각은 거절한다", () => {
    const bad = (change: (queue: StoredFadingRelearn) => unknown) =>
      storedFadingRelearnSchema.safeParse(change(structuredClone(QUEUE)))
        .success;
    expect(bad((q) => ({ ...q, extra: 1 }))).toBe(false);
    expect(bad((q) => ({ ...q, items: [{ ...q.items[0]!, note: "x" }] }))).toBe(
      false,
    );
    expect(bad((q) => ({ ...q, items: [q.items[0]!, q.items[0]!] }))).toBe(
      false,
    );
    expect(bad((q) => ({ ...q, graded: [q.graded[0]!, q.graded[0]!] }))).toBe(
      false,
    );
    expect(
      bad((q) => ({ ...q, items: [{ ...q.items[0]!, dueAt: 1.5 }] })),
    ).toBe(false);
    expect(
      bad((q) => ({ ...q, items: [{ ...q.items[0]!, stage: "done" }] })),
    ).toBe(false);
    expect(bad((q) => ({ ...q, version: 2 }))).toBe(false);
  });
});

describe("단기 재학습 대기열 — 지금 있는 쓰기 길을 지나도 글자 그대로 남는다", () => {
  const kept = (state: StoredFading) =>
    expect(json(state.relearn)).toBe(json(QUEUE));

  it("옛 쓰기 길(하루 여정 · 통합 탐험의 갱신)을 지나도 남는다", () => {
    const previous = parseSrsState({ ...emptySrsState(), fading: ARRIVING });
    const next = { ...previous, missions: [...previous.missions] };
    const written = parseSrsState(
      updateExpedition(
        previous,
        updateDailyJourney(previous, next),
        new Date("2026-10-06T03:00:00Z"),
      ),
    );
    expect(json(written.fading)).toBe(json(ARRIVING));
  });

  it("고르기 · 빼기 · «오늘 전부» · 풀이 한 벌(정독 → 2 → 3 → 4단계 틀림 → 평가)을 지나도 남는다", () => {
    let state = storedFadingSchema.parse(ARRIVING);
    state = pickFadingConcept(state, "c-1", DAY4);
    kept(state);
    state = dropFadingConcept(state, "c-1");
    kept(state);
    state = setFadingAllToday(state, DAY4, true);
    kept(state);
    const seed = 41;
    state = openFadingSession(state, B, DAY4, { sessionId: uuid(30), seed });
    kept(state);
    state = completeFadingReading(state, B.id, uuid(30));
    kept(state);
    for (const step of [2, 3] as const) {
      state = completeFadingStep(
        state,
        B,
        uuid(30),
        step,
        placements(B, step, seed),
      );
      kept(state);
    }
    const tray = chipTray(B, 4, { seed });
    const first = fadingTargets(B)[0]!;
    state = reportFadingMiss(state, B, uuid(30), {
      targetId: first.id,
      chipId: tray.find((chip) => !chipFits(B, first.id, chip))!.id,
    });
    kept(state);
    state = completeFadingStep(state, B, uuid(30), 4, placements(B, 4, seed));
    kept(state);
    state = rateFadingSession(state, B, uuid(30), "again", DAY4, uuid(31));
    kept(state);
    expect(storedFadingSchema.safeParse(state).success).toBe(true);
  });

  it("지금 있는 쓰기 길은 대기열 칸을 만들지 않는다 — 빈 기록에서 풀이 한 벌을 돌아도 칸이 없다", () => {
    const seed = 5;
    let state = openFadingSession(emptyFading(), A, DAY1, {
      sessionId: uuid(40),
      seed,
    });
    state = completeFadingReading(state, A.id, uuid(40));
    for (const step of [2, 3, 4] as const)
      state = completeFadingStep(
        state,
        A,
        uuid(40),
        step,
        placements(A, step, seed),
      );
    state = rateFadingSession(state, A, uuid(40), "good", DAY1, uuid(41));
    expect("relearn" in state).toBe(false);
  });
});
