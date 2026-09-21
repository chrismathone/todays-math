/**
 * 도형 편집기 단축키 — **표 하나**. 원장님 2026-09-21 «단축키도 업데이트하고».
 *
 * 처리기(`FigureEditor` 의 keydown)는 `matchFigureShortcut` 으로만 키를 읽고, 도움말 목록(«단축키» 펼침)은
 * `figureShortcutSheet` 로 같은 표를 그린다. 전에는 목록을 손으로 따로 적어 Ctrl+G 묶기(트랙 36)가 처리기에만
 * 들어가고 목록에서 빠졌다. 이제 표에 한 줄을 더하면 처리기와 목록이 같이 따라온다.
 *
 * - `test` 가 있는 줄 = 처리기가 읽는 키. 없는 줄 = 목록에만 서는 안내(마우스와 함께 쓰는 Shift·Ctrl+휠, 그리고
 *   브라우저 복사 이벤트로 받는 Ctrl+C·X·V — 운영체제 클립보드와 맞추려고 keydown 에서는 안 읽는다).
 * - 이름은 편집기 단추와 같은 말(«되돌리기»·«묶음 만들기»·«맨 앞으로» …) — 한 화면 안에서 같은 일을 다르게 부르지 않는다.
 * - 글자 키는 `e.key` 로, 한글 낱자로 오면(한글 입력 상태) 자판 자리 `e.code` 로 읽는다. 괄호는 자판 자리가 먼저
 *   (Shift 를 누르면 글자가 `{` `}` 로 바뀐다 — ppt 와 같은 Ctrl+Shift+] ).
 * - 도구 한 글자(원장님 2026-09-21 «두다») — Ctrl·Alt·⌘·Shift 없이 누른 글자 하나. 글자는 Figma·tldraw 관례를 따르고
 *   관례가 없는 것(곡선·타원·삼각형·다각형·채우기·함수)은 비어 있는 글자에서 뜻이 닿는 것을 골랐다(트랙 50 보고서 표).
 */
import { figureTool, type FigureToolChoice } from "./figureTools";

/** 처리기가 하는 일의 이름 — `FigureEditor` 가 이것으로 갈라 부른다. */
export type FigureShortcutId =
  | "undo"
  | "redo"
  | "clipboard"
  | "duplicate"
  | "delete"
  | "selectAll"
  | "pickMany"
  | "cancel"
  | "nudge"
  | "pan"
  | "zoom"
  | "straight"
  | "finish"
  | "front"
  | "forward"
  | "backward"
  | "back"
  | "group"
  | "ungroup"
  | `tool:${FigureToolChoice}`;

export type FigureShortcutGroup =
  "도구" | "편집" | "선택" | "이동" | "그리기" | "순서" | "묶음";

export interface FigureShortcut {
  id: FigureShortcutId;
  group: FigureShortcutGroup;
  /** 누르는 키 — 한 줄에 여럿이면 «또는». `Mod` 는 Ctrl(맥은 ⌘). */
  keys: readonly (readonly string[])[];
  /** 이름 — 편집기 단추와 같은 말. */
  label: string;
  /** 처리기가 읽는 키인가 — 없으면 목록에만 서는 안내. */
  test?: (e: KeyboardEvent) => boolean;
  /** 도구 한 글자 — 이 키가 고르는 도구. */
  tool?: FigureToolChoice;
}

const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;
/** 글자 키 — 라틴 글자면 그대로(소문자), 한글 낱자 등으로 오면 자판 자리(`KeyZ` → z). */
const letter = (e: KeyboardEvent) =>
  /^[a-z]$/i.test(e.key)
    ? e.key.toLowerCase()
    : e.code?.startsWith("Key")
      ? e.code.slice(3).toLowerCase()
      : e.key;
/** 괄호 키 — 자판 자리가 먼저. */
const bracket = (e: KeyboardEvent) =>
  e.code === "BracketRight" || (!e.code && (e.key === "]" || e.key === "}"))
    ? "]"
    : e.code === "BracketLeft" || (!e.code && (e.key === "[" || e.key === "{"))
      ? "["
      : null;
