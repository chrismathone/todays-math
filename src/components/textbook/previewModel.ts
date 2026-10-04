/**
 * 선택한 구획만 측정 지면으로 올린다.
 * 확정본·개념 고정본이 없으면 측정하지 않는다.
 * 예약된 QR 은 발행과 같은 모형에 싣고, 없는 예약은 임시라고 알린다. 주소를 지어내지 않는다.
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
import { recallMeasurementModel } from "@/lib/textbook/render/recoveryMeasurement";

import type { TextbookConcept } from "@/contracts/textbookConcept.contract";

import type { PreviewMaterial } from "@/lib/textbook/client";
import type {
  ConceptDraft,
  EditionDetail,
  SectionBlock,
  SectionDetail,
} from "./model";

const EXPORTED_AT = "2026-10-03T00:00:00.000Z";
const MISSING_SOURCE = "판본 원본이 없어 측정하지 않습니다.";

export type PreviewResources = {
  assetUrl: (assetId: string) => string;
  qrDataUrl: (qrTargetId: string, url: string) => string;
  editorialAssetUrl?: (name: string) => string;
};

export type SectionPreview =
  | {
      ok: true;
      model: TextbookRenderModel;
      recallMeasurementModel?: TextbookRenderModel;
      resources: PreviewResources;
      /** 예약이 없는 초안·발행본. 측정은 하고, 해설 칸은 비운다. */
      provisionalNotice: string | null;
    }
  | { ok: false; message: string };

function linesOf(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function conceptBody(draft: ConceptDraft): TextbookConcept["body"] {
  return {
    goal: draft.goal,
    prerequisites: linesOf(draft.prerequisites),
    definition: draft.definition,
    conditions: draft.conditions.trim() ? draft.conditions : null,
    examples: linesOf(draft.examples),
    counterexamples: linesOf(draft.counterexamples),
    misconceptions: linesOf(draft.misconceptions),
    explainPrompt: draft.explainPrompt.trim() ? draft.explainPrompt : null,
  };
}

function withDraft(
  base: TextbookConcept,
  draft: ConceptDraft,
): TextbookConcept {
  const next: TextbookConcept = {
    ...base,
    title: draft.title,
    kind: draft.kind,
    body: conceptBody(draft),
  };
  if (draft.blankForms.length > 0) {
    next.blankForms = [...draft.blankForms];
    return next;
  }
  delete next.blankForms;
  return next;
}

function fromDraft(
  section: SectionDetail,
  draft: ConceptDraft,
): TextbookConcept {
  const concept: TextbookConcept = {
    conceptKey: draft.conceptKey,
    unitKey: section.unitKey,
    sectionKey: section.sectionKey,
    title: draft.title,
    kind: draft.kind,
    unitId: null,
    body: conceptBody(draft),
    blankItems: [],
    links: [],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: null,
  };
  if (draft.blankForms.length > 0) concept.blankForms = [...draft.blankForms];
  return concept;
}

function conceptFor(
  conceptKey: string,
  section: SectionDetail,
  material: PreviewMaterial | null,
  source: TextbookConcept | null,
): TextbookConcept | null {
  const saved =
    material?.concepts.find((row) => row.conceptKey === conceptKey) ??
    (source?.conceptKey === conceptKey ? source : null);
  const draft =
    section.concept?.conceptKey === conceptKey ? section.concept : null;
  if (draft && saved) return withDraft(saved, draft);
  if (draft) return fromDraft(section, draft);
  return saved;
}

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
  material: PreviewMaterial | null,
  section: SectionDetail,
  conceptSource: TextbookConcept | null,
):
  | {
      ok: true;
      blocks: ManuscriptBlock[];
      material: PreviewMaterial;
      provisionalNotice: string | null;
    }
  | { ok: false; message: string } {
  const wired: ManuscriptBlock[] = [];
  let missingQr = false;
  const used: PreviewMaterial = {
    items: [],
    snapshots: [],
    assets: [],
    concepts: [],
    qrTargets: [],
    conceptQrTargets: [],
  };
  for (const block of blocks) {
    const semantic = block.semantic ? { semantic: block.semantic } : {};
    if (block.kind === "problems") {
      if (block.itemIds.length !== 1) {
        return refuse("문항 블록은 한 문항씩 저장합니다.");
      }
      const itemId = block.itemIds[0];
      const item = material?.items.find((row) => row.itemId === itemId);
      const snapshot = item
        ? material?.snapshots.find((row) => row.snapshotId === item.snapshotId)
        : undefined;
      if (!item || !snapshot) {
        return refuse("문항 확정본이 이 화면에 없어 측정하지 않습니다.");
      }
      used.items.push(item);
      used.snapshots.push(snapshot);
      for (const figure of snapshot.payload.figures) {
        const asset = material?.assets.find(
          (row) => row.assetId === figure.assetId,
        );
        if (
          asset &&
          !used.assets.some((row) => row.assetId === asset.assetId)
        ) {
          used.assets.push(asset);
        }
      }
      const qr = item.qrTargetId
        ? material?.qrTargets.find((row) => row.qrTargetId === item.qrTargetId)
        : undefined;
      if (qr) {
        if (!used.qrTargets.some((row) => row.qrTargetId === qr.qrTargetId)) {
          used.qrTargets.push(qr);
        }
      } else missingQr = true;
      wired.push({
        blockId: block.id,
        kind: "problem",
        itemId: item.itemId,
        ...semantic,
      });
      continue;
    }
    if (block.kind === "concept") {
      const concept = conceptFor(
        block.conceptKey,
        section,
        material,
        conceptSource,
      );
      if (!concept) {
        return refuse("개념 고정본이 이 화면에 없어 측정하지 않습니다.");
      }
      used.concepts.push(concept);
      const qr = material?.conceptQrTargets.find(
        (row) => row.conceptKey === concept.conceptKey,
      );
      if (qr) {
        if (
          !used.conceptQrTargets.some((row) => row.qrTargetId === qr.qrTargetId)
        ) {
          used.conceptQrTargets.push(qr);
        }
      } else missingQr = true;
      wired.push({
        blockId: block.id,
        kind: "concept",
        conceptKey: concept.conceptKey,
        ...semantic,
      });
      continue;
    }
    if (block.kind === "image") {
      if (!block.assetId) return refuse("그림 자료가 없어 측정하지 않습니다.");
      wired.push({
        blockId: block.id,
        kind: "image",
        assetId: block.assetId,
        caption: block.caption.length > 0 ? block.caption : null,
        ...semantic,
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
          ...(turn.presentation ? { presentation: turn.presentation } : {}),
        });
      }
      wired.push({ blockId: block.id, kind: "dialogue", turns, ...semantic });
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
        ...semantic,
      });
      continue;
    }
    wired.push({
      blockId: block.id,
      kind: "text",
      markdown: block.text,
      ...semantic,
    });
  }
  const provisionalNotice = missingQr
    ? "이 구획에 예약된 QR이 없습니다. 해설 칸은 비워 두고, 발행할 때 예약된 주소만 넣습니다."
    : null;
  return { ok: true, blocks: wired, material: used, provisionalNotice };
}

