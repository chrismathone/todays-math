/**
 * «개념 백지» 탭 화면(D-150 · 26 §4 · 브리프 cb-app) — 나무 · 형식 카드 다섯 · 미리보기 · 인쇄 주소.
 *
 * 은행은 props 로 넣는다 — 실제 은행(`bank/*.ts`)이 비어 있는 동안 시험은 `FIXTURE_BANK`(초5 두 단원).
 * 지면(`ConceptBlankPaper`)은 트랙 cb-paper 가 속을 만든다 — 여기서는 겉(props)만 보는 탐침으로 바꾼다.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import { kstDateOf } from "@/lib/kstDate";

vi.mock("@/components/concept-blank/ConceptBlankPaper", () => ({
  default: function PaperProbe({ sheets, view, code }: ConceptBlankPaperProps) {
    return (
      <div data-code={code} data-testid="paper" data-view={view}>
        {sheets.map((sheet) => sheet.form).join(",")}
      </div>
    );
  },
}));

const S = {
  cong: "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
  congProp: "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
  line: "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
  point: "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
  atLeast: "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
  over: "초5::2-1 수의 범위와 어림하기::2-1-2 초과와 미만 알아보기",
  round: "초5::2-1 수의 범위와 어림하기::2-1-6 반올림 알아보기와 어림의 활용",
} as const;
const ZERO = { 하: 0, 중: 0, 상: 0 };

function renderView(active = true) {
  return render(<ConceptBlankView bank={FIXTURE_BANK} active={active} />);
}
const tree = () => within(screen.getByRole("region", { name: "단원 고르기" }));
function openGrade(grade: string) {
  const button = tree().getByRole("button", { name: new RegExp(`^${grade}`) });
  if (button.getAttribute("aria-expanded") !== "true") fireEvent.click(button);
  return button;
}
const box = (name: string) => tree().getByRole("checkbox", { name });
const count = (name: string) =>
  screen.getByRole("spinbutton", { name }) as HTMLInputElement;
const formSwitch = (label: string) =>
  screen.getByRole("switch", { name: `${label} 켜기` });
function printUrl(): URL {
  const link = screen.getByRole("link", { name: "인쇄하기" });
  return new URL(link.getAttribute("href")!, "http://localhost");
}
function printedSelection(): ConceptBlankSelection | null {
  const url = printUrl();
  expect(url.pathname).toBe("/concept-blank/print");
  expect(url.searchParams.get("view")).toBe("both");
  return decodeSelection(url.searchParams.get("s"));
}

beforeEach(() => {
  window.history.replaceState(null, "", "/#conceptBlank");
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("소단원 이름의 수식 — KaTeX (원장님 2026-10-01 «일부 카텍스 적용 안되어있네»)", () => {
  it("나무의 «이차함수 y=ax^2+bx+c의 그래프»는 수식으로 그린다 — 캐럿이 글자로 안 보인다", () => {
    renderView();
    openGrade("중3");
    const label = tree()
      .getAllByRole("checkbox")
      .map((b) => b.closest("label")!)
      .find(
        (l) =>
          l.textContent!.includes("의 그래프") && l.querySelector(".katex"),
      );
    expect(label).toBeDefined();
    expect(label!.querySelector(".katex-error")).toBeNull();
    // 보이는 글(MathML 주석 밖)에 날 캐럿이 없다
    const visible = [...label!.querySelectorAll(".katex-html")]
      .map((n) => n.textContent)
      .join("");
    expect(visible).not.toContain("^");
  });
});

describe("나무 — 학년 → 대단원 → 소단원", () => {
  it("학년은 접혀 있다가 누른 학년만 펼치고, 초1 · 초2 · 고등은 «준비 중»이다", () => {
    renderView();
    const g5 = tree().getByRole("button", { name: /^초5/ });
    expect(g5).toHaveAttribute("aria-expanded", "false");
    expect(tree().queryByRole("checkbox")).toBeNull();

    fireEvent.click(g5);
    expect(g5).toHaveAttribute("aria-expanded", "true");
    expect(box("2-3 합동과 대칭")).toBeInTheDocument();

    // 다른 학년을 펼치면 앞 학년은 접힌다
    fireEvent.click(tree().getByRole("button", { name: /^중1/ }));
    expect(g5).toHaveAttribute("aria-expanded", "false");
    expect(
      tree().queryByRole("checkbox", { name: "2-3 합동과 대칭" }),
    ).toBeNull();

    for (const grade of ["초1", "초2", "고등"]) {
      expect(
        tree().queryByRole("button", { name: new RegExp(`^${grade}`) }),
      ).toBeNull();
      const row = tree().getByText(grade).closest("li")!;
      expect(row).toHaveTextContent("준비 중");
    }
  });

  it("대단원을 체크하면 그 아래 소단원이 전부 켜진다 — 재고 0 인 소단원은 빼고, 일부만이면 반쯤", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    expect(box("2-1-1 이상과 이하 알아보기")).toBeChecked();
    expect(box("2-1-2 초과와 미만 알아보기")).toBeChecked();
    expect(box("2-1-6 반올림 알아보기와 어림의 활용")).toBeChecked();
    expect(box("2-1-3 수의 범위를 알고 문제 해결하기")).not.toBeChecked();
    expect(box("2-1 수의 범위와 어림하기")).toBeChecked();

    fireEvent.click(box("2-1-2 초과와 미만 알아보기"));
    expect(box("2-1 수의 범위와 어림하기")).toBePartiallyChecked();

    // 반쯤인 대단원을 누르면 전부 켠다, 다시 누르면 전부 끈다
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    expect(box("2-1-2 초과와 미만 알아보기")).toBeChecked();
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    expect(box("2-1-1 이상과 이하 알아보기")).not.toBeChecked();
    expect(box("2-1-6 반올림 알아보기와 어림의 활용")).not.toBeChecked();

    // 학년 단추가 고른 수를 보인다
    fireEvent.click(box("2-3 합동과 대칭"));
    expect(tree().getByRole("button", { name: /^초5/ })).toHaveTextContent(
      "4개 고름",
    );
  });

  it("소단원 옆에 재고(개념 · ○× · 적용 · 그림)가 서고, 재고 0 인 소단원은 흐리고 고를 수 없다", () => {
    renderView();
    openGrade("초5");
    const atLeast = box("2-1-1 이상과 이하 알아보기");
    expect(atLeast).toHaveAccessibleDescription(
      "개념 1 · ○× 1 · 적용 0 · 그림 0",
    );
    expect(
      box("2-3-3 선대칭도형과 그 성질 알아보기"),
    ).toHaveAccessibleDescription("개념 2 · ○× 1 · 적용 0 · 그림 1");

    const empty = box("2-1-3 수의 범위를 알고 문제 해결하기");
    expect(empty).toBeDisabled();
    expect(empty).toHaveAccessibleDescription("문항 없음");
    expect(empty.closest("li")).toHaveAttribute("data-empty", "true");
    fireEvent.click(empty);
    expect(empty).not.toBeChecked();

    // 재고가 하나도 없는 대단원은 대단원 칸도 고를 수 없다
    expect(box("1-1 자연수의 혼합 계산")).toBeDisabled();
  });
});

describe("형식 카드 다섯", () => {
  it("다섯 카드가 서고, 소단원을 고르기 전에는 모두 꺼져 있다", () => {
    renderView();
    for (const label of [
      "완전 백지",
      "용어 → 뜻",
      "문장 빈칸",
      "개념 지도",
      "그림 보고 쓰기",
    ]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      expect(formSwitch(label)).toBeDisabled();
    }
    expect(screen.getAllByText("소단원을 먼저 고르세요.").length).toBe(5);
  });

  it("숫자 칸의 기본은 고른 소단원의 재고 전부이고, 재고를 넘지 못한다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    // 2-3 개념: 하 2 · 중 3 · 상 1
    expect(count("완전 백지 개념 수 하").value).toBe("2");
    expect(count("완전 백지 개념 수 중").value).toBe("3");
    expect(count("완전 백지 개념 수 상").value).toBe("1");
    expect(count("완전 백지 개념 수 하")).toHaveAttribute("max", "2");

    fireEvent.change(count("완전 백지 개념 수 하"), { target: { value: "9" } });
    expect(count("완전 백지 개념 수 하").value).toBe("2");
    fireEvent.change(count("완전 백지 개념 수 하"), { target: { value: "1" } });
    expect(count("완전 백지 개념 수 하").value).toBe("1");
    fireEvent.change(count("완전 백지 개념 수 하"), {
      target: { value: "-3" },
    });
    expect(count("완전 백지 개념 수 하").value).toBe("0");

    // B 는 ○× 줄, C 는 적용 줄이 하나 더 — 재고 0 인 칸은 0 에 묶인다
    expect(count("용어 → 뜻 ○× 중").value).toBe("1");
    expect(count("용어 → 뜻 ○× 하")).toBeDisabled();
    expect(count("문장 빈칸 적용 상").value).toBe("0");
    expect(count("그림 보고 쓰기 그림 하").value).toBe("1");
    expect(count("그림 보고 쓰기 그림 중").value).toBe("1");

    // 고른 소단원을 줄이면 최대도 따라 줄어든다
    fireEvent.click(box("2-3-1 도형의 합동 알아보기"));
    expect(count("완전 백지 개념 수 하")).toHaveAttribute("max", "1");
    expect(Number(count("완전 백지 개념 수 하").value)).toBeLessThanOrEqual(1);
  });

  it("그림 문항이 없는 소단원만 고르면 E 는 꺼지고 까닭 한 줄 — 그림 소단원을 더하면 켜진다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    const figure = formSwitch("그림 보고 쓰기");
    expect(figure).toBeDisabled();
    expect(figure).not.toBeChecked();
    expect(
      screen.getByText("고른 소단원에 그림 문항이 없습니다."),
    ).toBeInTheDocument();
    expect(printedSelection()!.forms.map((f) => f.form)).not.toContain(
      "figure",
    );

    fireEvent.click(box("2-3-3 선대칭도형과 그 성질 알아보기"));
    expect(formSwitch("그림 보고 쓰기")).toBeEnabled();
    expect(formSwitch("그림 보고 쓰기")).toBeChecked();
    expect(
      screen.queryByText("고른 소단원에 그림 문항이 없습니다."),
    ).toBeNull();
    expect(printedSelection()!.forms.map((f) => f.form)).toContain("figure");
  });

  it("카드를 끄면 숫자 칸이 잠기고 인쇄 고르기에서 빠진다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    fireEvent.click(formSwitch("개념 지도"));
    expect(formSwitch("개념 지도")).not.toBeChecked();
    expect(count("개념 지도 개념 수 하")).toBeDisabled();
    expect(printedSelection()!.forms.map((f) => f.form)).toEqual([
      "recall",
      "term",
      "cloze",
      "figure",
    ]);
  });
});

describe("인쇄 옵션 — 날짜 · 인쇄할 지면 · 인쇄 단추 (원장님 2026-10-01)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("날짜는 기본이 오늘(한국 시간)이고 인쇄 주소에 실린다 — 비우면 날짜 없이(손으로 쓰는 줄)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T16:30:00Z")); // 한국 시간 10월 2일 01:30
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    expect(screen.getByLabelText("날짜")).toHaveValue("2026-10-02");
    expect(printedSelection()!.date).toBe("2026-10-02");

    fireEvent.change(screen.getByLabelText("날짜"), {
      target: { value: "" },
    });
    expect(printedSelection()).not.toHaveProperty("date");
  });

  it("인쇄할 지면을 고른다 — 학생지 · 채점표 · 전체(기본)", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    const group = screen.getByRole("group", { name: "인쇄할 지면" });
    const choice = (name: string) =>
      within(group).getByRole("button", { name });
    expect(choice("전체")).toHaveAttribute("aria-pressed", "true");
    expect(printUrl().searchParams.get("view")).toBe("both");

    fireEvent.click(choice("학생지"));
    expect(choice("학생지")).toHaveAttribute("aria-pressed", "true");
    expect(printUrl().searchParams.get("view")).toBe("student");

    fireEvent.click(choice("채점표"));
    expect(printUrl().searchParams.get("view")).toBe("key");
  });

  it("인쇄하기는 인쇄 창을 바로 띄우는 주소로 연다(Ctrl+P 없이)", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    expect(printUrl().searchParams.get("print")).toBe("1");
  });
});

describe("인쇄 · 미리보기", () => {
  it("아무것도 안 고르면 인쇄하기가 잠기고 미리보기는 안내 한 줄", () => {
    renderView();
    expect(screen.getByRole("button", { name: "인쇄하기" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "인쇄하기" })).toBeNull();
    expect(screen.queryByTestId("paper")).toBeNull();
    expect(
      screen.getByText("소단원과 형식을 고르면 지면이 나옵니다."),
    ).toBeInTheDocument();
  });

  it("인쇄 주소(새 창)가 decodeSelection 으로 고른 그대로 되돌아온다 — 제목 · 날짜 포함", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    fireEvent.change(count("완전 백지 개념 수 하"), { target: { value: "1" } });
    fireEvent.click(formSwitch("개념 지도"));
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "합동 복습" },
    });
    fireEvent.change(screen.getByLabelText("날짜"), {
      target: { value: "2026-10-01" },
    });

    const link = screen.getByRole("link", { name: "인쇄하기" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(printedSelection()).toEqual({
      sections: [S.cong, S.congProp, S.line, S.point],
      forms: [
        { form: "recall", counts: { 하: 1, 중: 3, 상: 1 }, extras: ZERO },
        {
          form: "term",
          counts: { 하: 2, 중: 3, 상: 1 },
          extras: { 하: 0, 중: 1, 상: 0 },
        },
        { form: "cloze", counts: { 하: 2, 중: 3, 상: 1 }, extras: ZERO },
        { form: "figure", counts: { 하: 1, 중: 1, 상: 0 }, extras: ZERO },
      ],
      title: "합동 복습",
      date: "2026-10-01",
    });
  });

  it("고른 차례와 상관없이 교육과정 순서로 싣는다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-1-6 반올림 알아보기와 어림의 활용"));
    fireEvent.click(box("2-1-1 이상과 이하 알아보기"));
    expect(printedSelection()!.sections).toEqual([S.atLeast, S.round]);
  });

  it("미리보기는 고른 지면을 그리고 학생지 · 채점표를 바꾼다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    const paper = screen.getByTestId("paper");
    expect(paper).toHaveTextContent("recall,term,cloze,map,figure");
    expect(paper).toHaveAttribute("data-view", "student");
    const preview = within(
      screen.getByRole("group", { name: "미리보기 지면" }),
    );
    const student = preview.getByRole("button", { name: "학생지" });
    const key = preview.getByRole("button", { name: "채점표" });
    expect(student).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(key);
    expect(key).toHaveAttribute("aria-pressed", "true");
    expect(student).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("paper")).toHaveAttribute("data-view", "key");
  });

  it("미리보기 지면에도 인쇄와 같은 지면 코드를 넘긴다(cb-code) — 제목을 바꿔도 코드는 그대로", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    const code = screen.getByTestId("paper").getAttribute("data-code");
    expect(code).toBe(encodeSheetCode(printedSelection()!, FIXTURE_BANK));
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "김철수 보충" },
    });
    expect(screen.getByTestId("paper")).toHaveAttribute("data-code", code!);
  });
});

describe("미리보기 축소 — A4 비율 그대로 칸에 맞춘다", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("지면의 제 폭이 칸보다 넓으면 가로 · 세로를 같은 배율로 줄이고, 좁으면 그대로 둔다", () => {
    let paperWidth = 794;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-paper-scale") ? paperWidth : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-paper-scale") ? 2246 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute("data-paper-desk") ? 397 : 0;
      },
    );
    const { unmount } = renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    const scaled = screen.getByTestId("paper").parentElement!;
    expect(scaled).toHaveAttribute("data-paper-scale");
    expect(scaled.style.transform).toBe("scale(0.5)");
    expect(scaled.parentElement!.style.width).toBe("397px");
    expect(scaled.parentElement!.style.height).toBe("1123px");
    unmount();

    paperWidth = 300;
    window.history.replaceState(null, "", "/#conceptBlank");
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    expect(screen.getByTestId("paper").parentElement!.style.transform).toBe("");
  });
});

describe("주소로 고르기 되살리기", () => {
  const saved: ConceptBlankSelection = {
    sections: [S.line, S.point],
    forms: [
      {
        form: "term",
        counts: { 하: 1, 중: 1, 상: 0 },
        extras: { 하: 0, 중: 1, 상: 0 },
      },
    ],
    title: "대칭",
  };

  it("?blank= 로 들어오면 고른 소단원 · 형식 · 수 · 제목을 되살린다", () => {
    window.history.replaceState(
      null,
      "",
      `/?blank=${encodeSelection(saved)}#conceptBlank`,
    );
    renderView();
    // 고른 학년은 펼쳐져 있다
    expect(tree().getByRole("button", { name: /^초5/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(box("2-3-3 선대칭도형과 그 성질 알아보기")).toBeChecked();
    expect(box("2-3-1 도형의 합동 알아보기")).not.toBeChecked();
    expect(formSwitch("용어 → 뜻")).toBeChecked();
    expect(formSwitch("완전 백지")).not.toBeChecked();
    expect(count("용어 → 뜻 용어 하").value).toBe("1");
    expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue("대칭");
    // 날짜를 안 실은 주소면 오늘(한국 시간)이 들어간다 — 원장님 2026-10-01 «디폴트 오늘 날짜»
    expect(printedSelection()).toEqual({
      ...saved,
      date: kstDateOf(new Date()),
    });
  });

  it("고르기를 바꾸면 주소가 따라오고, 화면을 떠나면 주소에서 지운다", () => {
    const { rerender } = renderView();
    openGrade("초5");
    fireEvent.click(box("2-3-3 선대칭도형과 그 성질 알아보기"));
    const code = new URL(window.location.href).searchParams.get("blank");
    expect(decodeSelection(code)?.sections).toEqual([S.line]);
    expect(window.location.hash).toBe("#conceptBlank");

    act(() => {
      rerender(<ConceptBlankView bank={FIXTURE_BANK} active={false} />);
    });
    expect(new URL(window.location.href).searchParams.has("blank")).toBe(false);
    act(() => {
      rerender(<ConceptBlankView bank={FIXTURE_BANK} active />);
    });
    expect(
      decodeSelection(new URL(window.location.href).searchParams.get("blank"))
        ?.sections,
    ).toEqual([S.line]);
  });

  it("망가진 주소는 무시하고 빈 고르기로 연다", () => {
    window.history.replaceState(null, "", "/?blank=%%%#conceptBlank");
    renderView();
    expect(screen.getByRole("button", { name: "인쇄하기" })).toBeDisabled();
  });
});
