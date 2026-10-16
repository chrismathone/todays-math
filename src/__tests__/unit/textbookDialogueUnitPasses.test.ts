// @vitest-environment node
/**
 * Real quick-create chapters whose lesson dialogues no longer fit one bounded measurement DOM.
 * 중2-1 «1. 수와 식» has 8 lessons whose dialogues project to more than 600 blocks, and
 * «3. 방정식» has 9 dialogue lessons (over the 8-section cap). Every single-section preview of
 * those lessons failed with «대화의 공통 글자 크기 측정 한도를 넘었습니다».
 * The unit font must still come from every lesson of the chapter, in bounded passes.
 */
import { randomUUID } from "node:crypto";
import type { Browser } from "puppeteer-core";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
} from "@/contracts/textbookQuickCreate.contract";
import {
  createQuickTextbook,
  quickCreateSemester,
  type QuickCreateDependencies,
} from "@/lib/textbook/server/quickCreate";
import type { TextbookActor } from "@/lib/textbook/access";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import { putAsset, linkEditionAssets } from "@/lib/textbook/server/blobs";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  createTextbookRenderModel,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";
import {
  dialogueMeasurementModel,
  dialogueMeasurementPasses,
  recallMeasurementModel,
  assertRecoveryMeasurementBudget,
} from "@/lib/textbook/render/recoveryMeasurement";
import { isDialoguePlacement } from "@/lib/textbook/render/blocks/dialogue";
import { conceptScriptForCast } from "@/lib/textbook/conceptScripts";
import { sha256 } from "@/lib/textbook/hash.server";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { renderTextbookChunk } from "@/lib/textbook/render/server";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import { openTextbookDb, sqlNow, type Db } from "../helpers/textbookPglite";
import {
  insertTeacher,
  pgliteTextbookDb,
} from "../helpers/textbookServerWorld";

let pg: Db, db: TextbookDb, actor: TextbookActor;
const ids = new Map<string, string>();
const m2 = CURRICULUM_UNITS.filter(
  (u) => u.grade === "중2" && quickCreateSemester(u) === 1,
);
const key = (u: { grade: string; chapter: string; section: string }) =>
  `${u.grade}::${u.chapter}::${u.section}`;
/** A decodable portrait (made in beforeAll): the Chromium pass loads and decodes it. */
let png: Buffer, portraitId: string;
/** The bundled concept scripts, exactly as prepareQuickCreateVisuals casts them. */
const deps: QuickCreateDependencies = {
  loadFigure: async () => png,
  prepareVisuals: async (tx, scope) => {
    await putAsset(
      tx,
      scope.userId,
      {
        assetId: portraitId,
        mimeType: "image/png",
        name: "portrait.png",
        widthPx: 30,
        heightPx: 40,
        bytes: png,
      },
      "portrait",
    );
    await linkEditionAssets(tx, scope.editionId, scope.userId, [portraitId]);
    return {
      assetIds: [portraitId],
      dialogueForSection: (sectionKey) =>
        (conceptScriptForCast(sectionKey, {})?.dialogue ?? []).map((turn) => ({
          speakerId:
            turn.role === "teacher"
              ? scope.cast.teacherId
              : turn.role === "student1"
                ? scope.cast.student1Id
                : scope.cast.student2Id,
          portraitAssetId: portraitId,
          side:
            turn.role === "teacher" ? ("left" as const) : ("right" as const),
          expression: turn.expression,
          mirrorPortrait: turn.role === "student2",
          markdown: turn.markdown,
          ...(turn.presentation ? { presentation: turn.presentation } : {}),
        })),
      restForUnit: () => null,
    };
  },
};

