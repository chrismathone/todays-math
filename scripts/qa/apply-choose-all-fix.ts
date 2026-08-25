/**
 * 「모두 고르시오」인데 정답이 **2개가 아닌** 문항을 엔진으로 다시 만든다 (D-79).
 *
 *   npx tsx scripts/qa/apply-choose-all-fix.ts                       # 드라이런(기본)
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --apply
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --revert
 *
 * ## 원장님 확정 (2026-08-25)
 *
 *   ⑴ **대상은 「정답이 3개 이상」** — 목표가 2개이므로 이미 2개인 문항은 그대로 둔다.
 *      (`--min` 으로 바꿀 수 있지만 기본이 3이다.)
 *   ⑵ **「같은 문제 라벨」 = 재생성본이 원본과 같은 출처 라벨을 유지한다.**
 *      덤으로 **원본과의 연결**(`originProblemId`)을 남겨 「같은 문제」임을 추적 가능하게.
 *
 * ## 🔴 왜 «지우지» 않고 «출제에서 빼는가» — ⑴ 과 ⑵ 가 스키마에서 부딪힌다
 *
 * `Problem.originProblemId` 는 `onDelete: SetNull` 이다. 원본 행을 **정말 지우면**
 * 그 순간 링크가 **NULL 로 끊긴다** — ⑵ 가 요구하는 추적이 DB 에서 불가능해진다.
 * 게다가 문항 코드(D-53)는 트리거가 UPDATE 를 막아 **한 번 소모하면 못 되돌린다.**
 *
 * 그래서 원본을 **`direct_use_allowed = false` 로 내려 출제 풀에서 뺀다.**
 *   · 출제에서 사라진다 — 「삭제」가 노린 효과는 그대로다(풀 조회가 이 컬럼을 본다).
 *   · 링크가 안 끊긴다 — 재생성본이 원본을 가리킨다.
 *   · 문항 코드가 안 죽는다 — 종이에 적힌 `-001` 이 계속 그 문항을 가리킨다.
 *   · **되돌릴 수 있다** — 한 컬럼만 되돌리면 원상복구다.
 * 정말 행까지 지우려면 그건 별도 결정이고, 이 원장이 그때도 근거가 된다.
 *
 * ## 출처 라벨을 어떻게 «같게» 유지하나 — 손 목록을 안 쓴다
 *
 * 오늘 화면의 출처 라벨은 `SOURCE_LABEL[source]` 와 기출 메타(`school`·`examId`·
 * `questionNumber`…)에서 나온다. 그 목록을 손으로 적으면 **컬럼이 하나 늘 때 조용히
 * 뒤처진다.** 그래서 거꾸로 한다 — **바꿀 것만 손으로 적고 나머지는 전부 물려받는다.**
 * 그리고 Prisma DMMF 로 컬럼 전량을 훑어 「복사도 안 되고 바꾸지도 않는 컬럼」이
 * 하나라도 있으면 **멈춘다**(새 컬럼이 생기면 여기서 걸린다).
 *
 * ## 이 스크립트가 지키는 것 (CLAUDE.md 의 값비싼 교훈들)
 *  1. **처리용 모집단을 좁힌다** — `direct_use_allowed=true` **그리고** `isChooseAll`.
 *     발견기의 `--all`(반증용 45,374건)을 물려받지 않는다(2026-08-18: 43→433).
 *  2. **분모 검산** — 「고칠 것 + 건너뜀 == 대상」이 아니면 멈춘다.
 *  3. **무엇을 잃는가**(D-20) — 단원별 풀·손실·남는 수, 일일(8)·확인(25) 정원 아래로
 *     내려가는 단원, 그리고 **난이도 칸별** 이동까지 센다.
 *  4. **원장을 DB 보다 먼저** 쓰고 **누적만** 한다(줄면 멈춘다). 그리고 그 원장이
 *     **정말 커밋되는지 스스로 확인한다** — 아니면 아무것도 안 바꾼다.
 *  5. **되돌리기는 지금 값이 자기가 쓴 값일 때만** — 그 사이 남이 고쳤으면 안 건드린다.
 *  6. 쓰고 나서 **되읽어 확인한다** — 「넣었다」와 「앱이 볼 수 있다」는 다른 말이다.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  chooseAllAnswerCount,
  CHOOSE_ALL_ANSWER_COUNT,
  isChooseAll,
  UNCOUNTABLE,
} from "../../src/lib/problem/chooseAllRule";

const prisma = new PrismaClient();

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(
  REPO,
  "scripts",
  "qa",
  "reports",
  "choose-all-fix-ledger.json",
);

/** 일일테스트 기본 정원 · 확인테스트 정원 (D-20) — `apply-choice-figure-discard.ts` 와 같은 값. */
const DAILY = 8;
const REVIEW = 25;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const numArg = (flag: string, dflt: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
/** 정답이 이 수 **이상**인 것을 다시 만든다. 원장님 확정: 3. */
const MIN = numArg("--min", 3);
/** 씨앗 탐색의 출발점 — 이미 쓴 씨앗(20260826·20260927)과 겹치지 않게 멀리 둔다. */
const SEED0 = numArg("--seed", 20270101);

/* ────────────────────────────────────────────────────────────────────────
 * 컬럼 — **바꿀 것만 적고 나머지는 전부 물려받는다**
 * ──────────────────────────────────────────────────────────────────────── */

/** DB 가 정하는 값 — 새 행에 실어 보내면 안 된다. */
export const DB_OWNED = new Set([
  "id",
  "problemCode", // 트리거가 준다 (D-53)
  "createdAt",
  "updatedAt",
]);

/** 이 작업이 **일부러 바꾸는** 값. */
export const REPLACED = new Set([
  "content",
  "answer",
  "solution",
  "externalId", // 새 씨앗을 가리켜야 한다 — 안 바꾸면 unique 가 부딪힌다
  "difficulty", // 엔진이 새 본문에 대해 판정한 값이 참이다 (D-106)
  "originProblemId", // ⑵ — 원본을 가리킨다
  // 그림 — 새 본문의 그림은 엔진에서 온다. 원본 그림을 물려받으면 **딴 문항의 그림**이 된다.
  "figureSvg",
  "figureSource",
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "choiceFigureIndex",
]);

/**
 * 그대로 물려받는 컬럼 — **출처 라벨이 여기 들어 있다**(`source`·`school`·`examId`…).
 * 목록을 손으로 안 적는다: 전량에서 위 둘을 뺀 나머지다.
 */
export function inheritedFields(): string[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Problem");
  if (!model) throw new Error("Prisma DMMF 에 Problem 모델이 없다 — 멈춘다");
  const scalars = model.fields
    .filter((f) => f.kind === "scalar" || f.kind === "enum")
    .map((f) => f.name);
  const rest = scalars.filter((f) => !DB_OWNED.has(f) && !REPLACED.has(f));
  // 새 컬럼이 생기면 여기서 «물려받는 쪽»에 조용히 들어간다. 그게 안전한 방향이다
  // (출처 메타는 물려받아야 하므로). 반대로 우리가 적어 둔 이름이 **사라지면**
  // 컬럼 이름이 바뀐 것이므로 멈춘다.
  for (const declared of [...DB_OWNED, ...REPLACED]) {
    if (!scalars.includes(declared)) {
      throw new Error(
        `Problem 에 «${declared}» 컬럼이 없다 — 이름이 바뀌었다. 목록을 고치고 다시 돌려라.`,
      );
    }
  }
  return rest;
}

/* ────────────────────────────────────────────────────────────────────────
 * 원장
 * ──────────────────────────────────────────────────────────────────────── */

type LedgerRow = {
  /** 원본 */
  originId: string;
  originCode: string;
  familyKey: string;
  unitId: string;
  /** 원본에서 바꾼 것 — 되돌리기가 이것만 읽는다. */
  before: { directUseAllowed: boolean; answerCount: number; answer: string };
  after: { directUseAllowed: boolean };
  /** 새로 만든 재생성본 */
  createdId: string;
  createdCode: string;
  createdAnswer: string;
  createdExternalId: string;
};
type Ledger = {
  runs: { at: string; min: number; count: number }[];
  rows: LedgerRow[];
};

function readLedger(): Ledger {
  if (!existsSync(LEDGER)) return { runs: [], rows: [] };
  return JSON.parse(readFileSync(LEDGER, "utf-8")) as Ledger;
}

function saveLedger(led: Ledger, prevRowCount: number): void {
  // 🔴 **줄면 멈춘다.** 통째로 쓰면 앞 회차를 되돌릴 수 없다(2026-08-20 사고).
  if (led.rows.length < prevRowCount) {
    throw new Error(
      `원장 행이 ${prevRowCount} → ${led.rows.length} 로 **줄었다**. 멈춘다.`,
    );
  }
  mkdirSync(path.dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(led, null, 2), "utf-8");
}

/**
 * 🔴 **원장이 정말 커밋되는지 스스로 확인한다.** 2026-08-18 에 공유 DB 를 790건
 * 바꿔 놓고 되돌리기 파일이 `.gitignore` 에 걸려 다른 컴퓨터에서 되돌릴 수 없었다.
 *
 * ⚠️ `git check-ignore **-v**` 는 부정 규칙(`!`)이 맞아도 **종료 코드 0** 을 낸다
 *    (실측 2026-08-25). 「무시되는가」를 물으려면 `--quiet` 를 써야 한다.
 */
function assertLedgerIsCommittable(): void {
  const rel = path.relative(REPO, LEDGER).split(path.sep).join("/");
  let ignored: boolean;
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", rel], { cwd: REPO });
    ignored = true; // 종료 0 = 무시된다
  } catch {
    ignored = false; // 종료 1 = 무시되지 않는다
  }
  if (ignored) {
    throw new Error(
      `되돌리기 원장이 .gitignore 에 걸려 있다: ${rel}\n` +
        `  커밋이 안 되면 이 컴퓨터 말고는 아무도 되돌릴 수 없다 — 예외를 먼저 넣어라.`,
    );
  }
  console.log(`원장이 커밋된다: ${rel} ✔`);
}

