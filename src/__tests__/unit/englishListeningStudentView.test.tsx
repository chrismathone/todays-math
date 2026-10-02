import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnglishListeningStudentView } from "@/contracts/englishListeningStudent.contract";
import {
  ListeningStudentView,
  type ListeningStudentAttemptSnapshot,
  type ListeningStudentViewProps,
} from "@/components/learn/english-listening/ListeningStudentView";

const view: EnglishListeningStudentView = {
  schemaVersion: 1,
  publicationId: "publication-1",
  assignmentId: "assignment-1",
  title: "주말 약속",
  audioSource: "student_device",
  groups: [
    {
      state: "locked",
      id: "group-1",
      audio: { assetId: "audio-1", durationMs: 34000 },
      questions: [
        {
          id: "q1",
          prompt: "두 사람이 만나기로 한 시각은?",
          choices: [
            { id: "a1", text: "At three." },
            { id: "a2", text: "At four." },
          ],
        },
        {
          id: "q2",
          prompt: "남자가 먼저 하기로 한 일은?",
          choices: [
            { id: "b1", text: "Buy the tickets." },
            { id: "b2", text: "Call his sister." },
          ],
        },
      ],
    },
  ],
};
const snapshot = (
  overrides: Partial<ListeningStudentAttemptSnapshot> = {},
): ListeningStudentAttemptSnapshot => ({
  id: "attempt-1",
  revision: 1,
  status: "in_progress",
  serverNow: "2026-10-03T10:00:00Z",
  startedAt: "2026-10-03T09:59:00Z",
  deadlineAt: "2026-10-03T10:04:28Z",
  submittedAt: null,
  answers: [],
  ...overrides,
});
const allAnswers = [
  { questionId: "q1", choiceId: "a2" },
  { questionId: "q2", choiceId: "b1" },
];
const props = (
  overrides: Partial<ListeningStudentViewProps> = {},
): ListeningStudentViewProps => ({
  view,
  mode: "practice",
  attempt: snapshot(),
  media: {
    urlsByAssetId: { "audio-1": "/authorized/audio-1" },
    soundCheckUrl: "/authorized/sound-check",
    playbackPolicy: {
      canPlay: true,
      canPause: false,
      canSeek: false,
      canRepeat: false,
    },
  },
  onStart: vi.fn().mockRejectedValue(new Error("Unexpected start")),
  onCommitAnswer: vi.fn().mockRejectedValue(new Error("Unexpected answer")),
  onSubmit: vi.fn().mockRejectedValue(new Error("Unexpected submit")),
  ...overrides,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function selectAndCommit() {
  fireEvent.click(screen.getByRole("radio", { name: /At four/ }));
  fireEvent.click(screen.getByRole("button", { name: "답 확정" }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ListeningStudentView", () => {
  it("shows one question, keeps selection unsaved, and locks the first answer only after acknowledgement", async () => {
    const pending = deferred<ListeningStudentAttemptSnapshot>();
    const onCommitAnswer = vi.fn().mockReturnValue(pending.promise);
    render(<ListeningStudentView {...props({ onCommitAnswer })} />);
    expect(
      screen.queryByText("남자가 먼저 하기로 한 일은?"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /At four/ }));
    expect(onCommitAnswer).not.toHaveBeenCalled();
    expect(screen.getByText("0 / 2 답 저장")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "답 확정" }));
    expect(screen.getByText("답 저장 중…")).toBeInTheDocument();
    expect(
      screen.queryByText("저장 완료 · 확정한 답은 바꿀 수 없습니다."),
    ).not.toBeInTheDocument();
    expect(onCommitAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "attempt-1",
        expectedRevision: 1,
        questionId: "q1",
        choiceId: "a2",
        requestId: expect.any(String),
      }),
    );
    await act(async () =>
      pending.resolve(snapshot({ revision: 2, answers: [allAnswers[0]] })),
    );
    expect(screen.getByText("1 / 2 답 저장")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /At three/ })).toBeDisabled();
    expect(screen.queryByText("대본과 해설")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
    expect(screen.getByText("남자가 먼저 하기로 한 일은?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이전 문항" }));
    expect(screen.getByRole("radio", { name: /At four/ })).toBeChecked();
  });

  it("retries an ambiguous save failure with the exact same request and cannot change the first answer", async () => {
    const pending = deferred<ListeningStudentAttemptSnapshot>();
    const onCommitAnswer = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(pending.promise);
    render(<ListeningStudentView {...props({ onCommitAnswer })} />);
    selectAndCommit();
    expect(
      await screen.findByText(/답 저장을 확인하지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /At three/ })).toBeDisabled();
    expect(screen.getByText("0 / 2 답 저장")).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "답 저장 다시 시도" });
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(onCommitAnswer).toHaveBeenCalledTimes(2);
    expect(onCommitAnswer.mock.calls[1][0]).toEqual(
      onCommitAnswer.mock.calls[0][0],
    );
    await act(async () =>
      pending.resolve(snapshot({ revision: 2, answers: [allAnswers[0]] })),
    );
    expect(screen.getByText("1 / 2 답 저장")).toBeInTheDocument();
  });

  it("requires the callback to return the recorded answer, not merely resolve", async () => {
    render(
      <ListeningStudentView
        {...props({ onCommitAnswer: vi.fn().mockResolvedValue(snapshot()) })}
      />,
    );
    selectAndCommit();
    expect(
      await screen.findByText(/답 저장을 확인하지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("0 / 2 답 저장")).toBeInTheDocument();
  });

  it("submits once, retries with the same key after failure, and never opens review locally", async () => {
    const first = deferred<ListeningStudentAttemptSnapshot>();
    const retry = deferred<ListeningStudentAttemptSnapshot>();
    const onSubmit = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise);
    render(
      <ListeningStudentView
        {...props({ attempt: snapshot({ answers: allAnswers }), onSubmit })}
      />,
    );
    const submit = screen.getByRole("button", { name: "답안 제출" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("제출 완료")).not.toBeInTheDocument();
    expect(screen.queryByText("대본과 해설")).not.toBeInTheDocument();
    await act(async () => first.reject(new Error("offline")));
    fireEvent.click(screen.getByRole("button", { name: "제출 다시 시도" }));
    expect(onSubmit.mock.calls[1][0]).toEqual(onSubmit.mock.calls[0][0]);
    await act(async () =>
      retry.resolve(
        snapshot({
          revision: 2,
          status: "submitted",
          submittedAt: "2026-10-03T10:01:00Z",
          answers: allAnswers,
        }),
      ),
    );
    expect(screen.getByText("제출 완료")).toBeInTheDocument();
    expect(screen.queryByText("대본과 해설")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "답안 제출" })).toBeDisabled();
  });

  it("renders only the review content actually returned in the student DTO", () => {
    const initial = props({ attempt: snapshot({ answers: allAnswers }) });
    const { rerender } = render(<ListeningStudentView {...initial} />);
    expect(screen.queryByText("대본과 해설")).not.toBeInTheDocument();
    const reviewView: EnglishListeningStudentView = {
      ...view,
      audioSource: "student_device",
      groups: [
        {
          ...view.groups[0],
          state: "review",
          audio: { assetId: "audio-1", durationMs: 34000 },
          transcript: {
            text: "Let us meet at four.",
            translation: "네 시에 만나자.",
          },
          questions: view.groups[0].questions.map((q, i) => ({
            ...q,
            answerChoiceId: allAnswers[i].choiceId,
            explanation: `해설 ${i + 1}`,
            evidence: [{ startMs: 0, endMs: 1000 }],
          })),
        },
      ],
    };
    rerender(<ListeningStudentView {...initial} view={reviewView} />);
    expect(screen.getByText("Let us meet at four.")).toBeInTheDocument();
    expect(screen.getByText("해설 1")).toBeInTheDocument();
    expect(screen.queryByText("해설 2")).not.toBeInTheDocument();
  });

  it.each(["answer", "submit"] as const)(
    "ignores a late %s completion from a previous attempt",
    async (kind) => {
      const pending = deferred<ListeningStudentAttemptSnapshot>();
      const initial = props({
        attempt: snapshot({ answers: kind === "submit" ? allAnswers : [] }),
        onCommitAnswer: vi.fn().mockReturnValue(pending.promise),
        onSubmit: vi.fn().mockReturnValue(pending.promise),
      });
      const { rerender } = render(<ListeningStudentView {...initial} />);
      if (kind === "answer") selectAndCommit();
      else fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
      rerender(
        <ListeningStudentView
          {...initial}
          attempt={snapshot({ id: "attempt-2" })}
        />,
      );
      await act(async () =>
        pending.resolve(
          snapshot({
            revision: 2,
            status: "submitted",
            answers: allAnswers,
            submittedAt: "2026-10-03T10:01:00Z",
          }),
        ),
      );
      expect(screen.getByText("0 / 2 답 저장")).toBeInTheDocument();
      expect(screen.queryByText("제출 완료")).not.toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /At four/ })).not.toBeChecked();
    },
  );

  it("does not let an older completion overwrite a newer server snapshot", async () => {
    const pending = deferred<ListeningStudentAttemptSnapshot>();
    const initial = props({
      onCommitAnswer: vi.fn().mockReturnValue(pending.promise),
    });
    const { rerender } = render(<ListeningStudentView {...initial} />);
    selectAndCommit();
    rerender(
      <ListeningStudentView
        {...initial}
        attempt={snapshot({
          revision: 8,
          status: "interrupted",
          answers: allAnswers,
        })}
      />,
    );
    await act(async () =>
      pending.resolve(snapshot({ revision: 2, answers: [allAnswers[0]] })),
    );
    expect(screen.getByText("2 / 2 답 저장")).toBeInTheDocument();
    expect(screen.getByText(/응시가 중단되었습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "답안 제출" })).toBeDisabled();
  });

  it("never reads media URLs or mounts audio for teacher broadcast", () => {
    const urls = vi.fn(() => {
      throw new Error("Must never access student audio");
    });
    const broadcast: EnglishListeningStudentView = {
      ...view,
      audioSource: "teacher_device",
      groups: [
        { state: "locked", id: "group-1", questions: view.groups[0].questions },
      ],
    };
    const media = {
      get urlsByAssetId() {
        return urls();
      },
      get soundCheckUrl() {
        return urls();
      },
      playbackPolicy: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canRepeat: true,
      },
    };
    const { container } = render(
      <ListeningStudentView
        {...props({ view: broadcast, media, mode: "exam" })}
      />,
    );
    expect(container.querySelector("audio")).toBeNull();
    expect(urls).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "재생" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/교실 스피커/)).toBeInTheDocument();
  });

  it("handles rejected sound checks and only starts after explicit confirmation and a server acknowledgement", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new Error("NotAllowedError"),
    );
    const pending = deferred<ListeningStudentAttemptSnapshot>();
    const onStart = vi.fn().mockReturnValue(pending.promise);
    render(
      <ListeningStudentView
        {...props({
          attempt: snapshot({ status: "ready", startedAt: null }),
          onStart,
        })}
      />,
    );
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "학습 시작" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "소리 확인" }));
    expect(
      await screen.findByText(/소리를 재생하지 못했습니다/),
    ).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "소리 확인" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "소리가 들립니다" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "학습 시작" }));
    expect(screen.getByRole("radio", { name: /At four/ })).toBeDisabled();
    await act(async () => pending.resolve(snapshot({ revision: 2 })));
    expect(screen.getByRole("radio", { name: /At four/ })).toBeEnabled();
  });

  it("shows play rejection without claiming playback and lets the student retry", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new Error("NotAllowedError"),
    );
    render(<ListeningStudentView {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    expect(
      await screen.findByText(/소리를 재생하지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByText("재생 중")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    expect(await screen.findByText("재생 중")).toBeInTheDocument();
  });

  it("uses supplied exam policy, has no native controls or autoplay, and permits practice seek and repeat", () => {
    const initial = props({ mode: "exam" });
    const { container, rerender } = render(
      <ListeningStudentView {...initial} />,
    );
    const audio = container.querySelector("audio")!;
    expect(audio).not.toHaveAttribute("controls");
    expect(audio).not.toHaveAttribute("autoplay");
    expect(audio).toHaveAttribute("preload", "none");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "처음부터 다시 듣기" }),
    ).not.toBeInTheDocument();
    rerender(<ListeningStudentView {...initial} mode="practice" />);
    expect(
      screen.getByRole("slider", { name: "재생 위치" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "처음부터 다시 듣기" }),
    ).toBeEnabled();
  });

  it("ignores a late play promise after changing attempts and stops the old audio", async () => {
    const pending = deferred<void>();
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      pending.promise,
    );
    const initial = props();
    const { rerender } = render(<ListeningStudentView {...initial} />);
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    rerender(
      <ListeningStudentView
        {...initial}
        attempt={snapshot({ id: "attempt-2" })}
      />,
    );
    await act(async () => pending.resolve());
    expect(screen.queryByText("재생 중")).not.toBeInTheDocument();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("does not replay an ended exam clip when the supplied policy prohibits repeats", async () => {
    const { container } = render(
      <ListeningStudentView {...props({ mode: "exam" })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    await waitFor(() =>
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1),
    );
    fireEvent.ended(container.querySelector("audio")!);
    expect(screen.getByRole("button", { name: "재생 완료" })).toBeDisabled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("honors enabled exam seek and repeat capabilities without native controls", () => {
    const initial = props();
    render(
      <ListeningStudentView
        {...initial}
        mode="exam"
        media={{
          ...initial.media!,
          playbackPolicy: {
            canPlay: true,
            canPause: true,
            canSeek: true,
            canRepeat: true,
          },
        }}
      />,
    );
    expect(screen.getByRole("slider", { name: "재생 위치" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "처음부터 다시 듣기" }),
    ).toBeEnabled();
  });

  it("does not mark submit as successful when a callback resolves without submitted server status", async () => {
    render(
      <ListeningStudentView
        {...props({
          attempt: snapshot({ answers: allAnswers }),
          onSubmit: vi
            .fn()
            .mockResolvedValue(snapshot({ answers: allAnswers })),
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
    expect(
      await screen.findByText(/제출을 확인하지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByText("제출 완료")).not.toBeInTheDocument();
  });

  it("uses server remaining time without a client deadline lock or countdown", async () => {
    const initial = props({
      mode: "exam",
      attempt: snapshot({ serverNow: "2026-10-03T10:05:00Z" }),
    });
    render(<ListeningStudentView {...initial} />);
    expect(screen.getByText(/남은 시간 00:00/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /At four/ })).toBeEnabled();
    await waitFor(() =>
      expect(screen.getByText(/서버 확인 기준/)).toBeInTheDocument(),
    );
  });

  it("cancels pending playback when policy changes and can play after reauthorization", async () => {
    const pending = deferred<void>();
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      pending.promise,
    );
    const initial = props({ mode: "exam" });
    const { rerender } = render(<ListeningStudentView {...initial} />);
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    rerender(
      <ListeningStudentView
        {...initial}
        media={{
          ...initial.media!,
          playbackPolicy: { ...initial.media!.playbackPolicy, canPlay: false },
        }}
      />,
    );
    await act(async () => pending.resolve());
    expect(screen.queryByText("재생 중")).not.toBeInTheDocument();
    rerender(<ListeningStudentView {...initial} />);
    expect(screen.getByRole("button", { name: "재생" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    await waitFor(() =>
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2),
    );
  });
});
