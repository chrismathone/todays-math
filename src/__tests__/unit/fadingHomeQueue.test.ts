import { describe, expect, it } from "vitest";
import type {
  StoredFading,
  StoredFadingConcept,
} from "@/contracts/fading.contract";
import { fadingStateSchema } from "@/contracts/fadingApi.contract";
import type { FadingConcept } from "@/lib/fading/concepts";
import { FADING_DAILY_CAP, fadingQueue } from "@/lib/fading/numbers";
import {
  NEW_FADING_PROGRESS,
  applyFadingRating,
  type FadingProgress,
} from "@/lib/fading/schedule";
import { emptyFading, fadingSummary } from "@/lib/fading/state";
import { fadingStateView } from "@/lib/fading/view";

/**
 * 결정 4(원장님 승인 2026-10-16) — 홈의 기본 분량도 «오늘의 학습» 계획과 같은 **명제 20칸** 규칙이다
 * (`explorerDaily.ts` · `dailyPlan.ts` 의 `allocateDaily`): 묶음은 쪼개지 않고, 남은 칸에 안 들어가면 건너뛰고 다음 것을 보며,
 * 오늘 평가로 닫은 기본 분량(첫 평가 포함)을 명제로 뺀다. 풀던 개념은 빚진 것이라 넘어도 낸다.
 * 개념 수의 통계(오늘의 복습 «한 것 / 목표» · 밀린 복습)는 그대로 개념 수다. 미룬 복습의 복습일은 그대로다.
 * 명제 비용(`slots` · `promptsOf`)을 주지 않으면 지금까지의 개념 20개 규칙이다(계획의 «오늘 전부»가 그 길을 쓴다).
 */

const TODAY = 20_732;

function rated(day: number, rating: "again" | "good" = "good"): FadingProgress {
  return applyFadingRating(NEW_FADING_PROGRESS, 1, rating, day);
}

describe("결정 4 — `fadingQueue` 의 명제 칸", () => {
  // 위험이 큰 차례: 오래된 것일수록 위험이 크다(같은 평가).
  const progress: Record<string, FadingProgress> = {
    a: rated(TODAY - 40),
    b: rated(TODAY - 30),
    c: rated(TODAY - 20),
    d: rated(TODAY - 10),
    e: rated(TODAY - 5),
  };
  const sizes: Record<string, number> = { a: 5, b: 5, c: 5, d: 4, e: 3 };
  const slots = (id: string) => sizes[id]!;

  it("묶음을 쪼개지 않고, 남은 칸에 안 들어가면 미루고 다음 것을 본다 — 20칸", () => {
    expect(fadingQueue(progress, TODAY).due).toHaveLength(5);
    expect(fadingQueue(progress, TODAY, { slots })).toMatchObject({
      due: ["a", "b", "c", "d"],
      held: ["e"],
    });
    // 5 + 5 + 5 = 15 — 넷째(6)는 안 들어가 미루고, 그다음 3 은 들어간다.
    expect(
      fadingQueue(progress, TODAY, {
        slots: (id) => ({ ...sizes, d: 6 })[id]!,
      }),
    ).toMatchObject({ due: ["a", "b", "c", "e"], held: ["d"] });
  });

  it("오늘 이미 닫은 명제를 뺀다 — 남은 칸이 없으면 다 미룬다", () => {
    expect(
      fadingQueue(progress, TODAY, { slots, reviewedToday: 12 }),
    ).toMatchObject({ due: ["a", "e"], held: ["b", "c", "d"] });
    expect(
      fadingQueue(progress, TODAY, { slots, reviewedToday: 20 }),
    ).toMatchObject({ due: [], held: ["a", "b", "c", "d", "e"] });
  });

  it("평가 전인 개념도 남은 칸에 들어갈 때만 낸다 — 복습 다음이고, 풀던 개념은 넘어도 낸다", () => {
    const withNew = {
      ...progress,
      fresh: NEW_FADING_PROGRESS,
      started: { ...NEW_FADING_PROGRESS, step: 3 as const },
    };
    const more = (id: string) => ({ ...sizes, fresh: 3, started: 4 })[id]!;
    // 복습이 19칸 → 평가 전 둘 다 안 들어간다.
    expect(fadingQueue(withNew, TODAY, { slots: more }).unrated).toEqual([]);
    // 풀던 개념(열린 풀이)은 빚진 것이라 넘어도 낸다.
    expect(
      fadingQueue(withNew, TODAY, { slots: more, open: "started" }).unrated,
    ).toEqual(["started"]);
    // 복습이 적으면 남은 칸에 든다 — 풀다 만 것 먼저.
    const light = {
      fresh: NEW_FADING_PROGRESS,
      started: withNew.started,
      e: progress.e!,
    };
    expect(fadingQueue(light, TODAY, { slots: more })).toMatchObject({
      due: ["e"],
      unrated: ["started", "fresh"],
    });
  });

  it("«오늘 전부»면 복습은 다 내고(미룸 없음), 평가 전인 것은 남은 칸에서만 낸다 — 계획과 같다", () => {
    const withNew = { ...progress, fresh: NEW_FADING_PROGRESS };
    expect(
      fadingQueue(withNew, TODAY, {
        slots: (id) => (id === "fresh" ? 3 : sizes[id]!),
        mode: "all",
      }),
    ).toMatchObject({ due: ["a", "b", "c", "d", "e"], held: [], unrated: [] });
  });

  it("명제 비용을 주지 않으면 지금까지의 개념 20개 규칙이다", () => {
    const many = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `c${String(i).padStart(2, "0")}`,
        rated(TODAY - 5 - i),
      ]),
    );
    const queue = fadingQueue(many, TODAY);
    expect([queue.due.length, queue.held.length]).toEqual([20, 5]);
    expect(fadingQueue(many, TODAY, { slots: () => 4 }).due.length).toBe(
      FADING_DAILY_CAP / 4,
    );
  });
});

