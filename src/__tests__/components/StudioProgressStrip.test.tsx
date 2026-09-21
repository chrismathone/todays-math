import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioProgressStrip, {
  progressDetailPlacement,
} from "@/components/unified/StudioProgressStrip";

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

  // 상세 창 안에 마우스를 둔 채 Esc 로 닫으면 창이 DOM 에서 빠진다. 크롬은 지워진 요소 밑에 있던 포인터에
  // 대해 띠 뿌리의 pointerleave 를 끝내 보내지 않는다(e2e progress-strip 에서 사건을 찍어 확인, 2026-09-19).
  // 그래서 «움직이는 중» 표지가 켜진 채 남아, 나갔다 다시 들어와도 상세가 안 열렸다.
  it("상세 창 안에서 Esc 로 닫혀 나간 사건이 안 와도, 다시 들어와 움직이면 연다", () => {
    const strip = setup();
    fireEvent.pointerMove(strip, { pointerType: "mouse" });
    expect(screen.getByText("상세 내용")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByText("상세 내용"), { key: "Escape" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
    // pointerleave 없음 — 크롬이 보내지 않는다.
    fireEvent.pointerEnter(strip, { pointerType: "mouse" });
    fireEvent.pointerMove(strip, { pointerType: "mouse" });
    expect(screen.getByText("상세 내용")).toBeInTheDocument();
  });

  it("띠 위에서 Esc 로 닫은 뒤 띠 안에서 움직이는 것만으로는 다시 열지 않는다", () => {
    const strip = setup();
    fireEvent.pointerMove(strip, { pointerType: "mouse" });
    fireEvent.keyDown(strip, { key: "Escape" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
    fireEvent.pointerMove(strip, { pointerType: "mouse" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
  });

  it("터치는 누를 때만 연다", () => {
    const strip = setup();
    fireEvent.pointerMove(strip, { pointerType: "touch" });
    expect(screen.queryByText("상세 내용")).not.toBeInTheDocument();
  });
});

/**
 * 원장님 2026-09-21 «하단 펼쳐지는 영역은 원본 영역보다 커도 될거같으니까 알아서 잘처리».
 * 검수 줄의 띠는 150~300px 이고 줄 오른쪽 끝에 있다 — 상세 창이 띠 폭에 갇히면 이름이 한 글자씩 쪼개졌다.
 * 상세 창은 띠보다 넓어도 되지만 화면 밖으로는 안 나간다(좌우 8px 여백).
 */
describe("progressDetailPlacement — 상세 창 폭과 자리", () => {
  const strip = (left: number, width: number, top = 70, height = 44) => ({
    left,
    right: left + width,
    width,
    top,
    bottom: top + height,
  });
  const inside = (
    placed: { left: number; width: number },
    viewportWidth: number,
  ) => {
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.left + placed.width).toBeLessThanOrEqual(viewportWidth - 8);
  };

  it("줄 오른쪽 끝의 좁은 띠(1516px 화면 · 268px) — 띠보다 넓게, 오른쪽 끝을 띠에 맞춘다", () => {
    const placed = progressDetailPlacement(strip(1226, 268), {
      width: 1516,
      height: 900,
    });
    expect(placed.width).toBe(480);
    expect(placed.left + placed.width).toBe(1494);
    inside(placed, 1516);
  });

  it("1280px 화면 · 150px 띠도 같은 폭", () => {
    const placed = progressDetailPlacement(strip(1108, 150), {
      width: 1280,
      height: 800,
    });
    expect(placed.width).toBe(480);
    expect(placed.left + placed.width).toBe(1258);
    inside(placed, 1280);
  });

  it("오른쪽에 자리가 있으면 왼쪽 끝을 띠에 맞춘다", () => {
    const placed = progressDetailPlacement(strip(100, 200), {
      width: 1440,
      height: 900,
    });
    expect(placed).toMatchObject({ left: 100, width: 480 });
  });

  it("넓은 띠(① 가져오기 단계)는 예전처럼 띠 폭 · 680px 상한", () => {
    expect(
      progressDetailPlacement(strip(20, 1000), { width: 1440, height: 900 }),
    ).toMatchObject({ left: 20, width: 680 });
    expect(
      progressDetailPlacement(strip(20, 560), { width: 1440, height: 900 }),
    ).toMatchObject({ left: 20, width: 560 });
  });

  it("좁은 화면에서는 화면 폭에서 여백만 뺀다", () => {
    for (const [left, width, viewport] of [
      [9, 372, 390],
      [9, 318, 336],
      [200, 150, 360],
    ]) {
      const placed = progressDetailPlacement(strip(left, width), {
        width: viewport,
        height: 900,
      });
      expect(placed.width).toBe(Math.min(480, viewport - 16));
      inside(placed, viewport);
    }
  });

  // 띠에 붙은 쪽 모서리는 각지고, 띠 밖으로 나간 쪽 위 모서리만 둥글다 — 창이 띠에서 흘러내린 꼴.
  it("띠 밖으로 나간 쪽을 알린다 — 위 모서리를 둥글게 할 자리", () => {
    expect(
      progressDetailPlacement(strip(1226, 268), { width: 1516, height: 900 }),
    ).toMatchObject({ overhangStart: true, overhangEnd: false });
    expect(
      progressDetailPlacement(strip(100, 200), { width: 1440, height: 900 }),
    ).toMatchObject({ overhangStart: false, overhangEnd: true });
    expect(
      progressDetailPlacement(strip(20, 1000), { width: 1440, height: 900 }),
    ).toMatchObject({ overhangStart: false, overhangEnd: false });
  });

  it("아래 자리가 모자라면 위로 연다 — 세로 규칙은 그대로", () => {
    expect(
      progressDetailPlacement(strip(100, 200, 700), {
        width: 1440,
        height: 800,
      }),
    ).toMatchObject({ above: true, maxHeight: 460 });
    expect(
      progressDetailPlacement(strip(100, 200, 70), {
        width: 1440,
        height: 800,
      }),
    ).toMatchObject({ above: false, maxHeight: 460 });
  });
});
