/**
 * 격리 벽(`src/lib/db.ts` 확장)이 **실제 DB 에서** 도는가.
 *
 * 🔴 이 검사는 모킹하지 않는다. 단위 시험은 Prisma 를 가짜로 바꾸므로
 *    「확장이 만든 `where` 를 Prisma 가 받아 주는가」라는 축이 **아예 없다.**
 *    그래서 `findUnique` 에 `AND` 를 씌우던 결함이 관문 전량 초록인 채로
 *    production 까지 나갔다(원장님 2026-08-26 「검수 상태를 바꾸지 못했습니다」).
 *
 * 세 가지를 본다:
 *   ⑴ 읽기 연산이 **전부** 안 던진다 (findUnique 계열 포함)
 *   ⑵ 벽이 **살아 있다** — 격리된 행은 findUnique 로도 안 나온다
 *   ⑶ 보이는 행은 **나온다** — 벽이 전부를 막아 버리지 않는다 (음성 대조)
 */
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";

/** 예외의 첫 줄만 — Prisma 검증 오류는 수십 줄이라 판정 줄을 덮어 버린다. */
function firstLine(e: unknown): string {
  return String((e as Error).message).split(/\r?\n/)[0] ?? "";
}

async function main() {
  const raw = new PrismaClient();
  let failures = 0;
  const fail = (msg: string) => {
    console.error("🔴", msg);
    failures += 1;
  };

  // ⑶ 음성 대조군 먼저 — 보이는 행이 없으면 이 검사는 아무것도 증명하지 않는다.
  const visible = await raw.problem.findFirst({
    where: { pool: "shared" },
    select: { id: true, problemCode: true },
  });
  if (!visible) {
    console.error(
      "🔴 보이는(shared) 행이 0건 — 이 검사는 아무것도 증명 못 한다.",
    );
    process.exit(1);
  }

  // ⑵ 양성 대조군 — 격리된 행. 없으면 벽이 무는지 확인할 수 없다.
  const quarantined = await raw.problem.findFirst({
    where: { NOT: { pool: "shared" } },
    select: { id: true, pool: true },
  });

  // ⑴ 읽기 연산 전부가 던지지 않는가
  const checks: Array<[string, () => Promise<unknown>]> = [
    [
      "findUnique(id)",
      () => db.problem.findUnique({ where: { id: visible.id } }),
    ],
    [
      "findUnique(problemCode)",
      () =>
        db.problem.findUnique({ where: { problemCode: visible.problemCode } }),
    ],
    ["findFirst", () => db.problem.findFirst({ where: { id: visible.id } })],
    [
      "findMany",
      () => db.problem.findMany({ where: { id: visible.id }, take: 1 }),
    ],
    ["count", () => db.problem.count({ where: { id: visible.id } })],
    [
      "aggregate",
      () =>
        db.problem.aggregate({
          where: { id: visible.id },
          _count: { _all: true },
        }),
    ],
    [
      "groupBy",
      () =>
        db.problem.groupBy({
          by: ["pool"],
          where: { id: visible.id },
          _count: { _all: true },
        }),
    ],
  ];
  for (const [name, run] of checks) {
    try {
      await run();
      console.log("  ✓", name);
    } catch (e) {
      fail(`${name} 이 던졌다 — ${(e as Error).message.split("\n")[0]}`);
    }
  }

  // ⑶ 보이는 행은 실제로 나오는가
  //    ⚠️ 여기서도 반드시 잡는다. 안 잡으면 실패가 **터져 나가** 판정 줄이
  //       «무엇이 틀렸나»를 못 댄다 — 근거 없는 빨강은 빨강이 아니다.
  try {
    const got = await db.problem.findUnique({ where: { id: visible.id } });
    if (!got)
      fail("보이는 행인데 findUnique 가 null 을 냈다 — 벽이 전부를 막는다.");
    else console.log("  ✓ 보이는 행은 나온다");
  } catch (e) {
    fail(`보이는 행 findUnique 가 던졌다 — ${firstLine(e)}`);
  }

  // ⑵ 격리된 행은 막히는가
  if (quarantined) {
    try {
      const leaked = await db.problem.findUnique({
        where: { id: quarantined.id },
      });
      if (leaked)
        fail(
          `격리된 행(pool=${quarantined.pool})이 findUnique 로 샜다 — 벽이 죽었다.`,
        );
      else console.log("  ✓ 격리된 행은 막힌다");
    } catch (e) {
      fail(`격리 행 findUnique 가 던졌다 — ${firstLine(e)}`);
    }
  } else {
    console.log(
      "  ⚠️ 격리된 행이 0건 — 「벽이 무는가」는 이번 회차에 확인 못 했다.",
    );
  }

  await raw.$disconnect();
  await db.$disconnect();
  if (failures > 0) {
    console.error(`\n🔴 ${failures}건 실패`);
    process.exit(1);
  }
  console.log("\n✅ 격리 벽이 실제 DB 에서 정상");
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
