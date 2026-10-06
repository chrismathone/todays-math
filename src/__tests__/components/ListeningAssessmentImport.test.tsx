import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListeningAssessmentImport } from "@/components/english/bank/ListeningAssessmentImport";
import type { ListeningEditQuestion } from "@/components/english/listening/listeningDraft";
import { ListeningRequestError } from "@/components/english/listening/listeningClient";
import {
  listeningCreateSetSchema,
  listeningDraftQuestionSchema,
  listeningDraftSchema,
  listeningReviewSetSchema,
  listeningUpdateSetSchema,
  type ListeningSetDetail,
} from "@/contracts/englishListeningHttp.contract";
import {
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

const pdf = vi.hoisted(() => ({
  questions: vi.fn(),
  text: vi.fn(),
  answers: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@/components/english/bank/listeningPdfImport", () => ({
  readListeningQuestionPdf: pdf.questions,
  readListeningPdfText: pdf.text,
  listeningPdfAnswers: pdf.answers,
}));
vi.mock("@/components/english/listening/listeningUpload", () => ({
  uploadListeningAudio: pdf.upload,
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const audio = { assetId: id(500), sha256: "a".repeat(64), durationMs: 90_000 };
const image = {
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC9sAAAAASUVORK5CYII=",
  width: 1,
  height: 1,
};
const script = "W: Which picture shows the room? M: The window is on the left.";
const rightsLabel = "원본 보관·재생과 선택한 사용 범위를 확인했습니다";
const distributionLabel = "문항 재구성·시험지 출력에도 사용 가능";
const BrowserURL = URL;

function questionFixture(): ListeningEditQuestion[] {
  return [1, 2].map((number) =>
    listeningDraftQuestionSchema.parse({
      id: id(100 + number * 10),
      sourceNumber: number,
      prompt: number === 1 ? "대화에 맞는 그림은?" : "남자가 할 일은?",
      ...(number === 1 ? { image } : {}),
      choices: [1, 2, 3, 4, 5].map((choice) => ({
        id: id(100 + number * 10 + choice),
        text: String(choice),
      })),
      answerChoiceId: null,
      explanation: "",
      evidence: [],
    }),
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

type RequestRecord = { path: string; method: string; body: unknown };
function serverFixture(
  options: {
    failReview?: boolean;
    failPatch?: boolean;
    retryRevision?: number;
  } = {},
) {
  let detail: ListeningSetDetail;
  let reviews = 0;
  let patches = 0;
  const requests: RequestRecord[] = [];
  const events: string[] = [];
  const ok = (data: unknown) => Response.json({ data });
  const failed = (message: string) =>
    Response.json(
      { error: { code: "temporarily_unavailable", message } },
      { status: 503 },
    );
  const fetcher = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace("/api/english/listening", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ path, method, body });
    events.push(`${method} ${path}`);
    if (path === "/sets" && method === "POST") {
      const input = listeningCreateSetSchema.parse(body);
      const document = listeningDraftSchema.parse({
        schemaVersion: 1,
        id: listeningFixtureIds.set,
        ownerId: listeningFixtureIds.owner,
        branchId: listeningFixtureIds.branch,
        revision: 1,
        title: input.title,
        level: input.level,
        examId: input.examId,
        source: input.source,
        provenance: {
          kind: "uploaded_assessment",
          recordedBy: listeningFixtureIds.owner,
          recordedAt: listeningFixtureNow,
          basis: input.basis,
        },
        rights: input.rights,
        rightsReview: null,
        groups: [],
      });
      detail = {
        id: document.id,
        revision: 1,
        document,
        publications: [],
        mediaUrlsByAssetId: {},
      };
      return ok(detail);
    }
    if (path === `/sets/${detail?.id}` && method === "GET") {
      if (options.retryRevision) {
        detail.revision = options.retryRevision;
        detail.document.title = "최신 저장본 제목";
      }
      return ok(detail);
    }
    if (path === `/sets/${detail?.id}/review` && method === "POST") {
      const input = listeningReviewSetSchema.parse(body);
      expect(input.expectedRevision).toBe(detail.revision);
      expect(input.kind).toBe("rights");
      if (++reviews === 1 && options.failReview)
        return failed("출처 확인 저장 실패");
      detail.document.rightsReview = {
        confirmedBy: listeningFixtureIds.owner,
        confirmedAt: listeningFixtureNow,
        basis: input.basis!,
      };
      detail.revision++;
      detail.document.revision++;
      return ok(detail);
    }
    if (path === `/sets/${detail?.id}` && method === "PATCH") {
      const input = listeningUpdateSetSchema.parse(body);
      expect(input.expectedRevision).toBe(detail.revision);
      if (++patches === 1 && options.failPatch) return failed("문항 저장 실패");
      // Keep a contract-shaped response; runtime rights-review preservation is
      // tested separately. Here the UI must send the unchanged rights and basis.
      expect(input.rights).toEqual(detail.document.rights);
      expect(input.basis).toBe(detail.document.provenance.basis);
      detail.revision++;
      detail.document = listeningDraftSchema.parse({
        ...detail.document,
        title: input.title,
        revision: detail.document.revision + 1,
        groups: input.groups.map((group) => ({
          ...group,
          reviews: { content: null, audio: null, alignment: null },
        })),
      });
      return ok(detail);
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return {
    requests,
    events,
    fetcher,
    getDetail: () => structuredClone(detail),
    calls: (method: string) => requests.filter((r) => r.method === method),
  };
}

function openForm() {
  const onImported = vi.fn();
  const onState = vi.fn();
  const rendered = render(
    <ListeningAssessmentImport onImported={onImported} onState={onState} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "듣기평가 파일 등록" }));
  return { ...rendered, onImported, onState };
}

function chooseFile(label: string, name: string, type: string) {
  const file = new File(["fixture"], name, { type });
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  return file;
}

async function prepareFiles({ optional = true } = {}) {
  fireEvent.change(screen.getByLabelText("제목", { exact: true }), {
    target: { value: "  2025 중2 직접 제작 듣기  " },
  });
  fireEvent.change(screen.getByLabelText("학년", { exact: true }), {
    target: { value: "중2" },
  });
  fireEvent.change(screen.getByLabelText("출제 기관"), {
    target: { value: "  직접 제작  " },
  });
  fireEvent.change(screen.getByLabelText("연도"), {
    target: { value: "2025" },
  });
  fireEvent.change(screen.getByLabelText("회차"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("출처·사용 근거"), {
    target: { value: "  직접 작성·녹음 · 교사 수업 보관  " },
  });
  const audioFile = chooseFile("음원 MP3·WAV", "original.mp3", "audio/mpeg");
  const questionFile = chooseFile(
    "문제지 PDF",
    "questions.pdf",
    "application/pdf",
  );
  if (optional) {
    chooseFile("정답 PDF (선택)", "answers.pdf", "application/pdf");
    chooseFile("대본 PDF (선택)", "transcript.pdf", "application/pdf");
  }
  fireEvent.click(screen.getByRole("button", { name: "문항 읽기" }));
  await screen.findByText(/2문항을 읽었습니다/);
  return { audioFile, questionFile };
}

function confirmRights() {
  fireEvent.click(screen.getByLabelText(rightsLabel));
}
function register() {
  fireEvent.click(screen.getByRole("button", { name: "듣기은행에 등록" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "URL",
    class extends BrowserURL {
      static createObjectURL = vi.fn(() => "blob:assessment-audio");
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  pdf.questions.mockImplementation(async () => questionFixture());
  pdf.text.mockImplementation(async (file: File) =>
    file.name === "answers.pdf" ? "answer-sheet-text" : script,
  );
  pdf.answers.mockReturnValue(new Map([[1, 2]]));
  pdf.upload.mockResolvedValue(audio);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ListeningAssessmentImport", () => {
  it("requires explicit rights confirmation and clears it when uses or basis change", async () => {
    const server = serverFixture();
    openForm();
    await prepareFiles();
    const submit = screen.getByRole("button", { name: "듣기은행에 등록" });
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("출처 확인");
    expect(server.fetcher).not.toHaveBeenCalled();
    confirmRights();
    expect(submit).toBeEnabled();
    fireEvent.click(screen.getByLabelText(distributionLabel));
    expect(screen.getByLabelText(rightsLabel)).not.toBeChecked();
    expect(submit).toBeDisabled();
    confirmRights();
    fireEvent.change(screen.getByLabelText("출처·사용 근거"), {
      target: { value: "수정한 사용 근거" },
    });
    expect(screen.getByLabelText(rightsLabel)).not.toBeChecked();
    expect(submit).toBeDisabled();
    expect(server.fetcher).not.toHaveBeenCalled();
  });

  it("preserves original images, source numbers, mapped answers and provenance through registration", async () => {
    const server = serverFixture();
    pdf.upload.mockImplementation(async () => {
      server.events.push("UPLOAD");
      return audio;
    });
    const { onImported, onState } = openForm();
    const files = await prepareFiles();
    expect(pdf.questions).toHaveBeenCalledWith(
      files.questionFile,
      30,
      expect.any(AbortSignal),
    );
    expect(pdf.answers).toHaveBeenCalledWith("answer-sheet-text");
    expect(screen.getByText(/^1번 ·/)).toHaveTextContent("정답 3");
    expect(screen.getByText(/^2번 ·/)).toHaveTextContent("정답 미정");
    const first = screen.getByText(/^1번 ·/).closest("details")!;
    fireEvent.click(within(first).getByText(/^1번 ·/));
    expect(
      within(first).getByRole("img", { name: "1번 원본 문항" }),
    ).toHaveAttribute("src", image.dataUrl);
    expect(screen.queryByText("회차 전체 원본 음원")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/전체 음원 (시작|끝)/)).toHaveLength(4);
    expect(screen.getAllByText(/시작·끝을 지정하세요/)).toHaveLength(2);
    fireEvent.click(screen.getByLabelText(distributionLabel));
    confirmRights();
    register();
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith(listeningFixtureIds.set),
    );
    const posts = server.calls("POST");
    expect(posts[0].body).toEqual({
      title: "2025 중2 직접 제작 듣기",
      level: "중2",
      examId: null,
      basis: "직접 작성·녹음 · 교사 수업 보관",
      rights: {
        rightsStatus: "approved",
        allowedUses: ["store_original", "teacher_review", "distribution"],
      },
      source: {
        kind: "other",
        provider: "직접 제작",
        year: 2025,
        round: 1,
        month: null,
        originalFilename: "questions.pdf",
      },
    });
    expect(posts[1].body).toEqual({
      expectedRevision: 1,
      kind: "rights",
      basis: "직접 작성·녹음 · 교사 수업 보관",
    });
    expect(server.events).toEqual([
      "POST /sets",
      `POST /sets/${listeningFixtureIds.set}/review`,
      "UPLOAD",
      `PATCH /sets/${listeningFixtureIds.set}`,
    ]);
    expect(pdf.upload).toHaveBeenCalledWith(
      listeningFixtureIds.set,
      files.audioFile,
      expect.any(AbortSignal),
      expect.any(Function),
    );
    const patch = listeningUpdateSetSchema.parse(server.calls("PATCH")[0].body);
    expect(patch.expectedRevision).toBe(2);
    expect(patch.groups).toHaveLength(1);
    expect(patch.groups[0].audio).toEqual(audio);
    expect(patch.groups[0].transcript).toEqual({
      revision: 1,
      text: script,
      spokenText: script,
      translation: null,
    });
    const expected = questionFixture();
    expected[0].answerChoiceId = expected[0].choices[2].id;
    expect(patch.groups[0].questions).toEqual(expected);
    const final = server.getDetail().document;
    expect(final.provenance).toEqual({
      kind: "uploaded_assessment",
      recordedBy: listeningFixtureIds.owner,
      recordedAt: listeningFixtureNow,
      basis: "직접 작성·녹음 · 교사 수업 보관",
    });
    expect(final.source).toEqual((posts[0].body as { source: unknown }).source);
    expect(final.rightsReview).toEqual({
      confirmedBy: listeningFixtureIds.owner,
      confirmedAt: listeningFixtureNow,
      basis: "직접 작성·녹음 · 교사 수업 보관",
    });
    expect(final.groups[0].reviews).toEqual({
      content: null,
      audio: null,
      alignment: null,
    });
    expect(
      screen.getByRole("button", { name: "듣기평가 파일 등록" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(onState).toHaveBeenLastCalledWith(false, false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:assessment-audio");
  });

  it("imports own listening with the 30-question bound and leaves absent answers undecided", async () => {
    const server = serverFixture();
    const { onImported } = openForm();
    const files = await prepareFiles({ optional: false });
    expect(screen.queryByText("회차 전체 원본 음원")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/전체 음원 (시작|끝)/)).toHaveLength(4);
    confirmRights();
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(pdf.questions).toHaveBeenCalledWith(
      files.questionFile,
      30,
      expect.any(AbortSignal),
    );
    expect(pdf.text).not.toHaveBeenCalled();
    expect(pdf.answers).not.toHaveBeenCalled();
    const create = listeningCreateSetSchema.parse(server.calls("POST")[0].body);
    expect(create.source).toEqual({
      kind: "other",
      provider: "직접 제작",
      year: 2025,
      round: 1,
      month: null,
      originalFilename: "questions.pdf",
    });
    expect(create.rights.allowedUses).toEqual([
      "store_original",
      "teacher_review",
    ]);
    const patch = listeningUpdateSetSchema.parse(server.calls("PATCH")[0].body);
    expect(
      patch.groups[0].questions.every((q) => q.answerChoiceId === null),
    ).toBe(true);
    expect(patch.groups[0].transcript.text).toBe("");
  });

  it("retries failed upload in the same reviewed draft without creating a duplicate set", async () => {
    const server = serverFixture();
    pdf.upload.mockRejectedValueOnce(
      new ListeningRequestError("음원 전송 실패", 503, "upload_failed"),
    );
    const { onImported } = openForm();
    await prepareFiles();
    confirmRights();
    register();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "음원 전송 실패",
    );
    expect(onImported).not.toHaveBeenCalled();
    expect(server.calls("PATCH")).toHaveLength(0);
    expect(screen.getByLabelText("제목", { exact: true })).toBeDisabled();
    expect(screen.getByLabelText("문제지 PDF")).toBeDisabled();
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(server.calls("POST").filter((r) => r.path === "/sets")).toHaveLength(
      1,
    );
    expect(
      server.calls("POST").filter((r) => r.path.endsWith("/review")),
    ).toHaveLength(1);
    expect(server.calls("GET")).toHaveLength(1);
    expect(pdf.upload).toHaveBeenCalledTimes(2);
    expect(
      listeningUpdateSetSchema.parse(server.calls("PATCH")[0].body)
        .expectedRevision,
    ).toBe(2);
  });

  it("allows a rejected audio file to be replaced without losing the reviewed draft", async () => {
    const server = serverFixture();
    pdf.upload.mockRejectedValueOnce(
      new ListeningRequestError(
        "지원하지 않는 음원 파일",
        422,
        "audio_not_ready",
      ),
    );
    const { onImported } = openForm();
    await prepareFiles();
    confirmRights();
    register();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "지원하지 않는 음원 파일",
    );
    expect(screen.getByLabelText("음원 MP3·WAV")).toBeEnabled();
    expect(screen.getByLabelText("문제지 PDF")).toBeDisabled();
    const replacement = chooseFile(
      "음원 MP3·WAV",
      "corrected.mp3",
      "audio/mpeg",
    );
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(pdf.upload.mock.calls[1][1]).toEqual(replacement);
    expect(
      server.calls("POST").filter((request) => request.path === "/sets"),
    ).toHaveLength(1);
    expect(
      server
        .calls("POST")
        .filter((request) => request.path.endsWith("/review")),
    ).toHaveLength(1);
  });

  it("reuses completed audio and the same group after PATCH failure, fetching the latest revision", async () => {
    const server = serverFixture({ failPatch: true, retryRevision: 9 });
    const { onImported } = openForm();
    await prepareFiles();
    confirmRights();
    register();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문항 저장 실패",
    );
    expect(onImported).not.toHaveBeenCalled();
    const first = listeningUpdateSetSchema.parse(server.calls("PATCH")[0].body);
    expect(screen.getByLabelText("음원 MP3·WAV")).toBeDisabled();
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(pdf.upload).toHaveBeenCalledOnce();
    expect(server.calls("POST").filter((r) => r.path === "/sets")).toHaveLength(
      1,
    );
    expect(
      server.calls("POST").filter((r) => r.path.endsWith("/review")),
    ).toHaveLength(1);
    const retry = listeningUpdateSetSchema.parse(server.calls("PATCH")[1].body);
    expect(first.expectedRevision).toBe(2);
    expect(retry.expectedRevision).toBe(9);
    expect(retry.title).toBe("최신 저장본 제목");
    expect(retry.groups).toEqual(first.groups);
  });

  it("retries rights-review failure before any upload and retains the original set", async () => {
    const server = serverFixture({ failReview: true });
    const { onImported } = openForm();
    await prepareFiles();
    confirmRights();
    register();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "출처 확인 저장 실패",
    );
    expect(pdf.upload).not.toHaveBeenCalled();
    expect(server.calls("PATCH")).toHaveLength(0);
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(server.calls("POST").filter((r) => r.path === "/sets")).toHaveLength(
      1,
    );
    const reviews = server
      .calls("POST")
      .filter((r) => r.path.endsWith("/review"));
    expect(reviews).toHaveLength(2);
    expect(
      reviews.map(
        (r) => listeningReviewSetSchema.parse(r.body).expectedRevision,
      ),
    ).toEqual([1, 1]);
    expect(pdf.upload).toHaveBeenCalledOnce();
  });

  it("locks inputs and navigation while parsing or uploading and reports busy state", async () => {
    const reading = deferred<ListeningEditQuestion[]>();
    const uploading = deferred<typeof audio>();
    pdf.questions.mockReturnValueOnce(reading.promise);
    pdf.upload.mockReturnValueOnce(uploading.promise);
    serverFixture();
    const { container, onImported, onState } = openForm();
    fireEvent.change(screen.getByLabelText("제목", { exact: true }), {
      target: { value: "등록할 듣기 자료" },
    });
    fireEvent.change(screen.getByLabelText("출처·사용 근거"), {
      target: { value: "교사 수업 사용 근거" },
    });
    chooseFile("음원 MP3·WAV", "original.mp3", "audio/mpeg");
    chooseFile("문제지 PDF", "questions.pdf", "application/pdf");
    fireEvent.click(screen.getByRole("button", { name: "문항 읽기" }));
    const assertLocked = () => {
      for (const input of container.querySelectorAll("input,select"))
        expect(input).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "듣기평가 파일 등록" }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "문항 읽기" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "재생" })).toBeDisabled();
      expect(onState).toHaveBeenLastCalledWith(true, true);
    };
    assertLocked();
    await act(async () => reading.resolve(questionFixture()));
    await screen.findByText(/2문항을 읽었습니다/);
    expect(screen.getByLabelText("제목", { exact: true })).toBeEnabled();
    confirmRights();
    register();
    await waitFor(() => expect(pdf.upload).toHaveBeenCalledOnce());
    assertLocked();
    expect(screen.getByRole("button", { name: "등록 중…" })).toBeDisabled();
    await act(async () => uploading.resolve(audio));
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(onState).toHaveBeenLastCalledWith(false, false);
  });

  it("shows the PDF parsing cause and unlocks the form without registering a draft", async () => {
    const server = serverFixture();
    pdf.questions.mockRejectedValueOnce(
      new Error("문항 번호의 경계를 확인하지 못했습니다."),
    );
    openForm();
    chooseFile("문제지 PDF", "questions.pdf", "application/pdf");
    fireEvent.click(screen.getByRole("button", { name: "문항 읽기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문항 번호의 경계를 확인하지 못했습니다.",
    );
    expect(screen.getByLabelText("문제지 PDF")).toBeEnabled();
    expect(screen.getByRole("button", { name: "문항 읽기" })).toBeEnabled();
    expect(server.fetcher).not.toHaveBeenCalled();
    expect(pdf.upload).not.toHaveBeenCalled();
  });

  it("allows correcting an out-of-file question range and reuses the uploaded audio on retry", async () => {
    const server = serverFixture();
    const { onImported } = openForm();
    await prepareFiles();
    const first = screen.getByText(/^1번 ·/).closest("details")!;
    fireEvent.click(within(first).getByText(/^1번 ·/));
    fireEvent.change(within(first).getByLabelText("전체 음원 끝 (초)"), {
      target: { value: "91" },
    });
    confirmRights();
    register();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1번 음원 구간이 파일 길이를 넘습니다.",
    );
    expect(server.calls("PATCH")).toHaveLength(0);
    expect(onImported).not.toHaveBeenCalled();
    expect(screen.getByLabelText("제목", { exact: true })).toBeDisabled();
    const end = within(first).getByLabelText("전체 음원 끝 (초)");
    expect(end).toBeEnabled();
    fireEvent.change(end, { target: { value: "45" } });
    register();
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(pdf.upload).toHaveBeenCalledOnce();
    expect(server.calls("POST").filter((r) => r.path === "/sets")).toHaveLength(
      1,
    );
    expect(
      listeningUpdateSetSchema.parse(server.calls("PATCH")[0].body).groups[0]
        .questions[0].audioRange,
    ).toEqual({ startMs: 0, endMs: 45_000 });
  });
});
