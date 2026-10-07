// @vitest-environment node
// «오늘 할 일»을 짓는 함수(`explorerDaily.ts`) — 작은 개념 묶음과 손으로 지은 저장 칸으로 돈다(은행을 싣지 않는다).
import { describe, expect, it } from "vitest";
import {
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
  type StoredFadingConcept,
} from "@/contracts/fading.contract";
import {
  fadingDailyPlanSchema,
  type FadingDailyPlan,
  type FadingDailyRecall,
} from "@/contracts/fadingDaily.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import {
  buildFadingDailyPlan,
  fadingLinkEvidence,
  type FadingDailyWorkload,
  type FadingPrerequisiteBasis,
} from "@/lib/fading/explorerDaily";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FADING_DAILY_CAP } from "@/lib/fading/numbers";
import { FadingSourceError } from "@/lib/fading/source";
import { emptyFading } from "@/lib/fading/state";

const TODAY = "2026-10-07";
const TARGET = "초5::2-2 분수의 곱셈::2-2-1 (분수)×(자연수)";
const BEFORE = "초5::1-5 분수의 덧셈과 뺄셈::1-5-4 대분수의 뺄셈";
const OTHER = "중2::1. 유리수와 순환소수::유리수와 순환소수";

/** 명제가 `prompts` 개인 개념 묶음 — 명제마다 빈칸 하나. */
function concept(
  id: string,
  prompts = 3,
  section = OTHER,
  level: FadingConcept["level"] = "하",
  ordinal = 1,
): FadingConcept {
  return {
    id,
    section,
    level,
    ordinal,
    siblings: 3,
    propositions: Array.from({ length: prompts }, (_, i) => ({
      id: `${id}-p${i + 1}`,
      term: `용어 ${id}-${i + 1}`,
      kind: "정의" as const,
      pieces: [
        { kind: "text" as const, text: "앞글 " },
        {
          kind: "target" as const,
          target: {
            id: `${id}-p${i + 1}#1`,
            text: `답${i + 1}`,
            tier: "text" as const,
          },
        },
      ],
    })),
  };
}

/** 평가한 개념 — 같은 날 평가했으면 안정도가 작을수록 망각 위험이 크다. */
const rated = (
  over: Partial<StoredFadingConcept> = {},
): StoredFadingConcept => ({
  step: 4,
  stability: 5,
  difficulty: 5,
  reviewedOn: "2026-10-01",
  dueOn: "2026-10-06",
  digest: "00000000",
  reviews: 2,
  lapses: 0,
  addedOn: "2026-09-20",
  ...over,
});
const picked = (step: 1 | 2 | 3 | 4 = 1): StoredFadingConcept => ({
  step,
  stability: null,
  difficulty: null,
  reviewedOn: null,
  dueOn: null,
  digest: null,
  reviews: 0,
  lapses: 0,
  addedOn: "2026-10-05",
});
const fading = (
  concepts: Record<string, StoredFadingConcept>,
  over: Partial<StoredFading> = {},
): StoredFading => {
  // 오늘 닫은 개념이 있으면 날마다의 집계 · 연속의 요약도 맞춰 둔다(저장 칸의 꼴이 짝을 본다).
  const today = Object.values(concepts).filter((c) => c.reviewedOn === TODAY);
  return storedFadingSchema.parse({
    ...emptyFading(),
    concepts,
    ...(today.length
      ? {
          days: [
            {
              date: TODAY,
              reviews: today.length,
              passed: today.filter((c) => c.step === 4).length,
              fresh: today.filter((c) => c.reviews === 1).length,
            },
          ],
          streak: { current: 1, best: 1, lastOn: TODAY },
        }
      : {}),
    ...over,
  });
};

const bank = (list: FadingConcept[]) => new Map(list.map((c) => [c.id, c]));
const workload = (
  over: Partial<FadingDailyWorkload> = {},
): FadingDailyWorkload => ({
  kind: "elementary",
  route: "bank",
  unitId: "g5-fractions",
  title: "분수의 곱셈",
  subtitle: "초등 5학년 · (분수)×(자연수)",
  goal: 10,
  answered: 0,
  retryRemaining: 0,
  status: "next",
  canStart: true,
  ...over,
});
const basis = (conceptIds: string[]): FadingPrerequisiteBasis => ({
  target: {
    title: "(분수)×(자연수)",
    explorerUnitId: "g5-fractions",
    courseSectionId: "5-2-2-1",
    sectionKey: TARGET,
    graphUnitId: "E56-N04",
    cardIds: [],
  },
  coverage: { status: "mapped", cardLinks: 0, graphEdges: 1 },
  links: [
    {
      via: "graph-edge",
      reason: "적혀 있는 까닭",
      prerequisite: {
        title: "분수의 덧셈과 뺄셈",
        cardId: null,
        graphUnitId: "E56-N03",
        courseSectionIds: ["5-1-5-4"],
        sectionKeys: [BEFORE],
      },
      mapping: "exact",
      evidence: {
        card: { status: "unknown" },
        course: { status: "unassessed" },
      },
      conceptIds,
    },
  ],
});
/** 계약의 꼴을 지나는 계획만 본다. */
const build = (input: Parameters<typeof buildFadingDailyPlan>[0]) =>
  fadingDailyPlanSchema.parse(buildFadingDailyPlan(input));