beforeAll(async () => {
  png = await sharp({
    create: { width: 30, height: 40, channels: 3, background: "#cccccc" },
  })
    .png()
    .toBuffer();
  portraitId = sha256(png);
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  actor = await insertTeacher(pg);
  for (const [index, unit] of m2.entries()) {
    const id = randomUUID();
    ids.set(key(unit), id);
    await pg.query(
      `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        `J2${1000 + index}`,
      ],
    );
    for (let k = 0; k < 4; k++)
      await pg.query(
        `INSERT INTO "problem" ("id","unit_id","source","difficulty","problem_type","question_type","content","answer","solution","review_status","direct_use_allowed","pool","updated_at")
         VALUES ($1,$2,'manual','기본'::"difficulty",'계산','단답형',$3,$4,$5,'approved'::"review_status",true,'shared',$6)`,
        [
          randomUUID(),
          id,
          `$${index + 2} \\times ${k + 3}$ 를 계산하시오.`,
          String((index + 2) * (k + 3)),
          `$${index + 2} \\times ${k + 3} = ${(index + 2) * (k + 3)}$ 이다.`,
          sqlNow(),
        ],
      );
  }
}, 120_000);

async function chapter(name: string) {
  const lessons = m2.filter((u) => u.chapter === name);
  const result = await createQuickTextbook(
    db,
    actor,
    {
      requestId: randomUUID(),
      schoolLevel: "middle",
      grade: 2,
      semester: 1,
      startUnitId: ids.get(key(lessons[0]))!,
      endUnitId: ids.get(key(lessons.at(-1)!))!,
      difficulty: "standard",
      problemCountPerUnit: 4,
      includeConcepts: true,
      components: DEFAULT_QUICK_CREATE_COMPONENTS as QuickCreateComponents,
    },
    deps,
  );
  const exchange = await assembleExchange(db, result.book.draftEditionId!, {
    exportedAt: new Date().toISOString(),
  });
  return { lessons, exchange };
}
const blocks = (model: TextbookRenderModel) =>
  model.sections.reduce((sum, section) => sum + section.blocks.length, 0);
const dialogueOf = (model: TextbookRenderModel) =>
  model.sections.flatMap((section) =>
    section.blocks
      .filter((block) => isDialoguePlacement(block) || block.dialogueLesson)
      .map((block) => block.id),
  );

describe("real quick-create chapters measure one unit font in bounded passes", () => {
  for (const [name, lessonCount] of [
    ["1. 수와 식", 8],
    ["3. 방정식", 9],
  ] as const)
    it(`${name}: every lesson's dialogue section previews and publishes`, async () => {
      const { lessons, exchange } = await chapter(name);
      expect(lessons).toHaveLength(lessonCount);
      for (const variant of ["student", "answers"] as const) {
        const whole = createTextbookRenderModel(exchange, variant);
        const answers = createTextbookRenderModel(exchange, "answers");
        const talking = whole.sections.filter((section) =>
          section.blocks.some(
            (block) => isDialoguePlacement(block) && block.semantic,
          ),
        );
        // One dialogue section per lesson: splitting large lessons never adds one.
        expect(talking).toHaveLength(lessonCount);
        const unitDialogue = dialogueOf({ ...whole, sections: talking });
        for (const section of talking) {
          const selected = { ...whole, sections: [section] };
          const context = dialogueMeasurementModel(whole, selected);
          const probes = recallMeasurementModel(answers, selected);
          const passes = dialogueMeasurementPasses(context, selected, probes);
          expect(() =>
            assertRecoveryMeasurementBudget(passes.sizing, probes),
          ).not.toThrow();
          for (const batch of passes.batches) {
            expect(batch.sections.length).toBeLessThanOrEqual(8);
            expect(blocks(batch)).toBeLessThanOrEqual(600);
          }
          // Every dialogue block of the chapter is measured exactly once.
          const measured = [passes.sizing, ...passes.batches].flatMap(
            dialogueOf,
          );
          expect(measured.toSorted()).toEqual(unitDialogue.toSorted());
        }
      }
    }, 120_000);
});

/** Real Chromium (TEXTBOOK_PDF_TEST=1): the publish path measures the same chapter in bounded passes. */
describe.skipIf(process.env.TEXTBOOK_PDF_TEST !== "1")(
  "publish renders an over-cap dialogue unit in real Chromium",
  () => {
    let browser: Browser;
    beforeAll(async () => {
      browser = await launchExportBrowser();
    }, 120_000);
    afterAll(async () => {
      await browser?.close();
    }, 60_000);
    const fonts = (html: string) =>
      [...html.matchAll(/data-dialogue-font-pt="([\d.]+)"/g)].map((m) =>
        Number(m[1]),
      );
    const render = (exchange: TextbookExchange, index: number) =>
      renderTextbookChunk({
        exchange,
        officialOrigin: "https://school.example.test",
        readAsset: async (assetId: string) => {
          const [row] = (
            await pg.query<{ bytes: Uint8Array }>(
              `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1::text`,
              [assetId],
            )
          ).rows;
          if (!row) throw new Error(`Missing blob ${assetId}`);
          return new Uint8Array(row.bytes);
        },
        mode: "draft",
        sectionIndices: [index],
        firstPhysicalPageIndex: 1,
        variant: "student",
        browser,
      });
    it("«유리수와 소수» gets the smallest font any lesson of «1. 수와 식» allows", async () => {
      const { exchange } = await chapter("1. 수와 식");
      const whole = createTextbookRenderModel(exchange, "student");
      const talking = whole.sections.flatMap((section, index) =>
        section.blocks.some(
          (block) => isDialoguePlacement(block) && block.semantic,
        )
          ? [index]
          : [],
      );
      expect(talking).toHaveLength(8);
      const target = talking.find(
        (index) => whole.sections[index].title === "유리수와 소수",
      )!;
      const unit = fonts((await render(exchange, target)).html);
      expect(unit.length).toBeGreaterThan(0);
      expect(new Set(unit).size).toBe(1);
      // Each lesson alone (its siblings' dialogue removed) allows its own size; the unit takes the least.
      const alone: number[] = [];
      for (const index of talking) {
        const key = whole.sections[index].sectionKey;
        const solo: TextbookExchange = {
          ...exchange,
          units: exchange.units.map((unit) => ({
            ...unit,
            sections: unit.sections.map((section) =>
              section.sectionKey === key
                ? section
                : {
                    ...section,
                    blocks: section.blocks.filter(
                      (block) =>
                        !(
                          block.kind === "dialogue" ||
                          block.semantic?.node?.kind === "board"
                        ),
                    ),
                  },
            ),
          })),
        };
        // Sibling dialogue parts are now empty and drop out, so find the lesson again.
        const soloIndex = createTextbookRenderModel(
          solo,
          "student",
        ).sections.findIndex((section) => section.sectionKey === key);
        alone.push(...new Set(fonts((await render(solo, soloIndex)).html)));
      }
      // Only semantic placements (the lessons' boards) carry the unit font; one lesson has none.
      expect(alone.length).toBeGreaterThanOrEqual(7);
      expect(unit[0]).toBe(Math.min(...alone));
    }, 600_000);
  },
);
