import { randomUUID } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ListeningBankMaterial from "@/components/english/bank/ListeningBankMaterial";
import { ListeningDraftEditor } from "@/components/english/listening/ListeningDraftEditor";
import { TeacherWorkbench } from "@/components/english/listening/ListeningTeacherWorkspace";
import { editListeningDraft } from "@/components/english/listening/listeningDraft";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/listening/listeningClient", () => ({
  listeningRequest: request,
  listeningError: (error: Error) => error.message,
}));

type Metadata = NonNullable<
  EnglishListeningDocument["groups"][number]["questions"][number]["metadata"]
>;
function nationalMetadata(
  assessmentKind: Metadata["assessmentKind"],
  sourceRecordId: string | null = null,
): Metadata {
  return {
    schemaVersion: 1,
    origin: "official_original",
    sourceRecordId,
    assessmentKind,
    provider: null,
    year: null,
    round: null,
    month: null,
    level: null,
    sourceNumber: null,
    sourceAudioSha256: null,
    sourceQuestionSha256: null,
    questionType: "unknown",
    topics: [],
    keywords: [],
    classification: { method: "unclassified", model: null, confidence: null },
    reconstruction: null,
  };
}
function makeSource(
  title: string,
  ranges = true,
): ListeningComposeSource & { detail: { document: EnglishListeningDocument } } {
  const document = englishListeningFixture();
  document.id = randomUUID();
  document.title = title;
  document.groups = [document.groups[0]];
  document.groups[0].questions.forEach((question, index) => {
    if (ranges)
      question.audioRange = {
        startMs: index * 8000,
        endMs: Math.min(
          (index + 1) * 8000,
          document.groups[0].audio.durationMs,
        ),
      };
    else delete question.audioRange;
  });
  return {
    documentHash: "a".repeat(64),
    detail: {
      id: document.id,
      revision: 1,
      document,
      publications: [],
      mediaUrlsByAssetId: {
        [document.groups[0].audio.assetId]: "/original.mp3",
      },
    },
  };
}
function setNationalSource(
  document: EnglishListeningDocument,
  kind: "national_listening" | "mock_exam",
) {
  document.source = {
    kind,
    provider: "공식 평가",
    year: 2022,
    round: 1,
    month: null,
    originalFilename: "original.mp3",
  };
}
function renderBank(source: ListeningComposeSource) {
  request.mockImplementation(async (path: string) =>
    path === "/compose" ? source.detail : source,
  );
  return render(
    <ListeningBankMaterial
      active
      setId={source.detail.id}
      onOpenListening={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

describe("whole original national assessment audio UI", () => {
  it.each(["national_listening", "mock_exam"] as const)(
    "seeks the original %s audio to a question start and continues beyond the former range end",
    async (kind) => {
      const source = makeSource("전국 전체 이어 듣기");
      setNationalSource(source.detail.document, kind);
      source.detail.document.groups[0].questions[0].audioRange = {
        startMs: 2000,
        endMs: 5000,
      };
      const { container } = renderBank(source);
      await screen.findByRole("heading", { name: "전국 전체 이어 듣기" });
      const audio = container.querySelector("audio")!;
      const pause = vi.mocked(HTMLMediaElement.prototype.pause);
      pause.mockClear();
      const seek = screen.getByRole("button", { name: "0:02부터 이어 듣기" });
      fireEvent.click(seek);
      fireEvent.loadedMetadata(audio);
      expect(audio.currentTime).toBe(2);
      audio.currentTime = 6;
      fireEvent.timeUpdate(audio);
      expect(pause).not.toHaveBeenCalled();
      Object.defineProperty(audio, "readyState", { value: 1 });
      fireEvent.click(seek);
      expect(audio.currentTime).toBe(2);
      audio.currentTime = 6;
      fireEvent.timeUpdate(audio);
      expect(pause).not.toHaveBeenCalled();
      expect(audio).toHaveAttribute("src", "/original.mp3");
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["national_listening", "mock_exam"] as const)(
    "keeps %s question selection while hiding range playback and repeated missing-range messages",
    async (kind) => {
      const source = makeSource("전국 평가", false);
      setNationalSource(source.detail.document, kind);
      const { container } = renderBank(source);
      await screen.findByRole("heading", { name: "전국 평가" });
      expect(screen.getAllByText("회차 전체 원본 음원")).toHaveLength(1);
      expect(container.querySelector("audio")).toHaveAttribute(
        "src",
        "/original.mp3",
      );
      expect(
        screen.queryByRole("button", { name: /문항 듣기/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/개별 음원 구간 미지정/),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getAllByRole("checkbox")[0]);
      fireEvent.click(screen.getByRole("button", { name: "선택 1문항 담기" }));
      expect(
        screen.queryByRole("checkbox", { name: /구간 미지정 문항/ }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
      );
      await waitFor(() =>
        expect(
          request.mock.calls.find((call) => call[0] === "/compose")?.[3]
            .selections[0],
        ).toMatchObject({
          audioMode: "whole_source",
          questionIds: [source.detail.document.groups[0].questions[0].id],
        }),
      );
    },
  );

  it.each([
    nationalMetadata("national_listening"),
    nationalMetadata("mock_exam"),
    nationalMetadata(null, "ebs-middle-2022-1"),
    nationalMetadata(null, "ebsi-high-2022-09"),
  ])(
    "keeps whole-source selection and question-start shortcuts when national metadata survives assembly: %j",
    async (metadata) => {
      const source = makeSource("합본 전국 문항");
      source.detail.document.groups[0].questions[0].metadata = metadata;
      renderBank(source);
      await screen.findByRole("heading", { name: "합본 전국 문항" });
      expect(
        screen.queryByRole("button", { name: /문항 듣기/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /부터 이어 듣기/ }),
      ).toHaveLength(2);
      fireEvent.click(screen.getByRole("button", { name: "전체 회차 담기" }));
      fireEvent.click(
        screen.getByRole("button", { name: "합본 전국 문항 2번 빼기" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
      );
      await waitFor(() =>
        expect(
          request.mock.calls.find((call) => call[0] === "/compose")?.[3]
            .selections[0],
        ).toMatchObject({
          audioMode: "whole_source",
          questionIds: [source.detail.document.groups[0].questions[0].id],
        }),
      );
    },
  );

  it("forces national whole audio after a generic clip preference and a source change", async () => {
    const custom = makeSource("직접 제작", false);
    const national = makeSource("전국 평가 원본");
    setNationalSource(national.detail.document, "national_listening");
    request.mockImplementation(async (path: string) =>
      path === "/compose"
        ? national.detail
        : path.includes(custom.detail.id)
          ? custom
          : national,
    );
    const view = render(
      <ListeningBankMaterial
        active
        setId={custom.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "직접 제작" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 1문항 담기" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /구간 미지정 문항/ }));
    expect(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    ).toBeDisabled();
    view.rerender(
      <ListeningBankMaterial
        active
        setId={national.detail.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "전국 평가 원본" });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 1문항 담기" }));
    fireEvent.click(screen.getByRole("button", { name: "직접 제작 1번 빼기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    );
    await waitFor(() =>
      expect(
        request.mock.calls.find((call) => call[0] === "/compose")?.[3]
          .selections[0].audioMode,
      ).toBe("whole_source"),
    );
  });

  it("keeps custom group seeking and clipping in a mixed assembled paper", async () => {
    const source = makeSource("혼합 시험지");
    const custom = makeSource("직접 제작").detail.document.groups[0];
    custom.id = randomUUID();
    custom.questions.forEach((question) => {
      question.id = randomUUID();
    });
    source.detail.document.groups[0].questions[0].metadata =
      nationalMetadata("mock_exam");
    source.detail.document.groups.push(custom);
    const { container } = renderBank(source);
    await screen.findByRole("heading", { name: "혼합 시험지" });
    expect(screen.getAllByText("회차 전체 원본 음원")).toHaveLength(1);
    const rangeButtons = screen.getAllByRole("button", { name: /문항 듣기/ });
    expect(rangeButtons).toHaveLength(2);
    fireEvent.click(rangeButtons[1]);
    const audio = container.querySelectorAll("audio")[1];
    fireEvent.loadedMetadata(audio);
    expect(audio.currentTime).toBe(8);
    audio.currentTime = 15;
    fireEvent.timeUpdate(audio);
    expect(
      vi.mocked(HTMLMediaElement.prototype.pause).mock.instances,
    ).toContain(audio);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole("button", { name: "선택 2문항 담기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "담은 문항으로 시험지 만들기" }),
    );
    await waitFor(() => {
      const selections = request.mock.calls.find(
        (call) => call[0] === "/compose",
      )?.[3].selections;
      expect(selections?.[0].audioMode).toBe("whole_source");
      expect(selections?.[1]).toBeDefined();
      expect(selections?.[1]).not.toHaveProperty("audioMode");
    });
  });

  it.each(["national_listening", "mock_exam"] as const)(
    "hides %s editor clipping inputs without changing questions or evidence",
    (kind) => {
      const source = makeSource("전국 원본 편집");
      setNationalSource(source.detail.document, kind);
      const draft = editListeningDraft(source.detail.document);
      const setDraft = vi.fn();
      render(
        <ListeningDraftEditor
          draft={draft}
          source={source.detail.document.source}
          setDraft={setDraft}
          saved
          busy={false}
          mediaUrls={source.detail.mediaUrlsByAssetId}
          onSave={vi.fn()}
          onUpload={vi.fn()}
          onClose={vi.fn()}
          onConfirmRights={vi.fn()}
          rightsReviewed
        />,
      );
      expect(screen.getAllByText(/회차 전체 원본 음원/)).toHaveLength(1);
      expect(
        screen.queryByLabelText(/전체 음원 (시작|끝)/),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("묶음 1 문항 1 문제")).toHaveValue(
        draft.groups[0].questions[0].prompt,
      );
      expect(
        screen.getAllByText("정답 근거 구간 · 초 단위로 입력", {
          exact: false,
        }),
      ).toHaveLength(draft.groups[0].questions.length);
      expect(setDraft).not.toHaveBeenCalled();
      expect(draft.groups[0].questions[0].audioRange).toBeDefined();
    },
  );

  it("keeps custom editor ranges and teacher playback in mixed groups", () => {
    const source = makeSource("혼합 원본 편집");
    const custom = makeSource("직접 제작").detail.document.groups[0];
    custom.id = randomUUID();
    custom.questions.forEach((question) => {
      question.id = randomUUID();
    });
    source.detail.document.groups[0].questions[0].metadata = nationalMetadata(
      null,
      "ebsi-high-2022-09",
    );
    source.detail.document.groups.push(custom);
    const draft = editListeningDraft(source.detail.document);
    const setDraft = vi.fn();
    const editor = render(
      <ListeningDraftEditor
        draft={draft}
        setDraft={setDraft}
        saved
        busy={false}
        mediaUrls={source.detail.mediaUrlsByAssetId}
        onSave={vi.fn()}
        onUpload={vi.fn()}
        onClose={vi.fn()}
        onConfirmRights={vi.fn()}
        rightsReviewed
      />,
    );
    expect(
      screen.queryByLabelText("묶음 1 문항 1 전체 음원 시작 (초)"),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("묶음 2 문항 1 전체 음원 시작 (초)"),
      { target: { value: "3" } },
    );
    expect(
      setDraft.mock.calls[0][0](draft).groups[1].questions[0].audioRange
        .startMs,
    ).toBe(3000);
    editor.unmount();
    render(
      <TeacherWorkbench
        document={source.detail.document}
        mediaUrlsByAssetId={source.detail.mediaUrlsByAssetId}
        playbackEpoch={0}
        busy={false}
      />,
    );
    expect(screen.getByText("회차 전체 원본 음원")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "묶음 2 · 2문항" }));
    expect(screen.queryByText("회차 전체 원본 음원")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "재생" })).toBeEnabled();
  });
});
