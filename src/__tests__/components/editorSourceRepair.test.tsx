/**
 * 🔴 RED → 🟢 — 작업실 편집 칸·본문 읽기 칸도 **입구 후보정을 거친다** (원장님 신고 2026-09-26).
 *
 * 원장님: 작업실 해설에 `\displaystyle $$이동 거리= …` 가 날 글자로 샜다. 입구 후보정(`normalizeMathgenText`)은
 * 이미 이 모양을 고치는데, 편집기 렌더러(`SourceEditorRenderer`)는 «편집 토큰은 저장된 수식 그대로여야 한다»며
 * 문서 단위 후보정을 통째로 건너뛰었다(`if (!editorTokens) preprocessMathText(…)`). 그래서 이 표면에서만 샜다 —
 * 해설 읽기·인쇄 해설지는 깨끗했다(«배선을 한쪽만 걸면», 교훈 2026-09-06).
 *
 * 고친 모양: 편집기는 **수식 토큰(편집기가 `$` 로 가르는 것)은 한 글자도 안 바꾸고**, 그 밖에만 입구 후보정
 * 한 함수를 건다(`repairEditorSource`). 입구 후보정은 수식 **안**도 바꾼다(`frac{`→`\frac{` 등 — 아래 «경계») —
 * 그래서 자리표로 가리고 돌린 뒤 되돌린다.
 *
 * 판정은 값이 아니라 **실제 렌더 결과**다: 보이는 글자에 날 `\명령`·외톨이 `$`·`\(` `\[` 가 없고, 한글이 사라지지 않고,
 * 멀쩡하던 대조군은 그대로다. 편집 칸의 «한 글자 고쳐 저장 → 다시 읽기»는 진짜 TipTap 으로 돈다.
 */
