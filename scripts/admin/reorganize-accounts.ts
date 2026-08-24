/**
 * 계정 재편 — 원장님 확정 2026-08-24.
 *
 *   npx tsx scripts/admin/reorganize-accounts.ts                    # 드라이런(기본)
 *   ALLOW_ACCOUNT_REORG=1 npx tsx scripts/admin/reorganize-accounts.ts --apply
 *   ALLOW_ACCOUNT_REORG=1 npx tsx scripts/admin/reorganize-accounts.ts --revert
 *
 * 무엇을 하나
 *   ① 찌꺼기 계정 4개 삭제 (smoke 테스트가 남긴 것)
 *   ② test_o@osu.com(원장·director) · test_c@osu.com(검수·reviewer) 생성
 *   ③ import@todays-math.local → test_m@osu.com 으로 **이름만** 변경
 *   ④ 전 계정 비밀번호를 1234@@@@ 로 통일
 *
 * ⚠️ **왜 삭제가 위험한가 — 실측으로 확인한 것.** Postgres 에 이렇게 걸려 있다:
 *      problem.user_id → user  ON DELETE CASCADE   (문항 47,006)
 *      class.user_id   → user  ON DELETE CASCADE   (반 63 → 학생 195 → 진도 13,710)
 *      test.user_id    → user  ON DELETE CASCADE
 *    즉 **계정 행 하나를 지우면 DB 가 알아서 딸린 것을 전부 지운다.** 앱을 안 거친다.
 *    그래서 이 스크립트는 지우기 **전에 무엇을 잃는지 세고**, 실데이터를 가진 계정
 *    (test_t · import@)은 **아예 삭제 목록에 못 들어가게 막는다**(D-20).
 *
 * ⚠️ **import@ 는 지우는 게 아니라 이름만 바꾼다.** 같은 행을 UPDATE 하므로 `user_id` 가
 *    그대로여서 문항 47,006개는 미동도 없다. 지웠다가 다시 만들면 **id 가 바뀌어 전부 날아간다.**
 *
 * 되돌리기 원장은 `scripts/admin/ledgers/` 에 **추가만** 한다(덮어쓰면 앞 회차를 못 되돌린다,
 * 2026-08-20 교훈).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.env.ALLOW_ACCOUNT_REORG === "1";
const MODE = process.argv.includes("--revert")
  ? "revert"
  : process.argv.includes("--apply")
    ? "apply"
    : "dryrun";

const PASSWORD = "1234@@@@";
const LEDGER = join(
  process.cwd(),
  "scripts/admin/ledgers/account-reorg-2026-08-24.json",
);

/** 지워도 되는 찌꺼기 — smoke 테스트 산물. 손으로 적되 **실데이터가 있으면 멈춘다**(아래 가드). */
const JUNK = [
  "prodsmoke.1786926310@todaysmath.test",
  "prodsmoke.20260817@todaysmath.test",
  "smoke-reviewer@todaysmath.test",
  "smoke-f@todaysmath.test",
];

/** 절대 지우면 안 되는 계정 — 실데이터를 들고 있다. 목록이 잘못돼도 여기서 막힌다. */
const NEVER_DELETE = [
  "test_t@osu.com",
  "import@todays-math.local",
  "test_m@osu.com",
];

const RENAME = { from: "import@todays-math.local", to: "test_m@osu.com" };

const CREATE = [
  { email: "test_o@osu.com", name: "원장", role: "director" as const },
  { email: "test_c@osu.com", name: "검수", role: "reviewer" as const },
];

type Held = {
  classes: number;
  students: number;
  progress: number;
  tests: number;
  problems: number;
  predictionRuns: number;
};

async function heldBy(userId: string): Promise<Held> {
  const [classes, students, progress, tests, problems, predictionRuns] =
    await Promise.all([
      prisma.class.count({ where: { userId } }),
      prisma.student.count({ where: { class: { userId } } }),
      prisma.progress.count({ where: { class: { userId } } }),
      prisma.test.count({ where: { userId } }),
      prisma.problem.count({ where: { userId } }),
      prisma.predictionRun.count({ where: { userId } }),
    ]);
  return { classes, students, progress, tests, problems, predictionRuns };
}

