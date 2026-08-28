/**
 * **적재된 엔진 그림을 지금 엔진으로 다시 그려 덮는다.**
 *
 *   npx tsx scripts/qa/refresh-engine-figures.ts --plan <계획.json>                    # 드라이런(기본)
 *   npx tsx scripts/qa/refresh-engine-figures.ts --plan <계획.json> --shard 1/3        # 셰이드
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/refresh-engine-figures.ts --plan … --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/refresh-engine-figures.ts --revert <원장.json.gz>
 *
 * ## 왜 있나 — 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」
 *
 * 2026-08-28 에 원장님이 인쇄 검수를 하러 들어가셨는데, 지면에 나온 그림이 **옛
 * 그림**이었다. 실측: 치수선(`#000` + `6 4`)이 있는 문항 **644건 전량이 옛 굵기
 * 1.4**, 새 굵기 0.6 은 **0건**. 그날 확정받은 굵기·크기·라벨 자리가 지면에 하나도
 * 안 가 있었다. 엔진(`scripts/figure/elem_advanced.py`)만 고쳤기 때문이다 —
 * **DB 에 굳은 SVG 는 엔진을 고쳐도 안 고쳐진다.** 이 저장소가 2026-08-27 에 똑같이
 * 밟고 적어 둔 자리다(CLAUDE.md).
 *
 * ## 🔴 적재기를 다시 돌리면 안 된다
 *
 * `scripts/import/load-engine-problems.ts` 는 `prisma.problem.create` 다 — 다시 돌리면
 * 그림이 갱신되는 게 아니라 **문항이 중복**된다. 그리고 `figureSpec` 은 **DB 컬럼이
 * 아니다**(생성기가 메모리에서 만들어 렌더한 뒤 `figureSvg` 만 남는다). 그래서
 * 「다시 그리기」는 **생성기를 다시 돌려 스펙을 되만드는** 일이다.
 *
 * 되만들 수 있다는 근거: `externalId` 가 생성 입력을 전부 담고
 * (`engine-elem:{학년}|{단원}|{소단원}|f{문형}|{유형}|s{씨앗}`), 씨앗이 계획 파일에
 * 고정돼 있다. 실측으로도 확인했다 — 중등 계획을 드라이런하니 생성 7,869 →
 * 서로 다른 7,867 → **이미 있음 7,867 · 넣을 것 0**.
 *
 * ## 🔴 가장 중요한 가드 — 본문이 다르면 안 건드린다
 *
 * 그림은 **그 문항의** 그림이다. 되만든 본문이 DB 본문과 다르면 그 사이에 엔진이
 * 바뀐 것이고, 그때 그림만 덮으면 **남의 문항에 남의 그림을 붙인다.** 값이 맞는지는
 * 아무 지표도 안 울고, KaTeX 도 초록이고, 지면은 그럴듯하게 그려진다 — 원장님이
 * 종이에서 「이 그림이 문제와 안 맞는다」를 찾아 주실 때까지 아무도 모른다.
 * 그래서 **본문·정답이 한 글자라도 다르면 건너뛰고 세어 찍는다.**
 *
 * ## 왜 `renderFigureSpec`(제품 함수)로 그리나
 *
 * 적재기는 `render_spec.py` 를 **직접** 부른다. 제품은 그 앞뒤로 MathJax 조판을 한 겹
 * 더 한다(`95917b4f`, 원장님 확정). 그래서 적재본은 **조판 전 판**이었다. 여기서는
 * 제품 함수를 그대로 불러 **지면과 같은 것**이 DB 에 들어가게 한다 — 규칙을 옮겨
 * 적지 않는다.
 *
 * ## 원장은 DB 보다 **먼저**, 그리고 **누적만**
 *
 * 2026-08-18(되돌리기가 커밋 안 됨) · 2026-08-20(2회차가 1회차 원장을 덮어씀) 에서 온
 * 규약이다. 되돌릴 때는 **지금 값이 자기가 쓴 값일 때만** 되돌린다 — 그 사이 다른
 * 세션이 고친 행을 밀어 버리면 안 된다.
 *
 * ⚠️ **셰이드마다 원장 파일이 다르다**(`--shard 1/3` → `…-1of3.json.gz`).
 *    병렬 세션이 같은 파일을 쓰면 서로 덮는다.
 */
