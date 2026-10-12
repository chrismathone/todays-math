import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProblemReview } from "@/components/unified/print/types";
import { TEMPLATES } from "@/components/unified/print/settings";
import StudioStepBar from "@/components/unified/StudioStepBar";
import ExamBuilderOutput from "./ExamBuilderOutput";
import { PARENT_ORIGIN } from "./bridge";
import { isolatePreviewApis } from "./isolation";

// jsdom has no layout: substitute only geometry measurement, keeping the real
// WorksheetEditor, PrintOptionsPanel, WorksheetPrint and all six templates.
vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: (_template: unknown, problems: ProblemReview[]) => ({
    ready: true,
    pages: problems.length
      ? [
          {
            indices: problems.map((_, index) => index),
            scales: problems.map(() => 1),
          },
        ]
      : [],
    fontStyle: {},
    measureNode: null,
    fontError: false,
    layoutError: "",
  }),
}));

const questions = [
  {
    id: "one",
    prompt: "Original first prompt",
    passage: "Original passage",
    choices: ["Choice A", "Choice B"],
    answer: "②",
    solution: "Original solution",
  },
  { id: "two", prompt: "Original second prompt", answer: "Supplied answer" },
];

function send(
  data: unknown,
  origin = PARENT_ORIGIN,
  source: MessageEventSource | null = window.parent,
) {
  act(() =>
    window.dispatchEvent(new MessageEvent("message", { data, origin, source })),
  );
}
function open(title = "Original title", rows = questions, flow?: "blueprint") {
  send({
    type: "exam-concept:open",
    payload: {
      subject: "english",
      title,
      questions: rows,
      ...(flow ? { flow } : {}),
    },
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("actual shared output editor", () => {
  it("can cancel loading or invalid input without returning an empty selection", () => {
    const post = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation(() => {});
    render(<ExamBuilderOutput />);
    fireEvent.click(
      screen.getByRole("button", { name: "문항 검토로 돌아가기" }),
    );
    expect(post).toHaveBeenLastCalledWith(
      { type: "exam-concept:back" },
      PARENT_ORIGIN,
    );
    open();
    send({ type: "exam-concept:open", payload: { subject: "invalid" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "문항을 불러오지 못했습니다",
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(post).toHaveBeenLastCalledWith(
      { type: "exam-concept:back" },
      PARENT_ORIGIN,
    );
  });

  it.each([undefined, "blueprint"] as const)(
    "handshakes, rejects untrusted messages, and renders all six real templates (flow=%s)",
    (flow) => {
      const post = vi
        .spyOn(window.parent, "postMessage")
        .mockImplementation(() => {});
      const { container } = render(<ExamBuilderOutput />);
      expect(post).toHaveBeenCalledWith(
        { type: "exam-concept:ready" },
        PARENT_ORIGIN,
      );
      send(
        {
          type: "exam-concept:open",
          payload: { subject: "english", title: "Bad origin", questions },
        },
        "http://localhost:3178",
      );
      expect(screen.queryByLabelText("제목")).toBeNull();
      open("Original title", questions, flow);
      expect(screen.getByLabelText("제목")).toHaveValue("Original title");
      expect(screen.queryByText("OCR · 디지털화")).toBeNull();
      expect(screen.queryByText("원본 가져오기")).toBeNull();
      for (const template of TEMPLATES) {
        fireEvent.click(
          screen.getByRole("button", {
            name: new RegExp(`^${template.label}`),
          }),
        );
        const document = container.querySelector("[data-mathgen-document]");
        expect(document).toHaveAttribute("data-template", template.value);
        expect(document).toHaveTextContent("Original first prompt");
        expect(document).toHaveTextContent("Original passage");
        expect(document).toHaveTextContent("Choice B");
        expect(document?.querySelector("[data-unified-paper]")).not.toBeNull();
      }
    },
  );

  it("uses the blueprint heading and stages, returning the latest edits to each target", () => {
    const post = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation(() => {});
    render(<ExamBuilderOutput />);
    open("Original title", questions, "blueprint");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "시험지 만들기",
    );
    expect(
      screen.queryByRole("button", { name: "문항 검토로 돌아가기" }),
    ).toBeNull();
    const navigation = screen.getByRole("navigation", {
      name: "시험지 만들기 단계 이동",
    });
    expect(within(navigation).getAllByRole("button")).toHaveLength(3);
    expect(
      within(navigation).getByRole("button", { name: "3 양식 구성·출력" }),
    ).toHaveAttribute("aria-current", "step");
    expect(
      within(navigation).getByRole("button", { name: "3 양식 구성·출력" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(navigation).getByRole("button", { name: "1 범위 설정" }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "Edited blueprint" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "문제 순서 · 2" }));
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 아래로" }));
    for (const [label, step] of [
      ["1 범위 설정", "scope"],
      ["2 문항 검토", "review"],
    ]) {
      fireEvent.click(within(navigation).getByRole("button", { name: label }));
      expect(post).toHaveBeenLastCalledWith(
        {
          type: "exam-concept:back",
          payload: {
            title: "Edited blueprint",
            questionIds: ["two", "one"],
            step,
          },
        },
        PARENT_ORIGIN,
      );
    }
    post.mockClear();
    fireEvent.click(
      within(navigation).getByRole("button", { name: "3 양식 구성·출력" }),
    );
    expect(post).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: {
          title: "Edited blueprint",
          questionIds: ["two", "one"],
          step: "review",
        },
      },
      PARENT_ORIGIN,
    );
  });

  it("preserves blueprint print settings and parent title/order on reentry, with an empty return path", () => {
    const post = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation(() => {});
    render(<ExamBuilderOutput />);
    open("Blueprint", questions, "blueprint");
    fireEvent.click(screen.getByRole("button", { name: /^모던/ }));
    fireEvent.change(screen.getByLabelText("학교/기관명"), {
      target: { value: "Preserved school" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "시안 메모리(임시)에 저장" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    open("Parent title", [questions[1], questions[0]], "blueprint");
    expect(screen.getByLabelText("제목")).toHaveValue("Parent title");
    expect(screen.getByLabelText("학교/기관명")).toHaveValue(
      "Preserved school",
    );
    expect(screen.getByRole("button", { name: /^모던/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "시안 임시 저장본 불러오기" }),
    ).toBeDisabled();
    send({ type: "exam-concept:close" });
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: {
          title: "Parent title",
          questionIds: ["two", "one"],
          step: "review",
        },
      },
      PARENT_ORIGIN,
    );
    fireEvent.click(screen.getByRole("tab", { name: "문제 순서 · 2" }));
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 빼기" }));
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 빼기" }));
    expect(
      screen.getByRole("button", { name: "3 양식 구성·출력" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "인쇄 / PDF 저장" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Parent title", questionIds: [], step: "review" },
      },
      PARENT_ORIGIN,
    );
    open("Empty reentry", [], "blueprint");
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Empty reentry", questionIds: [], step: "scope" },
      },
      PARENT_ORIGIN,
    );
    open();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "시험지 구성",
    );
    expect(screen.queryByRole("button", { name: "1 범위 설정" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "문항 검토로 돌아가기" }),
    );
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Original title", questionIds: ["one", "two"] },
      },
      PARENT_ORIGIN,
    );
  });

  it("saves/restores real memory state, returns order/title, and keeps options on reopen", () => {
    const post = vi
      .spyOn(window.parent, "postMessage")
      .mockImplementation(() => {});
    render(<ExamBuilderOutput />);
    open();
    fireEvent.click(screen.getByRole("button", { name: /^모던/ }));
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "Edited title" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "시안 메모리(임시)에 저장" }),
    );
    fireEvent.click(screen.getByRole("tab", { name: "문제 순서 · 2" }));
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 아래로" }));
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 빼기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "문항 검토로 돌아가기" }),
    );
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Edited title", questionIds: ["two"] },
      },
      PARENT_ORIGIN,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "시안 임시 저장본 불러오기" }),
    );
    send({ type: "exam-concept:close" });
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Edited title", questionIds: ["one", "two"] },
      },
      PARENT_ORIGIN,
    );
    open("Latest title", [questions[1]]);
    fireEvent.click(screen.getByRole("tab", { name: "서식 설정" }));
    expect(screen.getByLabelText("제목")).toHaveValue("Latest title");
    expect(screen.getByRole("button", { name: /^모던/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "시안 임시 저장본 불러오기" }),
    ).toBeDisabled();
    send({ type: "exam-concept:close" });
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Latest title", questionIds: ["two"] },
      },
      PARENT_ORIGIN,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(post).toHaveBeenLastCalledWith(
      {
        type: "exam-concept:back",
        payload: { title: "Latest title", questionIds: ["two"] },
      },
      PARENT_ORIGIN,
    );
  });

  it("guards API exports while keeping real browser print available", async () => {
    const fetch = vi.spyOn(window, "fetch");
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ExamBuilderOutput />);
    open();
    for (const name of ["HWPX 내보내기", "PDF 내려받기"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/시안에서는 인쇄 \/ PDF 저장을 이용해 주세요/).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "인쇄 / PDF 저장" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
  });
});

