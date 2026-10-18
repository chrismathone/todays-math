/**
 * **적재된 엔진 문항을 지금 엔진으로 다시 만들어 제자리에서 덮는다** — 본문 · 정답 · 풀이 · 그림.
 *
 *   npx tsx --env-file=<.env> scripts/qa/refresh-engine-content.ts --all-plans                      # 드라이런 — 엔진과 적재본이 어디서 다른가
 *   npx tsx --env-file=<.env> scripts/qa/refresh-engine-content.ts --all-plans --families <목록.json>  # 드라이런 — 무엇을 덮게 되나
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/refresh-engine-content.ts --all-plans --families <목록.json> --label <이름> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<.env> scripts/qa/refresh-engine-content.ts --revert <원장.json.gz>
 *
 * ## 왜 있나 — 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」
 *
 * 2026-10-03 외부 검토가 생성기의 결함(발문에 빠진 조건 · 성립 안 하는 전개도 · 그림 속 정답 ·
 * 깨진 소수 보기)을 짚었다. 생성기를 고쳐도 **DB 에 굳은 행은 그대로**다(2026-08-27 · 08-30 에 두 번
 * 밟은 자리). 그림만 덮는 도구(`refresh-engine-figures.ts`)는 있었지만 본문을 덮는 길은 없었다.
 *
 * ## 🔴 고치기로 한 것만 덮는다
 *
 * 적재본은 지금 엔진과 **이미 여러 곳에서 다르다**(오답 섞기의 난수 소비가 바뀌어 보기 차례만 다른 행이
 * 수천). 그 행들은 자기 보기 · 자기 정답으로 앞뒤가 맞는다. 그래서 「다르면 덮는다」가 아니라
 *
 *   · `--families` 에 적은 문항류 — 갈래를 안 가리고 덮는다(발문 · 보기 · 풀이 · 그림).
 *   · 그 밖 — **고칠 까닭이 있는 보기**(`brokenChoiceReason`)만 보기 갈래로 덮는다. 발문이 다르면 안 덮고 세어 찍는다.
 *   · 풀이만 다른 행 — `--solution-everywhere` 를 줄 때만.
 *
 * 판정은 `refreshEngineContentCore.ts` 에 있고 시험이 그것을 문다.
 *
 * ## 되짚는 열쇠는 `externalId` — 적재기와 **같은 코드**로 만든다
 *
 * 2026-08-30 에 «쓰는 쪽»과 «되짚는 쪽»의 형식이 갈려 4,640건이 조용히 안 걸린 적이 있다.
 * 여기서는 형식을 옮겨 적지 않는다 — 적재 계획을 적재기의 분기 함수 `buildTargetRows`(초등 · 중등 · 결합형 ·
 * 판정형)로 **그대로 다시 돌려** 나온 `externalId` 로 맞댄다. 못 맞댄 행 수는 반드시 찍는다.
 *
 * ## 원장은 DB 보다 먼저 · 누적만 · 되돌릴 때는 «지금 값이 내가 쓴 값일 때만»
 */
import { gunzipSync, gzipSync } from "node:zlib";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  buildElemRows,
  buildTargetRows,
  type Target as PlanTarget,
} from "../import/load-engine-problems";
import type { JudgeRegistry } from "../../src/lib/middle/judge/registry";
import { parseNativeExternalId } from "../../src/contracts/nativeDescriptive.contract";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { deadBackslashHits } from "./probe-middle-raw-latex";
import {
  appendLedger,
  brokenChoiceReason,
  classifyDiff,
  decideApply,
  identityRisk,
  norm,
  sameSnapshot,
  type BrokenReason,
  type DiffClass,
  type Ledger,
  type LedgerRow,
  type Scope,
  type Snapshot,
} from "./refreshEngineContentCore";

const prisma = new PrismaClient();
const REPO = process.cwd();
const PLANS = path.join(REPO, "scripts", "import", "plans");
const REPORTS = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "refresh-engine-content",
);
const CONCURRENCY = Number(process.env.FIGURE_REFRESH_CONCURRENCY ?? 6);

