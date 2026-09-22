import { describe, expect, it } from "vitest";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

// 지면의 격자(〈보기〉 2·3열, 선택지 격자)는 **칸이 위쪽 정렬**이다. 한 칸에 분수가 들면 그 칸의
// 글자 기준선이 몇 px 내려가고, 옛 writer(`make_rows`)는 기준선 4px 안의 것만 한 줄로 묶어
// 칸마다 따로 문단을 세운 뒤 **y 순으로** 정렬했다. 그래서 원장님 9번 저장본((가)~(바), 분수 섞임)이
// 한글에서 여섯 문단 · **(바)가 (마)보다 먼저** 나왔다 — 나간 시험지 내용이 틀린다(트랙 42 §7).
//
// 수집기가 칸마다 `gridId·gridRow·gridCol` 을 붙이면 writer 는 **격자 한 행을 한 문단**으로,
// 칸 차례(= 원문 차례)대로 묶는다. 넓은 칸 사이는 이미 있는 규칙대로 탭 멈춤이 된다.

const BODY = { x: 0, y: 0, w: 333, h: 400, columns: 1 as const, gap: 0 };

type Cell = { gridId: number; gridRow: number; gridCol: number };
const text = (
  x: number,
  y: number,
  w: number,
  value: string,
  baseline: number,
  cell?: Cell,
) => ({
  type: "text" as const,
  x,
  y,
  w,
  h: 16,
  text: value,
  fontSize: 14,
  baseline,
  ...cell,
});
const equation = (
  x: number,
  y: number,
  w: number,
  latex: string,
  baseline: number,
  cell?: Cell,
) => ({
  type: "equation" as const,
  x,
  y,
  w,
  h: 20,
  latex,
  fontSize: 14,
  baseline,
  ...cell,
});
const image = (
  x: number,
  y: number,
  w: number,
  h: number,
  id: string,
  cell?: Cell,
) => ({ type: "image" as const, x, y, w, h, imageId: id, ...cell });

/** 트랙 42 가 9번 저장본에서 실제로 수집한 좌표(`payload-box9.json`)의 〈보기〉 격자 부분. */
const cell = (row: number, col: number): Cell => ({
  gridId: 1,
  gridRow: row,
  gridCol: col,
});
const BOX9 = [
  text(145, 81, 43, "〈보기〉", 93.7),
  text(17, 107, 27, "(가) ", 119.7, cell(0, 0)),
  equation(44, 105, 56, "y = 3x^2", 119.5, cell(0, 0)),
  text(178, 113, 27, "(나) ", 126.1, cell(0, 1)),
  equation(206, 111, 74, "y = -\\dfrac{2}{3}x^2", 125.9, cell(0, 1)),
  text(17, 145, 27, "(다) ", 157.7, cell(1, 0)),
  equation(44, 143, 70, "y = -3x^2", 157.5, cell(1, 0)),
  text(178, 151, 27, "(라) ", 164.1, cell(1, 1)),
  equation(206, 149, 61, "y = \\dfrac{4}{3}x^2", 163.9, cell(1, 1)),
  text(17, 189, 27, "(마) ", 202.1, cell(2, 0)),
  equation(44, 187, 61, "y = \\dfrac{3}{4}x^2", 201.9, cell(2, 0)),
  text(178, 183, 27, "(바) ", 195.7, cell(2, 1)),
  equation(206, 181, 70, "y = -5x^2", 195.5, cell(2, 1)),
];

async function paragraphs(objects: unknown[]) {
  const parts = await buildHwpxParts(
    HwpxPayloadSchema.parse({
      title: "격자 시험",
      pages: [{ body: BODY, objects }],
    }),
  );
  const section = new DOMParser().parseFromString(
    parts["Contents/section0.xml"],
    "application/xml",
  );
  // 본문 줄은 구역의 직계 문단이다(첫 문단은 구역 설정).
  return [...section.documentElement.children]
    .filter((node) => node.tagName === "hp:p")
    .slice(1)
    .map((p) => ({
      p,
      // 글자·수식·그림을 원문 차례대로 한 줄로 — 수식은 원본 식(shapeComment), 그림은 id.
      line: [...p.getElementsByTagName("*")]
        .map((node) =>
          node.tagName === "hp:t" && node.parentElement?.tagName === "hp:run"
            ? (node.textContent ?? "").trim()
            : node.tagName === "hp:shapeComment"
              ? `$${node.textContent}$`
              : node.tagName === "hc:img"
                ? `[${node.getAttribute("binaryItemIDRef")}]`
                : "",
        )
        .filter(Boolean)
        .join(" "),
    }));
}

