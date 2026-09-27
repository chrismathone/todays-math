// @vitest-environment node
/**
 * 진도판 — 중등 단원 넘김 · 예정 칸 · 가운데 «나의 진행» (D-142, 원장님 2026-09-27).
 * 오늘 칸과 예정 칸이 서로 다른 규칙으로 갈리지 않게, 예정은 `planExpedition` 이 쓰는 같은 넘김 규칙에서 뽑는다.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  mathExpeditionJourneySchema,
  type StoredExpeditionMission,
} from "@/contracts/mathExpedition.contract";
import { planExpedition } from "@/lib/math-explorers/expedition";
import { expeditionJourney } from "@/lib/math-explorers/expeditionJourney";
import { createExplorerState } from "@/lib/math-explorers/engine";
import {
  definitionCards,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import { bankKindForExplorerUnit } from "@/lib/math-explorers/curriculumBridge";
import { unitHasBank } from "@/lib/math-explorers/journeyForecast";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import { dailyJourneyDto } from "@/lib/math-srs/dailyJourney";
import { emptySrsState, type StoredSrsState } from "@/lib/math-srs/serverState";

const student = randomUUID();
const now = new Date("2026-09-27T03:00:00.000Z"); // 한국 9월 27일 12시
const today = "2026-09-27";
const G8 = [
  "유리수·순환소수와 지수",
  "식의 계산과 일차부등식",
  "연립일차방정식",
  "일차함수",
  "삼각형과 사각형의 성질",
  "닮음과 피타고라스",
  "경우의 수와 확률",
];
const G9 = [
  "제곱근과 실수",
  "다항식의 곱셈과 인수분해",
  "이차방정식",
  "이차함수",
  "삼각비",
  "원의 성질",
  "통계와 상관관계",
];

/** 학년 · 목표 단원 · 다 모은 단원들로 탐험 상태를 만든다. `due` 가 오늘이면 모은 카드가 전부 기억 복습 만기. */
function explorerState(
  grade: number,
  goal: string | undefined,
  collected: string[],
  due = "2026-12-01",
): StoredSrsState {
  const explorer = createExplorerState(student, grade);
  explorer.profile.definitions = {
    courseGrade: grade,
    ...(goal ? { goalUnitId: goal } : {}),
    runs: 1,
    history: [],
    cards: Object.fromEntries(
      definitionCards
        .filter((card) => collected.includes(card.unit))
        .map((card) => [
          card.id,
          {
            level: 1,
            due,
            lastDate: "2026-09-26",
            attemptedAt: "2026-09-26",
            missed: 0,
          },
        ]),
    ),
  };
  return { ...emptySrsState(), explorers: explorer };
}
function openMission(
  plan: Pick<
    StoredExpeditionMission,
    "kind" | "route" | "unitId" | "title" | "subtitle" | "goal"
  >,
  answered = 6,
): StoredExpeditionMission {
  return {
    ...plan,
    id: randomUUID(),
    date: today,
    answered,
    retryRemaining: 0,
    status: "active",
    sourceSessionId: "definitions-x-1",
    sourceSessionIds: ["definitions-x-1"],
    startedAt: "2026-09-27T01:00:00.000Z",
    completedAt: null,
    awardEligible: true,
    references: [],
  };
}
function withLedger(
  state: StoredSrsState,
  mission: StoredExpeditionMission | null,
  awardDates: string[] = [],
): StoredSrsState {
  return {
    ...state,
    expedition: {
      version: 1,
      initializedAt: "2026-09-01T00:00:00.000Z",
      mission,
      legacyDays: [],
      receipts: [],
      awards: awardDates.map((date) => ({
        missionId: randomUUID(),
        references: [],
        day: {
          id: `expedition:${date}`,
          date,
          completedAt: `${date}T02:00:00.000Z`,
          title: "연립일차방정식",
          subtitle: "중학교 2학년",
          reviewCount: 15,
          kind: "explorers" as const,
          dayId: date,
          reviews: [
            {
              kind: "explorers" as const,
              dayId: date,
              title: "연립일차방정식",
              subtitle: "중학교 2학년",
              reviewCount: 15,
            },
          ],
        },
      })),
    },
  };
}
const titles = (items: ReadonlyArray<{ title: string }>) =>
  items.map((item) => item.title);
