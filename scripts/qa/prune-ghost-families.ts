/**
 * **유령 문항류 제거** — 문항이 하나도 없는 `problem_family` 행을 지운다.
 *
 *   npx tsx --env-file=.env scripts/qa/prune-ghost-families.ts                    # 드라이런
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/qa/prune-ghost-families.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/qa/prune-ghost-families.ts --revert --apply
 *
 * ## 왜
 *
 * 원장님 확정 2026-09-06: *「유령은 지워. 필요없는 유형이면 없는게 맞지」*.
 *
 * 유령은 **문항류가 아니다.** 개념축(D-120)에서 문항류는 「무엇을 묻는가」인데,
 * 문항이 0개면 묻는 것이 없다. 이것들은 적재기가 `familyKey` 를 안 줘서 트리거가
 * 문항마다 찍은 `solo:` + uuid 의 잔해이고(실측 **전량** 그렇다), 지금은 **A 번호만
 * 먹고 있다** — 기출 새 류가 A46 부터 시작한 이유다.
 *
 * ## 🔴 지우기 전에 반드시 세는 것 (D-20)
 *
 * ㉠ **잃는 문항 수.** 정의상 0이어야 한다. 0이 아니면 **멈춘다** — 「유령」 판정이
 *    틀린 것이고, 그때 지우면 살아 있는 문항의 무리가 사라진다.
 * ㉡ **그 코드가 살아 있는 문항에 «찍혀» 있는가.** 문항 코드는 한 번 붙으면 못 바꾼다.
 *    무리 행만 지우고 코드가 남으면 그 자리는 「무리는 없는데 코드는 있는」 구멍이 되고,
 *    2026-08-29 에 그 구멍이 적재를 6,438행에서 멈췄다. 지금 트리거
 *    (`20260829010000_family_take_avoids_stamped_codes`)는 «찬 자리»를
 *    「무리 행 ∪ 찍힌 코드」로 보므로 안전하지만, **여기서도 따로 세어 찍는다** —
 *    트리거를 믿는 것과 확인하는 것은 다른 일이다.
 *
 * ## 판정이 «아니오» 를 낼 수 있는가
 *
 * 지우기 **전에** 살아 있는 무리 하나를 골라 유령 판정에 대 본다. 그것이 유령으로
 * 나오면 판정이 눈이 먼 것이므로 **아무것도 안 지운다.** 「0건」이 «깨끗»인지
 * «못 셈»인지 갈라야 한다.
 *
 * ## 되돌리기
 *
 * `scripts/qa/reports/ghost-families-ledger.json` 에 지운 행을 **그대로** 적는다
 * (`unitId`·`familyKey`·`familyCode`·`nextSeq`·`createdAt`). 원장을 **DB 보다 먼저**
 * 쓴다 — 중간에 죽으면 되돌릴 수 없다(2026-08-29 교훈).
 * 그 파일은 `.gitignore` 예외로 **커밋된다** — 안 그러면 되돌리기가 이 컴퓨터에만
 * 남는다(2026-08-18 사고).
 *
 * ⚠️ 되살릴 때 `(unitId, familyCode)` 가 유일이라, 그 사이 다른 무리가 그 자리를
 *    가져갔으면 **실패한다.** 그게 맞다 — 조용히 다른 번호를 주면 문항 코드와 어긋난다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  throw new Error(
    "공유 DB 쓰기가 막혀 있다(D-31). ALLOW_SHARED_IMPORT=1 이 필요하다.",
  );
}

const LEDGER = join(
  process.cwd(),
  "scripts",
  "qa",
  "reports",
  "ghost-families-ledger.json",
);

const prisma = new PrismaClient();

interface GhostRow {
  unitId: string;
  familyKey: string;
  familyCode: string;
  nextSeq: number;
  createdAt: string;
  /** 사람이 읽을 자리 표시. 되살릴 때는 안 쓴다. */
  section: string;
}

/** 문항 코드에서 문항류 조각을 뽑는 열쇠. 트리거의 것과 **같은 정규식**이다. */
const CODE_KEY = "-([A-Z][0-9]{2})-[0-9]{3}$";

