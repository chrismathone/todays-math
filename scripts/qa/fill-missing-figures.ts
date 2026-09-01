/**
 * **그림 없이 들어간 행에 그림을 넣는다** (2026-09-02).
 *
 * ## 왜 필요한가 — 렌더 길이 **두 벌**이었다
 *
 * 적재기(`scripts/import/load-engine-problems.ts`)가 제 손으로 만든 `renderFigure` 는
 * `spawnSync` 한 번이 전부다 — **재시도도, 치수 떨어뜨림도, 시간 제한도 없다.**
 * 제품 함수 `renderFigureSpec` 은 `no room` 류 에러가 **치수 이름을 대면 그 치수를 빼고
 * 다시 그린다.** 그래서 적재기 길에서 실패한 스펙이 제품 길에서는 대부분 그려진다.
 * 실측(서로 다른 스펙 54개): 맨손 **54/54 실패** · 제품 함수 **51/54 성공**.
 *
 * 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라」(2026-08-18) —
 * 적재기 쪽도 제품 함수를 쓰게 고쳤다. 이 스크립트는 **이미 들어간 행**을 되살린다.
 *
 * ## 🔴 치수를 떨어뜨리는 것은 공짜가 아니다
 *
 * 떨어진 치수의 값을 **발문이 말하지 않으면** 그 문항은 못 푸는 문항이 된다.
 * 지금(그림 없음)은 티라도 나지만, 치수 하나 빠진 그림은 **멀쩡해 보이는 오답**이다
 * (2026-08-30 에 같은 자리에서 「새로 떨어진 8자리는 전부 발문이 그 값을 말한다」를 확인했다).
 * 그래서 이 스크립트는 **떨어뜨린 치수를 행마다 원장에 적고**, `--require-safe` 를 주면
 * 「발문이 그 값을 말하는가」를 통과한 행만 넣는다.
 *
 * ## 쓰는 법
 *
 *     npx tsx scripts/qa/fill-missing-figures.ts --rows <행목록.json>            # 드라이런
 *     ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/fill-missing-figures.ts \
 *       --rows <행목록.json> --apply
 *     ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/fill-missing-figures.ts \
 *       --revert <원장.json>
 *
 * `--rows` 는 `find-figureless-siblings.ts --emit` 이 내는 모양이다
 * (`{ id, external_id, content, ... }[]`).
 *
 * ⚠️ **멱등하다** — 이미 그림이 붙은 행은 건드리지 않는다.
 * ⚠️ **원장을 DB 보다 먼저 쓴다**(50행마다 흘려 쓴다). 도중에 죽어도 되돌릴 수 있다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { buildElemRows, buildMiddleRows } from "../import/load-engine-problems";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const prisma = new PrismaClient();
const REPO = path.resolve(__dirname, "..", "..");
const LEDGER_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

type InputRow = {
  id: string;
  external_id: string;
  content: string;
  problem_code?: string;
  grade?: string;
  family_key?: string;
};

type LedgerRow = {
  problemId: string;
  externalId: string;
  problemCode?: string;
  /** 되돌릴 값 — 이 행이 원래 갖고 있던 것. 그림이 없었으므로 언제나 null 이다. */
  before: string | null;
  /** 넣은 SVG 의 길이(원장을 가볍게 두려고 본문은 안 적는다 — 되돌리기는 before 만 쓴다). */
  afterLength: number;
  droppedDimensions: string[];
};

type Ledger = {
  runs: { at: string; count: number }[];
  rows: LedgerRow[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readLedger(file: string): Ledger {
  if (!existsSync(file)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(file, "utf-8")) as Ledger;
}

/**
 * 🔴 **누적만 한다.** 통째로 쓰면 앞 회차를 되돌릴 수 없다(2026-08-20 사고).
 * 행이 **줄면 멈춘다** — 줄어드는 것은 언제나 사고다.
 */
function writeLedger(file: string, prev: Ledger, next: Ledger): void {
  if (next.rows.length < prev.rows.length)
    throw new Error(
      `원장 행이 ${prev.rows.length} → ${next.rows.length} 로 **줄었다**. 멈춘다.`,
    );
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 1), "utf-8");
}

