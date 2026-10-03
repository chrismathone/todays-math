import type {
  AssetRef,
  FigureRef,
  TextbookConfig,
  TextbookExchange,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import type { TextbookConceptBody } from "@/contracts/textbookConcept.contract";
import { recallPieces, type RecallPiece } from "./markdown";

export {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "./versions";
export type TextbookVariant = "student" | "answers";
type BlockBase = {
  id: string;
  sourceBlockId: string;
  unitKey: string;
  sectionKey: string;
};
export type RenderBlock = BlockBase &
  (
    | {
        kind: "unit-intro";
        title: string;
        goals: string[];
        prerequisites: string[];
      }
    | { kind: "heading"; title: string }
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
      }
    | {
        kind: "concept";
        conceptKey: string;
        title: string;
        body: TextbookConceptBody;
        qr: RenderQr | null;
      }
    | {
        kind: "recall";
        phase: "study" | "keywords" | "sentences";
        pieces: RecallPiece[];
        repetitionChecks: boolean;
      }
    | {
        kind: "problem";
        itemId: string;
        displayNumber: string;
        content: string;
        figures: FigureRef[];
        questionType: string | null;
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
      u.sections.map((s): RenderSection => ({
        unitKey: u.unitKey,
        sectionKey: s.sectionKey,
        unitTitle: u.title,
        title: s.title,
        templateKey: s.templateKey,
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
            title: s.title,
          },
          ...s.blocks.flatMap((b): RenderBlock[] => {
            const base: BlockBase = {
              id: b.blockId,
              sourceBlockId: b.blockId,
              unitKey: u.unitKey,
              sectionKey: s.sectionKey,
            };
            switch (b.kind) {
              case "text":
                return [{ ...base, kind: "text", markdown: b.markdown }];
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
              case "concept-recall":
                return [
                  {
                    ...base,
                    kind: "recall",
                    phase: b.phase,
                    pieces: recallPieces(
                      b.markdown,
                      variant === "answers" ? "study" : b.phase,
                    ),
                    repetitionChecks:
                      b.phase === "study" && b.showRepetitionChecks,
                  },
                ];
              case "concept": {
                const c = concepts.get(b.conceptKey);
                if (!c) throw new Error(`Missing concept ${b.conceptKey}`);
                const qr = conceptQrs.get(c.conceptKey);
                return [
                  {
                    ...base,
                    kind: "concept",
                    conceptKey: c.conceptKey,
                    title: c.title,
                    body: c.body,
                    qr: qr ? { id: qr.qrTargetId, url: qr.url } : null,
                  },
                ];
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
      })),
    ),
  };
}
