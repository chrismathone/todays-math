// @vitest-environment jsdom
/**
 * P3·P4·P5 content rendering: source concept rows, the three memory sheets over one row list,
 * standalone error/term activities, and ruled problem workspaces. All text here is synthetic.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type {
  TextbookSemantic,
  TextbookSemanticRow,
} from "@/contracts/textbookSemantic.contract";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import {
  commonRecallRowHeights,
  recallDisplayRows,
  v15TexToMarkdown,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const base = {
  id: "b1",
  sourceBlockId: "b1",
  unitKey: "U01",
  sectionKey: "s1",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;

/** Hidden keys: a nested-brace fraction, "크다", and a whole phrase. */
const sourceRows: TextbookSemanticRow[] = [
  {
    rowKey: "U01.C01.r1",
    label: "뜻",
    rawText:
      "두 수의 합은 {{[[\\frac{1}{\\sqrt{2}}]]}}보다 {{크다}}. 단, [[x\\ne0]]이다.",
    textFormat: "v15-tex",
  },
  {
    rowKey: "U01.C01.r2",
    label: "구별",
    rawText: "짝수는 {{둘로 나누어떨어지는 수}}이다.",
    textFormat: "v15-tex",
  },
  {
    rowKey: "U01.C01.r3",
    label: "예",
    rawText: "[[2+2=4]]는 덧셈의 계산이다.",
    textFormat: "v15-tex",
  },
];
const bankRows: TextbookSemanticRow[] = [
  {
    rowKey: "e5.x.definition",
    label: "약수",
    rawText:
      "어떤 수를 {나누어떨어지게} 하는 수 $a$ 는 {$\\frac{b}{c}$} 꼴이 아니다.",
    textFormat: "bank-blank",
  },
];

type Extra = {
  answersVisible?: boolean;
  memoryPhases?: RecallPhase[];
  rowHeightsMm?: Record<string, number>;
  relativePageIndex?: number;
  continuation?: boolean;
  repetitionChecks?: boolean;
};
/** The model keeps the legacy pieces: a blank marks hidden text in the student variant. */
function memory(
  phase: RecallPhase,
  variant: "student" | "answers",
  extra: Extra = {},
  node: TextbookSemantic["node"] = {
    kind: "concept",
    conceptId: "C01",
    title: "합과 짝수",
    rows: sourceRows,
  },
): RenderBlock {
  const hidden = variant === "student" && phase !== "study";
  return {
    ...base,
    kind: "recall",
    phase,
    pieces: hidden
      ? [
          { kind: "text", markdown: "공개" },
          {
            kind: "blank",
            scope: phase === "sentences" ? "sentence" : "keyword",
          },
        ]
      : [{ kind: "text", markdown: "공개" }],
    repetitionChecks: phase === "study",
    semantic: { activity: ACTIVITY[phase], title: "개념 정리", node },
    ...extra,
  } as RenderBlock;
}
const render = (block: RenderBlock) => renderBlockHtml(block, resources);

