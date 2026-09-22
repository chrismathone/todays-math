import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";

const typeset = vi.hoisted(() => vi.fn());
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (original) => ({
    ...(await original<object>()),
    typesetFigureSvg: typeset,
  }),
);

const svg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><line x1="20" y1="150" x2="180" y2="150" stroke="black"/><text x="100" y="140">$\mathrm{A}$</text></svg>`;
const rendered = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path data-label="A" d="M90 140L100 120L110 140"/></svg>`;
const open = (initialSvg = svg) =>
  render(
    <StudioFigureEditor
      image="data:image/png;base64,YQ=="
      initialSvg={initialSvg}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
const canvas = () =>
  document.querySelector<HTMLElement>("#figure-editor-canvas")!;

beforeEach(() => {
  typeset.mockReset();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("figure editor initial math rendering", () => {
  it("keeps raw math hidden until first typesetting finishes", async () => {
    let finish!: (svg: string) => void;
    typeset.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    open();
    expect(canvas()).not.toBeVisible();
    expect(screen.getByText("도형 준비 중…")).toBeVisible();
    expect(screen.getByLabelText("도형 편집 캔버스")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await waitFor(() => expect(typeset).toHaveBeenCalledOnce());
    await act(async () => finish(rendered));
    expect(canvas()).toBeVisible();
    expect(canvas().querySelector("text")).toBeNull();
    expect(canvas().querySelector('[data-label="A"]')).not.toBeNull();
    expect(screen.queryByText("도형 준비 중…")).toBeNull();
  });

  it("offers retry after a failed first render without exposing math source", async () => {
    typeset
      .mockRejectedValueOnce(new Error("라벨 로딩 실패"))
      .mockResolvedValueOnce(rendered);
    open();
    const retry = await screen.findByRole("button", {
      name: "도형 표시 다시 시도",
    });
    expect(canvas()).not.toBeVisible();
    expect(screen.getByLabelText("도형 편집 캔버스")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    fireEvent.click(retry);
    await waitFor(() => expect(canvas()).toBeVisible());
    expect(
      screen.queryByRole("button", { name: "도형 표시 다시 시도" }),
    ).toBeNull();
    expect(typeset).toHaveBeenCalledTimes(2);
  });

  it("shows geometry-only figures immediately", () => {
    typeset.mockImplementation(() => new Promise(() => {}));
    open(svg.replace(/<text[^>]*>.*?<\/text>/, ""));
    expect(canvas()).toBeVisible();
    expect(screen.queryByText("도형 준비 중…")).toBeNull();
  });
});
