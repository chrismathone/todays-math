/**
 * 보기가 **다섯이 아닌** 문항에 「정답을 방해하지 않는 5번 보기」를 보탠다 (D-80).
 *
 *   npx tsx scripts/qa/apply-choice-count-fix.ts                      # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-count-fix.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-count-fix.ts --revert
 *
 * ## 원장님 확정 (2026-08-25)
 *
 * *「일부 4지선다 문항들이 있는데 전부 삭제후 5지선다로 교체. 혹은 **정답을 방해하지
 * 않는 5번 보기 생성**」* → **보태는 쪽을 우선**한다. 문항을 잃지 않고 해설·정답·
 * 출처·문항 코드가 **전부 그대로 남는다.**
 *
 * ## 🔴 못 가르면 손대지 않는다
 *
 * 보탠 보기가 **또 하나의 정답이 되면** 그 문항은 조용히 망가진다 — 지면은 멀쩡하고
 * KaTeX 도 초록이고 아무도 신고하지 않는다. 그래서 규칙마다 **값 검산**이 붙어 있고
 * (`fifthChoiceRules.ts`), 검산을 못 하거나 통과 못 하면 그 문항은 **안 건드리고
 * 목록에 남겨 보고한다.** 그 목록이 「삭제·재생성으로 가야 할 유형」이다.
 *
 * ## 원장은 따로 둔다 — 되돌리기가 다르기 때문이다
 *
 * 「모두 고르시오」 쪽(`apply-choose-all-fix.ts`)은 **행을 하나 더 만들고 원본을
 * 출제에서 뺀다.** 이쪽은 **본문 한 줄을 덧붙일 뿐**이다. 되돌리는 동작이 아예 다르므로
 * 한 파일에 섞으면 되돌리기가 행 모양을 보고 갈라져야 한다 — 그게 사고가 나는 자리다.
 * **규율은 똑같이 지킨다**: DB 보다 먼저 쓰고 · 누적만 하고 · 커밋되는지 스스로 확인하고
 * · 지금 값이 자기가 쓴 값일 때만 되돌린다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  anyChoiceCount,
  CHOICE_COUNT,
} from "../../src/lib/problem/choiceCountRule";

import { addFifthChoice } from "./fifthChoiceRules";

const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "choice-count-fix-ledger.json",
);

/** 일일테스트 기본 정원 · 확인테스트 정원 (D-20) — 다른 잠금 스크립트와 같은 값. */
const DAILY = 8;
const REVIEW = 25;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

type LedgerRow = {
  problemId: string;
  problemCode: string;
  familyKey: string;
  unitId: string;
  /** 되돌리기가 읽는 유일한 값 — 덧붙이기 **전** 본문. */
  beforeContent: string;
  afterContent: string;
  added: string;
  why: string;
};
type Ledger = {
  runs: { at: string; count: number }[];
  rows: LedgerRow[];
};

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf-8")) as Ledger;
}

/** 🔴 **줄면 멈춘다** — 통째로 쓰면 앞 회차를 되돌릴 수 없다(2026-08-20 사고). */
function saveLedger(led: Ledger, prevRowCount: number): void {
  if (led.rows.length < prevRowCount) {
    throw new Error(
      `원장 행이 ${prevRowCount} → ${led.rows.length} 로 **줄었다**. 멈춘다.`,
    );
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(led, null, 2), "utf-8");
}

/**
 * 🔴 원장이 정말 커밋되는지 **스스로** 확인한다.
 * ⚠️ `git check-ignore **-v**` 는 부정 규칙(`!`)이 맞아도 종료 코드 0 이다(실측
 *    2026-08-25). 「무시되는가」는 `--quiet` 로 물어야 한다.
 */
function assertLedgerIsCommittable(): void {
  const rel = path.relative(REPO, LEDGER).split(path.sep).join("/");
  let ignored: boolean;
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", rel], { cwd: REPO });
    ignored = true;
  } catch {
    ignored = false;
  }
  if (ignored) {
    throw new Error(
      `되돌리기 원장이 .gitignore 에 걸려 있다: ${rel}\n` +
        `  커밋이 안 되면 이 컴퓨터 말고는 아무도 되돌릴 수 없다 — 예외를 먼저 넣어라.`,
    );
  }
  console.log(`원장이 커밋된다: ${rel} ✔`);
}

type Row = {
  id: string;
  problemCode: string;
  familyKey: string | null;
  unitId: string;
  content: string;
  answer: string;
  directUseAllowed: boolean;
};

