// @vitest-environment node
/**
 * 개념 카드(탐험) 기록의 교사용 투영 — 27번 문서 §4 공백 1 · 2, 사유 문턱 v1.1(정책 판 2).
 *
 * 기록은 손으로 짓지 않고 **제품 엔진**(`applyExplorerAction`)을 돌려 만든다 — 엔진이 실제로 남기는 꼴에서
 * 사유가 서는지 본다(20번 교훈 2026-09-27 «장면과 표본은 제품 함수로 세운다»). 장수 문턱처럼 엔진으로는
 * 딱 그 수를 못 만드는 자리만, 엔진이 만든 기록의 **만기 한 칸**을 옮겨 쓴다(`withDue`).
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  ExplorerAction,
  StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import {
  explorerTeacherDetailSchema,
  explorerTeacherSummarySchema,
} from "@/contracts/mathExplorersTeacher.contract";
import { kstDateOf } from "@/lib/kstDate";
import {
  definitionCard,
  definitionCards,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  CARRIED_OVER_FLAG_DAYS,
  expeditionTileDates,
  explorerTeacherDetail,
  explorerTeacherSummary,
  IDLE_FLAG_DAYS,
  NOT_STARTED_GRACE_DAYS,
  OVERDUE_FLAG_CARDS,
  OVERDUE_FLAG_DAYS,
  OVERDUE_LONG_FLAG_DAYS,
  RECENT_SESSION_LIMIT,
  REVIEW_STUCK_FLAG_CARDS,
  TEACHER_FLAG_POLICY,
  UNRESOLVED_FLAG_MIN,
  UNRESOLVED_RECENT_DAYS,
  type ExplorerTeacherAccount,
  type ExplorerTeacherRecord,
} from "@/lib/math-explorers/teacherSummary";

const D0 = "2026-10-01";
const day = (offset: number, from = D0) => {
  const d = new Date(`${from}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const FACTORS = definitionCards.filter((c) => c.unit === "factors");

/** 엔진으로 학생 한 명을 돌린다 — «factors»(중1 소인수분해 · 조각 활동 없음)가 기본 단원. */
function learner(grade = 7) {
  let state = createExplorerState("student-a", grade);
  let date = D0;
  const session = () => state.profile.definitions!.session!;
  const act = (action: ExplorerAction) => {
    state = applyExplorerAction(state, action, date, randomUUID()).state;
  };
  const answer = (wrong = false) => {
    let current = session();
    if (definitionNeedsRead(state.profile, current)) {
      act({ type: "read", questionId: definitionQuestionId(current) });
      current = session();
    }
    const task = current.queue[current.index]!;
    const card = definitionCard(task.cardId);
    const sourceIds =
      task.kind === 0
        ? wrong
          ? [1, 0]
          : [0, 1]
        : task.kind === 1
          ? wrong
            ? []
            : card.examples.flatMap((example, index) =>
                example.yes ? [index] : [],
              )
          : [wrong ? (card.truth ? 0 : 1) : card.truth ? 1 : 0];
    const options = definitionOptions(current, task);
    act({
      type: "answer",
      questionId: definitionQuestionId(current),
      choiceIds: sourceIds.map((id) => options.indexOf(id)),
    });
  };
  type Session = ReturnType<typeof session>;
  const finish = (wrong: (current: Session) => boolean = () => false) => {
    let safety = 0;
    while (!session().done) {
      if (++safety > 80) throw new Error("끝나지 않는 세션");
      answer(wrong(session()));
    }
  };
  const api = {
    act,
    answer,
    finish,
    session,
    on(next: string) {
      date = next;
      return api;
    },
    start: (unitId = "factors") =>
      act({ type: "start", route: "unit", unitId }),
    get state() {
      return state;
    },
    record(extra: Omit<ExplorerTeacherRecord, "explorers"> = {}) {
      return { explorers: state, ...extra };
    },
  };
  return api;
}

