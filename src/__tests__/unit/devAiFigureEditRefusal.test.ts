// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  editDevAiFigure,
  type FigureEditInference,
} from "@/lib/dev-ai/figure-edit";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";
import { FIGURE_CAPABILITY_REBUTTAL } from "@/lib/dev-ai/figure-refusal";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import type { FigureEditFigure } from "@/lib/dev-ai/figure-edit-contract";

vi.mock("server-only", () => ({}));

/**
 * «요청대로 고치기»에도 재작도와 같은 구멍이 있었다 — 모델이 «엔진이 한글을 못 그린다»고
 * 지어낸 거절을 내면 되묻지 않고 그대로 422 였다(트랙 31 이 재작도 쪽을 고치며 넘긴 것).
 * 이제 그런 거절에만 반박 한 줄을 붙여 **딱 한 번** 다시 묻는다.
 */
const figure: FigureEditFigure = {
  viewBox: [0, 0, 300, 240],
  elements: [
    {
      n: 1,
      kind: "선분",
      points: [
        [37, 26],
        [37, 206],
      ],
      color: "#111111",
      width: 1.9,
    },
  ],
  names: [
    { name: "A", x: 37, y: 26 },
    { name: "B", x: 37, y: 206 },
  ],
};
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "㉠ 자리에 한글로 «평행사변형»이라고 써 주세요.",
  figure,
};
const refusal = (note: string) => JSON.stringify({ commands: [], note });
const ok = JSON.stringify({ commands: [{ op: "delete", target: 1 }] });

describe("요청대로 고치기 — 엔진 탓 거절에는 한 번 되묻는다", () => {
  it("«엔진이 한글을 못 그린다» 류면 반박을 붙여 다시 묻고, 오면 그림이 나온다", async () => {
    const seen: string[] = [];
    const inference = vi.fn<FigureEditInference>(async (input) => {
      seen.push(input.prompt);
      return seen.length === 1
        ? refusal(
            "엔진이 한글 텍스트와 특수문자 라벨 렌더링을 지원하지 않습니다.",
          )
        : ok;
    });
    const result = await editDevAiFigure(request, undefined, inference);
    expect(result.edits).toEqual([{ op: "delete", target: 1 }]);
    expect(inference).toHaveBeenCalledTimes(2);
    // 첫 물음은 지금과 한 글자도 다르지 않다
    expect(seen[0]).toBe(buildFigureEditPrompt(request));
    // 반박은 **둘째 물음에만** 실린다
    expect(seen[0]).not.toContain(FIGURE_CAPABILITY_REBUTTAL);
    expect(seen[1]).toContain(FIGURE_CAPABILITY_REBUTTAL);
    expect(seen[1]).toContain("refusal-note-data");
  });

  it("되물어도 또 거절하면 422 로 사유를 싣고 **두 번으로 끝낸다**", async () => {
    const inference = vi.fn<FigureEditInference>(async () =>
      refusal("graph-1 엔진이 한글 라벨 렌더링을 지원하지 않습니다."),
    );
    await expect(
      editDevAiFigure(request, undefined, inference),
    ).rejects.toMatchObject({ status: 422 });
    expect(inference).toHaveBeenCalledTimes(2);
  });

  it("사진·손그림처럼 진짜 사유면 되묻지 않고 한 번으로 끝낸다", async () => {
    const inference = vi.fn<FigureEditInference>(async () =>
      refusal("원본이 손으로 그린 스케치라 요소를 가려낼 수 없습니다."),
    );
    await expect(
      editDevAiFigure(request, undefined, inference),
    ).rejects.toMatchObject({ status: 422 });
    expect(inference).toHaveBeenCalledTimes(1);
  });

  it("사유 없이 빈 명령이면 되묻지 않는다 — 할 수 있는 것을 알려 줄 뿐", async () => {
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [], note: "" }),
    );
    await expect(
      editDevAiFigure(request, undefined, inference),
    ).rejects.toThrow(/할 수 없습니다/);
    expect(inference).toHaveBeenCalledTimes(1);
  });

  it("한 번에 되면 지금처럼 한 번만 부른다", async () => {
    const inference = vi.fn<FigureEditInference>(async () => ok);
    const result = await editDevAiFigure(request, undefined, inference);
    expect(result.edits).toEqual([{ op: "delete", target: 1 }]);
    expect(inference).toHaveBeenCalledTimes(1);
  });
});

/**
 * 원장님 2026-09-21 — «15라고 해서 요소 15를 보지 말란 뜻이야. 15는 화면상에 존재하는 숫자(텍스트) 15를 찾는 것» ·
 * «A라고 해도 그룹 A가 아닌 점 A를 찾아야 함» · «그룹 A라고 따로 지시하지 않는 이상 그룹은 신경쓰지 않도록».
 * 번호와 묶음 이름은 **부를 때만 쓰는 손잡이**지 원장님이 관리할 물건이 아니다.
 */
describe("맨 숫자·맨 글자를 무엇으로 읽는가", () => {
  const prompt = buildFigureEditPrompt(request);

  it("맨 숫자는 그려진 글자이지 요소 번호가 아니다", () => {
    expect(prompt).toContain("A bare number in the request");
    expect(prompt).toContain("It does NOT mean element n = 15");
  });

  it("맨 글자는 점 이름이지 묶음 이름이 아니다", () => {
    expect(prompt).toContain("A bare letter");
    expect(prompt).toContain("It does NOT mean the group named A");
  });

  it("요소 번호·묶음은 **그렇게 말했을 때만** 쓴다", () => {
    expect(prompt).toContain("요소 15");
    expect(prompt).toContain("그룹 A");
  });

  it("못 찾으면 요소 번호로 미끄러지지 않고 사유를 적는다", () => {
    expect(prompt).toContain("do not fall back to the element number");
  });

  it("이 규칙은 한 벌뿐이다", () => {
    const once = (text: string) => prompt.split(text).length - 1;
    expect(once("A bare number in the request")).toBe(1);
    expect(once("A bare letter")).toBe(1);
  });
});
