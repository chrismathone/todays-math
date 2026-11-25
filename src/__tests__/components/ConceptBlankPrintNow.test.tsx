/**
 * 개념 백지 인쇄 페이지의 «바로 인쇄»(원장님 2026-10-01 «ctrl+p 말고 인쇄버튼으로 연결되게»).
 * 화면의 인쇄하기가 `?print=1` 로 새 창을 열면, 지면이 그려지고 글꼴이 다 들어온 뒤 인쇄 창을 **한 번** 띄운다
 * (글꼴 · KaTeX 가 늦게 들어오면 줄이 밀린 채 찍힌다).
 */
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PrintNow from "@/components/concept-blank/paper/PrintNow";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintNow", () => {
  it("글꼴이 다 들어온 뒤 인쇄 창을 한 번 띄운다", async () => {
    let fontsReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      fontsReady = resolve;
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready },
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintNow />);
    await new Promise((r) => setTimeout(r, 50));
    expect(print).not.toHaveBeenCalled(); // 글꼴 전에는 안 띄운다

    fontsReady();
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("화면에 아무것도 그리지 않는다(지면만 찍힌다)", () => {
    vi.spyOn(window, "print").mockImplementation(() => {});
    const { container } = render(<PrintNow />);
    expect(container.innerHTML).toBe("");
  });
});

it("waits for the linked stylesheet before auto-print and previews never open a print dialog", async () => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/qa-sheet.css";
  document.head.append(link);
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve(), load: async () => [{}] },
  });
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const view = render(
    <PrintNow stylesheetHref="/qa-sheet.css" autoPrint={false} />,
  );
  await new Promise((r) => setTimeout(r, 50));
  expect(print).not.toHaveBeenCalled();
  link.dispatchEvent(new Event("load"));
  await new Promise((r) => setTimeout(r, 100));
  expect(print).not.toHaveBeenCalled();
  view.unmount();
  link.remove();
});
