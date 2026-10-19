/**
 * 초등 문형 등록부 — 소단원마다 문형 10개 (원장님 확정 2026-08-26 안 3 최고안).
 * 진척은 `scripts/qa/probe-elem-forms.ts` 하나가 센다.
 *
 * 문형 id 는 엔진에만 둔다. 적재기 `familyKey` 조립은 손대지 않는다
 * (`scripts/import/load-engine-problems.ts:162`). 키를 지금 옮기면
 * 갈래는 그대로 4이고 이관 위험만 진다 (BRIEF §0, REPORT-02 자 ㉠).
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import { G3_FORMS, G3_TIERS } from "./g3";
import { G4_FORMS, G4_TIERS } from "./g4";
import { G5_FORMS, G5_TIERS } from "./g5";
import { G6_FORMS, G6_TIERS } from "./g6";
import {
  EXTENDING_FORM_IDS,
  tierKey,
  type ElemTier,
  type ElemTierMap,
} from "./difficulty";
import { figureForms } from "./figureForms";
import { reinforcementForms20261018 } from "./reinforcementForms20261018";
import { statementForms } from "./statementForms";
import { createRng } from "./rng";
import type { ElemForm, ElemProblem } from "./types";

export type { ElemForm };

/** 파일럿 소단원. `학년|코드`. */
export const PILOT_FORM_KEYS = ["초3|2-3-1", "초4|1-6-5", "초5|2-5-1"] as const;

const BASE_FORMS: Record<string, readonly ElemForm[]> = {
  ...G3_FORMS,
  ...G4_FORMS,
  ...G5_FORMS,
  ...G6_FORMS,
};

const TIERS: ElemTierMap = {
  ...G3_TIERS,
  ...G4_TIERS,
  ...G5_TIERS,
  ...G6_TIERS,
};

/**
 * 🔴 **문형 12 (D-114) — 확대 갈래는 «파생»한다. 손으로 배선하지 않는다.**
 *
 * 문형 열 개는 소단원마다 손으로 적혀 있다(g3·g4 는 `ten(...)`, g6 은 `forms10(...)`,
 * g5 는 배열을 그대로). 거기에 `심화중`·`심화상` 을 **또 손으로** 더하면 같은 것을
 * 가리키는 목록이 두 벌이 되고, 한쪽만 고쳐도 아무도 모른다 — 이 저장소가
 * 여러 번 데인 자리다. 그래서 **갈래 등록부에서 그대로 끌어온다.**
 *
 * ⚠️ **230개 전부가 12가 되지는 않는다.** 확대 갈래는 «선택»이라(D-113 ⑶)
 *    채운 소단원에만 있다 — 착수 시점 실측 심화중 84/230 · 심화상 48/230.
 *    그래서 이 함수가 돌려주는 길이는 **10 · 11 · 12** 셋 중 하나다.
 *    「소단원마다 열둘」로 못 박는 검사를 쓰면 **채우는 내내 빨갛다** —
 *    늘 우는 가드는 꺼진다(2026-08-20). 기대값은 **갈래에서 세어** 얻어라
 *    (`expectedFormCount`).
 *
 * ⚠️ 갈래가 있는데 문형 등록이 아예 없는 소단원에는 **아무것도 안 붙인다** —
 *    빈 배열은 「등록 안 됨」이라는 뜻이고, 거기에 11만 붙이면 적재기가
 *    「문형 하나짜리 소단원」을 만든다.
 */
function withExtendingForms(
  key: string,
  base: readonly ElemForm[],
): readonly ElemForm[] {
  if (base.length === 0) return base;
  const variants = TIERS[key];
  if (!variants) return base;
  const extra: ElemForm[] = [];
  for (const [tier, id] of EXTENDING_FORM_IDS) {
    const generate = variants[tier];
    if (generate) extra.push({ id, tier, generate });
  }
  return extra.length === 0 ? base : [...base, ...extra];
}

const FORMS: Record<string, readonly ElemForm[]> = Object.fromEntries(
  Object.entries(BASE_FORMS).map(([key, forms]) => [
    key,
    withExtendingForms(key, forms),
  ]),
);

/**
 * 확대 갈래를 **뺀** 기본 문형 — 원장님이 확정한 열 개(2026-08-26 안 3).
 *
 * 검사가 「소단원마다 열 개」를 물을 때 쓴다. `listedForms` 를 그대로 세면
 * 확대 갈래를 채운 소단원에서만 11·12 가 되어 **채우는 내내 빨갛다.**
 */
export function coreForms(unit: UnitSeed): readonly ElemForm[] {
  return BASE_FORMS[tierKey(unit)] ?? [];
}

/**
 * 적재기가 도는 문형 전부 — 기본 열 + 확대 11 · 12 + 그림 21~ + 진술 31 · 32 + 보강 31~39.
 * 추가 문형은 문형 등록이 있는 소단원에만 붙는다. 진술/보강은 서로 다른 소단원에 등록한다.
 */
export function listedForms(unit: UnitSeed): readonly ElemForm[] {
  const forms = FORMS[tierKey(unit)] ?? [];
  if (forms.length === 0) return forms;
  const extra = [...figureForms(unit), ...statementForms(unit), ...reinforcementForms20261018(unit)];
  return extra.length === 0 ? forms : [...forms, ...extra];
}

/**
 * 이 소단원이 **가져야 할** 문형 수 — 기본 열 + 채운 확대 갈래 + 그림/보강 등록.
 *
 * 🔴 검사·계량기는 `10` 도 `12` 도 손으로 적으면 안 된다. 그러면 채우는 도중
 *    전부 빨갛거나(12), 다 채운 뒤에도 안 늘어난 것을 못 본다(10).
 *    **갈래에서 세어야** 「문형이 갈래를 따라왔나」를 물을 수 있다.
 */
export function expectedFormCount(unit: UnitSeed): number {
  const key = tierKey(unit);
  const base = BASE_FORMS[key];
  if (!base || base.length === 0) return 0;
  const variants = TIERS[key];
  const extra = EXTENDING_FORM_IDS.filter(
    ([tier]) => variants?.[tier] !== undefined,
  ).length;
  return (
    base.length +
    extra +
    figureForms(unit).length +
    statementForms(unit).length +
    reinforcementForms20261018(unit).length
  );
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
