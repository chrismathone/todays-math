/**
 * 판본 → 교사용 교환 형식(`TextbookExchange`). 내보내기 · 발행 조판 · 발행 확정의 manifest 가 **같은 조립**을 쓴다.
 *
 * 🔴 문항의 내용은 확정본에서만 온다 — 살아 있는 `problem` 을 읽는 문장이 이 파일에 없다.
 * 🔴 차례는 전부 정해진 열쇠로 세운다(목차의 단원 순 → 구획의 차례 → 블록의 차례). 같은 판본은 언제 조립해도
 *    같은 배열 순서를 낸다 — manifest 해시가 배열 순서를 본다.
 * 🔴 없는 선택 칸을 기본값으로 채우지 않는다(`conceptKeys` 가 비면 싣지 않는다 · 개념이 없으면 `conceptIntegration` 이 없다).
 *    채우면 정규 JSON 이 달라져 옛 패키지와 해시가 갈린다.
 * 구획 밖으로 나간 배치는 싣지 않는다. 학생 응답 · 배정 · 요청 기록은 교환 형식에 없다.
 */
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type {
  AssetRef,
  ConceptQrTarget,
  PagePlacement,
  ProblemSnapshot,
  ProblemVideoBinding,
  QrTarget,
  TextbookConfig,
  TextbookExchange,
  TextbookItem,
  UnitManuscript,
} from "@/contracts/textbookExchange.contract";
import {
  textbookCanonicalizationVersion,
  textbookVersion,
} from "@/contracts/textbookPrimitives.contract";

import type { StoredOutline } from "./editions";
import { notFound } from "./errors";
import { type SectionContent, storedTeacherAnswer } from "./sections";
import { type TextbookSql, isoColumn } from "./sql";
import { semanticFragmentAssetIds } from "../semanticAssets";

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "font/woff2": "woff2",
  "font/woff": "woff",
  "font/ttf": "ttf",
};

/** 로케일에 기대지 않는 글자 순 — 같은 판본은 어느 기계에서 조립해도 같은 차례다 */
const byCodeUnit = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export const assetPackagePath = (assetId: string, mimeType: string): string =>
  `assets/${assetId}.${EXTENSION[mimeType] ?? "bin"}`;

export interface AssembleOptions {
  exportedAt: string;
  /**
   * 어느 상태의 QR 을 싣는가. 내보내기 · 확정은 켜진 것만(`active`), 발행 조판은 예약한 것까지 —
   * 조판기가 지면에 찍을 주소가 필요하다.
   */
  qrStates?: ReadonlyArray<"reserved" | "active">;
  /**
   * 구획 하나만 — 편집 화면의 미리보기가 쓴다. 그 구획과, 그 구획이 가리키는 것(배치 · 확정본 · 자산 · QR · 게시 영상 ·
   * 개념)만 싣는다. **같은 조립의 부분집합**이다: 여기 실리는 값은 판본 전체를 조립했을 때의 그 값과 글자까지 같다
   * (`orderIndex` 도 원고 전체에서의 차례 그대로다). 다른 구획의 원고 · 확정본의 내용은 DB 에서 읽지도 않는다.
   * 🔴 잘라 낸 교환 형식은 판본의 manifest 해시와 견줄 수 없다. 내보내기 · 발행은 이 칸을 쓰지 않는다.
   */
  onlySectionId?: string;
}

interface EditionRow {
  id: string;
  label: string;
  status: TextbookExchange["edition"]["status"];
  revision: number;
  publishedAt: string | null;
  manifestHash: string | null;
  config: TextbookConfig;
  outline: StoredOutline;
  rendererVersion: string;
  templateVersion: string;
}

interface ItemRow {
  itemId: string;
  snapshotId: string;
  linkStatus: TextbookItem["linkStatus"];
  sourceTestId: string | null;
  sourceTestProblemId: string | null;
  unitKey: string;
  sectionId: string;
  sectionKey: string;
  learningStage: TextbookItem["learningStage"];
  displayNumber: string | null;
  orderIndex: number;
  layout: TextbookItem["layout"];
  conceptKeys: string[];
  videoRequired: boolean | null;
  physicalPageIndex: number | null;
  printedPageLabel: string | null;
  pageColumn: 1 | 2 | null;
}

