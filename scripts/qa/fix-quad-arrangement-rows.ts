/**
 * **나간 3행의 발문에 배치를 적는다** — 틀(`m3Quad.ts`)을 고친 뒤의 뒷정리.
 *
 *   npx tsx scripts/qa/fix-quad-arrangement-rows.ts            # 미리보기 (DB 안 건드림)
 *   npx tsx scripts/qa/fix-quad-arrangement-rows.ts --apply    # 적용
 *   npx tsx scripts/qa/fix-quad-arrangement-rows.ts --revert   # 되돌리기
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * 생성기를 고쳐도 **이미 나간 행은 그대로다.** 틀은 멀쩡한데 원장님이 짚으신
 * `J30303-A08-002` 는 여전히 그림 없이 안 읽힌다.
 *
 * ── 이 스크립트가 지키는 것 ────────────────────────────────────────────────
 * ㉠ **무리 필터가 첫 가드다.** 두 갈래(`…|13`·`…|15`) 밖은 **쳐다보지도 않는다.**
 *    반증하려고 넓힌 모집단을 처리 대상으로 물려받으면 「43이 433」이 된다
 *    (CLAUDE.md 2026-08-18).
 * ㉡ **분모를 먼저 세어 찍는다.** 「고칠 것 + 건너뜀」이 갈래 전량과 안 맞으면 **멈춘다.**
 * ㉢ **수를 하나라도 잃으면 안 바꾼다.** 발문의 수 다중집합이 그대로여야 한다 —
 *    한글 닮음은 수가 빠져도 0.92 가 나온다(CLAUDE.md 2026-08-19).
 * ㉣ **판정이 실제로 바뀌어야 쓴다.** before 는 «배치미정», after 는 «배치확정».
 *    안 바뀌면 그 행은 건너뛴다(조용히 쓰지 않는다).
 * ㉤ **원장을 DB 보다 먼저 쓴다.** 그리고 `.gitignore` 에 `!` 예외를 걸어 두었다 —
 *    `scripts/qa/reports/*` 는 디렉터리를 통째로 무시하므로 안 걸면 **되돌리기가
 *    이 컴퓨터에만 남는다**(CLAUDE.md 2026-08-18에 실제로 났다).
 * ㉥ **원장은 누적한다.** 덮어쓰면 앞 회차를 되돌릴 수 없다(CLAUDE.md 2026-08-20).
 * ㉦ **되돌릴 때는 지금 값이 «내가 쓴 값» 일 때만** 되돌린다. 남이 그 사이 고쳤으면
 *    건드리지 않는다.
 *
 * ── 무엇을 잃는가 (D-20) ───────────────────────────────────────────────────
 * **아무것도 안 잠근다.** `directUseAllowed` 를 건드리지 않고 발문 글자만 는다.
 * 난이도 분포도 그대로다(심화 4행·응용 12행). 정답·해설은 **한 글자도 안 바꾼다** —
 * 해설은 이미 이 배치를 전제하고 있었고, 발문이 그것을 안 적었던 것이 결함이었다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { classifyArrangement } from "../../src/lib/figure/arrangementRule";

/** ㉠ 무리 — 이 밖은 쳐다보지 않는다. */
const FAMILIES = [
  "mid:3-1|이차방정식의 활용|13",
  "mid:3-1|이차방정식의 활용|15",
];

const LEDGER = "scripts/qa/reports/quad-arrangement-rows-ledger.json";

const CLAUSE = " (단, 점 $E$는 변 $AB$ 위에, 점 $F$는 변 $DC$ 위에 있다.)";

/**
 * 틀이 지금 내는 문구와 **똑같이** 고친다. 발명이 아니라 `m3Quad.ts` 를 옮겨 적는 것이다.
 * 여기 있는 낱말이 `m3Quad.ts` 와 갈라지면 다음 생성분과 나간 행이 서로 달라진다.
 */
const RULES: { why: string; apply: (c: string) => string | null }[] = [
  {
    why: "유형 13 mode 1 — 형제 mode 0 의 「십자 모양의」를 옮겨 적는다",
    apply: (c) =>
      c.includes("폭이 일정한 길을 만들려고 한다")
        ? c.replace(
            "폭이 일정한 길을 만들려고 한다",
            "폭이 일정한 십자 모양의 길을 만들려고 한다",
          )
        : null,
  },
  {
    why: "유형 13 mode 2 — 같은 「십자 모양의」",
    apply: (c) =>
      /인 길을 내었더니/.test(c) && !c.includes("십자")
        ? c.replace("인 길을 내었더니", "인 십자 모양의 길을 내었더니")
        : null,
  },
  {
    why: "유형 15 mode 0·1 — 점 E·F 의 자리를 적는다 (해설이 이미 전제하던 것)",
    apply: (c) =>
      c.includes("$BCFE$") && !c.includes("단, 점 $E$") ? c + CLAUSE : null,
  },
];

/** ㉢ 발문에 실린 수를 **종류가 아니라 그대로** 늘어놓는다. */
function numbers(s: string): string {
  return (s.match(/\d+/g) ?? []).join(",");
}

type LedgerRow = { code: string; before: string; after: string; why: string };

