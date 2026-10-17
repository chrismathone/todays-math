import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { textbookAssetSchema } from "@/contracts/textbookExchange.contract";
import { assertAssetMime, assertSafeSvg } from "@/lib/textbook/assets";
import { sha256 } from "@/lib/textbook/hash.server";
import type { PrintableSnapshotAsset } from "@/lib/textbook/snapshotToPrintable";
import { snapshotOf, type TestContentLink } from "./testProblemContent";
import type { FrozenPayload } from "@/lib/examPublication/freeze";

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

const assetKey = (asset: Pick<AssetRow, "userId" | "id">) =>
  `${asset.userId}:${asset.id}`;

/** Validate the exact owner/hash set and budget before requesting any blob bytes. */
function checkedMetadata(
  assets: readonly AssetRow[],
  wanted: ReadonlyMap<string, ReadonlySet<string>>,
  expectedCount: number,
): Map<string, AssetRow> {
  if (assets.length !== expectedCount)
    throw new Error("시험지의 고정 자산 일부가 없습니다.");
  const checked = new Map<string, AssetRow>();
  let totalBytes = 0;
  for (const asset of assets) {
    const key = assetKey(asset);
    if (!wanted.get(asset.userId)?.has(asset.id) || checked.has(key))
      throw new Error("고정 자산의 소유자·해시 목록이 일치하지 않습니다.");
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0)
      throw new Error("고정 자산의 바이트 크기가 잘못되었습니다.");
    totalBytes += asset.size;
    if (totalBytes > MAX_BYTES)
      throw new Error("시험지 고정 자산 용량이 제한을 넘었습니다.");
    const mimeType = textbookAssetSchema.shape.mimeType.parse(asset.mimeType);
    if (!mimeType.startsWith("image/"))
      throw new Error("문항 그림의 자산 유형이 잘못되었습니다.");
    textbookAssetSchema.shape.widthPx.parse(asset.widthPx);
    textbookAssetSchema.shape.heightPx.parse(asset.heightPx);
    if ((asset.widthPx === null) !== (asset.heightPx === null))
      throw new Error("고정 자산의 실측 폭과 높이를 함께 지정하세요.");
    checked.set(key, asset);
  }
  return checked;
}

/** The caller has authorized these Test rows. Only immutable assets referenced by their snapshots are read. */
export async function hydrateTestSnapshots<T extends TestContentLink>(
  input: readonly T[],
): Promise<T[]> {
  const rows = await withPublicationProblems(input);
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
  const expectedCount = entries.reduce((count, [, ids]) => count + ids.size, 0);
  if (expectedCount > MAX_ASSETS)
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
  const expected = checkedMetadata(metadata, wanted, expectedCount);
  const assets = await db.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT a."user_id" AS "userId", a."id", a."mime_type" AS "mimeType",
           a."width_px" AS "widthPx", a."height_px" AS "heightPx", b."size", b."bytes"
      FROM "textbook_asset" a JOIN "textbook_blob" b ON b."sha256" = a."id" WHERE ${where}`);
  // The second query must return the same immutable set and metadata. Check again
  // before producing any URLs, so missing/foreign/changed rows cannot partially hydrate.
  const loaded = checkedMetadata(assets, wanted, expectedCount);
  const resolved = new Map<string, Map<string, PrintableSnapshotAsset>>();
  for (const [key, asset] of loaded) {
    const before = expected.get(key)!;
    if (
      asset.size !== before.size ||
      asset.mimeType !== before.mimeType ||
      asset.widthPx !== before.widthPx ||
      asset.heightPx !== before.heightPx
    )
      throw new Error(
        "조회 중 고정 자산의 정보가 변경되었습니다. 다시 시도하세요.",
      );
    const bytes = asset.bytes;
    if (!bytes || bytes.byteLength !== asset.size || sha256(bytes) !== asset.id)
      throw new Error("시험지 자산의 바이트 해시가 다릅니다.");
    const mimeType = textbookAssetSchema.shape.mimeType.parse(asset.mimeType);
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

/**
 * 월말평가 M1 — 반에 낸 시험(`test.publication_id`)의 문항에 발행본의 **낸 그대로**를 붙인다(`contentOf` 가 먼저 쓴다).
 * 반에 낸 시험이 아니면 한 번 묻고 그대로 돌려준다. 🔴 발행본에 그 문항이 없으면 은행 글로 넘어가지 않고 실패한다.
 */
async function withPublicationProblems<T extends TestContentLink>(
  rows: readonly T[],
): Promise<T[]> {
  const testIds = [
    ...new Set(
      rows.flatMap((row) => {
        const testId = (row as { testId?: unknown }).testId;
        return typeof testId === "string" ? [testId] : [];
      }),
    ),
  ];
  if (!testIds.length) return [...rows];
  const tests = await db.test.findMany({
    where: { id: { in: testIds } },
    select: { id: true, publicationId: true },
  });
  const published = tests.filter((t) => t.publicationId !== null);
  if (!published.length) return [...rows];
  const publications = await db.examPublication.findMany({
    where: { id: { in: [...new Set(published.map((t) => t.publicationId!))] } },
    select: { id: true, payload: true },
  });
  const byPublication = new Map(
    publications.map((p) => [
      p.id,
      new Map(
        (p.payload as unknown as FrozenPayload).problems.map((problem) => [
          problem.problemId,
          problem,
        ]),
      ),
    ]),
  );
  const publicationOf = new Map(published.map((t) => [t.id, t.publicationId!]));
  return rows.map((row) => {
    const testId = (row as { testId?: unknown }).testId;
    const publicationId =
      typeof testId === "string" ? publicationOf.get(testId) : undefined;
    if (!publicationId) return row;
    const frozen = byPublication.get(publicationId)?.get(row.problemId);
    if (!frozen)
      throw new Error("반에 낸 시험지의 고정 문항을 불러오지 못했습니다.");
    return { ...row, publicationProblem: frozen };
  });
}
