import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type {
  StoredFading,
  StoredFadingConcept,
} from "@/contracts/fading.contract";
import { fadingTeacherSummarySchema } from "@/contracts/fadingTeacher.contract";
import { buildFadingConcepts } from "@/lib/fading/concepts";
import { fadingDateOf, fadingDayOfDate } from "@/lib/fading/schedule";
import { emptyFading, fadingSummary } from "@/lib/fading/state";
import {
  FADING_IDLE_FLAG_DAYS,
  FADING_NOT_STARTED_GRACE_DAYS,
  FADING_OVERDUE_FLAG_CONCEPTS,
  FADING_OVERDUE_FLAG_DAYS,
  FADING_OVERDUE_LONG_FLAG_DAYS,
  FADING_TEACHER_POLICY,
  fadingTeacherConcepts,
  fadingTeacherSummary,
  type FadingTeacherAccount,
} from "@/lib/fading/teacher";
import { FADING_LONG_BREAK_DAYS } from "@/lib/fading/numbers";

const TODAY = "2026-10-06";
const ago = (days: number) => fadingDateOf(fadingDayOfDate(TODAY) - days);
const ACCOUNT: FadingTeacherAccount = {
  hasAccount: true,
  createdOn: "2026-08-01",
};

/** 평가한 개념 — `dueAgo` 일 전에 복습일이었다(음수면 아직 안 왔다). */
function rated(
  dueAgo: number,
  extra: Partial<StoredFadingConcept> = {},
): StoredFadingConcept {
  return {
    step: 4,
    stability: 3.173,
    difficulty: 5.28,
    reviewedOn: ago(dueAgo + 3),
    dueOn: ago(dueAgo),
    digest: "0a0b0c0d",
    reviews: 1,
    lapses: 0,
    addedOn: ago(dueAgo + 3),
    ...extra,
  };
}
const picked = (step: 1 | 2 | 3 | 4 = 1): StoredFadingConcept => ({
  step,
  stability: null,
  difficulty: null,
  reviewedOn: null,
  dueOn: null,
  digest: null,
  reviews: 0,
  lapses: 0,
  addedOn: ago(1),
});
/** 개념들과 마지막으로 평가를 닫은 날로 저장 칸을 짓는다. */
function record(
  concepts: Record<string, StoredFadingConcept>,
  lastAgo: number | null,
  days: StoredFading["days"] = [],
): StoredFading {
  const lastOn = lastAgo === null ? null : ago(lastAgo);
  return {
    ...emptyFading(),
    concepts,
    days:
      days.length || lastOn === null
        ? days
        : [{ date: lastOn, reviews: 1, passed: 1, fresh: 1 }],
    streak: {
      current: lastOn ? 2 : 0,
      best: lastOn ? 5 : 0,
      lastOn: days.at(-1)?.date ?? lastOn,
    },
  };
}
const summary = (
  fading: StoredFading | undefined,
  account = ACCOUNT,
  known?: ReadonlySet<string>,
) =>
  fadingTeacherSummarySchema.parse(
    fadingTeacherSummary(fading, TODAY, account, known),
  );

describe("학생 화면과 같은 셈", () => {
  it("«밀린 개념»의 수는 학생 홈의 «밀린 복습»과 같다 — 복습일이 지난 것만", () => {
    const state = record(
      { a: rated(5), b: rated(1), c: rated(0), d: rated(-2), e: picked() },
      1,
    );
    expect(summary(state).overdue).toBe(2);
    expect(fadingSummary(state, TODAY).overdue).toBe(summary(state).overdue);
  });
});

