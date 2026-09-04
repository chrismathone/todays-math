/**
 * **그림이 비었는데 발문이 그림을 가리키는 적재본 행**을 출제에서 뺀다.
 *
 *   npx tsx scripts/qa/lockFigurelessLoadedRows.ts --ledger <원장.json>            # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/lockFigurelessLoadedRows.ts --ledger <원장.json> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/lockFigurelessLoadedRows.ts --revert <되돌리기.json>
 *
 * ## 왜 필요한가 (2026-09-04)
 *
 * `load-engine-problems.ts` 가 그림 렌더 실패를 **세기만** 하고 그 행을
 * `directUseAllowed: true` 로 넣고 있었다. 실측 — 5차 물결 3차 착지에서 스펙 2종이
 * 「segment 'PQ' is too short (9.33px)」로 실패했고, 그 행들의 발문은
 * **「그림과 같이 $\triangle ABC$에서…」**였다. 종이에 그림 없이 나가면 못 푼다.
 * 그런데 적재 마지막 줄은 **「4,852건 전부 출제허용」**이라는 초록이었다 —
 * 세는 것과 막는 것은 다른 일이고, 세기만 하면 아무도 안 본다.
 *
 * 적재기에는 그 가드를 넣었다(다음 회차부터 안 생긴다). 이 도구는 **이미 들어간 것**을
 * 고친다.
 *
 * ## 🔴 판정을 여기서 짓지 않는다
 *
 * 「그림이 없는데 가리키나」는 `figurelessRow` **한 곳**이고(적재기가 같은 함수를
 * 부른다), 「그림이 있나」는
 * **DB 값**이다. 둘 다 재는 것이지 모형이 아니다 — 내가 「PQ 가 10px 미만이면」
 * 같은 규칙을 다시 지으면 그 순간 렌더러와 갈라진다(2026-08-18).
 *
 * ## 되돌리기
 *
 * ⑴ 되돌리기 파일을 **DB 보다 먼저** 쓰고 ⑵ 되돌릴 때는 **지금 값이 내가 쓴 값일 때만**
 * 되돌린다. 같은 컬럼을 잠그는 스크립트가 여럿이라, 서로 모르면 한쪽을 되돌릴 때
 * 다른 쪽이 풀린다(2026-08-18).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { figurelessPointer } from "../../src/lib/engine/figurelessRow";

const prisma = new PrismaClient();
const REPO = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

type Ledger = { rows: { externalId: string; problemId: string }[] };
type RevertRow = {
  problemId: string;
  externalId: string;
  before: boolean;
  after: boolean;
  pointer: string;
};
type RevertFile = { runs: string[]; rows: RevertRow[] };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 원장은 **누적**만 한다 — 줄면 멈춘다(2026-08-20 「덮어쓰면 앞 회차를 못 되돌린다」). */
function writeRevert(file: string, prev: RevertFile, next: RevertFile): void {
  if (next.rows.length < prev.rows.length)
    throw new Error(
      `되돌리기 원장이 줄었다 ${prev.rows.length} → ${next.rows.length} — 멈춘다`,
    );
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 1) + "\n", "utf8");
}

function readRevert(file: string): RevertFile {
  if (!existsSync(file)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(file, "utf8")) as RevertFile;
}