import { Editor, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { renderKatexSafe as renderEditorKatex } from "@/components/math/editor/katexRender";
import { splitMathSegments } from "@/components/math/editor/mathSegments";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import SourceEditorRenderer from "@/components/math/editor/SourceEditorRenderer";
import { repairEditorSource } from "@/components/math/editor/sourceRepair";
import {
  documentMarkdown,
  prepareVisualDocument,
} from "@/components/math/editor/visualDocument";
import { ProblemContent } from "@/components/math/ProblemContent";
import { reviveEscapedStyleLeak } from "@/lib/math/escapedStyleLeak";
import { renderKatexSafe as renderLibKatex } from "@/lib/math/katexRender";
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";

import { hangulCount, visibleMath } from "../helpers/visibleMathText";

const R = String.raw;
const L1 = "구간 $[a,b]$에서 속도가 0 이상이므로,";

/** 작업실 본문 읽기 칸(`StudioReviewPane` → `SourceEditorDisplay`)이 보여 주는 것. */
const readCard = (value: string) =>
  visibleMath(renderToStaticMarkup(<SourceEditorDisplay value={value} />));

/** 해설 읽기 칸(`StudioReviewPane` → `ProblemContent`)이 보여 주는 것. */
const solutionRead = (value: string) =>
  visibleMath(renderToStaticMarkup(<ProblemContent content={value} />));

/** 캡처 재현기(`capture-studio.mts`) K1~K4 — 인식이 글 블록에 흘린 모양을 이어 붙인 원문. */
const CAPTURE = {
  K1: `${L1}\n` + R`\displaystyle $$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`,
  K2: `${L1} ` + R`\displaystyle $$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`,
  K3:
    "구간에서 속도가 0 이상이므로,\n" +
    R`\displaystyle \text{이동 거리}= x(b)-x(a) = -4-(-12) = 8.`,
  K5: `${L1}\n이동 거리는 $x(b)-x(a) = 8$이다.`,
};

describe("🔴 편집기 렌더러 — 신고 모양(캡처)이 읽기 칸·편집 칸에서 새지 않는다", () => {
  it("K1 줄머리 `\\displaystyle $$이동 거리=` — 날 글자 없이 두 식이 조판된다", () => {
    const view = readCard(CAPTURE.K1);
    expect(view.leaks).toEqual([]);
    expect(view.text).toContain("이동 거리=");
    expect(view.math).toBe(2);
    expect(view.hangul).toBe(hangulCount(CAPTURE.K1));
  });

  it("K3 구분자 없이 흘린 `\\displaystyle \\text{이동 거리}= …` — 식이 서고 한글이 남는다", () => {
    const view = readCard(CAPTURE.K3);
    expect(view.leaks).toEqual([]);
    expect(view.red).toBe(0);
    expect(view.math).toBeGreaterThan(0);
    expect(view.hangul).toBe(hangulCount(CAPTURE.K3));
  });

  it("K5 대조 — 멀쩡한 인식은 그대로다", () => {
    expect(repairEditorSource(CAPTURE.K5)).toBe(CAPTURE.K5);
    expect(readCard(CAPTURE.K5).leaks).toEqual([]);
  });
});

/**
 * 부류표 «⑦에서만 새는 것» — 입구 후보정이 고치는데 편집기만 날것으로 그리던 모양.
 * (구분자 밖 `\text{}`·`\frac`·`\left(`·`\overline`, `\(…\)` 가 괄호 글로 바뀌던 것, JSON 잔재 `\n`)
 */
const EDITOR_ONLY: Array<[string, string]> = [
  ["\\text{한글} 밖", R`따라서 \text{이동 거리} 는 8이다.`],
  ["\\frac 밖 + 붙은 한글", R`넓이는 \frac{1}{2}이다.`],
  ["\\left( \\right) 밖", R`값은 \left(\frac{1}{2}\right)^2 이다.`],
  ["\\overline{AB} 밖", R`선분 \overline{AB} 의 길이는 3이다.`],
  ["\\mathrm 밖", R`단위는 \mathrm{cm} 이다.`],
  ["\\therefore 밖 + 한글", R`\therefore 답은 8이다.`],
  ["\\displaystyle 줄머리, 뒤는 한글", R`\displaystyle 이동 거리는 8이다.`],
  ["\\displaystyle 을 $ 뒤에 흘림", R`$x=2$\displaystyle 이므로 8이다.`],
  ["JSON 잔재 글자 \\n", R`따라서 $x=2$ 이다.\n다음으로 $y=3$ 이다.`],
];

describe("🔴 편집기에서만 새던 모양 — 입구를 거친 화면과 같은 모양이 된다", () => {
  it.each(EDITOR_ONLY)("%s", (_name, raw) => {
    const view = readCard(raw);
    expect(view.leaks).toEqual([]);
    expect(view.red).toBe(0);
    expect(view.hangul).toBe(hangulCount(raw));
  });

  it("`\\(f(x)=x^2\\)` 가 괄호 글 `(f(x)=x^2)` 로 조용히 바뀌지 않고 식으로 선다", () => {
    const raw = R`함수 \(f(x)=x^2\)에 대하여 \(f(2)\)의 값은?`;
    const view = readCard(raw);
    expect(view.math).toBe(2);
    expect(view.text).not.toContain("(f(x)=x^2)");
    expect(view.text).toBe("함수 ⟦수식⟧ 에 대하여 ⟦수식⟧ 의 값은?");
  });
});

/**
 * 🔴 경계 — 입구 후보정은 수식 **안**도 바꾼다(아래 첫 시험이 그 사실을 적는다). 편집 칸의 수식은 원장님이 고치는
 * «저장된 식»이라 한 글자도 바뀌면 안 된다(빈 분수 칸 `\frac{}{2}`, 적어 둔 `\displaystyle` …).
 */
describe("경계 — 수식 토큰은 한 글자도 안 바뀌고, 수식 밖만 고쳐진다", () => {
  const INSIDE = [
    R`값은 $frac{1}{2}$ 이다.`,
    R`값은 $sqrt{2}$ 이다.`,
    R`값은 $\textcircled{1}$ 이다.`,
    "값은 $\frac{1}{2}$ 이다.", // 폼피드 + rac (JSON 이 먹은 \f)
  ];

  it("입구 후보정은 수식 안을 바꾼다 — 그래서 경계가 필요하다", () => {
    for (const raw of INSIDE) expect(normalizeMathgenText(raw)).not.toBe(raw);
  });

  it.each(INSIDE.map((raw) => [JSON.stringify(raw), raw]))(
    "편집기 원문 복구는 %s 의 수식 토큰을 그대로 둔다",
    (_name, raw) => {
      expect(repairEditorSource(raw)).toBe(raw);
    },
  );

  it("밖을 고치는 같은 글 안에서도 토큰은 그대로다 — 편집 칸이 싣는 식(`data-math-tex`)이 원문과 같다", () => {
    // 둘째 식의 `sqrt{2}` 는 입구 후보정이 `\sqrt{2}` 로 바꾸는 모양이다 — 가리지 않고 돌리면 토큰이 바뀌어
    // 복구를 통째로 버려야 하고(밖의 누출이 남는다), 가리면 밖만 고쳐진다.
    const raw =
      `${L1}\n` +
      R`\displaystyle $$이동 거리= $\frac{}{2}+\displaystyle x+sqrt{2}$`;
    const html = renderToStaticMarkup(
      <SourceEditorRenderer content={raw} editorTokens />,
    );
    const tex = [...html.matchAll(/data-math-tex="([^"]*)"/g)].map((m) =>
      decodeURIComponent(m[1]!),
    );
    expect(tex).toEqual(["[a,b]", R`\frac{}{2}+\displaystyle x+sqrt{2}`]);
    expect(visibleMath(html).leaks).toEqual([]);
  });
});

