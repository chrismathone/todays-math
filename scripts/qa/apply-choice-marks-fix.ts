/**
 * 지면이 **보기로 안 읽는** 표식 목록을 ①~⑤ 로 바꾼다 (D-80).
 *
 *   npx tsx scripts/qa/apply-choice-marks-fix.ts                      # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-marks-fix.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-marks-fix.ts --revert
 *
 * ## 원장님 확정 (2026-08-25) — 「보기번호는 바꾸고」
 *
 * `/dev/choice-marks` 에서 실물을 보시고 정하셨다. 엔진은 앞 커밋에서 고쳤고,
 * 이 스크립트는 **이미 DB 에 있는** 문항을 같은 모양으로 맞춘다.
 *
 * ## 🔴 무엇을 대상으로 삼나 — 표식 글자를 손으로 나열하지 않는다
 *
 * 「㉠㉡㉢ 이 있으면 바꾸자」로 고르지 않는다. 그러면 목록에 없는 표식(❶·ⓐ)은
 * 영영 0 이다. 대상은 **두 자가 어긋나는 자리**다:
 *   ㉠ `markListCount` — 줄머리가 둥근 표식인 줄 수
 *   ㉡ `choiceCountOf`  — **제품 파서**가 실제로 보기로 읽는 줄 수
 * 어긋나면 그 목록은 지면에서 보기 대접을 못 받는다. 그게 곧 결함이다.
 *
 * 바꿀 글자도 손으로 안 정한다 — **그 본문에 실제로 쓰인 표식**을 첫 등장 순서로
 * 모아 `CHOICE_MARKS` 의 같은 자리에 대응시킨다. 그래서 ❶ 목록도 그대로 처리된다.
 *
 * ## 🔴 못 가르면 손대지 않는다
 *
 * 표식 글자는 **다른 뜻으로도 쓰인다**(상자 이름표 `㉠ $6$, $-1$ / ㉡ …`). 그래서
 * 바꾸기 전에 값 검산을 걸고, 하나라도 못 넘으면 그 문항은 **안 건드리고 목록에
 * 남겨 보고한다**(못 가르는 것은 버리는 쪽 — CLAUDE.md 2026-08-18).
 *   ⑴ 바꾼 뒤 제품 파서가 **정확히 그 수**를 보기로 읽는가
 *   ⑵ 글자 수가 그대로인가 — 1:1 치환이므로 다른 것이 섞이면 길이가 달라진다
 *   ⑶ 옛 표식이 본문·해설에 **한 글자도 안 남았는가**
 *   ⑷ 새 표식이 바꾸기 **전에** 이미 있었으면 안 된다 (겹치면 뜻이 무너진다)
 *
 * ## 원장은 따로 둔다 — 되돌리기가 다르기 때문이다
 *
 * 이웃 둘(`apply-choose-all-fix.ts` 는 행을 새로 만들고, `apply-choice-count-fix.ts`
 * 는 본문에 한 줄을 덧붙인다)과 되돌리는 동작이 아예 다르다. 한 파일에 섞으면
 * 되돌리기가 행 모양을 보고 갈라져야 하고, 그게 사고가 나는 자리다.
 * **규율은 똑같다**: DB 보다 먼저 쓰고 · 누적만 하고 · 커밋되는지 스스로 확인하고
 * · 지금 값이 자기가 쓴 값일 때만 되돌린다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  CHOICE_MARKS,
  choiceCountOf,
  lineHeadMarks,
  markListCount,
} from "../../src/lib/problem/choiceCountRule";

const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "choice-marks-fix-ledger.json",
);

/** 일일테스트 기본 정원 · 확인테스트 정원 (D-20) — 이웃 잠금 스크립트와 같은 값. */
const DAILY = 8;
const REVIEW = 25;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

type LedgerRow = {
  problemId: string;
  problemCode: string;
  familyKey: string;
  unitId: string;
  /** 되돌리기가 읽는 값 — 바꾸기 **전** 본문·해설. */
  beforeContent: string;
  afterContent: string;
  beforeSolution: string | null;
  afterSolution: string | null;
  from: string;
  to: string;
};
type Ledger = { runs: { at: string; count: number }[]; rows: LedgerRow[] };

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
  solution: string | null;
  directUseAllowed: boolean;
};

/**
 * 🔴 **처리 대상 고르기** — 무리 필터를 **이 함수 안**에 둔다.
 *   ㉠ 출제 풀에 있는 것만
 *   ㉡ **줄머리 표식 목록이 있는 것만**
 *   ㉢ 그런데 **제품 파서가 그 수를 보기로 안 읽는 것**
 *
 * ㉢ 이 이 작업의 전부다. 표식 글자로 고르면 목록에 없는 표식이 안 보이고,
 * 개수로 고르면 ㉠ 다섯 줄이 «정상»으로 보인다 — 둘 다 눈이 먼다.
 */