/**
 * 🔴 **처리 대상 고르기** — 무리 필터를 **이 함수 안**에 둔다.
 *   ㉠ 출제 풀에 있는 것만  ㉡ **지면에 보기가 그려지는 것만**  ㉢ 그 수가 다섯이 아닌 것
 *
 * ㉡ 을 `question_type` 이나 «정답 모양» 으로 가르지 않는다 — 그러면 원장님이
 *    지목하신 `J30401-A04-002`(보기 넷·정답이 계수)가 **안 보인다**(D-80 머리말).
 */
export function pickChoiceCountTargets<
  T extends { content: string; directUseAllowed: boolean },
>(rows: readonly T[]): { targets: T[]; family: T[] } {
  const family = rows.filter(
    (r) => r.directUseAllowed && anyChoiceCount(r.content) > 0,
  );
  const targets = family.filter(
    (r) => anyChoiceCount(r.content) !== CHOICE_COUNT,
  );
  return { targets, family };
}

/** 🔴 **되돌릴까** — 지금 본문이 자기가 쓴 값일 때만. */
export function shouldRevertContent(
  row: { afterContent: string },
  now: { content: string } | null,
): { ok: boolean; why?: string } {
  if (!now) return { ok: false, why: "문항이 없다" };
  if (now.content !== row.afterContent) {
    return { ok: false, why: "지금 본문이 내가 쓴 것이 아니다" };
  }
  return { ok: true };
}

