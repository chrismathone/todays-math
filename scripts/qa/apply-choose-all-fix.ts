/**
 * 「모두 고르시오」인데 정답이 2개가 **아닌** 문항을 엔진으로 다시 만든다.
 *
 *   npx tsx scripts/qa/apply-choose-all-fix.ts                      # 드라이런(기본)
 *   npx tsx scripts/qa/apply-choose-all-fix.ts --min 2              # 해석 ㉡ (2개 이상 전부)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --revert
 *
 * 🔴 **원장님 확정 전에는 돌리지 마라.** 갈리는 것이 셋이고, 셋 다 결과가 다르다:
 *    ㉠ `--min 3`  정답이 **3개 이상**인 것만 (「2개로 한다」와 앞뒤가 맞는 읽기) — **기본값**
 *    ㉡ `--min 2`  정답이 **2개 이상**인 것 전부 (글자 그대로 — 이미 2개인 것도 다시 만든다)
 *    ㉢ `--mode replace`   제자리 교체 — **문항 코드가 그대로다**(`J20301-A01-001`) — **기본값**
 *    ㉣ `--mode recreate`  지우고 새로 넣는다 — **코드가 `-003` 으로 바뀐다**(되돌릴 수 없다)
 *
 * ## 왜 `replace` 가 기본인가
 * 문항 코드는 원장님이 문항을 **지목**하는 값이고(D-53), DB 트리거가 UPDATE 를 막아
 * **한 번 바뀌면 되돌릴 수 없다.** 지우고 넣으면 `problem_family.next_seq` 가 이미
 * 3이라 새 행은 `-003` 을 받는다 — 종이에 적힌 `-001` 이 아무것도 안 가리키게 된다.
 * 「같은 문제 라벨을 붙여」를 «같은 문항으로 남긴다»로 읽으면 제자리 교체가 그 뜻이다.
 *
 * ## 이 스크립트가 지키는 것 (CLAUDE.md 의 값비싼 교훈들)
 *  1. **처리용 모집단을 좁힌다** — `direct_use_allowed = true` **그리고** `isChooseAll`.
 *     발견기의 `--all`(반증용 45,374건) 산출물을 물려받지 않는다(2026-08-18: 43→433).
 *  2. **분모 검산** — 「고칠 것 + 건너뜀 == 대상」이 아니면 **멈춘다.**
 *  3. **무엇을 잃는가를 센다**(D-20) — 단원별 출제 가능 수의 전/후.
 *  4. **원장을 DB 보다 먼저** 쓰고 **누적만** 한다(줄면 멈춘다). 커밋되는지
 *     `git check-ignore -v` 로 확인할 것 — 2026-08-18·08-20 에 두 번 데인 자리다.
 *  5. **되돌리기는 자기가 쓴 값일 때만** 되돌린다 — 그 사이 남이 고쳤으면 안 건드린다.
 *  6. 쓰고 나서 **되읽어 확인한다** — 「넣었다」와 「앱이 볼 수 있다」는 다른 말이다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  chooseAllAnswerCount,
  CHOOSE_ALL_ANSWER_COUNT,
  isChooseAll,
} from "../../src/lib/problem/chooseAllRule";

const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "choose-all-fix-ledger.json",
);

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const numArg = (flag: string, dflt: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const strArg = (flag: string, dflt: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? dflt) : dflt;
};
/** 정답이 이 수 **이상**인 것을 고친다. 3 = 해석 ㉠ · 2 = 해석 ㉡. */
const MIN = numArg("--min", 3);
const MODE = strArg("--mode", "replace");
/** 씨앗 탐색의 출발점 — 이미 쓴 씨앗(20260826·20260927)과 겹치지 않게 멀리 둔다. */
const SEED0 = numArg("--seed", 20270101);

type LedgerRow = {
  problemId: string;
  problemCode: string;
  familyKey: string;
  mode: "replace" | "recreate";
  /** 바꾸기 **전** 값 — 되돌리기가 이것만 읽는다. */
  before: {
    content: string;
    answer: string;
    solution: string | null;
    externalId: string | null;
  };
  after: {
    content: string;
    answer: string;
    solution: string | null;
    externalId: string;
  };
  /** recreate 모드에서 새로 만든 행 (되돌릴 때 지운다). */
  createdId?: string;
};
type Ledger = {
  runs: { at: string; mode: string; min: number; count: number }[];
  rows: LedgerRow[];
};

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf-8")) as Ledger;
}

