/**
 * 이미 나간 **AI 생성 문항의 형식(`questionType`)을 채운다** — 원장님 지적 2026-08-26
 * 「AI 로 생성된 문항이 `[?형식]` 으로 나온다」.
 *
 *   npx tsx -r dotenv/config scripts/qa/apply-ai-question-type.ts              드라이런(기본)
 *   ALLOW_UNIT_FIX=1 npx tsx -r dotenv/config scripts/qa/apply-ai-question-type.ts --apply
 *   ALLOW_UNIT_FIX=1 npx tsx -r dotenv/config scripts/qa/apply-ai-question-type.ts --revert
 *
 * ## 이건 **뒷정리**다 — 틀은 따로 고쳤다
 *
 * 뿌리는 AI 생성 경로가 이 컬럼을 안 적던 것이고, 그건
 * `src/lib/ai/questionType.ts` + `generator.ts` + `generate/route.ts` 에서 고쳤다.
 * 이 스크립트는 **그 고침 이전에 나간 행**만 따라간다. 틀을 안 고치고 이걸 돌리면
 * 다음 생성에서 또 난다.
 *
 * ## 값을 지어내지 않는다 — **제품과 같은 함수**를 쓴다
 *
 * 채울 값은 `deriveQuestionType` 이 정한다. 생성 경로가 지금 쓰는 바로 그 함수다.
 * 여기서 규칙을 옮겨 적으면 「세는 쪽과 고치는 쪽이 다른 것을 보는」 그 자리가 된다.
 *
 * ## 무엇을 안 고치나 (전부 이유를 찍는다 — 조용히 빼지 않는다)
 *
 *   · `source !== 'ai_generated'` — 이 트랙의 무리가 아니다. `manual`(764) ·
 *     `transformed`(교재 2,030)의 `[?형식]` 은 **다른 원인**이고 다른 트랙 소관이다.
 *     반증용으로 넓힌 모집단을 처리 대상으로 물려받지 않는다(CLAUDE.md 2026-08-18).
 *   · 이미 `questionType` 이 차 있는 행 — 남의 값을 덮지 않는다(멱등).
 *
 * ## 되돌리기
 *
 * 원장(`reports/ai-question-type-ledger.json`)에 행마다 **바꾸기 전 값**을 적고,
 * **DB 보다 먼저** 쓴다. 원장은 덮어쓰지 않고 이어 쓴다(`mergeLedgerRows`) —
 * 두 번째 회차가 첫 회차의 되돌리기 근거를 지우면 안 된다(CLAUDE.md 2026-08-20).
 * 되돌릴 때는 **지금 값이 우리가 쓴 값일 때만** 되돌린다.
 *
 * ⚠️ 이 원장은 `.gitignore` 에서 `!` 로 되살려 **반드시 커밋된다.**
 *    `scripts/qa/reports/` 는 `/*` 로 내용만 무시하므로 안쪽 예외가 먹는다.
 *    확인: `git check-ignore -v scripts/qa/reports/ai-question-type-ledger.json`
 *
 * ⚠️ **지면이 바뀐다.** `questionType` 이 `단답형`/`서술형` 이면 조판이 그 문항에
 *    「단답형 n」·「서술형 n」 표시를 붙인다(`src/lib/tests/essayLabels.ts`, D-57).
 *    지금까지 AI 문항은 값이 널이라 **아무 표시도 안 나갔다** — 그게 정상이 아니라
 *    같은 결함의 다른 얼굴이다. 그래도 종이가 달라지는 일이니 보고에 적었다.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { deriveQuestionType } from "../../src/lib/ai/questionType";

import { mergeLedgerRows, stillApplied } from "./revertLedger";

const prisma = new PrismaClient();

const LEDGER = "scripts/qa/reports/ai-question-type-ledger.json";

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

if ((APPLY || REVERT) && process.env.ALLOW_UNIT_FIX !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다(D-31). ALLOW_UNIT_FIX=1 과 --apply(또는 --revert) 가 둘 다 필요하다.",
  );
  process.exit(1);
}

interface LedgerRow {
  id: string;
  problemCode: string | null;
  /** 고치기 **전** 값. 이게 없으면 되돌릴 수 없다. */
  before: string | null;
  /** 우리가 쓴 값. 되돌릴 때 「지금 값이 이것인가」를 본다. */
  after: string;
}

