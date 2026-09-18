/**
 * 한글(HWP) 수식 문법 → LaTeX 문자열 변환기 (트랙 8, 2026-09-19).
 *
 * 두 겹을 따로 못 박는다.
 *
 * 1. **정본 이식** — `hwpScriptToLatexCanon` 이 파이썬 겉포장
 *    (`scripts/qa/convert-hwp-spans.py` = 겉포장 + `hwpeq_unglue` + 정본)과
 *    **한 글자도 다르지 않다.** 기대값은 파이썬이 낸 것을 그대로 옮긴
 *    `fixtures/hwpEquationGolden.json`(머리에 출처·md5)이다. 손으로 고치지 않는다.
 * 2. **타이핑용** — `hwpToLatex` 는 정본 위에 «사람이 칠 때»의 차이만 얹는다.
 *    황금표와 **다른 행은 아래 `TYPING_DIFFERS` 에 적힌 것뿐**이어야 한다 —
 *    적히지 않은 행이 갈라지면 시험이 빨개진다. 두 벌이 몰래 갈라지지 않게 하는 장치다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import golden from "../fixtures/hwpEquationGolden.json";
import {
  convertHwpMathSpans,
  hwpScriptToLatexCanon,
  hwpToLatex,
} from "@/lib/math/hwpEquation";
import vocabCopy from "@/lib/math/hwpEquationVocab.json";

describe("[hwpEquation] 어휘 사본", () => {
  it("src 쪽 어휘는 scripts/qa/hwp-vocab.json 과 같다 — 두 벌이 갈라지면 빨개진다", () => {
    const source = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "scripts/qa/hwp-vocab.json"),
        "utf8",
      ),
    );
    expect(vocabCopy).toEqual(source);
  });
});

describe("[hwpEquation] 정본 이식 — 파이썬 겉포장과 같은 출력", () => {
  it("황금표는 114행이다 (파이썬 산출 그대로)", () => {
    expect(golden.rows).toHaveLength(114);
  });

  it.each(golden.rows.map((row) => [row.input, row.wrapper] as const))(
    "%s → %s",
    (input, wrapper) => {
      expect(hwpScriptToLatexCanon(input)).toBe(wrapper);
    },
  );

  /** `hwpSpanConvert.test.ts` 가 파이썬 `--probe` 로 못 박은 값 — 정본이 없는 컴퓨터에서도 돈다. */
  it.each([
    ["rm overline { AH } = it x", "\\mathrm{\\overline{AH}}=\\mathit{x}"],
    ["UNDEROVER _{0} ^{2}", "_{0}^{2}"],
    ["a RIGHTARROW b", "a\\rightarrow b"],
    ["LEFT ( 3x ^{2} +ax-5 RIGHT )", "\\left( 3x^{2}+ax-5\\right)"],
    ["{1} over {2}", "\\frac{1}{2}"],
    ["RM BAR {Q_1 H}=root 3", "\\mathrm{\\overline{Q_{1}H}}=\\sqrt{3}"],
    [
      "lim _{n rarrow INF } {{a _{n}} over {n}}",
      "\\lim _{n\\to \\infty }\\frac{a_{n}}{n}",
    ],
    [
      "cases{ cos x # sin x }",
      "\\begin{cases} \\cos x \\\\ \\sin x \\end{cases}",
    ],
    ["sintheta", "\\sin \\theta"],
    ["log2", "\\log 2"],
    ["piRIGHT )", "\\pi \\right)"],
    ["TRIANGLE ABC", "\\triangle ABC"],
    ["rm COF", "\\mathrm{COF}"],
    ["triangle rm AOF", "\\triangle \\mathrm{AOF}"],
    ["5 ln2", "5\\ln 2"],
    ["e ^{ln108} =108", "e^{\\ln 108}=108"],
    ["RM5cm ^{2}", "\\mathrm{5}cm^{2}"],
  ])("겉포장 탐침 %s → %s", (input, want) => {
    expect(hwpScriptToLatexCanon(input)).toBe(want);
  });
});

