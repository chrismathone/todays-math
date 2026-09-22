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
 *
 * «나란히» 칸 묶음(원장님 2026-09-22 확정)도 이 노드다(`kind: "side"`) — 제목 문단이 없고 **모든 문단이 칸**,
 * 저장은 `> <나란히:cols=N>` + 한 줄에 한 칸. 도구줄 [나란히] 가 고른 문단들을 감싸고(`wrapSideBySide`),
 * 묶음 위 «1열 2열 3열 4열 · 풀기» 로 열을 바꾸거나 푼다. Tab·Esc 는 상자와 같다.
 */
import { Node, type CommandProps, type Editor } from "@tiptap/core";
import {
  Fragment,
  type Node as ProseMirrorNode,
  type ResolvedPos,
  type Schema,
} from "@tiptap/pm/model";
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
      /**
       * 상자(`position` 자리)의 열 수를 바꾼다. 2열 이상이면 한 줄의 항목 여럿을 칸마다 가른다.
       * 상한은 상자 3 · 나란히 4 — 넘치면 상한으로.
       */
      setBoxColumns: (position: number, cols: BoxColumns) => ReturnType;
      /** 고른 최상위 문단·그림을 «나란히» 칸 묶음으로 감싼다. 상자·표·목록 안이면 아무것도 안 한다. */
      wrapSideBySide: () => ReturnType;
      /** «나란히» 묶음(`position` 자리)을 푼다 — 칸이 문단으로 남는다. */
      unwrapSideBySide: (position: number) => ReturnType;
    };
  }
}

/** 노드의 종류 — 〈보기〉·〈조건〉 상자 · «나란히» 칸 묶음. */
export type ConditionBoxKind = "box" | "side";

const isSide = (node: ProseMirrorNode) => node.attrs.kind === "side";

/** 열 단추 — 상자는 예전처럼 1~3열, 나란히는 1~4열. */
const columnChoices = (side: boolean): BoxColumns[] =>
  side ? [1, 2, 3, 4] : [1, 2, 3];

/**
 * [나란히] 를 눌렀을 때의 열 수 — 칸이 둘 이상이면 2열. «나란히»라는 이름대로 누르자마자 옆으로 서고,
 * 원장님 문항(서답형 3)의 원본이 2열이다. 3·4열은 묶음 위 단추로.
 */
const SIDE_DEFAULT_COLUMNS: BoxColumns = 2;

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

/** 첫 문단이 `<보기>`·`<조건>` 머리인가 — 그래야 열 수를 적을 수 있다. 나란히 묶음은 머리가 없다. */
function hasHeader(box: ProseMirrorNode) {
  if (isSide(box)) return false;
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
  const written = Math.min(cols, isSide(box) ? 4 : 3) as BoxColumns;
  tr.setNodeMarkup(position, undefined, { ...box.attrs, cols: written });
  if (written >= 2) splitItems(tr, position);
  return true;
}

/* ── «나란히» 묶기·풀기 ─────────────────────────────────────────────────── */

/**
 * 줄머리의 배점 표시 `[2점]`. 시험지의 배점은 **앞 소문항의 끝**에 붙는 꼬리다 — 인식은 그것을 다음 소문항
 * 번호와 한 줄에 적는다(원장님 문항: «[2점] (2)»). 묶을 때 앞 칸 끝으로 옮긴다. 그 밖의 글은 옮기지 않는다.
 */
const LEADING_SCORE = /^\s*\[\s*\d+(?:\.\d+)?\s*점\s*\]/;

/** 묶을 수 있는 최상위 블록 — 문단과 그림. 표·목록·상자·선택지는 칸 하나(한 줄)로 적을 수 없다. */
const WRAPPABLE = new Set(["paragraph", "visualFigure", "visualFigureRow"]);

