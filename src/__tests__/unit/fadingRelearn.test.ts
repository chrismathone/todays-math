import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_RELEARN_STORED_ITEMS_MAX,
  FADING_RELEARN_STORED_RECEIPTS_MAX,
  FADING_RELEARN_STORED_SEEN_MAX,
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
  type StoredFadingRelearnItem,
} from "@/contracts/fading.contract";
import {
  FADING_RELEARN_CONFIRM_MS,
  FADING_RELEARN_RETRY_MS,
  fadingRelearnQueueSchema,
  type FadingRelearnAttempt,
} from "@/contracts/fadingRelearn.contract";
import { FADING_CONTENT_CHANGED } from "@/lib/fading/actions";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingContentKey, fadingSessionToken } from "@/lib/fading/contentKey";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import type { FsrsRating } from "@/lib/fading/fsrs";
import {
  FADING_RELEARN_CHANGED,
  FADING_RELEARN_GONE,
  FADING_RELEARN_INCOMPLETE,
  FADING_RELEARN_ITEMS_MAX,
  FADING_RELEARN_JUDGING,
  FADING_RELEARN_NOT_DUE,
  FADING_RELEARN_NO_EVIDENCE,
  FADING_RELEARN_RECEIPTS_MAX,
  FADING_RELEARN_SEEN_MAX,
  applyFadingRelearnAction,
  fadingPropositionDigest,
  fadingRelearnQueueView,
  fadingRelearnToken,
  gradeFadingRelearn,
  judgeFadingRelearn,
  observeFadingRelearn,
} from "@/lib/fading/relearn";
import {
  FadingConflict,
  completeFadingReading,
  completeFadingStep,
  dropFadingConcept,
  emptyFading,
  openFadingSession,
  rateFadingSession,
  reportFadingMiss,
} from "@/lib/fading/state";

/**
 * 단기 재학습 대기열의 규칙 — 1분 · 5분의 경계, 증거의 확인과 되풀이, 못 알아본 글의 대조, 내용이 바뀐 뒤의 요청,
 * 그리고 🔴 **장기 일정(안정도 · 난이도 · 복습일 · 횟수 · 집계 · 영수증 · 열린 풀이)을 하나도 건드리지 않는 것**.
 * 증거는 손으로 짓지 않는다 — 진짜 풀이 한 벌(`state.ts`)을 돌려 얻은 기록에서 읽힌다.
 */