/** 그 카드를 틀린다 — `firstRoundOnly` 면 첫 바퀴에서만(재도전으로 푼다), 아니면 세 바퀴 내내(미해결로 남는다). */
const wrongOn =
  (cardIds: string | string[], firstRoundOnly = false) =>
  (s: { queue: { cardId: string }[]; index: number; round: number }) =>
    [cardIds].flat().includes(s.queue[s.index]?.cardId ?? "") &&
    (!firstRoundOnly || s.round === 0);

/** 엔진이 만든 기록에서 카드 만기만 옮긴다 — 장수 문턱을 딱 그 수로 세우려고. */
function withDue(state: StoredExplorer, dues: Record<string, string>) {
  const copy = structuredClone(state);
  for (const [cardId, due] of Object.entries(dues))
    copy.profile.definitions!.cards[cardId]!.due = due;
  return { explorers: copy };
}

/** 투영은 늘 strict 계약을 지난다 — 계약에 없는 칸이 새면 여기서 빨갛다. */
const detailOf = (
  record: ExplorerTeacherRecord | null,
  today: string,
  account?: ExplorerTeacherAccount,
) =>
  explorerTeacherDetailSchema.parse(
    explorerTeacherDetail(record, today, account),
  );
const learning = (record: ExplorerTeacherRecord | null, today: string) =>
  detailOf(record, today).learningFlags;
const codes = (flags: { code: string }[]) => flags.map((f) => f.code);
const flagOf = <T extends { code: string }>(flags: T[], code: string) =>
  flags.find((f) => f.code === code);
const nameOf = (cardId: string) => definitionCard(cardId).name;
const refs = (cardIds: string[]) =>
  cardIds.map((id) => ({ id, name: nameOf(id) }));

describe("문턱은 이름 붙은 상수 — 정책 판과 함께 잠근다", () => {
  it("정책 판 2 의 값(27번 문서 §4.2 v1.1) — 값을 바꾸면 판 번호도 올린다", () => {
    expect({
      policy: TEACHER_FLAG_POLICY,
      unresolvedMin: UNRESOLVED_FLAG_MIN,
      unresolvedRecentDays: UNRESOLVED_RECENT_DAYS,
      reviewStuckCards: REVIEW_STUCK_FLAG_CARDS,
      overdueDays: OVERDUE_FLAG_DAYS,
      overdueCards: OVERDUE_FLAG_CARDS,
      overdueLongDays: OVERDUE_LONG_FLAG_DAYS,
      carriedOverDays: CARRIED_OVER_FLAG_DAYS,
      idleDays: IDLE_FLAG_DAYS,
      notStartedGraceDays: NOT_STARTED_GRACE_DAYS,
      recentSessions: RECENT_SESSION_LIMIT,
    }).toEqual({
      policy: 2,
      unresolvedMin: 1,
      unresolvedRecentDays: 7,
      reviewStuckCards: 2,
      overdueDays: 3,
      overdueCards: 3,
      overdueLongDays: 7,
      carriedOverDays: 2,
      idleDays: 7,
      notStartedGraceDays: 3,
      recentSessions: 10,
    });
  });
});

