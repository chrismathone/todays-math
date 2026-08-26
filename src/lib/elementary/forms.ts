/**
 * 초등 문형 등록부 — 파일럿 3소단원.
 *
 * 문형 id 는 엔진에만 둔다. 적재기 `familyKey` 조립은 손대지 않는다
 * (`scripts/import/load-engine-problems.ts:162`). 키를 지금 옮기면
 * 갈래는 그대로 4이고 이관 위험만 진다 (BRIEF §0, REPORT-02 자 ㉠).
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import { G3_FORMS } from "./g3";
import { G4_FORMS } from "./g4";
import { G5_FORMS } from "./g5";
import { tierKey, type ElemTier } from "./difficulty";
import { createRng } from "./rng";
import type { ElemForm, ElemProblem } from "./types";

export type { ElemForm };

/** 파일럿 소단원. `학년|코드`. */
export const PILOT_FORM_KEYS = ["초3|2-3-1", "초4|1-6-5", "초5|2-5-1"] as const;

const FORMS: Record<string, readonly ElemForm[]> = {
  ...G3_FORMS,
  ...G4_FORMS,
  ...G5_FORMS,
};

export function listedForms(unit: UnitSeed): readonly ElemForm[] {
  return FORMS[tierKey(unit)] ?? [];
}

/**
 * 파일럿이 «키가 문형 id 를 실으면» 쓰는 모양.
 * 적재기는 이 함수를 **부르지 않는다.**
 */
export function pilotFamilyKey(
  unit: Pick<UnitSeed, "grade" | "section">,
  formId: string,
): string {
  return `elem:${unit.grade}|${unit.section}|${formId}`;
}

export function elemProblemType(tier: ElemTier): string {
  if (tier === "연산") return "계산";
  if (tier === "기본") return "개념";
  return "활용";
}

function formSalt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 33 + id.charCodeAt(i)) | 0;
  }
  return (h & 0xffff) + 0x5_0000;
}

export function generateElementaryForm(
  unit: UnitSeed,
  seed: number,
  formId: string,
): ElemProblem {
  const forms = listedForms(unit);
  if (forms.length === 0) {
    throw new Error(
      `문형 등록이 없는 소단원입니다: ${unit.grade} ${unit.section}`,
    );
  }
  const form = forms.find((f) => f.id === formId);
  if (!form) {
    throw new Error(
      `문형 ${formId} 이(가) 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const p = form.generate(
    unit,
    createRng(seed + unit.orderIndex * 17 + formSalt(formId)),
  );
  return { ...p, formId: form.id };
}