/**
 * 🔴 **누적만 한다.** 통째로 쓰면 앞 회차를 되돌릴 수 없다(2026-08-20 사고).
 * 행이 **줄면 멈춘다** — 줄어드는 것은 언제나 사고다.
 * 같은 문항이 두 회차에 걸리면 **처음의 before** 를 남긴다.
 */
function writeLedger(prev: Ledger, added: LedgerRow[], min: number): void {
  const byId = new Map(prev.rows.map((r) => [r.problemId, r]));
  for (const r of added) {
    const first = byId.get(r.problemId);
    byId.set(r.problemId, first ? { ...r, before: first.before } : r);
  }
  const rows = [...byId.values()];
  if (rows.length < prev.rows.length) {
    throw new Error(
      `원장 행이 ${prev.rows.length} → ${rows.length} 로 **줄었다**. 멈춘다.`,
    );
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    JSON.stringify(
      {
        runs: [
          ...prev.runs,
          {
            at: new Date().toISOString(),
            mode: MODE,
            min,
            count: added.length,
          },
        ],
        rows,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

/** `mid:2-1|연립일차방정식|01` → 엔진 유형 키 `2-1|연립일차방정식|01`. */
function engineKeyOf(familyKey: string): string | null {
  if (!familyKey.startsWith("mid:")) return null;
  return familyKey.slice("mid:".length);
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

async function main() {
  if (REVERT) return revert();

  // ── 1. 처리용 모집단 — **여기서 좁힌다** ──────────────────────────────
  const live = await prisma.problem.findMany({
    where: { directUseAllowed: true },
    select: {
      id: true,
      problemCode: true,
      familyKey: true,
      unitId: true,
      content: true,
      answer: true,
      solution: true,
      externalId: true,
      // recreate 가 새 행에 **그대로 옮겨 담을** 값들. 나중에 다시 물으면
      // 그 사이 원본이 지워졌을 수 있다 — 지우기 전에 손에 들고 있어야 한다.
      difficulty: true,
      problemType: true,
      questionType: true,
    },
  });
  const family = live.filter((p) => isChooseAll(p.content));
  console.log(
    `출제 가능 ${live.length} · 그중 「모두 고르시오」 ${family.length}건 (판정: isChooseAll)`,
  );
  const dist = new Map<number, number>();
  for (const p of family) {
    const n = chooseAllAnswerCount(p.answer);
    dist.set(n, (dist.get(n) ?? 0) + 1);
  }
  console.log(
    "  정답 개수 분포: " +
      [...dist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, c]) => `${n < 0 ? "판정불가" : `${n}개`} ${c}`)
        .join(" · "),
  );

  const targets = family.filter((p) => {
    const n = chooseAllAnswerCount(p.answer);
    return n < 0 || n >= MIN;
  });
  const skipped = family.length - targets.length;
  console.log(
    `\n해석 «정답 ${MIN}개 이상» → 고칠 것 ${targets.length} · 건너뜀 ${skipped}`,
  );
  // ── 2. 분모 검산 — 안 맞으면 멈춘다 ────────────────────────────────
  if (targets.length + skipped !== family.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }

  // ── 3. 무엇을 잃는가 (D-20) ────────────────────────────────────────
  const unitIds = [...new Set(targets.map((t) => t.unitId))];
  const units = await prisma.unit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, grade: true, section: true },
  });
  // 문항 **수**는 안 준다(하나 빼고 하나 넣는다). 잃는 것은 «그 문항 자체»와,
  // recreate 모드에서는 **문항 코드**다. 그래서 둘 다 찍는다 — 건수만 보면
  // 「아무것도 안 잃는다」로 읽힌다.
  console.log("\n=== 무엇을 잃는가 (D-20) ===");
  for (const u of units) {
    const pool = await prisma.problem.count({
      where: { unitId: u.id, directUseAllowed: true },
    });
    const n = targets.filter((t) => t.unitId === u.id).length;
    console.log(
      `  ${u.grade} ${u.section}: 출제 가능 ${pool}건 중 ${n}건을 다시 만든다 (총수는 그대로)`,
    );
  }
  if (MODE === "recreate") {
    console.log(
      `  🔴 recreate — 문항 코드 ${targets.length}개가 **영영 바뀐다**: ` +
        targets.map((t) => t.problemCode).join(", "),
    );
  }
  // FK 가 걸린 문항은 지울 수 없다 (`onDelete: Restrict`).
  const used = await prisma.problem.findMany({
    where: {
      id: { in: targets.map((t) => t.id) },
      OR: [{ testProblems: { some: {} } }, { problemAnswers: { some: {} } }],
    },
    select: { problemCode: true },
  });
  if (used.length > 0) {
    console.log(
      `\n⚠️ 시험지·응시 기록이 걸린 문항 ${used.length}건: ${used.map((u) => u.problemCode).join(", ")}`,
    );
    if (MODE === "recreate") {
      throw new Error(
        "recreate 모드는 이 문항들을 지울 수 없다(onDelete: Restrict) — replace 를 쓰거나 대상에서 빼라",
      );
    }
  }

  // ── 4. 대체 문항을 **먼저 만들어 검산한다** (DB 를 건드리기 전에) ─────
  const byFamilySeen = new Map<string, Set<string>>();
  for (const p of live) {
    const k = String(p.familyKey);
    const set = byFamilySeen.get(k) ?? new Set<string>();
    set.add(`${norm(p.content)}||${norm(p.answer)}`);
    byFamilySeen.set(k, set);
  }
  const registered = new Set(registeredTypes().map((t) => t.key));

  const made: {
    target: (typeof targets)[number];
    content: string;
    answer: string;
    solution: string;
    externalId: string;
  }[] = [];
  const unmade: string[] = [];

  for (const t of targets) {
    const key = engineKeyOf(String(t.familyKey));
    if (!key || !registered.has(key)) {
      unmade.push(`${t.problemCode} — 엔진 유형을 못 찾음 (${t.familyKey})`);
      continue;
    }
    let ok = false;
    for (let s = 0; s < 400 && !ok; s += 1) {
      const seed = SEED0 + s * 1009;
      const p = generateMiddleProblem(key, seed);
      if (chooseAllAnswerCount(p.answer) !== CHOOSE_ALL_ANSWER_COUNT) continue;
      const sig = `${norm(p.content)}||${norm(p.answer)}`;
      const seen = byFamilySeen.get(String(t.familyKey))!;
      if (seen.has(sig)) continue; // 같은 문항이 두 번 나오지 않게
      seen.add(sig);
      made.push({
        target: t,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        externalId: `engine-mid:${key}|s${seed}|v0`,
      });
      ok = true;
    }
    if (!ok) unmade.push(`${t.problemCode} — 씨앗 400개로 못 만듦`);
  }
  if (made.length + unmade.length !== targets.length) {
    throw new Error("만들기에서 분모가 안 맞는다 — 멈춘다");
  }
  if (unmade.length > 0) {
    console.log(`\n🔴 못 만든 것 ${unmade.length}건 —`);
    for (const u of unmade) console.log(`   · ${u}`);
    throw new Error("대체 문항을 다 못 만들면 아무것도 안 바꾼다 — 멈춘다");
  }

  console.log(`\n=== 대체 문항 ${made.length}건 (${MODE}) ===`);
  for (const m of made) {
    console.log(
      `\n  ${m.target.problemCode}  ${m.target.familyKey}` +
        `\n    전: ${norm(m.target.content).slice(0, 90)}  → «${m.target.answer}»` +
        `\n    후: ${norm(m.content).slice(0, 90)}  → «${m.answer}»`,
    );
  }

  if (!APPLY) {
    console.log(
      `\n드라이런이다. 실제로 바꾸려면:` +
        `\n  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --min ${MIN} --mode ${MODE} --apply` +
        `\n\n🔴 원장님 확정 전에는 돌리지 마라.`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  }
  if (MODE !== "replace" && MODE !== "recreate") {
    throw new Error(`--mode 는 replace 또는 recreate 다: ${MODE}`);
  }

  // ── 5. 원장을 **DB 보다 먼저** 쓴다 ────────────────────────────────
  const prev = readLedger();
  const rows: LedgerRow[] = made.map((m) => ({
    problemId: m.target.id,
    problemCode: m.target.problemCode,
    familyKey: String(m.target.familyKey),
    mode: MODE as "replace" | "recreate",
    before: {
      content: m.target.content,
      answer: m.target.answer,
      solution: m.target.solution,
      externalId: m.target.externalId,
    },
    after: {
      content: m.content,
      answer: m.answer,
      solution: m.solution,
      externalId: m.externalId,
    },
  }));
  writeLedger(prev, rows, MIN);
  console.log(`\n원장 먼저 씀: ${LEDGER} (${rows.length}행)`);

  // ── 6. DB ─────────────────────────────────────────────────────────
  if (MODE === "replace") {
    for (const m of made) {
      await prisma.problem.update({
        where: { id: m.target.id },
        data: {
          content: m.content,
          answer: m.answer,
          solution: m.solution,
          externalId: m.externalId,
        },
      });
    }
  } else {
    for (const m of made) {
      // exam-wiring: 기출아님 — 우리 중등 엔진이 낸 **자작** 문항이다(`source=manual`).
      // 대체 대상도 같은 엔진 산출물이라 원본 시험지(`Exam`)가 아예 없다 — 세울 편도,
      // 되돌릴 `exam_question` 링크도 없다. 실측으로 확인했다: 이 여덟 건은
      // `external_id` 가 전부 `engine-mid:…` 이고 `source_file`·`exam_id` 가 비어 있다.
      const created = await prisma.problem.create({
        data: {
          unitId: m.target.unitId,
          source: "manual",
          difficulty: m.target.difficulty,
          problemType: m.target.problemType,
          questionType: m.target.questionType,
          content: m.content,
          answer: m.answer,
          solution: m.solution,
          externalId: m.externalId,
          familyKey: String(m.target.familyKey),
          reviewStatus: "approved",
          directUseAllowed: true,
          pool: "shared",
          solutionSource: "none",
        },
        select: { id: true, problemCode: true },
      });
      await prisma.problem.delete({ where: { id: m.target.id } });
      const row = rows.find((r) => r.problemId === m.target.id)!;
      row.createdId = created.id;
      console.log(
        `  ${m.target.problemCode} → **${created.problemCode}** (코드가 바뀌었다)`,
      );
      // 한 건 넣고 지울 때마다 원장을 **바로** 갱신한다 — 중간에 죽어도
      // 「무엇을 새로 만들었나」가 남아야 되돌릴 수 있다.
      // ⚠️ 회차(`runs`)는 위에서 한 번만 적었다. 여기서는 `createdId` 만 덧쓴다.
      const cur = readLedger();
      cur.rows = cur.rows.map((r) =>
        r.problemId === row.problemId ? { ...r, createdId: created.id } : r,
      );
      writeFileSync(LEDGER, JSON.stringify(cur, null, 2), "utf-8");
    }
  }

  // ── 7. 되읽어 확인한다 ─────────────────────────────────────────────
  const backIds =
    MODE === "replace"
      ? rows.map((r) => r.problemId)
      : rows.map((r) => r.createdId!);
  const back = await prisma.problem.findMany({
    where: { id: { in: backIds } },
    select: {
      problemCode: true,
      content: true,
      answer: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
    },
  });
  const bad = back.filter(
    (p) =>
      !isChooseAll(p.content) ||
      chooseAllAnswerCount(p.answer) !== CHOOSE_ALL_ANSWER_COUNT ||
      p.pool !== "shared" ||
      p.reviewStatus !== "approved" ||
      !p.directUseAllowed,
  );
  if (back.length !== rows.length) {
    throw new Error(`되읽은 행이 ${back.length}/${rows.length} 다 — 멈춘다`);
  }
  if (bad.length > 0) {
    console.log(`\n🔴 ${bad.length}건이 요청한 상태가 **아니다** — 되돌려라.`);
    for (const p of bad) console.log(`   · ${p.problemCode} «${p.answer}»`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n✅ ${back.length}건 전부 정답 ${CHOOSE_ALL_ANSWER_COUNT}개 · shared · approved · 출제허용`,
  );
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
    if (r.mode === "recreate") {
      // 새로 만든 행을 지운다. **원본은 되살릴 수 없다** — 코드가 이미 소모됐다.
      if (r.createdId) {
        await prisma.problem.deleteMany({ where: { id: r.createdId } });
      }
      console.log(
        `  ⚠️ ${r.problemCode} — recreate 는 되돌려도 **옛 문항 코드가 안 돌아온다**`,
      );
      done += 1;
      continue;
    }
    const now = await prisma.problem.findUnique({
      where: { id: r.problemId },
      select: { content: true, answer: true },
    });
    // 🔴 **지금 값이 자기가 쓴 값일 때만** 되돌린다 — 그 사이 남이 고쳤으면 안 건드린다.
    if (!now || norm(now.content) !== norm(r.after.content)) {
      console.log(`  건너뜀 ${r.problemCode} — 지금 값이 내가 쓴 것이 아니다`);
      skipped += 1;
      continue;
    }
    await prisma.problem.update({
      where: { id: r.problemId },
      data: {
        content: r.before.content,
        answer: r.before.answer,
        solution: r.before.solution,
        externalId: r.before.externalId,
      },
    });
    done += 1;
  }
  console.log(`되돌림 ${done} · 건너뜀 ${skipped} / ${led.rows.length}`);
  if (done + skipped !== led.rows.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
}

main()
  .catch((e) => {
    console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
