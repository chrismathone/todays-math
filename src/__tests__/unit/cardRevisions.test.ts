/**
 * 뜻을 고친 카드 — 예전 문장으로 이미 모은 학생에게 기억 복습으로 한 번 다시(원장님 확정 2026-09-28, D-143 ⑦).
 *
 * 공유 DB 에 쓰지 않는다: 카드 보정 판(`cardRevisions` — 카드 id → 고친 문장이 나간 뒤의 날짜)을 두고, 그 판 **전에**
 * 마지막으로 푼(`attemptedAt` — 세션을 시작한 날) 카드는 기억 복습에서 만기로 **읽는다**(엔진 읽기 규칙). 맞히면 받은 별 ·
 * 레벨 · 저장된 복습 차례가 그대로 — 레벨이 오르는 «제때 복습»은 저장된 만기로만 가려서(`eligible`) 앞당긴 복습은 별을 주지
 * 않는다(재풀이 규칙). 틀리면 여느 복습처럼 차례가 처음(다음 날)으로 돌아간다(엔진 규칙 · 레벨 · 별은 그대로).
 * 한 번 풀면 `attemptedAt` 이 판 뒤가 되어 다시 오지 않는다.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardRevisions } from "@/lib/math-explorers/conceptSentenceFixes";
import {
  definitionCard,
  definitionCards,
  definitionDue,
  definitionEffectiveDue,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import { planExpedition } from "@/lib/math-explorers/expedition";
import { emptySrsState } from "@/lib/math-srs/serverState";

const fixes = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      "../../../docs/reference/concept-terms/card-sentence-fixes.json",
    ),
    "utf8",
  ),
) as { fixes: { id: string; severity: string }[] };

const REVISED = ["g6-net", "g8-simultaneous", "g8-two-variable"];
const REV = cardRevisions["g8-simultaneous"];
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const BEFORE = addDays(REV, -8); // 예전 문장으로 푼 날
const LATER = "2026-12-01"; // 저장된 다음 복습(멀다)

/** 연립일차방정식 다섯 장을 예전 문장으로 모은 학생(레벨 2 · 다음 복습은 멀다). */
function collected(attemptedAt = BEFORE, grade = 8) {
  const state = createExplorerState("student-revision", grade);
  state.profile.stars = 7;
  state.profile.earned = 7;
  state.profile.definitions = {
    courseGrade: grade,
    goalUnitId: "g8-function",
    runs: 3,
    history: [],
    cards: Object.fromEntries(
      definitionCards
        .filter((card) => card.unit === "g8-simultaneous")
        .map((card) => [
          card.id,
          {
            level: 2,
            due: LATER,
            lastDate: attemptedAt,
            attemptedAt,
            missed: 0,
            reviewStep: 1,
            reviewedAt: attemptedAt,
            lastRecall: "remembered" as const,
          },
        ]),
    ),
  };
  return state;
}

