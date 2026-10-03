import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TextbookConceptActivity } from "@/components/learn/textbook/TextbookConceptActivity";
import {
  textbookStudentAttemptSchema,
  textbookStudentConceptSchema,
  type TextbookStudentConcept,
} from "@/contracts/textbookStudent.contract";
import { textbookAttemptSubmitSchema } from "@/contracts/textbookConcept.contract";

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/math/MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <span>{content}</span>
  ),
}));

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const EDITION_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";
const FIRST_REQUEST = "44444444-4444-4444-8444-444444444444";
const SECOND_REQUEST = "55555555-5555-4555-8555-555555555555";
const KEY = "common-denominator";
const BASE = `/api/learn/textbook/editions/${EDITION_ID}/concepts/${KEY}`;
const ownText =
  "1. 분모를 같게 만들고 크기를 비교합니다.\n2. 분수의 크기는 변하지 않습니다.";
const fetchMock = vi.fn<typeof fetch>();
type Submission = ReturnType<typeof textbookAttemptSubmitSchema.parse>;
let concept: TextbookStudentConcept;
let history: unknown[];
let submit: (body: Submission) => Promise<Response>;
let review: (body: { requestId: string }) => Promise<Response>;

function conceptFixture() {
  return textbookStudentConceptSchema.parse({
    editionId: EDITION_ID,
    conceptKey: KEY,
    title: "통분",
    frozenHash: "a".repeat(64),
    blanks: [
      {
        form: "cloze",
        prompts: [
          {
            id: "frozen-entry-cloze",
            label: "분모가 다른 분수의 통분",
            pieces: [
              { kind: "text", text: "분모를 " },
              { kind: "blank", index: 0 },
              { kind: "text", text: "로 바꿉니다." },
            ],
          },
          {
            id: "frozen-entry-apply",
            label:
              "방금 쓴 뜻으로 답하고 까닭을 쓰세요: 왜 분모를 같게 하나요?",
            pieces: [{ kind: "blank", index: 0 }],
          },
        ],
      },
      {
        form: "term",
        prompts: [
          {
            id: "frozen-entry-term",
            label: "통분의 뜻을 설명하세요.",
            pieces: [{ kind: "blank", index: 0 }],
          },
          {
            id: "frozen-entry-ox",
            label:
              "맞으면 ○, 틀리면 ×를 쓰고 까닭을 설명하세요: 분수의 크기는 변합니다.",
            pieces: [{ kind: "blank", index: 0 }],
          },
        ],
      },
    ],
    paperForms: ["map", "figure"],
    reviewAccess: {
      available: false,
      reasonCode: "no-existing-concept-record",
    },
  });
}

function json(data: unknown) {
  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
  });
}

function savedAttempt(body: Submission) {
  return textbookStudentAttemptSchema.parse({
    attemptId: ATTEMPT_ID,
    form: body.form,
    channel: "student-text",
    response: body.response,
    submittedAt: "2026-10-03T00:00:00.000Z",
    reviewStatus: "pending",
  });
}

function posts() {
  return fetchMock.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
}

function postedBody(index: number) {
  return textbookAttemptSubmitSchema.parse(
    JSON.parse(String(posts()[index][1]?.body)),
  );
}

async function openActivity() {
  const rendered = render(
    <TextbookConceptActivity
      studentId={STUDENT_ID}
      editionId={EDITION_ID}
      conceptKey={KEY}
    />,
  );
  await screen.findByRole("heading", { name: "통분", level: 1 });
  return rendered;
}

function writeAnswer(value = ownText) {
  fireEvent.change(screen.getByRole("textbox", { name: "나의 설명" }), {
    target: { value },
  });
}

function pressSubmit() {
  fireEvent.click(screen.getByRole("button", { name: "답변 제출" }));
}