/** report-code.md §5 끝 대조군 — 이미 멀쩡한 글. 편집기 원문 복구가 한 글자도 안 바꾼다. */
const CONTROLS = [
  R`$이동 거리 = 8$`,
  R`$$\text{이동 거리} = x(b)-x(a) = 8$$`,
  R`$$\begin{aligned}\text{이동 거리} &= x(b)-x(a) \\ &= -4-(-12) = 8\end{aligned}$$`,
  R`이므로$x=2$이다.`,
  R`이므로$$x=2$$이다.`,
  R`값은 $a_1 * b_1 * c$ 이고 $x_2$ 이다.`,
  "따라서\n$$x(b)-x(a)\n\n= 8$$\n이다.",
  "1. $$x=2$$\n2. $$y=3$$",
  "따라서\n\n    $x(b)-x(a) = 8$\n\n이다.",
  R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
  // 편집기가 저장하며 이스케이프한 글자 — 화폐 `\$`, 친 역슬래시 `\\`, 굵게 표지 `\*`.
  R`가격은 \$5 이고 $x=2$ 이다.`,
  R`경로는 C:\\data 이다.`,
  R`별표 \*는 곱이 아니다.`,
  "<보기>\nㄱ. [그림1]\nㄴ. [그림2]",
  "> <보기>\n>\n> ㄱ. $x=1$\n> ㄴ. $y=2$",
];

describe("대조군 — 멀쩡한 글은 그대로다", () => {
  it.each(CONTROLS.map((raw) => [JSON.stringify(raw), raw]))(
    "%s",
    (_n, raw) => {
      expect(repairEditorSource(raw)).toBe(raw);
    },
  );
});

describe("멱등 — 두 번 돌려도 같다", () => {
  const ALL = [
    ...Object.values(CAPTURE),
    ...EDITOR_ONLY.map(([, raw]) => raw),
    ...CONTROLS,
    R`따라서 $$\int_0^2 v(t)\,dt = 8 이다.`,
    R`\(a=1\) 이고 $b=2$ 이며 \[c=3\] 이고 $$d=4$$ 이다.`,
    R`값은 $a=1$$b=2$ 이다.`,
    R`$\text{값이 $x$ 일 때}=3$`,
  ];
  it.each(ALL.map((raw) => [JSON.stringify(raw).slice(0, 60), raw]))(
    "%s",
    (_n, raw) => {
      const once = repairEditorSource(raw);
      expect(repairEditorSource(once)).toBe(once);
    },
  );
});