const keys = (plan: FadingDailyPlan) => plan.activities.map((a) => a.key);
const recalls = (plan: FadingDailyPlan) =>
  plan.activities.filter((a): a is FadingDailyRecall => a.kind === "recall");

/** 복습일이 된 묶음 열둘(안정도 1 ~ 12 · 명제 5 · 4 · 3 이 돌아간다). */
const SIZES = [5, 4, 3];
function backlog() {
  const due = Array.from({ length: 12 }, (_, i) =>
    concept(`due-${String(i + 1).padStart(2, "0")}`, SIZES[i % 3]),
  );
  const stored: Record<string, StoredFadingConcept> = {};
  due.forEach((c, i) => (stored[c.id] = rated({ stability: i + 1 })));
  return { due, stored };
}
const before = [
  concept("pre-1", 3, BEFORE, "하", 1),
  concept("pre-2", 3, BEFORE, "하", 2),
  concept("pre-3", 4, BEFORE, "중", 1),
  concept("pre-4", 5, BEFORE, "상", 1),
];
const fresh = [
  concept("new-h1", 3, TARGET, "하", 1),
  concept("new-h2", 4, TARGET, "하", 2),
  concept("new-m1", 5, TARGET, "중", 1),
  concept("new-s1", 3, TARGET, "상", 1),
];
const picks = [concept("pick-a", 3), concept("pick-b", 4)];

