/**
 * **행 고침 묶음을 공유 DB 에** — 문항 행의 정해진 칸(본문 · 정답 · 풀이 · 그림 주소 · 출제 허용)을 «앞 → 뒤»로.
 * 판정 · 쓰기는 `rowRepairsCore.ts`. 기본은 **드라이런**(SELECT 만).
 *
 *   npx tsx --env-file=<.env> scripts/qa/apply-row-repairs.ts <묶음.json>                                   # 드라이런
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/apply-row-repairs.ts <묶음.json> --apply     # 적용(리드)
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/apply-row-repairs.ts <원장.json> --revert    # 되돌리기
 *
 * 🔴 지킴(D-164 §4 · Codex 2회차 H — 옛 저장소 밖 도구는 본문만 견주고 되읽기가 없었다):
 *   - 적용은 묶음의 **모든 행이 지금 «앞»과 같을 때만** — 이미 그 값 · 어긋남 · 없는 행이 하나라도 있으면 쓰지 않는다
 *   - 원장(쓸 행 전부 · 바꾸는 칸 전부의 앞뒤)을 쓰기 **전에** 남긴다 — 이름에 시각이 붙고, 있는 파일은 덮지 않는다
 *   - 한 거래(lock_timeout 3s) 안에서 행마다 `UPDATE … WHERE id AND 바꾸는 칸 전부 = «앞»` — 갱신 1행이 아니면 거래째 되돌린다
 *   - 끝난 뒤 다시 읽어 모든 행이 «뒤»와 같은지 본다
 *   - `--revert` 는 원장을 받아 «앞 = 쓴 값 · 뒤 = 처음 값»으로 같은 검사를 한다
 * ⚠️ 본문 · 정답 · 풀이를 바꾼 행(적용 · 되돌림 모두)은 DB 트리거가 실제 형식 칸을 비운다(«미계산» — 읽는 길은 그 자리에서 다시 센다).
 *    적용 · 되돌림 뒤 실제 형식 채우기(backfill)를 돌린다(2026-10-21 앞 회차와 같다).
 * ⚠️ 그림 주소(`figureUrls`)는 바꾸지 않는다 — 그림 치수 · 원본 mm · 보기 그림 번호가 번호로 붙어 있어 같이 옮길 수 없다(대조용으로만).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

import {
  classifyRow,
  unwrittenRows,
  validateRepairRows,
  writeRowsCas,
  type Direction,
  type Fields,
  type RepairRow,
} from "./rowRepairsCore";

const SELECT = { id: true, content: true, answer: true, solution: true, figureUrls: true, directUseAllowed: true } as const;

type Reader = { problem: { findMany: PrismaClient["problem"]["findMany"] } };
async function readNow(p: Reader, ids: string[]): Promise<Map<string, Fields>> {
  const out = new Map<string, Fields>();
  for (let i = 0; i < ids.length; i += 500) {
    const got = await p.problem.findMany({ where: { id: { in: ids.slice(i, i + 500) } }, select: SELECT });
    for (const r of got) out.set(r.id, r);
  }
  return out;
}

async function main(): Promise<void> {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) throw new Error("묶음 파일이 필요하다");
  const unknown = flags.filter((f) => f !== "--apply" && f !== "--revert");
  if (unknown.length) throw new Error(`모르는 인자: ${unknown.join(" ")}`);
  const d: Direction = flags.includes("--revert") ? "revert" : "apply";
  const write = flags.includes("--apply") || flags.includes("--revert");
  if (flags.includes("--apply") && flags.includes("--revert")) throw new Error("--apply 와 --revert 는 같이 못 쓴다");
  if (write && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)");

  const rows = validateRepairRows(JSON.parse(readFileSync(file, "utf8")));
  const p = new PrismaClient();
  try {
    const now = await readNow(p, rows.map((r) => r.id));
    const by = { ready: [] as RepairRow[], done: [] as RepairRow[], drift: [] as RepairRow[], missing: [] as RepairRow[] };
    for (const r of rows) by[classifyRow(now.get(r.id), r, d)].push(r);
    const fields = new Map<string, number>();
    for (const r of rows) for (const k of Object.keys(r.before)) fields.set(k, (fields.get(k) ?? 0) + 1);
    console.log(
      `${d === "apply" ? "고칠" : "되돌릴"} 행 ${by.ready.length}/${rows.length} · 이미 그 값 ${by.done.length} · 지금 값이 달라 못 씀 ${by.drift.length} · 없는 행 ${by.missing.length}` +
        ` · 바꾸는 칸 ${[...fields].map(([k, n]) => `${k} ${n}`).join(" · ")}`,
    );
    for (const [kind, list] of [["이미 그 값", by.done], ["어긋남", by.drift], ["없음", by.missing]] as const)
      for (const r of list.slice(0, 10)) console.log(`   ⚠️ ${kind}: ${r.code} (${r.id})`);
    if (!write) {
      console.log(`드라이런이다. ${by.ready.length === rows.length ? "전부 쓸 수 있다." : "🔴 전부 쓸 수 있을 때만 적용된다."} 적용: ALLOW_SHARED_IMPORT=1 … ${d === "apply" ? "--apply" : "--revert"}`);
      return;
    }
    if (by.ready.length !== rows.length)
      throw new Error(`묶음의 ${rows.length - by.ready.length}행이 지금 «${d === "apply" ? "앞" : "뒤"}» 값이 아니다 — 확정 목록과 다르다. 쓰지 않는다`);

    // 원장을 먼저 — 이 파일이 곧 되돌림 입력이다(같은 꼴의 묶음)
    const ledger = `${file.replace(/\.json$/, "")}.${d}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    writeFileSync(
      ledger,
      JSON.stringify(
        rows.map((r) => ({ id: r.id, code: r.code, reasons: r.reasons, before: d === "apply" ? r.before : r.after, after: d === "apply" ? r.after : r.before })),
        null,
        1,
      ),
      { flag: "wx" }, // 있는 파일은 덮지 않는다(같이 돌아도)
    );
    console.log(`원장 ${path.resolve(ledger)}`);

    const written = await p.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '3s'");
        const n = await writeRowsCas(tx as never, rows, d);
        // 커밋 전에 같은 거래에서 다시 읽는다 — 어긋나면 던져서 거래째 되돌린다
        const inTx = unwrittenRows(await readNow(tx, rows.map((r) => r.id)), rows, d);
        if (inTx.length) throw new Error(`거래 안 되읽기에서 ${inTx.length}행이 쓴 값과 다르다 — 거래를 되돌린다`);
        return n;
      },
      { timeout: 300_000, maxWait: 20_000 },
    );
    console.log(`썼다 ${written}행`);

    // 믿지 않고 커밋 뒤에도 다시 읽는다 — 여기서 어긋나면 쓰기는 이미 커밋됐다(원장으로 --revert 한다)
    const wrong = unwrittenRows(await readNow(p, rows.map((r) => r.id)), rows, d);
    if (wrong.length)
      throw new Error(`커밋은 됐는데 커밋 뒤 되읽기에서 ${wrong.length}행이 쓴 값과 다르다(그 사이 남이 고쳤을 수 있다) — ${wrong.slice(0, 5).map((r) => r.code).join(" · ")} · 원장 ${ledger}`);
    console.log(`✅ 되읽기 ${rows.length}행 전부 일치`);
  } finally {
    await p.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch((e) => {
    console.error(`ROW_REPAIR_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  });