/**
 * 고정점 — 편집 칸은 보이는 글을 그대로 저장한다. 후보정이 한 번 더 돌면 달라지는 자리(구분자 밖 `\int … \,dt` 에서
 * `\,` 의 쉼표를 깎아 `\$` 를 지어낸다 — 입구 후보정 `mathRunEnd`)를 실으면 지어낸 `\$` 가 저장본에 굳는다.
 */
describe("🔴 고정점이 아닌 복구는 싣지 않는다 — 후보정이 지어낸 `\\$` 가 저장본에 굳지 않는다", () => {
  const LOOSE_THIN_SPACE = [
    R`적분은 \int_0^2 v(t)\,dt = 8 이다.`,
    R`따라서 \int_0^2 |v(t)|\,dt이다.`,
    R`속도가 양수이므로 \[\int_0^2 v(t)\,dt = 8 이다.`,
  ];

  it.each(LOOSE_THIN_SPACE.map((raw) => [raw, raw]))("%s", (_n, raw) => {
    const shown = repairEditorSource(raw);
    expect(repairEditorSource(shown)).toBe(shown);
    expect(shown).not.toMatch(/\\\$/);
    expect(typeAndSave(raw)).not.toMatch(/\\\$/);
  });
});

/**
 * H — 편집 칸에서 한 번 저장하면 글 노드의 `\`·`$` 가 이스케이프돼(`visualDocument.ts` `documentMarkdown`)
 * 누출이 `\\displaystyle \$\$이동 거리=` 로 **굳는다**. 이 모양은 편집기 이스케이프가 만든 것이 분명하므로
 * (사람이 글로 `\displaystyle $$` 를 칠 리 없다) 되살릴 수 있다 — 원장님 IndexedDB 에 남아 있을 수 있다.
 */
describe("🔴 이미 굳은 저장본 — `\\\\displaystyle \\$\\$` + 한글을 되살린다", () => {
  const HARDENED =
    `${L1}\n` + R`\\displaystyle \$\$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`;

  it("읽기 칸에 역슬래시·달러가 새지 않고 한글이 남는다", () => {
    const view = readCard(HARDENED);
    expect(view.leaks).toEqual([]);
    expect(view.text).toContain("이동 거리=");
    expect(view.hangul).toBe(hangulCount(HARDENED));
  });

  it("되살리기는 편집기 이스케이프 모양만 푼다 — 친 역슬래시·화폐는 그대로", () => {
    expect(reviveEscapedStyleLeak(R`\\displaystyle \$\$이동`)).toBe(
      R`\displaystyle $$이동`,
    );
    expect(reviveEscapedStyleLeak(R`\\displaystyle 이동`)).toBe(
      R`\displaystyle 이동`,
    );
    for (const kept of [
      R`가격은 \$\$5 이다.`,
      R`경로는 C:\\data 이다.`,
      R`$\displaystyle x$`,
      R`\\\displaystyle x`,
    ])
      expect(reviveEscapedStyleLeak(kept)).toBe(kept);
  });
});

/* ── 왕복: 렌더러 → 변환 → 진짜 TipTap → 한 글자 고침 → 저장(documentMarkdown) → 다시 읽기 ── */
const VisualMath = Node.create({
  name: "visualMath",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ tex: { default: "" }, display: { default: false } }),
  // 편집기(`SourceMathTextEditor` `createMathNode`)와 같은 파싱 규칙.
  parseHTML: () => [
    {
      tag: "[data-math-tex]",
      getAttrs: (element) => ({
        tex: decodeURIComponent((element as HTMLElement).dataset.mathTex ?? ""),
        display: (element as HTMLElement).dataset.mathDisplay === "true",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "span",
    { "data-math-tex": encodeURIComponent(node.attrs.tex) },
  ],
});

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.replaceChildren();
});

