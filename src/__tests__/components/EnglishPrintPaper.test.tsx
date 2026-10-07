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
  it("prints composition numbers consistently on questions and answer blanks without changing source indices", () => {
    const { container } = render(
      <EnglishPaper
        academyName="학습 자료"
        exam={EXAM}
        set={SAMPLE_SET}
        view="student"
        questionNumbers={[2, 5, 8, 9]}
        bundle={{ no: 2, questions: [2, 3], passage: false }}
      />,
    );
    expect(
      Array.from(
        container.querySelectorAll("[data-english-question]"),
        (node) => node.getAttribute("data-english-question"),
      ),
    ).toEqual(["8", "9"]);
    expect(
      Array.from(
        container.querySelectorAll("[data-english-answer-blank]"),
        (node) => node.getAttribute("data-english-answer-blank"),
      ),
    ).toEqual(["8", "9"]);
    expect(container.querySelector("[data-english-teacher-box]")).toBeNull();
    expect(screen.getByText(/문제 묶음 2.*8~9번/)).toBeVisible();
  });
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

  it("번호뿐인 보기 — 발문에 자리가 다 있으면 보기 줄을 찍지 않고, 겹친 «① ①» 이 어디에도 없다 (25 §12.12 「3」)", () => {
    const insertion = {
      type: "문장 삽입" as const,
      prompt:
        "주어진 문장이 들어가기에 가장 적절한 곳은?\n[주어진 문장] So we waited.\n( ① ) One. ( ② ) Two. ( ③ ) Three. ( ④ ) Four. ( ⑤ ) Five.",
      options: ["①", "②", "③", "④", "⑤"],
      answer: "3",
      explanation: "셋째 자리",
      evidence: "So we waited.",
    };
    const grammar = {
      type: "어법" as const,
      prompt: "다음 중 어법상 틀린 것은?",
      options: ["① grow", "② grows", "③ grew", "④ grown", "⑤ growing"],
      answer: "2",
      explanation: "수 일치",
      evidence: "They grow.",
    };
    for (const view of ["student", "teacher"] as const) {
      const { container, unmount } = render(
        <EnglishPaper
          academyName="오늘의수학"
          exam={EXAM}
          set={{ ...SAMPLE_SET, questions: [insertion, grammar] }}
          view={view}
        />,
      );
      const first = container.querySelector(
        '[data-english-question="1"]',
      ) as HTMLElement;
      expect(within(first).queryByRole("list")).toBeNull();
      const second = container.querySelector(
        '[data-english-question="2"]',
      ) as HTMLElement;
      expect(
        within(second)
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual(["①grow", "②grows", "③grew", "④grown", "⑤growing"]);
      expect(container.textContent).not.toMatch(/([①-⑤])\s*\1/);
      // 교사용 정답 상자는 그대로
      if (view === "teacher")
        expect(
          within(first).getByRole("region", { name: "1번 정답 및 해설" }),
        ).toHaveTextContent("③");
      unmount();
    }
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

describe("EnglishPaper — 묶음 · 어법의 밑줄 · 교사용 안내 (D-151 · 25 §12.11)", () => {
  // 표본 세트의 문항: 1 주제 · 2 어법 · 3 서술형 · 4 원문 복원
  const UNDERLINED = {
    ...SAMPLE_SET,
    questions: SAMPLE_SET.questions.map((question) =>
      question.type === "어법"
        ? {
            ...question,
            prompt:
              "밑줄 친 ①~② 가운데 어법상 틀린 것은?\nThe library ①<u>opened</u> a room where students ②<u>reads\nquietly</u>.",
          }
        : question,
    ),
  };
  const bundled = (
    view: "student" | "teacher",
    bundle: { no: number | null; questions: number[]; passage: boolean },
    extra: { pages?: number[][]; set?: typeof SAMPLE_SET } = {},
  ) =>
    render(
      <EnglishPaper
        academyName="오늘의수학"
        bundle={bundle}
        exam={EXAM}
        pages={extra.pages}
        set={extra.set ?? SAMPLE_SET}
        teacherNotes={[
          {
            label: "배부 순서",
            text: "묶음 1(2, 4번) → 걷은 뒤 묶음 2(1, 3번)",
          },
          { label: "답이 보이는 문항", text: "검사에서 찾은 누출 없음" },
        ]}
        view={view}
      />,
    );
  const numbers = (container: Element) =>
    [...container.querySelectorAll("[data-english-question]")].map((node) =>
      node.getAttribute("data-english-question"),
    );

  it("🔴 변형 묶음은 원 지문 상자 없이 그 묶음의 문항만 싣는다 — 문항 번호는 세트 번호 그대로", () => {
    const { container } = bundled("student", {
      no: 1,
      questions: [1, 3],
      passage: false,
    });
    expect(container.querySelector("[data-english-passage]")).toBeNull();
    expect(numbers(container)).toEqual(["2", "4"]);
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.queryByText("1.")).toBeNull();
  });

  it("독해 묶음은 원 지문 상자와 독해형 문항을 싣는다", () => {
    const { container } = bundled("student", {
      no: 2,
      questions: [0, 2],
      passage: true,
    });
    expect(container.querySelector("[data-english-passage]")).not.toBeNull();
    expect(numbers(container)).toEqual(["1", "3"]);
  });

  it("머리의 묶음 줄 «문제 묶음 1 · 2, 4번» — 시험 줄 아래 · «학생용 · 검토 상태» 딱지는 그대로", () => {
    const { container } = bundled("student", {
      no: 1,
      questions: [1, 3],
      passage: false,
    });
    const line = screen.getByText("문제 묶음 1 · 2, 4번");
    expect(line.className).toMatch(/bundleLine/);
    expect(screen.getByText("학생용 · 검토 완료")).toBeInTheDocument();
    // 시험 줄 다음, 이름 줄 앞
    const head = container.querySelector("header")!;
    const order = [...head.children].map((node) => node.textContent);
    expect(order.indexOf("문제 묶음 1 · 2, 4번")).toBe(
      order.indexOf("한빛중 중2 · 2학기 중간고사") + 1,
    );
    const block = cssBlock("bundleLine");
    expect(block).toMatch(/font-size:\s*13px/);
    expect(block).toMatch(/font-weight:\s*700/);
    expect(block).toMatch(/font-family:\s*var\(--paper-font-sans\)/);
  });

  it("묶음이 하나뿐이면(번호 없음) 묶음 줄을 찍지 않는다 — 가른 것이 없다", () => {
    bundled("student", { no: null, questions: [0, 1, 2, 3], passage: true });
    expect(screen.queryByText(/문제 묶음/)).toBeNull();
  });

  it("이어지는 쪽 머리는 «문제 묶음 1 · p. 2»", () => {
    // 블록: 0 → 2번 문항, 1 → 4번 문항 (원 지문 없음)
    const { container } = bundled(
      "student",
      { no: 1, questions: [1, 3], passage: false },
      { pages: [[0], [1]] },
    );
    const pages = container.querySelectorAll("[data-print-page]");
    expect(pages).toHaveLength(2);
    expect(
      within(pages[1] as HTMLElement).getByText("문제 묶음 1 · p. 2"),
    ).toBeInTheDocument();
    expect(numbers(pages[1]!)).toEqual(["4"]);
  });

  it("🔴 교사용은 학생용 묶음과 관계없이 모든 문항과 원 지문을 싣는다 — 묶음 줄 없음", () => {
    const { container } = bundled("teacher", {
      no: 1,
      questions: [1, 3],
      passage: false,
    });
    expect(container.querySelector("[data-english-passage]")).not.toBeNull();
    expect(numbers(container)).toEqual(["1", "2", "3", "4"]);
    expect(screen.queryByText(/문제 묶음 1 ·/)).toBeNull();
  });

  it("교사용 첫 쪽 머리에 안내 줄(배부 순서 · 답이 보이는 문항) — 학생 종이에는 없다", () => {
    const teacher = bundled(
      "teacher",
      { no: 1, questions: [1, 3], passage: false },
      {
        pages: [
          [0, 1, 2],
          [3, 4, 5],
        ],
      },
    );
    const pages = teacher.container.querySelectorAll("[data-print-page]");
    const first = within(pages[0] as HTMLElement);
    expect(first.getByText("배부 순서")).toBeInTheDocument();
    expect(
      first.getByText("묶음 1(2, 4번) → 걷은 뒤 묶음 2(1, 3번)"),
    ).toBeInTheDocument();
    expect(first.getByText("답이 보이는 문항")).toBeInTheDocument();
    expect(first.getByText("검사에서 찾은 누출 없음")).toBeInTheDocument();
    expect(within(pages[1] as HTMLElement).queryByText("배부 순서")).toBeNull();
    teacher.unmount();

    bundled("student", { no: 1, questions: [1, 3], passage: false });
    expect(screen.queryByText("배부 순서")).toBeNull();
    expect(screen.queryByText(/걷은 뒤/)).toBeNull();
  });

  it("🔴 어법의 `<u>` 표기는 밑줄로 그린다 — 꺾쇠가 종이에 안 남고 번호는 선 밖, 줄이 바뀐 구간도 한 밑줄", () => {
    const { container } = bundled(
      "student",
      { no: 1, questions: [1, 3], passage: false },
      { set: UNDERLINED },
    );
    const question = container.querySelector('[data-english-question="2"]')!;
    const lines = [...question.querySelectorAll("u")];
    expect(lines.map((node) => node.textContent)).toEqual([
      "opened",
      "reads\nquietly",
    ]);
    expect(lines.every((node) => /underline/.test(node.className))).toBe(true);
    expect(question.textContent).not.toMatch(/<\/?u>/);
    expect(question.textContent).toContain("①opened");
    const block = cssBlock("underline");
    expect(block).toMatch(/text-decoration-line:\s*underline/);
    expect(block).toMatch(/text-decoration-thickness:\s*1px/);
    expect(block).toMatch(/text-underline-offset:\s*0\.3em/);
    // 내림 글자에서 선을 끊으면 밑줄 구간의 끝이 모호해진다
    expect(block).toMatch(/text-decoration-skip-ink:\s*none/);
  });

  it("교사용도 같은 밑줄을 그린다", () => {
    const { container } = bundled(
      "teacher",
      { no: 1, questions: [1, 3], passage: false },
      { set: UNDERLINED },
    );
    expect(
      container.querySelectorAll('[data-english-question="2"] u'),
    ).toHaveLength(2);
  });

  it("짝이 안 맞는 표기는 글자 그대로 — 어디까지가 밑줄인지 지어내지 않는다", () => {
    const broken = {
      ...SAMPLE_SET,
      questions: SAMPLE_SET.questions.map((question) =>
        question.type === "어법"
          ? { ...question, prompt: "A ①<u>opened B ②<u>reads</u>" }
          : question,
      ),
    };
    const { container } = bundled(
      "teacher",
      { no: null, questions: [0, 1, 2, 3], passage: true },
      { set: broken },
    );
    const question = container.querySelector('[data-english-question="2"]')!;
    expect(question.querySelector("u")).toBeNull();
    expect(question.textContent).toContain("A ①<u>opened B ②<u>reads</u>");
  });

  it("다른 유형에 섞인 표기는 글자로 찍는다 — 밑줄은 어법 문항만", () => {
    const mixed = {
      ...SAMPLE_SET,
      questions: SAMPLE_SET.questions.map((question) =>
        question.type === "서술형"
          ? { ...question, prompt: "밑줄 친 <u>this</u> 를 설명하시오." }
          : question,
      ),
    };
    const { container } = bundled(
      "student",
      { no: null, questions: [0, 1, 2, 3], passage: true },
      { set: mixed },
    );
    const question = container.querySelector('[data-english-question="3"]')!;
    expect(question.querySelector("u")).toBeNull();
    expect(question.textContent).toContain("<u>this</u>");
  });

  it("어휘 문항의 ①<u> 는 밑줄로 그리고, 번호뿐인 보기는 줄을 찍지 않는다", () => {
    const vocab = {
      ...SAMPLE_SET,
      questions: SAMPLE_SET.questions.map((question) =>
        question.type === "어법"
          ? {
              ...question,
              type: "어휘" as const,
              prompt:
                "밑줄 친 부분 중 어휘상 틀린 것은?\nGroups ①<u>took</u> turns, ②<u>recorded</u> height, ③<u>appeared</u> early, ④<u>looking</u> up, ⑤<u>avoided</u> spray.",
              options: ["①", "②", "③", "④", "⑤"],
            }
          : question,
      ),
    };
    const { container } = bundled(
      "student",
      { no: null, questions: [0, 1, 2, 3], passage: true },
      { set: vocab },
    );
    const question = container.querySelector(
      '[data-english-question="2"]',
    ) as HTMLElement;
    expect(question.querySelectorAll("u")).toHaveLength(5);
    expect(question.textContent).not.toContain("<u>");
    expect(within(question).queryByRole("list")).toBeNull();
    expect(question.textContent).not.toContain("① ①");
  });
});

describe("EnglishPaper — 유형 확장 (D-158 · 25 §13)", () => {
  const second = SAMPLE_SET.passage.split(". ")[0] + ".";
  const expanded = {
    ...SAMPLE_SET,
    questions: [
      {
        type: "언급 없음" as const,
        prompt: "윗글을 읽고 알 수 없는 것은?",
        options: ["첫째 항목", "둘째 항목", "셋째 항목", "넷째 항목"],
        answer: "4",
        explanation: "넷째 항목은 글에 없습니다.",
        evidence: second,
      },
      {
        type: "해석" as const,
        prompt: `다음 문장을 우리말로 해석하시오.\n${second}`,
        options: [],
        answer: "우리말 모범 해석",
        explanation: "끊어 읽기",
        evidence: second,
      },
      {
        type: "공통 빈칸" as const,
        prompt:
          "빈칸에 공통으로 들어갈 말을 쓰시오.\n① I think ________ it is true.\n② The book ________ I read was long.",
        options: [],
        answer: "that",
        explanation: "① 접속사 ② 관계대명사",
        evidence: second,
      },
    ],
  };
  const sheet = (view: "student" | "teacher") =>
    render(
      <EnglishPaper
        academyName="오늘의수학"
        exam={EXAM}
        set={expanded}
        view={view}
      />,
    );

  it("«언급 없음»의 보기 넷은 ①~④ 네 줄로 찍힌다 — 다섯째 줄이 생기지 않는다", () => {
    sheet("student");
    const choices = screen.getByRole("list", { name: "1번 보기" });
    expect(
      within(choices)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["①첫째 항목", "②둘째 항목", "③셋째 항목", "④넷째 항목"]);
  });

  it("보기 없는 새 유형은 서술형과 같은 종이다 — 학생용 답란 · 교사용 정답 글", () => {
    const student = sheet("student");
    expect(
      Array.from(
        student.container.querySelectorAll("[data-english-answer-blank]"),
        (b) => b.getAttribute("data-english-answer-blank"),
      ),
    ).toEqual(["2", "3"]);
    student.unmount();
    const teacher = sheet("teacher");
    const boxes = teacher.container.querySelectorAll(
      "[data-english-teacher-box]",
    );
    expect(within(boxes[0] as HTMLElement).getByText("④")).toBeInTheDocument();
    expect(
      within(boxes[1] as HTMLElement).getByText("우리말 모범 해석"),
    ).toBeInTheDocument();
    expect(
      within(boxes[2] as HTMLElement).getByText("that"),
    ).toBeInTheDocument();
  });
});