function concept(id: string, edit?: (definitions: string[]) => void) {
  const definitions = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ];
  edit?.(definitions);
  const entries: ConceptEntry[] = definitions.map((definition, i) => ({
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
const CONCEPTS = new Map([A, B].map((c) => [c.id, c]));

const DAY1 = "2026-10-06";
const DAY2 = "2026-10-07";
const LATER = "2026-10-20";
/** 한국 10월 6일 낮 12시. */
const T0 = Date.UTC(2026, 9, 6, 3, 0, 0);
const T_LATER = Date.UTC(2026, 9, 20, 3, 0, 0);
const MIN = FADING_RELEARN_RETRY_MS;
const FIVE = FADING_RELEARN_CONFIRM_MS;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

/* ───────── 풀이 한 벌을 돌리는 도우미 ───────── */

const open = (
  state: StoredFading,
  c: FadingConcept,
  day: string,
  n: number,
  cards = true,
) =>
  openFadingSession(state, c, day, { sessionId: uuid(n), seed: n }, { cards });
const sid = (state: StoredFading) => state.session!.id;
const token = (state: StoredFading, c: FadingConcept) =>
  fadingSessionToken(sid(state), fadingContentKey(c));

/** 칩으로 그 단계를 채우는 차례 — `miss` 의 빈칸에는 맞는 칩 앞에 틀린 칩을 한 번 넣는다. */
function chips(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  miss: readonly string[] = [],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  const moves: FadingPlacement[] = [];
  for (const target of erasedTargets(c, step)) {
    if (miss.includes(target.id))
      moves.push({
        targetId: target.id,
        chipId: tray.find(
          (chip) => !used.has(chip.id) && !chipFits(c, target.id, chip),
        )!.id,
      });
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    moves.push({ targetId: target.id, chipId: chip.id });
  }
  return moves;
}

type Typed = {
  /** 틀리게 썼다가 다시 맞게 쓴 빈칸. */
  wrong?: readonly string[];
  /** 어느 답의 글도 아닌 글을 쓴 빈칸 → 그 글. */
  unknown?: Readonly<Record<string, string>>;
  /** «아직 모르겠어요»로 넘긴 빈칸. */
  skip?: readonly string[];
};
/** 자판으로 4단계를 채우는 차례(카드 풀이). */
function typed(c: FadingConcept, o: Typed = {}): FadingPlacement[] {
  const all = fadingTargets(c);
  const moves: FadingPlacement[] = [];
  for (const target of erasedTargets(c, 4)) {
    if (o.skip?.includes(target.id)) continue;
    if (o.wrong?.includes(target.id))
      moves.push({
        targetId: target.id,
        text: all.find((other) => other.text !== target.text)!.text,
      });
    moves.push({
      targetId: target.id,
      text: o.unknown?.[target.id] ?? target.text,
    });
  }
  return moves;
}

function step23(
  state: StoredFading,
  c: FadingConcept,
  step: 2 | 3,
  miss: readonly string[] = [],
) {
  const placements = chips(c, step, state.session!.seed, miss);
  return {
    placements,
    state: completeFadingStep(state, c, sid(state), step, placements),
  };
}
const step4 = (state: StoredFading, c: FadingConcept, o: Typed = {}) =>
  completeFadingStep(state, c, sid(state), 4, typed(c, o), {
    gaveUp: Boolean(o.skip?.length),
  });
const rate = (
  state: StoredFading,
  c: FadingConcept,
  rating: FsrsRating,
  day: string,
  n: number,
  judged?: Record<string, "same" | "different">,
) => rateFadingSession(state, c, sid(state), rating, day, uuid(n), { judged });

/** 처음 배우는 카드 풀이를 평가 직전까지 — 1 → 4단계. */
function learnToRating(
  state: StoredFading,
  c: FadingConcept,
  day: string,
  n: number,
  o: Typed = {},
) {
  let s = open(state, c, day, n);
  s = completeFadingReading(s, c.id, sid(s));
  s = step23(s, c, 2).state;
  s = step23(s, c, 3).state;
  return step4(s, c, o);
}

/**
 * 결정 2(2026-10-16) **이전** 규칙으로 든 `exposed` 줄의 꼴 — `retry`·1분 뒤. 그 규칙으로 든 줄은 운영의 대기열에 남아 있고 그대로 돈다
 * (새 규칙은 이미 있는 줄을 바꾸지 않는다). 1분 → 5분 → 나감의 일반 규칙을 보는 시험은 이 꼴을 받침으로 쓴다(`seeded`).
 */
function legacyExposed<T extends { fading: StoredFading }>(done: T): T {
  const queue = done.fading.relearn;
  if (!queue) return done;
  return {
    ...done,
    fading: {
      ...done.fading,
      relearn: {
        ...queue,
        items: queue.items.map((i) =>
          i.origin === "exposed" && i.checks === 0 && i.stage === "confirm"
            ? {
                ...i,
                stage: "retry" as const,
                dueAt: i.dueAt - FIVE + MIN,
              }
            : i,
        ),
      },
    },
  };
}

/**
 * A 를 10월 6일에 처음 배우고(4단계에서 `a2#1` 을 틀림 → «다시») 그 평가를 대기열에 알린 기록.
 * 기본은 옛 규칙의 `exposed` 줄(`retry`·1분 — `legacyExposed`)이다. 새 규칙의 꼴 그대로는 `{ fresh: true }`.
 */
function seeded(
  now = T0,
  o: Typed = { wrong: ["a2#1"] },
  { fresh = false }: { fresh?: boolean } = {},
) {
  const missed = Boolean(o.wrong?.length || o.skip?.length);
  const rated = rate(
    learnToRating(emptyFading(), A, DAY1, 1, o),
    A,
    missed ? "again" : "good",
    DAY1,
    2,
  );
  const done = observeFadingRelearn(
    rated,
    A,
    { kind: "rated", conceptId: A.id, requestId: uuid(2) },
    now,
  );
  return fresh ? done : legacyExposed(done);
}

const item = (state: StoredFading, propositionId: string) =>
  state.relearn!.items.find((i) => i.propositionId === propositionId)!;

/** 그 명제의 확인에 낼 답 — 기본은 전부 맞게. `texts` 로 빈칸의 글을 바꾸고, `null` 은 안 쓴 빈칸이다. */
function attempt(
  state: StoredFading,
  c: FadingConcept,
  propositionId: string,
  n: number,
  texts: Readonly<Record<string, string | null>> = {},
  extra: Partial<FadingRelearnAttempt> = {},
): FadingRelearnAttempt {
  const proposition = c.propositions.find((p) => p.id === propositionId)!;
  const targets = fadingTargets({ ...c, propositions: [proposition] });
  return {
    conceptId: c.id,
    propositionId,
    token: fadingRelearnToken(item(state, propositionId), c),
    attemptId: uuid(n),
    answers: targets.flatMap((target) =>
      texts[target.id] === null
        ? []
        : [{ targetId: target.id, text: texts[target.id] ?? target.text }],
    ),
    ...extra,
  };
}

const view = (state: StoredFading, now: number) =>
  fadingRelearnQueueSchema.parse(
    fadingRelearnQueueView({ fading: state, concepts: CONCEPTS, now }),
  );

const conflictOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(FadingConflict);
    return (error as Error).message;
  }
  throw new Error("거절되지 않았다");
};

/** 장기 일정과 풀이의 칸 — 대기열을 뺀 전부. */
const LONG_TERM = [
  "version",
  "concepts",
  "session",
  "days",
  "streak",
  "allOn",
  "receipts",
] as const;
/** 대기열을 옮긴 뒤에도 장기 일정의 칸은 **같은 값(같은 참조)** 이다. */
function expectLongTermUntouched(before: StoredFading, after: StoredFading) {
  for (const key of LONG_TERM) expect(after[key], key).toBe(before[key]);
  expect(Object.keys(after).sort()).toEqual([...LONG_TERM, "relearn"].sort());
  expect(storedFadingSchema.safeParse(after).success).toBe(true);
}

describe("간격은 둘뿐이다 — 계약의 값", () => {
  it("1분 · 5분이고, 읽는 쪽의 상한이 쓰는 쪽보다 좁지 않다", () => {
    expect(FADING_RELEARN_RETRY_MS).toBe(60_000);
    expect(FADING_RELEARN_CONFIRM_MS).toBe(300_000);
    expect(FADING_RELEARN_STORED_ITEMS_MAX).toBeGreaterThanOrEqual(
      FADING_RELEARN_ITEMS_MAX,
    );
    expect(FADING_RELEARN_STORED_SEEN_MAX).toBeGreaterThanOrEqual(
      FADING_RELEARN_SEEN_MAX,
    );
    expect(FADING_RELEARN_STORED_RECEIPTS_MAX).toBeGreaterThanOrEqual(
      FADING_RELEARN_RECEIPTS_MAX,
    );
    expect(view(emptyFading(), T0).intervals).toEqual({
      retryMs: 60_000,
      confirmMs: 300_000,
    });
  });
});

describe("증거 → 대기열 — 평가로 닫은 풀이", () => {
  it("처음 배운 풀이: 4단계에서 틀린 명제는 `missed`(1분 뒤), 나머지는 `exposed`(틀림이 아니다 — 5분 뒤 확인 한 번 · 결정 2)", () => {
    const rated = rate(
      learnToRating(emptyFading(), A, DAY1, 1, { wrong: ["a2#1"] }),
      A,
      "again",
      DAY1,
      2,
    );
    const { fading, applied } = observeFadingRelearn(
      rated,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0,
    );
    expect(applied).toEqual({
      entered: 3,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
    expect(
      fading.relearn!.items.map((i) => [
        i.propositionId,
        i.origin,
        i.stage,
        i.dueAt,
        i.fails,
        i.checks,
      ]),
    ).toEqual([
      ["a1", "exposed", "confirm", T0 + FIVE, 0, 0],
      ["a2", "missed", "retry", T0 + MIN, 1, 0],
      ["a3", "exposed", "confirm", T0 + FIVE, 0, 0],
    ]);
    // 명제마다 그 명제의 지문이다(묶음의 지문이 아니다).
    expect(fading.relearn!.items.map((i) => i.digest)).toEqual(
      A.propositions.map(fadingPropositionDigest),
    );
    expect(fading.relearn!.day).toEqual({
      on: DAY1,
      checks: 0,
      cleared: 0,
      entered: 3,
    });
    expectLongTermUntouched(rated, fading);
  });

  it("결정 2 — 새로 든 `exposed` 줄은 5분 뒤 확인 한 번: 1분 뒤에는 아직이고, 5분 뒤 맞히면 나가고, 틀리면 1분 뒤 `retry` 로 간다", () => {
    const { fading } = seeded(T0, undefined, { fresh: true });
    expect(item(fading, "a1")).toMatchObject({
      origin: "exposed",
      stage: "confirm",
      dueAt: T0 + FIVE,
      checks: 0,
      fails: 0,
    });
    // 1분 뒤에는 `exposed` 를 확인할 때가 아니다(틀린 a2 만 준비됐다).
    expect(
      conflictOf(() =>
        gradeFadingRelearn(fading, A, attempt(fading, A, "a1", 50), T0 + MIN),
      ),
    ).toBe(FADING_RELEARN_NOT_DUE);
    // 5분 뒤 도움 없이 맞히면 대기열에서 나간다 — 확인은 한 번이다.
    const passed = gradeFadingRelearn(
      fading,
      A,
      attempt(fading, A, "a1", 51),
      T0 + FIVE,
    );
    expect(passed.result.verdict).toBe("passed");
    expect(passed.result.next).toBeNull();
    expect(
      passed.fading.relearn!.items.some((i) => i.propositionId === "a1"),
    ).toBe(false);
    // 5분 뒤 틀리면 그때의 규칙(`settled`) 그대로 1분 뒤 `retry` · 틀림 +1.
    const failed = gradeFadingRelearn(
      fading,
      A,
      attempt(fading, A, "a3", 52, { "a3#1": "수직이등분선" }),
      T0 + FIVE,
    );
    expect(failed.result.verdict).toBe("failed");
    expect(item(failed.fading, "a3")).toMatchObject({
      origin: "exposed",
      stage: "retry",
      dueAt: T0 + FIVE + MIN,
      fails: 1,
      checks: 1,
    });
  });

  it("결정 2 — 이미 대기열에 있는 줄은 `exposed` 증거로 바뀌지 않는다(옛 `retry` 줄 · 다른 개념의 줄 그대로)", () => {
    const { fading } = seeded(T0, undefined, { fresh: true });
    // 옛 규칙으로 든 줄처럼 a1 을 `retry`·1분으로 되돌려 두고, 같은 개념의 첫 평가 증거를 다시 보낸다(이미 센 증거라 아무것도 하지 않는다).
    const old: StoredFading = {
      ...fading,
      relearn: {
        ...fading.relearn!,
        items: fading.relearn!.items.map((i) =>
          i.propositionId === "a1"
            ? { ...i, stage: "retry" as const, dueAt: T0 + MIN }
            : i,
        ),
      },
    };
    const again = observeFadingRelearn(
      old,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 10_000,
    );
    expect(again.applied.duplicate).toBe(true);
    expect(again.fading).toBe(old);
    expect(item(again.fading, "a1")).toMatchObject({
      stage: "retry",
      dueAt: T0 + MIN,
    });
  });

  it("넘긴 빈칸(«아직 모르겠어요»)과 대조에서 «다름»으로 고른 빈칸의 명제도 `missed` 다", () => {
    const skipped = seeded(T0, { skip: ["a1#2"] }).fading;
    expect(item(skipped, "a1")).toMatchObject({ origin: "missed", fails: 1 });
    expect(item(skipped, "a2").origin).toBe("exposed");

    const waiting = learnToRating(emptyFading(), A, DAY1, 1, {
      unknown: { "a3#1": "빗변의 절반" },
    });
    const rated = rate(waiting, A, "again", DAY1, 2, { "a3#1": "different" });
    const { fading } = observeFadingRelearn(
      rated,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0,
    );
    expect(item(fading, "a3")).toMatchObject({ origin: "missed", fails: 1 });
    expect(item(fading, "a1")).toMatchObject({ origin: "exposed", fails: 0 });
  });

  it("못 알아본 글을 «같은 뜻»으로 고른 풀이는 틀림이 아니다 — 처음 배운 풀이라 `exposed` 만 든다", () => {
    const waiting = learnToRating(emptyFading(), A, DAY1, 1, {
      unknown: { "a3#1": "빗변의 절반" },
    });
    const rated = rate(waiting, A, "good", DAY1, 2, { "a3#1": "same" });
    const { fading } = observeFadingRelearn(
      rated,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0,
    );
    expect(fading.relearn!.items.map((i) => [i.origin, i.fails])).toEqual([
      ["exposed", 0],
      ["exposed", 0],
      ["exposed", 0],
    ]);
  });

  it("복습(둘째 평가부터)에서 도움 없이 다 맞힌 풀이는 대기열에 아무것도 넣지 않는다 — 칸도 생기지 않는다", () => {
    const first = rate(
      learnToRating(emptyFading(), A, DAY1, 1),
      A,
      "good",
      DAY1,
      2,
    );
    const again = rate(step4(open(first, A, LATER, 3), A), A, "good", LATER, 4);
    expect(again.concepts[A.id]!.reviews).toBe(2);
    const done = observeFadingRelearn(
      again,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(4) },
      T_LATER,
    );
    expect(done.fading).toBe(again);
    expect("relearn" in done.fading).toBe(false);
    expect(done.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
  });

  it("복습에서 틀린 명제만 든다 — 맞힌 명제는 들지 않는다(처음 배운 풀이가 아니다)", () => {
    const first = rate(
      learnToRating(emptyFading(), A, DAY1, 1),
      A,
      "good",
      DAY1,
      2,
    );
    const lapse = rate(
      step4(open(first, A, LATER, 3), A, { wrong: ["a1#1"] }),
      A,
      "again",
      LATER,
      4,
    );
    const { fading } = observeFadingRelearn(
      lapse,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(4) },
      T_LATER,
    );
    expect(
      fading.relearn!.items.map((i) => [i.propositionId, i.origin]),
    ).toEqual([["a1", "missed"]]);
    expectLongTermUntouched(lapse, fading);
  });

  it("평가가 «다시»인데 빈칸마다의 진단이 없으면(칩 풀이) 어느 명제인지 알 수 없다 — 전부 `lapsed` 로 든다", () => {
    let s = open(emptyFading(), A, DAY1, 1, false);
    s = completeFadingReading(s, A.id, sid(s));
    s = step23(s, A, 2).state;
    s = step23(s, A, 3).state;
    s = completeFadingStep(
      s,
      A,
      sid(s),
      4,
      chips(A, 4, s.session!.seed, [erasedTargets(A, 4)[0]!.id]),
    );
    const rated = rate(s, A, "again", DAY1, 2);
    expect(rated.concepts[A.id]!.marks).toBeUndefined();
    const { fading } = observeFadingRelearn(
      rated,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0,
    );
    expect(fading.relearn!.items.map((i) => [i.origin, i.fails])).toEqual([
      ["lapsed", 1],
      ["lapsed", 1],
      ["lapsed", 1],
    ]);
  });

  it("🔴 지어낸 증거는 받지 않는다 — 없는 요청 번호 · 그 개념의 마지막 평가가 아닌 번호 · 다른 개념의 번호 · 며칠 묵은 평가", () => {
    const first = rate(
      learnToRating(emptyFading(), A, DAY1, 1),
      A,
      "good",
      DAY1,
      2,
    );
    const record = (
      state: StoredFading,
      c: FadingConcept,
      n: number,
      now = T0,
    ) =>
      conflictOf(() =>
        observeFadingRelearn(
          state,
          c,
          { kind: "rated", conceptId: c.id, requestId: uuid(n) },
          now,
        ),
      );
    expect(record(first, A, 99)).toBe(FADING_RELEARN_NO_EVIDENCE);
    // 평가한 적 없는 개념 · 고르지도 않은 개념.
    expect(record(first, B, 2)).toBe(FADING_RELEARN_NO_EVIDENCE);
    expect(record(emptyFading(), A, 2)).toBe(FADING_RELEARN_NO_EVIDENCE);
    // 마지막 평가가 아닌 옛 번호.
    const second = rate(
      step4(open(first, A, LATER, 3), A),
      A,
      "good",
      LATER,
      4,
    );
    expect(record(second, A, 2, T_LATER)).toBe(FADING_RELEARN_NO_EVIDENCE);
    // 평가한 날이 어제까지는 받는다(자정을 넘긴 풀이) — 그보다 묵었으면 받지 않는다.
    const day = 86_400_000;
    expect(
      observeFadingRelearn(
        first,
        A,
        { kind: "rated", conceptId: A.id, requestId: uuid(2) },
        T0 + day,
      ).applied.entered,
    ).toBe(3);
    expect(record(first, A, 2, T0 + 2 * day)).toBe(FADING_RELEARN_NO_EVIDENCE);
  });

  it("같은 증거가 다시 와도 한 번만 센다 — 줄도 시각도 틀림의 수도 그대로다", () => {
    const first = seeded();
    const again = observeFadingRelearn(
      first.fading,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 30_000,
    );
    expect(again.fading).toBe(first.fading);
    expect(again.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
  });

  it("대기열에서 나간 뒤에 같은 증거가 다시 와도 다시 들지 않는다", () => {
    let state = seeded().fading;
    for (const [i, proposition] of ["a1", "a2", "a3"].entries()) {
      state = gradeFadingRelearn(
        state,
        A,
        attempt(state, A, proposition, 100 + 2 * i),
        T0 + MIN,
      ).fading;
      state = gradeFadingRelearn(
        state,
        A,
        attempt(state, A, proposition, 101 + 2 * i),
        T0 + MIN + FIVE,
      ).fading;
    }
    expect(state.relearn!.items).toEqual([]);
    const replay = observeFadingRelearn(
      state,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 10 * MIN,
    );
    expect(replay.fading).toBe(state);
    expect(replay.applied.duplicate).toBe(true);
  });
});

describe("증거 → 대기열 — 단계의 넣기 차례(열린 풀이를 다시 돌린다)", () => {
  const target2 = erasedTargets(A, 2)[0]!.id;
  const proposition2 = target2.split("#")[0]!;
  const trace = (
    state: StoredFading,
    c: FadingConcept,
    step: 2 | 3 | 4,
    placements: FadingPlacement[],
    extra: { gaveUp?: boolean; gaveUpCards?: string[] } = {},
  ) => ({
    kind: "step" as const,
    conceptId: c.id,
    sessionId: token(state, c),
    step,
    placements,
    ...extra,
  });

  /** A 를 처음 열어 정독까지 — 2단계를 푸는 중이다. */
  function afterReading() {
    const s = open(emptyFading(), A, DAY1, 1);
    return completeFadingReading(s, A.id, sid(s));
  }
  function afterStep2(miss: readonly string[] = [target2]) {
    const before = afterReading();
    return { before, ...step23(before, A, 2, miss) };
  }
  /** 처음 배우는 풀이를 3단계까지 마친다 — 4단계를 푸는 중이다. */
  function toStep4(cards = true) {
    let s = open(emptyFading(), A, DAY1, 1, cards);
    s = completeFadingReading(s, A.id, sid(s));
    s = step23(s, A, 2).state;
    return step23(s, A, 3).state;
  }

  it("틀리게 넣은 빈칸의 명제만 든다 — 풀이는 열린 채 그대로다", () => {
    const { state, placements } = afterStep2();
    const { fading, applied } = observeFadingRelearn(
      state,
      A,
      trace(state, A, 2, placements),
      T0,
    );
    expect(applied).toMatchObject({ entered: 1, duplicate: false });
    expect(fading.relearn!.items).toEqual([
      {
        conceptId: A.id,
        propositionId: proposition2,
        digest: fadingPropositionDigest(
          A.propositions.find((p) => p.id === proposition2)!,
        ),
        stage: "retry",
        dueAt: T0 + MIN,
        origin: "missed",
        since: T0,
        fails: 1,
        checks: 0,
      },
    ]);
    expect(fading.relearn!.seen).toEqual([`${A.id}|1|2|${proposition2}`]);
    expectLongTermUntouched(state, fading);
  });

  it("안 틀리고 마친 단계는 아무것도 넣지 않는다", () => {
    const { state, placements } = afterStep2([]);
    const done = observeFadingRelearn(
      state,
      A,
      trace(state, A, 2, placements),
      T0,
    );
    expect(done.fading).toBe(state);
    expect(done.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
  });

  it("«아직 모르겠어요»로 마친 단계는 못 채운 빈칸의 명제가 전부 든다", () => {
    const before = afterReading();
    const s = completeFadingStep(before, A, sid(before), 2, [], {
      gaveUp: true,
    });
    const { fading } = observeFadingRelearn(
      s,
      A,
      trace(s, A, 2, [], { gaveUp: true }),
      T0,
    );
    const expected = [
      ...new Set(erasedTargets(A, 2).map((t) => t.id.split("#")[0])),
    ];
    expect(fading.relearn!.items.map((i) => i.propositionId).sort()).toEqual(
      expected.sort(),
    );
    expect(fading.relearn!.items.every((i) => i.origin === "missed")).toBe(
      true,
    );
  });

  it("🔴 1분은 틀린 그때부터다 — 풀고 있는 단계의 지금까지의 차례로 바로 들고, 단계를 마친 뒤 다시 온 차례가 그 시각을 미루지 않는다", () => {
    // 2단계를 푸는 중(본 행동 `step` 을 아직 보내지 않았다) — 틀린 칩까지의 차례.
    const before = afterReading();
    const full = chips(A, 2, before.session!.seed, [target2]);
    const partial = full.slice(
      0,
      full.findIndex((move) => move.targetId === target2) + 1,
    );
    const entered = observeFadingRelearn(
      before,
      A,
      trace(before, A, 2, partial),
      T0,
    );
    expect(entered.applied).toMatchObject({ entered: 1, duplicate: false });
    expect(item(entered.fading, proposition2)).toMatchObject({
      origin: "missed",
      dueAt: T0 + MIN,
      since: T0,
      fails: 1,
    });
    expectLongTermUntouched(before, entered.fading);
    // 같은 차례를 다시 알려도, 20초 뒤 단계를 마치고 차례 전부를 알려도 — 다시 세지 않고 시각도 그대로다.
    for (const [state, moves, now] of [
      [entered.fading, partial, T0 + 5_000],
      [
        completeFadingStep(entered.fading, A, sid(before), 2, full),
        full,
        T0 + 20_000,
      ],
    ] as const) {
      const again = observeFadingRelearn(
        state,
        A,
        trace(state, A, 2, [...moves]),
        now,
      );
      expect(again.fading).toBe(state);
      expect(again.applied).toEqual({
        entered: 0,
        updated: 0,
        skipped: 0,
        duplicate: true,
      });
      expect(item(state, proposition2)).toMatchObject({
        dueAt: T0 + MIN,
        fails: 1,
      });
    }
  });

  it("🔴 4단계의 틀림 하나 — 그 자리에서 들고, 뒤에 온 4단계의 차례와 평가가 그 시각을 미루지도 · 5분 뒤를 기다리는 줄을 되돌리지도 않는다", () => {
    // 복습(4단계에서 시작)하는 카드 풀이에서 a2#1 을 틀리게 쓴다.
    const first = rate(
      learnToRating(emptyFading(), A, DAY1, 1),
      A,
      "good",
      DAY1,
      2,
    );
    const wrong = { targetId: "a2#1", text: "중점" };
    // 본 행동 `miss` 가 그 자리에서 틀림을 적는다 → 그 넣기 하나를 대기열에 알린다.
    const s = reportFadingMiss(open(first, A, LATER, 3), A, uuid(3), wrong);
    const missed = observeFadingRelearn(s, A, trace(s, A, 4, [wrong]), T_LATER);
    expect(missed.applied).toMatchObject({ entered: 1, duplicate: false });
    expect(missed.fading.relearn!.items).toHaveLength(1);
    expect(item(missed.fading, "a2")).toMatchObject({
      origin: "missed",
      stage: "retry",
      dueAt: T_LATER + MIN,
      fails: 1,
    });
    expectLongTermUntouched(s, missed.fading);
    // 풀이를 이어 가는 사이에 1분이 지나 그 확인을 맞혔다 → 5분 뒤를 기다린다.
    let state = gradeFadingRelearn(
      missed.fading,
      A,
      attempt(missed.fading, A, "a2", 10),
      T_LATER + MIN,
    ).fading;
    const waiting = { stage: "confirm", dueAt: T_LATER + MIN + FIVE };
    expect(item(state, "a2")).toMatchObject(waiting);
    // 4단계를 마치고(차례 전부) 평가한다 — 둘 다 이미 센 증거다.
    state = step4(state, A, { wrong: ["a2#1"] });
    const stepped = observeFadingRelearn(
      state,
      A,
      trace(state, A, 4, typed(A, { wrong: ["a2#1"] })),
      T_LATER + 90_000,
    );
    expect(stepped.fading).toBe(state);
    expect(stepped.applied.duplicate).toBe(true);
    state = rate(state, A, "again", LATER, 4);
    const closed = observeFadingRelearn(
      state,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(4) },
      T_LATER + 2 * MIN,
    );
    expect(closed.fading).toBe(state);
    expect(closed.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
    expect(item(state, "a2")).toMatchObject({
      ...waiting,
      fails: 1,
      checks: 1,
    });
  });

  it("못 알아본 글은 차례에 있어도 틀림이 아니다 — 평가 때 «다름»으로 고르면 그때 새 증거가 된다(그 자리에서 센 틀림은 다시 세지 않는다)", () => {
    let s = toStep4();
    const wrong = { targetId: "a2#1", text: "중점" };
    s = reportFadingMiss(s, A, sid(s), wrong);
    s = observeFadingRelearn(s, A, trace(s, A, 4, [wrong]), T0).fading;
    const moves = typed(A, {
      wrong: ["a2#1"],
      unknown: { "a3#1": "빗변의 절반" },
    });
    s = completeFadingStep(s, A, sid(s), 4, moves);
    const neutral = observeFadingRelearn(
      s,
      A,
      trace(s, A, 4, moves),
      T0 + 30_000,
    );
    expect(neutral.fading).toBe(s);
    expect(s.relearn!.items.map((i) => i.propositionId)).toEqual(["a2"]);

    s = rate(s, A, "again", DAY1, 2, { "a3#1": "different" });
    const done = observeFadingRelearn(
      s,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 50_000,
    );
    expect(done.applied).toEqual({
      entered: 2,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
    // a2 는 틀린 그때 잡힌 시각 그대로 · a3 은 «다름» — 지금부터 1분 · a1 은 처음 배운 풀이의 틀리지 않은 명제(5분 뒤 확인 한 번 · 결정 2).
    expect(item(done.fading, "a2")).toMatchObject({
      origin: "missed",
      dueAt: T0 + MIN,
      fails: 1,
    });
    expect(item(done.fading, "a3")).toMatchObject({
      origin: "missed",
      dueAt: T0 + 50_000 + MIN,
      fails: 1,
    });
    expect(item(done.fading, "a1")).toMatchObject({
      origin: "exposed",
      stage: "confirm",
      dueAt: T0 + 50_000 + FIVE,
      fails: 0,
    });
    // 평가를 알렸으니 그 풀이의 단계 열쇠는 걷히고 평가의 열쇠만 남는다.
    expect(done.fading.relearn!.seen).toEqual([`${A.id}|1|r`]);
    expectLongTermUntouched(s, done.fading);
  });

  it("더 뒤 단계에서 또 틀리면 새 틀림이다(5분 뒤를 기다리던 줄도 1분 뒤로) — 늦게 온 앞 단계의 증거는 아무것도 바꾸지 않는다", () => {
    const first = afterStep2();
    // 2단계의 증거는 (연결이 끊겨) 못 보낸 채 3단계에서 또 틀렸다 — 3단계의 증거가 먼저 닿는다.
    const third = step23(first.state, A, 3, [target2]);
    let state = observeFadingRelearn(
      third.state,
      A,
      trace(third.state, A, 3, third.placements),
      T0,
    ).fading;
    expect(item(state, proposition2)).toMatchObject({
      fails: 1,
      dueAt: T0 + MIN,
    });
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, proposition2, 10),
      T0 + MIN,
    ).fading;
    expect(item(state, proposition2).stage).toBe("confirm");
    // 늦게 온 2단계의 증거 — 더 뒤(3단계)의 것을 이미 셌다.
    const late = observeFadingRelearn(
      state,
      A,
      trace(state, A, 2, first.placements),
      T0 + MIN + 5_000,
    );
    expect(late.fading).toBe(state);
    expect(late.applied.duplicate).toBe(true);
    // 4단계에서 또 틀리면 새 틀림이다.
    const slip = typed(A, { wrong: [target2] }).find(
      (move) => move.targetId === target2,
    )!;
    state = reportFadingMiss(state, A, sid(state), slip);
    const again = observeFadingRelearn(
      state,
      A,
      trace(state, A, 4, [slip]),
      T0 + 2 * MIN,
    );
    expect(again.applied).toEqual({
      entered: 0,
      updated: 1,
      skipped: 0,
      duplicate: false,
    });
    expect(item(again.fading, proposition2)).toMatchObject({
      stage: "retry",
      dueAt: T0 + 3 * MIN,
      fails: 2,
      checks: 1,
      since: T0,
    });
  });

  it("자판으로 푸는 단계에서 넘긴 카드는 그 카드의 못 쓴 빈칸만 틀림이다 — 단계 전체의 «아직 모르겠어요»는 못 채운 빈칸 전부다", () => {
    const s = toStep4();
    // a1 의 첫 빈칸만 쓰고 그 카드를 넘겼다. 다른 카드는 아직 손대지 않았다.
    const soFar = [{ targetId: "a1#1", text: "수직이등분선" }];
    const card = observeFadingRelearn(
      s,
      A,
      trace(s, A, 4, soFar, { gaveUpCards: ["a1"] }),
      T0,
    );
    expect(
      card.fading.relearn!.items.map((i) => [i.propositionId, i.origin]),
    ).toEqual([["a1", "missed"]]);
    const all = observeFadingRelearn(
      s,
      A,
      trace(s, A, 4, soFar, { gaveUp: true }),
      T0,
    );
    expect(all.fading.relearn!.items.map((i) => i.propositionId)).toEqual([
      "a1",
      "a2",
      "a3",
    ]);
    // 칩으로 푸는 단계에는 카드 넘기기가 없다.
    const second = afterReading();
    expect(
      conflictOf(() =>
        observeFadingRelearn(
          second,
          A,
          trace(second, A, 2, [], { gaveUpCards: ["a1"] }),
          T0,
        ),
      ),
    ).toBe("답을 쓰는 단계가 아닙니다.");
  });

  it("4단계에서 그 자리에 적어 둔 틀림은 보낸 차례에 없어도 든다 — 화면이 차례를 덜 보내도 서버에 적힌 틀림은 빠지지 않는다", () => {
    let s = toStep4();
    s = reportFadingMiss(s, A, sid(s), { targetId: "a2#1", text: "중점" });
    const done = observeFadingRelearn(s, A, trace(s, A, 4, []), T0);
    expect(
      done.fading.relearn!.items.map((i) => [
        i.propositionId,
        i.origin,
        i.dueAt,
      ]),
    ).toEqual([["a2", "missed", T0 + MIN]]);
  });

  it("이 풀이에서 틀려 들었다가 다 확인하고 나간 명제는, 평가 때 «답을 본 직후»로 다시 들지 않는다", () => {
    const first = afterStep2();
    let state = observeFadingRelearn(
      first.state,
      A,
      trace(first.state, A, 2, first.placements),
      T0,
    ).fading;
    // 풀이를 열어 둔 채 그 명제의 확인을 두 번 맞혀 대기열에서 내보낸다.
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, proposition2, 10),
      T0 + MIN,
    ).fading;
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, proposition2, 11),
      T0 + MIN + FIVE,
    ).fading;
    expect(state.relearn!.items).toEqual([]);
    // 3 · 4단계를 안 틀리고 마치고 «좋음»으로 닫는다(처음 배운 풀이).
    state = rate(step4(step23(state, A, 3).state, A), A, "good", DAY1, 2);
    const done = observeFadingRelearn(
      state,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 7 * MIN,
    );
    expect(done.applied).toEqual({
      entered: 2,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
    expect(
      done.fading.relearn!.items.map((i) => [i.propositionId, i.origin]),
    ).toEqual(
      A.propositions
        .filter((p) => p.id !== proposition2)
        .map((p) => [p.id, "exposed"]),
    );
  });

  it("«답을 본 직후»는 새 줄로만 든다 — 이미 대기열에 있는 줄의 단계 · 확인 시각 · 틀림의 수를 건드리지 않는다", () => {
    const first = afterStep2();
    let state = observeFadingRelearn(
      first.state,
      A,
      trace(first.state, A, 2, first.placements),
      T0,
    ).fading;
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, proposition2, 10),
      T0 + MIN,
    ).fading;
    // 그 풀이의 열쇠가 걷힌 뒤다(다른 개념을 풀다 돌아와 이어 푼 풀이) — 평가는 그 명제를 «아직 세지 않은 것»으로 본다.
    state = { ...state, relearn: { ...state.relearn!, seen: [] } };
    const kept = item(state, proposition2);
    expect(kept).toMatchObject({ stage: "confirm", fails: 1, checks: 1 });
    state = rate(step4(step23(state, A, 3).state, A), A, "good", DAY1, 2);
    const done = observeFadingRelearn(
      state,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 2 * MIN,
    );
    expect(done.applied).toEqual({
      entered: 2,
      updated: 0,
      skipped: 0,
      duplicate: false,
    });
    expect(item(done.fading, proposition2)).toBe(kept);
  });

  it("칩 풀이: 4단계의 틀림을 그 자리에서 세어 두었으면 «다시»가 나머지 명제를 `lapsed` 로 끌고 들어가지 않는다", () => {
    let s = toStep4(false);
    const moves = chips(A, 4, s.session!.seed, [erasedTargets(A, 4)[0]!.id]);
    const slip = moves[0]!;
    const missedProposition = slip.targetId.split("#")[0]!;
    s = reportFadingMiss(s, A, sid(s), slip);
    s = observeFadingRelearn(s, A, trace(s, A, 4, [slip]), T0).fading;
    s = rate(completeFadingStep(s, A, sid(s), 4, moves), A, "again", DAY1, 2);
    expect(s.concepts[A.id]!.marks).toBeUndefined();
    const done = observeFadingRelearn(
      s,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 30_000,
    );
    expect(item(done.fading, missedProposition)).toMatchObject({
      origin: "missed",
      dueAt: T0 + MIN,
      fails: 1,
    });
    // 나머지는 처음 배운 풀이의 틀리지 않은 명제다 — 틀림(`lapsed`)이 아니다.
    expect(
      done.fading
        .relearn!.items.filter((i) => i.propositionId !== missedProposition)
        .map((i) => [i.origin, i.fails]),
    ).toEqual([
      ["exposed", 0],
      ["exposed", 0],
    ]);
  });

  it("🔴 닿지 않은 단계 · 다른 풀이의 번호 · 옛 내용의 토큰 · 꼴이 틀린 차례는 받지 않는다", () => {
    const { before, state, placements } = afterStep2();
    const observe = (
      fading: StoredFading,
      sessionId: string,
      moves = placements,
      step: 2 | 3 | 4 = 2,
    ) =>
      conflictOf(() =>
        observeFadingRelearn(
          fading,
          A,
          { kind: "step", conceptId: A.id, sessionId, step, placements: moves },
          T0,
        ),
      );
    // 아직 닿지 않은 단계 — 서 있는 단계는 2 인데 3 · 4단계의 차례.
    expect(observe(before, token(before, A), [], 3)).toBe(
      "이 풀이에서 푼 단계가 아닙니다.",
    );
    expect(observe(before, token(before, A), [], 4)).toBe(
      "이 풀이에서 푼 단계가 아닙니다.",
    );
    // 복습으로 연 풀이(4단계에서 시작)에 2단계의 차례.
    const review = open(
      rate(learnToRating(emptyFading(), A, DAY1, 1), A, "good", DAY1, 2),
      A,
      LATER,
      3,
    );
    expect(
      conflictOf(() =>
        observeFadingRelearn(
          review,
          A,
          trace(review, A, 2, placements),
          T_LATER,
        ),
      ),
    ).toBe("이 풀이에서 푼 단계가 아닙니다.");
    // 저장 번호(토큰이 아니다) · 남의 번호.
    expect(observe(state, sid(state))).toBe(FADING_CONTENT_CHANGED);
    expect(observe(state, uuid(999))).toBe(FADING_CONTENT_CHANGED);
    // 그 단계에 없는 칩 · 단계를 마친 뒤의 넣기.
    expect(
      observe(state, token(state, A), [{ targetId: target2, chipId: "c999" }]),
    ).toMatch(/이 단계에 없는 칩/);
    expect(
      observe(state, token(state, A), [...placements, placements[0]!]),
    ).toBe("단계를 마친 뒤의 입력입니다.");
    // 풀이가 없는 기록 · 다른 개념의 풀이.
    expect(observe(emptyFading(), token(state, A))).toBe(
      "이 풀이는 열려 있지 않습니다.",
    );
    expect(
      conflictOf(() =>
        observeFadingRelearn(
          state,
          B,
          {
            kind: "step",
            conceptId: B.id,
            sessionId: token(state, A),
            step: 2,
            placements,
          },
          T0,
        ),
      ),
    ).toBe("이 풀이는 열려 있지 않습니다.");
  });

  it("은행의 문장이 고쳐진 뒤에 온 옛 화면의 증거는 받지 않는다(풀이 토큰)", () => {
    const { state, placements } = afterStep2();
    const edited = concept("a", (d) => {
      d[1] = "직각삼각형의 외심은 {빗변}의 {한가운데}이다.";
    });
    expect(
      conflictOf(() =>
        observeFadingRelearn(state, edited, trace(state, A, 2, placements), T0),
      ),
    ).toBe(FADING_CONTENT_CHANGED);
  });

  it("같은 풀이에서 2단계 · 3단계 · 4단계에 거듭 틀리면 틀림이 쌓이고, 확인은 마지막 틀림부터 1분 뒤다", () => {
    const first = afterStep2();
    let state = observeFadingRelearn(
      first.state,
      A,
      trace(first.state, A, 2, first.placements),
      T0,
    ).fading;
    const third = step23(state, A, 3, [target2]);
    state = observeFadingRelearn(
      third.state,
      A,
      trace(third.state, A, 3, third.placements),
      T0 + 40_000,
    ).fading;
    expect(item(state, proposition2)).toMatchObject({
      fails: 2,
      dueAt: T0 + 40_000 + MIN,
      since: T0,
    });
    // 두 단계의 증거를 다 센 뒤에 3단계의 차례가 다시 와도(가장 뒤에 센 단계와 견준다) 그대로다.
    const replayed = observeFadingRelearn(
      state,
      A,
      trace(state, A, 3, third.placements),
      T0 + 50_000,
    );
    expect(replayed.fading).toBe(state);
    expect(replayed.applied.duplicate).toBe(true);
    // 4단계의 틀림은 (그 자리에서 알리지 못했고) 평가 때의 진단으로 처음 닿는다.
    state = rate(step4(state, A, { wrong: [target2] }), A, "again", DAY1, 2);
    const done = observeFadingRelearn(
      state,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0 + 90_000,
    );
    expect(done.applied).toEqual({
      entered: 2,
      updated: 1,
      skipped: 0,
      duplicate: false,
    });
    expect(item(done.fading, proposition2)).toMatchObject({
      origin: "missed",
      fails: 3,
      dueAt: T0 + 90_000 + MIN,
    });
    expect(done.fading.relearn!.seen).toEqual([`${A.id}|1|r`]);
  });
});

