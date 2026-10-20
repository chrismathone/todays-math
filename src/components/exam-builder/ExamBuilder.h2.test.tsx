import "@testing-library/jest-dom/vitest";
import { useState, type ComponentProps } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  QUESTION_FORMAT_LABELS,
  type QuestionFormat,
  type QuestionRepresentation,
} from "@/contracts/questionFormats.contract";
import ExamBuilder from "./ExamBuilder";
import QuickConditions from "./QuickConditions";
import ScopeSequencePicker from "./ScopeSequencePicker";
import {
  emptyFormats,
  emptyLadder,
  type AppliedConditions,
} from "./conditionsPlan";
import type {
  ExamBuilderProps,
  ExamBuilderSource,
  ExamBuilderStep,
  ExamScope,
} from "./types";

/** Real client components, in-memory ports only; never reach the bank or DB. */
const blockedFetch = vi.fn<typeof fetch>(() => {
  throw new Error("H2 회귀 시험에서 외부 fetch를 호출할 수 없습니다.");
});
const scrollDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});
beforeEach(() => {
  blockedFetch.mockClear();
  vi.stubGlobal("fetch", blockedFetch);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  try {
    cleanup();
    expect(blockedFetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
afterAll(() => {
  if (scrollDescriptor)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      scrollDescriptor,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const number = (index: number) => String(index).padStart(2, "0");
const chapterA = "1-1 덧셈과 뺄셈";
const chapterB = "1-2 곱셈";
const chapterC = "2-1 분수";
const catalog: ExamScope[] = [
  ...Array.from({ length: 25 }, (_, index) => ({
    id: `a-${number(index + 1)}`,
    label: `A 차시 ${number(index + 1)}`,
    group: "초3",
    detail: chapterA,
    count: 30,
    countUnit: "갈래",
  })),
  ...Array.from({ length: 25 }, (_, index) => ({
    id: `b-${number(index + 1)}`,
    label: `B 차시 ${number(index + 1)}`,
    group: "초3",
    detail: chapterB,
    count: 30,
    countUnit: "갈래",
  })),
  ...Array.from({ length: 25 }, (_, index) => ({
    id: `c-${number(index + 1)}`,
    label: `C 차시 ${number(index + 1)}`,
    group: "초4",
    detail: chapterC,
    count: 30,
    countUnit: "갈래",
  })),
];

type Item = {
  id: string;
  questionId: string;
  scopeId: string;
  text: string;
  format: QuestionFormat;
  questionFormats: QuestionRepresentation[];
};
function question(
  index: number,
  scopeId = "a-01",
  format: QuestionFormat = "short_answer",
): Item {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return {
    id,
    questionId: `row:${id}`,
    scopeId,
    text: `문항 ${number(index)}`,
    format,
    questionFormats: [
      {
        problemId: id,
        format,
        revision: "v1",
        state: "available",
        reasonCode: null,
      },
    ],
  };
}
function source(
  overrides: Partial<ExamBuilderSource<Item>> = {},
): ExamBuilderSource<Item> {
  return {
    requireScopeCounts: true,
    initialScopes: catalog,
    conditions: { ladder: DIFFICULTY_LADDER, recentDays: 14 },
    // Non-empty actual representation metadata exercises the math quota gate.
    questionFormats: {
      options: (item) => item.questionFormats,
      load: vi.fn(async (item) => item),
    },
    loadScopes: vi.fn(async () => catalog),
    list: vi.fn(async () => ({ items: [], total: 0 })),
    compose: vi.fn(async () => []),
    info: (item) => ({
      id: item.id,
      questionId: item.questionId,
      scopeId: item.scopeId,
      scopeLabel:
        catalog.find((scope) => scope.id === item.scopeId)?.label ??
        "저장 차시",
      difficulty: "기본",
      format: QUESTION_FORMAT_LABELS[item.format],
    }),
    prepareOutput: vi.fn(async (items) => items),
    ...overrides,
  };
}
function Harness({
  adapter,
  initial = [],
  initialStep,
  canOutput = true,
  onIntentIssueChange,
}: {
  adapter: ExamBuilderSource<Item>;
  initial?: Item[];
  initialStep?: ExamBuilderStep;
  canOutput?: boolean;
  onIntentIssueChange?: ExamBuilderProps<Item>["onIntentIssueChange"];
}) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("H2 회귀 시험");
  return (
    <>
      <output aria-label="선택 문항 순서">
        {items.map((item) => item.text).join(",")}
      </output>
      <ExamBuilder
        source={adapter}
        questions={items}
        onQuestionsChange={setItems}
        title={title}
        onTitleChange={setTitle}
        initialStep={initialStep}
        canOutput={canOutput}
        onIntentIssueChange={onIntentIssueChange}
        difficulties={DIFFICULTY_LADDER}
        maxQuestions={100}
        renderQuestion={(item) => <p>{item.text}</p>}
        renderOutput={() => (
          <section aria-label="출력 연결">출력 준비 완료</section>
        )}
      />
    </>
  );
}
const scopePicker = () =>
  within(screen.getByRole("region", { name: "범위 고르기" }));
const allocations = () =>
  within(screen.getByRole("region", { name: "출제 구성표" }));
const changeNumber = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
const showReview = () =>
  fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));

/** Placement and the accessible explanation are product contracts, not CSS names. */
function outputAdvice(reason?: RegExp) {
  const order = screen.getByRole("region", { name: "문항 순서표" });
  const advice = screen.getByRole("region", { name: "다음 단계 안내" });
  expect(order.parentElement).toBe(screen.getByRole("complementary"));
  expect(order.nextElementSibling).toBe(advice);
  const explanations = [
    ...within(advice).queryAllByRole("status"),
    ...within(advice).queryAllByRole("alert"),
  ];
  expect(explanations).toHaveLength(1);
  const [explanation] = explanations;
  const next = within(advice).getByRole("button", {
    name: "다음: 양식 구성·출력",
  });
  expect(
    screen.getAllByRole("button", { name: "다음: 양식 구성·출력" }),
  ).toHaveLength(1);
  expect(
    screen.getAllByRole("button", { name: "이전: 범위 설정" }),
  ).toHaveLength(1);
  const describedBy = next.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
  expect(explanation.id).not.toBe("");
  expect(describedBy).toContain(explanation.id);
  expect(document.getElementById(explanation.id)).toBe(explanation);
  if (reason) {
    expect(explanation).toHaveTextContent(reason);
    expect(next).toHaveAccessibleDescription(reason);
    expect(next).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeDisabled();
  }
  return { explanation, next, advice };
}

describe("H2 S2 범위 탐색과 복원", () => {
  it("처음에는 학년만 만들며 숨긴 단원·차시 DOM이나 검색도 만들지 않는다", () => {
    render(
      <ScopeSequencePicker
        scopes={catalog}
        selected={[]}
        onChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    const picker = scopePicker();
    expect(
      picker.getByRole("region", { name: "학년·과정 목록" }),
    ).toBeInTheDocument();
    expect(picker.queryByText(chapterA)).not.toBeInTheDocument();
    expect(picker.queryByText("A 차시 01")).not.toBeInTheDocument();
    expect(
      picker.queryByRole("region", { name: "단원 목록", hidden: true }),
    ).toBeNull();
    expect(
      picker.queryByRole("region", { name: "차시 목록", hidden: true }),
    ).toBeNull();
    expect(picker.queryAllByRole("checkbox", { hidden: true })).toHaveLength(0);
    expect(picker.queryByLabelText("차시 검색")).toBeNull();
  });

  it("상위 선택은 하위 검색·쪽만 초기화하고 다른 학년까지 담은 수·고정·순서를 유지한다", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} />);
    fireEvent.click(await scopePicker().findByRole("button", { name: "초3" }));
    expect(scopePicker().getByRole("heading", { name: "단원" })).toHaveFocus();
    expect(scopePicker().queryByLabelText("차시 검색")).toBeNull();
    expect(scopePicker().queryByRole("button", { name: "초4" })).toBeNull();
    fireEvent.click(scopePicker().getByRole("button", { name: chapterA }));
    expect(scopePicker().getByRole("heading", { name: "차시" })).toHaveFocus();
    fireEvent.click(
      scopePicker().getByRole("checkbox", { name: /^A 차시 01 / }),
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "A 차시 01 구성 수" }),
      "7",
    );

    changeNumber(
      scopePicker().getByRole("searchbox", { name: "차시 검색" }),
      "차시",
    );
    fireEvent.click(scopePicker().getByRole("button", { name: "다음 차시" }));
    expect(
      scopePicker().getByRole("checkbox", { name: /^A 차시 21 / }),
    ).toBeInTheDocument();
    fireEvent.click(scopePicker().getByRole("button", { name: "단원 변경" }));
    expect(scopePicker().getByRole("heading", { name: "단원" })).toHaveFocus();
    expect(scopePicker().queryByLabelText("차시 검색")).toBeNull();
    fireEvent.click(scopePicker().getByRole("button", { name: chapterB }));
    expect(
      scopePicker().getByRole("searchbox", { name: "차시 검색" }),
    ).toHaveValue("");
    expect(
      scopePicker().queryByRole("checkbox", { name: /^B 차시 21 / }),
    ).toBeNull();
    fireEvent.click(
      scopePicker().getByRole("checkbox", { name: /^B 차시 01 / }),
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "B 차시 01 구성 수" }),
      "4",
    );

    changeNumber(
      scopePicker().getByRole("searchbox", { name: "차시 검색" }),
      "차시",
    );
    fireEvent.click(scopePicker().getByRole("button", { name: "다음 차시" }));
    expect(
      scopePicker().getByRole("checkbox", { name: /^B 차시 21 / }),
    ).toBeInTheDocument();
    fireEvent.click(
      scopePicker().getByRole("button", { name: "학년·과정 변경" }),
    );
    expect(
      scopePicker().getByRole("heading", { name: "학년·과정" }),
    ).toHaveFocus();
    fireEvent.click(scopePicker().getByRole("button", { name: "초4" }));
    expect(scopePicker().queryByLabelText("차시 검색")).toBeNull();
    fireEvent.click(scopePicker().getByRole("button", { name: chapterC }));
    expect(
      scopePicker().getByRole("searchbox", { name: "차시 검색" }),
    ).toHaveValue("");
    expect(
      scopePicker().queryByRole("checkbox", { name: /^C 차시 21 / }),
    ).toBeNull();
    fireEvent.click(
      scopePicker().getByRole("checkbox", { name: /^C 차시 01 / }),
    );

    expect(
      allocations()
        .getAllByRole("spinbutton", { name: /구성 수$/ })
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(["7", "4", "5"]);
    expect(
      allocations().getByRole("checkbox", { name: "A 차시 01 고정" }),
    ).toBeChecked();
    expect(
      allocations().getByRole("checkbox", { name: "B 차시 01 고정" }),
    ).toBeChecked();
    fireEvent.click(
      scopePicker().getByRole("button", { name: "학년·과정 변경" }),
    );
    fireEvent.click(scopePicker().getByRole("button", { name: "초3" }));
    fireEvent.click(scopePicker().getByRole("button", { name: chapterA }));
    expect(
      scopePicker().getByRole("checkbox", { name: /^A 차시 01 / }),
    ).toBeChecked();
    await waitFor(() => expect(adapter.loadScopes).toHaveBeenCalledTimes(1));
    expect(adapter.compose).not.toHaveBeenCalled();
    expect(adapter.list).not.toHaveBeenCalled();
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
  });

  it("늦게 도착한 저장 범위의 경로를 복원하되 선택 변경을 통보하거나 이후 탐색을 빼앗지 않는다", () => {
    const onChange = vi.fn();
    const props = { selected: ["c-21"], onChange, onRetry: vi.fn() };
    const view = render(<ScopeSequencePicker {...props} scopes={[]} loading />);
    expect(scopePicker().queryByLabelText("차시 검색")).toBeNull();
    view.rerender(<ScopeSequencePicker {...props} scopes={catalog} />);
    expect(
      scopePicker().getByRole("heading", { name: "차시" }),
    ).toBeInTheDocument();
    expect(scopePicker().getByText("초4")).toBeInTheDocument();
    expect(scopePicker().getByText(chapterC)).toBeInTheDocument();
    fireEvent.click(scopePicker().getByRole("button", { name: "다음 차시" }));
    expect(
      scopePicker().getByRole("checkbox", { name: /^C 차시 21 / }),
    ).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      scopePicker().getByRole("button", { name: "학년·과정 변경" }),
    );
    fireEvent.click(scopePicker().getByRole("button", { name: "초3" }));
    fireEvent.click(scopePicker().getByRole("button", { name: chapterB }));
    view.rerender(
      <ScopeSequencePicker
        {...props}
        scopes={[...catalog]}
        selected={["a-02"]}
      />,
    );
    expect(
      scopePicker().getByRole("checkbox", { name: /^B 차시 01 / }),
    ).toBeInTheDocument();
    expect(scopePicker().getByText(chapterB)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("단원 로더가 끝난 뒤 구 저장 문항의 배분을 한 번 복원하고 재조회 뒤 손수 고친 수를 유지한다", async () => {
    const gate = deferred<ExamScope[]>();
    let labelsReady = false;
    const base = source();
    const adapter = source({
      initialScopes: undefined,
      loadScopes: vi.fn(async () => {
        const rows = await gate.promise;
        labelsReady = true;
        return rows;
      }),
      info: (item) => ({
        ...base.info(item),
        scopeId: labelsReady ? item.scopeId : "",
      }),
    });
    const saved = [question(1), question(2), question(3, "b-01")];
    render(<Harness adapter={adapter} initial={saved} />);
    expect(
      allocations().queryByRole("spinbutton", { name: /구성 수$/ }),
    ).toBeNull();
    await act(async () => gate.resolve(catalog));
    expect(
      await allocations().findByRole("spinbutton", {
        name: "A 차시 01 구성 수",
      }),
    ).toHaveValue(2);
    expect(
      allocations().getByRole("spinbutton", { name: "B 차시 01 구성 수" }),
    ).toHaveValue(1);
    expect(
      scopePicker().getByRole("checkbox", { name: /^B 차시 01 / }),
    ).toBeChecked();
    changeNumber(
      allocations().getByRole("spinbutton", { name: "A 차시 01 구성 수" }),
      "4",
    );
    fireEvent.click(
      allocations().getByRole("checkbox", { name: "최근 14일 출제 빼기" }),
    );
    await waitFor(() => expect(adapter.loadScopes).toHaveBeenCalledTimes(2));
    expect(
      allocations().getByRole("spinbutton", { name: "A 차시 01 구성 수" }),
    ).toHaveValue(4);
    expect(
      allocations().getByRole("checkbox", { name: "A 차시 01 고정" }),
    ).toBeChecked();
    expect(screen.getByLabelText("선택 문항 순서")).toHaveTextContent(
      saved.map((item) => item.text).join(","),
    );
    expect(adapter.compose).not.toHaveBeenCalled();
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
  });

  it("미확인과 빈 재고를 구분하고 확인된 재고가 올 때까지 선택을 열지 않는다", () => {
    const onChange = vi.fn();
    const scopes: ExamScope[] = [
      { id: "empty", label: "빈 차시", group: "초2", detail: "단원", count: 0 },
      { id: "unknown", label: "미확인 차시", group: "초3", detail: "단원" },
    ];
    const view = render(
      <ScopeSequencePicker
        scopes={scopes}
        selected={[]}
        onChange={onChange}
        onRetry={vi.fn()}
      />,
    );
    expect(
      scopePicker().getByRole("button", { name: "초2 · 출제 가능 문항 없음" }),
    ).toBeDisabled();
    expect(
      scopePicker().getByRole("button", {
        name: "초3 · 출제 가능 수 확인 필요",
      }),
    ).toBeDisabled();
    view.rerender(
      <ScopeSequencePicker
        scopes={[scopes[0], { ...scopes[1], count: 2 }]}
        selected={[]}
        onChange={onChange}
        onRetry={vi.fn()}
      />,
    );
    fireEvent.click(scopePicker().getByRole("button", { name: "초3" }));
    fireEvent.click(scopePicker().getByRole("button", { name: "단원" }));
    fireEvent.click(
      scopePicker().getByRole("checkbox", { name: /미확인 차시/ }),
    );
    expect(onChange).toHaveBeenLastCalledWith(["unknown"]);
  });
});