export function buildSectionPreview(input: {
  edition: EditionDetail;
  section: SectionDetail;
  variant: "student" | "answers";
  material?: PreviewMaterial | null;
  conceptSource?: TextbookConcept | null;
}): SectionPreview {
  const source = input.edition.structureSource;
  if (!source?.edition || !source.config?.print) return refuse(MISSING_SOURCE);
  const { section } = input;
  if (section.parity !== "even-left" && section.parity !== "continue") {
    return refuse("시작 면이 정해지지 않아 측정하지 않습니다.");
  }
  const wired = wireBlocks(
    section.blocks,
    input.material ?? null,
    section,
    input.conceptSource ?? null,
  );
  if (!wired.ok) return wired;
  const prior =
    source.outline.find((unit) => unit.unitKey === section.unitKey) ??
    source.outline.find((unit) =>
      unit.sections.some((row) => row.id === section.sectionId),
    );
  const firstSectionId = source.outline.flatMap((unit) => unit.sections)[0]?.id;
  const omitCover =
    source.config.print.coverMode === "included" &&
    firstSectionId !== undefined &&
    firstSectionId !== section.sectionId;
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
    snapshots: wired.material.snapshots,
    items: wired.material.items,
    assets: wired.material.assets,
    qrTargets: wired.material.qrTargets,
    videoBindings: [],
    pageMap: [],
    rendererVersion: TEXTBOOK_RENDERER_VERSION,
    templateVersion: TEXTBOOK_TEMPLATE_VERSION,
    ...(wired.material.concepts.length > 0
      ? {
          conceptIntegration: {
            version: "injaewon.textbook.concepts.v1" as const,
            concepts: wired.material.concepts,
          },
        }
      : {}),
    ...(wired.material.conceptQrTargets.length > 0
      ? { conceptQrTargets: wired.material.conceptQrTargets }
      : {}),
  };
  const parsed = textbookExchangeSchema.safeParse(exchange);
  if (!parsed.success) return refuse("미리보기 원고가 계약과 맞지 않습니다.");
  let model: TextbookRenderModel;
  try {
    model = createTextbookRenderModel(parsed.data, input.variant);
    // Adjust only the render model: later sections must not prepend the book's
    // cover. The saved configuration and validated exchange remain intact, and
    // the body starts exactly where it would after the included cover.
    if (omitCover) {
      model = {
        ...model,
        config: {
          ...model.config,
          print: {
            ...model.config.print,
            coverMode: "separate",
            firstPhysicalPageIndex:
              model.config.print.firstPhysicalPageIndex + 1,
          },
        },
      };
    }
  } catch (reason) {
    const message =
      reason instanceof Error && reason.message
        ? reason.message
        : "미리보기 원고가 계약과 맞지 않습니다.";
    return refuse(message);
  }
  const resources: PreviewResources = {
    assetUrl: (assetId) =>
      `/api/textbook/editions/${encodeURIComponent(input.edition.editionId)}/assets/${encodeURIComponent(assetId)}`,
    qrDataUrl: () => {
      throw new Error("예약된 QR 이미지가 없습니다.");
    },
  };
  const draft = input.edition.structureSource?.edition?.status === "draft";
  return {
    ok: true,
    model,
    recallMeasurementModel: recallMeasurementModel(
      createTextbookRenderModel(parsed.data, "answers"),
      model,
    ),
    resources,
    provisionalNotice: wired.provisionalNotice
      ? draft
        ? "이 초안에는 예약된 QR이 없습니다. 해설 칸은 비워 두고, 발행할 때 예약된 주소만 넣습니다."
        : wired.provisionalNotice
      : null,
  };
}