describe("🔴 1분의 경계 — 59,999 밀리초에는 못 하고 60,000 밀리초에는 한다", () => {
  it("확인 시각 1밀리초 전에는 받지 않고 아무것도 바뀌지 않는다 — 그 시각부터 받는다", () => {
    const state = seeded().fading;
    expect(view(state, T0 + 59_999).counts).toEqual({
      judging: 0,
      ready: 0,
      waiting: 3,
    });
    expect(view(state, T0 + 59_999).items[0]).toMatchObject({
      state: "waiting",
      waitMs: 1,
    });
    expect(
      conflictOf(() =>
        gradeFadingRelearn(state, A, attempt(state, A, "a2", 10), T0 + 59_999),
      ),
    ).toBe(FADING_RELEARN_NOT_DUE);

    expect(view(state, T0 + 60_000).counts.ready).toBe(3);
    const done = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10),
      T0 + 60_000,
    );
    expect(done.result).toMatchObject({
      verdict: "passed",
      next: { stage: "confirm", dueAt: T0 + 60_000 + FIVE },
      replayed: false,
    });
    expectLongTermUntouched(state, done.fading);
  });
});

describe("🔴 5분의 경계 — 299,999 밀리초에는 못 하고 300,000 밀리초에는 한다", () => {
  const passedOnce = () => {
    const state = seeded().fading;
    return gradeFadingRelearn(state, A, attempt(state, A, "a2", 10), T0 + MIN)
      .fading;
  };

  it("도움 없이 맞힌 뒤의 다시 확인은 그때부터 5분 뒤다 — 1밀리초 전에는 받지 않는다", () => {
    const state = passedOnce();
    const at = T0 + MIN;
    expect(item(state, "a2")).toMatchObject({
      stage: "confirm",
      dueAt: at + FIVE,
      fails: 1,
      checks: 1,
    });
    expect(
      conflictOf(() =>
        gradeFadingRelearn(state, A, attempt(state, A, "a2", 11), at + 299_999),
      ),
    ).toBe(FADING_RELEARN_NOT_DUE);
    const cleared = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 11),
      at + 300_000,
    );
    expect(cleared.result).toMatchObject({ verdict: "passed", next: null });
    expect(
      cleared.fading.relearn!.items.some((i) => i.propositionId === "a2"),
    ).toBe(false);
    expect(cleared.fading.relearn!.day).toEqual({
      on: DAY1,
      checks: 2,
      cleared: 1,
      entered: 3,
    });
    expectLongTermUntouched(state, cleared.fading);
  });

  it("다시 확인에서 틀리면 1분 뒤로 돌아가고, 틀린 증거는 남는다 — 그 뒤에 맞혀도 틀림의 수는 줄지 않는다", () => {
    const state = passedOnce();
    const at = T0 + MIN + FIVE;
    const failed = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 11, { "a2#1": "중점" }),
      at,
    );
    expect(failed.result).toMatchObject({
      verdict: "failed",
      next: { stage: "retry", dueAt: at + MIN },
      targets: [
        { targetId: "a2#1", outcome: "wrong" },
        { targetId: "a2#2", outcome: "correct" },
      ],
    });
    expect(item(failed.fading, "a2")).toMatchObject({
      stage: "retry",
      fails: 2,
      checks: 2,
    });
    const passed = gradeFadingRelearn(
      failed.fading,
      A,
      attempt(failed.fading, A, "a2", 12),
      at + MIN,
    );
    expect(item(passed.fading, "a2")).toMatchObject({
      stage: "confirm",
      dueAt: at + MIN + FIVE,
      fails: 2,
      checks: 3,
    });
  });
});