const ARROWS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

/**
 * 도구 한 글자 줄 — 이름은 도구 단추와 같은 말(`figureTools`). 꾸밈 키(Ctrl·Alt·⌘·Shift)가 하나라도 눌렸으면 안 먹는다:
 * Ctrl+A·C·D·V·X·Y 는 편집 단축키이고, Shift+글자는 비워 둔다(Figma 의 Shift+L 화살표 같은 짝을 뒤에 둘 자리).
 */
const toolRow = (tool: FigureToolChoice, key: string): FigureShortcut => ({
  id: `tool:${tool}`,
  group: "도구",
  keys: [[key]],
  label: figureTool(tool).label,
  tool,
  test: (e) =>
    !mod(e) && !e.altKey && !e.shiftKey && letter(e) === key.toLowerCase(),
});

export const FIGURE_SHORTCUTS: readonly FigureShortcut[] = [
  // 도구 — Figma·tldraw 관례: V 선택 · H 화면 이동 · L 선 · A 화살표 · O 원 · R 사각형 · T 글자
  toolRow("select", "V"),
  toolRow("pan", "H"),
  toolRow("line", "L"),
  toolRow("arrow", "A"),
  toolRow("curve", "C"), // Curve
  toolRow("circle", "O"),
  toolRow("ellipse", "E"), // Ellipse — Inkscape 와 같다
  toolRow("rect", "R"),
  toolRow("triangle", "Y"), // 관례 없음 — 비어 있는 글자 중 T·R 곁
  toolRow("polygon", "P"), // 점을 차례로 찍는 도구 — 여느 편집기의 펜(P)과 같은 손놀림
  toolRow("text", "T"),
  toolRow("fill", "F"), // Fill — Krita·Paint.NET 의 채우기 통
  toolRow("function", "X"), // f(x) 의 x
  // 편집
  {
    id: "undo",
    group: "편집",
    keys: [["Mod", "Z"]],
    label: "되돌리기",
    test: (e) => mod(e) && !e.shiftKey && letter(e) === "z",
  },
  {
    id: "redo",
    group: "편집",
    keys: [
      ["Mod", "Y"],
      ["Mod", "Shift", "Z"],
    ],
    label: "다시 실행",
    test: (e) =>
      mod(e) && (letter(e) === "y" || (e.shiftKey && letter(e) === "z")),
  },
  {
    id: "clipboard",
    group: "편집",
    keys: [
      ["Mod", "C"],
      ["Mod", "X"],
      ["Mod", "V"],
    ],
    label: "복사 · 잘라내기 · 붙여넣기",
  },
  {
    id: "duplicate",
    group: "편집",
    keys: [["Mod", "D"]],
    label: "복제",
    test: (e) => mod(e) && letter(e) === "d",
  },
  {
    id: "delete",
    group: "편집",
    keys: [["Delete"], ["Backspace"]],
    label: "삭제",
    test: (e) => !mod(e) && (e.key === "Delete" || e.key === "Backspace"),
  },
  // 선택
  {
    id: "selectAll",
    group: "선택",
    keys: [["Mod", "A"]],
    label: "전체 선택",
    test: (e) => mod(e) && letter(e) === "a",
  },
  {
    id: "pickMany",
    group: "선택",
    keys: [["Shift", "클릭"]],
    label: "여러 요소 선택",
  },
  {
    id: "cancel",
    group: "선택",
    keys: [["Esc"]],
    // 고른 것도 그리던 것도 없으면 대화상자(`ModalShell`)가 Esc 를 받아 편집기를 닫는다 — 적용 안 한 편집이 사라진다
    label: "선택 해제 · 그리던 다각형 취소 · 고른 것이 없으면 편집기 닫기",
    test: (e) => !mod(e) && e.key === "Escape",
  },
  // 이동
  {
    id: "nudge",
    group: "이동",
    keys: [["방향키"], ["Shift", "방향키"]],
    label: "미세 이동 · Shift 로 10배",
    test: (e) => !mod(e) && ARROWS.has(e.key),
  },
  {
    id: "pan",
    group: "이동",
    keys: [["Space", "끌기"]],
    label: "화면 이동",
    test: (e) => !mod(e) && e.code === "Space",
  },
  {
    id: "zoom",
    group: "이동",
    keys: [["Mod", "휠"]],
    label: "확대 · 축소",
  },
  // 그리기
  {
    id: "straight",
    group: "그리기",
    keys: [["Shift", "끌기"]],
    label: "선분 · 화살표 · 끝점을 수평 · 수직 · 45° 로",
  },
  {
    id: "finish",
    group: "그리기",
    keys: [["Enter"]],
    label: "그리던 다각형 닫기",
    test: (e) => !mod(e) && e.key === "Enter",
  },
  // 순서 — ppt 와 같은 키
  {
    id: "front",
    group: "순서",
    keys: [["Mod", "Shift", "]"]],
    label: "맨 앞으로",
    test: (e) => mod(e) && e.shiftKey && bracket(e) === "]",
  },
  {
    id: "forward",
    group: "순서",
    keys: [["Mod", "]"]],
    label: "앞으로",
    test: (e) => mod(e) && !e.shiftKey && bracket(e) === "]",
  },
  {
    id: "backward",
    group: "순서",
    keys: [["Mod", "["]],
    label: "뒤로",
    test: (e) => mod(e) && !e.shiftKey && bracket(e) === "[",
  },
  {
    id: "back",
    group: "순서",
    keys: [["Mod", "Shift", "["]],
    label: "맨 뒤로",
    test: (e) => mod(e) && e.shiftKey && bracket(e) === "[",
  },
  // 묶음 — ppt 의 그룹화·그룹 해제와 같은 키
  {
    id: "group",
    group: "묶음",
    keys: [["Mod", "G"]],
    label: "묶음 만들기",
    test: (e) => mod(e) && !e.shiftKey && letter(e) === "g",
  },
  {
    id: "ungroup",
    group: "묶음",
    keys: [["Mod", "Shift", "G"]],
    label: "묶음 해제",
    test: (e) => mod(e) && e.shiftKey && letter(e) === "g",
  },
];

