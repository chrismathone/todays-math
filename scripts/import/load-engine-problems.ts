/**
 * **엔진이 낸 문항을 공유 DB 에 적재한다** — 초등 4단(D-71/72) · 중등 873유형 · 결합형 · 판정형.
 *
 * 계획의 target 은 `engine` 으로 갈린다 — `elem` · `middle` · `combo` · `judge`(`buildTargetRows` 한 곳).
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinition,
} from "../../src/lib/engine/nativeDescriptive20261018";

import { expandFamily } from "../../src/lib/engine/expandEngine";
import { reinforcementForms20261018 } from "../../src/lib/elementary/reinforcementForms20261018";
import { M3_REINFORCEMENT_20261018 } from "../../src/lib/middle/m3Reinforcement20261018";
import {
  dedupeByVariant,
  distinctKey,
  occupiesPoolSlot,
} from "../../src/lib/engine/variants";
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
import {
  generateMiddleComboProblem,
  middleComboDefinitions,
} from "../../src/lib/middle/combo";
import {
  judgeExternalId,
  judgeFamilyKey,
} from "../../src/lib/middle/judge/contract";
import {
  defaultJudgeRegistry,
  type JudgeRegistry,
} from "../../src/lib/middle/judge/registry";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
// 판정 규칙은 관문 판정기가 유일한 자리다 — 옮겨 적지 않는다.
import { deadBackslashHits } from "../qa/probe-middle-raw-latex";
// 「그림이 없는데 발문이 가리키나」도 마찬가지다 — 규칙은 `figurelessRow` 한 곳이고
// 잠그는 쪽(`scripts/qa/lockFigurelessLoadedRows.ts`)이 **같은 함수**를 부른다.
import { figurelessPointer } from "../../src/lib/engine/figurelessRow";
import {
  assertSourceReferencesRetained,
  engineProvenanceSelect,
  engineSourceReviewState,
  matchesEngineImportReadback,
  parseEngineSourceReferences,
  resolveEngineSourceReferences,
  type EngineSourceReference,
  type ExpectedEngineImport,
} from "./engine-source-references";

// 관리용 스크립트는 **자기 클라이언트**를 쓴다 — `src/lib/db` 의 바깥벽 확장은
// 읽기를 `pool='shared'` 로 좁혀서, 「내가 넣은 행이 정말 shared 인가」를 물을 때
// 답이 언제나 «그렇다»가 되어 버린다(동어반복).
// Pure generation/verified planning must not construct an env-aware DB client on import.
let prisma: PrismaClient | undefined;
function engineImportPrisma(): PrismaClient {
  return (prisma ??= new PrismaClient());
}

const REPO = path.resolve(__dirname, "..", "..");
const LEDGER_DIR = path.join(REPO, "docs", "planning", "tracks", "reports");

type Tier = ElemTier;

type ElemTarget = {
  engine: "elem";
  grade: string;
  chapter: string;
  /** 비우면 그 단원의 소단원 전부 */
  sections?: string[];
  /** Opt-in exact forms; omitted preserves historical plans. Empty/duplicate/unknown fails. */
  formIds?: string[];
  /** 갈래별로 몇 개씩 (기본 2) */
  perTier?: number;
  /**
   * 🔴 **안 쓴다** — 선언만 있고 이 파일 어디서도 안 읽는다.
   * 적재는 `generateElementaryForm`(문형)을 부르고 갈래를 안 돈다 — 그래서
   * 「갈래도 적재된다」로 읽히면 **거짓말**이다(2026-08-31 리드 델타 §3-㉢).
   * 갈래를 적재하게 되면 그때 **쓰는 쪽을 같이** 만들 것.
   */
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
  /** Opt-in exact types; cannot be combined with maxTypes. */
  typeKeys?: string[];
};

/**
 * 🔴 **결합형** — `registeredTypes()` **밖**이라 `MiddleTarget` 으로는 못 부른다.
 *
 * 원장님이 승인하신 문형 여섯(D-109/D-110)이 엔진에만 살고 지면에 한 건도 안
 * 나가고 있었다. 부르는 곳이 **시험뿐**이었기 때문이다 —
 * `checkUnloadedTypes` 가 「결합형은 `registeredTypes()` 밖이다. 안 세면
 * 구조적으로 0이다」라고 적어 두고 6자리를 빚으로 들고 있었다.
 *
 * ⚠️ `externalId` 에 **`comboId` 를 그대로 싣는다** — 그 검사기가
 *    `externalId.includes(d.id)` 로 「나갔나」를 묻기 때문이다. 다른 모양으로
 *    적으면 넣고도 **빚이 안 줄어든다**(그리고 아무 에러도 안 난다).
 */
type ComboTarget = {
  engine: "combo";
  /** 비우면 등록된 결합형 전부 */
  ids?: string[];
  /** 결합형마다 몇 벌 (기본 3) */
  variants?: number;
};

/**
 * 🔴 **판정형** — «다음 중 계산이 옳지 않은 것은?» (2026-10-08 엔진 보강 · `src/lib/middle/judge/`).
 * RPM 등록부에도 결합형에도 없다 — 그래서 target 이 따로다. 결합형이 «시험에서만 생성되던» 자리를
 * 다시 만들지 않으려고 등록부 · 미적재 검사 · 제자리 갱신을 처음부터 이 target 하나에 묶는다.
 *
 * ⚠️ `externalId` 는 `judgeExternalId` 로만 짓는다 — 미적재 검사가 `parseJudgeExternalId` 로 **정확히**
 *    읽는다(같은 파일의 짝). 여기서 모양을 따로 적으면 넣고도 빚이 안 줄어든다.
 */
