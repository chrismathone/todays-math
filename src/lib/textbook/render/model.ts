import type {
  AssetRef,
  FigureRef,
  TextbookConfig,
  TextbookExchange,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import type { TextbookConceptBody } from "@/contracts/textbookConcept.contract";
import type {
  TextbookDialoguePresentation,
  TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import {
  recallPieces,
  splitRecallMarkdown,
  splitTextbookMarkdown,
  type RecallPiece,
} from "./markdown";
import { splitConceptBody } from "./conceptParts";
import { projectEditorialSection } from "./editorialProjection";
import { frozenConceptGroups } from "../conceptRows";

export {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "./versions";
export type TextbookVariant = "student" | "answers";
export type TextbookEditorialStage =
  | "opening"
  | "concept"
  | "recall"
  | "basic"
  | "practice"
  | "application"
  | "review"
  | "guide"
  | "unit"
  | "rest";
type BlockBase = {
  id: string;
  sourceBlockId: string;
  unitKey: string;
  sectionKey: string;
  editorialStage?: TextbookEditorialStage;
  startNewPage?: boolean;
  unitNumber?: number;
  semantic?: TextbookSemantic;
};
export type RenderBlock = BlockBase &
  (
    | {
        kind: "unit-intro";
        title: string;
        goals: string[];
        prerequisites: string[];
      }
    | {
        kind: "heading";
        title: string;
        subtitle?: string;
        stageNumber?: string;
      }
    | { kind: "text"; markdown: string }
    | { kind: "image"; assetId: string; caption: string | null }
    | {
        kind: "dialogue";
        speakerId: string;
        side: "left" | "right";
        expression: string;
        portraitAssetId: string;
        mirrorPortrait: boolean;
        markdown: string;
        presentation?: TextbookDialoguePresentation;
      }
    | {
        kind: "concept";
        conceptKey: string;
        title: string;
        body: TextbookConceptBody;
        continuation?: boolean;
        qr: RenderQr | null;
      }
    | {
        kind: "recall";
        phase: "study" | "keywords" | "sentences";
        pieces: RecallPiece[];
        repetitionChecks: boolean;
        continuation?: boolean;
        lastPart?: boolean;
      }
    | {
        kind: "problem";
        itemId: string;
        displayNumber: string;
        content: string;
        figures: FigureRef[];
        questionType: string | null;
        learningStage?: TextbookItem["learningStage"];
        layout: TextbookItem["layout"];
        qr: RenderQr | null;
        sourcePageLabel: string | null;
        answer?: string;
        solution?: string | null;
        publicWorkedExample?: { answer: string; solution: string | null };
      }
  );
export interface RenderQr {
  id: string;
  url: string;
}
export interface RenderSection {
  unitKey: string;
  sectionKey: string;
  unitTitle: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  editorialStage?: TextbookEditorialStage;
  blocks: RenderBlock[];
}
export interface TextbookRenderModel {
  title: string;
  editionId: string;
  config: TextbookConfig;
  variant: TextbookVariant;
  sections: RenderSection[];
  assets: AssetRef[];
}

/** Allowlist projection: exercise answers/solutions and teacher source data never enter student render DTOs. */
export function createTextbookRenderModel(
  exchange: TextbookExchange,
  variant: TextbookVariant,
): TextbookRenderModel {
  const items = new Map(exchange.items.map((i) => [i.itemId, i]));
  const snapshots = new Map(exchange.snapshots.map((s) => [s.snapshotId, s]));
  const concepts = new Map(
    (exchange.conceptIntegration?.concepts ?? []).map((c) => [c.conceptKey, c]),
  );
  const qrs = new Map(exchange.qrTargets.map((q) => [q.qrTargetId, q]));
  const conceptQrs = new Map(
    (exchange.conceptQrTargets ?? []).map((q) => [q.conceptKey, q]),
  );
  const pages = new Map(
    exchange.pageMap.map((p) => [p.itemId, p.printedPageLabel]),
  );
  return {
    title: exchange.config.title,
    editionId: exchange.edition.editionId,
    config: exchange.config,
    variant,
    assets: exchange.assets,
    sections: exchange.units.flatMap((u) =>
      u.sections.map((s): RenderSection =>
        projectEditorialSection({
          unitKey: u.unitKey,
          sectionKey: s.sectionKey,
          unitTitle: u.title,
          title: s.title,
          // Earlier quick-create drafts used "basic" for every lesson. Their frozen
          // concept provenance identifies them without rewriting the saved manuscript.
          templateKey:
            s.templateKey === "basic" &&
            s.blocks.some(
              (b) =>
                b.kind === "concept" &&
                concepts.get(b.conceptKey)?.mappingVersion ===
                  "quick-create.unit-triple.v1",
            )
              ? "auto-lesson"
              : s.templateKey,
          startPolicy: s.startPolicy,
          blocks: [
            ...(s.templateKey === "unit-intro"
              ? [
                  {
                    id: `generated-intro:${u.unitKey}:${s.sectionKey}`,
                    sourceBlockId: "unit-intro",
                    unitKey: u.unitKey,
                    sectionKey: s.sectionKey,
                    kind: "unit-intro" as const,
                    unitNumber: exchange.units.indexOf(u) + 1,
                    title: u.title,
                    goals: u.goals,
                    prerequisites: u.prerequisites,
                  },
                ]
              : []),
            {
              id: `generated-heading:${u.unitKey}:${s.sectionKey}`,
              sourceBlockId: "section-heading",
              unitKey: u.unitKey,
              sectionKey: s.sectionKey,
              kind: "heading",
              unitNumber:
                exchange.units
                  .filter((candidate) =>
                    candidate.sections.some(
                      (section) =>
                        section.templateKey === "auto-unit-intro" ||
                        section.templateKey === "auto-lesson" ||
                        section.blocks.some(
                          (block) => block.kind === "concept",
                        ),
                    ),
                  )
                  .indexOf(u) + 1,
              title: s.title,
            },
            ...s.blocks.flatMap((b): RenderBlock[] => {
              const base: BlockBase = {
                id: b.blockId,
                sourceBlockId: b.blockId,
                unitKey: u.unitKey,
                sectionKey: s.sectionKey,
                ...(b.semantic ? { semantic: b.semantic } : {}),
              };
              switch (b.kind) {
                case "text": {
                  const parts = b.semantic?.node
                    ? [b.markdown]
                    : splitTextbookMarkdown(b.markdown);
                  return parts.map((markdown, i) => ({
                    ...base,
                    id:
                      parts.length === 1 ? b.blockId : `${b.blockId}.part-${i}`,
                    kind: "text",
                    markdown,
                  }));
                }
                case "image":
                  return [
                    {
                      ...base,
                      kind: "image",
                      assetId: b.assetId,
                      caption: b.caption,
                    },
                  ];
                case "dialogue":
                  return b.turns.map((turn, i) => ({
                    ...base,
                    ...turn,
                    id: `${b.blockId}.turn-${i}`,
                    kind: "dialogue",
                  }));
                case "concept-recall": {
                  const phase = variant === "answers" ? "study" : b.phase;
                  // Validate the complete source before projecting any individual paragraphs.
                  recallPieces(b.markdown, phase);
                  const parts = splitRecallMarkdown(b.markdown);
                  return parts.map((markdown, i) => ({
                    ...base,
                    id:
                      parts.length === 1 ? b.blockId : `${b.blockId}.part-${i}`,
                    kind: "recall",
                    phase: b.phase,
                    continuation: i > 0,
                    lastPart: i === parts.length - 1,
                    pieces: recallPieces(
                      markdown,
                      /\[\[|\{\{/.test(markdown) ? phase : "study",
                    ),
                    repetitionChecks:
                      b.phase === "study" &&
                      b.showRepetitionChecks &&
                      i === parts.length - 1,
                  }));
                }
                case "concept": {
                  const c = concepts.get(b.conceptKey);
                  if (!c) throw new Error(`Missing concept ${b.conceptKey}`);
                  const qr = conceptQrs.get(c.conceptKey);
                  const groups = frozenConceptGroups(c);
                  const parts = groups.length
                    ? groups.map((group) => group.body)
                    : splitConceptBody(c.body);
                  return parts.map((body, i) => ({
                    ...base,
                    id:
                      parts.length === 1 ? b.blockId : `${b.blockId}.part-${i}`,
                    kind: "concept",
                    conceptKey: c.conceptKey,
                    title: groups[i]?.title ?? c.title,
                    body,
                    ...(groups[i]
                      ? {
                          semantic: {
                            activity: "concepts" as const,
                            node: {
                              kind: "concept" as const,
                              conceptId: groups[i].conceptId,
                              title: groups[i].title,
                              rows: groups[i].rows,
                            },
                          },
                        }
                      : {}),
                    continuation: i > 0,
                    qr:
                      qr && i === parts.length - 1
                        ? { id: qr.qrTargetId, url: qr.url }
                        : null,
                  }));
                }
                case "problem": {
                  const item = items.get(b.itemId);
                  if (!item) throw new Error(`Missing item ${b.itemId}`);
                  const snapshot = snapshots.get(item.snapshotId);
                  if (!snapshot)
                    throw new Error(`Missing snapshot ${item.snapshotId}`);
                  const qr = item.qrTargetId
                    ? qrs.get(item.qrTargetId)
                    : undefined;
                  const payload = snapshot.payload;
                  return [
                    {
                      ...base,
                      kind: "problem",
                      itemId: item.itemId,
                      displayNumber: item.displayNumber,
                      content: payload.content,
                      figures: payload.figures,
                      questionType: payload.questionType,
                      learningStage: item.learningStage,
                      layout: item.layout,
                      qr: qr ? { id: qr.qrTargetId, url: qr.url } : null,
                      sourcePageLabel: pages.get(item.itemId) ?? null,
                      ...(variant === "answers"
                        ? { answer: payload.answer, solution: payload.solution }
                        : item.learningStage === "worked-example"
                          ? {
                              publicWorkedExample: {
                                answer: payload.answer,
                                solution: payload.solution,
                              },
                            }
                          : {}),
                    },
                  ];
                }
              }
            }),
          ],
        }),
      ),
    ),
  };
}