/** 이 키가 표의 어느 줄인가 — 처리기는 이것으로만 키를 읽는다. 표 밖이면 null. */
export function matchFigureShortcut(e: KeyboardEvent): FigureShortcut | null {
  return FIGURE_SHORTCUTS.find((shortcut) => shortcut.test?.(e)) ?? null;
}

/** 목록에 적는 키 — «Ctrl+Shift+]», 여럿이면 « / » 로. `modLabel` 은 Ctrl 또는 ⌘. */
export function figureShortcutKeys(
  shortcut: Pick<FigureShortcut, "keys">,
  modLabel: string,
): string {
  return shortcut.keys
    .map((keys) => keys.map((k) => (k === "Mod" ? modLabel : k)).join("+"))
    .join(" / ");
}

const GROUPS: readonly FigureShortcutGroup[] = [
  "도구",
  "편집",
  "선택",
  "이동",
  "그리기",
  "순서",
  "묶음",
];

/** 도구 단추·메뉴 항목의 title 에 적는 글자 — 같은 표에서 읽는다. */
export function figureToolKey(tool: FigureToolChoice): string | undefined {
  return FIGURE_SHORTCUTS.find((shortcut) => shortcut.tool === tool)
    ?.keys[0][0];
}

/** 도움말 목록 — 무리마다 줄들. 처리기와 같은 표에서 그린다. */
export function figureShortcutSheet(): {
  name: FigureShortcutGroup;
  items: FigureShortcut[];
}[] {
  return GROUPS.map((name) => ({
    name,
    items: FIGURE_SHORTCUTS.filter((shortcut) => shortcut.group === name),
  }));
}
