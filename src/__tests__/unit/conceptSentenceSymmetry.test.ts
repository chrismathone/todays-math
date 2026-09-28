/**
 * 보정 23장 대칭 검사 — 문장 조립 채점은 **자리 그대로**(첫 빈칸 = 정답 첫 조각, 둘째 빈칸 = 정답 둘째 조각)라, 두 정답 조각을
 * 맞바꿔도 참인 문장이면 맞는 답을 틀렸다고 친다(첫 판 14/15 · 기억 복습이면 차례가 처음으로). 리드 적대적 검토 ①(2026-09-28)이
 * 분수의 곱셈 «두 분수의 {분자끼리} 곱한 값과 {분모끼리} 곱한 값으로»를 잡았고, 이 검사가 피타고라스 «{a²+b²}={c²}»를 더 잡았다.
 *
 * 뜻은 코드가 못 가리므로, 맞바꾼 문장을 Claude · codex · grok 이 따로 읽고(3자 모두 «참»은 8 · 12 뿐 — 둘 다 고침) 거짓인 까닭을
 * 적은 **감사 표**를 둔다. 카드 문장이 바뀌면 맞바꾼 문장이 표와 달라져 빨개진다 — 다시 읽고 까닭을 적어야 초록이다.
 * 기계 검사 하나를 곁들인다: 가운데 조각이 «=» · «…과» · «…와»로 끝나면(두 조각이 대등하게 이어지는 꼴) 멈춘다.
 *
 * (넓은 검사 — 정답이 아닌 모든 채움 11개 × 23장 — 에서 셋 다 참으로 본 것은 «나눗셈과 크기»의 활용형 채움 셋뿐이다.
 * 원래 카드의 말을 물려받은 것이라 이 표의 범위 밖 — 리드 결정 대기.)
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cardFixes } from "@/lib/math-explorers/conceptSentenceFixes";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";

/** 카드 id → [맞바꾼 문장, 거짓인 까닭]. */
const SWAP_AUDIT: Record<string, [string, string]> = {
  "g6-net": [
    "각기둥이나 각뿔을 평면를 따라 잘라 모서리 위에 펼친 그림.",
    "평면을 따라 자를 수도, 모서리 위에 펼칠 수도 없다 — 말이 안 됨",
  ],
  "g8-two-variable": [
    "ax+by+c=0에서 a, b가 순서쌍 방정식이며 해를 둘 다 0이 아닌으로 나타낸다.",
    "말이 안 됨",
  ],
  "g8-simultaneous": [
    "둘 이상의 방정식을 해 나타낸 것이며, 모든 방정식을 함께 참이 되게 하는 값을 그 한데 묶어라고 한다.",
    "말이 안 됨",
  ],
  "g8-substitution": [
    "연립방정식의 한 식에서 구한 미지수의 표현을 넣어에 다른 식 푸는 방법.",
    "말이 안 됨",
  ],
  "g8-elimination": [
    "연립방정식을 풀 때 두 식을 더하거나 빼서 한 없애는를 미지수 방법.",
    "말이 안 됨",
  ],
  "g9-axis": [
    "y=a(x−p)²+q 그래프의 대칭축은 직선 x축이며 꼭짓점을 지나고 x=p에 수직이다.",
    "대칭축은 x축이 아니다(x축은 꼭짓점을 지나지도 않는다) — 거짓",
  ],
  "g9-parabola": [
    "이차함수 그래프처럼 한 축에 대하여 아래로 볼록인 곡선으로 a>0이면 대칭하다.",
    "«축에 대하여 볼록» · «대칭하다» — 말이 안 됨",
  ],
  "g8-pythagoras": [
    "직각삼각형에서 빗변이 아닌 두 변의 길이의 제곱은 빗변의 길이의 제곱의 합과 같다.",
    "빗변 하나에는 «제곱의 합»이 없고, 두 변 쪽은 합이 아니라 제곱 하나가 된다 — 거짓",
  ],
  "g8-complement": [
    "어떤 사건이 일어나지 않을 확률은 뺀에서 그 사건의 확률을 1 값이다.",
    "말이 안 됨",
  ],
  "g6-divide-size": [
    "0보다 큰 수를 0과 1 사이의 수로 나누면 몫은 원래 수보다 작아진다, 1보다 큰 수로 나누면 커지고.",
    "커지고 작아지는 쪽이 거꾸로 — 거짓",
  ],
  "g5-operation-order": [
    "덧셈·뺄셈과 곱셈·나눗셈이 섞인 식은 괄호 안을 먼저, 그다음 왼쪽을 하고, 같은 단계끼리는 곱셈·나눗셈부터 계산한다.",
    "«왼쪽을 하고» — 말이 안 됨",
  ],
  "g5-fraction-multiply": [
    "대분수는 가분수로 바꾼 뒤, 분모끼리 곱한 값을 분자로, 분자끼리 곱한 값을 분모로 하는 분수를 만든다.",
    "분자 · 분모가 뒤바뀐 분수(곱의 역수) — 거짓",
  ],
  "g7-vertical-angle": [
    "서로 엇갈리는 두 직선이 만드는 마주 보는 가운데 꼭짓점을 사이에 두고 네 각 두 각.",
    "말이 안 됨",
  ],
  "g9-inscribed-angle": [
    "원 위의 현을 꼭짓점으로 하고 두 변이 원의 한 점을 포함하는 각.",
    "현(선분)은 꼭짓점이 될 수 없다 — 거짓",
  ],
  "g6-ratio": [
    "두 양의 크기를 a:b으로 견주기 위해 나눗셈처럼 나타낸 것.",
    "비는 나눗셈으로 견주는 것을 a:b 로 적은 것 — 뜻이 거꾸로 흐려진다(codex «애매», 참으로 본 답 없음)",
  ],
  "g9-correlation": [
    "두 변량 중 한쪽이 변할 때 다른 쪽도 양의 상관관계 경향이 있는 관계이며, 함께 커지는 쪽이면 함께 변하는이다.",
    "말이 안 됨",
  ],
  "g8-cases": [
    "한 사건에 해당하는 개수를 빠짐없이 센 가능한 결과.",
    "경우의 수(센 개수)가 아니라 결과가 된다 — 거짓",
  ],
  "g9-vertex": [
    "포물선이 (p, q)과 만나는 점이며, y=a(x−p)²+q의 그래프에서는 축이다.",
    "말이 안 됨",
  ],
  "g7-origin": ["좌표평면에서 만나는 점이 두 좌표축.", "말이 안 됨"],
  "g9-double-root": [
    "이차방정식이 그 근을 가질 때의 서로 같은 두 근.",
    "중근은 겹친 한 근 — 말이 제자리를 돈다(codex «애매», 참으로 본 답 없음)",
  ],
  "g3-right-angle": [
    "종이를 한 번 접은 뒤 접힌 선끼리 각 다시 접으면 모서리에 생기는 포개지게.",
    "말이 안 됨",
  ],
  "g8-exponent-law": [
    "밑이 같은 거듭제곱을 곱할 때 밑은 그대로 두고 지수를 곱한다, 거듭제곱의 거듭제곱은 지수를 더하며.",
    "두 법칙이 뒤바뀜 — 거짓",
  ],
  "g6-cone-sphere": [
    "원뿔은 원 모양의 밑면과 모두 같은이 있고, 구는 중심에서 겉면의 어느 점까지나 거리가 한 꼭짓점 입체도형이다.",
    "말이 안 됨",
  ],
};

