import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeningBank from "@/components/english/bank/ListeningBank";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/bank/bankClient", () => ({
  bankUrl: (path: string, params: Record<string, unknown>) =>
    `${path}?${new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [key, String(value)]),
    )}`,
  useBankQuery: query,
}));
vi.mock("@/components/english/bank/ListeningBankMaterial", () => ({
  default: ({ setId }: { setId: string }) => (
    <div data-testid="selected-material">{setId}</div>
  ),
}));
vi.mock("@/components/english/bank/ListeningAssessmentImport", () => ({
  ListeningAssessmentImport: () => <div>직접 제작 파일 등록</div>,
}));
beforeEach(() => {
  query.mockReset();
  query.mockReturnValue({
    status: "ready",
    data: {
      data: [
        {
          id: "own-set",
          title: "자체 제작 대화",
          level: "중1",
          groupCount: 1,
          publicationCount: 0,
          questionCount: 3,
        },
      ],
      meta: { nextCursor: null },
    },
  });
});
afterEach(() => cleanup());
describe("own listening bank UI", () => {
  it("loads own material by default without a reference dropdown option, link or fetch", () => {
    render(<ListeningBank active onOpenListening={vi.fn()} />);
    expect(
      screen.getByRole("option", { name: "내 범위의 듣기 자료" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /EBS|공식 원본/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /EBS/ })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/전국 듣기평가|모의고사 원본|공식 참조/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /자체 제작 대화/ }));
    expect(screen.getByTestId("selected-material")).toHaveTextContent(
      "own-set",
    );
    expect(
      query.mock.calls.every(([url]) =>
        url.startsWith("/api/english/listening/bank?"),
      ),
    ).toBe(true);
  });
  it("filters authored and own reconstructed questions through the bank only", () => {
    render(<ListeningBank active onOpenListening={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox", { name: "듣기 출처" }), {
      target: { value: "authored" },
    });
    expect(query.mock.calls.at(-1)![0]).toContain("origin=teacher_authored");
    fireEvent.change(screen.getByRole("combobox", { name: "듣기 출처" }), {
      target: { value: "reconstructed" },
    });
    expect(query.mock.calls.at(-1)![0]).toContain("origin=audio_reconstructed");
    expect(query.mock.calls.some(([url]) => url.includes("references"))).toBe(
      false,
    );
  });
  it("shows the empty own-content state", () => {
    query.mockReturnValue({
      status: "ready",
      data: { data: [], meta: { nextCursor: null } },
    });
    render(<ListeningBank active onOpenListening={vi.fn()} />);
    expect(
      screen.getByText("조건에 맞는 듣기 자료가 없습니다."),
    ).toBeInTheDocument();
  });
});
