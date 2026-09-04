/**
 * **적재본에서 «낡은 행»만 골라 되돌리기 원장을 만든다** — DB 는 **읽기만** 한다.
 *
 *   npx tsx scripts/qa/build-revert-ledger.ts --prefix "engine-mid:…|" --label 98X-부호균형
 *
 * ## 왜 필요한가
 *
 * 엔진을 고치면 이미 나간 행은 **옛 규칙으로 만든 지면**이다. 그런데 적재기는
 * 이미 있는 `externalId` 를 **건너뛰므로**(`fresh = ready.filter(...)`) 같은 씨앗으로
 * 다시 돌려도 **아무것도 안 바뀐다.** 고치려면 그 행을 지우고 다시 넣어야 하고,
 * 지우는 길은 적재기의 `--revert <원장>` 하나다. 이 자는 그 원장을 **DB 를 보고**
 * 만든다 — 손으로 적으면 id 하나만 틀려도 남의 문항이 지워진다.
 *
 * ## 🔴 이 자가 반드시 막는 것
 *
 * ㉠ **우리 것이 아닌 접두사**(`engine-` 로 시작하지 않으면 멈춘다). 적재기의 revert 도
 *    같은 검사를 하지만, **원장을 만드는 자리에서 먼저** 막는 것이 낫다 — 잘못 만든
 *    원장이 파일로 남아 다음 사람이 그대로 돌릴 수 있다.
 * ㉡ **시험지에 실렸거나 채점 기록이 있는 행**(D-20 「무엇을 잃는가」). 스키마가
 *    `onDelete: Restrict` 로 이미 막지만 그러면 **회차 전체가 던져** 왜 막혔는지가
 *    안 보인다. 여기서 먼저 세어 **어느 행이 왜 못 지워지는지** 찍고 멈춘다.
 * ㉢ **0건**. 접두사가 오타면 0건이 나오고, 그대로 두면 「지울 것이 없다」가
 *    「이미 깨끗하다」로 읽힌다 — 0 은 «깨끗»과 «못 셈»을 안 가른다.
 *
 * ⚠️ 원장은 **커밋되는 자리**(`docs/planning/tracks/reports/`)에 쓴다. 2026-08-18 에
 *    공유 DB 를 790건 바꿔 놓고 되돌리기 파일이 `.gitignore` 에 걸려 **이 컴퓨터에만**
 *    남은 적이 있다. 만든 뒤 `git check-ignore -v <파일>` 로 확인할 것.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const REPO = process.cwd();
const LEDGER_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const prefix = arg("--prefix");
  const label = arg("--label");
  if (prefix === undefined || label === undefined) {
    console.log(
      '--prefix "engine-mid:…|" --label <이름> 이 필요하다 (--out 으로 경로를 덮을 수 있다)',
    );
    process.exitCode = 1;
    return;
  }
  if (!/^engine-(elem|mid|mid-combo):/.test(prefix))
    throw new Error(
      `접두사가 우리 것이 아니다 — ${prefix} (engine-elem/mid/mid-combo 만)`,
    );

  const rows = await prisma.problem.findMany({
    where: { externalId: { startsWith: prefix } },
    select: {
      id: true,
      externalId: true,
      unitId: true,
      familyKey: true,
      problemCode: true,
    },
    orderBy: { externalId: "asc" },
  });
  console.log(`접두사 「${prefix}」 로 잡힌 행 ${rows.length}`);
  if (rows.length === 0)
    throw new Error(
      "0건이다 — 접두사가 틀렸을 수 있다. 「지울 것이 없다」와 「이미 깨끗하다」는 다른 말이므로 멈춘다.",
    );

  // ㉡ 무엇을 잃는가 — 시험지·채점 기록 (D-20)
  const ids = rows.map((r) => r.id);
  const onPapers = await prisma.testProblem.findMany({
    where: { problemId: { in: ids } },
    select: { problemId: true, testId: true },
  });
  const graded = await prisma.problemAnswer.findMany({
    where: { problemId: { in: ids } },
    select: { problemId: true },
  });
  console.log(
    `시험지에 실린 자리 ${onPapers.length} · 채점 기록 ${graded.length}`,
  );
  if (onPapers.length > 0 || graded.length > 0) {
    const stuck = new Set([
      ...onPapers.map((t) => t.problemId),
      ...graded.map((g) => g.problemId),
    ]);
    for (const r of rows)
      if (stuck.has(r.id)) console.log(`   · ${r.problemCode} ${r.externalId}`);
    throw new Error(
      `${stuck.size}행이 시험지·채점에 물려 있다 — 지우면 그 기록이 깨진다. 멈춘다.`,
    );
  }

  const out =
    arg("--out") ?? path.join(LEDGER_DIR, `engine-stale-${label}.json`);
  if (existsSync(out))
    throw new Error(
      `원장이 이미 있다 — ${out}. 덮어쓰면 앞 회차를 못 되돌린다(2026-08-20 사고). 멈춘다.`,
    );
  const ledger = {
    runs: [
      {
        label: `낡은 행 회수 — ${label}`,
        at: new Date().toISOString(),
        count: rows.length,
      },
    ],
    rows: rows.map((r) => ({
      externalId: r.externalId!,
      problemId: r.id,
      origin: `stale:${label}`,
      unitKey: `${r.unitId}|${r.familyKey ?? ""}`,
    })),
  };
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(ledger, null, 2), "utf-8");
  console.log(`\n원장을 썼다 — ${path.relative(REPO, out)} (${rows.length}행)`);
  console.log(
    "다음: git check-ignore -v 로 커밋되는지 보고, 커밋한 **뒤에** --revert 로 돌린다.",
  );
}

void main().finally(() => void prisma.$disconnect());
