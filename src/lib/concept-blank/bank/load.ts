import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";

import { joinBanks } from "./plus";

/**
 * 학년 은행을 늦게 불러온다(은행 3차 · 26 §9 — 소단원마다 10개씩이라 문항이 열 배). 개념 백지 화면은 은행 전체를
 * 처음부터 싣지 않고, 학년을 펼치거나 그 학년 소단원을 고를 때 그 학년의 원래 + 보강 파일만 불러온다
 * (번들러가 학년마다 조각을 나눈다). 서버(인쇄 페이지 · 저장)는 `index.ts` 의 은행 전체를 그대로 쓴다.
 *
 * 🔴 여기서 학년 파일을 **정적으로** import 하지 않는다 — 한 줄이라도 그러면 화면 조각에 은행 전체가 다시 실린다
 * (`conceptBlankBankLoad.test.ts` 가 잠근다). 학년 안의 차례는 `index.ts` 와 같다 — 원래 파일 뒤에 보강.
 */
const LOADERS: Readonly<Record<string, () => Promise<ConceptBlankBank[]>>> = {
  초3: () => Promise.all([import("./e3"), import("./e3-plus")]).then(banks),
  초4: () => Promise.all([import("./e4"), import("./e4-plus")]).then(banks),
  초5: () => Promise.all([import("./e5"), import("./e5-plus")]).then(banks),
  초6: () => Promise.all([import("./e6"), import("./e6-plus")]).then(banks),
  중1: () => Promise.all([import("./m1"), import("./m1-plus")]).then(banks),
  중2: () => Promise.all([import("./m2"), import("./m2-plus")]).then(banks),
  중3: () => Promise.all([import("./m3"), import("./m3-plus")]).then(banks),
};

function banks(modules: { bank: ConceptBlankBank }[]): ConceptBlankBank[] {
  return modules.map((m) => m.bank);
}

/** 학년 하나의 은행(원래 + 보강). 은행이 없는 학년(초1 · 초2 · 고등)은 빈 은행. */
export async function loadGradeBank(grade: string): Promise<ConceptBlankBank> {
  const load = LOADERS[grade];
  return joinBanks(load ? await load() : []);
}
