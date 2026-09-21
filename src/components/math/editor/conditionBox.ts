/**
 * 작업실 원문 편집기의 〈보기〉·〈조건〉 상자 — 열 수 손잡이 · 상자 안 Tab (트랙 51, 안 C).
 *
 * 원장님 2026-09-21 확정(«추천대로 가»): 커서가 상자 안에 있을 때만 상자 머리 오른쪽에 «1열 2열 3열»,
 * 상자 안 Tab = 다음 칸(한 줄의 «(가) … (나) …» 를 칸으로 가르기), Esc 뒤 Tab = 상자 밖. 원장님이 앞서
 * 물으신 «보기 안에서 탭키를 눌러서 hwp 처럼 열맞춤» 이 이것이다.
 *
 * 저장 모양은 트랙 46 그대로 — 머리 `<보기:cols=N>` + 한 줄에 한 칸(`documentMarkdown`). 문단 하나가
 * 칸 하나다. 열을 고르면 한 줄에 든 항목 여럿을 **지면·검수 카드와 같은 규칙**(`itemCellStarts`)으로
 * 칸마다 가른다 — 편집기에서 본 격자가 저장 뒤 검수 카드·지면의 격자와 같다.
 *
 * 상자 밖의 Tab·Esc 는 손대지 않는다(표의 다음 칸·브라우저 초점 이동·작업실 확대 풀기 그대로).
 */
import { Node, type CommandProps, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import {
  Decoration,
  DecorationSet,
  type EditorView,
  type NodeView,
} from "@tiptap/pm/view";
import { itemCellStarts } from "@/lib/math/boxBlock";
import { parseBoxHeader, type BoxColumns } from "@/lib/math/boxHeader";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    conditionBox: {
      /** 상자(`position` 자리)의 열 수를 바꾼다. 2·3열이면 한 줄의 항목 여럿을 칸마다 가른다. */
      setBoxColumns: (position: number, cols: BoxColumns) => ReturnType;
    };
  }
}

interface CaretState {
  /** 편집기(또는 그 안의 수식 칸)에 초점이 있는가. */
  focused: boolean;
  /** 상자 안에서 Esc 를 눌렀다 — 다음 Tab 은 상자 밖으로. 글·커서가 바뀌면 잊는다. */
  escaped: boolean;
}

export const conditionBoxCaret = new PluginKey<CaretState>("conditionBoxCaret");

const SPACE = /[ \u00A0\t]/;

/** 커서가 든 상자 — 없으면 null. */
function boxAround($pos: ResolvedPos) {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name === "conditionBox")
      return { node, pos: $pos.before(depth), depth };
  }
  return null;
}

/** 첫 문단이 `<보기>`·`<조건>` 머리인가 — 그래야 열 수를 적을 수 있다. */
function hasHeader(box: ProseMirrorNode) {
  const first = box.firstChild;
  if (!first?.isTextblock) return false;
  const label = parseBoxHeader(first.textContent.trim())?.label;
  return label === "보기" || label === "조건";
}

/** 문단 글을 칸 가르기용으로 — 수식·그림 노드는 `\u0000` 한 글자(지면의 수식 가림과 같은 뜻). */
function paragraphProbe(paragraph: ProseMirrorNode, contentStart: number) {
  let probe = "";
  const positions: number[] = [];
  paragraph.forEach((child, offset) => {
    const start = contentStart + offset;
    if (child.isText) {
      for (let index = 0; index < child.text!.length; index += 1) {
        probe += child.text![index];
        positions.push(start + index);
      }
    } else {
      probe += "\u0000";
      positions.push(start);
    }
  });
  positions.push(contentStart + paragraph.content.size);
  return { probe, positions };
}

/** 한 문단을 `at`(문서 자리)에서 가른다 — 사이의 공백은 지운다. 새 칸의 처음 자리를 돌려준다. */
function splitCellAt(tr: Transaction, at: number): number {
  const $at = tr.doc.resolve(at);
  const start = $at.start();
  const end = $at.end();
  let before = at;
  while (before > start && SPACE.test(tr.doc.textBetween(before - 1, before)))
    before -= 1;
  let after = at;
  while (after < end && SPACE.test(tr.doc.textBetween(after, after + 1)))
    after += 1;
  if (after > at) tr.delete(at, after);
  if (at > before) tr.delete(before, at);
  tr.split(before);
  return before + 2;
}

