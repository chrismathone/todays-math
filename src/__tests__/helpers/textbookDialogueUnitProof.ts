/** Isolated dialogue-unit QA: synthetic DOM controls and optional read-only frozen input. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import { buildSectionPreview } from "@/components/textbook/previewModel";
import { createTextbookApi } from "@/lib/textbook/client";
import { isDialoguePlacement } from "@/lib/textbook/render/blocks/dialogue";
import { createTextbookRenderModel, type RenderBlock, type TextbookRenderModel } from "@/lib/textbook/render/model";
import { textbookFixture } from "./textbookFixture";

export const ACTUAL_DIALOGUE_UNIT = "u-013f0b8a-1e66-4afc-b56d-5be6e7df30b2";
export const dialogueIds = (model: TextbookRenderModel) => model.sections.flatMap((section) => section.blocks.filter((block) => isDialoguePlacement(block) && block.semantic).map((block) => block.id));
export const blockCount = (model: TextbookRenderModel) => model.sections.reduce((sum, section) => sum + section.blocks.length, 0);

/** Three synthetic curriculum sections; the middle one requires a smaller size. No DB/source content. */
export function syntheticDialogueUnit(): TextbookRenderModel {
  const model = createTextbookRenderModel(textbookFixture(1, 0), "student");
  model.config.print.coverMode = "separate";
  model.sections = [4, 15, 6].map((count, index) => {
    const sectionKey = `dialogue-unit-synthetic-${index}`;
    const base = { unitKey: "dialogue-unit-synthetic", sectionKey, editorialStage: "opening" as const };
    const blocks: RenderBlock[] = [{ ...base, id: `${sectionKey}-heading`, sourceBlockId: `${sectionKey}-heading`, kind: "heading", title: "합성 대화 단원", semantic: { activity: "dialogue" } }];
    for (let turn = 0; turn < count; turn++) {
      if (turn === 2) blocks.push({ ...base, id: `${sectionKey}-caption`, sourceBlockId: `${sectionKey}-caption`, kind: "text", markdown: "합성 두 번째 주제", dialogueLesson: { lessonKey: `${sectionKey}-second`, lessonTitle: "합성 두 번째 주제" } });
      blocks.push({ ...base, id: `${sectionKey}-turn-${turn}`, sourceBlockId: `${sectionKey}-turn-${turn}`, kind: "dialogue", speakerId: "tb-portrait-teacher-f1", portraitAssetId: "synthetic-portrait", side: "left", expression: "neutral", mirrorPortrait: false, markdown: "합성 발화에서 $\\frac{2}{3}$와 $\\frac{1}{3}$의 합을 생각해요. 같은 분모를 두고 분자끼리 더하면 $1$이에요.", semantic: { activity: "dialogue" } });
    }
    return { ...base, unitTitle: "합성 단원", title: "합성 대화", templateKey: "auto-lesson-synthetic", startPolicy: "continue" as const, blocks };
  });
  return model;
}

/** Reads the supplied frozen directory, hashes its bytes and never opens a database. */
export function frozenDialogueInput() {
  const directory = process.env.TEXTBOOK_DIALOGUE_UNIT_FIXTURE;
  if (!directory) throw new Error("Set TEXTBOOK_DIALOGUE_UNIT_FIXTURE to the frozen E5-1 directory");
  const bytes = readFileSync(path.join(directory, "exchange.private.json"));
  const exchange = textbookExchangeSchema.parse(JSON.parse(bytes.toString("utf8")));
  const model = createTextbookRenderModel(exchange, "student");
  const indices = model.sections.flatMap((section, index) => section.unitKey === ACTUAL_DIALOGUE_UNIT && section.blocks.some((block) => isDialoguePlacement(block) && block.semantic) ? [index] : []);
  if (!indices.length) throw new Error("Frozen input has no semantic dialogue in the requested actual unit");
  return { directory, exchange, model, indices, sha256: createHash("sha256").update(bytes).digest("hex"), readAsset: async (id: string) => {
    const asset = exchange.assets.find((entry) => entry.assetId === id);
    if (!asset) throw new Error(`Unknown frozen asset ${id}`);
    const assetPath = path.resolve(directory, asset.packagePath);
    if (!assetPath.startsWith(path.resolve(directory) + path.sep)) throw new Error("Frozen asset path escapes fixture directory");
    return new Uint8Array(readFileSync(assetPath));
  } };
}

