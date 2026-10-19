import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudyBook } from "@/components/math-srs/StudyBook";

function book() {
  render(
    <StudyBook
      leftTitle="뜻과 그림"
      rightTitle="예와 연습"
      left={<p>왼쪽 내용</p>}
      right={<p>오른쪽 내용</p>}
    />,
  );
  return screen.getByTestId("study-spread");
}

describe("shared two-page study book", () => {
  it("uses supplied titles for tabs, section names, page titles and turn controls", () => {
    const spread = book();
    for (const [index, title, content] of [
      [0, "뜻과 그림", "왼쪽 내용"],
      [1, "예와 연습", "오른쪽 내용"],
    ] as const) {
      const tab = screen.getByRole("button", { name: title });
      const section = screen.getByRole("region", { name: title });
      expect(tab).toHaveAttribute("aria-controls", section.id);
      expect(section).toHaveAttribute("data-leaf", String(index));
      expect(within(section).getByText(title)).toBeInTheDocument();
      expect(within(section).getByText(content)).toBeInTheDocument();
    }
    expect(spread).toHaveAttribute("data-page", "0");
    fireEvent.click(screen.getByRole("button", { name: "예와 연습" }));
    expect(spread).toHaveAttribute("data-page", "1");
    expect(screen.getByRole("button", { name: "예와 연습" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "뜻과 그림 보기" }));
    expect(spread).toHaveAttribute("data-page", "0");
    fireEvent.click(screen.getByRole("button", { name: "예와 연습 보기" }));
    expect(spread).toHaveAttribute("data-page", "1");
  });

  it("turns in both horizontal swipe directions", () => {
    const spread = book();
    fireEvent.touchStart(spread, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 50, clientY: 105 }],
    });
    expect(spread).toHaveAttribute("data-page", "1");
    fireEvent.touchStart(spread, { touches: [{ clientX: 50, clientY: 100 }] });
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 220, clientY: 105 }],
    });
    expect(spread).toHaveAttribute("data-page", "0");
  });

  it("leaves vertical, short and cancelled touches on the current page", () => {
    const spread = book();
    for (const [x, y] of [
      [100, 250],
      [190, 105],
      [130, 180],
    ]) {
      fireEvent.touchStart(spread, {
        touches: [{ clientX: 220, clientY: 100 }],
      });
      fireEvent.touchEnd(spread, {
        changedTouches: [{ clientX: x, clientY: y }],
      });
      expect(spread).toHaveAttribute("data-page", "0");
    }
    fireEvent.touchStart(spread, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchCancel(spread);
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 50, clientY: 100 }],
    });
    expect(spread).toHaveAttribute("data-page", "0");
  });
});
