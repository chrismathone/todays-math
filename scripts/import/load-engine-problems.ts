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

import { expandFamily } from "../../src/lib/engine/expandEngine";
import {
  elemProblemType,
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import type { ElemTier } from "../../src/lib/elementary/difficulty";
import type { Difficulty } from "../../src/contracts/difficulty";
import {
  generateMiddleProblem,
  typesForSection,
} from "../../src/lib/middle/generate";
// 판정 규칙은 관문 판정기가 유일한 자리다 — 옮겨 적지 않는다.
import { deadBackslashHits } from "../qa/probe-middle-raw-latex";

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
  /**
   * **이 문항이 어느 문항류인가** (D-105). 같은 키 = 코드의 같은 `A01` 자리 =
   * 숫자만 바꾼 아류. DB 트리거가 이 값으로 `-001`, `-002` 를 이어 준다.
   */
  familyKey: string;
  unitKey: string; // 사람이 읽을 단원 표시 — 못 찾았을 때 무엇이 없는지 적으려고
  grade: string;
  section: string;
  chapter?: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  problemType: string;
  questionType: string;
  figureSpec: Record<string, unknown> | null;
  origin: string; // 어느 갈래/유형에서 나왔나 (원장에 적는다)
};

// 🔴 `TIER_DIFFICULTY` 는 없앴다 (D-106, 2026-08-25).
//    이 표가 **`연산` 과 `기본` 을 둘 다 `easy` 로 접고** 있었다 — 축이 둘이라
//    어쩔 수 없었지만, 접고 나면 화면에서 「이건 연산인가 기본인가」를 되물을
//    방법이 없다. 원장님이 문제은행에서 그것을 보시고 축을 하나로 하라고 하셨다.
//    이제 엔진의 갈래가 곧 `difficulty` 다.

const TIER_PROBLEM_TYPE: Record<Tier, string> = {
  연산: "계산",
  기본: "개념",
  응용: "활용",
  심화: "활용",
};

// ────────────────────────────── 생성 ──────────────────────────────

export function buildElemRows(t: ElemTarget, seedBase: number): Row[] {
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
  const variants = t.perTier ?? 3;
  const rows: Row[] = [];
  for (const unit of units) {
    if (supportedTiers(unit).length === 0) {
      // 갈래가 없는 소단원 — 조용히 건너뛰면 「냈다」가 거짓말이 된다.
      console.log(
        `   ⚠️ 갈래 없음, 건너뜀: ${unit.grade} ${unit.chapter} / ${unit.section}`,
      );
      continue;
    }
    const forms = listedForms(unit);
    if (forms.length === 0) {
      // 🔴 문형 등록이 없으면 옛 4단으로 되돌아가지 않는다 — 그러면 갈래가 4로
      //    남아 「한 시험지에 같은 문항류 하나만」 아래서 4문항이 상한이 된다.
      console.log(
        `   🔴 문형 등록 없음, 건너뜀: ${unit.grade} / ${unit.section}` +
          ` — scripts/qa/probe-elem-forms.ts 를 보라`,
      );
      continue;
    }
    for (const form of forms) {
      // 초등의 문항류 = **소단원 + 문형**. 난이도는 직교인 축이라 키에 안 넣는다
      // (D-72/D-106, 원장님 확정 2026-08-26 안 3). 씨앗만 바꾼 것이 그 틀의 아류다.
      const familyKey = `elem:${unit.grade}|${unit.section}|${form.id}`;
      const problemType = elemProblemType(form.tier);
      // 형식 3종은 **한 곳**에서 파생한다 — 생성기마다 손대지 않는다.
      // 객관식은 정답이 수가 아니면 안 나오고, 그때는 건너뛴 수가 보고에 찍힌다.
      // 🔴 **있는 만큼 낸다** (`allowShort`, 2026-08-28). 「사다리꼴의 꼭짓점은
      //    몇 개인가?」처럼 씨앗이 무엇이든 한 문항인 문형이 실측 30개 있다.
      //    던지면 그 **단원이 통째로 적재 거부**가 된다(실측 6개 단원).
      //    대신 몇 개를 못 채웠는지 아래 보고에서 **반드시 찍는다** —
      //    안 찍으면 말없는 상한이 되고, 표는 「다 넣었다」로 읽힌다.
      const got = expandFamily(
        (v) => {
          const seed = seedBase + v * 1009;
          const p = generateElementaryForm(unit, seed, form.id);
          return {
            content: p.content,
            answer: p.answer,
            solution: p.solution,
            familyKey,
            problemType,
            figureSpec: p.figureSpec,
            seed,
          };
        },
        variants,
        { allowShort: true },
      );
      elemSkippedMcq += got.skippedMcq;
      if (got.shortBy > 0)
        elemShort.push(
          `${unit.grade} ${unit.section} f${form.id} — ${variants - got.shortBy}/${variants}`,
        );
      for (const item of got.items) {
        const it = item as typeof item & {
          figureSpec: Record<string, unknown> | null;
          seed: number;
        };
        rows.push({
          externalId: `engine-elem:${unit.grade}|${unit.chapter}|${unit.section}|f${form.id}|${it.questionType}|s${it.seed}`,
          familyKey,
          unitKey: `${unit.grade} / ${unit.chapter} / ${unit.section}`,
          grade: unit.grade,
          chapter: unit.chapter,
          section: unit.section,
          content: it.content,
          answer: it.answer,
          solution: it.solution,
          difficulty: form.tier,
          problemType,
          // 🔴 형식을 **여기서** 적는다. 안 적으면 화면에 `[?형식]` 이 뜬다
          //    (원장님 지적 2026-08-26). 전에는 "단답형" 으로 박혀 있었다.
          questionType: it.questionType,
          figureSpec: it.figureSpec,
          origin: `초등 문형 ${form.id}(${form.tier})`,
        });
      }
    }
  }
  return rows;
}