type Kind = "middle" | "explorers" | "elementary";
const review = (kind: Kind, date: string) => ({
  kind,
  dayId: `${kind}:${date}`,
  title: kind === "middle" ? "일차방정식" : "기억 복습",
  subtitle: "중학교 1학년",
  reviewCount: kind === "middle" ? 12 : 15,
});
/** 칸 기록 — `awards` 는 끝낸 오늘의 탐험(종류 하나), `legacy` 는 이관한 옛 날(한 날에 종류 여럿). */
function withDays(
  state: StoredSrsState,
  mission: StoredExpeditionMission | null,
  awards: Array<[string, Kind]>,
  legacy: Array<[string, Kind[]]> = [],
): StoredSrsState {
  const day = (date: string, kinds: Kind[]) => ({
    id: `expedition:${date}`,
    date,
    completedAt: `${date}T02:00:00.000Z`,
    ...review(kinds[0], date),
    reviews: kinds.map((kind) => review(kind, date)),
  });
  return {
    ...state,
    expedition: {
      version: 1,
      initializedAt: "2026-09-01T00:00:00.000Z",
      mission,
      receipts: [],
      legacyDays: legacy.map(([date, kinds]) => day(date, kinds)),
      awards: awards.map(([date, kind]) => ({
        missionId: randomUUID(),
        references: [],
        day: day(date, [kind]),
      })),
    },
  };
}
const bankPlan = {
  kind: "middle",
  route: "bank",
  unitId: "g7-equation",
  title: "일차방정식",
  subtitle: "중학교 1학년",
  goal: 12,
};
const G7 = [
  "소인수분해",
  "정수와 유리수",
  "문자와 식",
  "일차방정식",
  "좌표와 비례관계",
  "기본 도형과 작도",
  "평면도형과 입체도형",
  "자료의 정리와 해석",
];
const conceptPlan = (unitId: string) => {
  const unit = definitionUnits.find((u) => u.id === unitId)!;
  return {
    kind: "explorers" as const,
    route: "unit" as const,
    unitId,
    title: unit.title,
    subtitle:
      unit.grade < 7
        ? `초등 ${unit.grade}학년`
        : `중학교 ${unit.grade - 6}학년`,
    goal: 15,
  };
};

