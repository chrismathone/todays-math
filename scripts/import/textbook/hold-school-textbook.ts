/**
 * 교과서 문항을 출제에서 빼거나(잠금) 다시 넣는다 (D-161 · 2026-10-07).
 *
 *   npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts                       # 지금 상태만 센다
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts --hold --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts --release <목록.json> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts --release-passed --apply
 *
 * 잠금은 `direct_use_allowed = false` 다 — 문제은행에는 보이고 출제에는 안 뽑힌다(`problemPool.ts` 가 권하는 방식이고,
 * 그림 유실 잠금이 같은 칸을 쓴다). 행을 지우지 않으므로 문항 번호 · id 가 그대로다.
 *
 * `--hold` 는 교과서 문항 **전부**를 잠근다. `--release` 는 목록(`externalId` 의 JSON 배열)에 든 것만 푼다 —
 * 무엇을 풀지는 부르는 쪽이 정한다(적재기의 계획 `load/plan.json` 에서 «흠 없음»으로 남은 줄).
 *
 * `--release-passed` 는 **사람이 검수 화면에서 «통과»를 준** 잠긴 문항만 푼다(원장님 2026-10-08 «이건 직접 검수»).
 * 검수 화면의 «출제에서 빠져 있다» 줄에 잠긴 문항이 나온다. 거기서 통과(`pass`)를 주면 기록(`problem_review_log`)이 남고,
 * 이 명령이 «그 문항의 마지막 판정이 통과»인 것을 찾아 푼다. 판단 못 함 · 신고가 마지막이면 그대로 둔다.
 * 문항을 고치는 것은 문제은행에서 한다 — 고친 문항은 적재기의 `--refresh` 가 다시 덮어쓰지 않는다(`refreshPlan.ts`).
 *
 * 왜 있나 — 2026-10-07 에 6,121문항을 «바로 쓸 수 있음»으로 실은 직후, 수식 안에 한글 수식 낱말이 그대로 남은 문항
 * (`boldx` · `x->4` · `SMALLPROD` …)과 «풀이 칸에 다음 문항이 붙은» 문항을 찾았다. 답은 맞지만 지면에 그대로 찍힌다.
 * 고치는 동안 시험지에 뽑히지 않게 먼저 잠갔다.
 *
 * 🔴 지정 두 슬롯(복습 변형 `tb-retry-v1:…`) — `--hold` 는 잠그는 원문의 **열린 지정 변형도 같은 트랜잭션에서** 잠근다
 *    (`designatedSlotLocks.ts` · 문제은행 P0 2026-10-14). `--release*` 는 원문만 푼다 — 변형은 원문과의 대응을 다시
 *    검증한 뒤에 연다(여기서 같이 풀면 «원문이 그동안 바뀌었는지»를 아무도 안 본다). 풀고 나서 잠긴 채 남는 수를 알린다.
 */
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import {
  designatedSlotWhere,
  findDesignatedSlotRows,
  lockDesignatedSlotsArgs,
  planDesignatedSlotLocks,
  SLOT_LOCK_REASON,
} from "../../../src/lib/import/schoolTextbook/designatedSlotLocks";

const prisma = new PrismaClient();
const has = (flag: string): boolean => process.argv.includes(flag);
const valueOf = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
};

async function counts(): Promise<{ open: number; held: number }> {
  const [open, held] = await Promise.all([
    prisma.problem.count({
      where: { source: "school_textbook", directUseAllowed: true },
    }),
    prisma.problem.count({
      where: { source: "school_textbook", directUseAllowed: false },
    }),
  ]);
  return { open, held };
}

/** 원문을 풀어도 잠긴 채 남는 지정 변형 — 다시 검증해 여는 것은 따로다(읽기만). */
async function lockedSlotsOf(sourceIds: string[]): Promise<number> {
  let locked = 0;
  for (let start = 0; start < sourceIds.length; start += 1000)
    locked += await prisma.problem.count({
      where: {
        AND: [
          designatedSlotWhere(sourceIds.slice(start, start + 1000)),
          { directUseAllowed: false },
        ],
      },
    });
  return locked;
}

