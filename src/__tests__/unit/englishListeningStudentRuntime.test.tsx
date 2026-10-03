import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListeningAssignment } from "@/components/learn/english-listening/ListeningAssignment";
import {
  newerListeningDetail,
  studentMedia,
} from "@/components/learn/english-listening/runtime";
import type { ListeningStudentDetail } from "@/contracts/englishListeningStudentHttp.contract";

const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = `/api/english/learn/listening/${id(1)}`;
function fixture(): ListeningStudentDetail {
  return {
    view: {
      schemaVersion: 1,
      publicationId: id(2),
      assignmentId: id(1),
      title: "약속 시각",
      audioSource: "teacher_device",
      groups: [
        {
          id: id(3),
          state: "locked",
          questions: [
            {
              id: id(4),
              prompt: "언제 만나나요?",
              choices: [
                { id: id(5), text: "At three." },
                { id: id(6), text: "At four." },
              ],
            },
          ],
        },
      ],
    },
    mode: "practice",
    serverNow: "2026-10-03T08:00:00Z",
    attempt: {
      id: id(7),
      revision: 1,
      status: "in_progress",
      startedAt: "2026-10-03T07:59:00Z",
      deadlineAt: null,
      submittedAt: null,
      firstAnswers: [],
      reviewAnswers: [],
    },
  };
}
const ok = (data: unknown) =>
  new Response(JSON.stringify({ data }), { status: 200 });
const denied = () =>
  new Response(
    JSON.stringify({
      error: { code: "FORBIDDEN", message: "배정이 취소되었습니다." },
    }),
    { status: 403 },
  );
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("listening learner HTTP integration", () => {
  it("prepares a missing attempt without starting the timer and excludes teacher audio", async () => {
    const detail = fixture();
    detail.attempt!.status = "ready";
    detail.attempt!.startedAt = null;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok({ ...detail, attempt: null }))
      .mockResolvedValueOnce(ok(detail));
    vi.stubGlobal("fetch", fetcher);
    const { container } = render(<ListeningAssignment assignmentId={id(1)} />);
    expect(
      await screen.findByRole("button", { name: "학습 시작" }),
    ).toBeEnabled();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe(base);
    expect(fetcher.mock.calls[1]).toMatchObject([
      `${base}/prepare`,
      {
        method: "POST",
        body: "{}",
        cache: "no-store",
        credentials: "same-origin",
      },
    ]);
    expect(container.querySelector("audio")).toBeNull();
  });
  it("retries a lost answer receipt with the same attempt, revision and idempotency key", async () => {
    const detail = fixture();
    const saved = fixture();
    saved.attempt!.revision = 2;
    saved.attempt!.firstAnswers = [
      { questionId: id(4), choiceId: id(6), savedAt: saved.serverNow },
    ];
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok(detail))
      .mockRejectedValueOnce(new Error("연결이 끊겼습니다."))
      .mockResolvedValueOnce(ok(saved));
    vi.stubGlobal("fetch", fetcher);
    render(<ListeningAssignment assignmentId={id(1)} />);
    fireEvent.click(await screen.findByRole("radio", { name: /At four/ }));
    fireEvent.click(screen.getByRole("button", { name: "답 확정" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "답 저장 다시 시도" }),
    );
    expect(
      await screen.findByText("저장 완료 · 확정한 답은 바꿀 수 없습니다."),
    ).toBeInTheDocument();
    const initialBody = fetcher.mock.calls[1][1].body;
    expect(fetcher.mock.calls[2][1].body).toBe(initialBody);
    expect(JSON.parse(initialBody)).toMatchObject({
      attemptId: id(7),
      command: {
        kind: "answer",
        expectedRevision: 1,
        phase: "initial",
        questionId: id(4),
        choiceId: id(6),
      },
    });
  });
  it("removes the attempt when fresh authorization is revoked", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok(fixture()))
      .mockResolvedValue(denied());
    vi.stubGlobal("fetch", fetcher);
    render(<ListeningAssignment assignmentId={id(1)} />);
    expect(
      await screen.findByRole("radio", { name: /At four/ }),
    ).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "배정이 취소되었습니다.",
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("refuses teacher answer keys accidentally added to a locked learner response", async () => {
    const detail = fixture();
    const leaked = {
      ...detail,
      view: {
        ...detail.view,
        groups: [
          {
            ...detail.view.groups[0],
            questions: [
              { ...detail.view.groups[0].questions[0], answerChoiceId: id(6) },
            ],
          },
        ],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(leaked)));
    render(<ListeningAssignment assignmentId={id(1)} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학습 자료를 확인하지 못했습니다.",
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("reloads conflicts instead of confirming a save", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok(fixture()))
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "충돌" } }), {
            status: 409,
          }),
        ),
    );
    render(<ListeningAssignment assignmentId={id(1)} />);
    fireEvent.click(await screen.findByRole("radio", { name: /At four/ }));
    fireEvent.click(screen.getByRole("button", { name: "답 확정" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "최신 저장 내용을 다시 불러와 주세요.",
    );
    expect(
      screen.queryByText("저장 완료 · 확정한 답은 바꿀 수 없습니다."),
    ).not.toBeInTheDocument();
  });
  it("never restores an old poll or manufactures student playback permissions", () => {
    const current = fixture();
    current.attempt!.revision = 3;
    const older = fixture();
    older.serverNow = "2026-10-03T07:59:00Z";
    expect(newerListeningDetail(current, older)).toBe(current);
    older.serverNow = "2026-10-03T08:01:00Z";
    expect(newerListeningDetail(current, older)).toBe(current);
    current.media = {
      soundCheckUrl: "/tone",
      urlsByAssetId: {},
      playbackPolicy: {
        canPlay: true,
        canPause: true,
        canSeek: true,
        canRepeat: true,
      },
    };
    expect(studentMedia(current)).toBeUndefined();
  });
});
