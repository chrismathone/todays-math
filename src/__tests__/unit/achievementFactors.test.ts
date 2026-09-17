/**
 * 🔴 RED → 🟢 — **성취 팩터 수집(순수 함수)** (D-134 트랙 2, 브리프 §1.1).
 *
 * 구현: src/lib/achievement/collect.ts · 타입: src/lib/achievement/types.ts
 * SSOT: docs/planning/23-achievement-report.md §3~§5
 *
 * ## 이 시험의 축은 하나다 — 🔴 **«기록 없음»(null) 과 «0» 을 섞지 않는다**
 *
 * 팩터 넷 중 지금 숫자가 있는 것은 «진도» 하나다(23 §1.1). 나머지 셋을 0으로 그리면
 * 리포트가 거짓말을 한다(23 §4 ③). 그래서 **네 쌍을 전부 짝으로** 건다:
 *   ㉠ 진도 0행 ↔ 진도가 있는 기간   ㉡ 채점 0건 ↔ 0점 응시
 *   ㉢ 강의 0편 ↔ 시청률 0%          ㉣ 계획 없음 ↔ 0일 밀림
 *
 * 그리고 표본 문턱(12문항, 두 방향) · 결시 제외 · **문항 합산(회차 평균이 아니다)** ·
 * 심화 세 갈래가 «심화» 밴드로 **합쳐진다**(버려지지 않는다) 를 같이 잠근다.
 */
import { describe, expect, it } from "vitest";

import type { Difficulty } from "@/contracts/difficulty";
import {
  type AchievementInput,
  collectAchievement,
  type ResultRow,
  type ScoredItem,
} from "@/lib/achievement/collect";
import { MIN_UNIT_PROBLEMS } from "@/lib/achievement/types";

// ── 픽스처 ──────────────────────────────────────────────────────────────
const PERIOD = { from: "2026-09-01", to: "2026-09-30" };

const U = (n: number) => ({
  unitId: `u${n}`,
  grade: "중1",
  chapter: `${n}. 단원`,
  section: `소단원 ${n}`,
  orderIndex: 100 + n,
});
const UNITS = [U(1), U(2), U(3), U(4)];

const RULE = {
  weekdays: [1, 3, 5],
  unitsPerLesson: 1,
  startUnitId: "u1",
  startDate: "2026-09-07",
  active: true,
};

const base = (over: Partial<AchievementInput> = {}): AchievementInput => ({
  student: {
    id: "s1",
    name: "장현승",
    className: "초등M 초5 MS1A",
    classGrade: "초5",
  },
  period: PERIOD,
  progress: [],
  units: UNITS,
  plan: null,
  results: [],
  lectures: { targets: [], views: [] },
  ...over,
});

const item = (
  unitId: string,
  difficulty: Difficulty,
  isCorrect: boolean,
): ScoredItem => ({ unitId, difficulty, isCorrect });

/** n 문항 중 c 문항 정답 — 한 단원·한 난이도. */
const items = (
  unitId: string,
  difficulty: Difficulty,
  total: number,
  correct: number,
): ScoredItem[] =>
  Array.from({ length: total }, (_, i) =>
    item(unitId, difficulty, i < correct),
  );

const round = (over: Partial<ResultRow> = {}): ResultRow => ({
  testId: "t1",
  testDate: "2026-09-10",
  takenAt: "2026-09-10T01:00:00.000Z",
  score: 80,
  maxScore: 100,
  absent: false,
  items: [],
  recommendedUnitIds: null,
  ...over,
});

