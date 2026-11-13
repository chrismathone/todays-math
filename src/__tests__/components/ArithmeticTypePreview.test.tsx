import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

// Exercise the real lazy import and renderer; only the interaction delay is faked.
async function settleExample() {
  vi.useRealTimers();
  await waitFor(() =>
    expect(
      screen.getByRole("tooltip").querySelector('[aria-label="답란"]'),
    ).not.toBeNull(),
  );
  vi.useFakeTimers();
}

describe("arithmetic type preview on hover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a numeric example immediately after the hover delay and hides on leave", () => {
    render(<Catalog />);
    const card = screen.getByRole("button", { name: numeric.title });
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(within(tooltip).queryByRole("status")).toBeNull();
    expect(tooltip).toHaveTextContent(numeric.title);
    expect(tooltip).toHaveTextContent("예시");
    expect(tooltip.querySelector(".katex")).not.toBeNull();
    expect(tooltip.parentElement).toBe(document.body);
    expect(card).toHaveAttribute("aria-describedby", tooltip.id);
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(card).not.toHaveAttribute("aria-describedby");
  });

  it("renders the figure-first example with its figure", async () => {
    render(<Catalog />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: figure.title }), {
      pointerType: "mouse",
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(within(tooltip).getByRole("status")).toHaveTextContent(
      "예시를 불러오는 중입니다.",
    );
    const card = screen.getByRole("button", { name: figure.title });
    expect(card).toHaveAttribute("aria-describedby", tooltip.id);
    await settleExample();
    expect(screen.getByRole("tooltip")).toBe(tooltip);
    expect(tooltip.querySelector("img")).not.toBeNull();
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

  it("opens the next card when pointer movement arrives before the old preview effect is cleaned up", async () => {
    render(<Catalog />);
    const first = screen.getByRole("button", { name: numeric.title });
    const next = screen.getByRole("button", { name: figure.title });
    fireEvent.pointerEnter(first, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("tooltip")).toHaveTextContent(numeric.title);

    // A browser can deliver the whole transition before React flushes effects.
    act(() => {
      fireEvent.pointerOut(first, {
        pointerType: "mouse",
        relatedTarget: next,
      });
      fireEvent.pointerOver(next, {
        pointerType: "mouse",
        relatedTarget: first,
      });
      fireEvent.pointerMove(next, { pointerType: "mouse" });
    });
    act(() => vi.advanceTimersByTime(300));
    await settleExample();
    expect(screen.getByRole("tooltip")).toHaveTextContent(figure.title);
    expect(screen.getByRole("tooltip").querySelector("img")).not.toBeNull();
    expect(first).not.toHaveAttribute("aria-describedby");
    expect(next).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
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

  it("cancels a pending card transition when the pointer continues outside", () => {
    render(<Catalog />);
    const first = screen.getByRole("button", { name: numeric.title });
    const next = screen.getByRole("button", { name: figure.title });
    fireEvent.pointerEnter(first, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(300));
    act(() => {
      fireEvent.pointerOut(first, {
        pointerType: "mouse",
        relatedTarget: next,
      });
      fireEvent.pointerOver(next, {
        pointerType: "mouse",
        relatedTarget: first,
      });
      fireEvent.pointerMove(next, { pointerType: "mouse" });
      fireEvent.pointerMove(document.body, { pointerType: "mouse" });
    });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it.each(["Escape", "scroll", "resize"])(
    "cancels the first preview before it opens on %s",
    (action) => {
      render(<Catalog />);
      const card = screen.getByRole("button", { name: numeric.title });
      fireEvent.pointerEnter(card, { pointerType: "mouse" });
      act(() => vi.advanceTimersByTime(100));
      if (action === "Escape") fireEvent.keyDown(document, { key: action });
      else fireEvent(window, new Event(action));
      act(() => vi.advanceTimersByTime(300));
      expect(screen.queryByRole("tooltip")).toBeNull();
      expect(card).not.toHaveAttribute("aria-describedby");
    },
  );

  it("keeps the next anchor when its timer fires before React commits the transition", async () => {
    render(<Catalog />);
    const first = screen.getByRole("button", { name: numeric.title });
    const next = screen.getByRole("button", { name: figure.title });
    fireEvent.pointerEnter(first, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(300));
    act(() => {
      fireEvent.pointerOut(first, {
        pointerType: "mouse",
        relatedTarget: next,
      });
      fireEvent.pointerOver(next, {
        pointerType: "mouse",
        relatedTarget: first,
      });
      vi.advanceTimersByTime(300);
      fireEvent.pointerMove(next, { pointerType: "mouse" });
    });
    await settleExample();
    expect(screen.getByRole("tooltip")).toHaveTextContent(figure.title);
    expect(next).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
  });

  it("nests no block element inside a paragraph (hydration-safe markup)", async () => {
    render(<Catalog />);
    fireEvent.pointerEnter(screen.getByRole("button", { name: figure.title }), {
      pointerType: "mouse",
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await settleExample();
    expect(screen.getByRole("tooltip").querySelector("p div, p p")).toBeNull();
  });

  it("opens on keyboard focus and closes on blur", async () => {
    render(<Catalog />);
    const card = screen.getByRole("button", { name: figure.title });
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => card.focus());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await settleExample();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(figure.title);
    expect(tooltip.querySelector("img")).not.toBeNull();
    expect(card).toHaveAttribute("aria-describedby", tooltip.id);
    act(() => card.blur());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