/** Real client parsing and preview assembly; only the HTTP transport/book ownership metadata is synthetic. */
export async function buildFrozenDialoguePreview(frozen: ReturnType<typeof frozenDialogueInput>, index: number) {
  const exchange = frozen.exchange;
  const projected = frozen.model.sections[index];
  const unit = exchange.units.find((entry) => entry.unitKey === projected.unitKey)!;
  const section = unit.sections.find((entry) => entry.sectionKey === projected.sectionKey)!;
  const sectionId = section.sectionKey.replace(/^s-/, "");
  const calls: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    if (init?.method && init.method !== "GET") throw new Error("Dialogue-unit QA transport is read-only");
    const url = String(input);
    calls.push(url);
    let data: unknown;
    if (url.endsWith("/export")) data = exchange;
    else if (url.endsWith(`/sections/${sectionId}`)) data = { id: sectionId, unitKey: unit.unitKey, revision: 1, section, updatedAt: exchange.exportedAt };
    else if (url.endsWith(`/editions/${exchange.edition.editionId}`)) data = {
      book: { id: exchange.config.bookId, ownerId: "00000000-0000-4000-8000-000000000999", ownerName: "합성 전송", isOwner: true, title: exchange.config.title, visibility: "private", sharedBranchId: null, archivedAt: null, createdAt: exchange.exportedAt, updatedAt: exchange.exportedAt, draftEditionId: exchange.edition.editionId, latestPublishedEditionId: null },
      edition: exchange.edition, config: exchange.config, structureRevision: 1, issues: [],
      outline: exchange.units.map((entry) => ({ ...entry, sections: entry.sections.map((row, at) => ({ id: row.sectionKey.startsWith("s-") ? row.sectionKey.slice(2) : `00000000-0000-4000-8000-${String(at + 1).padStart(12, "0")}`, sectionKey: row.sectionKey, title: row.title, revision: 1 })) })),
    };
    else throw new Error(`Unexpected QA transport read ${url}`);
    return new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const api = createTextbookApi(transport);
  const edition = await api.openEdition(exchange.edition.editionId);
  const selected = await api.getSection(exchange.edition.editionId, sectionId);
  const material = await api.readPreviewMaterial(exchange.edition.editionId);
  const built = buildSectionPreview({ edition, section: selected, material, variant: "student" });
  if (!built.ok) throw new Error(built.message);
  return { built, material, calls, selected };
}

