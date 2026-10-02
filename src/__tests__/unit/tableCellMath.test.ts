/**
 * 🔴 RED → 🟢 — 인식한 표의 칸에 든 **수·문자**는 본문과 같은 수식 글꼴로 선다 (원장님 2026-09-21).
 *
 * 원장님: «표 내부 숫자가 수식 처리 안되어있기도 하고.» — 문명중 1학년 3번(양초 표). 인식은 표를
 * `rows: string[][]` 로 주고 칸에는 `$` 가 없다. 칸을 수식으로 볼지는 `[\\^_{}]` 하나로 정하고 있었다 —
 * `x\text{ (시간)}` · `(x,\ y)` 는 수식이 됐는데 **`0` · `15` · `a`** 는 보통 글자로 남았다.
 * 같은 문항의 발문은 `$1$시간마다` 처럼 수를 전부 수식으로 적는다 — 한 문항 안에서 글꼴이 갈렸다.
 *
 * 규칙은 한 곳(`tableCellMarkdown`)이고, 검수 카드·편집기(`blocksToMarkdown`)와 지면(`NativeProblem`)이 같이 쓴다.
 * 전에는 같은 정규식이 두 파일에 따로 있었다.
 */
import { describe, expect, it } from "vitest";

import {
  blocksToMarkdown,
  tableCellMarkdown,
} from "@/lib/mathgen/blocksToMarkdown";

describe("tableCellMarkdown — 칸 하나", () => {
  it.each([
    ["0", "$0$"],
    ["15", "$15$"],
    ["-3", "$-3$"],
    ["1.5", "$1.5$"],
    ["a", "$a$"],
    ["A", "$A$"],
    ["2x+1", "$2x+1$"],
    ["(0, 15)", "$(0, 15)$"],
    ["3/4", "$3/4$"],
    ["x = 2", "$x = 2$"],
  ])("🔴 수·문자만 든 칸 %j → %j", (cell, expected) => {
    expect(tableCellMarkdown(cell)).toBe(expected);
  });

  it.each([
    ["x\\text{ (시간)}", "$x\\text{ (시간)}$"],
    ["(x,\\ y)", "$(x,\\ y)$"],
    ["x^2", "$x^2$"],
  ])("명백한 LaTeX 은 전처럼 감싼다 %j", (cell, expected) => {
    expect(tableCellMarkdown(cell)).toBe(expected);
  });

  it.each([
    ["시간"],
    ["합계"],
    ["학생 A"],
    ["3시간"],
    // 글자 둘 이상이 이어지면 낱말·단위다 — 수식으로 감싸면 `cm` 이 c·m 기울임으로 선다.
    ["cm"],
    ["15 cm"],
    ["kg"],
    ["sin"],
    ["AB"],
    // 수도 문자도 없는 칸
    ["-"],
    ["…"],
    ["○"],
  ])("수식이 아닌 칸은 그대로 %j", (cell) => {
    expect(tableCellMarkdown(cell)).toBe(cell);
  });

  it("이미 `$` 가 든 칸은 손대지 않는다", () => {
    expect(tableCellMarkdown("$a$ 또는 3")).toBe("$a$ 또는 3");
  });

  it.each([
    ["사인(\\sin)", "사인$(\\sin)$"],
    ["코사인(\\cos)", "코사인$(\\cos)$"],
    ["탄젠트(\\tan)", "탄젠트$(\\tan)$"],
    ["각도 28^\\circ", "각도 $28^\\circ$"],
    ["x^2의 값", "$x^2$의 값"],
    ["평균 속력=\\frac{거리}{시간}", "평균 속력$=\\frac{거리}{시간}$"],
  ])("한글 설명과 수식을 따로 표시한다: %j", (cell, expected) => {
    expect(tableCellMarkdown(cell)).toBe(expected);
  });

  it.each([
    "\\frac{\\text{거리}}{\\text{시간}}",
    "\\left(한글\\right)",
    "x_한글",
    "\\begin{array}{c}한글\\end{array}",
  ])("한글이 든 수식 구조를 끊지 않는다: %j", (cell) => {
    expect(tableCellMarkdown(cell)).toBe(`$${cell}$`);
  });

  it("빈 칸은 빈 칸이다", () => {
    expect(tableCellMarkdown("")).toBe("");
    expect(tableCellMarkdown("   ")).toBe("");
  });

  it("🔴 천 단위 쉼표 — 수식 안에서 쉼표 뒤가 벌어지지 않게 `{,}` 로", () => {
    expect(tableCellMarkdown("1,000")).toBe("$1{,}000$");
    expect(tableCellMarkdown("12,345,678")).toBe("$12{,}345{,}678$");
  });

  it("🔴 `%` 는 LaTeX 주석 글자다 — 그대로 감싸면 뒤가 잘린다", () => {
    expect(tableCellMarkdown("50%")).toBe("$50\\%$");
  });

  it("GFM 칸 구분자 `|` 는 전처럼 피한다 — 절댓값 칸은 새 규칙이 건드리지 않는다", () => {
    expect(tableCellMarkdown("|x|")).toBe("\\|x\\|");
  });
});