/** 상자 안 칸들을 항목마다 가른다(뒤에서부터 — 앞 자리가 안 밀리게). */
function splitItems(tr: Transaction, boxPos: number) {
  const box = tr.doc.nodeAt(boxPos);
  if (!box) return;
  const header = hasHeader(box);
  const cells: Array<{ node: ProseMirrorNode; start: number; index: number }> =
    [];
  box.forEach((child, offset, index) => {
    if (child.isTextblock && !(header && index === 0))
      cells.push({ node: child, start: boxPos + 1 + offset + 1, index });
  });
  for (const cell of cells.reverse()) {
    const { probe, positions } = paragraphProbe(cell.node, cell.start);
    const starts = itemCellStarts(probe);
    for (const start of starts.slice(1).reverse())
      splitCellAt(tr, positions[start]!);
  }
}

function setColumns(
  tr: Transaction,
  position: number,
  cols: BoxColumns,
): boolean {
  const box = tr.doc.nodeAt(position);
  if (box?.type.name !== "conditionBox") return false;
  tr.setNodeMarkup(position, undefined, { ...box.attrs, cols });
  if (cols >= 2) splitItems(tr, position);
  return true;
}

/** 상자 다음의 첫 글 자리로 — 상자가 문서 끝이면 빈 문단을 연다. */
function leaveBox(
  view: EditorView,
  box: { node: ProseMirrorNode; pos: number },
) {
  const { state } = view;
  const after = box.pos + box.node.nodeSize;
  const tr = state.tr;
  let target = Selection.findFrom(state.doc.resolve(after), 1, true);
  if (!target) {
    tr.insert(after, state.schema.nodes.paragraph!.create());
    target = TextSelection.create(tr.doc, after + 1);
  }
  view.dispatch(tr.setSelection(target).scrollIntoView());
}

/** 상자 안 Tab — 가운데면 가르고, 칸 처음·끝이면 다음 칸으로(마지막 칸이면 빈 칸을 연다). */
function nextCell(
  view: EditorView,
  box: { node: ProseMirrorNode; pos: number; depth: number },
) {
  const { state } = view;
  const { $from } = state.selection;
  const cellDepth = box.depth + 1;
  if ($from.depth < cellDepth) return true;
  const cellIndex = $from.index(box.depth);
  const cellEnd = $from.after(cellDepth);
  const tr = state.tr;
  if (!state.selection.empty) tr.deleteSelection();
  const $at = tr.doc.resolve(tr.mapping.map($from.pos));
  const cell = $at.node(cellDepth);
  const inHeader = cellIndex === 0 && hasHeader(box.node);
  const textBefore = tr.doc.textBetween(
    $at.start(cellDepth),
    $at.pos,
    "",
    "\u0000",
  );
  const textAfter = tr.doc.textBetween(
    $at.pos,
    $at.end(cellDepth),
    "",
    "\u0000",
  );
  const blank = (value: string) => value.replace(/[ \u00A0\t]/g, "") === "";

  if (
    !inHeader &&
    cell.isTextblock &&
    !blank(textBefore) &&
    !blank(textAfter)
  ) {
    const next = splitCellAt(tr, $at.pos);
    view.dispatch(
      tr.setSelection(TextSelection.create(tr.doc, next)).scrollIntoView(),
    );
    return true;
  }
  // 다음 칸 처음으로 — 없으면(마지막 칸) 빈 칸을 연다. 빈 칸에서 또 누르면 그대로.
  const mappedEnd = tr.mapping.map(cellEnd);
  const boxEnd = tr.mapping.map(box.pos + box.node.nodeSize) - 1;
  if (mappedEnd < boxEnd) {
    const target = Selection.findFrom(tr.doc.resolve(mappedEnd), 1, true);
    if (target) {
      view.dispatch(tr.setSelection(target).scrollIntoView());
      return true;
    }
  }
  if (!inHeader && blank(textBefore) && blank(textAfter)) {
    if (tr.docChanged) view.dispatch(tr);
    return true;
  }
  tr.insert(mappedEnd, state.schema.nodes.paragraph!.create());
  view.dispatch(
    tr
      .setSelection(TextSelection.create(tr.doc, mappedEnd + 1))
      .scrollIntoView(),
  );
  return true;
}

const COLUMN_CHOICES: BoxColumns[] = [1, 2, 3];

