/**
 * 대수회 작업 규정 표준(26.03.12)·기준표(2024) 맞춤 — HWPX 수식 변환기(`vendor/hwpx/latex_to_hwpeq.py`)의 표기.
 *
 * 시험지 한글화(정본 `core/latex_to_hwpeq.py`)가 2026-10-26 «표준에 전부 맞출 것»으로 고친 것을 패치 03 으로 받았다
 * (그쪽 전달 묶음 `docs/export/todays-math/05-작업규정표준-맞춤.md` §1). 괄호 안 `#` 은 표준의 항목 번호.
 * 이 시험은 변환기의 출력과 폭·높이 계산기(`eqsize`·`eqheight`)가 그것을 읽는지까지만 잰다 —
 * 한글에서 실제로 여는 확인은 `/dev/print-check` 의 `hwpx-equation-standard-notation` 이다(규칙 9).
 *
 * 확률 P 가 정자가 되면 표 셀 스크립트도 `rm P it (X=x)` 가 된다. 우리는 스크립트 문자열로 표 종류·문항 유형을
 * 가르는 곳이 없다 — `writer.py` 는 스크립트를 상자 크기 재는 데만 쓰고, 저장된 문항은 LaTeX 다(2026-10-26 전수).
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function python<T>(lines: string[], input: unknown): T {
  const program = [
    "import json,sys,io",
    "sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')",
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "vendor/hwpx"))})`,
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "scripts/hwpx"))})`,
    "items=json.load(io.TextIOWrapper(sys.stdin.buffer,encoding='utf-8'))",
    ...lines,
  ].join("\n");
  const run = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", program], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr || "python 이 안 돌았다");
  return JSON.parse(run.stdout) as T;
}
const convert = (latex: string[]) =>
  python<string[]>(
    [
      "from latex_to_hwpeq import latex_to_hwpeq",
      "print(json.dumps([latex_to_hwpeq(i).strip() for i in items], ensure_ascii=False))",
    ],
    latex,
  );
const boxes = (scripts: string[]) =>
  python<Array<{ width: number; height: number }>>(
    [
      "from eqsize import hwpeq_width",
      "from eqheight import hwpeq_extent",
      "print(json.dumps([{'width':hwpeq_width(i,1050),'height':hwpeq_extent(i,1050)[0]} for i in items]))",
    ],
    scripts,
  );

describe("확률 P · 평균 E · 분산 V 는 정자, 사건 · 확률변수는 이탤릭 (#38 · #44)", () => {
  it("맨 글자와 이미 정자인 것 모두 `rm P it (…)` — 정자가 괄호 안으로 번지지 않는다", () => {
    expect(
      convert([
        "P(A\\cap B)",
        "E(X)=27",
        "V(X)",
        "\\mathrm{E}(X)",
        "\\mathrm{P}\\left( Z\\leq 1\\right)",
        "\\{\\mathrm{E}(Y)\\}^2",
      ]),
    ).toEqual([
      "rm P it (A SMALLINTER B)",
      "rm E it (X)=27",
      "rm V it (X)",
      "rm E it (X)",
      "rm P it LEFT ( Z LEQ 1 RIGHT )",
      "LEFT { rm E it (Y) RIGHT }^{2}",
    ]);
  });

  it("괄호 안이 소문자 · 숫자면 다항식 · 점이다 — 건드리지 않는다", () => {
    expect(convert(["P(x)", "P(2,3)", "f(P)"])).toEqual([
      "P(x)",
      "P(2,~3)",
      "f(P)",
    ]);
  });
});

describe("삼각함수의 각 · 섭씨 · 벡터 내적 (#49 · #47 · #29)", () => {
  it("각이 대문자 한 글자면 1/4칸 띄우고 이탤릭 — 그리스 문자는 그대로", () => {
    expect(convert(["\\tan A", "\\sin B", "\\tan\\theta"])).toEqual([
      "tan`A",
      "sin`B",
      "tan theta",
    ]);
  });

  it("섭씨는 숫자와 ° 사이 1/4칸 — 각도 `60°` 는 그대로", () => {
    expect(convert(["15^\\circ\\mathrm{C}", "60^\\circ"])).toEqual([
      "15`°rm C",
      "60°",
    ]);
  });

  it("벡터 옆의 점곱만 ⦁ — 수의 곱 `2 CDOT 3` 은 그대로", () => {
    expect(
      convert([
        "\\vec{a}\\cdot\\vec{b}",
        "\\overrightarrow{OA}\\cdot\\overrightarrow{OP}",
        "2\\cdot3",
      ]),
    ).toEqual([
      "VEC {a} ⦁ VEC {b}",
      "VEC {rm {OA}} ⦁ VEC {rm {OP}}",
      "2 CDOT 3",
    ]);
  });
});

describe("집합 · 여집합 · 행렬 (#16 · #36 · #37 · #54)", () => {
  it('짝이 맞는 맨 `\\{…\\}` 는 자동 크기 맨 중괄호 — 따옴표 리터럴 `"{"` 는 한글에서 깨진다', () => {
    const [set, sequence] = convert(["A=\\{1,2,3\\}", "\\{a_n\\}"]);
    expect(set).toBe("A= LEFT { 1,~2,~3 RIGHT }");
    expect(sequence).toBe("LEFT { a_{n} RIGHT }");
    expect(set).not.toContain('"{"');
  });

  it("여집합 첨자는 집합 뒤에서만 대문자 C — 수 · 식의 지수 `c` 는 그대로", () => {
    expect(convert(["(A\\cup B)^c", "A^{c}", "5^c", "(x+1)^c"])).toEqual([
      "(A SMALLUNION B)^{C}",
      "A^{C}",
      "5^{c}",
      "(x+1)^{c}",
    ]);
  });

  it("pmatrix 는 `LEFT ( `` MATRIX {…} `` RIGHT )` — 열 사이 두 칸", () => {
    expect(
      convert([
        "\\begin{pmatrix}2&3\\\\4&5\\end{pmatrix}",
        "\\begin{pmatrix}-2&2&2\\\\4&2&-4\\end{pmatrix}",
      ]),
    ).toEqual([
      "LEFT ( `` MATRIX {2 ~~& 3 # 4 ~~& 5} `` RIGHT )",
      "LEFT ( `` MATRIX {-2 ~~& 2 ~~& 2 # 4 ~~& 2 ~~& -4} `` RIGHT )",
    ]);
  });
});

describe("새 표기를 폭 · 높이 계산기가 읽는다", () => {
  it("행렬은 두 줄 높이로 · 나머지는 상자가 비지 않는다", () => {
    const scripts = [
      "rm P it (X=x)",
      "A= LEFT { 1,~2,~3 RIGHT }",
      "VEC {a} ⦁ VEC {b}",
      "15`°rm C",
      "tan`A",
      "(A SMALLUNION B)^{C}",
      "LEFT ( `` MATRIX {2 ~~& 3 # 4 ~~& 5} `` RIGHT )",
    ];
    const measured = boxes(scripts);
    const line = boxes(["x"])[0].height;
    for (const box of measured) expect(box.width).toBeGreaterThan(0);
    expect(measured.at(-1)!.height).toBeGreaterThan(1.8 * line);
    // 열 사이 `~~` 가 폭에 들어간다 — 같은 행렬의 PMATRIX 보다 넓다.
    expect(measured.at(-1)!.width).toBeGreaterThan(
      boxes(["PMATRIX {2&3 # 4&5}"])[0].width,
    );
  });
});
