/**
 * «오늘의 작업» 뷰 — WorkroomHome 구성과 기존 영어 행동 계약.
 *
 * 구현: src/components/english/EnglishStudio.tsx · EnglishPrepView.tsx
 * 뒷단: MSW `src/mocks/handlers/english.ts` (base 의 라우트가 워크트리에 없어도 화면 시험은 돈다)
 *
 * 무엇을 잠그나
 * 1. 시험 목록은 **한 번** 읽고 학교·시험 선택 · 실제 준비 개수 · 자료 · 출제 설정 · 세트를 그린다.
 * 2. 고른 시험은 localStorage(`today-english-exam`)에 남는다.
 * 3. 자료 추가(지문 직접 입력 · 파일) — 상한(계약 `ENGLISH_MATERIAL_MAX_BYTES`, 4MB) 초과 · 허용하지 않는 확장자는 **보내지 않고** 거절 문구.
 * 4. 자료 · 시험 삭제는 확인 창(ConfirmDialog)을 지난다. 시험 삭제 창은 딸린 자료·세트도 지워짐을 적는다.
 * 5. 딥링크 요청은 그 세트의 시험으로 맞춘 뒤 편집 화면을 열고 `onSetOpened` 를 부른다. 없으면 알림 줄.
 */
import { http, HttpResponse } from "msw";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateEnglishDraft } from "@/lib/english/validate";
import { server } from "@/mocks/server";
import {
  ENGLISH_EXAM_A_ID,
  ENGLISH_EXAM_B_ID,
  ENGLISH_MATERIAL_PDF_ID,
  ENGLISH_MOCK_EXAMS,
  ENGLISH_MOCK_PASSAGE,
  ENGLISH_MOCK_SETS,
  ENGLISH_SET_DRAFT_ID,
  ENGLISH_SET_MISSING_ID,
} from "@/mocks/handlers/english";
import {
  ENGLISH_MATERIAL_MAX_BYTES,
  ENGLISH_MATERIAL_MAX_LABEL,
  englishExamResponseSchema,
} from "@/contracts/english.contract";

import {
  currentView,
  Harness,
  installDialogShim,
  makeLog,
} from "./EnglishStudio.harness";

const STORAGE_KEY = "today-english-exam";

/** MSW 가 잡는 요청을 센다 — 응답은 그대로 두고 지나간 URL 만 적는다 */
function requestLog() {
  const seen: { method: string; url: string }[] = [];
  const listener = ({ request }: { request: Request }) => {
    seen.push({ method: request.method, url: new URL(request.url).pathname });
  };
  server.events.on("request:start", listener);
  return {
    seen,
    off: () => server.events.removeListener("request:start", listener),
  };
}

