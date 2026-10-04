import { randomUUID } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import ListeningBankMaterial from "@/components/english/bank/ListeningBankMaterial";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/listening/listeningClient", () => ({
  listeningRequest: request,
  listeningError: (error: Error) => error.message,
}));
function source(title: string, ranges = true): ListeningComposeSource {
  const document = englishListeningFixture();
  document.id = randomUUID();
  document.title = title;
  document.groups = [document.groups[0]];
  document.groups[0].id = randomUUID();
  document.groups[0].questions = document.groups[0].questions.map(
    (question, index) => ({
      ...question,
      id: randomUUID(),
      ...(ranges
        ? { audioRange: { startMs: index * 8000, endMs: index ? 15000 : 8000 } }
        : {}),
    }),
  );
  return {
    documentHash: "a".repeat(64),
    detail: {
      id: document.id,
      revision: 1,
      document,
      publications: [],
      mediaUrlsByAssetId: { [document.groups[0].audio.assetId]: "/api/audio" },
    },
  };
}
describe("listening material basket", () => {
  beforeEach(() => {
    request.mockReset();
  });
  it("keeps individual selections across source changes and adds a complete second round", async () => {
    const first = source("1회 평가"),
      second = source("2회 평가");
    const created: ListeningSetDetail = {
      ...first.detail,
      id: randomUUID(),
      document: {
        ...first.detail.document,
        title: "만든 시험",
        rightsReview: null,
      },
    };
    request.mockImplementation(
      async (path: string, _signal: AbortSignal, method: string) => {
        if (path === `/sets/${first.detail.id}/compose-source`) return first;
        if (path === `/sets/${second.detail.id}/compose-source`) return second;
        if (path === "/compose" && method === "POST") return created;
        if (path === `/sets/${created.id}/review`)
          return {
            ...created,
            revision: 2,
            document: {
              ...created.document,
              rightsReview: first.detail.document.rightsReview,
            },
          };
        throw new Error("unexpected path " + path);
      },
    );
    const view = render(
      <ListeningBankMaterial
        active
        setId={first.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "1회 평가" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 1문항 담기" }));
    expect(
      screen.getByRole("heading", { name: "담은 문항 · 1문항" }),
    ).toBeInTheDocument();
    view.rerender(
      <ListeningBankMaterial
        active
        setId={second.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "2회 평가" });
    fireEvent.click(screen.getByRole("button", { name: "전체 회차 담기" }));
    expect(
      screen.getByRole("heading", { name: "담은 문항 · 3문항" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    );
    await screen.findByRole("heading", { name: "만든 시험" });
    const composeCall = request.mock.calls.find(
      (call) => call[0] === "/compose",
    );
    expect(
      composeCall![3].selections.map(
        (selection: { questionIds: string[] }) => selection.questionIds.length,
      ),
    ).toEqual([1, 2]);
    expect(
      screen.queryByRole("link", { name: "학생용 시험지 인쇄" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "사용 권리 확인" }));
    await screen.findByRole("link", { name: "학생용 시험지 인쇄" });
    expect(
      screen.getByRole("link", { name: "교사용 정답·해설 인쇄" }),
    ).toHaveAttribute("href", expect.stringContaining("revision=2"));
  });
  it("requires full-question timing for a subset and enables full-round assembly without guessed timings", async () => {
    const first = source("구간 없는 원본", false);
    request.mockResolvedValue(first);
    render(
      <ListeningBankMaterial
        active
        setId={first.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "구간 없는 원본" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 1문항 담기" }));
    expect(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    ).toBeDisabled();
    expect(screen.getByText(/전체 음원 구간이 필요합니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체 회차 담기" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "전체 비우기" }));
    expect(
      screen.getByRole("heading", { name: "담은 문항 · 0문항" }),
    ).toBeInTheDocument();
  });
});
