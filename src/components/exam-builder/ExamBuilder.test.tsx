import "@testing-library/jest-dom/vitest";
import { useState } from "react";
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
import type { ExamBuilderSource } from "./types";

type Item = { id: string; scope: string; difficulty: string };
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
    }),
    prepareOutput: vi.fn(async (items) => items),
    ...overrides,
  };
}
function Harness({
  adapter,
  initial = [],
}: {
  adapter: ExamBuilderSource<Item>;
  initial?: Item[];
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
        questions={items}
        onQuestionsChange={setItems}
        title={title}
        onTitleChange={setTitle}
        difficulties={["기본", "심화"]}
        maxQuestions={80}
        renderQuestion={(item) => <p>문항 내용 {item.id}</p>}
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
    await waitFor(() =>
      expect(adapter.list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          difficulty: "심화",
          scopeIds: ["u1", "u2"],
          excludeIds: ["a", "b", "c"],
        }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "문항 추가" }));
    expect(screen.getByLabelText("문항 순서")).toHaveTextContent("a,b,c,d");
    expect(screen.getByRole("button", { name: "추가됨" })).toBeDisabled();
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
});