describe("확인의 판정", () => {
  it("자판의 다른 꼴은 같은 답이다 — 띄어쓰기 · 수식 표시 · 분수의 자판 꼴", () => {
    const state = seeded().fading;
    const done = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a3", 10, { "a3#1": "c / 2" }),
      T0 + MIN,
    );
    expect(done.result).toMatchObject({
      verdict: "passed",
      targets: [{ targetId: "a3#1", outcome: "correct" }],
    });
  });

  it("넘긴 빈칸(«아직 모르겠어요»)은 틀림이다 — 넘기지 않고 덜 쓴 답은 받지 않는다", () => {
    const state = seeded().fading;
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          state,
          A,
          attempt(state, A, "a1", 10, { "a1#2": null }),
          T0 + MIN,
        ),
      ),
    ).toBe(FADING_RELEARN_INCOMPLETE);
    const done = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a1", 10, { "a1#2": null }, { gaveUp: true }),
      T0 + MIN,
    );
    expect(done.result).toMatchObject({
      verdict: "failed",
      next: { stage: "retry", dueAt: T0 + 2 * MIN },
      targets: [
        { targetId: "a1#1", outcome: "correct" },
        { targetId: "a1#2", outcome: "skipped" },
      ],
    });
    // 답을 본 직후라 들었던 줄(`exposed`)에 틀림이 적힌다 — 들어온 까닭은 그대로다.
    expect(item(done.fading, "a1")).toMatchObject({
      origin: "exposed",
      fails: 1,
      checks: 1,
    });
  });

  it("🔴 도움을 받아 채운 답은 맞아도 «도움 없이 맞힘»이 아니다 — 1분 뒤로 돌아가고, 5분 뒤를 기다리던 줄도 되돌린다. 틀림으로 세지는 않는다", () => {
    const state = seeded().fading;
    const helped = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a1", 10, {}, { assisted: true }),
      T0 + MIN,
    );
    expect(helped.result).toMatchObject({
      verdict: "assisted",
      next: { stage: "retry", dueAt: T0 + 2 * MIN },
    });
    expect(item(helped.fading, "a1")).toMatchObject({ fails: 0, checks: 1 });

    // 한 번 도움 없이 맞혀 5분 뒤를 기다리던 줄.
    const passed = gradeFadingRelearn(
      helped.fading,
      A,
      attempt(helped.fading, A, "a1", 11),
      T0 + 2 * MIN,
    ).fading;
    expect(item(passed, "a1").stage).toBe("confirm");
    const at = T0 + 2 * MIN + FIVE;
    const again = gradeFadingRelearn(
      passed,
      A,
      attempt(passed, A, "a1", 12, {}, { assisted: true }),
      at,
    );
    expect(again.result).toMatchObject({
      verdict: "assisted",
      next: { stage: "retry", dueAt: at + MIN },
    });
    expect(item(again.fading, "a1")).toMatchObject({
      stage: "retry",
      fails: 0,
      checks: 3,
    });
    // 도움을 받았는데 틀리기까지 했으면 틀림이다.
    const wrong = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 13, { "a2#1": "중점" }, { assisted: true }),
      T0 + MIN,
    );
    expect(wrong.result.verdict).toBe("failed");
    expect(item(wrong.fading, "a2").fails).toBe(2);
  });

  it("이 명제에 없는 빈칸 · 견줄 글자가 없는 글은 받지 않는다", () => {
    const state = seeded().fading;
    const base = attempt(state, A, "a3", 10);
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          state,
          A,
          { ...base, answers: [{ targetId: "a2#1", text: "빗변" }] },
          T0 + MIN,
        ),
      ),
    ).toBe("이 명제에 없는 빈칸입니다.");
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          state,
          A,
          { ...base, answers: [{ targetId: "a3#1", text: " , " }] },
          T0 + MIN,
        ),
      ),
    ).toBe("견줄 글자가 없는 답입니다.");
  });

  it("대기열에 없는 명제 · 빼 버린 개념의 확인은 받지 않는다", () => {
    const state = seeded().fading;
    const base = attempt(state, A, "a3", 10);
    expect(
      conflictOf(() =>
        gradeFadingRelearn(state, B, { ...base, conceptId: B.id }, T0 + MIN),
      ),
    ).toBe(FADING_RELEARN_GONE);
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          state,
          A,
          { ...base, propositionId: "a9" },
          T0 + MIN,
        ),
      ),
    ).toBe(FADING_RELEARN_GONE);
    expect(
      conflictOf(() => gradeFadingRelearn(emptyFading(), A, base, T0 + MIN)),
    ).toBe(FADING_RELEARN_GONE);
  });
});

