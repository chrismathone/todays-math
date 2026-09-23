import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioCropOverlay, {
  type StudioCropOverlayProps,
} from "@/components/unified/StudioCropOverlay";
import type { StudioRect } from "@/components/unified/studioHelpers";

const RECT: StudioRect = { x: 0.2, y: 0.3, width: 0.25, height: 0.2 };
const pointer = (clientX = 500, clientY = 400, pointerId = 1) => ({
  clientX,
  clientY,
  pointerId,
  isPrimary: true,
  button: 0,
  buttons: 1,
});

function setup(overrides: Partial<StudioCropOverlayProps> = {}) {
  const onSelect = vi.fn();
  const onCommit = vi.fn();
  const onDelete = vi.fn();
  const parentEvent = vi.fn();
  let props: StudioCropOverlayProps = {
    id: "crop-1",
    rect: RECT,
    label: "문제 1",
    kind: "problem",
    selected: false,
    disabled: false,
    tool: "select",
    onSelect,
    onCommit,
    onDelete,
    ...overrides,
  };
  const view = () => (
    <div
      role="button"
      aria-label="페이지"
      data-testid="page"
      onPointerDown={parentEvent}
      onPointerMove={parentEvent}
      onPointerUp={parentEvent}
      onPointerCancel={parentEvent}
      onClick={parentEvent}
      onContextMenu={parentEvent}
      onKeyDown={parentEvent}
      onKeyUp={parentEvent}
    >
      <StudioCropOverlay {...props} />
    </div>
  );
  const rendered = render(view());
  const overlay = screen.getByRole("button", {
    name:
      props.tool === "delete"
        ? /^문제 1 영역 삭제( · 완료)?$/
        : /^문제 1 영역( · 완료)?$/,
  });
  const page = screen.getByTestId("page");
  vi.spyOn(page, "getBoundingClientRect").mockReturnValue({
    width: 1000,
    height: 800,
    x: 50,
    y: 70,
    left: 50,
    top: 70,
    right: 1050,
    bottom: 870,
    toJSON: () => ({}),
  });
  const captured = new Set<number>();
  const setCapture = vi.fn((id: number) => captured.add(id));
  const releaseCapture = vi.fn((id: number) => captured.delete(id));
  Object.assign(overlay, {
    setPointerCapture: setCapture,
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: releaseCapture,
  });
  return {
    overlay,
    page,
    parentEvent,
    onSelect,
    onCommit,
    onDelete,
    captured,
    setCapture,
    releaseCapture,
    unmount: rendered.unmount,
    update: (next: Partial<StudioCropOverlayProps>) => {
      props = { ...props, ...next };
      rendered.rerender(view());
    },
  };
}

function expectRect(actual: StudioRect, expected: StudioRect) {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], 9);
  }
}

