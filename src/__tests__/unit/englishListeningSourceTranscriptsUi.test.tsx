import { randomUUID } from "node:crypto";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeningBankMaterial from "@/components/english/bank/ListeningBankMaterial";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import type { ListeningSourceTranscriptsResponse } from "@/contracts/englishListeningTranscript.contract";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/listening/listeningClient", () => ({
  listeningRequest: request,
  listeningError: (error: Error) => error.message,
}));
let source: ListeningComposeSource;
let transcripts: ListeningSourceTranscriptsResponse;
function view(setId = source.detail.id) {
  return (
    <ListeningBankMaterial active setId={setId} onOpenListening={vi.fn()} />
  );
}
async function expand(container: HTMLElement, index = 0) {
  const details = container.querySelectorAll<HTMLDetailsElement>(
    "details[data-source-transcript]",
  )[index];
  await act(async () => {
    details.open = true;
    fireEvent(details, new Event("toggle"));
  });
  return details;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const document = englishListeningFixture();
  document.id = randomUUID();
  document.title = "전체 원본 듣기 자료";
  document.source = {
    kind: "national_listening",
    provider: "공식 평가",
    year: 2024,
    round: 1,
    month: null,
    originalFilename: "original.mp3",
  };
  source = {
    documentHash: "a".repeat(64),
    detail: {
      id: document.id,
      revision: 1,
      document,
      publications: [],
      mediaUrlsByAssetId: Object.fromEntries(
        document.groups.map((group) => [group.audio.assetId, "/original.mp3"]),
      ),
    },
  };
  transcripts = {
    setId: document.id,
    items: document.groups.flatMap((group) => [
      {
        id: randomUUID(),
        assetId: group.audio.assetId,
        profile: "english" as const,
        origin: "ai_transcription" as const,
        reviewStatus: "ai_unreviewed" as const,
        text: "AI original English speech.",
        durationMs: group.audio.durationMs,
        generatedAt: "2026-10-05T14:00:00.000Z",
        excludedWordCount: 0,
        timingReviewNeeded: false,
        segments: [
          { startMs: 2000, endMs: 3000, text: "AI original English speech." },
        ],
      },
      {
        id: randomUUID(),
        assetId: group.audio.assetId,
        profile: "bilingual" as const,
        origin: "ai_transcription" as const,
        reviewStatus: "ai_unreviewed" as const,
        text: "한국어 English speech.",
        durationMs: group.audio.durationMs,
        generatedAt: "2026-10-05T14:00:00.000Z",
        excludedWordCount: 0,
        timingReviewNeeded: false,
        segments: [],
      },
    ]),
  };
  request.mockImplementation(async (path: string) =>
    path.endsWith("/source-transcripts")
      ? transcripts
      : path === "/compose"
        ? source.detail
        : source,
  );
});
afterEach(() => cleanup());
describe("teacher bank lazy source transcript display", () => {
  it("loads only on expansion and deduplicates one set request across audio groups", async () => {
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    expect(request).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("AI original English speech."),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll("details[data-source-transcript]"),
    ).toHaveLength(2);
    await expand(container);
    await screen.findByText("AI original English speech.");
    await expand(container, 1);
    await waitFor(() =>
      expect(screen.getAllByText("AI original English speech.")).toHaveLength(
        2,
      ),
    );
    expect(
      request.mock.calls.filter(([path]) =>
        path.endsWith("/source-transcripts"),
      ),
    ).toHaveLength(1);
    const bilingual = screen
      .getAllByText(/한국어·영어 전사 보기/)[0]
      .closest("details");
    expect(bilingual).not.toHaveAttribute("open");
    expect(screen.getAllByText("AI 음성 전사 · 미검수").length).toBeGreaterThan(
      0,
    );
  });
  it("seeks the same original whole audio and continues beyond the estimated paragraph end", async () => {
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    await expand(container);
    const audio = container.querySelector("audio")!;
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    pause.mockClear();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "AI 추정 0:02부터 전체 원본 이어 듣기",
      }),
    );
    fireEvent.loadedMetadata(audio);
    expect(audio.currentTime).toBe(2);
    expect(audio).toHaveAttribute("src", "/original.mp3");
    audio.currentTime = 8;
    fireEvent.timeUpdate(audio);
    expect(pause).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/검증된 문항 시작점이 아닙니다/),
    ).toBeInTheDocument();
    Object.defineProperty(audio, "readyState", { value: 1 });
    fireEvent.click(
      screen.getByRole("button", {
        name: "AI 추정 0:02부터 전체 원본 이어 듣기",
      }),
    );
    expect(audio.currentTime).toBe(2);
  });
  it("preserves existing official script, questions, reviews and basket composition", async () => {
    const before = structuredClone(source.detail.document);
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    const official = screen
      .getAllByText("기존 대본 보기")[0]
      .closest("details")!;
    expect(official.textContent).toContain(before.groups[0].transcript.text);
    await expand(container);
    await screen.findByText("AI original English speech.");
    fireEvent.click(screen.getByRole("button", { name: "전체 회차 담기" }));
    expect(
      screen.getByRole("heading", { name: "담은 문항 · 3문항" }),
    ).toBeInTheDocument();
    expect(source.detail.document).toEqual(before);
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
    const payload = request.mock.calls.find(
      ([path]) => path === "/compose",
    )![3];
    expect(JSON.stringify(payload)).not.toMatch(
      /AI original|transcripts|segments|words/,
    );
    expect(
      payload.selections.every(
        (selection: { audioMode: string }) =>
          selection.audioMode === "whole_source",
      ),
    ).toBe(true);
  });
  it("offers retry for failures without eager requests on other sources", async () => {
    request.mockImplementation(async (path: string) => {
      if (path.endsWith("/source-transcripts"))
        throw new Error("전사를 불러올 수 없습니다.");
      return source;
    });
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    await expand(container);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "전사를 불러올 수 없습니다.",
    );
    request.mockImplementation(async (path: string) =>
      path.endsWith("/source-transcripts") ? transcripts : source,
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText("AI original English speech.");
    expect(
      request.mock.calls.filter(([path]) =>
        path.endsWith("/source-transcripts"),
      ),
    ).toHaveLength(2);
  });
  it("labels timing review and displays text with paragraph seek disabled after duration mismatch", async () => {
    transcripts.items[0] = {
      ...transcripts.items[0],
      timingReviewNeeded: true,
      segments: [],
    };
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    await expand(container);
    expect(
      await screen.findByText("AI original English speech."),
    ).toBeInTheDocument();
    expect(screen.getByText(/AI 전사 시각 확인 필요/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /AI 추정/ }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/original.mp3",
    );
  });
  it("labels mathematically excluded words while keeping remaining estimated paragraph playback", async () => {
    transcripts.items[0] = {
      ...transcripts.items[0],
      timingReviewNeeded: true,
      excludedWordCount: 2,
    };
    const { container } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    await expand(container);
    expect(
      await screen.findByText(/단어 2개를 제외했습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "AI 추정 0:02부터 전체 원본 이어 듣기",
      }),
    ).toBeInTheDocument();
  });
  it("ignores and aborts a late response after a source change", async () => {
    let resolve!: (value: ListeningSourceTranscriptsResponse) => void;
    request.mockImplementation(async (path: string) =>
      path.endsWith("/source-transcripts")
        ? new Promise<ListeningSourceTranscriptsResponse>((done) => {
            resolve = done;
          })
        : source,
    );
    const old = transcripts;
    const { container, rerender } = render(view());
    await screen.findByRole("heading", { name: source.detail.document.title });
    await expand(container);
    const signal = request.mock.calls.find(([path]) =>
      path.endsWith("/source-transcripts"),
    )![1] as AbortSignal;
    source = {
      ...source,
      documentHash: "b".repeat(64),
      detail: {
        ...source.detail,
        id: randomUUID(),
        document: { ...source.detail.document, title: "다른 원본 자료" },
      },
    };
    rerender(view());
    await screen.findByRole("heading", { name: "다른 원본 자료" });
    await act(async () => resolve(old));
    expect(signal.aborted).toBe(true);
    expect(
      screen.queryByText("AI original English speech."),
    ).not.toBeInTheDocument();
    expect(
      request.mock.calls.filter(([path]) =>
        path.endsWith("/source-transcripts"),
      ),
    ).toHaveLength(1);
  });
});