export async function assembleExchange(
  sql: TextbookSql,
  editionId: string,
  options: AssembleOptions,
): Promise<TextbookExchange> {
  const qrStates = options.qrStates ?? ["active"];
  const only = options.onlySectionId ?? null;
  const [edition] = await sql.query<EditionRow>(
    `SELECT "id", "label", "status", "revision", ${isoColumn(`"published_at"`)} AS "publishedAt",
            "manifest_hash" AS "manifestHash", "config", "outline", "renderer_version" AS "rendererVersion",
            "template_version" AS "templateVersion"
       FROM "textbook_edition" WHERE "id" = $1::uuid`,
    [editionId],
  );
  if (!edition) throw notFound("판본");

  const sections = await sql.query<{
    id: string;
    unitKey: string;
    sectionKey: string;
    title: string;
    templateKey: string;
    startPolicy: "even-left" | "continue";
    content: SectionContent;
  }>(
    // 구획 하나만 볼 때는 다른 구획의 원고를 읽지 않는다(차례를 세우는 데 줄은 필요하다)
    `SELECT "id", "unit_key" AS "unitKey", "section_key" AS "sectionKey", "title", "template_key" AS "templateKey",
            "start_policy" AS "startPolicy",
            CASE WHEN $2::uuid IS NULL OR "id" = $2::uuid THEN "content" ELSE '{"blocks": []}'::jsonb END AS "content"
       FROM "textbook_section" WHERE "edition_id" = $1::uuid ORDER BY "order_index", "id"`,
    [editionId, only],
  );
  const unitOrder = new Map(
    edition.outline.units.map((unit, index) => [unit.unitKey, index]),
  );
  const allUnits: UnitManuscript[] = edition.outline.units.map((unit) => ({
    unitKey: unit.unitKey,
    title: unit.title,
    sourceUnitIds: unit.sourceUnitIds,
    prerequisites: unit.prerequisites,
    goals: unit.goals,
    conceptLectureRefs: unit.conceptLectureRefs,
    sections: sections
      .filter(
        (section) =>
          section.unitKey === unit.unitKey &&
          (only === null || section.id === only),
      )
      .map((section) => ({
        sectionKey: section.sectionKey,
        title: section.title,
        templateKey: section.templateKey,
        startPolicy: section.startPolicy,
        blocks: section.content.blocks,
        // 구획 정답 메모 — 교사용 교환 형식 · 판본 해시에만 실린다. 학생 지면은 렌더 모델의 허용 목록이 거른다
        ...storedTeacherAnswer(section.content),
      })),
  }));
  const sectionOrder = new Map(
    sections.map((section, index) => [section.id, index]),
  );

  const itemRows = await sql.query<ItemRow>(
    `SELECT i."id" AS "itemId", i."snapshot_id" AS "snapshotId", i."link_status" AS "linkStatus",
            i."source_test_id" AS "sourceTestId", i."source_test_problem_id" AS "sourceTestProblemId",
            i."unit_key" AS "unitKey", i."section_id" AS "sectionId", s."section_key" AS "sectionKey",
            i."learning_stage" AS "learningStage", i."display_number" AS "displayNumber", i."order_index" AS "orderIndex",
            i."layout", i."concept_keys" AS "conceptKeys", i."video_required" AS "videoRequired",
            i."physical_page_index" AS "physicalPageIndex", i."printed_page_label" AS "printedPageLabel",
            i."page_column" AS "pageColumn"
       FROM "textbook_item" i JOIN "textbook_section" s ON s."id" = i."section_id"
      WHERE i."edition_id" = $1::uuid`,
    [editionId],
  );
  itemRows.sort(
    (a, b) =>
      (unitOrder.get(a.unitKey) ?? 1e9) - (unitOrder.get(b.unitKey) ?? 1e9) ||
      sectionOrder.get(a.sectionId)! - sectionOrder.get(b.sectionId)! ||
      a.orderIndex - b.orderIndex ||
      byCodeUnit(a.itemId, b.itemId),
  );
  // 원고 전체에서의 자리 — 구획 하나만 실을 때도 이 값을 그대로 쓴다
  const positionOf = new Map(itemRows.map((row, index) => [row.itemId, index]));
  const shownRows =
    only === null ? itemRows : itemRows.filter((row) => row.sectionId === only);

  const qrRows = await sql.query<{
    id: string;
    slug: string;
    url: string;
    kind: "item" | "concept";
    itemId: string | null;
    conceptKey: string | null;
  }>(
    `SELECT "id", "slug", "url", "kind", "item_id" AS "itemId", "concept_key" AS "conceptKey"
       FROM "textbook_qr_target"
      WHERE "edition_id" = $1::uuid AND "state" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
    [editionId, JSON.stringify(qrStates)],
  );
  const qrByItem = new Map(
    qrRows.filter((qr) => qr.kind === "item").map((qr) => [qr.itemId!, qr]),
  );

  // `orderIndex` 는 원고 전체에서의 차례다 — 위에서 세운 차례(단원 → 구획 → 구획 안)의 자리 그대로.
  // 표의 `order_index` 는 구획 안의 차례라 그대로 내면 구획마다 0 이 생긴다
  const items: TextbookItem[] = shownRows.map((row) => ({
    itemId: row.itemId,
    editionId,
    snapshotId: row.snapshotId,
    linkStatus: row.linkStatus,
    sourceTestId: row.sourceTestId,
    sourceTestProblemId: row.sourceTestProblemId,
    unitKey: row.unitKey,
    sectionKey: row.sectionKey,
    learningStage: row.learningStage,
    displayNumber: row.displayNumber ?? String(row.orderIndex + 1),
    orderIndex: positionOf.get(row.itemId)!,
    layout: row.layout,
    qrTargetId: qrByItem.get(row.itemId)?.id ?? null,
    ...(row.conceptKeys.length ? { conceptKeys: row.conceptKeys } : {}),
    ...(row.videoRequired === null ? {} : { videoRequired: row.videoRequired }),
  }));

  const snapshotRows = await sql.query<{
    snapshotId: string;
    source: ProblemSnapshot["source"];
    sourceUpdatedAt: string | null;
    capturedAt: string;
    unitId: string | null;
    familyKey: string | null;
    difficulty: string | null;
    problemType: string | null;
    payload: ProblemSnapshot["payload"];
    contentHash: string;
    rawSource: NonNullable<ProblemSnapshot["rawSource"]>;
    sourceMetadata: NonNullable<ProblemSnapshot["sourceMetadata"]>;
    snapshotHash: string;
  }>(
    `SELECT s."id" AS "snapshotId", s."source_ref" AS "source", ${isoColumn(`s."source_updated_at"`)} AS "sourceUpdatedAt",
            ${isoColumn(`s."captured_at"`)} AS "capturedAt", s."unit_id" AS "unitId", s."family_key" AS "familyKey",
            s."difficulty", s."problem_type" AS "problemType", s."payload", s."content_hash" AS "contentHash",
            s."raw_source" AS "rawSource", s."source_metadata" AS "sourceMetadata", s."snapshot_hash" AS "snapshotHash"
       FROM "textbook_problem_snapshot" s
      WHERE s."id" IN (SELECT i."snapshot_id" FROM "textbook_item" i
                        WHERE i."edition_id" = $1::uuid AND i."section_id" IS NOT NULL
                          AND ($2::uuid IS NULL OR i."section_id" = $2::uuid))`,
    [editionId, only],
  );
  const snapshotById = new Map(
    snapshotRows.map((row) => [row.snapshotId, row]),
  );
  // 배치가 처음 가리키는 차례대로 — 같은 확정본을 두 번 실어도 한 번만 싣는다
  const snapshots: ProblemSnapshot[] = [
    ...new Set(shownRows.map((row) => row.snapshotId)),
  ].map((id) => snapshotById.get(id)!);

  const assetRows = await sql.query<{
    assetId: string;
    mimeType: AssetRef["mimeType"];
    widthPx: number | null;
    heightPx: number | null;
  }>(
    `SELECT a."id" AS "assetId", a."mime_type" AS "mimeType", a."width_px" AS "widthPx", a."height_px" AS "heightPx"
       FROM "textbook_edition_asset" ea
       JOIN "textbook_asset" a ON a."user_id" = ea."user_id" AND a."id" = ea."asset_id"
      WHERE ea."edition_id" = $1::uuid ORDER BY a."id"`,
    [editionId],
  );
  const assets: AssetRef[] = assetRows.map((row) => ({
    assetId: row.assetId,
    packagePath: assetPackagePath(row.assetId, row.mimeType),
    mimeType: row.mimeType,
    sha256: row.assetId,
    widthPx: row.widthPx,
    heightPx: row.heightPx,
  }));

  const qrTargets: QrTarget[] = shownRows
    .filter((row) => qrByItem.has(row.itemId))
    .map((row) => {
      const qr = qrByItem.get(row.itemId)!;
      return {
        qrTargetId: qr.id,
        editionId,
        slug: qr.slug,
        url: qr.url,
        itemId: row.itemId,
      };
    });
  const conceptQrTargets: ConceptQrTarget[] = qrRows
    .filter((qr) => qr.kind === "concept")
    .sort((a, b) => byCodeUnit(a.conceptKey!, b.conceptKey!))
    .map((qr) => ({
      qrTargetId: qr.id,
      editionId,
      slug: qr.slug,
      url: qr.url,
      conceptKey: qr.conceptKey!,
    }));

  const videoBindings = await sql.query<ProblemVideoBinding>(
    `SELECT b."id" AS "bindingId", b."snapshot_id" AS "snapshotId", b."video_id" AS "videoId", b."status",
            b."start_seconds" AS "startSeconds", b."end_seconds" AS "endSeconds",
            b."reviewed_against_hash" AS "reviewedAgainstHash"
       FROM "textbook_video_binding" b
      WHERE b."status" = 'published'
        AND b."snapshot_id" IN (SELECT i."snapshot_id" FROM "textbook_item" i
                                 WHERE i."edition_id" = $1::uuid AND i."section_id" IS NOT NULL
                                   AND ($2::uuid IS NULL OR i."section_id" = $2::uuid))
      ORDER BY b."snapshot_id", b."id"`,
    [editionId, only],
  );

  const pageMap: PagePlacement[] = shownRows
    .filter(
      (row) =>
        row.physicalPageIndex !== null &&
        row.printedPageLabel !== null &&
        row.pageColumn !== null,
    )
    .map((row) => ({
      itemId: row.itemId,
      physicalPageIndex: row.physicalPageIndex!,
      printedPageLabel: row.printedPageLabel!,
      column: row.pageColumn!,
    }));

  const allConcepts = await loadConcepts(sql, editionId, unitOrder);

  // ── 구획 하나만: 그 구획이 가리키는 것만 남긴다(값은 그대로 — 고르기만 한다)
  let units = allUnits;
  let concepts = allConcepts;
  let shownAssets = assets;
  let shownConceptQr = conceptQrTargets;
  if (only !== null) {
    units = allUnits.filter((unit) => unit.sections.length > 0);
    const target = sections.find((section) => section.id === only);
    const blocks = target?.content.blocks ?? [];
    const conceptKeys = new Set<string>();
    const assetIds = new Set<string>();
    for (const block of blocks) {
      for (const assetId of semanticFragmentAssetIds(block.semantic)) assetIds.add(assetId);
      if (block.kind === "concept") conceptKeys.add(block.conceptKey);
      else if (block.kind === "concept-recall" && block.conceptKey)
        conceptKeys.add(block.conceptKey);
      else if (block.kind === "image") assetIds.add(block.assetId);
      else if (block.kind === "dialogue")
        for (const turn of block.turns)
          if (turn.portraitAssetId) assetIds.add(turn.portraitAssetId);
    }
    for (const item of items)
      for (const key of item.conceptKeys ?? []) conceptKeys.add(key);
    concepts = allConcepts.filter(
      (concept) =>
        conceptKeys.has(concept.conceptKey) ||
        (target !== undefined &&
          concept.unitKey === target.unitKey &&
          concept.sectionKey === target.sectionKey),
    );
    const shownConcepts = new Set(
      concepts.map((concept) => concept.conceptKey),
    );
    for (const snapshot of snapshots) {
      for (const figure of snapshot.payload.figures)
        assetIds.add(figure.assetId);
      if (snapshot.rawSource?.figureSvgAssetId)
        assetIds.add(snapshot.rawSource.figureSvgAssetId);
    }
    for (const concept of concepts)
      for (const asset of concept.frozen?.assetHashes ?? [])
        assetIds.add(asset.assetId);
    shownAssets = assets.filter((asset) => assetIds.has(asset.assetId));
    shownConceptQr = conceptQrTargets.filter((qr) =>
      shownConcepts.has(qr.conceptKey),
    );
    units = units.map((unit) => ({
      ...unit,
      conceptLectureRefs: unit.conceptLectureRefs.filter((ref) =>
        shownConcepts.has(ref.conceptKey),
      ),
    }));
  }

  return {
    schemaVersion: textbookVersion,
    exportedAt: options.exportedAt,
    canonicalizationVersion: textbookCanonicalizationVersion,
    config: edition.config,
    edition: {
      editionId: edition.id,
      label: edition.label,
      status: edition.status,
      revision: edition.revision,
      publishedAt: edition.publishedAt,
      manifestHash: edition.manifestHash,
    },
    units,
    snapshots,
    items,
    assets: shownAssets,
    qrTargets,
    videoBindings,
    pageMap,
    rendererVersion: edition.rendererVersion,
    templateVersion: edition.templateVersion,
    ...(concepts.length
      ? {
          conceptIntegration: {
            version: "injaewon.textbook.concepts.v1" as const,
            concepts,
          },
        }
      : {}),
    ...(shownConceptQr.length ? { conceptQrTargets: shownConceptQr } : {}),
  };
}

/** 판본의 개념 — 목차의 단원 순, 그 안에서는 열쇠 순 */
export async function loadConcepts(
  sql: TextbookSql,
  editionId: string,
  unitOrder: ReadonlyMap<string, number>,
): Promise<TextbookConcept[]> {
  const rows = await sql.query<
    Omit<TextbookConcept, "blankForms"> & {
      blankForms: TextbookConcept["blankForms"] | null;
    }
  >(
    `SELECT c."concept_key" AS "conceptKey", c."unit_key" AS "unitKey", s."section_key" AS "sectionKey", c."title",
            c."kind", c."unit_id" AS "unitId", c."body", c."blank_items" AS "blankItems",
            c."blank_forms" AS "blankForms", c."links",
            c."mapping_version" AS "mappingVersion", c."derived_from_concept_key" AS "derivedFromConceptKey", c."frozen"
       FROM "textbook_concept" c
       LEFT JOIN "textbook_section" s ON s."edition_id" = c."edition_id" AND s."id" = c."section_id"
      WHERE c."edition_id" = $1::uuid`,
    [editionId],
  );
  return rows
    .sort(
      (a, b) =>
        (unitOrder.get(a.unitKey) ?? 1e9) - (unitOrder.get(b.unitKey) ?? 1e9) ||
        byCodeUnit(a.conceptKey, b.conceptKey),
    )
    .map(({ blankForms, ...concept }) =>
      // 고르지 않은 형식을 빈 배열로 채우지 않는다 — 없는 칸은 없는 채로 둔다
      blankForms ? { ...concept, blankForms } : concept,
    );
}

/**
 * 조판 · 발행이 쓰는 구획의 차례 — `assembleExchange` 의 `units[].sections[]` 를 편 것과 **같은 차례**다
 * (목차의 단원 순 → 구획의 차례). 목차에 없는 단원의 구획은 교환 형식에 실리지 않으므로 여기에도 없다.
 */
export async function orderedSectionIds(
  sql: TextbookSql,
  editionId: string,
): Promise<string[]> {
  const [edition] = await sql.query<{ outline: StoredOutline }>(
    `SELECT "outline" FROM "textbook_edition" WHERE "id" = $1::uuid`,
    [editionId],
  );
  if (!edition) throw notFound("판본");
  const sections = await sql.query<{ id: string; unitKey: string }>(
    `SELECT "id", "unit_key" AS "unitKey" FROM "textbook_section"
      WHERE "edition_id" = $1::uuid ORDER BY "order_index", "id"`,
    [editionId],
  );
  return edition.outline.units.flatMap((unit) =>
    sections
      .filter((section) => section.unitKey === unit.unitKey)
      .map((section) => section.id),
  );
}