type JudgeTarget = {
  engine: "judge";
  /** 비우면 등록된 판정형 전부 */
  keys?: string[];
  /** 판정형마다 몇 벌 (기본 3) */
  variants?: number;
};

export type NativeDescriptiveTarget = {
  engine: "native-descriptive";
  definitionIds: string[];
  variants?: number;
};
export type Target =
  | ElemTarget
  | MiddleTarget
  | ComboTarget
  | JudgeTarget
  | NativeDescriptiveTarget;

export type Plan = {
  label: string;
  seedBase?: number;
  targets: Target[];
  /** Explicit original IDs only; a unit/family match never assigns a source. */
  sourceReferences?: EngineSourceReference[];
};

export type Row = {
  externalId: string;
  /**
   * **이 문항이 어느 문항류인가** (D-105). 같은 키 = 코드의 같은 `A01` 자리 =
   * 숫자만 바꾼 아류. DB 트리거가 이 값으로 `-001`, `-002` 를 이어 준다.
   */
  familyKey: string;
  /**
   * **한 변형의 두 형식을 묶는 값** (2026-09-01). 단답형과 객관식은 같은 발문에서
   * 파생한 «한 문항»이다. 아래 중복 제거가 이 값으로 둘을 **같이** 버리거나
   * 같이 남긴다.
   *
   * 🔴 없앴을 때 무슨 일이 났나 — 중복 열쇠가 **파생 뒤의 글자**를 봤다.
   *    객관식 본문에는 무작위 오답이 붙어 있어서 다른 문항류의 같은 문항과
   *    **안 겹친다.** 그래서 단답형만 「중복」으로 버려지고 객관식은 살아남아,
   *    가드가 막으려던 바로 그 모양(같은 문항이 다른 번호를 받음)이 됐다.
   *    실측 초등 문항류 **35개 · 짝 없는 객관식 41행**.
   */
  variantKey: string;
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
  심화하: "활용",
  // 심화 셋은 전부 「활용」이다 — 이 컬럼은 «무엇을 묻나»이지 «얼마나 어렵나»가
  // 아니다. 어려움은 `difficulty` 가 이미 들고 있으므로 여기서 또 가르면 두 벌이 된다.
  심화중: "활용",
  심화상: "활용",
};

// ────────────────────────────── 생성 ──────────────────────────────

/** The opt-in selector must name every key exactly once. Never silently broaden a bad list. */
export function exactSelection<T>(
  items: readonly T[],
  keys: unknown,
  keyOf: (item: T) => string,
): T[] {
  if (
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.some((k) => typeof k !== "string" || !k.trim()) ||
    new Set(keys).size !== keys.length
  )
    throw new Error(
      "Exact selector must be a nonempty list without missing/duplicate keys",
    );
  const known = new Set(items.map(keyOf));
  const unknown = keys.filter((k) => !known.has(k));
  if (unknown.length)
    throw new Error(`Unknown exact selector keys: ${unknown.join(", ")}`);
  const want = new Set(keys);
  return items.filter((item) => want.has(keyOf(item)));
}

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
    const forms = Object.prototype.hasOwnProperty.call(t, "formIds")
      ? exactSelection(listedForms(unit), t.formIds, (f) => f.id)
      : listedForms(unit);
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
        { allowShort: true, allowMultipleChoice: form.allowMultipleChoice },
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
          variantKey: `elem:${unit.grade}|${unit.section}|f${form.id}|s${it.seed}`,
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
  if (Object.prototype.hasOwnProperty.call(t, "typeKeys")) {
    if (Object.prototype.hasOwnProperty.call(t, "maxTypes"))
      throw new Error("Exact typeKeys and maxTypes cannot be combined");
    types = exactSelection(types, t.typeKeys, (entry) => entry.key);
  } else if (t.maxTypes) types = types.slice(0, t.maxTypes);
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
        ...(p.distractors === undefined ? {} : { distractors: p.distractors }),
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
        variantKey: `mid:${entry.key}|s${seedBase}|v${it.variant}`,
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

/**
 * 결합형을 행으로 — `generateMiddleComboProblem` 을 **적재기가 처음 부른다**.
 *
 * 형식 3종 파생은 초등·중등과 **같은 `expandFamily`** 를 쓴다. 규칙이 두 벌이
 * 되면 한쪽만 고쳐도 아무도 모른다.
 *
 * ⚠️ 결합형에는 `figureSpec` 이 없다(`MidComboProblem` 에 그 필드가 없다).
 *    나중에 생기면 여기도 같이 고쳐야 한다 — 안 그러면 그림이 조용히 안 나간다.
 */
