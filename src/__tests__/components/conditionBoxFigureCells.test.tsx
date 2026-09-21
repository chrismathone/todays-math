/**
 * 🔴 RED → 🟢 — 〈보기〉 상자의 «ㄱ. [그림]» 한 칸은 편집기에서도 **한 칸**이다 (원장님 2026-09-21).
 *
 * 원장님: «2열로 하니까 이렇게 나오는데» — 문제 22(그림 넷의 〈보기〉)를 «내용 수정»에서 2열로 바꾸니
 * 라벨(ㄱ.)과 그림이 서로 다른 칸에 앉고 빈 칸이 끼어 계단처럼 엇갈렸다. 검수 카드·지면은 같은 원문을 네 칸으로 그린다.
 *
 * 원인: 렌더러는 상자(`>` 줄) 안의 `[그림N]` 을 일부러 **인라인** `span` 으로 그린다(«상자 안에 그림을 둔다»).
 * 그런데 편집기 변환(`prepareVisualDocument`)은 선택지·표 칸만 인라인으로 알아서, 상자 안 그림을
 * 블록 `<div>` 로 바꿔 `<p>` 안에 넣었다. HTML 파서는 `<div>` 를 만나면 `<p>` 를 닫는다 —
 * 한 칸이 `문단(ㄱ.)` · `그림` · `빈 문단` **세 칸**이 됐다(2열 격자에서 ㄱ·그림 / 빈칸·ㄴ / 그림·빈칸 …).
 * 🔴 처음엔 «오려 낸 그림(`<img>`)은 멀쩡하고 엔진 SVG 만 깨진다»고 짐작했는데 **둘 다 깨져 있었다** — 이 시험의 첫 실행이 알려 줬다.
 *
 * 그림의 출처 둘(오려 낸 그림 · 엔진 SVG)을 다 댄다 — **같은 원문**이면 편집기 문서가 같아야 한다.
 * 실제 렌더러 → 실제 변환 → 실제 TipTap 파서를 그대로 지난다(그림·수식 노드만 같은 이름·같은 파싱 규칙의 대역).
 */
import { Editor, Node, type JSONContent } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { ConditionBox } from "@/components/math/editor/conditionBox";
import SourceEditorRenderer, {
  type MarkdownRendererProps,
} from "@/components/math/editor/SourceEditorRenderer";
import {
  documentMarkdown,
  prepareVisualDocument,
} from "@/components/math/editor/visualDocument";

/** 문제 22 — 항목마다 한 줄(원장님 화면의 문항). */
const Q22 =
  "아래 보기에서 $\\angle x$의 크기가 큰 것부터 순서대로 바르게 나열한 것은?\n\n> <보기>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n① ㄹ-ㄷ-ㄱ-ㄴ ② ㄹ-ㄷ-ㄴ-ㄱ";
/** 같은 상자를 인식이 **한 줄**에 적은 판(같은 시험지의 «합동인 삼각형» 문항이 이 모양이다). */
const ONE_LINE =
  "다음 보기에서 합동인 삼각형은 모두 몇 개인가?\n\n> <보기>\n>\n> ㄱ. [그림1] ㄴ. [그림2] ㄷ. [그림3] ㄹ. [그림4]\n\n① $4$개 ② $3$개";

const FOUR = [1, 2, 3, 4];
const CROPS: MarkdownRendererProps["imageCrops"] = FOUR.map((n) => ({
  src: `/api/library/assets/figure-${n}`,
}));
const SVGS: MarkdownRendererProps["diagramSvgs"] = FOUR.map((n) => ({
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="${n}"/></svg>`,
}));

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

/** 상자의 칸들 — `글|노드이름,…` 한 줄씩(머리 포함). */
function cells(current: Editor): string[] {
  const box = (current.getJSON().content ?? []).find(
    (node) => node.type === "conditionBox",
  );
  return (box?.content ?? []).map((cell: JSONContent) =>
    cell.type === "paragraph"
      ? (cell.content ?? [])
          .map((child) =>
            child.type === "text" ? (child.text ?? "").trim() : child.type,
          )
          .join("|")
      : `(${cell.type})`,
  );
}

function boxPosition(current: Editor) {
  let found = -1;
  current.state.doc.descendants((node, pos) => {
    if (node.type.name === "conditionBox") found = pos;
  });
  return found;
}

const FOUR_CELLS = [
  "<보기>",
  "ㄱ.|visualInlineFigure",
  "ㄴ.|visualInlineFigure",
  "ㄷ.|visualInlineFigure",
  "ㄹ.|visualInlineFigure",
];

describe("〈보기〉 상자의 그림 칸 — 편집기에서도 한 칸", () => {
  it("🔴 오려 낸 그림(<img>) — 라벨·그림·빈 문단 셋으로 쪼개지지 않는다", () => {
    expect(cells(open(Q22, { imageCrops: CROPS }))).toEqual(FOUR_CELLS);
  });

  it("🔴 엔진이 그린 그림(SVG) — 같은 네 칸이다", () => {
    expect(cells(open(Q22, { diagramSvgs: SVGS }))).toEqual(FOUR_CELLS);
  });

  it("🔴 2열을 눌러도 네 칸 그대로 — 저장본은 한 줄에 한 칸", () => {
    const current = open(Q22, { diagramSvgs: SVGS });
    current.commands.setBoxColumns(boxPosition(current), 2);
    expect(cells(current)).toEqual(FOUR_CELLS);
    expect(documentMarkdown(current.getJSON())).toContain(
      "> <보기:cols=2>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]",
    );
  });

  it("손대지 않고 닫으면 원문의 상자가 그대로다 — 빈 줄이 끼지 않는다", () => {
    const current = open(Q22, { diagramSvgs: SVGS });
    expect(documentMarkdown(current.getJSON())).toContain(
      "> <보기>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n",
    );
  });
});

describe("항목이 한 줄에 다 든 상자 — 칸이 하나뿐일 때", () => {
  it.each([
    ["오려 낸 그림", { imageCrops: CROPS }],
    ["엔진 SVG", { diagramSvgs: SVGS }],
  ])("🔴 %s — 빈 문단이 앞뒤에 끼지 않는다", (_name, figures) => {
    expect(cells(open(ONE_LINE, figures))).toEqual([
      "<보기>",
      "ㄱ.|visualInlineFigure|ㄴ.|visualInlineFigure|ㄷ.|visualInlineFigure|ㄹ.|visualInlineFigure",
    ]);
  });

  it.each([
    ["오려 낸 그림", { imageCrops: CROPS }],
    ["엔진 SVG", { diagramSvgs: SVGS }],
  ])("🔴 %s — 2열을 누르면 항목마다 한 칸, 빈 칸 없이", (_name, figures) => {
    const current = open(ONE_LINE, figures);
    current.commands.setBoxColumns(boxPosition(current), 2);
    expect(cells(current)).toEqual(FOUR_CELLS);
  });
});

describe("상자 밖의 그림은 그대로 — 발문 끝 [그림N] 은 블록이다", () => {
  it("발문의 그림은 문단 밖 블록 그림으로 남는다", () => {
    const current = open(
      "그림과 같은 삼각형에서 $x$의 값은? [그림1]\n\n① $1$ ② $2$",
      { diagramSvgs: SVGS },
    );
    const types = (current.getJSON().content ?? []).map((node) => node.type);
    expect(types).toContain("visualFigure");
  });
});