import { gunzipSync, gzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { buildElemRows, buildMiddleRows } from "../import/load-engine-problems";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const prisma = new PrismaClient();
const REPO = process.cwd();
const REPORTS = path.join(REPO, "scripts", "qa", "reports");

/** 파이썬 렌더를 몇 개까지 동시에 띄울까 — 느린 곳이 여기다. */
const CONCURRENCY = Number(process.env.FIGURE_REFRESH_CONCURRENCY ?? 6);

type Target = Record<string, unknown> & { engine?: string };
type Plan = { label: string; seedBase?: number; targets: Target[] };

interface LedgerRow {
  problemId: string;
  externalId: string;
  problemCode: string | null;
  before: string | null;
  after: string;
}
interface Ledger {
  runs: { label: string; at: string; count: number }[];
  rows: LedgerRow[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readLedger(file: string): Ledger {
  if (!existsSync(file)) return { runs: [], rows: [] };
  return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Ledger;
}

function writeLedger(file: string, prev: Ledger, next: Ledger): void {
  // 🔴 **누적만.** 줄어들면 앞 회차를 못 되돌리게 된다 — 2026-08-20 에 실제로 그랬다.
  if (next.rows.length < prev.rows.length)
    throw new Error(
      `원장이 줄었다 (${prev.rows.length} → ${next.rows.length}) — 덮어쓰기다. 멈춘다.`,
    );
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, gzipSync(Buffer.from(JSON.stringify(next), "utf8")));
}

/** 공백만 다른 것은 같은 것으로 본다 — 그 밖에는 **한 글자도** 봐준다. */
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * **이 그림을 이 문항에 붙여도 되는가.**
 *
 * 🔴 열쇠는 **발문**이다 — 보기가 아니다. 실측(2026-08-28, 초등 셰이드 1/48):
 * 77건 중 37건이 본문 전체 대조에서 걸렸는데, 펼쳐 보니 **전부 보기 순서만** 달랐다:
 *
 *     DB   $531+178$ 의 합에서 백의 자리 숫자를 쓰시오. ① $7$ ② $9$ ③ $8$ ④ $5$ ⑤ $14$
 *     지금 $531+178$ 의 합에서 백의 자리 숫자를 쓰시오. ① $14$ ② $7$ ③ $5$ ④ $6$ ⑤ $9$
 *
 * 발문은 **글자까지 같다.** 오답 섞기의 난수 소비가 그 사이 바뀌었을 뿐 같은 문항이고,
 * 그림은 **발문의** 그림이다. 그런데 본문 전체로 대조하면 이런 행이 전부 막혀
 * 절반이 옛 그림으로 남는다.
 *
 * ⚠️ 그렇다고 느슨한 게 아니다 — 발문이 한 글자라도 다르면 **다른 문항**이고,
 *    그때 그림을 덮으면 남의 문항에 남의 그림이 붙는다. 그건 그대로 막는다.
 *    그리고 **보기가 양쪽 다 없으면**(단답형) 정답까지 같아야 한다 — 거기서는
 *    정답이 흔들릴 까닭이 없으므로, 다르면 진짜로 바뀐 것이다.
 *
 * ⚠️ **보기와 정답은 건드리지 않는다.** DB 행은 자기 보기·자기 정답을 그대로 갖고
 *    있어 스스로 앞뒤가 맞는다. 우리가 바꾸는 것은 `figureSvg` 하나뿐이다.
 */
export function sameProblem(
  db: { content: string; answer: string },
  made: { content: string; answer: string },
): boolean {
  const a = parseProblemContent(db.content);
  const b = parseProblemContent(made.content);
  if (norm(a.question) !== norm(b.question)) return false;
  if (a.choices.length === 0 && b.choices.length === 0)
    return norm(db.answer) === norm(made.answer);
  return true;
}

/** 계획의 대상을 N 조각으로 나눈다 — 병렬 세션이 겹치지 않게. */
function shardOf(targets: Target[], spec: string | undefined): Target[] {
  if (!spec) return targets;
  const m = /^(\d+)\/(\d+)$/.exec(spec);
  if (!m) throw new Error(`--shard 는 «i/N» 꼴이다 (받은 값: ${spec})`);
  const i = Number(m[1]);
  const n = Number(m[2]);
  if (i < 1 || i > n) throw new Error(`--shard ${spec} 가 범위 밖이다`);
  return targets.filter((_, idx) => idx % n === i - 1);
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!, i);
      }
    }),
  );
  return out;
}