/**
 * **떨어뜨린 치수의 값을 발문이 말하는가.**
 *
 * 그림에서 치수가 빠져도, 그 값을 **발문이 이미 말하고 있으면** 학생은 풀 수 있다.
 * 말하지 않으면 그 문항은 못 푸는 문항이 된다 — 지금(그림 없음)보다 더 나쁘다.
 * 그림 없는 것은 티라도 나지만, 치수 하나 빠진 그림은 **멀쩡해 보이는 오답**이다.
 *
 * ## 🔴 자를 두 번 고쳤다 — 스펙의 «점 이름»은 지면의 «라벨»이 아니다
 *
 * 처음엔 치수 이름(`d_P1P2`)에서 점을 뜯어 발문에서 «P1P2» 를 찾았다. 12건이 «위험»으로
 * 걸렸는데 **전부 거짓 경보**였다 — 스펙이 점을 `P1`·`P2` 로 부르면서 `labels` 로
 * **`P1→A`·`P2→B`** 를 붙이고, 발문은 당연히 `AB` 라고 쓴다. 표본 하나를 열어 보고서야
 * 드러났다(「판정이 놀라운 값을 내면 **재는 쪽**을 먼저 의심하라」, 2026-08-29).
 *
 * 그래서 지금은 **둘 다** 본다:
 *   ㉠ 치수가 **제 라벨로 값을 들고 있으면**(예: `"4 cm"`) 그 값이 발문에 있는가 —
 *      이게 가장 곧은 물음이다. 「이 수가 발문에 적혀 있나」.
 *   ㉡ 점 이름을 `labels` 로 **지면 이름으로 풀어** 그 선분이 발문에 있는가.
 * 둘 중 하나라도 통과하면 안전으로 본다. 판정 불가는 **위험 쪽**으로 민다.
 */