describe("스무 칸 — 근거의 차례로 넣는다(정해 둔 비율이 없다)", () => {
  it("복습일이 된 묶음 둘 → 선수 확인 하나 → 탐험의 10문제: 합계 20, 단위는 따로 센다", () => {
    const concepts = bank([
      concept("due-a", 4),
      concept("due-b", 3),
      ...before,
      ...fresh,
    ]);
    const plan = build({
      today: TODAY,
      fading: fading({
        "due-a": rated({ stability: 1 }),
        "due-b": rated({ stability: 2 }),
      }),
      concepts,
      quota: 20,
      workload: workload(),
      prerequisite: basis(before.map((c) => c.id)),
      progressSections: [TARGET],
    });
    expect(plan.quota).toEqual({ total: 20, source: "explicit", over: 0 });
    expect(plan.counts).toEqual({ total: 20, done: 0, remaining: 20 });
    expect(keys(plan)).toEqual([
      "recall:due-a",
      "recall:due-b",
      "recall:pre-1",
      `practice:${TODAY}`,
    ]);
    expect(plan.buckets).toEqual({
      review: { planned: 7, done: 0 },
      prerequisite: { planned: 3, done: 0 },
      progress: { planned: 10, done: 0 },
    });
    expect(plan.shares).toEqual({ review: 7, prerequisite: 3, progress: 10 });
    // 🔴 묶음 셋은 명제 열(4 + 3 + 3)이다 — 묶음을 문제로 세지 않고, 명제와 문제도 한 이름으로 부르지 않는다.
    expect(plan.units).toEqual({
      recall: { planned: 3, done: 0 },
      prompt: { planned: 10, done: 0 },
      question: { planned: 10, done: 0 },
      task: { planned: 0, done: 0 },
    });
    expect(recalls(plan).map((a) => [a.prompts, a.slots])).toEqual([
      [4, 4],
      [3, 3],
      [3, 3],
    ]);
    expect(plan.next).toBe("recall:due-a");
    expect(plan.status).toBe("todo");
    expect(plan.shortfall).toEqual([]);
    expect(plan.held).toEqual({ recalls: 0, prompts: 0 });
    expect(plan.integration).toEqual({ expedition: true });
    // 문제를 고르는 것은 탐험이다 — 이 계획은 덩이째로만 낸다.
    expect(plan.activities.at(-1)).toMatchObject({
      kind: "practice",
      unit: "question",
      count: 10,
      slots: 10,
      state: "todo",
      start: "start",
      source: { selection: "expedition", kind: "elementary" },
    });
  });

  it("밀린 복습이 분량을 다 쓰면 새 진도는 0 이다 — 망각 위험이 큰 것부터, 안 들어가는 묶음은 미룬다", () => {
    const { due, stored } = backlog();
    const plan = build({
      today: TODAY,
      fading: fading({ ...stored, "pick-a": picked(1) }),
      concepts: bank([...due, ...picks, ...before, ...fresh]),
      quota: 20,
      workload: workload(),
      prerequisite: basis(before.map((c) => c.id)),
      progressSections: [TARGET],
    });
    // 5 + 4 + 3 + 5 = 17, 다음(4)은 안 들어가 건너뛰고 그다음(3)이 들어가 20.
    expect(keys(plan)).toEqual([
      "recall:due-01",
      "recall:due-02",
      "recall:due-03",
      "recall:due-04",
      "recall:due-06",
      `practice:${TODAY}`,
    ]);
    const risks = recalls(plan).map((a) => a.risk!);
    expect(risks).toEqual([...risks].sort((a, b) => b - a));
    expect(new Set(risks).size).toBe(5);
    expect(plan.counts).toEqual({ total: 20, done: 0, remaining: 20 });
    expect(plan.buckets.progress).toEqual({ planned: 0, done: 0 });
    expect(plan.buckets.prerequisite).toEqual({ planned: 0, done: 0 });
    expect(plan.units.question).toEqual({ planned: 0, done: 0 });
    // 탐험의 한 덩이는 줄여서 내지 않는다 — 오늘은 못 낸다고 싣는다.
    expect(plan.activities.at(-1)).toMatchObject({
      kind: "practice",
      state: "blocked",
      start: "none",
      reason: { code: "over-budget" },
    });
    // 미룬 것은 숨기지 않는다(복습일은 그대로다).
    expect(plan.held).toEqual({
      recalls: 7,
      prompts: 4 + 5 + 4 + 3 + 5 + 4 + 3,
    });
    expect(plan.shortfall).toEqual([]);
    expect(plan.quota.over).toBe(0);
  });

  it("복습이 적으면 남은 칸은 새 진도로 — 탐험의 한 덩이 → 골라 둔 것(풀다 만 것 먼저) → 오늘 진도의 새 개념(하 → 중 → 상)", () => {
    const plan = build({
      today: TODAY,
      fading: fading({
        "due-a": rated({ stability: 1 }),
        "pick-a": picked(1),
        "pick-b": picked(3),
      }),
      concepts: bank([concept("due-a", 3), ...picks, ...fresh]),
      quota: 30,
      workload: workload(),
      progressSections: [TARGET],
    });
    // 3 + 10 + 4(pick-b) + 3(pick-a) + 3(new-h1) + 4(new-h2) = 27, 남은 3칸: new-m1(5)은 안 들어가고 new-s1(3)이 들어간다.
    expect(keys(plan)).toEqual([
      "recall:due-a",
      "recall:pick-b",
      "recall:pick-a",
      "recall:new-h1",
      "recall:new-h2",
      "recall:new-s1",
      `practice:${TODAY}`,
    ]);
    expect(plan.counts.total).toBe(30);
    const byKey = Object.fromEntries(plan.activities.map((a) => [a.key, a]));
    expect(byKey["recall:pick-b"]!.reason.code).toBe("progress-picked");
    expect(byKey["recall:new-h1"]!.reason.code).toBe("progress-section");
    expect((byKey["recall:new-h1"] as FadingDailyRecall).start).toBe(
      "pick-open",
    );
    expect((byKey["recall:new-h1"] as FadingDailyRecall).step).toBeNull();
    expect((byKey["recall:pick-a"] as FadingDailyRecall).start).toBe("open");
    expect(plan.units).toEqual({
      recall: { planned: 6, done: 0 },
      prompt: { planned: 20, done: 0 },
      question: { planned: 10, done: 0 },
      task: { planned: 0, done: 0 },
    });
  });

  it("남은 칸이 탐험의 한 덩이보다 적으면 내지 않는다 — 네 칸에 10문제를 넣지 않고 못 채운 칸을 낸다", () => {
    const list = ["a", "b", "c", "d"].map((x) => concept(`due-${x}`, 4));
    const plan = build({
      today: TODAY,
      fading: fading(
        Object.fromEntries(
          list.map((c, i) => [c.id, rated({ stability: i + 1 })]),
        ),
      ),
      concepts: bank(list),
      quota: 20,
      workload: workload(),
    });
    expect(plan.counts).toEqual({ total: 16, done: 0, remaining: 16 });
    expect(plan.units.question).toEqual({ planned: 0, done: 0 });
    expect(plan.activities.at(-1)).toMatchObject({
      kind: "practice",
      state: "blocked",
      count: 10,
      reason: {
        code: "over-budget",
        text: "남은 칸에 들어가지 않아 오늘은 내지 않아요.",
      },
    });
    expect(plan.shortfall).toEqual([
      {
        bucket: "progress",
        slots: 4,
        reason: "탐험의 한 덩이가 남은 칸에 들어가지 않습니다.",
      },
    ]);
  });

  it("재료가 모자라면 채워 넣지 않는다 — 다 하고 나면 «short» 다", () => {
    const concepts = bank([concept("due-a", 4), concept("due-b", 3)]);
    const todo = build({
      today: TODAY,
      fading: fading({ "due-a": rated(), "due-b": rated() }),
      concepts,
      quota: 20,
    });
    expect(todo.counts).toEqual({ total: 7, done: 0, remaining: 7 });
    expect(todo.shortfall).toEqual([
      { bucket: "progress", slots: 13, reason: "오늘 낼 것이 더 없습니다." },
    ]);
    expect(todo.status).toBe("todo");
    expect(todo.integration).toEqual({ expedition: false });
    const after = { reviewedOn: TODAY, dueOn: "2026-10-20" };
    const done = build({
      today: TODAY,
      fading: fading({ "due-a": rated(after), "due-b": rated(after) }),
      concepts,
      quota: 20,
    });
    expect(done.counts).toEqual({ total: 7, done: 7, remaining: 0 });
    expect(done.status).toBe("short");
    expect(done.next).toBeNull();
    // 분량이 딱 맞으면 «done» 이다.
    expect(
      build({
        today: TODAY,
        fading: fading({ "due-a": rated(after), "due-b": rated(after) }),
        concepts,
        quota: 7,
      }).status,
    ).toBe("done");
  });

  it("남은 것이 칸에 안 들어가 미룬 날은 낼 것을 다 한 것이다 — 미룬 것과 못 채운 칸은 그대로 낸다", () => {
    const plan = build({
      today: TODAY,
      fading: fading({
        a: rated({ reviewedOn: TODAY, dueOn: "2026-10-20" }),
        b: rated(),
      }),
      concepts: bank([concept("a", 3), concept("b", 5)]),
      quota: 5,
    });
    expect(plan.counts).toEqual({ total: 3, done: 3, remaining: 0 });
    expect(plan.status).toBe("done");
    expect(plan.held).toEqual({ recalls: 1, prompts: 5 });
    expect(plan.shortfall).toEqual([
      {
        bucket: "review",
        slots: 2,
        reason: "남은 칸보다 큰 묶음만 남았습니다.",
      },
    ]);
  });

  it("분량을 안 주면 대신 값이다 — 스물은 정해진 하루 분량이 아니다", () => {
    const plan = build({
      today: TODAY,
      fading: emptyFading(),
      concepts: bank([]),
    });
    expect(plan.quota).toEqual({
      total: FADING_DAILY_CAP,
      source: "default",
      over: 0,
    });
    expect(plan.status).toBe("empty");
    const ten = build({
      today: TODAY,
      fading: emptyFading(),
      concepts: bank([]),
      quota: 10,
    });
    expect(ten.quota).toEqual({ total: 10, source: "explicit", over: 0 });
    expect(ten.shortfall).toEqual([
      { bucket: "progress", slots: 10, reason: "오늘 낼 것이 더 없습니다." },
    ]);
  });

  it("어떤 분량에서도 합계는 분량을 넘지 않는다 · 같은 입력이면 같은 계획이다 · 받은 값은 바꾸지 않는다", () => {
    const { due, stored } = backlog();
    const state = fading({
      ...stored,
      "pick-a": picked(1),
      "pick-b": picked(3),
    });
    const frozen = structuredClone(state);
    const input = {
      today: TODAY,
      fading: state,
      concepts: bank([...due, ...picks, ...before, ...fresh]),
      workload: workload(),
      prerequisite: basis(before.map((c) => c.id)),
      progressSections: [TARGET],
    };
    for (let quota = 1; quota <= 60; quota++) {
      const plan = build({ ...input, quota });
      expect(plan.counts.total, `분량 ${quota}`).toBeLessThanOrEqual(quota);
      expect(plan.quota.over).toBe(0);
      const missing = plan.shortfall.reduce((n, s) => n + s.slots, 0);
      expect(plan.counts.total + missing).toBe(quota);
      expect(build({ ...input, quota })).toEqual(plan);
    }
    expect(state).toEqual(frozen);
  });
});