it("keeps the default extraction title, four stages, availability and action children", () => {
  const onStep = vi.fn();
  render(
    <StudioStepBar
      step="review"
      pickedCount={2}
      cropCount={3}
      canCrop={false}
      canReview
      onStep={onStep}
    >
      <button type="button">Existing action</button>
    </StudioStepBar>,
  );
  expect(
    screen.getByRole("heading", { name: "문제 추출", level: 1 }),
  ).toBeVisible();
  const navigation = screen.getByRole("navigation", { name: "제작 단계 이동" });
  expect(within(navigation).getAllByRole("button")).toHaveLength(4);
  expect(
    screen.getByRole("button", { name: "문제&도형 잘라내기" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "OCR · 디지털화 3" }),
  ).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "시험지 구성 2" }));
  expect(onStep).toHaveBeenCalledWith("export");
  fireEvent.click(screen.getByRole("button", { name: "원본 가져오기" }));
  expect(onStep).toHaveBeenLastCalledWith("upload");
  expect(screen.getByRole("button", { name: "Existing action" })).toBeVisible();
});

it("isolates inherited API fetch/beacon calls and restores delegation on cleanup", async () => {
  const fetch = vi
    .spyOn(window, "fetch")
    .mockResolvedValue(new Response("asset"));
  const beacon = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    writable: true,
    value: beacon,
  });
  const stop = isolatePreviewApis();
  const response = await window.fetch("/api/account/activity", {
    method: "POST",
  });
  expect(response.status).toBe(403);
  expect(navigator.sendBeacon("/api/error-logs", "preview")).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  expect(beacon).not.toHaveBeenCalled();
  await window.fetch("/fonts/example.woff2");
  expect(fetch).toHaveBeenCalledOnce();
  const retainedFetch = window.fetch;
  stop();
  await retainedFetch("/api/after-preview");
  expect(fetch).toHaveBeenCalledTimes(2);
});
