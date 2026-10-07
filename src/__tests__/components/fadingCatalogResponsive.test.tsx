import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser } from "@playwright/test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { FadingCatalogScreen } from "@/components/fading/FadingCatalogScreen";
import catalogStyles from "@/components/fading/FadingCatalogScreen.module.css";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";

// These tests measure the rendered catalog in Chromium; jsdom cannot resolve
// container queries. The fixture and callbacks never call a server or database.
vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <span>{text}</span>,
}));

const concepts: FadingConcept[] = Array.from({ length: 8 }, (_, index) => ({
  id: `responsive-${index}`,
  section: "초5::1-6 넓이::1-6-3 1cm²보다 더 큰 넓이의 단위",
  level: "중",
  ordinal: index + 1,
  siblings: 8,
  propositions: [
    {
      id: `p-${index}`,
      term: "넓이의 단위",
      kind: "정의",
      pieces: [
        {
          kind: "target",
          target: { id: `t-${index}`, text: "제곱센티미터", tier: "text" },
        },
      ],
    },
  ],
}));
// The production catalog exposes seven grades. A single-grade fixture would
// miss the tall, squeezed grade filter reported in the teacher phone preview.
for (const grade of ["초3", "초4", "초6", "중1", "중2", "중3"])
  concepts.push({
    ...concepts[0]!,
    id: `responsive-grade-${grade}`,
    section: `${grade}::도형::단원`,
    ordinal: 1,
    siblings: 1,
  });

const rawCss = readFileSync(
  resolve("src/components/fading/FadingCatalogScreen.module.css"),
  "utf8",
);
const styles: Record<string, string> = Object.fromEntries(
  [...rawCss.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => [
    match[1]!,
    catalogStyles[match[1]!],
  ]),
);
const css = rawCss
  .replace(/:global\(([^)]+)\)/g, "$1")
  .replace(/\.([a-zA-Z_][\w-]*)/g, (_, name: string) => `.${styles[name]}`);
let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
  await browser?.close();
});
afterEach(cleanup);

const layouts = [
  { viewport: 320, width: 288, columns: 1, preview: false },
  { viewport: 390, width: 358, columns: 1, preview: false },
  { viewport: 768, width: 720, columns: 2, preview: false },
  { viewport: 1280, width: 1072, columns: 3, preview: false },
  { viewport: 1600, width: 1360, columns: 3, preview: false },
  { viewport: 1600, width: 1440, columns: 4, preview: false },
  { viewport: 1920, width: 1600, columns: 4, preview: false },
  { viewport: 1280, width: 288, columns: 1, preview: true },
  { viewport: 1280, width: 358, columns: 1, preview: true },
] as const;

