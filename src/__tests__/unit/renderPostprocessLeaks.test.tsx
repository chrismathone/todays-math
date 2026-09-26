/**
 * 🔴 **렌더 후보정이 정상 해설을 날 글자로 새게 하던 자리** — 트랙 T3 (2026-09-26).
 *
 * 원장님 신고(작업실 해설에 `\displaystyle $$이동 거리= …` 가 날 글자로 샘)를 조사하다가
 * 같은 부류 결함이 **해설지·PDF·HWPX 쪽 렌더 후보정**에도 있는 것이 나왔다
 * (조사 `ocr-audit/report-code.md` 부류표, `report-paths.md` C·D). 여기 사례는 전부 그
 * 부류표의 행이다. 뿌리는 한 줄로 **«수식 짝의 시작 자리를 모르는 정규식»**이다:
 *
 *  - 붙은 수식 떼기 `/\$([^$\n]+)\$\$([^$\n]+)\$/`(textPreprocess.ts)가 앞 인라인의 **닫는** `$`
 *    부터 읽어 `$8$ 이고 $$s=8$$` 를 `$ $$\displaystyle s=8$$$` 로 만들었다(해설지 MathText).
 *  - `breakDisplayMath` 의 `/\$\$…\$\$/`(parseProblemContent.ts)가 `$A$$B$` 의 «닫고-여는»
 *    `$$` 를 표시식으로 읽었다 — 문제 표 해설 4행이 **본문 렌더러에서만** 샜다.
 *  - 여러 줄 `$$`: remark-math 는 줄머리 `$$` 뒤 같은 줄 글을 **메타로 버리고**, 닫는 `$$` 가
 *    제 줄에 없으면 끝까지 삼킨다 — 첫 줄 식이 사라지고 뒤 한글이 수식으로 들어갔다.
 *    본문 렌더러는 거기에 줄머리 이스케이프(`\=`)까지 넣어 붉게 만들었다.
 *  - step 9(구분자 밖 LaTeX 감싸기)가 이미 가려 둔 수식·떠돌이 `$`·코드 따옴표를 삼켜 `$$$` 를 만들었다.
 *  - `\$`(화폐)를 명령으로 감쌌다 · 수식 안 `\$` 에서 remark-math 가 수식을 끊었다.
 *
 * ⚠️ 문자열(전처리 결과)이 아니라 **렌더된 지면**을 본다(`paperView.ts`) — 교훈
 *    «KaTeX 가 초록이라고 지면이 멀쩡한 게 아니다».
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { tokenizeMath } from "@/lib/math/segments";
import {
  decodeHtmlEntities,
  preprocessMathText,
} from "@/lib/math/textPreprocess";
import {
  normalizeOcrText,
  parseProblemContent,
} from "@/lib/problem/parseProblemContent";

import glue from "../fixtures/solutionGlueRows.json";
import {
  hangulOf,
  leaksOf,
  readPaperHtml,
  type PaperView,
} from "../helpers/paperView";

const R = String.raw;
const NL = "\n";

/** 해설을 그리는 세 길 — 정답지·해설(MathText) · 본문(ProblemContent) · 문자열 HTML. */
const EXITS: Array<[string, (text: string) => PaperView]> = [
  [
    "해설지(MathText)",
    (text) =>
      readPaperHtml(renderToStaticMarkup(<MathText as="div" text={text} />)),
  ],
  [
    "본문(ProblemContent)",
    (text) =>
      readPaperHtml(renderToStaticMarkup(<ProblemContent content={text} />)),
  ],
  [
    "문자열(renderMathHtml)",
    // 이 길은 KaTeX 를 html 로만 그려 annotation 이 없다 — 조판된 TeX 는 이 길이 실제로
    // 넘기는 조각(`renderMathHtml` 과 같은 전처리 → 같은 토크나이저)에서 읽는다.
    (text) => ({
      ...readPaperHtml(renderMathHtml(text)),
      formulas: tokenizeMath(preprocessMathText(decodeHtmlEntities(text)))
        .filter((seg) => seg.type !== "text")
        .map((seg) => seg.value),
    }),
  ],
];

interface Case {
  name: string;
  raw: string;
  /** 조판된 수식 수 — 모르면 생략 */
  formulas?: number;
  /** 조판된 수식 TeX 어딘가에 있어야 하는 조각(첫 줄 식이 사라지지 않았다는 증거) */
  tex?: string[];
}