/** `mid:2-1|연립일차방정식|01` → 엔진 유형 키 `2-1|연립일차방정식|01`. */
function engineKeyOf(familyKey: string): string | null {
  return familyKey.startsWith("mid:") ? familyKey.slice("mid:".length) : null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * 🔴 **처리 대상 고르기** — 무리 필터를 **이 함수 안**에 둔다.
 *
 * 부르는 쪽이 「이미 걸러서 준다」고 믿으면, 언젠가 반증용으로 넓힌 목록이 그대로
 * 흘러들어 온다(2026-08-18: 43건이 433건이 됐다). 그래서 여기서 다시 좁힌다:
 *   ㉠ 출제 풀에 있는 것만 (`directUseAllowed`)
 *   ㉡ **「모두 고르시오」인 것만** (`isChooseAll`)
 *   ㉢ 정답이 `min` 개 이상이거나 **셀 수 없는** 것
 *
 * ㉢ 에 「셀 수 없는 것」이 든 이유: 「모두 고르시오」인데 정답이 보기 표식이 아니면
 * 그건 이미 깨진 문항이다. 0 으로 뭉개서 통과시키면 그 부류가 구조적으로 안 보인다.
 */
export function pickTargets<
  T extends { content: string; answer: string; directUseAllowed: boolean },
>(rows: readonly T[], min: number): { targets: T[]; family: T[] } {
  const family = rows.filter(
    (r) => r.directUseAllowed && isChooseAll(r.content),
  );
  const targets = family.filter((r) => {
    const n = chooseAllAnswerCount(r.answer);
    return n === UNCOUNTABLE || n >= min;
  });
  return { targets, family };
}

/**
 * 🔴 **되돌릴까** — 「지금 값이 자기가 쓴 값일 때만」.
 *
 * `direct_use_allowed` 는 그림 유실 잠금·보기그림 잠금도 쓰는 컬럼이다(2026-08-18).
 * 그 사이 남이 잠갔으면 우리가 풀면 안 된다. 재생성본 쪽도 같다 — 원본 링크가
 * 우리가 쓴 값이 아니면 남의 행이다.
 */
export function shouldRevert(
  row: { originId: string; after: { directUseAllowed: boolean } },
  originNow: { directUseAllowed: boolean } | null,
  createdNow: { originProblemId: string | null } | null,
): { ok: boolean; why?: string } {
  if (!originNow) return { ok: false, why: "원본이 없다" };
  if (originNow.directUseAllowed !== row.after.directUseAllowed)
    return { ok: false, why: "원본의 지금 값이 내가 쓴 것이 아니다" };
  if (createdNow && createdNow.originProblemId !== row.originId)
    return { ok: false, why: "재생성본의 원본 링크가 내가 쓴 것이 아니다" };
  return { ok: true };
}

/* ────────────────────────────────────────────────────────────────────────
 * 본체
 * ──────────────────────────────────────────────────────────────────────── */

type Row = Record<string, unknown> & {
  id: string;
  problemCode: string;
  familyKey: string | null;
  unitId: string;
  content: string;
  answer: string;
  difficulty: string;
  directUseAllowed: boolean;
};

async function main() {
  if (REVERT) return revert();

  const inherited = inheritedFields();
  console.log(
    `물려받는 컬럼 ${inherited.length}개 (출처 라벨 포함): ${inherited.join(", ")}`,
  );

  // ── 1. 처리용 모집단 — **여기서 좁힌다** ──────────────────────────────
  const live = (await prisma.problem.findMany({
    where: { directUseAllowed: true },
  })) as unknown as Row[];
  const { targets, family } = pickTargets(live, MIN);
  console.log(
    `\n출제 가능 ${live.length} · 그중 「모두 고르시오」 ${family.length}건`,
  );
  const dist = new Map<number, number>();
  for (const p of family) {
    const n = chooseAllAnswerCount(p.answer);
    dist.set(n, (dist.get(n) ?? 0) + 1);
  }
  console.log(
    "  정답 개수 분포: " +
      [...dist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, c]) => `${n < 0 ? "판정불가" : `${n}개`} ${c}`)
        .join(" · "),
  );

  const skipped = family.length - targets.length;
  console.log(
    `\n대상 «정답 ${MIN}개 이상» → 다시 만들 것 ${targets.length} · 그대로 둘 것 ${skipped}`,
  );
  // ── 2. 분모 검산 ──────────────────────────────────────────────────
  if (targets.length + skipped !== family.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
  if (targets.length === 0) {
    console.log("\n다시 만들 것이 없다.");
    return;
  }

  // 그림이 붙은 문항은 이 스크립트가 다루지 않는다 — 새 본문에 옛 그림이 딸려 가면
  // **그럴듯하게 틀린 문항**이 된다. 조용히 넘기지 않고 멈춘다.
  const withFigure = targets.filter(
    (t) =>
      t.figureSvg !== null ||
      (Array.isArray(t.figureUrls) && (t.figureUrls as string[]).length > 0),
  );
  if (withFigure.length > 0) {
    throw new Error(
      `그림이 붙은 대상이 ${withFigure.length}건 있다 — 이 스크립트는 그림을 못 옮긴다. 멈춘다.`,
    );
  }

  // ── 3. 무엇을 잃는가 (D-20) ────────────────────────────────────────
  await reportLoss(targets);

  // ── 4. 대체 문항을 **먼저 만들어 검산한다** (DB 를 건드리기 전에) ─────
  // 🔴 대조 모집단은 **그 문항류 전량**이다 — `live` 만 보면 «지금 빼는 중인 원본»과
  //    같은 문항을 다시 만들어도 안 걸린다. 격리분까지 넣어야 「같은 문항이 다른
  //    번호를 받는 것」(원장님 2026-08-25)을 막는다.
  const families = [...new Set(targets.map((t) => String(t.familyKey)))];
  const siblings = await prisma.problem.findMany({
    where: { familyKey: { in: families } },
    select: { familyKey: true, content: true, answer: true },
  });
  const seenByFamily = new Map<string, Set<string>>();
  for (const p of siblings) {
    const k = String(p.familyKey);
    const set = seenByFamily.get(k) ?? new Set<string>();
    set.add(`${norm(p.content)}||${norm(p.answer)}`);
    seenByFamily.set(k, set);
  }
  console.log(
    `
대조 모집단: 문항류 ${families.length}개의 형제 ${siblings.length}건 (격리분 포함)`,
  );
  const registered = new Set(registeredTypes().map((t) => t.key));

  type Made = {
    target: Row;
    content: string;
    answer: string;
    solution: string;
    difficulty: string;
    externalId: string;
  };
  const made: Made[] = [];
  const unmade: string[] = [];

  for (const t of targets) {
    const key = engineKeyOf(String(t.familyKey));
    if (!key || !registered.has(key)) {
      unmade.push(`${t.problemCode} — 엔진 유형을 못 찾음 (${t.familyKey})`);
      continue;
    }
    let ok = false;
    for (let s = 0; s < 400 && !ok; s += 1) {
      const seed = SEED0 + s * 1009;
      const p = generateMiddleProblem(key, seed);
      if (chooseAllAnswerCount(p.answer) !== CHOOSE_ALL_ANSWER_COUNT) continue;
      if (p.figureSpec) continue; // 그림이 붙는 산출물은 안 쓴다 (위 가드와 같은 이유)
      const sig = `${norm(p.content)}||${norm(p.answer)}`;
      let seen = seenByFamily.get(String(t.familyKey));
      if (!seen) {
        seen = new Set<string>();
        seenByFamily.set(String(t.familyKey), seen);
      }
      if (seen.has(sig)) continue; // 같은 문항이 두 번 나오지 않게
      seen.add(sig);
      made.push({
        target: t,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        difficulty: p.difficulty,
        externalId: `engine-mid:${key}|s${seed}|v0`,
      });
      ok = true;
    }
    if (!ok) unmade.push(`${t.problemCode} — 씨앗 400개로 못 만듦`);
  }
  if (made.length + unmade.length !== targets.length) {
    throw new Error("만들기에서 분모가 안 맞는다 — 멈춘다");
  }
  if (unmade.length > 0) {
    console.log(`\n🔴 못 만든 것 ${unmade.length}건 —`);
    for (const u of unmade) console.log(`   · ${u}`);
    throw new Error("대체 문항을 다 못 만들면 아무것도 안 바꾼다 — 멈춘다");
  }

  console.log(`\n=== 대체 문항 ${made.length}건 ===`);
  for (const m of made) {
    const moved =
      m.difficulty === m.target.difficulty
        ? ""
        : `  ⚠️ 난이도 ${m.target.difficulty} → ${m.difficulty}`;
    console.log(
      `\n  ${m.target.problemCode}  ${m.target.familyKey}${moved}` +
        `\n    전: ${norm(m.target.content).slice(0, 88)}  → «${m.target.answer}»` +
        `\n    후: ${norm(m.content).slice(0, 88)}  → «${m.answer}»`,
    );
  }

  if (!APPLY) {
    console.log(
      `\n드라이런이다. 실제로 바꾸려면:` +
        `\n  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-choose-all-fix.ts --min ${MIN} --apply`,
    );
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 을 명시하라 (D-31)",
    );
  }

  // ── 5. 원장이 커밋되는지 **먼저** 확인한다 ──────────────────────────
  assertLedgerIsCommittable();

  // ── 6. 원본 → 재생성본. 원장을 **DB 보다 먼저** 쓴다 ────────────────
  const led = readLedger();
  const prevCount = led.rows.length;
  // 앞 회차에 이미 손댄 행이면 **처음의 before** 를 남긴다.
  const byOrigin = new Map(led.rows.map((r) => [r.originId, r]));

  for (const m of made) {
    const t = m.target;
    const data: Record<string, unknown> = {};
    for (const f of inherited) data[f] = t[f];
    data.content = m.content;
    data.answer = m.answer;
    data.solution = m.solution;
    data.difficulty = m.difficulty;
    data.externalId = m.externalId;
    data.originProblemId = t.id; // ⑵ — 「같은 문제」 추적
    data.directUseAllowed = true;
    // 그림은 없다 (위에서 그림 붙은 것을 걸렀다).
    data.figureSvg = null;
    data.figureSource = null;
    data.figureUrls = [];
    data.figureDims = [];
    data.figureSourceMm = [];
    data.choiceFigureIndex = [];

    // 원장을 먼저 쓴다 — 아래 두 쓰기 중간에 죽어도 「무엇을 했나」가 남는다.
    // 새 행의 id 는 아직 모르므로 **우리가 정해서** 넣는다(uuid 는 우리가 만들 수 있다).
    const newId = randomUUID();
    data.id = newId;

    const first = byOrigin.get(t.id);
    const row: LedgerRow = {
      originId: t.id,
      originCode: t.problemCode,
      familyKey: String(t.familyKey),
      unitId: t.unitId,
      before: first
        ? first.before
        : {
            directUseAllowed: t.directUseAllowed,
            answerCount: chooseAllAnswerCount(t.answer),
            answer: t.answer,
          },
      after: { directUseAllowed: false },
      createdId: newId,
      createdCode: "(미정 — 트리거가 준다)",
      createdAnswer: m.answer,
      createdExternalId: m.externalId,
    };
    byOrigin.set(t.id, row);
    saveLedger({ ...led, rows: [...byOrigin.values()] }, prevCount);

    // exam-wiring: 기출아님 — 우리 중등 엔진이 낸 **자작** 문항이다(`source=manual`).
    // 원본도 같은 엔진 산출물이라 시험지(`Exam`)가 아예 없다 — 세울 편도, 되돌릴
    // `exam_question` 링크도 없다. `source`·`exam_id` 는 원본에서 그대로 물려받는다.
    const created = await prisma.problem.create({
      data: data as never,
      select: { id: true, problemCode: true },
    });
    // 원본은 **출제에서만** 뺀다 (지우지 않는다 — 머리말 참조).
    await prisma.problem.update({
      where: { id: t.id },
      data: { directUseAllowed: false },
    });
    row.createdCode = created.problemCode;
    saveLedger({ ...led, rows: [...byOrigin.values()] }, prevCount);
    console.log(
      `  ${t.problemCode} (출제에서 뺌) → 재생성본 ${created.problemCode} «${m.answer}»`,
    );
  }
  saveLedger(
    {
      runs: [
        ...led.runs,
        { at: new Date().toISOString(), min: MIN, count: made.length },
      ],
      rows: [...byOrigin.values()],
    },
    prevCount,
  );
  console.log(`\n원장 ${LEDGER}`);

  // ── 7. 되읽어 확인한다 ────────────────────────────────────────────
  // **이번 회차에 손댄 행만** 되읽는다 — 앞 회차 행까지 넣으면 그 사이 남이 바꾼
  // 것 때문에 이번 회차 판정이 흔들린다.
  const thisRun = made.map((m) => byOrigin.get(m.target.id)!);
  await verify(thisRun);
}

