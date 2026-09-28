/**
 * 보충 카드 한 장 세션(D-147 · 05 §8.22) — 3자 합의(2026-09-28, `docs/reference/concept-terms/supplement-cards.md`).
 *
 * - 단원 끝 줄: 그 단원 다섯 개념을 오늘의 단원 탐험으로 다 모아 칸을 얻은 날 한 번 · 그 단원 보충 중 안 모은 첫 장.
 *   같은 날 모으면 다음 장으로 바꾸지 않는다(끝 줄로 남았다가 다음 날 사라짐).
 * - 한 장 = 뜻 만나기 → 세 활동. 틀린 활동만 뒤에서, 세 바퀴까지(본 카드와 같다). 남으면 안 모음 · 다시 해 보기는 처음부터.
 * - 멈춘 진행은 카드마다 지키고, 한 번에 푸는 것은 한 장.
 * - 별은 처음 모을 때 +1 — 칸 기록 · 한 칸 보장 · 상자 · 기억 일정 밖. 모은 카드는 다시 풀기가 없다.
 * - 본 카드 세션이 열려 있으면(오늘의 탐험 · 오답 다시 풀기) 시작하지 못한다. 오늘의 탐험 미션이 열린 동안의
 *   막음은 저장 문지기(`updateExpedition`)가 맡는다(`mathExplorersRoutes.test.ts`).
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  storedExplorerSchema,
  type ExplorerAction,
} from "@/contracts/mathExplorers.contract";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
  ExplorerActionConflict,
  ExplorerActionInvalid,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import { supplementCard } from "@/lib/math-explorers/supplement-content";

function fixture(grade = 3) {
  let state = createExplorerState("student-sup", grade);
  let date = "2026-09-28";
  const act = (action: ExplorerAction, requestId: string = randomUUID()) => {
    const result = applyExplorerAction(state, action, date, requestId);
    state = result.state;
    return result;
  };
  const view = () => explorerView(state, date);
  /** 본 카드 단원 탐험 한 판을 모두 맞혀 끝낸다(칸을 얻는 날). */
  const finishUnit = (unitId: string) => {
    act({ type: "start", route: "unit", unitId });
    for (let safety = 0; !state.profile.definitions!.session!.done; safety++) {
      if (safety > 40) throw new Error("unbounded");
      const s = state.profile.definitions!.session!;
      if (definitionNeedsRead(state.profile, s)) {
        act({ type: "read", questionId: definitionQuestionId(s) });
        continue;
      }
      const task = s.queue[s.index]!;
      const card = definitionCard(task.cardId);
      const ids =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [card.truth ? 1 : 0];
      const options = definitionOptions(s, task);
      act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: ids.map((id) => options.indexOf(id)),
      });
    }
  };
  /** 보충 한 걸음 — 뜻 만나기면 읽고, 아니면 맞게(또는 틀리게) 답한다. */
  const step = (wrong = false) => {
    const activity = view().supplements!.activity!;
    if (activity.kind === "read")
      return act({ type: "supplement-read", questionId: activity.questionId });
    const card = supplementCard(activity.cardId);
    const labels =
      activity.kind === "assemble"
        ? wrong
          ? [card.words[1]!, card.words[0]!]
          : card.words.slice(0, 2)
        : activity.kind === "examples"
          ? wrong
            ? [card.examples.find((e) => !e.yes)!.text]
            : card.examples.filter((e) => e.yes).map((e) => e.text)
          : [card.truth !== wrong ? "맞다" : "아니다"];
    return act({
      type: "supplement-answer",
      questionId: activity.questionId,
      choiceIds: labels.map(
        (label) => activity.choices.find((c) => c.label === label)!.id,
      ),
    });
  };
  const solve = (
    cardId: string,
    wrong: (round: number) => boolean = () => false,
  ) => {
    act({ type: "supplement-start", cardId });
    let last: ReturnType<typeof act> | undefined;
    for (let safety = 0; view().supplements!.activity; safety++) {
      if (safety > 20) throw new Error("unbounded");
      const round = view().supplements!.session!.round;
      last = step(
        view().supplements!.activity!.kind !== "read" && wrong(round),
      );
    }
    return last!;
  };
  return {
    act,
    view,
    finishUnit,
    step,
    solve,
    get state() {
      return state;
    },
    date: (day: string) => {
      date = day;
    },
    reload: () => {
      state = storedExplorerSchema.parse(JSON.parse(JSON.stringify(state)));
    },
  };
}

