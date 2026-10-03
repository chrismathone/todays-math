/**
 * 발행 사전 검사 — 조판 없이 알 수 있는 «막는 사유» 전부. **읽기만 한다.**
 *
 * 여기서 보는 것: 정식 주소 · 빈 원고 · 연결 안 된 배치 · 블록 차례와 배치 차례의 어긋남 · 굳힐 수 없는 개념,
 * 그리고 교환 형식 전체의 참조 · 해시 검증(검증기). 조판해야 아는 것(넘침 · 시작 면 · QR 해독)은 걸음이 낸다.
 */
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";

import { type TextbookActor, requireOwnedEdition } from "../access";
import { issue } from "../server/errors";
import { assembleExchange } from "../server/exchange";
import type { TextbookSql } from "../server/sql";
import { type PublishDeps, officialOriginIssue } from "./rendererAdapter";

export interface Preflight {
  revision: number;
  canPublish: boolean;
  issues: TextbookIssue[];
}

/** 구획의 문제 블록 차례와 배치의 차례가 같은가 — 어긋나면 고치지 않고 알린다 */
export function placementIssues(exchange: TextbookExchange): TextbookIssue[] {
  const issues: TextbookIssue[] = [];
  const itemsBySection = new Map<string, string[]>();
  for (const item of exchange.items) {
    const key = `${item.unitKey}/${item.sectionKey}`;
    itemsBySection.set(key, [...(itemsBySection.get(key) ?? []), item.itemId]);
  }
  for (const unit of exchange.units)
    for (const section of unit.sections) {
      const key = `${unit.unitKey}/${section.sectionKey}`;
      const inBlocks = section.blocks.flatMap((block) =>
        block.kind === "problem" ? [block.itemId] : [],
      );
      const placed = itemsBySection.get(key) ?? [];
      if (
        inBlocks.length !== placed.length ||
        inBlocks.some((itemId, index) => itemId !== placed[index])
      )
        issues.push(
          issue(
            "item-order-mismatch",
            `구획 «${section.title}»의 문제 블록과 배치의 차례가 다릅니다. 구획을 다시 저장해 주세요.`,
            { path: ["units", unit.unitKey, "sections", section.sectionKey] },
          ),
        );
    }
  return issues;
}

export async function collectPreflight(
  sql: TextbookSql,
  editionId: string,
  deps: Pick<PublishDeps, "validate" | "freezeConcept" | "officialOrigin">,
  exportedAt: string,
): Promise<{ issues: TextbookIssue[]; exchange: TextbookExchange }> {
  const issues: TextbookIssue[] = [];
  const originIssue = officialOriginIssue(deps.officialOrigin);
  if (originIssue)
    issues.push(issue("official-origin", originIssue, { path: ["qrTargets"] }));

  const exchange = await assembleExchange(sql, editionId, {
    exportedAt,
    qrStates: ["reserved", "active"],
  });
  const parsed = textbookExchangeSchema.safeParse(exchange);
  if (!parsed.success)
    return {
      exchange,
      issues: [
        ...issues,
        ...parsed.error.issues.map((entry) =>
          issue("schema", entry.message, {
            path: entry.path.map((part) =>
              typeof part === "number" ? part : String(part),
            ),
          }),
        ),
      ],
    };

  if (
    !exchange.units.some((unit) =>
      unit.sections.some((section) => section.blocks.length),
    )
  )
    issues.push(
      issue("empty-manuscript", "원고가 비어 있습니다.", { path: ["units"] }),
    );
  for (const item of exchange.items)
    if (item.linkStatus !== "linked")
      issues.push(
        issue(
          "item-not-linked",
          "은행 문항과 연결되지 않은 문항이 놓여 있습니다.",
          {
            itemId: item.itemId,
            path: ["items"],
          },
        ),
      );
  issues.push(...placementIssues(exchange));

  // 개념은 예약 때 굳는다 — 굳힐 수 없는 개념을 미리 알린다(여기서는 쓰지 않는다)
  for (const concept of exchange.conceptIntegration?.concepts ?? []) {
    try {
      deps.freezeConcept({ ...concept, frozen: null });
    } catch (error) {
      issues.push(
        issue(
          "concept-not-ready",
          `개념 «${concept.title}»: ${error instanceof Error ? error.message : String(error)}`,
          { path: ["conceptIntegration", "concepts", concept.conceptKey] },
        ),
      );
    }
  }

  if (!originIssue)
    issues.push(
      ...(await deps.validate(exchange, {
        stage: "preflight",
        officialOrigin: deps.officialOrigin!,
        requirePageMap: false,
      })),
    );
  return { issues, exchange };
}

export async function preflightEdition(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  deps: Pick<
    PublishDeps,
    "validate" | "freezeConcept" | "officialOrigin" | "now"
  >,
): Promise<Preflight> {
  const access = await requireOwnedEdition(sql, actor, editionId);
  if (access.status !== "draft")
    return {
      revision: access.revision,
      canPublish: false,
      issues: [
        issue("not-draft", "이미 발행한 판본입니다.", {
          path: ["edition", "status"],
        }),
      ],
    };
  const { issues } = await collectPreflight(
    sql,
    editionId,
    deps,
    deps.now().toISOString(),
  );
  return {
    revision: access.revision,
    canPublish: !issues.some((entry) => entry.severity === "error"),
    issues,
  };
}
