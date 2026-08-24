/**
 * RPM 「교과서문제 정복하기」 문항 삭제 — 원장님 확정 2026-08-24.
 *
 *   npx tsx scripts/rpm/delete-textbook-problems.ts                    # 드라이런
 *   ALLOW_RPM_TEXTBOOK_DELETE=1 npx tsx scripts/rpm/delete-textbook-problems.ts --apply
 *   ALLOW_RPM_TEXTBOOK_DELETE=1 npx tsx scripts/rpm/delete-textbook-problems.ts --revert
 *
 * 지시: *「RPM 교과서 정복하기 문제는 전부 삭제. 유형 문제 아닌 교과서 정복하기에서
 * 나오는 문제는 전부 제거해」* — 유형 문항만 남긴다.
 *
 * ## 대상을 어떻게 정했나
 *
 * `scripts/rpm/data/textbook-sections.json` 의 문항번호 구간. 그 값은
 * `extract-textbook-sections.py` 가 **해설책 PDF** 에서 뽑았다 — 구역 머리글은 그림이라
 * 텍스트에 없고, 그 옆 「본문 N쪽」 표기의 **형태**(쉼표/단일 = 교과서, 물결 = 유형)가
 * 구역을 가른다. 3-2 는 원장님이 직접 읽어 주신 값과 **완전히 일치**함을 확인했다(눈금).
 *
 * ⚠️ 2-2 의 `781~820` 은 그 표기가 PDF 에 **아예 없어** 자동 추출이 못 봤다. 판정기가
 *    그 자리를 「놓친 후보」로 신고했고(범위 표기가 연달아 나오며 본책 쪽이 건너뛴다),
 *    원장님이 값을 주셨다. **판정기가 «못 본 것»을 스스로 신고하지 않았으면 그 단원
 *    문항이 조용히 남았을 것이다.**
 *
 * ## 무엇을 잃나 (D-20 — 지우기 전에 센다)
 *
 * 1,351건. 이 삭제로 **출제 가능 문항이 0건이 되는 단원이 16개**다(원장님 확정:
 * 「중등 문제 엔진이 있으니 충분히 출제 가능」). 스크립트가 실행 때마다 이 수를 다시
 * 세어 찍는다 — 데이터가 바뀌면 숫자도 바뀌어야 하기 때문이다.
 *
 * ## 되돌리기
 *
 * 삭제는 되돌릴 수 없으므로 **행 전체(모든 컬럼)** 를 gzip 원장에 남긴다. `--revert` 가
 * 그대로 다시 넣는다. 그림 파일은 디스크에 그대로 두므로 복원하면 다시 붙는다.
 *
 * ⚠️ `test_problem`·`problem_answer` 는 `ON DELETE RESTRICT` 다 — **이미 시험지에 쓰인
 *    문항은 DB 가 삭제를 거부한다.** 조용히 과거 시험지가 망가지지 않는다. 그런 문항은
 *    건너뛰고 **몇 건인지 반드시 찍는다**(조용히 빠지면 「전부 지웠다」로 읽힌다).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.env.ALLOW_RPM_TEXTBOOK_DELETE === "1";
const MODE = process.argv.includes("--revert")
  ? "revert"
  : process.argv.includes("--apply")
    ? "apply"
    : "dryrun";

const SECTIONS = join(process.cwd(), "scripts/rpm/data/textbook-sections.json");
const LEDGER = join(
  process.cwd(),
  "scripts/rpm/ledgers/textbook-problems-deleted-2026-08-24.json.gz",
);

async function targets() {
  const spec = JSON.parse(readFileSync(SECTIONS, "utf8")) as Record<
    string,
    [number, number][] | string
  >;
  const out: { examId: string; ids: string[] }[] = [];
  for (const [examId, ranges] of Object.entries(spec)) {
    if (examId.startsWith("_") || !Array.isArray(ranges)) continue;
    const rows = await prisma.problem.findMany({
      where: {
        examId,
        OR: ranges.map(([a, b]) => ({ questionNumber: { gte: a, lte: b } })),
      },
      select: { id: true },
    });
    out.push({ examId, ids: rows.map((r) => r.id) });
  }
  return out;
}

async function main() {
  console.log(
    `RPM 교과서문제 정복하기 삭제 — 모드: ${MODE}${APPLY ? "" : " (가드 미설정)"}\n`,
  );

  if (MODE === "revert") {
    if (!existsSync(LEDGER)) throw new Error("되돌릴 원장이 없다");
    const rows = JSON.parse(
      gunzipSync(readFileSync(LEDGER)).toString("utf8"),
    ) as { rows: Record<string, unknown>[] };
    let back = 0,
      skipped = 0;
    for (const r of rows.rows) {
      const exists = await prisma.problem.findUnique({
        where: { id: r.id as string },
        select: { id: true },
      });
      if (exists) {
        skipped++;
        continue; // 이미 있으면 건드리지 않는다
      }
      if (APPLY) {
        const data = { ...r } as Record<string, unknown>;
        for (const k of ["createdAt", "updatedAt"])
          if (data[k]) data[k] = new Date(data[k] as string);
        // 원장 1,336행은 **전부 `source=transformed`**(RPM 교재)이고 `school` 은 전량
        // NULL 이다. 삭제 전 `exam_question` 이 이 id 들을 가리킨 것도 **0건**이었다
        // (실측 2026-08-24). ⚠️ 그 근거는 «이 원장의 내용»이므로, 이 스크립트를
        // **기출을 담은 원장에 재사용하면 표시부터 다시 봐야 한다.**
        //
        // 되살릴 때는 원장의 행을 **그대로** 넣는다. 새 기출이 아니므로 편을 다시 짓지
        // 않는다(`syncExamMetadata` 는 편을 «지금 문항»으로 다시 지어 짝이 다른 편에 있는
        // 문항을 통째로 날린다). 링크는 아래에서 원장이 든 짝 그대로 되돌린다 —
        // 그 컬럼에는 FK 가 없어 **끊겨도 오류가 안 난다.**
        //
        // ⚠️ 표시는 호출 **바로 위**에 둔다. 감사기는 8줄(`MARKER_LOOKBACK`)만 거슬러
        // 보므로, 설명이 길어지면 표시가 그 밖으로 밀려 「판단불가」가 된다(실제로 났다).
        // exam-wiring: 되돌리기 — 아래에서 exam_question 링크를 원장대로 돌려놓는다
        await prisma.problem.create({ data: data as never });
      }
      back++;
    }
    // `exam_question.problem_id` 되살리기 — FK 가 없어 끊겨도 조용하다. 원장이 들고
    // 있는 짝을 그대로 되돌린다(문항이 실제로 되살아난 것만).
    const links =
      (rows as unknown as { examLinks?: { id: string; problemId: string }[] })
        .examLinks ?? [];
    let relinked = 0;
    for (const l of links) {
      const exists = await prisma.problem.findUnique({
        where: { id: l.problemId },
        select: { id: true },
      });
      if (!exists) continue;
      if (APPLY)
        await prisma.examQuestion.updateMany({
          where: { id: l.id, problemId: null },
          data: { problemId: l.problemId },
        });
      relinked++;
    }
    console.log(
      APPLY
        ? `되살림 ${back}건 · 이미 있어 건너뜀 ${skipped}건 · 편 링크 ${relinked}건`
        : `되살릴 것 ${back}건 · 이미 있어 건너뜀 ${skipped}건 · 편 링크 ${relinked}건 (드라이런)`,
    );
    return;
  }

  const groups = await targets();
  const allIds = groups.flatMap((g) => g.ids);
  console.log("책별 대상:");
  for (const g of groups) {
    const tot = await prisma.problem.count({ where: { examId: g.examId } });
    console.log(
      `  ${g.examId.padEnd(16)} 전체 ${String(tot).padStart(4)} → 대상 ${String(g.ids.length).padStart(4)}`,
    );
  }

  // RESTRICT 로 막히는 것 — **조용히 빠지지 않게 먼저 세어 찍는다.**
  const inTest = await prisma.testProblem.findMany({
    where: { problemId: { in: allIds } },
    select: { problemId: true },
  });
  const blocked = new Set(inTest.map((t) => t.problemId));
  const deletable = allIds.filter((id) => !blocked.has(id));
  console.log(
    `\n대상 ${allIds.length}건 · 시험지에 쓰여 못 지움 ${blocked.size}건 · 실제 삭제 ${deletable.length}건`,
  );

  // 무엇을 잃나 — 출제 가능 문항이 0 이 되는 단원 (D-20)
  const doomed = await prisma.problem.findMany({
    where: {
      id: { in: deletable },
      reviewStatus: "approved",
      directUseAllowed: true,
    },
    select: { unitId: true },
  });
  const lossByUnit: Record<string, number> = {};
  for (const d of doomed)
    lossByUnit[d.unitId] = (lossByUnit[d.unitId] ?? 0) + 1;
  let zero = 0;
  for (const [unitId, lost] of Object.entries(lossByUnit)) {
    const before = await prisma.problem.count({
      where: {
        unitId,
        reviewStatus: "approved",
        directUseAllowed: true,
        pool: "shared",
      },
    });
    if (before - lost <= 0) zero++;
  }
  console.log(
    `영향 단원 ${Object.keys(lossByUnit).length}개 · 그중 출제 가능 0건이 되는 단원 ${zero}개`,
  );

  if (!APPLY || MODE !== "apply") {
    console.log(
      "\n드라이런입니다. 실제 적용에는 ALLOW_RPM_TEXTBOOK_DELETE=1 ... --apply 가 필요합니다.",
    );
    return;
  }

  // ── 원장 먼저, DB 는 그 다음 ────────────────────────────────
  const rows = await prisma.problem.findMany({
    where: { id: { in: deletable } },
  });
  if (rows.length !== deletable.length)
    throw new Error(
      `원장 행수(${rows.length}) != 삭제 대상(${deletable.length}) — 중단`,
    );
  // ⚠️ **`exam_question.problem_id` 는 FK 가 없다 — 끊겨도 오류가 안 난다.**
  //    지우기 전에 짝을 원장에 적어 두지 않으면 되돌릴 수가 없다. 이번 대상(RPM 교재)은
  //    편에 안 들어가 실측 0건이었지만, **다음 실행이 다른 자료에 걸리면 끊긴다.**
  //    (`scripts/qa/audit-exam-wiring.ts` 가 이 자리를 잡아 줬다.)
  const examLinks = await prisma.examQuestion.findMany({
    where: { problemId: { in: deletable } },
    select: { id: true, problemId: true },
  });
  console.log(
    `편(exam_question) 링크 ${examLinks.length}건을 원장에 적고 끊는다`,
  );

  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    gzipSync(
      JSON.stringify({
        at: new Date().toISOString(),
        reason:
          "원장님 확정 2026-08-24 — RPM 교과서문제 정복하기 삭제. 되돌리려면 --revert.",
        blocked: [...blocked],
        examLinks,
        rows,
      }),
    ),
  );

  if (examLinks.length)
    await prisma.examQuestion.updateMany({
      where: { id: { in: examLinks.map((l) => l.id) } },
      data: { problemId: null },
    });
  console.log(`\n되돌리기 원장 → ${LEDGER} (${rows.length}행 전체 기록)`);

  let done = 0;
  for (let i = 0; i < deletable.length; i += 200) {
    const chunk = deletable.slice(i, i + 200);
    const r = await prisma.problem.deleteMany({ where: { id: { in: chunk } } });
    done += r.count;
  }
  console.log(`삭제 ${done}건`);

  const left = await prisma.problem.count({ where: { id: { in: allIds } } });
  console.log(
    left === blocked.size
      ? `✅ 남은 것은 시험지에 쓰인 ${left}건뿐이다`
      : `⚠️ 예상과 다르다 — 남은 것 ${left}건 (기대 ${blocked.size})`,
  );
  console.log(`전체 문항: ${await prisma.problem.count()}건`);
}

main()
  .catch((e) => {
    console.error("🔴", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