describe("탐험의 한 덩이 — 분량도 한 것도 탐험의 기록 그대로", () => {
  const { due, stored } = backlog();
  const base = {
    today: TODAY,
    fading: fading({ ...stored, "pick-a": picked(1) }),
    concepts: bank([...due, ...picks]),
    quota: 20,
  };
  const light = {
    today: TODAY,
    fading: fading({ "due-a": rated() }),
    concepts: bank([concept("due-a", 4)]),
    quota: 20,
  };

  it("풀던 탐험은 맨 앞이고 남은 문제는 빚진 것이다 — 푼 문제만큼만 한 것이다", () => {
    const plan = build({
      ...base,
      workload: workload({ status: "active", answered: 4 }),
    });
    expect(plan.activities[0]).toMatchObject({
      key: `practice:${TODAY}`,
      kind: "practice",
      unit: "question",
      state: "active",
      count: 10,
      answered: 4,
      slots: 10,
      done: 4,
      start: "continue",
      reason: { code: "resume-practice" },
    });
    expect(plan.next).toBe(`practice:${TODAY}`);
    expect(plan.units.question).toEqual({ planned: 10, done: 4 });
    expect(plan.buckets.progress).toEqual({ planned: 10, done: 4 });
    // 남은 10칸에 복습 5 + 4 — 그다음 묶음(3)은 남은 한 칸에 안 들어간다.
    expect(plan.buckets.review).toEqual({ planned: 9, done: 0 });
    expect(plan.counts).toEqual({ total: 19, done: 4, remaining: 15 });
    expect(plan.status).toBe("in-progress");
  });

  it("다시 풀 것이 남았으면(목표를 채웠어도) 끝난 것이 아니다", () => {
    const plan = build({
      ...base,
      fading: emptyFading(),
      workload: workload({ status: "retry", answered: 10, retryRemaining: 2 }),
    });
    expect(plan.activities[0]).toMatchObject({
      state: "active",
      done: 10,
      retryRemaining: 2,
      start: "continue",
    });
    expect(plan.counts).toEqual({ total: 10, done: 10, remaining: 0 });
    expect(plan.next).toBe(`practice:${TODAY}`);
    expect(plan.status).toBe("in-progress");
  });

  it("풀던 탐험은 분량이 모자라도 낸다 — 넘긴 칸을 낸다", () => {
    const plan = build({
      ...light,
      quota: 5,
      workload: workload({ status: "active", answered: 2 }),
    });
    expect(plan.activities[0]).toMatchObject({ state: "active", done: 2 });
    expect(plan.quota).toEqual({ total: 5, source: "explicit", over: 5 });
    expect(keys(plan)).toEqual([`practice:${TODAY}`]);
    expect(plan.held).toEqual({ recalls: 1, prompts: 4 });
  });

  it("오늘 칸을 얻은 탐험은 끝난 것으로 맨 뒤에 남는다", () => {
    const plan = build({
      ...light,
      workload: workload({ status: "complete", answered: 10, canStart: false }),
    });
    expect(plan.activities.at(-1)).toMatchObject({
      key: `practice:${TODAY}`,
      state: "done",
      done: 10,
      start: "none",
      reason: { code: "done-today" },
    });
    expect(plan.units.question).toEqual({ planned: 10, done: 10 });
    expect(plan.next).toBe("recall:due-a");
    expect(plan.counts).toEqual({ total: 14, done: 10, remaining: 4 });
  });

  it("중1 문제은행 날은 12문제 · 개념 날은 카드 활동 15 — 탐험이 정한 분량 그대로이고 단위가 다르다", () => {
    const middle = build({
      ...light,
      workload: workload({ kind: "middle", goal: 12, title: "일차방정식" }),
    });
    expect(middle.units.question).toEqual({ planned: 12, done: 0 });
    expect(middle.counts.total).toBe(16);
    const cards = build({
      ...light,
      workload: workload({ kind: "explorers", route: "unit", goal: 15 }),
    });
    // 카드 활동은 문제가 아니다 — 따로 센다.
    expect(cards.units.task).toEqual({ planned: 15, done: 0 });
    expect(cards.units.question).toEqual({ planned: 0, done: 0 });
    expect(cards.counts.total).toBe(19);
    expect(cards.activities.at(-1)).toMatchObject({ unit: "task", count: 15 });
  });

  it("복습하는 날의 탐험은 복습 갈래다", () => {
    const plan = build({
      ...light,
      workload: workload({ kind: "explorers", route: "memory", goal: 15 }),
    });
    const practice = plan.activities.find((a) => a.kind === "practice")!;
    expect(practice.bucket).toBe("review");
    expect(practice.reason.code).toBe("review-practice");
    expect(plan.buckets.review.planned).toBe(19);
    expect(plan.buckets.progress.planned).toBe(0);
  });

  it("시작할 수 없는 탐험은 칸에 세지 않고 까닭을 낸다", () => {
    const text = "새 문제를 준비하지 못했어요. 선생님께 알려 주세요.";
    const plan = build({
      ...base,
      fading: emptyFading(),
      workload: workload({ canStart: false, blockedReason: text }),
    });
    expect(plan.activities).toHaveLength(1);
    expect(plan.activities[0]).toMatchObject({
      state: "blocked",
      start: "none",
      reason: { code: "blocked", text },
    });
    expect(plan.counts.total).toBe(0);
    expect(plan.units.question).toEqual({ planned: 0, done: 0 });
    expect(plan.next).toBeNull();
    expect(plan.status).toBe("empty");
    expect(plan.shortfall).toEqual([
      { bucket: "progress", slots: 20, reason: text },
    ]);
  });
});

