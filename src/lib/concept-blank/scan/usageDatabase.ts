import "server-only";
import { randomUUID } from "node:crypto";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import {
  assertScanCost,
  assertScanMonth,
  assertScanReservation,
  assertScanConcurrency,
  ScanQueuedError,
  type ScanUsageStore,
} from "./usage";

type MonthRow = {
  spent_nano_usd: bigint | string;
  reserved_nano_usd: bigint | string;
};
type CallRow = {
  id: string;
  month: string;
  status: string;
  reserved_nano_usd: bigint | string;
  result_key: string;
  submission_id: string | null;
};
const amount = (value: bigint | string) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError("저장된 사용량을 확인해야 합니다.");
  return n;
};
/** One short admission lock spans UTC months; it is NEVER held over an AI request.
 * It serializes queue admission/settlement arithmetic, not paid calls. */
export const lockScanUsage = (tx: ScanSql) =>
  tx.query(
    `SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended('concept-blank-scan-usage',0))`,
  );
export function createDatabaseScanUsageStore(
  db: ScanDatabase,
  options: { submissionId?: string; jobId?: string; now?: () => Date } = {},
): ScanUsageStore {
  const now = () => (options.now?.() ?? new Date()).toISOString();
  return {
    async begin(month, cap, reservation, maxConcurrent = 4) {
      assertScanMonth(month);
      assertScanReservation(cap, reservation);
      assertScanConcurrency(maxConcurrent);
      const lease = await db
        .transaction(async (tx) => {
          await lockScanUsage(tx);
          let [call] = await tx.query<CallRow>(
            `SELECT * FROM concept_blank_scan_usage_call WHERE request_key=$1::text FOR UPDATE`,
            [reservation.requestKey],
          );
          if (
            call &&
            (call.status !== "queued" ||
              call.submission_id !== (options.submissionId ?? null) ||
              amount(call.reserved_nano_usd) !== reservation.reservedNanoUsd ||
              call.result_key !==
                (reservation.resultKey ?? reservation.requestKey))
          )
            throw new Error("이미 실행한 사진 채점 작업입니다.");
          if (!call) {
            if (
              options.jobId &&
              (
                await tx.query(
                  `SELECT id FROM concept_blank_scan_usage_call WHERE job_id=$1::uuid AND status='queued' AND request_key<>$2::text`,
                  [options.jobId, reservation.requestKey],
                )
              ).length
            )
              throw new Error(
                "대기 중 요청 설정이 바뀌었습니다. 다시 시도해 주세요.",
              );
            await tx.query(
              `INSERT INTO concept_blank_scan_usage_month(month) VALUES($1::text) ON CONFLICT DO NOTHING`,
              [month],
            );
            const [row] = await tx.query<MonthRow>(
              `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1::text FOR UPDATE`,
              [month],
            );
            if (
              amount(row.spent_nano_usd) + amount(row.reserved_nano_usd) >
              cap - reservation.reservedNanoUsd
            )
              throw new Error(
                "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
              );
            [call] = await tx.query<CallRow>(
              `INSERT INTO concept_blank_scan_usage_call
            (id,month,submission_id,request_key,result_key,operation,model,tariff_version,prompt_version,reserved_nano_usd,status,started_at,bound,job_id)
            VALUES($1::uuid,$2::text,$3::uuid,$4::text,$5::text,$6::text,$7::text,'2026-11-03',$8::text,$9::bigint,'queued',$10::timestamptz,$11::jsonb,$12::uuid) RETURNING *`,
              [
                randomUUID(),
                month,
                options.submissionId ?? null,
                reservation.requestKey,
                reservation.resultKey ?? reservation.requestKey,
                reservation.operation,
                reservation.model,
                reservation.promptVersion,
                reservation.reservedNanoUsd,
                now(),
                JSON.stringify(reservation.bound ?? null),
                options.jobId ?? null,
              ],
            );
            await tx.query(
              `UPDATE concept_blank_scan_usage_month SET reserved_nano_usd=reserved_nano_usd+$2::bigint,updated_at=$3::timestamptz WHERE month=$1::text`,
              [month, reservation.reservedNanoUsd, now()],
            );
          }
          const [current] = await tx.query<MonthRow>(
            `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1::text`,
            [call.month],
          );
          if (
            amount(current.spent_nano_usd) + amount(current.reserved_nano_usd) >
            cap
          )
            throw new Error(
              "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
            );
          const [counts] = await tx.query<{ running: number }>(
            `SELECT count(*)::int AS running FROM concept_blank_scan_usage_call WHERE status='running'`,
          );
          const [first] = await tx.query<{ id: string }>(
            `SELECT id FROM concept_blank_scan_usage_call WHERE status='queued' ORDER BY queue_order LIMIT 1`,
          );
          if (counts.running >= maxConcurrent || first?.id !== call.id)
            return null;
          await tx.query(
            `UPDATE concept_blank_scan_usage_call SET status='running',dispatched_at=$2::timestamptz WHERE id=$1::uuid`,
            [call.id, now()],
          );
          return { month: call.month, token: call.id };
        })
        .catch(scanDatabaseError);
      // Throw only after the FIFO row and its reservation have COMMITTED.
      if (!lease) throw new ScanQueuedError();
      return lease;
    },
    async settle(lease, cost, evidence) {
      assertScanMonth(lease.month);
      assertScanCost(cost);
      const exceeded = await db
        .transaction(async (tx) => {
          await lockScanUsage(tx);
          const [call] = await tx.query<CallRow>(
            `SELECT * FROM concept_blank_scan_usage_call WHERE id=$1::uuid AND month=$2::text AND submission_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
            [lease.token, lease.month, options.submissionId ?? null],
          );
          if (!call || call.status !== "running")
            throw new Error("이미 정산했거나 다른 호출의 사용량입니다.");
          const reserved = amount(call.reserved_nano_usd),
            over = cost !== null && cost > reserved;
          await tx.query(
            `UPDATE concept_blank_scan_usage_call SET status='settled',cost_nano_usd=$2::bigint,receipt=$3::jsonb,result_text=$4::text,settled_at=$5::timestamptz,settlement_reason=$6::text WHERE id=$1::uuid`,
            [
              lease.token,
              cost ?? reserved,
              JSON.stringify(evidence?.usage ?? null),
              cost === null || over ? null : (evidence?.output ?? null),
              now(),
              cost === null
                ? "usage-unknown"
                : over
                  ? "bound-exceeded"
                  : "reported",
            ],
          );
          await tx.query(
            `UPDATE concept_blank_scan_usage_month SET spent_nano_usd=spent_nano_usd+$2::bigint,reserved_nano_usd=reserved_nano_usd-$3::bigint,updated_at=$4::timestamptz WHERE month=$1::text`,
            [lease.month, cost ?? reserved, reserved, now()],
          );
          return over;
        })
        .catch(scanDatabaseError);
      if (exceeded)
        throw new Error(
          "실제 사용량이 예약 상계를 넘었습니다. 실제 사용량을 기록했습니다.",
        );
    },
    async inspect(month) {
      assertScanMonth(month);
      const [row] = await db
        .query<MonthRow>(
          `SELECT * FROM concept_blank_scan_usage_month WHERE month=$1::text`,
          [month],
        )
        .catch(scanDatabaseError);
      const [counts] = await db.query<{ active: number; queued: number }>(
        `SELECT count(*) FILTER(WHERE status='running')::int AS active,count(*) FILTER(WHERE status='queued')::int AS queued FROM concept_blank_scan_usage_call WHERE month=$1::text`,
        [month],
      );
      return {
        spentNanoUsd: row ? amount(row.spent_nano_usd) : 0,
        reservedNanoUsd: row ? amount(row.reserved_nano_usd) : 0,
        busy: counts.active > 0,
        unresolved: false,
        activeCalls: counts.active,
        queuedCalls: counts.queued,
      };
    },
    async findResult(key) {
      const [row] = await db
        .query<{ result_text: string }>(
          `SELECT result_text FROM concept_blank_scan_usage_call WHERE result_key=$1::text AND submission_id IS NOT DISTINCT FROM $2::uuid AND status='settled' AND result_text IS NOT NULL ORDER BY queue_order DESC LIMIT 1`,
          [key, options.submissionId ?? null],
        )
        .catch(scanDatabaseError);
      return row?.result_text ?? null;
    },
  };
}