describe("교사가 보는 숫자 — 세는 값뿐이다", () => {
  it("기록이 없는 학생은 전부 0 이다", () => {
    expect(summary(undefined, { hasAccount: true, createdOn: TODAY })).toEqual({
      picked: 0,
      learned: 0,
      stepCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
      due: 0,
      overdue: 0,
      longestOverdueDays: 0,
      reviewedToday: 0,
      freshToday: 0,
      lastOn: null,
      idleDays: null,
      streak: { current: 0, best: 0 },
      lapses: 0,
      relearn: { waiting: 0, failing: 0, fails: 0, checks: 0, sinceOn: null },
      recent: { days: 0, fresh: 0 },
      flags: [],
    });
  });

  it("고른 개념 · 배운 개념 · 단계별 수 · «다시»의 합을 센다", () => {
    const result = summary(
      record(
        {
          a: rated(-2),
          b: rated(-1, { step: 3, reviews: 4, lapses: 2 }),
          c: rated(-1, { step: 2, reviews: 2, lapses: 1 }),
          d: picked(),
          e: picked(3),
        },
        0,
      ),
    );
    expect(result).toMatchObject({
      picked: 5,
      learned: 3,
      stepCounts: { 1: 1, 2: 1, 3: 2, 4: 1 },
      lapses: 3,
      due: 0,
      overdue: 0,
      longestOverdueDays: 0,
    });
  });

  it("복습일이 된 것과 지난 것을 가른다 — 오늘이 복습일이면 밀린 것이 아니다", () => {
    const result = summary(
      record({ a: rated(0), b: rated(2), c: rated(5), d: rated(-1) }, 0),
    );
    expect(result).toMatchObject({
      due: 3,
      overdue: 2,
      longestOverdueDays: 5,
    });
  });

  it("오늘 한 것 · 마지막으로 한 날 · 연속을 낸다", () => {
    const today = summary(
      record({ a: rated(-3) }, 0, [
        { date: ago(1), reviews: 2, passed: 2, fresh: 1 },
        { date: TODAY, reviews: 3, passed: 2, fresh: 1 },
      ]),
    );
    expect(today).toMatchObject({
      reviewedToday: 3,
      freshToday: 1,
      lastOn: TODAY,
      idleDays: 0,
      streak: { current: 2, best: 5 },
    });
    const earlier = summary(record({ a: rated(1) }, 4));
    expect(earlier).toMatchObject({
      reviewedToday: 0,
      freshToday: 0,
      lastOn: ago(4),
      idleDays: 4,
      streak: { current: 0, best: 5 },
    });
  });

  it("은행에 없는 열쇠의 기록은 세지 않는다", () => {
    const result = summary(
      record({ a: rated(9), gone: rated(9), lost: picked() }, 0),
      ACCOUNT,
      new Set(["a"]),
    );
    expect(result).toMatchObject({ picked: 1, learned: 1, overdue: 1 });
  });
});

describe("학생이 고른 개념의 상태", () => {
  it("묶음 표의 차례로 낸다 — 고르지 않은 개념과 은행에 없는 열쇠는 내지 않는다", () => {
    const entries: ConceptEntry[] = ["a1", "b1", "c1"].map((id) => ({
      id,
      section: "중2::4. 삼각형의 성질::삼각형의 외심",
      term: `용어 ${id}`,
      kind: "정의",
      level: "하",
      definition: "세 점에서 같은 거리에 있는 점을 {중심}이라 한다.",
    }));
    const concepts = new Map(
      buildFadingConcepts(entries, {
        a1: ["a1"],
        b1: ["b1"],
        c1: ["c1"],
      }).map((c) => [c.id, c]),
    );
    const fading = record({ c1: rated(2), a1: picked(), gone: rated(9) }, 1);
    expect(
      fadingTeacherConcepts(fading, concepts, TODAY).map((s) => [
        s.id,
        s.terms,
        s.rated,
        s.daysUntil,
      ]),
    ).toEqual([
      ["a1", ["용어 a1"], false, null],
      ["c1", ["용어 c1"], true, -2],
    ]);
    expect(fadingTeacherConcepts(undefined, concepts, TODAY)).toEqual([]);
  });
});