/**
 * 타이핑용이 황금표와 **일부러** 다른 행. 이 목록 밖의 행은 황금표와 같아야 한다.
 *
 * 부류는 셋이다.
 *  - 정본 구멍(실험 보고): `+-` · `-+` · `->` · `//` · `sim` · `Root2` · 중괄호 없는 `overline`
 *    · `==`(한컴 도움말 «수식 기호»표에 `==, EQUIV` 가 한 칸 — ≡ 합동이다).
 *  - OCR 용 낱말 쪼개기를 뺀 것: `age`·`term`·`limit` 은 안 찢고, `barAB` 는 `bar`+`AB` 로 읽는다.
 *  - 한컴 낱말이 하나도 없으면 손대지 않는다: `x^2` 는 그대로(LaTeX 로도 같은 뜻이다).
 */
const TYPING_DIFFERS: Record<string, string> = {
  Root2: "\\sqrt{2}",
  barAB: "\\overline{AB}",
  "overline AB": "\\overline{AB}",
  "a+-b": "a\\pm b",
  "a +- b": "a\\pm b",
  "x = {-b +- root {b^2 -4ac}} over {2a}":
    "x=\\frac{-b\\pm \\sqrt{b^{2}-4ac}}{2a}",
  "x->0": "x\\to 0",
  "lim from {x->0} f(x)": "\\lim _{x\\to 0}f(x)",
  "lim _{x -> 0} f(x)": "\\lim _{x\\to 0}f(x)",
  "l // m": "l\\parallel m",
  "triangle ABC sim triangle DEF": "\\triangle ABC\\sim \\triangle DEF",
  "triangle ABC == triangle DEF": "\\triangle ABC\\equiv \\triangle DEF",
  age: "age",
  term: "term",
  limit: "limit",
  "x ~ y": "x ~ y",
  "x^2": "x^2",
  "x^2+1": "x^2+1",
  "x^n+1": "x^n+1",
};

describe("[hwpEquation] 타이핑용 hwpToLatex", () => {
  it("다르게 두기로 한 행은 모두 황금표에 있다 (오타로 빈 기대를 세우지 않게)", () => {
    const inputs = new Set(golden.rows.map((row) => row.input));
    for (const key of Object.keys(TYPING_DIFFERS))
      expect(inputs).toContain(key);
  });

  it.each(golden.rows.map((row) => [row.input, row.wrapper] as const))(
    "%s",
    (input, wrapper) => {
      const want = TYPING_DIFFERS[input] ?? wrapper;
      const result = hwpToLatex(input);
      expect(result.latex).toBe(want);
      expect(result.changed).toBe(want !== input);
    },
  );

  describe("원장님 말씀 그대로 — root2 는 루트 2", () => {
    it.each([
      ["root2", "\\sqrt{2}"],
      ["ROOT2", "\\sqrt{2}"],
      ["Root 2", "\\sqrt{2}"],
      ["3root3", "3\\sqrt{3}"],
      ["root 3 of 8", "\\sqrt[3]{8}"],
    ])("%s → %s", (input, want) => {
      expect(hwpToLatex(input)).toEqual({
        latex: want,
        changed: true,
        warnings: [],
      });
    });
  });

  describe("정본 구멍을 막는다 — 정본보다 나은 기대값", () => {
    it.each([
      ["a -+ b", "a\\mp b"],
      ["x <-> y", "x\\leftrightarrow y"],
      ["l // m", "l\\parallel m"],
      ["A SIM B", "A\\sim B"],
      ["Overline {AB}", "\\overline{AB}"],
      ["overlineAB", "\\overline{AB}"],
      ["underline AB", "\\underline{AB}"],
      ["x ne 3", "x\\neq 3"],
      ["x ge 3", "x\\geq 3"],
      ["a == b", "a\\equiv b"],
    ])("%s → %s", (input, want) => {
      expect(hwpToLatex(input).latex).toBe(want);
    });

    /**
     * 🔴 대문자 두 글자는 **점 이름**이다 — 선분 GE 를 ≥ 로 읽으면 2026-08-18 사고
     *    (`\overline{GE}` → `\overline{\geq }`)가 되풀이된다. 짧은꼴은 소문자만 받는다.
     */
    it.each([
      ["bar GE", "\\overline{GE}"],
      ["bar LE = 3", "\\overline{LE}=3"],
      ["angle NEF", "\\angle NEF"],
    ])("대문자 두 글자는 점 이름 — %s → %s", (input, want) => {
      expect(hwpToLatex(input).latex).toBe(want);
    });

    it("`x<-1` 은 화살표가 아니라 «작다 -1» 이다 — `<-` 는 건드리지 않는다", () => {
      expect(hwpToLatex("x<-1").latex).toBe("x<-1");
    });
  });

  describe("변환하지 않는다", () => {
    it.each(
      golden.latexInputs.map((row) => [row.input, row.wrapperDamage] as const),
    )(
      "역슬래시가 든 입력(이미 LaTeX) %s 는 그대로 — 겉포장은 %s 로 망가뜨렸다",
      (input) => {
        expect(hwpToLatex(input)).toEqual({
          latex: input,
          changed: false,
          warnings: [],
        });
      },
    );

    it.each(["", "   "])("빈 문자열 %j 은 그대로", (input) => {
      expect(hwpToLatex(input)).toEqual({
        latex: input,
        changed: false,
        warnings: [],
      });
    });

    it.each(["x^2+1", "a_n", "f(x)=ax+b", "ABCD", "CGE", "x ~ y", "2{a+b}"])(
      "한컴 낱말이 하나도 없는 %s 는 그대로",
      (input) => {
        expect(hwpToLatex(input)).toEqual({
          latex: input,
          changed: false,
          warnings: [],
        });
      },
    );

    it.each(["age", "digit", "term", "photo", "limit", "item", "CGE"])(
      "낱말 속 짧은 키워드를 터뜨리지 않는다 — %s",
      (input) => {
        expect(hwpToLatex(input).latex).toBe(input);
      },
    );
  });

  describe("경고", () => {
    it("중괄호 짝이 안 맞으면 알린다", () => {
      expect(hwpToLatex("root {x+1").warnings).toContain(
        "중괄호 짝이 맞지 않습니다",
      );
    });

    it("분수 칸이 비면 알린다", () => {
      expect(hwpToLatex("over 2").warnings).toContain(
        "분수의 빈 칸이 있습니다",
      );
    });
  });
});

