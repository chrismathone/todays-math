import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureEditRequest,
  type StudioFigureEditResult,
} from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import { buildFigureEditSnapshot } from "@/components/unified/figure-editor/figureEditSnapshot";

/**
 * «요청대로 고치기»(원장님 2026-09-19 «처음부터 그리는 건 별로 같은데? … 사용자가 요청한 것만 바꾼다든가
 * 추가하든지 삭제하든지»). 주 단추는 지금 그림에 수정 명령만 적용하고(되돌리기 한 번), 작은 단추 «원본으로
 * 다시 그리기»는 예전처럼 새로 그린다. 무엇을 바꿨는지 한 줄로 보인다.
 */
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
// jsdom 에는 캔버스가 없다 — 합성 이미지는 실제 브라우저에서 따로 본다(보고서).
vi.mock("@/components/unified/figure-editor/figureEditSnapshot", () => ({
  buildFigureEditSnapshot: vi.fn(async () => "data:image/png;base64,c25hcA=="),
}));

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const initialSvg = `<svg xmlns="${SVG_NS}" viewBox="0 0 300 240"><line x1="37" y1="26" x2="37" y2="206" stroke="#111111" stroke-width="1.9"/><line x1="37" y1="206" x2="277" y2="206" stroke="#111111" stroke-width="1.9" data-size-locked="true"/><text x="30" y="24" font-size="16.8" text-anchor="middle" data-px="37" data-py="26" data-mj="A">A</text></svg>`;
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
  vi.stubGlobal("DOMPoint", Point);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("PointerEvent", MouseEvent);
  // jsdom 에는 SVGGeometryElement 가 없고 상자도 늘 0 이다 — 번호표가 서도록 캔버스 크기를 준다.
  vi.stubGlobal("SVGGeometryElement", class {});
  Object.defineProperty(SVGElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 300, height: 240, toJSON: () => ({}) }),
  });
  for (const [name, value] of [
    ["clientWidth", 300],
    ["clientHeight", 240],
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
    value: () => ({ x: 20, y: 20, width: 260, height: 200 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const editor = (props: {
  onEdit?: (
    request: StudioFigureEditRequest,
  ) => Promise<StudioFigureEditResult>;
  onRedraw?: () => Promise<{ svg: string }>;
  label?: string;
  initialSvg?: string;
}) =>
  render(
    <StudioFigureEditor
      image={crop}
      originalImage={crop}
      initialSvg={initialSvg}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
const ask = (text: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "도형 AI 수정 요청" }), {
    target: { value: text },
  });
const lines = () => document.querySelectorAll("#figure-editor-canvas line");
const labelA = () =>
  document.querySelector('#figure-editor-canvas [data-mj="A"]');

describe("요청대로 고치기", () => {
  it("offers the edit as the main button and the redraw as a small one", () => {
    editor({ onEdit: vi.fn(), onRedraw: vi.fn() });
    const main = screen.getByRole("button", { name: "요청대로 고치기" });
    // 요청 글이 있을 때만 켜진다
    expect(main).toBeDisabled();
    ask("  ");
    expect(main).toBeDisabled();
    ask("1번 선을 지워 주세요");
    expect(main).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "원본으로 다시 그리기" }),
    ).toBeEnabled();
  });

  it("sends the numbered element list, one composed image and the request text", async () => {
    const onEdit = vi.fn<
      (request: StudioFigureEditRequest) => Promise<StudioFigureEditResult>
    >(async () => ({ edits: [{ op: "delete", target: 1 }] }));
    editor({ onEdit });
    ask("1번 선을 지워 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledOnce());
    const [request] = onEdit.mock.calls[0];
    expect(request).toMatchObject({
      imageDataUrl: "data:image/png;base64,c25hcA==",
      instructions: "1번 선을 지워 주세요",
      signal: expect.any(AbortSignal),
    });
    expect(request.figure.elements.map((e) => [e.n, e.kind])).toEqual([
      [1, "선분"],
      [2, "선분"],
      [3, "글자"],
    ]);
    expect(request.figure.elements[1].locked).toBe(true);
    expect(buildFigureEditSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ original: crop }),
    );
  });

  it("changes only what the commands name, shows what changed, and undoes in one step", async () => {
    editor({
      onEdit: async () => ({
        edits: [
          { op: "delete", target: 1 },
          { op: "move", target: 3, dx: 0, dy: -10 },
        ],
      }),
    });
    ask("1번 선을 지우고 A 를 위로");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    const status = await screen.findByRole("status", {
      name: "요청대로 고친 결과",
    });
    expect(status).toHaveTextContent("1번 선분 삭제 · 글자 A 위로 이동");
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).toHaveAttribute("x2", "277");
    expect(labelA()).toHaveAttribute("transform", "translate(0 -10)");
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(lines()).toHaveLength(2);
    expect(labelA()).not.toHaveAttribute("transform");
  });

  it("reports commands it could not apply, with the reason", async () => {
    editor({
      onEdit: async () => ({
        edits: [
          { op: "point", target: 2, vertex: 2, x: 250, y: 206 },
          { op: "delete", target: 9 },
        ],
        warnings: ["손글씨는 지금 그림에 없습니다."],
      }),
    });
    ask("선을 줄이고 9번을 지워 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    const status = await screen.findByRole("status", {
      name: "요청대로 고친 결과",
    });
    expect(status).toHaveTextContent("바꾼 것 없음");
    expect(status).toHaveTextContent(
      "적용 못 함 — 2번 선분: 크기 고정이라 모양을 바꾸지 않았습니다 · 9번: 그런 번호의 요소가 없습니다",
    );
    expect(status).toHaveTextContent("손글씨는 지금 그림에 없습니다.");
    expect(lines()[1]).toHaveAttribute("x2", "277");
    // 바꾼 것이 없으면 되돌리기 칸도 그대로
    expect(screen.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  });

  it("does not apply commands to a figure that changed after the request", async () => {
    let finish!: (result: StudioFigureEditResult) => void;
    editor({
      onEdit: () =>
        new Promise<StudioFigureEditResult>((done) => {
          finish = done;
        }),
    });
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    ask("1번 선을 지워 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    fireEvent.change(screen.getByRole("spinbutton", { name: "끝 X" }), {
      target: { value: "60" },
    });
    await act(async () => finish({ edits: [{ op: "delete", target: 1 }] }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "요청을 보낸 뒤 그림이 바뀌어 적용하지 않았습니다. 다시 요청해 주세요.",
    );
    expect(lines()).toHaveLength(2);
  });

  it("shows the server's reason and keeps the figure", async () => {
    editor({
      onEdit: async () => {
        throw new Error(
          "요청한 점 D 가 그림에 없습니다. 지금 그림은 그대로입니다.",
        );
      },
    });
    ask("점 D 를 지워 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "요청한 점 D 가 그림에 없습니다. 지금 그림은 그대로입니다.",
    );
    expect(lines()).toHaveLength(2);
  });

  it("still redraws from the original with the small button", async () => {
    const onRedraw = vi.fn(async () => ({
      svg: `<svg xmlns="${SVG_NS}"><circle cx="10" cy="20" r="8"/></svg>`,
    }));
    const onEdit = vi.fn();
    editor({ onEdit, onRedraw });
    fireEvent.click(
      screen.getByRole("button", { name: "원본으로 다시 그리기" }),
    );
    await waitFor(() =>
      expect(
        document.querySelector("#figure-editor-canvas circle"),
      ).toBeInTheDocument(),
    );
    expect(onEdit).not.toHaveBeenCalled();
  });
});

