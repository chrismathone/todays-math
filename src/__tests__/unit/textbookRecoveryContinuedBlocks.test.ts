// @vitest-environment jsdom
/**
 * A block that continues an earlier one says so: a continued concept part names its concept
 * again with a small "계속", and a continued bank memory block prints the lesson title with
 * "계속" in the bar it already reserves. Blocks that do not continue, and memory sheets converted
 * from an original page, are printed exactly as before. All text here is synthetic.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import type { RecallPhase } from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const render = (block: RenderBlock) => renderBlockHtml(block, resources);
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;
const base = {
  id: "b1",
  sourceBlockId: "b1",
  unitKey: "U01",
  sectionKey: "s1",
};
const rule = (selector: string) => {
  const at = TEXTBOOK_CONTENT_CSS.indexOf(`${selector}{`);
  if (at < 0) return null;
  return TEXTBOOK_CONTENT_CSS.slice(
    at + selector.length + 1,
    TEXTBOOK_CONTENT_CSS.indexOf("}", at),
  );
};

describe("a continued concept part names its concept again", () => {
  const body = {
    goal: "",
    prerequisites: [],
    definition: "이어지는 설명",
    conditions: null,
    examples: ["이어지는 예"],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  };
  const node = {
    kind: "concept" as const,
    conceptId: "e3-1-1-c2",
    title: "받아올림",
    rows: [
      {
        rowKey: "e3-1-1-c2.definition",
        label: "뜻",
        rawText: "같은 자리의 합이 열이 되면 윗자리로 올린다.",
        textFormat: "markdown" as const,
      },
    ],
  };
  const concept = (extra: Record<string, unknown> = {}): RenderBlock =>
    ({
      ...base,
      kind: "concept",
      conceptKey: "concept-5eed0c41-0000-4000-8000-000000000042",
      title: "세 자리 수의 덧셈",
      body,
      qr: null,
      ordinal: 3,
      ...extra,
    }) as RenderBlock;
  const label = (dom: Document) =>
    dom.querySelector<HTMLElement>(".tb-concept-continuation");

  it("prints the saved title with a small 계속 on a continued part of a saved body", () => {
    const dom = parse(render(concept({ continuation: true })));
    expect(dom.querySelector(".tb-concept-title")).toBeNull();
    const mark = label(dom)!;
    expect(mark.hasAttribute("data-continuation")).toBe(true);
    expect(mark.querySelector("small")?.textContent).toBe("계속");
    expect(mark.textContent).toBe("세 자리 수의 덧셈계속");
    // The number chip belongs to the first part; a continued part repeats the name only.
    expect(mark.querySelector(".tb-concept-number")).toBeNull();
    expect(dom.querySelector(".tb-definition")?.textContent).toContain(
      "이어지는 설명",
    );
  });

  it("prints the source concept's own name on a continued card, and keeps the QR", () => {
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
    expect(label(dom)?.textContent).toBe("받아올림계속");
    expect(dom.querySelectorAll(".tb-concept-row")).toHaveLength(1);
    expect(dom.querySelector(".tb-qr")?.getAttribute("data-qr-id")).toBe("q1");
  });

  it("prints it on a continued source page as well", () => {
    const fragments = [
      { tag: "p" as const, rawText: "이어지는 원본 쪽의 설명" },
    ];
    const dom = parse(
      render(
        concept({
          continuation: true,
          semantic: {
            activity: "concepts",
            source: {
              unit: "U01",
              page: 12,
              kind: "concept2",
              path: "pages[11]",
            },
            node: { kind: "fragments", fragments },
          },
        }),
      ),
    );
    expect(label(dom)?.textContent).toBe("세 자리 수의 덧셈계속");
    expect(dom.querySelector(".tb-source-fragments")?.textContent).toContain(
      "이어지는 원본 쪽의 설명",
    );
  });

  it("leaves a part that does not continue exactly as it was", () => {
    for (const extra of [
      {},
      { semantic: { activity: "concepts", node } },
      { continuation: false },
    ]) {
      const html = render(concept(extra));
      const dom = parse(html);
      expect(label(dom)).toBeNull();
      expect(html).not.toContain("data-continuation");
      const title = dom.querySelector(".tb-concept-title")!;
      expect(title.querySelector(".tb-concept-number")?.textContent).toBe("03");
      expect(title.textContent).toBe(
        "semantic" in extra ? "03받아올림" : "03세 자리 수의 덧셈",
      );
    }
  });

  it("escapes the title it repeats", () => {
    const html = render(
      concept({ continuation: true, title: '<b>굵게</b> & "따옴표"' }),
    );
    expect(html).not.toContain("<b>굵게</b>");
    expect(label(parse(html))?.textContent).toBe('<b>굵게</b> & "따옴표"계속');
  });

  it("styles the mark as a small line, not as a second title", () => {
    const css = rule(".tb-concept-continuation")!;
    expect(css).toContain("font-size:7.5pt");
    expect(rule(".tb-concept-continuation small")).toContain("font-size:6.5pt");
  });
});

describe("a continued bank memory block says what it continues", () => {
  const rows: TextbookSemanticRow[] = [
    {
      rowKey: "e3-1-1-1-c2.definition",
      label: "받아올림",
      rawText: "같은 자리의 합이 {열}이 되면 윗자리로 올린다.",
      textFormat: "bank-blank",
    },
  ];
  type Extra = {
    continuation?: boolean;
    memoryContinuationTitle?: string;
    semanticContinuation?: boolean;
    source?: boolean;
    conceptNode?: boolean;
  };
  const memory = (phase: RecallPhase, extra: Extra = {}): RenderBlock =>
    ({
      ...base,
      kind: "recall",
      phase,
      pieces: [],
      answersVisible: false,
      repetitionChecks: phase === "study",
      ...(extra.continuation === undefined
        ? {}
        : { continuation: extra.continuation }),
      ...(extra.memoryContinuationTitle === undefined
        ? {}
        : { memoryContinuationTitle: extra.memoryContinuationTitle }),
      semantic: {
        activity: ACTIVITY[phase],
        ...(extra.semanticContinuation ? { continuation: true } : {}),
        ...(extra.source
          ? {
              source: {
                unit: "U01",
                page: 18,
                kind: "fullmaster",
                path: "pages[17]",
              },
            }
          : {}),
        node: extra.conceptNode
          ? { kind: "concept", conceptId: "C02", title: "개념 이름", rows }
          : { kind: "rows", groupKey: "concept-x.memory-1", rows },
      },
    }) as RenderBlock;
  const bar = (dom: Document) =>
    dom.querySelector<HTMLElement>(".tb-memory-title")!;
  const mark = (dom: Document) =>
    dom.querySelector<HTMLElement>(".tb-memory-continuation");

  it("prints the lesson title and 계속 in the reserved bar of all three phases", () => {
    for (const phase of PHASES) {
      const dom = parse(
        render(
          memory(phase, {
            continuation: true,
            memoryContinuationTitle: "세 자리 수의 덧셈",
          }),
        ),
      );
      const header = bar(dom);
      expect(header.classList.contains("tb-memory-title-bare")).toBe(true);
      const label = mark(dom)!;
      expect(label.parentElement).toBe(header);
      expect(label.hasAttribute("data-continuation")).toBe(true);
      expect(
        label.querySelector(".tb-memory-continuation-title")?.textContent,
      ).toBe("세 자리 수의 덧셈");
      expect(label.querySelector("small")?.textContent).toBe("계속");
      // Only the study sheet carries the repetition marks beside it.
      expect(!!header.querySelector(".tb-memory-rounds")).toBe(
        phase === "study",
      );
      // A continued block has no instruction bar of its own.
      expect(dom.querySelector(".tb-recall-checkbar")).toBeNull();
      expect(dom.querySelectorAll(".tb-memory-row")).toHaveLength(1);
    }
  });

  it("reads the continuation from the semantic flag too", () => {
    const dom = parse(
      render(
        memory("keywords", {
          semanticContinuation: true,
          memoryContinuationTitle: "세 자리 수의 덧셈",
        }),
      ),
    );
    expect(mark(dom)?.textContent).toBe("세 자리 수의 덧셈계속");
  });

  it("keeps the bar of a block that does not continue empty", () => {
    for (const phase of PHASES) {
      const html = render(
        memory(phase, { memoryContinuationTitle: "세 자리 수의 덧셈" }),
      );
      const dom = parse(html);
      expect(mark(dom)).toBeNull();
      expect(html).not.toContain("data-continuation");
      expect(html).not.toContain("세 자리 수의 덧셈");
      expect(bar(dom).textContent).toBe(
        phase === "study" ? "1회2회3회4회" : "",
      );
    }
  });

  it("marks a continued block without a title with 계속 alone", () => {
    const dom = parse(render(memory("sentences", { continuation: true })));
    expect(mark(dom)?.textContent).toBe("계속");
    expect(dom.querySelector(".tb-memory-continuation-title")).toBeNull();
  });

  it("escapes the title", () => {
    const html = render(
      memory("study", {
        continuation: true,
        memoryContinuationTitle: "<i>덧셈</i> & 뺄셈",
      }),
    );
    expect(html).not.toContain("<i>덧셈</i>");
    expect(
      parse(html).querySelector(".tb-memory-continuation-title")?.textContent,
    ).toBe("<i>덧셈</i> & 뺄셈");
  });

  it("does not change a sheet converted from an original page", () => {
    for (const phase of PHASES)
      for (const conceptNode of [true, false]) {
        const plain = render(
          memory(phase, { continuation: true, source: true, conceptNode }),
        );
        const titled = render(
          memory(phase, {
            continuation: true,
            source: true,
            conceptNode,
            memoryContinuationTitle: "세 자리 수의 덧셈",
          }),
        );
        expect(titled).toBe(plain);
        expect(titled).not.toContain("tb-memory-continuation");
        expect(titled).not.toContain("data-continuation");
        expect(titled).not.toContain("계속");
      }
  });

  it("does not change a bank block that has its own concept title", () => {
    for (const phase of PHASES) {
      const plain = render(
        memory(phase, { continuation: true, conceptNode: true }),
      );
      const titled = render(
        memory(phase, {
          continuation: true,
          conceptNode: true,
          memoryContinuationTitle: "세 자리 수의 덧셈",
        }),
      );
      expect(titled).toBe(plain);
      expect(
        parse(titled).querySelector(".tb-memory-title b")?.textContent,
      ).toBe("개념 이름");
    }
  });

  it("keeps the hidden key out of the continued student sheet", () => {
    const html = render(
      memory("keywords", {
        continuation: true,
        memoryContinuationTitle: "세 자리 수의 덧셈",
      }),
    );
    expect(parse(html).querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
    expect(parse(html).querySelector(".tb-memory-body")?.textContent).toBe(
      "같은 자리의 합이 이 되면 윗자리로 올린다.",
    );
  });

  it("sets the mark small enough for the 7mm bar and on one line", () => {
    const css = rule(".tb-memory-continuation")!;
    expect(css).toContain("font-size:8pt");
    expect(css).toContain("line-height:1.5");
    expect(rule(".tb-memory-continuation-title")).toContain(
      "white-space:nowrap",
    );
    expect(rule(".tb-memory-continuation small")).toContain("font-size:6.5pt");
    // The bar itself is not restyled.
    expect(rule(".tb-memory-title")).toContain("min-height:7mm");
  });
});