describe("[hwpEquation] 본문의 $…$ 구간만 바꾸는 convertHwpMathSpans", () => {
  it("수식 구간 안만 바꾸고 한글 문장은 그대로 둔다", () => {
    const result = convertHwpMathSpans(
      "넓이가 $root2$ 인 정사각형의 한 변을 over 라고 할 때 $a over b$ 의 값은?",
    );
    expect(result.text).toBe(
      "넓이가 $\\sqrt{2}$ 인 정사각형의 한 변을 over 라고 할 때 $\\frac{a}{b}$ 의 값은?",
    );
    expect(result.changed).toBe(true);
  });

  it("역슬래시가 든 구간은 그대로, 옆 구간만 바꾼다", () => {
    const result = convertHwpMathSpans("$\\frac{1}{2}$ 과 $1 over 2$");
    expect(result.text).toBe("$\\frac{1}{2}$ 과 $\\frac{1}{2}$");
  });

  it("$$…$$ 는 한 구간이다", () => {
    expect(convertHwpMathSpans("$$root 3$$").text).toBe("$$\\sqrt{3}$$");
  });

  it("바꿀 것이 없으면 changed 는 false 이고 원문과 같다", () => {
    const text = "함수 $f(x)=x^2$ 에서 root2 는 글자다.";
    expect(convertHwpMathSpans(text)).toEqual({
      text,
      changed: false,
      warnings: [],
    });
  });

  it("짝 없는 $ 뒤는 건드리지 않는다", () => {
    const text = "$root2$ 그리고 $root3";
    expect(convertHwpMathSpans(text).text).toBe("$\\sqrt{2}$ 그리고 $root3");
  });

  it("구간 경고를 모아 돌려준다", () => {
    expect(convertHwpMathSpans("$root {x$").warnings).toEqual([
      "중괄호 짝이 맞지 않습니다",
    ]);
  });
});
