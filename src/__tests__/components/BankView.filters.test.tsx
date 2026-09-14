import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BankView from "@/components/unified/BankView";
import type { BankData, StudioProblem } from "@/components/unified/types";
import { PROBLEM_FILTER_OPTIONS } from "@/components/problem/labels";
import { problemFilterQuerySchema } from "@/contracts/problem.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

vi.mock("@/components/unified/UnifiedProblem", () => ({
  default: ({ problem }: { problem: StudioProblem }) => (
    <p>{problem.content}</p>
  ),
}));

const units = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    grade: "중1",
    chapter: "수와 연산",
    section: "정수",
    orderIndex: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    grade: "중1",
    chapter: "수와 연산",
    section: "유리수",
    orderIndex: 2,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    grade: "중2",
    chapter: "식의 계산",
    section: "단항식",
    orderIndex: 3,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    grade: "중2",
    chapter: "식의 계산",
    section: "다항식",
    orderIndex: 4,
  },
];
const problem: StudioProblem = {
  id: "eligible",
  content: "서버에서 찾은 문항",
  answer: "1",
  solution: "풀이",
  grade: "중1",
  chapter: "수와 연산",
  section: "정수",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  ineligibleReason: null,
  reviewStatus: "approved",
};
const initialData: BankData = {
  problems: [problem],
  total: 36,
  page: 1,
  pageSize: 12,
  grades: [
    { grade: "중1", count: 24 },
    { grade: "중2", count: 12 },
  ],
  chapters: ["수와 연산", "식의 계산"],
  units,
};
const requests: URLSearchParams[] = [];
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

beforeEach(() => {
  requests.length = 0;
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const params = new URL(url, "http://localhost").searchParams;
      requests.push(params);
      return Response.json({
        ...initialData,
        page: Number(params.get("page")),
      });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (scrollIntoViewDescriptor)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      scrollIntoViewDescriptor,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

function mount(data = initialData, selected: StudioProblem[] = []) {
  const onToggle = vi.fn();
  render(
    <BankView
      initialData={data}
      selected={selected}
      onToggle={onToggle}
      onExport={vi.fn()}
    />,
  );
  return onToggle;
}
async function settled() {
  await waitFor(() =>
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
  );
}
function lastQuery() {
  return Object.fromEntries(requests.at(-1)!);
}
async function choose(label: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: label }), {
    target: { value },
  });
  await settled();
}