type Made = ReturnType<typeof buildElemRows>[number];
type Target = Record<string, unknown> & { engine?: string };
type Plan = { label: string; seedBase?: number; targets: Target[] };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);

function readLedger(file: string): Ledger {
  if (!existsSync(file)) return { runs: [], rows: [] };
  return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Ledger;
}

function writeLedger(file: string, prev: Ledger, next: Ledger): void {
  if (next.rows.length < prev.rows.length)
    throw new Error(
      `원장이 줄었다 (${prev.rows.length} → ${next.rows.length}) — 덮어쓰기다. 멈춘다.`,
    );
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, gzipSync(Buffer.from(JSON.stringify(next), "utf8")));
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

/**
 * 계획 파일들 → `externalId` 로 묶은 «지금 엔진이 내는 행».
 *
 * 🔴 target 은 **적재기의 분기 함수(`buildTargetRows`)** 로 되만든다 — 적재기와 같은 함수다. 종전에는 여기서
 *    `elem ? … : combo ? … : buildMiddleRows` 를 따로 적어, 모르는 target 이 중등 유형으로 흘러갔다.
 *    `deps` 는 시험이 픽스처 판정형 등록부를 넣는 자리다(`loadJudgeRows.test.ts`).
 */
export function rebuild(
  planFiles: string[],
  deps: { judges?: JudgeRegistry } = {},
): {
  made: Map<string, Made>;
  failures: string[];
  conflicts: string[];
} {
  const made = new Map<string, Made>();
  const failures: string[] = [];
  const conflicts: string[] = [];
  // 적재기의 `console.log` 가 계획마다 수백 줄을 찍는다 — 여기서는 요약만 필요하다.
  const quiet = console.log;
  for (const file of planFiles) {
    const plan = JSON.parse(readFileSync(file, "utf8")) as Plan;
    const seedBase = plan.seedBase ?? 20260825;
    let n = 0;
    for (const t of plan.targets) {
      let rows: Made[];
      console.log = () => {};
      try {
        rows = buildTargetRows(t as PlanTarget, seedBase, deps);
      } catch (e) {
        console.log = quiet;
        // 🔴 대상 하나가 던지면 그 대상의 행이 통째로 «못 맞댐»이 된다 — 숫자 뒤에 숨기지 않는다.
        failures.push(
          `${path.basename(file)} · ${JSON.stringify(t).slice(0, 90)} — ${e instanceof Error ? e.message : String(e)}`,
        );
        continue;
      }
      console.log = quiet;
      for (const r of rows) {
        n += 1;
        const prev = made.get(r.externalId);
        if (!prev) {
          made.set(r.externalId, r);
          continue;
        }
        // 같은 열쇠를 두 계획이 다르게 내면 어느 쪽이 적재본인지 알 수 없다.
        if (
          parseNativeExternalId(r.externalId)
            ? JSON.stringify([
                prev.content,
                prev.answer,
                prev.solution,
                prev.figureSpec,
                prev.familyKey,
                prev.questionType,
                prev.difficulty,
                prev.grade,
                prev.section,
              ]) !==
              JSON.stringify([
                r.content,
                r.answer,
                r.solution,
                r.figureSpec,
                r.familyKey,
                r.questionType,
                r.difficulty,
                r.grade,
                r.section,
              ])
            : norm(prev.content) !== norm(r.content) ||
              norm(prev.answer) !== norm(r.answer)
        )
          conflicts.push(r.externalId);
      }
    }
    console.log(`   계획 ${path.basename(file)} — ${n}행`);
  }
  return { made, failures, conflicts };
}

type DbRow = {
  id: string;
  externalId: string | null;
  problemCode: string | null;
  familyKey: string | null;
  content: string;
  answer: string;
  solution: string | null;
  questionType: string | null;
  directUseAllowed: boolean;
};

