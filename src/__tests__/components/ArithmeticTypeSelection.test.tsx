import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useArithmeticTypeSelection } from "@/components/arithmetic/useArithmeticTypeSelection";

function Gallery() {
  const [selected, setSelected] = useState<string[]>([]);
  const card = useArithmeticTypeSelection((id, value) =>
    setSelected((current) =>
      value
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    ),
  );
  return (
    <>
      {["a", "b", "disabled"].map((id) => (
        <button
          key={id}
          {...card(id, selected.includes(id), id === "disabled")}
        >
          {id}
        </button>
      ))}
      <output>{selected.join(",")}</output>
    </>
  );
}
const pointer = { pointerType: "mouse", pointerId: 1, button: 0, buttons: 1 };
describe("arithmetic gallery selection", () => {
  it("paints once across cards and suppresses the trailing pointer click, with keyboard support", () => {
    render(<Gallery />);
    const a = screen.getByRole("button", { name: "a" });
    const b = screen.getByRole("button", { name: "b" });
    fireEvent.pointerDown(a, pointer);
    fireEvent.pointerEnter(b, pointer);
    fireEvent.pointerEnter(a, pointer);
    fireEvent.pointerEnter(
      screen.getByRole("button", { name: "disabled" }),
      pointer,
    );
    fireEvent.pointerUp(b, { ...pointer, buttons: 0 });
    fireEvent.click(b, { detail: 1 });
    expect(screen.getByRole("status")).toHaveTextContent("a,b");
    fireEvent.click(a, { detail: 0 });
    expect(a).toHaveAttribute("aria-pressed", "false");
    expect(b).toHaveAttribute("aria-pressed", "true");
    fireEvent.pointerDown(b, pointer);
    fireEvent.pointerEnter(a, pointer);
    fireEvent.pointerUp(a, { ...pointer, buttons: 0 });
    fireEvent.click(a, { detail: 1 });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
  it("does not select on touch scroll, but supports an ordinary tap", () => {
    render(<Gallery />);
    const a = screen.getByRole("button", { name: "a" });
    const touch = { ...pointer, pointerType: "touch" };
    expect(fireEvent.pointerDown(a, touch)).toBe(true);
    fireEvent.pointerEnter(screen.getByRole("button", { name: "b" }), touch);
    fireEvent.pointerCancel(a, touch);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    fireEvent.pointerDown(a, touch);
    fireEvent.pointerUp(a, { ...touch, buttons: 0 });
    fireEvent.click(a, { detail: 1 });
    expect(a).toHaveAttribute("aria-pressed", "true");
  });
});
