import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";

import { joinBanks } from "./plus";

// Vite QA harnesses can load the authored bank locally, in core then plus order.
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
