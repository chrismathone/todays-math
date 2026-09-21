import { afterEach, describe, expect, it } from "vitest";
import { Editor, Node, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { ConditionBox } from "@/components/math/editor/conditionBox";
import { documentMarkdown } from "@/components/math/editor/visualDocument";

/**
 * 작업실 원문 편집기의 〈보기〉 상자 — 열 수 손잡이(안 C) · 상자 안 Tab = 다음 칸 · Esc 뒤 Tab = 상자 밖.
 * 원장님 2026-09-21 확정(트랙 51, «추천대로 가»). 앞서 물으신 «보기 안에서 탭키를 눌러서 hwp 처럼
 * 열맞춤» 이 이것이다. 저장 모양은 `<보기:cols=N>` + 한 줄에 한 칸(트랙 46 과 같다).
 *
 * 실제 TipTap 편집기를 jsdom 에 세우고 키를 누른다. 모양(시안)·실제 브라우저 동작은 e2e(`box-cols.spec.ts`).
 */

/** 편집기의 수식 노드와 같은 이름·속성의 대역(MathLive 없이). */
const VisualMath = Node.create({
  name: "visualMath",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    tex: { default: "" },
    display: { default: false },
    fresh: { default: false },
  }),
  parseHTML: () => [{ tag: "span[data-math-tex]" }],
  renderHTML: ({ node }) => ["span", { "data-math-tex": node.attrs.tex }],
});

const text = (value: string): JSONContent => ({ type: "text", text: value });
const bold = (value: string): JSONContent => ({
  type: "text",
  text: value,
  marks: [{ type: "bold" }],
});
const math = (tex: string): JSONContent => ({
  type: "visualMath",
  attrs: { tex },
});
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});

/** 원장님 9번 저장본 — 인식이 원본의 한 행을 한 줄에 적었다((마)(바) 사이엔 친 네 칸). */
const box9 = (cols = 1): JSONContent => ({
  type: "doc",
  content: [
    paragraph(text("다음 이차함수의 그래프에 대한 설명으로 옳지 않은 것은?")),
    {
      type: "conditionBox",
      attrs: { cols },
      content: [
        paragraph(bold("<보기>")),
        paragraph(
          text("(가) "),
          math("y = 3x^2"),
          text(" (나) "),
          math("y = -\\frac{2}{3}x^2"),
          text(" (다) "),
          math("y = -3x^2"),
        ),
        paragraph(
          text("(라) "),
          math("y = \\frac{4}{3}x^2"),
          text("(마) "),
          math("y = \\frac{3}{4}x^2"),
          text("    (바) "),
          math("y = -5x^2"),
        ),
      ],
    },
    paragraph(text("① 모두 원점이 꼭짓점이다.")),
  ],
});

let editor: Editor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.replaceChildren();
});

function mount(content: JSONContent) {
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, VisualMath, ConditionBox],
    content,
  });
  return editor;
}

/** 글자 `needle` 이 시작하는 문서 자리(`offset` 만큼 뒤로). */
function positionOf(current: Editor, needle: string, offset = 0) {
  let found = -1;
  current.state.doc.descendants((node, pos) => {
    if (found >= 0 || !node.isText) return;
    const at = node.text!.indexOf(needle);
    if (at >= 0) found = pos + at + offset;
  });
  if (found < 0) throw new Error(`없는 글: ${needle}`);
  return found;
}

function caretAt(current: Editor, position: number) {
  current.view.dispatch(
    current.state.tr.setSelection(
      TextSelection.create(current.state.doc, position),
    ),
  );
}

function press(current: Editor, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  current.view.dom.dispatchEvent(event);
  return event;
}

const markdown = (current: Editor) => documentMarkdown(current.getJSON());
const boxPosition = (current: Editor) => {
  let found = -1;
  current.state.doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === "conditionBox") found = pos;
  });
  return found;
};
const boxLines = (current: Editor) =>
  markdown(current)
    .split("\n")
    .filter((line) => line.startsWith(">"));

