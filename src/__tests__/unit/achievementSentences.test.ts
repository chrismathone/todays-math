/**
 * 🔴 RED → 🟢 — **리포트가 학부모에게 하는 말** (D-134 트랙 2 · Hi-fi 브리프 §1 #2·#3 · §2 규칙 4~9).
 *
 * 구현: src/lib/achievement/sentences.ts — 🔴 원장 화면과 학부모 지면이 **이 함수들만** 부른다.
 *
 * 무엇을 잠그나
 * 1. 🔴 **근거가 모자라면 말하지 않는다**(`null`) — 애매한 문장을 지어내지 않는다.
 * 2. 🔴 **점수는 점수로 · 문제 수는 문항 기록으로만** (§1 #2). 배점 비율을 «10문제 중 N문제»로
 *    바꿔 말하면 시험지가 8문항인데 «10문제»가 지어진다.
 * 3. 🔴 **밴드도 12문항 문턱** (§1 #3). 심화 1문항만 맞혀도 «심화까지 고르게 잘 푼다»가 나오던 자리다.
 *    «까지·고르게·부터»(이어진 구간을 말하는 표현)는 **그 구간의 단이 전부 측정·문턱 통과**일 때만.
 * 4. 🔴 **하단 한 줄은 학생이 아니라 리포트를 설명한다** (23 §7.2 Q5) — «시험 0회»·«기록 없음» 금지.
 * 5. 문구는 **전문용어 없이 · 느낌표·이모지 없이**(D-08).
 */
import { describe, expect, it } from "vitest";

import {
  absentSentence,
  bandCell,
  bandSentence,
  coverageLine,
  driftSentence,
  homeworkSentence,
  learnedSentence,
  lectureSentence,
  outOfPhrase,
  problemSentence,
  scoreSentence,
  underSampledSentence,
} from "@/lib/achievement/sentences";
import type {
  AchievementBand,
  AchievementFactors,
  BandAccuracy,
  ScoredRound,
} from "@/lib/achievement/types";

const band = (accuracy: number, total = 12): BandAccuracy => ({
  correct: Math.round((accuracy / 100) * total),
  total,
  accuracy,
});

const bands = (
  over: Partial<Record<AchievementBand, BandAccuracy | null>>,
): Record<AchievementBand, BandAccuracy | null> => ({
  연산: null,
  기본: null,
  응용: null,
  심화: null,
  ...over,
});

const MONTH = { from: "2026-08-01", to: "2026-08-31" };

const roundOf = (
  score: number | null,
  maxScore: number | null,
  n = 1,
): ScoredRound => ({
  testId: `t${n}`,
  testDate: `2026-08-0${n}`,
  takenAt: `2026-08-0${n}T01:00:00.000Z`,
  score,
  maxScore,
});

