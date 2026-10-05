// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
} from "@/contracts/textbookQuickCreate.contract";
import { textbookSemanticSchema } from "@/contracts/textbookSemantic.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import { canonicalJson } from "@/lib/textbook/canonical";
import { conceptMemoryRows } from "@/lib/textbook/conceptRows";
import {
  additionalConceptActivities,
  memoryActivityBlocks,
  writingActivity,
} from "@/lib/textbook/server/quickCreateRecovery";
import {
  BANK_ACTIVITY_CSS,
  renderBankActivityHtml,
} from "@/lib/textbook/render/blocks/bankActivities";
import { renderSemanticTextHtml } from "@/lib/textbook/render/blocks/semantic";
import type { RenderBlock } from "@/lib/textbook/render/model";

const activities = [
  "conceptBlankTest",
  "explainActivity",
  "conceptMap",
] as const;
const off = Object.fromEntries(
  Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, false]),
) as QuickCreateComponents;
const base = {
  id: "test",
  sourceBlockId: "test",
  unitKey: "u1",
  sectionKey: "s1",
};
const core = Object.entries(BANK_PARTS)
  .filter(([key]) => !key.endsWith("plus"))
  .flatMap(([, bank]) => bank.concepts);
const sectionKey = core[0].section;
const entries = (count: number): ConceptEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `synthetic-${i}`,
    section: sectionKey,
    term: `개념 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition: `합성 검증 {조건 ${i + 1}}을 보존한다.`,
    example: { prompt: "합성 비공개 예", answer: "비공개 예의 답" },
  }));
const generate = (
  list: readonly ConceptEntry[],
  components: QuickCreateComponents,
) =>
  additionalConceptActivities({
    entries: list,
    sectionKey,
    conceptKey: "c1",
    components,
  });
type TextBlock = Extract<RenderBlock, { kind: "text" }>;
const asRender = (block: ReturnType<typeof generate>[number]): TextBlock =>
  ({ ...base, ...block }) as TextBlock;
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const sha = (value: unknown) =>
  createHash("sha256").update(canonicalJson(value)).digest("hex");

describe("new bank activity assembly conserves canonical content", () => {
  it("conserves all 1657 core concepts in all 360 sections, once per selected activity, without changing source bytes", () => {
    expect(core).toHaveLength(1657);
    const groups = Map.groupBy(core, (entry) => entry.section);
    expect(groups.size).toBe(360);
    const before = sha(core);
    const seen = Object.fromEntries(
      activities.map((activity) => [activity, [] as unknown[]]),
    );
    for (const list of groups.values()) {
      const blocks = generate(list, {
        ...off,
        conceptBlankTest: true,
        explainActivity: true,
        conceptMap: true,
      });
      for (const activity of activities) {
        const parts = blocks.filter(
          (block) => block.semantic?.activity === activity,
        );
        expect(parts).toHaveLength(
          Math.ceil(list.length / (activity === "explainActivity" ? 2 : 4)),
        );
        const rows = parts.flatMap((part) =>
          part.semantic?.node?.kind === "rows" ? part.semantic.node.rows : [],
        );
        expect(rows).toEqual(conceptMemoryRows(list));
        seen[activity].push(...rows);
        for (const part of parts)
          expect(textbookSemanticSchema.safeParse(part.semantic).success).toBe(
            true,
          );
      }
    }
    for (const activity of activities)
      expect(seen[activity]).toHaveLength(1657);
    expect(sha(core)).toBe(before);
  });

  it("keeps all eight selected combinations independent and other 25 toggles cannot couple these activities", () => {
    expect(Object.keys(off)).toHaveLength(28);
    const list = entries(9);
    const structure = (components: QuickCreateComponents) =>
      generate(list, components)
        .filter((block) =>
          activities.includes(
            block.semantic!.activity as (typeof activities)[number],
          ),
        )
        .map((block) => block.semantic);
    for (let mask = 0; mask < 8; mask++) {
      const components = { ...off };
      activities.forEach((activity, index) => {
        components[activity] = Boolean(mask & (1 << index));
      });
      const expected = activities.filter((activity) => components[activity]);
      expect([
        ...new Set(structure(components).map((semantic) => semantic!.activity)),
      ]).toEqual(expected);
      for (const toggle of Object.keys(
        off,
      ) as (keyof QuickCreateComponents)[]) {
        if (activities.some((activity) => activity === toggle)) continue;
        expect(structure({ ...components, [toggle]: true })).toEqual(
          structure(components),
        );
      }
    }
  });

  it("leaves the identical immutable memory rows and partitions intact", () => {
    const list = entries(17);
    const input = {
      entries: list,
      conceptKey: "c1",
      components: {
        ...off,
        conceptStudy: true,
        clozeRecall: true,
        sentenceRecall: true,
      },
    };
    const structure = () =>
      memoryActivityBlocks(input).map(({ blockId: _, ...block }) => block);
    const before = structure();
    generate(list, {
      ...input.components,
      conceptBlankTest: true,
      explainActivity: true,
      conceptMap: true,
    });
    expect(structure()).toEqual(before);
    expect(before).toHaveLength(9);
    expect(sha(list)).toBe(sha(entries(17)));
  });
});

describe("native bank activity scaffolds", () => {
  it.each([1, 2, 3, 4, 5, 8, 9, 17])(
    "keeps %i terms ordered across bounded pages with exactly four map slots",
    (count) => {
      const blocks = generate(entries(count), { ...off, conceptMap: true });
      const seen: string[] = [];
      blocks.forEach((block, index) => {
        const dom = parse(renderBankActivityHtml(asRender(block))!);
        expect(dom.querySelectorAll(".tb-bank-map-card")).toHaveLength(4);
        const cards = Array.from(
          dom.querySelectorAll<HTMLElement>(".tb-bank-map-card[data-row-key]"),
        );
        expect(cards.length).toBeLessThanOrEqual(4);
        seen.push(...cards.map((card) => card.dataset.rowKey!));
        expect(
          dom.querySelectorAll(
            ".tb-bank-map-card[data-empty-card] [data-row-key]",
          ),
        ).toHaveLength(0);
        expect(dom.querySelectorAll(".tb-bank-map-links path")).toHaveLength(1);
        expect(dom.querySelector(".tb-bank-map-center")).not.toBeNull();
        expect(
          dom.querySelectorAll(".tb-bank-map-response .tb-bank-rule"),
        ).toHaveLength(3);
        expect(block.semantic!.continuation).toBe(index > 0);
        expect(dom.body.textContent).not.toContain("합성 검증");
        expect(dom.body.textContent).not.toContain("비공개 예의 답");
      });
      expect(seen).toEqual(
        entries(count).map((entry) => `${entry.id}.definition`),
      );
    },
  );

  it("restores the recall canvas, cue, watermark, separate checks and deficient-concept field", () => {
    const block = generate(entries(4), { ...off, conceptBlankTest: true })[0];
    const dom = parse(renderBankActivityHtml(asRender(block))!);
    expect(
      dom.querySelectorAll(".tb-bank-recall-canvas .tb-bank-rule"),
    ).toHaveLength(18);
    expect(dom.querySelector(".tb-bank-recall-canvas small")!.textContent).toBe(
      "정의 → 예 → 판단 이유 → 풀이 방법",
    );
    expect(dom.querySelector(".tb-bank-watermark")!.textContent).toBe(
      "INJAEWON",
    );
    expect(dom.querySelectorAll(".tb-bank-recall-checks>div")).toHaveLength(2);
    expect(dom.querySelector('[aria-label="부족한 개념"]')).not.toBeNull();
    expect(dom.body.textContent).not.toContain("완료일");
  });

  it("restores oral workflow, listener panels, two-rater three-criterion matrix and repair with bounded two-term groups", () => {
    const blocks = generate(entries(5), { ...off, explainActivity: true });
    expect(blocks).toHaveLength(3);
    const seen = blocks.flatMap((block) => {
      const dom = parse(renderBankActivityHtml(asRender(block))!);
      const tasks = Array.from(
        dom.querySelectorAll<HTMLElement>(".tb-bank-oral-task"),
      );
      expect(tasks.length).toBeLessThanOrEqual(2);
      expect(dom.querySelectorAll(".tb-bank-oral-route>span")).toHaveLength(3);
      expect(dom.querySelectorAll(".tb-bank-listener")).toHaveLength(
        tasks.length,
      );
      expect(
        dom.querySelectorAll(".tb-bank-oral-matrix tbody tr"),
      ).toHaveLength(3);
      expect(
        dom.querySelectorAll(".tb-bank-oral-matrix tbody td"),
      ).toHaveLength(6);
      expect(
        dom.querySelectorAll(".tb-bank-repair .tb-bank-rule"),
      ).toHaveLength(2);
      return tasks.map((task) => task.dataset.rowKey);
    });
    expect(seen).toEqual(entries(5).map((entry) => `${entry.id}.definition`));
  });

  it("typesets safe label math, escapes markup, and refuses forbidden math commands", () => {
    const list = entries(2);
    list[0].term = "자리 $n$";
    list[1].term = "<img src=x onerror=alert(1)>";
    const block = generate(list, { ...off, conceptMap: true })[0];
    const dom = parse(renderBankActivityHtml(asRender(block))!);
    expect(
      dom.querySelectorAll(".tb-bank-map-card [data-textbook-math]"),
    ).toHaveLength(1);
    expect(dom.querySelector("img")).toBeNull();
    expect(dom.body.textContent).toContain(list[1].term);
    list[0].term = "$\\href{https://example.com}{x}$";
    expect(() =>
      renderBankActivityHtml(
        asRender(generate(list, { ...off, explainActivity: true })[0]),
      ),
    ).toThrow();
  });

  it("excludes original source projections, unmarked rows and every legacy writing activity", () => {
    for (const activity of activities) {
      const legacy = asRender(
        writingActivity(activity, "기존 저장 원고", ["기존 지시"], 3),
      );
      expect(renderBankActivityHtml(legacy)).toBeNull();
      expect(renderSemanticTextHtml(legacy)).toContain(
        'class="tb-writing-activity"',
      );
      const block = asRender(
        generate(entries(2), { ...off, [activity]: true })[0],
      );
      const original = {
        ...block,
        semantic: {
          ...block.semantic!,
          source: { unit: "U01", page: 21, kind: "recall", path: "original" },
        },
      };
      expect(renderBankActivityHtml(original)).toBeNull();
      const unmarked = {
        ...block,
        semantic: {
          ...block.semantic!,
          node: { kind: "rows" as const, rows: conceptMemoryRows(entries(2)) },
        },
      };
      expect(renderBankActivityHtml(unmarked)).toBeNull();
      const fragment = {
        ...original,
        semantic: {
          ...original.semantic,
          node: {
            kind: "fragments" as const,
            fragments: [{ tag: "div" as const, rawText: "원본 고정 원고" }],
          },
        },
      };
      expect(renderBankActivityHtml(fragment)).toBeNull();
      expect(renderSemanticTextHtml(fragment)).toContain("원본 고정 원고");
    }
    expect(BANK_ACTIVITY_CSS).toContain("height:7mm;border-bottom:.265mm");
    expect(BANK_ACTIVITY_CSS).not.toContain(".tb-source-fragments");
    expect(BANK_ACTIVITY_CSS).not.toContain(".tb-semantic-line");
  });
});
