/**
 * 교과서 행의 그림 글 고침 규칙 (D-164 ③④ · 2단계) — `scripts/qa/textbookFigureTextCore.ts`.
 * 위치 표현은 그림을 가리키는 말만 바꾸고(«다음 …»), 방향 뜻 · «아래 …» · «위 …» · 식 안은 안 바꾼다.
 * 자리 줄은 행마다 확인한 결정대로만 넣고, 보이는 글자는 위치 표현 말고 한 글자도 안 바뀐다.
 */
import { describe, expect, it } from "vitest";

import {
  applyPosition,
  dropFigureMarkers,
  placeSlots,
  rewritePositionRefs,
  sameVisibleText,
} from "../../../scripts/qa/textbookFigureTextCore";

const rewrite = (content: string) => rewritePositionRefs(content).content;

describe("㉠ 위치 표현 — 그림을 가리키는 말만 «다음 …»", () => {
  it("«오른쪽 그림 · 표 · 그래프 · 좌표평면 …» → «다음 …» (조사는 그대로)", () => {
    expect(rewrite("[그림] 오른쪽 그림과 같이 직사각형을 접었다.")).toBe(
      "[그림] 다음 그림과 같이 직사각형을 접었다.",
    );
    expect(rewrite("확률분포가 오른쪽 표와 같을 때")).toBe(
      "확률분포가 다음 표와 같을 때",
    );
    expect(rewrite("오른쪽 좌표평면 위의 점")).toBe("다음 좌표평면 위의 점");
    expect(rewrite("오른쪽 계산 과정에서")).toBe("다음 계산 과정에서");
    // «표준정규분포표»도 표다 — 앞의 «오른쪽»만 바뀐다
    expect(rewrite("오른쪽 표준정규분포표를 이용하여")).toBe(
      "다음 표준정규분포표를 이용하여",
    );
  });

  it("«오른쪽은 …» → «다음은 …» · «오른쪽과 같이» → «다음과 같이»", () => {
    expect(rewrite("[그림] 오른쪽은 어느 정육점의 가격표이다.")).toBe(
      "[그림] 다음은 어느 정육점의 가격표이다.",
    );
    expect(rewrite("그래프가 오른쪽과 같을 때")).toBe(
      "그래프가 다음과 같을 때",
    );
    expect(rewrite("오른쪽과 같이 조립제법을 이용하면")).toBe(
      "다음과 같이 조립제법을 이용하면",
    );
  });

  it("🔴 방향 뜻은 안 바꾼다 — 바꿀 표현 밖에 방향 낱말이 있으면 그 행은 규칙으로 안 바꾼다", () => {
    for (const content of [
      "오른쪽 도형을 왼쪽으로 옮기시오.",
      "첫 번째 그림의 왼쪽과 오른쪽은 각각 1번, 2번이고",
      "오른쪽 그림에서 직선 위쪽 부분의 넓이를 구하시오.",
      "두 수의 합을 아래쪽 칸에 써넣을 때, 오른쪽 그림의 빈칸을 채우시오.",
    ]) {
      const result = rewritePositionRefs(content);
      expect(result.content, content).toBe(content);
    }
    expect(
      rewritePositionRefs("오른쪽 도형을 왼쪽으로 옮기시오.").held,
    ).toMatch(/방향 낱말/);
  });

  it("그림을 가리키지 않는 것은 안 본다 — «오른쪽으로 3만큼» · «작은 수가 오른쪽에» · «아래 그림» · «위 식» · «단위 그림» · 식 안", () => {
    for (const content of [
      "점 P 를 오른쪽으로 $3$만큼 평행이동하시오.",
      "작은 수가 오른쪽에 오도록 쓰시오.",
      "아래 그림과 같이 놓았다.",
      "위 식의 양변에 $\\frac{1}{k}$를 곱하면",
      "좌표평면 위의 도형",
      "단위 그림 한 칸",
      "$\\text{오른쪽 그림}$",
      "$$\\text{오른쪽 그림}$$",
      "그림의 오른쪽은 빨간색이다.",
    ])
      expect(rewrite(content), content).toBe(content);
  });

  it("사람의 결정 — «다음은 오른쪽 그림의»처럼 «다음»이 겹치면 «아래», 방향 낱말이 그림 밖 뜻임을 읽은 행은 바꾼다", () => {
    expect(
      applyPosition("다음은 오른쪽 그림의 넓이를 구하는 과정이다.", {
        code: "x",
        word: "아래",
        reason: "다음 겹침",
      }).content,
    ).toBe("다음은 아래 그림의 넓이를 구하는 과정이다.");
    expect(
      applyPosition("오른쪽 그림에서 직선 위쪽 부분의 넓이를 구하시오.", {
        code: "x",
        word: "다음",
        force: true,
        reason: "위쪽은 그림 속 영역",
      }).content,
    ).toBe("다음 그림에서 직선 위쪽 부분의 넓이를 구하시오.");
    expect(
      applyPosition("오른쪽 그림과 같이", {
        code: "x",
        word: "skip",
        reason: "갈림",
      }).content,
    ).toBe("오른쪽 그림과 같이");
  });
});