/** ㉥ 누적 — 처음 before · 마지막 after. 행이 줄면 부른 쪽이 멈춘다. */
function mergeLedger(old: LedgerRow[], fresh: LedgerRow[]): LedgerRow[] {
  const byCode = new Map(old.map((r) => [r.code, r]));
  for (const r of fresh) {
    const prev = byCode.get(r.code);
    byCode.set(r.code, prev ? { ...r, before: prev.before } : r);
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function readLedger(): LedgerRow[] {
  if (!existsSync(LEDGER)) return [];
  return JSON.parse(readFileSync(LEDGER, "utf8")).rows as LedgerRow[];
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const revert = args.includes("--revert");
  const prisma = new PrismaClient();

  if (revert) {
    const rows = readLedger();
    console.log(`원장 ${rows.length}행 — 되돌린다`);
    let done = 0;
    let skipped = 0;
    for (const r of rows) {
      const cur = await prisma.problem.findUnique({
        where: { problemCode: r.code },
        select: { content: true },
      });
      // ㉦ 지금 값이 «내가 쓴 값» 일 때만. 남이 고쳤으면 남의 것을 덮지 않는다.
      if (!cur || cur.content !== r.after) {
        console.log(`  건너뜀 ${r.code} — 지금 값이 내가 쓴 값이 아니다`);
        skipped += 1;
        continue;
      }
      await prisma.problem.update({
        where: { problemCode: r.code },
        data: { content: r.before },
      });
      done += 1;
    }
    console.log(`되돌림 ${done} · 건너뜀 ${skipped}`);
    await prisma.$disconnect();
    return;
  }

  // ㉠ 무리 필터가 첫 가드다.
  const all = await prisma.problem.findMany({
    where: { familyKey: { in: FAMILIES } },
    select: { problemCode: true, familyKey: true, content: true },
    orderBy: { problemCode: "asc" },
  });
  console.log(`── 분모 ── 두 갈래 전량 ${all.length}행`);

  const plan: LedgerRow[] = [];
  let alreadyOk = 0;
  const refused: string[] = [];

  for (const row of all) {
    const before = row.content;
    if (classifyArrangement(before) !== "배치미정") {
      alreadyOk += 1;
      continue;
    }
    let after: string | null = null;
    let why = "";
    for (const r of RULES) {
      const out = r.apply(before);
      if (out && out !== before) {
        after = out;
        why = r.why;
        break;
      }
    }
    if (!after) {
      refused.push(`${row.problemCode} — 규칙이 안 걸린다`);
      continue;
    }
    // ㉢ 수를 하나라도 잃으면 안 바꾼다.
    if (numbers(after) !== numbers(before)) {
      refused.push(`${row.problemCode} — 수가 달라진다`);
      continue;
    }
    // ㉣ 판정이 실제로 바뀌어야 쓴다.
    if (classifyArrangement(after) !== "배치확정") {
      refused.push(`${row.problemCode} — 고쳐도 «배치확정» 이 안 된다`);
      continue;
    }
    plan.push({ code: row.problemCode, before, after, why });
  }

  console.log(
    `   · 이미 배치를 적음 ${alreadyOk}\n` +
      `   · 고칠 것        ${plan.length}\n` +
      `   · 규칙이 거부    ${refused.length}`,
  );
  for (const r of refused) console.log(`     🔴 ${r}`);

  // ㉡ 분모가 안 맞으면 멈춘다.
  if (alreadyOk + plan.length + refused.length !== all.length) {
    console.error("🔴 분모가 안 맞는다 — 멈춘다.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  if (refused.length > 0) {
    console.error(
      "🔴 규칙이 거부한 행이 있다 — 눈으로 보고 규칙을 고쳐라. 멈춘다.",
    );
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  for (const r of plan) {
    console.log(`\n  ${r.code}  ← ${r.why}`);
    console.log(`    전: ${r.before}`);
    console.log(`    후: ${r.after}`);
  }

  if (!apply) {
    console.log("\n(미리보기다 — DB 를 안 건드렸다. 적용하려면 --apply)");
    await prisma.$disconnect();
    return;
  }

  // ㉤ 원장을 **DB 보다 먼저** 쓴다. ㉥ 누적한다.
  const merged = mergeLedger(readLedger(), plan);
  if (merged.length < readLedger().length) {
    console.error("🔴 누적 원장이 줄었다 — 멈춘다.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  mkdirSync("scripts/qa/reports", { recursive: true });
  writeFileSync(
    LEDGER,
    JSON.stringify(
      { 기준일: "2026-08-25", 무리: FAMILIES, rows: merged },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`\n원장 기록 ${merged.length}행 → ${LEDGER}`);

  let done = 0;
  for (const r of plan) {
    const res = await prisma.problem.updateMany({
      // 지금 값이 내가 본 그 값일 때만 쓴다 — 그 사이 남이 고쳤으면 건드리지 않는다.
      where: { problemCode: r.code, content: r.before },
      data: { content: r.after },
    });
    if (res.count === 1) done += 1;
    else console.log(`  건너뜀 ${r.code} — 그 사이 값이 바뀌었다`);
  }
  console.log(`적용 ${done}/${plan.length}행`);
  await prisma.$disconnect();
}

void main();