/** 잠긴 교과서 문항 가운데 «마지막 검수 판정이 통과»인 것 */
async function releasePassed(): Promise<void> {
  const held = await prisma.problem.findMany({
    where: { source: "school_textbook", directUseAllowed: false },
    select: {
      id: true,
      problemCode: true,
      reviewLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { verdict: true, createdAt: true },
      },
    },
  });
  const reviewed = held.filter((row) => row.reviewLogs.length > 0);
  const passed = reviewed.filter(
    (row) => row.reviewLogs[0]!.verdict === "pass",
  );
  console.log(
    `잠긴 문항 ${held.length} · 검수 기록이 있는 것 ${reviewed.length} · 마지막 판정이 통과인 것 ${passed.length}`,
  );
  for (const row of passed.slice(0, 20)) console.log(`  ${row.problemCode}`);
  if (passed.length > 20) console.log(`  … 그 밖 ${passed.length - 20}`);
  if (!has("--apply")) {
    console.log("\n드라이런이다 — DB 에 아무것도 쓰지 않았다.");
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("공유 DB 를 고친다 — ALLOW_SHARED_IMPORT=1 을 주어야 한다");
  const result = await prisma.problem.updateMany({
    where: {
      id: { in: passed.map((row) => row.id) },
      source: "school_textbook",
      directUseAllowed: false,
    },
    data: { directUseAllowed: true },
  });
  const after = await counts();
  console.log(
    `푼 문항 ${result.count}\n이제 — 출제 가능 ${after.open} · 잠김 ${after.held}`,
  );
  console.log(
    `잠긴 채 남는 지정 변형(대응을 다시 검증한 뒤 연다) ${await lockedSlotsOf(passed.map((row) => row.id))}`,
  );
}

async function main(): Promise<void> {
  const before = await counts();
  console.log(`지금 — 출제 가능 ${before.open} · 잠김 ${before.held}`);

  const releaseFile = valueOf("--release");
  if (has("--release-passed")) return await releasePassed();
  if (!has("--hold") && !releaseFile) return;
  if (has("--hold") && releaseFile)
    throw new Error("--hold 와 --release 는 같이 쓰지 않는다");

  const ids = releaseFile
    ? (JSON.parse(readFileSync(releaseFile, "utf8")) as string[])
    : null;
  if (ids && (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")))
    throw new Error("목록은 externalId 의 JSON 배열이어야 한다");
  console.log(ids ? `풀 문항 ${ids.length}` : "교과서 문항 전부를 잠근다");
  // 잠그는 원문의 열린 지정 변형 — 같은 트랜잭션에서 잠근다
  const openSources = ids
    ? []
    : (
        await prisma.problem.findMany({
          where: { source: "school_textbook", directUseAllowed: true },
          select: { id: true },
        })
      ).map((row) => row.id);
  const slotLocks = planDesignatedSlotLocks(
    new Map(openSources.map((id) => [id, SLOT_LOCK_REASON.locked])),
    await findDesignatedSlotRows(prisma, openSources),
  );
  if (!ids) console.log(`같이 잠그는 열린 지정 변형 ${slotLocks.length}`);

  if (!has("--apply")) {
    console.log("\n드라이런이다 — DB 에 아무것도 쓰지 않았다.");
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("공유 DB 를 고친다 — ALLOW_SHARED_IMPORT=1 을 주어야 한다");

  let changed = 0;
  if (ids) {
    for (let start = 0; start < ids.length; start += 1000) {
      const result = await prisma.problem.updateMany({
        where: {
          source: "school_textbook",
          externalId: { in: ids.slice(start, start + 1000) },
          directUseAllowed: false,
        },
        data: { directUseAllowed: true },
      });
      changed += result.count;
    }
    const released: string[] = [];
    for (let start = 0; start < ids.length; start += 1000)
      for (const row of await prisma.problem.findMany({
        where: {
          source: "school_textbook",
          externalId: { in: ids.slice(start, start + 1000) },
        },
        select: { id: true },
      }))
        released.push(row.id);
    console.log(
      `잠긴 채 남는 지정 변형(대응을 다시 검증한 뒤 연다) ${await lockedSlotsOf(released)}`,
    );
  } else {
    const [result, ...slots] = await prisma.$transaction([
      prisma.problem.updateMany({
        where: { source: "school_textbook", directUseAllowed: true },
        data: { directUseAllowed: false },
      }),
      ...Array.from(
        { length: Math.ceil(slotLocks.length / 5000) },
        (_, index) =>
          prisma.problem.updateMany(
            lockDesignatedSlotsArgs(
              slotLocks.slice(index * 5000, (index + 1) * 5000),
            ),
          ),
      ),
    ]);
    changed = result!.count;
    console.log(
      `잠근 지정 변형 ${slots.reduce((total, part) => total + part.count, 0)}`,
    );
  }
  const after = await counts();
  console.log(
    `바꾼 행 ${changed}\n이제 — 출제 가능 ${after.open} · 잠김 ${after.held}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
