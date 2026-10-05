// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { canonicalJson } from "@/lib/textbook/canonical";
import { codexRenderer } from "@/lib/textbook/publish/codexRenderer";
import { renderTextbookChunk } from "@/lib/textbook/render/server";
import {
  noAssets,
  openArtifact,
} from "../../../scripts/qa/textbook/recovery/intro-proof";
import { SYNTHETIC_ORIGIN, textbookFixture } from "../helpers/textbookFixture";

describe.skipIf(process.env.TEXTBOOK_PDF_TEST !== "1")(
  "offline references from verified PDF placements",
  () => {
    it("prints the same contents, concept and problem index cells as the final PDF document and rejects missing targets", async () => {
      const exchange = textbookFixture(2, 1);
      const target = exchange.units[0].sections[1];
      target.startPolicy = "continue";
      target.blocks.unshift({
        blockId: "offline-concept",
        kind: "text",
        markdown: "합성 개념",
        semantic: {
          activity: "concepts",
          node: {
            kind: "concept",
            conceptId: "offline-concept-id",
            title: "합성 개념",
            rows: [
              {
                rowKey: "definition",
                label: "뜻",
                rawText: "합성 개념의 설명입니다.",
              },
            ],
          },
        },
      });
      exchange.units[0].sections[0].blocks.unshift(
        ...(
          [
            {
              activity: "tableOfContents",
              key: "toc",
              label: "합성 목차",
              targetUnitKey: exchange.units[0].unitKey,
              targetSectionKey: target.sectionKey,
            },
            {
              activity: "conceptIndex",
              key: "concept-index",
              label: "합성 개념 색인",
              targetConceptId: "offline-concept-id",
            },
            {
              activity: "typeIndex",
              key: "problem-index",
              label: "합성 문제 색인",
              targetItemId: exchange.items.find(
                (item) => item.sectionKey === target.sectionKey,
              )!.itemId,
            },
          ] as const
        ).map(({ activity, ...entry }) => ({
          blockId: entry.key,
          kind: "text" as const,
          markdown: entry.label,
          semantic: {
            activity,
            node: { kind: "references" as const, entries: [entry] },
          },
        })),
      );
      const before = canonicalJson(exchange);
      const browser = await launchExportBrowser();
      try {
        const reserve = await renderTextbookChunk({
          exchange,
          readAsset: noAssets,
          officialOrigin: SYNTHETIC_ORIGIN,
          sectionIndices: [0, 1],
          firstPhysicalPageIndex: 1,
          variant: "student",
          mode: "draft",
          browser,
        });
        const final = await renderTextbookChunk({
          exchange,
          readAsset: noAssets,
          officialOrigin: SYNTHETIC_ORIGIN,
          sectionIndices: [0, 1],
          firstPhysicalPageIndex: 1,
          variant: "student",
          mode: "draft",
          browser,
          referencePages: reserve.pages,
          reservedPages: reserve.pages,
        });
        const { page } = await openArtifact(browser, final.html);
        try {
          const cells = () =>
            page.$$eval(".tb-reference-row", (rows) =>
              rows.map((row) => ({
                label: row.firstElementChild!.textContent!.trim(),
                page: row
                  .querySelector(".tb-reference-page")!
                  .textContent!.trim(),
              })),
            );
          const expected = await cells();
          expect(expected).toHaveLength(3);
          expect(expected.every((entry) => /^\d+$/.test(entry.page))).toBe(
            true,
          );
          const carry = {
            pages: final.pages,
            qrPlacements: final.qrPlacements,
            artifactHash: final.artifactHash,
          };
          const offline = await codexRenderer.offlineHtml!({
            exchange,
            readAsset: noAssets,
            officialOrigin: SYNTHETIC_ORIGIN,
            chunkCarries: [carry],
          });
          await page.setContent(new TextDecoder().decode(offline), {
            waitUntil: "load",
          });
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          expect(await cells()).toEqual(expected);
          expect(canonicalJson(exchange)).toBe(before);
          const missingTarget = {
            ...carry,
            pages: final.pages.filter(
              (printed) => printed.sectionKey !== target.sectionKey,
            ),
          };
          await expect(
            codexRenderer.offlineHtml!({
              exchange,
              readAsset: noAssets,
              officialOrigin: SYNTHETIC_ORIGIN,
              chunkCarries: [missingTarget],
            }),
          ).rejects.toThrow("PAGE_REFERENCE_MISSING");
          expect(canonicalJson(exchange)).toBe(before);
        } finally {
          await page.close();
        }
      } finally {
        await browser.close();
      }
    }, 180_000);
  },
);