/** 앞뒤 공백 글을 걷어 낸다(빈 글 노드는 버린다). */
function trimInline(nodes: ProseMirrorNode[]): ProseMirrorNode[] {
  const out = [...nodes];
  while (out.length > 0 && out[0]!.isText && !out[0]!.text!.trim()) out.shift();
  while (out.length > 0 && out.at(-1)!.isText && !out.at(-1)!.text!.trim())
    out.pop();
  const first = out[0];
  if (first?.isText) {
    const cut = first.text!.length - first.text!.trimStart().length;
    if (cut > 0) out[0] = first.cut(cut);
  }
  const last = out.at(-1);
  if (last?.isText) {
    const keep = last.text!.trimEnd().length;
    if (keep < last.text!.length) out[out.length - 1] = last.cut(0, keep);
  }
  return out;
}

/** 문단을 줄바꿈(`hardBreak`)마다 가른 줄 — 각 줄의 노드와 문단 안 자리. */
function paragraphLines(paragraph: ProseMirrorNode) {
  const lines: Array<{ nodes: ProseMirrorNode[]; from: number; to: number }> = [
    { nodes: [], from: 0, to: 0 },
  ];
  paragraph.forEach((child, offset) => {
    const line = lines.at(-1)!;
    if (child.type.name === "hardBreak") {
      line.to = offset;
      lines.push({ nodes: [], from: offset + child.nodeSize, to: 0 });
      return;
    }
    line.nodes.push(child);
  });
  lines.at(-1)!.to = paragraph.content.size;
  return lines;
}

/** 줄들을 한 문단으로 되붙인다(사이에 줄바꿈). 줄이 없으면 null. */
function joinLines(
  schema: Schema,
  paragraph: ProseMirrorNode,
  lines: Array<{ nodes: ProseMirrorNode[] }>,
): ProseMirrorNode | null {
  if (lines.length === 0) return null;
  const hardBreak = schema.nodes.hardBreak;
  const nodes = lines.flatMap((line, index) =>
    index > 0 && hardBreak ? [hardBreak.create(), ...line.nodes] : line.nodes,
  );
  return paragraph.type.create(paragraph.attrs, nodes);
}

type Piece =
  | { kind: "line"; nodes: ProseMirrorNode[] }
  | { kind: "figure"; node: ProseMirrorNode; row: boolean };

/**
 * 조각 → 칸. **한 줄이 한 칸**(저장 규칙과 같다). 그림(블록)은 바로 앞 글 칸의 끝에 붙는다 — «(1)» 다음 줄의
 * 그림은 (1) 의 그림이다. 앞이 없거나 그림 칸이면 제 칸을 연다. 그림 행(`visualFigureRow`)의 그림은 저마다 한 칸.
 * 줄머리의 배점(`[2점]`)은 앞 칸 끝으로 옮긴다(`LEADING_SCORE`).
 */
function cellsOf(schema: Schema, pieces: Piece[]): ProseMirrorNode[][] | null {
  const inlineFigure = schema.nodes.visualInlineFigure;
  const cells: Array<{ nodes: ProseMirrorNode[]; textual: boolean }> = [];
  const append = (
    cell: { nodes: ProseMirrorNode[] },
    nodes: ProseMirrorNode[],
  ) => {
    if (cell.nodes.length > 0) cell.nodes.push(schema.text(" "));
    cell.nodes.push(...nodes);
  };
  for (const piece of pieces) {
    const last = cells.at(-1);
    if (piece.kind === "figure") {
      if (!inlineFigure) return null;
      const figure = inlineFigure.create(piece.node.attrs);
      if (!piece.row && last?.textual) append(last, [figure]);
      else cells.push({ nodes: [figure], textual: false });
      continue;
    }
    let nodes = trimInline(piece.nodes);
    const first = nodes[0];
    const score = first?.isText ? LEADING_SCORE.exec(first.text!) : null;
    if (last && first && score) {
      append(last, [schema.text(score[0].trim(), first.marks)]);
      nodes = trimInline(
        first.text!.length > score[0].length
          ? [first.cut(score[0].length), ...nodes.slice(1)]
          : nodes.slice(1),
      );
    }
    if (nodes.length > 0) cells.push({ nodes, textual: true });
  }
  return cells.map((cell) => cell.nodes);
}