describe("🔴 못 알아본 글은 틀림이 아니다 — 적어 둔 뒤에 대조한다", () => {
  const UNKNOWN = "빗변의 절반";
  const answered = () => {
    const state = seeded().fading;
    return {
      before: state,
      ...gradeFadingRelearn(
        state,
        A,
        attempt(state, A, "a3", 10, { "a3#1": UNKNOWN }),
        T0 + MIN,
      ),
    };
  };

  it("판정하지 않고 적어 둔다 — 일정 · 틀림의 수 · 영수증 · 집계가 그대로이고, 새로 읽어도 같은 대조가 선다", () => {
    const { before, fading, result } = answered();
    expect(result).toEqual({
      attemptId: uuid(10),
      conceptId: A.id,
      propositionId: "a3",
      verdict: "judging",
      targets: [{ targetId: "a3#1", outcome: "unknown" }],
      next: { stage: "retry", dueAt: T0 + MIN },
      replayed: false,
    });
    expect(item(fading, "a3")).toEqual({
      ...item(before, "a3"),
      pending: {
        attemptId: uuid(10),
        at: T0 + MIN,
        digest: fadingPropositionDigest(A.propositions[2]!),
        answers: [{ targetId: "a3#1", text: UNKNOWN }],
      },
    });
    expect(fading.relearn!.graded).toEqual([]);
    expect(fading.relearn!.day).toEqual(before.relearn!.day);
    expectLongTermUntouched(before, fading);
    // 새로 고침 — 저장된 글에서 그대로 다시 읽힌다.
    const reloaded = storedFadingSchema.parse(
      JSON.parse(JSON.stringify(fading)),
    );
    const shown = view(reloaded, T0 + MIN + 5_000).items[0]!;
    expect(shown).toMatchObject({
      key: `${A.id}/a3`,
      state: "judging",
      waitMs: 0,
      pending: {
        attemptId: uuid(10),
        answers: [{ targetId: "a3#1", text: UNKNOWN, outcome: "unknown" }],
      },
    });
  });

  it("대조가 남은 줄은 다시 쓸 수 없다(기준안을 본 뒤다) — 같은 번호의 되풀이는 같은 답이다", () => {
    const { fading } = answered();
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          fading,
          A,
          attempt(fading, A, "a3", 11),
          T0 + 10 * MIN,
        ),
      ),
    ).toBe(FADING_RELEARN_JUDGING);
    const again = gradeFadingRelearn(
      fading,
      A,
      // 같은 번호로 맞는 답을 다시 보내도 처음 적힌 글이 그대로다.
      attempt(fading, A, "a3", 10),
      T0 + 10 * MIN,
    );
    expect(again.fading).toBe(fading);
    expect(again.result).toMatchObject({
      verdict: "judging",
      targets: [{ targetId: "a3#1", outcome: "unknown" }],
      replayed: true,
    });
  });

  it("«같은 뜻»이면 도움 없이 맞힌 것이다 — 고른 그때부터 5분 뒤 다시 확인", () => {
    const { fading } = answered();
    const at = T0 + MIN + 20_000;
    const done = judgeFadingRelearn(
      fading,
      A,
      {
        conceptId: A.id,
        propositionId: "a3",
        attemptId: uuid(10),
        judged: { "a3#1": "same" },
      },
      at,
    );
    expect(done.result).toEqual({
      attemptId: uuid(10),
      conceptId: A.id,
      propositionId: "a3",
      verdict: "passed",
      targets: [{ targetId: "a3#1", outcome: "same" }],
      next: { stage: "confirm", dueAt: at + FIVE },
      replayed: false,
    });
    expect(item(done.fading, "a3")).toMatchObject({
      stage: "confirm",
      fails: 0,
      checks: 1,
    });
    expect("pending" in item(done.fading, "a3")).toBe(false);
    expectLongTermUntouched(fading, done.fading);
  });

  it("«다름»이면 틀림이다 — 1분 뒤 · 틀림의 수 +1", () => {
    const { fading } = answered();
    const at = T0 + MIN + 20_000;
    const done = judgeFadingRelearn(
      fading,
      A,
      {
        conceptId: A.id,
        propositionId: "a3",
        attemptId: uuid(10),
        judged: { "a3#1": "different" },
      },
      at,
    );
    expect(done.result).toMatchObject({
      verdict: "failed",
      targets: [{ targetId: "a3#1", outcome: "different" }],
      next: { stage: "retry", dueAt: at + MIN },
    });
    expect(item(done.fading, "a3")).toMatchObject({ fails: 1, checks: 1 });
  });

  it("못 알아본 글을 다 고르지 않았거나, 고를 것이 아닌 빈칸을 고르면 받지 않는다", () => {
    const state = seeded().fading;
    const { fading } = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10, { "a2#1": "가장 긴 변" }),
      T0 + MIN,
    );
    const judge = (judged: Record<string, "same" | "different">, n = 10) =>
      conflictOf(() =>
        judgeFadingRelearn(
          fading,
          A,
          { conceptId: A.id, propositionId: "a2", attemptId: uuid(n), judged },
          T0 + 2 * MIN,
        ),
      );
    expect(judge({})).toBe("기준안과 대조할 답을 다 골라 주세요.");
    // 맞게 쓴 빈칸(`a2#2`)은 고를 것이 아니다.
    expect(judge({ "a2#1": "same", "a2#2": "same" })).toBe(
      "대조를 기다리는 빈칸이 아닙니다.",
    );
    expect(judge({ "a2#1": "same" }, 11)).toBe(
      "대조를 기다리는 확인이 아닙니다.",
    );
    const done = judgeFadingRelearn(
      fading,
      A,
      {
        conceptId: A.id,
        propositionId: "a2",
        attemptId: uuid(10),
        judged: { "a2#1": "same" },
      },
      T0 + 2 * MIN,
    );
    expect(done.result.targets).toEqual([
      { targetId: "a2#1", outcome: "same" },
      { targetId: "a2#2", outcome: "correct" },
    ]);
  });

  it("틀린 글이 섞여 있으면 대조 없이 틀림이다 — 못 알아본 글이 있어도", () => {
    const state = seeded().fading;
    const done = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10, { "a2#1": "가장 긴 변", "a2#2": "빗변" }),
      T0 + MIN,
    );
    expect(done.result).toMatchObject({
      verdict: "failed",
      targets: [
        { targetId: "a2#1", outcome: "unknown" },
        { targetId: "a2#2", outcome: "wrong" },
      ],
    });
    expect("pending" in item(done.fading, "a2")).toBe(false);
  });
});

