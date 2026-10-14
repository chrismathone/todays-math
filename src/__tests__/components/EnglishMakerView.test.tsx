/**
 * 오늘의 영어 — «문제 만들기» 화면 (D-148 · 25 §4 · 브리프 english-ai §3).
 *
 * 세 탭(ChatGPT 로 제작 · 원문 복원 · API 직접 생성) · 요청문 복사와 실패 대체 · 붙여넣기 실패 사유 ·
 * 저장 뒤 `onSaved`. MSW 핸들러는 shell 소유라 이 시험은 `fetch` 를 `vi.stubGlobal` 로 세운다.
 *
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EnglishMakerView from "@/components/english/EnglishMakerView";
import type {
  EnglishExam,
  EnglishMaterial,
} from "@/contracts/english.contract";
import type { EnglishBankMakerSeed } from "@/contracts/englishBank.contract";

const passage =
  "Haru walks to school with her younger brother every morning. On the way they count the red cars and guess how many they will see tomorrow. Their guesses are rarely correct, but the game makes the long walk feel short. Their mother says that small games are the easiest way to practice patience.";

const exam: EnglishExam = {
  id: "20000000-0000-4000-8000-000000000001",
  school: "한빛중학교",
  grade: "중2",
  title: "2학기 중간고사",
  examDate: null,
  types: ["주제", "어법"],
  materialCount: 1,
  setCount: 0,
  reviewedCount: 0,
  createdAt: "2026-09-30T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
};

const materials: EnglishMaterial[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    examId: exam.id,
    name: "3과 지문",
    mimeType: "text/plain",
    size: passage.length,
    hasFile: false,
    content: passage,
    createdAt: "2026-09-30T00:00:00.000Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    examId: exam.id,
    name: "시험 범위.pdf",
    mimeType: "application/pdf",
    size: 1024,
    hasFile: true,
    content: null,
    createdAt: "2026-09-30T00:00:00.000Z",
  },
];

const goodDraft = {
  title: "등굣길의 놀이",
  passage,
  questions: [
    {
      type: "주제",
      prompt: "윗글의 주제로 가장 적절한 것은?",
      options: [
        "small games make waiting easier",
        "how to count cars",
        "why brothers argue",
        "the best road to school",
        "a mother's rules",
      ],
      answer: "1",
      explanation: "작은 놀이가 긴 길을 짧게 느끼게 한다는 글입니다.",
      evidence: "small games are the easiest way to practice patience",
    },
    {
      type: "어법",
      prompt:
        "다음 밑줄 친 부분 중 어법상 틀린 것은?\nHaru ① walks to school ② with her younger brother. On the way they ③ counts the red cars and ④ guess how many they ⑤ will see tomorrow.",
      options: ["①", "②", "③", "④", "⑤"],
      answer: "3",
      explanation: "주어가 복수(they)이므로 count 가 맞습니다.",
      evidence: "On the way they count the red cars",
    },
    {
      type: "주제",
      prompt: "윗글의 제목으로 가장 적절한 것은?",
      options: [
        "Counting Red Cars",
        "A Long Vacation",
        "The Fastest Runner",
        "Homework at Night",
        "A New Bicycle",
      ],
      answer: "1",
      explanation: "빨간 차 세기 놀이가 글의 소재입니다.",
      evidence: "they count the red cars",
    },
  ],
};

const savedSet = (id: string, source: string) => ({
  data: {
    id,
    examId: exam.id,
    title: "저장된 세트",
    status: "초안",
    source,
    questionCount: 1,
    types: ["주제"],
    revision: 1,
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    passage,
    questions: goodDraft.questions.slice(0, 1),
  },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn();
const writeText = vi.fn();
const onSaved = vi.fn();
const onNotice = vi.fn();

function setup(nextExam: EnglishExam = exam, external = true) {
  const view = render(
    <EnglishMakerView
      exam={nextExam}
      materials={materials}
      onSaved={onSaved}
      onNotice={onNotice}
    />,
  );
  if (external) fireEvent.click(method("외부 자료 가져오기"));
  return view;
}

const method = (name: string) => {
  if (name !== "AI 문제 제작") {
    const summary = screen.getByText("다른 제작 방식");
    if (!summary.parentElement?.hasAttribute("open")) fireEvent.click(summary);
  }
  return screen.getByRole("button", { name });
};
const button = (name: string | RegExp) => screen.getByRole("button", { name });

function fillTopic(value = "등굣길") {
  fireEvent.change(screen.getByLabelText("원문의 주제와 요청"), {
    target: { value },
  });
}

async function lastRequestBody() {
  const call = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(String(call[1].body)) as Record<string, unknown>;
}

beforeEach(() => {
  fetchMock.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  onSaved.mockReset();
  onNotice.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EnglishMakerView — 전체 제작 작업 화면", () => {
  it("AI 제작으로 시작하고 보조 방식은 접힌 영역에 둔다", () => {
    setup(exam, false);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(method("AI 문제 제작")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("AI로 원문부터")).toBeChecked();
    expect(screen.getByText("중2")).toBeVisible();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByLabelText("ChatGPT 결과 붙여넣기")).toBeNull();
    expect(
      screen.getByText("다른 제작 방식").parentElement,
    ).not.toHaveAttribute("open");
    fireEvent.click(method("원문 복원 연습"));
    expect(screen.getByText(/AI 추론형 문항과 다릅니다/)).toBeVisible();
    fireEvent.click(method("외부 자료 가져오기"));
    expect(screen.getByLabelText("ChatGPT 결과 붙여넣기")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("조건은 ChatGPT 탭과 API 탭이 같이 쓴다 — 자료 불러오기 · 출제 설정 불러오기", () => {
    setup();
    // 시험의 출제 설정이 기본값이다
    expect(screen.getByLabelText("주제")).toBeChecked();
    expect(screen.getByLabelText("어법")).toBeChecked();
    expect(screen.getByLabelText("서술형")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("서술형"));
    fireEvent.click(screen.getByLabelText("주제"));
    expect(screen.getByLabelText("주제")).not.toBeChecked();
    fireEvent.click(button("이 시험의 출제 설정 불러오기"));
    expect(screen.getByLabelText("주제")).toBeChecked();
    expect(screen.getByLabelText("서술형")).not.toBeChecked();

    // 원문 유지로 바꾸면 소재 대신 원문 칸 — 저장한 텍스트 자료만 목록에 온다(파일 자료는 없다)
    fireEvent.click(screen.getByLabelText("기존 원문으로"));
    const picker = screen.getByLabelText("저장한 자료 불러오기");
    expect(within(picker).queryByText("시험 범위.pdf")).toBeNull();
    fireEvent.change(picker, { target: { value: materials[0]!.id } });
    expect(screen.getByLabelText("원문")).toHaveValue(passage);

    // API 탭으로 가도 같은 값이다
    fireEvent.click(method("AI 문제 제작"));
    expect(screen.getByLabelText("원문")).toHaveValue(passage);
    expect(screen.getByLabelText("원문 유지")).toBeChecked();
  });
});

describe("ChatGPT 로 제작", () => {
  it("요청문 복사 — 클립보드에 조건이 든 요청문을 쓰고 알린다", async () => {
    setup();
    fillTopic("등굣길의 놀이");
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain("한빛중학교");
    expect(text).toContain("등굣길의 놀이");
    expect(text).toContain('"questions"');
    expect(onNotice).toHaveBeenCalledWith(
      expect.stringContaining("복사했습니다"),
      "status",
    );
    expect(screen.queryByLabelText("요청문")).toBeNull();
  });

  it("조건이 모자라면 복사하지 않고 사유를 보인다 — 새 지문인데 소재 없음", async () => {
    setup();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("소재");
  });

  it("복사가 안 되면 요청문을 글상자로 보여 준다", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    setup();
    fillTopic();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "복사되지 않았습니다. 아래 글을 직접 복사해 주세요.",
    );
    expect(
      (screen.getByLabelText("요청문") as HTMLTextAreaElement).value,
    ).toContain("한빛중학교");
  });

  it("클립보드가 아예 없어도 같은 대체 경로", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    setup();
    fillTopic();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(screen.getByLabelText("요청문")).toBeInTheDocument();
  });

  it("붙여넣기 실패 — 문항별 사유를 보이고 저장하지 않는다", async () => {
    setup();
    fillTopic();
    const broken = {
      ...goodDraft,
      questions: [
        {
          ...goodDraft.questions[0],
          options: goodDraft.questions[0]!.options.slice(0, 4),
        },
        ...goodDraft.questions.slice(1),
      ],
    };
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: "```json\n" + JSON.stringify(broken) + "\n```" },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("1번 문항");
    expect(alert).toHaveTextContent("5개");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("붙여넣기는 화면의 조건과 견준다 — 문항 수 5 인데 3문항 초안이면 «문항 수» 사유 (리드 검토 D2)", async () => {
    setup();
    fillTopic();
    // 초안 자체는 흠이 없다 — 걸리는 것은 조건 대조뿐이어야 한다
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(goodDraft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("문항 수");
    expect(alert).toHaveTextContent("5");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("조건이 계약을 못 지나면 가져오기도 복사처럼 사유를 보이고 멈춘다 — 소재 비움 (리드 검토 D4)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(savedSet("set-9", "chatgpt"), 201),
    );
    setup();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(goodDraft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("소재");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("붙여넣기 성공 — 세트로 저장하고 onSaved(id)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(savedSet("set-1", "chatgpt"), 201),
    );
    setup();
    fillTopic();
    // 기본 문항 수는 5 — 초안이 3문항이라 5로 맞춘다
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: "결과입니다.\n" + JSON.stringify(goodDraft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/english/exams/${exam.id}/sets`);
    expect(init.method).toBe("POST");
    const body = await lastRequestBody();
    expect(body.source).toBe("chatgpt");
    expect(body.title).toBe("등굣길의 놀이");
    expect((body.questions as unknown[]).length).toBe(3);
    expect(body).not.toHaveProperty("status");
    // 만든 조건 — 만들기 칸 그대로(원장님 2026-10-01 «입력할 수 있는 모든 메타데이터 기억되게»)
    expect(body.meta).toEqual({
      path: "chatgpt",
      mode: "new",
      topic: "등굣길",
      difficulty: "표준",
      count: 3,
      words: 200,
      types: ["주제", "어법"],
      clientKey: expect.any(String),
    });
    expect((body.meta as { clientKey: string }).clientKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(onSaved).toHaveBeenCalledWith("set-1");
    expect(onNotice).toHaveBeenCalledWith(
      expect.stringContaining("초안"),
      "status",
    );
  });

  it("저장이 거절되면 서버 문구를 그대로 알린다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "세트를 저장하지 못했습니다.",
          },
        },
        400,
      ),
    );
    setup();
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(goodDraft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      "세트를 저장하지 못했습니다.",
      "alert",
    );
  });
});

describe("ChatGPT 로 제작 — 수정 요청문 (3자 합의 25 §12.13 · F1)", () => {
  const fourOptions = {
    ...goodDraft,
    questions: [
      {
        ...goodDraft.questions[0],
        options: goodDraft.questions[0]!.options.slice(0, 4),
      },
      ...goodDraft.questions.slice(1),
    ],
  };
  const rejectedPaste = "```json\n" + JSON.stringify(fourOptions) + "\n```";

  async function reject(paste = rejectedPaste) {
    setup();
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: paste },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    return screen.getByRole("alert");
  }

  it("검증에 걸리면 빨간 알림 안에 «수정 요청문 복사» — 같은 대화에 붙일 글을 복사하고 알린다", async () => {
    const alert = await reject();
    expect(alert).toHaveTextContent(
      "가져오지 못했습니다. 아래 사유를 ChatGPT 에 알려 고친 결과를 다시 붙여 넣어 주세요.",
    );
    expect(alert).toHaveTextContent("1번 문항");
    await act(async () => {
      fireEvent.click(
        within(alert).getByRole("button", { name: "수정 요청문 복사" }),
      );
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain("[고칠 곳]");
    expect(text).toMatch(/- q1: 보기는 5개여야 합니다/);
    expect(text).toContain(JSON.stringify(fourOptions));
    expect(onNotice).toHaveBeenCalledWith(
      "수정 요청문을 복사했습니다. 같은 ChatGPT 대화에 붙여 넣어 주세요.",
      "status",
    );
    // 복사해도 사유 목록과 붙여넣기 칸은 그대로
    expect(screen.getByRole("alert")).toHaveTextContent("1번 문항");
    expect(screen.getByLabelText("ChatGPT 결과 붙여넣기")).toHaveValue(
      rejectedPaste,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("«수정 요청문 보기»는 복사 전에 글을 펼친다([고칠 곳]부터) · 다시 누르면 접는다", async () => {
    const alert = await reject();
    fireEvent.click(
      within(alert).getByRole("button", { name: "수정 요청문 보기" }),
    );
    const box = screen.getByRole("textbox", { name: "수정 요청문" });
    expect(box).toHaveAttribute("readonly");
    expect((box as HTMLTextAreaElement).value).toMatch(
      /^\[오늘 영어 — 고쳐 쓰기 요청\][\s\S]*\[고칠 곳\]/,
    );
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "수정 요청문 접기",
      }),
    );
    expect(
      screen.queryByRole("textbox", { name: "수정 요청문" }),
    ).not.toBeInTheDocument();
  });

  it("🔴 JSON 을 못 찾은 거절에는 단추가 없다 — 사유가 먼저 할 일을 말한다", async () => {
    const alert = await reject("미안합니다. 다시 만들겠습니다.");
    expect(alert).toHaveTextContent("JSON 을 찾지 못했습니다");
    expect(
      within(alert).queryByRole("button", { name: "수정 요청문 복사" }),
    ).toBeNull();
  });

  it("저장 실패(서버 오류)에도 단추가 없다 — 검증 규칙에 걸렸을 때만", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "잠시 뒤 다시 시도해 주세요.",
          },
        },
        500,
      ),
    );
    const alert = await reject(
      "```json\n" + JSON.stringify(goodDraft) + "\n```",
    );
    expect(alert).toHaveTextContent("잠시 뒤 다시 시도해 주세요.");
    expect(
      within(alert).queryByRole("button", { name: "수정 요청문 복사" }),
    ).toBeNull();
  });

  it("거절 뒤 칸을 고치면 «앞서 가져오기를 눌렀을 때의 글 기준» 한 줄 — 단추는 켜 둔 채 그때의 글로 복사한다", async () => {
    await reject();
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: "새로 받은 답" },
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "아래 사유와 수정 요청문은 앞서 가져오기를 눌렀을 때의 글 기준입니다.",
    );
    await act(async () => {
      fireEvent.click(
        within(alert).getByRole("button", { name: "수정 요청문 복사" }),
      );
    });
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain(JSON.stringify(fourOptions));
    expect(text).not.toContain("새로 받은 답");
  });

  it("클립보드를 못 쓰면 글을 펼쳐 직접 복사하게 한다", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const alert = await reject();
    await act(async () => {
      fireEvent.click(
        within(alert).getByRole("button", { name: "수정 요청문 복사" }),
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "복사되지 않았습니다. 아래 글을 직접 복사해 주세요.",
    );
    expect(screen.getByRole("textbox", { name: "수정 요청문" })).toBeVisible();
  });
});

describe("원문 복원", () => {
  it("자료를 불러와 연습문제를 만들고 저장한다 — 최대 문항 수를 지킨다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(savedSet("set-2", "cloze"), 201));
    setup();
    fireEvent.click(method("원문 복원 연습"));
    fireEvent.change(screen.getByLabelText("저장한 자료 불러오기"), {
      target: { value: materials[0]!.id },
    });
    expect(screen.getByLabelText("복원할 원문")).toHaveValue(passage);
    fireEvent.change(screen.getByLabelText("최대 문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("연습문제 만들기"));
    });
    const body = await lastRequestBody();
    expect(body.source).toBe("cloze");
    expect(body.title).toContain("원문 복원");
    const questions = body.questions as { type: string; options: unknown[] }[];
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions.every((q) => q.type === "원문 복원")).toBe(true);
    // 만든 조건 — 최대 문항 수와 불러온 자료 이름(그 글을 그대로 썼을 때)
    expect(body.meta).toEqual({
      path: "cloze",
      count: 3,
      materialName: "3과 지문",
      clientKey: expect.any(String),
    });
    expect(onSaved).toHaveBeenCalledWith("set-2");
  });

  it("쓸 만한 문장이 없으면 사유를 보이고 저장하지 않는다", async () => {
    setup();
    fireEvent.click(method("원문 복원 연습"));
    fireEvent.change(screen.getByLabelText("복원할 원문"), {
      target: { value: "Go now." },
    });
    await act(async () => {
      fireEvent.click(button("연습문제 만들기"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("7단어 이상");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("API 직접 생성", () => {
  it("503 후 입력을 유지한 채 같은 화면에서 연결을 다시 시도할 수 있다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "AI_GENERATION_FAILED",
            message: "AI 연결이 설정되지 않았습니다.",
          },
        },
        503,
      ),
    );
    setup();
    fireEvent.click(method("AI 문제 제작"));
    expect(screen.getByRole("status")).toHaveTextContent("확인 전");
    fillTopic();
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("연결 대기");
    expect(button("원문·문항 생성")).not.toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "AI 연결이 설정되지 않았습니다.",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "다시 저장" })).toBeNull();
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      fetchMock.mock.calls[0]?.[1]?.body,
    );
  });

  it("200 결과를 먼저 보여주고 명시적 초안 저장 후 onSaved — 상태 줄은 «AI 연결됨»", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: { ...goodDraft, source: "deepseek" },
          model: { name: "gpt-6-luna", promptVersion: "v3" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(savedSet("set-3", "deepseek"), 201));
    setup();
    fireEvent.click(method("AI 문제 제작"));
    fillTopic("등굣길의 놀이");
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [generateUrl, generateInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(generateUrl).toBe("/api/english/generate");
    const generateBody = JSON.parse(String(generateInit.body)) as Record<
      string,
      unknown
    >;
    expect(generateBody.examId).toBe(exam.id);
    expect(generateBody.topic).toBe("등굣길의 놀이");
    expect(generateBody.count).toBe(3);
    expect(generateBody.types).toEqual(["주제", "어법"]);
    const saveBody = await lastRequestBody();
    expect(saveBody.source).toBe("deepseek");
    // 만든 조건 — 서버가 알려 준 모델 · 프롬프트 판까지
    expect(saveBody.meta).toEqual({
      path: "api",
      mode: "new",
      topic: "등굣길의 놀이",
      difficulty: "표준",
      count: 3,
      words: 200,
      types: ["주제", "어법"],
      model: "gpt-6-luna",
      promptVersion: "v3",
      clientKey: expect.any(String),
    });
    expect(onSaved).toHaveBeenCalledWith("set-3");
    expect(screen.getByRole("status")).toHaveTextContent("AI 연결됨");
  });

  it("검증기에 걸린 502 는 문구와 문항별 사유를 보인다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "ENGLISH_DRAFT_REJECTED",
            message: "AI 가 만든 초안이 검증을 통과하지 못했습니다.",
            details: {
              issues: [
                { question: 1, message: "보기는 5개여야 합니다 (지금 4개)." },
              ],
            },
          },
        },
        502,
      ),
    );
    setup();
    fireEvent.click(method("AI 문제 제작"));
    fillTopic();
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("검증을 통과하지 못했습니다");
    expect(alert).toHaveTextContent("2번 문항");
    expect(alert).toHaveTextContent("5개");
    expect(button("원문·문항 생성")).not.toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "다시 저장" })).toBeNull();
  });

  it("저장이 503 이어도 연결 대기로 바꾸지 않고, 다시 저장은 생성을 다시 하지 않는다", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: { ...goodDraft, source: "deepseek" },
          model: { name: "gpt-6-luna", promptVersion: "v3" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "INTERNAL", message: "저장 응답이 끊겼습니다." } },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(savedSet("set-4", "deepseek"), 201));
    setup();
    fireEvent.click(method("AI 문제 제작"));
    fillTopic("등굣길의 놀이");
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("AI 연결됨");
    expect(screen.queryByText(/연결 대기/)).toBeNull();
    const first = await lastRequestBody();
    fillTopic("바꾼 소재");
    await act(async () => {
      fireEvent.click(button("다시 저장"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/english/generate");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/english/exams/${exam.id}/sets`,
    );
    const retryInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(String(retryInit.body))).toEqual(first);
    expect(
      (JSON.parse(String(retryInit.body)) as { meta: { topic: string } }).meta
        .topic,
    ).toBe("등굣길의 놀이");
    expect(onSaved).toHaveBeenCalledWith("set-4");
    expect(screen.queryByRole("button", { name: "다시 저장" })).toBeNull();
  });

  it("저장이 끊긴 뒤 시험을 바꾸면 «다시 저장»이 숨고, 돌아오면 묶음을 지은 시험으로 보낸다 (D-153 검토 #2)", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: { ...goodDraft, source: "deepseek" },
          model: { name: "gpt-6-luna", promptVersion: "v5" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "INTERNAL", message: "저장 응답이 끊겼습니다." } },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(savedSet("set-5", "deepseek"), 201));
    const view = setup();
    fireEvent.click(method("AI 문제 제작"));
    fillTopic("등굣길의 놀이");
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(button("다시 저장")).toBeInTheDocument();

    // 다른 시험으로 — 그 시험에 이 초안이 들어가면 안 된다. 단추가 없으니 보낼 길도 없다
    const other: EnglishExam = {
      ...exam,
      id: "20000000-0000-4000-8000-000000000002",
      school: "다른중학교",
    };
    const props = { materials, onSaved, onNotice };
    view.rerender(<EnglishMakerView exam={other} {...props} />);
    expect(screen.queryByRole("button", { name: "다시 저장" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 제 시험으로 돌아오면 묶음이 그대로 — 그 시험 주소로만 나간다
    view.rerender(<EnglishMakerView exam={exam} {...props} />);
    await act(async () => {
      fireEvent.click(button("다시 저장"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/english/exams/${exam.id}/sets`,
    );
    expect(onSaved).toHaveBeenCalledWith("set-5");
  });
});

describe("AI 제작 — 저장 전 검토와 비동기 보호", () => {
  async function generate() {
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
  }
  const generated = () =>
    jsonResponse({ data: { ...goodDraft, source: "deepseek" } });
  const otherExam = {
    ...exam,
    id: "20000000-0000-4000-8000-000000000009",
    grade: "중3" as const,
  };
  const props = { materials, onSaved, onNotice };

  it("생성 전 입력도 새로고침 시 보호한다", () => {
    setup(exam, false);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    fillTopic();
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("저장 실패 후에도 결과와 교사 수정은 명시적인 폐기 확인 전까지 보존한다", async () => {
    fetchMock
      .mockResolvedValueOnce(generated())
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "저장 응답이 끊겼습니다." } }, 503),
      );
    setup(exam, false);
    await generate();
    fireEvent.click(button("교사 수정"));
    fireEvent.change(screen.getByLabelText("초안 제목"), {
      target: { value: "교사가 수정한 제목" },
    });
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      fireEvent.click(button("결과 버리기"));
      expect(confirm).toHaveBeenCalledWith(
        "저장하지 않은 제작 결과를 버리시겠습니까?",
      );
      expect(screen.getByLabelText("초안 제목")).toHaveValue(
        "교사가 수정한 제목",
      );
      expect(button("다시 저장")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      confirm.mockReturnValue(true);
      fireEvent.click(button("결과 버리기"));
      expect(screen.queryByLabelText("초안 제목")).toBeNull();
    } finally {
      confirm.mockRestore();
    }
  });

  it("생성만으로 저장하지 않고 원문·보기·정답·해설·근거를 보여준다", async () => {
    fetchMock.mockResolvedValueOnce(generated());
    setup(exam, false);
    expect(screen.queryByText("형식·근거 인용 검사 통과")).toBeNull();
    await generate();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByText("AI 제작 원문")).toBeVisible();
    expect(screen.getByText(passage)).toBeVisible();
    expect(screen.getByText(goodDraft.questions[0]!.options[0]!)).toBeVisible();
    expect(screen.getAllByText("정답")).toHaveLength(3);
    expect(screen.getByText(goodDraft.questions[0]!.explanation)).toBeVisible();
    expect(screen.getByText(goodDraft.questions[0]!.evidence)).toBeVisible();
    expect(button("초안 저장")).toBeEnabled();
  });

  it("실제 검증 실패를 보이고 교사 수정 뒤 다시 검사해 저장한다", async () => {
    const invalid = {
      ...goodDraft,
      source: "deepseek",
      questions: goodDraft.questions.map((q, i) =>
        i === 0 ? { ...q, evidence: "not in the source" } : q,
      ),
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: invalid }))
      .mockResolvedValueOnce(
        jsonResponse(savedSet("corrected", "deepseek"), 201),
      );
    setup(exam, false);
    await generate();
    expect(screen.queryByText("형식·근거 인용 검사 통과")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("1번 문항");
    expect(button("초안 저장")).toBeDisabled();
    fireEvent.click(button("교사 수정"));
    fireEvent.change(screen.getByLabelText("1번 근거"), {
      target: { value: goodDraft.questions[0]!.evidence },
    });
    fireEvent.change(screen.getByLabelText("1번 보기 1"), {
      target: { value: "small games help us practice patience" },
    });
    expect(screen.getByText("형식·근거 인용 검사 통과")).toBeVisible();
    expect(button("초안 저장")).toBeEnabled();
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    const saved = await lastRequestBody();
    expect(saved.passage).toBe(passage);
    expect(saved.source).toBe("deepseek");
    expect(saved.questions).toEqual(
      invalid.questions.map((q, i) =>
        i === 0
          ? {
              ...q,
              evidence: goodDraft.questions[0]!.evidence,
              options: [
                "small games help us practice patience",
                ...q.options.slice(1),
              ],
            }
          : q,
      ),
    );
    expect(onSaved).toHaveBeenCalledExactlyOnceWith("corrected");
  });

  it.each(["시험 변경", "생성 취소", "화면 이탈"])(
    "%s 뒤 늦은 생성 결과는 저장하거나 표시하지 않는다",
    async (action) => {
      let resolve!: (response: Response) => void;
      fetchMock.mockImplementationOnce(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      );
      const view = setup(exam, false);
      await generate();
      const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
      if (action === "시험 변경") {
        view.rerender(<EnglishMakerView exam={otherExam} {...props} />);
        view.rerender(<EnglishMakerView exam={exam} {...props} />);
      } else if (action === "생성 취소") fireEvent.click(button("생성 취소"));
      else view.unmount();
      expect(signal.aborted).toBe(true);
      await act(async () => {
        resolve(generated());
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "초안 저장" })).toBeNull();
      expect(screen.queryByText("저장 전 초안")).toBeNull();
    },
  );

  it("저장 응답 중 시험을 바꾸면 이전 시험의 saved callback을 실행하지 않는다", async () => {
    let resolve!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(generated())
      .mockImplementationOnce(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValueOnce(
        jsonResponse(savedSet("saved-once", "deepseek"), 201),
      );
    const view = setup(exam, false);
    await generate();
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    const first = await lastRequestBody();
    view.rerender(<EnglishMakerView exam={otherExam} {...props} />);
    await act(async () => {
      resolve(jsonResponse(savedSet("saved-once", "deepseek"), 201));
    });
    expect(onSaved).not.toHaveBeenCalled();
    view.rerender(<EnglishMakerView exam={exam} {...props} />);
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    expect(await lastRequestBody()).toEqual(first);
    expect(onSaved).toHaveBeenCalledExactlyOnceWith("saved-once");
  });

  it("미저장 결과의 재생성을 취소하면 원래 결과를 유지한다", async () => {
    fetchMock.mockResolvedValueOnce(generated());
    setup(exam, false);
    await generate();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      fireEvent.click(button("원문·문항 생성"));
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("저장 전 초안")).toBeVisible();
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    } finally {
      confirm.mockRestore();
    }
  });
});

describe("문항 수", () => {
  const six = [
    "주제",
    "내용 일치",
    "어법",
    "빈칸 추론",
    "문장 삽입",
    "서술형",
  ] as const;

  it("유형이 여섯이면 처음 문항 수는 6이고 선택지에 6문항이 있다", () => {
    setup({ ...exam, types: [...six] });
    expect(screen.getByLabelText("문항 수")).toHaveValue("6");
    expect(screen.getByRole("option", { name: "6문항" })).toBeInTheDocument();
  });

  it("출제 설정을 불러오면 유형 수를 담도록 문항 수를 올린다", () => {
    setup({ ...exam, types: [...six] });
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.click(button("이 시험의 출제 설정 불러오기"));
    expect(screen.getByLabelText("문항 수")).toHaveValue("6");
    for (const type of six) expect(screen.getByLabelText(type)).toBeChecked();
  });

  it("유형을 더 고르면 그 수를 담는 가장 작은 문항 수로 올린다", () => {
    setup();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByLabelText("내용 일치"));
    expect(screen.getByLabelText("문항 수")).toHaveValue("3");
    fireEvent.click(screen.getByLabelText("빈칸 추론"));
    expect(screen.getByLabelText("문항 수")).toHaveValue("5");
    fireEvent.click(screen.getByLabelText("문장 삽입"));
    expect(screen.getByLabelText("문항 수")).toHaveValue("5");
    fireEvent.click(screen.getByLabelText("서술형"));
    expect(screen.getByLabelText("문항 수")).toHaveValue("6");
  });
});

describe("유형 확장 (D-158)", () => {
  it("새 유형 여섯의 체크박스가 있고, 고르면 문항 수가 따라 오른다", () => {
    setup();
    for (const type of [
      "언급 없음",
      "해석",
      "영영풀이",
      "공통 빈칸",
      "문장 전환",
      "단어 배열",
    ])
      expect(screen.getByLabelText(type)).not.toBeChecked();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    for (const type of ["언급 없음", "해석", "단어 배열"])
      fireEvent.click(screen.getByLabelText(type));
    for (const type of ["언급 없음", "해석", "단어 배열"])
      expect(screen.getByLabelText(type)).toBeChecked();
    // 처음 고른 유형(주제 · 어법 둘)에 셋을 더해 다섯 — 다섯을 담는 가장 작은 선택은 5문항
    expect(screen.getByLabelText("문항 수")).toHaveValue("5");
  });

  it("유형은 여덟까지만 고른다 — 아홉째는 받지 않고 알린다 (검토 #4)", () => {
    setup();
    // 처음에 둘(주제 · 어법)이 골라져 있다. 여섯을 더해 여덟
    for (const type of [
      "내용 일치",
      "빈칸 추론",
      "문장 삽입",
      "서술형",
      "언급 없음",
      "해석",
    ])
      fireEvent.click(screen.getByLabelText(type));
    expect(screen.getByLabelText("문항 수")).toHaveValue("8");
    expect(onNotice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("공통 빈칸"));
    expect(screen.getByLabelText("공통 빈칸")).not.toBeChecked();
    expect(onNotice).toHaveBeenCalledWith(
      "유형은 한 세트에 8개까지 고를 수 있습니다",
      "alert",
    );
    // 하나를 빼면 다시 고를 수 있다
    fireEvent.click(screen.getByLabelText("해석"));
    fireEvent.click(screen.getByLabelText("공통 빈칸"));
    expect(screen.getByLabelText("공통 빈칸")).toBeChecked();
  });

  it("출제 설정의 유형이 아홉이면 앞의 여덟만 고른 채로 연다 (검토 #4)", () => {
    const nine = [
      "주제",
      "내용 일치",
      "빈칸 추론",
      "문장 삽입",
      "서술형",
      "언급 없음",
      "해석",
      "영영풀이",
      "공통 빈칸",
    ] as const;
    setup({ ...exam, types: [...nine] });
    for (const type of nine.slice(0, 8))
      expect(screen.getByLabelText(type)).toBeChecked();
    expect(screen.getByLabelText("공통 빈칸")).not.toBeChecked();
    expect(screen.getByLabelText("문항 수")).toHaveValue("8");
    fireEvent.click(screen.getByLabelText("주제"));
    fireEvent.click(button("이 시험의 출제 설정 불러오기"));
    expect(screen.getByLabelText("주제")).toBeChecked();
    expect(screen.getByLabelText("공통 빈칸")).not.toBeChecked();
    expect(onNotice).toHaveBeenCalledWith(
      "유형은 한 세트에 8개까지 고를 수 있습니다",
      "alert",
    );
  });

  it("원문 칸의 안내는 지금 하한(20자)을 말한다", () => {
    setup();
    fireEvent.click(screen.getByLabelText("기존 원문으로"));
    expect(
      screen.getByPlaceholderText("영어 원문을 붙여 넣으세요 (20자 이상)."),
    ).toBeInTheDocument();
  });

  it("짧은 실용문을 위한 지문 길이 40 · 60 · 80 단어가 있다", () => {
    setup();
    for (const words of [40, 60, 80])
      expect(
        screen.getByRole("option", { name: `약 ${words}단어` }),
      ).toBeInTheDocument();
  });
});

describe("어법과 어휘", () => {
  it("어법이 선택된 채 어휘를 누르면 선택을 받지 않고 알린다", () => {
    setup();
    fireEvent.click(screen.getByLabelText("어휘"));
    expect(screen.getByLabelText("어휘")).not.toBeChecked();
    expect(screen.getByLabelText("어법")).toBeChecked();
    expect(onNotice).toHaveBeenCalledWith(
      "어법과 어휘는 한 세트에 넣지 않습니다",
      "alert",
    );
  });

  it("출제 설정에 둘이 같이 있으면 상수 순서에서 앞인 어법만 남긴다", () => {
    setup({ ...exam, types: ["어휘", "어법", "주제"] });
    expect(screen.getByLabelText("어법")).toBeChecked();
    expect(screen.getByLabelText("어휘")).not.toBeChecked();
    expect(screen.getByLabelText("주제")).toBeChecked();
    fireEvent.click(screen.getByLabelText("어법"));
    expect(screen.getByLabelText("어법")).not.toBeChecked();
    fireEvent.click(button("이 시험의 출제 설정 불러오기"));
    expect(screen.getByLabelText("어법")).toBeChecked();
    expect(screen.getByLabelText("어휘")).not.toBeChecked();
    expect(onNotice).not.toHaveBeenCalled();
  });

  it("붙여넣기 단추로 어법과 어휘가 같이 든 세트를 저장한다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(savedSet("set-vocab", "chatgpt"), 201),
    );
    setup();
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    const mixed = {
      ...goodDraft,
      questions: [
        goodDraft.questions[0],
        goodDraft.questions[1],
        { ...goodDraft.questions[2], type: "어휘" },
      ],
    };
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(mixed) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = await lastRequestBody();
    expect(
      (body.questions as { type: string }[]).map((question) => question.type),
    ).toEqual(["주제", "어법", "어휘"]);
    expect(onSaved).toHaveBeenCalledWith("set-vocab");
  });

  it("붙여넣기의 어휘 허용은 다른 미선택 유형까지 열지 않는다", async () => {
    setup();
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    const extra = {
      ...goodDraft,
      questions: [
        goodDraft.questions[0],
        goodDraft.questions[1],
        {
          type: "서술형",
          prompt: "등굣길에서 한 놀이를 우리말로 쓰시오.",
          options: [],
          answer: "빨간 차 세기",
          explanation: "소재(1점)",
          evidence: "they count the red cars",
        },
      ],
    };
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(extra) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "고르지 않은 유형입니다: 서술형",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("붙여넣기 재시도", () => {
  it("저장이 끊긴 뒤 가져오기를 다시 누르면 같은 clientKey 를 보낸다", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "저장 응답이 끊겼습니다." } }, 503),
      )
      .mockResolvedValueOnce(jsonResponse(savedSet("set-5", "chatgpt"), 201));
    setup();
    fillTopic();
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(goodDraft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    const first = await lastRequestBody();
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
    const second = await lastRequestBody();
    expect((second.meta as { clientKey: string }).clientKey).toBe(
      (first.meta as { clientKey: string }).clientKey,
    );
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledWith("set-5");
  });
});

describe("자료은행 → 기존 만들기", () => {
  const seed: EnglishBankMakerSeed = {
    requestId: "40000000-0000-4000-8000-000000000001",
    examId: exam.id,
    path: "chatgpt",
    title: "은행 원문",
    text: passage,
    passageRef: {
      passageId: "50000000-0000-4000-8000-000000000001",
      textRevision: 1,
      snapshotHash: "a".repeat(64),
    },
  };
  const handled = vi.fn();
  const accepted = vi.fn();
  const props = { exam, materials, onSaved, onNotice };
  async function bankSetup(bankSeed = seed) {
    const view = render(
      <EnglishMakerView
        {...props}
        bankSeed={bankSeed}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    return view;
  }
  function prepare(nextSeed = seed) {
    return jsonResponse({ data: nextSeed });
  }
  function conflict(reason = "RIGHTS_REQUIRED") {
    return jsonResponse(
      {
        error: {
          code: "CONFLICT",
          message: "은행 이용 근거를 다시 확인해 주세요.",
          details: { reason },
        },
      },
      409,
    );
  }
  async function pasteDraft(draft = goodDraft) {
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: JSON.stringify(draft) },
    });
    await act(async () => {
      fireEvent.click(button("가져오기"));
    });
  }
  beforeEach(() => {
    handled.mockReset();
    accepted.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("초기 seed의 원문·제목을 보존하고 같은 requestId는 다시 덮지 않는다", async () => {
    const exact = { ...seed, text: `  ${passage}\n\n` };
    const view = await bankSetup(exact);
    expect(screen.getByLabelText("원문")).toHaveValue(exact.text);
    expect(screen.getByLabelText("원문 유지")).toBeChecked();
    expect(screen.getByText(/은행 원문/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "수정한 원문" },
    });
    view.rerender(
      <EnglishMakerView
        {...props}
        bankSeed={{ ...exact }}
        onBankSeedHandled={handled}
      />,
    );
    expect(screen.getByLabelText("원문")).toHaveValue("수정한 원문");
    expect(handled).toHaveBeenCalledExactlyOnceWith(seed.requestId);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("다른 시험 seed는 인계 callback 없이는 보류한다", async () => {
    const other = { ...seed, examId: "20000000-0000-4000-8000-000000000099" };
    const view = await bankSetup(other);
    expect(screen.getByLabelText("원문의 주제와 요청")).toHaveValue("");
    expect(handled).not.toHaveBeenCalled();
    view.rerender(
      <EnglishMakerView
        {...props}
        exam={{ ...exam, id: other.examId }}
        bankSeed={other}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    expect(screen.getByLabelText("원문")).toHaveValue(passage);
    expect(handled).toHaveBeenCalledExactlyOnceWith(other.requestId);
  });

  it("덮어쓰기 취소는 입력·결과·현재 시험을 보존하고 handled만 부른다", async () => {
    const view = setup();
    fillTopic("기존 소재");
    fireEvent.change(screen.getByLabelText("ChatGPT 결과 붙여넣기"), {
      target: { value: "기존 결과" },
    });
    vi.mocked(window.confirm).mockReturnValue(false);
    const other = { ...seed, examId: "20000000-0000-4000-8000-000000000099" };
    view.rerender(
      <EnglishMakerView
        {...props}
        bankSeed={other}
        onBankSeedAccepted={accepted}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    expect(screen.getByLabelText("원문의 주제와 요청")).toHaveValue(
      "기존 소재",
    );
    expect(screen.getByLabelText("ChatGPT 결과 붙여넣기")).toHaveValue(
      "기존 결과",
    );
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(accepted).not.toHaveBeenCalled();
    expect(handled).toHaveBeenCalledExactlyOnceWith(seed.requestId);
  });

  it("다른 시험 인계 수락은 accepted를 handled보다 먼저 부른다", async () => {
    const other = {
      ...seed,
      examId: "20000000-0000-4000-8000-000000000099",
      path: "api" as const,
    };
    render(
      <EnglishMakerView
        {...props}
        bankSeed={other}
        onBankSeedAccepted={accepted}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    expect(method("AI 문제 제작")).toHaveAttribute("aria-pressed", "true");
    expect(accepted).toHaveBeenCalledExactlyOnceWith(other.examId);
    expect(accepted.mock.invocationCallOrder[0]).toBeLessThan(
      handled.mock.invocationCallOrder[0]!,
    );
  });

  it("은행 요청문 복사는 매번 해당 경로 준비 검사를 하고 권리 실패면 외부로 보내지 않는다", async () => {
    await bankSetup();
    fetchMock
      .mockResolvedValueOnce(prepare())
      .mockResolvedValueOnce(conflict());
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `/api/english/passages/${seed.passageRef.passageId}/prepare`,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1].body))).toEqual({
      examId: exam.id,
      path: "chatgpt",
      textRevision: 1,
    });
    fireEvent.click(method("AI 문제 제작"));
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1].body)).path).toBe(
      "api",
    );
    expect(screen.getByLabelText("원문")).toHaveValue(passage);
    expect(screen.getByRole("alert")).toHaveTextContent("은행 이용 근거");
  });

  it.each(["text", "textRevision", "snapshotHash"])(
    "준비 응답의 %s 변경은 원문을 바꾸거나 복사하지 않는다",
    async (field) => {
      await bankSetup();
      const changed = { ...seed, passageRef: { ...seed.passageRef } };
      if (field === "text") changed.text += " Updated.";
      else if (field === "textRevision") changed.passageRef.textRevision = 2;
      else changed.passageRef.snapshotHash = "b".repeat(64);
      fetchMock.mockResolvedValue(prepare(changed));
      await act(async () => {
        fireEvent.click(button("요청문 복사"));
      });
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("요청문")).toBeNull();
      expect(screen.getByLabelText("원문")).toHaveValue(passage);
      expect(onNotice).toHaveBeenCalledWith(
        expect.stringContaining("변경"),
        "alert",
      );
    },
  );

  it("본문 수정이나 같은 본문의 다른 자료 선택은 은행 연결을 해제한다", async () => {
    await bankSetup();
    fireEvent.change(screen.getByLabelText("저장한 자료 불러오기"), {
      target: { value: materials[0]!.id },
    });
    expect(screen.getByText(/은행 연결을 해제/)).toBeVisible();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("18k 초과 24k 이하 원문 복원은 준비 뒤 은행 ref를 저장하고 sourcePassage에는 넣지 않는다", async () => {
    const longSeed = {
      ...seed,
      path: "cloze" as const,
      text: `${passage}\n`.repeat(65),
    };
    expect(longSeed.text.length).toBeGreaterThan(18_000);
    expect(longSeed.text.length).toBeLessThan(24_000);
    await bankSetup(longSeed);
    fetchMock
      .mockResolvedValueOnce(prepare(longSeed))
      .mockResolvedValueOnce(
        jsonResponse(savedSet("bank-cloze", "cloze"), 201),
      );
    expect(screen.getByLabelText("복원할 원문")).toHaveValue(longSeed.text);
    await act(async () => {
      fireEvent.click(button("연습문제 만들기"));
    });
    const saved = await lastRequestBody();
    expect(saved.meta).toMatchObject({
      path: "cloze",
      passageRef: seed.passageRef,
      materialName: seed.title,
    });
    expect(saved.meta).not.toHaveProperty("sourcePassage");
    expect(String(saved.passage).trim()).toBe(longSeed.text.trim());
    expect(onSaved).toHaveBeenCalledWith("bank-cloze");
  });

  it("ChatGPT 저장은 bank ref·제목을 보존하고 충돌 재시도는 같은 묶음, 명시적 연결 해제는 새 키를 쓴다", async () => {
    await bankSetup();
    fetchMock
      .mockResolvedValueOnce(conflict("PASSAGE_UNAVAILABLE"))
      .mockResolvedValueOnce(conflict("PASSAGE_TEXT_MISMATCH"))
      .mockResolvedValueOnce(
        jsonResponse(savedSet("unlinked", "chatgpt"), 201),
      );
    await pasteDraft();
    const first = await lastRequestBody();
    expect(first.meta).toMatchObject({
      passageRef: seed.passageRef,
      materialName: seed.title,
    });
    expect(screen.getByLabelText("ChatGPT 결과 붙여넣기")).toHaveValue(
      JSON.stringify(goodDraft),
    );
    await act(async () => {
      fireEvent.click(button("다시 저장"));
    });
    expect(await lastRequestBody()).toEqual(first);
    await act(async () => {
      fireEvent.click(button("은행 연결 해제 후 새 사본 저장"));
    });
    const unlinked = await lastRequestBody();
    expect(unlinked.meta).not.toHaveProperty("passageRef");
    expect((unlinked.meta as { clientKey: string }).clientKey).not.toBe(
      (first.meta as { clientKey: string }).clientKey,
    );
    expect(unlinked.passage).toBe(first.passage);
    expect(unlinked.questions).toEqual(first.questions);
    expect(onSaved).toHaveBeenCalledWith("unlinked");
  });

  it("은행 저장 충돌 후 재시도 취소는 입력과 붙여넣은 결과를 남긴다", async () => {
    await bankSetup();
    fetchMock.mockResolvedValue(conflict());
    await pasteDraft();
    fireEvent.click(button("저장 재시도 취소"));
    expect(screen.queryByRole("button", { name: "다시 저장" })).toBeNull();
    expect(screen.getByLabelText("원문")).toHaveValue(passage);
    expect(screen.getByLabelText("ChatGPT 결과 붙여넣기")).toHaveValue(
      JSON.stringify(goodDraft),
    );
  });

  it("거절된 은행 수정 요청문은 현재 입력이 연결 해제돼도 원래 은행 권리를 검사한다", async () => {
    await bankSetup();
    const invalid = {
      ...goodDraft,
      questions: goodDraft.questions.slice(0, 2),
    };
    await pasteDraft(invalid);
    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: passage + " Edited." },
    });
    fetchMock.mockResolvedValue(conflict());
    await act(async () => {
      fireEvent.click(button("수정 요청문 복사"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("수정 요청문")).toBeNull();
    await act(async () => {
      fireEvent.click(button("수정 요청문 보기"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText("수정 요청문")).toBeNull();
  });

  it("StrictMode 재실행과 새 callback에도 seed를 한 번만 처리한다", async () => {
    const view = render(
      <StrictMode>
        <EnglishMakerView
          {...props}
          bankSeed={seed}
          onBankSeedHandled={handled}
        />
      </StrictMode>,
    );
    await act(async () => {});
    expect(handled).toHaveBeenCalledExactlyOnceWith(seed.requestId);
    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: passage + " Edited." },
    });
    view.rerender(
      <StrictMode>
        <EnglishMakerView
          {...props}
          bankSeed={{ ...seed }}
          onBankSeedHandled={(id) => handled(id)}
        />
      </StrictMode>,
    );
    await act(async () => {});
    expect(handled).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("원문")).toHaveValue(passage + " Edited.");
  });

  it("생성 중 seed는 보류하고 저장 실패 뒤 덮어쓰기 취소하면 기존 묶음을 그대로 재시도한다", async () => {
    let finishGeneration!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finishGeneration = resolve;
          }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: "저장 실패" } }, 503),
      )
      .mockResolvedValueOnce(
        jsonResponse(savedSet("old-draft", "deepseek"), 201),
      );
    const view = setup();
    fireEvent.click(method("AI 문제 제작"));
    fillTopic("진행 중인 소재");
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    fireEvent.click(button("원문·문항 생성"));
    await act(async () => {});
    view.rerender(
      <EnglishMakerView
        {...props}
        bankSeed={seed}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    expect(handled).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockReturnValue(false);
    await act(async () => {
      finishGeneration(
        jsonResponse({ data: { ...goodDraft, source: "deepseek" } }),
      );
    });
    expect(handled).toHaveBeenCalledExactlyOnceWith(seed.requestId);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("원문의 주제와 요청")).toHaveValue(
      "진행 중인 소재",
    );
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    const bundle = await lastRequestBody();
    await act(async () => {
      fireEvent.click(button("다시 저장"));
    });
    expect(await lastRequestBody()).toEqual(bundle);
    expect(onSaved).toHaveBeenCalledWith("old-draft");
  });

  it("API 원문 변형은 준비·생성·저장에 ref를 전달하며 sourcePassage는 입력 원문이다", async () => {
    const apiSeed = { ...seed, path: "api" as const };
    await bankSetup(apiSeed);
    fireEvent.click(screen.getByLabelText("원문 변형"));
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    const generated = {
      ...goodDraft,
      source: "deepseek",
      passage: passage + " The family enjoyed their afternoon.",
    };
    fetchMock
      .mockResolvedValueOnce(prepare(apiSeed))
      .mockResolvedValueOnce(jsonResponse({ data: generated }))
      .mockResolvedValueOnce(
        jsonResponse(savedSet("variation", "deepseek"), 201),
      );
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(button("교사 수정"));
    fireEvent.change(screen.getByLabelText("1번 해설"), {
      target: { value: "교사가 원문과 대조한 해설" },
    });
    await act(async () => {
      fireEvent.click(button("초안 저장"));
    });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `/api/english/passages/${seed.passageRef.passageId}/prepare`,
      "/api/english/generate",
      `/api/english/exams/${exam.id}/sets`,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1].body))).toMatchObject({
      mode: "variation",
      passage,
      passageRef: seed.passageRef,
    });
    const saved = await lastRequestBody();
    expect(saved.passage).toBe(generated.passage);
    expect(
      (saved.questions as typeof goodDraft.questions)[0]!.explanation,
    ).toBe("교사가 원문과 대조한 해설");
    expect(saved.meta).toMatchObject({
      path: "api",
      mode: "variation",
      sourcePassage: passage,
      passageRef: seed.passageRef,
      materialName: seed.title,
    });
  });

  it("은행 원문을 편집하면 ref 없이 저장하며 새 지문 전환도 ref를 버린다", async () => {
    const view = await bankSetup();
    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: passage + " Edited." },
    });
    expect(screen.getByText(/은행 연결을 해제/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: passage },
    });
    fetchMock.mockResolvedValue(
      jsonResponse(savedSet("edited", "chatgpt"), 201),
    );
    await pasteDraft();
    expect((await lastRequestBody()).meta).not.toHaveProperty("passageRef");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.rerender(
      <EnglishMakerView
        {...props}
        bankSeed={{
          ...seed,
          requestId: "40000000-0000-4000-8000-000000000002",
        }}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    fireEvent.click(screen.getByLabelText("AI로 원문부터"));
    fillTopic();
    fetchMock.mockClear();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("원문 복원 입력 편집은 해당 ref만 해제하고 ChatGPT 입력·ref를 유지한다", async () => {
    const view = await bankSetup();
    const clozeSeed = {
      ...seed,
      requestId: "40000000-0000-4000-8000-000000000003",
      path: "cloze" as const,
      text: passage + " The afternoon was peaceful.",
    };
    view.rerender(
      <EnglishMakerView
        {...props}
        bankSeed={clozeSeed}
        onBankSeedHandled={handled}
      />,
    );
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("복원할 원문"), {
      target: { value: passage },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(savedSet("edited-cloze", "cloze"), 201),
    );
    await act(async () => {
      fireEvent.click(button("연습문제 만들기"));
    });
    expect((await lastRequestBody()).meta).not.toHaveProperty("passageRef");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(method("외부 자료 가져오기"));
    expect(screen.getByLabelText("원문")).toHaveValue(passage);
    fetchMock.mockResolvedValueOnce(prepare());
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(fetchMock.mock.calls[1]![0]).toContain("/prepare");
  });

  it.each(["chatgpt", "cloze"] as const)(
    "%s 길이 초과 원문은 입력에 전부 남기고 동작을 막는다",
    async (path) => {
      const length = path === "chatgpt" ? 18_001 : 24_001;
      const longSeed = {
        ...seed,
        path,
        text: passage + " ".repeat(length - passage.length),
      };
      await bankSetup(longSeed);
      const label = path === "chatgpt" ? "원문" : "복원할 원문";
      await act(async () => {
        fireEvent.click(
          button(path === "chatgpt" ? "요청문 복사" : "연습문제 만들기"),
        );
      });
      expect(screen.getByLabelText(label)).toHaveValue(longSeed.text);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        path === "chatgpt" ? "18,000" : "24,000",
      );
    },
  );

  it("원문 복원 준비 권리 실패는 저장하지 않고 원문을 남긴다", async () => {
    await bankSetup({ ...seed, path: "cloze" });
    fetchMock.mockResolvedValue(conflict());
    await act(async () => {
      fireEvent.click(button("연습문제 만들기"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/prepare");
    expect(screen.getByLabelText("복원할 원문")).toHaveValue(passage);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("은행 준비 서비스 장애는 AI 미연결로 고정하지 않아 다시 시도할 수 있다", async () => {
    await bankSetup({ ...seed, path: "api" });
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { message: "잠시 뒤 은행 확인을 다시 시도해 주세요." } },
        503,
      ),
    );
    await act(async () => {
      fireEvent.click(button("원문·문항 생성"));
    });
    expect(button("원문·문항 생성")).toBeEnabled();
    expect(
      screen.getByText("AI 연결 확인 전 — 첫 생성 때 확인합니다."),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("다시 복사할 때 권리가 실패하면 전에 펼친 요청문도 숨긴다", async () => {
    await bankSetup();
    writeText.mockRejectedValue(new Error("clipboard unavailable"));
    fetchMock
      .mockResolvedValueOnce(prepare())
      .mockResolvedValueOnce(conflict());
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(screen.getByLabelText("요청문")).toBeVisible();
    await act(async () => {
      fireEvent.click(button("요청문 복사"));
    });
    expect(screen.queryByLabelText("요청문")).toBeNull();
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
