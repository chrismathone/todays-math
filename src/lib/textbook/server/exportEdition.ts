/**
 * 내보내기 — 판본을 교사용 교환 형식으로. 주인은 어느 상태든, 동료는 지점에 공유된 발행본만.
 *
 * 🔴 발행본을 내보낼 때는 **지금의 줄들로 다시 계산한 manifest 해시**가 발행 때 적은 값과 같아야 한다.
 *    다르면 내보내지 않는다 — «발행본»이라 적힌 패키지가 발행한 내용과 다를 수 없다.
 * 학생의 글 · 배정 · 요청 기록은 교환 형식에 없다.
 *
 * 패키지(ZIP)는 같은 교환 형식에 판본의 자산 바이트 · 대응표 · 검수 보고를 묶은 것이다. 꾸리는 함수가 자산 바이트의
 * 해시를 다시 본다. 자산은 **판본의 색인에 있는 것만** 읽는다. 초안의 패키지에는 발행 검수 보고가 없다 — 없다고 적는다.
 */
import {
  type TextbookExchange,
  textbookExchangeSchema,
} from "@/contracts/textbookExchange.contract";

import { type TextbookActor, requireReadableEdition } from "../access";
import { manifestHash, sha256 } from "../hash.server";
import type { PackageArchive } from "../publish/rendererAdapter";
import { editionAssetReader } from "../publish/step";
import { parseStrictJson } from "../strictJson";
import { readBlobRange } from "./blobs";
import { TextbookError } from "./errors";
import { assembleExchange } from "./exchange";
import type { TextbookSql } from "./sql";

export async function exportEdition(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  exportedAt: string,
): Promise<TextbookExchange> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const exchange = textbookExchangeSchema.parse(
    await assembleExchange(sql, editionId, { exportedAt }),
  );
  if (
    access.status !== "draft" &&
    manifestHash(exchange) !== access.manifestHash
  )
    throw new TextbookError(
      409,
      "CONFLICT",
      "발행본의 내용이 발행 때의 해시와 다릅니다. 내보내지 않습니다.",
    );
  return exchange;
}

/** 발행 때 적어 둔 검수 보고 — 그 판본의 산출물 줄에서만 읽는다. 초안에는 없다 */
async function storedValidation(
  sql: TextbookSql,
  editionId: string,
): Promise<unknown | null> {
  const [row] = await sql.query<{ sha256: string; size: number }>(
    `SELECT "sha256", "byte_size" AS "size" FROM "textbook_artifact"
      WHERE "edition_id" = $1::uuid AND "kind" = 'validation-json'`,
    [editionId],
  );
  if (!row) return null;
  const bytes = await readBlobRange(sql, row.sha256, 0, row.size);
  if (!bytes || sha256(bytes) !== row.sha256)
    throw new TextbookError(
      409,
      "CONFLICT",
      "보관한 검수 보고가 발행 때의 바이트와 다릅니다. 내보내지 않습니다.",
    );
  return parseStrictJson(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
}

/** 판본의 교환 패키지(ZIP) — 읽기 권한 · manifest 확인은 `exportEdition` 과 같다 */
export async function exportEditionArchive(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  exportedAt: string,
  pack: PackageArchive,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const exchange = await exportEdition(sql, actor, editionId, exportedAt);
  const validation = (await storedValidation(sql, editionId)) ?? {
    validated: false,
    reason: "초안입니다. 발행 검수를 거치지 않았습니다.",
  };
  const bytes = await pack(
    exchange,
    editionAssetReader(sql, editionId),
    validation,
  );
  return { bytes, fileName: `textbook-${editionId}.zip` };
}
