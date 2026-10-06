import {
  textbookExchangeSchema,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import { checkChoiceFigureIndex } from "@/lib/problem/choiceFigureIndex";
import { semanticFragmentAssetIds } from "./semanticAssets";
import { canonicalJson } from "./canonical";

export interface ReferenceOptions {
  mode?: "draft" | "archive" | "publish";
  officialOrigin?: string;
  requirePageMap?: boolean;
}

/** Pure structural and cross-reference checks; never resolves IDs against active database rows. */
export function validateTextbookReferences(
  input: TextbookExchange,
  options: ReferenceOptions = {},
): TextbookIssue[] {
  const parsed = textbookExchangeSchema.safeParse(input);
  if (!parsed.success)
    return parsed.error.issues.map((i) => ({
      code: "SCHEMA",
      severity: "error",
      message: i.message,
      path: i.path.map((p) => (typeof p === "number" ? p : String(p))),
    }));
  const e = parsed.data,
    issues: TextbookIssue[] = [];
  const publish = options.mode === "publish";
  const add = (
    code: string,
    message: string,
    path: (string | number)[],
    severity: TextbookIssue["severity"] = "error",
  ) => issues.push({ code, message, path, severity });
  const unique = <T>(
    values: readonly T[],
    key: (v: T) => string,
    path: string,
  ): Map<string, T> => {
    const map = new Map<string, T>();
    values.forEach((v, i) => {
      const k = key(v);
      if (map.has(k)) add("DUPLICATE_ID", `중복 식별자: ${k}`, [path, i]);
      else map.set(k, v);
    });
    return map;
  };
  const assets = unique(e.assets, (a) => a.assetId, "assets");
  unique(
    e.assets,
    (a) => a.packagePath.normalize("NFC").toLowerCase(),
    "assets",
  );
  const snapshots = unique(e.snapshots, (s) => s.snapshotId, "snapshots");
  const items = unique(e.items, (i) => i.itemId, "items");
  const units = unique(e.units, (u) => u.unitKey, "units");
  const concepts = unique(
    e.conceptIntegration?.concepts ?? [],
    (c) => c.conceptKey,
    "conceptIntegration",
  );
  const pair = (u: string, s: string) => JSON.stringify([u, s]);
  const sections = new Set<string>(),
    blockIds = new Set<string>(),
    usedItems = new Set<string>();
  const itemOrder: string[] = [];
  const image = (id: string, path: (string | number)[], hash?: string) => {
    const a = assets.get(id);
    if (!a) add("MISSING_ASSET", `자산을 찾을 수 없습니다: ${id}`, path);
    else {
      if (!a.mimeType.startsWith("image/"))
        add("ASSET_ROLE", "그림에는 이미지 자산이 필요합니다.", path);
      if (hash && hash !== a.sha256)
        add("FIGURE_HASH", "그림과 자산의 바이트 해시가 다릅니다.", path);
    }
  };
  e.units.forEach((u, ui) =>
    u.sections.forEach((s, si) => {
      const location = ["units", ui, "sections", si] as (string | number)[];
      const key = pair(u.unitKey, s.sectionKey);
      if (sections.has(key))
        add(
          "DUPLICATE_SECTION",
          "같은 단원 안에 구획 키가 중복됩니다.",
          location,
        );
      sections.add(key);
      s.blocks.forEach((b, bi) => {
        const p = [...location, "blocks", bi];
        if (blockIds.has(b.blockId))
          add("DUPLICATE_BLOCK", `중복 블록 ID: ${b.blockId}`, p);
        blockIds.add(b.blockId);
        if (b.kind === "problem") {
          const item = items.get(b.itemId);
          if (!item)
            add("MISSING_ITEM", `문항 배치를 찾을 수 없습니다: ${b.itemId}`, p);
          else if (
            item.unitKey !== u.unitKey ||
            item.sectionKey !== s.sectionKey
          )
            add("ITEM_SECTION", "문항 배치와 블록의 단원·구획이 다릅니다.", p);
          if (usedItems.has(b.itemId))
            add(
              "ITEM_REUSED",
              "같은 문항 배치 ID는 한 번만 참조하세요. 반복 문제는 새 itemId를 사용하세요.",
              p,
            );
          usedItems.add(b.itemId);
          itemOrder.push(b.itemId);
        } else if (b.kind === "image") image(b.assetId, p);
        else if (b.kind === "dialogue")
          b.turns.forEach((turn, i) =>
            image(turn.portraitAssetId, [...p, "turns", i]),
          );
        else if (b.kind === "concept" || b.kind === "concept-recall") {
          // Early automatic error-check blocks omitted their key. Accept only
          // their unambiguous same-section prepared concept, keeping raw bytes intact.
          const legacy =
            b.kind === "concept-recall" &&
            !b.conceptKey &&
            b.phase === "sentences" &&
            /^\d+\.\s/.test(b.markdown) &&
            /\{\{(?:옳음|틀림):/.test(b.markdown)
              ? [...concepts.values()].filter(
                  (c) =>
                    c.unitKey === u.unitKey &&
                    c.sectionKey === s.sectionKey &&
                    c.mappingVersion === "quick-create.unit-triple.v1",
                )
              : [];
          const c = b.conceptKey
            ? concepts.get(b.conceptKey)
            : legacy.length === 1
              ? legacy[0]
              : undefined;
          if (!c && (b.kind === "concept" || b.conceptKey || publish))
            add(
              "MISSING_CONCEPT",
              "개념 블록에 정확한 개념 연결이 필요합니다.",
              p,
            );
          if (
            c &&
            (c.unitKey !== u.unitKey ||
              (c.sectionKey !== null && c.sectionKey !== s.sectionKey))
          )
            add("CONCEPT_SECTION", "개념과 블록의 단원·구획이 다릅니다.", p);
          if (b.semantic?.node?.kind === "conceptQuestions")
            for (const row of b.semantic.node.questions) {
              const frozen = c?.frozen?.entries.find(
                (entry) =>
                  entry.entryKind === "concept" &&
                  entry.payload.id === row.entryId,
              );
              const question =
                frozen?.entryKind === "concept"
                  ? frozen.payload.bQuestion
                  : undefined;
              if (
                !question ||
                canonicalJson(row.question) !==
                  canonicalJson({
                    prompt: question.prompt,
                    answer: question.answer,
                    requiredIdeas: question.requiredIdeas,
                  }) ||
                !c?.frozen?.selection.some(
                  (pick) =>
                    pick.entryId === row.entryId && pick.form === "term",
                )
              )
                add(
                  "QUESTION_FROZEN",
                  "질문과 참고 답이 고정한 개념 문항과 일치하지 않습니다.",
                  p,
                );
            }
        }
        for (const assetId of semanticFragmentAssetIds(b.semantic))
          image(assetId, [...p, "semantic", "node"]);
      });
      if (publish && !s.blocks.length)
        add("EMPTY_SECTION", "발행할 구획에 원고를 입력하세요.", location);
    }),
  );
  e.snapshots.forEach((s, i) => {
    const p = ["snapshots", i];
    const mappedChoices = new Set<number>();
    s.payload.figures.forEach((f, fi) => {
      image(f.assetId, [...p, "payload", "figures", fi], f.sha256);
      if (f.choiceIndex === null)
        add(
          "FIGURE_CHOICE_UNKNOWN",
          "그림의 본문·보기 대응 정보가 없습니다. 보기 번호를 추정하지 않고 원본 순서의 별도 그림으로 표시합니다.",
          [...p, "payload", "figures", fi],
          "warning",
        );
      else if (f.choiceIndex > 0) {
        if (mappedChoices.has(f.choiceIndex))
          add(
            "FIGURE_CHOICE_DUPLICATE",
            `여러 그림이 같은 ${f.choiceIndex}번 보기를 가리킵니다. 원본 대응을 확인하세요.`,
            [...p, "payload", "figures", fi],
          );
        mappedChoices.add(f.choiceIndex);
      }
    });
    if (s.rawSource) {
      const raw = s.rawSource,
        count = raw.figureUrls.length;
      for (const [name, array, multiplier] of [
        ["figureDims", raw.figureDims, 2],
        ["figureSourceMm", raw.figureSourceMm, 1],
      ] as const) {
        if (
          array.length &&
          (array.length !== count * multiplier ||
            array.some((n) => !Number.isFinite(n) || n <= 0))
        )
          add(
            "RAW_FIGURE_ALIGNMENT",
            `원본 ${name} 배열을 보존했으나 대응·치수가 잘못되어 조판할 수 없습니다.`,
            [...p, "rawSource", name],
          );
      }
      // [] means unknown. A malformed explicit map must not become publishable
      // merely because capture preserved it and projected its links to null.
      if (raw.choiceFigureIndex.length) {
        const mapping = checkChoiceFigureIndex(count, raw.choiceFigureIndex);
        if (!mapping.ok)
          add(
            "RAW_FIGURE_ALIGNMENT",
            `원본 choiceFigureIndex 배열의 대응이 잘못되었습니다: ${mapping.reason}. 원본 배열은 보존합니다.`,
            [...p, "rawSource", "choiceFigureIndex"],
          );
      }
      if (raw.figureSvgAssetId) {
        image(raw.figureSvgAssetId, [...p, "rawSource", "figureSvgAssetId"]);
        if (!s.payload.figures.some((f) => f.assetId === raw.figureSvgAssetId))
          add("RAW_SVG_REF", "원본 SVG가 고정 그림 목록에 없습니다.", [
            ...p,
            "rawSource",
            "figureSvgAssetId",
          ]);
        if (assets.get(raw.figureSvgAssetId)?.mimeType !== "image/svg+xml")
          add("SVG_MIME", "원본 SVG에는 SVG 자산이 필요합니다.", p);
      }
    }
    if (publish && (!s.snapshotHash || !s.rawSource || !s.sourceMetadata))
      add(
        "SNAPSHOT_EXTENSION_REQUIRED",
        "이전 스냅샷은 원본·메타데이터·스냅샷 해시를 확인한 후 발행하세요.",
        p,
      );
  });
  const order = new Set<number>();
  let previous = -1;
  itemOrder.forEach((id) => {
    const item = items.get(id);
    if (!item) return;
    if (item.orderIndex <= previous || order.has(item.orderIndex))
      add("ITEM_ORDER", "원고의 문제 순서와 orderIndex가 다릅니다.", [
        "items",
        id,
      ]);
    order.add(item.orderIndex);
    previous = item.orderIndex;
  });
  e.items.forEach((item, i) => {
    const p = ["items", i],
      s = snapshots.get(item.snapshotId);
    if (item.editionId !== e.edition.editionId)
      add("EDITION_MISMATCH", "다른 판본의 문항입니다.", p);
    if (!s)
      add(
        "MISSING_SNAPSHOT",
        `스냅샷을 찾을 수 없습니다: ${item.snapshotId}`,
        p,
      );
    if (!sections.has(pair(item.unitKey, item.sectionKey)))
      add("MISSING_SECTION", "문항의 단원·구획이 없습니다.", p);
    if (!usedItems.has(item.itemId))
      add("UNPLACED_ITEM", "원고에 배치되지 않은 문항입니다.", p);
    if (item.linkStatus === "linked" && s?.source.system !== "todays-math")
      add("LINKED_SOURCE", "연결 문항에는 실제 문제은행 원본이 필요합니다.", p);
    if (publish && item.linkStatus !== "linked")
      add("UNLINKED_ITEM", "문항 연결을 확인한 후 발행하세요.", p);
    const seen = new Set<string>();
    for (const key of item.conceptKeys ?? []) {
      const c = concepts.get(key);
      if (seen.has(key) || !c || c.unitKey !== item.unitKey)
        add(
          "ITEM_CONCEPT",
          "문항의 개념 연결이 없거나 중복되거나 다른 단원입니다.",
          p,
        );
      seen.add(key);
    }
    if (
      publish &&
      (item.videoRequired ?? e.config.videoPolicy === "required") &&
      !e.videoBindings.some(
        (b) =>
          b.snapshotId === item.snapshotId &&
          b.status === "published" &&
          b.reviewedAgainstHash === s?.contentHash,
      )
    )
      add("VIDEO_REQUIRED", "이 스냅샷으로 검수·게시한 영상이 필요합니다.", p);
  });
  for (const [i, c] of (e.conceptIntegration?.concepts ?? []).entries()) {
    const p = ["conceptIntegration", "concepts", i];
    if (
      !units.has(c.unitKey) ||
      (c.sectionKey !== null && !sections.has(pair(c.unitKey, c.sectionKey)))
    )
      add("CONCEPT_LOCATION", "개념의 단원·구획이 없습니다.", p);
    if (c.derivedFromConceptKey === c.conceptKey)
      add("CONCEPT_DERIVATION", "개념은 자기 자신에서 파생될 수 없습니다.", p);
    if (
      publish &&
      (!c.frozen ||
        c.blankItems.some((b) => b.review.status !== "confirmed") ||
        c.links.some((l) => l.review.status !== "confirmed"))
    )
      add(
        "CONCEPT_UNCONFIRMED",
        "개념의 정확한 연결 검수와 내용 고정이 필요합니다.",
        p,
      );
    if (c.frozen) {
      if (c.mappingVersion !== c.frozen.mappingVersion)
        add(
          "CONCEPT_MAPPING_VERSION",
          "원고와 고정 개념의 매핑 버전이 다릅니다.",
          p,
        );
      try {
        composeFrozenTextbookBlank(c.frozen);
      } catch (error) {
        add(
          "CONCEPT_SELECTION",
          error instanceof Error ? error.message : "고정 선택 오류",
          p,
        );
      }
      const refs = new Set(
        c.blankItems.map(
          (b) => `${b.entryKind}:${b.entryId}:${b.blankSectionKey}`,
        ),
      );
      for (const entry of c.frozen.entries)
        if (
          !refs.has(
            `${entry.entryKind}:${entry.payload.id}:${entry.payload.section}`,
          )
        )
          add(
            "CONCEPT_ENTRY_REF",
            "고정 항목에 대응하는 검수 연결이 없습니다.",
            p,
          );
      c.frozen.assetHashes.forEach((a) => image(a.assetId, p, a.sha256));
    }
  }
  const qrTargets = [...e.qrTargets, ...(e.conceptQrTargets ?? [])];
  unique(qrTargets, (q) => q.qrTargetId, "qrTargets");
  unique(qrTargets, (q) => q.slug, "qrTargets");
  unique(qrTargets, (q) => q.url, "qrTargets");
  const qrItems = new Set<string>();
  qrTargets.forEach((q, i) => {
    const p = ["qrTargets", i],
      url = new URL(q.url);
    if (q.editionId !== e.edition.editionId)
      add("QR_EDITION", "QR 판본이 다릅니다.", p);
    if (
      url.pathname !== `/q/${q.slug}` ||
      /^(localhost|127\.|\[::1\])/.test(url.hostname)
    )
      add("QR_URL", "QR에는 영구 서버 대상 주소가 필요합니다.", p);
    if (
      publish &&
      (!options.officialOrigin || url.origin !== options.officialOrigin)
    )
      add("QR_ORIGIN", "공식 서비스 origin의 예약 QR만 발행할 수 있습니다.", p);
    if ("itemId" in q) {
      const item = items.get(q.itemId);
      if (!item || item.qrTargetId !== q.qrTargetId || qrItems.has(q.itemId))
        add("QR_ITEM", "QR과 문항의 상호 참조가 없거나 중복됩니다.", p);
      qrItems.add(q.itemId);
    } else if (!concepts.has(q.conceptKey))
      add("QR_CONCEPT", "QR 개념이 없습니다.", p);
  });
  e.items.forEach((item, i) => {
    if (
      (publish || item.qrTargetId) &&
      !e.qrTargets.some(
        (q) => q.qrTargetId === item.qrTargetId && q.itemId === item.itemId,
      )
    )
      add("MISSING_QR", "문항의 예약 QR 대상이 없습니다.", ["items", i]);
  });
  unique(e.videoBindings, (b) => b.bindingId, "videoBindings");
  e.videoBindings.forEach((b, i) => {
    const s = snapshots.get(b.snapshotId);
    if (!s)
      add("VIDEO_SNAPSHOT", "영상 검수 스냅샷이 없습니다.", [
        "videoBindings",
        i,
      ]);
    else if (
      b.status === "published" &&
      b.reviewedAgainstHash !== s.contentHash
    )
      add("VIDEO_HASH", "영상이 현재 스냅샷 내용으로 검수되지 않았습니다.", [
        "videoBindings",
        i,
      ]);
  });
  const placed = new Set<string>();
  e.pageMap.forEach((p, i) => {
    if (!items.has(p.itemId) || placed.has(p.itemId))
      add("PAGE_ITEM", "쪽 지도에 없는 문항 또는 중복 배치가 있습니다.", [
        "pageMap",
        i,
      ]);
    placed.add(p.itemId);
    if (p.physicalPageIndex < e.config.print.firstPhysicalPageIndex)
      add("PAGE_RANGE", "쪽 지도가 본문 시작 면보다 앞입니다.", ["pageMap", i]);
  });
  if (options.requirePageMap ?? publish)
    e.items.forEach((item, i) => {
      if (!placed.has(item.itemId))
        add("MISSING_PAGE", "실제 조판 쪽 지도에 문항이 없습니다.", [
          "items",
          i,
        ]);
    });
  if (publish && !e.canonicalizationVersion)
    add("CANONICAL_VERSION", "발행 전에 canonicalization 버전을 명시하세요.", [
      "canonicalizationVersion",
    ]);
  return issues;
}