// ── ① 무엇을 배웠나 ────────────────────────────────────────────────────
describe("① 무엇을 배웠나 — 진도", () => {
  it("🔴 ㉠-a 진도 0행이면 null 이다 — 빈 배열도 0차시도 아니다", () => {
    const f = collectAchievement(base());
    expect(f.learned.units).toBeNull();
    expect(f.learned.lessons).toBeNull();
  });

  it("㉠-b 진도가 한 줄이라도 있으면 차시 수가 숫자로 나온다", () => {
    const f = collectAchievement(
      base({ progress: [{ unitId: "u1", recordedAt: "2026-09-07" }] }),
    );
    expect(f.learned.lessons).toBe(1);
    expect(f.learned.units).toEqual([
      {
        unitId: "u1",
        grade: "중1",
        chapter: "1. 단원",
        section: "소단원 1",
        lessons: 1,
      },
    ]);
  });

  it("기간 밖 진도는 안 센다 — 그리고 그때도 «0차시»가 아니라 null 이다", () => {
    const f = collectAchievement(
      base({ progress: [{ unitId: "u1", recordedAt: "2026-08-31" }] }),
    );
    expect(f.learned.lessons).toBeNull();
  });

  it("같은 차시를 두 번 나가면 그 단원의 차시가 2다", () => {
    const f = collectAchievement(
      base({
        progress: [
          { unitId: "u1", recordedAt: "2026-09-07" },
          { unitId: "u1", recordedAt: "2026-09-09" },
          { unitId: "u2", recordedAt: "2026-09-11" },
        ],
      }),
    );
    expect(f.learned.lessons).toBe(3);
    expect(f.learned.units?.map((u) => [u.unitId, u.lessons])).toEqual([
      ["u1", 2],
      ["u2", 1],
    ]);
  });
});

describe("① 계획 대비 밀림 — «계획 없음»이 «0일 밀림»으로 새지 않는다", () => {
  it("🔴 ㉣-a 계획이 없으면 null 이고 까닭이 «계획없음»이다", () => {
    const f = collectAchievement(
      base({ progress: [{ unitId: "u1", recordedAt: "2026-09-07" }] }),
    );
    expect(f.learned.planDriftDays).toBeNull();
    expect(f.learned.planDriftGap).toBe("계획없음");
  });

  it("㉣-b 계획대로 나갔으면 0일이다 — 이때만 0이 참이다", () => {
    const f = collectAchievement(
      base({
        plan: RULE,
        progress: [{ unitId: "u1", recordedAt: "2026-09-07" }],
      }),
    );
    expect(f.learned.planDriftDays).toBe(0);
    expect(f.learned.planDriftGap).toBeNull();
  });

  it("계획은 있는데 진도가 0행이면 null 이고 까닭이 «진도없음»이다", () => {
    const f = collectAchievement(base({ plan: RULE }));
    expect(f.learned.planDriftDays).toBeNull();
    expect(f.learned.planDriftGap).toBe("진도없음");
  });

  it("계획이 꺼져 있으면 null 이고 까닭이 «계획꺼짐»이다", () => {
    const f = collectAchievement(
      base({
        plan: { ...RULE, active: false },
        progress: [{ unitId: "u1", recordedAt: "2026-09-07" }],
      }),
    );
    expect(f.learned.planDriftDays).toBeNull();
    expect(f.learned.planDriftGap).toBe("계획꺼짐");
  });

  it("진도의 차시가 교육과정 목록 밖이면 null 이고 까닭이 «차시밖»이다", () => {
    const f = collectAchievement(
      base({
        plan: RULE,
        progress: [{ unitId: "없는차시", recordedAt: "2026-09-07" }],
      }),
    );
    expect(f.learned.planDriftDays).toBeNull();
    expect(f.learned.planDriftGap).toBe("차시밖");
  });

  it("뒤처져 나갔으면 음수다 (월수금 계획 · u1 을 9/9 에 나감)", () => {
    const f = collectAchievement(
      base({
        plan: RULE,
        progress: [{ unitId: "u1", recordedAt: "2026-09-09" }],
      }),
    );
    expect(f.learned.planDriftDays).toBe(-2);
  });
});

