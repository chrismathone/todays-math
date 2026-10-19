import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArithmeticTypePreview,
  useArithmeticTypePreview,
} from "@/components/arithmetic/ArithmeticTypePreview";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";

const types = listArithmeticV2Types();
const numeric = types.find((type) => type.id === "m1-integer-add-chain")!;
const figure = types.find((type) => type.id === "m3-trig-special-length")!;

function Catalog() {
  const preview = useArithmeticTypePreview();
  return (
    <>
      {[numeric, figure].map((type) => (
        <button type="button" key={type.id} {...preview.cardProps(type.id)}>
          {type.title}
        </button>
      ))}
      <ArithmeticTypePreview state={preview.state} types={types} />
    </>
  );
}

describe("arithmetic type preview on hover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows one example problem after a short hover and hides on leave", () => {
    render(<Catalog />);
    const card = screen.getByRole("button", { name: numeric.title });
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(numeric.title);
    expect(tooltip).toHaveTextContent("예시");
    expect(card).toHaveAttribute("aria-describedby", tooltip.id);
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(card).not.toHaveAttribute("aria-describedby");
  });

  it("renders the figure-first example with its figure", () => {
    render(<Catalog />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: figure.title }), {
      pointerType: "mouse",
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip").querySelector("img")).not.toBeNull();
  });

  it("never opens for touch, and closes on pointer down and Escape", () => {
    render(<Catalog />);
    const card = screen.getByRole("button", { name: numeric.title });
    fireEvent.pointerEnter(card, { pointerType: "touch" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(card, { pointerType: "mouse", button: 0 });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes when the pointer is seen off the card or the card leaves the document", () => {
    const { rerender } = render(<Catalog />);
    const card = screen.getByRole("button", { name: numeric.title });
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // A re-rendered grid under a still pointer: the next move lands elsewhere.
    fireEvent.pointerMove(document.body, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    rerender(<div />);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("nests no block element inside a paragraph (hydration-safe markup)", () => {
    render(<Catalog />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: figure.title }), {
      pointerType: "mouse",
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip").querySelector("p div, p p")).toBeNull();
  });

  it("opens on keyboard focus and closes on blur", () => {
    render(<Catalog />);
    const card = screen.getByRole("button", { name: numeric.title });
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => card.focus());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(numeric.title);
    act(() => card.blur());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
