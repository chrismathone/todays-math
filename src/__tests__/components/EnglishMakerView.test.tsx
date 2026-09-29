/**
 * 오늘의 영어 — «문제 만들기» 화면 (D-148 · 25 §4 · 브리프 english-ai §3).
 *
 * 세 탭(ChatGPT 로 제작 · 원문 복원 · API 직접 생성) · 요청문 복사와 실패 대체 · 붙여넣기 실패 사유 ·
 * 저장 뒤 `onSaved`. MSW 핸들러는 shell 소유라 이 시험은 `fetch` 를 `vi.stubGlobal` 로 세운다.
 *
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EnglishMakerView from "@/components/english/EnglishMakerView";
import type {
  EnglishExam,
  EnglishMaterial,
} from "@/contracts/english.contract";

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

function setup() {
  return render(
    <EnglishMakerView
      exam={exam}
      materials={materials}
      onSaved={onSaved}
      onNotice={onNotice}
    />,
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });

function fillTopic(value = "등굣길") {
  fireEvent.change(screen.getByLabelText("소재"), { target: { value } });
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

describe("EnglishMakerView — 세 탭", () => {
  it("탭 셋부터 시작한다(머리는 뿌리 EnglishStudio 가 그린다) · 첫 탭이 ChatGPT · 화살표로 옮긴다", () => {
    setup();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const list = screen.getByRole("tablist", { name: "문제 만들기 방법" });
    const tabs = within(list).getAllByRole("tab");
    expect(tabs.map((el) => el.textContent)).toEqual([
      "ChatGPT 로 제작",
      "원문 복원",
      "API 직접 생성",
    ]);
    expect(tab("ChatGPT 로 제작")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/API 키가 필요 없습니다/)).toBeInTheDocument();

    fireEvent.keyDown(tab("ChatGPT 로 제작"), { key: "ArrowRight" });
    expect(tab("원문 복원")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/AI 추론형 문항과 다릅니다/)).toBeInTheDocument();

    fireEvent.click(tab("API 직접 생성"));
    expect(
      screen.getByText("생성 시 소재·지문을 AI 서버로 보냅니다."),
    ).toBeInTheDocument();
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
    fireEvent.click(screen.getByLabelText("원문 유지"));
    const picker = screen.getByLabelText("저장한 자료 불러오기");
    expect(within(picker).queryByText("시험 범위.pdf")).toBeNull();
    fireEvent.change(picker, { target: { value: materials[0]!.id } });
    expect(screen.getByLabelText("원문")).toHaveValue(passage);

    // API 탭으로 가도 같은 값이다
    fireEvent.click(tab("API 직접 생성"));
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

describe("원문 복원", () => {
  it("자료를 불러와 연습문제를 만들고 저장한다 — 최대 문항 수를 지킨다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(savedSet("set-2", "cloze"), 201));
    setup();
    fireEvent.click(tab("원문 복원"));
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
    expect(onSaved).toHaveBeenCalledWith("set-2");
  });

  it("쓸 만한 문장이 없으면 사유를 보이고 저장하지 않는다", async () => {
    setup();
    fireEvent.click(tab("원문 복원"));
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
  it("503 이면 상태 줄이 «연결 대기»가 되고 단추가 잠긴다", async () => {
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
    fireEvent.click(tab("API 직접 생성"));
    expect(screen.getByRole("status")).toHaveTextContent("확인 전");
    fillTopic();
    await act(async () => {
      fireEvent.click(button("AI 지문·문제 생성"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("연결 대기");
    expect(button("AI 지문·문제 생성")).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "AI 연결이 설정되지 않았습니다.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("200 이면 초안을 세트로 저장하고 onSaved — 상태 줄은 «AI 연결됨»", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { ...goodDraft, source: "deepseek" } }),
      )
      .mockResolvedValueOnce(jsonResponse(savedSet("set-3", "deepseek"), 201));
    setup();
    fireEvent.click(tab("API 직접 생성"));
    fillTopic("등굣길의 놀이");
    fireEvent.change(screen.getByLabelText("문항 수"), {
      target: { value: "3" },
    });
    await act(async () => {
      fireEvent.click(button("AI 지문·문제 생성"));
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
    fireEvent.click(tab("API 직접 생성"));
    fillTopic();
    await act(async () => {
      fireEvent.click(button("AI 지문·문제 생성"));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("검증을 통과하지 못했습니다");
    expect(alert).toHaveTextContent("2번 문항");
    expect(alert).toHaveTextContent("5개");
    expect(button("AI 지문·문제 생성")).not.toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
