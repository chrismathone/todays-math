/**
 * «개념 백지» 탭 화면(D-150 · 26 §4 · 브리프 cb-app) — 나무 · 형식 카드 다섯 · 미리보기 · 인쇄 주소.
 *
 * 은행은 props 로 넣는다 — 실제 은행(`bank/*.ts`)이 비어 있는 동안 시험은 `FIXTURE_BANK`(초5 두 단원).
 * 지면(`ConceptBlankPaper`)은 트랙 cb-paper 가 속을 만든다 — 여기서는 겉(props)만 보는 탐침으로 바꾼다.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

import ConceptBlankView from "@/components/concept-blank/ConceptBlankView";
import type { ConceptBlankPaperProps } from "@/components/concept-blank/ConceptBlankPaper";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { BLANK_TREE } from "@/lib/concept-blank/sections";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import { kstDateOf } from "@/lib/kstDate";

vi.mock("@/components/concept-blank/ConceptBlankPreview", () => ({
  default: function PaperProbe({ sheets, view, code }: ConceptBlankPaperProps) {
    return (
      <div data-code={code} data-testid="paper" data-view={view}>
        {sheets.map((sheet) => sheet.form).join(",")}
      </div>
    );
  },
}));

/** 학년 은행 늦게 불러오기(은행 3차) — 손으로 푸는 약속. 은행을 props 로 주는 시험은 부르지 않는다. */
const loads = vi.hoisted(() => ({
  calls: [] as string[],
  pending: new Map<string, (bank: unknown) => void>(),
  failing: new Map<string, (cause: unknown) => void>(),
}));
vi.mock("@/lib/concept-blank/bank/load", () => ({
  loadGradeBank: (grade: string) => {
    loads.calls.push(grade);
    return new Promise((resolve, reject) => {
      loads.pending.set(grade, resolve);
      loads.failing.set(grade, reject);
    });
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

// jsdom에는 모달 API가 없다. 실제 초점 잠금·복귀는 preview.spec.ts에서 브라우저로 확인한다.
const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() =>
  dialogMethods.forEach((name, i) => {
    const original = originalDialogMethods[i];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else
      delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)[name];
  }),
);

function renderView(active = true) {
  return render(<ConceptBlankView bank={FIXTURE_BANK} active={active} />);
}
const tree = () => {
  if (!screen.queryByRole("dialog", { name: "단원 선택" }))
    fireEvent.click(screen.getByRole("button", { name: "단원 고르기 열기" }));
  return within(screen.getByRole("region", { name: "단원 고르기" }));
};
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
function enableAvailableForms() {
  for (const toggle of screen.getAllByRole("switch")) {
    if (
      !(toggle as HTMLButtonElement).disabled &&
      toggle.getAttribute("aria-checked") !== "true"
    )
      fireEvent.click(toggle);
  }
}
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
    enableAvailableForms();
    expect(box("2-1-1 이상과 이하 알아보기")).toBeChecked();
    expect(box("2-1-2 초과와 미만 알아보기")).toBeChecked();
    expect(box("2-1-6 반올림 알아보기와 어림의 활용")).toBeChecked();
    expect(box("2-1-3 수의 범위를 알고 문제 해결하기")).not.toBeChecked();
    expect(box("2-1 수의 범위와 어림하기")).toBeChecked();

    fireEvent.click(box("2-1-2 초과와 미만 알아보기"));
    enableAvailableForms();
    expect(box("2-1 수의 범위와 어림하기")).toBePartiallyChecked();

    // 반쯤인 대단원을 누르면 전부 켠다, 다시 누르면 전부 끈다
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    enableAvailableForms();
    expect(box("2-1-2 초과와 미만 알아보기")).toBeChecked();
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    enableAvailableForms();
    expect(box("2-1-1 이상과 이하 알아보기")).not.toBeChecked();
    expect(box("2-1-6 반올림 알아보기와 어림의 활용")).not.toBeChecked();

    // 학년 단추가 고른 수를 보인다
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
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

it("새 고르기는 소단원을 골라도 형식이 모두 꺼지고 저장 · 인쇄 · 미리보기를 막는다", () => {
  render(<ConceptBlankView bank={FIXTURE_BANK} storageScope="owner-a" />);
  openGrade("초5");
  fireEvent.click(box("2-3 합동과 대칭"));
  for (const toggle of screen.getAllByRole("switch"))
    expect(toggle).not.toBeChecked();
  expect(screen.getByRole("button", { name: "인쇄하기" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "내 시험지에 저장" }),
  ).toBeDisabled();
  expect(screen.queryByTestId("paper")).toBeNull();
  expect(screen.getByText("형식을 하나 이상 켜세요.")).toBeInTheDocument();
});

describe("형식 카드 다섯", () => {
  it("다섯 카드가 서고, 소단원을 고르기 전에는 모두 꺼져 있다", () => {
    renderView();
    for (const label of [
      "완전 백지",
      "개념 질문",
      "문장 빈칸",
      "개념 지도",
      "그림 보고 쓰기",
    ]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      expect(formSwitch(label)).toBeDisabled();
    }
    expect(screen.getAllByText("소단원을 먼저 고르세요.").length).toBe(5);
  });

  it("숫자 칸의 처음 값은 10 — 재고가 더 많아도 10, 칸마다 따로(원장님 2026-10-01 «하/중/상 10문제씩»)", () => {
    const many = (level: "하" | "중", n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `fx-many-${level === "하" ? "low" : "mid"}-${i + 1}`,
        section: S.atLeast,
        term: `${level} 용어 ${i + 1}`,
        kind: "정의" as const,
        level,
        definition: `이 문장은 {${level} 핵심어 ${i + 1}}를 담은 뜻이다.`,
      }));
    const ox = Array.from({ length: 11 }, (_, i) => ({
      id: `fx-many-ox-${i + 1}`,
      section: S.atLeast,
      level: "하" as const,
      statement: `${i + 1}번째 ○× 문장이다.`,
      answer: true,
      why: "시험용 까닭이다.",
    }));
    const bank = {
      ...FIXTURE_BANK,
      concepts: [...FIXTURE_BANK.concepts, ...many("하", 12), ...many("중", 4)],
      ox: [...FIXTURE_BANK.ox, ...ox],
    };
    render(<ConceptBlankView bank={bank} active />);
    openGrade("초5");
    fireEvent.click(box("2-1-1 이상과 이하 알아보기"));
    enableAvailableForms();
    expect(count("완전 백지 개념 수 하").value).toBe("10");
    expect(
      Number(count("완전 백지 개념 수 하").getAttribute("max")),
    ).toBeGreaterThanOrEqual(12);
    expect(count("개념 질문 질문 하").value).toBe("10");
    expect(count("개념 질문 ○× 하").value).toBe("10");
    // 재고가 10 보다 적은 칸은 재고만큼
    const mid = Number(count("완전 백지 개념 수 중").getAttribute("max"));
    expect(mid).toBeLessThan(10);
    expect(count("완전 백지 개념 수 중").value).toBe(String(mid));
    // 인쇄 고르기에도 10 이 실린다
    expect(
      printedSelection()?.forms.find((f) => f.form === "term")?.counts.하,
    ).toBe(10);
  });

  it("재고가 10 보다 적으면 처음 값은 재고 전부이고, 재고를 넘지 못한다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
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
    expect(count("개념 질문 ○× 중").value).toBe("1");
    expect(count("개념 질문 ○× 하")).toBeDisabled();
    expect(count("문장 빈칸 적용 상").value).toBe("0");
    expect(count("그림 보고 쓰기 그림 하").value).toBe("1");
    expect(count("그림 보고 쓰기 그림 중").value).toBe("1");

    // 고른 소단원을 줄이면 최대도 따라 줄어든다
    fireEvent.click(box("2-3-1 도형의 합동 알아보기"));
    enableAvailableForms();
    expect(count("완전 백지 개념 수 하")).toHaveAttribute("max", "1");
    expect(Number(count("완전 백지 개념 수 하").value)).toBeLessThanOrEqual(1);
  });

  it("그림 문항이 없는 소단원만 고르면 E 는 꺼지고 까닭 한 줄 — 그림 소단원을 더하면 켜진다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-1 수의 범위와 어림하기"));
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
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
    enableAvailableForms();
    fireEvent.click(box("2-1-1 이상과 이하 알아보기"));
    enableAvailableForms();
    expect(printedSelection()!.sections).toEqual([S.atLeast, S.round]);
  });

  it("미리보기는 고른 지면을 그리고 학생지 · 채점표를 바꾼다", () => {
    renderView();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
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
    enableAvailableForms();
    const code = screen.getByTestId("paper").getAttribute("data-code");
    expect(code).toBe(encodeSheetCode(printedSelection()!, FIXTURE_BANK));
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "김철수 보충" },
    });
    expect(screen.getByTestId("paper")).toHaveAttribute("data-code", code!);
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
    expect(formSwitch("개념 질문")).toBeChecked();
    expect(formSwitch("완전 백지")).not.toBeChecked();
    expect(count("개념 질문 질문 하").value).toBe("1");
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
    enableAvailableForms();
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

