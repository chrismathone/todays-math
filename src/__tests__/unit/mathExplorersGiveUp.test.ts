/**
 * **«아직 모르겠어요»는 세 활동 모두에서 «모름 = 그 활동의 오답»이다** (2026-10-03 3자 합의 S1 — 3:0).
 *
 * 개념 활동 화면에는 세 활동(문장 조립 · 예 모으기 · 경계 살피기) 모두에 «아직 모르겠어요» 단추가 있고, 누르면 **빈 답**을 보낸다
 * (`ExplorerPractice.tsx` — `submit([])`). 그런데 엔진은 답의 개수부터 봤다: 문장 조립은 둘, 경계 살피기는 하나가 아니면
 * «답을 다시 확인해주세요.»(400). 예 모으기만 빈 답을 받았다. 곧 **세 활동 중 둘에서 학생이 «모른다»고 할 수 없었다** —
 * 단추를 누르면 오류 줄이 뜨고 같은 문제에 그대로 머문다. 보충 카드도 같았다.
 *
 * 화면 시험은 `onAction` 이 빈 답으로 불리는 것까지만 봤고(`AnswerKeys.test.tsx`), 서버 시험에 빈 답을 보내는 것이 없었다.
 *
 * 합의한 뜻: 빈 답은 **모름** — 그 활동의 오답으로 받아 재도전 줄에 넣고, 첫 시도 정답으로 세지 않는다.
 * 🔴 풀어 주는 것은 «빈 답» 하나뿐이다. 개수가 어긋난 **비어 있지 않은** 답 · 범위 밖 번호는 지금처럼 거절한다.
 */
import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ExplorerAction } from "@/contracts/mathExplorers.contract";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
  ExplorerActionInvalid,
  explorerView,
} from "@/lib/math-explorers/engine";

const KIND = ["문장 조립", "예 모으기", "경계 살피기"] as const;

function fixture() {
  let state = createExplorerState("student-giveup", 3);
  const date = "2026-10-03";
  const act = (action: ExplorerAction) => {
    const result = applyExplorerAction(state, action, date, randomUUID());
    state = result.state;
    return result;
  };
  const session = () => state.profile.definitions!.session!;
  /** 읽기 단계면 읽고, 지금 풀 활동을 돌려준다. */
  const current = () => {
    if (definitionNeedsRead(state.profile, session()))
      act({ type: "read", questionId: definitionQuestionId(session()) });
    const s = session();
    return { s, task: s.queue[s.index]! };
  };
  const right = () => {
    const { s, task } = current();
    const card = definitionCard(task.cardId);
    const ids =
      task.kind === 0
        ? [0, 1]
        : task.kind === 1
          ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
          : [card.truth ? 1 : 0];
    const options = definitionOptions(s, task);
    return act({
      type: "answer",
      questionId: definitionQuestionId(s),
      choiceIds: ids.map((id) => options.indexOf(id)),
    });
  };
  return {
    act,
    session,
    current,
    right,
    state: () => state,
    view: () => explorerView(state, date),
  };
}

describe("개념 활동 — 빈 답은 모름이다", () => {
  it.each([0, 1, 2] as const)(
    "%i번 갈래 — 던지지 않고, 오답으로 넘어가 재도전 줄에 선다",
    (kind) => {
      const f = fixture();
      f.act({ type: "start", route: "unit", unitId: "factors" });
      // 그 갈래의 활동이 나올 때까지 맞히며 간다.
      for (let safety = 0; f.current().task.kind !== kind; safety += 1) {
        if (safety > 20) throw new Error(`${KIND[kind]} 활동을 못 만났다`);
        f.right();
      }
      const { s: before, task } = f.current();
      const beforeIndex = before.index;
      const beforeFirst = before.first;
      const questionId = definitionQuestionId(before);

      const result = f.act({ type: "answer", questionId, choiceIds: [] });

      const after = f.session();
      expect(after.index, KIND[kind]).toBe(beforeIndex + 1);
      // 첫 시도 정답으로 세지 않는다 · 그 카드는 «첫 바퀴에 틀린 카드»다 · 그 활동은 재도전 줄에 있다.
      expect(after.first).toBe(beforeFirst);
      expect(after.initialWrong).toContain(task.cardId);
      expect(
        after.next.some(
          (t) => t.cardId === task.cardId && t.kind === task.kind,
        ),
      ).toBe(true);
      expect(result.feedback.correct ?? false).toBe(false);
    },
  );

  it("🔴 풀어 주는 것은 빈 답뿐이다 — 조각 하나만 고른 문장 조립은 여전히 거절한다", () => {
    const f = fixture();
    f.act({ type: "start", route: "unit", unitId: "factors" });
    for (let safety = 0; f.current().task.kind !== 0; safety += 1) {
      if (safety > 20) throw new Error("문장 조립을 못 만났다");
      f.right();
    }
    const { s } = f.current();
    expect(() =>
      f.act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: [0],
      }),
    ).toThrow(ExplorerActionInvalid);
    // 거절된 답은 진행을 안 먹는다.
    expect(f.session().index).toBe(s.index);
  });

  it("전부 «모르겠어요»로 가도 판이 끝난다 — 미해결로 남고, 카드는 오르지 않는다", () => {
    const f = fixture();
    f.act({ type: "start", route: "unit", unitId: "factors" });
    for (let safety = 0; !f.session().done; safety += 1) {
      if (safety > 80) throw new Error("끝나지 않는다");
      const { s } = f.current();
      f.act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: [],
      });
    }
    const done = f.session();
    expect(done.first).toBe(0);
    expect(done.unresolved.length).toBe(15);
    // 첫 풀이 + 재도전 세 바퀴 — 한 활동 최대 네 번.
    expect(done.round).toBe(3);
  });
});

describe("보충 카드 — 빈 답은 모름이다", () => {
  it("문장 조립 · 경계 살피기에서도 던지지 않고 재도전 줄에 넣는다", () => {
    const f = fixture();
    // 단원을 다 맞혀 끝내야 그 단원의 보충 카드가 열린다.
    f.act({ type: "start", route: "unit", unitId: "g3-shapes" });
    for (let safety = 0; !f.session().done; safety += 1) {
      if (safety > 60) throw new Error("끝나지 않는다");
      f.right();
    }
    f.act({ type: "supplement-start", cardId: "sup-line" });
    const read = f.view().supplements!.activity!;
    expect(read.kind).toBe("read");
    f.act({ type: "supplement-read", questionId: read.questionId });

    const seen: string[] = [];
    for (let safety = 0; safety < 3; safety += 1) {
      const activity = f.view().supplements!.activity!;
      seen.push(activity.kind);
      f.act({
        type: "supplement-answer",
        questionId: activity.questionId,
        choiceIds: [],
      });
    }
    expect(seen.sort()).toEqual(["assemble", "examples", "truth"]);
    // 세 활동을 다 «모름»으로 넘겼다 — 둘째 바퀴가 세 활동으로 다시 선다.
    expect(f.view().supplements!.session).toMatchObject({
      round: 1,
      index: 0,
      total: 3,
    });
  });
});
