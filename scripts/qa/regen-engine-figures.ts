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
 *   engine-mid:<유형키>|s<씨앗>|v<변형>|<문항유형>              → generateMiddleProblem
 *   engine-elem:<학년>|<단원>|<소단원>|f<문형>|<문항유형>|s<씨앗> → generateElementaryForm
 *   (옛 형식 — 문항유형·문형이 없던 시절 — 도 그대로 받는다. `respec` 주석 참조.)
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
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import type { ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { isDirectScript } from "../import/isDirectScript";

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

/**
 * 원장을 읽는다 — **`.gz` 를 먼저** 본다.
 *
 * 🔴 이 원장은 SVG 를 통째로 담아 금세 커진다(2026-08-30 회차에서 **28MB**).
 *    그대로 커밋하면 저장소가 무거워지고, 안 커밋하면 되돌리기가 **이 컴퓨터에만**
 *    남는다 — 그건 2026-08-18 에 실제로 물린 사고다. gzip 으로 1.3MB 가 되므로
 *    **압축해서 커밋한다.** 옛 `.json` 도 그대로 읽는다(그때 쓴 원장이 있다).
 */
export function ledgerPaths(file: string): { json: string; gz: string } {
  const json = file.endsWith(".gz") ? file.slice(0, -3) : file;
  return { json, gz: `${json}.gz` };
}

export function readLedger(file: string): Ledger {
  const { json, gz } = ledgerPaths(file);
  if (existsSync(gz))
    return JSON.parse(gunzipSync(readFileSync(gz)).toString("utf8")) as Ledger;
  if (existsSync(json)) return JSON.parse(readFileSync(json, "utf8")) as Ledger;
  return { label: "regen-engine-figures", rows: [] };
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

/**
 * `externalId` 를 되짚어 그때의 문항(그러므로 그림 스펙)을 다시 만든다.
 *
 * 🔴 **형식이 두 벌이다 — 적재기가 바꿨는데 여기가 안 따라갔었다.**
 *    2026-08-30 에 드라이런을 돌리니 5,005건 중 **4,640건이 「되짚기 실패」**였다.
 *    `load-engine-problems.ts` 는 뒤에 `|{문항유형}` 을 붙이고, 초등은 갈래(tier)가
 *    아니라 **문형**(`f{id}`)으로 낸다. 여기 정규식은 `$` 로 끝을 못 박고 있어서
 *    새 형식이 하나도 안 걸렸다. 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이
 *    눈이 먼다」의 또 한 번(CLAUDE.md 2026-08-18) — 다만 여기서는 **조용히 0** 이
 *    아니라 「되짚기 실패」로 세어져서 드러났다. 그 수를 찍게 해 둔 것이 살렸다.
 *
 *    지금 적재기가 쓰는 것(정본은 `load-engine-problems.ts`):
 *      중등  `engine-mid:{키}|s{씨앗}|v{변형}|{문항유형}`
 *      초등  `engine-elem:{학년}|{대단원}|{소단원}|f{문형}|{문항유형}|s{씨앗}`
 *    옛 형식(문항유형·문형이 없던 시절)도 그대로 받는다 — 그때 적재된 행이 아직 있다.
 */
export function respec(
  externalId: string,
): { content: string; spec: unknown } | null {
  // 중등 — 뒤에 `|{문항유형}` 이 붙었든 안 붙었든 받는다.
  const mid = /^engine-mid:(.+)\|s(\d+)\|v(\d+)(?:\|[^|]*)?$/.exec(externalId);
  if (mid) {
    const p = generateMiddleProblem(mid[1]!, Number(mid[2]), Number(mid[3]));
    return { content: p.content, spec: p.figureSpec ?? null };
  }

  // 초등 ⑴ **문형** 판 — `f{문형}` 이면 갈래가 아니라 문형으로 되짚는다.
  const elemForm =
    /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|f([^|]+)\|[^|]*\|s(\d+)$/.exec(
      externalId,
    );
  if (elemForm) {
    const unit = elementaryUnits().find(
      (u) =>
        u.grade === elemForm[1] &&
        u.chapter === elemForm[2] &&
        u.section === elemForm[3],
    );
    if (!unit) return null;
    const p = generateElementaryForm(unit, Number(elemForm[5]), elemForm[4]!);
    return { content: p.content, spec: p.figureSpec ?? null };
  }

  // 초등 ⑵ 옛 **갈래** 판.
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

/**
 * 「적재본의 발문이 지금 생성기의 것과 **같은가**」.
 *
 * 🔴 **적재기가 덧붙인 것을 «차이»로 세면 안 된다.** 한 문항이 단답형·객관식 **두 벌**로
 *    들어가는데, 객관식 본문에는 적재기가 보기 ①~⑤ 를 **뒤에 붙인다**. 엔진 원문과
 *    다른 게 당연하다 — 그냥 견주면 객관식 절반이 통째로 「발문이 달라졌다」로 빠지고,
 *    그 그림은 영영 안 고쳐진다. (CLAUDE.md 2026-08-29 「3,903행이 바뀌었다」와 같은 함정.)
 *
 * ⚠️ 그렇다고 `startsWith` 하나로 느슨하게 두면 **진짜 발문 변경을 놓친다** — 발문이
 *    줄어들었는데 옛 발문이 새 발문으로 시작하면 통과해 버린다. 그래서 남는 꼬리가
 *    **정말 보기인지**(동그라미 숫자로 시작하는지) 함께 묻는다.
 */
export function sameStem(engine: string, loaded: string): boolean {
  const a = norm(engine);
  const b = norm(loaded);
  if (a === b) return true;
  if (!b.startsWith(a)) return false;
  const tail = b.slice(a.length).trim();
  return /^[①②③④⑤]/.test(tail);
}

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
    if (!sameStem(again.content, row.content)) {
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
  // **압축해서** 쓴다 — 안 그러면 28MB 라 커밋을 못 하고, 그러면 되돌리기가
  // 이 컴퓨터에만 남는다(2026-08-18 사고). 옛 `.json` 이 있으면 지운다 — 둘이
  // 남으면 다음 사람이 **어느 것이 정본인지** 모른다.
  const { json: ledgerJson, gz: ledgerGz } = ledgerPaths(ledgerFile);
  writeFileSync(
    ledgerGz,
    gzipSync(
      JSON.stringify({ label: "regen-engine-figures", rows: merged }, null, 1),
    ),
  );
  // ⚠️ `rmSync` 는 **금지**다 — Node(win32)가 비ASCII 경로에서 메시지 없이 죽는다
  //    (2026-08-19, `noRmSync.test.ts` 가 지킨다. 방금 그 시험이 나를 잡았다).
  if (existsSync(ledgerJson)) unlinkSync(ledgerJson);
  console.log(`원장 ${merged.length}행 → ${path.relative(REPO, ledgerGz)}`);

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

// 🔴 **import 만으로 돌면 안 된다.** 시험이 `respec`·`sameStem` 을 부르려고 이 모듈을
//    읽는 순간 `main()` 이 돌아 공유 DB 에 붙는다(D-31 이 막는 것은 «쓰기»지 «연결»이
//    아니다). 저장소에 이미 있는 `isDirectScript` 로 직접 실행일 때만 돈다.
if (isDirectScript(import.meta.url)) {
  main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
}