function QuickHarness({
  disabled = false,
}: Partial<Pick<ComponentProps<typeof QuickConditions>, "disabled">>) {
  const [value, onChange] = useState<AppliedConditions>({
    total: null,
    ladder: emptyLadder(DIFFICULTY_LADDER),
    formats: emptyFormats(),
    recent: true,
    mcFirst: true,
  });
  return (
    <QuickConditions
      value={value}
      onChange={onChange}
      total={30}
      ladder={DIFFICULTY_LADDER}
      recentDays={14}
      disabled={disabled}
    />
  );
}
describe("H2 빠른 구성 조건", () => {
  it("여섯 난이도 단계와 직접 입력을 제공하고 지정 없음과 0을 구별한다", () => {
    render(<QuickHarness />);
    expect(screen.getByRole("spinbutton", { name: "총 문항 수" })).toHaveValue(
      null,
    );
    expect(screen.queryByRole("spinbutton", { name: "연산" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /직접 · 난이도별 수 펼치기/ }),
    );
    for (let index = 1; index <= 6; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: `${index}단계` }));
      expect(
        screen.getByRole("button", { name: `${index}단계` }),
      ).toHaveAttribute("aria-pressed", "true");
      const counts = DIFFICULTY_LADDER.map((tier) =>
        Number(
          (screen.getByRole("spinbutton", { name: tier }) as HTMLInputElement)
            .value,
        ),
      );
      expect(counts.reduce((sum, count) => sum + count, 0)).toBe(30);
    }
    changeNumber(screen.getByRole("spinbutton", { name: "연산" }), "1");
    expect(
      screen.getByRole("group", { name: /난이도 직접/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText(/^형식별 수/, { selector: "summary" }));
    const mc = screen.getByRole("spinbutton", { name: "객관식" });
    expect(mc).toHaveValue(null);
    changeNumber(mc, "0");
    expect(mc).toHaveValue(0);
    changeNumber(mc, "");
    expect(mc).toHaveValue(null);
    expect(
      screen.getByRole("checkbox", { name: "최근 14일 출제 빼기" }),
    ).toBeChecked();
  });

  it("작업 중에는 총수·난이도 단계·최근 제외 입력을 비활성화한다", () => {
    render(<QuickHarness disabled />);
    expect(
      screen.getByRole("spinbutton", { name: "총 문항 수" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "최근 14일 출제 빼기" }),
    ).toBeDisabled();
    for (let index = 1; index <= 6; index += 1)
      expect(
        screen.getByRole("button", { name: `${index}단계` }),
      ).toBeDisabled();
  });
});

