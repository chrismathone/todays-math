/**
 * 문제은행 정렬 순서 — **사실 확인용 탐침** (원장님 지시 2026-08-26).
 *
 * 지어내지 않으려고 만든 물건이다. 다섯 열쇠(학년/학기/단원순서/분류/번호)가
 * 실제 컬럼으로 어떻게 나오는지 DB 에 직접 묻는다.
 *
 *   npx tsx scripts/qa/probe-problem-order.ts units    — Unit.orderIndex 가 무엇을 담나
 *   npx tsx scripts/qa/probe-problem-order.ts codes    — 문항 코드 형식 분포·제로패딩
 *   npx tsx scripts/qa/probe-problem-order.ts sample   — 원장님이 본 소단원(J10101) 실제 순서
 */
import { PrismaClient } from "@prisma/client";

import {
  LEGACY_PROBLEM_CODE_PATTERN,
  PROBLEM_CODE_PATTERN,
} from "../../src/contracts/problemCode.contract";
import {
  PROBLEM_BANK_ORDER_BY,
  sortProblemsForBank,
} from "../../src/lib/problem/problemOrder";

const db = new PrismaClient();

async function units() {
  const rows = await db.unit.findMany({
    select: {
      grade: true,
      chapter: true,
      section: true,
      orderIndex: true,
      problemCodePrefix: true,
    },
    orderBy: { orderIndex: "asc" },
  });
  console.log(
    `단원 ${rows.length}개 · orderIndex ${rows[0]?.orderIndex}..${rows[rows.length - 1]?.orderIndex}`,
  );
  console.log(
    `orderIndex 중복: ${rows.length - new Set(rows.map((u) => u.orderIndex)).size}건`,
  );

  // 학년이 orderIndex 위에서 **연속 구간**인가 (끊기면 orderIndex 하나로 학년을 못 담는다)
  const runs: { grade: string; from: number; to: number; n: number }[] = [];
  for (const u of rows) {
    const last = runs[runs.length - 1];
    if (last && last.grade === u.grade) {
      last.to = u.orderIndex;
      last.n++;
    } else
      runs.push({ grade: u.grade, from: u.orderIndex, to: u.orderIndex, n: 1 });
  }
  const gradeCount = new Set(rows.map((u) => u.grade)).size;
  console.log(
    `학년 ${gradeCount}종 · 연속 구간 ${runs.length}개 → ${runs.length === gradeCount ? "학년이 연속(orderIndex 가 학년 순서를 담는다)" : "🔴 학년이 끊긴다"}`,
  );

  // 같은 학년 안에서 chapter 가 연속 구간인가 (= 단원 순서를 담는가)
  let brokenChapters = 0;
  for (const g of new Set(rows.map((u) => u.grade))) {
    const inGrade = rows.filter((u) => u.grade === g);
    const chRuns: string[] = [];
    for (const u of inGrade)
      if (chRuns[chRuns.length - 1] !== u.chapter) chRuns.push(u.chapter);
    if (chRuns.length !== new Set(chRuns).size) {
      brokenChapters++;
      console.log(`  🔴 ${g}: 대단원이 끊긴다 ${chRuns.join(" / ")}`);
    }
  }
  console.log(`대단원 끊김: ${brokenChapters}학년`);

  // 「학기」는 어디 있나 — 컬럼이 없다면 chapter/grade 글에 있나
  const semesterish = rows.filter(
    (u) => /학기|[12]-[12]|상|하/.test(u.chapter) || /[12]-[12]/.test(u.grade),
  );
  console.log(
    `chapter/grade 에 학기 낱말이 보이는 단원: ${semesterish.length}건`,
  );
  console.log(
    "표본:",
    rows
      .slice(0, 3)
      .map(
        (u) =>
          `${u.grade}|${u.chapter}|${u.section}(${u.orderIndex},${u.problemCodePrefix})`,
      )
      .join("  "),
  );
}