/** «내용 수정»·«풀이» 칸을 여는 길 그대로 — 렌더러 → 변환 → 편집기 문서. */
function open(value: string) {
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, VisualMath],
    content: prepareVisualDocument(
      renderToStaticMarkup(
        <SourceEditorRenderer content={value} editorTokens />,
      ),
    ),
  });
  return editor;
}

/** 첫 문단 맨 앞에 한 글자를 치고 저장한 값. */
function typeAndSave(value: string, letter = "및") {
  const current = open(value);
  current.commands.insertContentAt(1, letter);
  const saved = documentMarkdown(current.getJSON());
  current.destroy();
  editor = undefined;
  return saved;
}

describe("🔴 왕복 — 한 글자 고쳐 저장한 뒤 다시 읽어도 같은 모양", () => {
  it.each([
    ["캡처 K1", CAPTURE.K1],
    [
      "굳은 저장본",
      `${L1}\n` + R`\\displaystyle \$\$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`,
    ],
    ["구분자 밖 \\text", CAPTURE.K3],
    ["대조", CAPTURE.K5],
  ])("%s", (_name, raw) => {
    const before = readCard(raw);
    const saved = typeAndSave(raw);
    // 저장본에 누출이 이스케이프로 굳지 않는다.
    expect(saved).not.toMatch(/\\\\(?:displaystyle|text)|\\\$/);
    const after = readCard(saved);
    expect(after.leaks).toEqual([]);
    expect(after.text).toBe(`및${before.text}`);
    expect(after.math).toBe(before.math);
    // 같은 저장값을 해설 읽기 칸(ProblemContent)으로 읽어도 새지 않는다 — 모든 화면 일치.
    expect(solutionRead(saved).leaks).toEqual([]);
  });

  it("저장값을 다시 열어 또 저장해도 같은 글이다", () => {
    const saved = typeAndSave(CAPTURE.K1);
    const current = open(saved);
    expect(documentMarkdown(current.getJSON())).toBe(saved);
  });
});

/** I — 붉은 날글자 판정이 편집기와 지면에서 같아야 한다(KaTeX 0.16 은 모르는 명령을 `#cc0000` 으로 그린다). */
describe("🔴 편집기 KaTeX 안전망도 `#cc0000` 을 실패로 본다", () => {
  it.each([R`\unknowncmd x`, R`\foo{1}+2`])("%s", (tex) => {
    const editorHtml = renderEditorKatex(tex, false);
    expect(editorHtml).not.toMatch(/#cc0000|katex-error/i);
    // 지면(lib)과 같은 결론 — 둘 다 회색 폴백이거나 둘 다 조판.
    expect(editorHtml.includes("math-raw")).toBe(
      renderLibKatex(tex, false).includes("math-raw"),
    );
  });
});

/**
 * F — 편집기 모듈에 문서 단위 전처리 사본(`preprocessMathText`·`repairProsePrefixedInlineMath` …)이 규칙이 다른 채
 * 남아 있었다(제품에서는 읽기 전용 모드만 불렀다). 두 벌이면 한쪽만 고쳐도 아무도 모른다 — 다시 생기면 빨갛다.
 */
describe("규칙이 다른 두 벌을 남기지 않는다", () => {
  it("편집기 모듈에 문서 단위 전처리 사본이 없다", async () => {
    const editorPreprocess =
      await import("@/components/math/editor/textPreprocess");
    for (const name of [
      "preprocessMathText",
      "repairProsePrefixedInlineMath",
      "extractHangulFromMath",
      "decodeHtmlEntities",
      "LATEX_WRAP_TRIGGER_SOURCE",
    ])
      expect(editorPreprocess).not.toHaveProperty(name);
  });
});

describe("토큰 가르기는 편집기 렌더러와 같은 자(`splitMathSegments`)", () => {
  it("복구 뒤 원문의 수식 토큰이 같은 차례로 남는다", () => {
    const raw = CAPTURE.K1;
    const tokens = (s: string) =>
      splitMathSegments(s)
        .filter((segment) => segment.kind !== "text")
        .map((segment) => segment.value);
    expect(tokens(repairEditorSource(raw))).toEqual(tokens(raw));
  });
});