describe("🔴 난이도 4단 — 12문항 문턱과 «까지·고르게·부터»", () => {
  it("잰 밴드가 없으면 말하지 않는다", () => {
    expect(bandSentence(null)).toBeNull();
    expect(bandSentence(bands({}))).toBeNull();
  });

  it("🔴 심화 1문항만 맞혀도 «심화까지 고르게»라고 하지 않는다 — 확인된 단까지만 말한다", () => {
    const s = bandSentence(
      bands({
        연산: band(95),
        기본: band(90),
        응용: band(80),
        심화: { correct: 1, total: 1, accuracy: 100 },
      }),
    );
    expect(s).toBe("응용까지는 잘 풉니다.");
    expect(s).not.toContain("심화");
    expect(s).not.toContain("고르게");
  });

  it("네 단이 전부 12문항 이상이고 잘 풀 때만 «심화까지 고르게»", () => {
    expect(
      bandSentence(
        bands({
          연산: band(95),
          기본: band(90),
          응용: band(80),
          심화: band(75),
        }),
      ),
    ).toBe("심화까지 고르게 잘 풀고 있습니다.");
  });

  it("🔴 «까지»는 연산부터 그 단까지가 전부 확인됐을 때만 — 연산이 12문항 미만이면 «기본은»", () => {
    expect(
      bandSentence(
        bands({ 연산: band(100, 5), 기본: band(90), 응용: band(40) }),
      ),
    ).toBe("기본은 잘 풀고, 응용에서 막힙니다.");
  });

  it("「기본까지는 되는데 응용에서 무너진다」 — 심화가 문턱 미만이면 «응용에서»(부터가 아니다)", () => {
    expect(
      bandSentence(
        bands({
          연산: band(95),
          기본: band(88),
          응용: band(40),
          심화: band(20, 8),
        }),
      ),
    ).toBe("기본까지는 잘 풀고, 응용에서 막힙니다.");
  });

  it("응용·심화가 다 확인되고 둘 다 어려우면 그때 «응용부터»", () => {
    expect(
      bandSentence(
        bands({
          연산: band(95),
          기본: band(88),
          응용: band(40),
          심화: band(20),
        }),
      ),
    ).toBe("기본까지는 잘 풀고, 응용부터 어려워합니다.");
  });

  it("🔴 «연산부터»는 네 단이 전부 확인되고 전부 어려울 때만", () => {
    expect(
      bandSentence(
        bands({
          연산: band(30),
          기본: band(20),
          응용: band(10),
          심화: band(0),
        }),
      ),
    ).toBe("연산부터 어려워합니다.");
    expect(bandSentence(bands({ 연산: band(30), 기본: band(20) }))).toBe(
      "연산·기본에서 막힙니다.",
    );
  });

  it("🔴 앞 단이 약하고 뒷 단이 강하면 «부터»로 뭉개지 않는다 — 본 대로 말한다", () => {
    expect(bandSentence(bands({ 연산: band(30), 기본: band(90) }))).toBe(
      "기본은 잘 풀고, 연산에서 막힙니다.",
    );
  });

  it("어중간하면(70 미만 50 이상) 말하지 않는다 — 지어내지 않는다", () => {
    expect(bandSentence(bands({ 연산: band(60), 기본: band(55) }))).toBeNull();
  });

  it("🔴 전부 12문항 미만이면 문장이 없다 — 숫자만 남는다", () => {
    expect(
      bandSentence(
        bands({
          연산: band(100, 11),
          기본: band(100, 11),
          응용: band(0, 11),
          심화: band(0, 11),
        }),
      ),
    ).toBeNull();
  });
});

describe("🔴 난이도 한 칸의 글자 — 미측정과 실제 0 을 가른다 (§2 규칙 3)", () => {
  it("문항이 없으면 «문제 없음» — 「—」 하나로 둘을 같이 쓰지 않는다", () => {
    expect(bandCell(null)).toEqual({ count: "문제 없음", status: null });
  });

  it("12문항 이상 전부 틀리면 «12문제 중 0문제» — 0 이 글자로 남는다", () => {
    expect(bandCell({ correct: 0, total: 12, accuracy: 0 })).toEqual({
      count: "12문제 중 0문제",
      status: null,
    });
  });

  it("12문항 미만이면 숫자는 적고 «평가 보류»를 붙인다", () => {
    expect(bandCell({ correct: 3, total: 8, accuracy: 37.5 })).toEqual({
      count: "8문제 중 3문제",
      status: "평가 보류",
    });
  });
});

describe("🔴 점수는 점수로 — 만점은 실제 합 (§1 #2)", () => {
  it("🔴 «10문제»를 지어내지 않는다 — 만점과 평균을 점수로 말한다", () => {
    const s = scoreSentence([roundOf(75, 100, 1), roundOf(62.5, 100, 2)]);
    expect(s).toBe("시험 2회, 100점 만점에 평균 68.8점입니다.");
    expect(s).not.toMatch(/문제/);
  });

  it("만점이 67 이면 67 이다 — 100 으로 바꿔 말하지 않는다", () => {
    expect(scoreSentence([roundOf(50, 67)])).toBe(
      "시험 1회, 67점 만점에 평균 50점입니다.",
    );
  });

  it("회차마다 만점이 다르면 합계로 말한다 — 평균을 지어내지 않는다", () => {
    expect(scoreSentence([roundOf(10, 10, 1), roundOf(50, 100, 2)])).toBe(
      "시험 2회 합계 110점 만점에 60점입니다.",
    );
  });

  it("0점은 0점이다 — 말한다", () => {
    expect(scoreSentence([roundOf(0, 100)])).toBe(
      "시험 1회, 100점 만점에 평균 0점입니다.",
    );
  });

  it("🔴 잴 회차가 없으면(채점 0건 · 전부 결시 · 만점 모름) 말하지 않는다", () => {
    expect(scoreSentence(null)).toBeNull();
    expect(scoreSentence([])).toBeNull();
    expect(scoreSentence([roundOf(80, null)])).toBeNull();
  });
});

