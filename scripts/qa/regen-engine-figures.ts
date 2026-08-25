/**
 * 엔진 문항의 **그림만 다시 그려** 공유 DB 에 넣는다.
 *
 *     npx tsx scripts/qa/regen-engine-figures.ts                       # 드라이런(기본)
 *     npx tsx scripts/qa/regen-engine-figures.ts --out=<디렉터리>       # SVG 를 파일로도 남긴다
 *     ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/regen-engine-figures.ts --apply
 *     ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/regen-engine-figures.ts --revert=<원장.json>
 *
 * ## 왜 필요한가
 *
 * 도형 엔진을 고치면 **이미 DB 에 들어간 SVG 는 그대로다** — `figureSvg` 는 문자열이라
 * 스스로 낡는다. 그래서 「엔진을 고쳤다」는 「지면이 고쳐졌다」가 아니다.
 * `load-engine-problems.ts` 는 `externalId` 중복을 막으므로 다시 돌려도 그림은 안 바뀐다.
 *
 * ## 스펙은 어디서 오나 — `externalId` 가 되짚어 준다
 *
 *   engine-mid:<유형키>|s<씨앗>|v<변형>          → generateMiddleProblem(키, 씨앗, 변형)
 *   engine-elem:<학년>|<단원>|<소단원>|<갈래>|s<씨앗> → generateElementaryProblem(단원, 씨앗, 갈래)
 *
 * 생성기는 **결정론적**이라 같은 입력이면 같은 스펙이 나온다. 그것을 믿지 않고,
 * 되짚은 `content` 가 DB 의 `content` 와 **다르면 그 행은 건너뛴다** — 생성기가 그
 * 사이에 바뀌었으면 그림만 새 문항 것으로 갈아 끼우는 셈이 되기 때문이다.
 * 건너뛴 수를 반드시 찍는다(조용히 빠지면 「전량 다시 그렸다」가 거짓말이 된다).
 *
 * ## 원장
 *
 * DB 보다 **먼저** 쓰고 **누적**만 한다(2026-08-20 「덮어쓰면 앞 회차는 못 되돌린다」).
 * 되돌릴 때는 **지금 값이 자기가 쓴 값일 때만** 되돌린다(2026-08-18).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import type { ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";

// 관리용 스크립트는 자기 클라이언트를 쓴다 — `src/lib/db` 의 바깥벽 확장은 읽기를
// `pool='shared'` 로 좁혀서 「내가 고친 행이 정말 보이나」가 동어반복이 된다.
const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

type LedgerRow = {
  id: string;
  problemCode: string | null;
  externalId: string;
  before: string | null;
  after: string;
};

type Ledger = { label: string; rows: LedgerRow[] };

function readLedger(file: string): Ledger {
  if (!existsSync(file)) return { label: "regen-engine-figures", rows: [] };
  return JSON.parse(readFileSync(file, "utf8")) as Ledger;
}

/** 처음 before · 마지막 after 로 **누적**한다 — 회차를 견뎌야 한다(2026-08-20). */
function mergeLedgerRows(prev: LedgerRow[], next: LedgerRow[]): LedgerRow[] {
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const row of next) {
    const old = byId.get(row.id);
    byId.set(row.id, old ? { ...row, before: old.before } : row);
  }
  return [...byId.values()];
}