describe("H2 순서표 바로 다음의 출력 차단 안내", () => {
  it("실제 출력 확인 중 이유와 버튼 설명을 연결하고 완료 전 출력기를 열지 않는다", async () => {
    const gate = deferred<Item[]>();
    const saved = [question(1), question(2)];
    const adapter = source({ prepareOutput: vi.fn(() => gate.promise) });
    render(<Harness adapter={adapter} initial={saved} initialStep="review" />);
    const { next } = outputAdvice();
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(
      outputAdvice(/출력할 문항을 확인하는 중/).explanation,
    ).toHaveAttribute("role", "status");
    fireEvent.click(next);
    expect(adapter.prepareOutput).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "출력 연결" })).toBeNull();
    await act(async () => gate.resolve(saved));
    expect(
      await screen.findByRole("region", { name: "출력 연결" }),
    ).toBeInTheDocument();
  });

  it("마지막 문항을 빼면 0문항 이유가 같은 자리에 남고 출력 호출을 막는다", () => {
    const adapter = source();
    render(
      <Harness
        adapter={adapter}
        initial={[question(1)]}
        initialStep="review"
      />,
    );
    fireEvent.click(
      within(screen.getByRole("region", { name: "문항 검토" })).getByRole(
        "button",
        { name: "삭제" },
      ),
    );
    const { next, explanation } = outputAdvice(/담은 문항이 없습니다/);
    expect(explanation).toHaveAttribute("role", "status");
    fireEvent.click(next);
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "출력 연결" })).toBeNull();
  });

  it("출력 권한이 없으면 권한 이유와 요청할 행동을 설명하고 출력 검증도 호출하지 않는다", () => {
    const adapter = source();
    render(
      <Harness
        adapter={adapter}
        initial={[question(1)]}
        initialStep="review"
        canOutput={false}
      />,
    );
    const { next, explanation } =
      outputAdvice(/양식 구성·출력 권한이 없습니다/);
    expect(explanation).toHaveAttribute("role", "status");
    expect(explanation).toHaveTextContent("원장님에게 출력 권한을 요청");
    fireEvent.click(next);
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
  });

  it("실제 표현을 가진 문항의 총수가 지정과 다르면 막고 조건을 고치면 원문 그대로 출력한다", async () => {
    const saved = [question(1), question(2)];
    const adapter = source();
    const onIntentIssueChange = vi.fn();
    render(
      <Harness
        adapter={adapter}
        initial={saved}
        onIntentIssueChange={onIntentIssueChange}
      />,
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "총 문항 수" }),
      "4",
    );
    showReview();
    const { next, explanation } = outputAdvice(/총 4문항 지정 · 현재 2문항/);
    expect(explanation).toHaveAttribute("role", "alert");
    fireEvent.click(next);
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
    expect(onIntentIssueChange).toHaveBeenLastCalledWith(
      expect.stringContaining("총 4문항 지정 · 현재 2문항"),
    );
    fireEvent.click(screen.getByRole("button", { name: "이전: 범위 설정" }));
    changeNumber(
      allocations().getByRole("spinbutton", { name: "총 문항 수" }),
      "2",
    );
    showReview();
    expect(onIntentIssueChange).toHaveBeenLastCalledWith(null);
    expect(outputAdvice().next).toBeEnabled();
    fireEvent.click(outputAdvice().next);
    await screen.findByRole("region", { name: "출력 연결" });
    expect(adapter.prepareOutput).toHaveBeenCalledWith(
      saved,
      expect.any(AbortSignal),
    );
    expect(adapter.compose).not.toHaveBeenCalled();
  });

  it("부분 구성은 검토할 수 있지만 총수를 비웠어도 요청한 행의 합보다 적으면 출력을 막는다", async () => {
    const partial = [question(1), question(2), question(3)];
    const adapter = source({
      compose: vi.fn(async () => ({
        items: partial,
        notes: ["요청한 범위에서 3문항만 찾았습니다."],
      })),
    });
    render(<Harness adapter={adapter} />);
    fireEvent.click(await scopePicker().findByRole("button", { name: "초3" }));
    fireEvent.click(scopePicker().getByRole("button", { name: chapterA }));
    fireEvent.click(
      scopePicker().getByRole("checkbox", { name: /^A 차시 01 / }),
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "A 차시 01 구성 수" }),
      "5",
    );
    expect(
      allocations().getByRole("spinbutton", { name: "총 문항 수" }),
    ).toHaveValue(null);
    fireEvent.click(screen.getByRole("button", { name: "문항 검토 →" }));
    await screen.findByRole("region", { name: "다음 단계 안내" });
    const { next, explanation } = outputAdvice(/총 5문항 지정 · 현재 3문항/);
    expect(explanation).toHaveAttribute("role", "alert");
    expect(adapter.compose).toHaveBeenCalledWith(
      [{ scopeId: "a-01", count: 5 }],
      expect.any(AbortSignal),
      expect.objectContaining({ excludeRecent: true }),
    );
    expect(
      within(screen.getByRole("region", { name: "문항 검토" })).getAllByRole(
        "article",
      ),
    ).toHaveLength(3);
    fireEvent.click(next);
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "출력 연결" })).toBeNull();
  });

  it("총수가 같아도 형식별 지정 0을 포함한 불일치를 막고 null로 비우면 풀린다", () => {
    const saved = [question(1, "a-01", "multiple_choice"), question(2)];
    const adapter = source();
    const onIntentIssueChange = vi.fn();
    render(
      <Harness
        adapter={adapter}
        initial={saved}
        onIntentIssueChange={onIntentIssueChange}
      />,
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "총 문항 수" }),
      "2",
    );
    fireEvent.click(
      allocations().getByText(/^형식별 수/, { selector: "summary" }),
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "객관식" }),
      "0",
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "단답형" }),
      "2",
    );
    changeNumber(
      allocations().getByRole("spinbutton", { name: "서술형" }),
      "0",
    );
    showReview();
    const { explanation, next } =
      outputAdvice(/객관식 0문항 지정 · 현재 1문항/);
    expect(explanation).toHaveAttribute("role", "alert");
    expect(explanation).toHaveTextContent("단답형 2문항 지정 · 현재 1문항");
    expect(explanation).not.toHaveTextContent(/총 2문항 지정/);
    expect(onIntentIssueChange).toHaveBeenLastCalledWith(
      expect.stringContaining("객관식 0문항 지정 · 현재 1문항"),
    );
    fireEvent.click(next);
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이전: 범위 설정" }));
    fireEvent.click(
      allocations().getByText(/^형식별 수/, { selector: "summary" }),
    );
    expect(
      allocations().getByRole("spinbutton", { name: "객관식" }),
    ).toHaveValue(0);
    changeNumber(allocations().getByRole("spinbutton", { name: "객관식" }), "");
    changeNumber(allocations().getByRole("spinbutton", { name: "단답형" }), "");
    showReview();
    expect(outputAdvice().next).toBeEnabled();
    expect(onIntentIssueChange).toHaveBeenLastCalledWith(null);
    expect(adapter.compose).not.toHaveBeenCalled();
  });
});

