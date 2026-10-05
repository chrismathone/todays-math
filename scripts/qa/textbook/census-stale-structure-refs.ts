/**
 * **원고의 구조 메타가 가리키는 배치 id 가 그 판본에 없는 판본** — 읽기 전용 전수.
 *
 *   npx tsx scripts/qa/textbook/census-stale-structure-refs.ts          # 걸린 판본 요약
 *   npx tsx scripts/qa/textbook/census-stale-structure-refs.ts --list   # 걸린 구획까지
 *
 * ## 왜 있나
 *
 * 판본 복제와 패키지 가져오기가 문항 배치 id 를 새로 짓는데, 구조 메타(`semantic`)의
 * `exampleGroup.exampleItemId` · `confirmItemIds[]` 와 `references.entries[].targetItemId` 는
 * 같이 바뀌지 않았다(`remapSemanticRefs` 로 고침). 이미 만들어진 판본에 그 자국이 얼마나 있는지 센다.
 *
 * ## 읽기 전용
 *
 * SELECT 한 문장만 보낸다 — 쓰기 문장은 보내기 전에 거부한다. 고치지도 않는다(수리는 이 파일의 일이 아니다).
 * 판본의 배치는 `textbook_item.edition_id` 로, 원고는 `textbook_section.content.blocks` 로 읽는다.
 */
import { PrismaClient } from "@prisma/client";

const LIST = process.argv.includes("--list");

type Json = unknown;
const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 읽기 전용 관문 — SELECT 로 시작하지 않는 문장은 보내지 않는다 */
function readOnly(sql: string): string {
  if (!/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql))
    throw new Error("이 스크립트는 SELECT 한 문장만 보낸다");
  return sql;
}

export interface StaleCounts {
  exampleItemId: number;
  confirmItemIds: number;
  targetItemId: number;
}

/** 한 구획 원고에서 판본에 없는 배치 id 를 가리키는 구조 메타 칸을 센다 */
export function staleRefsInContent(
  content: Json,
  itemIds: ReadonlySet<string>,
): StaleCounts {
  const counts: StaleCounts = {
    exampleItemId: 0,
    confirmItemIds: 0,
    targetItemId: 0,
  };
  const blocks =
    isObject(content) && Array.isArray(content.blocks) ? content.blocks : [];
  for (const block of blocks) {
    if (!isObject(block) || !isObject(block.semantic)) continue;
    const node = block.semantic.node;
    if (!isObject(node)) continue;
    if (node.kind === "exampleGroup") {
      if (
        typeof node.exampleItemId === "string" &&
        !itemIds.has(node.exampleItemId)
      )
        counts.exampleItemId++;
      if (Array.isArray(node.confirmItemIds))
        for (const id of node.confirmItemIds)
          if (typeof id === "string" && !itemIds.has(id))
            counts.confirmItemIds++;
    } else if (node.kind === "references" && Array.isArray(node.entries)) {
      for (const entry of node.entries)
        if (
          isObject(entry) &&
          typeof entry.targetItemId === "string" &&
          !itemIds.has(entry.targetItemId)
        )
          counts.targetItemId++;
    }
  }
  return counts;
}

/** 판정기가 «예»도 «아니오»도 낼 수 있는가 — 0 이 «깨끗»인지 «못 셈»인지 가른다 */
function assertCounterAlive(): void {
  const content = {
    blocks: [
      {
        semantic: {
          node: {
            kind: "exampleGroup",
            exampleItemId: "old",
            confirmItemIds: ["old", "live"],
          },
        },
      },
      {
        semantic: {
          node: { kind: "references", entries: [{ targetItemId: "old" }] },
        },
      },
    ],
  };
  const stale = staleRefsInContent(content, new Set(["live"]));
  const clean = staleRefsInContent(content, new Set(["old", "live"]));
  if (
    stale.exampleItemId !== 1 ||
    stale.confirmItemIds !== 1 ||
    stale.targetItemId !== 1 ||
    clean.exampleItemId + clean.confirmItemIds + clean.targetItemId !== 0
  )
    throw new Error("세는 함수 대조 실패 — 이 전수의 0 은 믿을 수 없다");
}

async function main(): Promise<void> {
  assertCounterAlive();
  const prisma = new PrismaClient();
  try {
    const sections = await prisma.$queryRawUnsafe<
      Array<{
        editionId: string;
        sectionId: string;
        sectionKey: string;
        content: Json;
        status: string;
        bookTitle: string;
      }>
    >(
      readOnly(
        `SELECT e."id" AS "editionId", s."id" AS "sectionId", s."section_key" AS "sectionKey", s."content",
                e."status", b."title" AS "bookTitle"
           FROM "textbook_section" s
           JOIN "textbook_edition" e ON e."id" = s."edition_id"
           JOIN "textbook" b ON b."id" = e."textbook_id"
          ORDER BY e."id", s."order_index"`,
      ),
    );
    const items = await prisma.$queryRawUnsafe<
      Array<{ editionId: string; id: string }>
    >(
      readOnly(`SELECT "edition_id" AS "editionId", "id" FROM "textbook_item"`),
    );
    const itemsOf = new Map<string, Set<string>>();
    for (const item of items) {
      const set = itemsOf.get(item.editionId) ?? new Set<string>();
      set.add(item.id);
      itemsOf.set(item.editionId, set);
    }

    interface Row extends StaleCounts {
      editionId: string;
      bookTitle: string;
      status: string;
      sections: string[];
    }
    const hits = new Map<string, Row>();
    const editions = new Set<string>();
    for (const section of sections) {
      editions.add(section.editionId);
      const counts = staleRefsInContent(
        section.content,
        itemsOf.get(section.editionId) ?? new Set(),
      );
      if (
        counts.exampleItemId + counts.confirmItemIds + counts.targetItemId ===
        0
      )
        continue;
      const row = hits.get(section.editionId) ?? {
        editionId: section.editionId,
        bookTitle: section.bookTitle,
        status: section.status,
        exampleItemId: 0,
        confirmItemIds: 0,
        targetItemId: 0,
        sections: [],
      };
      row.exampleItemId += counts.exampleItemId;
      row.confirmItemIds += counts.confirmItemIds;
      row.targetItemId += counts.targetItemId;
      row.sections.push(section.sectionKey);
      hits.set(section.editionId, row);
    }
    console.log(
      `원고가 있는 판본 ${editions.size}개 · 그 가운데 판본에 없는 배치 id 를 가리키는 구조 메타가 있는 판본 ${hits.size}개`,
    );
    for (const row of hits.values()) {
      console.log(
        `   ${row.editionId}  «${row.bookTitle}»  ${row.status}  exampleItemId ${row.exampleItemId} · confirmItemIds ${row.confirmItemIds} · targetItemId ${row.targetItemId}`,
      );
      if (LIST) console.log(`      구획: ${row.sections.join(", ")}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    `\n🔴 ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
