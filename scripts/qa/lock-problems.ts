/**
 * 문항을 **출제에서 뺀다**(잠금) — `directUseAllowed` 한 칸만 내린다. 지우지 않는다.
 *
 *   npx tsx --env-file=<.env> scripts/qa/lock-problems.ts --label <원장 이름> --reason "<사유>" <externalId> …   # 드라이런
 *   ALLOW_UNIT_FIX=1 npx tsx --env-file=<.env> scripts/qa/lock-problems.ts --label … --reason … <externalId> … --apply
 *   ALLOW_UNIT_FIX=1 npx tsx --env-file=<.env> scripts/qa/lock-problems.ts --label <원장 이름> --revert
 *
 * 원장은 `scripts/qa/reports/refresh-engine-content/<원장 이름>.json` — DB 보다 **먼저** 쓴다.
 * 게이트 이름은 그림 유실 잠금 · 보기 그림 잠금과 같다(`ALLOW_UNIT_FIX`) — 잠금류는 한 게이트 뒤에 모은다.
 *
 * 판단(무엇을 잠그고 무엇을 건너뛰나)은 `lockProblemsCore.ts` 의 순수 함수가 한다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { planLock, planUnlock, type LockLedgerRow } from "./lockProblemsCore";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const label = flag("--label");
const reason = flag("--reason") ?? "";
const VALUE_FLAGS = new Set(["--label", "--reason"]);
const externalIds = args.filter(
  (a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1] ?? ""),
);
if (!label) throw new Error("--label <원장 이름> 이 필요하다");
const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "qa",
  "reports",
  "refresh-engine-content",
  `${label}.json`,
);

function gate(): void {
  if (process.env.ALLOW_UNIT_FIX !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_UNIT_FIX=1 을 명시하라",
    );
}

async function lock(doApply: boolean): Promise<void> {
  const rows = await prisma.problem.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true, directUseAllowed: true },
  });
  const plan = planLock(externalIds, rows, reason);
  console.log(
    `잠글 것 ${plan.lock.length} · 이미 내려가 있음 ${plan.already.length} · DB 에 없음 ${plan.missing.length}`,
  );
  for (const r of plan.lock) console.log(`   ${r.externalId}`);
  for (const id of plan.already) console.log(`   (이미) ${id}`);
  for (const id of plan.missing) console.log(`   ⚠️ 없음 ${id}`);
  if (!doApply) return console.log("드라이런이다 — ALLOW_UNIT_FIX=1 … --apply");
  gate();
  if (plan.missing.length > 0)
    throw new Error("DB 에 없는 행이 있다 — 목록을 확인하고 다시 돌려라");
  if (plan.lock.length === 0) return console.log("잠글 것이 없다.");
  if (existsSync(LEDGER))
    throw new Error(
      `원장이 이미 있다 — 같은 이름으로 두 번 쓰지 않는다: ${path.relative(process.cwd(), LEDGER)}`,
    );
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    JSON.stringify({ at: new Date().toISOString(), rows: plan.lock }, null, 1),
  );
  console.log(`원장 ${path.relative(process.cwd(), LEDGER)}`);
  const ids = plan.lock.map((r) => r.problemId);
  await prisma.problem.updateMany({
    where: { id: { in: ids }, directUseAllowed: true },
    data: { directUseAllowed: false },
  });
  const still = await prisma.problem.count({
    where: { id: { in: ids }, directUseAllowed: true },
  });
  if (still > 0) throw new Error(`되읽으니 ${still}행이 아직 출제 허용이다`);
  console.log(`✅ 잠금 ${ids.length}행 · 되읽기 전부 일치`);
}

async function revert(): Promise<void> {
  gate();
  const ledger = (
    JSON.parse(readFileSync(LEDGER, "utf8")) as { rows: LockLedgerRow[] }
  ).rows;
  const rows = await prisma.problem.findMany({
    where: { id: { in: ledger.map((r) => r.problemId) } },
    select: { id: true, externalId: true, directUseAllowed: true },
  });
  const plan = planUnlock(ledger, rows);
  await prisma.problem.updateMany({
    where: {
      id: { in: plan.unlock.map((r) => r.problemId) },
      directUseAllowed: false,
    },
    data: { directUseAllowed: true },
  });
  console.log(
    `되돌림 ${plan.unlock.length} · 건너뜀 ${plan.skipped.length}${plan.skipped.length ? ` (${plan.skipped.join(" · ")})` : ""}`,
  );
}

(args.includes("--revert") ? revert() : lock(args.includes("--apply")))
  .catch((e) => {
    console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