async function verify(rows: LedgerRow[]): Promise<void> {
  const created = await prisma.problem.findMany({
    where: { id: { in: rows.map((r) => r.createdId) } },
    select: {
      id: true,
      problemCode: true,
      content: true,
      answer: true,
      source: true,
      school: true,
      examId: true,
      questionNumber: true,
      originProblemId: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
      familyKey: true,
      unitId: true,
    },
  });
  const origins = await prisma.problem.findMany({
    where: { id: { in: rows.map((r) => r.originId) } },
    select: {
      id: true,
      problemCode: true,
      directUseAllowed: true,
      source: true,
      school: true,
      examId: true,
      questionNumber: true,
    },
  });
  const originById = new Map(origins.map((o) => [o.id, o]));

  if (created.length !== rows.length || origins.length !== rows.length) {
    throw new Error(
      `되읽은 행이 재생성본 ${created.length} · 원본 ${origins.length} / ${rows.length} 다 — 멈춘다`,
    );
  }
  const bad: string[] = [];
  for (const c of created) {
    const row = rows.find((r) => r.createdId === c.id)!;
    const o = originById.get(row.originId)!;
    if (chooseAllAnswerCount(c.answer) !== CHOOSE_ALL_ANSWER_COUNT)
      bad.push(`${c.problemCode} 정답이 «${c.answer}»`);
    if (!isChooseAll(c.content))
      bad.push(`${c.problemCode} 「모두 고르시오」가 아니다`);
    if (c.originProblemId !== row.originId)
      bad.push(`${c.problemCode} 원본 링크가 안 붙었다`);
    // ⑵ 출처 라벨 — 원본과 **같아야** 한다.
    if (
      c.source !== o.source ||
      c.school !== o.school ||
      c.examId !== o.examId ||
      c.questionNumber !== o.questionNumber
    )
      bad.push(`${c.problemCode} 출처 라벨이 원본과 다르다`);
    if (
      c.pool !== "shared" ||
      c.reviewStatus !== "approved" ||
      !c.directUseAllowed
    )
      bad.push(`${c.problemCode} 앱이 볼 수 없는 상태다`);
    if (o.directUseAllowed)
      bad.push(`${o.problemCode} 원본이 아직 출제 풀에 있다`);
  }
  if (bad.length > 0) {
    console.log(`\n🔴 ${bad.length}건이 요청한 상태가 **아니다** — 되돌려라.`);
    for (const b of bad) console.log(`   · ${b}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n✅ 재생성본 ${created.length}건 — 정답 ${CHOOSE_ALL_ANSWER_COUNT}개 · 출처 라벨 원본과 동일 · 원본 링크 있음 · 앱이 볼 수 있다` +
      `\n✅ 원본 ${origins.length}건 — 출제 풀에서 빠졌고 **행과 문항 코드는 살아 있다**`,
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * D-20 — 무엇을 잃는가
 * ──────────────────────────────────────────────────────────────────────── */

async function reportLoss(targets: Row[]): Promise<void> {
  const unitIds = [...new Set(targets.map((t) => t.unitId))];
  const units = await prisma.unit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const name = new Map(
    units.map((u) => [u.id, `${u.grade} ${u.chapter} > ${u.section}`]),
  );

  const pool = new Map<string, number>();
  for (const id of unitIds) {
    pool.set(
      id,
      await prisma.problem.count({
        where: {
          unitId: id,
          pool: "shared",
          reviewStatus: "approved",
          directUseAllowed: true,
        },
      }),
    );
  }
  const lose = new Map<string, number>();
  for (const t of targets) lose.set(t.unitId, (lose.get(t.unitId) ?? 0) + 1);

  const rows = unitIds.map((id) => {
    const p = pool.get(id) ?? 0;
    const n = lose.get(id) ?? 0;
    return { id, n, pool: p, mid: p - n, after: p, name: name.get(id) ?? id };
  });
  rows.sort((a, b) => b.n - a.n || a.mid - b.mid);
  const underDaily = rows.filter((r) => r.mid < DAILY);
  const underReview = rows.filter((r) => r.mid < REVIEW);

  console.log(`\n  [D-20 — 무엇을 잃는가]`);
  console.log(
    `     영향받는 단원                              ${rows.length}개`,
  );
  console.log(
    `     일일테스트 정원(${DAILY}) 아래로 내려가는 단원        ${underDaily.length}개`,
  );
  console.log(
    `     확인테스트 정원(${REVIEW}) 아래로 내려가는 단원       ${underReview.length}개`,
  );
  console.log(
    `\n  ⚠️ «중간»은 원본을 뺀 시점, «최종»은 재생성본을 넣은 뒤다. 이 작업은` +
      `\n     한 건을 빼고 한 건을 넣으므로 **단원 문항 수는 제자리로 돌아온다.**` +
      `\n     그래도 중간을 적는다 — 「아무것도 안 잃는다」로 읽히면 안 된다.`,
  );
  console.log(`\n  | 단원 | 지금 풀 | 다시 만들 것 | 중간 | 최종 |`);
  console.log(`  | --- | ---: | ---: | ---: | ---: |`);
  for (const r of rows)
    console.log(`  | ${r.name} | ${r.pool} | ${r.n} | ${r.mid} | ${r.after} |`);
  if (underReview.length) {
    console.log(`\n  ⚠️ 중간에 정원 아래로 내려가는 단원`);
    for (const r of underReview)
      console.log(`     ${r.name} — ${r.pool} → ${r.mid} (최종 ${r.after})`);
  }

  // 난이도 칸별 — 출제는 난이도로 배분하므로 **칸이 옮겨지면** 그것도 손실이다.
  const byTier = new Map<string, number>();
  for (const t of targets)
    byTier.set(t.difficulty, (byTier.get(t.difficulty) ?? 0) + 1);
  console.log(
    `\n  난이도 칸: ` +
      [...byTier.entries()].map(([d, n]) => `${d} ${n}건`).join(" · ") +
      `  (재생성본이 다른 칸에 앉으면 위 «대체 문항» 목록에 ⚠️ 로 찍힌다)`,
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * 되돌리기
 * ──────────────────────────────────────────────────────────────────────── */

async function revert() {
  if (process.env.ALLOW_SHARED_IMPORT !== "1") {
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  }
  const led = readLedger();
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  let done = 0;
  let skipped = 0;
  for (const r of led.rows) {
    // 🔴 **지금 값이 자기가 쓴 값일 때만** 되돌린다.
    //    `direct_use_allowed` 는 그림 유실 잠금·보기그림 잠금도 쓰는 컬럼이다
    //    (2026-08-18) — 남이 그 사이 잠갔으면 우리가 풀면 안 된다.
    const origin = await prisma.problem.findUnique({
      where: { id: r.originId },
      select: { id: true, directUseAllowed: true, problemCode: true },
    });
    const created = await prisma.problem.findUnique({
      where: { id: r.createdId },
      select: { id: true, problemCode: true, originProblemId: true },
    });
    const verdict = shouldRevert(r, origin, created);
    if (!verdict.ok) {
      console.log(`  건너뜀 ${r.originCode} — ${verdict.why}`);
      skipped += 1;
      continue;
    }
    if (created) await prisma.problem.delete({ where: { id: r.createdId } });
    await prisma.problem.update({
      where: { id: r.originId },
      data: { directUseAllowed: r.before.directUseAllowed },
    });
    done += 1;
  }
  console.log(`되돌림 ${done} · 건너뜀 ${skipped} / ${led.rows.length}`);
  if (done + skipped !== led.rows.length) {
    throw new Error("분모가 안 맞는다 — 멈춘다");
  }
  // 🔴 **빈 문항류는 안 지운다** — 원본이 그 무리에 그대로 남아 있다.
  console.log(
    `되돌린 뒤에도 재생성본이 쓴 문항 코드는 **다시 안 나온다**(next_seq 는 안 돌아간다).`,
  );
}

if (process.argv[1]?.includes("apply-choose-all-fix"))
  main()
    .catch((e) => {
      console.error(`\n🔴 ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