describe("한 것은 기록이 말하는 만큼만", () => {
  it("오늘 평가로 닫은 개념이 한 것이다 — 처음 평가였으면 새 진도, 아니면 복습. 탐험의 푼 문제는 그대로다", () => {
    const concepts = bank([
      concept("old", 3),
      concept("first", 3),
      concept("again", 3),
      concept("due-01", 3),
    ]);
    const state = fading({
      old: rated({ reviewedOn: TODAY, dueOn: "2026-10-20", reviews: 3 }),
      first: rated({ reviewedOn: TODAY, dueOn: "2026-10-09", reviews: 1 }),
      // 오늘 «다시»로 닫았다 — 4단계 앞에 서 있고 내일이 복습일이다.
      again: rated({
        reviewedOn: TODAY,
        dueOn: "2026-10-08",
        reviews: 4,
        lapses: 1,
        step: 3,
      }),
      "due-01": rated(),
    });
    const plan = build({
      today: TODAY,
      fading: state,
      concepts,
      quota: 30,
      workload: workload({ status: "active", answered: 4 }),
    });
    expect(plan.buckets.review).toEqual({ planned: 9, done: 6 });
    // 탐험의 4문제는 탐험이 적은 것 그대로다 — 개념 셋을 닫았다고 늘지 않는다.
    expect(plan.buckets.progress).toEqual({ planned: 13, done: 7 });
    expect(plan.units).toEqual({
      recall: { planned: 4, done: 3 },
      prompt: { planned: 12, done: 9 },
      question: { planned: 10, done: 4 },
      task: { planned: 0, done: 0 },
    });
    expect(plan.counts).toEqual({ total: 22, done: 13, remaining: 9 });
    const done = plan.activities.filter((a) => a.state === "done");
    expect(done.map((a) => a.key).sort()).toEqual([
      "recall:again",
      "recall:first",
      "recall:old",
    ]);
    expect(done.every((a) => a.kind === "recall" && a.start === "none")).toBe(
      true,
    );
    // 오늘 닫은 개념은 «다시»였어도 오늘의 기본 분량에 다시 나오지 않는다(복습일이 내일이다).
    expect(keys(plan).filter((k) => k === "recall:again")).toHaveLength(1);
  });

  it("은행에 없는 열쇠의 기록은 세지 않는다", () => {
    const plan = build({
      today: TODAY,
      fading: fading({ gone: rated(), kept: rated() }),
      concepts: bank([concept("kept")]),
      quota: 20,
    });
    expect(keys(plan)).toEqual(["recall:kept"]);
    expect(plan.held).toEqual({ recalls: 0, prompts: 0 });
  });
});

