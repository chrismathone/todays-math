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
import { unifiedBankQuerySchema } from "@/contracts/bankSource.contract";
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
const reviewCalls: { url: string; body: { reviewStatus: string } }[] = [];
let freshEligibility = true;
let freshReadFails = false;
/**
 * 승격 응답은 `{ data: <완전한 ProblemEntity> }` 다(`problemResponseSchema`).
 * 손으로 지어내지 않고 계약이 요구하는 필드를 그대로 채운다 — 하나라도 빠지면
 * 파싱이 실패해 시험이 «성공»이 아니라 «실패»를 재게 된다.
 */
/**
 * 🔴 **UUID 여야 한다.** 계약(`problemSchema.id`)이 uuid 를 요구하므로 `"blocked"` 같은
 *    이름을 쓰면 `updateReviewStatus` 가 파싱에서 던지고, 화면의 catch 가 그것을 삼켜
 *    「요청은 갔는데 아무것도 안 바뀌는」 조용한 실패가 된다 — 그러면 이 시험은
 *    성공 경로가 아니라 그 실패를 재게 된다(2026-09-14 에 실제로 그랬다).
 *    행과 응답이 **같은 상수**를 써야 갱신의 id 대조도 맞는다.
 */
const BLOCKED_ID = "00000000-0000-4000-8000-0000000000bb";
const PROBLEM_ENTITY = {
  id: BLOCKED_ID,
  problemCode: "J30501-A01-025",
  userId: null,
  unitId: "00000000-0000-4000-8000-000000000001",
  source: "manual",
  originProblemId: null,
  familyKey: null,
  difficulty: "기본",
  problemType: "계산",
  content: "검수 대기 문항",
  answer: "1",
  solution: "풀이",
  reviewStatus: "approved",
  directUseAllowed: true,
  pool: "shared",
  figureUrls: [],
  figureSvg: null,
  createdAt: "2026-05-01T09:00:00Z",
  updatedAt: "2026-05-01T09:00:00Z",
};
/**
 * 변형의 원본이 되는 행 — **UUID 여야 한다.** `problemTransformRequestSchema.originProblemId`
 * 가 uuid 라, `"eligible"` 같은 이름을 쓰면 `transformProblems` 가 **브라우저에서** 파싱에
 * 실패해 패널이 오류 문구를 띄운다. 그러면 이 시험은 성공 경로가 아니라 그 실패를 재게 된다
 * (2026-09-14 에 승인 시험이 같은 함정에 빠졌다).
 */
const ORIGIN_ID = "00000000-0000-4000-8000-0000000000aa";
/**
 * 변형 후보 — `transformCandidateSchema` 가 strictObject 라 **한 키도 빠질 수 없다.**
 * `verified: true` 라야 채택할 수 있고, 그래야 「채택분 저장」까지 가는 경로가 열린다.
 */
const TRANSFORM_CANDIDATE = {
  content: "변형된 문항",
  answer: "2",
  solution: "변형 풀이",
  verified: true,
  originalAnswerRecomputed: "1",
  figureSpec: null,
  figureSvg: null,
  figureError: null,
};
const transformCalls: { url: string; body: { originProblemId?: string } }[] =
  [];
/**
 * 대역이 돌려줄 목록 행 — **`mount()` 에 넘긴 것과 같게 둔다.**
 *
 * 🔴 종전에는 대역이 무엇을 물어도 `initialData` 를 돌려줬다. 그래서 쪽을 넘기거나
 *    필터를 바꾸는 **순간 화면의 행이 «처음 픽스처»로 갈아 끼워졌고**, 그 뒤의 동작은
 *    시험이 마운트한 행이 아니라 엉뚱한 행에 걸렸다. 변형에서 그것이 드러났다 —
 *    `id: "eligible"` 로 요청이 나가 계약(uuid)이 **브라우저에서** 거부했고, 시험은
 *    성공 경로가 아니라 그 실패를 재고 있었다(2026-09-14).
 */
let servedProblems: BankProblem[] = [problem];
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

