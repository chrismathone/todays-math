import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FadingHome } from "@/components/fading/FadingHome";
import { FadingCatalogScreen } from "@/components/fading/FadingCatalogScreen";
import { FadingEraseScreen } from "@/components/fading/FadingEraseScreen";
import { FadingStats } from "@/components/fading/FadingStats";
import homeStyles from "@/components/fading/fading.module.css";
import catalogStyles from "@/components/fading/FadingCatalogScreen.module.css";
import statsStyles from "@/components/fading/FadingStats.module.css";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";

vi.mock("@/components/fading/FadingMath", () => ({
  FadingMath: ({ text }: { text: string }) => <span>{text}</span>,
}));
afterEach(cleanup);
function css(file: string, styles: Record<string, string>) {
  return readFileSync(resolve("src/components/fading", file), "utf8")
    .replace(/:global\(([^)]+)\)/g, "$1")
    .replace(/\.([a-zA-Z_][\w-]*)/g, (original, name: string) =>
      styles[name] ? `.${styles[name]}` : original,
    );
}
it("student overview layouts fit PC 1366 and phone 390; capture authored fixture only", async () => {
  const concepts: FadingConcept[] = Array.from({ length: 7 }, (_, index) => ({
    id: `overview-layout-${index}`,
    section: `${index === 0 ? "초5" : ["초3", "초4", "초6", "중1", "중2", "중3"][index - 1]}::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기`,
    level: "하",
    ordinal: 1,
    siblings: 1,
    propositions: [
      {
        id: `p${index}`,
        term: "이상과 이하",
        kind: "정의",
        pieces: [
          {
            kind: "target",
            target: { id: `t${index}`, text: "같거나 큰 수", tier: "text" },
          },
        ],
      },
    ],
  }));
  const source = createLocalFadingSource({ concepts, today: "2026-10-20" });
  const state = await source.act({
    action: "pick",
    conceptId: concepts[0]!.id,
  });
  state.summary.mode = "all";
  state.days = [{ date: state.today, reviews: 3, passed: 1, fresh: 1 }];
  const catalog = await source.catalog("초5");
  const styles =
    css("fading.module.css", homeStyles) +
    css("FadingCatalogScreen.module.css", catalogStyles) +
    css("FadingStats.module.css", statsStyles);
  const browser = await chromium.launch({ headless: true });
  mkdirSync(".qa-artifacts/words-overview", { recursive: true });
  try {
    const views = {
      home: (
        <FadingHome
          student
          state={state}
          source={source}
          busy={false}
          onCatalog={vi.fn()}
          onOpen={vi.fn()}
          onMode={vi.fn()}
        />
      ),
      catalog: (
        <FadingCatalogScreen
          student
          catalog={catalog}
          busy={false}
          onGrade={vi.fn()}
          onConcept={vi.fn()}
        />
      ),
      erase: (
        <FadingEraseScreen
          student
          state={state}
          source={source}
          onCatalog={vi.fn()}
          onOpen={vi.fn()}
        />
      ),
      stats: <FadingStats student state={state} onCatalog={vi.fn()} />,
    };
    for (const [name, view] of Object.entries(views)) {
      const rendered = render(view);
      if (name === "erase")
        await screen.findByRole("heading", { name: "이상과 이하 알아보기" });
      for (const width of [1366, 390]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
        });
        try {
          await page.setContent(
            `<style>html,body{margin:0}*,*::before,*::after{box-sizing:border-box}${styles}</style><main class="${homeStyles.viewport}"><div class="${homeStyles.root}" style="padding:16px">${rendered.container.innerHTML}</div></main>`,
          );
          await page.screenshot({
            path: `.qa-artifacts/words-overview/${name}-${width}.png`,
            fullPage: true,
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${name} ${width}px horizontal overflow`,
          ).toBe(true);
        } finally {
          await page.close();
        }
      }
      cleanup();
    }
  } finally {
    await browser.close();
  }
}, 60000);