describe("H2 둘째 쪽의 전역 문항 번호와 순서", () => {
  const saved = Array.from({ length: 8 }, (_, index) =>
    question(index + 1, `a-${number(index + 1)}`),
  );
  function secondPage() {
    const order = screen.getByRole("region", { name: "문항 순서표" });
    fireEvent.click(
      within(
        within(order).getByRole("navigation", { name: "순서표 쪽 이동" }),
      ).getByRole("button", { name: "다음" }),
    );
    expect(
      within(order).getByRole("button", { name: /^7번 문항 본문으로 이동/ }),
    ).toHaveTextContent("07");
    expect(
      within(order).queryByRole("button", { name: /^1번 문항 본문으로 이동/ }),
    ).toBeNull();
    return order;
  }
  function assertPage(
    order: HTMLElement,
    firstScope: string,
    firstText: string,
    secondScope: string,
    secondText: string,
  ) {
    const rows = within(order).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(firstScope);
    expect(rows[1]).toHaveTextContent(secondScope);
    const articles = within(
      screen.getByRole("region", { name: "문항 검토" }),
    ).getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent(firstText);
    expect(articles[1]).toHaveTextContent(secondText);
    expect(
      within(articles[0]).getByRole("button", { name: "7번 문항 위치 이동" }),
    ).toBeInTheDocument();
    expect(
      within(articles[1]).getByRole("button", { name: "8번 문항 위치 이동" }),
    ).toBeInTheDocument();
  }

  it.each([
    { key: "ArrowDown", texts: [1, 2, 3, 4, 5, 6, 8, 7], visible: [8, 7] },
    { key: "ArrowUp", texts: [1, 2, 3, 4, 5, 7, 6, 8], visible: [6, 8] },
  ])(
    "순서표 7번의 Alt+$key는 전체 배열의 그 자리만 옮기고 되돌릴 수 있다",
    ({ key, texts, visible }) => {
      render(
        <Harness adapter={source()} initial={saved} initialStep="review" />,
      );
      const order = secondPage();
      assertPage(order, "A 차시 07", "문항 07", "A 차시 08", "문항 08");
      fireEvent.keyDown(
        within(order).getByRole("button", { name: /^7번 문항 본문으로 이동/ }),
        { key, altKey: true },
      );
      expect(screen.getByLabelText("선택 문항 순서").textContent).toBe(
        texts.map((n) => `문항 ${number(n)}`).join(","),
      );
      assertPage(
        order,
        `A 차시 ${number(visible[0])}`,
        `문항 ${number(visible[0])}`,
        `A 차시 ${number(visible[1])}`,
        `문항 ${number(visible[1])}`,
      );
      fireEvent.click(screen.getByRole("button", { name: "↶ 되돌리기" }));
      expect(screen.getByLabelText("선택 문항 순서").textContent).toBe(
        saved.map((item) => item.text).join(","),
      );
      assertPage(order, "A 차시 07", "문항 07", "A 차시 08", "문항 08");
    },
  );

  it("본문 7번의 Space·방향키·Enter 이동도 전역 번호를 쓰고 Escape는 취소한다", () => {
    render(<Harness adapter={source()} initial={saved} initialStep="review" />);
    const order = secondPage();
    const handle = screen.getByRole("button", { name: "7번 문항 위치 이동" });
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(screen.getByText("여기로 문제 이동")).toBeInTheDocument();
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(screen.getByLabelText("선택 문항 순서").textContent).toBe(
      saved.map((item) => item.text).join(","),
    );
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(screen.getByLabelText("선택 문항 순서").textContent).toBe(
      [1, 2, 3, 4, 5, 6, 8, 7].map((n) => `문항 ${number(n)}`).join(","),
    );
    assertPage(order, "A 차시 08", "문항 08", "A 차시 07", "문항 07");
  });
});
