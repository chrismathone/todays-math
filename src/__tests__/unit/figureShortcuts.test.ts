/**
 * 도형 편집기 단축키 — **표 하나**(`FIGURE_SHORTCUTS`)를 처리기와 도움말 목록이 같이 읽는다.
 * 원장님 2026-09-21 «단축키도 업데이트하고». Ctrl+G 묶기가 처리기에는 있는데 도움말 목록에 없었다 — 목록을
 * 손으로 따로 적어서다. 이제 처리기는 `matchFigureShortcut` 으로만 키를 읽고, 목록은 같은 표를 그린다.
 */
import { describe, expect, it } from "vitest";

import {
  FIGURE_SHORTCUTS,
  figureShortcutKeys,
  figureShortcutSheet,
  figureToolKey,
  matchFigureShortcut,
  type FigureShortcutId,
} from "@/components/unified/figure-editor/figureShortcuts";
import {
  FIGURE_TOOLS,
  type FigureTool,
} from "@/components/unified/figure-editor/figureTools";

const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent("keydown", { key, ...init });
const hit = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  matchFigureShortcut(press(key, init));

describe("처리기가 읽는 키", () => {
  it.each<[string, Partial<KeyboardEventInit>, FigureShortcutId]>([
    ["z", { ctrlKey: true }, "undo"],
    ["Z", { ctrlKey: true, shiftKey: true }, "redo"],
    ["y", { ctrlKey: true }, "redo"],
    ["z", { metaKey: true }, "undo"],
    ["a", { ctrlKey: true }, "selectAll"],
    ["d", { ctrlKey: true }, "duplicate"],
    ["g", { ctrlKey: true }, "group"],
    ["G", { ctrlKey: true, shiftKey: true }, "ungroup"],
    ["}", { ctrlKey: true, shiftKey: true, code: "BracketRight" }, "front"],
    ["]", { ctrlKey: true, code: "BracketRight" }, "forward"],
    ["[", { ctrlKey: true, code: "BracketLeft" }, "backward"],
    ["{", { ctrlKey: true, shiftKey: true, code: "BracketLeft" }, "back"],
    ["]", { ctrlKey: true }, "forward"],
    ["Delete", {}, "delete"],
    ["Backspace", {}, "delete"],
    ["Escape", {}, "cancel"],
    ["Enter", {}, "finish"],
    ["ArrowLeft", {}, "nudge"],
    ["ArrowDown", { shiftKey: true }, "nudge"],
    [" ", { code: "Space" }, "pan"],
  ])("%s %j → %s", (key, init, id) => {
    expect(hit(key, init)?.id).toBe(id);
  });
  it("자판 자리(code)가 먼저 — 한글 자판·Shift 로 글자가 바뀌어도", () => {
    expect(hit("ㅎ", { ctrlKey: true, code: "KeyG" })?.id).toBe("group");
    expect(hit("ㅋ", { ctrlKey: true, code: "KeyZ" })?.id).toBe("undo");
  });
  it.each<[string, Partial<KeyboardEventInit>]>([
    ["c", { ctrlKey: true }],
    ["x", { ctrlKey: true }],
    ["v", { ctrlKey: true }],
    ["e", { ctrlKey: true }],
    ["Delete", { ctrlKey: true }],
    ["ArrowLeft", { ctrlKey: true }],
    ["q", {}],
    ["1", {}],
    ["Enter", { ctrlKey: true }],
  ])("표 밖의 키는 안 읽는다 — %s %j", (key, init) => {
    expect(hit(key, init)).toBeNull();
  });
});

/**
 * 도구 한 글자 — 원장님 2026-09-21 «두다»(트랙 43 여쭐 것 3). 글자는 Figma·tldraw 관례(V 선택 · H 화면 이동 ·
 * L 선 · A 화살표 · O 원 · R 사각형 · T 글자), 관례가 없는 것은 비어 있는 글자(보고서 표).
 * 묶인 도구(선·도형)를 글자로 고르면 그 도구가 무리의 겉에 선다 — 그것은 편집기 시험(toolbar)이 본다.
 */
