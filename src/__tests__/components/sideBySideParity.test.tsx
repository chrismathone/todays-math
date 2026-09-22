/**
 * 🔴 RED → 🟢 — «나란히» 묶음이 검수 카드 · 지면 · 편집기에서 **같은 칸**이다 (원장님 2026-09-22 확정).
 *
 * 원장님: «이런 보기들도 2열 4열 등으로 배치가능하게. 1열 고정같은데». 서답형 소문항 (1)~(4) 가 그림을 달고
 * 세로로만 쌓였다. 내용 수정에서 소문항을 고르고 [나란히] 를 누르면 테두리·제목 없는 칸 묶음
 * `> <나란히:cols=N>` 이 되고, 〈보기〉 상자처럼 묶음 위 1열·2열·3열·4열 로 바꾼다.
 *
 * 같은 문제는 같은 뷰(원장님 최우선 규칙) — 같은 원문이면 세 길이 같은 칸 수·같은 칸 내용을 그린다.
 * 실제 렌더러 → 실제 변환 → 실제 TipTap 파서를 그대로 지난다(그림·수식 노드만 같은 이름·같은 파싱 규칙의 대역).
 */
import { Editor, Node, type JSONContent } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { ConditionBox } from "@/components/math/editor/conditionBox";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import SourceEditorRenderer, {
  type MarkdownRendererProps,
} from "@/components/math/editor/SourceEditorRenderer";
import {
  documentMarkdown,
  prepareVisualDocument,
} from "@/components/math/editor/visualDocument";
import NativeProblem from "@/components/unified/NativeProblem";
import { SIDE_BY_SIDE_SPACING } from "@/lib/math/boxFit";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";

import { RAW, SIDE_Q } from "../fixtures/sideBySide";