describe("카드 보정 판 — 뜻을 고친 3장만", () => {
  it("원장님 확정 3장(전개도 · 미지수가 두 개인 일차방정식 · 연립방정식) = 보정 표의 «틀림» 3장", () => {
    expect(Object.keys(cardRevisions).sort()).toEqual(REVISED);
    expect(
      fixes.fixes
        .filter((fix) => fix.severity === "틀림")
        .map((fix) => fix.id)
        .sort(),
    ).toEqual(REVISED);
    for (const id of REVISED)
      expect(cardRevisions[id]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("기억 복습 만기로 읽기 — DB 에 쓰지 않는다", () => {
  it("판 전에 푼 3장 중 이 단원의 2장만 판 날부터 만기 — 저장된 만기는 그대로", () => {
    const state = collected();
    expect(definitionDue(state.profile, addDays(REV, -1))).toEqual([]);
    expect(
      definitionDue(state.profile, REV)
        .map((card) => card.id)
        .sort(),
    ).toEqual(["g8-simultaneous", "g8-two-variable"]);
    expect(state.profile.definitions!.cards["g8-two-variable"].due).toBe(LATER);
    expect(
      definitionEffectiveDue(
        "g8-two-variable",
        state.profile.definitions!.cards["g8-two-variable"],
      ),
    ).toBe(REV);
    expect(
      definitionEffectiveDue(
        "g8-substitution",
        state.profile.definitions!.cards["g8-substitution"],
      ),
    ).toBe(LATER);
  });

  it("도감 격자 · 카드 대화상자가 같은 만기를 읽는다 — 뷰가 내보내는 진도도 앞당긴 만기(모든 화면 일치 · 리드 검토 ⑤)", () => {
    const state = collected();
    for (const date of [addDays(REV, -1), REV]) {
      const view = explorerView(state, date);
      const progress = (id: string) =>
        view.units.flatMap((unit) => unit.cards).find((card) => card.id === id)!
          .progress!;
      expect(progress("g8-two-variable").due).toBe(REV);
      expect(progress("g8-simultaneous").due).toBe(REV);
      expect(progress("g8-substitution").due).toBe(LATER);
      expect(progress("g8-two-variable").level).toBe(2);
      // 격자의 «다시 기억할 때»(dueCardIds)와 대화상자의 «다음 복습»(progress.due)이 같은 날을 말한다
      expect(view.dueCardIds.includes("g8-two-variable")).toBe(
        progress("g8-two-variable").due <= date,
      );
    }
    expect(state.profile.definitions!.cards["g8-two-variable"].due).toBe(LATER);
  });

  it("판 뒤에 푼 카드는 그대로(새 문장을 이미 봤다)", () => {
    expect(definitionDue(collected(REV).profile, addDays(REV, 5))).toEqual([]);
  });

  it("원래 만기가 더 이르면 원래 만기", () => {
    const state = collected();
    state.profile.definitions!.cards["g8-simultaneous"].due = addDays(REV, -3);
    expect(
      definitionEffectiveDue(
        "g8-simultaneous",
        state.profile.definitions!.cards["g8-simultaneous"],
      ),
    ).toBe(addDays(REV, -3));
  });
});

describe("한 번 복습하면 정상 — 별 · 레벨 · 저장된 차례는 그대로", () => {
  it("기억 복습을 끝까지 맞히면 다시 안 오고, 별이 안 늘고, 레벨 · 저장된 만기가 그대로", () => {
    let state = collected();
    const date = addDays(REV, 1);
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      state = applyExplorerAction(state, action, date, randomUUID()).state;
    };
    act({ type: "start", route: "memory" });
    const session = () => state.profile.definitions!.session!;
    expect(session().route).toBe("memory");
    expect(session().cardIds!.slice(0, 2).sort()).toEqual([
      "g8-simultaneous",
      "g8-two-variable",
    ]);
    while (!session().done) {
      const s = session();
      const task = s.queue[s.index]!;
      const card = definitionCard(task.cardId);
      const source =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [card.truth ? 1 : 0];
      const options = definitionOptions(s, task);
      act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: source.map((i) => options.indexOf(i)),
      });
    }
    expect(session().unresolved).toEqual([]);
    expect(state.profile.stars).toBe(7);
    expect(state.profile.earned).toBe(7);
    for (const id of ["g8-simultaneous", "g8-two-variable"]) {
      const progress = state.profile.definitions!.cards[id];
      expect(progress.level).toBe(2);
      expect(progress.due).toBe(LATER);
      expect(progress.attemptedAt).toBe(date);
    }
    // 되풀이 — 다음 날에도, 더 뒤에도 다시 만기가 아니다
    expect(definitionDue(state.profile, addDays(date, 1))).toEqual([]);
    expect(definitionDue(state.profile, addDays(date, 20))).toEqual([]);
    expect(() =>
      applyExplorerAction(
        state,
        { type: "start", route: "memory" },
        addDays(date, 1),
        randomUUID(),
      ),
    ).toThrow("아직 복습할 날이 된 카드가 없어요.");
  });

  it("앞당긴 복습에서 틀리면 여느 복습처럼 엔진 규칙대로 차례가 처음(다음 날)으로 — 레벨 · 별은 그대로(리드 검토 ⑥)", () => {
    let state = collected();
    const date = addDays(REV, 1);
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      state = applyExplorerAction(state, action, date, randomUUID()).state;
    };
    act({ type: "start", route: "memory" });
    const session = () => state.profile.definitions!.session!;
    while (!session().done) {
      const s = session();
      const task = s.queue[s.index]!;
      const card = definitionCard(task.cardId);
      const wrong = task.cardId === "g8-two-variable" && task.kind === 2;
      const source =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [card.truth !== wrong ? 1 : 0];
      const options = definitionOptions(s, task);
      act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: source.map((i) => options.indexOf(i)),
      });
    }
    const missed = state.profile.definitions!.cards["g8-two-variable"];
    expect(missed).toMatchObject({
      level: 2,
      reviewStep: 0,
      due: addDays(date, 1),
      lastRecall: "retry",
    });
    expect(state.profile.definitions!.cards["g8-simultaneous"]).toMatchObject({
      level: 2,
      due: LATER,
      reviewStep: 1,
    });
    expect(state.profile.stars).toBe(7);
  });
});