beforeEach(() => {
  requests.length = 0;
  // ⚠️ 이것도 비운다 — 안 비우면 시험들 사이에 호출이 쌓여 개수 단언이 실행 순서에
  //    따라 통과하기도 한다. 우연히 통과한 초록은 그물이 아니다.
  reviewCalls.length = 0;
  freshEligibility = true;
  freshReadFails = false;
  transformCalls.length = 0;
  servedProblems = [problem];
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `/api/studio/problems/${BLOCKED_ID}`) {
        if (freshReadFails) return Response.json({}, { status: 503 });
        return Response.json({
          data: {
            id: BLOCKED_ID,
            eligible: freshEligibility,
            ineligibleReason: freshEligibility
              ? null
              : "출제가 잠긴 문항입니다.",
            reviewStatus: "approved",
          },
        });
      }
      // 🔴 검수 승격은 **전용 엔드포인트**다(`PATCH …/review-status`). 대역이 method 를
      //    안 보면 그 요청도 은행 목록을 받아 `problemResponseSchema` 가 거부하고,
      //    시험이 «성공 경로»가 아니라 «실패 경로»를 재게 된다.
      if (init?.method === "PATCH" && url.includes("/review-status")) {
        reviewCalls.push({
          url,
          body: JSON.parse(String(init.body)) as { reviewStatus: string },
        });
        return Response.json({
          data: {
            ...PROBLEM_ENTITY,
            reviewStatus: JSON.parse(String(init.body)).reviewStatus,
          },
        });
      }
      // 🔴 변형은 **POST 두 자리**다(후보 뽑기 · 채택 저장). 대역이 이 둘을 안 가르면
      //    그 요청도 은행 목록을 받아 계약이 거부하고, 시험이 «성공»이 아니라
      //    «실패 경로»를 재게 된다 — 검수 승격에서 이미 한 번 겪은 자리다.
      if (init?.method === "POST" && url.includes("/api/problems/transform")) {
        transformCalls.push({ url, body: JSON.parse(String(init.body)) });
        // 채택분은 서버가 **pending 으로** 넣는다(요청이 정하지 않는다 — 계약 §채택).
        if (url.endsWith("/adopt"))
          return Response.json({
            data: [{ ...PROBLEM_ENTITY, reviewStatus: "pending" }],
          });
        return Response.json({
          data: [TRANSFORM_CANDIDATE],
          meta: {
            figureRequired: false,
            originProblemCode: PROBLEM_ENTITY.problemCode,
          },
        });
      }
      const params = new URL(url, "http://localhost").searchParams;
      requests.push(params);
      return Response.json({
        ...initialData,
        problems: servedProblems,
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
  if (!screen.queryByRole("combobox", { name: label })) {
    fireEvent.click(screen.getByRole("button", { name: "상세 필터" }));
  }
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

  // 출처 · 교과서 책 · 자료 종류는 «출처 고르기» 창(H1)으로 고른다 — `BankView.source.test.tsx`.
  it("combines search, scope, semester, difficulty, state and true-only asset parameters", async () => {
    mount();
    await choose("학년", "중1");
    // 학기를 바꾸면 단원을 푼다(단원 목록이 학기를 따른다) — 그래서 단원보다 먼저 고른다
    await choose("학기", "2");
    await choose("단원", "수와 연산");
    await choose("난이도", DIFFICULTY_LADDER[DIFFICULTY_LADDER.length - 1]);
    await choose("상태", "pending");
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
      semester: "2",
      hasFigure: "true",
      hasSolution: "true",
      hasAnswer: "true",
      page: "1",
    });
    expect(unifiedBankQuerySchema.safeParse(lastQuery()).success).toBe(true);
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
    await choose("학기", "1");
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await settled();
    expect(lastQuery()).toEqual({
      format: "descriptive",
      semester: "1",
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
    const list = screen
      .getByText(problem.content)
      .closest("article")!.parentElement!;
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
    id: BLOCKED_ID,
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
    // 상세는 **카드를 펼치지 않고 모달**로 연다(05 §8.6 확정 2026-09-14, Hi-fi ③).
    // 지키려는 뜻은 그대로다 — 담을 수 없는 행이라도 상세는 읽혀야 한다.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("풀이", { selector: "h4" })).toBeVisible();
  });

  /**
   * 🔴 검수 승인·반려가 **실제로 서버에 간다** (D-22 — 승격은 사람이 누른다).
   *
   * 2026-09-14 까지 통합 화면에는 이 수단이 **아예 없었다.** 옛 화면에만 있었고,
   * 그래서 `pending` 으로 들어온 문항은 이 화면에서 영영 승격되지 못했다.
   * 「단추가 보인다」가 아니라 **「요청이 나가고 그 행이 바뀐다」**를 잰다 — 눌러도
   * 아무 일 없는 단추는 D-30 이 막는 것과 같은 거짓말이다.
   */
  it("검수 대기 문항을 모달에서 승인하면 서버에 알리고 그 행을 갱신한다", async () => {
    mount({ ...initialData, problems: [blocked] });
    const row = screen.getByText(blocked.content).closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "문제 상세" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "승인" }));

    await waitFor(() => expect(reviewCalls).toHaveLength(1));
    expect(reviewCalls[0]!.url).toContain(`/api/problems/${blocked.id}/`);
    expect(reviewCalls[0]!.body.reviewStatus).toBe("approved");
    // 승인된 뒤에는 승인·반려가 사라진다 — 이미 승인된 것에 다시 누를 일이 없다.
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).queryByRole("button", {
          name: "승인",
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "1번 문제 담기" }),
      ).toBeEnabled(),
    );
  });

  it("keeps an approved but locked row disabled using the server eligibility", async () => {
    freshEligibility = false;
    mount({ ...initialData, problems: [blocked] });
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "1번 문제 담기" }),
      ).toHaveAccessibleDescription("출제가 잠긴 문항입니다."),
    );
    expect(
      screen.getByRole("button", { name: "1번 문제 담기" }),
    ).toBeDisabled();
  });

  it("preserves the approved row after a read failure and retries only GET", async () => {
    freshReadFails = true;
    mount({ ...initialData, problems: [blocked] });
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "승인" }),
    );
    expect(
      await screen.findByText(
        "검수 상태는 저장했습니다. 출제 가능 여부 조회에 실패했습니다.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "1번 문제 담기" }),
    ).toBeDisabled();
    freshReadFails = false;
    fireEvent.click(
      screen.getByRole("button", { name: "문항 상태 다시 조회" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "1번 문제 담기" }),
      ).toBeEnabled(),
    );
    expect(reviewCalls).toHaveLength(1);
  });

  it("승인 단추는 검수 대기일 때만 선다", () => {
    mount();
    const row = screen.getByText(problem.content).closest("article")!;
    fireEvent.click(within(row).getByRole("button", { name: "문제 상세" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).queryByRole("button", { name: "승인" }),
    ).not.toBeInTheDocument();
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

/**
 * 🔴 **상세 모달에서 모든 걸 처리한다** (원장님 2026-09-14 「변형 버튼도 없고 말이야.
 *    상세 화면에서 모든걸 처리하는게 어떨지」 · 05 §8.6 확정).
 *
 * 2026-09-14 까지 통합 화면에는 변형이 **아예 없었다** — 옛 카드(`ProblemCard`)에만
 * 있었다. 여기서 재는 것은 「단추가 보인다」가 아니라 **「패널이 열리고, 채택이 서버에
 * 가고, 목록이 다시 온다」**이다. 눌러도 아무 일 없는 단추는 D-30 이 막는 것과 같은
 * 거짓말이고, 이 화면은 바로 그 실패를 한 번 겪었다.
 */
describe("상세 모달이 변형까지 맡는다", () => {
  it("opens a modal, puts focus on close and returns it after Escape", () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    const original = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      "showModal",
    );
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    try {
      mount();
      const opener = screen.getByRole("button", { name: "문제 상세" });
      opener.focus();
      fireEvent.click(opener);
      const dialog = screen.getByRole("dialog");
      expect(showModal).toHaveBeenCalledOnce();
      expect(
        within(dialog).getByRole("button", { name: "닫기" }),
      ).toHaveFocus();
      fireEvent(
        dialog,
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    } finally {
      if (original)
        Object.defineProperty(
          HTMLDialogElement.prototype,
          "showModal",
          original,
        );
      else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });
  const origin: BankProblem = { ...problem, id: ORIGIN_ID };

  it("hides export and AI transformation when those menus are disabled", () => {
    render(
      <BankView
        initialData={{ ...initialData, problems: [origin] }}
        selected={[origin]}
        onToggle={vi.fn()}
        onExport={vi.fn()}
        canExport={false}
        canUseAi={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "시험지 편집" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    expect(
      within(screen.getByRole("dialog")).queryByRole("button", {
        name: "변형",
      }),
    ).not.toBeInTheDocument();
    expect(transformCalls).toHaveLength(0);
  });

  it("unmounts an open AI panel when studio access is revoked", async () => {
    const props = {
      initialData: { ...initialData, problems: [origin] },
      selected: [],
      onToggle: vi.fn(),
      onExport: vi.fn(),
    };
    const { rerender } = render(<BankView {...props} canUseAi />);
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "변형" }),
    );
    expect(await screen.findByRole("region", { name: "변형" })).toBeVisible();
    rerender(<BankView {...props} canUseAi={false} />);
    expect(
      screen.queryByRole("region", { name: "변형", hidden: true }),
    ).not.toBeInTheDocument();
    expect(transformCalls).toHaveLength(0);
  });

  it("변형은 목록 카드에 없고 상세 모달에만 있다", () => {
    mount({ ...initialData, problems: [origin] });
    const row = screen.getByText(origin.content).closest("article")!;
    expect(
      within(row).queryByRole("button", { name: "변형" }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: "문제 상세" }));
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "변형" }),
    ).toBeVisible();
  });

  /** 05 §8.6 은 바닥을 「담기(primary, **맨 앞**) · 변형 · 승인·반려」로 적었다. */
  it("상세 모달 바닥에서 바로 담는다 — 담으려고 카드로 되돌아가지 않는다", () => {
    const onToggle = mount({ ...initialData, problems: [origin] });
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "문제 담기",
      }),
    );
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(origin);
  });

  it("변형 채택분을 저장하면 보고 있던 쪽 그대로 목록을 다시 불러온다", async () => {
    // 쪽을 넘긴 뒤에도 **같은 행**이 서 있어야 한다 — 아니면 엉뚱한 행에 변형이 걸린다.
    servedProblems = [origin];
    mount({ ...initialData, problems: [origin] });
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await settled();
    expect(lastQuery()).toEqual({ page: "2" });
    const before = requests.length;

    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "변형" }),
    );
    // 지연 청크(`ProblemTransformPanelLazy`)라 바로 서지 않는다.
    const panel = await screen.findByRole("region", { name: "변형" });
    fireEvent.click(within(panel).getByRole("button", { name: "변형하기" }));
    await within(panel).findByText(/변형 결과/);
    fireEvent.click(within(panel).getByRole("button", { name: "채택분 저장" }));

    await waitFor(() => expect(requests).toHaveLength(before + 1));
    // 변형·채택이 **정말 서버에 갔다** — 원본 열쇠까지 같이 잠근다.
    expect(transformCalls).toHaveLength(2);
    expect(transformCalls[0]!.body.originProblemId).toBe(ORIGIN_ID);
    expect(transformCalls[1]!.url).toContain("/transform/adopt");
    // 🔴 쪽이 1로 튀지 않는다 — `updateFilters` 로 새로고침하면 여기가 "1"이 된다.
    expect(lastQuery()).toEqual({ page: "2" });
    // 변형본은 pending 이라 지금 목록에 안 보일 수 있다. 그래서 **말로** 알린다.
    expect(
      await screen.findByText(/1건을 변형해 검수 대기로 저장했습니다/),
    ).toBeVisible();
  });
});

