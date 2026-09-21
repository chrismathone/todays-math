import type { JSONContent } from "@tiptap/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { documentMarkdown } from "@/components/math/editor/visualDocument";

/**
 * 트랙 46 (2026-09-21) — 검수 카드가 지면과 **같은 격자**로 〈보기〉 를 그린다.
 *
 * 원장님: «그림이 이상하게 배열되고 있네. 문제 안에 여러 그림이 있을 경우 원본을 어기고».
 * 문제 22 는 원본 〈보기〉 가 그림 넷의 2열 2행인데 검수 카드에서 한 열로 쌓였다.
 * 열 수는 공용 규칙(`layoutQuotedBoxes`)이 정한다 — 적힌 `<보기:cols=N>` → 원본 그림 자리 → 1열.
 */

// 작업실 그림은 자산 주소(`/api/library/assets/…`)다 — 시험에서는 그 모양만 흉내 낸다.
const pixel = (n: number) => `/api/library/assets/figure-${n}`;

/** 작업실 검수 카드가 넘기는 모양 — 원본 쪽 비율 rect 를 [yMin,xMin,yMax,xMax]×1000 으로. */
const Q22_FIGURES = [
  { x: 0.1044, y: 0.6173, width: 0.1718, height: 0.0921 },
  { x: 0.3086, y: 0.6176, width: 0.13, height: 0.0871 },
  { x: 0.1029, y: 0.7401, width: 0.1511, height: 0.06 },
  { x: 0.3074, y: 0.7369, width: 0.1296, height: 0.0643 },
].map((rect, index) => ({
  imageData: pixel(index),
  label: `그림 ${index + 1}`,
  box: [
    rect.y * 1000,
    rect.x * 1000,
    (rect.y + rect.height) * 1000,
    (rect.x + rect.width) * 1000,
  ] as [number, number, number, number],
}));

const Q22 =
  "아래 보기에서 $\\angle x$의 크기가 큰 것부터 순서대로 바르게 나열한 것은?\n\n> <보기>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n① ㄹ-ㄷ-ㄱ-ㄴ ② ㄹ-ㄷ-ㄴ-ㄱ ③ ㄷ-ㄹ-ㄱ-ㄴ ④ ㄹ-ㄱ-ㄷ-ㄴ ⑤ ㄱ-ㄴ-ㄷ-ㄹ";

function card(value: string, figures?: typeof Q22_FIGURES) {
  const { container } = render(
    <SourceEditorDisplay value={value} figures={figures} />,
  );
  const box = container.querySelector<HTMLElement>("[data-condition-box]");
  const grid = box?.querySelector(".grid");
  return {
    box,
    cols: box?.getAttribute("data-condition-box"),
    cells: grid ? [...grid.children] : [],
    text: box?.textContent ?? "",
  };
}

describe("검수 카드 〈보기〉 격자 — 지면과 같은 열 수", () => {
  it("문제 22: 원본 그림 자리로 2열 — 그림 넷이 칸마다 하나씩", () => {
    const { cols, cells } = card(Q22, Q22_FIGURES);
    expect(cols).toBe("2");
    expect(cells).toHaveLength(4);
    cells.forEach((cell, index) => {
      expect(cell.textContent).toContain("ㄱㄴㄷㄹ"[index]);
      expect(cell.querySelector("img")).not.toBeNull();
    });
  });

  it("그림 자리를 모르면 예전처럼 1열", () => {
    expect(card(Q22).cols).toBe("1");
  });

  it("정본 `<보기:cols=3>` — 세 열, 머리에 `cols` 가 안 보인다", () => {
    const { cols, cells, text } = card(
      "> <보기:cols=3>\n> (가) $a$\n> (나) $b$\n> (다) $c$",
    );
    expect(cols).toBe("3");
    expect(cells).toHaveLength(3);
    expect(text).toContain("<보기>");
    expect(text).not.toContain("cols");
  });

  it("옛 표기 `<보기2>` 도 두 열", () => {
    expect(card("> <보기2>\n> ㄱ. 참\n> ㄴ. 거짓").cols).toBe("2");
  });

  it("`<조건:cols=2>` — 조건 머리는 칸이 아니라 머리다", () => {
    const { cols, cells, text } = card(
      "> <조건:cols=2>\n> (가) $a>0$\n> (나) $b<0$",
    );
    expect(cols).toBe("2");
    expect(cells).toHaveLength(2);
    expect(cells[0]!.textContent).toContain("(가)");
    expect(text).toContain("<조건>");
    expect(text).not.toContain("cols");
  });

  it("한 줄에 항목 셋인 9번 저장본에 3열을 적으면 여섯 칸 — 지면과 같다", () => {
    const { cells } = card(
      "> <보기:cols=3>\n> (가) $a$ (나) $b$ (다) $c$\n> (라) $d$ (마) $e$ (바) $f$",
    );
    expect(cells.map((cell) => cell.textContent?.slice(0, 3))).toEqual([
      "(가)",
      "(나)",
      "(다)",
      "(라)",
      "(마)",
      "(바)",
    ]);
  });
});

describe("편집기 저장 — 열 수는 정본 하나로", () => {
  const box = (cols: number, header: JSONContent[], ...rows: string[]) => ({
    type: "doc",
    content: [
      {
        type: "conditionBox",
        attrs: { cols },
        content: [
          { type: "paragraph", content: header },
          ...rows.map((row) => ({
            type: "paragraph",
            content: [{ type: "text", text: row }],
          })),
        ],
      },
    ],
  });
  const bold = (text: string): JSONContent[] => [
    { type: "text", text, marks: [{ type: "bold" }] },
  ];

  it("〈보기〉 2열은 `<보기:cols=2>`", () => {
    expect(documentMarkdown(box(2, bold("<보기>"), "ㄱ. 참", "ㄴ. 거짓"))).toBe(
      "> <보기:cols=2>\n> ㄱ. 참\n> ㄴ. 거짓",
    );
  });

  it("〈조건〉 도 같다 — 굵은 머리가 `**<조건>**` 으로 새지 않는다", () => {
    expect(documentMarkdown(box(3, bold("<조건>"), "(가) a", "(나) b"))).toBe(
      "> <조건:cols=3>\n> (가) a\n> (나) b",
    );
    expect(documentMarkdown(box(1, bold("<조건>"), "(가) a"))).toBe(
      "> <조건>\n> (가) a",
    );
  });
});
