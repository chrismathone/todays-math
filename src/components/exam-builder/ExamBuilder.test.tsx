import "@testing-library/jest-dom/vitest";
import { StrictMode, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import ExamBuilder from "./ExamBuilder";
import ScopePicker from "./ScopePicker";
import type { ExamBuilderSource, ExamBuilderStep } from "./types";

type Item = {
  id: string;
  scope: string;
  difficulty: string;
  family?: string;
};
const questions: Item[] = [
  { id: "a", scope: "u1", difficulty: "기본" },
  { id: "b", scope: "u1", difficulty: "심화" },
  { id: "c", scope: "u2", difficulty: "기본" },
];
const scopes = Array.from({ length: 35 }, (_, i) => ({
  id: `u${i + 1}`,
  label: `범위 ${i + 1}`,
  group: i < 20 ? "중1" : "중2",
}));
function source(
  overrides: Partial<ExamBuilderSource<Item>> = {},
): ExamBuilderSource<Item> {
  return {
    loadScopes: vi.fn().mockResolvedValue(scopes),
    list: vi.fn().mockResolvedValue({
      items: [{ id: "d", scope: "u1", difficulty: "심화" }],
      total: 1,
    }),
    compose: vi.fn().mockResolvedValue(questions),
    info: (item) => ({
      id: item.id,
      scopeId: item.scope,
      scopeLabel: `범위 ${item.scope.slice(1)}`,
      difficulty: item.difficulty,
      ...(item.family ? { familyId: item.family } : {}),
    }),
    prepareOutput: vi.fn(async (items) => items),
    ...overrides,
  };
}
function Harness({
  adapter,
  initial = [],
  initialStep,
  onStepChange,
  canOutput = true,
  renderAnswer,
}: {
  adapter: ExamBuilderSource<Item>;
  initial?: Item[];
  initialStep?: ExamBuilderStep;
  onStepChange?: (step: ExamBuilderStep) => void;
  canOutput?: boolean;
  renderAnswer?: (item: Item) => React.ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("단원 평가");
  return (
    <>
      <output aria-label="문항 순서">
        {items.map((item) => item.id).join(",")}
      </output>
      <ExamBuilder
        source={adapter}
        initialStep={initialStep}
        onStepChange={onStepChange}
        canOutput={canOutput}
        questions={items}
        onQuestionsChange={setItems}
        title={title}
        onTitleChange={setTitle}
        difficulties={["기본", "심화"]}
        maxQuestions={80}
        renderQuestion={(item) => <p>문항 내용 {item.id}</p>}
        renderAnswer={renderAnswer}
        renderOutput={({
          questions: current,
          title: heading,
          onTitleChange,
          onQuestionsChange,
          onStep,
        }) => (
          <section aria-label="실제 출력 연결">
            <input
              aria-label="출력 제목"
              value={heading}
              onChange={(e) => onTitleChange(e.target.value)}
            />
            <button onClick={() => onQuestionsChange([...current].reverse())}>
              출력 순서 변경
            </button>
            <button onClick={() => onStep("scope")}>범위로 돌아가기</button>
            <button onClick={() => onStep("review")}>검토로 돌아가기</button>
          </section>
        )}
      />
    </>
  );
}
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);
describe("shared exam builder workflow", () => {
  it("disables empty and unconfirmed math grades without calling unknown inventory empty", () => {
    render(
      <ScopePicker
        scopes={[
          { id: "empty", label: "빈 차시", group: "초2", count: 0 },
          { id: "unknown", label: "미확인 차시", group: "초3" },
          { id: "mixed-empty", label: "빈 차시", group: "초4", count: 0 },
          { id: "mixed-unknown", label: "미확인 차시", group: "초4" },
          { id: "ready", label: "준비된 차시", group: "초5", count: 2 },
          { id: "ready-unknown", label: "미확인 차시", group: "초5" },
        ]}
        selected={[]}
        requireCounts
        onClose={() => {}}
        onApply={() => {}}
      />,
    );
    const grades = within(screen.getByLabelText("학년·과정"));
    expect(
      grades.getByRole("option", { name: "초2 · 출제 가능 문항 없음" }),
    ).toBeDisabled();
    expect(
      grades.getByRole("option", { name: "초3 · 출제 가능 수 확인 필요" }),
    ).toBeDisabled();
    expect(
      grades.getByRole("option", { name: "초4 · 출제 가능 수 확인 필요" }),
    ).toBeDisabled();
    expect(grades.getByRole("option", { name: "초5" })).toBeEnabled();
    expect(grades.getByRole("option", { name: "전체" })).toBeEnabled();
  });
  it("distinguishes repeated unit names by grade, semester and course without changing search or selections", () => {
    const onApply = vi.fn();
    render(
      <ScopePicker
        scopes={[
          {
            id: "a",
            label: "수와 연산 A",
            group: "초2",
            detail: "1-1 수와 연산",
            count: 4,
          },
          {
            id: "b",
            label: "수와 연산 B",
            group: "초3",
            detail: "1-1 수와 연산",
            count: 4,
          },
          {
            id: "d",
            label: "수와 연산 D",
            group: "초2",
            detail: "2-1 수와 연산",
            count: 4,
          },
          {
            id: "c",
            label: "수와 연산 C",
            group: "공통수학1",
            detail: "1. 수와 연산",
            count: 4,
          },
        ]}
        selected={["a"]}
        onClose={() => {}}
        onApply={onApply}
      />,
    );
    const units = screen.getByLabelText("단원·자료 묶음");
    expect(within(units).getAllByRole("group")).toHaveLength(3);
    expect(
      within(units).getByRole("option", { name: "초2 · 2-1 수와 연산" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("범위 검색"), {
      target: { value: "수와 연산" },
    });
    const option = within(units).getByRole("option", {
      name: "초3 · 1-1 수와 연산",
    }) as HTMLOptionElement;
    fireEvent.change(units, { target: { value: option.value } });
    expect(
      screen.queryByRole("checkbox", { name: /수와 연산 A/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /수와 연산 C/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /수와 연산 D/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /수와 연산 B/ }));
    expect(screen.getByLabelText("학년·과정")).toHaveValue("");
    expect(screen.getByLabelText("범위 검색")).toHaveValue("수와 연산");
    fireEvent.click(screen.getByRole("button", { name: "2개 범위 적용" }));
    expect(onApply).toHaveBeenCalledWith(["a", "b"]);
  });
  it("keeps uncounted non-math groups usable and resets the selected-only review when emptied", () => {
    render(
      <ScopePicker
        scopes={scopes.slice(0, 2)}
        selected={[]}
        onClose={() => {}}
        onApply={() => {}}
      />,
    );
    expect(screen.getByRole("option", { name: "중1" })).toBeEnabled();
    const review = screen.getByRole("checkbox", { name: "담은 범위만 보기" });
    expect(review).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "범위 1 중1" }));
    fireEvent.click(review);
    expect(
      screen.queryByRole("checkbox", { name: "범위 2 중1" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "범위 1 중1" }));
    expect(review).toBeDisabled();
    expect(review).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "범위 2 중1" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "현재 결과 전체 선택" }),
    );
    fireEvent.click(review);
    fireEvent.click(screen.getByRole("button", { name: "선택 비우기" }));
    expect(review).toBeDisabled();
    expect(review).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "범위 2 중1" }),
    ).toBeInTheDocument();
  });
  it("composes from the table footer and removes a scope immediately without discarding questions or undo history", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} initial={questions} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "문항 구성 →" })).toBeEnabled(),
    );
    const table = within(screen.getByRole("region", { name: "출제 구성표" }));
    expect(
      table.getByRole("button", { name: "문항 구성 →" }).closest("footer"),
    ).toHaveTextContent("합계 3문항");
    expect(screen.getAllByRole("button", { name: "문항 구성 →" })).toHaveLength(
      1,
    );
    fireEvent.change(
      table.getByRole("spinbutton", { name: "범위 2 구성 수" }),
      { target: { value: "7" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "1번 문항 아래로" }));
    fireEvent.click(table.getByRole("button", { name: "범위 1 범위 제거" }));
    expect(
      table.queryByRole("spinbutton", { name: "범위 1 구성 수" }),
    ).not.toBeInTheDocument();
    expect(
      table.getByRole("spinbutton", { name: "범위 2 구성 수" }),
    ).toHaveValue(7);
    expect(table.getByText("합계 7문항")).toBeInTheDocument();
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("b,a,c");
    fireEvent.click(screen.getByRole("button", { name: "↶ 되돌리기" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    expect(adapter.compose).not.toHaveBeenCalled();
    fireEvent.click(table.getByRole("button", { name: "범위 2 범위 제거" }));
    expect(table.getByRole("button", { name: "문항 구성 →" })).toBeDisabled();
    expect(table.getByText("합계 0문항")).toBeInTheDocument();
  });
  it("preserves allocated counts when reviewing or adding scopes", async () => {
    render(<Harness adapter={source()} initial={questions} />);
    await screen.findByRole("spinbutton", { name: "범위 1 구성 수" });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "범위 1 구성 수" }),
      { target: { value: "60" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "범위 변경" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "담은 범위만 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "2개 범위 적용" }));
    expect(
      screen.getByRole("spinbutton", { name: "범위 1 구성 수" }),
    ).toHaveValue(60);
    fireEvent.click(screen.getByRole("button", { name: "범위 변경" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "범위 3 중1" }));
    fireEvent.click(screen.getByRole("button", { name: "3개 범위 적용" }));
    expect(
      screen.getByRole("spinbutton", { name: "범위 1 구성 수" }),
    ).toHaveValue(60);
    expect(
      screen.getByRole("spinbutton", { name: "범위 2 구성 수" }),
    ).toHaveValue(1);
    expect(
      screen.getByRole("spinbutton", { name: "범위 3 구성 수" }),
    ).toHaveValue(5);
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
  });
  it("has one global add action and explicitly scoped add actions", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} initial={questions} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "+ 문항 추가" })).toBeEnabled(),
    );
    expect(screen.getAllByRole("button", { name: "+ 문항 추가" })).toHaveLength(
      1,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "범위 2 범위에 문항 추가" }),
    );
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ scopeIds: ["u2"] }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "+ 문항 추가" }));
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ scopeIds: ["u1", "u2"] }),
        expect.any(AbortSignal),
      ),
    );
  });
  it("does not report a stage or prepare output on blank mount", async () => {
    const onStepChange = vi.fn();
    const adapter = source();
    render(
      <StrictMode>
        <Harness
          adapter={adapter}
          initialStep="output"
          onStepChange={onStepChange}
        />
      </StrictMode>,
    );
    await screen.findByRole("button", { name: "문항 구성 →" });
    expect(onStepChange).not.toHaveBeenCalled();
    expect(adapter.prepareOutput).not.toHaveBeenCalled();
  });
  it("restores review and reports subsequent scope/review/output transitions", async () => {
    const onStepChange = vi.fn();
    render(
      <Harness
        adapter={source()}
        initial={questions}
        initialStep="review"
        onStepChange={onStepChange}
      />,
    );
    expect(screen.getByRole("button", { name: "2 문항 검토" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(onStepChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    expect(onStepChange).toHaveBeenLastCalledWith("scope");
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(onStepChange).toHaveBeenLastCalledWith("review");
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    await screen.findByRole("region", { name: "실제 출력 연결" });
    expect(onStepChange).toHaveBeenLastCalledWith("output");
  });
  it("validates explicitly resumed output before rendering it, including StrictMode", async () => {
    let finish!: (items: Item[]) => void;
    const adapter = source({
      prepareOutput: vi.fn(
        () =>
          new Promise<Item[]>((resolve) => {
            finish = resolve;
          }),
      ),
    });
    render(
      <StrictMode>
        <Harness adapter={adapter} initial={questions} initialStep="output" />
      </StrictMode>,
    );
    expect(
      screen.queryByRole("region", { name: "실제 출력 연결" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "출력 문항 확인" })).getByRole(
        "status",
      ),
    ).toHaveTextContent("확인하는 중");
    finish(questions);
    await screen.findByRole("region", { name: "실제 출력 연결" });
    expect(adapter.prepareOutput).toHaveBeenCalled();
  });
  it("keeps resumed output closed on validation failure or missing output permission", async () => {
    const onStepChange = vi.fn();
    const adapter = source({
      prepareOutput: vi
        .fn()
        .mockRejectedValue(new Error("원본이 변경되었습니다.")),
    });
    const view = render(
      <Harness
        adapter={adapter}
        initial={questions}
        initialStep="output"
        onStepChange={onStepChange}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "원본이 변경되었습니다.",
    );
    expect(onStepChange).toHaveBeenCalledWith("review");
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    view.unmount();
    const denied = source();
    render(
      <Harness
        adapter={denied}
        initial={questions}
        initialStep="output"
        canOutput={false}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "실제 출력 연결" }),
    ).not.toBeInTheDocument();
    expect(denied.prepareOutput).not.toHaveBeenCalled();
  });
  it("does not select unknown math inventory through select-all or an individual row", async () => {
    const adapter = source({
      requireScopeCounts: true,
      loadScopes: vi
        .fn()
        .mockResolvedValue([
          { ...scopes[0], count: 0 },
          scopes[1],
          { ...scopes[2], count: 3 },
        ]),
    });
    render(<Harness adapter={adapter} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "범위 선택" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "범위 선택" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("checkbox", { name: /범위 2/ })).toBeDisabled();
    expect(dialog.getByText("출제 가능 수 확인 필요")).toBeInTheDocument();
    fireEvent.click(
      dialog.getByRole("checkbox", { name: "현재 결과 전체 선택" }),
    );
    fireEvent.click(dialog.getByRole("button", { name: "1개 범위 적용" }));
    fireEvent.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(adapter.compose).toHaveBeenCalledWith(
        [{ scopeId: "u3", count: 3 }],
        expect.any(AbortSignal),
      ),
    );
  });
  it("removes a restored empty scope without discarding saved questions", async () => {
    const adapter = source({
      requireScopeCounts: true,
      loadScopes: vi.fn().mockResolvedValue([{ ...scopes[0], count: 0 }]),
    });
    render(<Harness adapter={adapter} initial={[questions[0]]} />);
    await screen.findByText(/없는 1개 범위를 구성에서 제외/);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "문항 구성 →" })).toBeDisabled();
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a");
    expect(adapter.compose).not.toHaveBeenCalled();
  });
  it("marks empty curriculum scopes unavailable and caps requests to actual bank counts", async () => {
    const available = [
      { ...scopes[0], count: 0 },
      { ...scopes[1], count: 2 },
    ];
    const adapter = source({
      loadScopes: vi.fn().mockResolvedValue(available),
    });
    render(<Harness adapter={adapter} />);
    await screen.findByRole("button", { name: "범위 선택" });
    fireEvent.click(screen.getByRole("button", { name: "범위 선택" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("checkbox", { name: /범위 1/ }),
    ).toBeDisabled();
    expect(within(dialog).getByText("출제 가능 문항 없음")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /범위 2/ }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "1개 범위 적용" }),
    );
    expect(
      screen.getByRole("spinbutton", { name: "범위 2 구성 수" }),
    ).toHaveValue(2);
    expect(screen.getByText(/출제 가능 2문항/)).toBeInTheDocument();
  });
  it("keeps a long scope catalog paged, cancels safely and composes only selected scopes", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} />);
    expect(screen.getByRole("button", { name: "1 범위 설정" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("button", { name: "2 문항 검토" })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "범위 선택" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "범위 선택" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(22);
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: "범위 1 중1" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.getByRole("button", { name: "문항 구성 →" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "범위 선택" }));
    fireEvent.change(screen.getByLabelText("범위 검색"), {
      target: { value: "범위 35" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "범위 35 중2" }));
    fireEvent.click(screen.getByRole("button", { name: "1개 범위 적용" }));
    fireEvent.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "2 문항 검토" }),
      ).toHaveAttribute("aria-current", "step"),
    );
    expect(adapter.compose).toHaveBeenCalledWith(
      [{ scopeId: "u35", count: 5 }],
      expect.any(AbortSignal),
    );
    expect(screen.getByText(/요청한 5문항 중 3문항/)).toBeInTheDocument();
  });
  it("starts at scope with restored questions and keeps them when continuing review", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} initial={questions} />);
    expect(screen.getByRole("button", { name: "1 범위 설정" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      screen.getByRole("button", { name: "2 문항 검토" }),
    ).not.toHaveAttribute("aria-current");
    await screen.findByRole("button", { name: "범위 변경" });
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    expect(adapter.compose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(screen.getByRole("button", { name: "2 문항 검토" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
  });
  it("shows provided scopes before the asynchronous refresh settles", () => {
    const pendingRefresh = () => new Promise<never>(() => {});
    const baseline = source({ loadScopes: vi.fn(pendingRefresh) });
    const before = render(<Harness adapter={baseline} initial={questions} />);
    expect(
      screen.getByText("출제 범위를 불러오는 중입니다…"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "범위 변경" })).toBeDisabled();
    before.unmount();

    const adapter = source({
      initialScopes: scopes,
      loadScopes: vi.fn(pendingRefresh),
    });
    render(<Harness adapter={adapter} initial={questions} />);

    expect(
      screen.queryByText("출제 범위를 불러오는 중입니다…"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "범위 변경" })).toBeEnabled();
    expect(screen.getAllByText("범위 1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "범위 변경" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("moves, deletes, undoes and keeps edits across output and scope navigation", async () => {
    render(<Harness adapter={source()} initial={questions} />);
    await screen.findByRole("button", { name: "범위 변경" });
    fireEvent.click(screen.getByRole("button", { name: "1번 문항 아래로" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("b,a,c");
    fireEvent.click(screen.getByRole("button", { name: "↶ 되돌리기" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    await screen.findByRole("region", { name: "실제 출력 연결" });
    fireEvent.change(screen.getByLabelText("출력 제목"), {
      target: { value: "바뀐 제목" },
    });
    fireEvent.click(screen.getByRole("button", { name: "출력 순서 변경" }));
    fireEvent.click(screen.getByRole("button", { name: "범위로 돌아가기" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("c,a");
    expect(screen.getByLabelText("제목")).toHaveValue("바뀐 제목");
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("c,a");
  });
  it("adds matching difficulty candidates once and replaces in the original position", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} initial={questions} />);
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "+ 문항 추가" })[0],
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "+ 문항 추가" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "심화" }));
    fireEvent.change(screen.getByLabelText("문항 검색"), {
      target: { value: "문제 내용" },
    });
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: "심화",
          query: "문제 내용",
          scopeIds: ["u1", "u2"],
          excludeIds: ["a", "b", "c"],
        }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "문항 추가" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c,d");
    expect(screen.getByRole("button", { name: "추가됨" })).toBeDisabled();
    expect(screen.getByLabelText("문항 검색")).toHaveValue("문제 내용");
    expect(screen.getByRole("button", { name: "심화" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[3]);
    fireEvent.click(screen.getAllByRole("button", { name: "교체" })[1]);
    fireEvent.click(
      await screen.findByRole("button", { name: "이 문항으로 교체" }),
    );
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,d,c");
  });
  it("blocks output on source revision errors without losing the draft", async () => {
    render(
      <Harness
        adapter={source({
          prepareOutput: vi
            .fn()
            .mockRejectedValue(new Error("원본이 변경되었습니다.")),
        })}
        initial={questions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "원본이 변경되었습니다.",
    );
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    expect(
      screen.queryByRole("region", { name: "실제 출력 연결" }),
    ).not.toBeInTheDocument();
  });
  it("supports keyboard dragging, cancellation and undo", async () => {
    render(<Harness adapter={source()} initial={questions} />);
    const handle = screen.getByRole("button", { name: "1번 문항 위치 이동" });
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(screen.getByText("여기로 문제 이동")).toBeInTheDocument();
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("b,c,a");
    fireEvent.click(screen.getByRole("button", { name: "↶ 되돌리기" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
  });
  it("keeps one problem family per sheet when adding (D-111)", async () => {
    const sheet: Item[] = [
      { id: "a", scope: "u1", difficulty: "기본", family: "u1 A" },
      { id: "b", scope: "u1", difficulty: "기본", family: "u1 B" },
    ];
    const adapter = source({
      loadScopes: vi
        .fn()
        .mockResolvedValue([{ ...scopes[0], count: 4, countUnit: "갈래" }]),
      list: vi.fn().mockResolvedValue({
        items: [
          { id: "a2", scope: "u1", difficulty: "기본", family: "u1 A" },
          { id: "c1", scope: "u1", difficulty: "기본", family: "u1 C" },
          { id: "c2", scope: "u1", difficulty: "기본", family: "u1 C" },
        ],
        total: 3,
      }),
    });
    render(<Harness adapter={adapter} initial={sheet} />);
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "+ 문항 추가" })[0],
      ).toBeEnabled(),
    );
    expect(screen.getByText(/출제 가능 4갈래/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "+ 문항 추가" })[0]);
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          excludeIds: ["a", "b"],
          excludeFamiliesOf: ["a", "b"],
        }),
        expect.any(AbortSignal),
      ),
    );
    const dialog = await screen.findByRole("dialog");
    const buttons = await within(dialog).findAllByRole("button", {
      name: /문항 추가|같은 문항류 있음/,
    });
    // a2 is a sibling of a — shown but not addable
    expect(buttons[0]).toHaveTextContent("같은 문항류 있음");
    expect(buttons[0]).toBeDisabled();
    fireEvent.click(buttons[1]);
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c1");
    // c2 became a sibling of what was just added
    expect(
      within(dialog).getAllByRole("button", { name: "같은 문항류 있음" }),
    ).toHaveLength(2);
  });
  it("lets a replacement come from the replaced slot's own family but not another slot's (D-111 ⑷)", async () => {
    const sheet: Item[] = [
      { id: "a", scope: "u1", difficulty: "기본", family: "u1 A" },
      { id: "b", scope: "u1", difficulty: "기본", family: "u1 B" },
    ];
    const adapter = source({
      loadScopes: vi.fn().mockResolvedValue([{ ...scopes[0], count: 4 }]),
      list: vi.fn().mockResolvedValue({
        items: [
          { id: "b2", scope: "u1", difficulty: "기본", family: "u1 B" },
          { id: "a2", scope: "u1", difficulty: "기본", family: "u1 A" },
        ],
        total: 2,
      }),
    });
    render(<Harness adapter={adapter} initial={sheet} />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "교체" })[0]).toBeEnabled(),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "교체" })[0]);
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          excludeIds: ["a", "b"],
          excludeFamiliesOf: ["b"],
        }),
        expect.any(AbortSignal),
      ),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("button", { name: "같은 문항류 있음" }),
    ).toBeDisabled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "이 문항으로 교체" }),
    );
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a2,b");
  });
  it("shows the source's composition counts by the review heading and answers beside each question", async () => {
    const summarize = vi.fn(
      (items: Item[]) => `단원 1개 · ${items.length}문항 요약`,
    );
    render(
      <Harness
        adapter={source({ summarize })}
        initial={questions}
        initialStep="review"
        renderAnswer={(item) => <p>정답 {item.id}</p>}
      />,
    );
    const review = screen.getByRole("region", { name: "문항 검토" });
    expect(
      within(review).getByText("단원 1개 · 3문항 요약"),
    ).toBeInTheDocument();
    expect(summarize).toHaveBeenLastCalledWith(questions);
    const cards = review.querySelectorAll("[data-exam-question]");
    expect(cards).toHaveLength(3);
    expect(
      within(cards[0] as HTMLElement).getByText("정답 a"),
    ).toBeInTheDocument();
  });
  it("adds no summary or answer column for a source without them (English path)", () => {
    render(
      <Harness adapter={source()} initial={questions} initialStep="review" />,
    );
    const review = screen.getByRole("region", { name: "문항 검토" });
    expect(review.querySelector("[data-exam-summary]")).toBeNull();
    expect(review.querySelector("[data-exam-answer]")).toBeNull();
  });
});

