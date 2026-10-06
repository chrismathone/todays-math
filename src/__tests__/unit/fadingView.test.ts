import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type {
  FadingPlacement,
  StoredFading,
} from "@/contracts/fading.contract";
import {
  FADING_VIEW_DAYS,
  fadingCatalogSchema,
  fadingStateSchema,
} from "@/contracts/fadingApi.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { FADING_DAILY_CAP } from "@/lib/fading/numbers";
import {
  completeFadingReading,
  completeFadingStep,
  emptyFading,
  openFadingSession,
  pickFadingConcept,
  rateFadingSession,
} from "@/lib/fading/state";
import {
  fadingCatalogView,
  fadingConceptStatus,
  fadingDefaultGrade,
  fadingGrades,
  fadingStateView,
} from "@/lib/fading/view";

const SECTION_A = "중2::4. 삼각형의 성질::삼각형의 외심";
const SECTION_B = "중2::4. 삼각형의 성질::삼각형의 내심";
const SECTION_C = "초5::1-2 약수와 배수::1-2-3 공약수와 최대공약수";

function entries(prefix: string, section: string, level: "하" | "중" = "하") {
  return [
    `외심은 세 변의 {수직이등분선}이 만나는 점이고, 거리는 {$R$}이다.`,
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ].map((definition, i): ConceptEntry => ({
    id: `${prefix}${i + 1}`,
    section,
    term: `${prefix} 용어 ${i + 1}`,
    kind: "정의",
    level,
    definition,
  }));
}
const ALL = [
  ...entries("a", SECTION_A),
  ...entries("am", SECTION_A, "중"),
  ...entries("b", SECTION_B),
  ...entries("c", SECTION_C),
];
const CONCEPTS = buildFadingConcepts(ALL, proposeFadingGroups(ALL));
const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));
const [A, AM, B, C] = CONCEPTS as [
  FadingConcept,
  FadingConcept,
  FadingConcept,
  FadingConcept,
];
const DAY1 = "2026-10-06";
const SEED = 3;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

function placements(c: FadingConcept, step: FadingStep): FadingPlacement[] {
  const tray = chipTray(c, step, { seed: SEED });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}
function atRating(state: StoredFading, c: FadingConcept, n: number) {
  state = openFadingSession(state, c, DAY1, { sessionId: uuid(n), seed: SEED });
  state = completeFadingReading(state, c.id, uuid(n));
  for (const step of [2, 3, 4] as const)
    state = completeFadingStep(state, c, uuid(n), step, placements(c, step));
  return state;
}
const rated = (state: StoredFading, c: FadingConcept, n: number) =>
  rateFadingSession(
    atRating(state, c, n),
    c,
    uuid(n),
    "good",
    DAY1,
    uuid(900 + n),
  );
const view = (fading: StoredFading, today = DAY1, requestId?: string) =>
  fadingStateSchema.parse(
    fadingStateView({ fading, revision: 7, today, concepts: BY_ID, requestId }),
  );

describe("개념 하나의 상태", () => {
  it("평가 전인 개념은 다음 복습 · 망각 위험이 없다", () => {
    const stored = pickFadingConcept(emptyFading(), A.id, DAY1).concepts[A.id]!;
    expect(fadingConceptStatus(A, stored, DAY1)).toEqual({
      id: A.id,
      section: SECTION_A,
      level: "하",
      ordinal: 1,
      siblings: 1,
      terms: ["a 용어 1", "a 용어 2", "a 용어 3"],
      targets: 5,
      step: 1,
      rated: false,
      reviews: 0,
      lapses: 0,
      addedOn: DAY1,
      reviewedOn: null,
      dueOn: null,
      daysUntil: null,
      risk: null,
      changed: false,
    });
  });

  it("평가한 개념은 다음 복습까지의 날 수와 망각 위험(추정)이 나온다 — 밀리면 음수", () => {
    const stored = rated(emptyFading(), A, 1).concepts[A.id]!;
    expect(fadingConceptStatus(A, stored, DAY1)).toMatchObject({
      step: 4,
      rated: true,
      reviews: 1,
      reviewedOn: DAY1,
      dueOn: "2026-10-09",
      daysUntil: 3,
      risk: 0,
      changed: false,
    });
    const late = fadingConceptStatus(A, stored, "2026-10-12");
    expect(late.daysUntil).toBe(-3);
    expect(late.risk).toBeGreaterThan(0);
    expect(late.risk).toBeLessThan(1);
  });

  it("은행의 문장이 평가 뒤에 바뀌었으면 알린다", () => {
    const stored = rated(emptyFading(), A, 1).concepts[A.id]!;
    const edited: FadingConcept = {
      ...A,
      propositions: A.propositions.slice(0, 2),
    };
    expect(fadingConceptStatus(edited, stored, DAY1).changed).toBe(true);
  });
});