describe("풀던 개념 · «오늘 전부»", () => {
  it("열린 풀이는 맨 앞이고 남은 칸과 상관없이 낸다", () => {
    const { due, stored } = backlog();
    const open = fading(
      { ...stored, "pick-b": picked(3) },
      {
        session: {
          id: "00000001-0000-4000-8000-000000000000",
          conceptId: "pick-b",
          startStep: 3,
          seed: 7,
          phase: "steps",
          missedAtFour: [],
        },
      },
    );
    const plan = build({
      today: TODAY,
      fading: open,
      concepts: bank([...due, ...picks]),
      quota: 20,
    });
    expect(plan.activities[0]).toMatchObject({
      key: "recall:pick-b",
      state: "active",
      start: "continue",
      bucket: "progress",
      prompts: 4,
      reason: { code: "resume-recall" },
    });
    expect(plan.next).toBe("recall:pick-b");
    expect(keys(plan).filter((k) => k === "recall:pick-b")).toHaveLength(1);
    expect(plan.status).toBe("in-progress");
    expect(plan.counts.total).toBeLessThanOrEqual(20);
  });

  it("«오늘 전부»를 고른 날은 복습일이 된 것을 전부 낸다 — 학생이 고른 분량이라 넘긴 칸을 낸다", () => {
    const { due, stored } = backlog();
    const plan = build({
      today: TODAY,
      fading: fading(stored, { allOn: TODAY }),
      concepts: bank(due),
      quota: 10,
      workload: workload(),
    });
    expect(plan.mode).toBe("all");
    expect(recalls(plan)).toHaveLength(12);
    expect(plan.held).toEqual({ recalls: 0, prompts: 0 });
    expect(plan.units.prompt.planned).toBe(48);
    expect(plan.quota.over).toBe(38);
    // 새 진도는 넘겨서 내지 않는다.
    expect(plan.units.question.planned).toBe(0);
  });
});

describe("선수 개념 — 근거는 그 개념 자신의 기록이고 원천마다 따로다", () => {
  const ids = before.map((c) => c.id);

  it("확인한 기록이 없음 · «다시»로 끝남 · 복습일이 됨 · 최근 기록을 따로 센다", () => {
    expect(fadingLinkEvidence(ids, emptyFading(), TODAY)).toEqual({
      status: "unassessed",
      total: 4,
      rated: 0,
      weak: 0,
      stale: 0,
    });
    // 골라만 둔 것은 확인한 기록이 아니다.
    expect(
      fadingLinkEvidence(ids, fading({ "pre-1": picked(2) }), TODAY).status,
    ).toBe("unassessed");
    const recent = rated({ reviewedOn: "2026-10-05", dueOn: "2026-10-20" });
    const stale = rated({ dueOn: TODAY });
    const weak = rated({ step: 3, lapses: 1, dueOn: "2026-10-02" });
    expect(fadingLinkEvidence(ids, fading({ "pre-1": recent }), TODAY)).toEqual(
      { status: "recent", total: 4, rated: 1, weak: 0, stale: 0 },
    );
    expect(
      fadingLinkEvidence(
        ids,
        fading({ "pre-1": recent, "pre-2": stale }),
        TODAY,
      ),
    ).toEqual({ status: "stale", total: 4, rated: 2, weak: 0, stale: 1 });
    expect(
      fadingLinkEvidence(
        ids,
        fading({ "pre-1": recent, "pre-2": stale, "pre-3": weak }),
        TODAY,
      ),
    ).toEqual({ status: "weak", total: 4, rated: 3, weak: 1, stale: 1 });
    // 이어진 개념이 없으면 이 원천으로는 알 수 없다.
    expect(fadingLinkEvidence([], emptyFading(), TODAY).status).toBe("unknown");
  });

  it("최근 기록이 있는 선수 개념은 내지 않는다 — 복습일이 된 것과 기록이 없는 것만 낸다", () => {
    const state = fading({
      "pre-1": rated({ reviewedOn: "2026-10-05", dueOn: "2026-10-20" }),
      "pre-2": rated({ step: 3, lapses: 1, dueOn: "2026-10-06" }),
      "pre-3": rated({ dueOn: TODAY }),
    });
    const plan = build({
      today: TODAY,
      fading: state,
      concepts: bank(before),
      quota: 40,
      prerequisite: basis(ids),
    });
    const prerequisite = recalls(plan).filter(
      (a) => a.bucket === "prerequisite",
    );
    expect(
      Object.fromEntries(prerequisite.map((a) => [a.conceptId, a.reason.code])),
    ).toEqual({
      "pre-2": "prerequisite-weak",
      "pre-3": "prerequisite-stale",
      "pre-4": "prerequisite-unassessed",
    });
    expect(keys(plan)).not.toContain("recall:pre-1");
    // 안내에는 원천마다 따로 실린다 — «오늘의 기억» 기록 · 개념 카드 · 문제은행 코스.
    expect(plan.prerequisite!.links[0]!.evidence).toEqual({
      fading: { status: "weak", total: 4, rated: 3, weak: 1, stale: 1 },
      card: { status: "unknown" },
      course: { status: "unassessed" },
    });
    expect(plan.prerequisite!.target.sectionKey).toBe(TARGET);
  });

  it("기록이 없는 선수 개념은 연결마다 하루에 하나다 — 남는 칸으로 늘리지 않는다", () => {
    const plan = build({
      today: TODAY,
      fading: emptyFading(),
      concepts: bank(before),
      quota: 20,
      prerequisite: basis(ids),
    });
    expect(recalls(plan).map((a) => a.conceptId)).toEqual(["pre-1"]);
    expect(recalls(plan)[0]).toMatchObject({
      bucket: "prerequisite",
      start: "pick-open",
      prompts: 3,
    });
    expect(plan.shortfall).toEqual([
      { bucket: "progress", slots: 17, reason: "오늘 낼 것이 더 없습니다." },
    ]);
    // 오늘 그 연결의 개념을 처음 평가했으면 그날은 더 내지 않는다.
    const checked = build({
      today: TODAY,
      fading: fading({
        "pre-1": rated({ reviewedOn: TODAY, dueOn: "2026-10-09", reviews: 1 }),
      }),
      concepts: bank(before),
      quota: 20,
      prerequisite: basis(ids),
    });
    expect(recalls(checked).map((a) => [a.conceptId, a.state])).toEqual([
      ["pre-1", "done"],
    ]);
    expect(checked.buckets.prerequisite).toEqual({ planned: 3, done: 3 });
  });

  it("기록이 없을 뿐인 선수 개념은 탐험의 한 덩이를 밀어내지 않는다 — 근거가 있는 것만 덩이보다 먼저다", () => {
    const input = {
      today: TODAY,
      concepts: bank(before),
      workload: workload(),
      prerequisite: basis(ids),
    };
    // 분량 10: 탐험의 10문제가 들어가고, 기록이 없는 선수 개념(3칸)은 남은 칸이 없어 내지 않는다.
    const tight = build({ ...input, fading: emptyFading(), quota: 10 });
    expect(keys(tight)).toEqual([`practice:${TODAY}`]);
    expect(tight.activities[0]).toMatchObject({
      state: "todo",
      start: "start",
    });
    expect(tight.counts.total).toBe(10);
    // 안내에는 그대로 실린다 — 계획에 못 넣었다고 연결을 숨기지 않는다.
    expect(tight.prerequisite!.links[0]!.evidence.fading.status).toBe(
      "unassessed",
    );
    // 분량 13: 덩이 다음에 하나가 들어간다. 놓는 차례는 확인이 문제보다 먼저다.
    const room = build({ ...input, fading: emptyFading(), quota: 13 });
    expect(keys(room)).toEqual(["recall:pre-1", `practice:${TODAY}`]);
    expect(room.counts.total).toBe(13);
    // «다시»로 끝난 선수 개념(근거가 있다)은 복습 차례라 덩이보다 먼저 칸을 잡는다 — 남은 7칸에 10문제는 못 들어간다.
    const weak = build({
      ...input,
      fading: fading({
        "pre-1": rated({ step: 3, lapses: 1, dueOn: "2026-10-06" }),
      }),
      quota: 10,
    });
    expect(weak.activities[0]).toMatchObject({
      key: "recall:pre-1",
      bucket: "prerequisite",
      reason: { code: "prerequisite-weak" },
    });
    expect(weak.activities.find((a) => a.kind === "practice")).toMatchObject({
      state: "blocked",
      reason: { code: "over-budget" },
    });
  });

  it("은행에 없는 개념은 안내에서도 뺀다 — 지어내지 않는다", () => {
    const plan = build({
      today: TODAY,
      fading: emptyFading(),
      concepts: bank(before.slice(0, 1)),
      quota: 20,
      prerequisite: basis([...ids, "no-such"]),
    });
    expect(plan.prerequisite!.links[0]!.conceptIds).toEqual(["pre-1"]);
    expect(plan.prerequisite!.links[0]!.evidence.fading.total).toBe(1);
  });

  it("안내가 없으면 `null` 이고 선수 갈래는 비어 있다", () => {
    const plan = build({
      today: TODAY,
      fading: emptyFading(),
      concepts: bank(before),
    });
    expect(plan.prerequisite).toBeNull();
    expect(plan.activities).toEqual([]);
  });
});