describe("도구 한 글자", () => {
  const TOOL_KEYS: [string, FigureTool | "function"][] = [
    ["v", "select"],
    ["h", "pan"],
    ["l", "line"],
    ["a", "arrow"],
    ["c", "curve"],
    ["o", "circle"],
    ["e", "ellipse"],
    ["r", "rect"],
    ["y", "triangle"],
    ["p", "polygon"],
    ["t", "text"],
    ["f", "fill"],
    ["x", "function"],
  ];
  it.each(TOOL_KEYS)("%s → %s (Caps Lock 이 켜져도)", (key, tool) => {
    expect(hit(key)?.tool).toBe(tool);
    expect(hit(key.toUpperCase())?.tool).toBe(tool);
  });
  it("한글 입력 상태는 자판 자리로 읽는다 — ㅣ(L 자리) 선분 · ㅔ(P 자리) 다각형 · ㅅ(T 자리) 글자", () => {
    expect(hit("ㅣ", { code: "KeyL" })?.tool).toBe("line");
    expect(hit("ㅔ", { code: "KeyP" })?.tool).toBe("polygon");
    expect(hit("ㅅ", { code: "KeyT" })?.tool).toBe("text");
  });
  it.each<[string, Partial<KeyboardEventInit>]>([
    ["l", { ctrlKey: true }],
    ["l", { metaKey: true }],
    ["l", { altKey: true }],
    ["L", { shiftKey: true }],
    ["o", { ctrlKey: true, shiftKey: true }],
  ])("Ctrl·Alt·⌘·Shift 가 눌렸으면 도구를 안 고른다 — %s %j", (key, init) => {
    expect(hit(key, init)?.tool).toBeUndefined();
  });
  it("Ctrl 이 붙은 같은 글자는 전과 같다 — Ctrl+A 전체 선택 · Ctrl+D 복제 · Ctrl+Y 다시 실행", () => {
    expect(hit("a", { ctrlKey: true })?.id).toBe("selectAll");
    expect(hit("y", { ctrlKey: true })?.id).toBe("redo");
    expect(hit("c", { ctrlKey: true })).toBeNull();
  });
  it("도구 줄의 도구마다 꼭 한 줄 · 글자는 겹치지 않는다 · 이름은 도구 단추와 같은 말", () => {
    const rows = FIGURE_SHORTCUTS.filter((s) => s.tool);
    expect(rows.map((s) => s.tool).sort()).toEqual(
      FIGURE_TOOLS.map((t) => t.id).sort(),
    );
    const keys = rows.map((s) => figureShortcutKeys(s, "Ctrl"));
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of rows)
      expect(row.label).toBe(
        FIGURE_TOOLS.find((t) => t.id === row.tool)!.label,
      );
    expect(rows.every((s) => s.group === "도구")).toBe(true);
  });
  it("도구 단추의 title 이 읽는 글자도 같은 표에서 — figureToolKey", () => {
    expect(figureToolKey("line")).toBe("L");
    expect(figureToolKey("function")).toBe("X");
    for (const tool of FIGURE_TOOLS)
      expect(figureToolKey(tool.id), tool.id).toMatch(/^[A-Z]$/);
  });
});

describe("도움말 목록은 같은 표를 그린다", () => {
  const sheet = figureShortcutSheet();
  const listed = sheet.flatMap((group) => group.items.map((item) => item.id));
  it("표의 단축키가 목록에 빠짐없이 한 번씩", () => {
    expect([...listed].sort()).toEqual(
      FIGURE_SHORTCUTS.map((s) => s.id).sort(),
    );
    expect(new Set(listed).size).toBe(listed.length);
  });
  it("처리기가 읽는 키는 모두 목록에 있다 — 새로 더해도 빠질 수 없다", () => {
    for (const shortcut of FIGURE_SHORTCUTS.filter((s) => s.test))
      expect(listed, shortcut.id).toContain(shortcut.id);
  });
  it("원장님이 찾으시던 줄 — Ctrl+G 묶음 · 순서 넷", () => {
    const text = sheet
      .flatMap((group) =>
        group.items.map(
          (item) => `${figureShortcutKeys(item, "Ctrl")} ${item.label}`,
        ),
      )
      .join("\n");
    expect(text).toContain("Ctrl+G 묶음 만들기");
    expect(text).toContain("Ctrl+Shift+G 묶음 해제");
    expect(text).toContain("Ctrl+Shift+] 맨 앞으로");
    expect(text).toContain("Ctrl+] 앞으로");
    expect(text).toContain("Ctrl+[ 뒤로");
    expect(text).toContain("Ctrl+Shift+[ 맨 뒤로");
    expect(text).toContain("L 선분");
    expect(text).toContain("O 원");
    expect(text).toContain("T 글자");
  });
  it("무리 차례 — 도구 · 편집 · 선택 · 이동 · 그리기 · 순서 · 묶음", () => {
    expect(sheet.map((group) => group.name)).toEqual([
      "도구",
      "편집",
      "선택",
      "이동",
      "그리기",
      "순서",
      "묶음",
    ]);
  });
  it("맥은 ⌘ 로 적는다", () => {
    const undo = FIGURE_SHORTCUTS.find((s) => s.id === "undo")!;
    expect(figureShortcutKeys(undo, "⌘")).toBe("⌘+Z");
  });
});
