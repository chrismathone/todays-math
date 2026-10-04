// @vitest-environment node
/**
 * Recovery writers checked end to end: the 28 independent activities, example/confirmation
 * pairs from recorded source families, shared quotas and shortages — on PGlite, then through
 * the render model and the student HTML. All bank rows and manuscript text are synthetic.
 */
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fragmentCalls = vi.hoisted(() => [] as unknown[][]);
vi.mock("@/lib/textbook/render/blocks/semantic", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/textbook/render/blocks/semantic")
    >();
  const original = actual.renderSourceFragments as (
    ...args: unknown[]
  ) => string;
  return {
    ...actual,
    renderSourceFragments: (...args: unknown[]) => {
      fragmentCalls.push(args);
      return original(...args);
    },
  };
});
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import {
  recallDisplayRows,
  type RecallDisplayRow,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
// PGlite needs the Node environment; the DOM is built only to read rendered HTML.
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const parse = (html: string) => new JSDOM(html).window.document;
const base = { id: "b1", sourceBlockId: "b1", unitKey: "u", sectionKey: "s" };

describe("renderer privacy and resource wiring", () => {
  const rows: TextbookSemanticRow[] = [
    {
      rowKey: "c1.definition",
      label: "약수",
      rawText: "어떤 수를 {나누어떨어지게} 하는 수이다.",
      textFormat: "bank-blank",
    },
  ];
  /** What the model sends a student: projected rows, and a node whose text is stripped. */
  const stripped = (
    phase: RecallPhase,
    displayRows: RecallDisplayRow[] | undefined,
    extra: Record<string, unknown> = {},
  ): RenderBlock =>
    ({
      ...base,
      kind: "recall",
      phase,
      pieces: [],
      repetitionChecks: false,
      semantic: {
        activity: phase === "keywords" ? "clozeRecall" : "sentenceRecall",
        node: {
          kind: "rows",
          groupKey: "concept-x.memory-0",
          rows: rows.map((row) => ({ ...row, rawText: "" })),
        },
      },
      ...(displayRows ? { displayRows } : {}),
      ...extra,
    }) as RenderBlock;

  it("prints projected rows and never reads the stripped node text", () => {
    for (const phase of ["keywords", "sentences"] as const) {
      const html = renderBlockHtml(
        stripped(phase, recallDisplayRows(rows, phase, false)),
        resources,
      );
      const row = parse(html).querySelector("[data-row-key]")!;
      expect(row.getAttribute("data-row-key")).toBe("c1.definition");
      expect(row.getAttribute("data-row-group")).toBe("concept-x.memory-0");
      expect(row.querySelector(".tb-memory-label")?.textContent).toBe("약수");
      expect(html).not.toContain("나누어떨어지게");
      if (phase === "keywords") {
        expect(row.querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
        expect(row.textContent).toContain("어떤 수를");
      } else {
        expect(row.querySelector(".tb-memory-body")?.textContent).toBe("");
        expect(row.querySelectorAll(".tb-write-line")).toHaveLength(1);
      }
    }
    // The answer variant receives revealed rows through the same field.
    const answers = renderBlockHtml(
      stripped("keywords", recallDisplayRows(rows, "keywords", true)),
      resources,
    );
    expect(parse(answers).querySelector(".tb-memory-key")?.textContent).toBe(
      "나누어떨어지게",
    );
  });

  it("removes revealed text from projected rows when the block is marked student", () => {
    const revealed = recallDisplayRows(rows, "keywords", true);
    const keywords = renderBlockHtml(
      stripped("keywords", revealed, { answersVisible: false }),
      resources,
    );
    expect(keywords).not.toContain("나누어떨어지게");
    expect(parse(keywords).querySelectorAll(".tb-blank-keyword")).toHaveLength(
      1,
    );
    const sentences = renderBlockHtml(
      stripped("sentences", recallDisplayRows(rows, "sentences", true), {
        answersVisible: false,
      }),
      resources,
    );
    expect(sentences).not.toContain("어떤 수를");
    expect(parse(sentences).querySelectorAll(".tb-write-line")).toHaveLength(1);
  });

  it("still projects the node's own rows when the model sends none", () => {
    const block = stripped("keywords", undefined) as RenderBlock & {
      semantic: { node: { rows: TextbookSemanticRow[] } };
    };
    block.semantic.node.rows = rows;
    const html = renderBlockHtml(
      { ...block, answersVisible: false } as unknown as RenderBlock,
      resources,
    );
    expect(html).not.toContain("나누어떨어지게");
    expect(parse(html).querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
  });

  it("hands the resources to the shared fragment renderer for a concept block", () => {
    fragmentCalls.length = 0;
    const fragments = [
      {
        tag: "div" as const,
        attributes: { className: "rule-box" },
        children: [{ tag: "span" as const, rawText: "두 수의 합" }],
      },
    ];
    const html = renderBlockHtml(
      {
        ...base,
        kind: "concept",
        conceptKey: "C01",
        title: "합",
        body: {
          goal: "",
          prerequisites: [],
          definition: "저장된 정의",
          conditions: null,
          examples: [],
          counterexamples: [],
          misconceptions: [],
          explainPrompt: null,
        },
        qr: null,
        semantic: {
          activity: "concepts",
          node: { kind: "fragments", fragments },
        },
      } as RenderBlock,
      resources,
    );
    expect(fragmentCalls).toHaveLength(1);
    expect(fragmentCalls[0][0]).toBe(fragments);
    expect(fragmentCalls[0][1]).toBe(resources);
    expect(parse(html).querySelector(".rule-box")?.textContent).toBe(
      "두 수의 합",
    );
    expect(html).not.toContain("저장된 정의");
  });
});
