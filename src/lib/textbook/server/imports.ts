/**
 * 가져오기 — 올린 패키지를 ⑴ 보관본으로 두거나 ⑵ 새 원고로 복사한다.
 *
 * ⑴ **보관본**: 검증한 패키지 바이트를 그대로 둔다. 원 판본 id · QR · 쪽 · 영상 연결은 패키지 안에 남고,
 *    살아 있는 책 · 판본 · QR 표에는 **한 줄도 넣지 않는다.** 패키지의 QR 은 우리 서비스에서 켜지지 않는다.
 * ⑵ **복사**: 늘 새 책 · 새 초안이다. id 는 전부 새로 짓고 옛 id → 새 id 의 대응표를 돌려준다. 있는 판본을 덮어쓰지 않는다.
 *    🔴 패키지의 «연결됨» 주장은 믿지 않는다. 은행 문항이라고 적힌 것은 **지금의 은행 문항으로 다시 캡처해 내용 해시가
 *       같을 때만** 연결로 받는다. 다르거나 없으면 그 주장은 후보로만 남기고(`needs-review`), 확정본의 출처는
 *       «가져온 것»으로 적는다 — 확인 안 된 문항 id 가 은행 문항의 정체로 굳지 않게(시험지의 확정본 칸이 그 정체를 믿는다).
 *    🔴 다른 계정이 찍은 개념 연결의 «확인됨»은 후보로 되돌린다. 굳은 개념 내용 · QR · 쪽 · 영상 연결은 가져오지 않는다 —
 *       새 원고는 발행할 때 서버가 새로 만든다.
 * 패키지의 검증(ZIP 한도 · 경로 · 파일별 해시 · 참조 · 내용 해시)은 주입받은 `readArchive` 가 한다(Codex 의 판독기).
 */
import { randomUUID } from "node:crypto";

import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type {
  ManuscriptBlock,
  ProblemPayload,
  ProblemSnapshot,
  TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import {
  type TextbookIssue,
  textbookCanonicalizationVersion,
  textbookVersion,
} from "@/contracts/textbookPrimitives.contract";

import type { TextbookActor } from "../access";
import { contentHash, sha256, snapshotHash } from "../hash.server";
import { remapSemanticRefs } from "../semanticRefs";
import {
  type FigureLoader,
  captureProblemSnapshot,
  freezeFigureBytes,
} from "../snapshotFromProblem";
import {
  type AssetMimeType,
  EDITION_MAX_ASSETS,
  putBlob,
  readBlobRange,
  requireCompletedUpload,
} from "./blobs";
import { DRAFT_RENDERER_VERSION, DRAFT_TEMPLATE_VERSION } from "./books";
import { EDITION_MAX_CONCEPTS } from "./conceptRows";
import { invalid, issue } from "./errors";
import { EDITION_MAX_ITEMS, loadProblemRows } from "./items";
import { lectureRefFaults, lectureRefsOf } from "./lectureRefs";
import { type RequestKey, runOnce } from "./requests";
import { EDITION_MAX_SECTIONS, sectionContent } from "./sections";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "./sql";

/** 검증을 통과한 패키지 — Codex 의 `readTextbookArchive` 가 내는 것 가운데 여기서 쓰는 칸 */
export interface VerifiedArchive {
  exchange: TextbookExchange;
  files: ReadonlyMap<string, Uint8Array>;
  validation: unknown;
}
export type ArchiveReader = (bytes: Uint8Array) => Promise<VerifiedArchive>;

export interface ImportResult {
  mode: "archive" | "copy";
  archiveId: string | null;
  bookId: string | null;
  editionId: string | null;
  idMap: Array<{ namespace: string; from: string; to: string }>;
  issues: TextbookIssue[];
}

const rejected = (
  mode: ImportResult["mode"],
  issues: TextbookIssue[],
): ImportResult => ({
  mode,
  archiveId: null,
  bookId: null,
  editionId: null,
  idMap: [],
  issues,
});

export async function importPackage(
  db: TextbookDb,
  actor: TextbookActor,
  key: RequestKey,
  input: { mode: "archive" | "copy"; uploadId: string; expectedSha256: string },
  readArchive: ArchiveReader,
  loadFigure: FigureLoader,
): Promise<ImportResult & { replayed: boolean }> {
  const upload = await requireCompletedUpload(db, actor, input.uploadId);
  if (upload.sha256 !== input.expectedSha256)
    throw invalid("올린 파일의 해시가 요청과 다릅니다.");
  const bytes = await readBlobRange(db, upload.sha256, 0, upload.size);
  if (!bytes || sha256(bytes) !== upload.sha256)
    throw invalid("올린 파일을 읽지 못했습니다.");

  let archive: VerifiedArchive;
  try {
    archive = await readArchive(bytes);
  } catch (error) {
    // 검증을 못 지난 패키지는 어느 표에도 넣지 않는다
    return {
      ...rejected(input.mode, [
        issue(
          "package-invalid",
          `패키지를 받아들일 수 없습니다: ${(error instanceof Error ? error.message : String(error)).slice(0, 1500)}`,
        ),
      ]),
      replayed: false,
    };
  }

  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<ImportResult>(
      tx,
      key,
      async () =>
        input.mode === "archive"
          ? keepArchive(tx, actor, upload, archive)
          : copyAsDraft(tx, actor, archive, loadFigure),
    );
    return { ...result, replayed };
  });
}