describe("중등 단원 넘김 — 개념 카드를 다 모으면 다음 단원 (D-142)", () => {
  it("목표 단원을 다 모으면 학년 순서에서 다음 «덜 모은» 단원을 낸다", () => {
    expect(
      planExpedition(
        explorerState(8, "g8-simultaneous", ["g8-simultaneous"]),
        student,
        now,
      ),
    ).toEqual(conceptPlan("g8-function"));
    expect(
      planExpedition(
        explorerState(8, "g8-simultaneous", ["g8-simultaneous", "g8-function"]),
        student,
        now,
      ),
    ).toEqual(conceptPlan("g8-shapes"));
  });
  it("학년 단원이 끝나면 다음 학년 첫 «덜 모은» 단원으로 이어 간다", () => {
    expect(
      planExpedition(
        explorerState(8, "g8-probability", ["g8-probability"]),
        student,
        now,
      ),
    ).toEqual(conceptPlan("g9-real"));
  });
  it("목표 단원이 덜 모였으면 앞 단원이 비어도 목표 단원이 이긴다 · 목표가 없으면 학년 첫 단원부터", () => {
    expect(
      planExpedition(explorerState(8, "g8-function", []), student, now),
    ).toEqual(conceptPlan("g8-function"));
    expect(
      planExpedition(explorerState(8, undefined, ["g8-numbers"]), student, now),
    ).toEqual(conceptPlan("g8-inequality"));
  });
  it("기억 복습 날 규칙은 그대로다 — 모은 카드 다섯 장이 만기면 넘기기 전에 기억 복습", () => {
    const plan = planExpedition(
      explorerState(8, "g8-simultaneous", ["g8-simultaneous"], today),
      student,
      now,
    );
    expect(plan).toMatchObject({
      kind: "explorers",
      route: "memory",
      title: "기억 복습",
      unitId: "g8-simultaneous",
    });
  });
  it("중1 일차방정식(은행 단원)은 은행 날을 3일 끝내기 전까지 은행 날 — 앞 단원에서 걸어 와도 거기서 멈춘다 (D-142 ⑹)", () => {
    const collected = explorerState(7, "g7-equation", ["g7-equation"]);
    expect(planExpedition(collected, student, now)).toEqual(bankPlan);
    for (const days of [1, 2]) {
      const awards = Array.from(
        { length: days },
        (_, i) => [`2026-09-2${i}`, "middle"] as [string, Kind],
      );
      expect(
        planExpedition(withDays(collected, null, awards), student, now),
      ).toEqual(bankPlan);
    }
    expect(
      planExpedition(
        explorerState(7, "factors", [
          "factors",
          "numbers",
          "expressions",
          "g7-equation",
        ]),
        student,
        now,
      ),
    ).toEqual(bankPlan);
  });
  it("뒤 단원을 전부 모았으면 지금처럼 같은 단원을 다시 낸다", () => {
    expect(
      planExpedition(
        explorerState(9, "g9-statistics", ["g9-statistics"]),
        student,
        now,
      ),
    ).toEqual(conceptPlan("g9-statistics"));
  });
  it("이미 열린 오늘의 탐험은 바뀌지 않는다 — 시작할 때 서버가 확정한 단원 그대로", () => {
    const mission = openMission(conceptPlan("g8-simultaneous"));
    const state = withLedger(
      explorerState(8, "g8-simultaneous", ["g8-simultaneous"]),
      mission,
    );
    expect(planExpedition(state, student, now)).toMatchObject({
      unitId: "g8-simultaneous",
      title: "연립일차방정식",
      status: "active",
    });
  });
  it("은행이 있는 단원 표는 문제은행 연결과 같다 (초등 24 · 중1 일차방정식)", () => {
    for (const unit of definitionUnits)
      expect(unitHasBank(unit)).toBe(bankKindForExplorerUnit(unit.id) !== null);
  });
});