describe("구성 조건 (W4 · Hi-fi 2)", () => {
  // 최근 출제를 빼면 범위 1 은 3갈래 · 범위 2 는 10갈래, 넣으면 6 · 12.
  const counted = (recent?: boolean) => [
    { ...scopes[0], count: recent ? 3 : 6, countUnit: "갈래" },
    { ...scopes[1], count: recent ? 10 : 12, countUnit: "갈래" },
  ];
  const conditioned = (overrides: Partial<ExamBuilderSource<Item>> = {}) =>
    source({
      conditions: { ladder: ["기본", "심화"], recentDays: 14 },
      loadScopes: vi.fn(
        async (_signal: AbortSignal, options?: { excludeRecent?: boolean }) =>
          counted(options?.excludeRecent),
      ),
      ...overrides,
    });
  const summaryOf = () =>
    within(document.querySelector("[data-compose-summary]") as HTMLElement);
  async function ready() {
    await waitFor(() =>
      expect(
        screen.getByText(/출제 가능 3갈래\(최근 출제 뺀 뒤\)/),
      ).toBeInTheDocument(),
    );
  }
  async function openDialog() {
    fireEvent.click(screen.getByRole("button", { name: "구성 조건" }));
    return screen.findByRole("dialog", { name: "구성 조건" });
  }

  it("starts from the current table with no counts of its own, recent exclusion on, and uses it for counts · candidates · composition", async () => {
    const adapter = conditioned();
    render(<Harness adapter={adapter} initial={questions} />);
    await ready();
    expect(adapter.loadScopes).toHaveBeenCalledWith(expect.any(AbortSignal), {
      excludeRecent: true,
    });
    const chips = summaryOf();
    expect(chips.getByText("행의 합 3문항")).toBeInTheDocument();
    expect(chips.getByText("난이도 지정 없음")).toBeInTheDocument();
    expect(chips.getByText("최근 14일 출제 뺌")).toBeInTheDocument();
    expect(chips.getByText("0행")).toBeInTheDocument();
    // 낱칸은 누르는 것이 아니다 — 단추는 [구성 조건] 하나
    expect(chips.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "+ 문항 추가" })[0]);
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ excludeRecent: true }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    fireEvent.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(adapter.compose).toHaveBeenCalledWith(
        [
          { scopeId: "u1", count: 2 },
          { scopeId: "u2", count: 1 },
        ],
        expect.any(AbortSignal),
        { excludeRecent: true, difficulty: undefined },
      ),
    );
  });

  it("marks a hand-edited row fixed and redistributes only the other rows on apply, capped by what is left", async () => {
    render(<Harness adapter={conditioned()} initial={questions} />);
    await ready();
    fireEvent.click(
      screen.getByRole("button", { name: "범위 1 문항 수 늘리기" }),
    );
    expect(
      within(screen.getByRole("table")).getByText("고정"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "범위 1 고정 풀기" }),
    ).toBeEnabled();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("총 문항"), {
      target: { value: "15" },
    });
    // 범위 1 은 고정(3) — 범위 2 가 12 를 달라지만 10 뿐이다. 다른 범위에서 채우지 않는다.
    expect(within(dialog).getByText("10 / 12")).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "범위 2 — 최근 출제를 빼면 10갈래뿐이라 2문항 모자랍니다. 다른 범위에서 채우지 않습니다.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "구성 조건" })).toBeNull(),
    );
    expect(screen.getByLabelText("범위 1 구성 수")).toHaveValue(3);
    expect(screen.getByLabelText("범위 2 구성 수")).toHaveValue(10);
    expect(summaryOf().getByText("행의 합 13문항")).toBeInTheDocument();
    expect(summaryOf().getByText("1행")).toBeInTheDocument();
  });

  it("explains a blocking mismatch in one place and turns off [적용]", async () => {
    render(<Harness adapter={conditioned()} initial={questions} />);
    await ready();
    fireEvent.click(
      screen.getByRole("button", { name: "범위 1 문항 수 늘리기" }),
    );
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("총 문항"), {
      target: { value: "2" },
    });
    expect(within(dialog).getByRole("button", { name: "적용" })).toBeDisabled();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "고정한 행의 합(3)이 총 문항(2)보다 큽니다.",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "지정 없음으로" }),
    );
    fireEvent.change(within(dialog).getByLabelText("기본 문항 수"), {
      target: { value: "9" },
    });
    expect(within(dialog).getByRole("button", { name: "적용" })).toBeDisabled();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "난이도 합(9)이 총 문항(4)보다 큽니다.",
    );
    // 취소는 아무것도 바꾸지 않는다
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(summaryOf().getByText("난이도 지정 없음")).toBeInTheDocument();
  });

  it("turning recent exclusion off shows both counts, reloads availability and stops asking the server to drop them", async () => {
    const adapter = conditioned();
    render(<Harness adapter={adapter} initial={questions} />);
    await ready();
    const dialog = await openDialog();
    // 반대쪽 수도 센다 — «지금 해당»은 (6-3)+(12-10) = 5갈래
    expect(
      await within(dialog).findByText("지금 해당 5갈래"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/오늘\(\d+\/\d+\) 기준 최근 14일/),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText(/최근 출제 문항 빼기/));
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    await waitFor(() =>
      expect(
        screen.getByText(/출제 가능 6갈래 ·|출제 가능 6갈래$/),
      ).toBeInTheDocument(),
    );
    expect(adapter.loadScopes).toHaveBeenCalledWith(expect.any(AbortSignal), {
      excludeRecent: false,
    });
    expect(summaryOf().getByText("최근 출제 포함")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(adapter.compose).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(AbortSignal),
        { excludeRecent: false, difficulty: undefined },
      ),
    );
  });

  it("sends the difficulty intent («–» left out, 0 kept) and reports a short tier after composing", async () => {
    const adapter = conditioned({
      compose: vi.fn().mockResolvedValue({
        items: questions,
        notes: [
          "심화 1문항 중 0문항만 구성했습니다 — 다른 난이도로 채우지 않았습니다.",
        ],
      }),
    });
    render(<Harness adapter={adapter} initial={questions} />);
    await ready();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("기본 문항 수"), {
      target: { value: "2" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "심화 문항 수 하나 더하기" }),
    );
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "총 문항 · 난이도 · 범위 행이 서로 맞습니다.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    expect(summaryOf().getByText("기본 2 · 심화 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(adapter.compose).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(AbortSignal),
        { excludeRecent: true, difficulty: { 기본: 2, 심화: 1 } },
      ),
    );
    expect(
      await screen.findByText(/심화 1문항 중 0문항만 구성했습니다/),
    ).toBeInTheDocument();
  });

  it("blocks composing when hand edits leave the difficulty out of step with the rows", async () => {
    render(<Harness adapter={conditioned()} initial={questions} />);
    await ready();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("기본 문항 수"), {
      target: { value: "2" },
    });
    fireEvent.change(within(dialog).getByLabelText("심화 문항 수"), {
      target: { value: "1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "적용" }));
    fireEvent.click(
      screen.getByRole("button", { name: "범위 2 문항 수 늘리기" }),
    );
    expect(summaryOf().getByRole("status")).toHaveTextContent(
      "난이도 합(3)이 총 문항(4)과 다릅니다.",
    );
    expect(screen.getByRole("button", { name: "문항 구성 →" })).toBeDisabled();
  });

  it("leaves a source without conditions untouched (English path)", async () => {
    const adapter = source();
    render(<Harness adapter={adapter} initial={questions} />);
    await screen.findByRole("button", { name: "범위 변경" });
    expect(document.querySelector("[data-compose-summary]")).toBeNull();
    expect(screen.queryByRole("button", { name: "구성 조건" })).toBeNull();
    expect(adapter.loadScopes).toHaveBeenCalledWith(
      expect.any(AbortSignal),
      undefined,
    );
  });
});

