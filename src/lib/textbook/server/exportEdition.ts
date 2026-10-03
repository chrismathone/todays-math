/**
 * 내보내기 — 판본을 교사용 교환 형식으로. 주인은 어느 상태든, 동료는 지점에 공유된 발행본만.
 *
 * 🔴 발행본을 내보낼 때는 **지금의 줄들로 다시 계산한 manifest 해시**가 발행 때 적은 값과 같아야 한다.
 *    다르면 내보내지 않는다 — «발행본»이라 적힌 패키지가 발행한 내용과 다를 수 없다.
 * 학생의 글 · 배정 · 요청 기록은 교환 형식에 없다.
 */
import {
  type TextbookExchange,
  textbookExchangeSchema,
} from "@/contracts/textbookExchange.contract";

import { type TextbookActor, requireReadableEdition } from "../access";
import { manifestHash } from "../hash.server";
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