describe("🔴 같은 요청의 되풀이 — 한 번만 적용되고, 틀림이 맞음으로 바뀌지 않는다", () => {
  it("판정이 난 확인을 같은 번호로 다시 보내면 처음의 결과가 돌아가고 아무것도 바뀌지 않는다 — 답을 고쳐 보내도", () => {
    const state = seeded().fading;
    const failed = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10, { "a2#1": "중점" }),
      T0 + MIN,
    );
    for (const now of [T0 + MIN, T0 + 2 * MIN, T0 + 30 * MIN]) {
      const again = gradeFadingRelearn(
        failed.fading,
        A,
        // 같은 번호 · 이번에는 전부 맞는 답 · 옛 토큰.
        { ...attempt(state, A, "a2", 10) },
        now,
      );
      expect(again.fading).toBe(failed.fading);
      expect(again.result).toEqual({ ...failed.result, replayed: true });
    }
    expect(item(failed.fading, "a2")).toMatchObject({ fails: 2, checks: 1 });
  });

  it("대기열에서 나간 확인의 되풀이도 처음의 결과다 — 줄이 없어도", () => {
    let state = seeded().fading;
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a3", 10),
      T0 + MIN,
    ).fading;
    const last = attempt(state, A, "a3", 11);
    const cleared = gradeFadingRelearn(state, A, last, T0 + MIN + FIVE);
    const again = gradeFadingRelearn(cleared.fading, A, last, T0 + 9 * MIN);
    expect(again.fading).toBe(cleared.fading);
    expect(again.result).toEqual({ ...cleared.result, replayed: true });
  });

  it("대조의 되풀이도 한 번만 — 처음 «다름»으로 낸 것을 «같은 뜻»으로 바꿀 수 없다", () => {
    const state = seeded().fading;
    const { fading } = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a3", 10, { "a3#1": "빗변의 절반" }),
      T0 + MIN,
    );
    const judgement = (choice: "same" | "different") => ({
      conceptId: A.id,
      propositionId: "a3",
      attemptId: uuid(10),
      judged: { "a3#1": choice },
    });
    const first = judgeFadingRelearn(
      fading,
      A,
      judgement("different"),
      T0 + MIN,
    );
    const again = judgeFadingRelearn(
      first.fading,
      A,
      judgement("same"),
      T0 + 2 * MIN,
    );
    expect(again.fading).toBe(first.fading);
    expect(again.result).toEqual({ ...first.result, replayed: true });
    expect(item(first.fading, "a3").fails).toBe(1);
  });

  it("일정이 옮겨진 뒤에 온 옛 확인의 답(다른 번호 · 옛 토큰)은 받지 않는다", () => {
    const state = seeded().fading;
    const stale = attempt(state, A, "a2", 20);
    const moved = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10),
      T0 + MIN,
    ).fading;
    expect(
      conflictOf(() => gradeFadingRelearn(moved, A, stale, T0 + MIN + FIVE)),
    ).toBe(FADING_RELEARN_CHANGED);
  });

  it("영수증은 쓰는 쪽의 상한까지만 남는다", () => {
    let state = seeded().fading;
    // 하루 30회 상한(2026-10-17)이 있어 세 시간씩 띄워 여러 날에 나눈다.
    for (let n = 0; n < FADING_RELEARN_RECEIPTS_MAX + 3; n++) {
      const now = T0 + (n + 1) * 3 * 3_600_000;
      state = gradeFadingRelearn(
        state,
        A,
        attempt(state, A, "a1", 100 + n, {}, { assisted: true }),
        now,
      ).fading;
    }
    expect(state.relearn!.graded).toHaveLength(FADING_RELEARN_RECEIPTS_MAX);
    expect(state.relearn!.graded.at(-1)!.attemptId).toBe(
      uuid(100 + FADING_RELEARN_RECEIPTS_MAX + 2),
    );
    expect(storedFadingSchema.safeParse(state).success).toBe(true);
  });
});