// 원장님 2026-10-01 «개념 백지를 담아서 내 시험지에 저장하고 다음에 또 쓸수 있게»(26 §9 ⑾).
describe("내 시험지에 저장 · 다시 열기", () => {
  type Put = { url: string; body: Record<string, unknown> };
  const stored = (
    id: string,
    revision: number,
    selection: Omit<ConceptBlankSelection, "date">,
  ) => ({
    id,
    kind: "conceptBlank",
    title: selection.title ?? "합동과 대칭",
    payload: { selection },
    problemCount: 3,
    revision,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  });
  /**
   * 내 시험지 API 대역 — PUT 은 받은 것을 판을 하나 올려 돌려주고, GET 은 `docs` 에서 꺼낸다.
   * 서버처럼 판이 안 맞으면(지워졌거나 다른 곳에서 바뀐 자료) 409.
   */
  function cloud(docs: Record<string, ReturnType<typeof stored>> = {}) {
    const puts: Put[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const id = decodeURIComponent(url.split("/").pop()!.split("?")[0]!);
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body));
          puts.push({ url, body });
          if (
            body.expectedRevision &&
            docs[id]?.revision !== body.expectedRevision
          )
            return Response.json(
              { error: { message: "변경됨" } },
              { status: 409 },
            );
          const doc = {
            ...stored(
              id,
              (body.expectedRevision ?? 0) + 1,
              body.payload.selection,
            ),
            title: body.title,
          };
          docs[id] = doc;
          return Response.json({ data: doc });
        }
        return docs[id]
          ? Response.json({ data: docs[id] })
          : Response.json({ error: { message: "없음" } }, { status: 404 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    return { puts, fetchMock };
  }
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const saveButton = () =>
    screen.getByRole("button", { name: /내 시험지에 저장|저장됨|저장 중/ });

  it("지점 계정은 공개 확인 전에는 저장하지 않고 기본 비공개를 유지하며 공개 철회도 저장한다", async () => {
    const { puts } = cloud();
    render(
      <ConceptBlankView
        bank={FIXTURE_BANK}
        active
        storageScope="owner-a"
        branchId="30000000-0000-4000-8000-000000000003"
      />,
    );
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
    const button = screen.getByRole("button", {
      name: "우리학원 시험지에 저장",
    });
    fireEvent.click(button);
    expect(puts).toHaveLength(0);
    expect(screen.getByRole("radio", { name: "학원에 비공개" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(puts).toHaveLength(0);
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("radio", { name: "학원에 공개" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
    });
    expect(puts[0].body).toMatchObject({
      visibility: "branch",
      sharedBranchId: "30000000-0000-4000-8000-000000000003",
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("radio", { name: "학원에 비공개" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
    });
    expect(puts[1].body).toMatchObject({
      expectedRevision: 1,
      visibility: "private",
      sharedBranchId: null,
    });
  });

  it("내 시험지가 없으면(계정 범위 없음) 저장 단추가 없다", () => {
    renderView();
    expect(
      screen.queryByRole("button", { name: "내 시험지에 저장" }),
    ).not.toBeInTheDocument();
  });

  it("고르기를 날짜 없이 저장하고, 고치면 같은 자료에 다음 판으로 저장한다", async () => {
    const { puts } = cloud();
    render(
      <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
    );
    expect(saveButton()).toBeDisabled();
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
    expect(saveButton()).toHaveTextContent("내 시험지에 저장");
    expect(saveButton()).toBeEnabled();

    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts).toHaveLength(1);
    const first = puts[0]!;
    expect(first.url).toMatch(/^\/api\/library\/documents\/[A-Za-z0-9_-]+$/);
    expect(first.body.kind).toBe("conceptBlank");
    expect(first.body.title).toBe("합동과 대칭");
    expect(first.body.expectedRevision).toBeNull();
    const savedSelection = (
      first.body.payload as { selection: ConceptBlankSelection }
    ).selection;
    expect(savedSelection).not.toHaveProperty("date");
    expect(savedSelection.sections).toEqual(printedSelection()!.sections);
    expect(saveButton()).toHaveTextContent("저장됨");
    expect(saveButton()).toBeDisabled();
    expect(new URL(window.location.href).searchParams.get("blankDoc")).toBe(
      first.url.split("/").pop(),
    );

    // 날짜만 바꾸면 저장할 것이 없다(날짜는 담지 않는다)
    fireEvent.change(screen.getByLabelText("날짜"), {
      target: { value: "2026-12-24" },
    });
    expect(saveButton()).toHaveTextContent("저장됨");

    fireEvent.change(count("완전 백지 개념 수 하"), { target: { value: "1" } });
    expect(saveButton()).toHaveTextContent("내 시험지에 저장");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts).toHaveLength(2);
    expect(puts[1]!.url).toBe(first.url);
    expect(puts[1]!.body.expectedRevision).toBe(1);
    expect(saveButton()).toHaveTextContent("저장됨");
  });

  it("저장이 실패하면 까닭을 알리고 다시 누를 수 있다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "이 자료를 편집할 권한이 없습니다." } },
          { status: 403 },
        ),
      ),
    );
    render(
      <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
    );
    openGrade("초5");
    fireEvent.click(box("2-3 합동과 대칭"));
    enableAvailableForms();
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "이 자료를 편집할 권한이 없습니다.",
    );
    expect(saveButton()).toBeEnabled();
  });

  it("내 시험지에서 열면 그 고르기를 되살리고, 저장은 같은 자료에 한다", async () => {
    const selection = {
      sections: [S.line, S.point],
      forms: [
        {
          form: "term" as const,
          counts: { 하: 1, 중: 1, 상: 0 },
          extras: { 하: 0, 중: 1, 상: 0 },
        },
      ],
      title: "대칭 백지",
    };
    const { puts } = cloud({ "blank-1": stored("blank-1", 2, selection) });
    const { rerender } = render(
      <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
    );
    await act(async () => {
      rerender(
        <ConceptBlankView
          bank={FIXTURE_BANK}
          active
          storageScope="owner-a"
          openDocument={{ id: "blank-1", version: 1 }}
        />,
      );
    });
    expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
      "대칭 백지",
    );
    expect(box("2-3-3 선대칭도형과 그 성질 알아보기")).toBeChecked();
    expect(printedSelection()).toMatchObject({
      sections: [S.line, S.point],
      forms: selection.forms,
      title: "대칭 백지",
      date: kstDateOf(new Date()),
    });
    expect(saveButton()).toHaveTextContent("저장됨");

    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "대칭 백지 2" },
    });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts[0]!.url).toBe("/api/library/documents/blank-1");
    expect(puts[0]!.body.expectedRevision).toBe(2);
    expect(puts[0]!.body.title).toBe("대칭 백지 2");
  });

  it("열어 둔 자료를 내 시험지에서 지웠으면 새 자료로 저장한다", async () => {
    const selection = {
      sections: [S.cong],
      forms: [
        {
          form: "recall" as const,
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
      title: "합동",
    };
    const docs = { "blank-1": stored("blank-1", 3, selection) };
    const { puts } = cloud(docs);
    const { rerender } = render(
      <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
    );
    await act(async () => {
      rerender(
        <ConceptBlankView
          bank={FIXTURE_BANK}
          active
          storageScope="owner-a"
          openDocument={{ id: "blank-1", version: 1 }}
        />,
      );
    });
    Reflect.deleteProperty(docs, "blank-1");
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "합동 다시" },
    });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    const last = puts.at(-1)!;
    expect(last.url).not.toBe("/api/library/documents/blank-1");
    expect(last.body.expectedRevision).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(saveButton()).toHaveTextContent("저장됨");
  });

  // 리뷰(2026-10-01) — 개념 백지는 숨은 채 살아 있다. 내 시험지에서 이름을 바꾸거나 지우고 돌아오면 판이 낡는다.
  describe("내 시험지에서 바뀐 자료로 돌아오면", () => {
    const selection = {
      sections: [S.line],
      forms: [
        {
          form: "term" as const,
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
      title: "대칭",
    };
    async function openThenLeave(
      docs: Record<string, ReturnType<typeof stored>>,
    ) {
      const view = (active: boolean) => (
        <ConceptBlankView
          bank={FIXTURE_BANK}
          active={active}
          storageScope="owner-a"
          openDocument={{ id: "blank-1", version: 1 }}
        />
      );
      const utils = render(view(true));
      await act(async () => {});
      expect(saveButton()).toHaveTextContent("저장됨");
      act(() => {
        utils.rerender(view(false));
      });
      return async () => {
        await act(async () => {
          utils.rerender(view(true));
        });
      };
    }

    it("이름을 바꿨으면 새 이름 · 새 판을 받고 «저장됨» 그대로", async () => {
      const docs = { "blank-1": stored("blank-1", 2, selection) };
      const { puts } = cloud(docs);
      const back = await openThenLeave(docs);
      docs["blank-1"] = stored("blank-1", 3, {
        ...selection,
        title: "새 이름",
      });
      await back();
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
        "새 이름",
      );
      expect(saveButton()).toHaveTextContent("저장됨");
      fireEvent.change(count("개념 질문 질문 하"), { target: { value: "0" } });
      fireEvent.change(count("개념 질문 질문 상"), { target: { value: "1" } });
      await act(async () => {
        fireEvent.click(saveButton());
      });
      expect(puts.at(-1)!.body.expectedRevision).toBe(3);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("지웠으면 «저장됨»이 풀리고 주소의 자료 id 도 빠진다 — 저장은 새 자료로", async () => {
      const docs: Record<string, ReturnType<typeof stored>> = {
        "blank-1": stored("blank-1", 2, selection),
      };
      const { puts } = cloud(docs);
      const back = await openThenLeave(docs);
      Reflect.deleteProperty(docs, "blank-1");
      await back();
      expect(saveButton()).toHaveTextContent("내 시험지에 저장");
      expect(saveButton()).toBeEnabled();
      expect(new URL(window.location.href).searchParams.has("blankDoc")).toBe(
        false,
      );
      await act(async () => {
        fireEvent.click(saveButton());
      });
      expect(puts.at(-1)!.url).not.toBe("/api/library/documents/blank-1");
      expect(puts.at(-1)!.body.expectedRevision).toBeNull();
    });
  });

  it("다른 곳에서 먼저 저장해 판이 바뀌었으면 다시 읽고 알린다 — 한 번 더 누르면 지금 고르기로 저장", async () => {
    const selection = {
      sections: [S.line],
      forms: [
        {
          form: "term" as const,
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
    };
    const docs = { "blank-1": stored("blank-1", 2, selection) };
    const { puts } = cloud(docs);
    const { rerender } = render(
      <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
    );
    await act(async () => {
      rerender(
        <ConceptBlankView
          bank={FIXTURE_BANK}
          active
          storageScope="owner-a"
          openDocument={{ id: "blank-1", version: 1 }}
        />,
      );
    });
    // 다른 창이 상 1 로 저장해 판 3
    docs["blank-1"] = stored("blank-1", 3, {
      ...selection,
      forms: [{ ...selection.forms[0]!, counts: { 하: 0, 중: 0, 상: 1 } }],
    });
    fireEvent.change(screen.getByRole("textbox", { name: "제목" }), {
      target: { value: "이 창의 제목" },
    });
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts.at(-1)!.body.expectedRevision).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("다른 곳에서 바뀌어");
    expect(saveButton()).toBeEnabled();
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts.at(-1)!.body.expectedRevision).toBe(3);
    expect(puts.at(-1)!.body.title).toBe("이 창의 제목");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(saveButton()).toHaveTextContent("저장됨");
  });

  it.each([
    [403, "이 자료를 열 권한이 없습니다."],
    [404, "자료가 삭제되었거나 찾을 수 없습니다."],
    [503, "자료를 불러오지 못했습니다."],
  ] as const)(
    "direct document link explains %s, preserves its URL and retries the original document",
    async (status, message) => {
      const selection = {
        sections: [S.cong],
        forms: [
          {
            form: "recall" as const,
            counts: { 하: 1, 중: 0, 상: 0 },
            extras: { 하: 0, 중: 0, 상: 0 },
          },
        ],
      };
      const { puts } = cloud({ "blank-9": stored("blank-9", 4, selection) });
      const readBefore = globalThis.fetch;
      let failing = true;
      vi.stubGlobal(
        "fetch",
        async (input: RequestInfo | URL, init?: RequestInit) => {
          if (
            String(input).endsWith("/api/library/documents/blank-9") &&
            (!init?.method || init.method === "GET") &&
            failing
          )
            return Response.json(
              { error: { message: "자료 조회 실패" } },
              { status },
            );
          return readBefore(input, init);
        },
      );
      window.history.replaceState(null, "", "/?blankDoc=blank-9#conceptBlank");
      await act(async () => {
        render(
          <ConceptBlankView
            bank={FIXTURE_BANK}
            active
            storageScope="owner-a"
          />,
        );
      });
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(new URL(window.location.href).searchParams.get("blankDoc")).toBe(
        "blank-9",
      );
      expect(saveButton()).toBeDisabled();
      expect(
        screen.getByRole("link", { name: "자료 목록으로 돌아가기" }),
      ).toHaveAttribute("href", "/#library");
      failing = false;
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "자료 다시 불러오기" }),
        );
      });
      expect(
        screen.queryByRole("button", { name: "자료 다시 불러오기" }),
      ).not.toBeInTheDocument();
      expect(new URL(window.location.href).searchParams.get("blankDoc")).toBe(
        "blank-9",
      );
      expect(puts).toHaveLength(0);
    },
  );

  it("새로 고쳐도(주소의 blankDoc) 같은 자료에 이어서 저장한다", async () => {
    const selection = {
      sections: [S.cong],
      forms: [
        {
          form: "recall" as const,
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
    };
    const { puts } = cloud({ "blank-9": stored("blank-9", 4, selection) });
    window.history.replaceState(
      null,
      "",
      `/?blank=${encodeSelection({ ...selection, title: "고친 제목" })}&blankDoc=blank-9#conceptBlank`,
    );
    await act(async () => {
      render(
        <ConceptBlankView bank={FIXTURE_BANK} active storageScope="owner-a" />,
      );
    });
    // 주소의 고르기(아직 저장 안 한 고침)를 지우지 않는다
    expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue(
      "고친 제목",
    );
    expect(saveButton()).toHaveTextContent("내 시험지에 저장");
    await act(async () => {
      fireEvent.click(saveButton());
    });
    expect(puts[0]!.url).toBe("/api/library/documents/blank-9");
    expect(puts[0]!.body.expectedRevision).toBe(4);
  });
});