async function readEngineRows(): Promise<DbRow[]> {
  const out: DbRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.problem.findMany({
      where: { externalId: { startsWith: "engine-" } },
      select: {
        id: true,
        externalId: true,
        problemCode: true,
        familyKey: true,
        content: true,
        answer: true,
        solution: true,
        questionType: true,
        directUseAllowed: true,
      },
      orderBy: { id: "asc" },
      take: 5000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1]!.id;
    out.push(...page);
  }
  return out;
}

/** 목록 파일의 항목을 실제 문항류 이름으로 편다 — 끝의 `*` 는 앞머리 맞춤. */
function expandFamilies(
  patterns: string[],
  known: Iterable<string>,
): { families: Set<string>; empty: string[] } {
  const all = [...new Set(known)];
  const families = new Set<string>();
  const empty: string[] = [];
  for (const p of patterns) {
    const hit = p.endsWith("*")
      ? all.filter((k) => k.startsWith(p.slice(0, -1)))
      : all.filter((k) => k === p);
    // 🔴 한 건도 안 걸리는 항목은 오타다 — 조용히 0 이면 «고쳤다»가 거짓말이 된다.
    if (hit.length === 0) empty.push(p);
    for (const k of hit) families.add(k);
  }
  return { families, empty };
}

const bump = (m: Map<string, number>, k: string) =>
  m.set(k, (m.get(k) ?? 0) + 1);
const top = (m: Map<string, number>, n: number) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