describe("보충 카드 — 단원 끝 줄(offer)", () => {
  it("그 단원 다섯을 오늘의 단원 탐험으로 다 모은 날에만, 그 단원 보충 중 안 모은 첫 장을 내놓는다", () => {
    const f = fixture();
    expect(f.view().supplements!.offer).toBeNull();
    f.finishUnit("g3-shapes");
    expect(f.view().supplements!.offer).toEqual({
      cardId: "sup-line",
      unitId: "g3-shapes",
    });
    f.date("2026-09-29");
    expect(f.view().supplements!.offer).toBeNull();
  });

  it("보충이 없는 단원이면 줄이 없다", () => {
    const f = fixture();
    f.finishUnit("g3-add");
    expect(f.view().supplements!.offer).toBeNull();
  });

  it("같은 날 모으면 다음 장으로 바꾸지 않고 그 장이 끝 줄로 남는다", () => {
    const f = fixture();
    f.finishUnit("g3-shapes");
    f.solve("sup-line");
    expect(f.view().supplements!.offer).toEqual({
      cardId: "sup-line",
      unitId: "g3-shapes",
    });
    expect(
      f.view().supplements!.cards.find((c) => c.id === "sup-line")!.collectedAt,
    ).toBe("2026-09-28");
  });
});

describe("보충 카드 — 한 장 세션", () => {
  it("뜻 만나기 뒤 세 활동을 다 맞히면 처음 한 번 모으고 별 +1 — 본 카드 기록 · 칸 · 상자 밖", () => {
    const f = fixture();
    f.finishUnit("g3-shapes");
    const before = structuredClone(f.state);
    f.act({ type: "supplement-start", cardId: "sup-line" });
    const started = f.view().supplements!;
    expect(started.session).toMatchObject({
      cardId: "sup-line",
      index: 0,
      total: 3,
      round: 0,
      title: "교재에 한 장 더",
    });
    expect(started.activity).toMatchObject({
      cardId: "sup-line",
      unitId: "g3-shapes",
      unitTitle: "평면도형과 원",
      kind: "read",
      reading: { definition: supplementCard("sup-line").definition },
    });
    f.step();
    const assemble = f.view().supplements!.activity!;
    expect(assemble.kind).toBe("assemble");
    expect(assemble.pieces).toEqual(supplementCard("sup-line").pieces);
    expect(assemble.choices.map((c) => c.label).sort()).toEqual(
      [...supplementCard("sup-line").words].sort(),
    );
    f.step();
    f.step();
    const last = f.step();
    expect(last.feedback).toMatchObject({ complete: true, stars: 1 });
    const after = f.state;
    expect(after.profile.stars).toBe(before.profile.stars + 1);
    expect(after.profile.earned).toBe(before.profile.earned + 1);
    expect(after.profile.definitions).toEqual(before.profile.definitions);
    expect(after.completedDays).toEqual(before.completedDays);
    expect(f.view().chests).toEqual(explorerView(before, "2026-09-28").chests);
    expect(f.view().supplements!.session).toBeNull();
    expect(f.view().supplements!.activity).toBeNull();
    const card = f.view().supplements!.cards.find((c) => c.id === "sup-line")!;
    expect(card).toMatchObject({
      collectedAt: "2026-09-28",
      missedAt: null,
      solved: 0,
      started: false,
    });
    // 모은 카드는 다시 풀지 않는다 — 별이 늘 길이 없다.
    expect(() =>
      f.act({ type: "supplement-start", cardId: "sup-line" }),
    ).toThrow(ExplorerActionInvalid);
    expect(f.state.profile.stars).toBe(before.profile.stars + 1);
  });

  it("틀린 활동만 뒤에서 다시 — 두째 바퀴에 다 맞히면 모으고 별 +1", () => {
    const f = fixture();
    const stars = f.state.profile.stars;
    const last = f.solve("sup-side-vertex", (round) => round === 0);
    expect(last.feedback).toMatchObject({ complete: true, stars: 1 });
    expect(f.state.profile.stars).toBe(stars + 1);
  });

  it("세 바퀴 뒤에도 남으면 모으지 않고(별 없음) 해설은 열리며, 다시 해 보기는 뜻 만나기부터 처음", () => {
    const f = fixture();
    const stars = f.state.profile.stars;
    const last = f.solve("sup-angle", () => true);
    expect(last.feedback.complete).toBe(false);
    expect(last.feedback.stars ?? 0).toBe(0);
    expect(f.state.profile.stars).toBe(stars);
    const card = f.view().supplements!.cards.find((c) => c.id === "sup-angle")!;
    expect(card).toMatchObject({
      collectedAt: null,
      missedAt: "2026-09-28",
      started: false,
    });
    const solution = f.act({
      type: "supplement-solution",
      cardId: "sup-angle",
    });
    expect(solution.feedback.solution).toMatchObject({
      cardId: "sup-angle",
      definition: supplementCard("sup-angle").definition,
      statement: supplementCard("sup-angle").trap,
      truth: supplementCard("sup-angle").truth,
    });
    f.act({ type: "supplement-start", cardId: "sup-angle" });
    expect(f.view().supplements!.session).toMatchObject({ index: 0, round: 0 });
    expect(f.view().supplements!.activity!.kind).toBe("read");
  });

  it("멈춘 진행은 카드마다 지키고, 한 번에 푸는 것은 한 장이다", () => {
    const f = fixture();
    f.act({ type: "supplement-start", cardId: "sup-line" });
    f.step(); // 뜻 만나기
    f.step(); // 문장 조립 맞음
    const staleQuestion = f.view().supplements!.activity!.questionId;
    f.act({ type: "supplement-start", cardId: "sup-angle" });
    expect(f.view().supplements!.session!.cardId).toBe("sup-angle");
    const line = f.view().supplements!.cards.find((c) => c.id === "sup-line")!;
    expect(line).toMatchObject({ started: true, solved: 1 });
    // 멈춘 장의 문항 번호로는 답할 수 없다.
    expect(() =>
      f.act({
        type: "supplement-answer",
        questionId: staleQuestion,
        choiceIds: [0],
      }),
    ).toThrow(ExplorerActionConflict);
    f.act({ type: "supplement-start", cardId: "sup-line" });
    expect(f.view().supplements!.session).toMatchObject({
      cardId: "sup-line",
      index: 1,
      solved: 1,
    });
    expect(f.view().supplements!.activity!.kind).toBe("examples");
    // 저장 · 다시 읽기를 지나도 같다.
    f.reload();
    expect(f.view().supplements!.session).toMatchObject({
      cardId: "sup-line",
      index: 1,
    });
  });

  it("본 카드 세션이 열려 있으면 시작하지 못하고, 모르는 id · 안 푼 카드의 해설은 막는다", () => {
    const f = fixture();
    f.act({ type: "start", route: "unit", unitId: "g3-add" });
    expect(() =>
      f.act({ type: "supplement-start", cardId: "sup-line" }),
    ).toThrow(ExplorerActionConflict);
    const g = fixture();
    expect(() => g.act({ type: "supplement-start", cardId: "prime" })).toThrow(
      ExplorerActionInvalid,
    );
    expect(() =>
      g.act({ type: "supplement-solution", cardId: "sup-line" }),
    ).toThrow(ExplorerActionInvalid);
  });

  it("같은 요청 번호는 같은 답을 돌려주고 별을 두 번 주지 않는다", () => {
    const f = fixture();
    f.act({ type: "supplement-start", cardId: "sup-common-divisor" });
    f.step();
    f.step();
    f.step();
    const activity = f.view().supplements!.activity!;
    const card = supplementCard("sup-common-divisor");
    const action: ExplorerAction = {
      type: "supplement-answer",
      questionId: activity.questionId,
      choiceIds: [
        activity.choices.find(
          (c) => c.label === (card.truth ? "맞다" : "아니다"),
        )!.id,
      ],
    };
    const requestId = randomUUID();
    const first = f.act(action, requestId);
    const stars = f.state.profile.stars;
    const again = f.act(action, requestId);
    expect(again.duplicate).toBe(true);
    expect(again.feedback).toEqual(first.feedback);
    expect(f.state.profile.stars).toBe(stars);
  });
});