// 은행 3차로 문항이 열 배 — 화면은 은행 전체를 싣지 않고 학년마다 늦게 불러온다(`bank/load.ts`).
describe("학년 은행 늦게 불러오기", () => {
  beforeEach(() => {
    loads.calls.length = 0;
    loads.pending.clear();
    loads.failing.clear();
  });
  const gradeBank = (grade: string) => {
    const mine = <T extends { section: string }>(xs: T[]) =>
      xs.filter((x) => x.section.startsWith(`${grade}::`));
    return {
      concepts: mine(FIXTURE_BANK.concepts),
      ox: mine(FIXTURE_BANK.ox),
      apply: mine(FIXTURE_BANK.apply),
      figures: mine(FIXTURE_BANK.figures),
    };
  };
  const arrive = async (grade: string) => {
    await act(async () => {
      loads.pending.get(grade)!(gradeBank(grade));
    });
  };

  it("처음에는 아무 학년도 안 부르고, 펼친 학년만 부른다 — 오는 동안 소단원은 «불러오는 중»", async () => {
    render(<ConceptBlankView active />);
    expect(loads.calls).toEqual([]);
    openGrade("초5");
    expect(loads.calls).toEqual(["초5"]);
    expect(box("2-3-1 도형의 합동 알아보기")).toBeDisabled();
    expect(tree().getAllByText("불러오는 중").length).toBeGreaterThan(0);
    await arrive("초5");
    expect(box("2-3-1 도형의 합동 알아보기")).toBeEnabled();
    expect(tree().queryByText("불러오는 중")).not.toBeInTheDocument();
    // 접었다 펴도 다시 부르지 않는다
    fireEvent.click(tree().getByRole("button", { name: /^초5/ }));
    openGrade("초5");
    expect(loads.calls).toEqual(["초5"]);
  });

  // 리뷰(2026-10-01) — 은행이 없는 학년(초1 · 초2 · 고등)은 영영 «오는 중»이 아니다. 옛 주소에 섞여 있으면 전처럼 뺀다.
  it("은행이 없는 학년의 소단원은 기다리지 않고 뺀다", async () => {
    const grade1 = BLANK_TREE.find((g) => g.grade === "초1")!.chapters[0]!
      .sections[0]!.key;
    const code = encodeSelection({
      sections: [grade1, S.line],
      forms: [
        {
          form: "term",
          counts: { 하: 1, 중: 0, 상: 0 },
          extras: { 하: 0, 중: 0, 상: 0 },
        },
      ],
    });
    window.history.replaceState(null, "", `/?blank=${code}#conceptBlank`);
    render(<ConceptBlankView active />);
    expect(loads.calls).not.toContain("초1");
    await arrive("초5");
    expect(printedSelection()?.sections).toEqual([S.line]);
  });

  it("한 학년을 못 불러오면 알리고, 다시 부르다 오면 알림을 걷는다", async () => {
    render(<ConceptBlankView active />);
    openGrade("초5");
    await act(async () => {
      loads.failing.get("초5")!(new Error("chunk"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "은행을 불러오지 못했습니다",
    );
    // 다른 학년을 펼치면 못 온 학년도 다시 부른다(접힌 초5 는 고른 소단원이 없어 안 부른다 — 다시 펼친다)
    fireEvent.click(tree().getByRole("button", { name: /^초5/ }));
    openGrade("초5");
    expect(loads.calls.filter((g) => g === "초5")).toHaveLength(2);
    await arrive("초5");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(box("2-3-1 도형의 합동 알아보기")).toBeEnabled();
  });

  it("주소의 고르기는 그 학년이 올 때까지 지우지도 줄이지도 않는다", async () => {
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
    const code = encodeSelection(saved);
    window.history.replaceState(null, "", `/?blank=${code}#conceptBlank`);
    render(<ConceptBlankView active />);
    expect(loads.calls).toEqual(["초5"]);
    expect(new URL(window.location.href).searchParams.get("blank")).toBe(code);
    expect(screen.getByRole("button", { name: "인쇄하기" })).toBeDisabled();
    expect(screen.getByText("문항을 불러오는 중입니다.")).toBeInTheDocument();
    await arrive("초5");
    expect(printedSelection()).toEqual({
      ...saved,
      date: kstDateOf(new Date()),
    });
  });
});