/** 부류표(classes-table.md)의 행 — 지금 깨지는 것. */
const BROKEN: Case[] = [
  // ── K 붙음 — 해설지 `$ $$\displaystyle s=8$$$` ──────────────────────────
  {
    name: "K $a$ 뒤 같은 줄 $$b$$",
    raw: R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
    formulas: 2,
    tex: ["s=8"],
  },
  {
    name: "K $a$ 뒤 빈 줄 + $$b$$ (해설지는 빈 줄을 녹인다)",
    raw: ["이동 거리는 $8$", "", "$$s=8$$"].join(NL),
    formulas: 2,
    tex: ["s=8"],
  },
  {
    name: "K $a$ 뒤 빈 줄 + 따라서 $$b$$",
    raw: ["이동 거리는 $8$", "", "따라서 $$s=8$$"].join(NL),
    formulas: 2,
    tex: ["s=8"],
  },
  {
    name: "F $$A$$$B$ 붙음",
    raw: R`값은 $$a=1$$$b=2$ 이다.`,
    formulas: 2,
    tex: ["a=1", "b=2"],
  },
  {
    name: R`F \( \) · $ · \[ \] · $$ 한 글에`,
    raw: R`\(a=1\) 이고 $b=2$ 이며 \[c=3\] 이고 $$d=4$$ 이다.`,
    formulas: 4,
    tex: ["c=3", "d=4"],
  },
  // ── E 수식 안 줄바꿈 — 첫 줄 식이 사라지고 `\=` 가 붉게 ───────────────────
  {
    name: "E $$ 안 줄바꿈(내용 여러 줄)",
    raw:
      "따라서" +
      NL +
      "$$x(b)-x(a)" +
      NL +
      "= -4-(-12)" +
      NL +
      "= 8$$" +
      NL +
      "이다.",
    formulas: 1,
    tex: ["x(b)-x(a)", "-4-(-12)"],
  },
  {
    name: "E $ 안 줄바꿈",
    raw: "따라서 $x(b)-x(a)" + NL + "= 8$ 이다.",
    formulas: 1,
    tex: ["x(b)-x(a)", "8"],
  },
  {
    name: "E $$ 여러 줄 — 줄머리 - (빼기)",
    raw: "따라서" + NL + "$$x(b)" + NL + "- x(a) = 8$$" + NL + "이다.",
    formulas: 1,
    tex: ["x(b)", "x(a)"],
  },
  {
    name: "E $$ 여러 줄 — 줄머리 +",
    raw: "따라서" + NL + "$$x(b)" + NL + "+ x(a) = 8$$" + NL + "이다.",
    formulas: 1,
    tex: ["x(b)", "x(a)"],
  },
  {
    name: R`E \[ 여러 줄 — 줄머리 =`,
    raw:
      "따라서" +
      NL +
      R`\[` +
      NL +
      "x(b)-x(a)" +
      NL +
      "= 8" +
      NL +
      R`\]` +
      NL +
      "이다.",
    formulas: 1,
    tex: ["x(b)-x(a)"],
  },
  {
    name: R`E $$\begin{aligned} 여러 줄 — 줄머리 &=`,
    raw:
      "따라서" +
      NL +
      R`$$\begin{aligned}` +
      NL +
      R`x(b)-x(a) &= -4-(-12) \\` +
      NL +
      "&= 8" +
      NL +
      R`\end{aligned}$$`,
    formulas: 1,
    tex: ["x(b)-x(a)", "aligned"],
  },
  {
    name: "A $$ 줄머리 열고 다음 줄에서 닫음",
    raw: "따라서" + NL + "$$x(b)-x(a)" + NL + "= 8$$",
    formulas: 1,
    tex: ["x(b)-x(a)"],
  },
  {
    name: "A $$ 홀로 한 줄 열고 닫는 것은 내용 줄 끝",
    raw: "따라서" + NL + "$$" + NL + "x(b)-x(a) = 8$$" + NL + "이다.",
    formulas: 1,
    tex: ["x(b)-x(a)"],
  },
  {
    name: "E 울타리 `$$` 여러 줄(여는·닫는 `$$` 가 제 줄에) — 본문 파서가 줄머리 이스케이프를 넣었다",
    raw:
      "따라서" +
      NL +
      "$$" +
      NL +
      "x(b)-x(a)" +
      NL +
      "= 8" +
      NL +
      "$$" +
      NL +
      "이다.",
    formulas: 1,
    tex: ["x(b)-x(a)", "8"],
  },
  {
    name: "F 짝 맞은 \\( \\) 뒤 같은 줄 \\[ \\] (붙음과 같은 뿌리)",
    raw: R`\(a=1\) 이고 \[b=2\] 이다.`,
    formulas: 2,
    tex: ["a=1", "b=2"],
  },
  // ── step 9 — 가려 둔 수식·떠돌이 `$`·코드 따옴표를 삼켰다 ─────────────────
  {
    name: "A $$ 여는 것만 — 줄머리, 수식만(step 9 가 한 번 더 감쌈)",
    raw: "따라서" + NL + R`$$\int_0^2 v(t)\,dt = 8`,
    formulas: 1,
    tex: [R`\int`, "dt"],
  },
  {
    name: "A $$ 여는 것만 — 문장 중간",
    raw: R`따라서 $$\int_0^2 v(t)\,dt = 8 이다.`,
    formulas: 1,
    tex: [R`\int`, "dt"],
  },
  {
    name: R`C 8\,\mathrm{m} (단위 앞 얇은 간격)`,
    raw: R`값은 8\,\mathrm{m} 이다.`,
    formulas: 1,
    tex: ["8", R`\mathrm{m}`],
  },
  {
    name: "J 코드 따옴표 안 TeX",
    raw: "값은 `" + R`\frac{1}{2}` + "` 이다.",
    formulas: 1,
    tex: ["frac{1}{2}"],
  },
  {
    name: R`D 중첩 $\text{… $x$ …}$`,
    raw: R`$\text{값이 $x$ 일 때}=3$`,
  },
  {
    name: R`G 수식 안 \$`,
    raw: R`$\$5 + \$3 = \$8$`,
    formulas: 1,
  },
];