describe("중1 일차방정식 — 끝낸 은행 날 3일 뒤 다음 단원 (D-142 ⑹, 원장님 2026-09-27)", () => {
  const collected = explorerState(7, "g7-equation", ["g7-equation"]);
  const threeBank: Array<[string, Kind]> = [
    ["2026-09-20", "middle"],
    ["2026-09-22", "middle"],
    ["2026-09-24", "middle"],
  ];
  it("끝낸 은행 날이 3일이면 넘김 규칙대로 다음 «덜 모은» 단원 — 앞 단원에서 걸어 와도", () => {
    expect(
      planExpedition(withDays(collected, null, threeBank), student, now),
    ).toEqual(conceptPlan("g7-coordinate"));
    const walked = explorerState(7, "factors", [
      "factors",
      "numbers",
      "expressions",
      "g7-equation",
    ]);
    expect(
      planExpedition(withDays(walked, null, threeBank), student, now),
    ).toEqual(conceptPlan("g7-coordinate"));
  });
  it("달력 날이 아니라 끝낸 은행 날로 센다 — 기억 복습 · 개념 날은 세지 않는다", () => {
    const state = withDays(collected, null, [
      ["2026-09-18", "middle"],
      ["2026-09-19", "explorers"],
      ["2026-09-20", "explorers"],
      ["2026-09-21", "middle"],
      ["2026-09-22", "explorers"],
      ["2026-09-23", "elementary"],
    ]);
    expect(planExpedition(state, student, now)).toEqual(bankPlan);
  });
  it("이관한 옛 칸도 센다 — 한 날에 여러 종류가 섞였으면 하루", () => {
    const state = withDays(
      collected,
      null,
      [["2026-09-24", "middle"]],
      [
        ["2026-09-10", ["explorers", "middle"]],
        ["2026-09-11", ["middle"]],
        ["2026-09-12", ["explorers"]],
      ],
    );
    expect(planExpedition(state, student, now)).toEqual(
      conceptPlan("g7-coordinate"),
    );
  });
  it("열린 은행 미션은 그대로 — 3일째를 이미 채웠어도 오늘 시작한 은행 날을 끝까지", () => {
    const mission = openMission(
      bankPlan as Parameters<typeof openMission>[0],
      5,
    );
    const state = withDays(collected, mission, threeBank);
    expect(planExpedition(state, student, now)).toMatchObject({
      kind: "middle",
      unitId: "g7-equation",
      status: "active",
    });
  });
  it("예정 칸 — 개념 날 오늘 뒤로 «일차방정식» 은행 날 3칸, 그다음 단원들", () => {
    const state = withDays(
      explorerState(7, "g7-equation", []),
      openMission(conceptPlan("g7-equation")),
      [],
    );
    const journey = expeditionJourney(state, now, student);
    expect(titles(journey.upcoming)).toEqual([
      "일차방정식",
      "일차방정식",
      "일차방정식",
      "일차방정식",
      ...G7.slice(4),
      ...G8.slice(0, 4),
    ]);
  });
  it("예정 칸 — 은행 날 하루를 끝낸 뒤 오늘 은행 칸 · 남은 한 칸 · 다음 단원", () => {
    const journey = expeditionJourney(
      withDays(collected, null, [["2026-09-24", "middle"]]),
      now,
      student,
    );
    expect(titles(journey.upcoming).slice(0, 4)).toEqual([
      "일차방정식",
      "일차방정식",
      "좌표와 비례관계",
      "기본 도형과 작도",
    ]);
    expect(journey.position).toMatchObject({
      caption: "중1 · 8단원 중",
      ordinal: 4,
      title: "일차방정식",
    });
  });
  it("예정 칸 — 셋째 은행 날을 오늘 끝냈으면 내일부터 다음 단원", () => {
    const done = {
      ...openMission(bankPlan as Parameters<typeof openMission>[0], 12),
      status: "complete" as const,
      completedAt: "2026-09-27T02:00:00.000Z",
    };
    const state = withDays(collected, done, [
      ["2026-09-24", "middle"],
      ["2026-09-25", "middle"],
      [today, "middle"],
    ]);
    const journey = expeditionJourney(state, now, student);
    expect(journey.todayComplete).toBe(true);
    expect(titles(journey.upcoming).slice(0, 2)).toEqual([
      "좌표와 비례관계",
      "기본 도형과 작도",
    ]);
    expect(journey.position).toMatchObject({
      ordinal: 5,
      title: "좌표와 비례관계",
    });
  });
  it("같은 규칙 — 은행 칸 다음 칸은 은행 날을 하루 더 끝낸 뒤의 planExpedition 결과", () => {
    for (const done of [0, 1, 2]) {
      const awards = threeBank.slice(0, done);
      const journey = expeditionJourney(
        withDays(collected, null, awards),
        now,
        student,
      );
      const after = withDays(collected, null, [
        ...awards,
        ["2026-09-26", "middle"],
      ]);
      expect(journey.upcoming[1].title).toBe(
        planExpedition(after, student, now).title,
      );
    }
  });
});