describe("문항 교체 (W3 · Hi-fi 1)", () => {
  const sheet: Item[] = [
    { id: "a", scope: "u1", difficulty: "기본", family: "u1 A" },
    { id: "b", scope: "u1", difficulty: "심화", family: "u1 B" },
    { id: "c", scope: "u2", difficulty: "기본" },
  ];
  type ListRequest = Parameters<ExamBuilderSource<Item>["list"]>[0];
  const comparing = (
    siblings: Item[] = [
      { id: "a2", scope: "u1", difficulty: "기본", family: "u1 A" },
      { id: "a3", scope: "u1", difficulty: "기본", family: "u1 A" },
    ],
  ) =>
    source({
      compareReplace: true,
      conditions: { ladder: ["기본", "심화"], recentDays: 14 },
      loadScopes: vi.fn().mockResolvedValue([
        { ...scopes[0], count: 9 },
        { ...scopes[1], count: 9 },
      ]),
      list: vi.fn(async (request: ListRequest) =>
        request.familyOf
          ? { items: siblings, total: siblings.length }
          : {
              items: [
                {
                  id: `o-${request.difficulty || "전체"}`,
                  scope: "u1",
                  difficulty: request.difficulty || "기본",
                },
              ],
              total: 1,
            },
      ),
    });
  async function openReplace(adapter: ExamBuilderSource<Item>) {
    render(<Harness adapter={adapter} initial={sheet} initialStep="review" />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "교체" })[0]).toBeEnabled(),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "교체" })[0]);
    return screen.findByRole("dialog", { name: "문항 교체 · 01번" });
  }

  it("puts the original above the compared candidate and starts on the same problem family", async () => {
    const adapter = comparing();
    const dialog = await openReplace(adapter);
    await waitFor(() =>
      expect(adapter.list).toHaveBeenCalledWith(
        expect.objectContaining({
          familyOf: "a",
          scopeIds: ["u1"],
          excludeIds: ["a", "b", "c"],
          excludeFamiliesOf: ["b", "c"],
          excludeRecent: true,
        }),
        expect.any(AbortSignal),
      ),
    );
    const original = within(dialog).getByRole("region", { name: "바꿀 문항" });
    expect(original).toHaveTextContent("바꿀 문항 · 01번");
    expect(original).toHaveTextContent("문항 내용 a");
    const compare = within(dialog).getByRole("region", { name: "대조할 후보" });
    expect(
      await within(compare).findByText("문항 내용 a2"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /같은 문항류 2/ }),
    ).toHaveAttribute("aria-pressed", "true");
    // 대조는 단추로만 — 줄을 누르는 곳은 없다(D-30)
    fireEvent.click(within(dialog).getByRole("button", { name: "대조" }));
    expect(within(compare).getByText("문항 내용 a3")).toBeInTheDocument();
    expect(within(dialog).getByText("대조 중")).toBeInTheDocument();
  });

  it("the second layer keeps the scope and starts at the replaced problem's difficulty", async () => {
    const adapter = comparing();
    const dialog = await openReplace(adapter);
    await within(dialog).findByText("대조 중");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /같은 차시의 다른 문항/ }),
    );
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scopeIds: ["u1"],
          difficulty: "기본",
          excludeFamiliesOf: ["b", "c"],
          excludeRecent: true,
        }),
        expect.any(AbortSignal),
      ),
    );
    expect(
      (vi.mocked(adapter.list).mock.lastCall![0] as ListRequest).familyOf,
    ).toBeUndefined();
    expect(
      within(dialog).getByRole("button", { name: "기본" }),
    ).toHaveAttribute("aria-pressed", "true");
    const compare = within(dialog).getByRole("region", { name: "대조할 후보" });
    expect(
      await within(compare).findByText("문항 내용 o-기본"),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "심화" }));
    expect(
      await within(compare).findByText("문항 내용 o-심화"),
    ).toBeInTheDocument();
  });

  it("replaces in place after comparing, says so, and undo brings the original back", async () => {
    const dialog = await openReplace(comparing());
    const compare = within(dialog).getByRole("region", { name: "대조할 후보" });
    await within(compare).findByText("문항 내용 a2");
    fireEvent.click(
      within(compare).getByRole("button", { name: "이 문항으로 교체" }),
    );
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a2,b,c");
    expect(
      screen.queryByRole("dialog", { name: "문항 교체 · 01번" }),
    ).toBeNull();
    expect(
      screen.getByText("01번을 바꿨습니다 — 자리와 순서는 그대로입니다."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "↶ 되돌리기" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
  });

  it("a problem standing alone (no family) has no first layer — it opens on the second", async () => {
    const adapter = comparing([]);
    const dialog = await openReplace(adapter);
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: /같은 차시의 다른 문항/ }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(
      within(dialog).getByRole("button", { name: /같은 문항류 0/ }),
    ).toBeInTheDocument();
  });

  it("closing changes nothing", async () => {
    const dialog = await openReplace(comparing());
    fireEvent.click(within(dialog).getAllByRole("button", { name: "취소" })[0]);
    expect(
      screen.queryByRole("dialog", { name: "문항 교체 · 01번" }),
    ).toBeNull();
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c");
  });
});
