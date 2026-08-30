/**
 * 「승인하면 **정말 출제 풀에 들어가는가**」를 **실데이터로** 잰다
 * (원장님 지적 2026-08-26 — 인라인 검수 지시의 확인 항목).
 *
 *   npx tsx -r dotenv/config scripts/qa/probe-approve-then-generate.ts
 *   npx tsx -r dotenv/config scripts/qa/probe-approve-then-generate.ts --approve 7 --required 10
 *
 * `--required` 는 원장님이 요청한 **문항 수**다. 「10 중 7 승인이면 부족분이 3인가」를
 * 그대로 물으려면 `--approve 7 --required 10` 이다(기본은 승인한 수와 같게 둔다).
 *
 * ## 음성 대조 — 이 프로브가 **«아니오»를 낼 수 있는가**
 *
 *   npx tsx -r dotenv/config scripts/qa/probe-approve-then-generate.ts --negative
 *
 * 승인 단계를 **일부러 건너뛰고** 같은 판정을 돌린다. 🔴 가 나와야 정상이다.
 * 「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」가 구조적으로 안 보이고,
 * 그러면 이 프로브는 판정자가 아니라 **도장**이 된다(CLAUDE.md 2026-08-20·08-23).
 *
 * ## 왜 단위 시험으로는 안 되나
 *
 * 화면 시험은 MSW 로 「승인했다고 치자」를 흉내 낸다. 그러면 **「승인이 됐다」와
 * 「출제에 뽑힌다」가 안 갈린다** — 흉내가 틀려도 초록이다. 출제 자격은
 * `eligibleProblemsWhere`(D-22 승인 · D-26 직접사용 · D-31 풀 · 정답 있음)가 정하고,
 * 화면이 보는 「가용」은 행 수가 아니라 **갈래 수**(`countFamilies`)다. 그 둘이 진짜
 * 데이터에서 함께 움직이는지는 DB 에 대 봐야 안다.
 *
 * ## 무엇을 쓰나 — 규칙을 **옮겨 적지 않는다**
 *
 *   · 자격 where : `eligibleProblemsWhere`  (출제 풀 조회와 **같은 함수**)
 *   · 가용 수    : `countFamilies`          (422 의 `available` 을 만드는 **그 함수**)
 *   · 뽑기       : `selectProblems`         (출제 엔진 **그 자체**)
 *
 * 여기서 다시 세는 것은 하나도 없다. 이 파일이 하는 일은 「승인 전/후로 저 셋을
 * 두 번 부르고 숫자를 견주는 것」뿐이다.
 *
 * ## 공유 DB 를 **바꾸지 않는다** — 트랜잭션을 굴리고 되돌린다
 *
 * 승인은 트랜잭션 안에서만 일어나고 마지막에 **반드시 롤백**한다. 검수 안 된 AI
 * 문항이 잠깐이라도 출제 풀에 들어가면 그게 D-22 위반이다. 되돌리기 원장이 필요 없는
 * 이유도 그것이다 — 커밋되는 변경이 애초에 없다.
 *
 * ## 이 프로브가 **답하지 않는 것**
 *
 * HTTP·세션·진도 해석은 안 탄다(그건 라우트 몫이고 이 물음과 무관하다). 여기서 재는
 * 것은 「자격 → 가용 → 뽑기」 세 단계뿐이다.
 */
import { PrismaClient } from "@prisma/client";

import type { Difficulty, DifficultyRatio } from "@/contracts/common.contract";
import type { ProblemType } from "@/contracts/problem.contract";
import { eligibleProblemsWhere } from "@/lib/findEligibleProblems";
import { countFamilies } from "@/lib/generator/familyKey";
import { selectProblems } from "@/lib/generator/selectProblems";

const prisma = new PrismaClient();

/** 롤백을 강제하는 표식 — 이 에러로만 트랜잭션을 끝낸다. */
const ROLLBACK = Symbol("rollback");