describe("기록 없음 · 운영 확인(시작 전 · 계정 없음)", () => {
  it("탐험 기록이 없으면 숫자는 0 · 학습 사유 없음 · 운영 확인 «시작 전»", () => {
    for (const record of [null, {}, { explorers: undefined }]) {
      expect(detailOf(record, D0)).toEqual({
        started: false,
        collected: 0,
        total: 230,
        units: [],
        dueToday: 0,
        overdue: { cards: 0, maxDays: 0 },
        recentSessions: [],
        openSession: null,
        lastCompletedDate: null,
        learningFlags: [],
        operationFlags: [{ code: "not-started", value: null, date: null }],
        cards: [],
      });
    }
    expect(definitionCards).toHaveLength(230);
  });

  it("요약은 상세에서 카드 목록만 뺀 것이다", () => {
    const f = learner();
    f.start();
    f.finish();
    const account = { hasAccount: false, createdOn: null };
    const { cards, ...rest } = detailOf(f.record(), day(9), account);
    expect(cards).toHaveLength(5);
    expect(rest.learningFlags.length).toBeGreaterThan(0);
    const summary = explorerTeacherSummary(f.record(), day(9), account);
    expect(explorerTeacherSummarySchema.parse(summary)).toEqual(rest);
    expect("cards" in summary).toBe(false);
  });

  it("시작 전 — 계정을 만든 날에서 NOT_STARTED_GRACE_DAYS 가 지나야 선다(문턱 바로 안 · 밖)", () => {
    const account = { hasAccount: true, createdOn: D0 };
    const ops = (today: string) =>
      detailOf(null, today, account).operationFlags;
    expect(ops(day(NOT_STARTED_GRACE_DAYS - 1))).toEqual([]);
    expect(ops(day(NOT_STARTED_GRACE_DAYS))).toEqual([
      { code: "not-started", value: NOT_STARTED_GRACE_DAYS, date: D0 },
    ]);
    // 만든 날이 오늘보다 뒤로 적혀 있어도(시계 어긋남) 서지 않는다
    expect(ops(day(-2))).toEqual([]);
    // 만든 날을 모르면 바로 선다
    expect(
      detailOf(null, D0, { hasAccount: true, createdOn: null }).operationFlags,
    ).toEqual([{ code: "not-started", value: null, date: null }]);
  });

  it("계정 없음은 «시작 전»을 대신한다 — 시작한 학생에게는 운영 확인이 없다", () => {
    const none = { hasAccount: false, createdOn: null };
    expect(detailOf(null, D0, none).operationFlags).toEqual([
      { code: "no-account", value: null, date: null },
    ]);
    const f = learner();
    f.start();
    f.finish();
    expect(detailOf(f.record(), D0, none).operationFlags).toEqual([
      { code: "no-account", value: null, date: null },
    ]);
    expect(
      detailOf(f.record(), day(30), { hasAccount: true, createdOn: day(-40) })
        .operationFlags,
    ).toEqual([]);
  });

  it("오늘은 날짜 글(YYYY-MM-DD)만 받는다", () => {
    expect(() => explorerTeacherDetail(null, "2026-10-01T00:00:00Z")).toThrow();
    expect(() => explorerTeacherDetail(null, "")).toThrow();
  });
});