/** 대조군 — 이미 멀쩡하던 것(report-code.md §5 끝). 고친 뒤에도 그대로여야 한다. */
const CONTROLS: Case[] = [
  { name: "$A$$B$ 붙음", raw: R`값은 $a=1$$b=2$ 이다.`, formulas: 2 },
  { name: "한글$수식$한글", raw: R`이므로$x=2$이다.`, formulas: 1 },
  {
    name: R`$$ 안 \text{한글}`,
    raw: R`$$\text{이동 거리} = x(b)-x(a) = 8$$`,
  },
  {
    name: "$$ 안 빈 줄",
    raw: "따라서" + NL + "$$x(b)-x(a)" + NL + NL + "= 8$$" + NL + "이다.",
    formulas: 1,
  },
  { name: "짝 맞은 \\( \\)", raw: R`값은 \(a=1\) 이다.`, formulas: 1 },
  { name: "짝 맞은 \\[ \\]", raw: R`따라서 \[b=2\]`, formulas: 1 },
  {
    name: "구간 $[a,b]$",
    raw: R`구간 $[a,b]$에서 속도가 0 이상이다.`,
    formulas: 1,
  },
  {
    name: "4칸 들여쓴 수식 줄",
    raw: "따라서" + NL + NL + "    $x(b)-x(a) = 8$" + NL + NL + "이다.",
    formulas: 1,
  },
  { name: "번호 뒤 $$", raw: "1. $$x=2$$" + NL + "2. $$y=3$$", formulas: 2 },
  {
    name: "수식 밖 한글 문장",
    raw: R`$\frac{1}{2}$를 소수로 나타내어라.`,
    formulas: 1,
  },
];

function expectClean(view: PaperView, c: Case) {
  expect(leaksOf(view), `보이는 글자: ${view.visible}`).toEqual([]);
  expect(view.errors, "붉은 KaTeX").toBe(0);
  expect(view.mathRaw, "회색 폴백").toBe(0);
  expect(view.hangul, "한글이 사라지거나 늘었다").toBe(hangulOf(c.raw));
  if (c.formulas !== undefined)
    expect(view.formulas, view.visible).toHaveLength(c.formulas);
  for (const piece of c.tex ?? [])
    expect(view.formulas.join(" ␣ "), `조판된 수식에 «${piece}»`).toContain(
      piece,
    );
}

describe.each(EXITS)("[%s] 부류표 결함 행이 새지 않는다", (_exit, paper) => {
  it.each(BROKEN.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    expectClean(paper(c.raw), c);
  });

  it.each(CONTROLS.map((c) => [c.name, c] as const))(
    "대조군 · %s",
    (_name, c) => {
      expectClean(paper(c.raw), c);
    },
  );
});

