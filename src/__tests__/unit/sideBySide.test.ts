import { describe, expect, it } from "vitest";
import { boxHeaderMarkdown, parseBoxHeader } from "@/lib/math/boxHeader";
import { splitBoxSegments } from "@/lib/math/boxBlock";
import { boxFitSteps, fitBoxColumns } from "@/lib/math/boxFit";
import { layoutQuotedBoxes } from "@/lib/math/boxLayout";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { estimateProblemPx, JASEUP_RULER } from "@/lib/printOverflow";

import { SIDE_Q } from "../fixtures/sideBySide";

/**
 * «나란히» 묶음 — 소문항·그림을 1~4열로 (원장님 2026-09-22 확정).
 *
 * 원장님: «이런 보기들도 2열 4열 등으로 배치가능하게. 1열 고정같은데». 서답형 소문항 (1)~(4) 가 저마다
 * 그림을 달고 한 줄에 하나씩 세로로만 쌓였다. 내용 수정에서 소문항들을 고르고 [나란히] 를 누르면
 * **테두리·제목 없는** 칸 묶음 `> <나란히:cols=N>` 이 된다 — 〈보기〉 상자의 칸 배치(한 줄 = 한 칸)를 그대로 쓴다.
 */

describe("머리 표기 — `<나란히:cols=N>`, N 은 1~4", () => {
  it.each([
    ["<나란히:cols=4>", { label: "나란히", cols: 4 }],
    ["<나란히:cols=2>", { label: "나란히", cols: 2 }],
    ["<나란히4>", { label: "나란히", cols: 4 }],
    ["<나란히>", { label: "나란히", cols: null }],
    ["\\<나란히:cols=3\\>", { label: "나란히", cols: 3 }],
  ])("%s", (text, expected) => {
    expect(parseBoxHeader(text)).toMatchObject(expected);
  });

  it("쓰기도 정본 하나 — 1열은 맨 `<나란히>`, 2~4열은 `:cols=N`", () => {
    expect(boxHeaderMarkdown("나란히", 4)).toBe("<나란히:cols=4>");
    expect(boxHeaderMarkdown("나란히", 2)).toBe("<나란히:cols=2>");
    expect(boxHeaderMarkdown("나란히", 1)).toBe("<나란히>");
  });

  it("🔒 〈보기〉·〈조건〉 은 그대로 1~3열 — 4열 머리는 머리가 아니다(이번 범위는 나란히)", () => {
    expect(parseBoxHeader("<보기:cols=4>")).toBeNull();
    expect(parseBoxHeader("<조건4>")).toBeNull();
    expect(parseBoxHeader("<나란히:cols=5>")).toBeNull();
    expect(boxHeaderMarkdown("보기", 3)).toBe("<보기:cols=3>");
  });
});

describe("칸 — 〈보기〉 와 같은 규칙(한 줄 = 한 칸)", () => {
  it("여러 열이면 칸마다 문단으로 — 지면·검수 카드가 «문단 하나 = 칸 하나» 만 안다", () => {
    expect(layoutQuotedBoxes(SIDE_Q)).toContain(
      "> <나란히:cols=2>\n>\n> (1) [그림1] \\[2점\\]\n>\n> (2) [그림2] \\[2점\\]\n>\n> (3)",
    );
  });

  it("1열 `<나란히>` 는 한 글자도 안 바꾼다 — 그림 자리로 열 수를 추정하지 않는다(원장님이 고른 값)", () => {
    const one = SIDE_Q.replace("<나란히:cols=2>", "<나란히>");
    const inRow = (index: number) => ({
      x: 0.1 + index * 0.2,
      y: 0.5,
      width: 0.15,
      height: 0.1,
    });
    expect(layoutQuotedBoxes(one, { figureRect: inRow })).toBe(one);
  });

  it("지면 파서(`splitBoxSegments`)가 묶음을 칸 넷으로 — 평문으로 녹이지 않는다", () => {
    const box = splitBoxSegments(SIDE_Q).find(
      (segment) => segment.kind === "box",
    );
    expect(box).toMatchObject({
      kind: "box",
      label: "나란히",
      cols: 2,
      native: true,
      items: [
        "(1) [그림1] \\[2점\\]",
        "(2) [그림2] \\[2점\\]",
        "(3) [그림3] \\[2점\\]",
        "(4) [그림4]",
      ],
    });
  });

  it("문항 파서를 거쳐도 머리·칸이 그대로 — 소문항 번호에서 문단이 갈리지 않는다", () => {
    const { question } = parseProblemContent(SIDE_Q);
    expect(question).toContain("> <나란히:cols=2>");
    const quoted = question
      .split("\n")
      .filter((line) => /^>\s*\(\d\)/.test(line));
    expect(quoted).toHaveLength(4);
  });
});