const FOUR = [1, 2, 3, 4];
const CROPS: MarkdownRendererProps["imageCrops"] = FOUR.map((n) => ({
  src: `/api/library/assets/figure-${n}`,
}));
const SVGS: MarkdownRendererProps["diagramSvgs"] = FOUR.map((n) => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="${n}"/></svg>`,
}));

/** 칸마다 «글자만» — 그림은 `그림`, 공백 정리. 세 길을 같은 잣대로 견준다. */
const cellText = (element: Element) =>
  [...element.childNodes]
    .map(function walk(node): string {
      if (node.nodeType === 3) return node.textContent ?? "";
      const el = node as Element;
      if (
        el.tagName === "IMG" ||
        el.tagName === "svg" ||
        el.hasAttribute?.("data-visual-figure") ||
        el.hasAttribute?.("data-figure-index")
      )
        return " 그림 ";
      return [...el.childNodes].map(walk).join("");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const EXPECTED_CELLS = [
  "(1) 그림 [2점]",
  "(2) 그림 [2점]",
  "(3) 그림 [2점]",
  "(4) 그림",
];

/* ── 검수 카드 ─────────────────────────────────────────────────────────── */

function card(value: string, figures: Partial<MarkdownRendererProps>) {
  const { container } = render(
    <SourceEditorDisplay value={value} {...figures} />,
  );
  const group = container.querySelector<HTMLElement>("[data-side-by-side]");
  const grid = group?.querySelector("[data-box-cells]");
  return {
    group,
    cols: group?.getAttribute("data-condition-box"),
    cells: grid ? [...grid.children] : [],
    text: group?.textContent ?? "",
  };
}

describe("검수 카드 — 테두리·제목 없는 칸 묶음", () => {
  it.each([
    ["오려 낸 그림", { imageCrops: CROPS }],
    ["엔진 SVG", { diagramSvgs: SVGS }],
  ])("🔴 %s — 2열 · 칸 넷 · 칸마다 라벨과 그림 하나", (_name, figures) => {
    const { group, cols, cells, text } = card(SIDE_Q, figures);
    expect(group).not.toBeNull();
    expect(cols).toBe("2");
    expect(cells.map(cellText)).toEqual(EXPECTED_CELLS);
    // 머리(`<나란히:cols=2>`)는 안 보인다 — 제목이 없는 묶음이다.
    expect(text).not.toContain("나란히");
    expect(text).not.toContain("cols");
  });

  it("테두리를 두르지 않는다 — 〈보기〉 카드의 테두리 클래스가 없다", () => {
    const { group } = card(SIDE_Q, { imageCrops: CROPS });
    expect(group?.className ?? "").not.toMatch(/\bborder\b/);
  });

  it("4열도 받는다", () => {
    const { cols, cells } = card(
      SIDE_Q.replace("<나란히:cols=2>", "<나란히:cols=4>"),
      { imageCrops: CROPS },
    );
    expect(cols).toBe("4");
    expect(cells).toHaveLength(4);
  });
});

/* ── 지면 ─────────────────────────────────────────────────────────────── */

const CROP: StudioCrop = {
  id: "side-q",
  sourceId: "src",
  sourceLabel: "서답형 3",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: "/api/library/assets/crop",
  figures: FOUR.map((n) => ({
    id: `figure-${n}`,
    rect: { x: 0.1 * n, y: 0.5, width: 0.08, height: 0.1 },
    image: `/api/library/assets/figure-${n}`,
  })),
  content: SIDE_Q,
  answer: "",
  solution: "",
  level: "secondary",
  grade: "중2",
  mode: "text",
};

function paper(content: string) {
  const { container } = render(
    <NativeProblem problem={studioProblem({ ...CROP, content })} print />,
  );
  const group = container.querySelector<HTMLElement>(
    "[data-box-card][data-side-by-side]",
  );
  const grid = group?.querySelector("[data-hwpx-grid]");
  return {
    group,
    grid,
    cells: group ? [...group.querySelectorAll("[data-box-item]")] : [],
    looseFigures: container.querySelectorAll("[data-native-problem] > img")
      .length,
  };
}

describe("지면 — 같은 칸, 제목·테두리 없음", () => {
  it("🔴 «내용 수정» 뒤 원문 경로: 2열 격자, 칸마다 라벨과 그림 하나", () => {
    const { group, grid, cells, looseFigures } = paper(SIDE_Q);
    expect(group).not.toBeNull();
    expect(grid?.className).toContain("print:grid-cols-2");
    expect(cells.map(cellText)).toEqual(EXPECTED_CELLS);
    cells.forEach((cell, index) =>
      expect(cell.querySelector("img")?.getAttribute("src")).toBe(
        `/api/library/assets/figure-${index + 1}`,
      ),
    );
    // 그림은 칸 안에 섰다 — 본문 밖으로 밀려난 그림이 없다.
    expect(looseFigures).toBe(0);
    // 제목 줄(〈…〉)이 없다.
    expect(group!.querySelector("[data-box-header]")).toBeNull();
    expect(group!.className).not.toMatch(/\bborder\b/);
    // 인쇄 높이 자(`SIDE_BY_SIDE_SPACING`)가 세는 간격 = 지면 클래스. 한쪽만 바꾸면 여기서 운다.
    expect(SIDE_BY_SIDE_SPACING).toEqual({ gapX: 24, rowGap: 4, marginY: 16 });
    expect(group!.className.split(" ")).toContain("my-2");
    expect(grid?.className.split(" ")).toEqual(
      expect.arrayContaining(["gap-x-6", "gap-y-1"]),
    );
  });

  it("🔴 4열 — Tailwind 가 읽는 글자 그대로 `md:grid-cols-4 print:grid-cols-4`", () => {
    const { grid, cells } = paper(
      SIDE_Q.replace("<나란히:cols=2>", "<나란히:cols=4>"),
    );
    expect(grid?.className).toContain("md:grid-cols-4");
    expect(grid?.className).toContain("print:grid-cols-4");
    expect(cells).toHaveLength(4);
  });

  it("1열 `<나란히>` 는 격자 표시 없이 한 칸씩", () => {
    const { group, grid, cells } = paper(
      SIDE_Q.replace("<나란히:cols=2>", "<나란히>"),
    );
    expect(group).not.toBeNull();
    expect(grid).toBeNull();
    expect(cells.map(cellText)).toEqual(EXPECTED_CELLS);
  });

  it("문제은행 지면(`MarkdownRenderer` 직접)도 머리 글자·`cols` 가 안 새어 나온다", () => {
    const { container } = render(<MarkdownRenderer content={SIDE_Q} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("나란히");
    expect(text).not.toContain("cols");
    expect(
      container.querySelectorAll("[data-side-by-side] [data-box-item]"),
    ).toHaveLength(4);
  });
});

/* ── 편집기 ───────────────────────────────────────────────────────────── */

const figureAttrs = (element: HTMLElement) => ({
  index:
    element.dataset.figureIndex === undefined
      ? null
      : Number(element.dataset.figureIndex),
});
const VisualMath = Node.create({
  name: "visualMath",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ tex: { default: "" }, display: { default: false } }),
  parseHTML: () => [{ tag: "span[data-math-tex]" }],
  renderHTML: ({ node }) => ["span", { "data-math-tex": node.attrs.tex }],
});
const VisualFigure = Node.create({
  name: "visualFigure",
  group: "block",
  atom: true,
  addAttributes: () => ({
    index: { default: null },
    svg: { default: "" },
    src: { default: "" },
    label: { default: "그림" },
  }),
  parseHTML: () => [
    {
      tag: '[data-visual-figure="true"]',
      getAttrs: (element) => figureAttrs(element as HTMLElement),
    },
  ],
  renderHTML: () => ["div", { "data-visual-figure": "true" }],
});
const VisualInlineFigure = VisualFigure.extend({
  name: "visualInlineFigure",
  group: "inline",
  inline: true,
  parseHTML: () => [
    {
      tag: '[data-visual-figure="inline"]',
      getAttrs: (element) => figureAttrs(element as HTMLElement),
    },
  ],
  renderHTML: () => ["span", { "data-visual-figure": "inline" }],
});

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.replaceChildren();
});

/** «내용 수정»을 여는 길 그대로 — 렌더러 → 변환 → 편집기 문서. */
function open(content: string, figures: Partial<MarkdownRendererProps>) {
  const html = prepareVisualDocument(
    renderToStaticMarkup(
      <SourceEditorRenderer content={content} editorTokens {...figures} />,
    ),
  );
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: [
      StarterKit,
      TableKit,
      VisualMath,
      ConditionBox,
      VisualFigure,
      VisualInlineFigure,
    ],
    content: html,
  });
  return editor;
}

function groups(current: Editor) {
  const found: Array<{ pos: number; node: JSONContent }> = [];
  current.state.doc.descendants((node, pos) => {
    if (node.type.name === "conditionBox")
      found.push({ pos, node: node.toJSON() as JSONContent });
  });
  return found;
}

/**
 * 편집기 묶음의 칸 — 칸(문단)마다 «글자만», 그림은 `그림`. 문서(JSON)에서 읽는다 —
 * DOM 에는 ProseMirror 가 커서 자리로 넣는 `img.ProseMirror-separator` 가 있어 그림으로 잘못 센다.
 */
function editorCells(current: Editor): string[] {
  const side = groups(current).find(
    (group) => group.node.attrs?.kind === "side",
  );
  return (side?.node.content ?? []).map((cell) =>
    (cell.content ?? [])
      .map((child) =>
        child.type === "text"
          ? (child.text ?? "")
          : child.type === "visualInlineFigure"
            ? " 그림 "
            : ` ${child.type} `,
      )
      .join("")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

const saved = (current: Editor) => documentMarkdown(current.getJSON());
const QUOTE = SIDE_Q.slice(SIDE_Q.indexOf("> <나란히"));

describe("편집기 — 저장본을 열면 같은 칸, 닫으면 같은 원문", () => {
  it.each([
    ["오려 낸 그림", { imageCrops: CROPS }],
    ["엔진 SVG", { diagramSvgs: SVGS }],
  ])("🔴 %s — 나란히 묶음 하나 · 2열 · 같은 칸 넷", (_name, figures) => {
    const current = open(SIDE_Q, figures);
    const [group] = groups(current);
    expect(group?.node.attrs).toMatchObject({ cols: 2, kind: "side" });
    expect(editorCells(current)).toEqual(EXPECTED_CELLS);
  });

  it("🔴 손대지 않고 닫으면 원문의 묶음이 그대로다", () => {
    expect(saved(open(SIDE_Q, { diagramSvgs: SVGS }))).toContain(QUOTE);
  });

  it("🔴 열을 바꾸면 머리의 cols 가 바뀐다 — 4열 · 1열", () => {
    const current = open(SIDE_Q, { diagramSvgs: SVGS });
    current.commands.setBoxColumns(groups(current)[0]!.pos, 4);
    expect(saved(current)).toContain("> <나란히:cols=4>\n> (1) [그림1]");
    current.commands.setBoxColumns(groups(current)[0]!.pos, 1);
    expect(saved(current)).toContain("> <나란히>\n> (1) [그림1]");
    expect(editorCells(current)).toEqual(EXPECTED_CELLS);
  });

  it("🔴 묶음 위 단추 — 1열·2열·3열·4열 + 풀기, 〈보기〉 상자는 예전처럼 1~3열", () => {
    const current = open(`${SIDE_Q}\n\n> <보기>\n> ㄱ. 참\n> ㄴ. 거짓`, {
      diagramSvgs: SVGS,
    });
    const buttons = (selector: string) =>
      [
        ...current.view.dom.querySelectorAll(
          `${selector} > .visual-condition-cols button`,
        ),
      ].map((button) => button.textContent);
    expect(buttons("[data-side-by-side]")).toEqual([
      "1열",
      "2열",
      "3열",
      "4열",
      "풀기",
    ]);
    expect(buttons(".visual-condition:not([data-side-by-side])")).toEqual([
      "1열",
      "2열",
      "3열",
    ]);
  });

  it("🔴 풀기 — 묶음이 사라지고 칸이 문단으로 남는다", () => {
    const current = open(SIDE_Q, { diagramSvgs: SVGS });
    current.commands.unwrapSideBySide(groups(current)[0]!.pos);
    expect(groups(current)).toHaveLength(0);
    const markdown = saved(current);
    expect(markdown).not.toContain("나란히");
    expect(markdown).toContain("(1) [그림1] \\[2점\\]");
    expect(markdown).toContain("(4) [그림4]");
  });
});

/** 문서에서 글자 `needle` 이 시작하는 자리. */
function positionOf(current: Editor, needle: string): number {
  let found = -1;
  current.state.doc.descendants((node, pos) => {
    if (found >= 0 || !node.isText) return;
    const at = node.text!.indexOf(needle);
    if (at >= 0) found = pos + at;
  });
  if (found < 0) throw new Error(`없다: ${needle}`);
  return found;
}

describe("편집기 [나란히] — 고른 소문항을 묶는다", () => {
  it.each([
    ["오려 낸 그림", { imageCrops: CROPS }],
    ["엔진 SVG", { diagramSvgs: SVGS }],
  ])(
    "🔴 %s — (1) 부터 (4) 까지 고르고 누르면 칸 넷, 배점은 앞 소문항 칸 끝으로 · 끝의 그림 4 도 (4) 칸",
    (_name, figures) => {
      const current = open(RAW, figures);
      const from = positionOf(current, "(1)");
      current.view.dispatch(
        current.state.tr.setSelection(
          TextSelection.create(
            current.state.doc,
            from,
            positionOf(current, "(4)") + 3,
          ),
        ),
      );
      expect(current.commands.wrapSideBySide()).toBe(true);
      expect(editorCells(current)).toEqual(EXPECTED_CELLS);
      // 발문은 묶음 밖에 그대로 남는다.
      const markdown = saved(current);
      expect(markdown.slice(0, markdown.indexOf(">"))).toContain(
        "평행사변형인 이유를",
      );
      expect(markdown).toContain(QUOTE);
    },
  );

  it("🔴 저장 → 다시 열기 왕복 — 원문이 그대로다", () => {
    const first = open(RAW, { diagramSvgs: SVGS });
    first.view.dispatch(
      first.state.tr.setSelection(
        TextSelection.create(
          first.state.doc,
          positionOf(first, "(1)"),
          positionOf(first, "(4)") + 3,
        ),
      ),
    );
    first.commands.wrapSideBySide();
    const once = saved(first);
    first.destroy();
    editor = undefined;
    const again = open(once, { diagramSvgs: SVGS });
    expect(saved(again)).toBe(once);
    expect(editorCells(again)).toEqual(EXPECTED_CELLS);
  });

  it("그림이 아직 안 붙은 문항 — `[그림N]` 글자만 든 줄도 앞 소문항 칸에 붙는다", () => {
    const current = open(RAW, {});
    current.view.dispatch(
      current.state.tr.setSelection(
        TextSelection.create(
          current.state.doc,
          positionOf(current, "(1)"),
          positionOf(current, "[그림4]") + "[그림4]".length,
        ),
      ),
    );
    expect(current.commands.wrapSideBySide()).toBe(true);
    expect(editorCells(current)).toEqual([
      "(1) [그림1] [2점]",
      "(2) [그림2] [2점]",
      "(3) [그림3] [2점]",
      "(4) [그림4]",
    ]);
  });

  it("묶음·표·상자 안에서는 누르지 않는다 — 문서가 안 바뀐다", () => {
    const current = open(SIDE_Q, { diagramSvgs: SVGS });
    const before = saved(current);
    current.view.dispatch(
      current.state.tr.setSelection(
        TextSelection.create(current.state.doc, positionOf(current, "(2)")),
      ),
    );
    expect(current.commands.wrapSideBySide()).toBe(false);
    expect(saved(current)).toBe(before);
  });
});