describe("🔴 문제 수는 문항 기록으로만 (§1 #2)", () => {
  it("배점 90·10 중 첫째만 맞히면 «2문제 중 1문제» — 「10문제 중 9문제」가 아니다", () => {
    expect(problemSentence({ correct: 1, total: 2, rounds: 1 }, 1)).toBe(
      "2문제 중 1문제를 맞혔습니다.",
    );
  });

  it("문항 기록이 없는 회차가 섞이면 몇 회의 기록인지 밝힌다", () => {
    expect(problemSentence({ correct: 6, total: 8, rounds: 1 }, 2)).toBe(
      "문항 기록이 있는 1회에서 8문제 중 6문제를 맞혔습니다.",
    );
  });

  it("문항 기록이 없으면 말하지 않는다", () => {
    expect(problemSentence(null, 2)).toBeNull();
  });

  it("「10문제 중 6문제」 — 비율보다 학부모에게 가깝다", () => {
    expect(outOfPhrase(6, 10)).toBe("10문제 중 6문제");
  });
});

describe("결시 · 표본 부족 — 네 상태를 가른다 (§2 규칙 5·6)", () => {
  it("결시는 평균에서 뺐다고 말한다 — 0점으로 잇지 않는다", () => {
    expect(absentSentence([roundOf(null, 100)])).toBe(
      "결시 1회는 평균에서 뺐습니다.",
    );
    expect(absentSentence([])).toBeNull();
    expect(absentSentence(null)).toBeNull();
  });

  it("🔴 표본 부족 단원은 개수 한 줄 — «다음 달»·«표본»을 쓰지 않는다", () => {
    const s = underSampledSentence(3);
    expect(s).toBe(
      "문제 수가 적은 3개 단원은 이번 리포트에서 평가를 보류했습니다.",
    );
    expect(s).not.toMatch(/다음 달|표본/);
    expect(underSampledSentence(0)).toBeNull();
  });
});

describe("① 진도 · ③ 영상 · 숙제", () => {
  it("배운 것 — 달이면 «이번 달»", () => {
    expect(
      learnedSentence(
        {
          units: Array.from({ length: 17 }, (_, i) => ({
            unitId: `u${i}`,
            grade: "초5",
            chapter: "c",
            section: `s${i}`,
            lessons: 1,
          })),
          lessons: 19,
          planDriftDays: null,
          planDriftGap: "계획없음",
        },
        MONTH,
      ),
    ).toBe("이번 달 19차시 동안 소단원 17개를 배웠습니다.");
    expect(
      learnedSentence(
        {
          units: null,
          lessons: null,
          planDriftDays: null,
          planDriftGap: "계획없음",
        },
        MONTH,
      ),
    ).toBeNull();
  });

  it("🔴 영상은 **완료 편수만** — 월말까지 (§2 규칙 8)", () => {
    const s = lectureSentence(
      { assigned: 6, completed: 4, averagePercent: 71 },
      MONTH,
    );
    expect(s).toBe(
      "이번 달 배운 내용의 영상 6편 중 월말까지 4편을 끝까지 봤습니다.",
    );
    expect(s).not.toMatch(/%/);
    expect(
      lectureSentence({ assigned: 6, completed: 0, averagePercent: 0 }, MONTH),
    ).toBe(
      "이번 달 배운 내용의 영상 6편 중 월말까지 끝까지 본 영상은 없습니다.",
    );
    expect(lectureSentence(null, MONTH)).toBeNull();
  });

  it("🔴 숙제는 확인 범위와 함께 — 「확인한 N번 중 M번」(§2 규칙 7)", () => {
    expect(
      homeworkSentence({
        checked: 8,
        missed: 2,
        missedDates: ["2026-08-05", "2026-08-19"],
      }),
    ).toBe("숙제를 확인한 8번 중 2번 안 해 왔습니다.");
    expect(homeworkSentence({ checked: 8, missed: 0, missedDates: [] })).toBe(
      "숙제를 확인한 8번 모두 해 왔습니다.",
    );
    expect(homeworkSentence(null)).toBeNull();
  });
});