function flagValue(name: string, fallback: string): string {
  const at = process.argv.indexOf(name);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

/** 출제 엔진에 넘길 최소 모양 — `findEligibleProblems` 가 읽는 컬럼 그대로. */
const POOL_SELECT = {
  id: true,
  unitId: true,
  difficulty: true,
  problemType: true,
  directUseAllowed: true,
  familyKey: true,
  content: true,
  figureUrls: true,
  figureDims: true,
  figureSourceMm: true,
} as const;

type PoolRow = {
  id: string;
  unitId: string;
  // DB 는 문자열로 주지만 엔진은 사다리 값으로 받는다. 여기서 좁혀 두면
  // 사다리에 없는 값이 들어오는 날 `selectProblems` 가 아니라 **여기가** 먼저 튄다.
  difficulty: Difficulty;
  problemType: ProblemType;
  directUseAllowed: boolean;
  familyKey: string | null;
  content: string;
  figureUrls: string[];
  figureDims: number[];
  figureSourceMm: number[];
};

async function main() {
  const approveCount = Number(flagValue("--approve", "7"));
  /** 승인을 **일부러 건너뛴다** — 이 프로브가 «아니오»를 낼 수 있는지 보는 자리. */
  const negative = process.argv.includes("--negative");

  // 대상 무리 — AI 가 만들어 놓고 **아직 검수 안 된** 문항들. 원장님이 실제로
  // 「AI 생성」을 눌러 얻는 것이 이 상태다.
  const pending = (await prisma.problem.findMany({
    where: { source: "ai_generated", reviewStatus: "pending" },
    select: { id: true, unitId: true, problemCode: true, familyKey: true },
    orderBy: { problemCode: "asc" },
  })) as Array<{
    id: string;
    unitId: string;
    problemCode: string | null;
    familyKey: string | null;
  }>;

  if (pending.length === 0) {
    console.error(
      "대기 중인 AI 문항이 없다. 이 프로브는 실제 pending 행이 있어야 잰다.",
    );
    process.exitCode = 1;
    return;
  }

  // 한 단원으로 좁힌다 — 「가용」은 단원 범위마다 다른 값이라 섞으면 뜻이 흐려진다.
  const unitId = pending[0]!.unitId;
  const targets = pending
    .filter((row) => row.unitId === unitId)
    .slice(0, approveCount);
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });

  // ⛔ 대상이 0건이면 아래 판정이 `0 === 0` 으로 **거짓 초록**을 낸다. 판정을 거부한다.
  if (targets.length === 0) {
    console.error(
      "승인해 볼 대상이 0건이다 — 판정을 거부한다(--approve 를 올려라).",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `단원 ${unit?.grade} ${unit?.chapter} ${unit?.section}\n` +
      `대기 중인 AI 문항 ${pending.filter((r) => r.unitId === unitId).length}건 ` +
      `· 이번에 승인해 볼 것 ${targets.length}건`,
  );

  const readPool = async (client: {
    problem: { findMany: (args: unknown) => Promise<unknown> };
  }): Promise<PoolRow[]> =>
    (await client.problem.findMany({
      where: eligibleProblemsWhere({ unitIds: [unitId] }),
      select: POOL_SELECT,
    })) as PoolRow[];

  /** 화면이 보는 「가용」 — 행이 아니라 갈래다(422 가 이 함수로 만든다). */
  const capacityOf = (pool: PoolRow[]) => countFamilies(pool);

  const ratio: DifficultyRatio = {
    연산: 0,
    기본: 0,
    응용: 0,
    심화하: 0,
    심화중: 0,
    심화상: 0,
  };
  const required = Number(flagValue("--required", String(targets.length)));
  // 난이도를 한 갈래에 몰아 두면 「그 갈래가 모자라서」 실패한 것과 구분이 안 된다.
  // 대상 문항의 실제 난이도 분포를 그대로 쓰고, 모자란 몫은 첫 갈래에 얹는다.
  const targetDifficulty = await prisma.problem.findMany({
    where: { id: { in: targets.map((t) => t.id) } },
    select: { difficulty: true },
  });
  for (const row of targetDifficulty) {
    const tier = row.difficulty as Difficulty;
    ratio[tier] = (ratio[tier] ?? 0) + 1;
  }
  const spread = Object.values(ratio).reduce((a, b) => a + b, 0);
  if (required > spread) {
    const first = (Object.keys(ratio) as Array<keyof DifficultyRatio>).find(
      (tier) => ratio[tier] > 0,
    );
    if (first) ratio[first] += required - spread;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const before = await readPool(
        tx as unknown as Parameters<typeof readPool>[0],
      );
      const beforeCapacity = capacityOf(before);
      const beforeSelected = selectProblems({
        pool: before,
        difficultyRatio: ratio,
        count: required,
        recentProblemIds: [],
        seed: "probe",
      });

      // ── 승인 (이 트랜잭션 안에서만) ─────────────────────────────
      const changed = negative
        ? { count: 0 }
        : await tx.problem.updateMany({
            where: {
              id: { in: targets.map((t) => t.id) },
              reviewStatus: "pending",
            },
            data: { reviewStatus: "approved" },
          });

      const after = await readPool(
        tx as unknown as Parameters<typeof readPool>[0],
      );
      const afterCapacity = capacityOf(after);
      const afterSelected = selectProblems({
        pool: after,
        difficultyRatio: ratio,
        count: required,
        recentProblemIds: [],
        seed: "probe",
      });

      const approvedInPool = afterSelected.problems.filter((p) =>
        targets.some((t) => t.id === p.id),
      ).length;

      console.log("");
      console.log(`승인한 행           ${changed.count}건`);
      console.log(
        `자격 통과 행        ${before.length} → ${after.length}  (+${after.length - before.length})`,
      );
      console.log(
        `가용(갈래 수)       ${beforeCapacity} → ${afterCapacity}  (+${afterCapacity - beforeCapacity})`,
      );
      console.log(
        `필요 ${required} 기준 뽑힌 문항  ${beforeSelected.problems.length} → ${afterSelected.problems.length}`,
      );
      console.log(
        `그중 **방금 승인한 것**  ${approvedInPool}건 — 승인이 실제로 출제에 뽑혔는가`,
      );
      console.log(
        `부족분(필요 − 가용)  ${Math.max(0, required - beforeCapacity)} → ${Math.max(0, required - afterCapacity)}`,
      );

      // ⚠️ 「뽑힌 수 == required」를 판정에 넣지 않는다 — `--required` 가 승인 수보다
      //    크면 **모자란 것이 정상**이고, 그 모자람이야말로 이 프로브가 재는 값이다.
      const ok =
        changed.count === targets.length &&
        afterCapacity - beforeCapacity === targets.length &&
        approvedInPool === targets.length;
      console.log("");
      console.log(
        ok
          ? "🟢 승인한 만큼 가용이 오르고, 그 문항이 실제로 뽑혔다."
          : "🔴 숫자가 안 맞는다 — 위 표를 보고 어디서 갈렸는지 짚어라.",
      );
      if (negative) {
        // 음성 대조에서는 **🔴 가 정답**이다. 🟢 이 나오면 이 프로브는 도장이다.
        console.log(
          ok
            ? "⛔ 음성 대조 실패 — 승인을 안 했는데도 🟢 이다. 이 프로브는 판정자가 아니다."
            : "🟢 음성 대조 통과 — 승인이 없으면 «아니오»라고 말한다.",
        );
        if (ok) process.exitCode = 1;
      } else if (!ok) {
        process.exitCode = 1;
      }

      // 🔴 **반드시 되돌린다.** 검수 안 된 AI 문항이 출제 풀에 남으면 D-22 위반이다.
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  // 롤백이 실제로 됐는지 **DB 에 다시 물어** 확인한다 — 「던졌으니 됐겠지」로 두지 않는다.
  const stillPending = await prisma.problem.count({
    where: { id: { in: targets.map((t) => t.id) }, reviewStatus: "pending" },
  });
  console.log(
    stillPending === targets.length
      ? `🟢 롤백 확인 — ${targets.length}건 전부 다시 pending 이다.`
      : `🔴 롤백이 안 됐다. ${targets.length - stillPending}건이 approved 로 남아 있다 — 즉시 되돌려라.`,
  );
  if (stillPending !== targets.length) process.exitCode = 1;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