/** 최상위 블록 `index` 가 시작하는 문서 자리. */
function topPosition(doc: ProseMirrorNode, index: number) {
  let position = 0;
  for (let child = 0; child < index; child += 1)
    position += doc.child(child).nodeSize;
  return position;
}

function wrapSide(tr: Transaction): boolean {
  const { doc, selection } = tr;
  const schema = doc.type.schema;
  const { $from, $to } = selection;
  const first = $from.index(0);
  let last = $to.depth === 0 ? $to.index(0) - 1 : $to.index(0);
  // 다음 문단 맨 앞까지 끌어 고른 것은 그 문단을 고른 것이 아니다.
  if (last > first && $to.depth > 0 && $to.parentOffset === 0) last -= 1;
  if (last < first || first >= doc.childCount) return false;
  /*
   * 고른 끝이 문단 **끝**이면 바로 뒤따르는 그림(블록)까지 묶는다 — 그 그림은 끝 줄(«(4)»)의 그림이다.
   * 글 선택은 그림 뒤에 끝을 둘 수 없다(브라우저·ProseMirror 가 끝을 앞 문단으로 당긴다). 이 규칙이 없으면
   * «(1) 부터 끝까지» 고른 원장님 문항에서 마지막 그림만 묶음 밖에 남는다.
   */
  const lastBlock = doc.child(last);
  if (
    lastBlock.isTextblock &&
    $to.depth > 0 &&
    $to.parentOffset === lastBlock.content.size
  )
    while (
      last + 1 < doc.childCount &&
      /^visualFigure(Row)?$/.test(doc.child(last + 1).type.name)
    )
      last += 1;

  const pieces: Piece[] = [];
  let before: ProseMirrorNode | null = null;
  let after: ProseMirrorNode | null = null;
  for (let index = first; index <= last; index += 1) {
    const block = doc.child(index);
    if (!WRAPPABLE.has(block.type.name)) return false;
    if (block.type.name === "visualFigure") {
      pieces.push({ kind: "figure", node: block, row: false });
      continue;
    }
    if (block.type.name === "visualFigureRow") {
      block.forEach((figure) =>
        pieces.push({ kind: "figure", node: figure, row: true }),
      );
      continue;
    }
    // 문단 — 고른 자리가 든 줄부터 고른 자리가 든 줄까지만 묶는다. 앞뒤 줄(발문 등)은 묶음 밖에 남긴다.
    const lines = paragraphLines(block);
    const lineAt = (offset: number) =>
      Math.max(
        0,
        lines.findIndex((line) => offset >= line.from && offset <= line.to),
      );
    const start =
      index === first && $from.depth > 0 ? lineAt($from.parentOffset) : 0;
    const end =
      index === last && $to.depth > 0
        ? lineAt($to.parentOffset)
        : lines.length - 1;
    if (index === first)
      before = joinLines(schema, block, lines.slice(0, start));
    if (index === last) after = joinLines(schema, block, lines.slice(end + 1));
    for (const line of lines.slice(start, end + 1))
      pieces.push({ kind: "line", nodes: line.nodes });
  }

  const cells = cellsOf(schema, pieces);
  if (!cells || cells.length === 0) return false;
  const paragraph = schema.nodes.paragraph!;
  const group = schema.nodes.conditionBox!.create(
    {
      kind: "side",
      cols: cells.length >= 2 ? SIDE_DEFAULT_COLUMNS : 1,
    },
    cells.map((nodes) => paragraph.create(null, nodes)),
  );
  const from = topPosition(doc, first);
  const to = topPosition(doc, last) + doc.child(last).nodeSize;
  tr.replaceWith(
    from,
    to,
    Fragment.fromArray(
      [before, group, after].filter(
        (node): node is ProseMirrorNode => node !== null,
      ),
    ),
  );
  // 커서는 묶음의 첫 칸으로 — 묶음 위 열 단추가 곧바로 보인다.
  const inside = from + (before?.nodeSize ?? 0) + 2;
  tr.setSelection(TextSelection.near(tr.doc.resolve(inside)));
  return true;
}