beforeEach(() => {
  concept = conceptFixture();
  history = [];
  submit = async (body) =>
    json({ attempt: savedAttempt(body), replayed: false });
  review = async () =>
    json({
      status: "started",
      reasonCode: null,
      replayed: false,
      href: "/learn?view=collection",
    });
  push.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, options) => {
    const path = String(url);
    if (options?.method === "POST" && path === `${BASE}/attempts`)
      return submit(
        textbookAttemptSubmitSchema.parse(JSON.parse(String(options.body))),
      );
    if (options?.method === "POST" && path === `${BASE}/review`)
      return review(JSON.parse(String(options.body)));
    if (options?.method === undefined && path === BASE) return json(concept);
    if (options?.method === undefined && path === `${BASE}/attempts`)
      return json(history);
    throw new Error(
      `Unexpected student request: ${options?.method ?? "GET"} ${path}`,
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

describe("교재 학생 개념백지 활동", () => {
  it("공개 문항 순서와 빈칸만 보여 주며 종이 형식을 디지털 답변으로 바꾸지 않는다", async () => {
    await openActivity();
    const prompts = screen.getAllByRole("listitem");
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toHaveTextContent("분모가 다른 분수의 통분");
    expect(prompts[1]).toHaveTextContent("왜 분모를 같게 하나요?");
    expect(screen.getAllByLabelText("빈칸 1")).toHaveLength(2);
    expect(
      screen.getByText(/개념 지도 · 그림 백지는 교재의 종이 활동/),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "개념 지도" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "그림 백지" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "답변 제출" })).toBeDisabled();
    expect(posts()).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "개념 복습 이어가기" }),
    ).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual(
      [BASE, `${BASE}/attempts`].sort(),
    );
  });

  it("제출은 현재 형식과 원문 및 요청 ID만 보내며 모든 요청에 화면 학생 ID를 묶는다", async () => {
    await openActivity();
    writeAnswer();
    pressSubmit();
    await screen.findByText("답변을 저장했어요. 선생님이 확인할 수 있어요.");
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe(`${BASE}/attempts`);
    expect(postedBody(0)).toEqual({
      requestId: FIRST_REQUEST,
      form: "cloze",
      response: ownText,
    });
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      requestId: FIRST_REQUEST,
      form: "cloze",
      response: ownText,
    });
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).get("x-student-id")).toBe(
        STUDENT_ID,
      );
      expect(options?.cache).toBe("no-store");
    }
    expect(new Headers(posts()[0][1]?.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(screen.getByRole("textbox", { name: "나의 설명" })).toHaveValue("");
    expect(
      screen
        .getByRole("heading", { name: "내 활동 기록" })
        .parentElement?.querySelectorAll("article"),
    ).toHaveLength(1);
    expect(screen.queryByText(/숙달 완료|정답입니다/)).not.toBeInTheDocument();
  });

  it("저장 응답이 유실되면 입력을 지키고 같은 본문을 같은 UUID로 재시도한다", async () => {
    let count = 0;
    submit = async (body) => {
      count++;
      if (count === 1) throw new TypeError("저장 응답이 유실되었습니다.");
      return json({ attempt: savedAttempt(body), replayed: true });
    };
    await openActivity();
    writeAnswer();
    pressSubmit();
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: "나의 설명" })).toHaveValue(
      ownText,
    );
    expect(
      screen.queryByText("답변을 저장했어요. 선생님이 확인할 수 있어요."),
    ).not.toBeInTheDocument();
    pressSubmit();
    await screen.findByText("답변을 저장했어요. 선생님이 확인할 수 있어요.");
    expect(posts()).toHaveLength(2);
    expect(postedBody(1)).toEqual(postedBody(0));
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole("heading", { name: "내 활동 기록" })
        .parentElement?.querySelectorAll("article"),
    ).toHaveLength(1);
  });

  it("응답 유실 뒤 답을 고치면 이전 UUID를 다른 본문에 재사용하지 않는다", async () => {
    submit = async () => {
      throw new TypeError("응답을 받지 못했습니다.");
    };
    await openActivity();
    writeAnswer();
    pressSubmit();
    await screen.findByRole("alert");
    const corrected = "분자와 분모에 같은 수를 곱하므로 크기가 같습니다.";
    writeAnswer(corrected);
    submit = async (body) =>
      json({ attempt: savedAttempt(body), replayed: false });
    pressSubmit();
    await screen.findByText("답변을 저장했어요. 선생님이 확인할 수 있어요.");
    expect(postedBody(0)).toEqual({
      requestId: FIRST_REQUEST,
      form: "cloze",
      response: ownText,
    });
    expect(postedBody(1)).toEqual({
      requestId: SECOND_REQUEST,
      form: "cloze",
      response: corrected,
    });
  });

  it("형식을 바꾸면 이전 답과 실패한 요청을 재사용하지 않고 새 형식으로 제출한다", async () => {
    submit = async () => {
      throw new TypeError("응답을 받지 못했습니다.");
    };
    await openActivity();
    writeAnswer();
    pressSubmit();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "용어 백지" }));
    expect(screen.getByRole("textbox", { name: "나의 설명" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "답변 제출" })).toBeDisabled();
    expect(
      screen.queryByText("분모가 다른 분수의 통분"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("통분의 뜻을 설명하세요.")).toBeVisible();
    expect(screen.getByText(/맞으면 ○, 틀리면 ×를 쓰고 까닭/)).toBeVisible();
    const termAnswer = "통분은 분모를 같게 하는 것입니다. ○× 문항은 ×입니다.";
    writeAnswer(termAnswer);
    submit = async (body) =>
      json({ attempt: savedAttempt(body), replayed: false });
    pressSubmit();
    await screen.findByText("답변을 저장했어요. 선생님이 확인할 수 있어요.");
    expect(postedBody(1)).toEqual({
      requestId: SECOND_REQUEST,
      form: "term",
      response: termAnswer,
    });
  });

  it("제출이 끝나기 전에는 형식을 바꾸거나 다른 답변을 중복 제출할 수 없다", async () => {
    let finish: ((response: Response) => void) | undefined;
    submit = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    await openActivity();
    writeAnswer();
    pressSubmit();
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(screen.getByRole("textbox", { name: "나의 설명" })).toBeDisabled();
    const termButton = screen.getByRole("button", { name: "용어 백지" });
    expect(termButton).toBeDisabled();
    fireEvent.click(termButton);
    fireEvent.click(screen.getByRole("button", { name: "저장 중…" }));
    expect(posts()).toHaveLength(1);
    expect(postedBody(0).form).toBe("cloze");
    await act(async () => {
      finish!(json({ attempt: savedAttempt(postedBody(0)), replayed: false }));
    });
    expect(
      screen.getByText("답변을 저장했어요. 선생님이 확인할 수 있어요."),
    ).toBeVisible();
  });

  it("교사 종이 확인 기록은 응답·메모 대신 확인 사실만 보여 준다", async () => {
    history = [
      textbookStudentAttemptSchema.parse({
        attemptId: ATTEMPT_ID,
        form: "figure",
        channel: "teacher-observed",
        response: null,
        submittedAt: "2026-10-03T00:00:00.000Z",
        reviewStatus: "checked",
      }),
    ];
    await openActivity();
    const historySection = screen.getByRole("heading", {
      name: "내 활동 기록",
    }).parentElement!;
    expect(
      within(historySection).getByText(
        "선생님이 종이 활동을 확인한 기록입니다.",
      ),
    ).toBeVisible();
    expect(within(historySection).getByText("그림 백지")).toBeVisible();
    expect(within(historySection).getByText("확인 완료")).toBeVisible();
    expect(historySection).not.toHaveTextContent("null");
    expect(posts()).toHaveLength(0);
  });

  it("서버가 교사 비공개 메모를 잘못 보내도 실제 strict 응답 계약이 화면 노출을 막는다", async () => {
    history = [
      {
        attemptId: ATTEMPT_ID,
        form: "figure",
        channel: "teacher-observed",
        response: null,
        submittedAt: "2026-10-03T00:00:00.000Z",
        reviewStatus: "checked",
        note: "TEACHER_PRIVATE_NOTE_CANARY",
      },
    ];
    render(
      <TextbookConceptActivity
        studentId={STUDENT_ID}
        editionId={EDITION_ID}
        conceptKey={KEY}
      />,
    );
    await screen.findByRole("alert");
    expect(document.body).not.toHaveTextContent("TEACHER_PRIVATE_NOTE_CANARY");
    expect(
      screen.queryByRole("heading", { name: "내 활동 기록" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "답변 제출" }),
    ).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it("종이 활동만 있는 고정 개념에 임의의 디지털 문항이나 제출 형식을 만들지 않는다", async () => {
    concept = textbookStudentConceptSchema.parse({ ...concept, blanks: [] });
    await openActivity();
    expect(
      screen.getByText(/개념 지도 · 그림 백지는 교재의 종이 활동/),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "답변 제출" }),
    ).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it("복습을 한 번 요청하고 기존 도감으로 이동하면서 교재로 돌아올 주소를 보존한다", async () => {
    concept.reviewAccess = { available: true, reasonCode: null };
    let finish!: (response: Response) => void;
    review = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    await openActivity();
    expect(posts()).toHaveLength(0);
    const button = screen.getByRole("button", { name: "개념 복습 이어가기" });
    fireEvent.click(button);
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe(`${BASE}/review`);
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      requestId: FIRST_REQUEST,
    });
    expect(new Headers(posts()[0][1]?.headers).get("x-student-id")).toBe(
      STUDENT_ID,
    );
    expect(push).not.toHaveBeenCalled();
    await act(async () => {
      finish(
        json({
          status: "started",
          reasonCode: null,
          replayed: false,
          href: "/learn?view=collection",
        }),
      );
    });
    expect(push).toHaveBeenCalledTimes(1);
    const destination = new URL(push.mock.calls[0][0], "https://school.test");
    expect(destination.pathname).toBe("/learn");
    expect(destination.searchParams.get("view")).toBe("collection");
    expect(destination.searchParams.get("fromTextbook")).toBe(
      `/learn/textbook/${EDITION_ID}/concepts/${KEY}`,
    );
    expect(posts().some(([url]) => String(url).endsWith("/attempts"))).toBe(
      false,
    );
  });

  it("복습 시작 응답이 유실되면 같은 UUID로 재시도하고 재개 응답으로 이동한다", async () => {
    concept.reviewAccess = { available: true, reasonCode: null };
    let count = 0;
    review = async () => {
      if (++count === 1)
        throw new TypeError("복습 시작 응답을 받지 못했습니다.");
      return json({
        status: "resumed",
        reasonCode: "continue-current-concepts",
        replayed: true,
        href: "/learn?view=collection",
      });
    };
    await openActivity();
    fireEvent.click(screen.getByRole("button", { name: "개념 복습 이어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "복습 시작 응답을 받지 못했습니다.",
    );
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "개념 복습 이어가기" }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(2);
    expect(posts().map(([url]) => url)).toEqual([
      `${BASE}/review`,
      `${BASE}/review`,
    ]);
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      requestId: FIRST_REQUEST,
    });
    expect(posts()[1][1]?.body).toBe(posts()[0][1]?.body);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("복습 요청 충돌은 안내하고 현재 답변을 유지하며 도감으로 이동하지 않는다", async () => {
    concept.reviewAccess = { available: true, reasonCode: null };
    const message = "같은 요청 번호로 다른 답을 보낼 수 없어요.";
    review = async () =>
      new Response(JSON.stringify({ error: { code: "CONFLICT", message } }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    await openActivity();
    writeAnswer();
    fireEvent.click(screen.getByRole("button", { name: "개념 복습 이어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("textbox", { name: "나의 설명" })).toHaveValue(
      ownText,
    );
    expect(
      screen.getByRole("button", { name: "개념 복습 이어가기" }),
    ).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe(`${BASE}/review`);
  });
});
