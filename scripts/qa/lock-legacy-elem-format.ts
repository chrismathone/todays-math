/**
 * **옛 형식 초등 적재본을 출제에서 뺀다** (원장님 확정 2026-08-28).
 *
 *   npx tsx scripts/qa/lock-legacy-elem-format.ts                       # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/lock-legacy-elem-format.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/lock-legacy-elem-format.ts --revert
 *
 * ## 왜
 *
 * 2026-08-28 에 적재본 그림을 지금 엔진으로 다시 그렸는데
 * (`refresh-engine-figures.ts`), **107장이 안 고쳐졌다.** 전부 2026-08-24 의 옛
 * 적재본이고 `externalId` 형식이 지금과 다르다:
 *
 *     옛   engine-elem:초5|1-6 다각형의…|1-6-2 …|기본|s20260826
 *     지금 engine-elem:초5|…|f{문형}|{유형}|s{씨앗}
 *
 * 형식이 그 사이 바뀌어서 **씨앗을 알아도 같은 문항을 되만들 수 없다** — 그림도,
 * 본문도 옛 엔진 것으로 굳어 있고 되살릴 길이 없다. 그런데 새 형식 11,758건과
 * **같은 풀에 섞여** 전부 출제 가능이라, 시험지를 뽑으면 옛 판이 같이 나온다.
 *
 * ## 지우지 않고 «뺀다»
 *
 * `directUseAllowed=false` 다 — D-101 이 정한 방식이다(소유자가 없으므로 `private`
 * 는 「아무에게도 안 보인다」가 되어 못 쓴다). **이미 확정된 시험지의 문항 연결은
 * 그대로 둔다** — 지난 시험지를 고쳐 쓰지 않는다(실측 8건이 그렇다).
 *
 * ## 🔴 이 스크립트가 지키는 것 네 가지
 *
 * ⑴ **무리 필터가 첫 가드다.** 옛 형식(`engine-elem:` 이면서 `|f` 가 없다)이
 *    아니면 **한 행도** 안 건드린다. 2026-08-18 에 「반증하려고 넓힌 모집단을
 *    처리 대상으로 물려받아」 43건이 433건이 된 적이 있다.
 * ⑵ **분모를 먼저 세고, 「뺀 것 + 건너뛴 것」이 그 수와 안 맞으면 멈춘다.**
 * ⑶ **지금 값이 `true` 인 행만** 잠근다 — 남이 잠근 것은 안 건드린다(같은 컬럼을
 *    그림 유실 락도 쓴다. 서로 모르면 한쪽을 되돌릴 때 다른 쪽이 풀린다).
 * ⑷ 되돌릴 때는 **지금 값이 자기가 쓴 값(false)일 때만** 되돌린다.
 *
 * 원장은 `scripts/import/ledgers/` 에 쓴다 — **커밋되는 자리**임을 확인했다
 * (`scripts/qa/reports/` 는 손 목록이라 새 이름이 조용히 빠진다).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LEDGER = path.join(
  process.cwd(),
  "scripts",
  "import",
  "ledgers",
  "legacy-elem-format-lock.json",
);

/**
 * **옛 형식인가.** 엔진 초등 적재본이면서 문형 표지(`|f`)가 없는 것.
 *
 * ⚠️ 이 술어가 이 작업의 **유일한 모집단 정의**다. 넓히면 멀쩡한 문항이 출제에서
 *    빠지고, 그건 화면에 아무 표시도 안 난다 — 시험지가 그냥 얇아진다.
 */
export function isLegacyElemFormat(externalId: string | null): boolean {
  if (!externalId) return false;
  if (!externalId.startsWith("engine-elem:")) return false;
  return !externalId.includes("|f");
}

interface Ledger {
  runs: { at: string; count: number; reason: string }[];
  rows: { problemId: string; problemCode: string | null; externalId: string }[];
}

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf8")) as Ledger;
}

function writeLedger(next: Ledger, prevRows: number): void {
  if (next.rows.length < prevRows)
    throw new Error(
      `원장이 줄었다 (${prevRows} → ${next.rows.length}) — 멈춘다.`,
    );
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, `${JSON.stringify(next, null, 1)}\n`, "utf8");
}