/* ───────── 저장 칸에서 — 홈의 요약 · 화면에 내려가는 꼴 ───────── */

/** 명제 `n` 개짜리 개념 — 명제마다 빈칸 하나. */
function concept(id: string, n: number): FadingConcept {
  return {
    id,
    section: "중2::도형::원",
    level: "하",
    ordinal: 1,
    siblings: 1,
    propositions: Array.from({ length: n }, (_, i) => ({
      id: `${id}-p${i}`,
      term: `용어 ${i}`,
      kind: "정의" as const,
      pieces: [
        { kind: "text" as const, text: "핵심은 " },
        {
          kind: "target" as const,
          target: {
            id: `${id}-p${i}#1`,
            text: `답${i}`,
            tier: "text" as const,
          },
        },
      ],
    })),
  };
}
const DAY = "2026-10-20";
const stored = (
  reviewedOn: string,
  dueOn: string,
  reviews = 1,
): StoredFadingConcept => ({
  step: 4,
  stability: 3,
  difficulty: 5,
  reviewedOn,
  dueOn,
  digest: "0a1b2c3d",
  reviews,
  lapses: 0,
  addedOn: "2026-10-01",
});

describe("결정 4 — 홈의 요약(`fadingSummary` · `fadingStateView`)", () => {
  const due = ["k1", "k2", "k3", "k4", "k5", "k6"].map((id) => concept(id, 4));
  const fresh = [concept("n1", 3), concept("n2", 4)];
  const concepts = new Map([...due, ...fresh].map((c) => [c.id, c]));
  const base: StoredFading = {
    ...emptyFading(),
    concepts: Object.fromEntries(
      due.map((c) => [c.id, stored("2026-10-17", "2026-10-20")]),
    ),
  };

  it("복습일이 된 묶음 여섯(명제 넷씩) — 홈은 다섯(20칸)을 내고 하나를 미룬다 · 미룬 것의 복습일은 그대로다", () => {
    const view = fadingStateView({
      fading: base,
      revision: 0,
      today: DAY,
      concepts,
    });
    expect(view.summary.queue.due).toEqual(["k1", "k2", "k3", "k4", "k5"]);
    expect(view.summary.queue.held).toEqual(["k6"]);
    expect(view.summary.plan).toEqual({ done: 0, total: 5 });
    expect(base.concepts.k6!.dueOn).toBe("2026-10-20");
    expect(fadingStateSchema.parse(view)).toEqual(view);
    // 명제 비용 없이 부르면 지금까지의 개념 20개 규칙이다.
    expect(fadingSummary(base, DAY).queue.due).toHaveLength(6);
  });

  it("오늘 처음 배운 개념(첫 평가)의 명제도 오늘 분량에서 뺀다 — «오늘의 복습» 숫자는 그대로 개념 수다", () => {
    const learned: StoredFading = {
      ...base,
      concepts: {
        ...base.concepts,
        n1: stored(DAY, "2026-10-21"),
        n2: stored(DAY, "2026-10-22"),
      },
      days: [{ date: DAY, reviews: 2, passed: 2, fresh: 2 }],
    };
    // 7칸을 썼다 → 남은 13칸에 넷짜리 셋.
    const summary = fadingSummary(learned, DAY, {
      known: new Set(concepts.keys()),
      promptsOf: (id) => concepts.get(id)!.propositions.length,
    });
    expect(summary.queue.due).toEqual(["k1", "k2", "k3"]);
    expect(summary.queue.held).toEqual(["k4", "k5", "k6"]);
    expect(summary.plan).toEqual({ done: 0, total: 3 });
    expect(summary.todayCount).toEqual({ reviews: 2, passed: 2, fresh: 2 });
  });

  it("풀던 개념은 빚진 것이다 — 칸이 다 차도 홈 목록에 남는다", () => {
    const open: StoredFading = {
      ...base,
      concepts: {
        ...base.concepts,
        n2: {
          ...stored(DAY, DAY),
          stability: null,
          difficulty: null,
          reviewedOn: null,
          dueOn: null,
          digest: null,
          reviews: 0,
          step: 2,
        },
      },
      session: {
        id: "00000000-0000-4000-8000-000000000001",
        conceptId: "n2",
        startStep: 1,
        seed: 1,
        phase: "steps",
        missedAtFour: [],
      },
    };
    const view = fadingStateView({
      fading: open,
      revision: 0,
      today: DAY,
      concepts,
    });
    expect(view.summary.queue.unrated).toEqual(["n2"]);
    expect(view.summary.queue.due).toEqual(["k1", "k2", "k3", "k4"]);
  });
});