describe("🔴 하단 한 줄 «이번 기간 기록 현황» — 리포트를 설명한다 (23 §7.2 Q5)", () => {
  const factors = (over: Partial<AchievementFactors>): AchievementFactors => ({
    student: { id: "s", name: "n", className: "c", classGrade: "초5" },
    period: MONTH,
    learned: {
      units: [
        {
          unitId: "u1",
          grade: "초5",
          chapter: "c",
          section: "s",
          lessons: 19,
        },
      ],
      lessons: 19,
      planDriftDays: null,
      planDriftGap: "계획없음",
    },
    scored: {
      rounds: null,
      absentRounds: null,
      averagePercent: null,
      problems: null,
      unitAccuracy: null,
      bandAccuracy: null,
      reviewUnits: null,
    },
    selfStudy: { lectures: null, homework: null },
    teacherNote: null,
    comparison: null,
    ...over,
  });

  it("진도만 있으면 — 담은 것과 담지 않은 것을 이름으로", () => {
    const line = coverageLine(factors({}));
    expect(line).toBe(
      "이번 리포트에 담은 기록: 진도 19차시. 담지 않은 기록: 시험 · 예습 영상 · 숙제.",
    );
  });

  it("🔴 학생의 행동으로 읽히는 말·개발 사정을 쓰지 않는다", () => {
    const line = coverageLine(factors({}));
    expect(line).not.toMatch(/0회|0편|기록 없음|칸|채점 화면|아직/);
  });

  it("다 차면 담은 것만 — 결시는 포함했다고 밝힌다", () => {
    const line = coverageLine(
      factors({
        scored: {
          rounds: [roundOf(75, 100, 1), roundOf(80, 100, 2)],
          absentRounds: [roundOf(null, 100, 3)],
          averagePercent: 77.5,
          problems: { correct: 12, total: 16, rounds: 2 },
          unitAccuracy: { reported: [], underSampled: [] },
          bandAccuracy: bands({}),
          reviewUnits: null,
        },
        selfStudy: {
          lectures: { assigned: 6, completed: 4, averagePercent: 70 },
          homework: { checked: 8, missed: 2, missedDates: [] },
        },
      }),
    );
    expect(line).toBe(
      "이번 리포트에 담은 기록: 진도 19차시 · 시험 3회(결시 1회 포함) · 예습 영상 6편 · 숙제 확인 8번.",
    );
  });
});

describe("문구 — 전문용어·느낌표 없이 (D-08)", () => {
  it("느낌표·이모지가 없다", () => {
    const all = [
      bandSentence(bands({ 연산: band(95), 기본: band(90), 응용: band(30) })),
      scoreSentence([roundOf(62, 100)]),
      problemSentence({ correct: 6, total: 8, rounds: 1 }, 1),
      lectureSentence({ assigned: 6, completed: 4, averagePercent: 1 }, MONTH),
      homeworkSentence({ checked: 8, missed: 2, missedDates: [] }),
      underSampledSentence(3),
      driftSentence(-3),
      driftSentence(0),
      driftSentence(2),
    ].join(" ");
    expect(all).not.toMatch(/[!！]/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toMatch(/정답률|%/);
  });
});

describe("계획 대비 밀림 — 못 재면 말하지 않는다", () => {
  it("🔴 null 이면 문장이 없다 — 「0일 밀림」으로 적지 않는다", () => {
    expect(driftSentence(null)).toBeNull();
  });

  it("0 이면 계획대로다 — 이때만 0이 참이다", () => {
    expect(driftSentence(0)).toBe("계획한 진도대로 나가고 있습니다.");
  });

  it("음수는 늦음 · 양수는 앞섬", () => {
    expect(driftSentence(-3)).toBe("계획보다 3일 늦습니다.");
    expect(driftSentence(2)).toBe("계획보다 2일 앞서 있습니다.");
  });
});
