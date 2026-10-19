import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExamBuilder from "@/components/exam-builder/ExamBuilder";
import QuestionFormatPicker from "@/components/exam-builder/QuestionFormatPicker";
import FormatQuotaFields from "@/components/exam-builder/FormatQuotaFields";
import { createMathExamBuilderSource } from "@/components/exam-builder/mathSource";
import { emptyFormats } from "@/components/exam-builder/conditionsPlan";
import type { StudioProblem } from "@/components/unified/types";
import {
  actualRows,
  cards,
  fixtureFetch,
  unit,
} from "@/app/dev/question-formats/fixture";
import { addToCart, restoreToCart } from "@/components/unified/studioCart";

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
const source = (options: { stale?: boolean; failed?: boolean } = {}) =>
  createMathExamBuilderSource({
    fetch: fixtureFetch(options),
    problemsUrl: "/fixture/questions",
    initialUnits: [unit],
    distinctFamilies: false,
  });
const preview = (item: StudioProblem) => (
  <p>
    {item.content} · 실제 답 {item.answer}
  </p>
);

describe("one question, actual representation selection", () => {
  it("reads four question cards from seven actual rows and keeps numeric variants separate", async () => {
    const adapter = source();
    const list = await adapter.list(
      {
        scopeIds: [unit.id],
        difficulty: "",
        query: "",
        page: 1,
        pageSize: 20,
        excludeIds: [],
      },
      new AbortController().signal,
    );
    expect(list.total).toBe(4);
    expect(list.items).toHaveLength(4);
    expect(list.items[0].questionId).not.toBe(list.items[1].questionId);
    expect(list.items[0]).toHaveProperty("familyKey", actualRows[0].familyKey);
    expect(list.items[1]).toHaveProperty("familyKey", actualRows[0].familyKey);
    await expect(
      adapter.prepareOutput!(
        [actualRows[0], actualRows[1]],
        new AbortController().signal,
      ),
    ).rejects.toThrow(/중복/);
    expect(addToCart([actualRows[0]], [actualRows[1], actualRows[2]])).toEqual([
      actualRows[0],
      actualRows[2],
    ]);
    expect(restoreToCart([actualRows[1]], actualRows[0], 0)).toEqual([
      actualRows[1],
    ]);
  });

  it("uses native radios and returns the complete actual MC row, including its number answer", async () => {
    const user = userEvent.setup();
    const adapter = source();
    const chosen = vi.fn();
    render(
      <QuestionFormatPicker
        item={cards[0]}
        actualId={cards[0].id}
        options={cards[0].questionFormats!}
        load={adapter.questionFormats!.load}
        renderQuestion={preview}
        onChoose={chosen}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: /단답형/ })).toHaveFocus();
    expect(
      screen.queryByRole("radio", { name: /서술형/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /객관식/ }));
    await screen.findByText(/① 3/);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "이 형식으로 담기" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "이 형식으로 담기" }));
    expect(chosen).toHaveBeenCalledWith(actualRows[1]);
    expect(chosen.mock.calls[0][0].answer).toBe("③");
  });

  it("shows a blocked sibling and refuses a stale revision without closing or replacing input", async () => {
    const adapter = source({ stale: true });
    const chosen = vi.fn();
    render(
      <QuestionFormatPicker
        item={cards[3]}
        actualId={cards[3].id}
        options={cards[3].questionFormats!}
        load={adapter.questionFormats!.load}
        renderQuestion={preview}
        onChoose={chosen}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: /객관식/ })).toBeDisabled();
    expect(screen.getByText("출제 잠금(사유 미기록)")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /변경되었습니다/,
    );
    expect(screen.getByRole("radio", { name: /단답형/ })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "이 형식으로 담기" }),
    ).toBeDisabled();
    expect(chosen).not.toHaveBeenCalled();
  });

  it("changes the format in its seat and undo restores the full previous row", async () => {
    const user = userEvent.setup();
    const adapter = source();
    function Harness() {
      const [items, change] = useState<StudioProblem[]>([
        actualRows[0],
        actualRows[2],
      ]);
      return (
        <>
          <output aria-label="selected">
            {items.map((item) => `${item.id}:${item.answer}`).join("|")}
          </output>
          <ExamBuilder
            source={adapter}
            questions={items}
            onQuestionsChange={change}
            title="검증"
            onTitleChange={() => {}}
            initialStep="review"
            difficulties={["기본"]}
            maxQuestions={100}
            renderQuestion={preview}
            renderOutput={() => <p>출력</p>}
          />
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getAllByRole("button", { name: /형식 변경/ })[0]);
    await user.click(screen.getByRole("radio", { name: /객관식/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "이 형식으로 변경" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "이 형식으로 변경" }));
    expect(screen.getByLabelText("selected")).toHaveTextContent(
      `${actualRows[1].id}:③|${actualRows[2].id}:10`,
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(screen.getByLabelText("selected")).toHaveTextContent(
      `${actualRows[0].id}:5|${actualRows[2].id}:10`,
    );
  });

  it("shows old duplicate output unchanged and requires an explicit keep choice in a new edit", async () => {
    const user = userEvent.setup();
    const adapter = source();
    const prepare = vi.spyOn(adapter, "prepareOutput");
    function Harness() {
      const [items, change] = useState<StudioProblem[]>([
        actualRows[0],
        actualRows[1],
      ]);
      return (
        <ExamBuilder
          source={adapter}
          questions={items}
          onQuestionsChange={change}
          title="저장본"
          onTitleChange={() => {}}
          initialStep="output"
          preserveStoredOutput
          onBeginEdit={async () => true}
          difficulties={["기본"]}
          maxQuestions={100}
          renderQuestion={preview}
          renderOutput={({ questions, onStep }) => (
            <div>
              <p>
                저장 문항 {questions.length} ·{" "}
                {questions.map((item) => item.answer).join(",")}
              </p>
              <button onClick={() => onStep("review")}>사본으로 편집</button>
            </div>
          )}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByText("저장 문항 2 · 5,③")).toBeInTheDocument();
    expect(prepare).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "사본으로 편집" }));
    const conflict = await screen.findByRole("alert");
    expect(conflict).toHaveTextContent("같은 문항의 형식");
    await user.click(
      within(conflict).getByRole("button", { name: /단답형.*유지/ }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("keeps unspecified, zero and invalid total quotas distinct", () => {
    function Quotas() {
      const [value, change] = useState(emptyFormats);
      return <FormatQuotaFields count={8} value={value} onChange={change} />;
    }
    render(<Quotas />);
    fireEvent.click(
      screen.getByText(/출제 형식 배분/, { selector: "summary" }),
    );
    const mc = screen.getByRole("spinbutton", { name: "객관식" });
    expect(mc).toHaveValue(null);
    fireEvent.change(mc, { target: { value: "0" } });
    expect(mc).toHaveValue(0);
    fireEvent.change(screen.getByRole("spinbutton", { name: "단답형" }), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "서술형" }), {
      target: { value: "2" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("형식 합(5)");
    fireEvent.change(mc, { target: { value: "" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a proven partial composition reviewable and blocks output until the explicit quota is corrected", async () => {
    const user = userEvent.setup();
    const adapter = source();
    const output = vi.fn(() => <p>출력 내용</p>);
    const intentIssue = vi.fn();
    function Harness() {
      const [items, change] = useState<StudioProblem[]>([]);
      return (
        <ExamBuilder
          source={adapter}
          questions={items}
          onQuestionsChange={change}
          title="부족 검증"
          onTitleChange={() => {}}
          initialScopeIds={[unit.id]}
          difficulties={["기본"]}
          maxQuestions={100}
          renderQuestion={preview}
          renderOutput={output}
          onIntentIssueChange={intentIssue}
        />
      );
    }
    render(<Harness />);
    const count = await screen.findByRole("spinbutton", {
      name: "덧셈과 짝수 구성 수",
    });
    fireEvent.change(count, { target: { value: "4" } });
    await user.click(screen.getByRole("button", { name: "구성 조건" }));
    const dialog = screen.getByRole("dialog", { name: "구성 조건" });
    for (const [name, value] of [
      ["객관식 문항 수", "4"],
      ["단답형 문항 수", "0"],
      ["서술형 문항 수", "0"],
    ])
      fireEvent.change(within(dialog).getByRole("textbox", { name }), {
        target: { value },
      });
    await user.click(within(dialog).getByRole("button", { name: "적용" }));
    await user.click(screen.getByRole("button", { name: "문항 구성 →" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "총 4문항 지정 · 현재 2문항",
      ),
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "객관식 4문항 지정 · 현재 2문항",
    );
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeDisabled();
    expect(output).not.toHaveBeenCalled();
    expect(intentIssue).toHaveBeenLastCalledWith(
      expect.stringContaining("객관식 4문항 지정 · 현재 2문항"),
    );
    await user.click(screen.getByRole("button", { name: "범위 설정 고치기" }));
    expect(
      screen.getByRole("spinbutton", { name: "덧셈과 짝수 구성 수" }),
    ).toHaveValue(4);
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "덧셈과 짝수 구성 수" }),
      { target: { value: "2" } },
    );
    await user.click(screen.getByRole("button", { name: "구성 조건" }));
    expect(screen.getByRole("textbox", { name: "객관식 문항 수" })).toHaveValue(
      "4",
    );
    expect(screen.getByRole("textbox", { name: "서술형 문항 수" })).toHaveValue(
      "0",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "객관식 문항 수" }), {
      target: { value: "2" },
    });
    await user.click(screen.getByRole("button", { name: "적용" }));
    await user.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "3 양식 구성·출력" }));
    expect(await screen.findByText("출력 내용")).toBeInTheDocument();
    expect(intentIssue).toHaveBeenLastCalledWith(null);
  });
});
