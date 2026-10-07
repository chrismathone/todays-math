import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FadingAnkiCard,
  FadingTypedComparison,
} from "@/components/fading/FadingCardViews";
import type { FadingConcept } from "@/lib/fading/concepts";
import { FadingFillCard } from "@/components/fading/FadingFillCard";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const concept: FadingConcept = {
  id: "card-view-test",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: ["외심", "반지름"].map((answer, index) => ({
    id: `p${index}`,
    term: `용어${index}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: "이 문장의 답은 " },
      {
        kind: "target",
        target: { id: `p${index}#1`, text: answer, tier: "text" },
      },
      { kind: "text", text: "입니다." },
    ],
  })),
};

describe("카드 앞뒤와 묶음 대조", () => {
  it("앞면은 5초 뒤 문장만 공개하고 사전 확인은 대신 고르지 않는다", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const onReveal = vi.fn();
    const onSeen = vi.fn();
    render(
      <FadingAnkiCard
        proposition={concept.propositions[0]!}
        revealed={false}
        disabled={false}
        onReveal={onReveal}
        onSeen={onSeen}
      />,
    );
    expect(screen.getByRole("button", { name: "문장 보기" })).toHaveFocus();
    act(() => vi.advanceTimersByTime(4999));
    expect(onReveal).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onSeen).not.toHaveBeenCalled();
  });

  it("새 카드에는 새 5초를 주고, 뒷면과 비활성화 중에는 자동 공개하지 않는다", () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const onReveal = vi.fn();
    const props = {
      revealed: false,
      disabled: false,
      onReveal,
      onSeen: vi.fn(),
    };
    const view = render(
      <FadingAnkiCard {...props} proposition={concept.propositions[0]!} />,
    );
    act(() => vi.advanceTimersByTime(4000));
    view.rerender(
      <FadingAnkiCard {...props} proposition={concept.propositions[1]!} />,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(onReveal).not.toHaveBeenCalled();
    view.rerender(
      <FadingAnkiCard
        {...props}
        proposition={concept.propositions[1]!}
        disabled
      />,
    );
    act(() => vi.advanceTimersByTime(6000));
    expect(onReveal).not.toHaveBeenCalled();
    view.rerender(
      <FadingAnkiCard
        {...props}
        proposition={concept.propositions[1]!}
        revealed
      />,
    );
    act(() => vi.advanceTimersByTime(6000));
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("페이지를 떠나 있으면 공개하지 않고 돌아왔을 때 다시 5초를 준다", () => {
    vi.useFakeTimers();
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const onReveal = vi.fn();
    render(
      <FadingAnkiCard
        proposition={concept.propositions[0]!}
        revealed={false}
        disabled={false}
        onReveal={onReveal}
        onSeen={vi.fn()}
      />,
    );
    act(() => vi.advanceTimersByTime(4000));
    visibility.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(6000));
    expect(onReveal).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(5000));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("직접 쓰는 빈칸에는 답의 글이나 길이를 DOM에 넣지 않는다", () => {
    const onBlank = vi.fn();
    const { container } = render(
      <FadingFillCard
        proposition={concept.propositions[0]!}
        caption="도형 · 정의 · 문장 1/2"
        erased={[{ id: "p0#1" }]}
        answers={{}}
        missed={[]}
        active="p0#1"
        wrong={null}
        typed
        disabled={false}
        onBlank={onBlank}
      />,
    );
    expect(container.innerHTML).not.toContain("외심");
    expect(container.innerHTML).not.toContain("용어0");
    const blank = screen.getByRole("button", { name: "빈칸 1" });
    expect(blank).toHaveAttribute("aria-pressed", "true");
    expect(blank).not.toHaveAttribute("style");
    fireEvent.click(blank);
    expect(onBlank).toHaveBeenCalledWith("p0#1");
  });

  it("앞면은 용어와 종류만 받고 뒷면 문장을 DOM에 넣지 않는다", () => {
    const onReveal = vi.fn();
    const { container } = render(
      <FadingAnkiCard
        proposition={concept.propositions[0]!}
        revealed={false}
        disabled={false}
        onReveal={onReveal}
        onSeen={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "용어0" })).toBeInTheDocument();
    expect(screen.getByText("정의")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("외심");
    expect(
      screen.queryByRole("button", { name: /처음 봄/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "문장 보기" }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it("뒷면의 핵심어에 기존 초록 강조를 쓰고 세 진단 값을 전달한다", () => {
    const onSeen = vi.fn();
    render(
      <FadingAnkiCard
        proposition={concept.propositions[0]!}
        revealed
        disabled={false}
        onReveal={vi.fn()}
        onSeen={onSeen}
      />,
    );
    expect(screen.getByText("외심").parentElement?.className).toContain(
      "readingTextTarget",
    );
    for (const label of ["처음 봄", "들어 봄", "알고 있었음"])
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
    expect(onSeen.mock.calls).toEqual([["1"], ["2"], ["3"]]);
  });

  it("완료된 묶음에서 한 문장만 대조하고 모름 칸에만 자기 대조를 받는다", () => {
    const onJudge = vi.fn();
    render(
      <FadingTypedComparison
        concept={concept}
        answers={{ "p0#1": "내가 쓴 <b>중심</b>", "p1#1": "반지름" }}
        unjudged={[{ targetId: "p0#1", text: "내가 쓴 <b>중심</b>" }]}
        judgments={{}}
        disabled={false}
        onJudge={onJudge}
      />,
    );
    expect(
      document.querySelectorAll("[data-fading-comparison-sentence]"),
    ).toHaveLength(1);
    const comparison = screen.getByRole("region", {
      name: "내 답과 기준안 대조",
    });
    expect(within(comparison).getByText("외심")).toBeInTheDocument();
    expect(
      within(comparison).getByText("내가 쓴 <b>중심</b>"),
    ).toBeInTheDocument();
    expect(comparison.querySelector("b")).toBeNull();
    expect(screen.getAllByRole("group")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "같은 뜻" }));
    fireEvent.click(screen.getByRole("button", { name: "다름" }));
    expect(onJudge.mock.calls).toEqual([
      ["p0#1", "same"],
      ["p0#1", "different"],
    ]);
  });
});