// ── ② 얼마나 맞았나 ────────────────────────────────────────────────────
describe("② 얼마나 맞았나 — 채점 0건과 0점", () => {
  it("🔴 ㉡-a 채점 0건이면 회차·단원·난이도가 전부 null 이다", () => {
    const f = collectAchievement(base());
    expect(f.scored.rounds).toBeNull();
    expect(f.scored.absentRounds).toBeNull();
    expect(f.scored.averagePercent).toBeNull();
    expect(f.scored.unitAccuracy).toBeNull();
    expect(f.scored.bandAccuracy).toBeNull();
    expect(f.scored.reviewUnits).toBeNull();
  });

  it("㉡-b 0점을 받았으면 0이다 — null 이 아니다", () => {
    const f = collectAchievement(
      base({
        results: [round({ score: 0, items: items("u1", "기본", 8, 0) })],
      }),
    );
    expect(f.scored.rounds).toHaveLength(1);
    expect(f.scored.rounds?.[0]?.score).toBe(0);
    expect(f.scored.averagePercent).toBe(0);
  });
});

describe("② 결시 — 점수 평균·추이에 들어가지 않는다", () => {
  const rows = [
    round({ testId: "t1", testDate: "2026-09-03", score: 100, maxScore: 100 }),
    round({
      testId: "t2",
      testDate: "2026-09-10",
      score: null,
      maxScore: 100,
      absent: true,
      items: [],
    }),
  ];

  it("🔴 결시 회차는 rounds 에 없고 absentRounds 에 있다", () => {
    const f = collectAchievement(base({ results: rows }));
    expect(f.scored.rounds?.map((r) => r.testId)).toEqual(["t1"]);
    expect(f.scored.absentRounds?.map((r) => r.testId)).toEqual(["t2"]);
  });

  it("🔴 결시가 0점으로 평균에 실리지 않는다 — 100점 한 번 결시 한 번이면 100이다", () => {
    const f = collectAchievement(base({ results: rows }));
    expect(f.scored.averagePercent).toBe(100);
  });

  it("결시 회차의 문항은 단원·난이도 합산에도 안 들어간다", () => {
    const f = collectAchievement(
      base({
        results: [
          round({ testId: "t1", items: items("u1", "기본", 12, 12) }),
          round({
            testId: "t2",
            score: null,
            absent: true,
            items: items("u1", "기본", 12, 0),
          }),
        ],
      }),
    );
    expect(f.scored.unitAccuracy?.reported[0]?.total).toBe(12);
    expect(f.scored.unitAccuracy?.reported[0]?.accuracy).toBe(100);
  });

  it("전부 결시면 rounds 는 빈 배열이다 — null 이 아니다(기록은 있다)", () => {
    const f = collectAchievement(base({ results: [rows[1] as ResultRow] }));
    expect(f.scored.rounds).toEqual([]);
    expect(f.scored.absentRounds).toHaveLength(1);
    expect(f.scored.averagePercent).toBeNull();
  });
});

describe("② 재채점 — 한 회차는 마지막 채점 하나만 센다", () => {
  const rows = [
    round({
      testId: "t1",
      takenAt: "2026-09-10T01:00:00.000Z",
      score: 20,
      maxScore: 100,
      items: items("u1", "기본", 12, 2),
    }),
    round({
      testId: "t1",
      takenAt: "2026-09-11T05:00:00.000Z",
      score: 90,
      maxScore: 100,
      items: items("u1", "기본", 12, 11),
    }),
  ];

  it("🔴 같은 시험지에 채점 행이 둘이면 늦은 것만 남는다", () => {
    const f = collectAchievement(base({ results: rows }));
    expect(f.scored.rounds).toHaveLength(1);
    expect(f.scored.rounds?.[0]?.score).toBe(90);
  });

  it("🔴 문항 합산도 두 번 세지 않는다 (24문항이 아니라 12문항)", () => {
    const f = collectAchievement(base({ results: rows }));
    expect(f.scored.unitAccuracy?.reported[0]?.total).toBe(12);
    expect(f.scored.unitAccuracy?.reported[0]?.correct).toBe(11);
  });

  it("🔴 평균도 두 번 세지 않는다 (55% 가 아니라 90%)", () => {
    const f = collectAchievement(base({ results: rows }));
    expect(f.scored.averagePercent).toBe(90);
  });
});

