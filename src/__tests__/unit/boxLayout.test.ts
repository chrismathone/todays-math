import { describe, expect, it } from "vitest";
import { boxHeaderMarkdown, parseBoxHeader } from "@/lib/math/boxHeader";
import { boxCells } from "@/lib/math/boxBlock";
import { figureGridColumns, layoutQuotedBoxes } from "@/lib/math/boxLayout";

/**
 * 〈보기〉 배치 한 벌 — 검수 카드·지면·HWPX 가 같은 격자를 그리게 하는 공용 규칙.
 * 원장님 2026-09-21: «그림이 이상하게 배열되고 있네. 문제 안에 여러 그림이 있을 경우 원본을 어기고».
 */

describe("상자 머리 표기 — 정본 `<보기:cols=N>`, 옛 `<보기2>` 도 읽는다", () => {
  it.each([
    ["<보기:cols=2>", { label: "보기", cols: 2 }],
    ["<보기:cols=3> 다음 중", { label: "보기", cols: 3 }],
    ["<조건:cols=2>", { label: "조건", cols: 2 }],
    ["<보기2>", { label: "보기", cols: 2 }],
    ["<나열1>", { label: "나열", cols: 1 }],
    ["<보기>", { label: "보기", cols: null }],
    ["<보기:cols=auto>", { label: "보기", cols: null }],
    ["\\<보기:cols=2\\>", { label: "보기", cols: 2 }],
  ])("%s", (text, expected) => {
    expect(parseBoxHeader(text)).toMatchObject(expected);
  });

  it("머리가 아닌 글은 null — 줄머리여야 하고 열 수는 1~3", () => {
    expect(parseBoxHeader("다음 <보기>에서")).toBeNull();
    expect(parseBoxHeader("<보기:cols=4>")).toBeNull();
    expect(parseBoxHeader("<보기5>")).toBeNull();
  });

  it("쓰기는 정본 하나 — 1열·모름은 맨 `<보기>`, 2·3열은 `:cols=N`", () => {
    expect(boxHeaderMarkdown("보기", 2)).toBe("<보기:cols=2>");
    expect(boxHeaderMarkdown("조건", 3)).toBe("<조건:cols=3>");
    expect(boxHeaderMarkdown("보기", 1)).toBe("<보기>");
    expect(boxHeaderMarkdown("나열", null)).toBe("<나열>");
  });

  it("길이는 머리 표기 자체 — 뒤의 글을 잘라 낼 때 쓴다", () => {
    const text = "<보기:cols=2> 다음 중";
    const header = parseBoxHeader(text)!;
    expect(text.slice(header.length)).toBe(" 다음 중");
  });
});

describe("상자 칸 — 한 줄이 한 칸, 여러 열이면 한 줄의 항목 여럿을 칸마다", () => {
  it("줄마다 한 칸, 빈 줄은 버린다", () => {
    expect(boxCells("ㄱ. [그림1]\nㄴ. [그림2]\n\nㄷ. [그림3]", 1)).toEqual([
      "ㄱ. [그림1]",
      "ㄴ. [그림2]",
      "ㄷ. [그림3]",
    ]);
  });

  it("여러 줄 수식은 한 칸이다 — 수식 안 줄바꿈에서 자르지 않는다", () => {
    expect(boxCells("ㄱ. $$a>\nb$$이다.\nㄴ. $c<d$이다.", 1)).toEqual([
      "ㄱ. $$a>\nb$$이다.",
      "ㄴ. $c<d$이다.",
    ]);
  });

  it("1열이면 한 줄의 항목 여럿을 그대로 둔다 — 원본의 한 행이다", () => {
    const body =
      "(가) $y = 3x^2$ (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$\n(라) $y = \\frac{4}{3}x^2$(마) $y = \\frac{3}{4}x^2$    (바) $y = -5x^2$";
    expect(boxCells(body, 1)).toHaveLength(2);
  });

  it("여러 열이면 한 줄의 항목을 칸마다 — 9번 저장본에 3열을 주면 여섯 칸, 원문 차례", () => {
    const body =
      "(가) $y = 3x^2$ (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$\n(라) $y = \\frac{4}{3}x^2$(마) $y = \\frac{3}{4}x^2$    (바) $y = -5x^2$";
    expect(boxCells(body, 3)).toEqual([
      "(가) $y = 3x^2$",
      "(나) $y = -\\frac{2}{3}x^2$",
      "(다) $y = -3x^2$",
      "(라) $y = \\frac{4}{3}x^2$",
      "(마) $y = \\frac{3}{4}x^2$",
      "(바) $y = -5x^2$",
    ]);
  });

  it("줄머리가 항목이 아니면 자르지 않는다 — 문장 속 «(가)와 (나)» 같은 참조", () => {
    expect(boxCells("두 식 (가)와 (나)를 비교한다.", 2)).toEqual([
      "두 식 (가)와 (나)를 비교한다.",
    ]);
  });

  it("수식 안의 기호는 항목으로 안 본다", () => {
    expect(boxCells("ㄱ. $f(ㄴ.)$ 이다", 2)).toEqual(["ㄱ. $f(ㄴ.)$ 이다"]);
  });
});

/** 원장님 문제 22 — 문명중 1학년 2학기 중간(미래엔), 작업실 저장본의 그림 자리(쪽 비율). */
const Q22_RECTS = [
  { x: 0.1044, y: 0.6173, width: 0.1718, height: 0.0921 },
  { x: 0.3086, y: 0.6176, width: 0.13, height: 0.0871 },
  { x: 0.1029, y: 0.7401, width: 0.1511, height: 0.06 },
  { x: 0.3074, y: 0.7369, width: 0.1296, height: 0.0643 },
];
const Q22_CELLS = ["ㄱ. [그림1]", "ㄴ. [그림2]", "ㄷ. [그림3]", "ㄹ. [그림4]"];