describe("compact filters keep scope visible and disclose extra controls", () => {
  it("keeps search, grade, chapter, and range visible while hiding extra filters", () => {
    mount();
    const bar = within(screen.getByRole("group", { name: "검색과 필터" }));
    expect(bar.getByRole("textbox", { name: "문제 검색" })).toBeVisible();
    for (const name of ["학년", "학기", "단원"])
      expect(bar.getByRole("combobox", { name })).toBeVisible();
    expect(bar.getByRole("button", { name: "범위" })).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "난이도" }),
    ).not.toBeInTheDocument();
    fireEvent.click(bar.getByRole("button", { name: "상세 필터" }));
    for (const name of ["난이도", "유형", "상태"])
      expect(screen.getByRole("combobox", { name })).toBeVisible();
    // 출처는 선택 칸이 아니라 고르기 창을 여는 칸이다(H1 ⑴)
    expect(
      screen.queryByRole("combobox", { name: "출처" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^출처 고르기/ })).toBeVisible();
    for (const name of ["그림", "해설", "정답"])
      expect(screen.getByRole("checkbox", { name })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "필터 접기" }));
    expect(
      screen.queryByRole("combobox", { name: "유형" }),
    ).not.toBeInTheDocument();
    expect(bar.getByRole("combobox", { name: "학년" })).toBeVisible();
  });

  it("retains accessible control labels and search help", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "상세 필터" }));
    for (const name of ["학년", "학기", "단원", "난이도", "유형", "상태"]) {
      const control = screen.getByRole("combobox", { name });
      expect(
        document.querySelector(`label[for="${control.id}"]`)?.className,
      ).toContain("sr-only");
    }
    expect(
      screen.getByRole("textbox", { name: "문제 검색" }),
    ).toHaveAccessibleDescription(
      "본문·문항번호·정답·해설·학교를 함께 검색합니다.",
    );
  });
});