const total = (h: Held) =>
  h.classes + h.students + h.progress + h.tests + h.problems + h.predictionRuns;

function describe(h: Held): string {
  const parts: string[] = [];
  if (h.classes) parts.push(`반 ${h.classes}`);
  if (h.students) parts.push(`학생 ${h.students}`);
  if (h.progress) parts.push(`진도 ${h.progress}`);
  if (h.tests) parts.push(`시험 ${h.tests}`);
  if (h.problems) parts.push(`문항 ${h.problems}`);
  if (h.predictionRuns) parts.push(`예측 ${h.predictionRuns}`);
  return parts.length ? parts.join(" · ") : "없음";
}

function appendLedger(entry: unknown) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  const prev = existsSync(LEDGER)
    ? (JSON.parse(readFileSync(LEDGER, "utf8")) as unknown[])
    : [];
  const next = [...prev, entry];
  // 원장은 **추가만** 한다 — 줄어들면 앞 회차를 못 되돌린다.
  if (next.length < prev.length) throw new Error("원장 행이 줄었다 — 중단");
  writeFileSync(LEDGER, JSON.stringify(next, null, 1), "utf8");
  console.log(`\n되돌리기 원장 → ${LEDGER} (누적 ${next.length}건)`);
}

async function main() {
  console.log(`계정 재편 — 모드: ${MODE}${APPLY ? "" : " (가드 미설정)"}\n`);

  if (MODE === "revert") {
    if (!existsSync(LEDGER)) throw new Error("되돌릴 원장이 없다");
    const entries = JSON.parse(readFileSync(LEDGER, "utf8")) as {
      renamed?: { id: string; from: string; to: string };
      created?: { id: string; email: string }[];
    }[];
    for (const e of [...entries].reverse()) {
      if (e.created) {
        for (const c of e.created) {
          // 지금 값이 **내가 쓴 그 값일 때만** 되돌린다(2026-08-18 교훈).
          const u = await prisma.user.findUnique({ where: { id: c.id } });
          if (u?.email === c.email) {
            const held = await heldBy(c.id);
            if (total(held) > 0) {
              console.log(
                `  건너뜀 ${c.email} — 그 사이 데이터가 생겼다(${describe(held)})`,
              );
              continue;
            }
            if (APPLY) await prisma.user.delete({ where: { id: c.id } });
            console.log(`  ${APPLY ? "삭제" : "삭제예정"} ${c.email}`);
          }
        }
      }
      if (e.renamed) {
        const u = await prisma.user.findUnique({ where: { id: e.renamed.id } });
        if (u?.email === e.renamed.to) {
          if (APPLY)
            await prisma.user.update({
              where: { id: e.renamed.id },
              data: { email: e.renamed.from },
            });
          console.log(
            `  ${APPLY ? "되돌림" : "되돌릴예정"} ${e.renamed.to} → ${e.renamed.from}`,
          );
        }
      }
    }
    console.log(
      "\n⚠️ 삭제된 찌꺼기 계정과 비밀번호는 되돌리지 않는다 — 원장에 남은 값으로 수동 복구해야 한다.",
    );
    if (!APPLY)
      console.log(
        "드라이런입니다. 실제 적용에는 ALLOW_ACCOUNT_REORG=1 이 필요합니다.",
      );
    return;
  }

  const before = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const byEmail = new Map(before.map((u) => [u.email, u]));

  // ── ① 삭제 대상 검증 — **무엇을 잃는지 먼저 센다** (D-20) ──────────────
  console.log("① 찌꺼기 계정 삭제 — 잃는 것:");
  const toDelete: { id: string; email: string; held: Held }[] = [];
  for (const email of JUNK) {
    if (NEVER_DELETE.includes(email))
      throw new Error(`삭제 목록에 보호 계정이 있다: ${email}`);
    const u = byEmail.get(email);
    if (!u) {
      console.log(`  (없음, 건너뜀) ${email}`);
      continue;
    }
    const held = await heldBy(u.id);
    console.log(`  ${email} → ${describe(held)}`);
    // 가드: 찌꺼기라기엔 너무 많으면 멈춘다. 목록이 틀렸을 수 있다.
    if (held.problems > 0 || held.classes > 5 || held.students > 5)
      throw new Error(
        `${email} 이 찌꺼기라기엔 많이 들고 있다(${describe(held)}) — 목록을 확인하라`,
      );
    toDelete.push({ id: u.id, email, held });
  }

  // ── ② 생성 ────────────────────────────────────────────────
  console.log("\n② 새 계정:");
  const created: { id: string; email: string }[] = [];
  const passwordHash = await hash(PASSWORD, 10);
  for (const c of CREATE) {
    const exists = byEmail.get(c.email);
    console.log(
      `  ${c.email} (${c.name}·${c.role}) — ${exists ? "이미 있음 → 비번만 통일" : "새로 만듦"}`,
    );
  }

  // ── ③ 이름 변경 ────────────────────────────────────────────
  const renameTarget = byEmail.get(RENAME.from);
  const renameDone = byEmail.get(RENAME.to);
  console.log("\n③ 이름 변경:");
  if (renameTarget) {
    const held = await heldBy(renameTarget.id);
    console.log(
      `  ${RENAME.from} → ${RENAME.to}  (그대로 들고 감: ${describe(held)})`,
    );
  } else if (renameDone) {
    console.log(`  이미 ${RENAME.to} 임 — 건너뜀`);
  } else {
    console.log(`  ⚠️ ${RENAME.from} 이 없다 — 건너뜀`);
  }

  console.log(`\n④ 전 계정 비밀번호를 ${PASSWORD} 로 통일`);

  if (!APPLY || MODE !== "apply") {
    console.log(
      "\n드라이런입니다. 실제 적용에는 ALLOW_ACCOUNT_REORG=1 ... --apply 가 필요합니다.",
    );
    return;
  }

  // ── 적용 ───────────────────────────────────────────────────
  const ledgerEntry = {
    at: new Date().toISOString(),
    reason:
      "원장님 확정 2026-08-24 — 계정 재편(test_s/t/o/c + test_m), 비밀번호 통일",
    deleted: toDelete.map((d) => ({ email: d.email, id: d.id, held: d.held })),
    created: [] as { id: string; email: string }[],
    renamed: null as null | { id: string; from: string; to: string },
    passwordUnified: [] as string[],
  };

  for (const d of toDelete) {
    await prisma.user.delete({ where: { id: d.id } });
    console.log(`  삭제됨 ${d.email}`);
  }

  for (const c of CREATE) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: { name: c.name, role: c.role, passwordHash, deletedAt: null },
      create: { email: c.email, name: c.name, role: c.role, passwordHash },
      select: { id: true, email: true },
    });
    if (!byEmail.has(c.email)) {
      created.push(u);
      ledgerEntry.created.push(u);
    }
    console.log(`  준비됨 ${c.email}`);
  }

  if (renameTarget) {
    await prisma.user.update({
      where: { id: renameTarget.id },
      data: { email: RENAME.to },
    });
    ledgerEntry.renamed = {
      id: renameTarget.id,
      from: RENAME.from,
      to: RENAME.to,
    };
    console.log(`  이름 바뀜 ${RENAME.from} → ${RENAME.to}`);
  }

  const all = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of all) {
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash },
    });
    ledgerEntry.passwordUnified.push(u.email);
  }
  console.log(`  비밀번호 통일 ${all.length}개 계정`);

  appendLedger(ledgerEntry);

  // ── 확인 ───────────────────────────────────────────────────
  const after = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n최종 계정:");
  for (const u of after) {
    const held = await heldBy(u.id);
    console.log(
      `  ${u.email.padEnd(26)} ${u.name ?? ""} ${u.role.padEnd(9)} ${describe(held)}`,
    );
  }
}

main()
  .catch((e) => {
    console.error("🔴", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
