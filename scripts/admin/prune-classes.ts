/**
 * 반 정리 — 원장님 확정 2026-08-25: *「진도 기록 관련 데이터 전부 정리하고 워커를
 * 이수진T 월목 반에 대해서만 작동하도록」*.
 *
 *   npx tsx scripts/admin/prune-classes.ts                       # 드라이런
 *   ALLOW_CLASS_PRUNE=1 npx tsx scripts/admin/prune-classes.ts --apply
 *   ALLOW_CLASS_PRUNE=1 npx tsx scripts/admin/prune-classes.ts --revert
 *
 * ## 무엇을 남기나
 *
 * ⑴ 워커 범위(`src/lib/eywa/syncScope.ts`)에 적힌 반 — **거기가 열쇠의 단일 소스다.**
 *    여기에 id 를 다시 적으면 두 벌이 되어 한쪽만 고친 날 조용히 갈린다.
 * ⑵ `eywaClassId` 가 **없는** 반 — eywa 연계 밖이라 워커가 만들지도 지우지도 않는다.
 *    「테스트반」이 그것이고, 원장님이 **남긴다**고 확정하셨다(확정·인쇄 이력 2건이
 *    거기 있고, 화면에서 «끝까지 가 본» 상태를 볼 수 있는 유일한 반이다).
 *
 * ## 🔴 DB 가 같이 지우는 것 (실측 — `information_schema`)
 *
 *   class ← progress · student · test            ON DELETE CASCADE
 *   student ← actual_exam_score · progress · test_result   CASCADE  (test.student_id 는 SET NULL)
 *   test ← test_problem · test_result            CASCADE
 *
 * 즉 **반 한 줄을 지우면 그 반의 학생·진도·시험지·성적이 전부 따라간다.** 앱을 안 거치고
 * DB 가 직접 하는 일이라 애플리케이션 코드로는 못 막는다. 그래서 원장에 **전 컬럼**을
 * 담고, `--revert` 가 그대로 되살린다.
 *
 * ## 되돌리기의 한계 — 반드시 읽을 것
 *
 * 되살리기는 **행을 다시 넣는다.** id 가 같으므로 관계는 복원되지만, 그 사이 다른
 * 작업이 같은 id 를 새로 만들었다면 건너뛴다(있는 것은 안 건드린다). 원장은
 * **덮어쓰지 않고 회차별 파일**로 남긴다(2026-08-20 교훈 — 덮어쓰면 앞 회차를 못 되돌린다).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { EYWA_SYNC_CLASSES } from "../../src/lib/eywa/syncScope";

const prisma = new PrismaClient();

const APPLY = process.env.ALLOW_CLASS_PRUNE === "1";
const MODE = process.argv.includes("--revert")
  ? "revert"
  : process.argv.includes("--apply")
    ? "apply"
    : "dryrun";

const LEDGER = join(
  process.cwd(),
  "scripts/admin/ledgers/classes-pruned-2026-08-25.json.gz",
);

/** 남길 반 id — ⑴ 워커 범위 ⑵ eywa 연계 밖. */
async function keepIds(): Promise<{ ids: string[]; why: Map<string, string> }> {
  const why = new Map<string, string>();
  const scoped = new Set(EYWA_SYNC_CLASSES.map((c) => c.eywaClassId));
  const rows = await prisma.class.findMany({
    select: { id: true, name: true, eywaClassId: true },
  });
  const ids: string[] = [];
  for (const r of rows) {
    if (r.eywaClassId === null) {
      ids.push(r.id);
      why.set(r.id, `${r.name} — eywa 연계 밖(워커가 안 건드린다)`);
    } else if (scoped.has(r.eywaClassId)) {
      ids.push(r.id);
      why.set(r.id, `${r.name} — 워커 범위(syncScope.ts)`);
    }
  }
  return { ids, why };
}