/** `externalId` 를 되짚어 그때의 문항(그러므로 그림 스펙)을 다시 만든다. */
function respec(externalId: string): { content: string; spec: unknown } | null {
  const mid = /^engine-mid:(.+)\|s(\d+)\|v(\d+)$/.exec(externalId);
  if (mid) {
    const p = generateMiddleProblem(mid[1]!, Number(mid[2]), Number(mid[3]));
    return { content: p.content, spec: p.figureSpec ?? null };
  }
  const elem = /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|s(\d+)$/.exec(
    externalId,
  );
  if (elem) {
    const unit = elementaryUnits().find(
      (u) =>
        u.grade === elem[1] && u.chapter === elem[2] && u.section === elem[3],
    );
    if (!unit) return null;
    const p = generateElementaryProblem(
      unit,
      Number(elem[5]),
      elem[4] as ElemTier,
    );
    return { content: p.content, spec: p.figureSpec ?? null };
  }
  return null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const revert = args.find((a) => a.startsWith("--revert="))?.slice(9);
  const outDir = args.find((a) => a.startsWith("--out="))?.slice(6);
  const only = args.find((a) => a.startsWith("--only="))?.slice(7);
  const ledgerFile = path.join(LEDGER_DIR, "regen-engine-figures.json");

  if (revert) {
    if (process.env.ALLOW_SHARED_IMPORT !== "1")
      throw new Error(
        "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
      );
    const led = readLedger(revert);
    let back = 0;
    let skipped = 0;
    for (const row of led.rows) {
      // 지금 값이 **자기가 쓴 값일 때만** 되돌린다 — 그 사이 다른 트랙이 고쳤을 수 있다.
      const now = await prisma.problem.findUnique({
        where: { id: row.id },
        select: { figureSvg: true },
      });
      if (!now || now.figureSvg !== row.after) {
        skipped += 1;
        continue;
      }
      await prisma.problem.update({
        where: { id: row.id },
        data: {
          figureSvg: row.before,
          figureSource: row.before ? "engine" : null,
        },
      });
      back += 1;
    }
    console.log(`되돌림 ${back} · 건너뜀(값이 내 것이 아님) ${skipped}`);
    await prisma.$disconnect();
    return;
  }

  const rows = await prisma.problem.findMany({
    where: {
      figureSvg: { not: null },
      externalId: { startsWith: "engine-" },
      ...(only ? { externalId: { startsWith: only } } : {}),
    },
    select: {
      id: true,
      problemCode: true,
      externalId: true,
      content: true,
      figureSvg: true,
    },
    orderBy: { problemCode: "asc" },
  });
  console.log(`대상 ${rows.length}건`);

  if (outDir) mkdirSync(outDir, { recursive: true });

  let same = 0;
  let changed = 0;
  let noSpec = 0;
  let drifted = 0;
  let failed = 0;
  const ledgerRows: LedgerRow[] = [];
  const failures: string[] = [];

  for (const row of rows) {
    const again = respec(row.externalId!);
    if (!again) {
      drifted += 1;
      failures.push(`${row.problemCode}: externalId 를 못 되짚음`);
      continue;
    }
    if (norm(again.content) !== norm(row.content)) {
      // 생성기가 그 사이 바뀌었다 — 그림만 갈아 끼우면 발문과 그림이 갈린다.
      drifted += 1;
      failures.push(`${row.problemCode}: 발문이 달라졌다(생성기 변경)`);
      continue;
    }
    if (!again.spec) {
      noSpec += 1;
      failures.push(`${row.problemCode}: 지금 생성기는 그림을 안 낸다`);
      continue;
    }
    const drawn = await renderFigureSpec(again.spec);
    if (!drawn.ok) {
      failed += 1;
      failures.push(`${row.problemCode}: ${drawn.error}`);
      continue;
    }
    if (outDir)
      writeFileSync(path.join(outDir, `${row.problemCode}.svg`), drawn.svg);
    if (drawn.svg === row.figureSvg) {
      same += 1;
      continue;
    }
    changed += 1;
    ledgerRows.push({
      id: row.id,
      problemCode: row.problemCode,
      externalId: row.externalId!,
      before: row.figureSvg,
      after: drawn.svg,
    });
  }

  console.log(
    `그대로 ${same} · 바뀜 ${changed} · 그림 없음 ${noSpec} · ` +
      `되짚기 실패 ${drifted} · 렌더 실패 ${failed}`,
  );
  if (failures.length) {
    console.log("\n못 그린 것 (앞 20):");
    for (const f of failures.slice(0, 20)) console.log(`   ${f}`);
  }

  if (!apply) {
    console.log(
      `\n드라이런이다. 넣으려면: ALLOW_SHARED_IMPORT=1 … --apply` +
        (outDir ? `\nSVG 는 ${outDir} 에 남겼다.` : ""),
    );
    await prisma.$disconnect();
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );

  // 원장을 **먼저** 쓴다.
  mkdirSync(LEDGER_DIR, { recursive: true });
  const prev = readLedger(ledgerFile);
  const merged = mergeLedgerRows(prev.rows, ledgerRows);
  if (merged.length < prev.rows.length)
    throw new Error(
      `원장이 줄었다 (${prev.rows.length} → ${merged.length}) — 덮어쓰면 앞 회차를 못 되돌린다`,
    );
  writeFileSync(
    ledgerFile,
    JSON.stringify({ label: "regen-engine-figures", rows: merged }, null, 1),
  );
  console.log(`원장 ${merged.length}행 → ${path.relative(REPO, ledgerFile)}`);

  let wrote = 0;
  for (const row of ledgerRows) {
    await prisma.problem.update({
      where: { id: row.id },
      data: { figureSvg: row.after, figureSource: "engine" },
    });
    wrote += 1;
  }
  console.log(`DB 갱신 ${wrote}건`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