describe("그림만 든 상자의 열 수 — 원본 그림 자리가 안다", () => {
  const rectOf = (rects: typeof Q22_RECTS) => (index: number) => rects[index];

  it("문제 22: 그림 넷이 2열 2행", () => {
    expect(figureGridColumns(Q22_CELLS, rectOf(Q22_RECTS))).toBe(2);
  });

  it("한 행에 셋이면 3열", () => {
    const rects = [0.1, 0.3, 0.5].map((x) => ({
      x,
      y: 0.2,
      width: 0.15,
      height: 0.1,
    }));
    expect(
      figureGridColumns(["[그림1]", "[그림2]", "[그림3]"], rectOf(rects)),
    ).toBe(3);
  });

  it("세로로만 서 있으면 모른다(null) — 1열은 기본값이 맡는다", () => {
    const rects = [0.1, 0.3, 0.5].map((y) => ({
      x: 0.1,
      y,
      width: 0.15,
      height: 0.1,
    }));
    expect(
      figureGridColumns(["[그림1]", "[그림2]", "[그림3]"], rectOf(rects)),
    ).toBeNull();
  });

  it("세로 읽기 차례(ㄱ·ㄴ 이 왼쪽 열)면 격자로 옮기지 않는다 — 차례가 바뀐다", () => {
    const rects = [Q22_RECTS[0], Q22_RECTS[2], Q22_RECTS[1], Q22_RECTS[3]];
    expect(figureGridColumns(Q22_CELLS, rectOf(rects))).toBeNull();
  });

  it("앞 행이 덜 찼으면(1·2) 모른다 — 격자는 앞에서부터 채운다", () => {
    const rects = [
      { x: 0.1, y: 0.1, width: 0.15, height: 0.1 },
      { x: 0.1, y: 0.3, width: 0.15, height: 0.1 },
      { x: 0.3, y: 0.3, width: 0.15, height: 0.1 },
    ];
    expect(
      figureGridColumns(["[그림1]", "[그림2]", "[그림3]"], rectOf(rects)),
    ).toBeNull();
  });

  it("칸마다 그림이 꼭 하나여야 한다 — 글 칸이 섞이면 모른다", () => {
    expect(
      figureGridColumns(["ㄱ. [그림1]", "ㄴ. 넓이는 같다"], rectOf(Q22_RECTS)),
    ).toBeNull();
    expect(
      figureGridColumns(
        ["ㄱ. [그림1][그림2]", "ㄴ. [그림3]"],
        rectOf(Q22_RECTS),
      ),
    ).toBeNull();
  });

  it("자리를 모르면 모른다", () => {
    expect(figureGridColumns(Q22_CELLS, () => undefined)).toBeNull();
  });
});

describe("인용 상자 정리 — 검수 카드·지면이 같은 원문으로 그리게", () => {
  const Q22 =
    "아래 보기에서 $\\angle x$의 크기가 큰 것부터 순서대로 바르게 나열한 것은?\n\n> <보기>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n① ㄹ-ㄷ-ㄱ-ㄴ ② ㄹ-ㄷ-ㄴ-ㄱ";

  it("문제 22: 그림 자리로 2열을 알면 머리에 적고 칸마다 문단으로", () => {
    const out = layoutQuotedBoxes(Q22, {
      figureRect: (index) => Q22_RECTS[index],
    });
    expect(out).toContain(
      "> <보기:cols=2>\n>\n> ㄱ. [그림1]\n>\n> ㄴ. [그림2]\n>\n> ㄷ. [그림3]\n>\n> ㄹ. [그림4]\n\n①",
    );
    expect(out.startsWith("아래 보기에서")).toBe(true);
  });

  it("그림 자리를 모르면 원문 그대로 — 한 글자도 안 바뀐다", () => {
    expect(layoutQuotedBoxes(Q22)).toBe(Q22);
  });

  it("머리에 적힌 열 수가 이긴다 — 3열이면 한 줄의 항목을 칸마다", () => {
    const box9 =
      "> <보기:cols=3>\n> (가) $a$ (나) $b$ (다) $c$\n> (라) $d$ (마) $e$ (바) $f$";
    expect(layoutQuotedBoxes(box9)).toBe(
      "> <보기:cols=3>\n>\n> (가) $a$\n>\n> (나) $b$\n>\n> (다) $c$\n>\n> (라) $d$\n>\n> (마) $e$\n>\n> (바) $f$",
    );
  });

  it("옛 표기 `<보기2>` 도 정본으로 옮겨 적는다", () => {
    expect(layoutQuotedBoxes("> <보기2>\n> ㄱ. 참\n> ㄴ. 거짓")).toBe(
      "> <보기:cols=2>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓",
    );
  });

  it("1열 상자·표시 없는 인용문·참조는 그대로", () => {
    for (const text of [
      "> <조건>\n>\n> • 첫째\n> 이어지는 설명\n>\n> • 둘째",
      "> 일반 인용문\n> $a>b$이다.",
      "> <보기>에서 옳은 것은?",
    ])
      expect(layoutQuotedBoxes(text)).toBe(text);
  });

  it("두 번 돌려도 같다", () => {
    const once = layoutQuotedBoxes(Q22, {
      figureRect: (index) => Q22_RECTS[index],
    });
    expect(
      layoutQuotedBoxes(once, { figureRect: (index) => Q22_RECTS[index] }),
    ).toBe(once);
  });
});
