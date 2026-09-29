/**
 * 오늘의 영어 지면 `EnglishPaper` (D-148 · 25 §5 · 브리프 english-print §3).
 *
 * 학생용엔 정답·해설이 없고 교사용엔 있다 · 서술형·원문 복원엔 답란 · 1단(`.paperParity` 없음) ·
 * 문항은 쪽에서 안 잘린다(`break-inside`) · 지문은 줄바꿈을 지킨다(`pre-wrap`) · **배점 글자가 없다**.
 *
 * ⚠️ vitest 는 CSS 를 안 읽는다(`css: false`) — 계산된 스타일로는 `break-inside`·`pre-wrap` 을 못 잰다.
 *    그래서 지면 규칙은 **CSS 원문**에서 그 클래스의 선언을 찾고, 그 클래스가 실제로 그 요소에 붙는지를 같이 본다.
 *    (D-141 울타리 셋과 같은 «원문 검사» 결 — 종이 검수는 절대 규칙 6 대로 `/dev/print-check` 에 남긴다.)
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnglishPaper } from "@/components/english/print/EnglishPaper";

import { SAMPLE_EXAM as EXAM, SAMPLE_SET } from "../fixtures/englishPrintSet";

function paper(view: "student" | "teacher", pages?: number[][]) {
  return render(
    <EnglishPaper
      academyName="오늘의수학"
      exam={EXAM}
      pages={pages}
      set={SAMPLE_SET}
      view={view}
    />,
  );
}

// 주석은 걷고 본다 — 머리말이 «안 쓰는 것»의 이름을 적어 두기 때문이다
const CSS = readFileSync(
  path.join(
    process.cwd(),
    "src/components/english/print/EnglishPrint.module.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** CSS 원문에서 `.클래스 { … }` 블록의 선언 본문을 꺼낸다 */
function cssBlock(className: string): string {
  const match = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(CSS);
  expect(match, `.${className} 규칙이 CSS 에 없다`).not.toBeNull();
  return match![1]!;
}

describe("EnglishPaper — 학생용 · 교사용", () => {
  it("학생용에는 정답·해설·근거 상자가 없다", () => {
    const { container } = paper("student");
    expect(container.querySelector("[data-english-teacher-box]")).toBeNull();
    expect(
      screen.queryByText(/함께 읽는 학생들이 더 오래 머문다는 관찰/),
    ).toBeNull();
    expect(screen.queryByText("정답")).toBeNull();
    expect(screen.queryByText("해설")).toBeNull();
  });

  it("교사용에는 문항마다 정답·해설·근거 상자가 있고, 객관식 정답은 보기 번호 글자로 찍힌다", () => {
    const { container } = paper("teacher");
    const boxes = container.querySelectorAll("[data-english-teacher-box]");
    expect(boxes).toHaveLength(4);
    const first = within(boxes[0] as HTMLElement);
    expect(first.getByText("정답")).toBeInTheDocument();
    expect(first.getByText("③")).toBeInTheDocument();
    expect(
      first.getByText(/함께 읽는 학생들이 더 오래 머문다는 관찰/),
    ).toBeInTheDocument();
    expect(
      first.getByText(
        "the students who read together stayed longer than those who read alone",
      ),
    ).toBeInTheDocument();
    // 서술형·원문 복원은 정답이 글이다
    const essay = within(boxes[2] as HTMLElement);
    expect(
      essay.getByText(
        "함께 읽는 학생들이 혼자 읽는 학생들보다 더 오래 머물렀다.",
      ),
    ).toBeInTheDocument();
    const cloze = within(boxes[3] as HTMLElement);
    expect(cloze.getByText("quietly")).toBeInTheDocument();
  });

  it("학생용 서술형·원문 복원에는 답란이 있고 객관식에는 없다 · 교사용에는 답란 대신 상자", () => {
    const { container, unmount } = paper("student");
    const blanks = container.querySelectorAll("[data-english-answer-blank]");
    expect(
      Array.from(blanks, (b) => b.getAttribute("data-english-answer-blank")),
    ).toEqual(["3", "4"]);
    // 답란 높이 50px 밑줄 — CSS 원문
    const blank = cssBlock("answerBlank");
    expect(blank).toMatch(/height:\s*50px/);
    expect(blank).toMatch(/border-bottom:\s*1px solid/);
    unmount();
    const teacher = paper("teacher");
    expect(
      teacher.container.querySelector("[data-english-answer-blank]"),
    ).toBeNull();
  });

  it("지면 종류에 따라 A4 경계의 종류가 갈린다 — 학생용 문제지 · 교사용 정답지", () => {
    const student = paper("student");
    expect(
      student.container.querySelector('[data-page-kind="questions"]'),
    ).not.toBeNull();
    expect(
      student.container.querySelector('[data-page-kind="answers"]'),
    ).toBeNull();
    student.unmount();
    const teacher = paper("teacher");
    expect(
      teacher.container.querySelector('[data-page-kind="answers"]'),
    ).not.toBeNull();
  });
});