describe("② 표본 문턱 — 12문항 (두 방향)", () => {
  it("문턱은 12다", () => {
    expect(MIN_UNIT_PROBLEMS).toBe(12);
  });

  it("🔴 11문항인 단원은 정답률을 내지 않는다 — 숨기지 않고 «표본 부족»으로 낸다", () => {
    const f = collectAchievement(
      base({ results: [round({ items: items("u1", "기본", 11, 3) })] }),
    );
    expect(f.scored.unitAccuracy?.reported).toEqual([]);
    expect(f.scored.unitAccuracy?.underSampled).toEqual([
      {
        unitId: "u1",
        grade: "중1",
        chapter: "1. 단원",
        section: "소단원 1",
        total: 11,
        needed: 12,
      },
    ]);
  });

  it("12문항이면 열린다", () => {
    const f = collectAchievement(
      base({ results: [round({ items: items("u1", "기본", 12, 3) })] }),
    );
    expect(f.scored.unitAccuracy?.underSampled).toEqual([]);
    expect(f.scored.unitAccuracy?.reported).toEqual([
      {
        unitId: "u1",
        grade: "중1",
        chapter: "1. 단원",
        section: "소단원 1",
        correct: 3,
        total: 12,
        accuracy: 25,
      },
    ]);
  });
});

describe("② 합산 — 회차 평균이 아니라 문항 합산", () => {
  /**
   * 회차 셋. u1 은 (2/2 · 2/2 · 2/8) — **문항 합산이면 6/12 = 50%**,
   * 회차 평균이면 (100 + 100 + 25)/3 = 75% 다. 가중치가 다르다.
   */
  const rows = [
    round({ testId: "t1", items: items("u1", "기본", 2, 2) }),
    round({ testId: "t2", items: items("u1", "기본", 2, 2) }),
    round({ testId: "t3", items: items("u1", "기본", 8, 2) }),
  ];

  it("🔴 단원 정답률이 문항 합산으로 나온다 (회차 평균 75% 가 아니라 50%)", () => {
    const f = collectAchievement(base({ results: rows }));
    const u1 = f.scored.unitAccuracy?.reported.find((u) => u.unitId === "u1");
    expect(u1?.correct).toBe(6);
    expect(u1?.total).toBe(12);
    expect(u1?.accuracy).toBe(50);
  });

  it("🔴 평균 점수도 배점 합산이다 (만점이 다른 회차를 회차 평균으로 접지 않는다)", () => {
    // 10점 만점에 10점 · 100점 만점에 50점 → 합산 60/110 = 54.5%, 회차 평균이면 75%
    const f = collectAchievement(
      base({
        results: [
          round({ testId: "t1", score: 10, maxScore: 10 }),
          round({ testId: "t2", score: 50, maxScore: 100 }),
        ],
      }),
    );
    expect(f.scored.averagePercent).toBe(54.5);
  });
});

describe("② 난이도 4단", () => {
  it("🔴 문항이 0인 밴드는 그 밴드만 null 이다 — 0% 가 아니다", () => {
    const f = collectAchievement(
      base({ results: [round({ items: items("u1", "기본", 12, 6) })] }),
    );
    expect(f.scored.bandAccuracy?.기본).toEqual({
      correct: 6,
      total: 12,
      accuracy: 50,
    });
    expect(f.scored.bandAccuracy?.연산).toBeNull();
    expect(f.scored.bandAccuracy?.응용).toBeNull();
    expect(f.scored.bandAccuracy?.심화).toBeNull();
  });

  it("🔴 심화하·심화중·심화상은 «심화» 한 밴드로 합쳐진다 — 버려지지 않는다", () => {
    const f = collectAchievement(
      base({
        results: [
          round({
            items: [
              ...items("u1", "심화하", 2, 1),
              ...items("u1", "심화중", 2, 1),
              ...items("u1", "심화상", 2, 0),
            ],
          }),
        ],
      }),
    );
    expect(f.scored.bandAccuracy?.심화).toEqual({
      correct: 2,
      total: 6,
      accuracy: 33.3,
    });
  });

  it("「기본까지는 되는데 응용에서 무너진다」를 숫자로 댈 수 있다", () => {
    const f = collectAchievement(
      base({
        results: [
          round({
            items: [
              ...items("u1", "기본", 10, 9),
              ...items("u1", "응용", 10, 2),
            ],
          }),
        ],
      }),
    );
    expect(f.scored.bandAccuracy?.기본?.accuracy).toBe(90);
    expect(f.scored.bandAccuracy?.응용?.accuracy).toBe(20);
  });
});

