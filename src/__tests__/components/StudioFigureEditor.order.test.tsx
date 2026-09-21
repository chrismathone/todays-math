import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureEditRequest,
  type StudioFigureEditResult,
} from "@/components/unified/figure-editor";
import { buildFigureEditSnapshot } from "@/components/unified/figure-editor/figureEditSnapshot";
import {
  FIGURE_SHORTCUTS,
  figureShortcutKeys,
} from "@/components/unified/figure-editor/figureShortcuts";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);
// jsdom 에는 캔버스가 없다 — AI 에게 보내는 합성 그림은 번호표(`numbers`) 인자로 본다.
vi.mock("@/components/unified/figure-editor/figureEditSnapshot", () => ({
  buildFigureEditSnapshot: vi.fn(async () => "data:image/png;base64,c25hcA=="),
}));

/**
 * 도형 편집기 — 요소 순서(맨 앞으로 · 앞으로 · 뒤로 · 맨 뒤로). 원장님 2026-09-21:
 *
 * > «요소 순서 조절 할 수 있어야겠어. ppt나 다른 곳을 보면 맨 뒤로 맨 앞으로, 뒤로, 앞으로 같은
 * >  순서를 이용해서 조절하는게 있는데, 우리 도형 편집기에는 그 기능이 없어서 지금 y축이 가려져버렸어.»
 *
 * 시험은 «단추가 있다»가 아니라 **캔버스의 실제 그리는 차례**(`[data-object-id]` 의 DOM 차례)를 본다.
 * 단축키는 ppt 그대로 — Ctrl+Shift+] 맨 앞으로 · Ctrl+] 앞으로 · Ctrl+[ 뒤로 · Ctrl+Shift+[ 맨 뒤로.
 */
