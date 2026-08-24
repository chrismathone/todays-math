/**
 * **엔진이 낸 문항을 공유 DB 에 적재한다** — 초등 4단(D-71/72) · 중등 873유형.
 *
 *   npx tsx scripts/import/load-engine-problems.ts --plan <계획.json>              # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/load-engine-problems.ts --plan <계획.json> --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/import/load-engine-problems.ts --revert <원장.json>
 *
 * ## 왜 새로 만들었나
 *
 * `scripts/import/` 의 기존 적재기는 전부 **바깥 자료**(기출 PDF·RPM 교재)를 옮기는
 * 물건이다. 우리 엔진이 낸 문항을 넣는 길은 없었다 — 그래서 엔진이 다 되어도
 * 공유 DB 는 계속 「초등 0행」이었다(10-handoff §).
 *
 * ## 바깥벽(outer wall)과의 관계 — 새 문항은 안 걸린다
 *
 * 2026-08-24 원장님 지시로 기존 45,374건이 통째로 격리됐다. 그 벽은 **등록된
 * legacy id 에만** 걸린다(`problem_outer_wall_quarantine` 표 + BEFORE **UPDATE**
 * 트리거). 새로 INSERT 되는 행은 대상이 아니다 — 마이그레이션이 그렇게 적어 두었다
 * (「Future, newly generated problems are not part of this legacy corpus」).
 *
 * ⚠️ 그래도 **믿지 않고 잰다.** 적재 뒤에 그 행들을 다시 읽어 `pool`·`review_status`·
 *    `direct_use_allowed` 가 **요청한 값 그대로인지** 확인하고, 다르면 실패로 끝낸다.
 *    「넣었다」와 「앱이 볼 수 있다」는 다른 말이고, 그 둘이 갈리면 화면에는 아무 표시도
 *    안 난다 — 시험지가 그냥 안 나온다.
 *
 * ## 원장을 DB 보다 **먼저** 쓴다
 *
 * 2026-08-18 에 공유 DB 를 790건 바꿔 놓고 되돌리기 파일이 커밋 안 돼 있던 적이 있다.
 * 그리고 2026-08-20 에는 2회차가 1회차 원장을 **덮어써** 앞 회차를 못 되돌리게 됐다.
 * 그래서 이 스크립트는 ⑴ 원장을 먼저 쓰고 ⑵ **누적**만 하며(줄면 멈춘다) ⑶ 되돌릴
 * 때는 자기가 넣은 행만 지운다.
 *
 * ## 그림은 파일이 아니라 `figureSvg`(인라인)
 *
 * 엔진 도형은 SVG 문자열로 DB 에 들어간다. `figureUrls`(파일)와 달리 **밀지 않아도
 * 프로덕션에서 보인다** — 2026-08-20 의 「DB 는 즉시 최신인데 파일은 밀어야 간다」가
 * 구조적으로 안 생긴다.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import type { ElemTier } from "../../src/lib/elementary/difficulty";
import {
  generateMiddleProblem,
  typesForSection,
} from "../../src/lib/middle/generate";

// 관리용 스크립트는 **자기 클라이언트**를 쓴다 — `src/lib/db` 의 바깥벽 확장은
// 읽기를 `pool='shared'` 로 좁혀서, 「내가 넣은 행이 정말 shared 인가」를 물을 때
// 답이 언제나 «그렇다»가 되어 버린다(동어반복).
const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

type Tier = ElemTier;

type ElemTarget = {
  engine: "elem";
  grade: string;
  chapter: string;
  /** 비우면 그 단원의 소단원 전부 */
  sections?: string[];
  /** 갈래별로 몇 개씩 (기본 2) */
  perTier?: number;
  tiers?: Tier[];
};

type MiddleTarget = {
  engine: "middle";
  grade: string;
  unitSection: string;
  /** 유형마다 몇 벌 (기본 1) */
  variants?: number;
  /** 이 소단원에서 쓸 유형 수 상한 (기본 전부) */
  maxTypes?: number;
};

type Plan = {
  label: string;
  seedBase?: number;
  targets: (ElemTarget | MiddleTarget)[];
};

