import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { textbookAssetSchema } from "@/contracts/textbookExchange.contract";
import { assertAssetMime, assertSafeSvg } from "@/lib/textbook/assets";
import { sha256 } from "@/lib/textbook/hash.server";
import type { PrintableSnapshotAsset } from "@/lib/textbook/snapshotToPrintable";
import { snapshotOf, type TestContentLink } from "./testProblemContent";

type AssetRow = {
  userId: string;
  id: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
  size: number;
  bytes?: Uint8Array;
};
const MAX_ASSETS = 10_000;
const MAX_BYTES = 64 * 1024 * 1024;

/** The caller has authorized these Test rows. Only immutable assets referenced by their snapshots are read. */
export async function hydrateTestSnapshots<T extends TestContentLink>(
  rows: readonly T[],
): Promise<T[]> {
  const wanted = new Map<string, Set<string>>();
  for (const row of rows) {
    const snapshot = snapshotOf(row);
    if (!snapshot) continue;
    const owner = row.snapshot!.userId;
    const ids = wanted.get(owner) ?? new Set<string>();
    for (const figure of snapshot.payload.figures) {
      if (figure.assetId !== figure.sha256)
        throw new Error("고정 자산 ID와 해시가 다릅니다.");
      ids.add(figure.assetId);
    }
    wanted.set(owner, ids);
  }
  const entries = [...wanted].filter(([, ids]) => ids.size);
  if (!entries.length) return [...rows];
  if (entries.reduce((count, [, ids]) => count + ids.size, 0) > MAX_ASSETS)
    throw new Error("시험지 고정 자산 개수가 제한을 넘었습니다.");
  const where = Prisma.join(
    entries.map(
      ([owner, ids]) =>
        Prisma.sql`(a."user_id" = ${owner}::uuid AND a."id" IN (${Prisma.join([...ids])}))`,
    ),
    " OR ",
  );
  const metadata = await db.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT a."user_id" AS "userId", a."id", a."mime_type" AS "mimeType",
           a."width_px" AS "widthPx", a."height_px" AS "heightPx", b."size"
      FROM "textbook_asset" a JOIN "textbook_blob" b ON b."sha256" = a."id" WHERE ${where}`);
  const expectedCount = entries.reduce((count, [, ids]) => count + ids.size, 0);
  if (metadata.length !== expectedCount)
    throw new Error("시험지의 고정 자산 일부가 없습니다.");
  if (metadata.reduce((bytes, asset) => bytes + asset.size, 0) > MAX_BYTES)
    throw new Error("시험지 고정 자산 용량이 제한을 넘었습니다.");
  const assets = await db.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT a."user_id" AS "userId", a."id", a."mime_type" AS "mimeType",
           a."width_px" AS "widthPx", a."height_px" AS "heightPx", b."size", b."bytes"
      FROM "textbook_asset" a JOIN "textbook_blob" b ON b."sha256" = a."id" WHERE ${where}`);
  const resolved = new Map<string, Map<string, PrintableSnapshotAsset>>();
  for (const asset of assets) {
    const bytes = asset.bytes;
    if (!bytes || bytes.byteLength !== asset.size || sha256(bytes) !== asset.id)
      throw new Error("시험지 자산의 바이트 해시가 다릅니다.");
    const mimeType = textbookAssetSchema.shape.mimeType.parse(asset.mimeType);
    if (!mimeType.startsWith("image/"))
      throw new Error("문항 그림의 자산 유형이 잘못되었습니다.");
    assertAssetMime(bytes, mimeType);
    const svg =
      asset.mimeType === "image/svg+xml"
        ? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        : undefined;
    if (svg) assertSafeSvg(svg);
    const group =
      resolved.get(asset.userId) ?? new Map<string, PrintableSnapshotAsset>();
    group.set(asset.id, {
      url: `data:${asset.mimeType};base64,${Buffer.from(bytes).toString("base64")}`,
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
      ...(svg ? { svg } : {}),
    });
    resolved.set(asset.userId, group);
  }
  return rows.map((row) =>
    row.snapshotId
      ? {
          ...row,
          snapshotAssets: resolved.get(row.snapshot!.userId) ?? new Map(),
        }
      : row,
  );
}
