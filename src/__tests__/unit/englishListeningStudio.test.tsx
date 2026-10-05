import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeningStudio from "@/components/english/listening/ListeningStudio";
import { ListeningAssignments } from "@/components/english/listening/ListeningAssignments";
import type {
  ListeningAssignmentDetail,
  ListeningClassOption,
  ListeningSetDetail,
} from "@/contracts/englishListeningHttp.contract";
import {
  englishListeningFixture,
  listeningFixtureIds,
} from "@/mocks/englishListeningFixture";

const base = "/api/english/listening";
const classId = "00000000-0000-4000-8000-000000000090";
const studentId = listeningFixtureIds.student;
const receipt = (data: unknown) => Response.json({ data });
function summary(detail: ListeningSetDetail) {
  return {
    id: detail.id,
    title: detail.document.title,
    level: detail.document.level,
    revision: detail.revision,
    groupCount: detail.document.groups.length,
    publicationCount: detail.publications.length,
    updatedAt: "2026-10-03T00:00:00.000Z",
  };
}
function makeDetail(): ListeningSetDetail {
  const document = englishListeningFixture();
  return {
    id: document.id,
    revision: 3,
    document,
    publications: [],
    mediaUrlsByAssetId: {},
  };
}
const classes: ListeningClassOption[] = [
  {
    id: classId,
    name: "내 중등반",
    students: [{ id: studentId, name: "김학생" }],
  },
];
function assignmentDetail(
  detail: ListeningSetDetail,
): ListeningAssignmentDetail {
  const publication = {
    schemaVersion: 1 as const,
    id: listeningFixtureIds.publication,
    publishedAt: "2026-10-03T00:00:00.000Z",
    contentHash: "a".repeat(64),
    document: englishListeningFixture(),
  };
  detail.publications = [publication];
  return {
    assignment: {
      schemaVersion: 1,
      id: listeningFixtureIds.assignment,
      revision: 2,
      ownerId: listeningFixtureIds.owner,
      branchId: listeningFixtureIds.branch,
      publicationId: publication.id,
      createdAt: "2026-10-03T00:00:00.000Z",
      targetStudentIds: [studentId],
      mode: "exam",
      audioSource: "teacher_device",
      opensAt: "2026-10-03T01:00:00.000Z",
      closesAt: "2026-10-04T00:00:00.000Z",
      timeLimitSeconds: 600,
      releasePolicy: { kind: "manual" },
      cancelledAt: null,
    },
    classId,
    publication,
    broadcast: null,
    broadcastStatus: "idle",
    mediaUrlsByAssetId: {},
    results: [{ studentId, name: "김학생", attempt: null, grade: null }],
  };
}
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(window, "confirm").mockReturnValue(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ListeningStudio connected teacher flow", () => {
  it.each(["national_listening", "mock_exam"] as const)(
    "carries a saved %s source into the editor when questions have no metadata",
    async (kind) => {
      const detail = makeDetail();
      detail.document.groups = [detail.document.groups[0]];
      detail.document.source = {
        kind,
        provider: "공식 평가",
        year: 2022,
        round: 1,
        month: null,
        originalFilename: "original.mp3",
      };
      const audio = detail.document.groups[0].audio!;
      detail.mediaUrlsByAssetId[audio.assetId] = "/national-original.mp3";
      const fetcher = vi.fn(async (url: string) =>
        receipt(url === `${base}/sets` ? [summary(detail)] : detail),
      );
      vi.stubGlobal("fetch", fetcher);
      const { container } = render(
        <ListeningStudio openSetRequest={{ id: detail.id, version: 1 }} />,
      );
      await screen.findByRole("heading", { name: detail.document.title });
      expect(screen.getByText("회차 전체 원본 음원")).toBeInTheDocument();
      expect(container.querySelector("audio")).toHaveAttribute(
        "src",
        "/national-original.mp3",
      );
      fireEvent.click(screen.getByRole("button", { name: "자료 수정" }));
      await screen.findByRole("heading", { name: "듣기 자료 수정" });
      expect(screen.getAllByText(/회차 전체 원본 음원/)).toHaveLength(1);
      expect(
        screen.queryByLabelText(/전체 음원 (시작|끝)/),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("묶음 1 문항 1 문제")).toHaveValue(
        detail.document.groups[0].questions[0].prompt,
      );
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it("opens a bank request after list loading and consumes it once", async () => {
    const detail = makeDetail();
    const opened = vi.fn();
    const fetcher = vi.fn(async (url: string) =>
      receipt(url === `${base}/sets` ? [summary(detail)] : detail),
    );
    vi.stubGlobal("fetch", fetcher);
    const request = { id: detail.id, version: 1 };
    const rendered = render(
      <ListeningStudio openSetRequest={request} onSetOpened={opened} />,
    );
    expect(
      await screen.findByRole("heading", { name: detail.document.title }),
    ).toBeVisible();
    expect(opened).toHaveBeenCalledWith(1);
    rendered.rerender(
      <ListeningStudio openSetRequest={{ ...request }} onSetOpened={opened} />,
    );
    expect(
      fetcher.mock.calls.filter(([url]) => url === `${base}/sets/${detail.id}`),
    ).toHaveLength(1);
  });

  it("keeps an unsaved draft when a bank request is cancelled", async () => {
    const detail = makeDetail();
    const opened = vi.fn();
    const fetcher = vi.fn(async () => receipt([summary(detail)]));
    vi.stubGlobal("fetch", fetcher);
    const rendered = render(<ListeningStudio />);
    await screen.findByRole("button", { name: /짧은 대화와 안내/ });
    fireEvent.click(screen.getByRole("button", { name: "새 자료 만들기" }));
    fireEvent.change(screen.getByLabelText("자료 제목"), {
      target: { value: "보존할 초안" },
    });
    rendered.rerender(
      <ListeningStudio
        openSetRequest={{ id: detail.id, version: 2 }}
        onSetOpened={opened}
      />,
    );
    await waitFor(() => expect(opened).toHaveBeenCalledWith(2));
    expect(screen.getByLabelText("자료 제목")).toHaveValue("보존할 초안");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("opens the native draft form with the keyboard and keeps late selection responses out", async () => {
    const first = makeDetail();
    const second = {
      ...first,
      id: crypto.randomUUID(),
      document: { ...first.document, title: "다음 자료" },
    };
    let resolveFirst!: (response: Response) => void;
    let firstSignal: AbortSignal | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: RequestInit) => {
        if (url === `${base}/sets`)
          return Promise.resolve(receipt([summary(first), summary(second)]));
        if (url.endsWith(first.id)) {
          firstSignal = init.signal!;
          return new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve(receipt(second));
      }),
    );
    render(<ListeningStudio />);
    fireEvent.click(
      await screen.findByRole("button", { name: /짧은 대화와 안내/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /다음 자료/ }));
    await screen.findByRole("heading", { name: "다음 자료" });
    expect(firstSignal!.aborted).toBe(true);
    await act(async () => resolveFirst(receipt(first)));
    expect(screen.getByRole("heading", { name: "다음 자료" })).toBeVisible();
    screen.getByRole("button", { name: "새 자료 만들기" }).focus();
    await userEvent.setup().keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "자료 제목" })).toBeEnabled();
  });

  it("renders failed fetch separately from empty server list and retries", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValue(receipt([]));
    vi.stubGlobal("fetch", fetcher);
    render(<ListeningStudio />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결하지 못했습니다",
    );
    expect(
      screen.queryByText("등록된 듣기 자료가 없습니다."),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "자료 목록 다시 시도" }),
    );
    expect(
      await screen.findByText("등록된 듣기 자료가 없습니다."),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("creates and saves an incomplete draft with stable IDs and no fabricated metadata", async () => {
    let detail = makeDetail();
    let saved = false;
    detail = {
      ...detail,
      document: {
        ...detail.document,
        title: "",
        groups: [],
        rights: { rightsStatus: "unknown", allowedUses: [] },
        rightsReview: null,
      },
    };
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "POST" || init.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          writes.push({ path: url, body });
          if (init.method === "PATCH") {
            detail = {
              ...detail,
              revision: 4,
              document: {
                ...detail.document,
                ...body,
                groups: body.groups.map((g: object) => ({
                  ...g,
                  reviews: { content: null, audio: null, alignment: null },
                })),
                provenance: {
                  ...detail.document.provenance,
                  basis: body.basis,
                },
              },
            };
            saved = true;
          }
          return receipt(detail);
        }
        return receipt(
          url === `${base}/sets` ? (saved ? [summary(detail)] : []) : detail,
        );
      }),
    );
    render(<ListeningStudio />);
    await screen.findByText("등록된 듣기 자료가 없습니다.");
    fireEvent.click(screen.getByRole("button", { name: "새 자료 만들기" }));
    fireEvent.change(screen.getByLabelText("자료 제목"), {
      target: { value: "새 초안" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "음원·문항 묶음 추가" }),
    );
    fireEvent.change(screen.getByLabelText("묶음 1 문항 1 문제"), {
      target: { value: "작성 중" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByText("초안을 저장했습니다.")).toBeVisible();
    const patch = writes.find((write) => write.path.endsWith(detail.id))!.body;
    expect(patch).not.toHaveProperty("ownerId");
    expect(patch).not.toHaveProperty("rightsReview");
    const groups = patch.groups as {
      id: string;
      audio: null;
      questions: { id: string; answerChoiceId: null }[];
      reviews?: unknown;
    }[];
    expect(groups[0]).not.toHaveProperty("reviews");
    expect(groups[0].audio).toBeNull();
    expect(groups[0].questions[0].answerChoiceId).toBeNull();
    expect(patch.expectedRevision).toBe(3);
    fireEvent.change(screen.getByLabelText("자료 제목"), {
      target: { value: "고친 초안" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초안 저장" }));
    await waitFor(() =>
      expect(
        writes.filter((write) => write.path.endsWith(detail.id)),
      ).toHaveLength(2),
    );
    const second = writes.at(-1)!.body;
    expect((second.groups as typeof groups)[0].id).toBe(groups[0].id);
    expect((second.groups as typeof groups)[0].questions[0].id).toBe(
      groups[0].questions[0].id,
    );
  });

  it("keeps edits on a 409, checks latest without replacing input, and warns before discarding", async () => {
    const detail = makeDetail();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "PATCH")
          return Response.json(
            { error: { code: "revision_conflict", message: "conflict" } },
            { status: 409 },
          );
        return receipt(url === `${base}/sets` ? [summary(detail)] : detail);
      }),
    );
    render(<ListeningStudio />);
    fireEvent.click(
      await screen.findByRole("button", { name: /짧은 대화와 안내/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "자료 수정" }));
    fireEvent.change(screen.getByLabelText("자료 제목"), {
      target: { value: "보존할 입력" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초안 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "입력은 보존했습니다",
    );
    fireEvent.click(screen.getByRole("button", { name: "최신 저장본 확인" }));
    await screen.findByRole("region", { name: "최신 저장본 비교" });
    expect(screen.getByLabelText("자료 제목")).toHaveValue("보존할 입력");
    fireEvent.click(
      screen.getByRole("button", { name: "최신 저장본으로 바꾸기" }),
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("자료 제목")).toHaveValue("보존할 입력");
    fireEvent.click(screen.getByRole("button", { name: "편집 닫기" }));
    expect(screen.getByLabelText("자료 제목")).toHaveValue("보존할 입력");
  });

  it("aborts stale and hidden requests and retains input when reactivated", async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        signals.push(init.signal!);
        return receipt([]);
      }),
    );
    const view = render(<ListeningStudio />);
    await screen.findByText("등록된 듣기 자료가 없습니다.");
    fireEvent.click(screen.getByRole("button", { name: "새 자료 만들기" }));
    fireEvent.change(screen.getByLabelText("자료 제목"), {
      target: { value: "돌아올 초안" },
    });
    const leave = new Event("english-listening-before-leave", {
      cancelable: true,
    });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    view.rerender(<ListeningStudio active={false} />);
    const hiddenLeave = new Event("english-listening-before-leave", {
      cancelable: true,
    });
    window.dispatchEvent(hiddenLeave);
    expect(hiddenLeave.defaultPrevented).toBe(false);
    expect(signals[0].aborted).toBe(true);
    view.rerender(<ListeningStudio active />);
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(screen.getByLabelText("자료 제목")).toHaveValue("돌아올 초안");
  });

  it("requires explicit review checks and sends server revisions before publish", async () => {
    let detail = makeDetail();
    detail.document.rightsReview = null;
    detail.document.groups.forEach((group) => {
      group.reviews = { content: null, audio: null, alignment: null };
    });
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "POST") {
          const body = JSON.parse(init.body as string);
          writes.push({ path: url, body });
          if (url.endsWith("/review") && body.kind === "rights") {
            detail = {
              ...detail,
              revision: detail.revision + 1,
              document: {
                ...detail.document,
                rightsReview: {
                  confirmedBy: listeningFixtureIds.owner,
                  confirmedAt: "2026-10-03T00:00:00.000Z",
                  basis: body.basis,
                },
              },
            };
            return receipt(detail);
          }
          if (url.endsWith("/review")) {
            const group = detail.document.groups.find(
              (g) => g.id === body.groupId,
            )!;
            const review = {
              reviewerId: listeningFixtureIds.owner,
              reviewedAt: "2026-10-03T00:00:00.000Z",
              revision: 1,
              contentHash: "a".repeat(64),
              assetId: group.audio!.assetId,
              sha256: group.audio!.sha256,
              transcriptRevision: 1,
            };
            detail = {
              ...detail,
              revision: detail.revision + 1,
              document: {
                ...detail.document,
                groups: detail.document.groups.map((g) =>
                  g.id === group.id
                    ? {
                        ...g,
                        reviews: {
                          ...g.reviews,
                          [body.kind]:
                            body.kind === "content"
                              ? {
                                  reviewerId: review.reviewerId,
                                  reviewedAt: review.reviewedAt,
                                  revision: review.revision,
                                  contentHash: review.contentHash,
                                }
                              : review,
                        },
                      }
                    : g,
                ),
              },
            };
          }
          return receipt(detail);
        }
        return receipt(url === `${base}/sets` ? [summary(detail)] : detail);
      }),
    );
    render(<ListeningStudio />);
    fireEvent.click(
      await screen.findByRole("button", { name: /짧은 대화와 안내/ }),
    );
    expect(
      await screen.findByRole("button", { name: "검수한 자료 발행" }),
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "내용 검수 기록" })[0],
    ).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        "출처와 음원 보관·교사 검수·학생 배정의 사용 권리를 확인했습니다",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "권리 검수 기록" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText(
          "출처와 음원 보관·교사 검수·학생 배정의 사용 권리를 확인했습니다",
        ),
      ).not.toBeChecked(),
    );
    for (let group = 0; group < 2; group++) {
      for (const [label, button] of [
        ["문항·보기·정답·해설의 근거를 확인했습니다", "내용 검수 기록"],
        [
          "음원을 직접 듣고 대본, 숫자, 부정어와 잘림을 확인했습니다",
          "음성 검수 기록",
        ],
        [
          "재생으로 모든 정답 근거 구간의 시작과 끝을 확인했습니다",
          "구간 검수 기록",
        ],
      ]) {
        await waitFor(() =>
          expect(screen.getAllByLabelText(label)[group]).toBeEnabled(),
        );
        fireEvent.click(screen.getAllByLabelText(label)[group]);
        fireEvent.click(screen.getAllByRole("button", { name: button })[group]);
        await waitFor(() =>
          expect(screen.getAllByLabelText(label)[group]).not.toBeChecked(),
        );
      }
    }
    expect(
      screen.getByRole("button", { name: "검수한 자료 발행" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "검수한 자료 발행" }));
    await screen.findByText("자료를 발행했습니다.");
    expect(writes[0].body).toEqual({
      expectedRevision: 3,
      kind: "rights",
      basis: detail.document.provenance.basis,
    });
    expect(writes[1].body).toEqual({
      expectedRevision: 4,
      kind: "content",
      groupId: detail.document.groups[0].id,
    });
    expect(writes.at(-1)!.body).toEqual({ expectedRevision: 10 });
  });
});