const crop = "data:image/png;base64,b3JpZ2luYWw=";
/**
 * 원장님 화면 그대로 — 포물선 · x축 · y축 · (멀리 떨어진 점 하나) · 포물선에 내접한 삼각형 ABC(회색 채움,
 * 독립 다각형). 삼각형이 y축 **뒤에 적혀** y축을 덮는다. 점은 아무것과도 안 겹친다.
 */
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<path d="M 60 40 Q 240 560 420 40" stroke="#111" fill="none"/>` +
  `<line x1="20" y1="300" x2="460" y2="300" stroke="#111"/>` +
  `<line x1="240" y1="340" x2="240" y2="20" stroke="#111"/>` +
  `<circle cx="16" cy="16" r="4" stroke="#111" fill="none"/>` +
  `<polygon points="120,160 360,160 240,300" fill="#d9d9d9" stroke="#111"/>` +
  `</svg>`;
/** 요소마다 화면에서 차지하는 상자 — 여느 브라우저처럼 선 굵기는 뺀 모양 상자. */
const BOXES: Record<string, [number, number, number, number]> = {
  "obj-0": [60, 40, 420, 300], // 포물선
  "obj-1": [20, 300, 460, 300], // x축
  "obj-2": [240, 20, 240, 340], // y축
  "obj-3": [12, 12, 20, 20], // 멀리 떨어진 점
  "obj-4": [120, 160, 360, 300], // 삼각형
};
const identity = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
  multiply() {
    return this;
  },
};
class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform() {
    return new Point(this.x, this.y);
  }
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("DOMPoint", Point);
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("SVGGeometryElement", class {});
  Object.defineProperty(SVGElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: SVGElement) {
      const box = BOXES[this.getAttribute("data-object-id") ?? ""] ?? [
        0, 0, 480, 360,
      ];
      const [left, top, right, bottom] = box;
      return {
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({}),
      };
    },
  });
  for (const [name, value] of [
    ["clientWidth", 480],
    ["clientHeight", 360],
  ] as const)
    Object.defineProperty(SVGElement.prototype, name, {
      configurable: true,
      value,
    });
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => {},
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function open(
  svg = figure,
  onEdit?: (
    request: StudioFigureEditRequest,
  ) => Promise<StudioFigureEditResult>,
) {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={svg}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
      onEdit={onEdit}
    />,
  );
}
const canvas = () => document.querySelector("#figure-editor-canvas")!;
const kindOf = (node: Element) =>
  node.localName === "line"
    ? Number(node.getAttribute("y1")) === 300
      ? "x축"
      : "y축"
    : ({ path: "포물선", circle: "점", polygon: "삼각형" } as const)[
        node.localName as "path" | "circle" | "polygon"
      ];
/** 번호표가 가리키는 요소의 종류 — 이미 지워졌으면 null. */
const kindOfId = (id: string | null) => {
  const node = canvas().querySelector(`[data-object-id="${id}"]`);
  return node ? kindOf(node) : null;
};
/** 캔버스에 **실제로 그려지는 차례** — 뒤에 적힌 것이 위에 그려진다. */
const painted = () =>
  [...canvas().querySelectorAll("[data-object-id]")].map(kindOf);
const ORIGINAL = ["포물선", "x축", "y축", "점", "삼각형"];
const chip = (n: number) =>
  document.querySelector<HTMLElement>(`[data-figure-list-number="${n}"]`)!;
const orderRow = () => within(screen.getByRole("region", { name: "순서" }));
const orderButton = (name: string) => orderRow().getByRole("button", { name });
const press = (key: string, code: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key,
    code,
    ctrlKey: true,
    ...init,
  });
const undo = () => screen.getByRole("button", { name: /되돌리기/ });
const title = () =>
  screen.getByRole("heading", { level: 3, name: /편집$/ }).textContent;

describe("원장님 화면 — 채운 삼각형이 y축을 덮었다", () => {
  it("삼각형을 골라 «맨 뒤로» — 캔버스에서 삼각형이 맨 먼저 그려져 y축이 위로 온다", () => {
    open();
    expect(painted()).toEqual(ORIGINAL);
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    expect(painted()).toEqual(["삼각형", "포물선", "x축", "y축", "점"]);
  });
  it("번호는 안 바뀐다 — 오른쪽 칸 제목은 5 그대로, 알림은 옮긴 것만 (원장님 2026-09-21 «번호 고정»)", () => {
    open();
    fireEvent.click(chip(5));
    expect(title()).toBe("5 · 다각형 편집");
    fireEvent.click(orderButton("맨 뒤로"));
    expect(title()).toBe("5 · 다각형 편집");
    expect(screen.getByText("맨 뒤로 보냈습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/번이 .*번이 되었습니다/)).toBeNull();
  });
  it("되돌리기 한 걸음이면 원래 차례", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    fireEvent.click(undo());
    expect(painted()).toEqual(ORIGINAL);
    expect(undo()).toBeDisabled();
  });
  it("«뒤로» 한 칸은 겹치는 것 하나 아래 — 안 겹치는 점은 건너뛰고 y축 밑으로", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("뒤로"));
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
  });
  it("겹치는 것이 없으면 차례를 안 바꾸고 알린다(되돌리기 자리도 안 생긴다)", () => {
    open();
    fireEvent.click(chip(4)); // 멀리 떨어진 점 — 위의 삼각형과 안 겹친다
    fireEvent.click(orderButton("앞으로"));
    expect(painted()).toEqual(ORIGINAL);
    expect(screen.getByText("앞에 겹친 요소가 없습니다.")).toBeInTheDocument();
    expect(undo()).toBeDisabled();
  });
  it("맨 위 요소는 «맨 앞으로»·«앞으로»가 꺼지고, 맨 아래 요소는 «뒤로»·«맨 뒤로»가 꺼진다", () => {
    open();
    fireEvent.click(chip(5));
    expect(orderButton("맨 앞으로")).toBeDisabled();
    expect(orderButton("앞으로")).toBeDisabled();
    expect(orderButton("뒤로")).toBeEnabled();
    expect(orderButton("맨 뒤로")).toBeEnabled();
    fireEvent.click(chip(1));
    expect(orderButton("뒤로")).toBeDisabled();
    expect(orderButton("맨 뒤로")).toBeDisabled();
    expect(orderButton("앞으로")).toBeEnabled();
  });
  it("아무것도 안 골랐으면 순서 줄이 없다", () => {
    open();
    expect(screen.queryByRole("region", { name: "순서" })).toBeNull();
  });
});

describe("단축키 — ppt 와 같다", () => {
  it("Ctrl+Shift+[ 맨 뒤로 · Ctrl+Shift+] 맨 앞으로", () => {
    open();
    fireEvent.click(chip(5));
    press("{", "BracketLeft", { shiftKey: true });
    expect(painted()).toEqual(["삼각형", "포물선", "x축", "y축", "점"]);
    press("}", "BracketRight", { shiftKey: true });
    expect(painted()).toEqual(["포물선", "x축", "y축", "점", "삼각형"]);
  });
  it("Ctrl+[ 뒤로 · Ctrl+] 앞으로 — 겹치는 것 사이의 한 칸", () => {
    open();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
    press("]", "BracketRight");
    expect(painted()).toEqual(["포물선", "x축", "y축", "삼각형", "점"]);
  });
  it("되돌리기는 누른 만큼 한 걸음씩", () => {
    open();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    press("{", "BracketLeft", { shiftKey: true });
    press("z", "KeyZ");
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
    press("z", "KeyZ");
    expect(painted()).toEqual(ORIGINAL);
  });
  it("글자 칸(입력 칸)에서는 안 먹는다", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.keyDown(screen.getByLabelText("도형 채우기 색"), {
      key: "{",
      code: "BracketLeft",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(painted()).toEqual(ORIGINAL);
  });
  it("누른 뒤 초점이 캔버스로 온다 — 이어지는 단축키가 먹는다", () => {
    open();
    chip(5).focus();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    expect(document.activeElement).toBe(
      screen.getByLabelText("도형 편집 캔버스"),
    );
  });
  it("단추로 옮긴 뒤에도 단축키가 먹는다 — 누른 단추가 꺼지며 떨어지는 초점을 캔버스로 돌린다", () => {
    // 브라우저 실측(2026-09-21): «맨 뒤로»를 누르면 이미 맨 뒤라 그 단추가 꺼지고, 초점이 <body> 로
    // 떨어져 이어 누른 Ctrl+Z 가 «편집기 밖»으로 걸러졌다. jsdom 은 꺼진 단추의 초점을 안 빼서 여기서는 초점 자리를 본다.
    open();
    fireEvent.click(chip(5));
    const button = orderButton("맨 뒤로");
    button.focus();
    fireEvent.click(button);
    expect(document.activeElement).toBe(
      screen.getByLabelText("도형 편집 캔버스"),
    );
    press("z", "KeyZ");
    expect(painted()).toEqual(ORIGINAL);
  });
  it("브라우저 기본 동작(맥의 Cmd+[ 뒤로 가기 등)을 막는다", () => {
    open();
    fireEvent.click(chip(5));
    const event = new KeyboardEvent("keydown", {
      key: "[",
      code: "BracketLeft",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("묶음은 한 덩어리로 — 캔버스에서 누르면 묶음 전부", () => {
  // 사각 + 사각 안 선분이 묶음 A — 사이에 원이 끼어 떨어져 적혀 있다
  const grouped =
    `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
    `<rect x="20" y="30" width="60" height="40" stroke="#111" fill="#eee" data-group="A"/>` +
    `<circle cx="300" cy="60" r="20" stroke="#111" fill="none"/>` +
    `<line x1="24" y1="50" x2="76" y2="50" stroke="#111" data-group="A"/>` +
    `<polygon points="200,200 260,200 230,250" fill="#ccc" stroke="#111"/>` +
    `</svg>`;
  const kinds = () =>
    [...canvas().querySelectorAll("[data-object-id]")].map((n) => n.localName);
  it("묶음을 «맨 앞으로» — 둘이 붙어서 맨 위, 사각이 선 아래 그대로", () => {
    open(grouped);
    fireEvent.pointerDown(canvas().querySelector("rect")!, {
      button: 0,
      clientX: 40,
      clientY: 50,
    });
    fireEvent.pointerUp(screen.getByLabelText("도형 편집 캔버스"));
    expect(
      screen.getByRole("heading", { level: 3, name: "2개 요소 선택" }),
    ).toBeInTheDocument();
    fireEvent.click(orderButton("맨 앞으로"));
    expect(kinds()).toEqual(["circle", "polygon", "rect", "line"]);
    expect(
      screen.getByText("2개 요소를 맨 앞으로 가져왔습니다."),
    ).toBeInTheDocument();
  });
  it("묶음 이름은 그대로 — 옮겨도 묶음이 안 풀린다", () => {
    open(grouped);
    fireEvent.pointerDown(canvas().querySelector("rect")!, {
      button: 0,
      clientX: 40,
      clientY: 50,
    });
    fireEvent.pointerUp(screen.getByLabelText("도형 편집 캔버스"));
    fireEvent.click(orderButton("맨 뒤로"));
    expect(
      [...canvas().querySelectorAll("[data-group]")].map((n) =>
        n.getAttribute("data-group"),
      ),
    ).toEqual(["A", "A"]);
    expect(kinds()).toEqual(["rect", "line", "circle", "polygon"]);
  });
});