async function apply(doApply: boolean): Promise<void> {
  // ── 분모를 **먼저** 센다 ────────────────────────────────────────────────
  const all = await prisma.problem.findMany({
    where: { externalId: { startsWith: "engine-elem:" } },
    select: {
      id: true,
      problemCode: true,
      externalId: true,
      directUseAllowed: true,
    },
  });
  const legacy = all.filter((p) => isLegacyElemFormat(p.externalId));
  const open = legacy.filter((p) => p.directUseAllowed);
  const already = legacy.length - open.length;
  console.log(
    `엔진 초등 문항 ${all.length} · 그중 **옛 형식 ${legacy.length}** ` +
      `(출제 가능 ${open.length} · 이미 빠져 있음 ${already})`,
  );

  // ⑵ 분모가 안 맞으면 멈춘다.
  if (open.length + already !== legacy.length)
    throw new Error("분모가 안 맞는다 — 세는 쪽이 틀렸다. 멈춘다.");

  // ⑴ 무리 필터 — 옛 형식이 아닌 것이 한 건이라도 섞이면 멈춘다.
  const stray = open.filter((p) => !isLegacyElemFormat(p.externalId));
  if (stray.length > 0)
    throw new Error(`옛 형식이 아닌 것이 ${stray.length}건 섞였다 — 멈춘다.`);

  if (!doApply) {
    console.log(
      `\n드라이런이다. 뺄 것 **${open.length}건**.` +
        `\n실제로 빼려면: ALLOW_SHARED_IMPORT=1 … --apply` +
        `\n원장 자리: ${path.relative(process.cwd(), LEDGER)}`,
    );
    console.log(`\n표본:`);
    for (const p of open.slice(0, 5))
      console.log(`  ${p.problemCode ?? "(코드 없음)"}  ${p.externalId}`);
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (open.length === 0) {
    console.log("뺄 것이 없다.");
    return;
  }

  // ── 원장을 **먼저** ─────────────────────────────────────────────────────
  const prev = readLedger();
  writeLedger(
    {
      runs: [
        ...prev.runs,
        {
          at: new Date().toISOString(),
          count: open.length,
          reason:
            "옛 externalId 형식(2026-08-24 적재) — 되만들 수 없어 그림·본문이 옛 엔진 것으로 굳었다. 원장님 확정 2026-08-28.",
        },
      ],
      rows: [
        ...prev.rows,
        ...open.map((p) => ({
          problemId: p.id,
          problemCode: p.problemCode,
          externalId: p.externalId!,
        })),
      ],
    },
    prev.rows.length,
  );
  console.log(
    `원장 ${path.relative(process.cwd(), LEDGER)} (누적 ${prev.rows.length + open.length}행)`,
  );

  // ── ⑶ 지금 값이 `true` 인 행만 ──────────────────────────────────────────
  let locked = 0;
  for (let i = 0; i < open.length; i += 200) {
    const part = open.slice(i, i + 200);
    const res = await prisma.problem.updateMany({
      where: { id: { in: part.map((p) => p.id) }, directUseAllowed: true },
      data: { directUseAllowed: false },
    });
    locked += res.count;
  }
  console.log(`뺐다 ${locked}건`);

  // ── 되읽어 확인 ─────────────────────────────────────────────────────────
  const back = await prisma.problem.count({
    where: {
      id: { in: open.map((p) => p.id) },
      directUseAllowed: true,
    },
  });
  if (back > 0)
    throw new Error(
      `되읽으니 ${back}건이 아직 출제 가능이다 — 확인이 필요하다`,
    );
  console.log(`✅ 되읽기 ${open.length}건 전부 출제에서 빠졌다`);
}

async function revert(): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  const led = readLedger();
  const ids = [...new Set(led.rows.map((r) => r.problemId))];
  console.log(`원장 ${led.rows.length}행 · 문항 ${ids.length}개`);
  let restored = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    // ⑷ **지금 값이 자기가 쓴 값(false)일 때만** 되돌린다.
    const res = await prisma.problem.updateMany({
      where: { id: { in: part }, directUseAllowed: false },
      data: { directUseAllowed: true },
    });
    restored += res.count;
  }
  console.log(
    `되돌림 ${restored} · 남이 이미 되돌렸거나 다른 값이라 건너뜀 ${ids.length - restored}`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--revert")) await revert();
  else await apply(process.argv.includes("--apply"));
}

// 시험이 `isLegacyElemFormat` 을 빌려 쓴다 — import 만으로 돌면 안 된다.
const RUN_DIRECTLY = /lock-legacy-elem-format\.(ts|js|mts|mjs)$/i.test(
  process.argv[1] ?? "",
);

if (RUN_DIRECTLY)
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
