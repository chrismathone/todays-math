/**
 * 같은 문제로 다시 출제 — 발행본의 배치들로 **새 시험지**를 만든다. 원래 시험지는 건드리지 않는다.
 *
 * 🔴 시험지 문항마다 `snapshot_id` 를 **늘** 채운다. 그래야 뒤에 은행 문항이 고쳐져도 이 시험지의 지면 · 정답 · 채점은
 *    교재에 실린 그 내용으로 남는다(읽는 쪽은 `contentOf` — 확정본이 있으면 살아 있는 문항을 섞지 않는다).
 * 🔴 지금의 은행 문항이 출제 자격을 잃었거나 지워졌으면 **만들지 않고 사유를 낸다.** 조용히 빼지 않는다 —
 *    원장이 고른 것과 다른 시험지가 나가면 그 사실을 인쇄물에서야 알게 된다(담기 바구니와 같은 규칙).
 * 🔴 같은 문항을 두 번 고르면 거절한다 — 시험지의 답안은 문항 id 로 맺어져 있어 한 시험지에 같은 문항 둘을 가를 수 없다.
 *    하나로 줄여 주지 않는다.
 * 범위의 시작은 고른 문항의 단원에서 서버가 세운다(바구니 출제와 같다). 끝 · 종류는 요청이 정한다.
 */
import { randomUUID } from "node:crypto";

import { problemIneligibleReason } from "@/lib/problemEligibility";

import { type TextbookActor, requireReadableEdition } from "../access";
import { TextbookError, conflict, invalid, notFound } from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, uuidList } from "./sql";

export interface ReissueInput {
  itemIds: string[];
  classId: string;
  testType: "daily" | "review";
  rangeEndUnitId: string;
}

export interface ReissueResult {
  testId: string;
  problemCount: number;
}

