import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListeningTeacherWorkspace,
  type ListeningTeacherWorkspaceProps,
} from "@/components/english/listening/ListeningTeacherWorkspace";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(overrides: Partial<ListeningTeacherWorkspaceProps> = {}) {
  const document = englishListeningFixture();
  const props: ListeningTeacherWorkspaceProps = {
    materials: [document, { id: "second", title: "다음 자료", level: "고등" }],
    selectedDocument: document,
    mediaUrlsByAssetId: {
      [document.groups[0].audio.assetId]:
        "https://media.example/authorized.wav",
    },
    onSelectMaterial: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<ListeningTeacherWorkspace {...props} />),
    props,
    document,
  };
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ListeningTeacherWorkspace", () => {
  it("uses authorized audio only after explicit play and retries a rejected play", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new Error("blocked"),
    );
    const { container } = setup();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      container.querySelector("[data-workspace-page-header]"),
    ).toHaveTextContent("영어듣기");
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "https://media.example/authorized.wav",
    );
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "음원을 재생하지 못했습니다",
    );
    fireEvent.click(screen.getByRole("button", { name: "재생 다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "일시정지" }),
    ).toBeEnabled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "일시정지" }));
    expect(screen.getByRole("button", { name: "재생" })).toBeEnabled();
  });

  it("seeks, replays from the beginning, and reports native audio errors", async () => {
    const { container } = setup();
    const audio = container.querySelector("audio")!;
    fireEvent.change(screen.getByRole("slider", { name: "재생 위치" }), {
      target: { value: "6" },
    });
    expect(audio.currentTime).toBe(6);
    fireEvent.click(screen.getByRole("button", { name: "처음부터 재생" }));
    await waitFor(() =>
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce(),
    );
    expect(audio.currentTime).toBe(0);
    fireEvent.error(audio);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "음원을 불러오지 못했습니다",
    );
    fireEvent.click(screen.getByRole("button", { name: "재생 다시 시도" }));
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    await screen.findByRole("button", { name: "일시정지" });
  });

  it("has no audio source or enabled playback controls without supplied media", () => {
    const { container } = setup({ mediaUrlsByAssetId: {} });
    expect(container.querySelector("audio")).toBeNull();
    expect(screen.getByText("재생할 음원이 없습니다.")).toBeVisible();
    expect(screen.getByRole("button", { name: "재생" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "처음부터 재생" }),
    ).toBeDisabled();
    expect(screen.getByRole("slider", { name: "재생 위치" })).toBeDisabled();
  });

  it("shows questions and toggles teacher transcript, translation, answers and explanations", () => {
    const { document } = setup();
    const group = document.groups[0];
    expect(
      screen.getByText(group.questions[0].prompt, { exact: false }),
    ).toBeVisible();
    expect(screen.queryByText(group.transcript.text)).not.toBeInTheDocument();
    expect(
      screen.queryByText(group.questions[0].explanation),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "대본과 정답 보기" }));
    expect(screen.getByText(group.transcript.text)).toBeVisible();
    expect(screen.getByText(group.transcript.translation!)).toBeVisible();
    expect(screen.getByText(group.questions[0].explanation)).toBeVisible();
    expect(screen.getByText("정답 1 · 9시")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "대본과 정답 닫기" }));
    expect(screen.queryByText(group.transcript.text)).not.toBeInTheDocument();
  });

  it("pauses old audio and discards late play completion on document revision changes", async () => {
    const pending = deferred();
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      pending.promise,
    );
    const { container, rerender, props, document } = setup();
    const oldAudio = container.querySelector("audio")!;
    const oldPause = vi.spyOn(oldAudio, "pause");
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    rerender(
      <ListeningTeacherWorkspace
        {...props}
        selectedDocument={{ ...document, revision: 2 }}
      />,
    );
    expect(oldPause).toHaveBeenCalled();
    await act(async () => pending.resolve());
    expect(screen.getByRole("button", { name: "재생" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "일시정지" }),
    ).not.toBeInTheDocument();
  });

  it("cancels selection requests and ignores stale errors after another selection", async () => {
    const first = deferred();
    const second = deferred();
    const select = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { props, rerender, document } = setup({ onSelectMaterial: select });
    fireEvent.click(screen.getByRole("button", { name: /다음 자료/ }));
    const signal = select.mock.calls[0][1].signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: /짧은 대화와 안내/ }));
    expect(signal.aborted).toBe(true);
    await act(async () => first.reject(new Error("late selection failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(
      <ListeningTeacherWorkspace
        {...props}
        selectedDocument={{ ...document, id: "second", title: "다음 자료" }}
      />,
    );
    expect(select.mock.calls[1][1].signal.aborted).toBe(true);
    await act(async () => second.reject(new Error("late second failure")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pauses playback as soon as selection begins, before its callback settles", async () => {
    const selection = deferred();
    const { container } = setup({ onSelectMaterial: () => selection.promise });
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    await screen.findByRole("button", { name: "일시정지" });
    const oldPause = vi.spyOn(container.querySelector("audio")!, "pause");
    fireEvent.click(screen.getByRole("button", { name: /다음 자료/ }));
    expect(oldPause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "재생" })).toBeDisabled();
    await act(async () => selection.resolve());
    expect(screen.getByRole("button", { name: "재생" })).toBeEnabled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it("switches question groups and isolates a replaced media URL from late rejection", async () => {
    const playback = deferred();
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      playback.promise,
    );
    const { props, rerender, document, container } = setup();
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    const oldPause = vi.spyOn(container.querySelector("audio")!, "pause");
    rerender(
      <ListeningTeacherWorkspace
        {...props}
        mediaUrlsByAssetId={{
          [document.groups[0].audio.assetId]:
            "https://media.example/refreshed.wav",
        }}
      />,
    );
    expect(oldPause).toHaveBeenCalled();
    await act(async () => playback.reject(new Error("expired old URL")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "https://media.example/refreshed.wav",
    );
    fireEvent.click(screen.getByRole("button", { name: "묶음 2 · 1문항" }));
    expect(
      screen.getByText(document.groups[1].questions[0].prompt, {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      screen.queryByText(document.groups[0].questions[0].prompt, {
        exact: false,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("재생할 음원이 없습니다.")).toBeVisible();
  });

  it("retries failed selection and optional action callbacks without claiming local persistence", async () => {
    const select = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const publish = vi
      .fn()
      .mockRejectedValueOnce(new Error("not reviewed"))
      .mockResolvedValueOnce(undefined);
    const { document } = setup({
      onSelectMaterial: select,
      onPublish: publish,
    });
    fireEvent.click(screen.getByRole("button", { name: /다음 자료/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "자료를 불러오지 못했습니다",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(select).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "발행하지 못했습니다",
    );
    expect(publish.mock.calls[0][0]).toBe(document);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("발행 완료")).not.toBeInTheDocument();
  });

  it("aborts a pending action on selection and does not attach its error to the new document", async () => {
    const pending = deferred();
    const edit = vi.fn().mockReturnValue(pending.promise);
    const { props, rerender, document } = setup({ onEdit: edit });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: /다음 자료/ }));
    expect(edit.mock.calls[0][1].signal.aborted).toBe(true);
    rerender(
      <ListeningTeacherWorkspace
        {...props}
        selectedDocument={{ ...document, id: "second", title: "다음 자료" }}
      />,
    );
    await act(async () => pending.reject(new Error("late edit")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeEnabled();
  });

  it("supports empty selection and only renders provided actions", async () => {
    const create = vi.fn();
    setup({ selectedDocument: null, materials: [], onCreate: create });
    expect(screen.getByText("등록된 듣기 자료가 없습니다.")).toBeVisible();
    expect(screen.getByText("듣기 자료를 선택하세요.")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "수정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "발행" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "자료 만들기" }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
  });
});