describe("예정 칸 — 오늘 + 다음 단원들 (한 페이지까지)", () => {
  it("1일차 연립 개념 날: 오늘 칸 뒤로 학년 단원, 학년이 바뀌는 첫 칸에 «중3»", () => {
    const state = withLedger(
      explorerState(8, "g8-simultaneous", []),
      openMission(conceptPlan("g8-simultaneous")),
    );
    const journey = mathExpeditionJourneySchema.parse(
      expeditionJourney(state, now, student),
    );
    expect(titles(journey.upcoming)).toEqual([
      "연립일차방정식",
      ...G8.slice(3),
      ...G9,
    ]);
    expect(journey.upcoming.map((item) => item.gradeStart ?? null)).toEqual([
      null,
      null,
      null,
      null,
      null,
      "중3",
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(journey.upcoming[1]).toMatchObject({
      title: "일차함수",
      subtitle: "중학교 2학년",
    });
    expect(journey.upcoming[5]).toMatchObject({
      title: "제곱근과 실수",
      subtitle: "중학교 3학년",
      gradeStart: "중3",
    });
  });
  it("2일차 기억 복습 날: 서버가 낸 오늘 칸 «기억 복습» 뒤로 예정이 한 칸 밀린다", () => {
    const state = withLedger(
      explorerState(8, "g8-simultaneous", ["g8-simultaneous"], today),
      null,
      ["2026-09-26"],
    );
    const journey = expeditionJourney(state, now, student);
    expect(journey.todayComplete).toBe(false);
    expect(titles(journey.upcoming)).toEqual([
      "기억 복습",
      ...G8.slice(3),
      ...G9.slice(0, 6),
    ]);
    expect(journey.upcoming).toHaveLength(11);
  });
  it("오늘 칸을 마쳤으면 예정은 내일부터 — 오늘 칸을 또 싣지 않는다", () => {
    const done = {
      ...openMission(conceptPlan("g8-simultaneous"), 15),
      status: "complete" as const,
      completedAt: "2026-09-27T02:00:00.000Z",
    };
    const state = withLedger(
      explorerState(8, "g8-simultaneous", ["g8-simultaneous"]),
      done,
      [today],
    );
    const journey = expeditionJourney(state, now, student);
    expect(journey.todayComplete).toBe(true);
    expect(titles(journey.upcoming)).toEqual([
      ...G8.slice(3),
      ...G9.slice(0, 7),
    ]);
  });
  it("같은 규칙 — 미션을 안 열었으면 오늘 칸은 planExpedition 결과, 예정 첫 단원은 오늘 단원을 다 모은 뒤의 planExpedition 결과", () => {
    const cases: Array<[number, string | undefined, string[]]> = [
      [8, "g8-simultaneous", []],
      [8, "g8-simultaneous", ["g8-simultaneous"]],
      [8, "g8-probability", []],
      [8, undefined, ["g8-numbers", "g8-inequality"]],
      [9, "g9-trigonometry", ["g9-trigonometry"]],
      [7, "g7-coordinate", []],
    ];
    for (const [grade, goal, collected] of cases) {
      const state = explorerState(grade, goal, collected);
      const journey = expeditionJourney(state, now, student);
      const plan = planExpedition(state, student, now);
      expect(journey.upcoming[0].title).toBe(plan.title);
      const after = explorerState(grade, goal, [...collected, plan.unitId]);
      expect(journey.upcoming[1].title).toBe(
        planExpedition(after, student, now).title,
      );
    }
  });
  it("더 갈 단원이 없으면 예정이 거기서 끝난다 — 남은 칸은 화면이 «다음 여정»으로", () => {
    const journey = expeditionJourney(
      explorerState(9, "g9-circle", ["g9-circle"]),
      now,
      student,
    );
    expect(titles(journey.upcoming)).toEqual(["통계와 상관관계"]);
  });
  it("가운데 «나의 진행» — 학년 안 몇 번째 단원 · 모은 개념 · 기억 복습 대기", () => {
    const first = expeditionJourney(
      withLedger(
        explorerState(8, "g8-simultaneous", []),
        openMission(conceptPlan("g8-simultaneous")),
      ),
      now,
      student,
    );
    expect(first.position).toEqual({
      caption: "중2 · 7단원 중",
      ordinal: 3,
      title: "연립일차방정식",
      collected: 0,
      total: 35,
      due: 0,
    });
    const memory = expeditionJourney(
      withLedger(
        explorerState(8, "g8-simultaneous", ["g8-simultaneous"], today),
        null,
        ["2026-09-26"],
      ),
      now,
      student,
    );
    expect(memory.position).toEqual({
      caption: "중2 · 7단원 중",
      ordinal: 4,
      title: "일차함수",
      collected: 5,
      total: 35,
      due: 5,
    });
  });
  it("원장님 진도 계획이 있는 초등은 소단원 칸 — 진도 커서 순서, 학년이 바뀌면 «초5»", () => {
    const course = setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "4-2-5-1",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    );
    const state = { ...explorerState(4, undefined, ["g4-data"]), course };
    const plan = planExpedition(state, student, now);
    expect(plan).toMatchObject({
      kind: "elementary",
      title: "꺾은선그래프",
      subtitle: "초등 4학년 · 꺾은선그래프 알아보기",
    });
    const journey = mathExpeditionJourneySchema.parse(
      expeditionJourney(state, now, student),
    );
    expect(titles(journey.upcoming).slice(0, 9)).toEqual([
      "꺾은선그래프 알아보기",
      "꺾은선그래프 내용 알아보기",
      "꺾은선그래프 그리기와 활용하기",
      "다각형",
      "정다각형",
      "대각선",
      "모양 만들기와 채우기",
      "덧셈과 뺄셈 / 곱셈과 나눗셈이 섞여 있는 식",
      "덧셈, 뺄셈, 곱셈(나눗셈)이 섞여 있는 식",
    ]);
    expect(journey.upcoming[0]).toMatchObject({
      subtitle: "초4 · 2학기 · 꺾은선그래프",
    });
    expect(
      journey.upcoming.map((item) => item.gradeStart ?? null).indexOf("초5"),
    ).toBe(7);
    expect(journey.upcoming).toHaveLength(12);
    expect(journey.position).toEqual({
      caption: "소단원 3개 중",
      ordinal: 1,
      title: "꺾은선그래프",
      note: "꺾은선그래프 알아보기",
      collected: 5,
      total: 30,
      due: 0,
    });
  });
  it("초등 은행 날의 완료 칸도 소단원 이름 — 저장된 칸 기록(대단원 제목)은 그대로 두고 보일 때만", () => {
    const base = withLedger(explorerState(4, undefined, ["g4-data"]), null, [
      "2026-09-25",
      "2026-09-26",
    ]);
    const awards = base.expedition!.awards.map((award, index) => ({
      ...award,
      references:
        index === 0
          ? [{ id: "s1", unitIds: ["4-2-5-1", "4-2-5-1"], problemIds: [] }]
          : [
              { id: "s2", unitIds: ["4-2-5-2"], problemIds: [] },
              { id: "s3", unitIds: ["4-2-5-3"], problemIds: [] },
            ],
      day: {
        ...award.day,
        kind: "elementary" as const,
        title: "꺾은선그래프",
        subtitle: "초등 4학년 · 꺾은선그래프 알아보기",
        reviews: [
          {
            ...award.day.reviews[0],
            kind: "elementary" as const,
            title: "꺾은선그래프",
            subtitle: "초등 4학년",
          },
        ],
      },
    }));
    const state = { ...base, expedition: { ...base.expedition!, awards } };
    const journey = expeditionJourney(state, now, student);
    expect(journey.days.map((day) => [day.title, day.subtitle])).toEqual([
      ["꺾은선그래프 알아보기", "초4 · 2학기 · 꺾은선그래프"],
      ["꺾은선그래프 내용 알아보기 외 1개 단원", "초4 · 2학기 · 꺾은선그래프"],
    ]);
    expect(journey.days[0].reviews[0].title).toBe("꺾은선그래프 알아보기");
    expect(state.expedition.awards[0].day.title).toBe("꺾은선그래프");
  });
  it("모든 화면 일치 — 초등 문제은행 끝 화면(full 판)의 예정도 같은 소단원 목록 · 같은 이름 · 같은 학년 표지", () => {
    const course = setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "4-2-5-1",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    );
    const state = { ...explorerState(4, undefined, ["g4-data"]), course };
    const board = dailyJourneyDto(state, "elementary", now);
    const map = expeditionJourney(state, now, student);
    expect(board.upcoming).toEqual(map.upcoming);
  });
});