async function run(planFiles: string[], doApply: boolean): Promise<void> {
  const label = arg("--label") ?? "dry-run";
  console.log(`계획 ${planFiles.length}개로 지금 엔진의 행을 다시 만든다`);
  const { made, failures, conflicts } = rebuild(planFiles);
  console.log(
    `되만든 행 ${made.size} · 던진 대상 ${failures.length} · 계획끼리 어긋난 열쇠 ${conflicts.length}`,
  );
  for (const f of failures.slice(0, 20)) console.log(`   🔴 ${f}`);
  if (failures.length > 20) console.log(`   … ${failures.length - 20}건 더`);
  if (conflicts.length)
    console.log(`   ⚠️ 어긋난 열쇠 예: ${conflicts.slice(0, 3).join(" · ")}`);

  const db = await readEngineRows();
  console.log(`적재본(externalId 가 engine- 으로 시작) ${db.length}행`);

  const madeFamilies = [...made.values()].map((r) => r.familyKey);
  const dbFamilies = db.map((r) => r.familyKey).filter((k): k is string => !!k);
  const familiesFile = arg("--families");
  const patterns = familiesFile
    ? (JSON.parse(readFileSync(familiesFile, "utf8")) as string[])
    : [];
  // `--all-families` — 적재본 전부를 지금 엔진에 맞춘다. 기준선을 재 보니(2026-10-03) 발문이 다른 1,707행이
  // 전부 «엔진을 뒤에 고쳤는데 적재본에 안 간 것»이었다(조사 수리 · `$1\pi$` · `$0x+10y$` · 정사각형을 직사각형이라 부름).
  // 은행을 열기 전이라 한 번에 맞춘다. 그 뒤로는 이 드라이런의 «달라진 행 0»이 가드가 된다.
  const { families, empty } = expandFamilies(
    has("--all-families") ? ["*"] : patterns,
    [...madeFamilies, ...dbFamilies],
  );
  if (empty.length)
    throw new Error(
      `문항류 목록에 한 건도 안 걸리는 항목이 있다 — 오타인가: ${empty.join(" · ")}`,
    );
  const scope: Scope = {
    families,
    solutionEverywhere: has("--solution-everywhere"),
  };
  if (patterns.length)
    console.log(
      `고치기로 한 문항류 ${families.size}개 (목록 ${patterns.length}항목)`,
    );
  // 🔴 **글은 같고 그림만 바뀌는 수리**가 있다(전개도의 밑면 자리 · 답이 적힌 치수 숨김).
  //    그런 행은 갈래가 «same» 이라 위 판정으로는 영영 안 덮인다 — 2026-10-03 드라이런에서
  //    원기둥 전개도의 단답형이 통째로 빠져 있었다. 그림을 고친 문항류는 **글이 같아도** 다시 그려 견준다.
  const figureFile = arg("--figure-families");
  const figurePatterns = figureFile
    ? (JSON.parse(readFileSync(figureFile, "utf8")) as string[])
    : [];
  const figureScope = expandFamilies(figurePatterns, [
    ...madeFamilies,
    ...dbFamilies,
  ]);
  if (figureScope.empty.length)
    throw new Error(
      `그림 문항류 목록에 한 건도 안 걸리는 항목이 있다: ${figureScope.empty.join(" · ")}`,
    );
  const figureFamilies = figureScope.families;
  if (figurePatterns.length)
    console.log(
      `글이 같아도 그림을 다시 그려 견줄 문항류 ${figureFamilies.size}개`,
    );

  // 🔴 문지기 — 덮으면 «다른 문제»가 되는 행은 막는다(2026-10-03 3자 합의 C1 · Core 의 주석).
  //    사람이 «같은 문제»라고 짚어 준 행(externalId 목록)만 지나간다.
  const sameFile = arg("--same-problem");
  const confirmedSame = new Set<string>(
    sameFile ? (JSON.parse(readFileSync(sameFile, "utf8")) as string[]) : [],
  );
  if (sameFile)
    console.log(`사람이 «같은 문제»라고 짚은 행 ${confirmedSame.size}`);
  const refusedBy = new Map<string, number>();
  const refused: { externalId: string; risk: string; familyKey: string }[] = [];

  // ── 갈래 세기 ─────────────────────────────────────────────────────────────
  let figureOnly = 0;
  const byClass = new Map<string, number>();
  const stemOutside = new Map<string, number>();
  const stemSamples = new Map<
    string,
    {
      externalId: string;
      db: { content: string; answer: string };
      now: { content: string; answer: string };
    }[]
  >();
  const solutionOutside = new Map<string, number>();
  const brokenBy = new Map<string, number>();
  const unmatchedBy = new Map<string, number>();
  const unmatchedGone = new Map<string, number>();
  const todo: {
    db: DbRow;
    made: Made;
    cls: DiffClass;
    broken: BrokenReason | null;
  }[] = [];
  const toLock: DbRow[] = [];
  const seenExternal = new Set<string>();
  // 못 맞댄 행이 «지금 엔진도 내는 문항»인가 — 열쇠만 밀린 것과 엔진이 더는 안 내는 것을 가른다.
  const stemOf = (content: string) => norm(content.split("\n①")[0]);
  const madeStems = new Set<string>();
  for (const m of made.values())
    madeStems.add(`${m.familyKey}::${stemOf(m.content)}`);
  let unmatchedStillMade = 0;
  for (const row of db) {
    const ext = row.externalId!;
    seenExternal.add(ext);
    const m = made.get(ext);
    if (!m) {
      bump(byClass, "못 맞댐");
      if (madeStems.has(`${row.familyKey}::${stemOf(row.content)}`))
        unmatchedStillMade += 1;
      else bump(unmatchedGone, row.familyKey ?? "?");
      bump(unmatchedBy, row.familyKey ?? "?");
      if (row.familyKey && families.has(row.familyKey) && row.directUseAllowed)
        toLock.push(row);
      continue;
    }
    const cls = classifyDiff(row, m);
    bump(byClass, cls);
    const isElem = ext.startsWith("engine-elem:");
    const broken = cls === "choices" ? brokenChoiceReason(row, isElem) : null;
    if (broken) bump(brokenBy, broken);
    const inFamily = !!row.familyKey && families.has(row.familyKey);
    if (!inFamily && cls === "stem") {
      const k = row.familyKey ?? "?";
      bump(stemOutside, k);
      // 「왜 다른가」를 눈으로 봐야 다음 수가 정해진다 — 문구 수리인가, 아예 다른 문항인가.
      const list = stemSamples.get(k) ?? [];
      if (list.length < 2)
        stemSamples.set(k, [
          ...list,
          {
            externalId: ext,
            db: { content: row.content, answer: row.answer },
            now: { content: m.content, answer: m.answer },
          },
        ]);
    }
    if (!inFamily && cls === "solution")
      bump(solutionOutside, row.familyKey ?? "?");
    const risk = cls === "same" ? null : identityRisk(row, m);
    const decision = decideApply(
      row.familyKey,
      cls,
      broken,
      scope,
      risk,
      confirmedSame.has(ext),
    );
    if (decision === "apply") todo.push({ db: row, made: m, cls, broken });
    else if (decision === "refuse") {
      bump(refusedBy, risk!);
      refused.push({
        externalId: ext,
        risk: risk!,
        familyKey: row.familyKey ?? "?",
      });
    } else if (
      cls === "same" &&
      !!row.familyKey &&
      figureFamilies.has(row.familyKey) &&
      m.figureSpec
    ) {
      figureOnly += 1;
      todo.push({ db: row, made: m, cls, broken });
    }
  }
  const fresh = new Map<string, number>();
  for (const [ext, m] of made)
    if (!seenExternal.has(ext) && families.has(m.familyKey))
      bump(fresh, m.familyKey);

  console.log(
    `\n갈래: ${["same", "solution", "choices", "stem", "못 맞댐"]
      .map((k) => `${k} ${byClass.get(k) ?? 0}`)
      .join(" · ")}`,
  );
  console.log(
    `보기 갈래 가운데 고칠 까닭이 있는 것: ${
      [...brokenBy.entries()].map(([k, n]) => `${k} ${n}`).join(" · ") || "0"
    }`,
  );
  const show = (title: string, m: Map<string, number>) => {
    if (m.size === 0) return;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    console.log(`\n${title} — ${total}행 · 문항류 ${m.size}개`);
    for (const [k, n] of top(m, 15))
      console.log(`   ${String(n).padStart(5)}  ${k}`);
    if (m.size > 15) console.log(`   … 문항류 ${m.size - 15}개 더`);
  };
  show("🔴 고치기로 한 문항류 «밖»에서 발문이 다른 것(안 덮는다)", stemOutside);
  if (refused.length) {
    console.log(
      `
🔴 문지기가 막은 행 ${refused.length} — 덮으면 «다른 문제»가 된다: ${[...refusedBy.entries()].map(([k, n]) => `${k} ${n}`).join(" · ")}`,
    );
    console.log(
      "   같은 문제임을 확인한 행은 externalId 목록으로 --same-problem 에 주고, 아니면 «출제 제외 + 새 씨앗 적재»로 고친다.",
    );
    for (const r of refused.slice(0, 12))
      console.log(`   ${r.risk}  ${r.externalId}`);
    if (refused.length > 12)
      console.log(`   … ${refused.length - 12}행 더(보고 파일)`);
  }
  show("문항류 밖에서 풀이만 다른 것", solutionOutside);
  show("못 맞댄 적재본(계획으로 되만들지 못함)", unmatchedBy);
  console.log(
    `   그 가운데 지금 엔진도 같은 발문을 내는 것 ${unmatchedStillMade} · 엔진이 더는 안 내는 발문 ${[...unmatchedGone.values()].reduce((a, b) => a + b, 0)}`,
  );
  show("못 맞댄 것 중 엔진이 더는 안 내는 발문", unmatchedGone);
  show(
    "고치기로 한 문항류에서 새로 생긴 행(적재본에 없음 — 넣지 않는다)",
    fresh,
  );

  const todoBy = new Map<string, number>();
  for (const t of todo)
    bump(todoBy, `${t.cls}${t.broken ? `(${t.broken})` : ""}`);
  console.log(
    `\n덮을 것 ${todo.length}행 — ${[...todoBy.entries()].map(([k, n]) => `${k} ${n}`).join(" · ") || "없음"}`,
  );
  if (figureOnly > 0)
    console.log(
      `   그 가운데 글은 같고 그림만 다시 그려 견줄 행 ${figureOnly}`,
    );
  const lockUnmatched = has("--lock-unmatched");
  if (toLock.length)
    console.log(
      `고치기로 한 문항류인데 되만들지 못한 출제 가능 행 ${toLock.length} — ${lockUnmatched ? "잠근다" : "그대로 둔다(--lock-unmatched 로 잠금)"}`,
    );

  // ── 덮을 행의 지금 값을 통째로 읽고 뒤 값을 만든다 ────────────────────────
  const ids = [
    ...todo.map((t) => t.db.id),
    ...(lockUnmatched ? toLock.map((r) => r.id) : []),
  ];
  const before = new Map<string, Snapshot>();
  for (let i = 0; i < ids.length; i += 300) {
    const got = await prisma.problem.findMany({
      where: { id: { in: ids.slice(i, i + 300) } },
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        figureSvg: true,
        directUseAllowed: true,
      },
    });
    for (const p of got)
      before.set(p.id, {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        figureSvg: p.figureSvg,
        directUseAllowed: p.directUseAllowed,
      });
  }

  const skipped: string[] = [];
  const t0 = Date.now();
  const drawn = await mapLimit(todo, CONCURRENCY, async (t, i) => {
    if (i > 0 && i % 300 === 0)
      console.log(
        `   … ${i}/${todo.length} (${((Date.now() - t0) / 1000).toFixed(0)}초)`,
      );
    const b = before.get(t.db.id);
    if (!b) return null;
    const inFamily =
      !!t.db.familyKey &&
      (families.has(t.db.familyKey) || figureFamilies.has(t.db.familyKey));
    let figureSvg = b.figureSvg;
    // 그림은 **고치기로 한 문항류에서만** 다시 그린다 — 그 밖은 발문이 같으므로 그림도 그 문항의 것이다.
    if (inFamily) {
      if (t.made.figureSpec) {
        const res = await renderFigureSpec(t.made.figureSpec as never);
        if (!res.ok) {
          skipped.push(
            `${t.db.problemCode ?? t.db.externalId}: 그림 실패 — ${res.error}`,
          );
          return null;
        }
        figureSvg = res.svg;
      } else figureSvg = null;
    }
    const after: Snapshot = {
      content: t.made.content,
      answer: t.made.answer,
      solution: t.made.solution,
      figureSvg,
      directUseAllowed: b.directUseAllowed,
    };
    const dead = [
      ...deadBackslashHits(after.content),
      ...deadBackslashHits(after.answer),
      ...deadBackslashHits(after.solution ?? ""),
    ];
    if (dead.length) {
      skipped.push(
        `${t.db.problemCode ?? t.db.externalId}: 죽은 역슬래시 ${dead.slice(0, 3).join(" ")}`,
      );
      return null;
    }
    if (sameSnapshot(b, after)) return null;
    // 그림만 다시 그린 행도 문지기를 지난다 — 라벨이 달라지면 그림이 주는 정보가 바뀐 것이다.
    const figureRisk = identityRisk(b, after);
    if (figureRisk !== null && !confirmedSame.has(t.db.externalId!)) {
      bump(refusedBy, figureRisk);
      refused.push({
        externalId: t.db.externalId!,
        risk: figureRisk,
        familyKey: t.db.familyKey ?? "?",
      });
      skipped.push(
        `${t.db.problemCode ?? t.db.externalId}: 문지기 — ${figureRisk}`,
      );
      return null;
    }
    return {
      problemId: t.db.id,
      externalId: t.db.externalId!,
      problemCode: t.db.problemCode,
      before: b,
      after,
    } satisfies LedgerRow;
  });
  const changes = drawn.filter((d): d is LedgerRow => d !== null);
  if (lockUnmatched)
    for (const r of toLock) {
      const b = before.get(r.id);
      if (b && b.directUseAllowed)
        changes.push({
          problemId: r.id,
          externalId: r.externalId!,
          problemCode: r.problemCode,
          before: b,
          after: { ...b, directUseAllowed: false },
        });
    }
  const figChanged = changes.filter(
    (c) => c.before.figureSvg !== c.after.figureSvg,
  ).length;
  console.log(
    `바뀌는 행 **${changes.length}** (그림이 바뀌는 것 ${figChanged}) · 건너뜀 ${skipped.length}`,
  );
  for (const s of skipped.slice(0, 20)) console.log(`   ⚠️ ${s}`);
  if (skipped.length > 20) console.log(`   … ${skipped.length - 20}건 더`);

  // ── 보고(눈으로 볼 표본) ──────────────────────────────────────────────────
  mkdirSync(REPORTS, { recursive: true });
  const perFamily = new Map<string, LedgerRow[]>();
  const famOf = new Map(db.map((r) => [r.id, r.familyKey ?? "?"]));
  for (const c of changes) {
    const k = famOf.get(c.problemId) ?? "?";
    perFamily.set(k, [...(perFamily.get(k) ?? []), c]);
  }
  const reportFile = path.join(REPORTS, `${label}.report.json`);
  writeFileSync(
    reportFile,
    JSON.stringify(
      {
        label,
        at: new Date().toISOString(),
        plans: planFiles.map((f) => path.basename(f)),
        made: made.size,
        db: db.length,
        classes: Object.fromEntries(byClass),
        broken: Object.fromEntries(brokenBy),
        stemOutside: top(stemOutside, 500).map(([k, n]) => ({
          familyKey: k,
          rows: n,
          samples: stemSamples.get(k) ?? [],
        })),
        solutionOutside: top(solutionOutside, 500),
        unmatched: top(unmatchedBy, 500),
        unmatchedStillMade,
        unmatchedGone: top(unmatchedGone, 500),
        // 되만들지 못했는데 **출제 가능**한 행 — 엔진으로 검증할 길이 없는 행이다. 눈으로 보고 잠글지 정한다.
        unmatchedEligible: toLock.map((r) => ({
          externalId: r.externalId,
          problemCode: r.problemCode,
          content: r.content.slice(0, 200),
          answer: r.answer.slice(0, 60),
        })),
        fresh: top(fresh, 500),
        buildFailures: failures,
        changes: changes.length,
        skipped,
        identityRefused: refused,
        families: [...perFamily.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([k, rows]) => ({
            familyKey: k,
            rows: rows.length,
            samples: rows.slice(0, 2).map((c) => ({
              externalId: c.externalId,
              cls: classifyDiff(c.before, c.after),
              before: {
                content: c.before.content,
                answer: c.before.answer,
                solution: c.before.solution,
              },
              after: {
                content: c.after.content,
                answer: c.after.answer,
                solution: c.after.solution,
              },
              figureChanged: c.before.figureSvg !== c.after.figureSvg,
              locked: c.before.directUseAllowed && !c.after.directUseAllowed,
            })),
          })),
      },
      null,
      1,
    ),
  );
  console.log(`보고 ${path.relative(REPO, reportFile)}`);

  if (!doApply) {
    console.log(
      `\n드라이런이다. 덮으려면: ALLOW_SHARED_IMPORT=1 … --label <이름> --apply`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (label === "dry-run")
    throw new Error("--apply 에는 --label <이름> 이 필요하다(원장 이름)");
  if (changes.length === 0) {
    console.log("덮을 것이 없다.");
    return;
  }

  // ── 원장을 **먼저** 쓴다 ──────────────────────────────────────────────────
  const ledgerFile = path.join(REPORTS, `${label}.json.gz`);
  const prev = readLedger(ledgerFile);
  writeLedger(
    ledgerFile,
    prev,
    appendLedger(prev, label, new Date().toISOString(), changes),
  );
  console.log(
    `원장 ${path.relative(REPO, ledgerFile)} (누적 ${prev.rows.length + changes.length}행)`,
  );

  for (let i = 0; i < changes.length; i += 100) {
    const part = changes.slice(i, i + 100);
    await prisma.$transaction(
      part.map((c) =>
        prisma.problem.update({
          where: { id: c.problemId },
          data: {
            content: c.after.content,
            answer: c.after.answer,
            solution: c.after.solution,
            figureSvg: c.after.figureSvg,
            figureSource: c.after.figureSvg ? "engine" : null,
            directUseAllowed: c.after.directUseAllowed,
          },
        }),
      ),
    );
  }
  console.log(`덮음 ${changes.length}행`);

  // ── 🔴 믿지 않고 다시 읽는다 ──────────────────────────────────────────────
  let wrong = 0;
  for (let i = 0; i < changes.length; i += 300) {
    const part = changes.slice(i, i + 300);
    const back = await prisma.problem.findMany({
      where: { id: { in: part.map((c) => c.problemId) } },
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        figureSvg: true,
        directUseAllowed: true,
      },
    });
    const byId = new Map(back.map((b) => [b.id, b]));
    for (const c of part) {
      const now = byId.get(c.problemId);
      if (!now || !sameSnapshot(now, c.after)) wrong += 1;
    }
  }
  if (wrong > 0)
    throw new Error(`되읽으니 ${wrong}행이 쓴 값과 다르다 — 확인이 필요하다`);
  console.log(`✅ 되읽기 ${changes.length}행 전부 일치`);
}