describe("EnglishPaper — 지면 규칙", () => {
  it("1단이다 — 수학 2단 폭 `.paperParity` 가 없고 본문은 세로로 흐른다", () => {
    const { container } = paper("student");
    expect(container.querySelector(".paperParity")).toBeNull();
    expect(CSS).not.toMatch(
      /paperParity|PAPER_COLUMN_WIDTH|grid-template-columns:\s*1\.15fr/,
    );
    expect(cssBlock("body")).toMatch(/flex-direction:\s*column/);
  });

  it("문항과 지문 상자는 쪽 경계에서 갈리지 않는다 (`break-inside: avoid`) — 그리고 그 클래스가 실제로 붙는다", () => {
    const { container } = paper("student");
    // 🔴 `page-break-inside: avoid` 도 «break-inside» 글자를 담는다 — 앞에 `-` 가 없는 선언만 센다
    //    (변이 M2: `.question` 의 `break-inside` 만 지워도 초록이었다 — 2026-09-30)
    expect(cssBlock("question")).toMatch(/(?<![-\w])break-inside:\s*avoid/);
    expect(cssBlock("passageBox")).toMatch(/(?<![-\w])break-inside:\s*avoid/);
    const article = container.querySelector('[data-english-question="1"]');
    expect(article?.className).toMatch(/question/);
    expect(
      container.querySelector('[data-english-passage="first"]')?.className,
    ).toMatch(/passageBox/);
  });

  it("숨은 측정 틀은 인쇄 매체에서 `display: none` 이다 — 두 벌이 더 찍히지 않는다 (리드 검토 D3)", () => {
    // 화면에서는 화면 밖(fixed · visibility hidden), 인쇄에서는 아예 안 그린다
    expect(cssBlock("measureHost")).toMatch(/visibility:\s*hidden/);
    expect(CSS).toMatch(
      /@media print\s*\{\s*\.measureHost\s*\{[^}]*display:\s*none\s*!important/,
    );
  });

  it("지문은 줄바꿈을 지킨다 (`pre-wrap`) — 문단 안 줄바꿈이 글자 그대로 남고, 빈 줄은 문단을 가른다", () => {
    const { container } = paper("student");
    expect(cssBlock("passageText")).toMatch(/white-space:\s*pre-wrap/);
    expect(cssBlock("passageText")).toMatch(/font-size:\s*12pt/);
    expect(cssBlock("passageText")).toMatch(/line-height:\s*1\.9/);
    const paragraphs = container.querySelectorAll("[data-english-passage] p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]!.textContent).toContain("last spring.\nStudents come");
    expect(paragraphs[0]!.className).toMatch(/passageText/);
  });

  it("발문도 줄바꿈을 지킨다 — 원문 복원의 빈칸·힌트 줄이 발문에 있다", () => {
    const { container } = paper("student");
    expect(cssBlock("promptText")).toMatch(/white-space:\s*pre-wrap/);
    const cloze = container.querySelector('[data-english-question="4"]');
    expect(cloze?.textContent).toContain(
      "to read ________.\n(첫 글자: q, 7글자)",
    );
  });

  it("보기는 ①~⑤ 로 찍힌다", () => {
    const { container } = paper("student");
    const choices = within(
      container.querySelector('[data-english-question="1"]') as HTMLElement,
    ).getAllByRole("listitem");
    expect(choices.map((li) => li.textContent?.slice(0, 1))).toEqual([
      "①",
      "②",
      "③",
      "④",
      "⑤",
    ]);
  });

  it("🔴 배점 글자가 어디에도 없다 (원장님 ⑻ · D-28 결)", () => {
    for (const view of ["student", "teacher"] as const) {
      const { container, unmount } = paper(view);
      expect(container.textContent).not.toMatch(
        /배점|[0-9]\s*점|score|points?/i,
      );
      unmount();
    }
  });
});

describe("EnglishPaper — 머리 · 쪽", () => {
  it("첫 쪽 머리: «오늘의 영어 · 학원» | «학생용 · 검토 상태» · 세트 제목 · «학교 학년 · 시험» · 이름·날짜 줄", () => {
    const { container } = paper("student");
    const first = within(
      container.querySelector('[data-page-number="1"]') as HTMLElement,
    );
    expect(first.getByText("오늘의 영어 · 오늘의수학")).toBeInTheDocument();
    expect(first.getByText("학생용 · 검토 완료")).toBeInTheDocument();
    expect(
      first.getByRole("heading", { level: 1, name: "2학기 중간 대비 1차" }),
    ).toBeInTheDocument();
    expect(first.getByText("한빛중 중2 · 2학기 중간고사")).toBeInTheDocument();
    expect(first.getByText(/이름 _+ · 날짜/)).toBeInTheDocument();
  });

  it("교사용 머리는 «교사용 · 정답 및 해설 · 검토 상태»", () => {
    paper("teacher");
    expect(
      screen.getByText("교사용 · 정답 및 해설 · 검토 완료"),
    ).toBeInTheDocument();
  });

  it("`pages` 를 주면 그대로 쪽을 나눈다 — 둘째 쪽은 작은 머리 · 이어진 지문 상자 · 꼬리 쪽 번호", () => {
    // 블록: 0·1 지문 문단, 2~5 문항
    const { container } = paper("student", [[0], [1, 2, 3], [4, 5]]);
    const pages = container.querySelectorAll("[data-print-page]");
    expect(pages).toHaveLength(3);
    const second = within(pages[1] as HTMLElement);
    expect(
      second.getByText("오늘의 영어 · 2학기 중간 대비 1차"),
    ).toBeInTheDocument();
    expect(second.getByText("학생용 · p. 2")).toBeInTheDocument();
    expect(second.getByText("지문 (이어짐)")).toBeInTheDocument();
    expect(second.getByText("p. 2 / 3")).toBeInTheDocument();
    expect(pages[1]!.querySelectorAll("[data-english-question]")).toHaveLength(
      2,
    );
    expect(pages[2]!.querySelectorAll("[data-english-question]")).toHaveLength(
      2,
    );
    // 첫 쪽 지문 상자는 «지문»
    expect(
      within(pages[0] as HTMLElement).getByText("지문"),
    ).toBeInTheDocument();
  });

  it("`pages` 가 없으면 한 쪽에 전부 (재기 전·시험) · 빈 쪽은 머리·꼬리만", () => {
    const all = paper("student");
    expect(all.container.querySelectorAll("[data-print-page]")).toHaveLength(1);
    expect(
      all.container.querySelectorAll("[data-english-question]"),
    ).toHaveLength(4);
    all.unmount();
    const empty = paper("student", [[], []]);
    expect(empty.container.querySelectorAll("[data-print-page]")).toHaveLength(
      2,
    );
    expect(empty.container.querySelector("[data-english-question]")).toBeNull();
    expect(
      empty.container.querySelector('[data-english-body="2"]'),
    ).not.toBeNull();
  });
});