type Row = {
  externalId: string;
  unitKey: string; // 사람이 읽을 단원 표시 — 못 찾았을 때 무엇이 없는지 적으려고
  grade: string;
  section: string;
  chapter?: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: "easy" | "mid" | "hard";
  problemType: string;
  questionType: string;
  figureSpec: Record<string, unknown> | null;
  origin: string; // 어느 갈래/유형에서 나왔나 (원장에 적는다)
};

const TIER_DIFFICULTY: Record<Tier, "easy" | "mid" | "hard"> = {
  연산: "easy",
  기본: "easy",
  응용: "mid",
  심화: "hard",
};

const TIER_PROBLEM_TYPE: Record<Tier, string> = {
  연산: "계산",
  기본: "개념",
  응용: "활용",
  심화: "활용",
};

// ────────────────────────────── 생성 ──────────────────────────────

function buildElemRows(t: ElemTarget, seedBase: number): Row[] {
  const units = elementaryUnits().filter(
    (u) =>
      u.grade === t.grade &&
      u.chapter === t.chapter &&
      (!t.sections || t.sections.includes(u.section)),
  );
  if (units.length === 0)
    throw new Error(
      `초등 단원을 못 찾았다: ${t.grade} / ${t.chapter}` +
        (t.sections ? ` / ${t.sections.join(",")}` : ""),
    );
  const perTier = t.perTier ?? 2;
  const rows: Row[] = [];
  for (const unit of units) {
    const available = supportedTiers(unit);
    const want = (t.tiers ?? available).filter((x) => available.includes(x));
    if (want.length === 0) {
      // 갈래가 없는 소단원 — 조용히 건너뛰면 「냈다」가 거짓말이 된다.
      console.log(
        `   ⚠️ 갈래 없음, 건너뜀: ${unit.grade} ${unit.chapter} / ${unit.section}`,
      );
      continue;
    }
    for (const tier of want) {
      for (let i = 0; i < perTier; i += 1) {
        const seed = seedBase + i * 1009;
        const p = generateElementaryProblem(unit, seed, tier);
        rows.push({
          externalId: `engine-elem:${unit.grade}|${unit.chapter}|${unit.section}|${tier}|s${seed}`,
          unitKey: `${unit.grade} / ${unit.chapter} / ${unit.section}`,
          grade: unit.grade,
          chapter: unit.chapter,
          section: unit.section,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          difficulty: TIER_DIFFICULTY[tier],
          problemType: TIER_PROBLEM_TYPE[tier],
          questionType: "단답형",
          figureSpec: p.figureSpec,
          origin: `초등 ${tier}`,
        });
      }
    }
  }
  return rows;
}

function buildMiddleRows(t: MiddleTarget, seedBase: number): Row[] {
  let types = typesForSection(t.unitSection).filter((e) => e.grade === t.grade);
  if (types.length === 0)
    throw new Error(
      `중등 유형을 못 찾았다: ${t.grade} / ${t.unitSection}` +
        ` — registeredTypes() 로 이름을 확인하라(중단원 이름에 얇은 공백 U+2009 이 들어 있을 수 있다)`,
    );
  if (t.maxTypes) types = types.slice(0, t.maxTypes);
  const variants = t.variants ?? 1;
  const rows: Row[] = [];
  for (const entry of types) {
    for (let v = 0; v < variants; v += 1) {
      const p = generateMiddleProblem(entry.key, seedBase, v);
      rows.push({
        externalId: `engine-mid:${entry.key}|s${seedBase}|v${v}`,
        unitKey: `${entry.grade} / ${entry.unitSection}`,
        grade: entry.grade,
        section: entry.unitSection,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        difficulty: p.difficulty,
        problemType: p.difficulty === "easy" ? "계산" : "활용",
        questionType: "단답형",
        figureSpec: (p.figureSpec as Record<string, unknown> | null) ?? null,
        origin: `중등 ${entry.key} ${entry.rpmTitle}`,
      });
    }
  }
  return rows;
}

// ────────────────────────────── 그림 ──────────────────────────────