describe("memory sheets share one immutable row list", () => {
  it("keeps row keys, order, group and line count identical in all three phases", () => {
    const sheets = PHASES.map((phase) =>
      parse(render(memory(phase, "student"))),
    );
    const describeRows = (dom: Document) =>
      Array.from(dom.querySelectorAll<HTMLElement>("[data-row-key]")).map(
        (row) => [
          row.dataset.rowKey,
          row.dataset.rowGroup,
          row.dataset.conceptId,
          row.style.getPropertyValue("--tb-row-lines"),
          row.querySelector(".tb-memory-label")?.textContent,
        ],
      );
    expect(describeRows(sheets[0])).toEqual([
      ["U01.C01.r1", "C01", "C01", "1", "뜻"],
      ["U01.C01.r2", "C01", "C01", "1", "구별"],
      ["U01.C01.r3", "C01", "C01", "1", "예"],
    ]);
    expect(describeRows(sheets[1])).toEqual(describeRows(sheets[0]));
    expect(describeRows(sheets[2])).toEqual(describeRows(sheets[0]));
    sheets.forEach((dom, i) => {
      expect(
        Array.from(dom.querySelectorAll<HTMLElement>("[data-row-key]")).every(
          (row) => row.dataset.phase === PHASES[i],
        ),
      ).toBe(true);
      expect(dom.querySelector(".tb-memory")?.getAttribute("data-phase")).toBe(
        PHASES[i],
      );
      expect(dom.querySelector(".tb-memory-code")?.textContent).toBe("C01");
      expect(dom.querySelector(".tb-memory-title b")?.textContent).toBe(
        "합과 짝수",
      );
    });
  });

  it("never serializes a hidden keyword in the student keyword sheet", () => {
    const html = render(memory("keywords", "student"));
    const dom = parse(html);
    for (const secret of ["크다", "둘로 나누어떨어지는 수", "sqrt"])
      expect(html).not.toContain(secret);
    const rows = dom.querySelectorAll(".tb-memory-row");
    const blanks = rows[0].querySelectorAll(".tb-blank-keyword");
    expect(blanks).toHaveLength(2);
    blanks.forEach((blank) => {
      expect(blank.textContent).toBe("");
      expect(blank.children).toHaveLength(0);
      expect((blank as HTMLElement).style.width).toMatch(/^\d+(\.\d)?em$/);
    });
    // Only the public condition is typeset; the hidden fraction is not.
    expect(rows[0].querySelectorAll("[data-textbook-math]")).toHaveLength(1);
    expect(rows[0].textContent).toContain("두 수의 합은");
    expect(rows[1].querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
    // A row without a keyword stays fully readable.
    expect(rows[2].querySelectorAll(".tb-blank")).toHaveLength(0);
    expect(rows[2].textContent).toContain("덧셈의 계산이다");
  });

  it("widens a keyword blank with its hidden length, without the text", () => {
    const [short, long] = recallDisplayRows(
      [
        { rowKey: "a", label: "", rawText: "{{가}}", textFormat: "v15-tex" },
        {
          rowKey: "b",
          label: "",
          rawText: "{{가나다라마바사아자차}}",
          textFormat: "v15-tex",
        },
      ],
      "keywords",
      false,
    ).map((row) => row.pieces[0]);
    expect(short).toEqual({ kind: "blank", widthEm: 2 });
    expect(long).toEqual({ kind: "blank", widthEm: 10.6 });
    expect(JSON.stringify([short, long])).not.toMatch(/[가-힣]/);
  });

  it("replaces every sentence body with ruled lines and no text in the student sheet", () => {
    const html = render(memory("sentences", "student"));
    const dom = parse(html);
    for (const secret of ["합은", "크다", "나누어떨어지는", "덧셈", "ne0"])
      expect(html).not.toContain(secret);
    expect(dom.querySelectorAll("[data-textbook-math]")).toHaveLength(0);
    dom.querySelectorAll(".tb-memory-row").forEach((row) => {
      expect(row.querySelector(".tb-memory-body")?.textContent).toBe("");
      expect(row.querySelector(".tb-memory-label")?.textContent).not.toBe("");
      const space = row.querySelector(".tb-blank-sentence")!;
      expect(space.querySelectorAll(".tb-write-line")).toHaveLength(1);
      expect(space.getAttribute("aria-label")).toBe("문장으로 개념 쓰기");
    });
  });

  it("shows keywords and sentences to the answer variant only", () => {
    const keywords = parse(render(memory("keywords", "answers")));
    expect(
      Array.from(keywords.querySelectorAll(".tb-memory-key")).map(
        (key) => key.textContent,
      ),
    ).toContain("크다");
    expect(keywords.querySelectorAll(".tb-blank")).toHaveLength(0);
    const sentences = parse(render(memory("sentences", "answers")));
    expect(sentences.querySelector(".tb-memory-body")?.textContent).toContain(
      "두 수의 합은",
    );
    expect(sentences.querySelectorAll(".tb-blank")).toHaveLength(0);
    // The explicit flag overrides the inference in both directions.
    const forcedHidden = render(
      memory("keywords", "answers", { answersVisible: false }),
    );
    expect(forcedHidden).not.toContain("크다");
    const forcedShown = render(
      memory("keywords", "student", { answersVisible: true }),
    );
    expect(forcedShown).toContain("크다");
  });

  it("prints the repetition marks on the study sheet only", () => {
    expect(
      parse(render(memory("study", "student"))).querySelectorAll(
        ".tb-memory-rounds i",
      ),
    ).toHaveLength(4);
    for (const phase of ["keywords", "sentences"] as const)
      expect(
        parse(
          render(memory(phase, "student", { repetitionChecks: true })),
        ).querySelector(".tb-memory-rounds"),
      ).toBeNull();
    expect(
      parse(
        render(memory("study", "student", { repetitionChecks: false })),
      ).querySelector(".tb-memory-rounds"),
    ).toBeNull();
  });

  it("names only enabled phases in the tab strip, and none when the model is silent", () => {
    const silent = parse(render(memory("keywords", "student")));
    expect(silent.querySelector(".tb-recall-phases")).toBeNull();
    expect(silent.querySelector(".tb-recall-checkbar b")?.textContent).toBe(
      "빈칸에 알맞은 내용을 쓰시오.",
    );
    const two = parse(
      render(
        memory("sentences", "student", {
          memoryPhases: ["keywords", "sentences"],
        }),
      ),
    );
    expect(
      Array.from(two.querySelectorAll(".tb-recall-phases span")).map(
        (tab) => tab.textContent,
      ),
    ).toEqual(["01 빈칸개념암기", "02 통문장개념암기"]);
    expect(two.querySelector('[aria-current="step"]')?.textContent).toBe(
      "02 통문장개념암기",
    );
    expect(two.body.textContent).not.toContain("개념학습");
    const single = parse(
      render(memory("study", "student", { memoryPhases: ["study"] })),
    );
    expect(single.querySelector(".tb-recall-phases")).toBeNull();
  });

  it("omits the instruction on a continuation and keeps the rows", () => {
    const dom = parse(
      render(memory("study", "student", { continuation: true })),
    );
    expect(dom.querySelector(".tb-recall-checkbar")).toBeNull();
    expect(dom.querySelector(".tb-recall-phases")).toBeNull();
    expect(dom.querySelectorAll("[data-row-key]")).toHaveLength(3);
  });

  it("applies one measured height per row to every phase", () => {
    const rowHeightsMm = { "U01.C01.r1": 16.4, "U01.C01.r2": 9.2 };
    const heights = PHASES.map((phase) =>
      Array.from(
        parse(
          render(
            memory(phase, "student", { rowHeightsMm, relativePageIndex: 1 }),
          ),
        ).querySelectorAll<HTMLElement>("[data-row-key]"),
      ).map((row) => [
        row.style.height,
        row.classList.contains("tb-memory-row-measured"),
        row.dataset.relativePageIndex,
      ]),
    );
    expect(heights[0]).toEqual([
      ["16.4mm", true, "1"],
      ["9.2mm", true, "1"],
      ["", false, "1"],
    ]);
    expect(heights[1]).toEqual(heights[0]);
    expect(heights[2]).toEqual(heights[0]);
    // 16.4mm holds two 7mm lines above the row padding; 9.2mm holds one.
    const sentence = parse(
      render(memory("sentences", "student", { rowHeightsMm })),
    ).querySelectorAll(".tb-blank-sentence");
    expect(sentence[0].querySelectorAll(".tb-write-line")).toHaveLength(2);
    expect(sentence[1].querySelectorAll(".tb-write-line")).toHaveLength(1);
  });

  it("takes the tallest measurement of each row as the common height", () => {
    expect(
      commonRecallRowHeights([
        { rowKey: "a", heightMm: 9.2 },
        { rowKey: "b", heightMm: 9.2 },
        { rowKey: "a", heightMm: 16.141 },
        { rowKey: "a", heightMm: 9.2 },
      ]),
    ).toEqual({ a: 16.2, b: 9.2 });
  });

  it("marks writing space and anchors for the independent geometry check", () => {
    const dom = parse(render(memory("keywords", "student")));
    expect(
      dom.querySelectorAll('.tb-blank[data-writing-space="keyword"]'),
    ).toHaveLength(dom.querySelectorAll(".tb-blank").length);
    expect(dom.querySelectorAll('[data-anchor="row-label"]')).toHaveLength(3);
    expect(dom.querySelectorAll('[data-anchor="row-body"]')).toHaveLength(3);
    expect(dom.querySelector('[data-anchor="memory-title"]')).not.toBeNull();
    expect(
      parse(render(memory("sentences", "student"))).querySelectorAll(
        '.tb-blank-sentence[data-writing-space="sentence"]',
      ),
    ).toHaveLength(3);
  });

  it("gives long rows the same number of lines in every phase", () => {
    const long: TextbookSemanticRow = {
      rowKey: "long",
      label: "성질",
      rawText: `${"가나다라마바사아자차 ".repeat(9)}{{끝}}`,
      textFormat: "v15-tex",
    };
    const lines = PHASES.map(
      (phase) => recallDisplayRows([long], phase, false)[0].lines,
    );
    expect(lines).toEqual([3, 3, 3]);
    expect(
      parse(
        render(
          memory("sentences", "student", {}, { kind: "rows", rows: [long] }),
        ),
      ).querySelectorAll(".tb-write-line"),
    ).toHaveLength(3);
  });

  it("reads bank blanks and v15 TeX through one adapter without rewriting TeX", () => {
    expect(v15TexToMarkdown("값 [[\\frac{a}{b}]]와 [[x^{2}]]")).toBe(
      "값 $\\frac{a}{b}$와 $x^{2}$",
    );
    const study = recallDisplayRows(sourceRows, "study", false)[0];
    expect(study.pieces.map((piece) => piece.kind)).toEqual([
      "text",
      "text",
      "text",
      "text",
      "text",
    ]);
    expect(
      study.pieces.map((p) => (p.kind === "blank" ? "" : p.markdown)).join(""),
    ).toBe("두 수의 합은 $\\frac{1}{\\sqrt{2}}$보다 크다. 단, $x\\ne0$이다.");
    const bank = parse(
      render(
        memory(
          "keywords",
          "student",
          {},
          { kind: "rows", groupKey: "concept-x.memory-0", rows: bankRows },
        ),
      ),
    );
    const row = bank.querySelector<HTMLElement>("[data-row-key]")!;
    expect(row.dataset.rowGroup).toBe("concept-x.memory-0");
    expect(row.dataset.conceptId).toBe("");
    expect(row.querySelectorAll(".tb-blank-keyword")).toHaveLength(2);
    expect(row.textContent).not.toContain("나누어떨어지게");
    // The public symbol is typeset; the hidden fraction is not.
    expect(row.querySelectorAll("[data-textbook-math]")).toHaveLength(1);
    // Rows without a concept name keep an empty bar where the study sheet prints its marks.
    const bar = bank.querySelector(".tb-memory-title")!;
    expect(bar.className).toBe("tb-memory-title tb-memory-title-bare");
    expect(bar.textContent).toBe("");
  });

  it("keeps an unclosed key hidden instead of demoting it to public text", () => {
    const [row] = recallDisplayRows(
      [
        {
          rowKey: "x",
          label: "",
          rawText: "공개 {{닫히지 않은 비밀",
          textFormat: "v15-tex",
        },
      ],
      "keywords",
      false,
    );
    expect(JSON.stringify(row)).not.toContain("비밀");
    expect(row.pieces.at(-1)?.kind).toBe("blank");
  });

  it("does not print a code mined from a generated identifier", () => {
    const dom = parse(
      render(
        memory(
          "study",
          "student",
          {},
          {
            kind: "concept",
            conceptId: "0c41d2e8-0000-4000-8000-000000000a1f",
            title: "약수",
            rows: bankRows,
          },
        ),
      ),
    );
    expect(dom.querySelector(".tb-memory-code")).toBeNull();
    expect(dom.querySelector(".tb-memory-title b")?.textContent).toBe("약수");
  });
});

describe("standalone activities carry their own instruction", () => {
  const errorCheck = (variant: "student" | "answers"): RenderBlock =>
    ({
      ...base,
      kind: "recall",
      phase: "sentences",
      repetitionChecks: false,
      semantic: { activity: "errorCheck", title: "오류 점검" },
      pieces:
        variant === "student"
          ? [
              { kind: "text", markdown: "1. 모든 짝수는 4의 배수이다.\n\n" },
              { kind: "blank", scope: "sentence" },
              { kind: "text", markdown: "\n\n2. $2+2=4$ 이다.\n\n" },
              { kind: "blank", scope: "sentence" },
            ]
          : [
              { kind: "text", markdown: "1. 모든 짝수는 4의 배수이다.\n\n" },
              { kind: "text", markdown: "틀림: 6은 4의 배수가 아니다." },
            ],
    }) as RenderBlock;

  it("gives error checking a true/false mark and a reason space, without memory tabs", () => {
    const dom = parse(render(errorCheck("student")));
    expect(dom.querySelector(".tb-recall-phases")).toBeNull();
    expect(dom.querySelector(".tb-study-footer")).toBeNull();
    expect(dom.querySelector(".tb-recall-checkbar b")?.textContent).toContain(
      "이유를 쓰시오",
    );
    const items = dom.querySelectorAll(".tb-error-item");
    expect(items).toHaveLength(2);
    items.forEach((item) => {
      expect(item.querySelectorAll(".tb-error-ox i")).toHaveLength(2);
      expect(item.querySelectorAll(".tb-write-line")).toHaveLength(2);
    });
    expect(
      items[0].querySelector(".tb-error-statement")?.textContent,
    ).toContain("모든 짝수는 4의 배수이다.");
    const answers = parse(render(errorCheck("answers")));
    expect(answers.querySelector(".tb-error-ox")).toBeNull();
    expect(answers.body.textContent).toContain("6은 4의 배수가 아니다.");
  });

  it("gives term recall its own instruction and a blank per term", () => {
    const legacy = parse(
      render({
        ...base,
        kind: "recall",
        phase: "keywords",
        repetitionChecks: false,
        semantic: { activity: "termRecall", title: "용어 암기" },
        pieces: [
          { kind: "blank", scope: "keyword" },
          { kind: "text", markdown: ": 둘로 나누어떨어지는 수\n\n" },
          { kind: "blank", scope: "keyword" },
          { kind: "text", markdown: ": 1과 자기 자신만 약수인 수" },
        ],
      } as RenderBlock),
    );
    expect(legacy.querySelector(".tb-recall-phases")).toBeNull();
    expect(legacy.querySelector(".tb-recall-checkbar b")?.textContent).toBe(
      "뜻을 읽고 알맞은 용어를 쓰시오.",
    );
    const rows = legacy.querySelectorAll(".tb-term-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
    expect(rows[0].querySelector(".tb-term-definition")?.textContent).toBe(
      "둘로 나누어떨어지는 수",
    );
    const fromRows = (variant: "student" | "answers") =>
      render({
        ...base,
        kind: "recall",
        phase: "keywords",
        repetitionChecks: false,
        semantic: {
          activity: "termRecall",
          node: { kind: "rows", rows: bankRows },
        },
        pieces:
          variant === "student"
            ? [{ kind: "blank", scope: "keyword" }]
            : [{ kind: "text", markdown: "약수" }],
      } as RenderBlock);
    expect(fromRows("student")).not.toContain("약수");
    expect(
      parse(fromRows("student")).querySelector(".tb-term-definition")
        ?.textContent,
    ).toContain("나누어떨어지게");
    expect(
      parse(fromRows("answers")).querySelector(".tb-term-name")?.textContent,
    ).toBe("약수");
  });

  it("keeps the paragraph sheet for manuscripts without semantic metadata", () => {
    const dom = parse(
      render({
        ...base,
        kind: "recall",
        phase: "sentences",
        repetitionChecks: false,
        pieces: [
          { kind: "text", markdown: "**약수**" },
          { kind: "blank", scope: "sentence" },
        ],
      }),
    );
    expect(dom.querySelectorAll(".tb-recall-phases span")).toHaveLength(3);
    expect(dom.querySelector(".tb-memory")).toBeNull();
    expect(
      dom.querySelectorAll(".tb-blank-sentence .tb-write-line"),
    ).toHaveLength(3);
  });
});

describe("concept cards", () => {
  const body = {
    goal: "목표",
    prerequisites: [],
    definition: "저장된 정의",
    conditions: null,
    examples: ["저장된 예"],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  };
  const concept = (extra: Record<string, unknown> = {}): RenderBlock =>
    ({
      ...base,
      kind: "concept",
      conceptKey: "concept-5eed0c41-0000-4000-8000-000000000042",
      title: "소단원 제목",
      body,
      qr: null,
      ...extra,
    }) as RenderBlock;
  const node = {
    kind: "concept" as const,
    conceptId: "e5-1-1-c2",
    title: "약수",
    rows: [
      {
        rowKey: "e5-1-1-c2.definition",
        label: "뜻",
        rawText: "어떤 수를 나누어떨어지게 하는 수 $a$",
        textFormat: "markdown" as const,
      },
      {
        rowKey: "e5-1-1-c2.example",
        label: "예",
        rawText: "6의 약수\n\n1, 2, 3, 6",
        textFormat: "markdown" as const,
      },
    ],
  };

  it("prints the source concept's own name and rows, never a number mined from a key", () => {
    const dom = parse(
      render(concept({ semantic: { activity: "concepts", node } })),
    );
    const card = dom.querySelector(".tb-concept-card")!;
    expect(card.getAttribute("data-concept-id")).toBe("e5-1-1-c2");
    expect(card.querySelector(".tb-concept-title")?.textContent).toBe("약수");
    expect(card.querySelector(".tb-concept-number")).toBeNull();
    expect(
      Array.from(card.querySelectorAll<HTMLElement>(".tb-concept-row")).map(
        (row) => [
          row.dataset.rowKey,
          row.dataset.conceptId,
          row.querySelector(".tb-concept-row-label")?.textContent,
        ],
      ),
    ).toEqual([
      ["e5-1-1-c2.definition", "e5-1-1-c2", "뜻"],
      ["e5-1-1-c2.example", "e5-1-1-c2", "예"],
    ]);
    expect(card.querySelectorAll("[data-textbook-math]")).toHaveLength(1);
    expect(card.textContent).toContain("1, 2, 3, 6");
    // The frozen section body is not printed twice.
    expect(card.textContent).not.toContain("저장된 정의");
  });

  it("numbers by book order or an authored code only", () => {
    const number = (extra: Record<string, unknown>) =>
      parse(render(concept(extra))).querySelector(".tb-concept-number")
        ?.textContent ?? null;
    expect(number({})).toBeNull();
    expect(number({ ordinal: 7 })).toBe("07");
    expect(number({ conceptKey: "C03" })).toBe("03");
    expect(number({ conceptKey: "concept-12" })).toBe("12");
    expect(number({ conceptKey: "concept-5" + "0".repeat(30) })).toBeNull();
    expect(number({ conceptKey: "abc-5" })).toBeNull();
    expect(
      number({ ordinal: 2, semantic: { activity: "concepts", node } }),
    ).toBe("02");
  });

  it("falls back to the saved body when the model sends no source rows", () => {
    const dom = parse(render(concept()));
    expect(dom.querySelector(".tb-concept-card")).toBeNull();
    expect(dom.querySelector(".tb-concept-title")?.textContent).toBe(
      "소단원 제목",
    );
    expect(dom.querySelector(".tb-definition")?.textContent).toContain(
      "저장된 정의",
    );
    expect(dom.querySelector(".tb-concept-examples")?.textContent).toContain(
      "저장된 예",
    );
  });

  it("omits the title on a continuation and keeps the QR", () => {
    const dom = parse(
      render(
        concept({
          continuation: true,
          qr: { id: "q1", url: "https://school.example.test/c/1" },
          semantic: { activity: "concepts", node },
        }),
      ),
    );
    expect(dom.querySelector(".tb-concept-title")).toBeNull();
    expect(dom.querySelector(".tb-qr")?.getAttribute("data-qr-id")).toBe("q1");
  });

  it("prints a bounded source tree through the shared fragment renderer", () => {
    const dom = parse(
      render(
        concept({
          semantic: {
            activity: "concepts",
            source: { unit: "U01", page: 14, kind: "concept1", path: "p" },
            node: {
              kind: "fragments",
              fragments: [
                {
                  tag: "div",
                  attributes: { className: "rule-box" },
                  children: [{ tag: "span", rawText: "두 수의 **합**" }],
                },
              ],
            },
          },
        }),
      ),
    );
    const section = dom.querySelector(".tb-source-fragments")!;
    expect(section.getAttribute("data-source-kind")).toBe("concept1");
    expect(section.querySelector(".rule-box strong")?.textContent).toBe("합");
  });
});

describe("problem workspaces", () => {
  const layout = {
    columnSpan: 1 as const,
    minWorkLines: 2,
    preferredWorkLines: 3,
    maxWorkLines: 10,
    keepTogether: true,
  };
  const problem = (extra: Record<string, unknown> = {}): RenderBlock =>
    ({
      ...base,
      kind: "problem",
      itemId: "item-1",
      displayNumber: "0042",
      content: "두 수 $12$와 $18$의 공약수를 구하시오.",
      figures: [],
      questionType: "단답형",
      learningStage: "basic",
      layout,
      qr: null,
      sourcePageLabel: null,
      ...extra,
    }) as RenderBlock;
  const qr = { id: "qr-1", url: "https://school.example.test/q/1" };
  const group = {
    kind: "exampleGroup" as const,
    groupId: "U01.p24.g1",
    title: "공약수 찾기",
    strategy: "작은 수의 약수부터 확인한다.",
    exampleItemId: "item-1",
    confirmItemIds: ["item-2", "item-3"],
  };

  it("rules the workspace across the column and keeps the QR out of it", () => {
    const dom = parse(render(problem({ qr })));
    const area = dom.querySelector(".tb-work-area")!;
    expect(
      area.querySelector('.tb-work-lines[data-writing-space="work"]'),
    ).not.toBeNull();
    expect(
      area.querySelectorAll(".tb-work-lines > .tb-work-line"),
    ).toHaveLength(3);
    expect(area.querySelector(".tb-qr")).toBeNull();
    expect(dom.querySelector(".tb-problem-main > .tb-qr")).not.toBeNull();
    expect(dom.querySelector(".tb-problem")?.classList).toContain(
      "tb-problem-has-qr",
    );
    expect(area.getAttribute("style")).toBe("min-height:21mm");
    expect(dom.querySelector(".tb-problem-head strong")?.textContent).toBe(
      "0042",
    );
    expect(dom.querySelector(".tb-answer")).toBeNull();
    expect(dom.querySelector(".tb-worked")).toBeNull();
  });

  it("preserves a saved zero-line layout and a wide written workspace", () => {
    const none = parse(
      render(problem({ layout: { ...layout, preferredWorkLines: 0 } })),
    );
    expect(none.querySelector(".tb-work-lines")).toBeNull();
    expect(none.querySelector(".tb-problem")?.classList).not.toContain(
      "tb-problem-has-qr",
    );
    const written = parse(
      render(
        problem({
          qr,
          learningStage: "written",
          layout: { ...layout, columnSpan: 2, preferredWorkLines: 6 },
        }),
      ),
    );
    const lines = written.querySelector(".tb-problem-wide .tb-work-lines")!;
    expect(lines.querySelectorAll(".tb-work-line")).toHaveLength(6);
    expect(lines.querySelector(".tb-qr")).toBeNull();
    expect(lines.parentElement?.children).toHaveLength(1);
  });

  it("keeps answers out of the student variant and lines out of the answer variant", () => {
    const answers = parse(
      render(problem({ answer: "6", solution: "풀이", sourcePageLabel: "12" })),
    );
    expect(answers.querySelector(".tb-answer")?.textContent).toContain("풀이");
    expect(answers.querySelector(".tb-work-lines")).toBeNull();
    const publicExample = parse(
      render(
        problem({
          learningStage: "worked-example",
          publicWorkedExample: { answer: "6", solution: "공개 풀이" },
        }),
      ),
    );
    expect(
      publicExample.querySelector(".tb-worked-solution")?.textContent,
    ).toBe("공개 풀이");
    expect(publicExample.querySelector(".tb-work-lines")).toBeNull();
  });

  it("labels the group's example and its confirmations by the writer's link", () => {
    const semantic = { activity: "workedExamples", node: group };
    const example = parse(
      render(
        problem({
          semantic,
          learningStage: "worked-example",
          publicWorkedExample: { answer: "6", solution: "풀이" },
        }),
      ),
    ).querySelector<HTMLElement>(".tb-problem")!;
    expect(example.dataset.exampleRole).toBe("example");
    expect(example.dataset.exampleGroup).toBe("U01.p24.g1");
    expect(example.dataset.activity).toBe("workedExamples");
    expect(example.getAttribute("aria-label")).toBe("대표예제");
    expect(example.querySelector(".tb-example-label")?.textContent).toBe(
      "대표예제",
    );
    // A confirmation under the same parent is never the representative example.
    const confirm = parse(
      render(
        problem({
          semantic,
          itemId: "item-2",
          learningStage: "worked-example",
        }),
      ),
    ).querySelector<HTMLElement>(".tb-problem")!;
    expect(confirm.dataset.exampleRole).toBe("confirm");
    expect(confirm.classList).not.toContain("tb-problem-worked");
    expect(confirm.getAttribute("aria-label")).toBeNull();
    expect(confirm.querySelector(".tb-example-label")).toBeNull();
    expect(confirm.querySelector(".tb-confirm-label")?.textContent).toBe(
      "확인문제",
    );
    expect(confirm.querySelectorAll(".tb-work-line")).toHaveLength(3);
    const outsider = parse(
      render(problem({ semantic, itemId: "item-9" })),
    ).querySelector<HTMLElement>(".tb-problem")!;
    expect(outsider.dataset.exampleRole).toBeUndefined();
    expect(outsider.querySelector(".tb-confirm-label")).toBeNull();
  });
});

describe("content stylesheet", () => {
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(/[.]/g, "\\.")}\\{([^}]*)\\}`).exec(
      TEXTBOOK_CONTENT_CSS,
    )?.[1] ?? "";

  it("draws writing space as 0.265mm rules on a 7mm pitch with no fill", () => {
    for (const selector of [".tb-work-line", ".tb-write-line"]) {
      expect(rule(selector)).toContain("height:7mm");
      expect(rule(selector)).toContain("border-bottom:.265mm solid");
    }
    expect(rule(".tb-blank")).toContain("border-bottom:.265mm solid");
    expect(rule(".tb-blank")).toContain("background:none");
    expect(rule(".tb-blank-sentence")).toContain("background:none");
    expect(TEXTBOOK_CONTENT_CSS).not.toMatch(/gradient/);
  });

  it("styles content only: no dialogue, front matter or page chrome selectors", () => {
    expect(TEXTBOOK_CONTENT_CSS).not.toMatch(
      /\.tb-(dialogue|bubble|portrait|header|footer|cover|unit|stage-|progress|paper|edge|running)/,
    );
  });
});