async function keepArchive(
  tx: TextbookSql,
  actor: TextbookActor,
  upload: { sha256: string; size: number; fileName: string | null },
  archive: VerifiedArchive,
): Promise<ImportResult> {
  const { exchange } = archive;
  await tx.execute(
    `INSERT INTO "textbook_archive" ("id", "user_id", "sha256", "byte_size", "file_name", "title", "schema_version",
                                     "manifest_hash", "report")
     VALUES ($1::uuid, $2::uuid, $3::text, $4::int, $5::text, $6::text, $7::text, $8::text, $9::jsonb)
     ON CONFLICT ("user_id", "sha256") DO NOTHING`,
    [
      randomUUID(),
      actor.id,
      upload.sha256,
      upload.size,
      (upload.fileName ?? "textbook.zip").slice(0, 255),
      exchange.config.title,
      exchange.schemaVersion,
      exchange.edition.manifestHash,
      JSON.stringify({
        // 원 판본의 정체 — 읽기 전용으로 보여 줄 뿐, 살아 있는 표의 id 가 되지 않는다
        source: {
          editionId: exchange.edition.editionId,
          label: exchange.edition.label,
          status: exchange.edition.status,
          bookId: exchange.config.bookId,
        },
        counts: {
          units: exchange.units.length,
          items: exchange.items.length,
          snapshots: exchange.snapshots.length,
          assets: exchange.assets.length,
          qrTargets: exchange.qrTargets.length,
        },
        validation: archive.validation,
      }),
    ],
  );
  const [row] = await tx.query<{ id: string }>(
    `SELECT "id" FROM "textbook_archive" WHERE "user_id" = $1::uuid AND "sha256" = $2::text`,
    [actor.id, upload.sha256],
  );
  return {
    mode: "archive",
    archiveId: row!.id,
    bookId: null,
    editionId: null,
    idMap: [],
    issues: [],
  };
}

const EMPTY_RAW = {
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  choiceFigureIndex: [],
  figureSvgAssetId: null,
};

/** 다른 계정의 확인은 이 계정의 확인이 아니다 — 후보로 되돌린다 */
function demoteReviews(concept: TextbookConcept): TextbookConcept {
  const demote = <
    T extends { review: TextbookConcept["links"][number]["review"] },
  >(
    entry: T,
  ): T =>
    entry.review.status === "confirmed"
      ? {
          ...entry,
          review: {
            ...entry.review,
            status: "candidate",
            reviewedBy: null,
            reviewedAt: null,
            targetHash: null,
          },
        }
      : entry;
  return {
    ...concept,
    blankItems: concept.blankItems.map(demote),
    links: concept.links.map(demote),
    frozen: null,
  };
}

