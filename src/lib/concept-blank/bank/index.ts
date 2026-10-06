import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { sectionStock as stockOf, type SectionStock } from "./stock";
import { bank as e3 } from "./e3";
import { bank as e4 } from "./e4";
import { bank as e5 } from "./e5";
import { bank as e6 } from "./e6";
import { bank as m1 } from "./m1";
import { bank as m2 } from "./m2";
import { bank as m3 } from "./m3";
import { bank as e3plus } from "./e3-plus";
import { bank as e4plus } from "./e4-plus";
import { bank as e5plus } from "./e5-plus";
import { bank as e6plus } from "./e6-plus";
import { bank as m1plus } from "./m1-plus";
import { bank as m2plus } from "./m2-plus";
import { bank as m3plus } from "./m3-plus";

/**
 * 개념 백지 고정 문항 은행(D-150). 학년 파일 일곱을 트랙이 따로 채운다(겹치지 않게 파일을 나눴다).
 * 순서는 파일 안 순서 그대로 — 같은 고르기면 같은 지면(고정).
 * `*plus` 는 은행 3차 «난이도별 10문항» 보강(`plus.ts`) — 원래 파일 **뒤**에 이어 소단원 안에서 원래 문항이 앞에 온다.
 * 🔴 뜻 문장(`concepts`)을 **더하거나 빼거나 소단원 · 난이도를 옮기면** «오늘의 기억»의 묶음 표(`src/lib/fading/groups/`)도 맞춘다 —
 * `npx tsx scripts/qa/fading-grouping/sync.ts --write`. 안 맞추면 `fadingGroups.test.ts` 가 운다(문장의 글만 고친 것은 안 걸린다).
 */
export const BANK_PARTS: Readonly<Record<string, ConceptBlankBank>> = {
  e3,
  e4,
  e5,
  e6,
  m1,
  m2,
  m3,
  e3plus,
  e4plus,
  e5plus,
  e6plus,
  m1plus,
  m2plus,
  m3plus,
};

/** 보강 파일 → 그 원래 파일. */
export const PLUS_OF: Readonly<Record<string, string>> = {
  e3plus: "e3",
  e4plus: "e4",
  e5plus: "e5",
  e6plus: "e6",
  m1plus: "m1",
  m2plus: "m2",
  m3plus: "m3",
};

export const CONCEPT_BLANK_BANK: ConceptBlankBank = {
  concepts: Object.values(BANK_PARTS).flatMap((b) => b.concepts),
  ox: Object.values(BANK_PARTS).flatMap((b) => b.ox),
  apply: Object.values(BANK_PARTS).flatMap((b) => b.apply),
  figures: Object.values(BANK_PARTS).flatMap((b) => b.figures),
};

export type { SectionStock };

/** 소단원 하나의 문항 — 기본은 은행 전체(서버 · 시험 · 스크립트). 화면은 `stock.ts` 를 받은 은행으로 쓴다. */
export function sectionStock(
  key: string,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): SectionStock {
  return stockOf(key, bank);
}