async function scan(ledgerFile: string, apply: boolean): Promise<void> {
  const ledger = JSON.parse(readFileSync(ledgerFile, "utf8")) as Ledger;
  const ids = ledger.rows.map((r) => r.problemId);
  const byId = new Map(ledger.rows.map((r) => [r.problemId, r.externalId]));
  console.log(`원장 ${path.basename(ledgerFile)} · 행 ${ids.length}`);

  const rows: {
    id: string;
    content: string;
    figureSvg: string | null;
    figureUrls: string[];
    directUseAllowed: boolean;
  }[] = [];
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const got = await prisma.problem.findMany({
      where: { id: { in: ids.slice(i, i + CHUNK) } },
      select: {
        id: true,
        content: true,
        figureSvg: true,
        figureUrls: true,
        directUseAllowed: true,
      },
    });
    rows.push(...got);
  }
  // 🔴 분모를 먼저 검산한다 — 되읽은 수가 다르면 판정이 아니라 조회가 틀린 것이다.
  //
  // ⚠️ 옛 원장에는 **이미 지워진 행**이 있다(되돌림·재적재 회차). 거기서 던지면
  //    그 원장은 **영영 안 본 채로** 남고, 쓸기 표에는 「Error」 한 줄만 남아서
  //    다음 사람이 「본 것」으로 읽는다. 그래서 `--allow-missing` 이면 **없는 수를
  //    크게 찍고** 남은 행으로 계속한다 — 「몇 건을 못 봤다」가 보고에 남는다.
  const missing = ids.length - rows.length;
  if (missing > 0) {
    if (!process.argv.includes("--allow-missing"))
      throw new Error(
        `되읽은 행이 ${rows.length}/${ids.length} 다 — 멈춘다` +
          ` (지워진 행이 있는 옛 원장이면 --allow-missing)`,
      );
    console.log(
      `⚠️ 원장의 ${missing}행이 DB 에 **없다**(지워졌다) — 남은 ${rows.length}행만 본다.`,
    );
  }

  const hasFigure = (r: (typeof rows)[number]): boolean =>
    (r.figureSvg !== null && r.figureSvg.trim() !== "") ||
    r.figureUrls.length > 0;

  // 🔴 **일부러 걸리는 입력**을 하나 대 본다. 0 이 「깨끗」인지 「못 셈」인지 가른다.
  const probe = figurelessPointer(
    false,
    "그림과 같이 삼각형 ABC에서 넓이를 구하시오.",
  );
  if (probe === null)
    throw new Error("판정을 거부한다 — 가리킴 검출기가 양성 표본을 못 잡는다");

  const target = rows.filter((r) => figurelessPointer(hasFigure(r), r.content));
  const already = target.filter((r) => !r.directUseAllowed).length;
  const todo = target.filter((r) => r.directUseAllowed);

  console.log(
    `그림 있는 행 ${rows.length - rows.filter((r) => !hasFigure(r)).length}` +
      ` · 그림 없는 행 ${rows.filter((r) => !hasFigure(r)).length}`,
  );
  console.log(
    `그림이 없는데 **발문이 그림을 가리키는** 행 ${target.length}` +
      ` (이미 잠긴 것 ${already} · 잠글 것 ${todo.length})`,
  );
  // D-20 — 무엇을 잃는지 센다. 유형별로 몇 벌이 남는지까지 찍는다.
  const byType = new Map<string, number>();
  for (const r of todo) {
    const ext = byId.get(r.id) ?? "?";
    const key = ext.replace(/^engine-mid:/, "").split("|s")[0] ?? ext;
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }
  for (const [k, n] of [...byType.entries()].sort()) {
    const total = [...byId.entries()].filter(([, e]) =>
      e.includes(`:${k}|s`),
    ).length;
    console.log(`   · ${k} — 잠글 것 ${n} / 이 회차 적재 ${total}`);
  }
  for (const r of todo.slice(0, 3))
    console.log(
      `   ${byId.get(r.id)} — 「${figurelessPointer(hasFigure(r), r.content)}」\n     ${r.content.slice(0, 110)}`,
    );

  if (!apply) {
    console.log(
      `\n드라이런이다. 실제로 잠그려면: ALLOW_SHARED_IMPORT=1 … --apply`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (todo.length === 0) {
    console.log("\n잠글 것이 없다.");
    return;
  }

  const revertFile = path.join(
    OUT_DIR,
    `lock-figureless-${path.basename(ledgerFile, ".json")}.json`,
  );
  const prev = readRevert(revertFile);
  const next: RevertFile = {
    runs: [...prev.runs, new Date().toISOString()],
    rows: [
      ...prev.rows,
      ...todo.map((r) => ({
        problemId: r.id,
        externalId: byId.get(r.id) ?? "?",
        before: true,
        after: false,
        pointer: figurelessPointer(hasFigure(r), r.content) ?? "",
      })),
    ],
  };
  // ⑴ 되돌리기를 **DB 보다 먼저** 쓴다.
  writeRevert(revertFile, prev, next);

  let done = 0;
  for (const r of todo) {
    // ⑵ **지금 값이 내가 본 값일 때만** 바꾼다 — 다른 스크립트가 그 사이 잠갔으면 건너뛴다.
    const res = await prisma.problem.updateMany({
      where: { id: r.id, directUseAllowed: true },
      data: { directUseAllowed: false },
    });
    done += res.count;
  }
  console.log(`\n잠근 것 ${done}/${todo.length} · 되돌리기 ${revertFile}`);

  // 🔴 믿지 않고 다시 읽는다.
  const back = await prisma.problem.findMany({
    where: { id: { in: todo.map((r) => r.id) } },
    select: { id: true, directUseAllowed: true },
  });
  const bad = back.filter((p) => p.directUseAllowed);
  if (bad.length > 0)
    throw new Error(`${bad.length}건이 아직 출제허용이다 — 멈춘다`);
  console.log(`✅ ${back.length}건 전부 출제에서 빠졌다`);
}

async function revert(file: string): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const led = readRevert(file);
  let done = 0;
  for (const r of led.rows) {
    // 지금 값이 **내가 쓴 값(after)** 일 때만 되돌린다.
    const res = await prisma.problem.updateMany({
      where: { id: r.problemId, directUseAllowed: r.after },
      data: { directUseAllowed: r.before },
    });
    done += res.count;
  }
  console.log(`되돌린 것 ${done}/${led.rows.length}`);
}

async function main(): Promise<void> {
  const ledger = arg("--ledger");
  const rev = arg("--revert");
  if (rev) await revert(rev);
  else if (ledger) await scan(ledger, process.argv.includes("--apply"));
  else
    console.log(
      "--ledger <원장.json> 또는 --revert <되돌리기.json> 이 필요하다",
    );
  await prisma.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
