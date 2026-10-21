import fs from "node:fs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import * as library from "@/components/unified/figure-editor/figureAssetLibrary";
import * as editing from "@/components/unified/figure-editor/figureSvgEditing";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"><line x1="20" y1="20" x2="200" y2="100"/></svg>';
const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; }, multiply() { return this; } };
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("SVGGeometryElement", class {});
  vi.stubGlobal("DOMPoint", class { constructor(public x = 0, public y = 0) {} matrixTransform() { return this; } });
  for (const [name, value] of [["getScreenCTM", () => matrix], ["getBBox", () => ({ x: 0, y: 0, width: 200, height: 100 })],
    ["getBoundingClientRect", () => ({ x: 0, y: 0, top: 0, left: 0, right: 480, bottom: 360, width: 480, height: 360 })]] as const)
    Object.defineProperty(SVGElement.prototype, name, { configurable: true, value });
});
afterEach(() => { vi.restoreAllMocks();vi.unstubAllGlobals(); });

function startLoad() {
  let resolve!: (value: string) => void;
  const pending = new Promise<string>((done) => { resolve = done; });
  const load = vi.spyOn(library, "loadFigureAsset").mockReturnValue(pending);
  const insert = vi.spyOn(editing, "addFigureAsset");
  const onSave = vi.fn();
  const view = render(<StudioFigureEditor image="data:image/png;base64,AAAA" initialSvg={svg} index={0} onSave={onSave} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "그림 넣기" }));
  fireEvent.click(screen.getByRole("button", { name: /^집$/ }));
  return { ...view, resolve, load, insert, onSave };
}

describe("asset load belongs to the open editor", () => {
  it("adds one picture as one undo step and keeps the existing line", async () => {
    const state = startLoad();
    expect(state.load).toHaveBeenCalledOnce();
    await act(async () => { state.resolve(fs.readFileSync("scripts/figure/assets/house.svg", "utf8")); });
    await waitFor(() => expect(document.querySelector("#figure-editor-canvas [data-asset=house]")).not.toBeNull());
    expect(state.insert).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("#figure-editor-canvas [data-object-id]")).toHaveLength(2);
    expect(document.querySelector("#figure-editor-canvas line")?.getAttribute("x2")).toBe("200");
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(document.querySelector("#figure-editor-canvas [data-asset]")).toBeNull();
    expect(document.querySelectorAll("#figure-editor-canvas [data-object-id]")).toHaveLength(1);
    expect(state.onSave).not.toHaveBeenCalled();
  });

  it("discards a pending insertion when its editor is unmounted", async () => {
    const state = startLoad();
    state.unmount();
    await act(async () => { state.resolve(fs.readFileSync("scripts/figure/assets/house.svg", "utf8")); });
    expect(state.insert).not.toHaveBeenCalled();
    expect(state.onSave).not.toHaveBeenCalled();
  });

  it("shows a grouping limit without changing the SVG or creating an undo step", () => {
    const name = "B".repeat(128);
    const stack = JSON.stringify(Array(62).fill("A".repeat(128))).replace(/"/g, "&quot;");
    const initial = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"><line data-group="${name}" data-group-stack="${stack}" x1="20" y1="20" x2="200" y2="100"/><circle cx="100" cy="100" r="20"/></svg>`;
    render(<StudioFigureEditor image="data:image/png;base64,AAAA" initialSvg={initial} index={0} onSave={vi.fn()} onClose={vi.fn()} />);
    const canvas = screen.getByLabelText("도형 편집 캔버스");canvas.focus();
    const before = document.querySelector("#figure-editor-canvas")!.innerHTML;
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyDown(window, { key: "g", ctrlKey: true });
    expect(screen.getByText("묶음 이력의 길이와 이름을 확인해 주세요.")).toBeInTheDocument();
    expect(document.querySelector("#figure-editor-canvas")!.innerHTML).toBe(before);
    expect(screen.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  });
});
