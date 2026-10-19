import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkroomHome from "@/components/unified/WorkroomHome";
import ExamBuilder from "@/components/exam-builder/ExamBuilder";
import { createMathExamBuilderSource } from "@/components/exam-builder/mathSource";
import type { BankData, StudioProblem } from "@/components/unified/types";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

// 은행 수치는 «문제은행 바로 검색» 칸 안에만 있다 — 지금 시험지 카드의 «0 문항»과 가른다.
const bankRegion = () =>
  document.querySelector<HTMLElement>('[aria-labelledby="quick-bank-title"]');
const bankZero = () =>
  bankRegion() ? within(bankRegion()!).queryByText("0") : null;


const empty: BankData = {
  problems: [],
  total: 0,
  page: 1,
  pageSize: 12,
  grades: [],
  chapters: [],
};
const unit = {
  id: "10000000-0000-4000-8000-000000000001",
  grade: "중1",
  chapter: "수와 연산",
  section: "정수",
  orderIndex: 1,
};
const metadata: BankData = {
  ...empty,
  total: 23,
  version: 2,
  countUnit: "question",
  queryKey: "fixture",
  grades: [{ grade: "중1", count: 23 }],
  chapters: [unit.chapter],
  units: [unit],
  unitCounts: { [unit.id]: 23 },
};
const homeProps = {
  data: empty,
  deferBankMetadata: true,
  allowedMenus: ["bank", "studio"] as ("bank" | "studio")[],
  draft: {
    id: "draft",
    title: "시험지",
    problems: [],
    updatedAt: "2026-10-19",
  },
  recent: [],
  hydrated: true,
  onNew: vi.fn(),
  onBank: vi.fn(),
  onImport: vi.fn(),
  onFiles: vi.fn(),
  onOpen: vi.fn(),
  onNavigate: vi.fn(),
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deferred workspace bank metadata", () => {
  it("keeps home actions visible with the existing progress UI, then shows the returned grade and count", async () => {
    let finish!: (value: Response) => void;
    const requests = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", requests);
    render(<WorkroomHome {...homeProps} />);
    expect(screen.getByText("시험지 만들기를 여는 중입니다…")).toBeVisible();
    expect(screen.getByRole("button", { name: "문제 찾기" })).toBeEnabled();
    expect(bankZero()).toBeNull();
    await act(async () => finish(Response.json(metadata)));
    expect(
      await screen.findByRole("button", { name: "중1 문제 찾기" }),
    ).toBeVisible();
    expect(screen.getByText("23")).toBeVisible();
    expect(screen.queryByText("시험지 만들기를 여는 중입니다…")).toBeNull();
    expect(requests).toHaveBeenCalledWith(
      "/api/studio/problems?identity=question&view=bootstrap",
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });

  it("waits for restored navigation, respects the bank gate, and retains supplied preview metadata", async () => {
    const requests = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", requests);
    const { rerender } = render(
      <WorkroomHome {...homeProps} navigationReady={false} />,
    );
    expect(requests).not.toHaveBeenCalled();
    rerender(<WorkroomHome {...homeProps} allowedMenus={["studio"]} />);
    expect(requests).not.toHaveBeenCalled();
    rerender(
      <WorkroomHome {...homeProps} data={metadata} deferBankMetadata={false} />,
    );
    expect(screen.getByText("23")).toBeVisible();
    expect(requests).not.toHaveBeenCalled();
  });

  it("uses the existing connection failure notice and cancels an abandoned home request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );
    const { unmount } = render(<WorkroomHome {...homeProps} />);
    expect(
      await screen.findByText(/문제은행 연결을 확인해 주세요/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "문제 찾기" })).toBeEnabled();
    expect(bankZero()).toBeNull();
    unmount();
    const requests = vi.fn<typeof fetch>(() => new Promise(() => {}));
    vi.stubGlobal("fetch", requests);
    const next = render(<WorkroomHome {...homeProps} />);
    const signal = requests.mock.calls[0][1]?.signal;
    next.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it.each([{ countUnit: "question" }, { ...metadata, total: -1 }])(
    "keeps malformed metadata inside the existing bank error state",
    async (value) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
      render(<WorkroomHome {...homeProps} />);
      expect(
        await screen.findByText(/문제은행 연결을 확인해 주세요/),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "문제 찾기" })).toBeEnabled();
      expect(bankZero()).toBeNull();
    },
  );

  it("loads the math curriculum on demand with the existing scope loading state and unchanged counts", async () => {
    let finish!: (value: Response) => void;
    const tally = { held: 23, available: 23 };
    const inventory = {
      view: "available",
      version: 2,
      countUnit: "question",
      queryKey: "fixture",
      ...tally,
      facets: {
        units: { [unit.id]: tally },
        unitFamilies: { [unit.id]: 6 },
        difficulties: Object.fromEntries(
          DIFFICULTY_LADDER.map((level) => [level, tally]),
        ),
        sources: Object.fromEntries(
          ["total", "engine", "school_textbook", "past_exam", "other"].map(
            (key) => [key, tally],
          ),
        ),
        textbook: { ...tally, books: [] },
      },
    };
    const requests = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/sources")) return Response.json(inventory);
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const source = createMathExamBuilderSource({ fetch: requests });
    render(
      <ExamBuilder
        source={source}
        questions={[]}
        onQuestionsChange={() => {}}
        title="시험지"
        onTitleChange={() => {}}
        initialScopeIds={[unit.id]}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        renderQuestion={(item) => <p>{item.content}</p>}
        renderOutput={() => null}
      />,
    );
    expect(screen.getByText("출제 범위를 불러오는 중입니다…")).toBeVisible();
    await act(async () => finish(Response.json(metadata)));
    const count = await screen.findByRole("spinbutton", {
      name: "정수 구성 수",
    });
    expect(count).toHaveAttribute("max", "6");
    expect(screen.getByText(/중1 · 수와 연산 · 출제 가능 6갈래/)).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByText("출제 범위를 불러오는 중입니다…")).toBeNull(),
    );
    expect(requests).toHaveBeenCalledWith(
      "/api/studio/problems?identity=question&view=bootstrap",
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });

  it("restores the original allocation of saved questions without unit IDs after metadata arrives", async () => {
    let finish!: (value: Response) => void;
    const tally = { held: 23, available: 23 };
    const requests = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/sources"))
        return Response.json({
          view: "available",
          version: 2,
          countUnit: "question",
          queryKey: "fixture",
          ...tally,
          facets: {
            units: { [unit.id]: tally },
            unitFamilies: { [unit.id]: 6 },
            difficulties: Object.fromEntries(
              DIFFICULTY_LADDER.map((level) => [level, tally]),
            ),
            sources: Object.fromEntries(
              ["total", "engine", "school_textbook", "past_exam", "other"].map(
                (key) => [key, tally],
              ),
            ),
            textbook: { ...tally, books: [] },
          },
        });
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const saved: StudioProblem = {
      id: "20000000-0000-4000-8000-000000000001",
      questionId: "saved-question-one",
      grade: unit.grade,
      chapter: unit.chapter,
      section: unit.section,
      content: "저장한 문제",
      answer: "1",
      solution: "풀이",
      difficulty: "기본",
      problemCode: "M-001",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
    };
    const questions = [
      saved,
      { ...saved, id: "saved-two", questionId: "saved-question-two" },
    ];
    const source = createMathExamBuilderSource({ fetch: requests });
    const props = {
      source,
      questions,
      onQuestionsChange: vi.fn(),
      title: "저장한 시험지",
      onTitleChange: vi.fn(),
      difficulties: DIFFICULTY_LADDER,
      maxQuestions: 100,
      renderQuestion: (item: StudioProblem) => <p>{item.content}</p>,
      renderOutput: () => null,
    };
    const { rerender } = render(<ExamBuilder {...props} />);
    expect(screen.getByText("출제 범위를 불러오는 중입니다…")).toBeVisible();
    await act(async () => finish(Response.json(metadata)));
    const count = await screen.findByRole("spinbutton", {
      name: "정수 구성 수",
    });
    expect(count).toHaveValue(2);
    expect(count).toHaveAttribute("max", "6");
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeEnabled();
    fireEvent.change(count, { target: { value: "4" } });
    rerender(<ExamBuilder {...props} questions={[...questions, saved]} />);
    expect(count).toHaveValue(4);
    expect(props.onQuestionsChange).not.toHaveBeenCalled();
  });

  it("keeps local cropped questions printable when bank metadata cannot load", async () => {
    const crop: StudioProblem = {
      id: "local-crop",
      grade: "",
      chapter: "",
      section: "",
      content: "사진에서 추출한 문제",
      answer: "1",
      solution: "풀이",
      difficulty: "",
      problemCode: "",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      croppedImage: "blob:local-crop",
    };
    const requests = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: "문제은행을 불러오지 못했습니다." },
        { status: 503 },
      ),
    );
    const source = createMathExamBuilderSource({ fetch: requests });
    const changed = vi.fn();
    render(
      <ExamBuilder
        source={source}
        questions={[crop]}
        onQuestionsChange={changed}
        title="추출한 시험지"
        onTitleChange={vi.fn()}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        initialStep="review"
        renderQuestion={(item) => <p>{item.content}</p>}
        renderOutput={() => <p>추출 문항 출력</p>}
      />,
    );
    await waitFor(() => expect(requests).toHaveBeenCalled());
    const next = screen.getByRole("button", { name: "3 양식 구성·출력" });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(await screen.findByText("추출 문항 출력")).toBeVisible();
    expect(
      requests.mock.calls.some(([url]) => String(url).endsWith("/check")),
    ).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });
});