/**
 * 원장님 2026-09-21 «순서를 바꿔도 요소 번호가 안바뀌게 고정시켜». 번호를 쓰는 자리 넷이 **모두** 같은 번호를
 * 봐야 한다 — 한 곳만 고치면 화면과 AI 가 다른 번호를 봐 AI 가 딴 요소를 고친다(지시문 «자료 목록의 번호가
 * 그림 위 번호표와 같다», figure-edit-prompt.ts).
 */
describe("번호 고정 — 맨 뒤로 보내도 번호표·요소 목록·AI 자료 목록·AI 그림 번호표가 전과 같다", () => {
  /** 번호 → 요소 종류, 자리 넷에서. */
  const screenTags = () =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-figure-number]")].map((tag) => [
        tag.getAttribute("data-figure-number"),
        kindOfId(tag.getAttribute("data-number-object")),
      ]),
    );
  const listChips = () =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-figure-list-number]")].map(
        (chip) => [
          chip.getAttribute("data-figure-list-number"),
          chip.getAttribute("title")!.split(" · ")[0],
        ],
      ),
    );
  const askAi = async (onEdit: ReturnType<typeof vi.fn>, calls: number) => {
    fireEvent.change(
      screen.getByRole("textbox", { name: "도형 AI 수정 요청" }),
      { target: { value: "요소 5를 확인해 주세요" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledTimes(calls));
    const [request] = onEdit.mock.calls.at(-1)! as [StudioFigureEditRequest];
    const snapshot = vi.mocked(buildFigureEditSnapshot).mock.calls.at(-1)![0];
    return {
      elements: request.figure.elements.map((e) => [e.n, e.kind]),
      picture: Object.fromEntries(
        snapshot.numbers.map((n) => [n.number, kindOfId(n.ids[0])]),
      ),
    };
  };
  it("넷 모두 전과 같다", async () => {
    const onEdit = vi.fn(async () => ({ edits: [] }));
    open(figure, onEdit);
    const before = { tags: screenTags(), list: listChips() };
    expect(before.tags).toEqual({
      "1": "포물선",
      "2": "x축",
      "3": "y축",
      "4": "점",
      "5": "삼각형",
    });
    const aiBefore = await askAi(onEdit, 1);
    expect(aiBefore.picture).toEqual(before.tags);
    expect(aiBefore.elements.map(([n]) => n)).toEqual([1, 2, 3, 4, 5]);

    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    expect(painted()).toEqual(["삼각형", "포물선", "x축", "y축", "점"]);

    expect(screenTags()).toEqual(before.tags);
    expect(listChips()).toEqual(before.list);
    const aiAfter = await askAi(onEdit, 2);
    expect(aiAfter).toEqual(aiBefore);
  });
  it("AI 가 «요소 5»(target 5)를 가리키면 맨 뒤로 보낸 뒤에도 삼각형이다", async () => {
    const onEdit = vi.fn(async () => ({
      edits: [{ op: "delete" as const, target: 5 }],
    }));
    open(figure, onEdit);
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    await askAi(onEdit, 1);
    await waitFor(() =>
      expect(painted()).toEqual(["포물선", "x축", "y축", "점"]),
    );
  });
});