export function buildComboRows(t: ComboTarget, seedBase: number): Row[] {
  const defs = middleComboDefinitions();
  const want = t.ids ? new Set(t.ids) : null;
  const picked = want ? defs.filter((d) => want.has(d.id)) : defs;
  if (picked.length === 0)
    throw new Error(
      `결합형을 못 찾았다: ${JSON.stringify(t.ids)}` +
        ` — middleComboDefinitions() 로 id 를 확인하라`,
    );
  if (want && picked.length !== want.size)
    throw new Error(
      `결합형 ${want.size}개를 물었는데 ${picked.length}개만 찾았다 — 멈춘다`,
    );
  const variants = t.variants ?? 3;
  const rows: Row[] = [];
  for (const def of picked) {
    const familyKey = `mid:${def.id}`;
    const got = expandFamily((v) => {
      const p = generateMiddleComboProblem(def.id, seedBase, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        problemType:
          p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
        difficulty: p.difficulty,
        variant: v,
      };
    }, variants);
    midSkippedMcq += got.skippedMcq;
    for (const item of got.items) {
      const it = item as typeof item & {
        difficulty: Difficulty;
        problemType: string;
        variant: number;
      };
      rows.push({
        // 🔴 `comboId` 를 그대로 싣는다 — `checkUnloadedTypes` 가
        //    `externalId.includes(id)` 로 「나갔나」를 묻는다.
        externalId: `engine-mid-combo:${def.id}|s${seedBase}|v${it.variant}|${it.questionType}`,
        variantKey: `mid-combo:${def.id}|s${seedBase}|v${it.variant}`,
        familyKey,
        unitKey: `${def.anchorGrade} / ${def.anchorSection}`,
        grade: def.anchorGrade,
        section: def.anchorSection,
        content: it.content,
        answer: it.answer,
        solution: it.solution,
        difficulty: it.difficulty,
        problemType: it.problemType,
        questionType: it.questionType,
        figureSpec: null,
        origin: `중등 결합형 ${def.id}`,
      });
    }
  }
  return rows;
}

/**
 * 판정형을 행으로 — `src/lib/middle/judge/` 의 등록부를 **적재기가 부르는 자리**.
 *
 * 등록부가 이미 객관식(보기 ①~⑤ · 번호 정답)을 낸다. `expandFamily` 는 그런 발문을 파생하지 않고
 * 그대로 객관식으로 내므로(«이미 객관식인 발문은 파생하지 않는다») 형식은 객관식 하나다.
 * 중복 제거 · 변형 공간 검사는 초등 · 중등 · 결합형과 **같은 `expandFamily`** 를 탄다.
 *
 * `registry` 는 시험이 픽스처 등록부를 넣으려고 연 자리다 — 기본은 살아 있는 등록부.
 */
export function buildJudgeRows(
  t: JudgeTarget,
  seedBase: number,
  registry: JudgeRegistry = defaultJudgeRegistry(),
): Row[] {
  const defs = registry.definitions();
  const want = t.keys ? new Set(t.keys) : null;
  const picked = want ? defs.filter((d) => want.has(d.key)) : defs;
  if (picked.length === 0)
    throw new Error(
      `판정형을 못 찾았다: ${t.keys ? JSON.stringify(t.keys) : "(등록된 것 전부 — 0개)"}` +
        ` — judgementDefinitions() 로 키를 확인하라`,
    );
  if (want && picked.length !== want.size)
    throw new Error(
      `판정형 ${want.size}개를 물었는데 ${picked.length}개만 찾았다 — 멈춘다`,
    );
  const variants = t.variants ?? 3;
  const rows: Row[] = [];
  for (const def of picked) {
    const familyKey = judgeFamilyKey(def.key);
    const got = expandFamily((v) => {
      const p = registry.generate(def.key, seedBase, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        // 중등 유형과 같은 어림이다 — 밑 두 칸은 계산, 위는 활용(`buildMiddleRows`).
        problemType:
          p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
        difficulty: p.difficulty,
        variant: v,
      };
    }, variants);
    midSkippedMcq += got.skippedMcq;
    for (const item of got.items) {
      const it = item as typeof item & {
        difficulty: Difficulty;
        variant: number;
      };
      rows.push({
        externalId: judgeExternalId({
          judgeKey: def.key,
          ruleVersion: def.ruleVersion,
          seed: seedBase,
          variant: it.variant,
          questionType: it.questionType,
        }),
        variantKey: `mid-judge:${def.key}|r${def.ruleVersion}|s${seedBase}|v${it.variant}`,
        familyKey,
        unitKey: `${def.grade} / ${def.unitSection}`,
        grade: def.grade,
        section: def.unitSection,
        content: it.content,
        answer: it.answer,
        solution: it.solution,
        difficulty: it.difficulty,
        problemType: it.problemType,
        questionType: it.questionType,
        figureSpec: null,
        origin: `중등 판정형 ${def.key} r${def.ruleVersion}`,
      });
    }
  }
  return rows;
}

/**
 * 🔴 **계획의 target 하나 → 행.** 적재기와 제자리 갱신(`scripts/qa/refresh-engine-content.ts`)이 **이 함수 하나**를 부른다.
 *
 * 종전에는 두 파일이 저마다 `elem ? … : combo ? … : buildMiddleRows` 를 적었다 — 모르는 target 이
 * **중등 유형으로 흘러가** «중등 유형을 못 찾았다»로 죽거나, 그 모양이 우연히 맞으면 엉뚱한 행을 냈다.
 * 판정형을 더하며 한 곳으로 모으고, 모르는 것은 던진다.
 */
export function buildTargetRows(
  t: Target,
  seedBase: number,
  deps: { judges?: JudgeRegistry } = {},
): Row[] {
  switch (t.engine) {
    case "elem":
      return buildElemRows(t, seedBase);
    case "middle":
      return buildMiddleRows(t, seedBase);
    case "combo":
      return buildComboRows(t, seedBase);
    case "judge":
      return buildJudgeRows(t, seedBase, deps.judges);
    case "native-descriptive":
      return buildNativeDescriptiveRows(t, seedBase);
    default: {
      const unknown: never = t;
      throw new Error(
        `모르는 적재 대상이다: ${JSON.stringify(unknown).slice(0, 120)}` +
          ` — engine 은 elem · middle · combo · judge · native-descriptive 이다`,
      );
    }
  }
}

