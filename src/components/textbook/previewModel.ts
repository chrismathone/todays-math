/**
 * 선택한 구획만 측정 지면으로 올린다.
 * 확정본·개념 고정본·예약 QR 이 없으면 측정하지 않고, 자리 표시를 만들지 않는다.
 */
import {
  textbookExchangeSchema,
  type ManuscriptBlock,
} from "@/contracts/textbookExchange.contract";
import { textbookVersion } from "@/contracts/textbookPrimitives.contract";
import {
  createTextbookRenderModel,
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";

import type { EditionDetail, SectionBlock, SectionDetail } from "./model";

const EXPORTED_AT = "2026-10-03T00:00:00.000Z";
const MISSING_SOURCE = "판본 원본이 없어 측정하지 않습니다.";

export type PreviewResources = {
  assetUrl: (assetId: string) => string;
  qrDataUrl: (qrTargetId: string, url: string) => string;
};

export type SectionPreview =
  | { ok: true; model: TextbookRenderModel; resources: PreviewResources }
  | { ok: false; message: string };

const EXPRESSION = {
  평온: "neutral",
  질문: "question",
  생각: "thinking",
  알아챔: "aha",
} as const;

function refuse(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function wireBlocks(
  blocks: readonly SectionBlock[],
): { ok: true; blocks: ManuscriptBlock[] } | { ok: false; message: string } {
  const wired: ManuscriptBlock[] = [];
  for (const block of blocks) {
    if (block.kind === "problems") {
      return refuse("문항 확정본이 이 화면에 없어 측정하지 않습니다.");
    }
    if (block.kind === "concept") {
      return refuse("개념 고정본이 이 화면에 없어 측정하지 않습니다.");
    }
    if (block.kind === "image") {
      if (!block.assetId) return refuse("그림 자료가 없어 측정하지 않습니다.");
      wired.push({
        blockId: block.id,
        kind: "image",
        assetId: block.assetId,
        caption: block.caption.length > 0 ? block.caption : null,
      });
      continue;
    }
    if (block.kind === "dialogue") {
      if (block.turns.length === 0) return refuse("대화 대사가 없습니다.");
      const turns = [];
      for (const turn of block.turns) {
        if (turn.side === "왼쪽" && turn.mirror) {
          return refuse("왼쪽 초상은 뒤집지 않습니다.");
        }
        if (!turn.portraitAssetId) {
          return refuse("초상 자료가 없어 측정하지 않습니다.");
        }
        turns.push({
          speakerId: turn.speakerId,
          side: turn.side === "왼쪽" ? ("left" as const) : ("right" as const),
          expression: EXPRESSION[turn.expression],
          portraitAssetId: turn.portraitAssetId,
          mirrorPortrait: turn.mirror,
          markdown: turn.text,
        });
      }
      wired.push({ blockId: block.id, kind: "dialogue", turns });
      continue;
    }
    if (block.kind === "concept-recall") {
      if (block.phase !== "study" && block.showRepetitionChecks) {
        return refuse("핵심어·문장 단계에는 반복 확인란을 표시하지 않습니다.");
      }
      wired.push({
        blockId: block.id,
        kind: "concept-recall",
        phase: block.phase,
        markdown: block.text,
        showRepetitionChecks: block.showRepetitionChecks,
        ...(block.conceptKey ? { conceptKey: block.conceptKey } : {}),
      });
      continue;
    }
    wired.push({ blockId: block.id, kind: "text", markdown: block.text });
  }
  return { ok: true, blocks: wired };
}

export function buildSectionPreview(input: {
  edition: EditionDetail;
  section: SectionDetail;
  variant: "student" | "answers";
}): SectionPreview {
  const source = input.edition.structureSource;
  if (!source?.edition || !source.config?.print) return refuse(MISSING_SOURCE);
  const { section } = input;
  if (section.parity !== "even-left" && section.parity !== "continue") {
    return refuse("시작 면이 정해지지 않아 측정하지 않습니다.");
  }
  const wired = wireBlocks(section.blocks);
  if (!wired.ok) return wired;
  const prior =
    source.outline.find((unit) => unit.unitKey === section.unitKey) ??
    source.outline.find((unit) =>
      unit.sections.some((row) => row.id === section.sectionId),
    );
  const exchange = {
    schemaVersion: textbookVersion,
    exportedAt: EXPORTED_AT,
    config: source.config,
    edition: source.edition,
    units: [
      {
        unitKey: prior?.unitKey ?? section.unitKey,
        title: prior?.title ?? section.title,
        sourceUnitIds: prior?.sourceUnitIds ?? [],
        prerequisites: prior?.prerequisites ?? [],
        goals: prior?.goals ?? [],
        conceptLectureRefs: prior?.conceptLectureRefs ?? [],
        sections: [
          {
            sectionKey: section.sectionKey,
            title: section.title,
            templateKey: section.templateKey,
            startPolicy: section.parity,
            blocks: wired.blocks,
          },
        ],
      },
    ],
    snapshots: [],
    items: [],
    assets: [],
    qrTargets: [],
    videoBindings: [],
    pageMap: [],
    rendererVersion: TEXTBOOK_RENDERER_VERSION,
    templateVersion: TEXTBOOK_TEMPLATE_VERSION,
  };
  const parsed = textbookExchangeSchema.safeParse(exchange);
  if (!parsed.success) return refuse("미리보기 원고가 계약과 맞지 않습니다.");
  const resources: PreviewResources = {
    assetUrl: (assetId) =>
      `/api/textbook/editions/${encodeURIComponent(input.edition.editionId)}/assets/${encodeURIComponent(assetId)}`,
    qrDataUrl: () => {
      throw new Error("예약된 QR 이미지가 없습니다.");
    },
  };
  return {
    ok: true,
    model: createTextbookRenderModel(parsed.data, input.variant),
    resources,
  };
}