interface LedgerFile {
  적용됨: boolean;
  적은날: string;
  rows: LedgerRow[];
}

function readLedger(): LedgerFile | null {
  if (!existsSync(LEDGER)) return null;
  return JSON.parse(readFileSync(LEDGER, "utf-8")) as LedgerFile;
}

async function main() {
  if (REVERT) return revert();

  const rows = await prisma.problem.findMany({
    where: { source: "ai_generated" },
    select: {
      id: true,
      problemCode: true,
      questionType: true,
      problemType: true,
      content: true,
      answer: true,
    },
    orderBy: { problemCode: "asc" },
  });

  // **분모를 먼저 찍는다.** 「고칠 것 + 건너뜀」이 이 수와 안 맞으면 멈춘다 —
  // 범위가 새면 건수만 보고는 모른다(CLAUDE.md 2026-08-18 「43이 433」).
  console.log(`무리: source='ai_generated' ${rows.length}행`);

  const plan: LedgerRow[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    if (row.questionType) {
      skipped.push(
        `${row.problemCode}: 이미 «${row.questionType}» 이다 (멱등)`,
      );
      continue;
    }
    plan.push({
      id: row.id,
      problemCode: row.problemCode,
      before: row.questionType,
      after: deriveQuestionType({
        content: row.content,
        answer: row.answer,
        problemType: row.problemType ?? "",
      }),
    });
  }

  if (plan.length + skipped.length !== rows.length) {
    console.error(
      `🔴 계획(${plan.length}) + 건너뜀(${skipped.length}) 이 무리(${rows.length}) 와 다르다. 멈춘다.`,
    );
    process.exit(1);
  }

  const tally = new Map<string, number>();
  for (const p of plan) tally.set(p.after, (tally.get(p.after) ?? 0) + 1);
  console.log(
    `고칠 것 ${plan.length}행 — ` +
      [...tally].map(([k, v]) => `${k} ${v}`).join(" · "),
  );
  for (const s of skipped) console.log(`  건너뜀 ${s}`);
  for (const p of plan) console.log(`  ${p.problemCode}  null → ${p.after}`);

  if (!APPLY) {
    console.log("\n드라이런이다. 실제로 쓰려면 ALLOW_UNIT_FIX=1 … --apply");
    return;
  }

  // 🔴 **원장을 DB 보다 먼저 쓴다.** 순서를 뒤집으면 중간에 죽었을 때 되돌릴 근거가 없다.
  const previous = readLedger();
  const merged = mergeLedgerRows(previous?.rows, plan);
  writeFileSync(
    LEDGER,
    JSON.stringify(
      {
        적용됨: stillApplied(previous?.적용됨, true),
        적은날: "2026-08-26",
        rows: merged.rows,
      } satisfies LedgerFile,
      null,
      2,
    ) + "\n",
    "utf-8",
  );
  console.log(
    `원장 ${merged.rows.length}행 (이어받은 옛 행 ${merged.carried})`,
  );

  let done = 0;
  for (const p of plan) {
    const res = await prisma.problem.updateMany({
      // 지금도 널일 때만 쓴다 — 그 사이 다른 세션이 채웠으면 덮지 않는다.
      where: { id: p.id, questionType: null },
      data: { questionType: p.after },
    });
    done += res.count;
  }
  console.log(`🟢 ${done}행 적용 (계획 ${plan.length})`);
}

async function revert() {
  const ledger = readLedger();
  if (!ledger || ledger.rows.length === 0) {
    console.error(`되돌릴 원장이 없다: ${LEDGER}`);
    process.exit(1);
  }
  let done = 0;
  const refused: string[] = [];
  for (const row of ledger.rows) {
    const res = await prisma.problem.updateMany({
      // **우리가 쓴 값일 때만** 되돌린다 — 남의 변경을 덮지 않는다.
      where: { id: row.id, questionType: row.after },
      data: { questionType: row.before },
    });
    if (res.count === 1) done += 1;
    else refused.push(`${row.problemCode}: 지금 값이 «${row.after}» 가 아니다`);
  }
  console.log(`🟢 ${done}행 되돌림 (원장 ${ledger.rows.length}행)`);
  for (const r of refused) console.log(`  건너뜀 ${r}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