describe("catalog layouts follow available width", () => {
  it.each(layouts)(
    "aligns card tracks with varied titles and previews at $viewport / $width px",
    async ({ viewport, width, columns, preview }) => {
      const source = createLocalFadingSource({ concepts, today: "2026-10-06" });
      const catalog = await source.catalog();
      const unit = catalog.sections[0]!;
      const terms = [
        [],
        ["각"],
        [
          "두 직선이 이루는 각의 크기",
          "직사각형의 넓이를 구하는 방법",
          "합동인 두 삼각형의 대응하는 변",
          "두 점을 지나는 직선은 하나",
          "단위를 바꾸어 나타내기",
        ],
        ["긴미리보기용어".repeat(12)],
        ["길이", "넓이", "부피", "단위", "크기"],
        ["한 개의 용어"],
      ];
      catalog.sections = unit.concepts.slice(0, 6).map((concept, index) => ({
        ...unit,
        key: `alignment-${index}`,
        chapter: index === 2 ? "도형의 성질과 여러 가지 측정 방법" : "도형",
        unit: index === 1 ? "여러 가지 도형의 성질과 넓이를 구하는 방법" : "각",
        concepts: [
          {
            ...concept,
            terms: terms[index]!,
            status:
              index % 2 === 0
                ? null
                : {
                    step: 3,
                    rated: true,
                    risk: 0.426,
                    dueOn: "2026-10-06",
                    daysUntil: 0,
                  },
          },
        ],
      }));
      const view = render(
        <FadingCatalogScreen
          catalog={catalog}
          busy={false}
          onGrade={vi.fn()}
          onConcept={vi.fn()}
        />,
      );
      const page = await browser.newPage({
        viewport: { width: viewport, height: 900 },
      });
      try {
        await page.setContent(
          `<style>html,body,h1,h2,h3,p{margin:0}${css}</style><main data-preview="${preview}" style="width:${width}px;margin:auto">${view.container.innerHTML}</main>`,
        );
        const measured = await page.evaluate(
          ({ styles }) => {
            const cards = [
              ...document.getElementsByClassName(styles.conceptCard!),
            ];
            const tracks = [
              "conceptTitle",
              "termPreview",
              "cardFacts",
              "stepSegments",
              "cardActions",
            ];
            const rows = new Map<number, Element[]>();
            for (const card of cards) {
              const top = Math.round(card.getBoundingClientRect().top);
              rows.set(top, [...(rows.get(top) ?? []), card]);
            }
            const misaligned = [...rows.values()].flatMap((row) =>
              tracks.filter((track) => {
                const tops = row.map(
                  (card) =>
                    card
                      .getElementsByClassName(styles[track]!)[0]!
                      .getBoundingClientRect().top,
                );
                return Math.max(...tops) - Math.min(...tops) > 1;
              }),
            );
            const chips = [
              ...document.getElementsByClassName(styles.termChip!),
            ];
            const clipped = chips.filter((chip) => {
              const bounds = chip.getBoundingClientRect();
              const preview = chip
                .closest(`.${styles.termPreview}`)!
                .getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(chip);
              return (
                [...range.getClientRects()].some(
                  (rect) =>
                    rect.left < bounds.left - 1 ||
                    rect.right > bounds.right + 1 ||
                    rect.top < bounds.top - 1 ||
                    rect.bottom > bounds.bottom + 1,
                ) ||
                bounds.left < preview.left ||
                bounds.right > preview.right ||
                bounds.bottom > preview.bottom
              );
            });
            return {
              rowSizes: [...rows.values()].map((row) => row.length),
              misaligned,
              clipped: clipped.length,
              terms: chips.map((chip) => chip.textContent),
              overflow: document.documentElement.scrollWidth - innerWidth,
              oldLabels:
                document.querySelectorAll('[aria-label="고르기 전"]').length +
                Number(document.body.textContent?.includes("고르기 전")),
            };
          },
          { styles },
        );
        expect(measured.rowSizes).toEqual(
          columns === 4 ? [4, 2] : Array(6 / columns).fill(columns),
        );
        expect(measured.misaligned).toEqual([]);
        expect(measured.clipped).toBe(0);
        expect(measured.overflow).toBe(0);
        expect(measured.terms.sort()).toEqual(terms.flat().sort());
        expect(measured.oldLabels).toBe(0);
      } finally {
        await page.close();
      }
    },
  );

  it.each(layouts)(
    "catalog and unit at $viewport / $width px (preview=$preview)",
    async ({ viewport, width, columns, preview }) => {
      const source = createLocalFadingSource({ concepts, today: "2026-10-06" });
      const view = render(
        <FadingCatalogScreen
          catalog={await source.catalog()}
          busy={false}
          onGrade={vi.fn()}
          onConcept={vi.fn()}
        />,
      );
      const page = await browser.newPage({
        viewport: { width: viewport, height: 900 },
      });
      async function load() {
        await page.setContent(
          `<style>html,body,h1,h2,h3,p{margin:0}${css}</style><main data-preview="${preview}" style="width:${width}px;margin:auto">${view.container.innerHTML}</main>`,
        );
      }
      try {
        await load();
        const list = await page.evaluate(
          ({ styles }) => {
            const el = (name: string) =>
              document.getElementsByClassName(styles[name]!)[0] as HTMLElement;
            return {
              columns: getComputedStyle(
                el("cardGrid"),
              ).gridTemplateColumns.split(" ").length,
              featuredDirection: getComputedStyle(el("featured")).flexDirection,
              mainWidth: el("featuredMain").getBoundingClientRect().width,
              headingFont: getComputedStyle(el("featured").querySelector("h2")!)
                .fontSize,
              gradeRows: new Set(
                [...document.getElementsByClassName(styles.gradeChip!)].map(
                  (chip) => Math.round(chip.getBoundingClientRect().top),
                ),
              ).size,
              overflow: document.documentElement.scrollWidth - innerWidth,
              smallControls: [
                ...document.querySelectorAll("button,input"),
              ].filter(
                (node) =>
                  node.getBoundingClientRect().width < 43.5 ||
                  node.getBoundingClientRect().height < 43.5,
              ).length,
            };
          },
          { styles },
        );
        expect(list.columns).toBe(columns);
        expect(list.gradeRows).toBeLessThanOrEqual(2);
        expect(list.featuredDirection).toBe(width >= 1024 ? "row" : "column");
        expect(list.mainWidth).toBeGreaterThanOrEqual(
          width >= 1024 ? 400 : width - 34,
        );
        expect(list.headingFont).toBe(width >= 1024 ? "32px" : "20px");
        expect(list.overflow).toBe(0);
        expect(list.smallControls).toBe(0);

        fireEvent.click(
          screen.getAllByRole("button", { name: /단원 보기/ })[0]!,
        );
        await load();
        const detail = await page.evaluate(
          ({ styles }) => {
            const el = (name: string) =>
              document.getElementsByClassName(styles[name]!)[0] as HTMLElement;
            const bounds = document
              .querySelector("main")!
              .getBoundingClientRect();
            const dock = el("detailDock").getBoundingClientRect();
            const walker = document.createTreeWalker(
              el("screen"),
              NodeFilter.SHOW_TEXT,
            );
            let minFont = Infinity;
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (node.textContent?.trim())
                minFont = Math.min(
                  minFont,
                  parseFloat(getComputedStyle(node.parentElement!).fontSize),
                );
            }
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              dockOutside:
                dock.left < bounds.left - 1 || dock.right > bounds.right + 1,
              dockPosition: getComputedStyle(el("detailDock")).position,
              titleFont: getComputedStyle(el("unitTitle")).fontSize,
              ladderColumns: getComputedStyle(
                el("ladder"),
              ).gridTemplateColumns.split(" ").length,
              minFont,
            };
          },
          { styles },
        );
        expect(detail.overflow).toBe(0);
        expect(detail.dockOutside).toBe(false);
        expect(detail.dockPosition).toBe(preview ? "sticky" : "fixed");
        expect(detail.titleFont).toBe(width >= 1024 ? "32px" : "24px");
        expect(detail.ladderColumns).toBe(width >= 1024 ? 4 : 2);
        expect(detail.minFont).toBeGreaterThanOrEqual(12);
      } finally {
        await page.close();
      }
    },
  );
});
