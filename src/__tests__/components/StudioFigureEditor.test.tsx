import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import StudioFigureEditor, {
  type StudioFigureRedrawRequest,
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const initialSvg = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/></svg>`;
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

describe("StudioFigureEditor", () => {
  it("is SSR safe and shows original crop, all tools, and overlay without a redraw dependency", () => {
    const props = {
      image: crop,
      index: 0,
      initialSvg,
      onSave: vi.fn(),
      onClose: vi.fn(),
    };
    expect(renderToString(<StudioFigureEditor {...props} />)).toBe("");
    render(<StudioFigureEditor {...props} />);
    expect(
      screen.getByRole("dialog", { name: "도형 1 편집기" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("도형 원본")).toHaveAttribute("src", crop);
    for (const name of [
      "선택·이동",
      "화면 이동",
      "선분",
      "화살표",
      "곡선",
      "원",
      "타원",
      "사각형",
      "글자",
      "함수",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("button", { name: "원본으로 다시 그리기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "원본을 흐리게 겹쳐 보기" }),
    );
    expect(screen.getByAltText("원본 겹쳐 보기")).toHaveAttribute("src", crop);
  });

  it("edits geometry, undoes/redoes, saves three fields and reopens the same geometry", async () => {
    const onSave = vi.fn(),
      onClose = vi.fn();
    const view = render(
      <StudioFigureEditor
        image={crop}
        initialSvg={initialSvg}
        index={0}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    fireEvent.change(screen.getByRole("spinbutton", { name: "끝 X" }), {
      target: { value: "142" },
    });
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(
      document.querySelector("#figure-editor-canvas line"),
    ).toHaveAttribute("x2", "80");
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    expect(
      document.querySelector("#figure-editor-canvas line"),
    ).toHaveAttribute("x2", "142");
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.originalImage).toBe(crop);
    expect(saved.svg).toContain('x2="142"');
    expect(saved.svg).not.toContain("data-object-id");
    expect(saved.dataUrl).toMatch(/^data:image\/svg\+xml/);
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    render(
      <StudioFigureEditor
        image={saved.dataUrl}
        originalImage={saved.originalImage}
        initialSvg={saved.svg}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByAltText("도형 원본")).toHaveAttribute("src", crop);
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    expect(screen.getByRole("spinbutton", { name: "끝 X" })).toHaveValue(142);
  });

  it("draws a line by dragging and preserves its coordinates in the applied source", async () => {
    const onSave = vi.fn();
    render(
      <StudioFigureEditor
        image={crop}
        index={0}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "선분" }));
    fireEvent.pointerDown(document.querySelector("#figure-editor-canvas")!, {
      button: 0,
      clientX: 25,
      clientY: 35,
    });
    fireEvent.pointerMove(screen.getByLabelText("도형 편집 캔버스"), {
      clientX: 145,
      clientY: 165,
    });
    fireEvent.pointerUp(screen.getByLabelText("도형 편집 캔버스"));
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const doc = new DOMParser().parseFromString(
      onSave.mock.calls[0][0].svg,
      "image/svg+xml",
    );
    expect(doc.querySelector("line")?.getAttribute("x1")).toBe("25");
    expect(doc.querySelector("line")?.getAttribute("y2")).toBe("165");
  });

  it("imports redraw through the callback, sanitizes it, and can undo the replacement", async () => {
    const onRedraw = vi.fn(async () => ({
      svg: `<svg xmlns="${SVG_NS}"><script>bad()</script><circle cx="10" cy="20" r="8" onload="bad()"/></svg>`,
    }));
    render(
      <StudioFigureEditor
        image={crop}
        initialSvg={initialSvg}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onRedraw={onRedraw}
      />,
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "도형 AI 수정 요청" }),
      { target: { value: "원을 그려 주세요" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "원본으로 다시 그리기" }),
    );
    await waitFor(() =>
      expect(
        document.querySelector("#figure-editor-canvas circle"),
      ).toBeInTheDocument(),
    );
    expect(onRedraw).toHaveBeenCalledWith(
      expect.objectContaining({
        originalImage: crop,
        instructions: "원을 그려 주세요",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(
      document.querySelector(
        "#figure-editor-canvas script, #figure-editor-canvas [onload]",
      ),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(
      document.querySelector("#figure-editor-canvas line"),
    ).toHaveAttribute("x2", "80");
  });

  it("adds a function graph through the original input and preserves its editable expression", async () => {
    const onSave = vi.fn();
    render(
      <StudioFigureEditor
        image={crop}
        index={0}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "함수" }));
    fireEvent.change(screen.getByRole("textbox", { name: "함수식" }), {
      target: { value: "y=sin(x)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "그림에 함수 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const doc = new DOMParser().parseFromString(
      onSave.mock.calls[0][0].svg,
      "image/svg+xml",
    );
    expect(
      JSON.parse(
        doc.querySelector("[data-function]")!.getAttribute("data-function")!,
      ).expression,
    ).toBe("y=sin(x)");
    expect(doc.querySelector("[data-function]")?.getAttribute("d")).toMatch(
      /^M/,
    );
  });

  it("downloads sanitized SVG without applying or closing the editor", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(
        () => "blob:figure-export",
      ),
      revokeObjectURL = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const onSave = vi.fn(),
      onClose = vi.fn();
    render(
      <StudioFigureEditor
        image={crop}
        initialSvg={initialSvg}
        index={1}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "SVG 저장" }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL.mock.calls[0][0]).toMatchObject({
      type: "image/svg+xml",
    });
    expect(click.mock.instances[0]).toHaveAttribute("download", "도형-2.svg");
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("aborts a pending redraw on close and ignores a late result", async () => {
    let request: StudioFigureRedrawRequest | undefined;
    let resolve!: (result: { svg: string }) => void;
    const onClose = vi.fn(),
      onSave = vi.fn();
    const onRedraw = vi.fn((value: StudioFigureRedrawRequest) => {
      request = value;
      return new Promise<{ svg: string }>((done) => {
        resolve = done;
      });
    });
    const view = render(
      <StudioFigureEditor
        image={crop}
        initialSvg={initialSvg}
        index={0}
        onSave={onSave}
        onClose={onClose}
        onRedraw={onRedraw}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "원본으로 다시 그리기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(request?.signal?.aborted).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    await act(async () => resolve({ svg: initialSvg }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