/** FigureSpec → SVG 문자열. 제품과 **같은 경로**(render_spec.py)를 탄다. */
function renderFigure(spec: Record<string, unknown>): string | null {
  const r = spawnSync(
    "python",
    [path.join(REPO, "scripts", "figure", "render_spec.py")],
    {
      input: JSON.stringify(spec),
      cwd: REPO,
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
  );
  try {
    const got = JSON.parse(r.stdout) as { svg?: string; error?: string };
    if (got.svg) return got.svg;
    console.log(`   ⚠️ 그림 실패: ${got.error ?? "사유 없음"}`);
  } catch {
    console.log(
      `   ⚠️ 그림 렌더가 JSON 을 안 냈다: ${(r.stderr || "").slice(0, 160)}`,
    );
  }
  return null;
}

// ────────────────────────────── 원장 ──────────────────────────────

type LedgerRow = {
  externalId: string;
  problemId: string;
  origin: string;
  unitKey: string;
};
type Ledger = {
  runs: { label: string; at: string; count: number }[];
  rows: LedgerRow[];
};

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
  writeFileSync(file, JSON.stringify(next, null, 2), "utf-8");
}

// ────────────────────────────── 본체 ──────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function apply(planFile: string, doApply: boolean) {
  const plan = JSON.parse(readFileSync(planFile, "utf-8")) as Plan;
  const seedBase = plan.seedBase ?? 20260825;
  const ledgerFile = path.join(
    LEDGER_DIR,
    `engine-load-${plan.label.replace(/[^\w가-힣-]+/g, "_")}.json`,
  );

  console.log(
    `계획 「${plan.label}」 · 씨앗 ${seedBase} · 목표 ${plan.targets.length}개`,
  );

  const rows: Row[] = [];
  for (const t of plan.targets) {
    const made =
      t.engine === "elem"
        ? buildElemRows(t, seedBase)
        : buildMiddleRows(t, seedBase);
    console.log(
      `   · ${t.engine === "elem" ? `${t.grade} ${t.chapter}` : `${t.grade} ${t.unitSection}`} → ${made.length}문항`,
    );
    rows.push(...made);
  }
  console.log(`\n생성 ${rows.length}문항`);

  // 단원 연결 — 못 찾은 것은 **세어서 찍는다**. 조용히 빼면 「전부 넣었다」로 읽힌다.
  const units = await prisma.unit.findMany({
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const byElem = new Map(
    units.map((u) => [`${u.grade}|${u.chapter}|${u.section}`, u.id]),
  );
  const byMid = new Map(units.map((u) => [`${u.grade}|${u.section}`, u.id]));

  const ready: (Row & { unitId: string })[] = [];
  const unmatched: string[] = [];
  for (const r of rows) {
    const id = r.chapter
      ? byElem.get(`${r.grade}|${r.chapter}|${r.section}`)
      : byMid.get(`${r.grade}|${r.section}`);
    if (!id) unmatched.push(r.unitKey);
    else ready.push({ ...r, unitId: id });
  }
  if (unmatched.length > 0) {
    console.log(`\n🔴 단원을 못 찾은 문항 ${unmatched.length}건 —`);
    for (const u of [...new Set(unmatched)].slice(0, 8))
      console.log(`   · ${u}`);
    throw new Error("단원 연결이 새면 적재하지 않는다 — 이름부터 맞춰라");
  }

  // 이미 들어간 것은 건너뛴다 (멱등).
  const existing = new Set(
    (
      await prisma.problem.findMany({
        where: { externalId: { in: ready.map((r) => r.externalId) } },
        select: { externalId: true },
      })
    ).map((p) => p.externalId!),
  );
  const fresh = ready.filter((r) => !existing.has(r.externalId));
  console.log(
    `단원 연결 ${ready.length} · 이미 있음 ${existing.size} · **넣을 것 ${fresh.length}**`,
  );
  if (ready.length !== fresh.length + existing.size)
    throw new Error("분모가 안 맞는다 — 멈춘다");

  if (!doApply) {
    const withFig = fresh.filter((r) => r.figureSpec).length;
    console.log(
      `\n드라이런이다. 그림이 붙는 문항 ${withFig}건.` +
        `\n실제로 넣으려면: ALLOW_SHARED_IMPORT=1 … --apply`,
    );
    if (fresh[0]) {
      console.log(`\n표본 — ${fresh[0].origin}`);
      console.log(`   ${fresh[0].content.replace(/\n/g, " ").slice(0, 160)}`);
      console.log(`   답: ${fresh[0].answer}`);
    }
    return;
  }

  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  if (fresh.length === 0) {
    console.log("넣을 것이 없다.");
    return;
  }

  // 그림 먼저 (실패해도 문항은 들어가되, 몇 건이 그림 없이 갔는지 찍는다).
  let drawn = 0;
  let failed = 0;
  const svgs = new Map<string, string>();
  for (const r of fresh) {
    if (!r.figureSpec) continue;
    const svg = renderFigure(r.figureSpec);
    if (svg) {
      svgs.set(r.externalId, svg);
      drawn += 1;
    } else failed += 1;
  }
  console.log(`그림 ${drawn}장 그림 · 실패 ${failed}`);

  const prev = readLedger(ledgerFile);
  const created: LedgerRow[] = [];

  for (const r of fresh) {
    const svg = svgs.get(r.externalId) ?? null;
    const made = await prisma.problem.create({
      data: {
        unitId: r.unitId,
        source: "manual", // 자작 — 우리 엔진이 낸 결정론적 문항이다 (AI 아님)
        difficulty: r.difficulty,
        problemType: r.problemType,
        questionType: r.questionType,
        content: r.content,
        answer: r.answer,
        solution: r.solution,
        figureSvg: svg,
        figureSource: svg ? "engine" : null,
        externalId: r.externalId,
        reviewStatus: "approved",
        directUseAllowed: true,
        pool: "shared",
        solutionSource: "none",
      },
      select: { id: true },
    });
    created.push({
      externalId: r.externalId,
      problemId: made.id,
      origin: r.origin,
      unitKey: r.unitKey,
    });
  }

  writeLedger(ledgerFile, prev, {
    runs: [
      ...prev.runs,
      {
        label: plan.label,
        at: new Date().toISOString(),
        count: created.length,
      },
    ],
    rows: [...prev.rows, ...created],
  });
  console.log(`적재 ${created.length}건 · 원장 ${ledgerFile}`);

  // 🔴 **믿지 않고 잰다** — 넣은 값 그대로인가. 트리거가 뒤집으면 여기서 잡힌다.
  const back = await prisma.problem.findMany({
    where: { id: { in: created.map((c) => c.problemId) } },
    select: {
      id: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
    },
  });
  const bad = back.filter(
    (p) =>
      p.pool !== "shared" ||
      p.reviewStatus !== "approved" ||
      !p.directUseAllowed,
  );
  if (back.length !== created.length)
    throw new Error(`되읽은 행이 ${back.length}/${created.length} 다 — 멈춘다`);
  if (bad.length > 0) {
    console.log(
      `\n🔴 ${bad.length}건이 요청한 상태가 **아니다** — 바깥벽이 물었다.` +
        `\n   「넣었다」와 「앱이 볼 수 있다」는 다른 말이다. 되돌리고 벽부터 보라.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `✅ ${back.length}건 전부 shared · approved · 출제허용 — 앱이 볼 수 있다`,
  );
}

async function revert(ledgerFile: string) {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const led = readLedger(ledgerFile);
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  // 자기가 넣은 것만 지운다 — externalId 가 우리 접두사인지 한 번 더 본다.
  const mine = led.rows.filter((r) => /^engine-(elem|mid):/.test(r.externalId));
  if (mine.length !== led.rows.length)
    throw new Error(
      `원장에 우리 것이 아닌 행이 ${led.rows.length - mine.length}건 있다 — 멈춘다`,
    );
  const r = await prisma.problem.deleteMany({
    where: { id: { in: mine.map((m) => m.problemId) } },
  });
  console.log(`지웠다 ${r.count} / ${mine.length}`);
}

async function main() {
  const planFile = arg("--plan");
  const revertFile = arg("--revert");
  if (revertFile) await revert(revertFile);
  else if (planFile) await apply(planFile, process.argv.includes("--apply"));
  else {
    console.log("--plan <계획.json> 또는 --revert <원장.json> 이 필요하다");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