async function codes() {
  const total = await db.problem.count();
  const rows = await db.problem.findMany({
    select: { problemCode: true },
    take: 200000,
  });
  // ⚠️ 형식을 **여기 옮겨 적지 않는다.** 손으로 쓴 첫 판은 고등 3자 과목 코드
  //    (`HAL0309-…`)를 못 봐서 7,563건을 「그 밖」으로 흘렸다.
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  const OLD = new RegExp(LEGACY_PROBLEM_CODE_PATTERN);
  const neu = rows.filter((r) => NEW.test(r.problemCode)).length;
  const old = rows.filter((r) => OLD.test(r.problemCode)).length;
  console.log(
    `문항 ${total}건 · 새 형식(A01-001) ${neu} · 옛 형식(무작위4) ${old} · 그 밖 ${rows.length - neu - old}`,
  );
  console.log(
    `problemCode 가 빈/NULL: ${rows.filter((r) => !r.problemCode).length}건`,
  );
  // 제로패딩 확인 — 일련번호가 3자리 고정이면 문자열 정렬로 -010 > -002 가 맞다
  const seqs = rows
    .filter((r) => NEW.test(r.problemCode))
    .map((r) => r.problemCode.split("-")[2]);
  console.log(
    `일련번호 길이 분포:`,
    [...new Set(seqs.map((s) => s.length))].sort(),
  );
  console.log(
    `10 이상 아류가 있나: ${seqs.filter((s) => Number(s) >= 10).length}건`,
  );
  const fams = rows
    .filter((r) => NEW.test(r.problemCode))
    .map((r) => r.problemCode.split("-")[1]);
  console.log(
    `문항류 코드 길이 분포:`,
    [...new Set(fams.map((s) => s.length))].sort(),
    `· 종류 ${new Set(fams).size}`,
  );
}

