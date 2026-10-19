import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ExamReportScreenHifi } from "@/app/dev/exam-report-screen-hifi/ExamReportScreenHifi";
import { NOTE_LIMIT } from "@/app/dev/exam-report-screen-hifi/fixtures";

function scenario(value: string) {
  fireEvent.change(screen.getByLabelText("예시 상황"), { target: { value } });
}

const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((key) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() =>
  dialogMethods.forEach((key, i) => {
    const descriptor = originalDialogMethods[i];
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }),
);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("성적표 원장님 화면 Hi-fi — 로컬 시안", () => {
  it("H1~H4 모두 A 짜임과 같은 H1 지면을 쓰며 추천을 공개하지 않는다", () => {
    const { container } = render(<ExamReportScreenHifi />);
    for (const id of ["H1", "H2", "H3", "H4"]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`^${id} ·`) }),
      );
      expect(
        screen.getByRole("region", { name: "반 학생 목록" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "선택한 학생의 성적표" }),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-exam-report-page="H1"]'),
      ).not.toBeNull();
      expect(screen.getByLabelText("원장님 문장")).toBeInTheDocument();
    }
    expect(container.textContent).not.toContain("추천");
  });

  it("네 상태·결시·길이 상한·저장/확정 실패를 예시로 보여 준다", () => {
    render(<ExamReportScreenHifi />);
    for (const [value, text] of [
      ["none", "문장 없음"],
      ["draft", "문장 씀"],
      ["confirmed", "확정"],
      ["stale", "다시 확정"],
    ]) {
      scenario(value);
      expect(
        within(
          screen.getByRole("region", { name: "학생별 문장 편집" }),
        ).getAllByText(text, { exact: true }).length,
      ).toBeGreaterThan(0);
    }
    scenario("limit");
    expect(screen.getByLabelText("원장님 문장")).toHaveAttribute(
      "maxlength",
      String(NOTE_LIMIT),
    );
    expect(
      screen.getByText(`남은 ${0}자 / ${NOTE_LIMIT}자`),
    ).toBeInTheDocument();
    scenario("saving");
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    expect(screen.getByLabelText("원장님 문장")).toBeDisabled();
    scenario("save-error");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "문장을 저장하지 못했습니다",
    );
    expect(screen.getByLabelText("원장님 문장")).not.toHaveValue("");
    scenario("confirm-error");
    expect(screen.getByRole("alert")).toHaveTextContent("확정하지 못했습니다");
    scenario("absent");
    expect(
      screen.getByText("결시하여 성적표를 만들지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("원장님 문장")).not.toBeInTheDocument();
  });

  it("문장 없이도 확정되며 빈 문장 칸은 지면에 싣지 않는다", () => {
    const { container } = render(<ExamReportScreenHifi />);
    scenario("none");
    expect(container.querySelector(".er-note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "이 학생 확정" }));
    expect(
      within(
        screen.getByRole("region", { name: "학생별 문장 편집" }),
      ).getByText("확정", { exact: true }),
    ).toBeInTheDocument();
  });

  it("학생·안을 옮겨도 초안을 보존하며 확정 뒤 수정은 다시 확정으로 바뀐다", () => {
    render(<ExamReportScreenHifi />);
    scenario("confirmed");
    fireEvent.change(screen.getByLabelText("원장님 문장"), {
      target: { value: "수정한 문장을 보존합니다." },
    });
    expect(screen.getByRole("button", { name: "다시 확정" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /윤해온.*열기/ }));
    fireEvent.click(screen.getByRole("button", { name: /^H3 ·/ }));
    fireEvent.click(screen.getByRole("button", { name: /서하린.*열기/ }));
    expect(screen.getByLabelText("원장님 문장")).toHaveValue(
      "수정한 문장을 보존합니다.",
    );
  });

  it("인쇄 기본은 확정된 학생만이며 미확정 포함과 반 인쇄도 로컬로 검토한다", () => {
    render(<ExamReportScreenHifi />);
    expect(screen.getByLabelText("학생 인쇄 범위")).toHaveValue("confirmed");
    fireEvent.change(screen.getByLabelText("학생 인쇄 범위"), {
      target: { value: "all" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /학생 성적표 .*명 인쇄/ }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "학생 성적표 인쇄 검토",
    });
    expect(
      within(dialog).getByText(/확정 전 학생 5명 포함/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/결시 1명 제외/)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "인쇄하기" }),
    ).not.toBeInTheDocument();
  });

  it("저장 실패의 재시도는 해당 학생의 입력만 저장하고 확정 실패는 다시 확정할 수 있다", () => {
    vi.useFakeTimers();
    render(<ExamReportScreenHifi />);
    scenario("save-error");
    fireEvent.click(screen.getByRole("button", { name: "다시 저장" }));
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(650));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "문장 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이 학생 확정" })).toBeEnabled();
    scenario("confirm-error");
    fireEvent.click(screen.getByRole("button", { name: "이 학생 확정" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확정됨" })).toBeDisabled();
  });

  it("긴 학생 명단은 공용 고르기 창에서 검색하고 선택한다", () => {
    render(<ExamReportScreenHifi />);
    scenario("many");
    expect(
      screen.queryByRole("button", { name: /강가온.*열기/ }),
    ).not.toBeInTheDocument();
    const launcher = screen.getByRole("button", { name: "학생 고르기 · 48명" });
    fireEvent.click(launcher);
    const dialog = screen.getByRole("dialog", {
      name: "성적표를 볼 학생 고르기",
    });
    fireEvent.change(within(dialog).getByLabelText("이름 검색"), {
      target: { value: "강가온" },
    });
    expect(within(dialog).getByText("표시 1명 / 48명")).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /강가온.*열기/ }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^강가온.*80점/ }),
    ).toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });

  it("반 지면 설정의 취소는 지면을 보존하고 적용은 기존 확정을 다시 확정으로 돌린다", () => {
    render(<ExamReportScreenHifi />);
    scenario("confirmed");
    fireEvent.click(screen.getByRole("button", { name: "반 지면 설정" }));
    expect(screen.getByRole("checkbox", { name: /반 평균/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /반 평균/ }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      screen
        .getByRole("region", { name: "선택한 학생의 성적표" })
        .querySelectorAll('[data-exam-report-page="H1"]'),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "반 지면 설정" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /반 평균/ }));
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(
      screen.getByText("반 지면 설정이 바뀌었습니다.", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 확정" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "학생 성적표 0명 인쇄" }),
    ).toBeDisabled();
    expect(
      screen
        .getByRole("region", { name: "선택한 학생의 성적표" })
        .querySelectorAll('[data-exam-report-page="H1"]').length,
    ).toBe(1);
  });

  it("지면이 넘친다는 측정 결과에서는 저장·확정·선택 학생 인쇄를 막는다", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("er-sheet") ? 1123 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("er-sheet") ? 1300 : 0;
      },
    );
    render(<ExamReportScreenHifi />);
    scenario("overflow");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "H1 한 장을 벗어납니다.",
    );
    expect(screen.getByLabelText("원장님 문장")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("button", { name: "이 학생 확정" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "문장 저장" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("학생 인쇄 범위"), {
      target: { value: "selected" },
    });
    expect(
      screen.getByRole("button", { name: "학생 성적표 1명 인쇄" }),
    ).toBeDisabled();
  });

  it("저장·설정·확정·인쇄 검토를 조작해도 서버를 호출하지 않는다", () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, "fetch");
    render(<ExamReportScreenHifi />);
    fireEvent.click(screen.getByRole("button", { name: /^H4 ·/ }));
    scenario("save-error");
    fireEvent.click(screen.getByRole("button", { name: "다시 저장" }));
    act(() => vi.advanceTimersByTime(650));
    fireEvent.click(screen.getByRole("button", { name: "이 학생 확정" }));
    fireEvent.click(screen.getByRole("button", { name: "반 지면 설정" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(
      screen.getByRole("button", { name: /학생 성적표 .*명 인쇄/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "학생 성적표 인쇄 검토" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
