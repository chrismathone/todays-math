import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioProgressStrip from "@/components/unified/StudioProgressStrip";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

function setup() {
  render(
    <StudioProgressStrip
      summaries={[
        { id: "figures", label: "도형", done: 1, total: 2, active: true },
      ]}
    >
      <p>상세 내용</p>
    </StudioProgressStrip>,
  );
  return screen.getByRole("button", { name: /^작업 진행 상세/ }).parentElement!;
}

describe("StudioProgressStrip 상세 창", () => {
  // 검수 단계(2026-09-19 시안 B)에서는 띠가 탭이 있던 자리로 올라온다. 탭을 누른 마우스가 그대로면
  // 레이아웃만 옮겨 와도 pointerover 가 들어와 상세 창이 저절로 열렸다 — 실제로 움직일 때만 연다.
  it("레이아웃이 옮겨 와 마우스 밑에 놓인 것만으로는 열지 않는다", () => {
    const strip = setup();
    fireEvent.pointerOver(strip, { pointerType: "mouse" });
    fireEvent.pointerEnter(strip, { pointerType: "mouse" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
  });

  it("마우스가 움직여 들어오면 열고, 나가면 닫는다", () => {
    const strip = setup();
    fireEvent.pointerMove(strip, { pointerType: "mouse" });
    expect(screen.getByText("상세 내용")).toBeInTheDocument();
    fireEvent.pointerLeave(strip, { pointerType: "mouse" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
  });

  it("터치는 누를 때만 연다", () => {
    const strip = setup();
    fireEvent.pointerMove(strip, { pointerType: "touch" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
  });
});