describe("상태 — 홈 · 통계 · 풀이가 읽는 한 꼴", () => {
  it("빈 기록은 비어 있고 계약을 지난다", () => {
    expect(view(emptyFading())).toEqual({
      today: DAY1,
      revision: 7,
      cap: FADING_DAILY_CAP,
      summary: {
        mode: "split",
        streak: { current: 0, best: 0 },
        learned: 0,
        stepCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
        queue: { due: [], held: [], unrated: [] },
        plan: { done: 0, total: 0 },
        todayCount: { reviews: 0, passed: 0, fresh: 0 },
        lastOn: null,
        idleDays: null,
        longBreak: false,
        overdue: 0,
        nextReview: null,
        sections: [],
      },
      concepts: {},
      session: null,
      opened: null,
      days: [],
      receipt: null,
    });
  });

  it("열린 풀이의 개념에는 그 개념의 함정이 같이 내려간다 — 글뿐이다", () => {
    const state = openFadingSession(emptyFading(), A, DAY1, {
      sessionId: "00000001-0000-4000-8000-000000000000",
      seed: 3,
    });
    const plain = fadingStateView({
      fading: state,
      revision: 1,
      today: DAY1,
      concepts: BY_ID,
    });
    expect(plain.opened!.traps).toEqual([]);
    expect(plain.opened!.figure).toBeNull();
    const asked: string[] = [];
    const trapped = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: DAY1,
        concepts: BY_ID,
        trapsOf: (concept) => {
          asked.push(concept.id);
          return [{ text: "내심", why: "까닭은 채점 전에 싣지 않는다" }];
        },
      }),
    );
    expect(trapped.opened!.traps).toEqual([{ text: "내심" }]);
    expect(asked).toEqual([A.id]);
  });

  it("열린 풀이의 개념에는 그 개념의 그림이 같이 내려간다 — 없으면 없다고 싣는다", () => {
    const state = openFadingSession(emptyFading(), A, DAY1, {
      sessionId: "00000001-0000-4000-8000-000000000000",
      seed: 3,
    });
    const figure = {
      id: "f1",
      viewBox: "0 0 200 120",
      svg: '<circle cx="100" cy="60" r="40" fill="none" stroke="#1F1F23"/>',
      tags: [{ x: 10, y: 20, w: 40, answer: "외심" }],
    };
    const asked: string[] = [];
    const shown = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: DAY1,
        concepts: BY_ID,
        figureOf: (concept) => {
          asked.push(concept.id);
          return figure;
        },
      }),
    );
    expect(shown.opened!.figure).toEqual(figure);
    expect(asked).toEqual([A.id]);
    const none = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: DAY1,
        concepts: BY_ID,
        figureOf: () => null,
      }),
    );
    expect(none.opened!.figure).toBeNull();
  });

  it("쉰 날 — 마지막으로 평가를 닫은 날 · 그날부터의 날 수 · 오래 쉬었는가가 요약에 실린다", () => {
    const state = rated(emptyFading(), A, 1);
    expect(view(state).summary).toMatchObject({
      lastOn: DAY1,
      idleDays: 0,
      longBreak: false,
    });
    expect(view(state, "2026-10-13").summary).toMatchObject({
      lastOn: DAY1,
      idleDays: 7,
      longBreak: true,
    });
  });

  it("다음 복습 — 오늘보다 뒤의 가장 가까운 복습일과 그날의 개념 수", () => {
    let state = rated(emptyFading(), A, 1);
    state = rated(state, AM, 2);
    const dueA = state.concepts[A.id]!.dueOn!;
    const dueAM = state.concepts[AM.id]!.dueOn!;
    const first = dueA < dueAM ? dueA : dueAM;
    const count = [dueA, dueAM].filter((d) => d === first).length;
    const next = view(state).summary.nextReview!;
    expect(next).toEqual({
      dueOn: first,
      daysUntil: Math.round(
        (Date.parse(`${first}T00:00:00Z`) - Date.parse(`${DAY1}T00:00:00Z`)) /
          86_400_000,
      ),
      count,
    });
    expect(next.daysUntil).toBeGreaterThan(0);
    // 오늘이 복습일인 것 · 밀린 것은 «다음»이 아니다.
    const last = dueA < dueAM ? dueAM : dueA;
    const onLast = view(state, last).summary.nextReview;
    expect(onLast).toBeNull();
    // 평가 전인 개념만 있으면 없다.
    expect(
      view(pickFadingConcept(emptyFading(), B.id, DAY1)).summary.nextReview,
    ).toBeNull();
  });

  it("단원별 집계 — 고른 개념이 있는 소단원만, 은행 차례로 · 고른 수 · 배운 수 · 단계별 수", () => {
    let state = rated(emptyFading(), A, 1);
    state = pickFadingConcept(state, AM.id, DAY1);
    state = pickFadingConcept(state, C.id, DAY1);
    expect(view(state).summary.sections).toEqual([
      {
        key: SECTION_A,
        picked: 2,
        learned: 1,
        stepCounts: { 1: 1, 2: 0, 3: 0, 4: 1 },
      },
      {
        key: SECTION_C,
        picked: 1,
        learned: 0,
        stepCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
      },
    ]);
    // 은행에 없는 열쇠의 기록은 세지 않는다.
    const stray = pickFadingConcept(state, "zz-gone", DAY1);
    expect(view(stray).summary.sections).toEqual(view(state).summary.sections);
  });

  it("밀린 복습의 수가 요약에 실린다 — 하루 상한으로 미룬 것도 지났으면 센다", () => {
    let state = rated(emptyFading(), A, 1);
    state = rated(state, AM, 2);
    expect(view(state).summary.overdue).toBe(0);
    const late = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: "2026-12-01",
        concepts: BY_ID,
        cap: 1,
      }),
    );
    expect(late.summary.queue.due).toHaveLength(1);
    expect(late.summary.queue.held).toHaveLength(1);
    expect(late.summary.overdue).toBe(2);
  });

  it("오늘 낼 것 · 평가 전인 것 · 열린 풀이의 개념만 상태가 내려간다 — 미룬 것은 열쇠만", () => {
    let state = rated(emptyFading(), A, 1);
    state = rated(state, AM, 2);
    state = pickFadingConcept(state, B.id, DAY1);
    const due = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: "2026-10-09",
        concepts: BY_ID,
        cap: 1,
      }),
    );
    expect(due.cap).toBe(1);
    expect(due.summary.queue).toEqual({
      due: [A.id],
      held: [AM.id],
      unrated: [B.id],
    });
    expect(Object.keys(due.concepts).sort()).toEqual([A.id, B.id].sort());
    // 오늘은 복습일이 아니다 — 대기열에 없는 평가한 개념은 내려가지 않는다.
    expect(Object.keys(view(state).concepts)).toEqual([B.id]);
  });

  it("미룬 개념이라도 풀이를 열었으면 그 상태가 내려간다", () => {
    let state = rated(emptyFading(), A, 1);
    state = rated(state, AM, 2);
    state = openFadingSession(state, AM, "2026-10-09", {
      sessionId: uuid(3),
      seed: SEED,
    });
    const held = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: "2026-10-09",
        concepts: BY_ID,
        cap: 1,
      }),
    );
    expect(held.summary.queue).toMatchObject({ due: [A.id], held: [AM.id] });
    expect(held.session!.conceptId).toBe(AM.id);
    expect(Object.keys(held.concepts).sort()).toEqual([A.id, AM.id].sort());
  });

  it("풀이가 열려 있으면 그 개념의 내용과 지금 풀 단계가 같이 내려간다", () => {
    let state = openFadingSession(emptyFading(), A, DAY1, {
      sessionId: uuid(1),
      seed: SEED,
    });
    state = completeFadingReading(state, A.id, uuid(1));
    const open = view(state);
    expect(open.session).toEqual({
      id: uuid(1),
      conceptId: A.id,
      startStep: 1,
      step: 2,
      seed: SEED,
      phase: "steps",
      missedAtFour: [],
      ratings: [],
    });
    expect(open.opened).toEqual({ concept: A, traps: [], figure: null });
    expect(open.concepts[A.id]!.step).toBe(2);
  });

  it("평가 차례에는 고를 수 있는 평가와 그 간격이 내려간다 — 4단계에서 틀렸으면 «다시» 하나다", () => {
    const clean = view(atRating(emptyFading(), A, 1)).session!;
    expect(clean.phase).toBe("rating");
    expect(clean.ratings).toEqual([
      { rating: "again", intervalDays: 1 },
      { rating: "hard", intervalDays: 2 },
      { rating: "good", intervalDays: 3 },
      { rating: "easy", intervalDays: 16 },
    ]);
    const state = atRating(emptyFading(), A, 1);
    const missed = view({
      ...state,
      session: { ...state.session!, missedAtFour: ["a1#1"] },
    }).session!;
    expect(missed.ratings).toEqual([{ rating: "again", intervalDays: 1 }]);
  });

  it("평가 요청의 번호를 주면 그 영수증이 실린다 — 없는 번호면 비어 있다", () => {
    const state = rated(emptyFading(), A, 1);
    expect(view(state, DAY1, uuid(901)).receipt).toEqual({
      requestId: uuid(901),
      conceptId: A.id,
      rating: "good",
      dueOn: "2026-10-09",
    });
    expect(view(state, DAY1, uuid(5)).receipt).toBeNull();
    expect(view(state).receipt).toBeNull();
  });

  it("집계는 최근 여덟 주만 내려간다", () => {
    const state = rated(emptyFading(), A, 1);
    const many: StoredFading = {
      ...state,
      days: Array.from({ length: 80 }, (_, i) => ({
        date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10),
        reviews: 1,
        passed: 1,
        fresh: 0,
      })),
    };
    const days = fadingStateView({
      fading: many,
      revision: 1,
      today: DAY1,
      concepts: BY_ID,
    }).days;
    expect(days.length).toBe(FADING_VIEW_DAYS);
    expect(days.at(-1)).toEqual(many.days.at(-1));
  });

  it("은행에 없는 열쇠의 기록은 숫자에도 상태에도 안 나온다 — 그 개념의 풀이도 내려가지 않는다", () => {
    let state = rated(emptyFading(), A, 1);
    state = openFadingSession(state, B, DAY1, { sessionId: uuid(2), seed: 1 });
    const without = new Map([[A.id, A]]);
    const lost = fadingStateSchema.parse(
      fadingStateView({
        fading: state,
        revision: 1,
        today: "2026-10-09",
        concepts: without,
      }),
    );
    expect(lost.summary.queue).toEqual({
      due: [A.id],
      held: [],
      unrated: [],
    });
    expect(lost.summary.stepCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1 });
    expect(lost.session).toBeNull();
    expect(lost.opened).toBeNull();
  });
});