beforeEach(() => {
  localStorage.clear();
  installDialogShim();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("[EnglishStudio] 오늘의 작업", () => {
  it("픽스처 세트 둘은 검증기를 지난다 (표본이 규칙 밖이면 화면 시험이 헛돈다)", () => {
    for (const set of ENGLISH_MOCK_SETS)
      expect(
        validateEnglishDraft({
          title: set.title,
          source: set.source,
          passage: set.passage,
          questions: set.questions,
        }),
      ).toMatchObject({ ok: true });
  });

  it("시험 목록을 한 번 읽어 학교·시험 선택 · 실제 준비 개수 · 자료 · 설정 · 세트를 그린다", async () => {
    const log = makeLog();
    const requests = requestLog();
    render(<Harness log={log} />);
    expect(
      await screen.findByRole("heading", { name: "오늘의 작업" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "시험 범위와 자료를 정리하고, 필요한 문제를 준비하세요.",
      ),
    ).toBeVisible();

    // 학교와 시험은 한 영역에서 고른다 — 고른 학교는 aria-pressed
    const context = within(
      screen.getByRole("region", { name: "학교와 시험 선택" }),
    );
    const chips = within(context.getByRole("group", { name: "학교" }));
    expect(chips.getByRole("button", { name: "침산중학교" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      chips.getByRole("button", { name: "경명여자중학교" }),
    ).toHaveAttribute("aria-pressed", "false");
    const pick = context.getByRole("combobox", { name: "시험 고르기" });
    expect(
      within(pick).getByRole("option", { name: "중3 · 2학기 중간고사" }),
    ).toBeInTheDocument();
    expect(pick).toHaveValue(ENGLISH_EXAM_A_ID);

    // 실제 개수와 이동 단추 — 항목이 존재한다는 이유로 준비 완료로 표시하지 않는다.
    expect(screen.getByText("10월 14일 시험 예정")).toBeVisible();
    const steps = within(screen.getByRole("list", { name: "이번 시험 준비" }));
    expect(steps.getByRole("button", { name: /자료 등록/ })).toHaveTextContent(
      "2개 자료",
    );
    expect(steps.getByRole("button", { name: /문제 제작/ })).toHaveTextContent(
      "2개 세트",
    );
    expect(
      steps.getByRole("button", { name: /검토 및 인쇄/ }),
    ).toHaveTextContent("1개 검토 완료");
    expect(steps.queryByText("✓")).not.toBeInTheDocument();

    // 시험 자료 — 파일은 내려받기 링크, 텍스트는 글자 수
    const materials = within(screen.getByRole("region", { name: "시험 자료" }));
    expect(
      await materials.findByRole("link", { name: "2025-2 중간 기출.pdf" }),
    ).toHaveAttribute(
      "href",
      `/api/english/materials/${ENGLISH_MATERIAL_PDF_ID}`,
    );
    expect(materials.getByText(/412 KB · 9월 30일/)).toBeVisible();
    expect(materials.getByText("3과 외부지문 (텍스트)")).toBeVisible();
    expect(
      materials.getByText(
        new RegExp(`${ENGLISH_MOCK_PASSAGE.length.toLocaleString("ko-KR")}자`),
      ),
    ).toBeVisible();
    expect(
      materials.queryByRole("link", { name: "3과 외부지문 (텍스트)" }),
    ).not.toBeInTheDocument();

    // 출제 설정 딱지 · 대상 학년
    const settings = within(screen.getByRole("region", { name: "출제 설정" }));
    for (const type of ["주제", "내용 일치", "어법", "서술형"])
      expect(settings.getByText(type)).toBeVisible();
    expect(settings.getByText("중3")).toBeVisible();

    // 대비 문제 세트 — 상태 알약 · 문항 수 · 열기
    const sets = within(screen.getByRole("region", { name: "대비 문제 세트" }));
    expect(
      await sets.findByText("협력의 가치 · 외부지문 기본 훈련"),
    ).toBeVisible();
    expect(sets.getByText("초안")).toBeVisible();
    expect(sets.getByText("검토 완료")).toBeVisible();
    expect(sets.getAllByText("3")).not.toHaveLength(0);
    expect(
      sets.getByRole("button", { name: "학교 맞춤 문제 만들기" }),
    ).toBeVisible();
    expect(sets.getByText("모든 문제는 강사 검토 뒤에 씁니다.")).toBeVisible();

    // 뷰를 오가도 시험 목록은 다시 읽지 않는다
    fireEvent.click(sets.getByRole("button", { name: "전체 보기" }));
    expect(currentView()).toBe("english-library");
    await screen.findByRole("heading", { name: "내 문제 세트" });
    expect(
      requests.seen.filter(
        (r) => r.method === "GET" && r.url === "/api/english/exams",
      ),
    ).toHaveLength(1);
    requests.off();
  });

  it("학교 칩을 바꾸면 그 학교의 시험이 골라지고 localStorage 에 남는다", async () => {
    const log = makeLog();
    const view = render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "경명여자중학교" }));
    expect(screen.getByRole("combobox", { name: "시험 고르기" })).toHaveValue(
      ENGLISH_EXAM_B_ID,
    );
    expect(screen.getByText("시험 날짜 미정")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "이번 시험 준비" })).getByRole(
        "button",
        { name: /자료 등록/ },
      ),
    ).toHaveTextContent("0개 자료");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ENGLISH_EXAM_B_ID);
    view.unmount();

    render(<Harness log={makeLog()} />);
    expect(
      await screen.findByRole("button", { name: "경명여자중학교" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("«새 시험 등록» 창에서 등록하면 그 시험이 골라진다", async () => {
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "새 시험 등록",
      }),
    );
    const dialog = within(screen.getByRole("dialog", { name: "새 시험 등록" }));
    expect(dialog.getByRole("textbox", { name: "시험 이름" })).toHaveValue(
      "2학기 중간고사",
    );
    fireEvent.change(dialog.getByRole("textbox", { name: "학교 이름" }), {
      target: { value: "정화중학교" },
    });
    fireEvent.change(dialog.getByRole("combobox", { name: "학년" }), {
      target: { value: "고1" },
    });
    fireEvent.change(dialog.getByLabelText("시험 날짜"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByRole("button", { name: "정화중학교" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("combobox", { name: "시험 고르기" })).getByRole(
        "option",
        { name: "고1 · 2학기 중간고사" },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("12월 1일 시험 예정")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(log.notices.at(-1)).toEqual({
      message: "시험을 등록했습니다.",
      tone: "status",
    });
  });

  it("학교 이름이 비면 등록하지 않는다", async () => {
    const log = makeLog();
    const requests = requestLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "새 시험 등록",
      }),
    );
    const dialog = within(screen.getByRole("dialog", { name: "새 시험 등록" }));
    fireEvent.click(dialog.getByRole("button", { name: "등록" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "학교 이름을 입력해 주세요.",
    );
    expect(requests.seen.filter((r) => r.method === "POST")).toHaveLength(0);
    requests.off();
  });

  it.each([/^자료 추가$/, /자료 등록/])(
    "자료 창을 닫으면 실제로 열었던 단추 %s로 초점을 돌린다",
    async (name) => {
      render(<Harness log={makeLog()} />);
      await screen.findByRole("heading", { name: "오늘의 작업" });
      const opener = screen.getByRole("button", { name });
      opener.focus();
      fireEvent.click(opener);
      const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
      fireEvent.click(dialog.getByRole("button", { name: "창 닫기" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    },
  );

  it("자료 종류는 방향키와 Home/End로 선택하고 선택한 탭만 Tab으로 방문한다", async () => {
    render(<Harness log={makeLog()} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    const file = dialog.getByRole("tab", { name: "파일 업로드" });
    const text = dialog.getByRole("tab", { name: "지문 직접 입력" });
    // 셋째 탭 «사진에서 읽기»(D-158) — 방향키는 셋을 돈다
    const photo = dialog.getByRole("tab", { name: "사진에서 읽기" });
    file.focus();
    expect(file.tabIndex).toBe(0);
    expect(text.tabIndex).toBe(-1);
    expect(photo.tabIndex).toBe(-1);
    fireEvent.keyDown(file, { key: "ArrowRight" });
    expect(text).toHaveFocus();
    expect(text).toHaveAttribute("aria-selected", "true");
    expect(dialog.getByRole("tabpanel", { name: "지문 직접 입력" }).id).toBe(
      text.getAttribute("aria-controls"),
    );
    fireEvent.keyDown(text, { key: "Home" });
    expect(file).toHaveFocus();
    fireEvent.keyDown(file, { key: "End" });
    expect(photo).toHaveFocus();
    expect(photo).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(photo, { key: "ArrowRight" });
    expect(file).toHaveFocus();
    fireEvent.keyDown(file, { key: "ArrowLeft" });
    expect(photo).toHaveFocus();
    fireEvent.keyDown(photo, { key: "ArrowLeft" });
    expect(text).toHaveFocus();
    fireEvent.keyDown(text, { key: "ArrowLeft" });
    expect(file).toHaveFocus();
    expect(file.tabIndex).toBe(0);
    expect(text.tabIndex).toBe(-1);
    expect(photo.tabIndex).toBe(-1);
  });

  it("지문 직접 입력으로 자료를 더하면 목록과 단계 수가 바뀐다", async () => {
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    fireEvent.click(dialog.getByRole("tab", { name: "지문 직접 입력" }));
    expect(
      dialog.getByText(
        "사진은 «사진에서 읽기»로 지문을 만들 수 있습니다. PDF 는 보관용입니다.",
      ),
    ).toBeVisible();
    fireEvent.change(dialog.getByRole("textbox", { name: "자료 이름" }), {
      target: { value: "4과 본문" },
    });
    fireEvent.change(dialog.getByRole("textbox", { name: "지문" }), {
      target: {
        value: "A short passage that we wrote ourselves for the test.",
      },
    });
    fireEvent.click(dialog.getByRole("button", { name: "추가" }));
    const materials = within(
      await screen.findByRole("region", { name: "시험 자료" }),
    );
    expect(await materials.findByText("4과 본문")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "이번 시험 준비" })).getByRole(
        "button",
        { name: /자료 등록/ },
      ),
    ).toHaveTextContent("3개 자료");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("상한(4MB)을 넘는 파일은 보내지 않고 거절 문구를 보인다 — 문구는 계약 상수에서", async () => {
    const log = makeLog();
    const requests = requestLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    const big = new File(["x"], "기출.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", {
      value: ENGLISH_MATERIAL_MAX_BYTES + 1,
    });
    fireEvent.change(dialog.getByLabelText("파일"), {
      target: { files: [big] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "올리기" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      `${ENGLISH_MATERIAL_MAX_LABEL} 이하의 파일만 올릴 수 있습니다.`,
    );
    expect(dialog.getByText(/4MB 이하 · pdf/)).toBeVisible();
    expect(requests.seen.filter((r) => r.method === "POST")).toHaveLength(0);
    requests.off();
  });

  it("허용하지 않는 확장자는 보내지 않고 거절한다", async () => {
    const log = makeLog();
    const requests = requestLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    fireEvent.change(dialog.getByLabelText("파일"), {
      target: { files: [new File(["x"], "setup.exe")] },
    });
    fireEvent.click(dialog.getByRole("button", { name: "올리기" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "pdf · docx · txt · png · jpg 파일만 올릴 수 있습니다.",
    );
    expect(requests.seen.filter((r) => r.method === "POST")).toHaveLength(0);
    requests.off();
  });

  /**
   * jsdom 의 FormData 는 Node fetch(undici)·MSW 가 못 싣는다(탐침: 요청이 영영 안 끝나거나 500) — 이 한 시험만
   * fetch 를 대역으로 갈아 «multipart 로 file 을 실었나»와 «응답을 목록에 더하나»를 본다. 나머지 요청은 MSW 그대로.
   */
  it("허용 파일은 multipart 로 보내고 목록에 더한다", async () => {
    const log = makeLog();
    const realFetch = globalThis.fetch;
    let sentFile: File | null = null;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST" && init.body instanceof FormData) {
        const entry = init.body.get("file");
        sentFile = entry instanceof File ? entry : null;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "72000000-0000-4000-8000-000000000099",
                examId: ENGLISH_EXAM_A_ID,
                name: sentFile?.name ?? "",
                mimeType: "text/plain",
                size: sentFile?.size ?? 0,
                hasFile: true,
                content: null,
                createdAt: "2026-09-30T03:00:00.000Z",
              },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return realFetch(input, init);
    });
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    fireEvent.change(dialog.getByLabelText("파일"), {
      target: {
        files: [new File(["hello"], "시험 범위.txt", { type: "text/plain" })],
      },
    });
    fireEvent.click(dialog.getByRole("button", { name: "올리기" }));
    const materials = within(
      await screen.findByRole("region", { name: "시험 자료" }),
    );
    expect(
      await materials.findByRole("link", { name: "시험 범위.txt" }),
    ).toBeVisible();
    expect(sentFile).not.toBeNull();
    expect((sentFile as File | null)?.name).toBe("시험 범위.txt");
    expect(log.notices.at(-1)).toEqual({
      message: "자료를 더했습니다.",
      tone: "status",
    });
  });

  it("자료 삭제는 확인 창을 지난다", async () => {
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(
      await screen.findByRole("button", { name: "2025-2 중간 기출.pdf 삭제" }),
    );
    const dialog = within(
      screen.getByRole("dialog", { name: "자료를 삭제할까요?" }),
    );
    fireEvent.click(dialog.getByRole("button", { name: "삭제" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "2025-2 중간 기출.pdf" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("list", { name: "이번 시험 준비" })).getByRole(
        "button",
        { name: /자료 등록/ },
      ),
    ).toHaveTextContent("1개 자료");
  });

  it("출제 설정을 고치면 PATCH 로 보내고 딱지가 바뀐다", async () => {
    const log = makeLog();
    let sent: unknown = null;
    server.use(
      http.patch(
        `/api/english/exams/${ENGLISH_EXAM_A_ID}`,
        async ({ request }) => {
          sent = await request.json();
          return HttpResponse.json(
            englishExamResponseSchema.parse({
              data: {
                ...ENGLISH_MOCK_EXAMS[0],
                types: (sent as { types: string[] }).types,
              },
            }),
          );
        },
      ),
    );
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "설정 수정" }));
    const dialog = within(screen.getByRole("dialog", { name: "출제 설정" }));
    fireEvent.click(dialog.getByRole("checkbox", { name: "어법" }));
    fireEvent.click(dialog.getByRole("checkbox", { name: "빈칸 추론" }));
    fireEvent.click(dialog.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(sent).toEqual({
        types: ["주제", "내용 일치", "빈칸 추론", "서술형"],
      }),
    );
    const settings = within(
      await screen.findByRole("region", { name: "출제 설정" }),
    );
    expect(await settings.findByText("빈칸 추론")).toBeVisible();
    expect(settings.queryByText("어법")).not.toBeInTheDocument();
  });

  it("시험 삭제는 딸린 자료·세트가 지워짐을 알리고 확인 뒤 지운다", async () => {
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(screen.getByRole("button", { name: "시험 삭제" }));
    const dialog = screen.getByRole("dialog", { name: "시험을 삭제할까요?" });
    expect(dialog).toHaveTextContent(/자료.*세트.*지워집니다/);
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "침산중학교" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "경명여자중학교" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(log.notices.at(-1)).toEqual({
      message: "시험을 삭제했습니다.",
      tone: "status",
    });
  });

  it("세트 카드의 «열기»는 보관함 편집 화면으로 가고 «목록»으로 돌아온다", async () => {
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(
      await screen.findByRole("button", {
        name: "협력의 가치 · 외부지문 기본 훈련 열기",
      }),
    );
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toHaveValue("협력의 가치 · 외부지문 기본 훈련");
    expect(currentView()).toBe("english-library");
    expect(
      screen.queryByRole("heading", { name: "오늘의 작업" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(
      await screen.findByRole("heading", { name: "내 문제 세트" }),
    ).toBeVisible();
  });

  it("«학교 맞춤 문제 만들기»는 전체 AI 제작 화면으로 이동한다", async () => {
    // 트랙 시절의 자리표(«준비 중»)는 병합 때 ai 트랙의 실제 화면으로 바뀌었다(25 §11.1) — 머리는 뿌리, 탭부터가 화면
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "오늘의 작업" });
    fireEvent.click(
      screen.getByRole("button", { name: "학교 맞춤 문제 만들기" }),
    );
    expect(currentView()).toBe("english-maker");
    expect(await screen.findByLabelText("AI로 원문부터")).toBeVisible();
    expect(
      screen.getAllByRole("heading", { name: "AI 문제 제작" }),
    ).toHaveLength(1);
  });

  it("시험이 하나도 없으면 빈 상태 카드와 «새 시험 등록»만 있다", async () => {
    server.use(
      http.get("/api/english/exams", () => HttpResponse.json({ data: [] })),
    );
    const log = makeLog();
    render(<Harness log={log} />);
    expect(await screen.findByText("첫 시험을 등록해 주세요")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "새 시험 등록" }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole("region", { name: "시험 자료" }),
    ).not.toBeInTheDocument();
  });

  it("목록을 못 읽으면 서버 문구를 알림으로 올리고 다시 시도 단추를 둔다", async () => {
    server.use(
      http.get("/api/english/exams", () =>
        HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "잠시 뒤 다시 시도해 주세요.",
            },
          },
          { status: 500 },
        ),
      ),
    );
    const log = makeLog();
    render(<Harness log={log} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "잠시 뒤 다시 시도해 주세요.",
    );
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "침산중학교" }),
    ).toBeVisible();
  });

  it("목록을 못 읽어도 옆 메뉴 «새 시험 등록»은 창을 열고, 등록한 시험이 바로 보인다 (검토 #5)", async () => {
    server.use(
      http.get("/api/english/exams", () =>
        HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "잠시 뒤 다시 시도해 주세요.",
            },
          },
          { status: 500 },
        ),
      ),
    );
    const log = makeLog();
    render(<Harness log={log} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "잠시 뒤 다시 시도해 주세요.",
    );
    fireEvent.click(screen.getByRole("button", { name: "새 시험 등록(셸)" }));
    const dialog = within(screen.getByRole("dialog", { name: "새 시험 등록" }));
    fireEvent.change(dialog.getByRole("textbox", { name: "학교 이름" }), {
      target: { value: "정화중학교" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "등록" }));
    expect(
      await screen.findByRole("button", { name: "정화중학교" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "오늘의 작업" })).toBeVisible();
    // 목록을 다시 읽다 또 실패해도 방금 등록한 시험은 남는다
    await waitFor(() =>
      expect(log.notices.at(-1)).toEqual({
        message: "시험을 등록했습니다.",
        tone: "status",
      }),
    );
    expect(screen.getByRole("button", { name: "정화중학교" })).toBeVisible();
    // 목록 오류 줄은 걷혔다(새 시험의 자료·세트는 대역이 몰라 404 — 그 줄은 별개)
    expect(
      screen.queryByText("잠시 뒤 다시 시도해 주세요."),
    ).not.toBeInTheDocument();
  });

  it("딥링크 요청은 그 세트의 시험으로 맞춘 뒤 편집 화면을 열고 onSetOpened 를 부른다", async () => {
    localStorage.setItem(STORAGE_KEY, ENGLISH_EXAM_B_ID);
    const log = makeLog();
    render(<Harness log={log} openSetId={ENGLISH_SET_DRAFT_ID} />);
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toHaveValue("협력의 가치 · 외부지문 기본 훈련");
    await waitFor(() => expect(log.setOpened).toHaveBeenCalledOnce());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ENGLISH_EXAM_A_ID);
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(
      await screen.findByRole("button", { name: "침산중학교" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("school-only access hides creation and library actions", async () => {
    render(<Harness log={makeLog()} allowedMenus={["english-school"]} />);
    await screen.findByRole("button", { name: "침산중학교" });
    expect(screen.getByRole("button", { name: "자료 추가" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /문제 제작/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /검토 및 인쇄/ })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "전체 보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /학교 맞춤 문제 만들기/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: / 열기$/ }),
    ).not.toBeInTheDocument();
  });

  it("library-only access opens an editor without school access or material requests", async () => {
    const requests = requestLog();
    render(
      <Harness
        initialView="english-library"
        log={makeLog()}
        allowedMenus={["english-library"]}
        openSetId={ENGLISH_SET_DRAFT_ID}
      />,
    );
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toBeVisible();
    expect(
      requests.seen.some((request) => request.url.endsWith("/materials")),
    ).toBe(false);
    requests.off();
  });

  it("ignores a set deep link without library access", async () => {
    const requests = requestLog();
    render(
      <Harness
        initialView="english-maker"
        log={makeLog()}
        allowedMenus={["english-maker"]}
        openSetId={ENGLISH_SET_DRAFT_ID}
      />,
    );
    await screen.findByRole("heading", { name: "AI 문제 제작" });
    expect(
      requests.seen.some(
        (request) =>
          request.url === `/api/english/sets/${ENGLISH_SET_DRAFT_ID}`,
      ),
    ).toBe(false);
    expect(
      screen.queryByRole("textbox", { name: "세트 이름" }),
    ).not.toBeInTheDocument();
    requests.off();
  });

  it("없는 세트의 딥링크는 «찾을 수 없습니다» 알림을 올리고 목록에 머문다", async () => {
    const log = makeLog();
    render(<Harness log={log} openSetId={ENGLISH_SET_MISSING_ID} />);
    await waitFor(() =>
      expect(log.notices).toContainEqual({
        message: "문제 세트를 찾을 수 없습니다.",
        tone: "alert",
      }),
    );
    expect(log.setOpened).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("heading", { name: "오늘의 작업" }),
    ).toBeVisible();
  });
});