describe("🔴 은행의 문장이 고쳐진 뒤 — 옛 화면의 답과 옛 답의 대조를 받지 않는다", () => {
  const EDITED = concept("a", (d) => {
    d[1] = "직각삼각형의 외심은 {빗변}의 {한가운데}이다.";
  });
  const EDITED_MAP = new Map([[EDITED.id, EDITED]]);

  it("고친 내용에서는 옛 토큰의 답을 받지 않는다 — 새로 읽은 토큰으로는 받고, 대기열은 «바뀜»을 알린다", () => {
    const state = seeded().fading;
    const old = attempt(state, A, "a2", 10);
    expect(
      conflictOf(() => gradeFadingRelearn(state, EDITED, old, T0 + MIN)),
    ).toBe(FADING_RELEARN_CHANGED);
    // 고쳐지지 않은 명제의 답도 옛 토큰이면 받지 않는다 — 견주기는 개념 전체(다른 명제의 답)를 본다.
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          state,
          EDITED,
          attempt(state, A, "a1", 11),
          T0 + MIN,
        ),
      ),
    ).toBe(FADING_RELEARN_CHANGED);
    const shown = fadingRelearnQueueView({
      fading: state,
      concepts: EDITED_MAP,
      now: T0 + MIN,
    });
    expect(shown.items.map((i) => [i.propositionId, i.changed])).toEqual([
      ["a1", false],
      ["a2", true],
      ["a3", false],
    ]);
    const fresh = shown.items.find((i) => i.propositionId === "a2")!;
    const done = gradeFadingRelearn(
      state,
      EDITED,
      {
        ...old,
        token: fresh.token,
        answers: [
          { targetId: "a2#1", text: "빗변" },
          { targetId: "a2#2", text: "한가운데" },
        ],
      },
      T0 + MIN,
    );
    expect(done.result.verdict).toBe("passed");
    // 확인한 내용의 지문으로 고쳐 적는다 — 그 뒤로는 «바뀜»이 아니다.
    expect(item(done.fading, "a2").digest).toBe(
      fadingPropositionDigest(EDITED.propositions[1]!),
    );
  });

  it("답을 쓴 뒤에 문장이 고쳐지면 그 답은 대조하지 않는다 — 판정 없이 다시 쓰게 하되, 답을 쓴 때부터 1분은 지나야 한다", () => {
    const state = seeded().fading;
    const at = T0 + 3 * MIN;
    const { fading } = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10, { "a2#2": "가운데 점" }),
      at,
    );
    expect(
      conflictOf(() =>
        judgeFadingRelearn(
          fading,
          EDITED,
          {
            conceptId: A.id,
            propositionId: "a2",
            attemptId: uuid(10),
            judged: { "a2#2": "same" },
          },
          at + 1,
        ),
      ),
    ).toBe(FADING_RELEARN_CHANGED);
    const queue = (now: number) =>
      fadingRelearnQueueView({ fading, concepts: EDITED_MAP, now }).items.find(
        (i) => i.propositionId === "a2",
      )!;
    // 대조는 서지 않는다 — 답을 쓴 때부터 1분을 기다린 뒤 다시 쓴다.
    expect(queue(at + 59_999)).toMatchObject({
      state: "waiting",
      waitMs: 1,
      dueAt: at + MIN,
      changed: true,
    });
    expect("pending" in queue(at + 59_999)).toBe(false);
    const ready = queue(at + MIN);
    expect(ready.state).toBe("ready");
    const fresh = {
      conceptId: A.id,
      propositionId: "a2",
      token: ready.token,
      attemptId: uuid(11),
      answers: [
        { targetId: "a2#1", text: "빗변" },
        { targetId: "a2#2", text: "한가운데" },
      ],
    };
    expect(
      conflictOf(() => gradeFadingRelearn(fading, EDITED, fresh, at + 59_999)),
    ).toBe(FADING_RELEARN_NOT_DUE);
    const done = gradeFadingRelearn(fading, EDITED, fresh, at + MIN);
    expect(done.result.verdict).toBe("passed");
    expect("pending" in item(done.fading, "a2")).toBe(false);
    // 옛 답은 판정된 적이 없다 — 틀림으로 세지 않았다.
    expect(item(done.fading, "a2").fails).toBe(1);
  });

  it("은행에서 사라진 개념 · 명제의 줄과 빼 버린 개념의 줄은 내려가지 않는다", () => {
    const state = seeded().fading;
    const shrunk = { ...A, propositions: A.propositions.slice(0, 2) };
    expect(
      fadingRelearnQueueView({
        fading: state,
        concepts: new Map([[A.id, shrunk]]),
        now: T0 + MIN,
      }).items.map((i) => i.propositionId),
    ).toEqual(["a1", "a2"]);
    expect(
      fadingRelearnQueueView({ fading: state, concepts: new Map(), now: T0 })
        .items,
    ).toEqual([]);
  });
});

describe("대기열에 이미 있는 줄에 새 증거가 닿으면", () => {
  /** A 를 처음 배워 든 줄을 한 번 맞혀 5분 뒤를 기다리게 한 뒤, 다음 복습에서 다시 틀린다. */
  it("틀림은 5분 뒤를 기다리던 줄도 1분 뒤로 되돌리고 틀림을 더한다 — 기다리던 대조는 걷힌다", () => {
    let state = seeded(T0, {}).fading; // 전부 `exposed`
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a1", 10),
      T0 + MIN,
    ).fading;
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 11, { "a2#1": "가장 긴 변" }),
      T0 + MIN,
    ).fading;
    expect(item(state, "a1").stage).toBe("confirm");
    expect(item(state, "a2").pending).toBeDefined();
    // 다음 복습(10월 20일)에서 a1 · a2 를 틀려 «다시».
    const lapse = rate(
      step4(open(state, A, LATER, 3), A, { wrong: ["a1#1", "a2#2"] }),
      A,
      "again",
      LATER,
      4,
    );
    const done = observeFadingRelearn(
      lapse,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(4) },
      T_LATER,
    );
    expect(done.applied).toEqual({
      entered: 0,
      updated: 2,
      skipped: 0,
      duplicate: false,
    });
    expect(item(done.fading, "a1")).toMatchObject({
      stage: "retry",
      dueAt: T_LATER + MIN,
      origin: "missed",
      fails: 1,
      checks: 1,
      since: T0,
    });
    expect(item(done.fading, "a2")).toMatchObject({
      stage: "retry",
      origin: "missed",
      fails: 1,
    });
    expect("pending" in item(done.fading, "a2")).toBe(false);
    // 틀리지 않은 a3 은 그대로다(복습이라 `exposed` 도 다시 들지 않는다).
    expect(item(done.fading, "a3")).toBe(item(state, "a3"));
    expectLongTermUntouched(lapse, done.fading);
  });

  it("자리가 없으면 틀림이 먼저다 — 틀린 적 없는 `exposed` 줄을 내보내고 들고, `exposed` 는 들지 못한다", () => {
    const rated = rate(
      learnToRating(emptyFading(), A, DAY1, 1, { wrong: ["a2#1"] }),
      A,
      "again",
      DAY1,
      2,
    );
    const filler = (n: number, origin: "missed" | "exposed") =>
      ({
        conceptId: A.id,
        propositionId: `z${n}`,
        digest: "00000000",
        stage: "retry",
        dueAt: T0,
        origin,
        since: T0 - 1_000 + n,
        fails: origin === "missed" ? 1 : 0,
        checks: 0,
      }) satisfies StoredFadingRelearnItem;
    const full: StoredFading = {
      ...rated,
      relearn: {
        version: 1,
        items: [
          ...Array.from({ length: FADING_RELEARN_ITEMS_MAX - 2 }, (_, n) =>
            filler(n, "missed"),
          ),
          filler(900, "exposed"),
          filler(901, "exposed"),
        ],
        seen: [],
        graded: [],
        day: null,
      },
    };
    const done = observeFadingRelearn(
      full,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      T0,
    );
    // a1 · a3 은 `exposed` 라 들지 못하고, 틀린 a2 는 가장 오래된 깨끗한 `exposed`(z900)를 내보내고 든다.
    expect(done.applied).toEqual({
      entered: 1,
      updated: 0,
      skipped: 2,
      duplicate: false,
    });
    const ids = done.fading.relearn!.items.map((i) => i.propositionId);
    expect(ids).toHaveLength(FADING_RELEARN_ITEMS_MAX);
    expect(ids).toContain("a2");
    expect(ids).toContain("z901");
    expect(ids).not.toContain("z900");
    expect(storedFadingSchema.safeParse(done.fading).success).toBe(true);
  });
});