export function buildNativeDescriptiveRows(
  t: NativeDescriptiveTarget,
  seedBase: number,
): Row[] {
  // Required even for a single definition. Unknown/missing keys fail before any row is returned.
  const ids = exactSelection(
    t.definitionIds ?? [],
    t.definitionIds,
    (id) => id,
  );
  const defs = ids.map(nativeDescriptiveDefinition);
  const variants = t.variants ?? 2;
  if (!Number.isSafeInteger(variants) || variants < 1 || variants > 100)
    throw new Error("Native variants must be an integer in 1..100");
  return defs.flatMap((d) =>
    Array.from({ length: variants }, (_, variant) => {
      const p = generateNativeDescriptive(d.definitionId, seedBase, variant);
      return {
        externalId: p.externalId,
        variantKey: p.externalId,
        familyKey: p.familyKey,
        unitKey: `${d.grade} / ${d.chapter} / ${d.unitSection}`,
        grade: d.grade,
        chapter: d.chapter,
        section: d.unitSection,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        difficulty: d.difficulty,
        problemType: p.problemType,
        questionType: p.questionType,
        figureSpec: null,
        origin: `본래 서술형 ${d.definitionId}`,
      };
    }),
  );
}

/** 중등에서 객관식을 못 만들어 건너뛴 수 — 계획 보고에 찍는다. */
let midSkippedMcq = 0;

// ────────────────────────────── 그림 ──────────────────────────────

/** 한 스펙을 그린 결과 — **뺀 치수 이름을 함께** 들고 온다. */
type FigureDraw = { svg: string; dropped: readonly string[] };

/**
 * FigureSpec → SVG. **제품 함수를 그대로 부른다.**
 *
 * 🔴 종전에는 이 자리가 `spawnSync` 한 번이었다 — 재시도도, 치수 떨어뜨림도,
 *    시간 제한도 없었다. 그래서 제품 지면에는 나오는 그림이 **적재본에만 없었다**
 *    (2026-09-02 실측: 그림 없이 들어간 214행 · 서로 다른 스펙 54개 중 맨손 54/54
 *    실패, 제품 함수 51/54 성공). 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이
 *    쓰게 하라」(2026-08-18).
 *
 * ⚠️ 제품 함수는 자리가 없는 치수를 **빼고** 다시 그린다. 조용히 빠지면 「달았다」가
 *    거짓말이 되므로 이름을 그대로 올려 보내 부르는 쪽이 세어 찍게 한다.
 */
async function renderFigure(
  spec: Record<string, unknown>,
): Promise<FigureDraw | null> {
  const res = await renderFigureSpec(spec);
  if (res.ok) return { svg: res.svg, dropped: res.droppedDimensions ?? [] };
  console.log(`   ⚠️ 그림 실패: ${res.error}`);
  return null;
}

// ────────────────────────────── 원장 ──────────────────────────────

