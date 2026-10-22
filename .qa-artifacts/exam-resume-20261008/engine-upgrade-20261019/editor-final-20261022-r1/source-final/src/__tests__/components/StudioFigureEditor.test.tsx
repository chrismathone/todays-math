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
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";
import { download, svgToPng } from "@/lib/figure/exportImage";
import { FIGURE_CLIPBOARD_TYPE } from "@/components/unified/figure-editor/figureClipboard";

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
  it("서버 저장이 실패하면 PNG 내려받기는 유지하고 오류와 재시도 가능한 저장 버튼을 보여 준다", async () => {
    const onSave = vi.fn(async () => { throw new Error("도형 서버 저장 실패 — 다시 저장해 주세요."); });
    const onClose = vi.fn();
    vi.mocked(download).mockClear();
    render(<StudioFigureEditor image={crop} initialSvg={initialSvg} index={0} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    expect(await screen.findByText("도형 서버 저장 실패 — 다시 저장해 주세요.")).toBeInTheDocument();
    expect(download).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "이미지 저장" })).not.toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("SVG 원문을 외부 클립보드에 쓰지 않고 요소 복사·붙여넣기·잘라내기는 유지한다", () => {
    render(<StudioFigureEditor image={crop} initialSvg={initialSvg} index={0} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.keyDown(document.body, { key: "a", ctrlKey: true });
    const data = new Map<string, string>();
    const clipboardData = {
      clearData: () => data.clear(),
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? "",
    };
    fireEvent.copy(document, { clipboardData });
    expect(data.size).toBe(1);
    expect(data.has(FIGURE_CLIPBOARD_TYPE)).toBe(true);
    expect([...data.values()].some((value) => /<svg|<line/.test(value))).toBe(false);
    expect(data.has("text/plain")).toBe(false);
    fireEvent.paste(document, { clipboardData });
    expect(document.querySelectorAll("#figure-editor-canvas line")).toHaveLength(2);
    fireEvent.cut(document, { clipboardData });
    expect(document.querySelectorAll("#figure-editor-canvas line")).toHaveLength(1);
    fireEvent.paste(document, { clipboardData });
    expect(document.querySelectorAll("#figure-editor-canvas line")).toHaveLength(2);
  });

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
      "원",
      "글자",
      "채우기",
      "함수",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    // 선·도형 무리 속 도구는 ▾ 메뉴에 선다(원장님 2026-09-21 «안 A»)
    fireEvent.click(screen.getByRole("button", { name: "선 도구 고르기" }));
    fireEvent.click(screen.getByRole("button", { name: "도형 도구 고르기" }));
    for (const name of ["화살표", "곡선", "타원", "사각형", "삼각형", "다각형"])
      expect(screen.getByRole("menuitemradio", { name })).toBeInTheDocument();
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
    openFigureDetails();
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
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.originalImage).toBe(crop);
    expect(saved.svg).toContain('x2="142"');
    expect(saved.svg).not.toContain("data-object-id");
    expect(saved.dataUrl).toMatch(/^data:image\/svg\+xml/);
    // «이미지 저장»은 편집기를 닫지 않는다(이 앱은 편집기가 끝 화면 — 2026-10-21)
    expect(onClose).not.toHaveBeenCalled();
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
    openFigureDetails();
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
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
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
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
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

  it("이미지 저장 — PNG 를 내려받고 최근 결과로 남기며 편집기는 닫지 않는다", async () => {
    vi.mocked(download).mockClear();
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
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await waitFor(() => expect(vi.mocked(download)).toHaveBeenCalledOnce());
    expect(vi.mocked(download).mock.calls[0]).toEqual([
      expect.stringMatching(/^\d{12}_\d{6}\.png$/),
      "data:image/png;base64,AAAA",
    ]);
    expect(vi.mocked(svgToPng).mock.calls.at(-1)![0]).toMatch(/^data:image\/svg\+xml/);
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText("PNG 이미지를 저장했습니다.")).toBeInTheDocument();
  });

  it("저장하지 않은 편집이 있으면 닫을 때 묻는다 — 저장한 뒤에는 묻지 않는다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = vi.fn();
    render(
      <StudioFigureEditor
        image={crop}
        initialSvg={initialSvg}
        index={0}
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    openFigureDetails();
    fireEvent.change(screen.getByRole("spinbutton", { name: "끝 X" }), {
      target: { value: "142" },
    });
    vi.mocked(download).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await waitFor(() => expect(vi.mocked(download)).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "닫기" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    confirm.mockRestore();
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
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(request?.signal?.aborted).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    await act(async () => resolve({ svg: initialSvg }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