describe("🔴 대기열은 남는다 — 새로 고침 · 자리를 떴다 돌아옴 · 자정", () => {
  it("저장된 글에서 다시 읽어도 같은 대기열이고, 떠나 있던 사이에 때가 된 확인이 준비돼 있다", () => {
    const state = seeded().fading;
    const reloaded = storedFadingSchema.parse(
      JSON.parse(JSON.stringify(state)),
    );
    expect(reloaded).toStrictEqual(state);
    expect(view(reloaded, T0 + 30_000)).toEqual(view(state, T0 + 30_000));
    const back = view(reloaded, T0 + 47 * MIN);
    expect(back.counts).toEqual({ judging: 0, ready: 3, waiting: 0 });
    expect(back.nextDueAt).toBeNull();
    const done = gradeFadingRelearn(
      reloaded,
      A,
      attempt(reloaded, A, "a2", 10),
      T0 + 47 * MIN,
    );
    expect(done.result.next).toEqual({
      stage: "confirm",
      dueAt: T0 + 47 * MIN + FIVE,
    });
  });

  it("자정을 넘겨도 줄과 확인 시각은 그대로다 — 그날의 집계만 새 날로 넘어간다", () => {
    // 한국 10월 6일 23:59:30 에 평가하고 알린다.
    const night = Date.UTC(2026, 9, 6, 14, 59, 30);
    const state = seeded(night).fading;
    expect(state.relearn!.day).toMatchObject({ on: DAY1, entered: 3 });
    // 23:59:59.999 — 아직 1분이 안 됐다.
    expect(view(state, night + 29_999).today.on).toBe(DAY1);
    expect(view(state, night + 59_999).counts.ready).toBe(0);
    // 다음 날 00:00:30 — 때가 됐다. 오늘의 집계는 새 날의 0 에서 시작한다.
    const after = view(state, night + MIN);
    expect(after.today).toEqual({
      on: DAY2,
      checks: 0,
      cleared: 0,
      entered: 0,
    });
    expect(after.counts.ready).toBe(3);
    const done = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a2", 10),
      night + MIN,
    );
    expect(done.fading.relearn!.day).toEqual({
      on: DAY2,
      checks: 1,
      cleared: 0,
      entered: 0,
    });
    expect(item(done.fading, "a2").dueAt).toBe(night + MIN + FIVE);
    expectLongTermUntouched(state, done.fading);
  });
});

describe("화면에 내려가는 대기열", () => {
  it("대조를 기다리는 것 → 지금 확인할 것(먼저 때가 된 것부터) → 기다리는 것 차례이고, 내용은 줄이 가리키는 개념만 있다", () => {
    let state = seeded().fading;
    // a1 을 맞혀 5분 뒤로, a3 은 못 알아본 글로 대조를 기다리게.
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a1", 10),
      T0 + MIN,
    ).fading;
    state = gradeFadingRelearn(
      state,
      A,
      attempt(state, A, "a3", 11, { "a3#1": "빗변의 절반" }),
      T0 + MIN,
    ).fading;
    const queue = view(state, T0 + 2 * MIN);
    expect(queue.enabled).toBe(true);
    expect(queue.now).toBe(T0 + 2 * MIN);
    expect(queue.items.map((i) => [i.propositionId, i.state, i.stage])).toEqual(
      [
        ["a3", "judging", "retry"],
        ["a2", "ready", "retry"],
        ["a1", "waiting", "confirm"],
      ],
    );
    expect(queue.items[2]).toMatchObject({
      waitMs: FIVE - MIN,
      dueAt: T0 + MIN + FIVE,
    });
    expect(queue.counts).toEqual({ judging: 1, ready: 1, waiting: 1 });
    expect(queue.nextDueAt).toBe(T0 + MIN + FIVE);
    expect(Object.keys(queue.contents)).toEqual([A.id]);
    expect(queue.contents[A.id]).toEqual({ concept: A, traps: [] });
    // 토큰은 줄마다 다르고, 일정이 같으면 다시 읽어도 같다.
    expect(new Set(queue.items.map((i) => i.token)).size).toBe(3);
    expect(
      view(state, T0 + 3 * MIN)
        .items.map((i) => i.token)
        .sort(),
    ).toEqual(queue.items.map((i) => i.token).sort());
  });

  it("쓰는 길이 닫혀 있으면 저장 칸을 보지 않고 빈 대기열을 낸다", () => {
    const state = seeded().fading;
    const off = fadingRelearnQueueView({
      fading: state,
      concepts: CONCEPTS,
      now: T0 + MIN,
      enabled: false,
    });
    expect(fadingRelearnQueueSchema.parse(off)).toEqual({
      enabled: false,
      now: T0 + MIN,
      intervals: { retryMs: 60_000, confirmMs: 300_000 },
      items: [],
      contents: {},
      counts: { judging: 0, ready: 0, waiting: 0 },
      nextDueAt: null,
      today: { on: DAY1, checks: 0, cleared: 0, entered: 0 },
    });
  });

  it("고른 것을 뺀 개념의 줄은 내려가지 않고, 다음 쓰기에서 걷힌다", () => {
    // 평가 전인 개념(B)의 2단계에서 틀려 든 줄 → B 를 뺀다.
    let s = open(seeded().fading, B, DAY1, 5);
    s = completeFadingReading(s, B.id, sid(s));
    const target = erasedTargets(B, 2)[0]!.id;
    const second = step23(s, B, 2, [target]);
    s = observeFadingRelearn(
      second.state,
      B,
      {
        kind: "step",
        conceptId: B.id,
        sessionId: token(second.state, B),
        step: 2,
        placements: second.placements,
      },
      T0,
    ).fading;
    expect(view(s, T0 + MIN).items).toHaveLength(4);
    const dropped = dropFadingConcept(s, B.id);
    expect(view(dropped, T0 + MIN).items.map((i) => i.conceptId)).toEqual([
      A.id,
      A.id,
      A.id,
    ]);
    const next = gradeFadingRelearn(
      dropped,
      A,
      attempt(dropped, A, "a1", 10),
      T0 + MIN,
    ).fading;
    expect(next.relearn!.items.every((i) => i.conceptId === A.id)).toBe(true);
    // 닫힌 풀이의 2단계 열쇠도 같이 걷힌다.
    expect(next.relearn!.seen).toEqual([`${A.id}|1|r`]);
  });
});

describe("🔴 장기 일정과 따로 돈다 — 같은 날 몇 번을 다시 맞혀도", () => {
  it("대기열의 모든 행동을 지나도 안정도 · 난이도 · 복습일 · 횟수 · «다시» 횟수 · 집계 · 연속 · 영수증 · 열린 풀이가 글자 그대로다", () => {
    // A 는 평가까지 닫고(«다시»), B 의 풀이는 열어 둔 채로 대기열을 돈다.
    const rated = rate(
      learnToRating(emptyFading(), A, DAY1, 1, { wrong: ["a2#1"] }),
      A,
      "again",
      DAY1,
      2,
    );
    const base = open(rated, B, DAY1, 5);
    const frozen = JSON.stringify(base);
    // 옛 규칙의 `exposed` 줄(1분 뒤)로 — 확인을 여러 번 지나게 하려고(`legacyExposed`).
    let state = legacyExposed(
      applyFadingRelearnAction(
        base,
        {
          action: "record",
          observation: { kind: "rated", conceptId: A.id, requestId: uuid(2) },
        },
        A,
        T0,
      ),
    ).fading;
    let now = T0;
    let n = 50;
    // 세 명제를 대기열에서 다 내보낸다 — 틀림 · 도움 · 대조(같은 뜻) · 맞힘을 섞어.
    const grade = (
      propositionId: string,
      texts: Record<string, string | null> = {},
      extra: Partial<FadingRelearnAttempt> = {},
    ) => {
      const done = applyFadingRelearnAction(
        state,
        {
          action: "grade",
          attempt: attempt(state, A, propositionId, n++, texts, extra),
        },
        A,
        now,
      );
      state = done.fading;
      return done.result!;
    };
    now += MIN;
    expect(grade("a2", { "a2#1": "중점" }).verdict).toBe("failed");
    expect(grade("a1", {}, { assisted: true }).verdict).toBe("assisted");
    const waiting = grade("a3", { "a3#1": "빗변의 절반" });
    expect(waiting.verdict).toBe("judging");
    state = applyFadingRelearnAction(
      state,
      {
        action: "judge",
        judgement: {
          conceptId: A.id,
          propositionId: "a3",
          attemptId: waiting.attemptId,
          judged: { "a3#1": "same" },
        },
      },
      A,
      now,
    ).fading;
    now += MIN;
    expect(grade("a2").verdict).toBe("passed");
    expect(grade("a1").verdict).toBe("passed");
    now += FIVE;
    expect(grade("a3").next).toBeNull();
    expect(grade("a2").next).toBeNull();
    expect(grade("a1").next).toBeNull();
    expect(state.relearn!.items).toEqual([]);
    expect(state.relearn!.day).toEqual({
      on: DAY1,
      checks: 8,
      cleared: 3,
      entered: 3,
    });

    // 대기열 밖은 글자 하나 바뀌지 않았다.
    const rest: Partial<StoredFading> = { ...state };
    delete rest.relearn;
    expect(JSON.stringify(rest)).toBe(frozen);
    expectLongTermUntouched(base, state);
    // A 의 장기 기록: «다시» 한 번 그대로 — 대기열에서 여섯 번 맞힌 것이 복습 횟수도, 성공도 되지 않았다.
    expect(state.concepts[A.id]).toMatchObject({
      reviews: 1,
      lapses: 1,
      reviewedOn: DAY1,
      dueOn: DAY2,
    });
    expect(state.days).toEqual([
      { date: DAY1, reviews: 1, passed: 0, fresh: 1 },
    ]);
    expect(state.receipts).toHaveLength(1);
    // 열어 둔 B 의 풀이도 그대로다.
    expect(state.session).toBe(base.session);
  });
});
