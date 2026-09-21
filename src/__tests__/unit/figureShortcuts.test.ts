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
  matchFigureShortcut,
  type FigureShortcutId,
} from "@/components/unified/figure-editor/figureShortcuts";

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
    ["a", {}],
    ["Enter", { ctrlKey: true }],
  ])("표 밖의 키는 안 읽는다 — %s %j", (key, init) => {
    expect(hit(key, init)).toBeNull();
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
  });
  it("무리 차례 — 편집 · 선택 · 이동 · 그리기 · 순서 · 묶음", () => {
    expect(sheet.map((group) => group.name)).toEqual([
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