describe("② 복습이 필요한 단원", () => {
  it("🔴 분석 리포트가 0건이면 null 이다", () => {
    const f = collectAchievement(
      base({ results: [round({ recommendedUnitIds: null })] }),
    );
    expect(f.scored.reviewUnits).toBeNull();
  });

  it("리포트는 있는데 꼽힌 단원이 없으면 빈 배열이다 — null 이 아니다", () => {
    const f = collectAchievement(
      base({ results: [round({ recommendedUnitIds: [] })] }),
    );
    expect(f.scored.reviewUnits).toEqual([]);
  });

  it("여러 회차가 꼽은 횟수를 세고, 표본이 모자란 단원은 정답률을 null 로 낸다", () => {
    const f = collectAchievement(
      base({
        results: [
          round({
            testId: "t1",
            recommendedUnitIds: ["u1", "u2"],
            items: items("u1", "기본", 12, 3),
          }),
          round({
            testId: "t2",
            recommendedUnitIds: ["u1"],
            items: items("u2", "기본", 4, 1),
          }),
        ],
      }),
    );
    expect(f.scored.reviewUnits).toEqual([
      {
        unitId: "u1",
        grade: "중1",
        chapter: "1. 단원",
        section: "소단원 1",
        flaggedRounds: 2,
        problems: 12,
        accuracy: 25,
      },
      {
        unitId: "u2",
        grade: "중1",
        chapter: "2. 단원",
        section: "소단원 2",
        flaggedRounds: 1,
        problems: 4,
        accuracy: null,
      },
    ]);
  });
});

// ── ③ 스스로 한 것 ─────────────────────────────────────────────────────
describe("③ 스스로 한 것 — 강의 0편과 시청률 0%", () => {
  it("🔴 ㉢-a 대상 강의가 0편이면 null 이다 — «0편 완료»가 아니다", () => {
    const f = collectAchievement(base());
    expect(f.selfStudy.lectures).toBeNull();
  });

  it("㉢-b 대상이 있는데 하나도 안 봤으면 0이다 — null 이 아니다", () => {
    const f = collectAchievement(
      base({
        lectures: {
          targets: [{ lectureId: "l1" }, { lectureId: "l2" }],
          views: [],
        },
      }),
    );
    expect(f.selfStudy.lectures).toEqual({
      assigned: 2,
      completed: 0,
      averagePercent: 0,
    });
  });

  it("평균 시청률은 **대상 전체**에 대한 평균이다 (안 본 강의를 분모에서 빼지 않는다)", () => {
    const f = collectAchievement(
      base({
        lectures: {
          targets: [{ lectureId: "l1" }, { lectureId: "l2" }],
          views: [
            {
              lectureId: "l1",
              percent: 100,
              completedAt: "2026-09-05T00:00:00.000Z",
            },
          ],
        },
      }),
    );
    expect(f.selfStudy.lectures).toEqual({
      assigned: 2,
      completed: 1,
      averagePercent: 50,
    });
  });

  it("대상 밖 강의의 시청 기록은 안 센다", () => {
    const f = collectAchievement(
      base({
        lectures: {
          targets: [{ lectureId: "l1" }],
          views: [
            {
              lectureId: "l9",
              percent: 100,
              completedAt: "2026-09-05T00:00:00.000Z",
            },
          ],
        },
      }),
    );
    expect(f.selfStudy.lectures).toEqual({
      assigned: 1,
      completed: 0,
      averagePercent: 0,
    });
  });

  it("🔴 숙제는 표가 없다 — 언제나 null", () => {
    expect(collectAchievement(base()).selfStudy.homework).toBeNull();
  });
});