describe("모은 카드 · 단원 · 카드 목록 · 세션 이력", () => {
  it("한 단원을 깨끗이 끝낸 날 — 5 / 230 · 단원 5장 · 사유 없음", () => {
    const f = learner();
    f.start();
    f.finish();
    const detail = detailOf(f.record(), D0, {
      hasAccount: true,
      createdOn: null,
    });
    expect(detail).toMatchObject({
      started: true,
      collected: 5,
      total: 230,
      units: [
        {
          id: "factors",
          title: "소인수분해",
          grade: 7,
          collected: 5,
          total: 5,
        },
      ],
      dueToday: 0,
      overdue: { cards: 0, maxDays: 0 },
      openSession: null,
      lastCompletedDate: D0,
      learningFlags: [],
      operationFlags: [],
    });
    expect(detail.recentSessions).toEqual([
      {
        date: D0,
        route: "unit",
        unitId: "factors",
        unitTitle: "소인수분해",
        targetCardName: null,
        first: 15,
        total: 15,
        unresolved: 0,
        stars: 5,
      },
    ]);
    expect(detail.cards.map((c) => c.id)).toEqual(FACTORS.map((c) => c.id));
    expect(detail.cards[0]).toEqual({
      id: "prime",
      name: nameOf("prime"),
      unitId: "factors",
      unitTitle: "소인수분해",
      grade: 7,
      level: 1,
      due: day(1),
      lastRecall: "new",
      missed: 0,
      reviewStep: 0,
      overdueDays: 0,
    });
  });

  it("만기 · 밀린 날 수는 학생 화면과 같은 함수에서 나온다", () => {
    const f = learner();
    f.start();
    f.finish();
    for (const offset of [0, 1, 2, 5]) {
      const today = day(offset);
      const detail = detailOf(f.record(), today);
      const view = explorerView(f.state, today);
      expect(detail.dueToday).toBe(view.dueCardIds.length);
      const progress = new Map(
        view.units.flatMap((u) => u.cards.map((c) => [c.id, c.progress])),
      );
      for (const card of detail.cards)
        expect(card.due).toBe(progress.get(card.id)!.due);
    }
    expect(detailOf(f.record(), day(1))).toMatchObject({
      dueToday: 5,
      overdue: { cards: 0, maxDays: 0 },
    });
    const late = detailOf(f.record(), day(3));
    expect(late.overdue).toEqual({ cards: 5, maxDays: 2 });
    expect(late.cards.every((c) => c.overdueDays === 2)).toBe(true);
  });

  it("최근 세션은 이력 끝에서 10건 — 최근 것부터, 회복 길은 대상 카드 이름", () => {
    const f = learner();
    for (let i = 0; i < 11; i++) {
      f.on(day(i)).start();
      f.finish();
    }
    f.on(day(11)).act({
      type: "start",
      route: "repair",
      cardId: "factorization",
    });
    f.finish();
    const { recentSessions } = detailOf(f.record(), day(11));
    expect(recentSessions).toHaveLength(RECENT_SESSION_LIMIT);
    expect(recentSessions.map((s) => s.date)).toEqual(
      Array.from({ length: 10 }, (_, i) => day(11 - i)),
    );
    expect(recentSessions[0]).toMatchObject({
      route: "repair",
      targetCardName: nameOf("factorization"),
    });
    expect(recentSessions[1]).toMatchObject({
      route: "unit",
      targetCardName: null,
    });
  });

  it("카드 기록이 있는 단원만, 학년 순으로", () => {
    const f = learner();
    f.start("expressions");
    f.finish();
    f.on(day(1)).start("factors");
    f.finish(wrongOn("prime"));
    const { units } = detailOf(f.record(), day(1));
    expect(units.map((u) => [u.id, u.collected])).toEqual(
      definitionUnits
        .filter((u) => ["factors", "expressions"].includes(u.id))
        .map((u) => [u.id, u.id === "factors" ? 4 : 5]),
    );
  });
});

describe("④ 열린 세션 · 임무가 날을 넘김", () => {
  it("풀고 있는 세션 — 시작 날 · 해결 수, 오늘 시작했으면 사유 없음", () => {
    const f = learner();
    f.start();
    for (let i = 0; i < 4; i++) f.answer();
    const detail = detailOf(f.record(), D0);
    expect(detail.openSession).toEqual({
      startedOn: D0,
      route: "unit",
      unitId: "factors",
      unitTitle: "소인수분해",
      status: "active",
      solved: 4,
      total: 15,
      round: 0,
      continuation: 0,
      unresolved: 0,
    });
    expect(detail.learningFlags).toEqual([]);
    expect(detail.lastCompletedDate).toBeNull();
  });

  it("문턱 바로 안 · 밖 — 시작 날에서 CARRIED_OVER_FLAG_DAYS 가 지나면 선다", () => {
    const f = learner();
    f.start();
    f.answer();
    expect(learning(f.record(), day(CARRIED_OVER_FLAG_DAYS - 1))).toEqual([]);
    expect(learning(f.record(), day(CARRIED_OVER_FLAG_DAYS))).toEqual([
      {
        code: "carried-over",
        value: CARRIED_OVER_FLAG_DAYS,
        date: D0,
        cards: [],
      },
    ]);
    expect(flagOf(learning(f.record(), day(9)), "carried-over")?.value).toBe(9);
  });

  it("지난 칸 다시 풀기는 열린 임무가 아니다", () => {
    const f = learner();
    f.start();
    f.finish();
    f.on(day(1)).act({ type: "start", route: "unit", dayId: D0 });
    f.answer();
    expect(f.session().reviewOnly).toBe(true);
    const detail = detailOf(f.record(), day(4));
    expect(detail.openSession).toBeNull();
    expect(codes(detail.learningFlags)).not.toContain("carried-over");
  });
});