describe("blocksToMarkdown — 양초 표(문명중 1학년 3번)", () => {
  const rows = [
    ["x\\text{ (시간)}", "0", "1", "2", "3", "4", "5"],
    ["y\\text{ ( cm )}", "15", "a", "b", "c", "d", "e"],
    ["(x,\\ y)", "(0,\\ 15)", "", "", "", "", ""],
  ];

  it("🔴 표의 수·문자 칸이 전부 수식이다 — 빈 칸은 빈 칸", () => {
    const markdown = blocksToMarkdown([{ type: "table", value: "", rows }]);
    expect(markdown).toContain(
      "| $x\\text{ (시간)}$ | $0$ | $1$ | $2$ | $3$ | $4$ | $5$ |",
    );
    expect(markdown).toContain(
      "| $y\\text{ ( cm )}$ | $15$ | $a$ | $b$ | $c$ | $d$ | $e$ |",
    );
    expect(markdown).toContain("| $(x,\\ y)$ | $(0,\\ 15)$ |  |  |  |  |  |");
  });
});

/**
 * 원장님 2026-09-21 — 화면에 그대로 찍힌 보기:
 *   «① (가) (나) (다) \angle \mathrm{ABE} \triangle \mathrm{FEC} \overline{\mathrm{FE}}»
 * 원본은 «(가)·(나)·(다) 에 알맞은 것» 을 고르는 **보기 표**다. 인식은 보기마다 표 하나(머리행 + 값행)를 준다.
 * 보기 안의 표는 «드물다»며 칸을 공백으로 이어 붙였는데, 그 길에는 수식 감싸기가 **아예 없어서** LaTeX 가 날것으로 나갔다.
 */
describe("blocksToMarkdown — 보기 안에 든 표", () => {
  const choice = (number: number, values: string[]) => ({
    number,
    contents: [
      {
        type: "table" as const,
        value: "",
        rows: [["(가)", "(나)", "(다)"], values],
      },
    ],
  });
  const choices = [
    choice(1, [
      "\\angle \\mathrm{ABE}",
      "\\triangle \\mathrm{FEC}",
      "\\overline{\\mathrm{FE}}",
    ]),
    choice(2, [
      "\\angle \\mathrm{ABE}",
      "\\triangle \\mathrm{ACF}",
      "\\overline{\\mathrm{BD}}",
    ]),
  ];
  const stem = [
    {
      type: "text" as const,
      value: "(가), (나), (다)에 알맞은 것은?",
      rows: [],
    },
  ];

  it("🔴 칸의 LaTeX 가 날것으로 나가지 않는다 — 전부 `$…$` 안이다", () => {
    const markdown = blocksToMarkdown(stem, choices);
    const line = markdown.split("\n").find((l) => l.startsWith("①"))!;
    // `$…$` 밖에 역슬래시가 남아 있으면 화면에 `\angle` 이 그대로 찍힌다.
    expect(line.replace(/\$[^$]*\$/g, "")).not.toContain("\\");
    expect(line).toContain("$\\angle \\mathrm{ABE}$");
    expect(line).toContain("$\\overline{\\mathrm{BD}}$");
  });

  it("🔴 머리행 + 값행 두 줄은 짝지어 읽힌다 — «(가) … , (나) … , (다) …»", () => {
    const line = blocksToMarkdown(stem, choices)
      .split("\n")
      .find((l) => l.startsWith("①"))!;
    expect(line).toContain(
      "① (가) $\\angle \\mathrm{ABE}$, (나) $\\triangle \\mathrm{FEC}$, (다) $\\overline{\\mathrm{FE}}$ ②",
    );
    // 머리행을 따로 한 번 더 늘어놓지 않는다.
    expect(line).not.toContain("(가) (나) (다)");
  });

  it("짝이 안 맞는 표(행이 하나·셋 이상·길이가 다름)는 칸을 차례로 — 그래도 수식은 감싼다", () => {
    const line = blocksToMarkdown(stem, [
      {
        number: 1,
        contents: [
          { type: "table" as const, value: "", rows: [["x^2", "3", "합계"]] },
        ],
      },
      {
        number: 2,
        contents: [{ type: "text" as const, value: "없다", rows: [] }],
      },
    ])
      .split("\n")
      .find((l) => l.startsWith("①"))!;
    expect(line).toContain("① $x^2$ $3$ 합계 ② 없다");
  });
});
