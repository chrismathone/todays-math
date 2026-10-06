import { randomUUID } from "node:crypto";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeningBankMaterial from "@/components/english/bank/ListeningBankMaterial";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/listening/listeningClient", () => ({
  listeningRequest: request,
  listeningError: (error: Error) => error.message,
}));
let source: ListeningComposeSource;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const document = englishListeningFixture();
  document.id = randomUUID();
  document.title = "직접 작성한 듣기 자료";
  source = {
    documentHash: "a".repeat(64),
    detail: {
      id: document.id,
      revision: 1,
      document,
      publications: [],
      mediaUrlsByAssetId: Object.fromEntries(
        document.groups.map((group) => [group.audio.assetId, "/own-audio.mp3"]),
      ),
    },
  };
  request.mockImplementation(async (path: string) => {
    if (path.endsWith("/source-transcripts"))
      throw new Error("Internal transcripts must not be fetched");
    return path === "/compose" ? source.detail : source;
  });
});
afterEach(() => cleanup());
describe("bank keeps source ASR internal", () => {
  it("renders own audio and authored scripts without an ASR panel or request", async () => {
    const { container } = render(
      <ListeningBankMaterial
        active
        setId={source.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: source.detail.document.title });
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/own-audio.mp3",
    );
    expect(
      container.querySelector("details[data-source-transcript]"),
    ).toBeNull();
    expect(
      screen.queryByText(/AI 음성 전사|영어 전사 보기|한국어·영어 전사 보기/),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText("기존 대본 보기")[0].closest("details")!.textContent,
    ).toContain(source.detail.document.groups[0].transcript.text);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      `/sets/${source.detail.id}/compose-source`,
      expect.any(AbortSignal),
    );
  });
  it("preserves own questions and basket composition without requesting source transcripts", async () => {
    const before = structuredClone(source.detail.document);
    render(
      <ListeningBankMaterial
        active
        setId={source.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: before.title });
    fireEvent.click(screen.getByRole("button", { name: "전체 회차 담기" }));
    expect(
      screen.getByRole("heading", { name: "담은 문항 · 3문항" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/compose",
        expect.any(AbortSignal),
        "POST",
        expect.any(Object),
      ),
    );
    expect(source.detail.document).toEqual(before);
    expect(
      request.mock.calls.some(([path]) => path.endsWith("/source-transcripts")),
    ).toBe(false);
  });
});
