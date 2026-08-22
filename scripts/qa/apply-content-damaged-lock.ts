/**
 * 본문 손상/누락(진짜 손상 — 그림 유실 제외) 문항을 출제 풀에서 뺀다
 * (`directUseAllowed = false`). 2026-08-23 원장님 지시.
 *
 *   npx tsx scripts/qa/apply-content-damaged-lock.ts                 # 드라이런(기본)
 *   ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts
 *   ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts --revert
 *
 * ## 1차(74건, RPM·메타데이터 전무) → 2차(전량)로 확대
 *
 * 1차는 회수 가망이 없어 보이는 두 갈래(RPM 소스 28 · 원본 출처 메타데이터 전무 46)
 * 만 잠갔다. 2026-08-23 원장님 지시로 **"누락 손상건 포함 출제할 수 없는 문제들은
 * 다 보류"** — DB `content` 가 깨진 채로는 학생에게 그대로 나가면 안 되므로,
 * 회수 가능성(예: HWP 원본이 살아있는 지수 표기 손실)과 무관하게 **일단 전부** 잠근다.
 * 검수는 `/dev/content-damaged` 에서 원장님이 한 건씩 보고 메모를 남기며 진행한다.
 *
 * ⚠️ 그림만 없고 본문은 멀쩡한 문항(그림 유실, "그림/이미지/사진" 언급)은 **여기서
 *    빼지 않는다** — 그건 별도 트랙(docs/planning/16, missing-figure-lock.ts)이 잠근다.
 *
 * ⚠️ `directUseAllowed` 를 새로 잠그려면 원장님 확인이 필요하다(스키마 주석) —
 *    채팅으로 직접 받았다.
 *
 * ## 원장은 누적한다 — 덮어쓰지 않는다
 *
 * 회차마다 새로 잠근 것만 `이전상태`에 **추가**한다. 이미 원장에 있는 id 는
 * 건드리지 않는다(처음 잠갔을 때의 `directUseAllowed` 값을 지켜야 되돌릴 수 있다 —
 * 2026-08-20 「되돌리기 원장을 덮어쓰면 앞 회차는 되돌릴 수 없다」와 같은 함정).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEDGER = "scripts/qa/reports/content-damaged-lock.json";
const APPLY = process.env.ALLOW_UNIT_FIX === "1";
const REVERT = process.argv.includes("--revert");

const DAMAGE_KEYWORDS = /손상|깨|누락|오타|결손|훼손/;
const FIGURE_MENTION = /그림|이미지|사진/;

type LedgerRow = { id: string; problemCode: string; directUseAllowed: boolean };
type Ledger = {
  적용: string;
  기준시각: string;
  되돌리기: string;
  잠근건수: number;
  이전상태: LedgerRow[];
};

async function damagedIds(): Promise<Map<string, string>> {
  const raw = JSON.parse(
    readFileSync("scripts/qa/reports/ai-solution-skip.json", "utf8"),
  ) as Array<{ id: string; reason: string }>;
  const map = new Map<string, string>();
  for (const r of raw) {
    if (DAMAGE_KEYWORDS.test(r.reason) && !FIGURE_MENTION.test(r.reason)) {
      map.set(r.id, r.reason);
    }
  }
  return map;
}

function loadLedger(): Ledger | null {
  if (!existsSync(LEDGER)) return null;
  return JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
}

async function revert() {
  const ledger = loadLedger();
  if (!ledger) {
    console.log("되돌릴 원장이 없다:", LEDGER);
    return;
  }
  const ids = ledger.이전상태.map((r) => r.id);

  const current = await prisma.problem.findMany({
    where: { id: { in: ids } },
    select: { id: true, directUseAllowed: true },
  });
  const stillLocked = current
    .filter((c) => c.directUseAllowed === false)
    .map((c) => c.id);

  console.log(
    `원장 ${ledger.이전상태.length}건 중 아직 이 스크립트 값 그대로인 것 ${stillLocked.length}건`,
  );

  if (!APPLY) {
    console.log("드라이런이다. 되돌리려면 ALLOW_UNIT_FIX=1 을 붙여라.");
    return;
  }
  if (stillLocked.length === 0) {
    console.log("되돌릴 것이 없다.");
    return;
  }
  await prisma.problem.updateMany({
    where: { id: { in: stillLocked } },
    data: { directUseAllowed: true },
  });
  console.log(`${stillLocked.length}건 해제 완료`);
}

async function apply() {
  const reasons = await damagedIds();
  const ids = [...reasons.keys()];

  const rows = await prisma.problem.findMany({
    where: { id: { in: ids } },
    select: { id: true, problemCode: true, directUseAllowed: true },
  });

  console.log("본문 손상/누락(그림 유실 제외) 전체:", rows.length);

  const todo = rows.filter((r) => r.directUseAllowed);
  console.log("이미 잠겨 있던 것 제외 실제 신규 잠금 대상:", todo.length);

  if (!APPLY) {
    console.log("\n드라이런이다. 실제로 쓰려면 ALLOW_UNIT_FIX=1 을 붙여라.");
    console.log(
      "샘플:",
      todo.slice(0, 5).map((r) => r.problemCode),
    );
    return;
  }
  if (todo.length === 0) {
    console.log("잠글 것이 없다.");
    return;
  }

  const existing = loadLedger();
  const existingIds = new Set((existing?.이전상태 ?? []).map((r) => r.id));
  const newRows: LedgerRow[] = todo
    .filter((r) => !existingIds.has(r.id))
    .map((r) => ({
      id: r.id,
      problemCode: r.problemCode,
      directUseAllowed: r.directUseAllowed,
    }));

  const merged: Ledger = {
    적용: "본문 손상/누락(그림 유실 제외) 문항 출제 제외 (directUseAllowed=false)",
    기준시각: new Date().toISOString(),
    되돌리기:
      "ALLOW_UNIT_FIX=1 npx tsx scripts/qa/apply-content-damaged-lock.ts --revert",
    잠근건수: (existing?.이전상태.length ?? 0) + newRows.length,
    이전상태: [...(existing?.이전상태 ?? []), ...newRows],
  };
  writeFileSync(LEDGER, JSON.stringify(merged, null, 1), "utf8");

  await prisma.problem.updateMany({
    where: { id: { in: todo.map((r) => r.id) } },
    data: { directUseAllowed: false },
  });
  console.log(
    `${todo.length}건 잠금 완료(신규 원장행 ${newRows.length}) → ${LEDGER}`,
  );
}

async function main() {
  if (REVERT) await revert();
  else await apply();
}
main().finally(() => prisma.$disconnect());