export interface DialoguePageWitness {
  index: number;
  paperMm: number[];
  fontsReady: boolean;
  blocks: Array<{ id: string; pt: number | null; bottomMm: number; clipped: boolean; clippingDetails?: unknown[]; speechPt: number[]; families: string[]; mathCount: number }>;
}
/** Independent delivered-page geometry and computed speech/board font capture. Portrait atlas crops are intentional. */
export const DIALOGUE_UNIT_PAGE_PROBE = String.raw`(function () {
  var mm = 25.4 / 96;
  return Array.from(document.querySelectorAll('[data-textbook-page]')).map(function (paper) {
    var pr = paper.getBoundingClientRect();
    return { index: Number(paper.dataset.textbookPage), paperMm: [pr.width*mm,pr.height*mm], fontsReady: document.fonts.check('400 13px TextbookPretendard','가나다') && document.fonts.check('700 13px TextbookPretendard','가나다'), blocks: Array.from(paper.querySelectorAll('.tb-block')).map(function (block) {
      var br = block.getBoundingClientRect(), sized = block.querySelector('[data-dialogue-font-pt]');
      var texts = Array.from(block.querySelectorAll('.tb-bubble,.tb-board-formula,.tb-board-text'));
      var clippingDetails = Array.from(block.querySelectorAll('.tb-prose,.tb-bubble,.tb-board-formula,.tb-board-text,.katex-html')).flatMap(function (child) {
        var cr = child.getBoundingClientRect();
        var leaves = cr.bottom > br.bottom+1.89 || cr.top < br.top-1.89 || cr.left < br.left-1.89 || cr.right > br.right+1.89;
        // Visible bubble tails contribute to scrollWidth. Only an actual clipping box makes that an error.
        var scroll = getComputedStyle(child).overflow !== 'visible' && (child.scrollHeight > child.clientHeight+2 || child.scrollWidth > child.clientWidth+2);
        return leaves || scroll ? [{ className: child.className, overflow: getComputedStyle(child).overflow, leaves: leaves, scroll: scroll, boundsMm: [(cr.top-br.top)*mm,(cr.bottom-br.bottom)*mm,(cr.left-br.left)*mm,(cr.right-br.right)*mm], scrollSize: [child.scrollHeight,child.clientHeight,child.scrollWidth,child.clientWidth] }] : [];
      });
      texts.forEach(function (text) {
        var frame = text.getBoundingClientRect(), walker = document.createTreeWalker(text,NodeFilter.SHOW_TEXT), node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim() || node.parentElement.closest('.katex-mathml')) continue;
          var range = document.createRange(); range.selectNodeContents(node);
          Array.from(range.getClientRects()).forEach(function (r) {
            if (r.width && (r.left < frame.left-1.89 || r.right > frame.right+1.89 || r.top < frame.top-1.89 || r.bottom > frame.bottom+1.89)) clippingDetails.push({ textRangeOutsideSpeech: true, deltaMm: [(r.left-frame.left)*mm,(r.right-frame.right)*mm,(r.top-frame.top)*mm,(r.bottom-frame.bottom)*mm] });
          });
        }
      });
      return { id: block.dataset.blockId, pt: sized ? Number(sized.dataset.dialogueFontPt) : null, bottomMm: (br.bottom-pr.top)*mm, clipped: clippingDetails.length > 0, clippingDetails: clippingDetails, speechPt: texts.map(function (t) { return parseFloat(getComputedStyle(t).fontSize)*72/96; }), families: texts.map(function (t) { return getComputedStyle(t).fontFamily; }), mathCount: block.querySelectorAll('.katex-html').length };
    }) };
  });
})()`;

/** Completeness is part of the independent gate: absent selected blocks cannot pass. */
export function judgeDialogueUnit(pages: DialoguePageWitness[], expectedIds: string[], expectedPt: number): string[] {
  const failures = new Set<string>();
  const blocks = pages.flatMap((page) => page.blocks);
  for (const id of expectedIds) {
    const matches = blocks.filter((block) => block.id === id);
    if (matches.length !== 1) failures.add("missing-or-duplicate-dialogue");
    for (const block of matches) {
      if (block.pt !== expectedPt || block.speechPt.some((pt) => Math.abs(pt - expectedPt) > 0.01)) failures.add("common-unit-font");
      if (block.clipped || block.bottomMm > 266.5) failures.add("dialogue-clipping");
      if (block.families.some((family) => !family.includes("TextbookPretendard"))) failures.add("dialogue-font-family");
    }
  }
  for (const page of pages) {
    if (!page.fontsReady) failures.add("fonts-not-ready");
    if (Math.abs(page.paperMm[0] - 210) > 0.5 || Math.abs(page.paperMm[1] - 297) > 0.5) failures.add("paper-size");
  }
  return [...failures].sort();
}
