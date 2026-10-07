// @vitest-environment jsdom
/**
 * Fraction choices of a new bank problem are set as rows with room around their formulas, so a
 * display fraction's denominator no longer meets the next choice's numerator. The rows are tags
 * only: the content, its TeX and the order of the choices stay as stored, and saved legacy and
 * original-source problems keep the bytes they had. All text here is synthetic.
 */
import katex from "katex";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  dialogueMarkdownHtml,
  v15DisplayMarkdown,
} from "@/lib/textbook/render/blocks/dialogue";
import {
  CHOICE_FORMULA_CLEARANCE_EM,
  CHOICE_ROW_CLASS,
  FRACTION_CHOICE_CSS,
  formulaExtentEm,
  fractionChoiceRows,
  hasTallFormula,
} from "@/lib/textbook/render/blocks/fractionChoiceRows";
import { renderProblemHtml } from "@/lib/textbook/render/blocks/problem";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import { renderTextbookMarkdown as md } from "@/lib/textbook/render/markdown";
import type { RenderBlock } from "@/lib/textbook/render/model";

type Problem = Extract<RenderBlock, { kind: "problem" }>;
const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
/** The rendered prompt with every choice row tag, and its own closing tag, taken out again. */
function unwrap(html: string): string {
  let out = "";
  let at = 0;
  const rows: boolean[] = [];
  for (const tag of html.matchAll(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g,
  )) {
    if (/^(br|hr|img)$/i.test(tag[2]) || tag[3]) continue;
    const drop = tag[1]
      ? rows.pop()
      : rows.push(tag[0].startsWith(`<span class="${CHOICE_ROW_CLASS}"`)) &&
        rows[rows.length - 1];
    if (!drop) continue;
    out += html.slice(at, tag.index);
    at = tag.index + tag[0].length;
  }
  return out + html.slice(at);
}
const prose = (html: string) =>
  /<div class="tb-prose">([\s\S]*?)<\/div><\/div><\/div>/.exec(html)![1];

const fractions = [
  "다음 중 가장 큰 수는?",
  "① $\\dfrac{1}{3}$",
  "② $\\dfrac{2}{5}$",
  "③ $\\dfrac{3}{7}$",
  "④ $-\\dfrac{4}{9}$",
  "⑤ $\\dfrac{5}{11}$",
].join("\n");

function problem(content: string, extra: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    sourceBlockId: "p1",
    unitKey: "U02",
    sectionKey: "s1",
    kind: "problem",
    itemId: "item-1",
    displayNumber: "7",
    content,
    figures: [],
    questionType: "객관식",
    sourcePageLabel: null,
    qr: null,
    layout: {
      columnSpan: 1,
      minWorkLines: 2,
      preferredWorkLines: 3,
      maxWorkLines: 10,
      keepTogether: true,
    },
    semantic: { activity: "basicCheck" },
    ...extra,
  } as unknown as Problem;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

describe("the formula extent the rows are decided on", () => {
  const extent = (tex: string) =>
    formulaExtentEm(
      katex.renderToString(tex, {
        output: "html",
        throwOnError: true,
        strict: false,
        trust: false,
      }),
    );

  it("reads KaTeX's own struts, so a display fraction reaches beyond a text line", () => {
    expect(extent("2")).toEqual({ up: 0.6444, down: 0 });
    expect(extent("\\dfrac{1}{2}").up).toBeCloseTo(1.3214, 4);
    expect(extent("\\dfrac{1}{2}").down).toBeCloseTo(0.686, 4);
    expect(extent("\\frac{1}{2}").down).toBeCloseTo(0.345, 4);
    // A nested display fraction is twice as tall above the baseline.
    expect(extent("\\dfrac{\\dfrac{1}{2}}{3}").up).toBeCloseTo(2.3974, 4);
  });

  it("calls fractions and other stacked formulas tall, but not brackets, radicals or powers", () => {
    const tall = (tex: string) =>
      hasTallFormula(
        katex.renderToString(tex, { output: "html", strict: false }),
      );
    for (const tex of [
      "\\dfrac{1}{2}",
      "\\frac{1}{2}",
      "{1 \\over 2}",
      "1\\dfrac{2}{3}",
      "\\dfrac{\\sqrt{3}}{2}",
      "\\left(\\frac{1}{2}\\right)^2",
      "\\begin{cases} x+y=1 \\\\ x-y=3 \\end{cases}",
    ])
      expect(tall(tex), tex).toBe(true);
    for (const tex of [
      "2",
      "-2y",
      "(x+1)^2",
      "\\sqrt{2}",
      "\\sqrt{x^2+1}",
      "2^{10}",
      "|x|",
      "\\overline{AB}",
      "0.\\dot{3}",
      "30^\\circ",
      "\\sum_{k=1}^{n} k",
    ])
      expect(tall(tex), tex).toBe(false);
  });

  it("finds nothing in text without formulas", () => {
    expect(formulaExtentEm("① 가")).toEqual({ up: 0, down: 0 });
    expect(hasTallFormula("① 가")).toBe(false);
  });
});

