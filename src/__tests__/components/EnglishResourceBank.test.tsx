import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EnglishResourceBank, {
  type EnglishResourceBankProps,
} from "@/components/english/bank/EnglishResourceBank";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import {
  englishPassageDetailSchema,
  type EnglishBankMakerSeed,
  type EnglishPassageDetail,
} from "@/contracts/englishBank.contract";

const passageId = "a0000000-0000-4000-8000-000000000001";
const secondId = "a0000000-0000-4000-8000-000000000002";
const examId = "b0000000-0000-4000-8000-000000000001";
const setId = "c0000000-0000-4000-8000-000000000001";
const userId = "d0000000-0000-4000-8000-000000000001";
const timestamp = "2026-10-03T00:00:00.000Z";
const exactText =
  "  Small changes help a school garden grow.\nWe learn together.  ";
const hash = "a".repeat(64);
const exam = {
  id: examId,
  school: "테스트 중학교",
  grade: "중2",
  title: "2학기 중간",
  examDate: null,
  types: [],
  materialCount: 1,
  setCount: 1,
  reviewedCount: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};
function passage(
  overrides: Partial<EnglishPassageDetail> = {},
): EnglishPassageDetail {
  return englishPassageDetailSchema.parse({
    id: passageId,
    title: "학교 텃밭",
    grade: "중2",
    source: { label: "직접 작성", url: null },
    text: exactText,
    textLength: exactText.length,
    revision: 1,
    textRevision: 1,
    snapshotHash: hash,
    rights: {
      status: "unconfirmed",
      basis: "",
      allowedUses: [],
      confirmedBy: null,
      confirmedAt: null,
    },
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    importedFrom: null,
    usages: [],
    ...overrides,
  });
}
function summary(item: EnglishPassageDetail) {
  const {
    text: _text,
    importedFrom: _importedFrom,
    usages: _usages,
    ...rest
  } = item;
  void _text;
  void _importedFrom;
  void _usages;
  return rest;
}
const confirmed = {
  status: "confirmed" as const,
  basis: "교사 직접 작성",
  allowedUses: ["generation_input" as const],
  confirmedBy: userId,
  confirmedAt: timestamp,
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const paged = (data: unknown[], nextCursor: string | null = null) =>
  json({ data, meta: { nextCursor } });
type RequestHandler = (
  url: URL,
  init: RequestInit,
) => Response | Promise<Response> | undefined;
function installFetch(handler: RequestHandler) {
  const mock = vi.fn(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(String(input), "http://localhost");
      const custom = handler(url, init);
      if (custom !== undefined) return await custom;
      if (url.pathname === "/api/english/passages") return paged([]);
      if (url.pathname === "/api/english/exams") return json({ data: [exam] });
      throw new Error(`Unexpected ${init.method ?? "GET"} ${url.pathname}`);
    },
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}
function props(
  overrides: Partial<EnglishResourceBankProps> = {},
): EnglishResourceBankProps {
  return {
    allowedMenus: [
      "english-bank",
      "english-maker",
      "english-school",
      "english-library",
      "english-listening",
    ],
    onUsePassage: vi.fn(),
    onOpenListening: vi.fn(),
    onOpenSet: vi.fn(),
    ...overrides,
  };
}
async function openPassage(title = "학교 텃밭") {
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(title) }),
  );
  await screen.findByRole("heading", { name: title });
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("English resource bank", () => {
  it("registers exact original, separately confirms rights, prepares for a selected exam and permits atomic shell handoff", async () => {
    let current: EnglishPassageDetail | null = null;
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    const fetcher = installFetch((url, init) => {
      if (init.method === "POST") {
        const body = JSON.parse(String(init.body));
        writes.push({ path: url.pathname, body });
        if (url.pathname.endsWith("/rights")) {
          current = passage({
            ...current!,
            revision: 2,
            rights: {
              ...confirmed,
              basis: body.basis,
              allowedUses: body.allowedUses,
            },
          });
          return json({ data: current });
        }
        if (url.pathname.endsWith("/prepare"))
          return json({
            data: {
              requestId: secondId,
              examId,
              path: body.path,
              passageRef: { passageId, textRevision: 1, snapshotHash: hash },
              title: current!.title,
              text: current!.text,
            },
          });
        current = passage({
          title: body.title,
          text: body.text,
          grade: body.grade,
          source: body.source,
          textLength: String(body.text).length,
        });
        return json(
          {
            data: current,
            meta: { replayed: false, duplicateIds: [secondId] },
          },
          201,
        );
      }
      if (url.pathname === "/api/english/passages")
        return paged(current ? [summary(current)] : []);
      if (url.pathname === `/api/english/passages/${passageId}`)
        return json({ data: current });
    });
    const onUsePassage = vi.fn((_seed: EnglishBankMakerSeed) => {
      void _seed;
      expect(
        window.dispatchEvent(
          new Event("english-bank-before-leave", { cancelable: true }),
        ),
      ).toBe(true);
    });
    render(<EnglishResourceBank {...props({ onUsePassage })} />);
    await screen.findByText(/조건에 맞는 지문이 없습니다/);
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/exams")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "지문 등록" }));
    change("지문 제목", "학교 텃밭");
    change("원문", exactText);
    change("출처 이름", "직접 작성");
    fireEvent.click(screen.getByRole("button", { name: "지문 저장" }));
    await screen.findByRole("heading", { name: "학교 텃밭" });
    expect(writes[0].body.text).toBe(exactText);
    expect(writes[0].body).not.toHaveProperty("examId");
    expect(writes[0].body).not.toHaveProperty("rights");
    expect(
      screen.getByRole("button", { name: "중복 후보 1 열기" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "이용 근거 확인" }));
    change("이용 근거", "교사 직접 작성");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "문제 제작 입력에 사용할 수 있음" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "외부 모델에 전송할 수 있음" }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "이용 근거 저장" }));
    await screen.findByRole("heading", { name: "학교 텃밭" });
    await screen.findByLabelText("대상 시험", { exact: true });
    change("대상 시험", examId);
    change("제작 경로", "chatgpt");
    expect(
      screen.getByRole("button", { name: "선택한 시험에서 문제 만들기" }),
    ).toBeDisabled();
    change("제작 경로", "cloze");
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 시험에서 문제 만들기" }),
    );
    await waitFor(() => expect(onUsePassage).toHaveBeenCalledTimes(1));
    expect(onUsePassage.mock.calls[0][0]).toMatchObject({
      examId,
      path: "cloze",
      text: exactText,
    });
    expect(
      writes.find((request) => request.path.endsWith("/rights"))?.body
        .allowedUses,
    ).toEqual(["generation_input"]);
    expect(
      writes.find((request) => request.path.endsWith("/prepare"))?.body,
    ).toEqual({ examId, path: "cloze", textRevision: 1 });
  });

  it("does not query listening, exams or sources for bank-only access; denied bank issues no request", async () => {
    const fetcher = installFetch(() => undefined);
    const view = render(
      <EnglishResourceBank {...props({ allowedMenus: ["english-bank"] })} />,
    );
    await screen.findByText(/조건에 맞는 지문이 없습니다/);
    expect(
      screen.queryByRole("tab", { name: "듣기은행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "기존 자료 가져오기" }),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.every(([url]) =>
        String(url).startsWith("/api/english/passages"),
      ),
    ).toBe(true);
    fetcher.mockClear();
    view.rerender(
      <EnglishResourceBank
        {...props({ allowedMenus: ["english-listening"] })}
      />,
    );
    expect(screen.getByText(/자료은행을 이용할 권한이 없습니다/)).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects oversized text without truncation and preserves a TXT draft", async () => {
    const fetcher = installFetch(() => undefined);
    render(
      <EnglishResourceBank {...props({ allowedMenus: ["english-bank"] })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "지문 등록" }));
    change("지문 제목", "긴 글");
    change("원문", "x".repeat(30_001));
    fireEvent.click(screen.getByRole("button", { name: "지문 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("1~30,000자");
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue(
      "x".repeat(30_001),
    );
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      false,
    );
    change("원문", "keep this draft");
    const file = new File(["too long"], "original.txt", { type: "text/plain" });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode("x".repeat(30_001)).buffer,
    });
    fireEvent.change(screen.getByLabelText("TXT에서 읽기"), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "원문을 자르지 않았습니다",
      ),
    );
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue(
      "keep this draft",
    );
  });

  it.each([18_001, 24_001])(
    "enforces creation limits for %i characters",
    async (length) => {
      const item = passage({
        text: "x".repeat(length),
        textLength: length,
        rights: confirmed,
      });
      installFetch((url) =>
        url.pathname.endsWith(passageId)
          ? json({ data: item })
          : url.pathname === "/api/english/passages"
            ? paged([summary(item)])
            : undefined,
      );
      render(<EnglishResourceBank {...props()} />);
      await openPassage();
      if (length > 24_000) {
        expect(
          screen.getByText(/24,000자 초과 지문은 보관·열람 전용/),
        ).toBeVisible();
        expect(screen.queryByLabelText("대상 시험")).not.toBeInTheDocument();
      } else {
        expect(
          screen.getByRole("option", { name: "ChatGPT · 최대 18,000자" }),
        ).toBeDisabled();
        expect(
          screen.getByRole("option", { name: "AI 생성 · 최대 18,000자" }),
        ).toBeDisabled();
        expect(
          screen.getByRole("option", { name: "원문 복원 · 최대 24,000자" }),
        ).toBeEnabled();
      }
    },
  );

  it("retains CAS-conflicted edits and confirms before explicitly reloading current revision", async () => {
    let current = passage();
    const fetcher = installFetch((url, init) => {
      if (init.method === "PATCH") {
        current = passage({ revision: 2, title: "다른 창의 변경" });
        return json(
          {
            error: {
              code: "CONFLICT",
              message: "다른 곳에서 수정한 지문입니다.",
            },
          },
          409,
        );
      }
      if (url.pathname.endsWith(passageId)) return json({ data: current });
      if (url.pathname === "/api/english/passages")
        return paged([summary(current)]);
    });
    render(<EnglishResourceBank {...props()} />);
    await openPassage();
    fireEvent.click(screen.getByRole("button", { name: "원문 편집" }));
    change("원문", "my changed text");
    fireEvent.click(screen.getByRole("button", { name: "지문 저장" }));
    await screen.findByText("다른 곳에서 수정한 지문입니다.");
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue(
      "my changed text",
    );
    const patch = fetcher.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(JSON.parse(String(patch?.[1]?.body)).revision).toBe(1);
    fireEvent.click(
      screen.getByRole("button", { name: "최신 원문 다시 열기" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue(
      "my changed text",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "최신 원문 다시 열기" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "버리고 이동",
      }),
    );
    await screen.findByRole("heading", { name: "다른 창의 변경" });
  });

  it("keeps drafts through inactive state and search refresh, and handles in-bank discard and shell cancel", async () => {
    installFetch(() => undefined);
    const initialProps = props();
    const view = render(<EnglishResourceBank {...initialProps} />);
    fireEvent.click(screen.getByRole("button", { name: "지문 등록" }));
    change("지문 제목", "내 초안");
    change("원문", exactText);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(
      window.dispatchEvent(
        new Event("english-bank-before-leave", { cancelable: true }),
      ),
    ).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    view.rerender(<EnglishResourceBank {...initialProps} active={false} />);
    view.rerender(<EnglishResourceBank {...initialProps} active />);
    change("제목·원문 검색", "garden");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText(/조건에 맞는 지문이 없습니다/);
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue(
      exactText,
    );
    fireEvent.click(screen.getByRole("button", { name: "지문 등록" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "버리고 이동",
      }),
    );
    expect(screen.getByLabelText("원문", { exact: true })).toHaveValue("");
  });

  it("aborts stale detail requests and does not show the late response for another selection", async () => {
    const first = passage();
    const second = passage({
      id: secondId,
      title: "두 번째 원문",
      text: "Second original.",
      textLength: 16,
    });
    let resolveFirst!: (value: Response) => void;
    let firstSignal: AbortSignal | null | undefined;
    installFetch((url, init) => {
      if (url.pathname === "/api/english/passages")
        return paged([summary(first), summary(second)]);
      if (url.pathname.endsWith(passageId)) {
        firstSignal = init.signal;
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      if (url.pathname.endsWith(secondId)) return json({ data: second });
    });
    render(<EnglishResourceBank {...props()} />);
    fireEvent.click(await screen.findByRole("button", { name: /학교 텃밭/ }));
    await waitFor(() => expect(firstSignal).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /두 번째 원문/ }));
    await screen.findByRole("heading", { name: "두 번째 원문" });
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => {
      resolveFirst(json({ data: first }));
    });
    expect(
      screen.queryByRole("heading", { name: "학교 텃밭" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "두 번째 원문" })).toBeVisible();
  });

  it("refreshes the saved detail and archives without losing historical usage", async () => {
    const usage = {
      setId,
      examId,
      title: "기존 세트",
      textRevision: 1,
      snapshotHash: hash,
      sourceSnapshot: { label: "과거 출처", url: null },
      textSnapshot: exactText,
      createdAt: timestamp,
    };
    let current = passage({ usages: [usage] });
    installFetch((url, init) => {
      if (init.method === "PATCH") {
        current = passage({ ...current, title: "저장한 제목", revision: 2 });
        return json({ data: current });
      }
      if (init.method === "DELETE") {
        expect(JSON.parse(String(init.body))).toEqual({ revision: 3 });
        current = passage({ ...current, archivedAt: timestamp, revision: 4 });
        return json({ data: current });
      }
      if (url.pathname.endsWith(passageId)) return json({ data: current });
      if (url.pathname === "/api/english/passages")
        return paged([summary(current)]);
    });
    const onOpenSet = vi.fn();
    render(<EnglishResourceBank {...props({ onOpenSet })} />);
    await openPassage();
    fireEvent.click(screen.getByRole("button", { name: "원문 편집" }));
    change("지문 제목", "저장한 제목");
    fireEvent.click(screen.getByRole("button", { name: "지문 저장" }));
    await screen.findByRole("heading", { name: "저장한 제목" });
    current = passage({ ...current, title: "서버 최신 제목", revision: 3 });
    fireEvent.click(screen.getByRole("button", { name: "목록 새로고침" }));
    await screen.findByRole("heading", { name: "서버 최신 제목" });
    fireEvent.click(screen.getByRole("button", { name: "보관 해제" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "보관 해제",
      }),
    );
    await screen.findByText(/보관 해제한 지문입니다/);
    fireEvent.click(screen.getByRole("button", { name: "기존 세트 열기" }));
    expect(onOpenSet).toHaveBeenCalledWith(setId);
    expect(screen.getByText(/과거 출처/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "선택한 시험에서 문제 만들기" }),
    ).not.toBeInTheDocument();
  });

  it("requires explicit original-versus-produced selection when importing a set and keeps source permissions separate", async () => {
    const setSummary = {
      id: setId,
      examId,
      title: "변형 문제",
      status: "초안",
      source: "chatgpt",
      questionCount: 1,
      types: ["주제"],
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const set = {
      ...setSummary,
      passage: "Produced passage.",
      questions: [
        {
          type: "주제",
          prompt: "Choose the topic.",
          options: ["a", "b", "c", "d", "e"],
          answer: "1",
          explanation: "",
          evidence: "",
        },
      ],
      meta: { path: "chatgpt", sourcePassage: "Recorded original text." },
    };
    let current: EnglishPassageDetail | null = null;
    const fetcher = installFetch((url, init) => {
      if (url.pathname.endsWith("/import")) {
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({
          kind: "set",
          id: setId,
          textKind: "sourcePassage",
        });
        expect(payload).not.toHaveProperty("text");
        current = passage({
          text: "Recorded original text.",
          textLength: 23,
          importedFrom: { kind: "set", id: setId, textKind: "sourcePassage" },
        });
        return json({
          data: current,
          meta: { replayed: false, duplicateIds: [] },
        });
      }
      if (url.pathname === `/api/english/exams/${examId}/sets`)
        return json({ data: [setSummary] });
      if (url.pathname === `/api/english/sets/${setId}`)
        return json({ data: set });
      if (url.pathname === `/api/english/passages/${passageId}`)
        return json({ data: current });
      if (url.pathname === "/api/english/passages")
        return paged(current ? [summary(current)] : []);
    });
    render(
      <EnglishResourceBank
        {...props({ allowedMenus: ["english-bank", "english-library"] })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "기존 자료 가져오기" }));
    expect(
      screen.queryByRole("option", { name: "시험 자료" }),
    ).not.toBeInTheDocument();
    await screen.findByLabelText("가져올 시험");
    change("가져올 시험", examId);
    await screen.findByRole("option", { name: "변형 문제" });
    change("가져올 항목", setId);
    await screen.findByLabelText("가져올 지문");
    expect(screen.getByLabelText("가져올 지문")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "선택한 지문 가져오기" }),
    ).toBeDisabled();
    change("가져올 지문", "passage");
    expect(screen.getByLabelText("가져올 지문 미리보기")).toHaveTextContent(
      "Produced passage.",
    );
    change("가져올 지문", "sourcePassage");
    expect(screen.getByLabelText("가져올 지문 미리보기")).toHaveTextContent(
      "Recorded original text.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 지문 가져오기" }),
    );
    await screen.findByRole("heading", { name: "학교 텃밭" });
    expect(
      screen.getByText(/가져온 경로: 세트에 기록된 입력 원문/),
    ).toBeVisible();
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/materials")),
    ).toBe(false);
  });

  it("previews a linked cloze set's historical source from its immutable usage instead of today's passage", async () => {
    const original = "Historical original before the teacher changed it.";
    const setSummary = {
      id: setId,
      examId,
      title: "원문 복원 세트",
      status: "초안",
      source: "cloze",
      questionCount: 1,
      types: ["원문 복원"],
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const set = {
      ...setSummary,
      passage: "Produced cloze text.",
      questions: [
        {
          type: "원문 복원",
          prompt: "Restore the sentence.",
          options: [],
          answer: "text",
          explanation: "",
          evidence: "",
        },
      ],
      meta: {
        path: "cloze",
        passageRef: { passageId, textRevision: 1, snapshotHash: hash },
      },
    };
    const fetcher = installFetch((url, init) => {
      if (url.pathname === `/api/english/exams/${examId}/sets`)
        return json({ data: [setSummary] });
      if (url.pathname === `/api/english/sets/${setId}`)
        return json({ data: set });
      if (url.pathname === `/api/english/passages/${passageId}/sets`)
        return json({
          data: [
            {
              setId,
              examId,
              title: set.title,
              textRevision: 1,
              snapshotHash: hash,
              sourceSnapshot: { label: "Old source", url: null },
              textSnapshot: original,
              createdAt: timestamp,
            },
          ],
        });
      if (url.pathname.endsWith("/import")) {
        expect(JSON.parse(String(init.body))).toMatchObject({
          kind: "set",
          id: setId,
          textKind: "sourcePassage",
        });
        return json({
          data: passage({ text: original, textLength: original.length }),
          meta: { replayed: true, duplicateIds: [] },
        });
      }
      if (url.pathname === `/api/english/passages/${passageId}`)
        return json({
          data: passage({ text: original, textLength: original.length }),
        });
    });
    render(
      <EnglishResourceBank
        {...props({ allowedMenus: ["english-bank", "english-library"] })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "기존 자료 가져오기" }));
    await screen.findByLabelText("가져올 시험");
    change("가져올 시험", examId);
    await screen.findByRole("option", { name: "원문 복원 세트" });
    change("가져올 항목", setId);
    await screen.findByLabelText("가져올 지문");
    expect(
      fetcher.mock.calls.some(
        ([url]) => String(url) === `/api/english/passages/${passageId}/sets`,
      ),
    ).toBe(false);
    change("가져올 지문", "sourcePassage");
    expect(
      await screen.findByLabelText("가져올 지문 미리보기"),
    ).toHaveTextContent(original);
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 지문 가져오기" }),
    );
    await screen.findByRole("heading", { name: "학교 텃밭" });
  });

  it("reports a truncated legacy TXT import, retains the selection and retries the same idempotency key", async () => {
    const bodies: Record<string, unknown>[] = [];
    installFetch((url, init) => {
      if (url.pathname === `/api/english/exams/${examId}/materials`)
        return json({
          data: [
            {
              id: secondId,
              examId,
              name: "원문.txt",
              mimeType: "text/plain",
              size: 40000,
              hasFile: true,
              content: "partial content",
              createdAt: timestamp,
            },
          ],
        });
      if (url.pathname.endsWith("/import")) {
        bodies.push(JSON.parse(String(init.body)));
        return json(
          {
            error: {
              code: "CONFLICT",
              message:
                "TXT 원본과 저장된 텍스트가 다릅니다. 잘린 자료는 가져올 수 없습니다.",
              details: { reason: "IMPORT_TEXT_TRUNCATED" },
            },
          },
          409,
        );
      }
    });
    const fetcher = vi.mocked(fetch);
    render(
      <EnglishResourceBank
        {...props({ allowedMenus: ["english-bank", "english-school"] })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "기존 자료 가져오기" }));
    expect(
      screen.queryByRole("option", { name: "문제 세트" }),
    ).not.toBeInTheDocument();
    await screen.findByLabelText("가져올 시험");
    change("가져올 시험", examId);
    await screen.findByRole("option", { name: "원문.txt" });
    change("가져올 항목", secondId);
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 지문 가져오기" }),
    );
    await screen.findByText(/TXT 원본과 저장된 텍스트가 다릅니다/);
    expect(screen.getByLabelText("가져올 항목")).toHaveValue(secondId);
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 지문 가져오기" }),
    );
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[0].clientKey).toBe(bodies[1].clientKey);
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/sets")),
    ).toBe(false);
  });

  it("searches paginated passages on the server and resets the cursor on new filters", async () => {
    const fetcher = installFetch((url) => {
      if (url.pathname === "/api/english/passages")
        return paged([], url.searchParams.get("cursor") ? null : "page-two");
    });
    render(
      <EnglishResourceBank {...props({ allowedMenus: ["english-bank"] })} />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다음" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("2쪽");
    change("제목·원문 검색", "garden");
    change("학년", "중2");
    change("출처", "직접");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("1쪽");
    const lastUrl = new URL(
      String(fetcher.mock.calls.at(-1)?.[0]),
      "http://localhost",
    );
    expect(lastUrl.searchParams.get("q")).toBe("garden");
    expect(lastUrl.searchParams.get("grade")).toBe("중2");
    expect(lastUrl.searchParams.get("source")).toBe("직접");
    expect(lastUrl.searchParams.has("cursor")).toBe(false);
  });

  // EBS 공식 참조 화면은 듣기 폐기(2026-10-06 `faabacb1f`)로 없어졌다 — 참조 선택지 · 링크 · 요청이 없다는 것까지 여기서 본다.
  it("opens own listening via callback and filters own material by grade, year and round without reference requests", async () => {
    const own = {
      id: secondId,
      revision: 1,
      title: "학교 대화",
      level: "중2",
      groupCount: 1,
      publicationCount: 0,
      updatedAt: timestamp,
    };
    const fetcher = installFetch((url) => {
      if (url.pathname.endsWith("/listening/bank")) return paged([own]);
      if (url.pathname.endsWith(`/sets/${secondId}/compose-source`))
        return json({
          data: {
            documentHash: hash,
            detail: {
              id: secondId,
              revision: 1,
              document: {
                ...englishListeningFixture(),
                id: secondId,
                title: own.title,
                groups: [],
              },
              publications: [],
              mediaUrlsByAssetId: {},
            },
          },
        });
    });
    const onOpenListening = vi.fn();
    const initialProps = props({ onOpenListening });
    const view = render(<EnglishResourceBank {...initialProps} />);
    await screen.findByText(/조건에 맞는 지문이 없습니다/);
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/listening")),
    ).toBe(false);
    fireEvent.keyDown(screen.getByRole("tab", { name: "지문은행" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "듣기은행" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(await screen.findByRole("button", { name: /학교 대화/ }));
    fireEvent.click(await screen.findByRole("button", { name: "원본 편집" }));
    expect(onOpenListening).toHaveBeenCalledWith(secondId);
    change("듣기 학년", "중2");
    change("연도", "2026");
    change("회차", "2");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => {
      const url = new URL(
        String(fetcher.mock.calls.at(-1)?.[0]),
        "http://localhost",
      );
      expect(url.pathname).toBe("/api/english/listening/bank");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        level: "중2",
        year: "2026",
        round: "2",
      });
    });
    expect(screen.queryByRole("option", { name: /EBS|공식/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /EBS/ })).toBeNull();
    expect(document.querySelector("audio,iframe")).toBeNull();
    expect(
      fetcher.mock.calls.some(([url]) =>
        String(url).includes("/listening/references"),
      ),
    ).toBe(false);
    fetcher.mockClear();
    view.rerender(
      <EnglishResourceBank {...initialProps} allowedMenus={["english-bank"]} />,
    );
    await screen.findByText(/조건에 맞는 지문이 없습니다/);
    expect(
      fetcher.mock.calls.some(([path]) => String(path).includes("/listening")),
    ).toBe(false);
  });
});