async function copyAsDraft(
  tx: TextbookSql,
  actor: TextbookActor,
  archive: VerifiedArchive,
  loadFigure: FigureLoader,
): Promise<ImportResult> {
  const { exchange } = archive;
  const sections = exchange.units.flatMap((unit) =>
    unit.sections.map((section, orderIndex) => ({ unit, section, orderIndex })),
  );
  const concepts = exchange.conceptIntegration?.concepts ?? [];
  const limits: TextbookIssue[] = [];
  if (sections.length > EDITION_MAX_SECTIONS)
    limits.push(
      issue(
        "too-many-sections",
        `구획이 ${EDITION_MAX_SECTIONS}개를 넘습니다.`,
      ),
    );
  if (exchange.items.length > EDITION_MAX_ITEMS)
    limits.push(
      issue("too-many-items", `문항이 ${EDITION_MAX_ITEMS}개를 넘습니다.`),
    );
  if (exchange.assets.length > EDITION_MAX_ASSETS)
    limits.push(
      issue("too-many-assets", `그림이 ${EDITION_MAX_ASSETS}종을 넘습니다.`),
    );
  if (concepts.length > EDITION_MAX_CONCEPTS)
    limits.push(
      issue(
        "too-many-concepts",
        `개념이 ${EDITION_MAX_CONCEPTS}개를 넘습니다.`,
      ),
    );
  if (limits.length) return rejected("copy", limits);

  const issues: TextbookIssue[] = [];
  const idMap: ImportResult["idMap"] = [];
  const map = (namespace: string, from: string, to: string) => {
    idMap.push({ namespace, from, to });
    return to;
  };

  // ── 자산 — 패키지의 바이트를 이 계정의 자산으로. 살아 있는 자산의 id 는 내용 해시다
  const assetIds = new Map<string, string>();
  for (const asset of exchange.assets) {
    const bytes = archive.files.get(asset.packagePath);
    if (!bytes || sha256(bytes) !== asset.sha256)
      return rejected("copy", [
        issue("asset-missing", `패키지에 없는 자산입니다: ${asset.assetId}`),
      ]);
    let mimeType: AssetMimeType = asset.mimeType;
    let widthPx = asset.widthPx;
    let heightPx = asset.heightPx;
    if (!asset.mimeType.startsWith("font/")) {
      // 형식 · 치수는 패키지의 주장이 아니라 바이트에서 읽는다
      const frozen = freezeFigureBytes(
        bytes,
        asset.assetId,
        asset.mimeType === "image/svg+xml",
      );
      if ("reason" in frozen)
        return rejected("copy", [
          issue("asset-rejected", `${frozen.reason} (${asset.assetId})`),
        ]);
      mimeType = frozen.asset.mimeType;
      widthPx = frozen.asset.widthPx;
      heightPx = frozen.asset.heightPx;
    }
    assetIds.set(asset.assetId, map("asset", asset.assetId, asset.sha256));
    await putBlob(tx, asset.sha256, bytes);
    await tx.execute(
      `INSERT INTO "textbook_asset" ("user_id", "id", "kind", "mime_type", "name", "width_px", "height_px")
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int, $7::int) ON CONFLICT ("user_id", "id") DO NOTHING`,
      [
        actor.id,
        asset.sha256,
        mimeType.startsWith("font/") ? "font" : "image",
        mimeType,
        asset.packagePath.split("/").at(-1)!.slice(0, 255),
        widthPx,
        heightPx,
      ],
    );
  }
  const assetOf = (id: string) => assetIds.get(id) ?? id;

  // ── 목차의 개념 강의 참조 — 이 서비스에 게시된 강의이고 패키지 안의 개념과 맞는 것만 가져온다.
  //    다른 곳에서 만든 패키지의 강의 번호를 확인 없이 원고에 심지 않는다
  const droppedRefs = new Set(
    (
      await lectureRefFaults(
        tx,
        lectureRefsOf(exchange.units),
        new Map(
          (exchange.conceptIntegration?.concepts ?? []).map((concept) => [
            concept.conceptKey,
            concept.unitId,
          ]),
        ),
      )
    ).map((fault) => {
      issues.push(
        issue(
          "concept-lecture-ref-dropped",
          `개념 «${fault.conceptKey}»의 개념 강의 연결을 가져오지 않았습니다: ${fault.reason}`,
          {
            severity: "warning",
            path: ["units", fault.unitKey, "conceptLectureRefs"],
          },
        ),
      );
      return `${fault.unitKey}/${fault.lectureId}/${fault.conceptKey}`;
    }),
  );

  // ── 책과 초안
  const bookId = map("book", exchange.config.bookId, randomUUID());
  const editionId = map("edition", exchange.edition.editionId, randomUUID());
  const config = { ...exchange.config, bookId };
  await tx.execute(
    `INSERT INTO "textbook" ("id", "user_id", "school_level", "grade", "semester", "volume", "volume_count",
                             "display_code", "title", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::text, $4::int, $5::int, $6::int, $7::int, $8::text, $9::text, ${SQL_NOW})`,
    [
      bookId,
      actor.id,
      config.schoolLevel,
      config.grade,
      config.semester,
      config.volume,
      config.volumeCount,
      config.displayCode,
      config.title,
    ],
  );
  await tx.execute(
    `INSERT INTO "textbook_edition" ("id", "textbook_id", "user_id", "ordinal", "label", "schema_version", "c14n_version",
          "config", "outline", "renderer_version", "template_version", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, 1, $4::text, $5::text, $6::text, $7::jsonb, $8::jsonb, $9::text, $10::text, ${SQL_NOW})`,
    [
      editionId,
      bookId,
      actor.id,
      exchange.edition.label,
      textbookVersion,
      textbookCanonicalizationVersion,
      JSON.stringify(config),
      JSON.stringify({
        units: exchange.units.map((unit) => ({
          unitKey: unit.unitKey,
          title: unit.title,
          sourceUnitIds: unit.sourceUnitIds,
          prerequisites: unit.prerequisites,
          goals: unit.goals,
          conceptLectureRefs: unit.conceptLectureRefs.filter(
            (ref) =>
              !droppedRefs.has(
                `${unit.unitKey}/${ref.lectureId}/${ref.conceptKey}`,
              ),
          ),
        })),
      }),
      DRAFT_RENDERER_VERSION,
      DRAFT_TEMPLATE_VERSION,
    ],
  );
  if (exchange.assets.length)
    await tx.execute(
      `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id")
       SELECT $1::uuid, $2::uuid, value FROM jsonb_array_elements_text($3::jsonb) ON CONFLICT DO NOTHING`,
      [editionId, actor.id, JSON.stringify([...new Set(assetIds.values())])],
    );

  // ── 확정본 — 은행 문항이라는 주장은 지금의 은행 문항으로 다시 캡처해 내용 해시가 같을 때만 받는다
  const claimed = exchange.snapshots.flatMap((snapshot) =>
    snapshot.source.system === "todays-math" ? [snapshot.source.problemId] : [],
  );
  const live = await loadProblemRows(tx, claimed);
  const snapshotRows: Array<Record<string, unknown>> = [];
  const snapshotIds = new Map<
    string,
    { id: string; linked: boolean; claim: unknown }
  >();
  for (const snapshot of exchange.snapshots) {
    const payload: ProblemPayload = {
      ...snapshot.payload,
      figures: snapshot.payload.figures.map((figure) => ({
        ...figure,
        assetId: assetOf(figure.assetId),
      })),
    };
    let source: ProblemSnapshot["source"] = snapshot.source;
    let problemId: string | null = null;
    let rawSource = snapshot.rawSource
      ? {
          ...snapshot.rawSource,
          figureSvgAssetId: snapshot.rawSource.figureSvgAssetId
            ? assetOf(snapshot.rawSource.figureSvgAssetId)
            : null,
        }
      : EMPTY_RAW;
    let sourceMetadata = snapshot.sourceMetadata ?? {
      unitId: snapshot.unitId,
      grade: null,
      chapter: null,
      section: null,
      difficulty: snapshot.difficulty,
      originalScore: null,
    };
    let linked = false;
    if (snapshot.source.system === "todays-math") {
      const row = live.get(snapshot.source.problemId);
      const recaptured = row
        ? await captureProblemSnapshot(row, loadFigure)
        : null;
      if (
        recaptured?.ok &&
        recaptured.snapshot.source.problemCode ===
          snapshot.source.problemCode &&
        recaptured.snapshot.contentHash === contentHash(payload)
      ) {
        linked = true;
        problemId = snapshot.source.problemId;
        // 출처 칸은 패키지가 아니라 지금의 은행 행에서 온 것을 쓴다
        rawSource = recaptured.snapshot.rawSource;
        sourceMetadata = recaptured.snapshot.sourceMetadata;
      } else {
        source = { system: "legacy-studio", legacyId: snapshot.snapshotId };
        issues.push(
          issue(
            "link-unverified",
            `문항 ${snapshot.source.problemCode} 의 연결을 확인하지 못했습니다. 검수가 필요합니다.`,
            { severity: "warning", path: ["snapshots", snapshot.snapshotId] },
          ),
        );
      }
    }
    const id = map("snapshot", snapshot.snapshotId, randomUUID());
    snapshotIds.set(snapshot.snapshotId, {
      id,
      linked,
      claim:
        snapshot.source.system === "todays-math" && !linked
          ? snapshot.source
          : null,
    });
    const hashedContent = contentHash(payload);
    snapshotRows.push({
      id,
      sourceSystem: source.system,
      sourceKey:
        source.system === "todays-math"
          ? `tm:${source.problemId}`
          : source.system === "legacy-studio"
            ? `legacy:${source.legacyId}`
            : `studio:${source.localId}`,
      sourceRef: source,
      problemId,
      // 시간대가 붙은 글자를 그대로 넣으면 TIMESTAMP 가 시간대를 버린다 — UTC 글자로 바꿔 넣는다
      sourceUpdatedAt: snapshot.sourceUpdatedAt
        ? new Date(snapshot.sourceUpdatedAt).toISOString()
        : null,
      unitId: linked ? snapshot.unitId : null,
      familyKey: snapshot.familyKey,
      difficulty: snapshot.difficulty,
      problemType: snapshot.problemType,
      payload,
      rawSource,
      sourceMetadata: linked
        ? sourceMetadata
        : { ...sourceMetadata, unitId: null },
      contentHash: hashedContent,
      snapshotHash: snapshotHash({
        ...snapshot,
        source,
        unitId: linked ? snapshot.unitId : null,
        payload,
        rawSource,
        sourceMetadata: linked
          ? sourceMetadata
          : { ...sourceMetadata, unitId: null },
        contentHash: hashedContent,
      }),
    });
  }
  if (snapshotRows.length)
    await tx.execute(
      `INSERT INTO "textbook_problem_snapshot" ("id", "user_id", "source_system", "source_key", "source_ref", "problem_id",
            "source_updated_at", "captured_at", "unit_id", "family_key", "difficulty", "problem_type", "payload",
            "raw_source", "source_metadata", "content_hash", "snapshot_hash", "c14n_version")
       SELECT r."id", $1::uuid, r."sourceSystem", r."sourceKey", r."sourceRef", r."problemId",
              r."sourceUpdatedAt"::timestamp, ${SQL_NOW}, r."unitId", r."familyKey", r."difficulty", r."problemType",
              r."payload", r."rawSource", r."sourceMetadata", r."contentHash", r."snapshotHash", $3::text
         FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "sourceSystem" text, "sourceKey" text, "sourceRef" jsonb,
              "problemId" uuid, "sourceUpdatedAt" text, "unitId" uuid, "familyKey" text, "difficulty" text,
              "problemType" text, "payload" jsonb, "rawSource" jsonb, "sourceMetadata" jsonb, "contentHash" text,
              "snapshotHash" text)`,
      [actor.id, JSON.stringify(snapshotRows), textbookCanonicalizationVersion],
    );

  // ── 구획 · 배치
  const sectionIds = new Map<string, string>();
  const itemIds = new Map(
    exchange.items.map((item) => [
      item.itemId,
      map("item", item.itemId, randomUUID()),
    ]),
  );
  const remapBlock = (block: ManuscriptBlock): ManuscriptBlock => {
    const placed = remapPlacement(block);
    // 구조 메타 안의 배치 id · 자산 id 도 같은 대응표로 — 빠지면 예제 역할 · 참조 · 원본 그림이 끊긴다
    const semantic = remapSemanticRefs(placed.semantic, { itemIds, assetIds });
    return semantic === placed.semantic ? placed : { ...placed, semantic };
  };
  const remapPlacement = (block: ManuscriptBlock): ManuscriptBlock =>
    block.kind === "problem"
      ? { ...block, itemId: itemIds.get(block.itemId) ?? block.itemId }
      : block.kind === "image"
        ? { ...block, assetId: assetOf(block.assetId) }
        : block.kind === "dialogue"
          ? {
              ...block,
              turns: block.turns.map((turn) => ({
                ...turn,
                portraitAssetId: assetOf(turn.portraitAssetId),
              })),
            }
          : block;
  const sectionRows = sections.map(({ unit, section, orderIndex }) => {
    const id = randomUUID();
    // 구획은 대응표에 싣지 않는다 — 교환 형식에서 구획의 정체는 (단원 열쇠, 구획 열쇠)이고 복사해도 그대로다.
    // 새 줄의 id 는 판본을 읽으면 나온다(열쇠에는 한글이 올 수 있어 대응표의 id 모양에 맞지 않는다)
    sectionIds.set(`${unit.unitKey}/${section.sectionKey}`, id);
    return {
      id,
      unitKey: unit.unitKey,
      sectionKey: section.sectionKey,
      orderIndex,
      title: section.title,
      templateKey: section.templateKey,
      startPolicy: section.startPolicy,
      content: sectionContent(section, section.blocks.map(remapBlock)),
    };
  });
  if (sectionRows.length)
    await tx.execute(
      `INSERT INTO "textbook_section" ("id", "edition_id", "unit_key", "section_key", "order_index", "title",
                                       "template_key", "start_policy", "content", "updated_at")
       SELECT r."id", $1::uuid, r."unitKey", r."sectionKey", r."orderIndex", r."title", r."templateKey", r."startPolicy",
              r."content", ${SQL_NOW}
         FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "unitKey" text, "sectionKey" text, "orderIndex" int,
              "title" text, "templateKey" text, "startPolicy" text, "content" jsonb)`,
      [editionId, JSON.stringify(sectionRows)],
    );
  const conceptKeys = new Set(concepts.map((concept) => concept.conceptKey));
  // 구획 안의 차례 — 패키지의 차례(원고 전체에서의 자리)를 구획마다 0부터 다시 센다
  const sectionRank = new Map<string, number>();
  const rankCounters = new Map<string, number>();
  for (const item of [...exchange.items].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  )) {
    const sectionOf = `${item.unitKey}/${item.sectionKey}`;
    const rank = rankCounters.get(sectionOf) ?? 0;
    sectionRank.set(item.itemId, rank);
    rankCounters.set(sectionOf, rank + 1);
  }
  const itemRows = exchange.items.map((item) => {
    const snapshot = snapshotIds.get(item.snapshotId)!;
    return {
      id: itemIds.get(item.itemId)!,
      snapshotId: snapshot.id,
      linkStatus: snapshot.linked
        ? "linked"
        : snapshot.claim
          ? "needs-review"
          : "unlinked",
      linkCandidates: snapshot.claim ? [snapshot.claim] : [],
      unitKey: item.unitKey,
      sectionId: sectionIds.get(`${item.unitKey}/${item.sectionKey}`) ?? null,
      learningStage: item.learningStage,
      // 표에는 **구획 안의 차례**를 적는다(패키지의 값은 원고 전체에서의 차례다)
      orderIndex: sectionRank.get(item.itemId)!,
      layout: item.layout,
      videoRequired: item.videoRequired ?? null,
      conceptKeys: (item.conceptKeys ?? []).filter((key) =>
        conceptKeys.has(key),
      ),
      displayNumber: item.displayNumber,
    };
  });
  if (itemRows.length)
    await tx.execute(
      `INSERT INTO "textbook_item" ("id", "edition_id", "user_id", "snapshot_id", "link_status", "link_candidates",
            "unit_key", "section_id", "learning_stage", "order_index", "layout", "video_required", "concept_keys",
            "display_number", "updated_at")
       SELECT r."id", $1::uuid, $2::uuid, r."snapshotId", r."linkStatus", r."linkCandidates", r."unitKey", r."sectionId",
              r."learningStage", r."orderIndex", r."layout", r."videoRequired", r."conceptKeys", r."displayNumber", ${SQL_NOW}
         FROM jsonb_to_recordset($3::jsonb) AS r("id" uuid, "snapshotId" uuid, "linkStatus" text, "linkCandidates" jsonb,
              "unitKey" text, "sectionId" uuid, "learningStage" text, "orderIndex" int, "layout" jsonb,
              "videoRequired" boolean, "conceptKeys" jsonb, "displayNumber" text)`,
      [editionId, actor.id, JSON.stringify(itemRows)],
    );

  // ── 개념 — 원고와 연결 후보만. 확인 · 굳은 내용은 이 계정에서 다시 한다
  const conceptRows = concepts.map(demoteReviews).map((concept) => ({
    conceptKey: concept.conceptKey,
    unitKey: concept.unitKey,
    sectionId: concept.sectionKey
      ? (sectionIds.get(`${concept.unitKey}/${concept.sectionKey}`) ?? null)
      : null,
    title: concept.title,
    kind: concept.kind,
    body: concept.body,
    blankItems: concept.blankItems,
    blankForms: concept.blankForms ?? null,
    links: concept.links,
    mappingVersion: concept.mappingVersion,
    derivedFromConceptKey: concept.derivedFromConceptKey,
  }));
  if (conceptRows.length)
    await tx.execute(
      `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "section_id", "title", "kind", "body",
            "blank_items", "blank_forms", "links", "mapping_version", "derived_from_concept_key", "updated_at")
       SELECT $1::uuid, r."conceptKey", r."unitKey", r."sectionId", r."title", r."kind", r."body", r."blankItems",
              NULLIF(r."blankForms", 'null'::jsonb), r."links", r."mappingVersion", r."derivedFromConceptKey", ${SQL_NOW}
         FROM jsonb_to_recordset($2::jsonb) AS r("conceptKey" text, "unitKey" text, "sectionId" uuid, "title" text,
              "kind" text, "body" jsonb, "blankItems" jsonb, "blankForms" jsonb, "links" jsonb, "mappingVersion" text,
              "derivedFromConceptKey" text)`,
      [editionId, JSON.stringify(conceptRows)],
    );

  if (
    exchange.qrTargets.length ||
    exchange.pageMap.length ||
    exchange.videoBindings.length
  )
    issues.push(
      issue(
        "server-issued-skipped",
        "패키지의 QR · 쪽 · 영상 연결은 서버가 발급하는 값이라 새 원고로 가져오지 않았습니다. 발행할 때 새로 만듭니다.",
        { severity: "info" },
      ),
    );
  return { mode: "copy", archiveId: null, bookId, editionId, idMap, issues };
}
