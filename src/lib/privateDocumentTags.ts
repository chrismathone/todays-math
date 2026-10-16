import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { readSheetTag, type SheetTag } from "@/contracts/sheetTag.contract";
import { workflowDocumentKey } from "@/lib/privateDocumentWorkflow";

type AuthorizedDocument = {
  userId: string;
  id: string;
  kind: string;
  revision: number;
};

/**
 * 내 시험지 목록의 시험지 태그(W8) — 목록이 이미 허락한 (주인 · id · 버전)만, payload 의 짧은 글 하나만 읽는다.
 * 시험지는 `payload.tag`, 연산 연습지는 `payload.presentation.tag`. 다른 종류 · 모르는 값은 «태그 없음».
 * 진행 단계(`listDocumentWorkflows`)와 같은 방식이다 — payload · 그림을 통째로 읽지 않는다.
 */
export async function listDocumentTags(items: AuthorizedDocument[]) {
  const eligible = items.filter((item) =>
    ["draft", "arithmeticSheet"].includes(item.kind),
  );
  const result = new Map<string, SheetTag>();
  if (!eligible.length) return result;
  if (eligible.length > 100)
    throw new Error("Tag projection requires a bounded list page.");
  const rows = await db.$queryRaw<(AuthorizedDocument & { tag: unknown })[]>(
    Prisma.sql`
    SELECT user_id AS "userId", id, kind, revision,
      CASE WHEN kind = 'arithmeticSheet'
        THEN left(payload #>> '{presentation,tag}', 16)
        ELSE left(payload #>> '{tag}', 16) END AS tag
    FROM workspace_document
    WHERE ${Prisma.join(
      eligible.map(
        (item) =>
          Prisma.sql`(user_id = ${item.userId}::uuid AND id = ${item.id} AND revision = ${item.revision})`,
      ),
      " OR ",
    )}
  `,
  );
  const allowed = new Map(
    eligible.map((item) => [workflowDocumentKey(item), item]),
  );
  for (const row of rows) {
    const key = workflowDocumentKey(row);
    const original = allowed.get(key);
    if (
      !original ||
      row.revision !== original.revision ||
      row.kind !== original.kind
    )
      continue;
    const tag = readSheetTag(row.tag);
    if (tag) result.set(key, tag);
  }
  return result;
}