export function pickMarkTargets<
  T extends { content: string; directUseAllowed: boolean },
>(rows: readonly T[]): { targets: T[]; family: T[] } {
  const family = rows.filter(
    (r) => r.directUseAllowed && markListCount(r.content) > 0,
  );
  const targets = family.filter(
    (r) => choiceCountOf(r.content) !== markListCount(r.content),
  );
  return { targets, family };
}

/**
 * 🔴 **바꿀 표식 짝을 본문에서 만든다** — 손 목록이 아니다.
 *
 * 줄머리에 실제로 쓰인 표식을 **첫 등장 순서**로 모아 `CHOICE_MARKS` 의 같은
 * 자리에 대응시킨다. 그래서 ❶❷❸ 목록도, 나중에 누가 쓸 다른 표식도 그대로 돈다.
 */
export function markMapOf(content: string): Map<string, string> | null {
  const seen: string[] = [];
  for (const ch of lineHeadMarks(content))
    if (!seen.includes(ch)) seen.push(ch);
  if (seen.length === 0 || seen.length > CHOICE_MARKS.length) return null;
  const map = new Map<string, string>();
  seen.forEach((ch, i) => map.set(ch, CHOICE_MARKS[i]!));
  return map;
}

export type Rewrite =
  | {
      ok: true;
      content: string;
      solution: string | null;
      from: string;
      to: string;
    }
  | { ok: false; why: string };

/**
 * 🔴 **값 검산이 붙은 치환.** 넷 중 하나라도 못 넘으면 안 바꾼다.
 *
 * 참이 제품에서 온다는 걱정은 여기서 없다 — 판정의 참은 **제품 파서가 몇 개를
 * 읽는가**라는 관측이고, 그 관측은 우리가 고치려는 값이 아니라 지면의 사실이다.
 */
export function rewriteMarks(
  content: string,
  solution: string | null,
): Rewrite {
  const map = markMapOf(content);
  if (!map) return { ok: false, why: "표식 목록을 못 만들었다" };
  const from = [...map.keys()];
  const to = from.map((c) => map.get(c)!);
  if (from.every((c, i) => c === to[i])) {
    return { ok: false, why: "이미 그 표식이다" };
  }
  // ⑷ 새 표식이 **이미** 본문에 있으면 겹쳐서 뜻이 무너진다.
  const collide = to.filter((c) => !from.includes(c) && content.includes(c));
  if (collide.length > 0) {
    return {
      ok: false,
      why: `새 표식 «${collide.join("")}» 이 이미 본문에 있다`,
    };
  }
  const swap = (s: string) => [...s].map((ch) => map.get(ch) ?? ch).join("");
  const nextContent = swap(content);
  const nextSolution = solution === null ? null : swap(solution);
  // ⑵ 1:1 치환이므로 글자 수가 그대로여야 한다.
  if (nextContent.length !== content.length) {
    return { ok: false, why: "치환으로 글자 수가 달라졌다" };
  }
  // ⑶ 옛 표식이 한 글자도 안 남아야 한다.
  const leftover = from.filter(
    (c) => nextContent.includes(c) || (nextSolution ?? "").includes(c),
  );
  if (leftover.length > 0) {
    return { ok: false, why: `옛 표식 «${leftover.join("")}» 이 남았다` };
  }
  // ⑴ 🔴 **제품 파서**가 이제 그 수를 보기로 읽는가.
  const listed = markListCount(nextContent);
  const read = choiceCountOf(nextContent);
  if (read !== listed) {
    return {
      ok: false,
      why: `바꿨는데 지면이 ${listed}줄 중 ${read}개만 읽는다`,
    };
  }
  return {
    ok: true,
    content: nextContent,
    solution: nextSolution,
    from: from.join(""),
    to: to.join(""),
  };
}