async function revert(ledgerFile: string): Promise<void> {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  const led = readLedger(ledgerFile);
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  // 같은 행이 여러 회차에 걸치면 **처음의 before** 로 되돌리고, **마지막 after** 와 견준다.
  const first = new Map<string, LedgerRow>();
  const last = new Map<string, LedgerRow>();
  for (const r of led.rows) {
    if (!first.has(r.problemId)) first.set(r.problemId, r);
    last.set(r.problemId, r);
  }
  const ids = [...first.keys()];
  let restored = 0;
  let skipped = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const now = await prisma.problem.findMany({
      where: { id: { in: ids.slice(i, i + 200) } },
      select: {
        id: true,
        content: true,
        answer: true,
        solution: true,
        figureSvg: true,
        directUseAllowed: true,
      },
    });
    for (const p of now) {
      // 🔴 지금 값이 내가 쓴 값일 때만 되돌린다 — 그 사이 남이 고쳤으면 둔다.
      if (!sameSnapshot(p, last.get(p.id)!.after)) {
        skipped += 1;
        continue;
      }
      const b = first.get(p.id)!.before;
      await prisma.problem.update({
        where: { id: p.id },
        data: {
          content: b.content,
          answer: b.answer,
          solution: b.solution,
          figureSvg: b.figureSvg,
          figureSource: b.figureSvg ? "engine" : null,
          directUseAllowed: b.directUseAllowed,
        },
      });
      restored += 1;
    }
  }
  console.log(`되돌림 ${restored} · 남이 고쳐서 건너뜀 ${skipped}`);
}

async function main(): Promise<void> {
  const revertFile = arg("--revert");
  if (revertFile) return revert(revertFile);
  const planArg = arg("--plan");
  const planFiles = has("--all-plans")
    ? readdirSync(PLANS)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => path.join(PLANS, f))
    : planArg
      ? planArg.split(",")
      : [];
  if (planFiles.length === 0) {
    console.log(
      "--all-plans 또는 --plan <계획.json[,…]> 또는 --revert <원장.json.gz> 이 필요하다",
    );
    process.exitCode = 1;
    return;
  }
  await run(planFiles, has("--apply"));
}

const RUN_DIRECTLY = /refresh-engine-content\.(ts|js|mts|mjs)$/i.test(
  process.argv[1] ?? "",
);

if (RUN_DIRECTLY)
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