interface ItemRow {
  itemId: string;
  snapshotId: string;
  sourceSystem: string;
  sourceProblemId: string | null;
  problemId: string | null;
  problemCode: string | null;
  pool: string | null;
  reviewStatus: string | null;
  directUseAllowed: boolean | null;
  answer: string | null;
  unitId: string | null;
  unitOrder: number | null;
  displayNumber: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadItems(
  sql: TextbookSql,
  editionId: string,
  itemIds: readonly string[],
): Promise<Map<string, ItemRow>> {
  const rows = await sql.query<ItemRow>(
    `SELECT i."id" AS "itemId", i."snapshot_id" AS "snapshotId", s."source_system" AS "sourceSystem",
            s."source_ref" ->> 'problemId' AS "sourceProblemId", p."id" AS "problemId",
            s."source_ref" ->> 'problemCode' AS "problemCode", p."pool"::text AS "pool",
            p."review_status"::text AS "reviewStatus", p."direct_use_allowed" AS "directUseAllowed", p."answer",
            p."unit_id" AS "unitId", u."order_index" AS "unitOrder", i."display_number" AS "displayNumber"
       FROM "textbook_item" i
       JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
       LEFT JOIN "problem" p ON p."id" = s."problem_id"
       LEFT JOIN "unit" u ON u."id" = p."unit_id"
      WHERE i."edition_id" = $2::uuid AND i."section_id" IS NOT NULL AND i."id" IN ${uuidList("$1")}`,
    [JSON.stringify(itemIds), editionId],
  );
  return new Map(rows.map((row) => [row.itemId, row]));
}

export async function reissueTest(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  key: RequestKey,
  input: ReissueInput,
  today: () => Date = () => new Date(),
): Promise<ReissueResult & { replayed: boolean }> {
  if (input.itemIds.some((id) => !UUID.test(id)))
    throw invalid("이 판본에 없는 문항이 들어 있습니다.");
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<ReissueResult>(
      tx,
      key,
      async () => {
        const access = await requireReadableEdition(tx, actor, editionId);
        if (access.status !== "published")
          throw conflict("발행한 판본의 문항으로만 다시 출제합니다.");
        const [owned] = await tx.query<{ ownerId: string }>(
          `SELECT "user_id" AS "ownerId" FROM "class" WHERE "id" = $1::uuid`,
          [input.classId],
        );
        // 개인 작업물이다 — 자기 반에만 만든다(바구니 출제와 같다)
        if (!owned || owned.ownerId !== actor.id) throw notFound("반");
        const [endUnit] = await tx.query<{ orderIndex: number }>(
          `SELECT "order_index" AS "orderIndex" FROM "unit" WHERE "id" = $1::uuid`,
          [input.rangeEndUnitId],
        );
        if (!endUnit) throw invalid("없는 단원입니다.");

        const items = await loadItems(tx, editionId, input.itemIds);
        const blocked: string[] = [];
        const seenProblems = new Set<string>();
        const chosen: Array<ItemRow & { problemId: string; unitId: string }> =
          [];
        for (const itemId of input.itemIds) {
          const item = items.get(itemId);
          if (!item) throw invalid("이 판본에 없는 문항이 들어 있습니다.");
          const label = item.problemCode ?? item.displayNumber ?? itemId;
          if (item.sourceSystem !== "todays-math" || !item.sourceProblemId) {
            blocked.push(`${label}(은행 문항과 연결되지 않았습니다.)`);
            continue;
          }
          if (!item.problemId || !item.unitId) {
            blocked.push(`${label}(원본 문항이 지워졌습니다.)`);
            continue;
          }
          const reason = problemIneligibleReason({
            pool: item.pool!,
            reviewStatus: item.reviewStatus!,
            directUseAllowed: item.directUseAllowed!,
            answer: item.answer!,
          });
          if (reason) {
            blocked.push(`${label}(${reason})`);
            continue;
          }
          if (seenProblems.has(item.problemId)) {
            blocked.push(`${label}(같은 문항을 두 번 골랐습니다.)`);
            continue;
          }
          seenProblems.add(item.problemId);
          chosen.push({
            ...item,
            problemId: item.problemId,
            unitId: item.unitId,
          });
        }
        if (blocked.length)
          throw new TextbookError(
            422,
            "VALIDATION_ERROR",
            `낼 수 없는 문항 ${blocked.length}건이 들어 있습니다. 빼고 다시 만드십시오 — ${blocked
              .slice(0, 3)
              .join(" · ")}${blocked.length > 3 ? " 외" : ""}`,
            { blocked },
          );

        const first = chosen.reduce((low, item) =>
          (item.unitOrder ?? 0) < (low.unitOrder ?? 0) ? item : low,
        );
        const testId = randomUUID();
        await tx.execute(
          `INSERT INTO "test" ("id", "user_id", "class_id", "test_type", "range_start_unit_id", "range_end_unit_id",
                               "status", "modified", "test_date")
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::"test_type", $5::uuid, $6::uuid, 'draft', FALSE, $7::date)`,
          [
            testId,
            actor.id,
            input.classId,
            input.testType,
            first.unitId,
            input.rangeEndUnitId,
            today().toISOString().slice(0, 10),
          ],
        );
        // 번호는 고른 차례대로 1..N. 확정본 칸을 채워 넣는다 — DB 트리거가 «그 문항의 확정본인가»를 다시 본다
        await tx.execute(
          `INSERT INTO "test_problem" ("id", "test_id", "problem_id", "order_index", "replaced", "snapshot_id")
           SELECT r."id", $1::uuid, r."problemId", r."orderIndex", FALSE, r."snapshotId"
             FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "problemId" uuid, "orderIndex" int, "snapshotId" uuid)`,
          [
            testId,
            JSON.stringify(
              chosen.map((item, index) => ({
                id: randomUUID(),
                problemId: item.problemId,
                orderIndex: index + 1,
                snapshotId: item.snapshotId,
              })),
            ),
          ],
        );
        return { testId, problemCount: chosen.length };
      },
    );
    return { ...result, replayed };
  });
}