describe("unified bank uses real ProblemBank filters", () => {
  it.each(PROBLEM_FILTER_OPTIONS)(
    "sends the contract axis for $label",
    async ({ value }) => {
      mount();
      await choose("유형", value);
      const [axis, filter] = value.split(":");
      expect(lastQuery()).toEqual({
        page: "1",
        [axis === "type" ? "problemType" : "format"]: filter,
      });
      expect(problemFilterQuerySchema.safeParse(lastQuery()).success).toBe(
        true,
      );
    },
  );

  it("combines search, scope, difficulty, state, source and true-only asset parameters", async () => {
    mount();
    await choose("학년", "중1");
    await choose("단원", "수와 연산");
    await choose("난이도", DIFFICULTY_LADDER[DIFFICULTY_LADDER.length - 1]);
    await choose("상태", "pending");
    await choose("출처", "ai_generated");
    for (const label of ["그림", "해설", "정답"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
      await settled();
    }
    const input = screen.getByRole("textbox", { name: "문제 검색" });
    expect(input).toHaveAttribute("maxlength", "100");
    expect(input).toHaveAccessibleDescription(
      "본문·문항번호·정답·해설·학교를 함께 검색합니다.",
    );
    fireEvent.change(input, { target: { value: "  학교 문항  " } });
    fireEvent.submit(screen.getByRole("search"));
    await settled();
    expect(lastQuery()).toEqual({
      q: "학교 문항",
      grade: "중1",
      chapter: "수와 연산",
      difficulty: DIFFICULTY_LADDER[DIFFICULTY_LADDER.length - 1],
      reviewStatus: "pending",
      source: "ai_generated",
      hasFigure: "true",
      hasSolution: "true",
      hasAnswer: "true",
      page: "1",
    });
    expect(problemFilterQuerySchema.safeParse(lastQuery()).success).toBe(true);
    // Server results/count are authoritative, regardless of the current page's rows.
    expect(screen.getByText(problem.content)).toBeVisible();
    expect(
      within(screen.getByRole("heading", { name: /문제 목록/ })).getByRole(
        "status",
      ),
    ).toHaveTextContent("36");
    fireEvent.click(
      screen.getByRole("button", { name: "자료 정답 있음 조건 해제" }),
    );
    await settled();
    expect(lastQuery()).not.toHaveProperty("hasAnswer");
    expect(screen.getByRole("checkbox", { name: "정답" })).not.toBeChecked();
  });

  it("keeps all filters on page changes and resets query, draft, chips and pagination together", async () => {
    mount();
    await choose("유형", "format:descriptive");
    await choose("출처", "past_exam");
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await settled();
    expect(lastQuery()).toEqual({
      format: "descriptive",
      source: "past_exam",
      page: "2",
    });
    await choose("난이도", "응용");
    expect(lastQuery().page).toBe("1");
    fireEvent.change(screen.getByRole("textbox", { name: "문제 검색" }), {
      target: { value: "미제출 검색어" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
    expect(screen.getByRole("textbox", { name: "문제 검색" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "상태" })).toHaveDisplayValue(
      "출제 가능",
    );
    expect(
      screen.queryByRole("group", { name: "적용한 검색 조건" }),
    ).not.toBeInTheDocument();
  });

  it("reuses the two-click range picker and clears incompatible grade/chapter filters", async () => {
    mount();
    await choose("학년", "중1");
    await choose("단원", "수와 연산");
    fireEvent.click(screen.getByRole("button", { name: "범위" }));
    const picker = screen.getByRole("group", { name: "문제은행 단원 범위" });
    fireEvent.click(within(picker).getByRole("button", { name: "정수" }));
    await settled();
    expect(lastQuery()).toEqual({
      unitFrom: units[0].id,
      unitTo: units[0].id,
      page: "1",
    });
    fireEvent.click(within(picker).getByRole("button", { name: "유리수" }));
    await settled();
    expect(lastQuery()).toEqual({
      unitFrom: units[0].id,
      unitTo: units[1].id,
      page: "1",
    });
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await settled();
    expect(lastQuery().page).toBe("2");
    await choose("학년", "중2");
    expect(lastQuery()).toEqual({ grade: "중2", page: "1" });
    expect(screen.getByRole("combobox", { name: "단원" })).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: /범위 .* 조건 해제/ }),
    ).not.toBeInTheDocument();
  });

  it("selects a whole grade with the shared picker and clears both range endpoints via its chip", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "범위" }));
    fireEvent.click(
      within(
        screen.getByRole("group", { name: "문제은행 단원 범위" }),
      ).getByRole("button", { name: "중2" }),
    );
    await settled();
    expect(lastQuery()).toEqual({
      unitFrom: units[2].id,
      unitTo: units[3].id,
      page: "1",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "범위 단항식 ~ 다항식 조건 해제" }),
    );
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
  });

  it("clears dependent chapter and pagination when removing a grade chip", async () => {
    mount();
    await choose("학년", "중1");
    await choose("단원", "수와 연산");
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await settled();
    fireEvent.click(
      screen.getByRole("button", { name: "학년 중1 조건 해제 (단원도 해제)" }),
    );
    await settled();
    expect(lastQuery()).toEqual({ page: "1" });
  });
});

describe("inspection rows cannot be added", () => {
  const blocked: StudioProblem = {
    ...problem,
    id: "blocked",
    content: "검수 대기 문항",
    reviewStatus: "pending",
    eligible: false,
    ineligibleReason: "검수를 통과하지 않은 문항입니다.",
  };

  it("disables row adding, keeps details readable and excludes ineligible rows from bulk selection", () => {
    const onToggle = mount({ ...initialData, problems: [problem, blocked] });
    const checkbox = screen.getByRole("checkbox", { name: "2번 문제 담기" });
    const button = screen.getByRole("button", { name: "2번 문제 담기" });
    expect(checkbox).toBeDisabled();
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(blocked.ineligibleReason!);
    fireEvent.click(button);
    fireEvent.click(checkbox);
    expect(onToggle).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    );
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(problem);
    const row = screen.getByText(blocked.content).closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "문제 상세" }));
    expect(within(row).getByText("풀이", { selector: "h4" })).toBeVisible();
  });

  it("disables bulk adding when no eligible row exists", () => {
    mount({ ...initialData, problems: [blocked] });
    expect(
      screen.getByRole("checkbox", { name: "이 페이지 전체 담기" }),
    ).toBeDisabled();
  });

  it("still allows removal of a previously selected row that is now ineligible", () => {
    const onToggle = mount({ ...initialData, problems: [blocked] }, [blocked]);
    const remove = screen.getByRole("button", { name: "1번 문제 담기 취소" });
    expect(remove).toBeEnabled();
    fireEvent.click(remove);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(blocked);
  });
});
