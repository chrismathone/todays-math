"use client";

/* Ported from D:/mathg-gen/src/components/math/MathTextEditor.tsx. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { InputRule, Node } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { MathfieldElement, convertAsciiMathToLatex } from "mathlive";
import "mathlive/fonts.css";
import MarkdownRenderer, {
  type MarkdownRendererProps,
} from "./SourceEditorRenderer";
import { renderKatexSafe } from "./katexRender";
import { documentMarkdown, prepareVisualDocument } from "./visualDocument";
import { attachCompactMathKeyboard } from "./compactMathKeyboard";
import { attachHwpMathShortcuts } from "./hwpMathShortcuts";
import { SourceEditorFigures } from "./SourceEditorFigures";
import { paintSourceFigure } from "./sourceFigurePresentation";
import { caretBoxKind, ConditionBox } from "./conditionBox";

MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

const hideMathLiveUi = () => {
  try {
    window.mathVirtualKeyboard?.hide({ animate: false });
  } catch {
    // MathLive can already be disconnected while React removes the editor.
  }
};

const TEMPLATES = [
  ["수식", "\\placeholder{}"],
  ["분수", "\\frac{\\placeholder{}}{\\placeholder{}}"],
  ["제곱", "\\placeholder{}^{2}"],
  ["루트", "\\sqrt{\\placeholder{}}"],
  ["적분", "\\int_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}\\,dx"],
  ["합", "\\sum_{n=1}^{\\placeholder{}}\\placeholder{}"],
  ["극한", "\\lim_{x\\to\\placeholder{}}\\placeholder{}"],
] as const;

const createMathNode = (active: {
  get: () => MathfieldElement | null;
  set: (field: MathfieldElement | null) => void;
}) =>
  Node.create({
    name: "visualMath",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: () => ({
      tex: { default: "" },
      display: { default: false },
      fresh: { default: false },
    }),
    parseHTML: () => [
      {
        tag: "[data-math-tex]",
        getAttrs: (element) => ({
          tex: decodeURIComponent(
            (element as HTMLElement).dataset.mathTex ?? "",
          ),
          display: (element as HTMLElement).dataset.mathDisplay === "true",
        }),
      },
    ],
    renderHTML: ({ node }) => [
      "span",
      {
        "data-math-tex": encodeURIComponent(node.attrs.tex),
        "data-math-display": String(node.attrs.display),
      },
    ],
    addInputRules() {
      return [
        new InputRule({
          // `x^2 `, `1/2 `처럼 익숙한 입력도 수식으로 전환한다.
          find: /(?:^|\s)([a-zA-Z0-9]+(?:[\^/][a-zA-Z0-9]+)+) $/,
          handler: ({ state, range, match }) => {
            const from = range.to - match[1].length - 1;
            state.tr.replaceWith(from, range.to, [
              this.type.create({ tex: convertAsciiMathToLatex(match[1]) }),
              state.schema.text(" "),
            ]);
          },
        }),
      ];
    },
    addNodeView() {
      return ({ node: firstNode, editor, getPos }) => {
        let node = firstNode;
        let field: MathfieldElement | null = null;
        let detachKeyboard: (() => void) | null = null;
        let destroyed = false;
        const dom = document.createElement("span");
        dom.className = "visual-math";
        dom.contentEditable = "false";

        const label = (action: string) => {
          // Node views are constructed before editor.view is mounted.
          const attributes = editor.options.editorProps?.attributes;
          const context =
            typeof attributes === "function"
              ? attributes(editor.state)?.["aria-label"]
              : attributes?.["aria-label"];
          return `${context ?? "문제 본문"} ${action}: ${String(node.attrs.tex).trim() || "빈 수식"}`;
        };
        const nameControl = () => {
          if (field) {
            field.setAttribute("aria-label", label("수식 입력"));
          } else {
            dom.tabIndex = 0;
            dom.setAttribute("role", "button");
            dom.setAttribute("aria-label", label("수식 편집"));
            dom.title = "클릭해서 수식 수정";
          }
        };

        const paint = () => {
          nameControl();
          dom.dataset.mathDisplay = String(node.attrs.display);
          dom.dataset.mathTex = encodeURIComponent(node.attrs.tex);
          dom.innerHTML = renderKatexSafe(
            node.attrs.tex || "\\square",
            node.attrs.display,
          );
        };
        // 칸의 값을 본문 노드에 싣는다. MathLive 는 `input` 을 setTimeout 뒤에 낸다(한 글자에
        // 15~20ms) — 치자마자 Esc·Enter 로 닫으면 마지막 값이 안 실렸다. 닫을 때도 부른다(트랙 23).
        const commit = () => {
          const pos = getPos();
          if (typeof pos !== "number" || !field) return;
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              tex: field.value,
              fresh: false,
            }),
          );
        };
        const close = (direction?: "forward" | "backward") => {
          if (!field || destroyed) return;
          if (field.value !== node.attrs.tex) commit();
          if (active.get() === field) active.set(null);
          detachKeyboard?.();
          detachKeyboard = null;
          hideMathLiveUi();
          field = null;
          paint();
          const pos = getPos();
          if (direction && typeof pos === "number") {
            editor
              .chain()
              .focus()
              .setTextSelection(pos + (direction === "forward" ? 1 : 0))
              .run();
          }
        };
        const open = () => {
          if (field || destroyed) return;
          field = new MathfieldElement();
          field.value = String(node.attrs.tex);
          field.mathVirtualKeyboardPolicy = "manual";
          field.smartFence = true;
          // The MathLive input owns semantics while open, without a containing button.
          for (const name of ["tabindex", "role", "aria-label", "title"])
            dom.removeAttribute(name);
          nameControl();
          active.set(field);
          dom.replaceChildren(field);
          // 한컴 수식 낱말 «작은 판»(트랙 8) — `root2` → √2, `a over b` → 분수.
          attachHwpMathShortcuts(field);
          detachKeyboard = attachCompactMathKeyboard(field);
          field.addEventListener("input", commit);
          field.addEventListener("blur", () =>
            setTimeout(() => {
              if (field && !field.matches(":focus-within")) close();
            }, 0),
          );
          field.addEventListener("move-out", (event) => {
            event.preventDefault();
            close(
              event.detail.direction === "backward" ? "backward" : "forward",
            );
          });
          field.addEventListener("keydown", (event) => {
            if (event.key === "Escape" || event.key === "Enter") {
              event.preventDefault();
              close("forward");
            }
            event.stopPropagation();
          });
          field.focus();
          // MathLive 는 입력 자리(keyboard-sink)에 포커스를 60ms 뒤에 넘긴다(onFocus 의
          // setTimeout). 그 틈에 친 글자는 겉 틀로 가서 사라지고 Esc 는 작업실 확대를 풀었다
          // (트랙 23). 입력 자리에 바로 준다 — `part` 는 MathLive 가 밖에 내놓은 부품 이름이다.
          field.shadowRoot
            ?.querySelector<HTMLElement>('[part~="keyboard-sink"]')
            ?.focus({ preventScroll: true });
          if (node.attrs.fresh) {
            field.executeCommand("moveToMathfieldStart");
            field.executeCommand("moveToNextPlaceholder");
          }
        };
        dom.addEventListener("click", open);
        dom.addEventListener("keydown", (event) => {
          if (!field && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            open();
          }
        });
        paint();
        if (node.attrs.fresh) setTimeout(open, 0);
        return {
          dom,
          stopEvent: () => true,
          ignoreMutation: () => true,
          update: (next) => {
            if (next.type !== node.type) return false;
            node = next;
            if (!field) paint();
            else nameControl();
            return true;
          },
          destroy: () => {
            destroyed = true;
            detachKeyboard?.();
            detachKeyboard = null;
            if (active.get() === field) active.set(null);
            hideMathLiveUi();
          },
        };
      };
    },
  });

const ChoiceGroup = Node.create({
  name: "choiceGroup",
  group: "block",
  content: "choiceItem+",
  addAttributes: () => ({ class: { default: "choice-row cols-1" } }),
  parseHTML: () => [
    {
      tag: ".choice-row",
      getAttrs: (element) => ({ class: (element as HTMLElement).className }),
    },
  ],
  renderHTML: ({ node }) => ["div", { class: node.attrs.class }, 0],
});

const ChoiceItem = Node.create({
  name: "choiceItem",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ marker: { default: "①" } }),
  parseHTML: () => [
    {
      tag: "[data-choice-marker]",
      getAttrs: (element) => ({
        marker: (element as HTMLElement).dataset.choiceMarker,
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    { class: "choice" },
    [
      "span",
      { class: "choice-marker", contenteditable: "false" },
      node.attrs.marker,
    ],
    ["span", {}, 0],
  ],
});

const figureAttributes = (element: HTMLElement) => ({
  index:
    element.dataset.figureIndex === undefined
      ? null
      : Number(element.dataset.figureIndex),
  svg: decodeURIComponent(element.dataset.editorSvg ?? ""),
  src: element.dataset.src ?? "",
  label: element.dataset.label ?? "그림",
  grow: element.dataset.figureGrow ?? null,
  align: element.dataset.figureAlign ?? "center",
  maxWidth: element.dataset.figureMaxWidth ?? "",
});

export interface SourceMathTextEditorProps extends Omit<
  MarkdownRendererProps,
  "content"
> {
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SourceMathTextEditor(props: SourceMathTextEditorProps) {
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });
  // Stable imperative handle owned by TipTap node views, never used to render React.
  const [activeMath] = useState<{ current: MathfieldElement | null }>(() => ({
    current: null,
  }));
  const lastEmitted = useRef(props.value);
  const [sourceMode, setSourceMode] = useState(false);
  const [firstHtml] = useState(() =>
    prepareVisualDocument(
      renderToStaticMarkup(
        <MarkdownRenderer
          {...props}
          content={props.value}
          editorTokens
          onFigureClick={undefined}
        />,
      ),
    ),
  );
  const toHtml = () =>
    prepareVisualDocument(
      renderToStaticMarkup(
        <MarkdownRenderer
          {...latest.current}
          content={latest.current.value}
          editorTokens
          onFigureClick={undefined}
        />,
      ),
    );
  const [mathNode] = useState(() =>
    createMathNode({
      get: () => activeMath.current,
      set: (field) => {
        activeMath.current = field;
      },
    }),
  );

  const visualFigure = Node.create({
    name: "visualFigure",
    group: "block",
    atom: true,
    addAttributes: () => ({
      index: { default: null },
      svg: { default: "" },
      src: { default: "" },
      label: { default: "그림" },
      refresh: { default: 0 },
      grow: { default: null },
      align: { default: "center" },
      maxWidth: { default: "" },
    }),
    parseHTML: () => [
      {
        tag: '[data-visual-figure="true"]',
        getAttrs: (element) => figureAttributes(element as HTMLElement),
      },
    ],
    renderHTML: () => ["div", { "data-visual-figure": "true" }],
    addNodeView:
      () =>
      ({ node: firstNode }) => {
        let node = firstNode;
        const layout = document.createElement(
          firstNode.type.name === "visualInlineFigure" ? "span" : "div",
        );
        layout.className = "visual-figure-layout";
        if (firstNode.attrs.grow) {
          layout.style.flex = `${firstNode.attrs.grow} 1 0`;
          layout.style.minWidth = "0";
        }
        const dom = document.createElement("span");
        dom.className = "visual-figure source-figure-frame";
        layout.append(dom);
        dom.dataset.figureIndex = String(firstNode.attrs.index ?? "");
        dom.contentEditable = "false";
        let index = node.attrs.index as number | null;
        let cancelPaint: (() => void) | undefined;
        const paint = () => {
          cancelPaint?.();
          const current = latest.current;
          index = node.attrs.index as number | null;
          layout.dataset.figureAlign =
            index !== null
              ? (current.diagramSvgs?.[index]?.align ?? node.attrs.align)
              : node.attrs.align;
          layout.style.maxWidth = node.attrs.maxWidth;
          dom.dataset.figureIndex = String(index ?? "");
          if (
            index !== null &&
            current.onFigureClick &&
            current.isFigureEditable?.(index) !== false
          ) {
            dom.tabIndex = 0;
            dom.setAttribute("role", "button");
            const label =
              current.diagramSvgs?.[index]?.label ??
              current.imageCrops?.[index]?.label;
            dom.setAttribute(
              "aria-label",
              `그림 ${index + 1} 편집${label ? `: ${label}` : ""}`,
            );
            dom.title = "클릭해서 그림 수정";
          } else {
            for (const name of ["tabindex", "role", "aria-label", "title"])
              dom.removeAttribute(name);
          }
          const svg =
            index !== null ? current.diagramSvgs?.[index]?.svg : node.attrs.svg;
          const src =
            index !== null ? current.imageCrops?.[index]?.src : node.attrs.src;
          if (svg) cancelPaint = paintSourceFigure(dom, svg);
          else if (src) {
            dom.style.removeProperty("--source-figure-width");
            const image = document.createElement("img");
            image.src = src;
            image.alt = node.attrs.label;
            dom.replaceChildren(image);
          } else
            dom.textContent = index === null ? "그림" : `그림 ${index + 1}`;
        };
        const open = () => {
          if (
            index !== null &&
            latest.current.isFigureEditable?.(index) !== false
          )
            latest.current.onFigureClick?.(index);
        };
        dom.addEventListener("click", open);
        dom.addEventListener("keydown", (rawEvent) => {
          const event = rawEvent as KeyboardEvent;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        });
        paint();
        return {
          dom: layout,
          stopEvent: () => true,
          ignoreMutation: () => true,
          update: (next) => {
            if (next.type !== node.type) return false;
            node = next;
            paint();
            return true;
          },
          destroy: () => cancelPaint?.(),
        };
      },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TableKit,
      mathNode,
      ChoiceGroup,
      ChoiceItem,
      ConditionBox,
      visualFigure,
      visualFigure.extend({
        name: "visualInlineFigure",
        group: "inline",
        inline: true,
        parseHTML: () => [
          {
            tag: '[data-visual-figure="inline"]',
            getAttrs: (element) => figureAttributes(element as HTMLElement),
          },
        ],
      }),
      Node.create({
        name: "visualFigureRow",
        group: "block",
        content: "visualFigure+",
        parseHTML: () => [{ tag: ".figure-row" }],
        renderHTML: () => ["div", { class: "figure-row" }, 0],
      }),
    ],
    content: firstHtml,
    editorProps: {
      attributes: {
        class: "visual-document",
        "aria-label": props["aria-label"] ?? "문제 본문",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = documentMarkdown(current.getJSON());
      if (markdown === lastEmitted.current) return;
      lastEmitted.current = markdown;
      latest.current.onChange(markdown);
    },
  });

  // 커서가 〈보기〉 상자(또는 나란히 묶음) 안이면 아래 안내가 상자 키로 바뀐다(트랙 51 시안 안 C).
  const caretBox =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current ? caretBoxKind(current.state) : null,
    }) ?? null;
  const boxWord = caretBox === "side" ? "묶음" : "상자";

  useEffect(() => {
    if (editor && props.value !== lastEmitted.current) {
      lastEmitted.current = props.value;
      editor.commands.setContent(toHtml(), { emitUpdate: false });
      editor.view.dispatch(closeHistory(editor.state.tr));
    }
  }, [editor, props.value]);

  useEffect(() => {
    if (!editor) return;
    const tr = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      if (
        node.type.name === "visualFigure" ||
        node.type.name === "visualInlineFigure"
      ) {
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          refresh: Number(node.attrs.refresh) + 1,
        });
      }
    });
    if (tr.docChanged)
      editor.view.dispatch(
        tr.setMeta("addToHistory", false).setMeta("preventUpdate", true),
      );
  }, [
    editor,
    props.diagramSvgs,
    props.imageCrops,
    props.isFigureEditable,
    props.onFigureClick,
  ]);

  useEffect(() => () => hideMathLiveUi(), []);

  const insert = (tex: string) => {
    if (activeMath.current) {
      activeMath.current.insert(tex, { selectionMode: "placeholder" });
      activeMath.current.focus();
      return;
    }
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "visualMath", attrs: { tex, fresh: true } })
      .run();
  };
  const toggleSource = () => {
    activeMath.current?.blur();
    if (sourceMode && editor) {
      editor.commands.setContent(toHtml(), { emitUpdate: false });
      editor.view.dispatch(closeHistory(editor.state.tr));
    }
    setSourceMode((value) => !value);
  };

  return (
    <div
      className={`source-math-editor visual-editor ${props.className ?? ""}`}
    >
      <div
        className="visual-editor-toolbar"
        role="toolbar"
        aria-label="수식 삽입"
      >
        {!sourceMode &&
          TEMPLATES.map(([label, tex]) => (
            <button
              key={label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(tex)}
            >
              {label}
            </button>
          ))}
        {!sourceMode && (
          <>
            {/*
              «나란히» — 고른 문단(소문항·그림)을 테두리·제목 없는 칸 묶음으로(원장님 2026-09-22).
              묶음 위 «1열~4열 · 풀기» 로 바꾼다. 상자·표 안에서는 아무것도 안 한다.
            */}
            <button
              type="button"
              title="고른 문단을 칸으로 나란히 묶기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().wrapSideBySide().run()}
            >
              나란히
            </button>
            <button
              type="button"
              aria-label="본문 되돌리기"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              ↶
            </button>
            <button
              type="button"
              aria-label="본문 다시 실행"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              ↷
            </button>
          </>
        )}
        <button
          type="button"
          className="visual-source-toggle"
          onClick={toggleSource}
        >
          {sourceMode ? "직접 편집으로" : "원문 코드"}
        </button>
      </div>
      {sourceMode ? (
        <textarea
          className="visual-source-input"
          aria-label={`${props["aria-label"] ?? "문제 본문"} (Markdown + LaTeX)`}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <div className="source-editor-display">
        <SourceEditorFigures {...props} />
      </div>
      <p className="visual-editor-help">
        {caretBox && !sourceMode ? (
          <>
            {boxWord} 안에서 <kbd>Tab</kbd> 다음 칸 · <kbd>Esc</kbd> 뒤{" "}
            <kbd>Tab</kbd> {boxWord} 밖으로.
          </>
        ) : (
          <>
            글은 바로 입력하고, 수식과 그림은 클릭해서 고치세요. 분수는 위아래
            칸에 숫자를 입력하면 됩니다.
          </>
        )}
      </p>
    </div>
  );
}