async function sample() {
  const unit = await db.unit.findFirst({
    where: { problemCodePrefix: "J10101" },
  });
  if (!unit) {
    console.log("J10101 단원 없음");
    return;
  }
  console.log(
    `${unit.grade} | ${unit.chapter} | ${unit.section} (orderIndex ${unit.orderIndex})`,
  );
  const rows = await db.problem.findMany({
    where: { unitId: unit.id },
    select: { problemCode: true, createdAt: true, familyKey: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 40,
  });
  console.log("옛 순서(createdAt desc, id desc) — 원장님이 보신 그대로:");
  console.log("  " + rows.map((r) => r.problemCode).join(" → "));

  const fixed = await db.problem.findMany({
    where: { unitId: unit.id },
    select: { problemCode: true },
    orderBy: PROBLEM_BANK_ORDER_BY,
    take: 40,
  });
  console.log("새 순서(단원순서 → 분류 → 번호):");
  console.log("  " + fixed.map((r) => r.problemCode).join(" → "));
}

async function chapters() {
  const rows = await db.unit.findMany({
    select: {
      grade: true,
      chapter: true,
      orderIndex: true,
      problemCodePrefix: true,
    },
    orderBy: { orderIndex: "asc" },
  });
  const byGrade = new Map<string, string[]>();
  for (const u of rows) {
    if (!byGrade.has(u.grade)) byGrade.set(u.grade, []);
    const arr = byGrade.get(u.grade)!;
    if (arr[arr.length - 1] !== u.chapter) arr.push(u.chapter);
  }
  for (const [g, chs] of byGrade) console.log(`${g}: ${chs.join(" | ")}`);
  console.log(
    "접두사 표본:",
    rows
      .filter((u) =>
        ["J10101", "J10102", "J10201", "E10101"].includes(u.problemCodePrefix),
      )
      .map(
        (u) =>
          `${u.problemCodePrefix}=${u.grade}/${u.chapter}(${u.orderIndex})`,
      )
      .join("  "),
  );
}

/** 한 단원 안에 옛 형식과 새 형식이 **섞이나** — 섞이면 문자열 정렬이 뒤엉킨다. */
async function mix() {
  const rows = await db.problem.findMany({
    select: { unitId: true, problemCode: true },
  });
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  const byUnit = new Map<string, { neu: number; old: number }>();
  for (const r of rows) {
    const e = byUnit.get(r.unitId) ?? { neu: 0, old: 0 };
    if (NEW.test(r.problemCode)) e.neu++;
    else e.old++;
    byUnit.set(r.unitId, e);
  }
  const mixed = [...byUnit.values()].filter((e) => e.neu > 0 && e.old > 0);
  console.log(
    `문항이 있는 단원 ${byUnit.size}개 · 새것만 ${[...byUnit.values()].filter((e) => e.old === 0).length} · 옛것만 ${[...byUnit.values()].filter((e) => e.neu === 0).length} · 🔴섞임 ${mixed.length}`,
  );
  console.log(
    `섞인 단원의 문항 수 합: ${mixed.reduce((a, e) => a + e.neu + e.old, 0)}건`,
  );

  // 옛 코드의 첫 글자 분포 — 숫자로 시작하면 ASCII 로 새 형식(A01)보다 앞선다
  const oldFirst = rows
    .filter((r) => !NEW.test(r.problemCode))
    .map((r) => r.problemCode.split("-")[1]![0]!);
  const digit = oldFirst.filter((c) => c >= "0" && c <= "9").length;
  console.log(
    `옛 코드 무작위부 첫 글자가 숫자: ${digit}건 / 글자: ${oldFirst.length - digit}건`,
  );
  console.log(
    `  → 그냥 problemCode 문자열 정렬만 하면 옛것 ${digit}건이 새 형식 앞으로 끼어든다`,
  );
}

/** 새 정렬이 얼마나 걸리나 — 무필터 첫 페이지(화면 기본 진입)로 잰다. */
async function timing() {
  const t = async (label: string, fn: () => Promise<unknown>) => {
    await fn();
    const s = Date.now();
    await fn();
    console.log(`${label}: ${Date.now() - s}ms`);
  };
  await t("지금(createdAt desc, id desc)", () =>
    db.problem.findMany({
      take: 20,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  );
  await t("새것(unit.orderIndex asc, problemCode asc)", () =>
    db.problem.findMany({
      take: 20,
      orderBy: [{ unit: { orderIndex: "asc" } }, { problemCode: "asc" }],
    }),
  );
  await t("새것 + 100페이지째(skip 2000)", () =>
    db.problem.findMany({
      take: 20,
      skip: 2000,
      orderBy: [{ unit: { orderIndex: "asc" } }, { problemCode: "asc" }],
    }),
  );
}

/** familyKey 가 실제로 무엇을 담나 — 정렬 열쇠로 쓸 수 있는지 보려고. */
async function family() {
  const rows = await db.problem.findMany({
    select: { familyKey: true, problemCode: true },
  });
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  const nullKey = rows.filter((r) => !r.familyKey).length;
  const solo = rows.filter((r) => r.familyKey?.startsWith("solo:")).length;
  console.log(
    `familyKey NULL ${nullKey} · solo: ${solo} · 그 밖 ${rows.length - nullKey - solo}`,
  );
  const prefixes = new Map<string, number>();
  for (const r of rows) {
    const p = r.familyKey ? r.familyKey.split(":")[0] : "(NULL)";
    prefixes.set(p, (prefixes.get(p) ?? 0) + 1);
  }
  console.log(
    "familyKey 접두:",
    [...prefixes].map(([k, v]) => `${k}=${v}`).join(" "),
  );
  // 옛 코드 행이 familyKey 를 갖고 있나
  const oldRows = rows.filter((r) => !NEW.test(r.problemCode));
  const oldSolo = oldRows.filter((r) =>
    r.familyKey?.startsWith("solo:"),
  ).length;
  const oldNull = oldRows.filter((r) => !r.familyKey).length;
  console.log(
    `옛 코드 ${oldRows.length}건 중 solo: ${oldSolo} · NULL ${oldNull} · 진짜 유형키 ${oldRows.length - oldSolo - oldNull}`,
  );
  console.log(`ProblemFamily 대장 행: ${await db.problemFamily.count()}건`);
}

/** familyKey 오름차순이 familyCode(A01,A02…) 오름차순과 같은가 — 정렬 열쇠 후보 검증. */
async function famorder() {
  const fams = await db.problemFamily.findMany({
    select: { unitId: true, familyKey: true, familyCode: true },
  });
  const byUnit = new Map<string, { familyKey: string; familyCode: string }[]>();
  for (const f of fams) {
    if (!byUnit.has(f.unitId)) byUnit.set(f.unitId, []);
    byUnit.get(f.unitId)!.push(f);
  }
  let disagree = 0;
  const examples: string[] = [];
  for (const [unitId, list] of byUnit) {
    const byKey = [...list]
      .sort((a, b) => a.familyKey.localeCompare(b.familyKey))
      .map((f) => f.familyCode);
    const byCode = [...list]
      .sort((a, b) => a.familyCode.localeCompare(b.familyCode))
      .map((f) => f.familyCode);
    if (byKey.join() !== byCode.join()) {
      disagree++;
      if (examples.length < 3)
        examples.push(
          `  familyKey 순: ${byKey.join(" ")}  ≠  코드 순: ${byCode.join(" ")}   [${[
            ...list,
          ]
            .sort((a, b) => a.familyKey.localeCompare(b.familyKey))
            .map((f) => `${f.familyCode}=${f.familyKey}`)
            .join(" · ")}]`,
        );
    }
  }
  console.log(
    `대장에 든 단원 ${byUnit.size}개 · familyKey 순 ≠ 코드 순: ${disagree}개`,
  );
  for (const e of examples) console.log(e);
}

/** 옛·새 코드가 섞인 진짜 단원에서 후보 정렬이 어떻게 보이나 — **눈으로** 보려고. */
async function mixed() {
  const rows = await db.problem.findMany({
    select: { unitId: true, problemCode: true, familyKey: true },
  });
  const byUnit = new Map<string, { neu: number; old: number }>();
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  for (const r of rows) {
    const e = byUnit.get(r.unitId) ?? { neu: 0, old: 0 };
    if (NEW.test(r.problemCode)) e.neu++;
    else e.old++;
    byUnit.set(r.unitId, e);
  }
  const target = [...byUnit]
    .filter(([, e]) => e.neu >= 4 && e.old >= 4)
    .sort((a, b) => a[1].neu + a[1].old - (b[1].neu + b[1].old))[0];
  if (!target) {
    console.log("섞인 단원 없음");
    return;
  }
  const unit = await db.unit.findUnique({ where: { id: target[0] } });
  console.log(
    `${unit!.grade} | ${unit!.chapter} | ${unit!.section} — 새 ${target[1].neu} · 옛 ${target[1].old}`,
  );
  const a = await db.problem.findMany({
    where: { unitId: target[0] },
    select: { problemCode: true },
    orderBy: [{ unit: { orderIndex: "asc" } }, { problemCode: "asc" }],
    take: 60,
  });
  console.log(`
(A) [unit.orderIndex, problemCode]`);
  console.log(
    "  " + a.map((r) => r.problemCode.split("-").slice(1).join("-")).join("  "),
  );
  const b = await db.problem.findMany({
    where: { unitId: target[0] },
    select: { problemCode: true },
    orderBy: [
      { unit: { orderIndex: "asc" } },
      { familyKey: { sort: "asc", nulls: "last" } },
      { problemCode: "asc" },
    ],
    take: 60,
  });
  console.log(`
(B) [unit.orderIndex, familyKey nulls last, problemCode]`);
  console.log(
    "  " + b.map((r) => r.problemCode.split("-").slice(1).join("-")).join("  "),
  );
}

/** **은행이 실제로 보는 것**(격리 벽 통과분)만 세어 본다 — 안 보이면 정렬도 문제가 아니다. */
async function visible() {
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  const all = await db.problem.findMany({
    select: { pool: true, problemCode: true, unitId: true },
  });
  const shown = all.filter((r) => r.pool === "shared");
  const oldShown = shown.filter((r) => !NEW.test(r.problemCode)).length;
  console.log(
    `전량 ${all.length} · 벽 통과(pool=shared) ${shown.length} · 벽 밖 ${all.length - shown.length}`,
  );
  console.log(
    `  벽 통과분 중 옛 형식 ${oldShown} · 새 형식 ${shown.length - oldShown}`,
  );
  const byUnit = new Map<string, { neu: number; old: number }>();
  for (const r of shown) {
    const e = byUnit.get(r.unitId) ?? { neu: 0, old: 0 };
    if (NEW.test(r.problemCode)) e.neu++;
    else e.old++;
    byUnit.set(r.unitId, e);
  }
  const mixed = [...byUnit.values()].filter((e) => e.neu > 0 && e.old > 0);
  console.log(
    `  벽 통과분에서 옛·새가 섞인 단원: ${mixed.length}개 (문항 ${mixed.reduce((a, e) => a + e.neu + e.old, 0)}건)`,
  );
}

/**
 * **DB 정렬과 화면 비교기가 같은 순서를 내나** — 실데이터 전량으로 대조한다.
 *
 * 화면은 새 문항을 목록에 끼울 때 JS 비교기를 쓰고, 페이지는 Postgres 가 나눈다.
 * 둘이 갈라지면 페이지 경계에서 순서가 깨지는데 **아무 에러도 안 난다.**
 * 특히 문자열 비교는 **콜레이션**에 달려 있어 추론으로는 못 정한다 — 재야 한다.
 */
async function parity() {
  const rows = await db.problem.findMany({
    where: { pool: "shared" },
    select: { problemCode: true, unit: { select: { orderIndex: true } } },
    orderBy: PROBLEM_BANK_ORDER_BY,
  });
  const fromDb = rows.map((r) => r.problemCode);
  const fromJs = sortProblemsForBank(
    rows.map((r) => ({
      unitOrderIndex: r.unit.orderIndex,
      problemCode: r.problemCode,
    })),
  ).map((r) => r.problemCode);
  const firstDiff = fromDb.findIndex((c, i) => c !== fromJs[i]);
  console.log(
    `벽 통과분 ${rows.length}건 대조 — ${firstDiff === -1 ? "✅ 완전 일치" : `🔴 ${firstDiff}번째부터 갈린다`}`,
  );
  if (firstDiff !== -1) {
    console.log(`  DB: ${fromDb.slice(firstDiff, firstDiff + 5).join(" ")}`);
    console.log(`  JS: ${fromJs.slice(firstDiff, firstDiff + 5).join(" ")}`);
  }

  // 옛 형식이 벽 안으로 들어왔나 — 들어오면 「코드 오름차순 == 분류·번호 순」이 깨진다.
  const NEW = new RegExp(PROBLEM_CODE_PATTERN);
  const oldInside = fromDb.filter((c) => !NEW.test(c));
  console.log(
    `벽 통과분 중 분류·번호가 없는 옛 코드: ${oldInside.length}건${oldInside.length ? ` 🔴 ${oldInside.slice(0, 5).join(" ")}` : " ✅"}`,
  );

  // 「분류 → 번호」가 실제로 그 순서로 서 있나 — 코드 문자열이 아니라 **자리를 갈라** 확인한다.
  let broken = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]!,
      b = rows[i]!;
    if (a.unit.orderIndex !== b.unit.orderIndex) continue;
    const pa = a.problemCode.split("-"),
      pb = b.problemCode.split("-");
    if (pa.length !== 3 || pb.length !== 3) continue;
    const ka = [pa[1]!, Number(pa[2])] as const,
      kb = [pb[1]!, Number(pb[2])] as const;
    const ok = ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] <= kb[1]);
    if (!ok) {
      broken++;
      if (broken <= 3) console.log(`  🔴 ${a.problemCode} → ${b.problemCode}`);
    }
  }
  console.log(
    `같은 단원 안에서 «분류→번호» 가 어긋난 이웃: ${broken}건${broken ? "" : " ✅"}`,
  );
}

