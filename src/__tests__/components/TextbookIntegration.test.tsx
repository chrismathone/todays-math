import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TextbookConceptLinks from "@/components/textbook/integration/TextbookConceptLinks";
import TextbookStudentEvidence from "@/components/textbook/integration/TextbookStudentEvidence";
import type { MathTextProps } from "@/components/math/MathText";
import {
  textbookAttemptReviewSchema,
  textbookConceptAttemptSchema,
  type TextbookConceptAttempt,
} from "@/contracts/textbookConcept.contract";
import { textbookConceptLookupSchema } from "@/contracts/textbookServer.contract";

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: MathTextProps) => <span>{text}</span>,
}));

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const EDITION_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";
const FIRST_REQUEST = "44444444-4444-4444-8444-444444444444";
const SECOND_REQUEST = "55555555-5555-4555-8555-555555555555";
const OTHER_ID = "66666666-6666-4666-8666-666666666666";
const TEACHER_ID = "77777777-7777-4777-8777-777777777777";
const KEY = "common-denominator";
const FIRST_SECTION = "초5::분수의 덧셈과 뺄셈::통분";
const SECOND_SECTION = "초5::분수의 덧셈과 뺄셈::약분";
const EVIDENCE_URL = `/api/textbook/students/${STUDENT_ID}/concept-evidence`;
const REVIEW_URL = `/api/textbook/concept-attempts/${ATTEMPT_ID}/review`;
const NOTE = "  분모가 같아야 하는 이유를 다시 설명하기\n다음 수업에서 확인  ";
const fetchMock = vi.fn<typeof fetch>();
type ReviewRequest = ReturnType<typeof textbookAttemptReviewSchema.parse>;