export function dropIsCoveredByStem(
  dimName: string,
  stem: string,
  spec?: Record<string, unknown>,
): { safe: boolean; why: string } {
  const dims = (spec?.dimensions ?? {}) as Record<
    string,
    { points?: unknown; label?: unknown } | undefined
  >;
  const entry = dims[dimName];
  const labels = (spec?.labels ?? {}) as Record<string, unknown>;
  /** 스펙의 점 이름(`P1`) → 지면 라벨(`A`). 라벨이 객체면 `text` 를 쓴다. */
  const shown = (pt: string): string => {
    const v = labels[pt];
    if (typeof v === "string") return v;
    if (
      v &&
      typeof v === "object" &&
      typeof (v as { text?: unknown }).text === "string"
    )
      return (v as { text: string }).text;
    return pt;
  };

  // ㉠ 치수가 든 값이 발문에 있는가 — 「4 cm」의 **4**를 본다.
  const lab = typeof entry?.label === "string" ? entry.label : "";
  const num = /(-?\d+(?:\.\d+)?)/.exec(lab)?.[1];
  if (num) {
    // 발문의 수를 전부 뽑아 대조한다(LaTeX 안에 있어도 걸린다).
    const inStem = new Set(stem.match(/-?\d+(?:\.\d+)?/g) ?? []);
    if (inStem.has(num))
      return { safe: true, why: `발문이 값 ${lab} 을 말한다` };
  }

  // ㉡ 점 이름을 지면 라벨로 풀어 그 선분이 발문에 있는가.
  const pts = Array.isArray(entry?.points)
    ? (entry!.points as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : ((/^d_?(.+)$/.exec(dimName)?.[1] ?? "").match(/[A-Za-z]\d*/g) ?? []);
  if (pts.length >= 2) {
    const [a, b] = [shown(pts[0]!), shown(pts[1]!)];
    const seg = new RegExp(`${a}\\s*${b}|${b}\\s*${a}`);
    if (seg.test(stem))
      return { safe: true, why: `발문이 선분 ${a}${b} 를 말한다` };
    return {
      safe: false,
      why: `발문에 선분 ${a}${b} 도, 값 ${lab || "?"} 도 안 보인다`,
    };
  }
  return {
    safe: false,
    why: `치수를 못 읽었다(${dimName}${lab ? ` "${lab}"` : ""})`,
  };
}

/** externalId → 그 행의 figureSpec. 계획 파일 전부를 훑어 한 번만 만든다. */
function buildSpecIndex(
  planGlobDir: string,
): Map<string, Record<string, unknown>> {
  const specs = new Map<string, Record<string, unknown>>();
  const files = readdirSync(planGlobDir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    let plan: {
      seedBase?: number;
      targets: { engine: string }[];
    };
    try {
      plan = JSON.parse(readFileSync(path.join(planGlobDir, f), "utf-8"));
    } catch {
      continue;
    }
    if (!Array.isArray(plan.targets)) continue;
    const seedBase = plan.seedBase ?? 20260827;
    for (const t of plan.targets) {
      let rows: { externalId: string; figureSpec?: unknown }[] = [];
      try {
        rows =
          t.engine === "elem"
            ? buildElemRows(t as never, seedBase)
            : t.engine === "middle"
              ? buildMiddleRows(t as never, seedBase)
              : [];
      } catch {
        continue;
      }
      for (const r of rows)
        if (r.figureSpec && !specs.has(r.externalId))
          specs.set(r.externalId, r.figureSpec as Record<string, unknown>);
    }
  }
  return specs;
}

async function main(): Promise<void> {
  const revertFile = arg("--revert");
  if (revertFile) return revert(revertFile);

  const rowsFile = arg("--rows");
  if (!rowsFile) {
    console.log("--rows <행목록.json> 또는 --revert <원장.json> 이 필요하다");
    process.exitCode = 1;
    return;
  }
  const doApply = process.argv.includes("--apply");
  const requireSafe = process.argv.includes("--require-safe");
  const input = JSON.parse(readFileSync(rowsFile, "utf-8")) as InputRow[];
  console.log(
    `대상 ${input.length}행 · 안전 검사 ${requireSafe ? "켬" : "끔"}`,
  );

  const specs = buildSpecIndex(path.join(REPO, "scripts", "import", "plans"));
  console.log(`계획에서 되만든 스펙 ${specs.size}개`);

  // 🔴 **분모를 먼저 세어 찍는다** — 「고친 것 + 건너뛴 것」이 대상 수와 안 맞으면 멈춘다.
  const noSpec: string[] = [];
  const todo: InputRow[] = [];
  for (const r of input) {
    if (specs.has(r.external_id)) todo.push(r);
    else noSpec.push(r.external_id);
  }
  console.log(
    `스펙을 되만든 것 ${todo.length} · 못 만든 것 ${noSpec.length}` +
      (noSpec.length > 0 ? ` (예: ${noSpec.slice(0, 3).join(", ")})` : ""),
  );

  // 스펙 단위로 한 번만 그린다 — 같은 스펙이 단답형·객관식 두 행에 쓰인다.
  const bySpec = new Map<
    string,
    { svg: string | null; dropped: string[]; error?: string }
  >();
  let drawn = 0;
  let failed = 0;
  for (const r of todo) {
    const spec = specs.get(r.external_id)!;
    const key = JSON.stringify(spec);
    if (bySpec.has(key)) continue;
    const res = await renderFigureSpec(spec);
    if (res.ok) {
      bySpec.set(key, {
        svg: res.svg,
        dropped:
          (res as { droppedDimensions?: string[] }).droppedDimensions ?? [],
      });
      drawn += 1;
    } else {
      bySpec.set(key, { svg: null, dropped: [], error: res.error });
      failed += 1;
    }
  }
  console.log(
    `렌더 — 성공 ${drawn} · 실패 ${failed} (서로 다른 스펙 ${bySpec.size}개만 그렸다)`,
  );

  // 안전 판정: 떨어뜨린 치수를 발문이 말하는가.
  const unsafe: { id: string; code?: string; dim: string; why: string }[] = [];
  const ready: { row: InputRow; svg: string; dropped: string[] }[] = [];
  for (const r of todo) {
    const got = bySpec.get(JSON.stringify(specs.get(r.external_id)!))!;
    if (!got.svg) continue;
    const bad = got.dropped
      .map((d) => ({
        d,
        v: dropIsCoveredByStem(d, r.content, specs.get(r.external_id)),
      }))
      .filter((x) => !x.v.safe);
    if (bad.length > 0) {
      for (const b of bad)
        unsafe.push({
          id: r.id,
          code: r.problem_code,
          dim: b.d,
          why: b.v.why,
        });
      if (requireSafe) continue;
    }
    ready.push({ row: r, svg: got.svg, dropped: got.dropped });
  }
  const noDrop = ready.filter((x) => x.dropped.length === 0).length;
  console.log(
    `넣을 것 ${ready.length}행 (치수를 하나도 안 뺀 것 ${noDrop}행 · 뺀 것 ${ready.length - noDrop}행)`,
  );
  if (unsafe.length > 0) {
    console.log(
      `\n⚠️ **발문이 값을 말하지 않는 채로 치수가 빠지는 자리 ${unsafe.length}건**` +
        (requireSafe
          ? " — `--require-safe` 라서 **뺐다**"
          : " — 그대로 넣는다"),
    );
    for (const u of unsafe.slice(0, 10))
      console.log(`   · ${u.code ?? u.id} [${u.dim}] ${u.why}`);
    if (unsafe.length > 10) console.log(`   … ${unsafe.length - 10}건 더`);
  }

  if (!doApply) {
    console.log(
      `\n드라이런이다. 실제로 넣으려면: ALLOW_SHARED_IMPORT=1 … --apply`,
    );
    await prisma.$disconnect();
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );

  const ledgerFile = path.join(LEDGER_DIR, "fill-missing-figures.json");
  const prev = readLedger(ledgerFile);
  const done: LedgerRow[] = [];
  const RUN_AT = new Date().toISOString();
  const flush = (): void =>
    writeLedger(ledgerFile, prev, {
      runs: [...prev.runs, { at: RUN_AT, count: done.length }],
      rows: [...prev.rows, ...done],
    });

  for (const item of ready) {
    // 🔴 **멱등** — 그 사이 누가 그림을 넣었으면 건드리지 않는다.
    const now = await prisma.problem.findUnique({
      where: { id: item.row.id },
      select: { figureSvg: true },
    });
    if (!now || now.figureSvg !== null) continue;
    done.push({
      problemId: item.row.id,
      externalId: item.row.external_id,
      problemCode: item.row.problem_code,
      before: null,
      afterLength: item.svg.length,
      droppedDimensions: item.dropped,
    });
    // 원장을 **먼저** 흘려 쓴다 — 도중에 죽어도 되돌릴 수 있게.
    if (done.length % 50 === 0) flush();
    await prisma.problem.update({
      where: { id: item.row.id },
      data: { figureSvg: item.svg, figureSource: "engine" },
    });
  }
  flush();
  console.log(`\n넣었다 ${done.length}행 · 원장 ${ledgerFile}`);

  // 🔴 **믿지 않고 잰다** — 되읽어 정말 붙었는가.
  const back = await prisma.problem.findMany({
    where: { id: { in: done.map((d) => d.problemId) } },
    select: { id: true, figureSvg: true },
  });
  const bad = back.filter((p) => !p.figureSvg);
  console.log(
    bad.length === 0
      ? `✅ 되읽어 확인 — ${back.length}행 전부 그림이 붙었다`
      : `🔴 ${bad.length}행이 여전히 비어 있다`,
  );
  await prisma.$disconnect();
}

async function revert(file: string): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const led = readLedger(file);
  let n = 0;
  for (const r of led.rows) {
    const cur = await prisma.problem.findUnique({
      where: { id: r.problemId },
      select: { figureSvg: true },
    });
    // 🔴 **지금 값이 내가 쓴 값일 때만 되돌린다** — 다른 회차가 그 뒤에 고쳤으면 두고 본다.
    if (!cur || cur.figureSvg === null) continue;
    if (cur.figureSvg.length !== r.afterLength) continue;
    await prisma.problem.update({
      where: { id: r.problemId },
      data: { figureSvg: r.before, figureSource: null },
    });
    n += 1;
  }
  console.log(`되돌렸다 ${n} / ${led.rows.length}`);
  await prisma.$disconnect();
}

// ⚠️ **직접 실행할 때만 돈다.** 시험이 `dropIsCoveredByStem` 을 쓰려고 이 파일을 import
//    하는데, 가드가 없으면 그 순간 `main()` 이 돌아 DB 에 붙고 `process.exitCode` 를
//    더럽힌다. 적재기(`load-engine-problems.ts`)가 같은 가드를 둔 이유이고, 2026-08-25 에
//    「단위 시험이 DB 엔진을 끌고 와」 관문이 흔들린 자리이기도 하다.
// ⚠️ `import.meta.dirname` 은 쓰지 않는다 — tsx 가 CJS 로 옮기면 undefined 다.
const RUN_DIRECTLY = /fill-missing-figures\.(ts|js|mts|mjs)$/i.test(
  process.argv[1] ?? "",
);

if (RUN_DIRECTLY)
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
