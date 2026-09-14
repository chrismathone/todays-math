import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BankView from "@/components/unified/BankView";
import type {
  BankData,
  BankProblem,
  StudioProblem,
} from "@/components/unified/types";
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
// 목록에 들어가는 행은 `BankProblem` 이다 — 출처 배지의 판정 근거(`familyKey`·
// `originProblemId`)를 반드시 실어야 한다(types.ts 의 경고).
const problem: BankProblem = {
  familyKey: "elem:초3|1-1-1|연산",
  originProblemId: null,
  questionTypeRaw: "단답형",
  source: "manual",
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

  /**
   * 🔴 목록을 **카드 폭 고정 다단**으로 둔다 (원장님 확정 2026-09-14).
   *
   * 종전에는 `.problemList` 가 열을 한 번도 선언하지 않아 문항 하나가 전폭 한 줄이
   * 됐고, 그 안에서 그림이 화면 한가운데 뜨고 보기가 양 끝으로 갈라졌다.
   * 폭 값은 `tokens.ts` 의 PROBLEM_CARD_WIDTH 하나에서만 온다.
   */
  it("문항 목록을 고정 폭 카드로 늘어놓는다 — 전폭 한 줄이 아니다", () => {
    mount();
    const list = document.querySelector("[aria-busy]") as HTMLElement;
    expect(list.style.gridTemplateColumns).toContain("repeat(auto-fill");
    // 좁은 창에서 1단으로 떨어지는 가드까지 함께 잠근다(가로 스크롤 대신).
    expect(list.style.gridTemplateColumns).toContain("min(100%");
  });

  /**
   * 🔴 출처 배지가 **화면에 선다** (원장님 2026-09-14 「각종 라벨이 어디갔지?」).
   *
   * 근거를 API 가 실어 보내는 것(`unifiedBankFilters.test.ts`)과 카드가 그것을 그리는
   * 것은 **다른 일**이다. 둘 다 재지 않으면 한쪽만 고치고 「했다」가 된다.
   * 픽스처는 `familyKey: "elem:…"` 이라 출처는 `[초]`, 보기 없는 주관식 +
   * `questionTypeRaw: "단답형"` 이라 형식은 `[단]` 이 맞다.
   */
  it("카드에 출처·형식 배지를 그린다 — 판정은 provenance 하나가 한다", () => {
    mount();
    expect(screen.getByText("초")).toBeInTheDocument();
    expect(screen.getByText("단")).toBeInTheDocument();
  });

  it("빈 목록에는 격자를 씌우지 않는다 — 안내가 카드 폭으로 잘린다", () => {
    mount({ ...initialData, problems: [], total: 0 });
    const list = document.querySelector("[aria-busy]") as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe("");
  });

  /**
   * 🔴 범위 글자가 세 군데 나왔다 (원장님 2026-09-14 「범위가 3중으로 나옴」).
   *
   * 셋 중 둘은 **제 몫이 있다**: 필터 바의 「범위」 칸은 옆의 학년·난이도 칸처럼
   * «지금 고른 값»을 보여 주는 컨트롤이고, 아래 칩은 «적용한 조건»이라 접었을 때도
   * 남는다. 순수한 군더더기는 **펼친 패널 머리글** 하나뿐이었고 그것만 없앴다.
   *
   * 그래서 「한 곳」이 아니라 **「패널 안에는 없다」**가 지킬 것이다. 총 개수도 함께
   * 박는다 — 머리글을 되살리면 둘 다 빨개진다.
   */
  it("범위 값을 펼친 패널에서 되풀이하지 않는다 — 필터 칸과 칩 두 곳뿐", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "범위" }));
    const picker = screen.getByRole("group", { name: "문제은행 단원 범위" });
    fireEvent.click(within(picker).getByRole("button", { name: "중2" }));
    await settled();

    const panel = picker.closest("[id$='-range-panel']") as HTMLElement;
    expect(within(panel).queryAllByText(/단항식 ~ 다항식/)).toHaveLength(0);
    // 값이 사라진 것은 아니다 — 컨트롤과 칩에 그대로 있다.
    expect(screen.getAllByText(/단항식 ~ 다항식/)).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "범위 단항식 ~ 다항식 조건 해제" }),
    ).toBeInTheDocument();
  });

  /**
   * 🔴 범위의 **시작·끝이 든 무리**도 진하게 (원장님 확정 2026-09-14).
   *
   * 소단원 열은 «열려 있는 대단원» 것만 보여 주므로, 범위가 대단원을 넘으면 진한 칸이
   * 한쪽 끝만 보이고 「그 학년 전체」가 소단원 하나처럼 읽혔다.
   */
  it("범위의 시작·끝이 든 학년·대단원을 진하게 칠한다", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "범위" }));
    const picker = screen.getByRole("group", { name: "문제은행 단원 범위" });
    fireEvent.click(within(picker).getByRole("button", { name: "중2" }));
    await settled();
    // 중2 전체(단항식~다항식)가 범위다 — 그 학년과 대단원이 양끝을 품고 있다.
    expect(within(picker).getByRole("button", { name: "중2" })).toHaveClass(
      "bg-g-blue",
    );
    expect(
      within(picker).getByRole("button", { name: "식의 계산" }),
    ).toHaveClass("bg-g-blue");
    // 범위 밖 학년은 진해지지 않는다 — 「전부 진하다」로 통과하지 못하게 막는다.
    expect(within(picker).getByRole("button", { name: "중1" })).not.toHaveClass(
      "bg-g-blue",
    );
  });
});

describe("inspection rows cannot be added", () => {
  // 목록 행이므로 `BankProblem` 이다 — `StudioProblem` 으로 적으면 스프레드로 들어온
  // 배지 근거(`familyKey`·`originProblemId`)를 주석이 다시 깎아 낸다.
  const blocked: BankProblem = {
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