async function main() {
  if (REVERT) return revert();

  const live = (await prisma.problem.findMany({
    where: { directUseAllowed: true },
    select: {
      id: true,
      problemCode: true,
      familyKey: true,
      unitId: true,
      content: true,
      answer: true,
      directUseAllowed: true,
    },
  })) as Row[];

  const { targets, family } = pickChoiceCountTargets(live);
  const dist = new Map<number, number>();
  for (const r of family) {
    const n = anyChoiceCount(r.content);
    dist.set(n, (dist.get(n) ?? 0) + 1);
  }
  console.log(
    `출제 가능 ${live.length} · 지면에 보기가 있는 문항 ${family.length}` +
      `\n  보기 개수 분포: ` +
      [...dist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, c]) => `${n}개 ${c}`)
        .join(" · "),
  );
  console.log(
    `\n대상 «보기가 ${CHOICE_COUNT}개가 아닌 것» → ${targets.length}건 · 그대로 둘 것 ${family.length - targets.length}건`,
  );
  if (targets.length + (family.length - targets.length) !== family.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
  if (targets.length === 0) {
    console.log("\n고칠 것이 없다.");
    return;
  }

  // ── D-20 — 무엇을 잃는가 ──────────────────────────────────────────
  await reportLoss(targets);

  // ── 5번 보기를 만들어 본다 (DB 를 건드리기 전에) ────────────────────
  const made: { row: Row; content: string; added: string; why: string }[] = [];
  const left: { row: Row; why: string }[] = [];
  for (const r of targets) {
    const res = addFifthChoice(
      String(r.familyKey),
      r.content,
      r.answer,
      r.problemCode,
    );
    if (!res.ok) {
      left.push({ row: r, why: res.why });
      continue;
    }
    // 보탠 뒤 지면이 정말 다섯을 그리는지 **제품 파서로** 다시 본다.
    if (anyChoiceCount(res.content) !== CHOICE_COUNT) {
      left.push({
        row: r,
        why: `보탰는데 지면이 ${anyChoiceCount(res.content)}개로 읽는다`,
      });
      continue;
    }
    made.push({ row: r, content: res.content, added: res.added, why: res.why });
  }
  if (made.length + left.length !== targets.length) {
    throw new Error("만들기에서 분모가 안 맞는다 — 멈춘다");
  }

  console.log(`\n=== 5번 보기를 보탤 수 있는 문항 ${made.length}건 ===`);
  for (const m of made) {
    console.log(
      `\n  ${m.row.problemCode}  ${m.row.familyKey}` +
        `\n    보탬: ${m.added}   (${m.why})` +
        `\n    정답 «${m.row.answer}» 는 그대로다`,
    );
  }
  console.log(
    `\n=== 🔴 안 건드리는 문항 ${left.length}건 — 삭제·재생성으로 가야 한다 ===`,
  );
  for (const l of left) {
    console.log(`  ${l.row.problemCode}  ${l.row.familyKey}  — ${l.why}`);
  }

  if (!APPLY) {
    console.log(
      `\n드라이런이다. 실제로 바꾸려면:` +
        `\n  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-count-fix.ts --apply`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  }
  if (made.length === 0) {
    console.log("\n보탤 수 있는 것이 없다 — 아무것도 안 바꾼다.");
    return;
  }

  assertLedgerIsCommittable();

  const led = readLedger();
  const prevCount = led.rows.length;
  const byId = new Map(led.rows.map((r) => [r.problemId, r]));
  for (const m of made) {
    const first = byId.get(m.row.id);
    byId.set(m.row.id, {
      problemId: m.row.id,
      problemCode: m.row.problemCode,
      familyKey: String(m.row.familyKey),
      unitId: m.row.unitId,
      // 두 회차에 걸리면 **처음의 before** 를 남긴다.
      beforeContent: first ? first.beforeContent : m.row.content,
      afterContent: m.content,
      added: m.added,
      why: m.why,
    });
    saveLedger({ ...led, rows: [...byId.values()] }, prevCount);
    await prisma.problem.update({
      where: { id: m.row.id },
      data: { content: m.content },
    });
    console.log(`  ${m.row.problemCode} ← ${m.added}`);
  }
  saveLedger(
    {
      runs: [...led.runs, { at: new Date().toISOString(), count: made.length }],
      rows: [...byId.values()],
    },
    prevCount,
  );
  console.log(`\n원장 ${LEDGER}`);

  // ── 되읽어 확인한다 ───────────────────────────────────────────────
  const back = await prisma.problem.findMany({
    where: { id: { in: made.map((m) => m.row.id) } },
    select: { problemCode: true, content: true, answer: true },
  });
  if (back.length !== made.length) {
    throw new Error(`되읽은 행이 ${back.length}/${made.length} 다 — 멈춘다`);
  }
  const bad: string[] = [];
  for (const b of back) {
    const m = made.find((x) => x.row.problemCode === b.problemCode)!;
    if (anyChoiceCount(b.content) !== CHOICE_COUNT) {
      bad.push(`${b.problemCode} 보기가 ${anyChoiceCount(b.content)}개`);
    }
    if (b.answer !== m.row.answer) bad.push(`${b.problemCode} 정답이 바뀌었다`);
    if (!b.content.startsWith(m.row.content)) {
      bad.push(`${b.problemCode} 본문이 «덧붙이기» 가 아니다`);
    }
  }
  if (bad.length > 0) {
    console.log(`\n🔴 ${bad.length}건이 요청한 상태가 **아니다** — 되돌려라.`);
    for (const x of bad) console.log(`   · ${x}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n✅ ${back.length}건 — 보기 ${CHOICE_COUNT}개 · 정답 그대로 · 본문은 **덧붙이기만** 됐다`,
  );
}

async function reportLoss(targets: Row[]): Promise<void> {
  const unitIds = [...new Set(targets.map((t) => t.unitId))];
  const units = await prisma.unit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const name = new Map(
    units.map((u) => [u.id, `${u.grade} ${u.chapter} > ${u.section}`]),
  );
  console.log(`\n  [D-20 — 무엇을 잃는가]`);
  console.log(
    `     ⚠️ 이 작업은 본문에 **한 줄을 덧붙일 뿐**이다 — 문항이 풀에서 빠지지 않는다.` +
      `\n        그래도 단원별로 센다: 「아무것도 안 잃는다」를 **말이 아니라 숫자**로 남긴다.`,
  );
  console.log(`\n  | 단원 | 출제 가능 | 손대는 것 | 남는 수 |`);
  console.log(`  | --- | ---: | ---: | ---: |`);
  const under: string[] = [];
  for (const id of unitIds) {
    const pool = await prisma.problem.count({
      where: {
        unitId: id,
        pool: "shared",
        reviewStatus: "approved",
        directUseAllowed: true,
      },
    });
    const n = targets.filter((t) => t.unitId === id).length;
    console.log(`  | ${name.get(id) ?? id} | ${pool} | ${n} | ${pool} |`);
    if (pool < REVIEW) under.push(`${name.get(id) ?? id} — 풀 ${pool}`);
  }
  console.log(
    `     일일테스트 정원(${DAILY}) 아래로 내려가는 단원   0개` +
      `\n     확인테스트 정원(${REVIEW}) 아래로 내려가는 단원  0개  (문항이 안 빠진다)`,
  );
  if (under.length > 0) {
    console.log(
      `     (참고 — 손대기 전부터 확인테스트 정원 아래인 단원: ${under.join(" · ")})`,
    );
  }
}

async function revert() {
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  }
  const led = readLedger();
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  let done = 0;
  let skipped = 0;
  for (const r of led.rows) {
    const now = await prisma.problem.findUnique({
      where: { id: r.problemId },
      select: { content: true },
    });
    const verdict = shouldRevertContent(r, now);
    if (!verdict.ok) {
      console.log(`  건너뜀 ${r.problemCode} — ${verdict.why}`);
      skipped += 1;
      continue;
    }
    await prisma.problem.update({
      where: { id: r.problemId },
      data: { content: r.beforeContent },
    });
    done += 1;
  }
  console.log(`되돌림 ${done} · 건너뜀 ${skipped} / ${led.rows.length}`);
  if (done + skipped !== led.rows.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
}

if (process.argv[1]?.includes("apply-choice-count-fix")) {
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