describe("서버 없이 도는 원천", () => {
  const { due, stored } = backlog();
  const list = [...due, ...picks, ...before, ...fresh];
  const state = fading({ ...stored, "pick-a": picked(1) });
  const daily = {
    quota: 20,
    workload: workload(),
    prerequisite: basis(before.map((c) => c.id)),
    progressSections: [TARGET],
  };

  it("`dailyPlan()` 은 같은 함수의 답이다 — 날을 옮기면 계획도 옮겨진다", async () => {
    const source = createLocalFadingSource({
      concepts: list,
      today: TODAY,
      fading: state,
      daily,
    });
    expect(await source.dailyPlan()).toEqual(
      build({ today: TODAY, fading: state, concepts: bank(list), ...daily }),
    );
    // 며칠 앞으로 — 복습일이 2026-10-06 인 열둘이 전부 아직 복습일 전이다.
    source.setToday("2026-10-03");
    const earlier = await source.dailyPlan();
    expect(earlier.today).toBe("2026-10-03");
    expect(earlier.buckets.review.planned).toBe(0);
    expect(earlier.units.question.planned).toBe(10);
  });

  it("분량은 부를 때 줄 수 있다 — 학생 라우트의 `?quota=` 와 같은 꼴이다", async () => {
    const source = createLocalFadingSource({
      concepts: list,
      today: TODAY,
      fading: state,
    });
    expect((await source.dailyPlan()).quota).toMatchObject({
      total: FADING_DAILY_CAP,
      source: "default",
    });
    const ten = await source.dailyPlan({ quota: 10 });
    expect(ten.quota).toMatchObject({ total: 10, source: "explicit" });
    expect(ten.counts.total).toBeLessThanOrEqual(10);
    for (const quota of [0, 61, 2.5, Number.NaN])
      await expect(source.dailyPlan({ quota })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
      });
    await expect(source.dailyPlan({ quota: 0 })).rejects.toBeInstanceOf(
      FadingSourceError,
    );
  });

  it("재료를 안 주면 «오늘의 기억»만으로 짓는다 — 탐험 없이도 돈다", async () => {
    const source = createLocalFadingSource({
      concepts: list,
      today: TODAY,
      fading: state,
    });
    const plan = await source.dailyPlan();
    expect(plan.integration).toEqual({ expedition: false });
    expect(plan.prerequisite).toBeNull();
    expect(plan.units.question.planned).toBe(0);
    expect(plan.counts.total).toBe(20);
  });

  it("계획을 읽는 것은 아무것도 바꾸지 않는다 — 저장 칸도 revision 도 그대로", async () => {
    const source = createLocalFadingSource({
      concepts: list,
      today: TODAY,
      fading: state,
      daily,
    });
    const before = await source.state();
    await source.dailyPlan();
    await source.dailyPlan({ quota: 30 });
    expect(source.snapshot()).toEqual(state);
    expect((await source.state()).revision).toBe(before.revision);
  });
});

