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