describe("살펴볼 까닭 — 문턱은 정책 판의 값이다", () => {
  it("문턱의 값 — 탐험 교사 보기의 합의값(27번 문서 §4.2 v1.1)을 그대로 가져왔다", () => {
    expect([
      FADING_TEACHER_POLICY,
      FADING_OVERDUE_FLAG_DAYS,
      FADING_OVERDUE_FLAG_CONCEPTS,
      FADING_OVERDUE_LONG_FLAG_DAYS,
      FADING_IDLE_FLAG_DAYS,
      FADING_NOT_STARTED_GRACE_DAYS,
    ]).toEqual([1, 3, 3, 7, 7, 3]);
  });

  it("계정이 없으면 그것 하나만 말한다", () => {
    const none = { hasAccount: false, createdOn: null };
    expect(summary(undefined, none).flags).toEqual(["no-account"]);
    expect(
      summary(record({ a: rated(9), b: rated(9), c: rated(9) }, 12), none)
        .flags,
    ).toEqual(["no-account"]);
  });

  it("시작 전 — 계정을 만든 지 사흘이 지나도록 한 번도 평가를 닫지 않았다", () => {
    const made = (days: number) => ({ hasAccount: true, createdOn: ago(days) });
    expect(summary(undefined, made(2)).flags).toEqual([]);
    expect(summary(undefined, made(3)).flags).toEqual(["not-started"]);
    expect(
      summary(undefined, { hasAccount: true, createdOn: null }).flags,
    ).toEqual(["not-started"]);
    // 골라만 두고 평가를 닫은 적이 없어도 시작 전이다.
    expect(summary(record({ a: picked(3) }, null), made(10)).flags).toEqual([
      "not-started",
    ]);
    // 한 번이라도 닫았으면 아니다.
    expect(summary(record({ a: rated(-1) }, 1), made(10)).flags).toEqual([]);
  });

  it("복습이 밀림 — 사흘 넘게 밀린 개념이 셋이거나, 이레 넘게 밀린 개념이 하나라도 있다", () => {
    const flags = (dues: number[]) =>
      summary(
        record(Object.fromEntries(dues.map((d, i) => [`k${i}`, rated(d)])), 1),
      ).flags;
    expect(flags([3, 3])).toEqual([]);
    expect(flags([3, 3, 2])).toEqual([]);
    expect(flags([3, 3, 3])).toEqual(["overdue"]);
    expect(flags([6])).toEqual([]);
    expect(flags([7])).toEqual(["overdue"]);
  });

  it("오래 쉼 — 마지막으로 평가를 닫은 날부터 이레가 지났다", () => {
    // 학생 홈의 «오래 쉬고 돌아옴»과 같은 문턱이다 — 한 값을 두 화면이 쓴다.
    expect(FADING_IDLE_FLAG_DAYS).toBe(FADING_LONG_BREAK_DAYS);
    expect(summary(record({ a: rated(-1) }, 6)).flags).toEqual([]);
    expect(summary(record({ a: rated(-1) }, 7)).flags).toEqual(["idle"]);
  });

  it("까닭이 겹치면 정한 차례로 다 말한다", () => {
    expect(
      summary(record({ a: rated(9), b: rated(8), c: rated(7) }, 12)).flags,
    ).toEqual(["overdue", "idle"]);
  });
});

describe("추가 확인(단기 재학습)과 최근 7일 — 사실만 싣는다(판정이 아니다 · 2026-10-16)", () => {
  /** 한국 날짜 `date` 의 낮 12시(UTC 3시). */
  const noon = (date: string) => Date.parse(`${date}T03:00:00Z`);
  const row = (
    conceptId: string,
    propositionId: string,
    extra: Partial<NonNullable<StoredFading["relearn"]>["items"][number]> = {},
  ): NonNullable<StoredFading["relearn"]>["items"][number] => ({
    conceptId,
    propositionId,
    digest: "0a0b0c0d",
    stage: "retry",
    dueAt: noon(TODAY),
    origin: "missed",
    since: noon(TODAY),
    fails: 1,
    checks: 0,
    ...extra,
  });

  it("대기열에 남은 줄 · 틀린 적이 있는 줄 · 틀림의 합 · 판정 난 확인의 합 · 가장 오래 남은 줄이 든 날 — 은행에 없는 개념의 줄은 세지 않는다", () => {
    const state: StoredFading = {
      ...record({ a: rated(1), b: rated(2) }, 0),
      relearn: {
        version: 1,
        items: [
          row("a", "a1", { fails: 2, checks: 3, since: noon(ago(2)) }),
          row("a", "a2", {
            origin: "exposed",
            stage: "confirm",
            fails: 0,
            checks: 0,
          }),
          row("b", "b1", { fails: 1, checks: 1, since: noon(ago(1)) }),
          row("gone", "g1", { fails: 5, checks: 5, since: noon(ago(9)) }),
        ],
        seen: [],
        graded: [],
        day: null,
      },
    };
    const known = new Set(["a", "b"]);
    const got = summary(state, ACCOUNT, known);
    expect(got.relearn).toEqual({
      waiting: 3,
      failing: 2,
      fails: 3,
      checks: 4,
      sinceOn: ago(2),
    });
    // 판정이 아니다 — 까닭(flags)은 대기열과 상관없다.
    expect(got.flags).toEqual(
      summary({ ...state, relearn: undefined }, ACCOUNT, known).flags,
    );
  });

  it("최근 7일(오늘 포함) — 평가를 닫은 날 수와 첫 평가 수. 여드레 전은 넣지 않는다", () => {
    const days = [7, 6, 5, 4, 3, 2, 1, 0].map((n) => ({
      date: ago(n),
      reviews: 2,
      passed: 1,
      fresh: n === 7 ? 3 : 0,
    }));
    expect(summary(record({ a: rated(1) }, null, days)).recent).toEqual({
      days: 7,
      fresh: 0,
    });
    expect(
      summary(record({ a: rated(1) }, null, days.slice(0, 3))).recent,
    ).toEqual({ days: 2, fresh: 0 });
  });
});