describe("StudioCropOverlay", () => {
  it("selects and moves on the first interaction, previews locally, and commits only on release", () => {
    const test = setup();
    fireEvent.pointerDown(test.overlay, pointer());
    expect(test.onSelect).toHaveBeenCalledExactlyOnceWith("crop-1");
    expect(test.overlay).toHaveFocus();
    expect(test.setCapture).toHaveBeenCalledWith(1);
    test.update({ selected: true });
    expect(test.overlay).toHaveAttribute("aria-pressed", "true");
    expect(test.overlay.querySelectorAll("[data-corner]")).toHaveLength(4);

    fireEvent.pointerMove(test.overlay, pointer(600, 480));
    expect(test.onCommit).not.toHaveBeenCalled();
    expect(parseFloat(test.overlay.style.left)).toBeCloseTo(30);
    expect(parseFloat(test.overlay.style.top)).toBeCloseTo(40);
    fireEvent.pointerUp(test.overlay, pointer(620, 496));
    expect(test.onCommit).toHaveBeenCalledTimes(1);
    expectRect(test.onCommit.mock.calls[0][1], { ...RECT, x: 0.32, y: 0.42 });
    fireEvent.click(test.overlay);
    expect(test.onSelect).toHaveBeenCalledTimes(1);
    expect(test.releaseCapture).toHaveBeenCalledWith(1);
    expect(test.parentEvent).not.toHaveBeenCalled();
  });

  it("selects clicks and keyboard activation without committing a stationary press", () => {
    const test = setup();
    fireEvent.click(test.overlay);
    fireEvent.keyDown(test.overlay, { key: "Enter" });
    fireEvent.keyDown(test.overlay, { key: " " });
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerUp(test.overlay, pointer());
    fireEvent.click(test.overlay);
    expect(test.onSelect).toHaveBeenCalledTimes(4);
    expect(test.onCommit).not.toHaveBeenCalled();
    expect(test.parentEvent).not.toHaveBeenCalled();
  });

  it("uses the delete tool for keyboard activation, just as it does for a click", () => {
    const test = setup({ tool: "delete" });
    fireEvent.keyDown(test.overlay, { key: "Enter" });
    fireEvent.keyDown(test.overlay, { key: " " });
    expect(test.onDelete).toHaveBeenCalledTimes(2);
    expect(test.onDelete).toHaveBeenCalledWith("crop-1");
    expect(test.onSelect).not.toHaveBeenCalled();
    expect(test.parentEvent).not.toHaveBeenCalled();
  });

  it("clamps page movement while preserving width and height", () => {
    const test = setup();
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerUp(test.overlay, pointer(5000, -2000));
    expectRect(test.onCommit.mock.calls[0][1], { ...RECT, x: 0.75, y: 0 });
  });

  it("keeps nested figures inside their parent problem when moving", () => {
    const test = setup({
      kind: "figure",
      bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.6 },
    });
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerUp(test.overlay, pointer(5000, 5000));
    expectRect(test.onCommit.mock.calls[0][1], { ...RECT, x: 0.35, y: 0.5 });
    expect(test.overlay).toHaveAttribute("data-crop-kind", "figure");
  });

  it.each([
    ["nw", { x: 0.3, y: 0.4, width: 0.15, height: 0.1 }],
    ["ne", { x: 0.2, y: 0.4, width: 0.35, height: 0.1 }],
    ["sw", { x: 0.3, y: 0.3, width: 0.15, height: 0.3 }],
    ["se", { x: 0.2, y: 0.3, width: 0.35, height: 0.3 }],
  ] as const)(
    "resizes the %s corner with the opposite corner anchored",
    (corner, expected) => {
      const test = setup({ selected: true });
      fireEvent.pointerDown(
        test.overlay.querySelector(`[data-corner="${corner}"]`)!,
        pointer(),
      );
      fireEvent.pointerMove(test.overlay, pointer(600, 480));
      expect(test.onCommit).not.toHaveBeenCalled();
      fireEvent.pointerUp(test.overlay, pointer(600, 480));
      expectRect(test.onCommit.mock.calls[0][1], expected);
      expect(test.parentEvent).not.toHaveBeenCalled();
    },
  );

  it.each(["nw", "ne", "sw", "se"])(
    "keeps the %s corner from crossing the 0.005 minimum",
    (corner) => {
      const test = setup({ selected: true });
      const x = corner.endsWith("w") ? 5000 : -5000;
      const y = corner.startsWith("n") ? 5000 : -5000;
      fireEvent.pointerDown(
        test.overlay.querySelector(`[data-corner="${corner}"]`)!,
        pointer(),
      );
      fireEvent.pointerUp(test.overlay, pointer(x, y));
      expectRect(test.onCommit.mock.calls[0][1], {
        x: corner.endsWith("w") ? 0.445 : 0.2,
        y: corner.startsWith("n") ? 0.495 : 0.3,
        width: 0.005,
        height: 0.005,
      });
    },
  );

  it.each(["nw", "ne", "sw", "se"])(
    "clamps %s resizing to nested bounds",
    (corner) => {
      const test = setup({
        selected: true,
        bounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.6 },
      });
      const west = corner.endsWith("w");
      const north = corner.startsWith("n");
      fireEvent.pointerDown(
        test.overlay.querySelector(`[data-corner="${corner}"]`)!,
        pointer(),
      );
      fireEvent.pointerUp(
        test.overlay,
        pointer(west ? -5000 : 5000, north ? -5000 : 5000),
      );
      expectRect(test.onCommit.mock.calls[0][1], {
        x: west ? 0.1 : 0.2,
        y: north ? 0.1 : 0.3,
        width: west ? 0.35 : 0.4,
        height: 0.4,
      });
    },
  );

  it.each([
    "Escape",
    "contextmenu",
    "pointercancel",
    "lostcapture",
    "rightbutton",
    "blur",
  ])(
    "cancels through %s without committing, then allows a fresh drag",
    (action) => {
      const test = setup();
      fireEvent.pointerDown(test.overlay, pointer());
      fireEvent.pointerMove(test.overlay, pointer(600, 480));
      if (action === "Escape")
        fireEvent.keyDown(test.overlay, { key: "Escape" });
      if (action === "contextmenu") fireEvent.contextMenu(test.overlay);
      if (action === "pointercancel")
        fireEvent.pointerCancel(test.overlay, pointer());
      if (action === "lostcapture")
        fireEvent.lostPointerCapture(test.overlay, pointer());
      if (action === "rightbutton")
        fireEvent.pointerMove(test.overlay, {
          ...pointer(600, 480),
          buttons: 3,
        });
      if (action === "blur") fireEvent.blur(test.overlay);
      expect(test.captured.size).toBe(0);
      expect(test.overlay).toHaveStyle({ left: "20%", top: "30%" });
      fireEvent.pointerUp(test.overlay, pointer(600, 480));
      expect(test.onCommit).not.toHaveBeenCalled();
      expect(test.parentEvent).not.toHaveBeenCalled();
      fireEvent.pointerDown(test.overlay, pointer());
      fireEvent.pointerUp(test.overlay, pointer(600, 480));
      expect(test.onCommit).toHaveBeenCalledTimes(1);
    },
  );

  it("ignores unrelated pointers and non-primary pointer starts", () => {
    const test = setup();
    fireEvent.pointerDown(test.overlay, { ...pointer(), isPrimary: false });
    expect(test.onSelect).not.toHaveBeenCalled();
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerMove(test.overlay, pointer(600, 480, 2));
    fireEvent.pointerUp(test.overlay, pointer(600, 480, 2));
    fireEvent.pointerCancel(test.overlay, pointer(600, 480, 2));
    expect(test.captured.has(1)).toBe(true);
    expect(test.onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(test.overlay, pointer(600, 480));
    expect(test.onCommit).toHaveBeenCalledTimes(1);
  });

  it.each([
    { disabled: true },
    { tool: "delete" as const },
    { rect: { ...RECT, x: 0.1 } },
  ])("cancels capture when interaction props change: %j", (change) => {
    const test = setup();
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerMove(test.overlay, pointer(600, 480));
    test.update(change);
    expect(test.captured.size).toBe(0);
    expect(test.overlay).not.toHaveAttribute("data-dragging");
    fireEvent.pointerUp(test.overlay, pointer(600, 480));
    expect(test.onCommit).not.toHaveBeenCalled();
  });

  it("releases capture when unmounted", () => {
    const test = setup();
    fireEvent.pointerDown(test.overlay, pointer());
    test.unmount();
    expect(test.releaseCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(test.onCommit).not.toHaveBeenCalled();
  });

  it("moves by one displayed page pixel, or ten with Shift, and clamps keyboard movement", () => {
    const test = setup();
    fireEvent.keyDown(test.overlay, { key: "ArrowRight" });
    expectRect(test.onCommit.mock.calls[0][1], { ...RECT, x: 0.201 });
    test.update({ rect: test.onCommit.mock.calls[0][1] });
    fireEvent.keyDown(test.overlay, { key: "ArrowDown", shiftKey: true });
    expectRect(test.onCommit.mock.calls[1][1], {
      ...RECT,
      x: 0.201,
      y: 0.3125,
    });
    test.update({ rect: { ...RECT, x: 0 } });
    fireEvent.keyDown(test.overlay, { key: "ArrowLeft" });
    fireEvent.keyUp(test.overlay, { key: "ArrowLeft" });
    expect(test.onCommit).toHaveBeenCalledTimes(2);
    expect(test.parentEvent).not.toHaveBeenCalled();
  });

  it("deletes by click in delete mode or by keyboard without starting a parent drawing", () => {
    const test = setup({ tool: "delete" });
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerUp(test.overlay, pointer());
    fireEvent.click(test.overlay);
    expect(test.onDelete).toHaveBeenCalledExactlyOnceWith("crop-1");
    expect(test.setCapture).not.toHaveBeenCalled();
    test.update({ tool: "select" });
    fireEvent.keyDown(test.overlay, { key: "Delete" });
    expect(test.onDelete).toHaveBeenCalledTimes(2);
    expect(test.onCommit).not.toHaveBeenCalled();
    expect(test.parentEvent).not.toHaveBeenCalled();
  });

  it("blocks actions while disabled and displays the progress cursor", () => {
    const test = setup({ selected: true, disabled: true });
    fireEvent.pointerDown(test.overlay, pointer());
    fireEvent.pointerMove(test.overlay, pointer(600, 480));
    fireEvent.pointerUp(test.overlay, pointer(600, 480));
    fireEvent.click(test.overlay);
    for (const key of ["Enter", "ArrowRight", "Delete"])
      fireEvent.keyDown(test.overlay, { key });
    expect(test.onSelect).not.toHaveBeenCalled();
    expect(test.onCommit).not.toHaveBeenCalled();
    expect(test.onDelete).not.toHaveBeenCalled();
    expect(test.parentEvent).not.toHaveBeenCalled();
    expect(test.overlay).toHaveAttribute("aria-disabled", "true");
    expect(test.overlay).toHaveAttribute("tabindex", "-1");
    expect(test.overlay).toHaveStyle({ cursor: "progress" });
    expect(test.overlay.querySelectorAll("[data-corner]")).toHaveLength(0);
  });

  it.each(["add-problem", "add-figure"] as const)(
    "lets the parent draw through %s overlays",
    (tool) => {
      const test = setup({ tool, selected: true });
      expect(test.overlay).toHaveStyle({ pointerEvents: "none" });
      expect(test.overlay).toHaveAttribute("tabindex", "-1");
      expect(test.overlay.querySelectorAll("[data-corner]")).toHaveLength(0);
      fireEvent.pointerDown(test.page, pointer());
      expect(test.parentEvent).toHaveBeenCalledTimes(1);
      expect(test.onSelect).not.toHaveBeenCalled();
      expect(test.onCommit).not.toHaveBeenCalled();
    },
  );

  it("shows a separate «완료» chip beside the label and names it, without taking pointer input", () => {
    const { overlay } = setup({ done: true });
    const chip = screen.getByText("완료");
    const label = screen.getByText("문제 1");
    expect(chip).not.toBe(label);
    expect(label).not.toHaveTextContent("완료");
    expect(overlay).toHaveAccessibleName("문제 1 영역 · 완료");
    expect(chip).toHaveAttribute("aria-hidden", "true");
  });
});