/** 🔴 **되돌릴까** — 지금 값이 자기가 쓴 것일 때만. */
export function shouldRevertMarks(
  row: { afterContent: string; afterSolution: string | null },
  now: { content: string; solution: string | null } | null,
): { ok: boolean; why?: string } {
  if (!now) return { ok: false, why: "문항이 없다" };
  if (now.content !== row.afterContent) {
    return { ok: false, why: "지금 본문이 내가 쓴 것이 아니다" };
  }
  if ((now.solution ?? null) !== (row.afterSolution ?? null)) {
    return { ok: false, why: "지금 해설이 내가 쓴 것이 아니다" };
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
      solution: true,
      directUseAllowed: true,
    },
  })) as Row[];

  const { targets, family } = pickMarkTargets(live);
  console.log(
    `출제 가능 ${live.length} · 줄머리 표식 목록이 있는 문항 ${family.length}` +
      `\n대상 «지면이 보기로 안 읽는 목록» → ${targets.length}건 · 그대로 둘 것 ${family.length - targets.length}건`,
  );
  if (targets.length + (family.length - targets.length) !== family.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
  if (targets.length === 0) {
    console.log("\n고칠 것이 없다.");
    return;
  }

  await reportLoss(targets);

  const made: { row: Row; r: Extract<Rewrite, { ok: true }> }[] = [];
  const left: { row: Row; why: string }[] = [];
  for (const row of targets) {
    const r = rewriteMarks(row.content, row.solution);
    if (!r.ok) {
      left.push({ row, why: r.why });
      continue;
    }
    // 정답에 표식이 섞여 있으면 «본문만» 바꾸는 것으로 짝이 깨진다 — 안 건드린다.
    if ([...r.from].some((c) => row.answer.includes(c))) {
      left.push({ row, why: "정답에 옛 표식이 들어 있다 — 짝이 깨질 수 있다" });
      continue;
    }
    made.push({ row, r });
  }
  if (made.length + left.length !== targets.length) {
    throw new Error("만들기에서 분모가 안 맞는다 — 멈춘다");
  }

  console.log(`\n=== 바꿀 수 있는 문항 ${made.length}건 ===`);
  for (const m of made) {
    console.log(
      `\n  ${m.row.problemCode}  ${m.row.familyKey}` +
        `\n    ${m.r.from} → ${m.r.to}   (보기 ${markListCount(m.r.content)}개를 지면이 ${choiceCountOf(m.r.content)}개로 읽는다)` +
        `\n    정답 «${m.row.answer}» 는 그대로다`,
    );
  }
  console.log(`\n=== 🔴 안 건드리는 문항 ${left.length}건 ===`);
  if (left.length === 0) console.log("  (없다)");
  for (const l of left) {
    console.log(`  ${l.row.problemCode}  ${l.row.familyKey}  — ${l.why}`);
  }

  if (!APPLY) {
    console.log(
      `\n드라이런이다. 실제로 바꾸려면:` +
        `\n  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choice-marks-fix.ts --apply`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  }
  if (made.length === 0) {
    console.log("\n바꿀 수 있는 것이 없다 — 아무것도 안 바꾼다.");
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
      afterContent: m.r.content,
      beforeSolution: first ? first.beforeSolution : m.row.solution,
      afterSolution: m.r.solution,
      from: m.r.from,
      to: m.r.to,
    });
    // 🔴 **원장이 DB 보다 먼저다.**
    saveLedger({ ...led, rows: [...byId.values()] }, prevCount);
    await prisma.problem.update({
      where: { id: m.row.id },
      data: { content: m.r.content, solution: m.r.solution },
    });
    console.log(`  ${m.row.problemCode} ← ${m.r.from} → ${m.r.to}`);
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
    select: { problemCode: true, content: true, answer: true, solution: true },
  });
  if (back.length !== made.length) {
    throw new Error(`되읽은 행이 ${back.length}/${made.length} 다 — 멈춘다`);
  }
  const bad: string[] = [];
  for (const b of back) {
    const m = made.find((x) => x.row.problemCode === b.problemCode)!;
    if (choiceCountOf(b.content) !== markListCount(b.content)) {
      bad.push(`${b.problemCode} 지면이 아직 보기로 안 읽는다`);
    }
    if (b.answer !== m.row.answer) bad.push(`${b.problemCode} 정답이 바뀌었다`);
    if (b.content.length !== m.row.content.length) {
      bad.push(`${b.problemCode} 글자 수가 달라졌다`);
    }
    if ([...m.r.from].some((c) => b.content.includes(c))) {
      bad.push(`${b.problemCode} 옛 표식이 남았다`);
    }
  }
  if (bad.length > 0) {
    console.log(`\n🔴 ${bad.length}건이 요청한 상태가 **아니다** — 되돌려라.`);
    for (const x of bad) console.log(`   · ${x}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n✅ ${back.length}건 — 지면이 보기로 읽는다 · 정답 그대로 · 글자 수 그대로`,
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
    `     ⚠️ 이 작업은 **표식 글자만** 바꾼다 — 문항이 풀에서 빠지지 않는다.` +
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
      select: { content: true, solution: true },
    });
    const verdict = shouldRevertMarks(r, now);
    if (!verdict.ok) {
      console.log(`  건너뜀 ${r.problemCode} — ${verdict.why}`);
      skipped += 1;
      continue;
    }
    await prisma.problem.update({
      where: { id: r.problemId },
      data: { content: r.beforeContent, solution: r.beforeSolution },
    });
    done += 1;
  }
  console.log(`되돌림 ${done} · 건너뜀 ${skipped} / ${led.rows.length}`);
  if (done + skipped !== led.rows.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
}

if (process.argv[1]?.includes("apply-choice-marks-fix")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
}