function unwrapSide(tr: Transaction, position: number): boolean {
  const node = tr.doc.nodeAt(position);
  if (node?.type.name !== "conditionBox" || !isSide(node)) return false;
  tr.replaceWith(position, position + node.nodeSize, node.content);
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
  // 고른 것은 지우지 않는다 — 수식을 고른 채(노드 선택) 눌러도 수식이 남고, 고른 자리 앞에서 가른다.
  const { $from } = state.selection;
  const cellDepth = box.depth + 1;
  if ($from.depth < cellDepth) return true;
  const cell = $from.node(cellDepth);
  const inHeader = $from.index(box.depth) === 0 && hasHeader(box.node);
  const blank = (from: number, to: number) =>
    state.doc
      .textBetween(from, to, "", "\u0000")
      .replace(/[ \u00A0\t]/g, "") === "";
  const blankBefore = blank($from.start(cellDepth), $from.pos);
  const blankAfter = blank($from.pos, $from.end(cellDepth));
  const tr = state.tr;

  if (!inHeader && cell.isTextblock && !blankBefore && !blankAfter) {
    const next = splitCellAt(tr, $from.pos);
    view.dispatch(
      tr.setSelection(TextSelection.create(tr.doc, next)).scrollIntoView(),
    );
    return true;
  }
  // 다음 칸 처음으로 — 없으면(마지막 칸) 빈 칸을 연다. 빈 칸에서 또 누르면 그대로.
  const cellEnd = $from.after(cellDepth);
  const next =
    cellEnd < box.pos + box.node.nodeSize - 1
      ? Selection.findFrom(state.doc.resolve(cellEnd), 1, true)
      : null;
  if (next) {
    view.dispatch(tr.setSelection(next).scrollIntoView());
    return true;
  }
  if (!inHeader && blankBefore && blankAfter) return true;
  tr.insert(cellEnd, state.schema.nodes.paragraph!.create());
  view.dispatch(
    tr.setSelection(TextSelection.create(tr.doc, cellEnd + 1)).scrollIntoView(),
  );
  return true;
}

/**
 * 상자 틀 — 테두리 안에 칸들(contentDOM), 머리 오른쪽에 열 버튼, 아래에 Tab 안내.
 * 나란히 묶음은 테두리·머리가 없어 열 버튼이 묶음 **위** 오른쪽에 서고, 뒤에 «풀기» 가 붙는다(같은 단추 꼴).
 */