describe("편집기 머리 번호", () => {
  it("uses the workroom figure number in the title, dialog name and file name", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = () => "blob:figure";
        static revokeObjectURL = () => {};
      },
    );
    editor({ label: "도형 9-1" });
    expect(
      screen.getByRole("dialog", { name: "도형 9-1 편집기" }),
    ).toHaveTextContent("도형 9-1");
    fireEvent.click(screen.getByRole("button", { name: "SVG 저장" }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(click.mock.instances[0]).toHaveAttribute("download", "도형-9-1.svg");
    click.mockRestore();
  });
});

/**
 * 원장님 2026-09-21 확정 — «그룹 A라고 따로 AI에게 지시하지 않는 이상 항상 그룹은 신경쓰지 않도록» ·
 * «요소도 «요소 15» 등으로 정확하게 지정하지 않는 이상 신경쓰지 않음».
 *
 * 묶음은 **화면 번호표만** 하나로 합친다. AI 에게 보내는 그림(figureEditSnapshot 의 `numbers`)과 요소 목록은
 * 묶기 전과 똑같이 **요소마다 제 번호**다 — AI 가 하던 일이 한 가지도 줄지 않는다.
 */
describe("묶음은 화면에서만 합친다 — AI 가 보는 것은 그대로 (원장님 2026-09-21)", () => {
  const screenTags = () =>
    [...document.querySelectorAll("[data-figure-number]")].map((g) =>
      g.getAttribute("data-figure-number"),
    );
  const groupTwo = () => {
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    fireEvent.click(document.querySelector('[data-figure-list-number="2"]')!, {
      shiftKey: true,
    });
    fireEvent.keyDown(screen.getByLabelText("도형 편집 캔버스"), {
      key: "g",
      ctrlKey: true,
    });
  };

  it("화면 번호표는 하나로 합쳐도 AI 에게 보내는 그림은 요소마다 번호를 단다", async () => {
    const onEdit = vi.fn<
      (request: StudioFigureEditRequest) => Promise<StudioFigureEditResult>
    >(async () => ({ edits: [] }));
    editor({ onEdit });
    expect(screenTags()).toEqual(["1", "2", "3"]);
    groupTwo();
    // 화면: 묶음 하나 + 남은 요소 하나
    expect(screenTags()).toEqual(["1", "3"]);
    ask("사다리꼴 상자를 왼쪽으로 옮겨 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledOnce());
    // AI 가 보는 그림: 요소마다 번호 하나 — 묶기 전과 같다
    const snapshot = vi.mocked(buildFigureEditSnapshot).mock.calls.at(-1)![0];
    expect(snapshot.numbers.map((n) => n.number)).toEqual([1, 2, 3]);
    expect(snapshot.numbers.every((n) => n.ids.length === 1)).toBe(true);
  });

  it("번호를 대지 않은 맨 말 요청이 지금과 똑같이 처리된다 — 요소 목록도 요청 글도 그대로", async () => {
    const onEdit = vi.fn<
      (request: StudioFigureEditRequest) => Promise<StudioFigureEditResult>
    >(async () => ({ edits: [{ op: "move", target: 1, dx: -10, dy: 0 }] }));
    editor({ onEdit });
    groupTwo();
    ask("사다리꼴 상자를 왼쪽으로 옮겨 주세요");
    fireEvent.click(screen.getByRole("button", { name: "요청대로 고치기" }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledOnce());
    const [request] = onEdit.mock.calls[0];
    expect(request.instructions).toBe("사다리꼴 상자를 왼쪽으로 옮겨 주세요");
    expect(request.figure.elements.map((e) => [e.n, e.kind])).toEqual([
      [1, "선분"],
      [2, "선분"],
      [3, "글자"],
    ]);
    // 묶음 이름은 role 한 칸에 덤으로만
    expect(request.figure.elements.map((e) => e.role)).toEqual([
      "A",
      "A",
      undefined,
    ]);
    // 그리고 AI 가 번호로 가리킨 묶음 속 요소 하나만 움직인다 — 묶음 동무는 제자리
    await waitFor(() =>
      expect(lines()[0]).toHaveAttribute("transform", "translate(-10 0)"),
    );
    expect(lines()[1]).not.toHaveAttribute("transform");
  });
});