describe("[G] `\\$` 화폐는 글자 `$` 로 — 명령으로 감싸지 않는다", () => {
  it.each(EXITS)("%s — 화폐 하나", (_exit, paper) => {
    const view = paper(R`가격은 \$5 이다.`);
    expect(view.visible).toBe("가격은 $5 이다.");
    expect(view.formulas).toHaveLength(0);
    expect(view.errors).toBe(0);
  });

  it.each(EXITS)("%s — 화폐와 수식이 한 글에", (_exit, paper) => {
    const view = paper(R`가격은 \$5 이고 $x=2$ 이다.`);
    expect(view.visible).toBe("가격은 $5 이고 ⟦⟧ 이다.");
    expect(view.formulas).toHaveLength(1);
    expect(view.formulas[0]).toContain("x=2");
    expect(view.errors).toBe(0);
  });
});

/**
 * 문제 표 참고 행(report-data.md) — 인라인 둘이 `$…$$…$` 로 붙은 기출 해설 4행.
 * 본문 렌더러(검수 콘솔·해설 읽기)에서만 샜다. 새는 `\displaystyle` 은 **전처리가 넣은 것**이었고,
 * 지면에 끼던 숫자 0·1·2 는 전처리 자리표시가 샌 것이었다.
 */
describe("[문제 표 참고 행] 붙은 인라인 해설 4행 — 두 렌더러에서 같은 깨끗한 모양", () => {
  const prose = (view: PaperView) =>
    view.visible.replace(/⟦⟧/g, "").replace(/\s+/g, "");

  it.each(glue.rows.map((row) => [row.id.slice(0, 8), row.solution] as const))(
    "%s",
    (_id, solution) => {
      const [[, mathText], [, problemContent]] = EXITS;
      const a = mathText(solution);
      const b = problemContent(solution);
      for (const view of [a, b]) {
        expect(leaksOf(view), view.visible).toEqual([]);
        expect(view.errors).toBe(0);
        expect(view.hangul).toBe(hangulOf(solution));
        // 자리표시 숫자가 샜다면 수식 사이에 맨 숫자가 끼어 보인다.
        expect(view.visible).not.toMatch(/⟦⟧\s*\d\s*⟦⟧/);
      }
      expect(prose(b)).toBe(prose(a));
    },
  );
});

describe("본문 파서가 **수식 안 줄**에 줄머리 이스케이프를 넣지 않는다", () => {
  it("여러 줄 `$$` 의 `- x(a)` · `= 8` 줄", () => {
    const { question } = parseProblemContent(
      "따라서" + NL + "$$x(b)" + NL + "- x(a)" + NL + "= 8$$" + NL + "이다.",
    );
    expect(question).not.toContain(R`\-`);
    expect(question).not.toContain(R`\=`);
  });

  it("수식 **밖** 줄머리는 그대로 막는다(목록으로 읽히지 않게)", () => {
    const { question } = parseProblemContent(
      "첫째 줄이다." + NL + "- 둘째 줄" + NL + "= 셋째 줄",
    );
    expect(question).toContain(R`\- 둘째 줄`);
    expect(question).toContain(R`\= 셋째 줄`);
  });
});

describe("멱등 — 후보정을 두 번 돌려도 같다", () => {
  const all = [...BROKEN, ...CONTROLS].map((c) => c.raw);
  it.each(all.map((raw) => [raw.slice(0, 40), raw] as const))(
    "preprocessMathText · %s",
    (_label, raw) => {
      const once = preprocessMathText(raw);
      expect(preprocessMathText(once)).toBe(once);
    },
  );
  it.each(all.map((raw) => [raw.slice(0, 40), raw] as const))(
    "normalizeOcrText · %s",
    (_label, raw) => {
      const once = normalizeOcrText(raw);
      expect(normalizeOcrText(once)).toBe(once);
    },
  );
});

describe("울타리 표시식은 지금처럼 가운데 표시식으로 선다", () => {
  it("해설지(MathText) — 여러 줄 `\\[…\\]` 는 katex-display", () => {
    const [[, mathText]] = EXITS;
    const view = mathText(
      "따라서" +
        NL +
        R`\[` +
        NL +
        "x(b)-x(a)" +
        NL +
        "= 8" +
        NL +
        R`\]` +
        NL +
        "이다.",
    );
    expect(view.displays).toBe(1);
  });
});