/** 은행 1페이지를 **눈으로** 본다 — 학년이 교육과정 순서로 서는지. */
async function bank() {
  const rows = await db.problem.findMany({
    where: { pool: "shared" },
    select: {
      problemCode: true,
      unit: {
        select: { grade: true, chapter: true, section: true, orderIndex: true },
      },
    },
    orderBy: PROBLEM_BANK_ORDER_BY,
    take: 24,
  });
  for (const r of rows)
    console.log(
      `  ${r.problemCode}  ${r.unit.orderIndex}  ${r.unit.grade} | ${r.unit.chapter} | ${r.unit.section}`,
    );
  const grades = await db.problem.findMany({
    where: { pool: "shared" },
    select: { unit: { select: { grade: true } } },
    orderBy: PROBLEM_BANK_ORDER_BY,
  });
  const runs: string[] = [];
  for (const g of grades)
    if (runs[runs.length - 1] !== g.unit.grade) runs.push(g.unit.grade);
  console.log(`
학년 등장 순서(${runs.length}구간): ${runs.join(" → ")}`);
  console.log(
    `  학년 종류 ${new Set(runs).size}종 → ${runs.length === new Set(runs).size ? "✅ 학년이 안 끊긴다" : "🔴 학년이 끊긴다"}`,
  );
}

const mode = process.argv[2] ?? "units";
const run = {
  units,
  codes,
  sample,
  chapters,
  mix,
  timing,
  family,
  famorder,
  mixed,
  visible,
  parity,
  bank,
}[mode as "units"];
if (!run) {
  console.error(`모드: units | codes | sample | chapters | mix | timing`);
  process.exit(1);
}
run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