async function census(): Promise<{
  ghosts: GhostRow[];
  stampedGhosts: GhostRow[];
  liveFamilies: number;
}> {
  const fams = await prisma.problemFamily.findMany({
    select: {
      unitId: true,
      familyKey: true,
      familyCode: true,
      nextSeq: true,
      createdAt: true,
    },
  });
  const units = new Map(
    (await prisma.unit.findMany({ select: { id: true, section: true } })).map(
      (u) => [u.id, u.section],
    ),
  );
  const counted = (await prisma.$queryRawUnsafe(
    `SELECT "unit_id"::text AS unit, "family_key" AS key, COUNT(*)::int AS n
       FROM "problem" GROUP BY 1,2`,
  )) as { unit: string; key: string | null; n: number }[];
  const live = new Map<string, number>();
  for (const r of counted) if (r.key) live.set(`${r.unit}|${r.key}`, r.n);

  const stamped = (await prisma.$queryRawUnsafe(
    `SELECT "unit_id"::text AS unit,
            substring("problem_code" from '${CODE_KEY}') AS code,
            COUNT(*)::int AS n
       FROM "problem"
      WHERE "problem_code" ~ '${CODE_KEY}'
      GROUP BY 1,2`,
  )) as { unit: string; code: string; n: number }[];
  // 🔴 양성 대조 — 이 열쇠가 무엇이든 물기는 하는가. 0이면 「찍힌 코드 0」이
  //    «깨끗»이 아니라 «못 셈»이다.
  if (stamped.length === 0)
    throw new Error(
      "[중단] 문항 코드 열쇠가 아무것도 못 물었다 — 「찍힌 코드 없음」을 못 믿는다",
    );
  const stampedBy = new Map<string, number>();
  for (const s of stamped) stampedBy.set(`${s.unit}|${s.code}`, s.n);

  const ghosts: GhostRow[] = [];
  const stampedGhosts: GhostRow[] = [];
  let liveFamilies = 0;
  for (const f of fams) {
    if ((live.get(`${f.unitId}|${f.familyKey}`) ?? 0) > 0) {
      liveFamilies += 1;
      continue;
    }
    const row: GhostRow = {
      unitId: f.unitId,
      familyKey: f.familyKey,
      familyCode: f.familyCode,
      nextSeq: f.nextSeq,
      createdAt: f.createdAt.toISOString(),
      section: units.get(f.unitId) ?? "?",
    };
    ghosts.push(row);
    if ((stampedBy.get(`${f.unitId}|${f.familyCode}`) ?? 0) > 0)
      stampedGhosts.push(row);
  }

  // 🔴 음성 대조 — 살아 있는 무리가 유령으로 나오면 판정이 눈이 먼 것이다.
  if (liveFamilies === 0)
    throw new Error(
      "[중단] 살아 있는 무리를 하나도 못 찾았다 — 판정이 눈멀었다",
    );
  if (ghosts.length + liveFamilies !== fams.length)
    throw new Error(
      "[중단] 유령 + 살아 있는 무리 ≠ 무리 전량 — 셈이 안 맞는다",
    );

  return { ghosts, stampedGhosts, liveFamilies };
}

async function revert(): Promise<number> {
  if (!existsSync(LEDGER))
    throw new Error("[중단] 원장이 없다 — 되돌릴 것이 없다");
  const rows = JSON.parse(readFileSync(LEDGER, "utf-8")) as GhostRow[];
  console.log(`원장에 ${rows.length}행`);
  if (!APPLY) {
    console.log("드라이런 — --apply 를 붙여야 되살린다");
    return 0;
  }
  let back = 0;
  for (const r of rows) {
    const exists = await prisma.problemFamily.findUnique({
      where: { unitId_familyKey: { unitId: r.unitId, familyKey: r.familyKey } },
    });
    if (exists) continue; // 이미 되살아났다 — 멱등
    await prisma.problemFamily.create({
      data: {
        unitId: r.unitId,
        familyKey: r.familyKey,
        familyCode: r.familyCode,
        nextSeq: r.nextSeq,
        createdAt: new Date(r.createdAt),
      },
    });
    back += 1;
  }
  console.log(`되살린 무리 ${back} / ${rows.length}`);
  return 0;
}