// ── ④ 선생님 의견 ──────────────────────────────────────────────────────
describe("④ 선생님 의견", () => {
  it("🔴 아직 칸이 없다 — 언제나 null", () => {
    expect(collectAchievement(base()).teacherNote).toBeNull();
  });
});

// ── 단일 지수 금지 ─────────────────────────────────────────────────────
describe("🔴 단일 «성취 지수»를 만들지 않는다 (23 §2.4)", () => {
  it("산출물에 팩터를 합친 한 숫자가 없다", () => {
    const f = collectAchievement(
      base({
        progress: [{ unitId: "u1", recordedAt: "2026-09-07" }],
        results: [round({ items: items("u1", "기본", 12, 6) })],
        lectures: { targets: [{ lectureId: "l1" }], views: [] },
      }),
    );
    for (const banned of ["totalIndex", "achievementScore", "overall", "index"])
      expect(Object.keys(f)).not.toContain(banned);
  });
});

// ── 비교군 ─────────────────────────────────────────────────────────────
describe("비교군 — 기본값은 «미사용»", () => {
  it("아무것도 안 주면 null 이다", () => {
    expect(collectAchievement(base()).comparison).toBeNull();
  });

  it("«미사용»을 명시해도 null 이다", () => {
    const f = collectAchievement(base({ comparison: { kind: "미사용" } }));
    expect(f.comparison).toBeNull();
  });

  it("지난 같은 길이 기간 — 표본 수 1, 그 기간의 진도만 센다", () => {
    const f = collectAchievement(
      base({
        progress: [{ unitId: "u1", recordedAt: "2026-09-07" }],
        comparison: {
          kind: "지난기간",
          // 직전 기간은 2026-08-02 ~ 2026-08-31 (30일)
          progress: [
            { unitId: "u1", recordedAt: "2026-08-10" },
            { unitId: "u2", recordedAt: "2026-08-12" },
            { unitId: "u3", recordedAt: "2026-07-31" }, // 직전 기간 밖
          ],
          results: [],
        },
      }),
    );
    expect(f.comparison).toEqual({
      kind: "지난기간",
      sampleSize: 1,
      lessons: { value: 2, sample: 1 },
      averagePercent: { value: null, sample: 0 },
    });
  });

  it("🔴 같은 반 평균은 표본 수를 반드시 같이 낸다", () => {
    const f = collectAchievement(
      base({
        comparison: {
          kind: "반평균",
          students: [
            {
              id: "a",
              progress: [{ unitId: "u1", recordedAt: "2026-09-07" }],
              results: [round({ score: 60, maxScore: 100 })],
            },
            {
              id: "b",
              progress: [
                { unitId: "u1", recordedAt: "2026-09-07" },
                { unitId: "u2", recordedAt: "2026-09-09" },
              ],
              results: [round({ score: 80, maxScore: 100 })],
            },
          ],
        },
      }),
    );
    expect(f.comparison).toEqual({
      kind: "반평균",
      sampleSize: 2,
      lessons: { value: 1.5, sample: 2 },
      averagePercent: { value: 70, sample: 2 },
    });
  });

  it("반에 아무도 없으면 표본 0 이고 값은 null 이다 — 0 이 아니다", () => {
    const f = collectAchievement(
      base({ comparison: { kind: "반평균", students: [] } }),
    );
    expect(f.comparison).toEqual({
      kind: "반평균",
      sampleSize: 0,
      lessons: { value: null, sample: 0 },
      averagePercent: { value: null, sample: 0 },
    });
  });
});
