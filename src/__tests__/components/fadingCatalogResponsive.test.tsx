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
  { viewport: 1280, width: 288, columns: 1, preview: true },
  { viewport: 1280, width: 358, columns: 1, preview: true },
] as const;

describe("catalog layouts follow available width", () => {
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