describe("좁은 단 — 4열에서 시작해 여백을 줄이고, 그다음 열을 줄인다", () => {
  it("4열: 4 → 4 좁게 → 3 → 3 좁게 → 2 → 2 좁게 → 1", () => {
    expect(boxFitSteps(4)).toEqual([
      { cols: 4, tight: false },
      { cols: 4, tight: true },
      { cols: 3, tight: false },
      { cols: 3, tight: true },
      { cols: 2, tight: false },
      { cols: 2, tight: true },
      { cols: 1, tight: false },
    ]);
  });

  it("칸이 한 줄에 안 들면 4 → 3 → 2 로 내려간다", () => {
    // 칸 폭 모형: 테두리·여백 없는 묶음(좌우 여백 0), 칸 사이 24 · 좁게 10.
    const trackAt =
      (width: number) => (step: { cols: number; tight: boolean }) =>
        (width - (step.cols - 1) * (step.tight ? 10 : 24)) / step.cols;
    const naturals = [70, 70, 70, 70];
    expect(
      fitBoxColumns({ written: 4, naturals, trackAt: trackAt(360) }),
    ).toEqual({ cols: 4, tight: false });
    expect(
      fitBoxColumns({ written: 4, naturals, trackAt: trackAt(320) }),
    ).toEqual({ cols: 4, tight: true });
    expect(
      fitBoxColumns({ written: 4, naturals, trackAt: trackAt(280) }),
    ).toEqual({ cols: 3, tight: false });
    expect(
      fitBoxColumns({ written: 4, naturals, trackAt: trackAt(170) }),
    ).toEqual({ cols: 2, tight: false });
  });
});

describe("인쇄 높이 추정 — 제목·테두리 없는 묶음, 행 수로 센다", () => {
  const cells = ["(1) 가", "(2) 나", "(3) 다", "(4) 라"];
  const side = (cols: 1 | 2 | 4) =>
    `다음 물음에 답하시오.\n\n> ${boxHeaderMarkdown("나란히", cols)}\n${cells.map((cell) => `> ${cell}`).join("\n")}`;
  const box = `다음 물음에 답하시오.\n\n> <보기:cols=2>\n${cells.map((cell) => `> ${cell}`).join("\n")}`;
  const { line } = JASEUP_RULER;

  it("2열 넷은 두 행 — 4열이면 한 행, 1열이면 네 행", () => {
    const two = estimateProblemPx(side(2));
    const four = estimateProblemPx(side(4));
    const one = estimateProblemPx(side(1));
    expect(two - four).toBeGreaterThanOrEqual(line);
    expect(one - two).toBeGreaterThanOrEqual(2 * line);
  });

  it("라벨 줄·테두리·안쪽 여백을 세지 않는다 — 같은 칸의 〈보기〉 2열보다 낮다", () => {
    expect(estimateProblemPx(box) - estimateProblemPx(side(2))).toBeGreaterThan(
      JASEUP_RULER.boxChrome / 2,
    );
  });

  it("칸 글이 넷에 안 들면 지면처럼 열을 줄여 센다(같은 `fitBoxColumns`)", () => {
    const long = `다음 물음에 답하시오.\n\n> <나란히:cols=4>\n${cells
      .map(
        (cell) =>
          `> ${cell} 이 칸의 글은 한 줄로는 넷이 나란히 들어가지 않을 만큼 길다`,
      )
      .join("\n")}`;
    const short = side(4);
    expect(
      estimateProblemPx(long) - estimateProblemPx(short),
    ).toBeGreaterThanOrEqual(line);
  });
});
