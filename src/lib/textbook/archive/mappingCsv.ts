import type { TextbookExchange } from "@/contracts/textbookExchange.contract";

export const MAPPING_COLUMNS = [
  "bookId",
  "editionId",
  "editionLabel",
  "itemId",
  "displayNumber",
  "physicalPageIndex",
  "printedPageLabel",
  "unitKey",
  "sectionKey",
  "learningStage",
  "problemId",
  "problemCode",
  "snapshotId",
  "contentHash",
  "linkStatus",
  "qrTargetId",
  "qrUrl",
  "videoStatus",
] as const;
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe =
    /^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
/** Page labels come only from the final pageMap, never from imported q.page. No student fields. */
export function mappingCsv(exchange: TextbookExchange): string {
  const snapshots = new Map(exchange.snapshots.map((s) => [s.snapshotId, s]));
  const pages = new Map(exchange.pageMap.map((p) => [p.itemId, p]));
  const qr = new Map(exchange.qrTargets.map((q) => [q.qrTargetId, q]));
  const rows = [...exchange.items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => {
      const snapshot = snapshots.get(item.snapshotId);
      if (!snapshot) throw new Error(`Missing snapshot ${item.snapshotId}`);
      const page = pages.get(item.itemId),
        target = item.qrTargetId ? qr.get(item.qrTargetId) : undefined;
      const states = [
        ...new Set(
          exchange.videoBindings
            .filter((v) => v.snapshotId === item.snapshotId)
            .map((v) => v.status),
        ),
      ];
      return [
        exchange.config.bookId,
        exchange.edition.editionId,
        exchange.edition.label,
        item.itemId,
        item.displayNumber,
        page?.physicalPageIndex,
        page?.printedPageLabel,
        item.unitKey,
        item.sectionKey,
        item.learningStage,
        snapshot.source.system === "todays-math"
          ? snapshot.source.problemId
          : "",
        snapshot.source.system === "todays-math"
          ? snapshot.source.problemCode
          : "",
        snapshot.snapshotId,
        snapshot.contentHash,
        item.linkStatus,
        target?.qrTargetId,
        target?.url,
        states.join("|") || "preparing",
      ]
        .map(csvCell)
        .join(",");
    });
  return [MAPPING_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}
