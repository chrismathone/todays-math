import "server-only";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import { canonicalJson } from "./canonical";
import {
  contentHash,
  snapshotHash,
  conceptContentHash,
  manifestHash,
  sha256,
  canonicalHash,
} from "./hash.server";
import {
  validateTextbookReferences,
  type ReferenceOptions,
} from "./references";
import { assertAssetMime } from "./assets";

export type ReadTextbookAsset = (assetId: string) => Promise<Uint8Array>;
export async function validateTextbookIntegrity(
  exchange: TextbookExchange,
  options: ReferenceOptions & {
    readAsset?: ReadTextbookAsset;
    verifyManifest?: boolean;
  } = {},
): Promise<TextbookIssue[]> {
  const issues = validateTextbookReferences(exchange, options);
  const add = (code: string, message: string, path: (string | number)[]) =>
    issues.push({ code, message, path, severity: "error" });
  if (issues.some((i) => i.code === "SCHEMA")) return issues;
  try {
    canonicalJson(exchange);
  } catch (error) {
    add("INVALID_JSON", String(error), []);
    return issues;
  }
  for (const [i, s] of exchange.snapshots.entries()) {
    if (contentHash(s.payload) !== s.contentHash)
      add("CONTENT_HASH", "문항 내용 해시가 실제 원문과 다릅니다.", [
        "snapshots",
        i,
        "contentHash",
      ]);
    if (s.snapshotHash !== undefined && snapshotHash(s) !== s.snapshotHash)
      add("SNAPSHOT_HASH", "원본·메타데이터 해시가 스냅샷과 다릅니다.", [
        "snapshots",
        i,
        "snapshotHash",
      ]);
  }
  for (const [i, c] of (
    exchange.conceptIntegration?.concepts ?? []
  ).entries()) {
    if (c.frozen && conceptContentHash(c) !== c.frozen.contentHash)
      add("CONCEPT_HASH", "고정 개념 내용 해시가 다릅니다.", [
        "conceptIntegration",
        "concepts",
        i,
      ]);
    if (c.frozen)
      for (const entry of c.frozen.entries) {
        const ref = c.blankItems.find(
          (b) =>
            b.entryKind === entry.entryKind && b.entryId === entry.payload.id,
        );
        if (
          ref?.review.status === "confirmed" &&
          ref.review.targetHash !== canonicalHash(entry.payload)
        )
          add(
            "CONCEPT_REVIEW_HASH",
            "확인한 은행 항목과 고정 내용의 해시가 다릅니다.",
            ["conceptIntegration", "concepts", i, "blankItems"],
          );
      }
  }
  if (
    (options.verifyManifest ?? exchange.edition.status !== "draft") &&
    (!exchange.edition.manifestHash ||
      manifestHash(exchange) !== exchange.edition.manifestHash)
  )
    add("MANIFEST_HASH", "판본 manifest 해시가 실제 원고와 다릅니다.", [
      "edition",
      "manifestHash",
    ]);
  if (options.readAsset) {
    // Sequential reads bound peak asset memory; neither URLs nor package paths are fetched here.
    for (const [i, asset] of exchange.assets.entries()) {
      try {
        const bytes = await options.readAsset(asset.assetId);
        if (sha256(bytes) !== asset.sha256) throw new Error("SHA-256 mismatch");
        assertAssetMime(bytes, asset.mimeType);
      } catch (error) {
        add(
          "ASSET_BYTES",
          `자산 검증 실패: ${asset.assetId}: ${String(error)}`,
          ["assets", i],
        );
      }
    }
  } else if (options.mode === "publish" && exchange.assets.length)
    add(
      "ASSET_READER_REQUIRED",
      "발행에는 실제 자산 바이트 검증이 필요합니다.",
      ["assets"],
    );
  return issues;
}

export async function assertTextbookIntegrity(
  exchange: TextbookExchange,
  options: Parameters<typeof validateTextbookIntegrity>[1] = {},
): Promise<void> {
  const issues = await validateTextbookIntegrity(exchange, options);
  const failures = issues.filter((i) => i.severity === "error");
  if (failures.length) throw new TextbookIntegrityError(failures);
}
export class TextbookIntegrityError extends Error {
  constructor(readonly issues: TextbookIssue[]) {
    super(issues.map((i) => `${i.code}: ${i.message}`).join("\n"));
    this.name = "TextbookIntegrityError";
  }
}