describe("① 미해결을 남기고 끝냄 — 가장 최근 세션", () => {
  it("세 바퀴 뒤에도 남으면 선다 — 남은 활동 수 · 그 카드 이름, 다시 풀어 없애면 걷힌다", () => {
    const f = learner();
    f.start();
    f.finish(wrongOn("prime"));
    expect(f.session().unresolved).toHaveLength(3);
    const ended = detailOf(f.record(), D0);
    expect(ended.collected).toBe(4);
    expect(ended.lastCompletedDate).toBeNull();
    expect(ended.openSession).toMatchObject({
      status: "retry",
      solved: 12,
      round: 3,
      continuation: 0,
      unresolved: 3,
    });
    expect(ended.learningFlags).toEqual([
      { code: "unresolved", value: 3, date: D0, cards: refs(["prime"]) },
    ]);
    expect(ended.cards.find((c) => c.id === "prime")).toMatchObject({
      level: 0,
      missed: 3,
      lastRecall: "retry",
    });

    // 이틀 뒤 «남은 문제 다시 풀기» — 푸는 동안에도 사유는 그대로다(아직 안 없앴다)
    f.on(day(2)).act({ type: "retry-unresolved" });
    const retrying = detailOf(f.record(), day(2));
    expect(retrying.openSession).toMatchObject({
      startedOn: D0,
      status: "active",
      continuation: 1,
      unresolved: 0,
    });
    expect(codes(retrying.learningFlags)).toEqual([
      "unresolved",
      "carried-over",
    ]);

    f.finish();
    const solved = detailOf(f.record(), day(2));
    expect(solved.openSession).toBeNull();
    expect(solved.collected).toBe(5);
    expect(solved.lastCompletedDate).toBe(day(2));
    expect(solved.recentSessions[0]).toMatchObject({ unresolved: 0 });
    // 처음 배우다 틀린 카드는 «복습에서 막힘»이 아니다
    expect(solved.learningFlags).toEqual([]);
  });

  it("미해결이 없으면(재도전으로 다 풀었으면) 서지 않는다 — 수의 문턱 바로 밖", () => {
    const f = learner();
    f.start();
    f.finish(wrongOn("prime", true));
    expect(f.session().unresolved).toHaveLength(0);
    const detail = detailOf(f.record(), D0);
    expect(detail.recentSessions[0]).toMatchObject({
      first: 12,
      unresolved: 0,
    });
    expect(detail.learningFlags).toEqual([]);
  });

  it("최근 UNRESOLVED_RECENT_DAYS 안의 세션만 — 그 뒤에는 «날을 넘김»이 남는다(문턱 바로 안 · 밖)", () => {
    const f = learner();
    f.start();
    f.finish(wrongOn("prime"));
    const inside = learning(f.record(), day(UNRESOLVED_RECENT_DAYS - 1));
    expect(flagOf(inside, "unresolved")).toMatchObject({ value: 3, date: D0 });
    const outside = learning(f.record(), day(UNRESOLVED_RECENT_DAYS));
    expect(codes(outside)).not.toContain("unresolved");
    expect(codes(outside)).toContain("carried-over");
  });

  it("끝난 세션이 이력에 아직 없으면 그 세션을 읽고, 옛 이력 줄(id 없음)이 있으면 그 줄을 읽는다", () => {
    const f = learner();
    f.start();
    f.finish(wrongOn("prime"));
    const missing = structuredClone(f.state);
    missing.profile.definitions!.history = [];
    expect(learning({ explorers: missing }, D0)).toEqual([
      { code: "unresolved", value: 3, date: D0, cards: refs(["prime"]) },
    ]);
    const legacy = structuredClone(f.state);
    const row = legacy.profile.definitions!.history[0]!;
    delete row.sessionId;
    row.unresolved = 2;
    expect(flagOf(learning({ explorers: legacy }, D0), "unresolved")).toEqual({
      code: "unresolved",
      value: 2,
      date: D0,
      cards: refs(["prime"]),
    });
  });
});