describe("열 수 손잡이 — 고르면 머리가 `<보기:cols=N>`, 한 줄의 항목들은 칸마다", () => {
  it("3열: (가)(나)(다) · (라)(마)(바) 가 여섯 칸 — 지면·검수 카드와 같은 칸 규칙", () => {
    const current = mount(box9());
    current.commands.setBoxColumns(boxPosition(current), 3);
    expect(boxLines(current)).toEqual([
      "> <보기:cols=3>",
      "> (가) $y = 3x^2$",
      "> (나) $y = -\\frac{2}{3}x^2$",
      "> (다) $y = -3x^2$",
      "> (라) $y = \\frac{4}{3}x^2$",
      "> (마) $y = \\frac{3}{4}x^2$",
      "> (바) $y = -5x^2$",
    ]);
  });

  it("1열로 되돌리면 맨 `<보기>` — 가른 칸은 그대로 한 줄씩(되돌리기는 ↶)", () => {
    const current = mount(box9());
    current.commands.setBoxColumns(boxPosition(current), 2);
    expect(boxLines(current)[0]).toBe("> <보기:cols=2>");
    current.commands.setBoxColumns(boxPosition(current), 1);
    expect(boxLines(current)).toHaveLength(7);
    expect(boxLines(current)[0]).toBe("> <보기>");
  });

  it("손잡이 버튼 — 누른 열이 눌린 표시(aria-pressed), 누르면 그 열로", () => {
    const current = mount(box9(2));
    const buttons = [
      ...current.view.dom.querySelectorAll<HTMLButtonElement>(
        ".visual-condition-cols button",
      ),
    ];
    expect(buttons.map((button) => button.textContent)).toEqual([
      "1열",
      "2열",
      "3열",
    ]);
    expect(
      buttons.map((button) => button.getAttribute("aria-pressed")),
    ).toEqual(["false", "true", "false"]);
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    buttons[2]!.dispatchEvent(down);
    // 누르는 동안 커서·초점이 상자에서 안 빠지게.
    expect(down.defaultPrevented).toBe(true);
    buttons[2]!.click();
    expect(boxLines(current)[0]).toBe("> <보기:cols=3>");
    expect(buttons[2]!.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("커서가 상자 안에 있을 때만 손잡이가 보인다", () => {
  it("상자 안 + 초점 → has-caret, 상자 밖·초점 잃음 → 없음", () => {
    const current = mount(box9());
    const box = () => current.view.dom.querySelector(".visual-condition")!;
    current.view.dom.dispatchEvent(new FocusEvent("focus"));
    caretAt(current, positionOf(current, "(가)"));
    expect(box().classList.contains("has-caret")).toBe(true);
    caretAt(current, positionOf(current, "다음 이차함수"));
    expect(box().classList.contains("has-caret")).toBe(false);
    caretAt(current, positionOf(current, "(가)"));
    current.view.dom.dispatchEvent(new FocusEvent("blur"));
    expect(box().classList.contains("has-caret")).toBe(false);
  });
});

describe("상자 안 Tab = 다음 칸", () => {
  it("줄 가운데 — 그 자리에서 다음 칸으로 가른다, 사이 공백은 지운다", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "(나)"));
    const event = press(current, "Tab");
    expect(event.defaultPrevented).toBe(true);
    expect(boxLines(current).slice(1, 3)).toEqual([
      "> (가) $y = 3x^2$",
      "> (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$",
    ]);
    // 커서는 새 칸의 처음 — 곧바로 다음 Tab 을 칠 수 있다.
    expect(current.state.selection.from).toBe(positionOf(current, "(나)"));
  });

  it("칸 끝 — 다음 칸 처음으로, 마지막 칸이면 빈 칸을 새로 연다", () => {
    const current = mount(box9(3));
    current.commands.setBoxColumns(boxPosition(current), 3);
    const endOfGa = positionOf(current, "(가) ") + "(가) ".length + 1;
    caretAt(current, endOfGa);
    press(current, "Tab");
    expect(current.state.selection.from).toBe(positionOf(current, "(나)"));
    const endOfBa = positionOf(current, "(바) ") + "(바) ".length + 1;
    caretAt(current, endOfBa);
    press(current, "Tab");
    expect(current.state.selection.$from.parent.textContent).toBe("");
    expect(current.state.selection.$from.node(-1).type.name).toBe(
      "conditionBox",
    );
  });

  it("머리(〈보기〉) 에서는 첫 칸으로 — 머리를 가르지 않는다", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "<보기>", 3));
    press(current, "Tab");
    expect(boxLines(current)[0]).toBe("> <보기>");
    expect(current.state.selection.from).toBe(positionOf(current, "(가)"));
  });
});

describe("Esc 뒤 Tab = 상자 밖 · 상자 밖의 키는 예전 그대로", () => {
  it("Esc 는 상자 안에서 한 번 먹는다(작업실 확대가 안 풀린다), 그 뒤 Tab 은 상자 다음 문단으로", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "(나)"));
    expect(press(current, "Escape").defaultPrevented).toBe(true);
    const before = markdown(current);
    expect(press(current, "Tab").defaultPrevented).toBe(true);
    expect(markdown(current)).toBe(before);
    expect(current.state.selection.$from.parent.textContent).toBe(
      "① 모두 원점이 꼭짓점이다.",
    );
    expect(current.state.selection.$from.parentOffset).toBe(0);
  });

  it("Esc 뒤 다른 키를 치면 Esc 는 잊는다 — 다음 Tab 은 다시 다음 칸", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "(나)"));
    press(current, "Escape");
    caretAt(current, positionOf(current, "(다)"));
    press(current, "Tab");
    expect(boxLines(current)).toContain("> (다) $y = -3x^2$");
  });

  it("두 번째 Esc 는 넘긴다 — 작업실 확대 풀기 등 예전 동작", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "(나)"));
    press(current, "Escape");
    expect(press(current, "Escape").defaultPrevented).toBe(false);
  });

  it("상자가 문서 끝이면 Esc 뒤 Tab 이 빈 문단을 새로 연다", () => {
    const doc = box9();
    doc.content = doc.content!.slice(0, 2);
    const current = mount(doc);
    caretAt(current, positionOf(current, "(가)"));
    press(current, "Escape");
    press(current, "Tab");
    expect(current.state.selection.$from.depth).toBe(1);
    expect(current.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(current.state.doc.lastChild?.type.name).toBe("paragraph");
  });

  it("상자 밖 Tab·Esc 는 손대지 않는다 — 브라우저 초점 이동·작업실 Esc 그대로", () => {
    const current = mount(box9());
    caretAt(current, positionOf(current, "다음 이차함수"));
    const before = markdown(current);
    expect(press(current, "Tab").defaultPrevented).toBe(false);
    expect(press(current, "Escape").defaultPrevented).toBe(false);
    expect(markdown(current)).toBe(before);
  });
});