describe("㉡ 그림 자리 — 결정대로만 · 보이는 글자는 그대로", () => {
  it("④ 번호만 남은 소문항 — 번호를 그 그림의 캡션으로", () => {
    const before = "다음 그림에서 $x$의 값을 구하시오.\n⑴ [그림] ⑵ [그림]";
    const after = placeSlots(before, {
      code: "J20602-B02-001",
      kind: "label",
      mapping: [
        { figure: 1, number: "⑴" },
        { figure: 2, number: "⑵" },
      ],
      evidence: "",
    });
    expect(after).toEqual({
      content: "다음 그림에서 $x$의 값을 구하시오.\n[그림:1] ⑴\n[그림:2] ⑵",
    });
    expect(
      sameVisibleText(before, (after as { content: string }).content),
    ).toBe(true);
  });

  it("④ 표지가 밀려난 행도 번호 차례대로 — 그림 차례가 다르면 결정대로 · 낱말과 조사 사이의 표지는 붙인다", () => {
    const before =
      "다음 그림에서 $l⫽m$일 때, $\\angle a$의 크기\n[그림] [그림] 를 각각 구하시오.\n⑴ ⑵";
    const after = placeSlots(before, {
      code: "x",
      kind: "label",
      mapping: [
        { figure: 2, number: "⑴" },
        { figure: 1, number: "⑵" },
      ],
      evidence: "",
    }) as { content: string };
    expect(after.content).toBe(
      "다음 그림에서 $l⫽m$일 때, $\\angle a$의 크기를 각각 구하시오.\n[그림:2] ⑴\n[그림:1] ⑵",
    );
    expect(sameVisibleText(before, after.content)).toBe(true);
  });

  it("④ 번호와 결정이 다르면 안 넣는다", () => {
    expect(
      placeSlots("다음을 구하시오.\n⑴ [그림] ⑵ [그림] ⑶ [그림]", {
        code: "x",
        kind: "label",
        mapping: [{ figure: 1, number: "⑴" }],
        evidence: "",
      }),
    ).toHaveProperty("why");
  });

  it("③ 설명 뒤 소문항 — 그림을 첫 소문항 앞에, 옛 표지는 걷는다", () => {
    const before =
      "다음은 지수가 달린 거리를 나타낸 그래프이다.\n[그림]\n⑴ 걸린 시간을 구하시오.\n⑵ 속력을 구하시오.";
    const after = placeSlots(before, {
      code: "x",
      kind: "desc",
      mapping: [{ figure: 1, number: "before-first" }],
      evidence: "",
    }) as { content: string };
    expect(after.content).toBe(
      "다음은 지수가 달린 거리를 나타낸 그래프이다.\n[그림:1]\n⑴ 걸린 시간을 구하시오.\n⑵ 속력을 구하시오.",
    );
    expect(sameVisibleText(before, after.content)).toBe(true);
  });

  it("③ 자료 줄의 제목 그림 — 홀로 선 표지 자리에(첫 소문항 앞이면 제목이 자료 아래로 간다)", () => {
    const before =
      "다음은 학생 $10$명이 운동한 날짜를 나타낸 것이다.\n[그림]\n$15$ $3$ $10$\n⑴ 크기순으로 나열하시오.\n⑵ 중앙값을 구하시오.";
    const after = placeSlots(before, {
      code: "x",
      kind: "desc",
      mapping: [{ figure: 1, number: "at-marker" }],
      evidence: "",
    }) as { content: string };
    expect(after.content).toBe(
      "다음은 학생 $10$명이 운동한 날짜를 나타낸 것이다.\n[그림:1]\n$15$ $3$ $10$\n⑴ 크기순으로 나열하시오.\n⑵ 중앙값을 구하시오.",
    );
    expect(sameVisibleText(before, after.content)).toBe(true);
  });

  it("표지를 걷어 갈린 서술격도 앞 낱말에 붙인다 — «직육면체 ⏎ [그림] [그림] 이다.»", () => {
    expect(
      dropFigureMarkers(
        "세 모서리가 좌표축 위에 있는 직육면체\n[그림] [그림] 이다. 좌표를 구하시오.",
      ),
    ).toBe("세 모서리가 좌표축 위에 있는 직육면체이다. 좌표를 구하시오.");
    // 낱말의 첫 글자일 뿐이면 안 붙인다(«인수분해»)
    expect(dropFigureMarkers("다음 식\n[그림] 인수분해하시오.")).toBe(
      "다음 식\n인수분해하시오.",
    );
  });

  it("③ 소문항마다 제 그림 — 그 소문항 글 뒤에", () => {
    const before =
      "다음 표를 완성하시오.\n⑴ 넓이가 $14$인 직사각형\n[그림]\n⑵ $1600$자를 입력하는 시간\n[그림]";
    const after = placeSlots(before, {
      code: "x",
      kind: "perSubq",
      mapping: [
        { figure: 1, number: "⑴" },
        { figure: 2, number: "⑵" },
      ],
      evidence: "",
    }) as { content: string };
    expect(after.content).toBe(
      "다음 표를 완성하시오.\n⑴ 넓이가 $14$인 직사각형\n[그림:1]\n⑵ $1600$자를 입력하는 시간\n[그림:2]",
    );
    expect(sameVisibleText(before, after.content)).toBe(true);
  });

  it("표지 걷기 — 표지만 선 줄은 줄째, 글 사이 표지는 빈칸 하나로", () => {
    expect(dropFigureMarkers("앞 글\n[그림]\n뒤 글")).toBe("앞 글\n뒤 글");
    expect(dropFigureMarkers("이차함수 [그림] $y=x^2$의 그래프")).toBe(
      "이차함수 $y=x^2$의 그래프",
    );
    expect(dropFigureMarkers("[그림] [그림] 다음 그림에서")).toBe(
      "다음 그림에서",
    );
  });
});