describe("② 최근 복습에서 막힘 — 이미 모은 카드", () => {
  it("🔴 새 단원에서 첫 시도를 틀린 것은 복습이 아니다 — 두 장을 틀려도 서지 않는다", () => {
    const f = learner();
    f.start();
    f.finish(wrongOn(["prime", "composite"], true));
    const detail = detailOf(f.record(), D0);
    // 저장된 값은 «모은 카드 · retry» 다 — 레벨과 lastRecall 만 읽으면 여기서 선다
    for (const id of ["prime", "composite"])
      expect(detail.cards.find((c) => c.id === id)).toMatchObject({
        level: 1,
        lastRecall: "retry",
        missed: 0,
      });
    expect(detail.learningFlags).toEqual([]);
  });

  it("모은 뒤의 복습에서 틀린 카드가 REVIEW_STUCK_FLAG_CARDS 장이면 선다 · 다시 기억하면 걷힌다", () => {
    const f = learner();
    f.start();
    f.finish();

    // 한 장 — 문턱 바로 안
    f.on(day(1)).start();
    f.finish(wrongOn("prime", true));
    expect(
      detailOf(f.record(), day(1)).cards.find((c) => c.id === "prime"),
    ).toMatchObject({ level: 1, lastRecall: "retry" });
    expect(learning(f.record(), day(1))).toEqual([]);

    // 두 장 — 문턱 바로 밖
    f.on(day(2)).start();
    f.finish(wrongOn(["prime", "composite"], true));
    expect(learning(f.record(), day(2))).toEqual([
      {
        code: "review-stuck",
        value: REVIEW_STUCK_FLAG_CARDS,
        date: day(2),
        cards: refs(["prime", "composite"]),
      },
    ]);

    f.on(day(3)).start();
    f.finish();
    const recalled = detailOf(f.record(), day(3));
    for (const id of ["prime", "composite"])
      expect(recalled.cards.find((c) => c.id === id)).toMatchObject({
        lastRecall: "remembered",
      });
    expect(recalled.learningFlags).toEqual([]);
  });

  it("복습에서 미해결까지 남기면 두 사유가 따로 선다", () => {
    const f = learner();
    f.start();
    f.finish();
    f.on(day(1)).start();
    f.finish((s) => wrongOn("composite")(s) || wrongOn("prime", true)(s));
    const detail = detailOf(f.record(), day(1));
    expect(detail.learningFlags).toEqual([
      {
        code: "unresolved",
        value: 3,
        date: day(1),
        cards: refs(["composite"]),
      },
      {
        code: "review-stuck",
        value: 2,
        date: day(1),
        cards: refs(["prime", "composite"]),
      },
    ]);
    expect(detail.collected).toBe(5);
  });
});

