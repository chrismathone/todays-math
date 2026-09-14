"use client";

/* Ported from D:/mathg-gen/src/components/math/MathTextEditor.tsx. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorContent, useEditor } from "@tiptap/react";
import { InputRule, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { MathfieldElement, convertAsciiMathToLatex } from "mathlive";
import "mathlive/fonts.css";
import MarkdownRenderer, { type MarkdownRendererProps } from "./SourceEditorRenderer";
import { renderKatexSafe } from "./katexRender";
import { documentMarkdown, prepareVisualDocument } from "./visualDocument";
import { attachCompactMathKeyboard } from "./compactMathKeyboard";

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

const createMathNode = (active: { get: () => MathfieldElement | null; set: (field: MathfieldElement | null) => void }) =>
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
    parseHTML: () => [{
      tag: "[data-math-tex]",
      getAttrs: (element) => ({
        tex: decodeURIComponent((element as HTMLElement).dataset.mathTex ?? ""),
        display: (element as HTMLElement).dataset.mathDisplay === "true",
      }),
    }],
    renderHTML: ({ node }) => ["span", {
      "data-math-tex": encodeURIComponent(node.attrs.tex),
      "data-math-display": String(node.attrs.display),
    }],
    addInputRules() {
      return [new InputRule({
        // `x^2 `, `1/2 `처럼 익숙한 입력도 수식으로 전환한다.
        find: /(?:^|\s)([a-zA-Z0-9]+(?:[\^/][a-zA-Z0-9]+)+) $/,
        handler: ({ state, range, match }) => {
          const from = range.to - match[1].length - 1;
          state.tr.replaceWith(from, range.to, [
            this.type.create({ tex: convertAsciiMathToLatex(match[1]) }),
            state.schema.text(" "),
          ]);
        },
      })];
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
        dom.tabIndex = 0;
        dom.setAttribute("role", "button");
        dom.setAttribute("aria-label", "수식 편집");
        dom.title = "클릭해서 수식 수정";

        const paint = () => {
          dom.dataset.mathDisplay = String(node.attrs.display);
          dom.dataset.mathTex = encodeURIComponent(node.attrs.tex);
          dom.innerHTML = renderKatexSafe(node.attrs.tex || "\\square", node.attrs.display);
        };
        const close = (direction?: "forward" | "backward") => {
          if (!field || destroyed) return;
          if (active.get() === field) active.set(null);
          detachKeyboard?.(); detachKeyboard = null;
          hideMathLiveUi();
          field = null;
          paint();
          const pos = getPos();
          if (direction && typeof pos === "number") {
            editor.chain().focus().setTextSelection(pos + (direction === "forward" ? 1 : 0)).run();
          }
        };
        const open = () => {
          if (field || destroyed) return;
          field = new MathfieldElement();
          field.value = String(node.attrs.tex);
          field.mathVirtualKeyboardPolicy = "manual";
          field.smartFence = true;
          field.setAttribute("aria-label", "수식 입력");
          active.set(field);
          dom.replaceChildren(field);
          detachKeyboard = attachCompactMathKeyboard(field);
          field.addEventListener("input", () => {
            const pos = getPos();
            if (typeof pos !== "number" || !field) return;
            editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              tex: field.value,
              fresh: false,
            }));
          });
          field.addEventListener("blur", () => setTimeout(() => {
            if (field && !field.matches(":focus-within")) close();
          }, 0));
          field.addEventListener("move-out", (event) => {
            event.preventDefault();
            close(event.detail.direction === "backward" ? "backward" : "forward");
          });
          field.addEventListener("keydown", (event) => {
            if (event.key === "Escape" || event.key === "Enter") {
              event.preventDefault();
              close("forward");
            }
            event.stopPropagation();
          });
          field.focus();
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
            return true;
          },
          destroy: () => {
            destroyed = true;
            detachKeyboard?.(); detachKeyboard = null;
            if (active.get() === field) active.set(null);
            hideMathLiveUi();
          },
        };
      };
    },
  });

const ChoiceGroup = Node.create({
  name: "choiceGroup", group: "block", content: "choiceItem+",
  addAttributes: () => ({ class: { default: "choice-row cols-1" } }),
  parseHTML: () => [{ tag: ".choice-row", getAttrs: (element) => ({ class: (element as HTMLElement).className }) }],
  renderHTML: ({ node }) => ["div", { class: node.attrs.class }, 0],
});

const ChoiceItem = Node.create({
  name: "choiceItem", content: "inline*", defining: true,
  addAttributes: () => ({ marker: { default: "①" } }),
  parseHTML: () => [{ tag: "[data-choice-marker]", getAttrs: (element) => ({ marker: (element as HTMLElement).dataset.choiceMarker }) }],
  renderHTML: ({ node }) => [
    "div", { class: "choice" },
    ["span", { class: "choice-marker", contenteditable: "false" }, node.attrs.marker],
    ["span", {}, 0],
  ],
});

const ConditionBox = Node.create({
  name: "conditionBox", group: "block", content: "block+", defining: true,
  addAttributes: () => ({ cols: { default: 1 } }),
  parseHTML: () => [{ tag: "[data-condition-box]", getAttrs: (element) => ({ cols: Number((element as HTMLElement).dataset.conditionBox) || 1 }) }],
  renderHTML: ({ node }) => ["div", { class: "visual-condition", "data-condition-box": node.attrs.cols }, 0],
});

const figureAttributes = (element: HTMLElement) => ({
  index: element.dataset.figureIndex === undefined ? null : Number(element.dataset.figureIndex),
  svg: decodeURIComponent(element.dataset.editorSvg ?? ""),
  src: element.dataset.src ?? "",
  label: element.dataset.label ?? "그림",
  grow: element.dataset.figureGrow ?? null,
});

export interface SourceMathTextEditorProps extends Omit<MarkdownRendererProps, "content"> {
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SourceMathTextEditor(props: SourceMathTextEditorProps) {
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  // Stable imperative handle owned by TipTap node views, never used to render React.
  const [activeMath] = useState<{ current: MathfieldElement | null }>(() => ({ current: null }));
  const lastEmitted = useRef(props.value);
  const [sourceMode, setSourceMode] = useState(false);
  const [firstHtml] = useState(() => prepareVisualDocument(renderToStaticMarkup(
    <MarkdownRenderer {...props} content={props.value} editorTokens onFigureClick={undefined} />,
  )));
  const toHtml = () => prepareVisualDocument(renderToStaticMarkup(
    <MarkdownRenderer {...latest.current} content={latest.current.value} editorTokens onFigureClick={undefined} />,
  ));
  const [mathNode] = useState(() => createMathNode({ get: () => activeMath.current, set: field => { activeMath.current = field; } }));

  const visualFigure = Node.create({
        name: "visualFigure", group: "block", atom: true,
        addAttributes: () => ({ index: { default: null }, svg: { default: "" }, src: { default: "" }, label: { default: "그림" }, refresh: { default: 0 }, grow: { default: null } }),
        parseHTML: () => [{
          tag: '[data-visual-figure="true"]',
          getAttrs: (element) => {
            const data = (element as HTMLElement).dataset;
            return {
              index: data.figureIndex === undefined ? null : Number(data.figureIndex),
              svg: decodeURIComponent(data.editorSvg ?? ""),
              src: data.src ?? "",
              label: data.label ?? "그림",
              grow: data.figureGrow ?? null,
            };
          },
        }],
        renderHTML: () => ["div", { "data-visual-figure": "true" }],
        addNodeView: () => ({ node: firstNode }) => {
          let node = firstNode;
          const dom = document.createElement(firstNode.type.name === "visualInlineFigure" ? "span" : "div");
          dom.className = "visual-figure";
          if (firstNode.attrs.grow) { dom.style.flex = `${firstNode.attrs.grow} 1 0`; dom.style.minWidth = "0"; }
          dom.dataset.figureIndex = String(firstNode.attrs.index ?? "");
          dom.contentEditable = "false";
          const index = node.attrs.index as number | null;
          const paint = () => {
            const current = latest.current;
            const svg = index !== null ? current.diagramSvgs?.[index]?.svg : node.attrs.svg;
            const src = index !== null ? current.imageCrops?.[index]?.src : node.attrs.src;
            if (svg) dom.innerHTML = svg;
            else if (src) {
              const image = document.createElement("img");
              image.src = src;
              image.alt = node.attrs.label;
              dom.replaceChildren(image);
            } else dom.textContent = index === null ? "그림" : `그림 ${index + 1}`;
          };
          const open = () => { if (index !== null && latest.current.isFigureEditable?.(index) !== false) latest.current.onFigureClick?.(index); };
          if (index !== null && latest.current.onFigureClick && latest.current.isFigureEditable?.(index) !== false) {
            dom.tabIndex = 0;
            dom.setAttribute("role", "button");
            dom.setAttribute("aria-label", `그림 ${index + 1} 편집`);
            dom.title = "클릭해서 그림 수정";
          }
          dom.addEventListener("click", open);
          dom.addEventListener("keydown", (rawEvent) => {
            const event = rawEvent as KeyboardEvent;
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
          });
          paint();
          return {
            dom,
            stopEvent: () => true,
            ignoreMutation: () => true,
            update: (next) => {
              if (next.type !== node.type) return false;
              node = next;
              paint();
              return true;
            },
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
        name: "visualInlineFigure", group: "inline", inline: true,
        parseHTML: () => [{ tag: '[data-visual-figure="inline"]', getAttrs: element => figureAttributes(element as HTMLElement) }],
      }),
      Node.create({
        name: "visualFigureRow", group: "block", content: "visualFigure+",
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

  useEffect(() => {
    if (editor && props.value !== lastEmitted.current) {
      lastEmitted.current = props.value;
      editor.commands.setContent(toHtml(), { emitUpdate: false });
    }
  }, [editor, props.value]);

  useEffect(() => {
    if (!editor) return;
    const tr = editor.state.tr;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === "visualFigure") {
        tr.setNodeMarkup(position, undefined, { ...node.attrs, refresh: Number(node.attrs.refresh) + 1 });
      }
    });
    if (tr.docChanged) editor.view.dispatch(tr.setMeta("addToHistory", false).setMeta("preventUpdate", true));
  }, [editor, props.diagramSvgs, props.imageCrops]);

  useEffect(() => () => hideMathLiveUi(), []);

  const insert = (tex: string) => {
    if (activeMath.current) {
      activeMath.current.insert(tex, { selectionMode: "placeholder" });
      activeMath.current.focus();
      return;
    }
    editor?.chain().focus().insertContent({ type: "visualMath", attrs: { tex, fresh: true } }).run();
  };
  const toggleSource = () => {
    activeMath.current?.blur();
    if (sourceMode && editor) editor.commands.setContent(toHtml(), { emitUpdate: false });
    setSourceMode((value) => !value);
  };

  return <div className={`source-math-editor visual-editor ${props.className ?? ""}`}>
    <div className="visual-editor-toolbar" role="toolbar" aria-label="수식 삽입">
      {!sourceMode && TEMPLATES.map(([label, tex]) =>
        <button key={label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert(tex)}>{label}</button>)}
      {!sourceMode && <>
        <button type="button" aria-label="본문 되돌리기" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().undo().run()}>↶</button>
        <button type="button" aria-label="본문 다시 실행" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().redo().run()}>↷</button>
      </>}
      <button type="button" className="visual-source-toggle" onClick={toggleSource}>{sourceMode ? "직접 편집으로" : "원문 코드"}</button>
    </div>
    {sourceMode
      ? <textarea className="visual-source-input" aria-label={`${props["aria-label"] ?? "문제 본문"} (Markdown + LaTeX)`} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
      : <EditorContent editor={editor} />}
    <p className="visual-editor-help">글은 바로 입력하고, 수식과 그림은 클릭해서 고치세요. 분수는 위아래 칸에 숫자를 입력하면 됩니다.</p>
  </div>;
}
