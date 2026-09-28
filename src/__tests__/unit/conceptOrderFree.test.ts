/**
 * 순서 무관 채점 — 두 빈칸이 본디 대등한 카드(단위 등식 · 합집합 · 곱셈의 교환 …)는 두 정답 조각을 어느 칸에 넣어도 맞음
 * (리드 지시 2026-09-28 · 3자 합의 (다) 섞기 — 보고서 ⒀). 문장 조립 채점만 넓히고, 별 · 레벨 · 기억 복습 · 다시 풀기는
 * «맞았나» 한 값만 받으므로 그대로다. 표지는 원본 밖 표(`conceptOrderFree.ts`) — DB 에 쓰지 않는다.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { orderFreeCards } from "@/lib/math-explorers/conceptOrderFree";
import {
  definitionAssemblyCorrect,
  definitionCard,
  definitionCards,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";

const ORDER_FREE = [
  // 맞바꿔도 조사까지 맞고 뜻이 같다 — 12장
  "g3-capacity",
  "g3-kilometer",
  "g3-length",
  "g3-mass",
  "g4-mixed",
  "g5-rectangle-area",
  "g6-cross-product",
  "g7-interior-sum",
  "g9-real-number",
  "like-terms",
  "g7-direct",
  "g7-inverse",
  // 문장을 고친 뒤에도 본디 대칭 — 2장
  "integer",
  "g7-construction",
];

describe("순서 무관 표지 — 합의한 14장", () => {
  it("표 = 12장 + 정수 · 작도, 모두 있는 카드", () => {
    expect([...orderFreeCards].sort()).toEqual([...ORDER_FREE].sort());
    for (const id of ORDER_FREE) expect(definitionCard(id).id).toBe(id);
  });
});

describe("조립 채점 — 230장 모두", () => {
  it("정답 순서는 늘 맞음 · 맞바꿈은 표지 카드만 맞음 · 오답 말이 든 채움은 늘 틀림", () => {
    for (const card of definitionCards) {
      expect({
        id: card.id,
        ok: definitionAssemblyCorrect(card, [0, 1]),
      }).toEqual({ id: card.id, ok: true });
      expect({
        id: card.id,
        swap: definitionAssemblyCorrect(card, [1, 0]),
      }).toEqual({
        id: card.id,
        swap: orderFreeCards.has(card.id),
      });
      for (const [i, j] of [
        [0, 2],
        [2, 1],
        [3, 0],
        [1, 3],
        [2, 3],
      ])
        expect({
          id: card.id,
          i,
          j,
          ok: definitionAssemblyCorrect(card, [i!, j!]),
        }).toEqual({
          id: card.id,
          i,
          j,
          ok: false,
        });
    }
  });
});

describe("엔진 — 기억 복습에서 맞바꿔 맞혀도 «깨끗한 기억»이다(별 · 레벨 · 차례 규칙 그대로)", () => {
  it("단위 단원 다섯 장을 기억 복습 — 표지 카드는 맞바꿔 넣고 나머지는 정답 순서로 → 첫 판 15/15 · 레벨 · 차례가 오르고 별 +5", () => {
    const date = "2026-10-10";
    const unitCards = definitionCards.filter(
      (card) => card.unit === definitionCard("g3-capacity").unit,
    );
    expect(unitCards).toHaveLength(5);
    let state = createExplorerState("student-order-free", 3);
    state.profile.stars = 4;
    state.profile.earned = 4;
    state.profile.definitions = {
      courseGrade: 3,
      runs: 1,
      history: [],
      cards: Object.fromEntries(
        unitCards.map((card) => [
          card.id,
          {
            level: 1,
            due: date,
            lastDate: "2026-10-03",
            attemptedAt: "2026-10-03",
            missed: 0,
            reviewStep: 1,
            reviewedAt: "2026-10-03",
            lastRecall: "remembered" as const,
          },
        ]),
      ),
    };
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      const result = applyExplorerAction(state, action, date, randomUUID());
      state = result.state;
      return result.feedback;
    };
    act({ type: "start", route: "memory" });
    const session = () => state.profile.definitions!.session!;
    expect(session().route).toBe("memory");
    let swapped = 0;
    while (!session().done) {
      const s = session();
      const task = s.queue[s.index]!;
      const card = definitionCard(task.cardId);
      const swap = task.kind === 0 && orderFreeCards.has(card.id);
      const source =
        task.kind === 0
          ? swap
            ? [1, 0]
            : [0, 1]
          : task.kind === 1
            ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [card.truth ? 1 : 0];
      if (swap) swapped++;
      const options = definitionOptions(s, task);
      const feedback = act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: source.map((i) => options.indexOf(i)),
      });
      expect({
        card: card.id,
        kind: task.kind,
        correct: feedback.correct,
      }).toEqual({
        card: card.id,
        kind: task.kind,
        correct: true,
      });
    }
    expect(swapped).toBe(
      unitCards.filter((card) => orderFreeCards.has(card.id)).length,
    );
    expect(swapped).toBeGreaterThan(0);
    expect(session().first).toBe(15);
    expect(session().unresolved).toEqual([]);
    expect(state.profile.stars).toBe(9);
    for (const card of unitCards)
      expect(state.profile.definitions!.cards[card.id]).toMatchObject({
        level: 2,
        reviewStep: 2,
        due: "2026-10-17",
        lastRecall: "remembered",
      });
  });
});