describe("HWPX 격자 — 한 행은 한 문단, 칸은 원문 차례대로", () => {
  it("9번 저장본: (가)~(바) 가 한글에서 원문 차례로, 격자 한 행이 한 문단이다", async () => {
    const lines = (await paragraphs(BOX9)).map((entry) => entry.line);
    expect(lines).toEqual([
      "〈보기〉",
      "(가) $y = 3x^2$ (나) $y = -\\dfrac{2}{3}x^2$",
      "(다) $y = -3x^2$ (라) $y = \\dfrac{4}{3}x^2$",
      "(마) $y = \\dfrac{3}{4}x^2$ (바) $y = -5x^2$",
    ]);
    // 글자만 이어 읽어도 (가)(나)(다)(라)(마)(바) — 나간 시험지의 내용 차례.
    const labels = lines.join(" ").match(/\([가-바]\)/g);
    expect(labels).toEqual(["(가)", "(나)", "(다)", "(라)", "(마)", "(바)"]);
  });

  it("둘째 칸은 미리보기 x 의 탭 멈춤으로 선다 — 공백 개수로 채우지 않는다", async () => {
    const [, first] = await paragraphs(BOX9);
    expect(first.p.getElementsByTagName("hp:tab")).toHaveLength(1);
  });

  it("그림이 든 칸도 같은 행이면 한 문단 — 원장님 문제 22(그림 넷, 2열 2행)", async () => {
    const lines = (
      await paragraphs([
        text(20, 100, 14, "ㄱ.", 112, cell(0, 0)),
        text(180, 100, 14, "ㄴ.", 112, cell(0, 1)),
        image(30, 120, 120, 90, "image1", cell(0, 0)),
        image(190, 122, 110, 86, "image2", cell(0, 1)),
        text(20, 220, 14, "ㄷ.", 232, cell(1, 0)),
        text(180, 220, 14, "ㄹ.", 232, cell(1, 1)),
        image(30, 240, 120, 70, "image3", cell(1, 0)),
        image(190, 238, 110, 76, "image4", cell(1, 1)),
      ])
    ).map((entry) => entry.line);
    expect(lines).toEqual([
      "ㄱ. ㄴ.",
      "[image1] [image2]",
      "ㄷ. ㄹ.",
      "[image3] [image4]",
    ]);
  });

  /**
   * «나란히» 칸 묶음(원장님 2026-09-22) — 제목 줄이 없고 4열이다. 쓰개는 열 수를 안 가린다(칸 표시만 본다).
   * 서답형 소문항 넷이 한 행: 번호 줄 · 그림 줄 · 배점 줄이 저마다 한 문단, 칸 차례대로.
   */
  it("나란히 4열: 제목 없이 한 행 — 번호·그림·배점이 칸 차례대로 한 문단씩", async () => {
    const side = (col: number): Cell => ({
      gridId: 3,
      gridRow: 0,
      gridCol: col,
    });
    const lines = (
      await paragraphs([
        text(0, 3, 200, "그림에서 평행사변형인 이유를 쓰시오.", 16),
        ...[0, 1, 2, 3].flatMap((col) => [
          text(4 + col * 84, 30, 18, `(${col + 1})`, 42, side(col)),
          image(4 + col * 84, 50, 70, 60, `image${col + 1}`, side(col)),
          ...(col < 3
            ? [text(4 + col * 84, 114, 26, "[2점]", 126, side(col))]
            : []),
        ]),
      ])
    ).map((entry) => entry.line);
    expect(lines).toEqual([
      "그림에서 평행사변형인 이유를 쓰시오.",
      "(1) (2) (3) (4)",
      "[image1] [image2] [image3] [image4]",
      "[2점] [2점] [2점]",
    ]);
  });

  /**
   * 보기 번호 칸은 번호와 내용이 위쪽 정렬(`items-start`)이라 분수 칸은 **칸 안에서도** 번호와 기준선이
   * 갈린다. 칸 안의 줄을 기준선으로 세면 «①» 옆이 비고 분수가 아랫줄로 떨어진다(하네스 실측 —
   * 작업실 지면·문제은행 지면 둘 다). 칸 안의 한 줄은 **세로로 겹치는** 것끼리다.
   */
  it("분수 보기: 번호와 분수가 한 줄 — 칸 안의 줄은 세로 겹침으로 묶는다", async () => {
    const choice = (row: number, col: number): Cell => ({
      gridId: 2,
      gridRow: row,
      gridCol: col,
    });
    const lines = (
      await paragraphs([
        text(0, 3, 135, "다음 중 가장 큰 수는?", 16.2),
        // 트랙 46 하네스(choicesFrac)가 실제로 수집한 좌표.
        text(0, 36.8, 14, "①", 50, choice(0, 0)),
        equation(20, 42.1, 12.5, "\\dfrac{5}{2}", 57.1, choice(0, 0)),
        text(116.2, 36.8, 14, "②", 50, choice(0, 1)),
        equation(136.2, 35.8, 21.7, "-3", 50.7, choice(0, 1)),
        text(232.4, 36.8, 14, "③", 50, choice(0, 2)),
        equation(252.4, 42.1, 12.5, "\\dfrac{1}{3}", 57.1, choice(0, 2)),
        text(0, 78.8, 14, "④", 92, choice(1, 0)),
        equation(20, 77.8, 8.5, "2", 92.8, choice(1, 0)),
        text(116.2, 78.8, 14, "⑤", 92, choice(1, 1)),
        equation(136.2, 84.1, 12.5, "\\dfrac{7}{4}", 99.1, choice(1, 1)),
      ])
    ).map((entry) => entry.line);
    expect(lines).toEqual([
      "다음 중 가장 큰 수는?",
      "① $\\dfrac{5}{2}$ ② $-3$ ③ $\\dfrac{1}{3}$",
      "④ $2$ ⑤ $\\dfrac{7}{4}$",
    ]);
  });

  it("격자 밖 줄은 예전 그대로 — 표시가 없으면 기준선으로 묶는다", async () => {
    const lines = (
      await paragraphs([
        text(0, 3, 200, "다음 중 옳은 것은?", 16),
        text(0, 249, 14, "①", 261.7),
        text(20, 250, 152, "모두 원점이 꼭짓점이다.", 262.7),
      ])
    ).map((entry) => entry.line);
    expect(lines).toEqual(["다음 중 옳은 것은?", "① 모두 원점이 꼭짓점이다."]);
  });
});
