import { StrictMode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConceptPlay from "@/components/lab/cube31/ConceptPlay";

const surface = () =>
  screen.getByRole("region", { name: "모아와 두리의 블록 가게 게임" });
function key(key: string, count = 1) {
  for (let i = 0; i < count; i++) {
    fireEvent.keyDown(surface(), { key });
    fireEvent.keyUp(surface(), { key });
  }
}
const tick = (ms = 900) => act(() => vi.advanceTimersByTime(ms));
const value = () => screen.getByTestId("play-value");
const solveFirst = () => {
  key("2");
  key("3", 2);
};
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

function reachFinale() {
  solveFirst();
  tick();
  key("1");
  key("3", 3);
  tick();
  key("e");
  tick();
  key("e");
  tick();
  key("2");
  key("3", 2);
  tick();
  key("1", 2);
  key("2");
  key("3", 4);
  key("e");
  tick();
  key("1", 2);
  key("2");
  key("3", 4);
  tick();
}

describe("ConceptPlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Gameplay checks use the accessible instant transcript; conversation timing
    // is covered separately with motion enabled.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("focuses the surface, starts the conversation immediately and links block actions to value", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    expect(surface()).toHaveFocus();
    expect(
      screen.getByText("12개를 놓으려면 낱개를 열두 번 눌러야 해?"),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "백 판 1개 놓기" }),
    ).not.toBeInTheDocument();
    click("십 막대 1개 놓기");
    expect(value()).toHaveTextContent(/^10$/);
    expect(screen.getByRole("status")).toHaveTextContent("0 + 10 = 10");
    expect(screen.getByText("직접 움직이니 0 + 10 = 10")).toBeVisible();
    click("낱개 1개 놓기");
    click("낱개 1개 놓기");
    expect(screen.getByRole("status")).toHaveTextContent("10 + 2 = 12");
    expect(screen.getByLabelText("발견한 별 1개")).toBeVisible();
    tick(899);
    expect(value()).toHaveTextContent(/^12$/);
    tick(1);
    expect(value()).toHaveTextContent(/^0$/);
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
    expect(screen.getByRole("log")).toHaveTextContent("10 + 2 = 12");
  });

  it("rejects held keys, repeats, IME and modifier shortcuts", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    fireEvent.keyDown(surface(), { key: "3" });
    fireEvent.keyDown(surface(), { key: "3" });
    fireEvent.keyDown(surface(), { key: "3", repeat: true });
    expect(value()).toHaveTextContent(/^1$/);
    fireEvent.keyUp(surface(), { key: "3" });
    fireEvent.keyDown(surface(), { key: "3", isComposing: true });
    fireEvent.keyDown(surface(), { key: "3", keyCode: 229 });
    fireEvent.keyDown(surface(), { key: "3", ctrlKey: true });
    fireEvent.keyDown(surface(), { key: "3", metaKey: true });
    fireEvent.keyDown(surface(), { key: "3", altKey: true });
    expect(value()).toHaveTextContent(/^1$/);
    key("3");
    expect(value()).toHaveTextContent(/^2$/);
  });

  it("preserves keyboard play after a clicked button disables and across a held-key transition", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    const tens = screen.getByRole("button", { name: "십 막대 1개 놓기" });
    tens.focus();
    fireEvent.click(tens);
    expect(surface()).toHaveFocus();
    key("3");
    fireEvent.keyDown(surface(), { key: "3" });
    expect(value()).toHaveTextContent(/^12$/);
    tick();
    fireEvent.keyDown(surface(), { key: "3" });
    expect(value()).toHaveTextContent(/^0$/);
    fireEvent.keyUp(surface(), { key: "3" });
    key("3");
    expect(value()).toHaveTextContent(/^1$/);
  });

  it("does not consume keys from editable targets or anywhere outside the game", () => {
    render(
      <>
        <input aria-label="outside input" />
        <ConceptPlay onClose={vi.fn()} />
      </>,
    );
    const outside = screen.getByRole("textbox");
    fireEvent.keyDown(outside, { key: "2" });
    fireEvent.keyDown(window, { key: "2" });
    expect(value()).toHaveTextContent(/^0$/);
    for (const tag of ["input", "textarea", "select", "div"]) {
      const editable = document.createElement(tag);
      if (tag === "div") editable.setAttribute("contenteditable", "true");
      surface().appendChild(editable);
      fireEvent.keyDown(editable, { key: "2" });
      editable.remove();
    }
    expect(value()).toHaveTextContent(/^0$/);
    const parentKey = vi.fn();
    window.addEventListener("keydown", parentKey);
    key("2");
    expect(parentKey).not.toHaveBeenCalled();
    window.removeEventListener("keydown", parentKey);
  });

  it("ignores burst actions during success and advances exactly one round in StrictMode", () => {
    render(
      <StrictMode>
        <ConceptPlay onClose={vi.fn()} />
      </StrictMode>,
    );
    solveFirst();
    key("3", 4);
    key("2");
    expect(value()).toHaveTextContent(/^12$/);
    expect(
      screen.getByRole("button", { name: "낱개 1개 놓기" }),
    ).toBeDisabled();
    tick(3000);
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
    expect(value()).toHaveTextContent(/^0$/);
    expect(screen.getByLabelText("발견한 별 1개")).toBeVisible();
  });

  it("pauses a solved scene without losing its result or advancing", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    solveFirst();
    tick(400);
    click("잠깐 멈추기");
    key("3");
    tick(5000);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    expect(value()).toHaveTextContent(/^12$/);
    click("계속하기");
    tick();
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
  });

  it("undo and reset cancel pending progression and allow a fresh solve", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    solveFirst();
    tick(400);
    key("u");
    expect(value()).toHaveTextContent(/^11$/);
    tick(1000);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    key("3");
    tick(300);
    key("r");
    tick(1000);
    expect(value()).toHaveTextContent(/^0$/);
    solveFirst();
    tick();
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
  });

  it("supports correcting excess build blocks directly on the board", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    key("2", 2);
    click("십 막대 1개 치우기");
    expect(value()).toHaveTextContent(/^10$/);
    key("3", 2);
    expect(screen.getByRole("status")).toHaveTextContent("발견!");
  });

  it("reveals a usable exchange after building twelve ones", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    key("3", 12);
    expect(value()).toHaveTextContent(/^12$/);
    expect(screen.getByRole("status")).toHaveTextContent("큰 블록 1개로 묶어");
    click("낱개 10개 → 십 막대 1개로 묶기");
    expect(screen.getByRole("status")).toHaveTextContent("발견!");
    tick();
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
  });

  it("plays all eight missions, shows three-digit borrowing and replays", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    reachFinale();
    expect(screen.getByText(/장면 8 \/ 8/)).toBeVisible();
    expect(value()).toHaveTextContent(/^254$/);
    key("3", 4);
    expect(value()).toHaveTextContent(/^250$/);
    expect(
      screen.getByRole("button", { name: "낱개 1개 건네기" }),
    ).toBeDisabled();
    key("e");
    expect(value()).toHaveTextContent(/^250$/);
    expect(screen.getByRole("status")).toHaveTextContent(
      "전체 값 250은 그대로",
    );
    key("1");
    key("2", 3);
    key("3", 4);
    expect(value()).toHaveTextContent(/^116$/);
    expect(screen.getByRole("status")).toHaveTextContent("254 − 138 = 116");
    tick();
    expect(
      screen.getByRole("heading", { name: "오늘의 블록 가게, 성공!" }),
    ).toBeVisible();
    expect(screen.getByLabelText("발견한 별 8개")).toBeVisible();
    click("한 번 더 놀기");
    expect(surface()).toHaveFocus();
    expect(value()).toHaveTextContent(/^0$/);
    expect(screen.getByLabelText("발견한 별 0개")).toBeVisible();
  });

  it("offers mouse equivalents for exchanges, taking and returning blocks", () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    solveFirst();
    tick();
    key("1");
    key("3", 3);
    tick();
    const board = screen.getByLabelText("진열대");
    fireEvent.click(
      within(board)
        .getAllByRole("button")
        .find((button) => !button.hasAttribute("disabled"))!,
    );
    tick();
    click("십 막대 1개 → 낱개 10개로 풀기");
    tick();
    key("2");
    key("3", 2);
    tick();
    key("1", 2);
    key("2");
    key("3", 4);
    click("낱개 10개 → 십 막대 1개로 묶기");
    tick();
    click("백 판 1개 건네기");
    expect(value()).toHaveTextContent(/^256$/);
    click("백 판 1개 돌려받기");
    expect(value()).toHaveTextContent(/^356$/);
  });

  it.each(["button", "escape"])(
    "closing by %s clears the timer even before the parent unmounts",
    (method) => {
      const onClose = vi.fn();
      const schedule = vi.spyOn(globalThis, "setTimeout");
      const cancel = vi.spyOn(globalThis, "clearTimeout");
      render(<ConceptPlay onClose={onClose} />);
      solveFirst();
      const scheduled = schedule.mock.calls.findIndex(
        (call) => call[1] === 900,
      );
      expect(scheduled).toBeGreaterThanOrEqual(0);
      const handle = schedule.mock.results[scheduled].value;
      if (method === "button") click("게임 닫기");
      else key("Escape");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledWith(handle);
      click("게임 닫기");
      tick(3000);
      key("r");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    },
  );

  it("clears all timers on unmount and leaves outside keys alone", () => {
    const onClose = vi.fn();
    const schedule = vi.spyOn(globalThis, "setTimeout");
    const cancel = vi.spyOn(globalThis, "clearTimeout");
    const rendered = render(<ConceptPlay onClose={onClose} />);
    solveFirst();
    const scheduled = schedule.mock.calls.findIndex((call) => call[1] === 900);
    expect(scheduled).toBeGreaterThanOrEqual(0);
    const handle = schedule.mock.results[scheduled].value;
    rendered.unmount();
    expect(cancel).toHaveBeenCalledWith(handle);
    fireEvent.keyDown(window, { key: "Escape" });
    tick(5000);
    expect(onClose).not.toHaveBeenCalled();
  });
});
