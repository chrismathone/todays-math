/**
 * **기출 초안의 고침을 이미 적재된 행에 옮긴다** — `scripts/import/exam-paper/bank-fix-review.json` 의
 * before / after 를 `externalId` 로 맞대어, **지금 DB 값이 before 와 같을 때만** after 로 덮는다.
 *
 *   npx tsx --env-file=<.env> scripts/qa/apply-exam-draft-review.ts                 # 드라이런
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/apply-exam-draft-review.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/apply-exam-draft-review.ts --revert
 *
 * ## 왜 있나
 *
 * 기출 적재기(`load-exam-paper.ts`)는 **넣기만** 한다. 초안을 고쳐도 DB 에 굳은 행은 그대로다 —
 * 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」(2026-08-27)의 기출 판이다.
 * 2026-10-03 외부 검토로 정답 머리(「`$90$`평균이 …」)를 풀이에서 갈라 낸 12행(동도 9 ~ 16 · 강동 18 ~ 21)이 대상이다.
 *
 * ## 문지기
 *
 * · 고치는 칸은 원장이 적은 칸(`answer` · `solution` · `content`)뿐이다.
 * · **지금 DB 값이 원장의 before 와 글자까지 같아야** 덮는다 — 그 사이 누가 고쳤으면 건너뛰고 찍는다.
 * · 제품 렌더러로 after 를 그려 본다(`.math-raw` · 붉은 글씨면 안 덮는다 — 적재기 ㉡ 과 같은 규율).
 * · 원장은 DB 보다 먼저 쓴다. 되돌릴 때는 지금 값이 내가 쓴 값일 때만.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { renderMathHtml } from "../../src/lib/math/renderMathHtml";

const prisma = new PrismaClient();
const REPO = process.cwd();
const REVIEW = path.join(
  REPO,
  "scripts",
  "import",
  "exam-paper",
  "bank-fix-review.json",
);
const LEDGER = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "refresh-engine-content",
  "exam-draft-review-20261003.json",
);

type Field = "answer" | "solution" | "content";
const FIELDS: readonly Field[] = ["answer", "solution", "content"];
type Change = {
  externalId: string;
  fields: string[];
  before: Partial<Record<Field, string | null>>;
  after: Partial<Record<Field, string | null>>;
};
type LedgerRow = {
  problemId: string;
  externalId: string;
  before: Partial<Record<Field, string | null>>;
  after: Partial<Record<Field, string | null>>;
};

/**
 * 원장의 칸 → DB 갱신 값. `content` · `answer` 는 비울 수 없는 칸이라 **빈 값이면 던진다** —
 * 조용히 건너뛰면 «덮었다»가 거짓말이 된다. `solution` 만 비울 수 있다.
 */
function toData(values: Partial<Record<Field, string | null>>): {
  answer?: string;
  content?: string;
  solution?: string | null;
} {
  const data: { answer?: string; content?: string; solution?: string | null } =
    {};
  for (const f of ["answer", "content"] as const) {
    if (!(f in values)) continue;
    const v = values[f];
    if (typeof v !== "string")
      throw new Error(`${f} 는 비울 수 없는 칸이다 — 원장을 확인하라`);
    data[f] = v;
  }
  if ("solution" in values) data.solution = values.solution ?? null;
  return data;
}

function renderBad(text: string | null | undefined): string | null {
  if (!text) return null;
  const html = renderMathHtml(text);
  if (html.includes("math-raw")) return "KaTeX 가 포기했다";
  if (html.includes("#cc0000")) return "붉은 글씨";
  return null;
}