async function main() {
  console.log(`반 정리 — 모드: ${MODE}${APPLY ? "" : " (가드 미설정)"}\n`);

  if (MODE === "revert") {
    if (!existsSync(LEDGER)) throw new Error("되돌릴 원장이 없다");
    const led = JSON.parse(gunzipSync(readFileSync(LEDGER)).toString("utf8"));
    // 부모부터 넣는다 — 자식이 FK 를 걸고 있다.
    const order = [
      "classes",
      "students",
      "tests",
      "progresses",
      "testProblems",
    ];
    for (const table of order) {
      const rows = led[table] ?? [];
      let back = 0,
        skipped = 0;
      for (const r of rows) {
        // 표 이름으로 모델을 고르므로 정적 타입이 안 붙는다. `Function` 은 lint 가 막으니
        // **부르는 두 메서드의 모양만** 적는다 — 그래야 오타가 타입에서 걸린다.
        type DelegateLike = {
          findUnique: (args: {
            where: { id: string };
            select?: Record<string, boolean>;
          }) => Promise<unknown>;
          create: (args: { data: unknown }) => Promise<unknown>;
        };
        const model = (prisma as unknown as Record<string, DelegateLike>)[
          table === "classes"
            ? "class"
            : table === "students"
              ? "student"
              : table === "tests"
                ? "test"
                : table === "progresses"
                  ? "progress"
                  : "testProblem"
        ];
        const exists = await model.findUnique({
          where: { id: r.id },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }
        if (APPLY) {
          const data = { ...r } as Record<string, unknown>;
          for (const k of Object.keys(data))
            if (/At$|Date$/.test(k) && typeof data[k] === "string")
              data[k] = new Date(data[k] as string);
          await model.create({ data });
        }
        back++;
      }
      console.log(
        `  ${table.padEnd(14)} 되살릴 것 ${back} · 이미 있어 건너뜀 ${skipped}${APPLY ? "" : " (드라이런)"}`,
      );
    }
    return;
  }

  const { ids: keep, why } = await keepIds();
  console.log("남길 반:");
  for (const id of keep) console.log(`  ✓ ${why.get(id)}`);

  const doomed = await prisma.class.findMany({
    where: { id: { notIn: keep } },
    select: { id: true, name: true },
  });
  // 🔴 **무엇을 잃는지 센다 (D-20).** 건수만 보면 61 도 그럴듯하다.
  const doomedIds = doomed.map((d) => d.id);
  const lose = {
    반: doomed.length,
    학생: await prisma.student.count({ where: { classId: { in: doomedIds } } }),
    진도: await prisma.progress.count({
      where: { classId: { in: doomedIds } },
    }),
    시험지: await prisma.test.count({ where: { classId: { in: doomedIds } } }),
    확정인쇄: await prisma.test.count({
      where: {
        classId: { in: doomedIds },
        status: { in: ["confirmed", "printed"] },
      },
    }),
  };
  console.log(
    `\n지울 것 — 반 ${lose.반} · 학생 ${lose.학생} · 진도 ${lose.진도} · 시험지 ${lose.시험지}` +
      ` (그중 확정·인쇄 ${lose.확정인쇄}건)`,
  );
  // 분모 검산 — 남길 것 + 지울 것 == 전체. 안 맞으면 필터가 샌 것이다.
  const total = await prisma.class.count();
  if (keep.length + doomed.length !== total)
    throw new Error(
      `분모가 안 맞는다: 남길 ${keep.length} + 지울 ${doomed.length} != 전체 ${total}`,
    );
  if (lose.확정인쇄 > 0)
    console.log(
      `⚠️ 확정·인쇄 이력 ${lose.확정인쇄}건이 지울 반에 있다 — 원장님 확인이 끝난 것인지 다시 볼 것`,
    );

  if (!APPLY || MODE !== "apply") {
    console.log(
      "\n드라이런입니다. 실제 적용에는 ALLOW_CLASS_PRUNE=1 ... --apply 가 필요합니다.",
    );
    return;
  }

  // ── 원장 먼저, DB 는 그 다음 ────────────────────────────────
  const [classes, students, tests, progresses, testProblems] =
    await Promise.all([
      prisma.class.findMany({ where: { id: { in: doomedIds } } }),
      prisma.student.findMany({ where: { classId: { in: doomedIds } } }),
      prisma.test.findMany({ where: { classId: { in: doomedIds } } }),
      prisma.progress.findMany({ where: { classId: { in: doomedIds } } }),
      prisma.testProblem.findMany({
        where: { test: { classId: { in: doomedIds } } },
      }),
    ]);
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    gzipSync(
      JSON.stringify({
        at: new Date().toISOString(),
        reason:
          "원장님 확정 2026-08-25 — 워커를 MS1A·MS2A 로 좁히며 나머지 반 정리. --revert 로 되돌린다.",
        keep,
        classes,
        students,
        tests,
        progresses,
        testProblems,
      }),
    ),
  );
  console.log(
    `\n되돌리기 원장 → ${LEDGER}` +
      ` (반 ${classes.length} · 학생 ${students.length} · 시험지 ${tests.length}` +
      ` · 진도 ${progresses.length} · 시험지문항 ${testProblems.length})`,
  );

  // CASCADE 가 나머지를 지운다 — 반만 지우면 된다.
  const r = await prisma.class.deleteMany({ where: { id: { in: doomedIds } } });
  console.log(`삭제 ${r.count}반 (CASCADE 로 학생·진도·시험지 동반 삭제)`);

  const left = await prisma.class.count();
  const leftProgress = await prisma.progress.count();
  console.log(
    left === keep.length
      ? `✅ 남은 반 ${left}개 · 남은 진도 ${leftProgress}행`
      : `⚠️ 예상과 다르다 — 남은 반 ${left} (기대 ${keep.length})`,
  );
}

main()
  .catch((e) => {
    console.error("🔴", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