/** 상자 틀 — 테두리 안에 칸들(contentDOM), 머리 오른쪽에 열 버튼, 아래에 Tab 안내. */
class ConditionBoxView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private handle: HTMLElement;
  private hint: HTMLElement;
  private buttons: HTMLButtonElement[];

  constructor(
    private node: ProseMirrorNode,
    private editor: Editor,
    private getPos: () => number | undefined,
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "visual-condition";
    this.handle = document.createElement("span");
    this.handle.className = "visual-condition-cols";
    this.handle.contentEditable = "false";
    this.handle.setAttribute("role", "group");
    this.handle.setAttribute("aria-label", "열 수");
    this.buttons = COLUMN_CHOICES.map((cols) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${cols}열`;
      // 누르는 동안 커서·초점이 상자에 남게 — 그래야 손잡이가 안 사라진다.
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        const position = this.getPos();
        if (typeof position === "number")
          this.editor.commands.setBoxColumns(position, cols);
      });
      return button;
    });
    this.handle.append(...this.buttons);
    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "visual-condition-cells";
    this.hint = document.createElement("span");
    this.hint.className = "visual-condition-tabhint";
    this.hint.contentEditable = "false";
    this.hint.setAttribute("aria-hidden", "true");
    this.hint.textContent = "Tab: 다음 칸";
    this.dom.append(this.handle, this.contentDOM, this.hint);
    this.paint();
  }

  private paint() {
    const cols = Number(this.node.attrs.cols) || 1;
    this.dom.dataset.conditionBox = String(cols);
    this.contentDOM.dataset.conditionBox = String(cols);
    this.dom.toggleAttribute("data-has-header", hasHeader(this.node));
    this.buttons.forEach((button, index) =>
      button.setAttribute(
        "aria-pressed",
        String(COLUMN_CHOICES[index] === cols),
      ),
    );
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.paint();
    return true;
  }

  stopEvent(event: Event) {
    const target = event.target as globalThis.Node | null;
    return (
      !!target && (this.handle.contains(target) || this.hint.contains(target))
    );
  }

  ignoreMutation(mutation: MutationRecord | { type: "selection" }) {
    if (mutation.type === "selection") return false;
    const target = (mutation as MutationRecord).target;
    if (target === this.dom || target === this.contentDOM)
      return mutation.type === "attributes";
    return !this.contentDOM.contains(target);
  }
}

const caretPlugin = () =>
  new Plugin<CaretState>({
    key: conditionBoxCaret,
    state: {
      init: () => ({ focused: false, escaped: false }),
      apply(tr, value) {
        let next = value;
        if (value.escaped && (tr.docChanged || tr.selectionSet))
          next = { ...next, escaped: false };
        const meta = tr.getMeta(conditionBoxCaret) as
          Partial<CaretState> | undefined;
        return meta ? { ...next, ...meta } : next;
      },
    },
    props: {
      decorations(state: EditorState) {
        if (!conditionBoxCaret.getState(state)?.focused) return null;
        const box = boxAround(state.selection.$from);
        if (!box) return null;
        return DecorationSet.create(state.doc, [
          Decoration.node(box.pos, box.pos + box.node.nodeSize, {
            class: "has-caret",
          }),
        ]);
      },
      handleDOMEvents: {
        focus(view) {
          view.dispatch(
            view.state.tr.setMeta(conditionBoxCaret, { focused: true }),
          );
          return false;
        },
        blur(view, event) {
          // 상자 안 수식 칸(MathLive)으로 초점이 가면 커서는 여전히 상자 안이다.
          const next = (event as FocusEvent)
            .relatedTarget as globalThis.Node | null;
          if (next && view.dom.contains(next)) return false;
          view.dispatch(
            view.state.tr.setMeta(conditionBoxCaret, { focused: false }),
          );
          return false;
        },
      },
    },
  });

/** 커서가 든 상자가 있고 초점이 편집기에 있는가 — 편집기 아래 안내 문구가 쓴다. */
export function caretInConditionBox(state: EditorState) {
  return (
    !!conditionBoxCaret.getState(state)?.focused &&
    !!boxAround(state.selection.$from)
  );
}

export const ConditionBox = Node.create({
  name: "conditionBox",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ cols: { default: 1 } }),
  parseHTML: () => [
    {
      tag: "[data-condition-box]",
      getAttrs: (element) => ({
        cols: Number((element as HTMLElement).dataset.conditionBox) || 1,
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    { class: "visual-condition", "data-condition-box": node.attrs.cols },
    0,
  ],
  addNodeView() {
    return ({ node, editor, getPos }) =>
      new ConditionBoxView(node, editor, getPos);
  },
  addCommands() {
    return {
      setBoxColumns:
        (position: number, cols: BoxColumns) =>
        ({ tr, dispatch }: CommandProps) => {
          if (!dispatch)
            return tr.doc.nodeAt(position)?.type.name === this.name;
          return setColumns(tr, position, cols);
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { state, view } = editor;
        const box = boxAround(state.selection.$from);
        if (!box) return false;
        if (conditionBoxCaret.getState(state)?.escaped) {
          leaveBox(view, box);
          return true;
        }
        return nextCell(view, box);
      },
      Escape: ({ editor }) => {
        const { state, view } = editor;
        if (!boxAround(state.selection.$from)) return false;
        if (conditionBoxCaret.getState(state)?.escaped) return false;
        view.dispatch(state.tr.setMeta(conditionBoxCaret, { escaped: true }));
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    return [caretPlugin()];
  },
});
