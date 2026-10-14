/**
 * **출제 불가 원문의 열린 지정 두 슬롯**을 잠근다 (문제은행 P0 · 2026-10-14).
 *
 *   npx tsx --env-file=<.env> scripts/import/textbook/lock-orphan-slots.ts                       # 드라이런 — 무엇을 잠그나
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/import/textbook/lock-orphan-slots.ts --apply [--out <폴더>]
 *
 * 원문을 바꾸거나 잠그는 도구(`load-school-textbook.ts --refresh` · `hold-school-textbook.ts --hold` · `recover-held.ts`)는
 * 이제 지정 슬롯을 같은 트랜잭션에서 잠근다(`designatedSlotLocks.ts`). 이 도구는 그 **전에** 이미 어긋난 자리 —
 * 원문이 잠기거나 검수가 내려갔는데 슬롯이 열린 채인 것 — 를 한 번 맞춘다. 복습(`planRetry`)은 원문의 지금 상태를 보지
 * 않으므로(이미 낸 시험지의 오답이다) 이런 슬롯은 계속 복습지로 나간다.
 *
 * ⚠️ 원문의 **글이 바뀐 것**은 이 도구가 모른다 — `Problem` 에 «변형을 검산할 때의 원문 지문»이 없다
 *    (지문은 저장소 밖 승격 영수증 `receipt.json` 의 `sourceDigest` 에만 있다). 그 대조는 영수증을 가진 쪽의 일이다.
 * 잠금은 `directUseAllowed = false` 하나 — 검수 상태 · 사람의 기록은 건드리지 않는다. 여는 것은 대응을 다시 검증한 뒤다.
 * 영수증(`--out`/receipt.json)에 잠그기 전 값을 남긴다 — 덮어쓰지 않는다.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  findDesignatedSlotRows,
  lockDesignatedSlotsArgs,
  planDesignatedSlotLocks,
  SLOT_LOCK_REASON,
} from "../../../src/lib/import/schoolTextbook/designatedSlotLocks";
import { SLOT_CENSUS_SELECT } from "../../../src/lib/import/schoolTextbook/slotCensus";
import { problemIneligibleCode } from "../../../src/lib/problemEligibility";
import { problemVisibleWhere } from "../../../src/lib/problemPool";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const apply = args.includes("--apply");
const out = resolve(
  option("--out") ??
    `.qa-artifacts/lock-orphan-slots-${new Date().toISOString().slice(0, 10)}`,
);
const prisma = new PrismaClient({ log: [] });

type Origin = Awaited<ReturnType<typeof readOrigins>>[number];
function readOrigins(client: Pick<PrismaClient, "problem">) {
  return client.problem.findMany({
    where: { AND: [problemVisibleWhere(), { source: "school_textbook" }] },
    select: SLOT_CENSUS_SELECT,
  });
}

/** 출제 불가 원문 → 까닭(열쇠를 붙인다) */
function reasonsOf(origins: readonly Origin[]) {
  return new Map(
    origins.flatMap((origin) => {
      const code = problemIneligibleCode(origin);
      return code
        ? [[origin.id, `${SLOT_LOCK_REASON.locked} (${code})`] as const]
        : [];
    }),
  );
}

async function main() {
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("공유 DB 를 고친다 — ALLOW_SHARED_IMPORT=1 을 주어야 한다");
  const origins = await readOrigins(prisma);
  const reasons = reasonsOf(origins);
  const locks = planDesignatedSlotLocks(
    reasons,
    await findDesignatedSlotRows(prisma, [...reasons.keys()]),
  );
  const byReason: Record<string, number> = {};
  for (const lock of locks)
    byReason[lock.reason] = (byReason[lock.reason] ?? 0) + 1;
  console.log(
    JSON.stringify(
      {
        교과서_원문: origins.length,
        출제_불가_원문: reasons.size,
        잠글_열린_지정_변형: locks.length,
        까닭별: byReason,
      },
      null,
      1,
    ),
  );
  mkdirSync(out, { recursive: true });
  if (!apply) {
    writeFileSync(
      join(out, "plan.json"),
      JSON.stringify({ locks }, null, 1) + "\n",
    );
    console.log(
      `\n드라이런이다 — DB 에 아무것도 쓰지 않았다(계획: ${join(out, "plan.json")}).`,
    );
    return;
  }
  if (existsSync(join(out, "receipt.json")))
    throw new Error("영수증을 덮어쓰지 않는다 — 새 --out 을 주어야 한다");
  if (!locks.length) return;
  const receipt = await prisma.$transaction(
    async (tx) => {
      // 계획 뒤 원문이 다시 열렸으면 그 슬롯은 잠그지 않는다 — 지금의 원문으로 다시 가린다
      const now = reasonsOf(
        await tx.problem.findMany({
          where: {
            id: { in: [...new Set(locks.map((l) => l.originProblemId))] },
          },
          select: SLOT_CENSUS_SELECT,
        }),
      );
      const still = locks.filter((lock) => now.has(lock.originProblemId));
      let count = 0;
      for (let start = 0; start < still.length; start += 5000)
        count += (
          await tx.problem.updateMany(
            lockDesignatedSlotsArgs(still.slice(start, start + 5000)),
          )
        ).count;
      return { planned: locks.length, applied: count, locks: still };
    },
    { timeout: 120_000 },
  );
  writeFileSync(
    join(out, "receipt.json"),
    JSON.stringify(
      { appliedAt: new Date().toISOString(), ...receipt },
      null,
      1,
    ) + "\n",
  );
  console.log(
    `잠갔다 — 계획 ${receipt.planned} · 실제 ${receipt.applied} · 영수증 ${join(out, "receipt.json")}`,
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "잠금 실패",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