function json(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
  });
}
function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function attempt(overrides: Partial<TextbookConceptAttempt> = {}) {
  return textbookConceptAttemptSchema.parse({
    attemptId: ATTEMPT_ID,
    requestId: OTHER_ID,
    bodyHash: "b".repeat(64),
    studentId: STUDENT_ID,
    editionId: EDITION_ID,
    conceptKey: KEY,
    frozenHash: "a".repeat(64),
    form: "cloze",
    channel: "student-text",
    response: "분모를 같게 하면 같은 크기의 조각으로 비교할 수 있습니다.",
    submittedAt: "2026-10-03T00:00:00.000Z",
    revision: 1,
    reviewStatus: "pending",
    reviewedBy: null,
    reviewedAt: null,
    note: null,
    ...overrides,
  });
}
function evidence(value = attempt(), canOpen = true) {
  return {
    attempts: [value],
    references: [
      {
        editionId: value.editionId,
        conceptKey: value.conceptKey,
        canOpen,
        bookTitle: canOpen ? "분수 학습 교재" : null,
        editionLabel: canOpen ? "제1판" : null,
        conceptTitle: canOpen ? "통분의 이유" : null,
      },
    ],
  };
}
function lookup(
  section = FIRST_SECTION,
  status: "draft" | "published" = "published",
  bookTitle = "연결 교재",
  hasFrozen = status === "published",
) {
  return textbookConceptLookupSchema.parse({
    blankSectionKey: section,
    matches: [
      {
        bookId: OTHER_ID,
        bookTitle,
        editionId: EDITION_ID,
        editionLabel: "제1판",
        status,
        hasFrozen,
        access: "owner",
        conceptKey: KEY,
        conceptTitle: "통분의 이유",
        entries: [
          {
            entryKind: "concept",
            entryId: "term-1",
            reviewStatus: "confirmed",
          },
          { entryKind: "ox", entryId: "ox-1", reviewStatus: "candidate" },
        ],
      },
    ],
  });
}
function saved(body: ReviewRequest, base = attempt()) {
  return attempt({
    ...base,
    revision: body.expectedRevision + 1,
    reviewStatus: body.reviewStatus,
    note: body.note,
    reviewedBy: TEACHER_ID,
    reviewedAt: "2026-10-03T01:00:00.000Z",
  });
}
function puts() {
  return fetchMock.mock.calls.filter(
    ([, options]) => options?.method === "PUT",
  );
}
function putBody(index: number) {
  return textbookAttemptReviewSchema.parse(
    JSON.parse(String(puts()[index][1]?.body)),
  );
}
let evidenceBody: ReturnType<typeof evidence>;
let review: (body: ReviewRequest) => Promise<Response>;
async function openEvidence() {
  const result = render(<TextbookStudentEvidence studentId={STUDENT_ID} />);
  await screen.findByRole("textbox", { name: "교사 메모" });
  return result;
}
function writeNote(note = NOTE) {
  fireEvent.change(screen.getByRole("textbox", { name: "교사 메모" }), {
    target: { value: note },
  });
}
function check() {
  fireEvent.click(screen.getByRole("button", { name: "확인 완료" }));
}
beforeEach(() => {
  evidenceBody = evidence();
  review = async (body) => json(saved(body));
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, options) => {
    const path = String(url);
    if (!options?.method && path === EVIDENCE_URL) return json(evidenceBody);
    if (options?.method === "PUT" && path === REVIEW_URL)
      return review(
        textbookAttemptReviewSchema.parse(JSON.parse(String(options.body))),
      );
    if (!options?.method && path.startsWith("/api/textbook/concepts/lookup?")) {
      const section = new URL(path, "https://example.test").searchParams.get(
        "blankSectionKey",
      );
      if (!section) throw new Error("Missing exact section key");
      return json(lookup(section));
    }
    throw new Error(
      `Unexpected integration request: ${options?.method ?? "GET"} ${path}`,
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(crypto, "randomUUID")
    .mockReturnValueOnce(FIRST_REQUEST)
    .mockReturnValueOnce(SECOND_REQUEST);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("개념백지에서 교재로 이어지는 지연 조회", () => {
  it("선택 소단원이 달라져도 자동으로 펼치거나 조회하지 않고 사용자가 열 때만 현재 소단원을 읽는다", async () => {
    const rendered = render(
      <TextbookConceptLinks sections={[FIRST_SECTION]} active />,
    );
    const toggle = screen.getByRole("button", { name: "이 개념이 실린 교재" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(fetchMock).not.toHaveBeenCalled();
    rendered.rerender(
      <TextbookConceptLinks sections={[SECOND_SECTION]} active />,
    );
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await screen.findByText("연결 교재");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(
      new URL(String(url), "https://example.test").searchParams.get(
        "blankSectionKey",
      ),
    ).toBe(SECOND_SECTION);
    expect(options?.cache).toBe("no-store");
    expect(options?.signal?.aborted).toBe(false);
    fireEvent.click(toggle);
    expect(options?.signal?.aborted).toBe(true);
    expect(screen.queryByText("연결 교재")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("숨겨진 화면에서 펼쳐도 조회하지 않다가 활성화하면 선택한 소단원 하나만 읽는다", async () => {
    const rendered = render(
      <TextbookConceptLinks
        sections={[FIRST_SECTION, SECOND_SECTION]}
        active={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "이 개념이 실린 교재" }),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "소단원" }), {
      target: { value: SECOND_SECTION },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    rendered.rerender(
      <TextbookConceptLinks
        sections={[FIRST_SECTION, SECOND_SECTION]}
        active
      />,
    );
    await screen.findByText("연결 교재");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      new URL(
        String(fetchMock.mock.calls[0][0]),
        "https://example.test",
      ).searchParams.get("blankSectionKey"),
    ).toBe(SECOND_SECTION);
  });

  it("선택 소단원이 없으면 빈 안내만 보여 주고 전체 교재 조회를 만들지 않는다", () => {
    render(<TextbookConceptLinks sections={[]} active />);
    fireEvent.click(
      screen.getByRole("button", { name: "이 개념이 실린 교재" }),
    );
    expect(screen.getByText(/소단원을 고르면/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("소단원을 바꾸면 이전 조회를 취소하고 늦게 도착한 이전 교재를 표시하지 않는다", async () => {
    let finish: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation(async (url) => {
      const section = new URL(
        String(url),
        "https://example.test",
      ).searchParams.get("blankSectionKey");
      if (section === FIRST_SECTION)
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return json(lookup(SECOND_SECTION, "published", "현재 소단원 교재"));
    });
    render(
      <TextbookConceptLinks
        sections={[FIRST_SECTION, SECOND_SECTION]}
        active
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "이 개념이 실린 교재" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const oldSignal = fetchMock.mock.calls[0][1]?.signal;
    fireEvent.change(screen.getByRole("combobox", { name: "소단원" }), {
      target: { value: SECOND_SECTION },
    });
    await screen.findByText("현재 소단원 교재");
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => {
      finish!(json(lookup(FIRST_SECTION, "published", "STALE_BOOK_CANARY")));
    });
    expect(screen.getByText("현재 소단원 교재")).toBeVisible();
    expect(screen.queryByText("STALE_BOOK_CANARY")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: "draft" as const, hasFrozen: false },
    { status: "published" as const, hasFrozen: false },
    { status: "published" as const, hasFrozen: true },
  ])(
    "$status / 고정 $hasFrozen 원고의 백지 인쇄는 고정된 발행본에만 표시한다",
    async ({ status, hasFrozen }) => {
      fetchMock.mockResolvedValue(
        json(lookup(FIRST_SECTION, status, "연결 교재", hasFrozen)),
      );
      render(<TextbookConceptLinks sections={[FIRST_SECTION]} active />);
      fireEvent.click(
        screen.getByRole("button", { name: "이 개념이 실린 교재" }),
      );
      expect(
        await screen.findByRole("link", { name: "교재에서 열기" }),
      ).toHaveAttribute("href", `/?textbookEdition=${EDITION_ID}#textbook`);
      expect(screen.getByText("연결 2개 · 확인 1개")).toBeVisible();
      const print = screen.queryByRole("link", {
        name: "교재에 실린 백지 인쇄",
      });
      if (status === "published" && hasFrozen) {
        expect(print).toHaveAttribute(
          "href",
          `/textbook/editions/${EDITION_ID}/concepts/${KEY}/blank?view=student`,
        );
        expect(print).toHaveAttribute("rel", "noopener noreferrer");
      } else expect(print).not.toBeInTheDocument();
    },
  );

  it("잘못된 링크 응답은 실제 strict 계약이 거절하고 명시적인 재조회로 복구한다", async () => {
    const malformed = lookup();
    malformed.matches[0].editionId = "javascript:alert(1)";
    fetchMock
      .mockResolvedValueOnce(json(malformed))
      .mockResolvedValueOnce(json(lookup()));
    render(<TextbookConceptLinks sections={[FIRST_SECTION]} active />);
    fireEvent.click(
      screen.getByRole("button", { name: "이 개념이 실린 교재" }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByRole("link", { name: "교재에서 열기" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toEqual(fetchMock.mock.calls[0][0]);
  });
});

describe("교사 학생 상세의 교재 활동과 확인", () => {
  it("treats a valid empty textbook history as no activity, not a missing student", async () => {
    evidenceBody = { attempts: [], references: [] };
    render(<TextbookStudentEvidence studentId={STUDENT_ID} />);
    await screen.findByText(/아직 기록된 교재 활동이 없습니다/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe(EVIDENCE_URL);
    expect(puts()).toHaveLength(0);
  });

  it("explains an unavailable textbook read without claiming the student is missing or access is certainly denied", async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(404, "학생을(를) 찾을 수 없습니다."),
    );
    render(<TextbookStudentEvidence studentId={STUDENT_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "교재 활동을 확인할 수 없습니다. 학생의 재원 상태와 교재 담당 권한을 확인해 주세요.",
    );
    expect(screen.queryByText(/아직 기록된 교재 활동/)).not.toBeInTheDocument();
    expect(screen.queryByText(/학생을.*찾을 수/)).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("정확한 학생의 활동과 허용된 교재 링크를 표시하고 CAS 요청만 저장한다", async () => {
    await openEvidence();
    expect(screen.getByText(attempt().response)).toBeVisible();
    expect(screen.getByText("통분의 이유")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "교재 백지·채점표" }),
    ).toHaveAttribute(
      "href",
      `/textbook/editions/${EDITION_ID}/concepts/${KEY}/blank?view=both`,
    );
    writeNote();
    check();
    await screen.findByText("활동 확인을 저장했습니다.");
    expect(puts()).toHaveLength(1);
    expect(putBody(0)).toEqual({
      requestId: FIRST_REQUEST,
      expectedRevision: 1,
      reviewStatus: "checked",
      note: NOTE,
    });
    expect(JSON.parse(String(puts()[0][1]?.body))).toEqual(putBody(0));
    expect(puts()[0][0]).toBe(REVIEW_URL);
    expect(new Headers(puts()[0][1]?.headers).get("content-type")).toBe(
      "application/json",
    );
    for (const [, options] of fetchMock.mock.calls)
      expect(options?.cache).toBe("no-store");
    expect(screen.getByText("확인 상태: 확인 완료")).toBeVisible();
    expect(screen.queryByText(/숙달 완료|정답입니다/)).not.toBeInTheDocument();
  });

  it("응답에 다른 학생 기록이 한 건이라도 섞이면 기록·메모·교재 링크 모두 표시하지 않는다", async () => {
    evidenceBody.attempts.push(
      attempt({
        attemptId: OTHER_ID,
        studentId: OTHER_ID,
        response: "OTHER_STUDENT_RESPONSE_CANARY",
        note: "OTHER_STUDENT_NOTE_CANARY",
      }),
    );
    render(<TextbookStudentEvidence studentId={STUDENT_ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학생 기록이 일치하지 않습니다.",
    );
    expect(document.body).not.toHaveTextContent(
      /OTHER_STUDENT_RESPONSE_CANARY|OTHER_STUDENT_NOTE_CANARY/,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("비공유 교재 활동의 읽기 권한이 없으면 관찰 기록만 남기고 원고·백지 링크를 만들지 않는다", async () => {
    evidenceBody = evidence(
      attempt({
        channel: "teacher-observed",
        response: "종이 백지에서 풀이 순서를 설명했습니다.",
      }),
      false,
    );
    await openEvidence();
    expect(screen.getByText("교재 개념 활동")).toBeVisible();
    expect(
      screen.getByText("종이 백지에서 풀이 순서를 설명했습니다."),
    ).toBeVisible();
    expect(screen.getByText(/교사의 종이 활동 관찰/)).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("분수 학습 교재")).not.toBeInTheDocument();
    expect(screen.queryByText("통분의 이유")).not.toBeInTheDocument();
  });

  it.each([401, 403, 404])(
    "활동 새로고침이 %s로 권한 종료를 알리면 이전 응답·메모·교재 링크를 계속 보여 주지 않는다",
    async (status) => {
      await openEvidence();
      writeNote();
      fetchMock.mockResolvedValueOnce(
        errorResponse(status, "이 학생 기록을 열 수 없습니다."),
      );
      fireEvent.click(screen.getByRole("button", { name: "활동 새로고침" }));
      await screen.findByText(
        status === 404
          ? "교재 활동을 확인할 수 없습니다. 학생의 재원 상태와 교재 담당 권한을 확인해 주세요."
          : "이 학생 기록을 열 수 없습니다.",
      );
      expect(screen.queryByText(attempt().response)).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "확인 완료" }),
      ).not.toBeInTheDocument();
      expect(puts()).toHaveLength(0);
    },
  );

  it("화면 학생이 바뀌면 새 학생 조회 중에 이전 답변과 메모·저장 버튼을 남기지 않는다", async () => {
    const rendered = await openEvidence();
    writeNote();
    let finish: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation(async (url, options) => {
      expect(String(url)).toBe(
        `/api/textbook/students/${OTHER_ID}/concept-evidence`,
      );
      expect(options?.method).toBeUndefined();
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
    rendered.rerender(<TextbookStudentEvidence studentId={OTHER_ID} />);
    expect(screen.queryByText(attempt().response)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "확인 완료" }),
    ).not.toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => {
      finish!(
        json(
          evidence(
            attempt({
              studentId: OTHER_ID,
              attemptId: OTHER_ID,
              response: "새 학생이 제출한 설명입니다.",
            }),
          ),
        ),
      );
    });
    expect(screen.getByText("새 학생이 제출한 설명입니다.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue("");
    expect(puts()).toHaveLength(0);
  });

  it.each([false, true])(
    "저장 응답 유실 뒤 메모 수정=%s일 때 본문에 맞는 요청 ID로 재시도한다",
    async (changed) => {
      review = async () => {
        throw new TypeError("저장 응답을 받지 못했습니다.");
      };
      await openEvidence();
      writeNote();
      check();
      await screen.findByRole("alert");
      expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue(
        NOTE,
      );
      expect(
        screen.queryByText("활동 확인을 저장했습니다."),
      ).not.toBeInTheDocument();
      const corrected = "수정한 메모를 다음 시간에 확인합니다.";
      if (changed) writeNote(corrected);
      review = async (body) => json(saved(body));
      check();
      await screen.findByText("활동 확인을 저장했습니다.");
      expect(puts()).toHaveLength(2);
      expect(putBody(1)).toEqual({
        ...putBody(0),
        requestId: changed ? SECOND_REQUEST : FIRST_REQUEST,
        note: changed ? corrected : NOTE,
      });
      expect(crypto.randomUUID).toHaveBeenCalledTimes(changed ? 2 : 1);
    },
  );

  it("409 충돌은 같은 revision 저장을 막고 최신 활동을 다시 읽은 뒤에도 입력 메모를 보존한다", async () => {
    review = async () => errorResponse(409, "다른 교사가 먼저 확인했습니다.");
    await openEvidence();
    writeNote();
    check();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "입력한 메모는 유지됩니다.",
    );
    expect(screen.getByRole("button", { name: "확인 완료" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "다시 살펴보기" }),
    ).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue(
      NOTE,
    );
    check();
    expect(puts()).toHaveLength(1);
    // An unchanged refresh cannot bypass the conflict guard.
    fireEvent.click(screen.getByRole("button", { name: "활동 새로고침" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) => url === EVIDENCE_URL),
      ).toHaveLength(2),
    );
    expect(screen.getByRole("button", { name: "확인 완료" })).toBeDisabled();
    evidenceBody = evidence(
      attempt({
        revision: 2,
        reviewStatus: "needs-review",
        note: "서버의 다른 교사 메모",
        reviewedBy: TEACHER_ID,
        reviewedAt: "2026-10-03T00:30:00.000Z",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 새로고침" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확인 완료" })).toBeEnabled(),
    );
    expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue(
      NOTE,
    );
    review = async (body) => json(saved(body));
    check();
    await screen.findByText("활동 확인을 저장했습니다.");
    expect(putBody(0)).toEqual({
      requestId: FIRST_REQUEST,
      expectedRevision: 1,
      reviewStatus: "checked",
      note: NOTE,
    });
    expect(putBody(1)).toEqual({
      requestId: SECOND_REQUEST,
      expectedRevision: 2,
      reviewStatus: "checked",
      note: NOTE,
    });
  });

  it("409 뒤 최신 활동 조회가 한번 실패해도 다음 성공 조회와 저장까지 입력 메모를 보존한다", async () => {
    review = async () => errorResponse(409, "다른 교사가 먼저 확인했습니다.");
    await openEvidence();
    writeNote();
    check();
    await screen.findByRole("alert");
    fetchMock.mockResolvedValueOnce(
      errorResponse(500, "최신 기록을 불러오지 못했습니다."),
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 새로고침" }));
    await screen.findByText("최신 기록을 불러오지 못했습니다.");
    evidenceBody = evidence(
      attempt({
        revision: 2,
        reviewStatus: "needs-review",
        note: "서버의 다른 교사 메모",
        reviewedBy: TEACHER_ID,
        reviewedAt: "2026-10-03T00:30:00.000Z",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 새로고침" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "확인 완료" })).toBeEnabled(),
    );
    expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue(
      NOTE,
    );
    review = async (body) => json(saved(body));
    check();
    await screen.findByText("활동 확인을 저장했습니다.");
    expect(putBody(1)).toMatchObject({ expectedRevision: 2, note: NOTE });
  });

  it.each(["attemptId", "studentId", "editionId", "conceptKey"] as const)(
    "저장 응답의 %s가 요청과 다르면 다른 기록을 반영하거나 성공을 표시하지 않는다",
    async (field) => {
      review = async (body) =>
        json(
          saved(
            body,
            attempt({
              [field]: field === "conceptKey" ? "other-concept" : OTHER_ID,
              response: "WRONG_SAVE_RESPONSE_CANARY",
              note: "WRONG_SAVE_NOTE_CANARY",
            }),
          ),
        );
      await openEvidence();
      writeNote();
      check();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "저장된 활동이 요청한 기록과 다릅니다.",
      );
      expect(screen.getByText("확인 상태: 확인 대기")).toBeVisible();
      expect(screen.getByRole("textbox", { name: "교사 메모" })).toHaveValue(
        NOTE,
      );
      expect(document.body).not.toHaveTextContent(
        /WRONG_SAVE_RESPONSE_CANARY|WRONG_SAVE_NOTE_CANARY/,
      );
      expect(
        screen.queryByText("활동 확인을 저장했습니다."),
      ).not.toBeInTheDocument();
      review = async (body) => json(saved(body));
      check();
      await screen.findByText("활동 확인을 저장했습니다.");
      expect(putBody(1)).toEqual(putBody(0));
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    },
  );

  it("확인 저장 중에는 메모·확인 동작을 잠가 중복 요청을 보내지 않는다", async () => {
    let finish: ((response: Response) => void) | undefined;
    review = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    await openEvidence();
    writeNote();
    check();
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(screen.getByRole("textbox", { name: "교사 메모" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "확인 완료" })).toBeDisabled();
    const other = screen.getByRole("button", { name: "다시 살펴보기" });
    expect(other).toBeDisabled();
    fireEvent.click(other);
    check();
    expect(puts()).toHaveLength(1);
    await act(async () => {
      finish!(json(saved(putBody(0))));
    });
    expect(screen.getByText("활동 확인을 저장했습니다.")).toBeVisible();
  });
});