describe("계획의 활동을 지금 있는 길로 한다 — 일정은 한 번만 옮겨지고 탐험의 칸은 생기지 않는다", () => {
  const id = (n: number) =>
    `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  /** 그 단계를 안 틀리고 채우는 «넣기»의 차례 — 화면이 하듯 받은 내용과 씨앗으로 칩을 낸다. */
  function placements(
    c: FadingConcept,
    step: FadingStep,
    seed: number,
  ): FadingPlacement[] {
    const tray = chipTray(c, step, { seed, traps: [] });
    const used = new Set<string>();
    return erasedTargets(c, step).map((target) => {
      const chip = tray.find(
        (x) => !used.has(x.id) && chipFits(c, target.id, x),
      )!;
      used.add(chip.id);
      return { targetId: target.id, chipId: chip.id };
    });
  }

  it("계획이 낸 묶음을 열어 평가까지 — 같은 평가 요청을 두 번 보내도 한 번만 적용된다", async () => {
    const list = [concept("due-a", 3), concept("new-a", 3, TARGET)];
    // 탐험은 10문제 가운데 4문제를 푼 채다 — 이 값은 탐험의 기록이고, 아래의 풀이로 바뀌지 않는다.
    const mission = workload({ status: "active", answered: 4 });
    const source = createLocalFadingSource({
      concepts: list,
      today: TODAY,
      fading: fading({ "due-a": rated() }),
      daily: () => ({
        quota: 20,
        workload: mission,
        progressSections: [TARGET],
      }),
      fresh: () => ({ sessionId: id(1), seed: 11 }),
    });
    const first = await source.dailyPlan();
    expect(keys(first)).toEqual([
      `practice:${TODAY}`,
      "recall:due-a",
      "recall:new-a",
    ]);
    const todo = recalls(first).find((a) => a.conceptId === "due-a")!;
    expect(todo.start).toBe("open");

    // 화면이 하는 그대로: 열기 → 4단계 → 평가.
    let view = await source.act({ action: "open", conceptId: "due-a" });
    const sessionId = view.session!.id;
    expect((await source.dailyPlan()).activities[0]).toMatchObject({
      key: "recall:due-a",
      state: "active",
      start: "continue",
    });
    view = await source.act({
      action: "step",
      conceptId: "due-a",
      sessionId,
      step: 4,
      placements: placements(list[0]!, 4, view.session!.seed),
    });
    expect(view.session!.phase).toBe("rating");
    const rate = {
      action: "rate" as const,
      conceptId: "due-a",
      sessionId,
      rating: "good" as const,
      requestId: id(9),
    };
    const once = await source.act(rate);
    const stored = source.snapshot();
    const twice = await source.act(rate);
    // 두 번째는 영수증만 돌아온다 — 복습 횟수 · 복습일 · 그날의 집계가 그대로다.
    expect(twice.receipt).toEqual(once.receipt);
    expect(source.snapshot()).toEqual(stored);
    expect(stored.concepts["due-a"]).toMatchObject({
      reviews: 3,
      reviewedOn: TODAY,
    });
    expect(stored.days.at(-1)).toMatchObject({ date: TODAY, reviews: 1 });

    const after = await source.dailyPlan();
    const done = recalls(after).find((a) => a.conceptId === "due-a")!;
    expect(done).toMatchObject({ state: "done", done: 3, start: "none" });
    expect(after.units.recall).toEqual({ planned: 2, done: 1 });
    expect(after.units.prompt).toEqual({ planned: 6, done: 3 });
    // 🔴 탐험의 기록은 그대로다 — 개념을 떠올렸다고 푼 문제가 늘지 않는다.
    expect(after.units.question).toEqual({ planned: 10, done: 4 });
    expect(after.activities[0]).toMatchObject({
      key: `practice:${TODAY}`,
      answered: 4,
      state: "active",
    });
    expect(after.counts).toEqual({ total: 16, done: 7, remaining: 9 });
    // 오늘 닫은 묶음은 다시 열리지 않는다(복습일 전이다) — 같은 날 일정을 두 번 옮길 길이 없다.
    await expect(
      source.act({ action: "open", conceptId: "due-a" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