const swapped = (id: string) => {
  const card = definitionCard(id);
  return (
    card.pieces[0] +
    card.words[1] +
    card.pieces[1] +
    card.words[0] +
    card.pieces[2]
  );
};
// 두 조각이 대등하게 이어지는 가운데 조각 — «A = B» · «A과 B» · «A와 B» · «A 및 B»
const SYMMETRIC_JOIN = /(=|과|와|및)\s*$/;

describe("보정 23장 — 빈칸 두 조각을 맞바꾼 문장이 정답과 같은 뜻이 되지 않는다(리드 적대적 검토 ①)", () => {
  it("감사 표 = 보정 23장", () => {
    expect(Object.keys(SWAP_AUDIT).sort()).toEqual(
      Object.keys(cardFixes).sort(),
    );
  });

  it.each(Object.keys(cardFixes))(
    "%s — 맞바꾼 문장이 감사 표에 읽고 적은 그대로다(문장이 바뀌면 다시 읽을 것)",
    (id) => {
      const [audited, why] = SWAP_AUDIT[id]!;
      expect(swapped(id)).toBe(audited);
      expect(why.length).toBeGreaterThan(0);
      expect(swapped(id)).not.toBe(definitionCard(id).definition);
    },
  );

  it("가운데 조각이 대등하게 잇는 꼴(«=» · «…과» · «…와»)이 아니다 — 고치기 전 두 문장은 이 검사에 걸린다", () => {
    for (const id of Object.keys(cardFixes))
      expect({ id, middle: definitionCard(id).pieces[1] }).not.toSatisfy(
        ({ middle }: { middle: string }) => SYMMETRIC_JOIN.test(middle),
      );
    // 자기 시험 — 고치기 전 분수의 곱셈 · 피타고라스의 가운데 조각
    expect(SYMMETRIC_JOIN.test(" 곱한 값과 ")).toBe(true);
    expect(SYMMETRIC_JOIN.test("=")).toBe(true);
  });

  it("채점은 자리 그대로다 — 엔진에 맞바꿔 넣으면 틀림(그래서 이 표가 필요하다)", () => {
    const card = definitionCard("g9-axis"); // 조각 활동이 끼지 않는 단원
    let state = createExplorerState("student-symmetry", 9);
    const date = "2026-09-28";
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      const result = applyExplorerAction(state, action, date, randomUUID());
      state = result.state;
      return result.feedback;
    };
    act({ type: "start", route: "unit", unitId: card.unit });
    const session = () => state.profile.definitions!.session!;
    for (;;) {
      const s = session();
      if (definitionNeedsRead(state.profile, s)) {
        act({ type: "read", questionId: definitionQuestionId(s) });
        continue;
      }
      const task = s.queue[s.index]!;
      const options = definitionOptions(s, task);
      if (task.cardId === card.id && task.kind === 0) {
        const feedback = act({
          type: "answer",
          questionId: definitionQuestionId(s),
          choiceIds: [options.indexOf(1), options.indexOf(0)],
        });
        expect(feedback.correct).toBe(false);
        expect(session().initialWrong).toContain(card.id);
        return;
      }
      const other = definitionCard(task.cardId);
      const source =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? other.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [other.truth ? 1 : 0];
      act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: source.map((i) => options.indexOf(i)),
      });
    }
  });
});