describe("판 전날 시작해 판 날 끝낸 복습 — 예전 문장으로 풀었으니 한 번 더(리드 검토 ③)", () => {
  it("레벨 2 · 판 전날 시작 · 판 날 끝(제때 복습이라 저장된 만기가 밀려도) → 여전히 판 날부터 만기", () => {
    let state = collected(addDays(REV, -8));
    for (const progress of Object.values(state.profile.definitions!.cards))
      progress.due = addDays(REV, -1); // 제때 복습 날
    const act = (
      action: Parameters<typeof applyExplorerAction>[1],
      date: string,
    ) => {
      state = applyExplorerAction(state, action, date, randomUUID()).state;
    };
    act({ type: "start", route: "memory" }, addDays(REV, -1));
    const session = () => state.profile.definitions!.session!;
    while (!session().done) {
      const s = session();
      const task = s.queue[s.index]!;
      const card = definitionCard(task.cardId);
      const source =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [card.truth ? 1 : 0];
      const options = definitionOptions(s, task);
      act(
        {
          type: "answer",
          questionId: definitionQuestionId(s),
          choiceIds: source.map((i) => options.indexOf(i)),
        },
        REV, // 끝낸 날 = 판 날
      );
    }
    const progress = state.profile.definitions!.cards["g8-two-variable"];
    expect(progress.level).toBe(3); // 제때 복습 — 레벨 · 차례가 오른다
    expect(progress.due > REV).toBe(true);
    expect(definitionEffectiveDue("g8-two-variable", progress)).toBe(REV);
    expect(
      definitionDue(state.profile, REV)
        .map((card) => card.id)
        .sort(),
    ).toEqual(["g8-simultaneous", "g8-two-variable"]);
  });
});

describe("통합 탐험 — 앞당긴 만기가 기억 복습 날을 연다", () => {
  const plan = (date: string) =>
    planExpedition(
      { ...emptySrsState(), explorers: collected() },
      "student-revision",
      new Date(`${date}T03:00:00.000Z`),
    );
  it("판 날부터 사흘이 지나면(밀림) 연립일차방정식 기억 복습", () => {
    const today = plan(addDays(REV, 3));
    expect(today.kind).toBe("explorers");
    expect(today.route).toBe("memory");
    expect(today.unitId).toBe("g8-simultaneous");
  });
  it("판 다음 날은 두 장뿐이라(다섯 장 미만 · 밀림 아님) 학습 목표 그대로", () => {
    expect(plan(addDays(REV, 1)).route).not.toBe("memory");
  });
});
