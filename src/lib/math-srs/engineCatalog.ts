import {
  DIFFICULTY_LADDER,
  type Difficulty as EngineTier,
} from "@/contracts/difficulty";
import { createRng } from "../elementary/rng";
import { M1_BOOK1 } from "../middle/m1Book1";
import { M1_EXPR, M1_EXPR_SUP_B } from "../middle/m1Expr";
import { M1_LINEAR_APPLY } from "../middle/m1LinearApply";
import { resolveMiddleTier } from "../middle/tier";
import type { TypeEntry } from "../middle/types";
import type { ConceptId, Difficulty } from "./types";

export type EngineModule = "m1Expr" | "m1Book1" | "m1LinearApply";
export interface EngineCatalogEntry {
  key: string;
  title: string;
  unitSection: string;
  sourceModule: EngineModule;
  conceptId: ConceptId;
  tier: EngineTier;
  difficulty: Difficulty;
}

/** Keep the product's six tiers in order; SRS's highest slot contains the top two. */
export function srsDifficulty(tier: EngineTier): Difficulty {
  return Math.min(5, DIFFICULTY_LADDER.indexOf(tier) + 1) as Difficulty;
}

const EQUATION_CONCEPTS: Record<ConceptId, readonly string[]> = {
  balance: ["01", "04", "05", "06", "24", "25", "32", "33"],
  "two-step": ["23", "26", "27", "29"],
  distribute: ["03", "10", "31", "35"],
  "both-sides": ["08", "09", "11", "15", "16", "18", "30"],
  fractions: ["07", "12", "13", "14", "28", "36"],
  word: [],
};

const EXCLUDED_EQUATIONS: Record<string, string> = {
  "02": "수 대신 등식을 작성하는 문항이므로 식 채점기가 필요합니다.",
  "17": "씨앗에 따라 여러 수를 모두 답해야 하므로 복수 정답 채점기가 필요합니다.",
  "19": "양변에 더한 등식 전체를 작성하는 문항입니다.",
  "20": "양변에서 뺀 등식 전체를 작성하는 문항입니다.",
  "21": "양변에 곱한 등식 전체를 작성하는 문항입니다.",
  "22": "나누어 얻은 등식 전체를 작성하라는 발문을 숫자 문항으로 바꾸지 않습니다.",
  "34": "주어진 보기에서 고르는 문항이므로 선택형 화면으로 연결해야 합니다.",
};

const SOURCES: { sourceModule: EngineModule; entries: TypeEntry[] }[] = [
  { sourceModule: "m1Expr", entries: [...M1_EXPR, ...M1_EXPR_SUP_B] },
  { sourceModule: "m1Book1", entries: M1_BOOK1 },
  { sourceModule: "m1LinearApply", entries: M1_LINEAR_APPLY },
];
const handlers = new Map<string, TypeEntry>();
const catalog: EngineCatalogEntry[] = [];
const exclusions: {
  key: string;
  title: string;
  sourceModule: EngineModule;
  reason: string;
}[] = [];

for (const { entries, sourceModule } of SOURCES) {
  for (const entry of entries) {
    let conceptId: ConceptId | undefined;
    let reason: string | undefined;
    if (entry.rpmMinor === "일차방정식의 풀이") {
      conceptId = (Object.keys(EQUATION_CONCEPTS) as ConceptId[]).find((id) =>
        EQUATION_CONCEPTS[id].includes(entry.rpmType),
      );
      reason = EXCLUDED_EQUATIONS[entry.rpmType];
      if (!conceptId && !reason)
        throw new Error(`SRS 개념 배정이 필요한 기존 유형: ${entry.key}`);
    } else if (entry.rpmMinor === "일차방정식의 활용") {
      if (entry.rpmType === "27" || entry.rpmType === "28") {
        reason =
          "주어진 수열의 합 또는 항을 계산하는 유형으로, 방정식을 세워 미지수를 구하는 이번 학습 범위 밖입니다.";
      } else {
        conceptId = "word";
      }
    } else {
      reason = "중1 일차방정식 학습 범위 밖의 기존 유형입니다.";
    }
    if (reason) {
      exclusions.push({
        key: entry.key,
        title: entry.rpmTitle,
        sourceModule,
        reason,
      });
      continue;
    }
    if (!conceptId || handlers.has(entry.key))
      throw new Error(`중복되거나 배정되지 않은 유형: ${entry.key}`);
    const sample = entry.handler(createRng(0));
    if (sample.figureSpec)
      throw new Error(`도형 화면 연결이 필요한 기존 유형: ${entry.key}`);
    const tier = resolveMiddleTier(sample.difficulty, sample.content, false);
    handlers.set(entry.key, entry);
    catalog.push({
      key: entry.key,
      title: entry.rpmTitle,
      unitSection: entry.unitSection,
      sourceModule,
      conceptId,
      tier,
      difficulty: srsDifficulty(tier),
    });
  }
}

/** Only three M1 modules enter this adapter, never middle/generate's all-grade registry. */
export const ENGINE_CATALOG: readonly EngineCatalogEntry[] = catalog;
export const ENGINE_EXCLUSIONS =
  exclusions as readonly (typeof exclusions)[number][];
export const TEMPLATE_COUNT = ENGINE_CATALOG.length;
export const ENGINE_CONCEPT_COUNTS = Object.fromEntries(
  (Object.keys(EQUATION_CONCEPTS) as ConceptId[]).map((id) => [
    id,
    ENGINE_CATALOG.filter((entry) => entry.conceptId === id).length,
  ]),
) as Record<ConceptId, number>;

export function engineHandler(typeKey: string): TypeEntry {
  const entry = handlers.get(typeKey);
  if (!entry) throw new Error(`SRS에서 지원하지 않는 기존 유형: ${typeKey}`);
  return entry;
}
