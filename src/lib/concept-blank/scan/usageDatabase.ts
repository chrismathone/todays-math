import "server-only";
import { randomUUID } from "node:crypto";
import { scanDatabaseError, type ScanDatabase } from "./database";
import {
  assertScanCost,
  assertScanMonth,
  assertScanReservation,
  type ScanUsageStore,
} from "./usage";

type MonthRow = {
  spent_nano_usd: bigint | string;
  reserved_nano_usd: bigint | string;
  active_call_id: string | null;
  unresolved: boolean;
};
type CallRow = {
  id: string;
  status: string;
  reserved_nano_usd: bigint | string;
};
const amount = (value: bigint | string) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError("저장된 사용량을 확인해야 합니다.");
  return n;
};

/** No timers or lease expiry: the upstream may still charge after a worker goes away.
 * The transaction stores the raw result alongside settlement before a route parses it. */
export function createDatabaseScanUsageStore(
  db: ScanDatabase,
  options: { submissionId?: string; now?: () => Date } = {},
): ScanUsageStore {
  const now = () => (options.now?.() ?? new Date()).toISOString();
  return {
    async begin(month, cap, reservation) {
      assertScanMonth(month);
      assertScanReservation(cap, reservation);
      return db
        .transaction(async (tx) => {
          await tx.query(
            `INSERT INTO concept_blank_scan_usage_month (month) VALUES ($1) ON CONFLICT DO NOTHING`,
            [month],
          );
          const [row] = await tx.query<MonthRow>(
            `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1 FOR UPDATE`,
            [month],
          );
          if (row.unresolved)
            throw new Error("이전 호출의 사용량을 확인해야 합니다.");
          if (row.active_call_id)
            throw new Error(
              "진행 중인 사진 채점 호출이 끝나면 다시 시도해 주세요.",
            );
          const prior = await tx.query<{ id: string }>(
            `SELECT id FROM concept_blank_scan_usage_call WHERE request_key=$1`,
            [reservation.requestKey],
          );
          if (prior.length)
            throw new Error("이미 실행한 사진 채점 작업입니다.");
          if (
            amount(row.spent_nano_usd) + amount(row.reserved_nano_usd) >
            cap - reservation.reservedNanoUsd
          )
            throw new Error(
              "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
            );
          const token = randomUUID();
          await tx.query(
            `INSERT INTO concept_blank_scan_usage_call
          (id,month,submission_id,request_key,operation,model,tariff_version,prompt_version,reserved_nano_usd,status,started_at)
          VALUES ($1,$2,$3,$4,$5,$6,'2026-11-03',$7,$8,'running',$9)`,
            [
              token,
              month,
              options.submissionId ?? null,
              reservation.requestKey,
              reservation.operation,
              reservation.model,
              reservation.promptVersion,
              reservation.reservedNanoUsd,
              now(),
            ],
          );
          await tx.query(
            `UPDATE concept_blank_scan_usage_month SET active_call_id=$2,reserved_nano_usd=$3,updated_at=$4 WHERE month=$1`,
            [month, token, reservation.reservedNanoUsd, now()],
          );
          return { month, token };
        })
        .catch(scanDatabaseError);
    },
    async settle(lease, cost, evidence) {
      assertScanMonth(lease.month);
      assertScanCost(cost);
      const exceeded = await db
        .transaction(async (tx) => {
          const [row] = await tx.query<MonthRow>(
            `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1 FOR UPDATE`,
            [lease.month],
          );
          const [call] = await tx.query<CallRow>(
            `SELECT * FROM concept_blank_scan_usage_call
          WHERE id=$1 AND month=$2 AND submission_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
            [lease.token, lease.month, options.submissionId ?? null],
          );
          if (
            !row ||
            row.active_call_id !== lease.token ||
            !call ||
            call.status !== "running"
          )
            throw new Error("이미 정산했거나 다른 호출의 사용량입니다.");
          const over = cost !== null && cost > amount(call.reserved_nano_usd);
          const unresolved = cost === null || over;
          await tx.query(
            `UPDATE concept_blank_scan_usage_call SET status=$2,cost_nano_usd=$3,
          receipt=$4::jsonb,result_text=$5,settled_at=$6 WHERE id=$1`,
            [
              lease.token,
              unresolved ? "unresolved" : "settled",
              cost,
              evidence?.usage ? JSON.stringify(evidence.usage) : null,
              unresolved ? null : (evidence?.output ?? null),
              now(),
            ],
          );
          await tx.query(
            `UPDATE concept_blank_scan_usage_month SET active_call_id=NULL,
          spent_nano_usd=spent_nano_usd+$2,reserved_nano_usd=$3,unresolved=$4,updated_at=$5 WHERE month=$1`,
            [
              lease.month,
              unresolved ? 0 : cost,
              unresolved ? amount(call.reserved_nano_usd) : 0,
              unresolved,
              now(),
            ],
          );
          return over;
        })
        .catch(scanDatabaseError);
      // Throw AFTER committing the fail-closed evidence, never roll that evidence back.
      if (exceeded)
        throw new Error(
          "실제 사용량이 예약 상계를 넘어 운영 확인이 필요합니다.",
        );
    },
    async inspect(month) {
      assertScanMonth(month);
      const [row] = await db
        .query<MonthRow>(
          `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1`,
          [month],
        )
        .catch(scanDatabaseError);
      return row
        ? {
            spentNanoUsd: amount(row.spent_nano_usd),
            reservedNanoUsd: amount(row.reserved_nano_usd),
            busy: row.active_call_id !== null,
            unresolved: row.unresolved,
          }
        : {
            spentNanoUsd: 0,
            reservedNanoUsd: 0,
            busy: false,
            unresolved: false,
          };
    },
    async findResult(key) {
      const [row] = await db
        .query<{ result_text: string | null }>(
          `SELECT result_text FROM concept_blank_scan_usage_call
        WHERE request_key=$1 AND submission_id IS NOT DISTINCT FROM $2::uuid AND status='settled'`,
          [key, options.submissionId ?? null],
        )
        .catch(scanDatabaseError);
      return row?.result_text ?? null;
    },
  };
}
