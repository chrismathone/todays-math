// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { readImageDimensions } from "@/lib/printImageDimensions";
import { sha256 } from "@/lib/textbook/hash.server";
import {
  DEFAULT_TEXTBOOK_CAST,
  TEXTBOOK_CHARACTERS,
  resolveTextbookCast,
} from "@/lib/textbook/characters";
import { REST_STORIES, restStoryMarkdown } from "@/lib/textbook/restStories";
import {
  renderTextbookChunk,
  renderTextbookOfflineHtml,
  validateRenderedPages,
} from "@/lib/textbook/render/server";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

describe.skipIf(process.env.TEXTBOOK_VISUAL_TEST !== "1")(
  "original generated visuals in measured Chromium print",
  () => {
    it("prints all expressions, mirrored clipped frames, legacy portraits and six native rest sections without overflow", async () => {
      const exchange = textbookFixture(1, 0);
      const bytes = new Map<string, Uint8Array>();
      const assetIds = new Map<string, string>();
      const cast = resolveTextbookCast(DEFAULT_TEXTBOOK_CAST);
      const sources = [
        ...TEXTBOOK_CHARACTERS,
        ...REST_STORIES.map((story) => ({ id: story.id, src: story.imageSrc })),
      ];
      for (const source of sources) {
        const original = new Uint8Array(
          await readFile(
            path.join(process.cwd(), "public", source.src.slice(1)),
          ),
        );
        const assetId = sha256(original);
        const dimensions = readImageDimensions(Buffer.from(original))!;
        expect(dimensions.width).toBeGreaterThan(1000);
        if (source.src.includes("portraits"))
          expect(dimensions.width).toBe(dimensions.height);
        bytes.set(assetId, original);
        assetIds.set(source.id, assetId);
        exchange.assets.push({
          assetId,
          sha256: assetId,
          packagePath: `assets/${assetId}.png`,
          mimeType: "image/png",
          widthPx: dimensions.width,
          heightPx: dimensions.height,
        });
      }
      const roles = Object.values(cast);
      exchange.units[0].sections = [
        {
          sectionKey: "opening",
          title: "단원을 여는 수업",
          templateKey: "concept-opening",
          startPolicy: "even-left",
          blocks: [
            {
              blockId: "opening-dialogue",
              kind: "dialogue",
              turns: [
                ...["neutral", "question", "thinking", "aha"].flatMap(
                  (expression) =>
                    roles.map((character, index) => ({
                      speakerId: `tb-portrait-${character.id}`,
                      side:
                        index === 0 ? ("left" as const) : ("right" as const),
                      expression: expression as
                        "neutral" | "question" | "thinking" | "aha",
                      portraitAssetId: assetIds.get(character.id)!,
                      mirrorPortrait: index === 2,
                      markdown:
                        index === 0
                          ? "크기가 같은 피자를 같은 넓이로 나누면 공평하게 나눌 수 있어요."
                          : "한 조각의 크기도 함께 확인해야 해요. $12\\div6=2$예요.",
                    })),
                ),
                {
                  speakerId: "legacy-teacher",
                  side: "left",
                  expression: "neutral",
                  portraitAssetId: assetIds.get(cast.teacher.id)!,
                  mirrorPortrait: false,
                  markdown: "기존 한 장짜리 초상화도 계속 표시됩니다.",
                },
              ],
            },
          ],
        },
        ...REST_STORIES.map((story) => ({
          sectionKey: `rest-${story.id}`,
          title: `잠깐 쉬어가기 · ${story.title}`,
          templateKey: "rest",
          startPolicy: "continue" as const,
          blocks: [
            {
              blockId: `rest-image-${story.id}`,
              kind: "image" as const,
              assetId: assetIds.get(story.id)!,
              caption: story.title,
            },
            {
              blockId: `rest-text-${story.id}`,
              kind: "text" as const,
              markdown: restStoryMarkdown(story),
            },
          ],
        })),
        {
          sectionKey: "auto-intro",
          title: "생활 속의 수와 관계",
          templateKey: "auto-unit-intro",
          startPolicy: "continue",
          blocks: [
            {
              blockId: "auto-intro-content",
              kind: "text",
              markdown:
                "## 배울 내용\n\n- 같은 개수로 나누는 상황을 설명할 수 있다.\n- 반복되는 규칙을 찾고 그 이유를 말할 수 있다.\n\n## 준비할 개념\n\n곱셈과 나눗셈을 서로 연결해 보세요.",
            },
          ],
        },
      ];
      const browser = await launchExportBrowser();
      try {
        const result = await renderTextbookChunk({
          exchange,
          readAsset: async (id) => bytes.get(id)!,
          officialOrigin: SYNTHETIC_ORIGIN,
          sectionIndices: exchange.units[0].sections.map((_, index) => index),
          firstPhysicalPageIndex: 2,
          variant: "student",
          browser,
          mode: "draft",
          maxPages: 20,
        });
        expect(result.pdf.byteLength).toBeGreaterThan(100_000);
        expect(
          result.issues.filter((issue) => issue.severity === "error"),
        ).toEqual([]);
        const page = await browser.newPage();
        await page.setContent(result.html, { waitUntil: "load" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
        });
        const portraits = await page.$$eval(".tb-portrait-frame", (frames) =>
          frames.map((frame) => {
            const image = frame.querySelector("img")!;
            const imgStyle = getComputedStyle(image);
            const frameRect = frame.getBoundingClientRect();
            const imgRect = image.getBoundingClientRect();
            return {
              expression: frame
                .closest("[data-expression]")!
                .getAttribute("data-expression"),
              overflow: getComputedStyle(frame).overflow,
              ratio: imgRect.width / frameRect.width,
              left: parseFloat(imgStyle.left) / frameRect.width,
              top: parseFloat(imgStyle.top) / frameRect.height,
              mirrored: getComputedStyle(frame).transform !== "none",
            };
          }),
        );
        expect(portraits).toHaveLength(12);
        for (const portrait of portraits) {
          expect(portrait.overflow).toBe("hidden");
          expect(portrait.ratio).toBeCloseTo(2, 2);
          expect(portrait.left).toBeCloseTo(
            ["question", "aha"].includes(portrait.expression!) ? -1 : 0,
            2,
          );
          expect(portrait.top).toBeCloseTo(
            ["thinking", "aha"].includes(portrait.expression!) ? -1 : 0,
            2,
          );
        }
        expect(portraits.filter((portrait) => portrait.mirrored)).toHaveLength(
          4,
        );
        const intro = await page.$eval(
          '.tb-block[data-template-key="auto-unit-intro"] .tb-unit-heading',
          (heading) => ({
            background: getComputedStyle(heading).backgroundColor,
            title: heading.querySelector(".tb-unit-title")?.textContent,
            art: heading.querySelector("img")?.getAttribute("src"),
            heightMm: (heading.getBoundingClientRect().height * 25.4) / 96,
          }),
        );
        expect(intro.background).toBe("rgb(242, 246, 239)");
        expect(intro.title).toBeTruthy();
        expect(intro.art).toMatch(/^data:image\/png;base64,/);
        expect(intro.heightMm).toBeGreaterThanOrEqual(219.9);
        for (const story of REST_STORIES) {
          const storyPages = result.pages.filter(
            (p) => p.sectionKey === `rest-${story.id}`,
          );
          expect(storyPages, JSON.stringify(storyPages)).toHaveLength(1);
          expect(storyPages[0].blocks.map((b) => b.blockId)).toEqual(
            createTextbookRenderModel(exchange, "student")
              .sections.find((s) => s.sectionKey === `rest-${story.id}`)!
              .blocks.map((b) => b.id),
          );
          expect(result.html).toContain(story.title);
        }
        const footers = await page.$$eval(".tb-footer", (elements) =>
          elements.map((footer) => {
            const frame = footer.getBoundingClientRect();
            const number = footer
              .querySelector("strong")!
              .getBoundingClientRect();
            return {
              odd: footer.closest(".tb-page-odd") !== null,
              relativeNumber: (number.left - frame.left) / frame.width,
            };
          }),
        );
        for (const footer of footers.filter((footer) => !footer.odd))
          expect(footer.relativeNumber).toBeCloseTo(0, 2);
        expect(
          footers
            .filter((footer) => footer.odd)
            .every((footer) => footer.relativeNumber > 0.8),
        ).toBe(true);
        const output = path.join(
          process.cwd(),
          "tmp",
          "textbook-visual-review",
        );
        await mkdir(output, { recursive: true });
        const openingPages = await page.$$(
          '.tb-paper[data-section-key="opening"]',
        );
        const openingBefore = await Promise.all(
          openingPages.map((element) => element.screenshot()),
        );
        const offline = await renderTextbookOfflineHtml({
          exchange,
          pages: result.pages,
          readAsset: async (id) => bytes.get(id)!,
          officialOrigin: SYNTHETIC_ORIGIN,
          variant: "student",
        });
        await page.setContent(offline, { waitUntil: "load" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
        });
        expect(
          await page.$$eval(
            "img[data-textbook-inline-image]",
            (images) => images.length,
          ),
        ).toBeGreaterThan(0);
        const offlineOpeningPages = await page.$$(
          '.tb-paper[data-section-key="opening"]',
        );
        const openingAfter = await Promise.all(
          offlineOpeningPages.map((element) => element.screenshot()),
        );
        expect(openingAfter.map(sha256)).toEqual(openingBefore.map(sha256));
        await writeFile(path.join(output, "visual-v15-offline.html"), offline);
        await writeFile(path.join(output, "visual-v15.pdf"), result.pdf);
        await writeFile(path.join(output, "visual-v15.html"), result.html);
        await page.screenshot({
          path: path.join(output, "visual-v15.png"),
          fullPage: true,
        });
        await page.$eval('.tb-paper[data-section-key="opening"]', (element) =>
          element.scrollIntoView(),
        );
        await page.screenshot({ path: path.join(output, "opening-v15.png") });
        await page.$eval(
          '.tb-paper[data-section-key="rest-sharing"]',
          (element) => element.scrollIntoView(),
        );
        await page.screenshot({
          path: path.join(output, "rest-sharing-v15.png"),
        });
        await page.$eval(
          '.tb-paper[data-section-key="auto-intro"]',
          (element) => element.scrollIntoView(),
        );
        await page.screenshot({
          path: path.join(output, "auto-intro-v15.png"),
        });
        const model = createTextbookRenderModel(exchange, "student");
        await page.$eval(".tb-portrait-frame", (frame) => {
          (frame as HTMLElement).style.overflow = "visible";
        });
        await expect(
          validateRenderedPages(page, model, result.pages),
        ).rejects.toThrow("Content overflow");
        await page.$eval(".tb-portrait-frame", (frame) => {
          (frame as HTMLElement).style.overflow = "";
        });
        await page.$eval(".tb-dialogue-atlas", (dialogue) => {
          (dialogue as HTMLElement).dataset.speakerId = "tb-portrait-custom";
        });
        await expect(
          validateRenderedPages(page, model, result.pages),
        ).rejects.toThrow("Content overflow");
        await page.$eval(".tb-dialogue-atlas", (dialogue) => {
          (dialogue as HTMLElement).dataset.speakerId =
            "tb-portrait-teacher-f1";
        });
        await page.$eval(
          '.tb-block[data-block-id="rest-image-sharing"] img',
          (image) => {
            (image as HTMLElement).style.width = "5000px";
            (image as HTMLElement).style.maxWidth = "none";
          },
        );
        await expect(
          validateRenderedPages(page, model, result.pages),
        ).rejects.toThrow("Content overflow");
        await page.close();
      } finally {
        await browser.close();
      }
    }, 120_000);
  },
);
