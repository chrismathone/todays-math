// @vitest-environment node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fixtures from "../../../e2e/concept-blank-paper/student-clear-fixtures.json";
import { conceptEntrySchema } from "@/contracts/conceptBlank.contract";
import { conceptQuestionBlocks } from "@/lib/textbook/conceptQuestions";
import { QUESTION_REVISION } from "@/lib/concept-blank/questions";
import { textbookConceptSchema } from "@/contracts/textbookConcept.contract";
import { canonicalHash, conceptContentHash } from "@/lib/textbook/hash.server";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
  resolveBlankSections,
} from "@/lib/concept-blank/exactPick";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { renderTextbookChunk } from "@/lib/textbook/render/server";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

describe.skipIf(process.env.TEXTBOOK_STUDENT_QUESTIONS_PRINT_TEST !== "1")(
  "new textbook questions in the production PDF renderer",
  () => {
    it("prints the seven-grade question fixtures in both variants without overflow, leaks or lost criteria", async () => {
      const exchange = textbookFixture(fixtures.entries.length, 0);
      exchange.config.print.coverMode = "separate";
      const entries = fixtures.entries.map((entry) =>
        conceptEntrySchema.parse({
          ...entry,
          questionRevision: QUESTION_REVISION,
        }),
      );
      exchange.conceptIntegration = {
        version: "injaewon.textbook.concepts.v1",
        concepts: [],
      };
      for (const [index, section] of exchange.units[0].sections.entries()) {
        section.startPolicy = "continue";
        const selected = [
          entries[index],
          { ...entries[index], id: `${entries[index].id}-second` },
        ];
        const conceptKey = `question-fixture-${index}`;
        const concept = textbookConceptSchema.parse({
          conceptKey,
          unitKey: exchange.units[0].unitKey,
          sectionKey: section.sectionKey,
          title: "구조 검증 개념",
          kind: entries[index].kind,
          unitId: null,
          body: {
            goal: "질문 구조를 검증한다.",
            prerequisites: [],
            definition: "합성 교재 검증용 설명",
            conditions: null,
            examples: [],
            counterexamples: [],
            misconceptions: [],
            explainPrompt: null,
          },
          blankItems: selected.map((entry) => ({
            blankSectionKey: entry.section,
            entryKind: "concept",
            entryId: entry.id,
            review: {
              status: "confirmed",
              candidateRule: "manual",
              reviewedBy: exchange.config.bookId,
              reviewedAt: exchange.exportedAt,
              targetHash: canonicalHash(entry),
            },
          })),
          blankForms: ["term"],
          links: [],
          mappingVersion: "student-question-fixture-v1",
          derivedFromConceptKey: null,
          frozen: {
            contentHash: "0".repeat(64),
            parserVersion: EXACT_PARSER_VERSION,
            compositionVersion: EXACT_COMPOSITION_VERSION,
            mappingVersion: "student-question-fixture-v1",
            sections: resolveBlankSections([entries[index].section]),
            entries: selected.map((payload) => ({
              entryKind: "concept",
              payload,
            })),
            selection: selected.map((entry) => ({
              blankSectionKey: entry.section,
              entryKind: "concept",
              entryId: entry.id,
              form: "term",
              level: entry.level,
            })),
            assetHashes: [],
          },
        });
        concept.frozen!.contentHash = conceptContentHash(concept);
        exchange.conceptIntegration.concepts.push(concept);
        section.title = `${entries[index].section.split("::")[0]} 개념 질문 · 구조 검증`;
        section.templateKey = "auto-lesson";
        section.blocks = conceptQuestionBlocks({
          entries: selected,
          conceptKey,
          activity: "termRecall",
          title: "개념 질문",
        });
      }
      const browser = await launchExportBrowser();
      const output = path.join(
        process.cwd(),
        "test-results/textbook-student-questions",
      );
      await mkdir(output, { recursive: true });
      try {
        for (const variant of ["student", "answers"] as const) {
          const rendered = await renderTextbookChunk({
            exchange,
            officialOrigin: SYNTHETIC_ORIGIN,
            readAsset: async () => {
              throw new Error("No fixture assets expected");
            },
            sectionIndices: entries.map((_entry, index) => index),
            firstPhysicalPageIndex: 1,
            variant,
            browser,
          });
          expect(rendered.pages.length).toBeGreaterThanOrEqual(entries.length);
          if (variant === "student") {
            for (const entry of entries)
              expect(rendered.html).not.toContain(entry.bQuestion!.answer);
            expect(rendered.html).toContain("물음에 대한 답 쓰기");
          } else expect(rendered.html).toContain("확인할 내용");
          await writeFile(path.join(output, `${variant}.html`), rendered.html);
          await writeFile(path.join(output, `${variant}.pdf`), rendered.pdf);
          const page = await browser.newPage();
          await page.setViewport({
            width: 1100,
            height: 1300,
            deviceScaleFactor: 1,
          });
          await page.setContent(rendered.html, { waitUntil: "load" });
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          const papers = await page.$$(".tb-paper");
          for (const [index, paper] of papers.entries())
            await paper.screenshot({
              path: path.join(output, `${variant}-${index + 1}.png`),
            });
          await page.close();
          await writeFile(
            path.join(output, `${variant}-report.json`),
            JSON.stringify(
              {
                purpose: fixtures.purpose,
                variant,
                pages: rendered.pages.length,
                ids: entries.map((entry) => entry.id),
                verifiedByProductionRenderer: true,
              },
              null,
              2,
            ) + "\n",
          );
        }
      } finally {
        await browser.close();
      }
    }, 180_000);
  },
);