async function run(doApply: boolean): Promise<void> {
  const review = JSON.parse(readFileSync(REVIEW, "utf8")) as {
    changes: Change[];
  };
  const ids = review.changes.map((c) => c.externalId);
  const rows = await prisma.problem.findMany({
    where: { externalId: { in: ids } },
    select: {
      id: true,
      externalId: true,
      answer: true,
      solution: true,
      content: true,
    },
  });
  const byExt = new Map(rows.map((r) => [r.externalId!, r]));
  console.log(
    `원장 ${review.changes.length}행 · 그 가운데 DB 에 있는 것 ${rows.length}`,
  );

  const todo: LedgerRow[] = [];
  const skipped: string[] = [];
  for (const c of review.changes) {
    const db = byExt.get(c.externalId);
    if (!db) continue;
    const fields = c.fields.filter((f): f is Field =>
      (FIELDS as readonly string[]).includes(f),
    );
    // 🔴 원장이 적은 칸이 전부 before 와 같아야 한다 — 하나라도 다르면 그 사이 누가 고친 것이다.
    const drift = fields.filter(
      (f) => (db[f] ?? null) !== (c.before[f] ?? null),
    );
    if (drift.length) {
      skipped.push(
        `${c.externalId}: 지금 값이 원장의 before 와 다르다(${drift.join(" · ")})`,
      );
      continue;
    }
    const bad = fields
      .map((f) => renderBad(c.after[f]))
      .find((b) => b !== null);
    if (bad) {
      skipped.push(`${c.externalId}: after 를 그려 보니 ${bad}`);
      continue;
    }
    const before: LedgerRow["before"] = {};
    const after: LedgerRow["after"] = {};
    for (const f of fields) {
      before[f] = db[f] ?? null;
      after[f] = c.after[f] ?? null;
    }
    todo.push({ problemId: db.id, externalId: c.externalId, before, after });
  }
  for (const t of todo)
    console.log(
      `   ${t.externalId}  정답 「${String(t.before.answer).slice(0, 14)}」 → 「${String(t.after.answer).slice(0, 40)}」`,
    );
  console.log(`덮을 것 ${todo.length} · 건너뜀 ${skipped.length}`);
  for (const s of skipped) console.log(`   ⚠️ ${s}`);
  if (!doApply)
    return console.log("드라이런이다 — ALLOW_SHARED_IMPORT=1 … --apply");
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (todo.length === 0) return console.log("덮을 것이 없다.");
  if (existsSync(LEDGER))
    throw new Error(
      `원장이 이미 있다 — 두 번 적용하지 않는다: ${path.relative(REPO, LEDGER)}`,
    );
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(
    LEDGER,
    JSON.stringify({ at: new Date().toISOString(), rows: todo }, null, 1),
  );
  console.log(`원장 ${path.relative(REPO, LEDGER)}`);
  await prisma.$transaction(
    todo.map((t) =>
      prisma.problem.update({
        where: { id: t.problemId },
        data: toData(t.after),
      }),
    ),
  );
  const back = await prisma.problem.findMany({
    where: { id: { in: todo.map((t) => t.problemId) } },
    select: { id: true, answer: true, solution: true, content: true },
  });
  const byId = new Map(back.map((b) => [b.id, b]));
  const wrong = todo.filter((t) =>
    (Object.keys(t.after) as Field[]).some(
      (f) => (byId.get(t.problemId)?.[f] ?? null) !== t.after[f],
    ),
  );
  if (wrong.length)
    throw new Error(`되읽으니 ${wrong.length}행이 쓴 값과 다르다`);
  console.log(`✅ 덮음 ${todo.length}행 · 되읽기 전부 일치`);
}

async function revert(): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  const led = JSON.parse(readFileSync(LEDGER, "utf8")) as { rows: LedgerRow[] };
  let restored = 0;
  let skipped = 0;
  for (const t of led.rows) {
    const now = await prisma.problem.findUnique({
      where: { id: t.problemId },
      select: { answer: true, solution: true, content: true },
    });
    const mine =
      now !== null &&
      (Object.keys(t.after) as Field[]).every(
        (f) => (now[f] ?? null) === t.after[f],
      );
    if (!mine) {
      skipped += 1;
      continue;
    }
    await prisma.problem.update({
      where: { id: t.problemId },
      data: toData(t.before),
    });
    restored += 1;
  }
  console.log(`되돌림 ${restored} · 남이 고쳐서 건너뜀 ${skipped}`);
}

(process.argv.includes("--revert")
  ? revert()
  : run(process.argv.includes("--apply"))
)
  .catch((e) => {
    console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
