/**
 * 인식 지시문 — 블록 수식(`equation_block`)은 원본에서 수식이 **홀로 한 줄**일 때만.
 *
 * 원장님 2026-09-21 «수식 혼자 한줄을 떡하니 차지하는건 왜 그런거야?» — 경운중 3학년
 * 25-1 기말 7번. 원본은 «…이차방정식⏎x²−ax+4=0의 해가 …» 로, 수식이 줄바꿈 때문에
 * 둘째 줄 머리에 왔을 뿐 같은 줄에 «의 해가»가 이어진다(크롭 그림으로 확인).
 *
 * 그리는 쪽은 원인이 아니다 — 인라인 `$…$` 는 앞에 줄바꿈이 있어도 편집기·검수 카드·지면
 * 셋 다 같은 줄에 선다(`e2e/body-typeset` 가 잰다). 혼자 한 줄을 차지하는 것은 `$$…$$`
 * 뿐이고, `$$` 는 인식이 `equation_block` 을 냈을 때 `blocksToMarkdown` 이 만든다.
 * 인식 지시문에는 `equation_block` 을 언제 쓰는지 기준이 «독립행/디스플레이» 한 마디뿐이었다.
 *
 * 줄머리 수식(인라인)과 정말 홀로 선 수식(블록)은 **원본 그림으로만** 갈린다 — 블록 뒤
 * 글이 조사로 시작하는 것은 둘 다 같다(«에 대하여», «일 때»). 그래서 규칙을 코드가 아니라
 * 그림을 보는 인식 지시문에 둔다.
 */
import { describe, expect, it } from "vitest";

import { buildMathgenOcrPrompt } from "@/lib/mathgen/prompts";

describe("인식 지시문 — 블록 수식 기준", () => {
  const prompt = buildMathgenOcrPrompt("");

  it("equation_block 은 원본에서 그 줄에 수식만 홀로 있을 때만 쓴다", () => {
    expect(prompt).toContain("그 줄에 수식만 홀로 인쇄되어 있을 때만");
  });

  it("줄바꿈으로 줄머리에 온 수식은 인라인이다 — 7번 모양의 잘못된 예와 올바른 예", () => {
    expect(prompt).toContain("줄바꿈으로 줄머리");
    expect(prompt).toContain(
      '{"type":"equation_block","value":"x^2-ax+4=0"}, {"type":"text","value":"의 해가 "}',
    );
    expect(prompt).toContain(
      '{"type":"equation","value":"x^2-ax+4=0"}, {"type":"text","value":"의 해가 "}',
    );
  });

  it("판단이 서지 않으면 인라인이다 — 한국 시험지는 인라인이 기본", () => {
    expect(prompt).toContain("판단이 서지 않으면 equation");
  });
});