/** 객관식을 못 만들어 건너뛴 수 — 계획 보고에 찍는다. 조용히 삼키지 않는다. */
let elemSkippedMcq = 0;
const elemShort: string[] = [];

export function buildMiddleRows(t: MiddleTarget, seedBase: number): Row[] {
  let types = typesForSection(t.unitSection).filter((e) => e.grade === t.grade);
  if (types.length === 0)
    throw new Error(
      `중등 유형을 못 찾았다: ${t.grade} / ${t.unitSection}` +
        ` — registeredTypes() 로 이름을 확인하라(중단원 이름에 얇은 공백 U+2009 이 들어 있을 수 있다)`,
    );
  if (t.maxTypes) types = types.slice(0, t.maxTypes);
  const variants = t.variants ?? 3;
  const rows: Row[] = [];
  for (const entry of types) {
    // 중등의 문항류 = **RPM 유형 키** 그 자체. 변형(v0·v1·…)은 같은 유형의 아류다.
    const familyKey = `mid:${entry.key}`;
    // 형식 3종은 초등과 **같은 모듈**에서 파생한다. 규칙이 두 벌이 되면
    // 한쪽만 고쳐도 아무도 모른다. 이미 객관식인 유형(873 중 20개)은
    // `expandFamily` 가 파생하지 않고 그대로 낸다.
    const got = expandFamily((v) => {
      const p = generateMiddleProblem(entry.key, seedBase, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        // 유형은 난이도와 **다른 축**이지만 중등 엔진이 유형을 따로 안 내므로
        // 갈래에서 어림한다. 밑 두 칸(연산·기본)은 계산, 위 두 칸은 활용.
        problemType:
          p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
        difficulty: p.difficulty,
        figureSpec: (p.figureSpec as Record<string, unknown> | null) ?? null,
        variant: v,
      };
    }, variants);
    midSkippedMcq += got.skippedMcq;
    for (const item of got.items) {
      const it = item as typeof item & {
        difficulty: Difficulty;
        figureSpec: Record<string, unknown> | null;
        variant: number;
      };
      rows.push({
        externalId: `engine-mid:${entry.key}|s${seedBase}|v${it.variant}|${it.questionType}`,
        familyKey,
        unitKey: `${entry.grade} / ${entry.unitSection}`,
        grade: entry.grade,
        section: entry.unitSection,
        content: it.content,
        answer: it.answer,
        solution: it.solution,
        difficulty: it.difficulty,
        problemType: it.problemType,
        // 🔴 형식을 **여기서** 적는다. 전에는 "단답형" 으로 박혀 있어 객관식·서술형이
        //    통째로 단답으로 들어갔다 — 화면에서 갈라 볼 수 없다.
        questionType: it.questionType,
        figureSpec: it.figureSpec,
        origin: `중등 ${entry.key} ${entry.rpmTitle}`,
      });
    }
  }
  return rows;
}