describe("③ 복습이 밀림", () => {
  it("날 수의 문턱 바로 안 · 밖 — 다섯 장이 OVERDUE_FLAG_DAYS 밀리면 선다", () => {
    const f = learner();
    f.start();
    f.finish();
    const due = day(1);
    const inside = detailOf(f.record(), day(OVERDUE_FLAG_DAYS - 1, due));
    expect(inside.overdue).toEqual({
      cards: 5,
      maxDays: OVERDUE_FLAG_DAYS - 1,
    });
    expect(codes(inside.learningFlags)).not.toContain("overdue");
    const outside = learning(f.record(), day(OVERDUE_FLAG_DAYS, due));
    expect(flagOf(outside, "overdue")).toEqual({
      code: "overdue",
      value: OVERDUE_FLAG_DAYS,
      date: due,
      cards: refs(FACTORS.map((c) => c.id)),
    });
  });

  it("장수의 문턱 바로 안 · 밖 — 사흘 밀린 카드가 OVERDUE_FLAG_CARDS 장이어야 선다", () => {
    const f = learner();
    f.start();
    f.finish();
    const today = day(OVERDUE_FLAG_DAYS, day(1));
    const far = day(60);
    const ids = FACTORS.map((c) => c.id);
    const keep = (n: number) =>
      withDue(f.state, Object.fromEntries(ids.slice(n).map((id) => [id, far])));
    expect(codes(learning(keep(OVERDUE_FLAG_CARDS - 1), today))).not.toContain(
      "overdue",
    );
    expect(
      flagOf(learning(keep(OVERDUE_FLAG_CARDS), today), "overdue"),
    ).toEqual({
      code: "overdue",
      value: OVERDUE_FLAG_DAYS,
      date: day(1),
      cards: refs(ids.slice(0, OVERDUE_FLAG_CARDS)),
    });
  });

  it("한 장이라도 OVERDUE_LONG_FLAG_DAYS 밀리면 선다 — 오래 밀린 순으로 싣는다", () => {
    const f = learner();
    f.start();
    f.finish();
    const ids = FACTORS.map((c) => c.id);
    // 한 장은 만기 그대로(D0+1), 한 장은 그보다 이틀 뒤, 나머지는 먼 뒤
    const record = withDue(f.state, {
      [ids[1]!]: day(3),
      [ids[2]!]: day(60),
      [ids[3]!]: day(60),
      [ids[4]!]: day(60),
    });
    const inside = learning(record, day(OVERDUE_LONG_FLAG_DAYS - 1, day(1)));
    expect(codes(inside)).not.toContain("overdue");
    const outside = learning(record, day(OVERDUE_LONG_FLAG_DAYS, day(1)));
    expect(flagOf(outside, "overdue")).toEqual({
      code: "overdue",
      value: OVERDUE_LONG_FLAG_DAYS,
      date: day(1),
      cards: refs([ids[0]!, ids[1]!]),
    });
  });

  it("KST 자정 앞뒤 — 23:59:59 에는 이틀, 00:00 에 사흘", () => {
    const f = learner();
    f.start();
    f.finish(); // 만기 2026-10-02
    const before = kstDateOf(new Date("2026-10-04T14:59:59.999Z"));
    const after = kstDateOf(new Date("2026-10-04T15:00:00.000Z"));
    expect([before, after]).toEqual(["2026-10-04", "2026-10-05"]);
    expect(codes(learning(f.record(), before))).toEqual([]);
    expect(codes(learning(f.record(), after))).toEqual(["overdue"]);
  });
});

