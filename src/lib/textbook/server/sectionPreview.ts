/**
 * 구획 미리보기 — 편집 화면이 고른 구획 하나를 **발행과 같은 조판기**로 그릴 수 있게, 그 구획만 실은 교환 형식을 낸다.
 *
 * 읽기만 한다. 한 줄도 쓰지 않는다:
 *   · QR 을 만들지 않는다 — 예약했거나 켜진 QR 이 있으면 그것만 싣고, 없으면 없는 채로 낸다(가짜 주소를 지어내지 않는다)
 *   · 개념을 굳혀 적지 않는다 — 초안의 개념은 **메모리에서만** 굳혀 본다(발행 예약과 같은 굳히기 · 고르지 않은 백지 형식을
 *     기본값으로 채우지 않는다). 아직 굳힐 수 없는 개념(확인 안 된 연결이 남았다)은 굳지 않은 채로 낸다 — 미리보기를 막지 않는다
 *   · 발행본의 개념은 **발행 때 굳힌 그대로**다. 살아 있는 은행을 다시 읽지 않는다
 * 문항의 내용은 늘 확정본이다(`assembleExchange` 는 살아 있는 문항을 읽지 않는다).
 *
 * 권한은 판본 읽기와 같다 — 주인은 어느 상태든, 동료는 지점에 공유된 발행본만. 구획은 그 판본의 것이어야 한다.
 * 🔴 낸 교환 형식은 **부분집합**이다. 판본 전체의 manifest 해시와 견줄 수 없다(`manifestVerified: false`).
 */
import type { TextbookSectionPreview } from "@/contracts/textbookServer.contract";

import { type TextbookActor, requireReadableEdition } from "../access";
import type { ConceptFreezer } from "../publish/rendererAdapter";
import { notFound } from "./errors";
import { assembleExchange } from "./exchange";
import type { TextbookSql } from "./sql";

export async function sectionPreview(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
  freezeConcept: ConceptFreezer,
  exportedAt: string,
): Promise<TextbookSectionPreview> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const [section] = await sql.query<{ revision: number }>(
    `SELECT "revision" FROM "textbook_section" WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`,
    [sectionId, editionId],
  );
  if (!section) throw notFound("구획");
  const exchange = await assembleExchange(sql, editionId, {
    exportedAt,
    qrStates: ["reserved", "active"],
    onlySectionId: sectionId,
  });
  // 목차에 없는 단원의 구획은 교환 형식에 실리지 않는다 — 그릴 것이 없다
  if (exchange.units.length === 0) throw notFound("구획");

  const integration = exchange.conceptIntegration;
  return {
    kind: "section-preview",
    editionId,
    sectionId,
    aggregateRevision: access.revision,
    sectionRevision: section.revision,
    manifestVerified: false,
    exchange:
      access.status === "draft" && integration
        ? {
            ...exchange,
            conceptIntegration: {
              ...integration,
              concepts: integration.concepts.map((concept) => {
                try {
                  return freezeConcept({ ...concept, frozen: null });
                } catch {
                  // 아직 굳힐 수 없다 — 발행 사전 검사가 사유를 말한다. 미리보기는 본문만으로 그린다
                  return { ...concept, frozen: null };
                }
              }),
            },
          }
        : exchange,
  };
}