/** 중등에서 객관식을 못 만들어 건너뛴 수 — 계획 보고에 찍는다. */
let midSkippedMcq = 0;

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

  // ── 🔴 **같은 문항이 다른 번호를 받는 것**을 여기서 막는다 ────────────────────
  // 원장님 2026-08-25: 「같은 문제가 사실상 생성되었는데 문제번호가 다름」.
  // 변형 두 벌(v0·v1)이 **같은 수를 뽑는 일**이 실제로 있다 — 뽑을 수 있는 값이
  // 적은 유형에서 그렇다. 그때 두 행은 본문·정답이 글자까지 같은데 코드만 다르다.
  //
  // 열쇠는 **본문 + 정답**이다. 본문만 보면 「답이 여럿인 문항」을 한 건으로 뭉개고,
  // 정답만 보면 다른 문항이 우연히 같은 답을 낸 것을 지운다.
  const seen = new Map<string, Row>();
  const dropped: string[] = [];
  const unique: Row[] = [];
  for (const r of rows) {
    const key = `${r.content.replace(/\s+/g, " ").trim()}||${r.answer.replace(/\s+/g, " ").trim()}`;
    const first = seen.get(key);
    if (first) {
      dropped.push(`${r.origin} ← ${first.origin} 과 같음`);
      continue;
    }
    seen.set(key, r);
    unique.push(r);
  }
  if (dropped.length > 0) {
    console.log(
      `   ⚠️ 같은 문항 ${dropped.length}건을 뺐다 (본문+정답이 같다)`,
    );
    for (const d of dropped.slice(0, 5)) console.log(`      · ${d}`);
  }
  // 분모를 못 맞추면 멈춘다 — 조용히 줄면 「전부 넣었다」로 읽힌다.
  if (unique.length + dropped.length !== rows.length)
    throw new Error("중복 제거에서 분모가 안 맞는다 — 멈춘다");
  rows.length = 0;
  rows.push(...unique);
  console.log(`서로 다른 문항 ${rows.length}건`);
  // 원장님 목표가 「객관식/단답형/서술형으로 10문항씩」이다 — 그 분포를 **보이게** 찍는다.
  // 그리고 객관식을 못 만들어 건너뛴 수도 같이 찍는다: 조용히 삼키면 「형식 3종을
  // 다 냈다」가 거짓이 되고, 화면에서 원장님이 찾아 주실 때까지 아무도 모른다.
  const byFormat = new Map<string, number>();
  for (const r of rows)
    byFormat.set(r.questionType, (byFormat.get(r.questionType) ?? 0) + 1);
  console.log(
    `   형식 — ${[...byFormat]
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ")}`,
  );
  if (midSkippedMcq > 0)
    console.log(
      `   ⚠️ 중등에서 객관식을 못 만든 변형 ${midSkippedMcq}건 (정답이 «식»이라 계산 실수 오답을 못 만든다)`,
    );
  if (elemSkippedMcq > 0)
    console.log(
      `   ⚠️ 객관식을 못 만든 변형 ${elemSkippedMcq}건 (정답이 수·분수·소수가 아니다) — 무작위 수로 안 채운다`,
    );
  // 🔴 **말없는 상한을 막는다.** `allowShort` 로 덜 낸 문형을 반드시 찍는다.
  //    안 찍으면 「전부 넣었다」로 읽히고, 변할 수 있던 문형이 못 변하게 된 회귀도
  //    같은 모양으로 조용히 지나간다. 목록 자체는 시험이 못 박는다
  //    (`src/__tests__/unit/elemFormVariantSpace.test.ts`).
  if (elemShort.length > 0) {
    console.log(
      `   ⚠️ 변형을 다 못 채운 초등 문형 ${elemShort.length}개 — 씨앗이 무엇이든 같은 문항이라 있는 만큼만 넣었다:`,
    );
    for (const s of elemShort.slice(0, 10)) console.log(`      · ${s}`);
    if (elemShort.length > 10)
      console.log(`      … 그 밖 ${elemShort.length - 10}개`);
  }

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

  // ── **DB 에 이미 있는 같은 문항**도 막는다 ────────────────────────────────
  // 위의 중복 제거는 이번 회차 **안**만 본다. 다른 씨앗으로 다시 돌리면 같은 문항이
  // 또 나올 수 있고(뽑을 값이 적은 유형), 그러면 원장님이 지적하신 그 모양이 된다.
  // 대조 범위를 **같은 문항류**로 좁힌다 — 다른 유형끼리는 본문이 같을 수 없다.
  const families = [...new Set(fresh.map((r) => r.familyKey))];
  const already = await prisma.problem.findMany({
    where: { familyKey: { in: families } },
    select: { familyKey: true, content: true, answer: true, problemCode: true },
  });
  const seenInDb = new Map<string, string>();
  for (const p of already)
    seenInDb.set(
      `${p.content.replace(/\s+/g, " ").trim()}||${p.answer.replace(/\s+/g, " ").trim()}`,
      p.problemCode,
    );
  const beforeDbDedupe = fresh.length;
  const kept = fresh.filter((r) => {
    const code = seenInDb.get(
      `${r.content.replace(/\s+/g, " ").trim()}||${r.answer.replace(/\s+/g, " ").trim()}`,
    );
    if (code) console.log(`   ⚠️ DB 에 이미 있다 (${code}): ${r.origin}`);
    return !code;
  });
  if (kept.length !== beforeDbDedupe)
    console.log(
      `   DB 중복 ${beforeDbDedupe - kept.length}건을 뺐다 · 남은 것 ${kept.length}`,
    );
  fresh.length = 0;
  fresh.push(...kept);

  // ── 🔴 **죽은 역슬래시는 아예 안 넣는다** ────────────────────────────────
  // 결함이 들어오는 자리가 여기다. TS 템플릿 리터럴에서 `\angle` 은 역슬래시가
  // **먹혀서** 지면에 `angle C=90^circ` 가 나간다. tsc·vitest·KaTeX·값 검산이 전부
  // 초록이라 **결함이 스스로 신고하지 않는다**(2026-08-27 에 16문항이 그렇게 나갔다).
  //
  // 판정 규칙은 **옮겨 적지 않는다** — 관문 판정기의 것을 그대로 부른다.
  // 그래야 축이 늘 때 한 곳만 고치면 된다.
  const dirty = fresh.filter(
    (r) =>
      deadBackslashHits(r.content).length > 0 ||
      deadBackslashHits(r.answer).length > 0 ||
      deadBackslashHits(r.solution ?? "").length > 0,
  );
  if (dirty.length > 0) {
    console.log(
      `\n🔴 죽은 역슬래시가 든 문항 ${dirty.length}건 — 적재를 멈춘다.`,
    );
    for (const r of dirty.slice(0, 10)) {
      const names = [
        ...new Set([
          ...deadBackslashHits(r.content),
          ...deadBackslashHits(r.answer),
          ...deadBackslashHits(r.solution ?? ""),
        ]),
      ];
      console.log(`   ❌ ${r.origin} [${names.join(", ")}]`);
      console.log(`      ${r.content.replace(/\n/g, " ").slice(0, 120)}`);
    }
    if (dirty.length > 10) console.log(`   … ${dirty.length - 10}건 더`);
    throw new Error(
      "엔진 소스에서 `String.raw` 를 쓰거나 `\\\\angle` 로 적은 뒤 다시 돌려라. " +
        "여기서 넣으면 **엔진을 고쳐도 이 행은 안 고쳐진다.**",
    );
  }

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
  // 흘려 쓸 때마다 시각을 새로 찍으면 회차 줄이 매번 달라진다 — 한 번만 찍는다.
  const RUN_AT = new Date().toISOString();

  /**
   * 🔴 **원장을 넣는 도중에도 흘려 쓴다** (2026-08-29).
   *
   * 이 파일 머리말은 「원장을 DB 보다 **먼저** 쓴다」고 적어 두었는데, 실제로는
   * 만들기 고리가 **다 끝난 뒤에** 한 번 썼다. INSERT 는 id 가 만든 뒤에야 나오니
   * 「먼저」가 글자 그대로는 안 되지만, **흘려 쓰지 않으면 도중에 죽었을 때 그
   * 행들이 통째로 되돌릴 수 없는 상태로 남는다.**
   *
   * 2026-08-29 에 실제로 났다 — 12,762행을 넣다 DB 트리거가 던져 **6,438행이
   * 원장 없이** 남았다. 되살리려고 DB 를 훑는 스크립트를 따로 써야 했다.
   * 이제 200행마다 흘려 쓰므로, 죽어도 잃는 것은 마지막 한 묶음뿐이다.
   */
  const FLUSH_EVERY = 200;
  const flush = (): void => {
    writeLedger(ledgerFile, prev, {
      runs: [
        ...prev.runs,
        { label: plan.label, at: RUN_AT, count: created.length },
      ],
      rows: [...prev.rows, ...created],
    });
  };

  for (const r of fresh) {
    const svg = svgs.get(r.externalId) ?? null;
    // exam-wiring: 기출아님 — 우리 엔진이 낸 **자작** 문항이다(`source=manual`).
    // 원본 시험지가 아예 없으므로 `Exam` 을 세울 것도, 되돌릴 링크도 없다.
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
        // 문항류 (D-105) — 트리거가 이 값으로 `J30103-A01-001` 의 `A01` 자리와
        // 아류 번호를 정한다. 비워 두면 문항마다 혼자 한 무리가 된다.
        familyKey: r.familyKey,
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
    if (created.length % FLUSH_EVERY === 0) flush();
  }

  flush();
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

  // 🔴 **빈 문항류도 같이 치운다.** 대장(`problem_family`)은 `next_seq` 를 들고 있어서,
  //    문항만 지우면 다음 회차가 `-001` 이 아니라 `-003` 부터 시작하고 문항류 글자도
  //    그 자리를 건너뛴다. 「되돌렸다」고 하면서 자국이 남는 것이다.
  //    ⚠️ **문항이 하나도 안 남은 무리만** 지운다 — 남아 있는 무리를 지우면 그 무리의
  //    다음 문항이 이미 쓴 번호를 다시 받는다(코드가 두 문항을 가리킨다).
  const emptied = await prisma.$executeRawUnsafe(`
    DELETE FROM "problem_family" f
     WHERE NOT EXISTS (
       SELECT 1 FROM "problem" p
        WHERE p."unit_id" = f."unit_id" AND p."family_key" = f."family_key"
     )
  `);
  console.log(`빈 문항류 ${emptied}개를 치웠다`);
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

// ⚠️ **직접 실행할 때만 돈다.** `scripts/qa/refresh-engine-figures.ts` 가 이 파일의
//    행 만들기(`buildElemRows`·`buildMiddleRows`)를 **그대로 빌려 쓴다** — 규칙을 옮겨
//    적으면 두 벌이 되고, 한쪽만 고치면 그림이 남의 문항에 붙는다. 가드가 없으면
//    import 하는 순간 적재기가 돌아 버린다.
// ⚠️ `import.meta.dirname` 은 쓰지 않는다 — tsx 가 CJS 로 옮기면 **undefined** 다
//    (2026-08-28 에 그걸로 죽었다). 파일 이름만 보면 모듈 시스템에 안 기댄다.
const RUN_DIRECTLY = /load-engine-problems\.(ts|js|mts|mjs)$/i.test(
  process.argv[1] ?? "",
);

if (RUN_DIRECTLY)
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