describe("which lines become choice rows", () => {
  it("wraps each of the five choice lines in order and leaves the stem outside", () => {
    const html = renderProblemHtml(problem(fractions), resources);
    const rows = Array.from(
      parse(html).querySelectorAll<HTMLElement>(
        `.tb-prose .${CHOICE_ROW_CLASS}`,
      ),
    );
    expect(rows.map((r) => r.dataset.choiceRow)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(rows.map((r) => r.textContent!.trim()[0])).toEqual([
      "①",
      "②",
      "③",
      "④",
      "⑤",
    ]);
    // Every row holds exactly one display fraction, and the stem is not a row.
    for (const row of rows)
      expect(row.querySelectorAll(".mfrac")).toHaveLength(1);
    const p = parse(html).querySelector(".tb-prose > p")!;
    expect(p.firstChild!.textContent).toBe("다음 중 가장 큰 수는?");
    expect(p.querySelectorAll(":scope > br")).toHaveLength(5);
    expect(p.querySelectorAll(`:scope > .${CHOICE_ROW_CLASS}`)).toHaveLength(5);
  });

  it("agrees with the shared parser on the number of choices", () => {
    expect(parseProblemContent(fractions).choices).toHaveLength(5);
    const rendered = md(fractions);
    // A count the parser did not find leaves the prompt untouched.
    expect(fractionChoiceRows(rendered, 4)).toBe(rendered);
    expect(fractionChoiceRows(rendered, 6)).toBe(rendered);
    expect(fractionChoiceRows(rendered, 5)).not.toBe(rendered);
  });

  it("marks every choice when only one of them has a fraction", () => {
    const content = [
      "다음 중 옳은 것은?",
      "① $2$",
      "② $\\dfrac{1}{2}$",
      "③ $3x$",
      "④ 없다",
      "⑤ $-1$",
    ].join("\n");
    const rows = parse(
      renderProblemHtml(problem(content), resources),
    ).querySelectorAll(`.${CHOICE_ROW_CLASS}`);
    expect(rows).toHaveLength(5);
  });

  it("sets text-style fractions as rows too, and a nested display fraction", () => {
    for (const choice of ["\\frac{1}{2}", "\\dfrac{\\dfrac{1}{2}}{3}"]) {
      const content = `물음\n① $${choice}$\n② $1$\n③ $2$`;
      expect(
        parse(renderProblemHtml(problem(content), resources)).querySelectorAll(
          `.${CHOICE_ROW_CLASS}`,
        ),
        choice,
      ).toHaveLength(3);
    }
  });

  it("keeps a long choice that wraps inside one row", () => {
    const long = `① $\\dfrac{1}{2}$ 보다 크고 ${"가나다라 ".repeat(30)}것`;
    const content = `물음\n${long}\n② $\\dfrac{1}{3}$`;
    const rows = parse(
      renderProblemHtml(problem(content), resources),
    ).querySelectorAll(`.${CHOICE_ROW_CLASS}`);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("가나다라 ".repeat(30).trim());
  });

  it("leaves choices without a tall formula exactly as Markdown rendered them", () => {
    for (const content of [
      "다음 중 소수는?\n① $4$\n② $6$\n③ $7$\n④ $9$\n⑤ $10$",
      "다음 중 옳은 것은?\n① $\\sqrt{2}$\n② $(x+1)^2$\n③ $2^{10}$\n④ $-2y$\n⑤ $|x|$",
      "다음 중 옳은 것은?\n① 가\n② 나\n③ 다",
    ]) {
      const html = renderProblemHtml(problem(content), resources);
      expect(prose(html)).toBe(md(content));
      expect(html).not.toContain(CHOICE_ROW_CLASS);
    }
  });

  it("does not make rows out of a fraction in the stem when the choices are plain", () => {
    const content = "$\\dfrac{3}{4}$ 의 역수는?\n① $3$\n② $4$\n③ $\\sqrt{3}$";
    const html = renderProblemHtml(problem(content), resources);
    expect(prose(html)).toBe(md(content));
  });

  it("leaves the stem math alone when the choices are rows", () => {
    const content =
      "$\\dfrac{3}{4}$ 와 $\\dfrac{5}{6}$ 사이의 수는?\n① $\\dfrac{7}{9}$\n② $\\dfrac{2}{3}$";
    const html = renderProblemHtml(problem(content), resources);
    const p = parse(html).querySelector(".tb-prose > p")!;
    // The first two formulas are the stem's, outside every row.
    const stem = Array.from(p.childNodes).slice(0, 4);
    expect(
      stem.some((n) => (n as Element).classList?.contains(CHOICE_ROW_CLASS)),
    ).toBe(false);
    expect(
      stem.filter((n) => (n as Element).matches?.("[data-textbook-math]")),
    ).toHaveLength(2);
    expect(p.querySelectorAll(`.${CHOICE_ROW_CLASS}`)).toHaveLength(2);
  });

  it("leaves shapes it does not recognise as they were", () => {
    const shapes = [
      // Out of order, a skipped mark, several choices on one line, number marks, one choice.
      "물음\n② $\\dfrac{1}{2}$\n① $\\dfrac{1}{3}$",
      "물음\n① $\\dfrac{1}{2}$\n③ $\\dfrac{1}{3}$",
      "물음\n① $\\dfrac{1}{2}$ ② $\\dfrac{1}{3}$ ③ $\\dfrac{1}{4}$",
      "물음\n1. $\\dfrac{1}{2}$\n2. $\\dfrac{1}{3}$",
      "물음\n① $\\dfrac{1}{2}$",
      // Choices that open inside emphasis do not start with a mark.
      "물음\n**① $\\dfrac{1}{2}$\n② $\\dfrac{1}{3}$**",
      // A stem line that opens with a mark makes the marks repeat.
      "①번 물음\n① $\\dfrac{1}{2}$\n② $\\dfrac{1}{3}$",
    ];
    for (const content of shapes) {
      const html = renderProblemHtml(problem(content), resources);
      expect(prose(html), content).toBe(md(content));
    }
    // Choices inside a list are not top-level paragraph lines.
    const listed = md("- ① $\\dfrac{1}{2}$\n- ② $\\dfrac{1}{3}$");
    expect(fractionChoiceRows(listed, 2)).toBe(listed);
  });

  it("reads only top-level paragraphs, so a quoted mark never pairs with a later line", () => {
    const tall = `<span data-textbook-math>${katex.renderToString("\\dfrac{1}{2}", { output: "html" })}</span>`;
    // Without the depth check the quote's paragraph would open a line that ends inside the
    // following block and cut across both: a row tag that could not close where it opened.
    const html = `<blockquote><p>① ${tall}</p></blockquote><div>가<br>나</div><p>② ${tall}</p>`;
    expect(fractionChoiceRows(html, 2)).toBe(html);
  });

  it("returns the input for malformed markup", () => {
    expect(fractionChoiceRows("</p>① x", 2)).toBe("</p>① x");
    expect(fractionChoiceRows("<p>① x<br>② y", 2)).toBe("<p>① x<br>② y");
  });

  it("keeps a break inside emphasis inside its own line, so every row stays well formed", () => {
    for (const content of [
      // The break is in the stem.
      "물음 **강조\n계속** 이다.\n① $\\dfrac{1}{2}$\n② $\\dfrac{1}{3}$",
      // The break is inside the first choice.
      "물음\n① **$\\dfrac{1}{2}$\n강조**\n② $\\dfrac{1}{3}$",
    ]) {
      expect(parseProblemContent(content).choices, content).toHaveLength(2);
      const html = renderProblemHtml(problem(content), resources);
      const rows = parse(html).querySelectorAll<HTMLElement>(
        `.tb-prose > p > .${CHOICE_ROW_CLASS}`,
      );
      expect(rows, content).toHaveLength(2);
      expect(rows[0].textContent!.trim()[0]).toBe("①");
      expect(rows[1].textContent!.trim()[0]).toBe("②");
      // Every emphasis closes inside the line it opened in.
      for (const row of Array.from(rows))
        expect(row.innerHTML.split("<strong>").length).toBe(
          row.innerHTML.split("</strong>").length,
        );
      expect(unwrap(prose(html))).toBe(md(content));
    }
  });

  it("finds choices that sit in a paragraph after the stem's own paragraph", () => {
    const content =
      "다음을 읽고 답하시오.\n\n물음\n① $\\dfrac{1}{2}$\n② $\\dfrac{1}{3}$";
    const html = renderProblemHtml(problem(content), resources);
    const ps = parse(html).querySelectorAll(".tb-prose > p");
    expect(ps).toHaveLength(2);
    expect(ps[0].querySelectorAll(`.${CHOICE_ROW_CLASS}`)).toHaveLength(0);
    expect(ps[1].querySelectorAll(`.${CHOICE_ROW_CLASS}`)).toHaveLength(2);
  });
});

describe("what the rows must not change", () => {
  it("only adds tags: without them the prompt is the Markdown rendering, TeX and order included", () => {
    const html = renderProblemHtml(problem(fractions), resources);
    expect(unwrap(prose(html))).toBe(md(fractions));
    // The display fractions are still display fractions: no text-style fraction appears.
    const dom = parse(html);
    const fracs = Array.from(dom.querySelectorAll(".tb-prose .mfrac"));
    expect(fracs).toHaveLength(5);
    for (const f of fracs) expect(f.closest(".mtight")).toBeNull();
    expect(dom.querySelector(".tb-prose .mtight")).toBeNull();
  });

  it("does not touch the stored block", () => {
    const block = deepFreeze(
      problem(fractions, {
        answer: "③",
        solution: "$\\dfrac{3}{7}$ 이 가장 크다.",
      } as Partial<Problem>),
    );
    const before = JSON.stringify(block);
    renderProblemHtml(block, resources);
    renderBlockHtml(block, resources);
    expect(JSON.stringify(block)).toBe(before);
    expect(block.content).toBe(fractions);
  });

  it("leaves a problem saved without semantic metadata byte for byte as before", () => {
    const legacy = problem(fractions, {
      semantic: undefined,
    } as Partial<Problem>);
    delete (legacy as { semantic?: unknown }).semantic;
    const html = renderProblemHtml(legacy, resources);
    expect(html).not.toContain(CHOICE_ROW_CLASS);
    expect(prose(html)).toBe(md(fractions));
    // The same block with semantic metadata differs only by the row tags.
    const bank = renderProblemHtml(problem(fractions), resources);
    expect(unwrap(bank).replace(' data-activity="basicCheck"', "")).toBe(html);
  });

  it("leaves an original-source problem on its own display path", () => {
    const source = problem(fractions, {
      semantic: {
        activity: "basicCheck",
        source: { unit: "U02", page: 30, kind: "basic", path: "pages[29]" },
      },
    } as Partial<Problem>);
    const html = renderProblemHtml(source, resources);
    expect(html).not.toContain(CHOICE_ROW_CLASS);
    expect(prose(html)).toBe(
      dialogueMarkdownHtml(v15DisplayMarkdown(fractions)),
    );
  });

  it("keeps the answer and the solution untouched in the answer book", () => {
    const answer = "③";
    const solution =
      "$\\dfrac{3}{7}$ 이 가장 크다.\n$\\dfrac{1}{3}$ 보다 크다.";
    const html = renderProblemHtml(
      problem(fractions, {
        answer,
        solution,
        layout: {
          columnSpan: 2,
          minWorkLines: 2,
          preferredWorkLines: 3,
          maxWorkLines: 10,
          keepTogether: true,
        },
        answerPlacement: "beside",
      } as Partial<Problem>),
      resources,
    );
    const dom = parse(html);
    // The question half has the rows; the answer half is the Markdown it always was.
    expect(
      dom.querySelectorAll(`.tb-answer-case-question .${CHOICE_ROW_CLASS}`),
    ).toHaveLength(5);
    expect(dom.querySelector(`.tb-answer .${CHOICE_ROW_CLASS}`)).toBeNull();
    expect(html).toContain(`${md(answer)}<div>${md(solution)}</div></section>`);
  });

  it("sets the rows in a linked worked example as well", () => {
    const html = renderProblemHtml(
      problem(fractions, {
        semantic: {
          activity: "basicCheck",
          node: {
            kind: "exampleGroup",
            groupId: "g1",
            title: "대표예제",
            strategy: "같은 유형",
            exampleItemId: "item-1",
            confirmItemIds: ["item-2"],
          },
        },
      } as Partial<Problem>),
      resources,
    );
    expect(parse(html).querySelectorAll(`.${CHOICE_ROW_CLASS}`)).toHaveLength(
      5,
    );
  });
});

describe("the clearance rule handed to the page CSS", () => {
  it("adds room only around formulas inside a problem's choice rows", () => {
    expect(FRACTION_CHOICE_CSS).toBe(
      `.tb-problem .${CHOICE_ROW_CLASS} .katex .katex-base{margin-block:${CHOICE_FORMULA_CLEARANCE_EM}em}`,
    );
    expect(FRACTION_CHOICE_CSS).not.toMatch(/<\/style/i);
    // One rule: no font size, no line height and nothing outside the rows.
    expect(FRACTION_CHOICE_CSS.match(/\{/g)).toHaveLength(1);
    expect(FRACTION_CHOICE_CSS).not.toMatch(/font|line-height|transform|scale/);
  });
});
