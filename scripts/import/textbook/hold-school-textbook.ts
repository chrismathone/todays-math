/**
 * 교과서 문항을 출제에서 빼거나(잠금) 다시 넣는다 (D-161 · 2026-10-07).
 *
 *   npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts                       # 지금 상태만 센다
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts --hold --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/import/textbook/hold-school-textbook.ts --release <목록.json> --apply
 *
 * 잠금은 `direct_use_allowed = false` 다 — 문제은행에는 보이고 출제에는 안 뽑힌다(`problemPool.ts` 가 권하는 방식이고,
 * 그림 유실 잠금이 같은 칸을 쓴다). 행을 지우지 않으므로 문항 번호 · id 가 그대로다.
 *
 * `--hold` 는 교과서 문항 **전부**를 잠근다. `--release` 는 목록(`externalId` 의 JSON 배열)에 든 것만 푼다 —
 * 무엇을 풀지는 부르는 쪽이 정한다(적재기의 계획 `load/plan.json` 에서 «흠 없음»으로 남은 줄).
 *
 * 왜 있나 — 2026-10-07 에 6,121문항을 «바로 쓸 수 있음»으로 실은 직후, 수식 안에 한글 수식 낱말이 그대로 남은 문항
 * (`boldx` · `x->4` · `SMALLPROD` …)과 «풀이 칸에 다음 문항이 붙은» 문항을 찾았다. 답은 맞지만 지면에 그대로 찍힌다.
 * 고치는 동안 시험지에 뽑히지 않게 먼저 잠갔다.
 */
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

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

async function main(): Promise<void> {
  const before = await counts();
  console.log(`지금 — 출제 가능 ${before.open} · 잠김 ${before.held}`);

  const releaseFile = valueOf("--release");
  if (!has("--hold") && !releaseFile) return;
  if (has("--hold") && releaseFile)
    throw new Error("--hold 와 --release 는 같이 쓰지 않는다");

  const ids = releaseFile
    ? (JSON.parse(readFileSync(releaseFile, "utf8")) as string[])
    : null;
  if (ids && (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")))
    throw new Error("목록은 externalId 의 JSON 배열이어야 한다");
  console.log(ids ? `풀 문항 ${ids.length}` : "교과서 문항 전부를 잠근다");

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
  } else {
    const result = await prisma.problem.updateMany({
      where: { source: "school_textbook", directUseAllowed: true },
      data: { directUseAllowed: false },
    });
    changed = result.count;
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