describe("개념 목록 — 학년 하나", () => {
  it("그 학년의 소단원을 은행 차례로, 개념마다 이름 · 크기 · 내 상태를 낸다", () => {
    const state = pickFadingConcept(rated(emptyFading(), A, 1), B.id, DAY1);
    const catalog = fadingCatalogSchema.parse(
      fadingCatalogView({
        grade: "중2",
        concepts: CONCEPTS,
        fading: state,
        today: DAY1,
      }),
    );
    expect(catalog.grade).toBe("중2");
    expect(catalog.grades).toEqual(["중2", "초5"]);
    expect(catalog.sections.map((s) => [s.key, s.chapter, s.unit])).toEqual([
      [SECTION_A, "4. 삼각형의 성질", "삼각형의 외심"],
      [SECTION_B, "4. 삼각형의 성질", "삼각형의 내심"],
    ]);
    expect(catalog.sections[0]!.concepts).toEqual([
      {
        id: A.id,
        level: "하",
        ordinal: 1,
        siblings: 1,
        terms: ["a 용어 1", "a 용어 2", "a 용어 3"],
        propositions: 3,
        targets: 5,
        status: {
          step: 4,
          rated: true,
          dueOn: "2026-10-09",
          daysUntil: 3,
          risk: fadingConceptStatus(A, state.concepts[A.id]!, DAY1).risk,
        },
      },
      {
        id: AM.id,
        level: "중",
        ordinal: 1,
        siblings: 1,
        terms: ["am 용어 1", "am 용어 2", "am 용어 3"],
        propositions: 3,
        targets: 5,
        status: null,
      },
    ]);
    expect(catalog.sections[1]!.concepts[0]!.status).toEqual({
      step: 1,
      rated: false,
      dueOn: null,
      daysUntil: null,
      risk: null,
    });
    // 목록의 망각 위험은 개념 하나의 상태가 내는 값과 같다 — 날이 지나면 커진다.
    const later = fadingCatalogView({
      grade: "중2",
      concepts: CONCEPTS,
      fading: state,
      today: "2026-10-20",
    }).sections[0]!.concepts[0]!.status!;
    expect(later.risk).toBe(
      fadingConceptStatus(A, state.concepts[A.id]!, "2026-10-20").risk,
    );
    expect(later.risk!).toBeGreaterThan(
      catalog.sections[0]!.concepts[0]!.status!.risk!,
    );
  });

  it("은행에 있는 학년은 처음 나온 차례다", () => {
    expect(fadingGrades(CONCEPTS)).toEqual(["중2", "초5"]);
    expect(fadingGrades([C, A])).toEqual(["초5", "중2"]);
  });

  it("처음 보여 줄 학년 — 저장된 탐험 학년, 없으면 반 학년, 그것도 없으면 은행의 첫 학년", () => {
    const grades = ["초3", "초5", "중2"];
    expect(fadingDefaultGrade(grades, { explorerGrade: 8 })).toBe("중2");
    expect(fadingDefaultGrade(grades, { explorerGrade: 5 })).toBe("초5");
    expect(
      fadingDefaultGrade(grades, { explorerGrade: 4, classGrade: "초5" }),
    ).toBe("초5");
    expect(fadingDefaultGrade(grades, { classGrade: "중2" })).toBe("중2");
    expect(fadingDefaultGrade(grades, { classGrade: "고1" })).toBe("초3");
    expect(fadingDefaultGrade(grades, {})).toBe("초3");
    expect(fadingDefaultGrade(grades, { explorerGrade: null })).toBe("초3");
  });
});