/**
 * 🔴 **상세 모달의 풀이도 `solutionForDisplay` 를 지난다** (2026-09-19).
 *
 * 통합 문제은행이 들어온 날(8baffa91, 2026-09-13)부터 상세의 풀이는 `displayFractions`
 * 만 거치고 줄 나누기를 안 거쳤다. 그래서 원장님이 두 번 지적하신 «해설이 한 줄로 나간다»
 * (solutionSteps.ts 머리말 — 2026-08-21 · 2026-09-06)가 **이 화면에서만** 다시 났다.
 * 소스 가드(`solutionWiring.test.ts`)가 그 자리를 짚었고, 여기서는 **그려진 결과**로 잰다.
 */
describe("상세 모달의 풀이가 단계별 줄로 갈린다", () => {
  const openDetail = async (solution: string, grade = "중1") => {
    const row: BankProblem = { ...problem, solution, grade };
    servedProblems = [row];
    mount({ ...initialData, problems: [row] });
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "문제 상세" }));
    return within(screen.getByRole("dialog")).getByText("풀이", {
      selector: "h4",
    }).parentElement!;
  };

  it("두 문장 풀이는 두 줄로 그린다 — 한 줄로 붙이지 않는다", async () => {
    // solutionWiring.test.ts 의 표본과 같다 — 두 조각이 각각 짧아 경계를 가른다
    const detail = await openDetail("밑변은 $5$이다. 높이는 $4$이다.");
    expect(detail.querySelectorAll("br")).toHaveLength(1);
    expect(detail.textContent).toContain("밑변은");
    expect(detail.textContent).toContain("높이는");
  });

  it("한 문장 풀이는 그대로 한 줄이다 — 없는 경계를 만들지 않는다", async () => {
    const detail = await openDetail("밑변은 $5$이고 높이는 $4$이다.");
    expect(detail.querySelectorAll("br")).toHaveLength(0);
  });

  it("초등 가분수 표시(fractionViewFor)는 줄을 나눠도 그대로 한다", async () => {
    const detail = await openDetail(
      String.raw`넓이는 $\frac{7}{3}$이다. 따라서 답은 $\frac{7}{3}$이다.`,
      "초4",
    );
    expect(detail.querySelectorAll("br")).toHaveLength(1);
    // KaTeX 가 남기는 TeX 원문(annotation)으로 잰다 — 렌더러가 `\frac` 를 `\dfrac` 로 올린다
    const tex = [...detail.querySelectorAll("annotation")].map(
      (a) => a.textContent ?? "",
    );
    expect(tex).toHaveLength(2);
    for (const t of tex) {
      expect(t).toMatch(/2\\d?frac\{1\}\{3\}/);
      expect(t).not.toContain("{7}{3}");
    }
  });

  it("풀이가 없으면 없다고 적는다", async () => {
    const detail = await openDetail("");
    expect(detail.textContent).toContain("등록된 풀이가 없습니다.");
  });
});