async function run(planFile: string, doApply: boolean): Promise<void> {
  const plan = JSON.parse(readFileSync(planFile, "utf8")) as Plan;
  const seedBase = plan.seedBase ?? 0;
  const shardSpec = arg("--shard");
  const targets = shardOf(plan.targets, shardSpec);
  const tag = shardSpec ? shardSpec.replace("/", "of") : "all";
  // 🔴 **하위 디렉터리에 쓴다.** `scripts/qa/reports/*` 는 `.gitignore` 가 손으로 적은
  //    예외 목록으로 굴리는 자리라, 새 파일 이름은 **커밋되지 않는다** — 셰이드마다
  //    이름이 달라지는 이 원장은 목록에 미리 적을 수도 없다. 디렉터리 하나를 통째로
  //    예외로 두면 어떤 셰이드든 자동으로 커밋된다(2026-08-18 「되돌리기가 이 컴퓨터에만
  //    있었다」의 구조적 수리).
  const ledgerFile = path.join(
    REPORTS,
    "refresh-engine-figures",
    `${path.basename(planFile, ".json")}-${tag}.json.gz`,
  );

  console.log(
    `계획 ${plan.label} · 대상 ${targets.length}/${plan.targets.length}${shardSpec ? ` (셰이드 ${shardSpec})` : ""}`,
  );

  // ── ⑴ 행을 **적재기와 같은 코드**로 되만든다 ─────────────────────────────
  const rows = targets.flatMap((t) =>
    t.engine === "elem"
      ? buildElemRows(t as never, seedBase)
      : buildMiddleRows(t as never, seedBase),
  );
  const withSpec = rows.filter((r) => r.figureSpec);
  console.log(
    `되만든 문항 ${rows.length} · 그 중 그림 있는 것 ${withSpec.length}`,
  );
  if (withSpec.length === 0) {
    console.log("이 셰이드에는 그림이 없다 — 할 일 없음.");
    return;
  }

  // ── ⑵ DB 에서 짝을 찾는다 ────────────────────────────────────────────────
  const found = new Map<
    string,
    {
      id: string;
      problemCode: string | null;
      content: string;
      answer: string;
      figureSvg: string | null;
    }
  >();
  for (let i = 0; i < withSpec.length; i += 500) {
    const ids = withSpec.slice(i, i + 500).map((r) => r.externalId);
    const got = await prisma.problem.findMany({
      where: { externalId: { in: ids } },
      select: {
        id: true,
        problemCode: true,
        content: true,
        answer: true,
        figureSvg: true,
        externalId: true,
      },
    });
    for (const p of got) if (p.externalId) found.set(p.externalId, p);
  }

  // ── ⑶ 🔴 본문 대조 — 다르면 **안 건드린다** ─────────────────────────────
  const missing: string[] = [];
  const drifted: string[] = [];
  const todo: typeof withSpec = [];
  for (const r of withSpec) {
    const db = found.get(r.externalId);
    if (!db) {
      missing.push(r.externalId);
      continue;
    }
    if (!sameProblem(db, r)) {
      drifted.push(`${db.problemCode ?? r.externalId}`);
      continue;
    }
    todo.push(r);
  }
  console.log(
    `짝 맞음 ${todo.length} · DB 에 없음 ${missing.length} · **본문이 달라 건너뜀 ${drifted.length}**`,
  );
  if (drifted.length)
    console.log(
      `   ⚠️ 건너뛴 것 예: ${drifted.slice(0, 5).join(", ")}${drifted.length > 5 ? " …" : ""}\n` +
        `      엔진이 그 사이 바뀌었다는 뜻이다. 그림만 덮으면 **남의 문항에 남의 그림**이 붙는다.`,
    );

  // 「왜 다른가」를 눈으로 봐야 다음 수가 정해진다 — 본문 수리인가, 아예 다른 문항인가.
  const driftN = Number(arg("--drift-sample") ?? 0);
  if (driftN > 0) {
    let shown = 0;
    for (const r of withSpec) {
      if (shown >= driftN) break;
      const db = found.get(r.externalId);
      if (!db) continue;
      if (sameProblem(db, r)) continue;
      shown += 1;
      console.log(`\n── ${db.problemCode ?? r.externalId}  (${r.origin})`);
      console.log(`   DB   본문: ${norm(db.content).slice(0, 170)}`);
      console.log(`   지금 본문: ${norm(r.content).slice(0, 170)}`);
      if (norm(db.answer) !== norm(r.answer))
        console.log(
          `   DB 답: ${norm(db.answer).slice(0, 70)}   지금 답: ${norm(r.answer).slice(0, 70)}`,
        );
    }
  }

  // ── ⑷ 제품 경로로 다시 그린다 ───────────────────────────────────────────
  let failed = 0;
  let same = 0;
  const failures: string[] = [];
  const t0 = Date.now();
  const drawn = await mapLimit(todo, CONCURRENCY, async (r, i) => {
    if (i > 0 && i % 200 === 0) {
      const rate = i / ((Date.now() - t0) / 1000);
      console.log(`   … ${i}/${todo.length} (${rate.toFixed(1)}장/초)`);
    }
    const res = await renderFigureSpec(r.figureSpec as never);
    if (!res.ok) {
      // 🔴 **어느 것이 실패했는지 적는다.** 안 적으면 그 문항은 옛 그림으로 남는데
      //    표에는 「실패 N」이라는 숫자만 남아, 다음 사람이 무엇을 볼지 알 수 없다.
      //    숫자만 세는 지표는 고칠 자리를 안 알려 준다.
      failed += 1;
      failures.push(
        `${found.get(r.externalId)?.problemCode ?? r.externalId}: ${res.error}`,
      );
      return null;
    }
    const db = found.get(r.externalId)!;
    if (db.figureSvg === res.svg) {
      same += 1;
      return null;
    }
    return {
      problemId: db.id,
      externalId: r.externalId,
      problemCode: db.problemCode,
      before: db.figureSvg,
      after: res.svg,
    } satisfies LedgerRow;
  });
  const changes = drawn.filter((d): d is LedgerRow => d !== null);
  console.log(
    `다시 그림 ${todo.length} · 바뀐 것 **${changes.length}** · 그대로 ${same} · 렌더 실패 ${failed}`,
  );

  // 조판(MathJax)이 들어가면 SVG 가 커진다 — **DB 가 얼마나 불어나는지 모르고**
  // 수천 행을 덮으면 안 된다. 덮기 전에 세어 찍는다(D-20 「무엇을 잃는가」의 짝).
  if (changes.length > 0) {
    const beforeB = changes.reduce((n, c) => n + (c.before?.length ?? 0), 0);
    const afterB = changes.reduce((n, c) => n + c.after.length, 0);
    const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;
    console.log(
      `   크기 ${kb(beforeB)} → ${kb(afterB)} (${(afterB / Math.max(beforeB, 1)).toFixed(2)}배) · ` +
        `한 장 평균 ${Math.round(beforeB / changes.length)} → ${Math.round(afterB / changes.length)}자`,
    );
  }

  if (failures.length > 0) {
    console.log(`   ⚠️ 렌더 실패 — 이 문항들은 **옛 그림으로 남는다**:`);
    for (const f of failures.slice(0, 20)) console.log(`      · ${f}`);
    if (failures.length > 20)
      console.log(`      … ${failures.length - 20}건 더`);
  }

  if (!doApply) {
    console.log(
      `\n드라이런이다. 실제로 덮으려면: ALLOW_SHARED_IMPORT=1 … --apply` +
        `\n원장 자리: ${path.relative(REPO, ledgerFile)}`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (changes.length === 0) {
    console.log("덮을 것이 없다.");
    return;
  }

  // ── ⑸ 원장을 **먼저** 쓴다 ──────────────────────────────────────────────
  const prev = readLedger(ledgerFile);
  writeLedger(ledgerFile, prev, {
    runs: [
      ...prev.runs,
      {
        label: plan.label,
        at: new Date().toISOString(),
        count: changes.length,
      },
    ],
    rows: [...prev.rows, ...changes],
  });
  console.log(
    `원장 ${path.relative(REPO, ledgerFile)} (누적 ${prev.rows.length + changes.length}행)`,
  );

  // ── ⑹ 덮는다 ────────────────────────────────────────────────────────────
  for (let i = 0; i < changes.length; i += 100) {
    const part = changes.slice(i, i + 100);
    await prisma.$transaction(
      part.map((c) =>
        prisma.problem.update({
          where: { id: c.problemId },
          data: { figureSvg: c.after, figureSource: "engine" },
        }),
      ),
    );
  }
  console.log(`덮음 ${changes.length}건`);

  // ── ⑺ 🔴 믿지 않고 다시 읽는다 ─────────────────────────────────────────
  let wrong = 0;
  for (let i = 0; i < changes.length; i += 500) {
    const part = changes.slice(i, i + 500);
    const back = await prisma.problem.findMany({
      where: { id: { in: part.map((c) => c.problemId) } },
      select: { id: true, figureSvg: true },
    });
    const byId = new Map(back.map((b) => [b.id, b.figureSvg]));
    for (const c of part) if (byId.get(c.problemId) !== c.after) wrong += 1;
  }
  if (wrong > 0)
    throw new Error(`되읽으니 ${wrong}건이 쓴 값과 다르다 — 확인이 필요하다`);
  console.log(`✅ 되읽기 ${changes.length}건 전부 일치`);
}

async function revert(ledgerFile: string): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  const led = readLedger(ledgerFile);
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);

  // 같은 문항이 여러 회차에 걸치면 **처음의 before** 로 되돌린다 (2026-08-20).
  const first = new Map<string, LedgerRow>();
  for (const r of led.rows)
    if (!first.has(r.problemId)) first.set(r.problemId, r);
  const last = new Map<string, string>();
  for (const r of led.rows) last.set(r.problemId, r.after);

  const ids = [...first.keys()];
  let restored = 0;
  let skipped = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const now = await prisma.problem.findMany({
      where: { id: { in: part } },
      select: { id: true, figureSvg: true },
    });
    for (const p of now) {
      // 🔴 **지금 값이 내가 쓴 값일 때만** 되돌린다 — 그 사이 남이 고쳤으면 둔다.
      if (p.figureSvg !== last.get(p.id)) {
        skipped += 1;
        continue;
      }
      await prisma.problem.update({
        where: { id: p.id },
        data: { figureSvg: first.get(p.id)!.before },
      });
      restored += 1;
    }
  }
  console.log(`되돌림 ${restored} · 남이 고쳐서 건너뜀 ${skipped}`);
}

async function main(): Promise<void> {
  const planFile = arg("--plan");
  const revertFile = arg("--revert");
  if (revertFile) await revert(revertFile);
  else if (planFile) await run(planFile, process.argv.includes("--apply"));
  else {
    console.log("--plan <계획.json> 또는 --revert <원장.json.gz> 이 필요하다");
    process.exitCode = 1;
  }
}

// ⚠️ 시험이 `sameProblem` 을 빌려 쓴다 — import 만으로 돌면 안 된다
//    (적재기와 같은 규약. `import.meta.dirname` 은 tsx CJS 에서 undefined 라 안 쓴다).
const RUN_DIRECTLY = /refresh-engine-figures\.(ts|js|mts|mjs)$/i.test(
  process.argv[1] ?? "",
);

if (RUN_DIRECTLY)
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