describe("⑤ 오래 쉼 — 마지막으로 하루를 끝낸 날부터", () => {
  it("문턱 바로 안 · 밖", () => {
    const f = learner();
    f.start();
    f.finish();
    const inside = learning(f.record(), day(IDLE_FLAG_DAYS - 1));
    expect(codes(inside)).not.toContain("idle");
    const outside = learning(f.record(), day(IDLE_FLAG_DAYS));
    expect(flagOf(outside, "idle")).toEqual({
      code: "idle",
      value: IDLE_FLAG_DAYS,
      date: D0,
      cards: [],
    });
    // 차례 — 밀림이 오래 쉼보다 앞이다
    expect(codes(outside)).toEqual(["overdue", "idle"]);
  });

  it("은행 날에 얻은 칸도 «끝낸 날»이다 — 매일 은행 문제를 푸는 학생은 쉬는 것이 아니다", () => {
    const f = learner();
    f.start();
    f.finish();
    const expedition = {
      legacyDays: [{ date: day(-3) }],
      awards: [{ day: { date: day(5) } }, { day: { date: day(2) } }],
    };
    expect(expeditionTileDates(expedition)).toEqual([day(-3), day(5), day(2)]);
    expect(expeditionTileDates(undefined)).toEqual([]);
    const today = day(IDLE_FLAG_DAYS);
    expect(codes(learning(f.record(), today))).toContain("idle");
    const withBank = detailOf(f.record({ expedition }), today);
    expect(withBank.lastCompletedDate).toBe(day(5));
    expect(codes(withBank.learningFlags)).not.toContain("idle");
    expect(
      flagOf(
        learning(f.record({ expedition }), day(5 + IDLE_FLAG_DAYS)),
        "idle",
      ),
    ).toMatchObject({ value: IDLE_FLAG_DAYS, date: day(5) });
  });

  it("개념 카드를 아직 안 만난 은행 학생 — 시작은 했고, 칸 날짜로만 잰다", () => {
    const record = {
      explorers: createExplorerState("student-b", 3),
      expedition: { legacyDays: [], awards: [{ day: { date: D0 } }] },
    };
    const detail = detailOf(record, day(IDLE_FLAG_DAYS - 1));
    expect(detail).toMatchObject({
      started: true,
      collected: 0,
      units: [],
      cards: [],
      lastCompletedDate: D0,
      learningFlags: [],
      operationFlags: [],
    });
    expect(codes(learning(record, day(IDLE_FLAG_DAYS)))).toEqual(["idle"]);
  });

  it("끝낸 날이 하나도 없으면(학습 이력 없음) 잴 날이 없다 — 서지 않는다", () => {
    const record = { explorers: createExplorerState("student-b", 3) };
    expect(learning(record, day(30))).toEqual([]);
  });

  it("탐험은 시작 전인데 옛 기록에서 들여온 날이 있는 학생 — 두 목록에 따로 선다", () => {
    const record = { expedition: { legacyDays: [{ date: D0 }], awards: [] } };
    const detail = detailOf(record, day(IDLE_FLAG_DAYS));
    expect(detail.started).toBe(false);
    expect(codes(detail.learningFlags)).toEqual(["idle"]);
    expect(codes(detail.operationFlags)).toEqual(["not-started"]);
  });
});

describe("🔴 D-141 ⑵ — 문항 글 · 보기 · 학생이 고른 답은 싣지 않는다", () => {
  it("가장 많은 것을 담은 기록에서도 카드 뜻 · 함정 문장 · 해설 · 보기 글이 안 나간다", () => {
    const f = learner();
    f.start();
    f.finish();
    f.on(day(1)).start();
    f.finish((s) => wrongOn("composite")(s) || wrongOn("prime", true)(s));
    f.on(day(2)).act({ type: "retry-unresolved" });
    f.answer(true);
    const detail = detailOf(f.record(), day(9));
    expect(codes(detail.learningFlags)).toEqual([
      "review-stuck",
      "overdue",
      "carried-over",
      "idle",
    ]);
    const text = JSON.stringify(detail);
    const names = new Set([
      ...definitionCards.map((c) => c.name),
      ...definitionUnits.map((u) => u.title),
    ]);
    let checked = 0;
    for (const card of definitionCards) {
      const content = [
        card.definition,
        card.trap,
        card.explanation,
        card.note,
        card.exampleTitle,
        ...card.words,
        ...card.examples.map((e) => e.text),
      ].filter((s) => s.length >= 6 && !names.has(s));
      for (const sentence of content) {
        checked++;
        expect(text.includes(sentence), `${card.id}: ${sentence}`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(900);
    expect(text).not.toMatch(
      /"(?:queue|next|passed|seen|hinted|initialWrong|eligible|receipts|feedback|choiceIds|tiles|definition|words|pieces|examples|trap|truth|explanation|note)":/,
    );
    // 카드 이름과 단원 이름은 싣는다(교육과정 내용)
    expect(text).toContain(nameOf("prime"));
    expect(text).toContain("소인수분해");
  });
});