class ConditionBoxView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private handle: HTMLElement;
  private hint: HTMLElement;
  private buttons: HTMLButtonElement[];
  private choices: BoxColumns[];

  constructor(
    private node: ProseMirrorNode,
    private editor: Editor,
    private getPos: () => number | undefined,
  ) {
    const side = isSide(node);
    this.choices = columnChoices(side);
    this.dom = document.createElement("div");
    this.dom.className = "visual-condition";
    this.handle = document.createElement("span");
    this.handle.className = "visual-condition-cols";
    this.handle.contentEditable = "false";
    const button = (label: string, run: (position: number) => void) => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = label;
      // 누르는 동안 커서·초점이 상자에 남게 — 그래야 손잡이가 안 사라진다.
      element.addEventListener("mousedown", (event) => event.preventDefault());
      element.addEventListener("click", () => {
        const position = this.getPos();
        if (typeof position === "number") run(position);
      });
      return element;
    };
    this.buttons = this.choices.map((cols) =>
      button(`${cols}열`, (position) =>
        this.editor.commands.setBoxColumns(position, cols),
      ),
    );
    if (side) {
      // 열 단추 묶음 + 따로 선 «풀기» — 풀기가 «5열» 처럼 읽히지 않게 떼어 둔다.
      const group = document.createElement("span");
      group.className = "visual-condition-colgroup";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "열 수");
      group.append(...this.buttons);
      const unwrap = button("풀기", (position) =>
        this.editor.commands.unwrapSideBySide(position),
      );
      unwrap.className = "visual-condition-unwrap";
      unwrap.setAttribute("aria-label", "나란히 풀기");
      this.handle.append(group, unwrap);
    } else {
      this.handle.setAttribute("role", "group");
      this.handle.setAttribute("aria-label", "열 수");
      this.handle.append(...this.buttons);
    }
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
    this.dom.toggleAttribute("data-side-by-side", isSide(this.node));
    this.buttons.forEach((button, index) =>
      button.setAttribute("aria-pressed", String(this.choices[index] === cols)),
    );
  }

  update(node: ProseMirrorNode) {
    // 종류가 바뀌면(상자 ↔ 나란히) 단추 줄이 달라 틀을 새로 세운다.
    if (node.type !== this.node.type || isSide(node) !== isSide(this.node))
      return false;
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
      // 초점은 편집기 안 어디든(상자 안 수식 칸 포함) — `focusin`·`focusout` 은 안쪽에서도 올라온다.
      handleDOMEvents: {
        focusin(view) {
          if (!conditionBoxCaret.getState(view.state)?.focused)
            view.dispatch(
              view.state.tr.setMeta(conditionBoxCaret, { focused: true }),
            );
          return false;
        },
        focusout(view, event) {
          // 상자 안 수식 칸(MathLive)·그 작은 자판으로 가면 커서는 여전히 상자 안이다.
          const next = (event as FocusEvent).relatedTarget as Element | null;
          if (
            next &&
            (view.dom.contains(next) ||
              next.closest?.(".compact-math-keyboard"))
          )
            return false;
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
  return caretBoxKind(state) !== null;
}

/** 커서가 든 것이 상자인지 나란히 묶음인지 — 초점이 편집기에 없거나 밖이면 null. */
export function caretBoxKind(state: EditorState): ConditionBoxKind | null {
  if (!conditionBoxCaret.getState(state)?.focused) return null;
  const box = boxAround(state.selection.$from);
  return box ? (isSide(box.node) ? "side" : "box") : null;
}

export const ConditionBox = Node.create({
  name: "conditionBox",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({
    cols: { default: 1 },
    kind: {
      default: "box",
      parseHTML: (element: HTMLElement) =>
        element.hasAttribute("data-side-by-side") ? "side" : "box",
      renderHTML: () => ({}),
    },
  }),
  parseHTML: () => [
    {
      tag: "[data-condition-box]",
      getAttrs: (element) => ({
        cols: Number((element as HTMLElement).dataset.conditionBox) || 1,
        kind: (element as HTMLElement).hasAttribute("data-side-by-side")
          ? "side"
          : "box",
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    {
      class: "visual-condition",
      "data-condition-box": node.attrs.cols,
      ...(isSide(node) ? { "data-side-by-side": "" } : {}),
    },
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
      wrapSideBySide:
        () =>
        ({ tr, state, dispatch }: CommandProps) =>
          // 묻기만 할 때(`can()`)는 버릴 트랜잭션에서 해 본다 — 문서를 안 건드린다.
          dispatch ? wrapSide(tr) : wrapSide(state.tr),
      unwrapSideBySide:
        (position: number) =>
        ({ tr, state, dispatch }: CommandProps) =>
          dispatch ? unwrapSide(tr, position) : unwrapSide(state.tr, position),
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