/**
 * AI 명령으로 순서 — 원장님 2026-09-21 «Ai 명령으로 순서 조절도 가능하게해. 요소를 입력하면 더 정확하게».
 * 편집기 단추와 같은 함수를 타고, «한 칸»도 단추처럼 **화면 상자**로 겹치는 것만 센다(배선을 여기서 잠근다).
 */
describe("AI 명령 «요소 5를 뒤로» — 단추와 같은 한 칸", () => {
  it("안 겹치는 점은 건너뛰고 y축 밑으로 — 결과 줄은 번호와 이름", async () => {
    const onEdit = vi.fn(async () => ({
      edits: [{ op: "order" as const, targets: [5], to: "backward" as const }],
    }));
    open(figure, onEdit);
    fireEvent.change(
      screen.getByRole("textbox", { name: "도형 AI 수정 요청" }),
      { target: { value: "요소 5를 뒤로" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() =>
      expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]),
    );
    expect(
      screen.getByRole("status", { name: "요청대로 고친 결과" }),
    ).toHaveTextContent("5번 다각형 뒤로");
  });
});

/**
 * 원장님 2026-09-21 «단축키도 업데이트하고» — 도움말 목록은 처리기와 **같은 표**에서 그린다.
 * 전에는 손으로 따로 적어 Ctrl+G 묶기가 처리기에만 있고 목록에 없었다.
 */
describe("단축키 도움말 — 처리기와 같은 표", () => {
  it("표의 모든 줄(키 + 이름)이 목록에 선다 — Ctrl+G · 순서 넷 포함", () => {
    open();
    const sheet = screen.getByLabelText("단축키 목록");
    for (const shortcut of FIGURE_SHORTCUTS)
      expect(sheet, shortcut.id).toHaveTextContent(
        `${figureShortcutKeys(shortcut, "Ctrl")} ${shortcut.label}`,
      );
    expect(sheet).toHaveTextContent("Ctrl+G 묶음 만들기");
    expect(sheet).toHaveTextContent("Ctrl+Shift+[ 맨 뒤로");
  });
});