type LedgerRow = {
  externalId: string;
  problemId: string;
  origin: string;
  unitKey: string;
  /** Optional for compatibility with historical ledgers. */
  originProblemId?: string;
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

type EngineImportClient = {
  unit: Pick<PrismaClient["unit"], "findMany">;
  problem: Pick<PrismaClient["problem"], "findMany" | "create">;
};

/** New reviewed families must never acquire arbitrary seeds through historical bulk plans. */
export function assertLegacyEngineWriteAllowed(
  rows: readonly Pick<Row, "familyKey">[],
  doApply: boolean,
): void {
  if (!doApply) return;
  const protectedFamilies = new Set([
    ...elementaryUnits().flatMap((unit) =>
      reinforcementForms20261018(unit).map(
        (form) => `elem:${unit.grade}|${unit.section}|${form.id}`,
      ),
    ),
    ...M3_REINFORCEMENT_20261018.map((type) => `mid:${type.key}`),
  ]);
  if (
    rows.some(
      (row) =>
        row.familyKey.startsWith("native-desc:") ||
        protectedFamilies.has(row.familyKey),
    )
  )
    throw new Error(
      "2026-10-18 reinforcement writes require verified-engine-batch and final batch approval",
    );
}

export async function applyEnginePlan(
  planFile: string,
  doApply: boolean,
  client?: EngineImportClient,
) {
  const plan = JSON.parse(readFileSync(planFile, "utf-8")) as Plan;
  if (doApply && plan.targets.some((t) => t.engine === "native-descriptive"))
    throw new Error(
      "Native descriptive writes require verified-engine-batch and final batch approval",
    );
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
    const made = buildTargetRows(t, seedBase);
    console.log(
      `   · ${
        t.engine === "elem"
          ? `${t.grade} ${t.chapter}`
          : t.engine === "combo"
            ? `결합형 ${(t.ids ?? middleComboDefinitions().map((d) => d.id)).length}개`
            : t.engine === "judge"
              ? `판정형 ${new Set(made.map((r) => r.familyKey)).size}개`
              : t.engine === "native-descriptive"
                ? `본래 서술형 ${t.definitionIds.length}개`
                : `${t.grade} ${t.unitSection}`
      } → ${made.length}문항`,
    );
    rows.push(...made);
  }
  console.log(`\n생성 ${rows.length}문항`);
  assertLegacyEngineWriteAllowed(rows, doApply);
  // Validate against the complete generation result, before either deduper.
  const sourceReferences = parseEngineSourceReferences(
    plan.sourceReferences,
    rows,
  );

  // ── 🔴 **같은 문항이 다른 번호를 받는 것**을 여기서 막는다 ────────────────────
  // 원장님 2026-08-25: 「같은 문제가 사실상 생성되었는데 문제번호가 다름」.
  // 변형 두 벌(v0·v1)이 **같은 수를 뽑는 일**이 실제로 있다 — 뽑을 수 있는 값이
  // 적은 유형에서 그렇다. 그때 두 행은 본문·정답이 글자까지 같은데 코드만 다르다.
  //
  // 열쇠는 **본문 + 정답 + 그림**이다. 본문만 보면 「답이 여럿인 문항」을 한 건으로
  // 뭉개고, 정답만 보면 다른 문항이 우연히 같은 답을 낸 것을 지운다.
  //
  // 🔴 **그림이 열쇠에 들어간다** (2026-09-01). 종전에는 `본문+정답` 뿐이었다.
  //    그런데 변형을 고르는 `collectDistinctVariants` 는 2026-08-28 에 이미
  //    그림을 열쇠에 넣었다 — **열쇠가 두 벌이었고 한쪽만 그림을 봤다.**
  //    그래서 앞에서 옳게 고른 「발문·정답은 같고 그림만 다른」 변형을 여기서
  //    다시 버렸다. 실측 초등 문항류 **16개**가 그 때문에 얕았다
  //    (「가, 나, 다 가운데 직각삼각형은 몇 개인가」 부류 — 그림이 매번 다른데
  //     개수를 묻는 발문과 답은 겹친다).
  //
  //    규칙을 옮겨 적지 않는다 — `distinctKey` 를 **그대로 부른다**.
  //
  // 🔴 **판정은 «변형» 단위다** (2026-09-01). 단답형과 객관식은 같은 발문에서
  //    파생한 «한 문항»이므로 **같이 버리거나 같이 남긴다.** 종전에는 행마다
  //    따로 판정했는데, 객관식 본문에는 **무작위 오답**이 붙어 있어 다른
  //    문항류의 같은 문항과 안 겹친다 — 그래서 단답형만 버려지고 객관식이
  //    살아남아, 이 가드가 막으려던 바로 그 모양이 됐다(실측 문항류 35개 ·
  //    짝 없는 객관식 41행). 그래서 판정은 **그 변형의 단답형 글자**로 한다.
  const rowKey = (r: Row) =>
    distinctKey({
      content: r.content.replace(/\s+/g, " ").trim(),
      answer: r.answer.replace(/\s+/g, " ").trim(),
      figureSpec: r.figureSpec,
    });
  const run = dedupeByVariant(rows, rowKey);
  const dropped = run.dropped.map(
    (d) => `${d.stem.origin} ← ${d.against} 과 같음`,
  );
  const unique = run.kept;
  assertSourceReferencesRetained(
    sourceReferences,
    unique.map((r) => r.externalId),
  );
  const droppedRows = rows.length - unique.length;
  if (dropped.length > 0) {
    console.log(
      `   ⚠️ 같은 문항 ${dropped.length}건을 뺐다 (본문+정답+그림이 같다)` +
        ` — 형식까지 세면 ${droppedRows}행`,
    );
    for (const d of dropped.slice(0, 5)) console.log(`      · ${d}`);
  }
  // 분모를 못 맞추면 멈춘다 — 조용히 줄면 「전부 넣었다」로 읽힌다.
  // ⚠️ `dropped` 는 **변형** 수이고 한 변형이 1~2행이다 — 행으로 견줘야 한다.
  if (unique.length + droppedRows !== rows.length)
    throw new Error("중복 제거에서 분모가 안 맞는다 — 멈춘다");
  if (dropped.length > 0 && droppedRows < dropped.length)
    throw new Error(
      `버린 변형 ${dropped.length}개보다 버린 행 ${droppedRows}이 적다 — 짝이 안 묶였다`,
    );
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
      `   ⚠️ 객관식을 만들지 않은 변형 ${elemSkippedMcq}건 (정답 형식 또는 문형의 객관식 파생 금지 정책) — 무작위 수로 안 채운다`,
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
  const db = client ?? engineImportPrisma();
  const units = await db.unit.findMany({
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

  // Existing IDs are immutable: a requested source must already match exactly.
  const existingRows = await db.problem.findMany({
    where: { externalId: { in: ready.map((r) => r.externalId) } },
    select: engineProvenanceSelect,
  });
  await resolveEngineSourceReferences(
    sourceReferences,
    ready,
    existingRows,
    (ids) =>
      db.problem.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          unitId: true,
          source: true,
          originProblemId: true,
          pool: true,
        },
      }),
  );
  const existing = new Set(existingRows.map((p) => p.externalId!));
  const fresh = ready.filter((r) => !existing.has(r.externalId));
  console.log(
    `단원 연결 ${ready.length} · 이미 있음 ${existing.size} · **넣을 것 ${fresh.length}**`,
  );
  if (ready.length !== fresh.length + existing.size)
    throw new Error("분모가 안 맞는다 — 멈춘다");

  // ── 그림을 **여기서** 그린다 — DB 대조가 그림을 봐야 하기 때문이다 ──────────
  //
  // 🔴 종전에는 이 렌더가 DB 대조 **뒤**, 그것도 `--apply` 일 때만 돌았다.
  //    그래서 아래 대조가 그림을 볼 수가 없었고, 드라이런의 「넣을 것」도
  //    그림 문항에서는 참이 아니었다. 이제 드라이런도 그림을 그린다 —
  //    느려지지만 **드라이런이 거짓말을 안 한다.** (`fresh` 는 이미
  //    `externalId` 로 걸러진 «새 행»뿐이라 재적재에서는 몇 건 안 된다.)
  let drawn = 0;
  let failed = 0;
  const svgs = new Map<string, string>();
  /**
   * 🔴 **같은 스펙을 두 번 그리지 않는다** (2026-09-02).
   *
   * 한 변형이 **단답형·객관식 두 행**이 되는데 그림 스펙은 같다. 행마다 그리면
   * 같은 그림을 두 번 그린다. 실측(중3 12벌) — 그림이 붙는 행 1,776개가 서로 다른
   * 스펙 **745개**뿐이었다(중복 **58.1%**).
   *
   * 이 중복이 그대로 시간이 되는 이유는 `renderFigure` 가 **문항마다 파이썬
   * 프로세스를 띄우기** 때문이다 — 실측 **319ms/회**(빈 파이썬만도 93ms).
   * 12벌 전량(넣을 것 60,268행)이면 그림 행이 약 13,000개라 **69분**이고,
   * 그동안 INSERT 는 **한 행도 시작하지 않는다**(렌더가 앞이다).
   *
   * ⚠️ 캐시가 옳으려면 렌더러가 **결정적**이어야 한다 — 같은 스펙을 두 번 그려
   *    **바이트가 같은 것을 확인**했다(표본 4/4). 스펙이 같은데 다른 그림이 나오는
   *    날이 오면 이 캐시가 조용히 틀린 그림을 붙인다. `render_spec.py` 에 무작위를
   *    넣게 되면 **여기부터** 고쳐야 한다.
   *
   * 🔵 남은 병목: 렌더러가 `stdin→stdout` **한 장** 구조라 배치 입력이 없다.
   *    JSONL 배치 모드를 주면 파이썬 기동 93ms 를 스펙 수만큼이 아니라 **한 번**만 낸다.
   */
  const bySpec = new Map<string, FigureDraw | null>();
  /** 놓을 자리가 없어 **떨어뜨린** 치수 — 이름마다 몇 장인가. */
  const droppedDims = new Map<string, number>();
  /** ⚠️ 이름을 `droppedRows` 로 두면 위(중복 제거 건수)와 부딪힌다 — 뜻이 다르다. */
  let dimDroppedFigures = 0;
  for (const r of fresh) {
    if (!r.figureSpec) continue;
    const key = JSON.stringify(r.figureSpec);
    let drawing = bySpec.get(key);
    if (drawing === undefined) {
      drawing = await renderFigure(r.figureSpec);
      bySpec.set(key, drawing);
    }
    if (drawing) {
      svgs.set(r.externalId, drawing.svg);
      drawn += 1;
      if (drawing.dropped.length > 0) {
        dimDroppedFigures += 1;
        for (const d of drawing.dropped)
          droppedDims.set(d, (droppedDims.get(d) ?? 0) + 1);
      }
    } else failed += 1;
  }
  if (drawn + failed > 0)
    console.log(
      `그림 ${drawn}장 그림 · 실패 ${failed}` +
        ` · 렌더 호출 ${bySpec.size}회 (같은 스펙 ${drawn + failed - bySpec.size}건은 다시 안 그렸다)`,
    );
  // 🔴 **조용히 빼지 않는다.** 자리가 없어 떨어뜨린 치수를 세어 찍는다 — 안 찍으면
  //    「치수가 사라진 그림」이 멀쩡해 보이는 오답으로 들어간다(2026-08-30).
  if (dimDroppedFigures > 0)
    console.log(
      `   ⚠️ 자리가 없어 **치수를 뺀 그림 ${dimDroppedFigures}장** — ` +
        [...droppedDims.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([n, c]) => `${n}×${c}`)
          .join(" · ") +
        `
      발문이 그 값을 말하지 않으면 못 푸는 문항이 된다. 확인할 것.`,
    );

  // ── **DB 에 이미 있는 같은 문항**도 막는다 ────────────────────────────────
  // 위의 중복 제거는 이번 회차 **안**만 본다. 다른 씨앗으로 다시 돌리면 같은 문항이
  // 또 나올 수 있고(뽑을 값이 적은 유형), 그러면 원장님이 지적하신 그 모양이 된다.
  // 대조 범위를 **같은 문항류**로 좁힌다 — 다른 유형끼리는 본문이 같을 수 없다.
  //
  // 🔴 **열쇠에 그림이 들어간다** (2026-09-01). 위 회차 안 중복 제거와 **같은
  //    이야기**다 — 그림만 다른 변형을 여기서 버리면 앞의 고침이 아무 소용이 없다.
  //    DB 에는 `figureSpec` 컬럼이 없고 `figureSvg` 만 있으므로, 새 행 쪽은
  //    방금 그린 SVG 로 견준다. 「그림까지 같다」와 「그림만 다르다」를 **따로
  //    세어 찍는다** — 뒤엣것이 이번 고침으로 되살아나는 몫이고, 조용하면
  //    다음 사람이 「원래 그만큼이었다」고 읽는다.
  const families = [...new Set(fresh.map((r) => r.familyKey))];
  const already = await db.problem.findMany({
    where: { familyKey: { in: families } },
    select: {
      familyKey: true,
      content: true,
      answer: true,
      problemCode: true,
      figureSvg: true,
      // 🔴 「이미 있다」는 «출제 풀에 이미 있다»여야 한다 — 이 둘을 안 읽으면
      //    잠긴 행이 자리를 차지해 **새 문항이 못 들어온다**(실측 단답형 41건).
      reviewStatus: true,
      directUseAllowed: true,
    },
  });
  const norm = (x: string) => x.replace(/\s+/g, " ").trim();
  // 🔴 **자리를 차지하는 것만** 「이미 있다」로 센다 (2026-09-01).
  //    종전에는 `familyKey` 로만 골라 **잠긴 행까지** 자리로 셌다. 초등에는
  //    2026-08-24 옛 형식 1,751행이 `directUseAllowed=false` 로 잠겨 있는데,
  //    새 단답형이 그 잠긴 행과 발문·정답이 같아 **버려졌다.** 객관식은 보기가
  //    붙어 열쇠가 달라 살아남았고 — 그래서 **짝 없는 객관식 41행**이 생기고
  //    그 짝인 **단답형 41건은 아예 못 들어왔다.** 풀은 그 문항을 한 벌도 못 가진다.
  //    판정은 `occupiesPoolSlot` 한 곳에 있다 — 옮겨 적지 마라.
  const occupying = already.filter(occupiesPoolSlot);
  const blocked = already.filter((p) => !occupiesPoolSlot(p));
  const keyOfDb = (p: (typeof already)[number]) =>
    `${norm(p.content)}||${norm(p.answer)}||${p.figureSvg ?? ""}`;
  const seenInDb = new Map<string, string>();
  for (const p of occupying) seenInDb.set(keyOfDb(p), p.problemCode);
  /** 잠겨서 자리를 안 내주는 행 — **조용히 넘기지 않고 세어 찍는다.** */
  const blockedKeys = new Map<string, string>();
  for (const p of blocked) blockedKeys.set(keyOfDb(p), p.problemCode);
  /** 그림을 뺀 옛 열쇠 — 「그림만 달라 살아남은 것」을 세려고 함께 둔다. */
  const seenInDbNoFig = new Set(
    occupying.map((p) => `${norm(p.content)}||${norm(p.answer)}`),
  );
  const beforeDbDedupe = fresh.length;
  let rescuedByFigure = 0;
  // 🔴 여기도 판정은 **변형** 단위다 — 위 회차 안 중복 제거와 같은 까닭이다.
  //    행마다 따로 물으면 객관식의 무작위 오답 때문에 짝이 갈린다.
  const dbRun = dedupeByVariant(
    fresh,
    (stem) =>
      `${norm(stem.content)}||${norm(stem.answer)}||${svgs.get(stem.externalId) ?? ""}`,
    (key) => seenInDb.get(key),
  );
  for (const d of dbRun.dropped)
    console.log(`   ⚠️ DB 에 이미 있다 (${d.against}): ${d.stem.origin}`);
  // 「그림이 달라 살아남은 것」은 **남은 변형**에서만 센다 (변형당 한 번).
  const keptStems = new Map<string, Row>();
  for (const r of dbRun.kept)
    if (r.questionType === "단답형" || !keptStems.has(r.variantKey))
      keptStems.set(r.variantKey, r);
  for (const [, stem] of keptStems)
    if (seenInDbNoFig.has(`${norm(stem.content)}||${norm(stem.answer)}`))
      rescuedByFigure += 1;
  const kept = dbRun.kept;
  assertSourceReferencesRetained(sourceReferences, [
    ...existing,
    ...kept.map((r) => r.externalId),
  ]);
  if (kept.length !== beforeDbDedupe)
    console.log(
      `   DB 중복 ${beforeDbDedupe - kept.length}건을 뺐다 · 남은 것 ${kept.length}`,
    );
  if (rescuedByFigure > 0)
    console.log(
      `   🟢 발문·정답은 같은데 **그림이 달라** 살린 것 ${rescuedByFigure}건` +
        ` — 옛 열쇠였으면 통째로 버려졌다.`,
    );
  // 🔴 **잠긴 행과 겹치는 것은 조용히 넘기지 않는다.** 그 행이 「일부러 잠근 것」이면
  //    같은 문항이 새 번호로 되살아나는 셈이라, 사람이 볼 수 있어야 한다.
  const 잠긴것과겹침 = [...keptStems.values()].filter((stem) =>
    blockedKeys.has(
      `${norm(stem.content)}||${norm(stem.answer)}||${svgs.get(stem.externalId) ?? ""}`,
    ),
  );
  if (잠긴것과겹침.length > 0) {
    console.log(
      `   🟢 **잠긴 행**(출제 못 함)과 같아서 살린 것 ${잠긴것과겹침.length}건` +
        ` — 종전에는 이것이 자리를 차지해 문항이 통째로 안 들어왔다.`,
    );
    for (const s of 잠긴것과겹침.slice(0, 5))
      console.log(
        `      ${s.origin} ← 잠긴 ${blockedKeys.get(
          `${norm(s.content)}||${norm(s.answer)}||${svgs.get(s.externalId) ?? ""}`,
        )}`,
      );
    if (잠긴것과겹침.length > 5)
      console.log(`      … 그리고 ${잠긴것과겹침.length - 5}건 더`);
  }
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

  for (const [externalId, originProblemId] of sourceReferences) {
    console.log(
      `   출처 참조 ${externalId} → ${originProblemId} · ` +
        (existing.has(externalId)
          ? "이미 있음 (출처 일치 · 변경 없음)"
          : "새 문항 pending · directUseAllowed=false (사람 검토 필요)"),
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

  /**
   * 🔴 **그림이 실패했는데 발문이 그림을 가리키면 출제허용으로 넣지 않는다.**
   *
   * 2026-09-04 실측 — `renderFigure` 가 스펙 2종에서 실패했고(「segment 'PQ' is too
   * short (9.33px)」), 그 4행이 **「그림과 같이 $\triangle ABC$에서…」**인 채로
   * `directUseAllowed: true` 로 들어갔다. 종이에 그림 없이 나가면 **못 푸는 문항**이다.
   *
   * 실패는 위에서 **세기만** 했다(`failed += 1`). 세는 것과 막는 것은 다른 일이다 —
   * 그 수를 아무도 안 보면 「4,852건 전부 출제허용」이라는 초록 줄만 남는다.
   *
   * ⚠️ 규칙을 여기서 짓지 않는다. 「가리키나」는 `pointsAtFigure` 한 곳이고,
   *    「그림이 있나」는 방금 렌더가 낸 값이다. 둘 다 **재는 것**이지 모형이 아니다.
   */
  let lockedFigureless = 0;
  const lockedSamples: string[] = [];
  /** 넣기를 **요청한** 값. 되읽기는 「전부 참인가」가 아니라 이것과 견준다. */
  const expected = new Map<string, ExpectedEngineImport>();

  for (const r of fresh) {
    const svg = svgs.get(r.externalId) ?? null;
    const pointer = figurelessPointer(svg !== null, r.content);
    const figureless = r.figureSpec !== null && pointer !== null;
    if (figureless) {
      lockedFigureless += 1;
      if (lockedSamples.length < 3)
        lockedSamples.push(`${r.externalId} — 「${pointer}」`);
    }
    // Referencing an original does not make this synthetic row an exam/book item.
    const originProblemId = sourceReferences.get(r.externalId) ?? null;
    const review = engineSourceReviewState(originProblemId, figureless);
    // exam-wiring: 기출아님 — 우리 엔진이 낸 **자작** 문항이다(`source=manual`).
    // 원본 시험지가 아예 없으므로 `Exam` 을 세울 것도, 되돌릴 링크도 없다.
    const made = await db.problem.create({
      data: {
        unitId: r.unitId,
        source: "manual", // 자작 — 우리 엔진이 낸 결정론적 문항이다 (AI 아님)
        originProblemId,
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
        ...review,
        pool: "shared",
        solutionSource: "none",
      },
      select: { id: true },
    });
    expected.set(made.id, {
      externalId: r.externalId,
      unitId: r.unitId,
      familyKey: r.familyKey,
      originProblemId,
      ...review,
    });
    created.push({
      externalId: r.externalId,
      problemId: made.id,
      origin: r.origin,
      unitKey: r.unitKey,
      ...(originProblemId ? { originProblemId } : {}),
    });
    if (created.length % FLUSH_EVERY === 0) flush();
  }

  flush();
  console.log(`적재 ${created.length}건 · 원장 ${ledgerFile}`);

  // 🔴 **믿지 않고 잰다** — 넣은 값 그대로인가. 트리거가 뒤집으면 여기서 잡힌다.
  const back = await db.problem.findMany({
    where: { id: { in: created.map((c) => c.problemId) } },
    select: {
      ...engineProvenanceSelect,
      id: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
    },
  });
  const bad = back.filter((p) => {
    const wanted = expected.get(p.id);
    return !wanted || !matchesEngineImportReadback(p, wanted);
  });
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
  const allowed = back.filter((p) => p.directUseAllowed).length;
  const pending = back.filter((p) => p.reviewStatus === "pending").length;
  console.log(
    `✅ ${back.length}건 전부 shared · 요청한 출처/엔진 식별자/검토 상태 그대로` +
      ` (approved ${back.length - pending} · pending ${pending} · 출제허용 ${allowed})`,
  );
  // 🔴 **말없는 상한을 만들지 않는다** — 잠근 것이 있으면 반드시 찍는다.
  if (lockedFigureless > 0) {
    console.log(
      `\n🔴 그림이 안 그려졌는데 **발문이 그림을 가리켜** 출제에서 뺀 것 ${lockedFigureless}건` +
        `\n   (그림 렌더 실패 자체는 위 「그림 실패」 줄에 있다. 여기 것은 그중` +
        ` **발문이 지면을 가리키는** 행이라 종이에서 못 푼다.)`,
    );
    for (const s of lockedSamples) console.log(`   · ${s}`);
    console.log(
      `   → 고치는 자리는 적재기가 아니라 **그 유형의 그림 스펙**이다.` +
        ` 고친 뒤 이 계획을 다시 돌리면 그림이 붙은 행으로 다시 들어온다.`,
    );
  }
}

async function revert(ledgerFile: string) {
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "공유 DB 쓰기는 기본 차단이다 — ALLOW_SHARED_IMPORT=1 (D-31)",
    );
  const led = readLedger(ledgerFile);
  console.log(`원장 ${led.rows.length}행 · 회차 ${led.runs.length}`);
  // 자기가 넣은 것만 지운다 — externalId 가 우리 접두사인지 한 번 더 본다.
  // ⚠️ 결합형(`engine-mid-combo:`)·판정형(`engine-mid-judge:`)도 이 적재기가 넣는다 — 종전 식
  //    `^engine-(elem|mid):` 는 그 둘을 «우리 것이 아니다»로 읽어 되돌리기를 통째로 멈췄다.
  const mine = led.rows.filter((r) =>
    /^engine-(?:elem|mid|mid-combo|mid-judge):/.test(r.externalId),
  );
  if (mine.length !== led.rows.length)
    throw new Error(
      `원장에 우리 것이 아닌 행이 ${led.rows.length - mine.length}건 있다 — 멈춘다`,
    );
  const prisma = engineImportPrisma();
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
  else if (planFile)
    await applyEnginePlan(planFile, process.argv.includes("--apply"));
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
    .finally(() => prisma?.$disconnect());