describe("teacher assignment requests", () => {
  it("waits for the roster before allowing material selection to cancel an initial load", async () => {
    let resolveRoster!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/classes")
          ? new Promise<Response>((resolve) => {
              resolveRoster = resolve;
            })
          : Promise.resolve(receipt([])),
      ),
    );
    render(
      <ListeningAssignments
        active
        materials={[summary(makeDetail())]}
        onDirtyChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: /배정할 자료/ }),
    ).toBeDisabled();
    resolveRoster(receipt(classes));
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /배정할 자료/ }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole("option", { name: "내 중등반" }),
    ).toBeInTheDocument();
  });
  it("creates practice assignment with selected own-class students and server publication ID", async () => {
    const detail = makeDetail();
    const assigned = assignmentDetail(detail);
    const writes: unknown[] = [];
    const onDirtyChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "POST") {
          writes.push(JSON.parse(init.body as string));
          return receipt(assigned);
        }
        if (url.endsWith("/classes")) return receipt(classes);
        if (url.endsWith("/assignments")) return receipt([]);
        return receipt(url.includes("/sets/") ? detail : assigned);
      }),
    );
    render(
      <ListeningAssignments
        active
        materials={[summary(detail)]}
        onDirtyChange={onDirtyChange}
      />,
    );
    await screen.findByText("배정한 과제가 없습니다.");
    fireEvent.change(screen.getByLabelText("배정할 자료"), {
      target: { value: detail.id },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("발행본")).toHaveValue(
        listeningFixtureIds.publication,
      ),
    );
    fireEvent.change(screen.getByLabelText("대상 반"), {
      target: { value: classId },
    });
    fireEvent.click(screen.getByLabelText("김학생"));
    fireEvent.click(screen.getByRole("button", { name: "학생에게 배정" }));
    expect(await screen.findByText("학생에게 배정했습니다.")).toBeVisible();
    expect(writes[0]).toMatchObject({
      classId,
      publicationId: listeningFixtureIds.publication,
      targetStudentIds: [studentId],
      mode: "practice",
      audioSource: "student_device",
      releasePolicy: { kind: "after_unit_answer" },
      timeLimitSeconds: null,
    });
    expect(writes[0]).not.toHaveProperty("ownerId");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("sends CAS release/cancel and broadcast interruption and preserves results on failures", async () => {
    const detail = makeDetail();
    let assigned = assignmentDetail(detail);
    const writes: { path: string; body: unknown }[] = [];
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (init.method === "POST") {
          const body = JSON.parse(init.body as string);
          writes.push({ path: url, body });
          if (url.endsWith("/release"))
            return Response.json(
              { error: { code: "conflict", message: "다시 확인" } },
              { status: 409 },
            );
          if (url.endsWith("/broadcast"))
            assigned = {
              ...assigned,
              assignment: {
                ...assigned.assignment,
                revision: assigned.assignment.revision + 1,
              },
              broadcast: {
                schemaVersion: 1,
                id: crypto.randomUUID(),
                assignmentId: assigned.assignment.id,
                publicationId: assigned.publication.id,
                participantStudentIds: [studentId],
                startedAt: "2026-10-03T01:00:00.000Z",
                deadlineAt: "2026-10-03T01:10:00.000Z",
              },
              broadcastStatus:
                body.action === "start" ? "active" : "interrupted",
            };
          if (url.endsWith("/cancel"))
            assigned = {
              ...assigned,
              assignment: {
                ...assigned.assignment,
                cancelledAt: "2026-10-03T02:00:00.000Z",
              },
            };
          return receipt(assigned);
        }
        if (url.endsWith("/classes")) return receipt(classes);
        if (url.endsWith("/assignments"))
          return receipt([
            {
              ...summary(detail),
              ...assigned.assignment,
              title: detail.document.title,
              classId,
              targetCount: 1,
            },
          ]);
        return receipt(assigned);
      }),
    );
    render(
      <ListeningAssignments
        active
        materials={[summary(detail)]}
        onDirtyChange={() => {}}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /짧은 대화와 안내/ }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "정답·해설 지금 공개" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("다른 작업에서");
    expect(screen.getByRole("table")).toHaveTextContent("김학생");
    fireEvent.click(
      screen.getByLabelText(
        "교사 기기와 스피커에서 소리가 나는지 확인했습니다",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "방송 시작 기록" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "방송 장애 기록·중단" }),
    );
    await screen.findByText("방송 상태 · 중단");
    fireEvent.click(screen.getByRole("button", { name: "과제 취소" }));
    await screen.findByText(
      "취소한 과제입니다. 저장된 답안과 결과는 보존됩니다.",
    );
    expect(writes.map((item) => item.body)).toEqual([
      { expectedRevision: 2 },
      { expectedRevision: 2, action: "start" },
      { expectedRevision: 3, action: "interrupt" },
      { expectedRevision: 4 },
    ]);
  });
});