async function main(): Promise<number> {
  if (REVERT) return revert();

  const { ghosts, stampedGhosts, liveFamilies } = await census();
  const bySection = new Map<string, number>();
  for (const g of ghosts)
    bySection.set(g.section, (bySection.get(g.section) ?? 0) + 1);

  console.log(`무리 전량        ${ghosts.length + liveFamilies}`);
  console.log(`  ├ 살아 있는     ${liveFamilies}`);
  console.log(`  └ 유령(문항 0)  ${ghosts.length}`);
  console.log(
    `유령 중 solo:uuid ${ghosts.filter((g) => g.familyKey.startsWith("solo:")).length}` +
      ` · 뜻있는 키 ${ghosts.filter((g) => !g.familyKey.startsWith("solo:")).length}`,
  );
  console.log(`\n🔴 잃는 문항 수: 0 (유령의 정의 — 아래에서 다시 확인한다)`);
  console.log(`영향 소단원 ${bySection.size}`);
  for (const [s, n] of [...bySection.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(3)}  ${s}`);
  if (stampedGhosts.length > 0) {
    console.log(
      `\n⚠️ 코드가 살아 있는 문항에 «찍힌» 유령 ${stampedGhosts.length}개 — ` +
        "지워도 트리거가 그 자리를 안 내주므로 A 번호는 안 비워진다",
    );
    for (const g of stampedGhosts.slice(0, 10))
      console.log(`  ${g.familyCode} ${g.section}`);
  }

  if (ghosts.length === 0) {
    console.log("\n지울 것이 없다.");
    return 0;
  }
  if (!APPLY) {
    console.log("\n드라이런이다 — 아무것도 안 지웠다. --apply 를 붙일 것");
    return 0;
  }

  // 🔴 원장을 **DB 보다 먼저** 쓴다. 중간에 죽으면 되돌릴 수 없다.
  //
  // ⚠️ **덮어쓰지 않는다.** 이 스크립트는 여러 회차를 돈다(기출을 되돌리면 그 무리들이
  //    다시 유령이 된다). 통째로 쓰면 `--revert` 는 이 파일 **하나만** 보므로 앞 회차가
  //    조용히 되돌릴 수 없게 된다 — 2026-08-20 에 SVG 채택 원장에서 겪은 그 자리다.
  //    쌓기만 하고, 줄어들면 멈춘다.
  mkdirSync(dirname(LEDGER), { recursive: true });
  const before: GhostRow[] = existsSync(LEDGER)
    ? (JSON.parse(readFileSync(LEDGER, "utf-8")) as GhostRow[])
    : [];
  const merged = new Map(before.map((r) => [`${r.unitId}|${r.familyKey}`, r]));
  for (const g of ghosts) {
    const k = `${g.unitId}|${g.familyKey}`;
    if (!merged.has(k)) merged.set(k, g); // 처음 본 것을 지킨다
  }
  const rows = [...merged.values()];
  if (rows.length < before.length)
    throw new Error(
      `[중단] 원장이 ${before.length} → ${rows.length} 로 줄었다 — 앞 회차를 잃는다`,
    );
  writeFileSync(LEDGER, JSON.stringify(rows, null, 2), "utf-8");
  console.log(
    `\n원장 기록 — 이번 ${ghosts.length}행 · 누적 ${rows.length}행 → ${LEDGER}`,
  );

  let gone = 0;
  for (const g of ghosts) {
    // 트랜잭션 안에서 **다시** 센다 — 원장을 쓴 뒤 다른 세션이 문항을 넣었을 수 있다.
    await prisma.$transaction(async (tx) => {
      const still = await tx.problem.count({
        where: { unitId: g.unitId, familyKey: g.familyKey },
      });
      if (still > 0) {
        console.log(
          `  ⛔ ${g.familyCode} ${g.section} — 그 사이 문항 ${still}개가 붙었다. 안 지운다`,
        );
        return;
      }
      await tx.problemFamily.delete({
        where: {
          unitId_familyKey: { unitId: g.unitId, familyKey: g.familyKey },
        },
      });
      gone += 1;
    });
  }
  console.log(`\n지운 무리 ${gone} / ${ghosts.length}`);

  const after = await census();
  console.log(
    `확인 — 남은 유령 ${after.ghosts.length} · 살아 있는 무리 ${after.liveFamilies}`,
  );
  if (after.liveFamilies !== liveFamilies)
    throw new Error(
      `[중단] 살아 있는 무리가 ${liveFamilies} → ${after.liveFamilies} 로 바뀌었다 — 살아 있는 것을 지웠다`,
    );
  return 0;
}

main()
  .then(async (code) => {
    await prisma.$disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(String(err).slice(0, 900));
    await prisma.$disconnect();
    process.exit(1);
  });
