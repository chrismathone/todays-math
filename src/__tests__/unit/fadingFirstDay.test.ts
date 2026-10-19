// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { StoredFading } from "@/contracts/fading.contract";
import type { FadingDailyRecall } from "@/contracts/fadingDaily.contract";
import { fadingConceptMap } from "@/lib/fading/catalog";
import {
  FADING_FIRST_DAY_NEW_BUNDLES,
  buildFadingDailyPlan,
} from "@/lib/fading/explorerDaily";
import type { FadingConcept } from "@/lib/fading/concepts";
import { emptyFading } from "@/lib/fading/state";

/**
 * 첫 학습일 — 새 개념은 2묶음까지(원장님 결정 2026-10-17 · 합의 §7 ⑥). 15칸에서도 중등의 첫날이 40분 안팎이라(모의) 첫날만 좁힌다.
 * 첫날 = 지난 날에 평가를 닫은 기록이 없는 날. 그날 이미 처음 배운 묶음 · 풀던 새 묶음도 둘 안에 센다. 🔴 모의하지 않은 설계안이다.
 */

const TODAY = "2026-10-17";
const concepts = fadingConceptMap();
/** 새 개념이 가장 많은 소단원 — 15칸이면 묶음이 셋 이상 들어갈 만큼. */
const section = (() => {
  const counts = new Map<string, number>();
  for (const c of concepts.values())
    counts.set(c.section, (counts.get(c.section) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]![0];
})();
const small = [...concepts.values()]
  .filter((c) => c.section === section)
  .sort((a, b) => a.propositions.length - b.propositions.length);

const newBundles = (fading: StoredFading, quota = 60) =>
  buildFadingDailyPlan({
    today: TODAY,
    fading,
    concepts,
    quota,
    progressSections: [section],
  }).activities.filter(
    (a): a is FadingDailyRecall =>
      a.kind === "recall" && a.state !== "done" && !a.rated,
  );

describe("첫 학습일 — 새 개념 2묶음까지", () => {
  it("값은 2", () => {
    expect(FADING_FIRST_DAY_NEW_BUNDLES).toBe(2);
    expect(small.length).toBeGreaterThan(3);
  });

  it("기록이 없는 학생의 첫날에는 칸이 남아도 새 묶음 둘만 낸다", () => {
    expect(newBundles(emptyFading())).toHaveLength(2);
  });

  it("지난 날에 평가를 닫은 학생은 첫날이 아니다 — 칸만큼 낸다", () => {
    const seasoned: StoredFading = {
      ...emptyFading(),
      days: [{ date: "2026-10-16", reviews: 1, passed: 1, fresh: 1 }],
    };
    expect(newBundles(seasoned).length).toBeGreaterThan(2);
  });

  it("그날 이미 처음 배운 묶음도 둘 안에 센다", () => {
    const learned = small[0]!;
    const today: StoredFading = {
      ...emptyFading(),
      concepts: {
        [learned.id]: {
          step: 4,
          stability: 1,
          difficulty: 5,
          reviewedOn: TODAY,
          dueOn: "2026-10-18",
          digest: "0a1b2c3d",
          reviews: 1,
          lapses: 0,
          addedOn: TODAY,
        },
      },
      days: [{ date: TODAY, reviews: 1, passed: 1, fresh: 1 }],
    };
    expect(newBundles(today)).toHaveLength(1);
  });
});

describe("codex 4차 — 둘은 실제로 배정된 묶음으로 센다", () => {
  /** 명제 `n` 개짜리 새 개념 — 같은 소단원, `ordinal` 차례. */
  const made = (id: string, n: number, ordinal: number): FadingConcept => ({
    id,
    section: "중2::도형::원",
    level: "하",
    ordinal,
    siblings: 3,
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
  });

  it("앞의 5칸 묶음 둘이 3칸에 안 들어가면 그 뒤의 2칸 묶음이 자리를 얻는다", () => {
    const map = new Map(
      [made("big1", 5, 1), made("big2", 5, 2), made("tiny", 2, 3)].map((c) => [
        c.id,
        c,
      ]),
    );
    const plan = buildFadingDailyPlan({
      today: TODAY,
      fading: emptyFading(),
      concepts: map,
      quota: 3,
      progressSections: ["중2::도형::원"],
    });
    expect(
      plan.activities
        .filter((a): a is FadingDailyRecall => a.kind === "recall")
        .map((a) => a.conceptId),
    ).toEqual(["tiny"]);
  });

  it("들어가는 새 묶음이 셋이어도 첫날은 앞의 둘만", () => {
    const map = new Map(
      [made("a", 2, 1), made("b", 2, 2), made("c", 2, 3)].map((c) => [c.id, c]),
    );
    const plan = buildFadingDailyPlan({
      today: TODAY,
      fading: emptyFading(),
      concepts: map,
      quota: 15,
      progressSections: ["중2::도형::원"],
    });
    expect(
      plan.activities
        .filter((a): a is FadingDailyRecall => a.kind === "recall")
        .map((a) => a.conceptId),
    ).toEqual(["a", "b"]);
  });
});
