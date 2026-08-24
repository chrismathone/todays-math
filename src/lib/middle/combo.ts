/**
 * 중등 결합형(combo) 등록부 — **원장님이 문형까지 승인한 것만** 들어온다.
 *
 * 임의의 소단원 둘을 붙이는 조합기가 **아니다**. 재료가 모두 중등이어도 그 합성이
 * 고등의 정식 개념일 수 있다(D-100 ⑶ · 실제로 `3-2|상자그림과 산점도|09` 가 좌표평면
 * 두 점 사이의 거리를 물어 공통수학2 를 침범하고 있었다).
 *
 * ## 왜 `MidProblem` 을 안 쓰나
 * `MidProblem` 은 `rpmBook/Minor/Type/Title` 을 **필수**로 갖는다(types.ts) — 그건
 * 「이 문항이 RPM 유형 하나에서 나왔다」는 계약이다. 결합형은 유형이 둘 이상이라
 * 그 자리에 가짜 값을 채우면 계약이 거짓이 된다. 그래서 **별도 타입**을 둔다.
 *
 * ## 무엇이 결합형인가 (D-100)
 * 서로 다른 소단원 개념 둘 이상이 **각각 독립적으로 필수**이고, 어느 하나를 빼면
 * 풀 수 없다. `anchor` 는 가장 늦게 배우는 소단원, 나머지는 `prerequisite`.
 * ⚠️ **학년을 넘으면 낮은 쪽이 «도구»여야 한다**(D-100 ⑵) — 대등하게 걸치면 안 된다.
 *
 * ## 지금 등록된 것
 * 하나뿐이다. **문형을 늘리려면 원장님 승인이 먼저다**(D-07) — 여기에 손으로 더하지 말 것.
 */
import type { Difficulty } from "@/contracts/common.contract";

import { createRng, intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

export type MidComboProblem = {
  kind: "combo";
  comboId: string;
  /** 가장 늦게 배우는 소단원 — 우리 `Unit.section` 이름 */
  anchorSection: string;
  anchorGrade: string;
  /** 원천 RPM 유형 키 (앵커가 먼저). 「어느 유형과 겹치나」를 여기서 본다. */
  conceptKeys: readonly [string, string, ...string[]];
  familyId: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
};

type ComboFamily = {
  id: string;
  generate: (
    rng: Rng,
  ) => Omit<
    MidComboProblem,
    | "kind"
    | "comboId"
    | "anchorSection"
    | "anchorGrade"
    | "conceptKeys"
    | "familyId"
  >;
};

type ComboDefinition = {
  id: string;
  anchorSection: string;
  anchorGrade: string;
  conceptKeys: readonly [string, string, ...string[]];
  /** 승인 근거 — 왜 이 결합이 중등 범위 안인가. orderIndex 만으로는 못 지킨다. */
  curriculumBasis: string;
  /** 이 결합이 «고등의 정식 개념» 이 되지 않는지 본 기록 (D-100 ⑶). */
  laterConceptReview: string;
  /** 학년을 넘는가. 넘으면 낮은 쪽이 도구인지 적는다 (D-100 ⑵). */
  gradeBoundary: string;
  salt: number;
  families: readonly [ComboFamily, ...ComboFamily[]];
};

const QUADRATIC_CIRCLE_ID = "중3|원주각::중3|이차방정식의 풀이";

/** `ax^2+bx+c` 를 지면 표기로. 계수 1·0 과 부호를 사람이 쓰듯 쓴다. */
function quadratic(a: number, b: number, c: number): string {
  const head = a === 1 ? "x^2" : `${a}x^2`;
  let out = head;
  if (b !== 0) {
    const mag = Math.abs(b) === 1 ? "x" : `${Math.abs(b)}x`;
    out += `${b > 0 ? "+" : "-"}${mag}`;
  }
  if (c !== 0) out += `${c > 0 ? "+" : "-"}${Math.abs(c)}`;
  return out;
}

/**
 * 원주각 = $(ax^2+bx)^\circ$ · 중심각 = $((2a+1)x^2+ex+f)^\circ$.
 *
 * 「중심각 = 원주각 × 2」로 식을 세우면 $x^2+(q-p)x-pq=0$ 이 되고, 인수분해하면
 * $(x-p)(x+q)=0$ 이다. $x$ 가 양수이므로 $-q$ 는 버린다.
 *
 * 두 개념이 **각각 독립적으로 필수**다 — 원주각 성질을 모르면 식을 못 세우고,
 * 인수분해를 모르면 세운 식을 못 푼다.
 */
const quadraticCircle: ComboFamily = {
  id: "central-angle-quadratic",
  generate: (rng) => {
    const p = intBetween(rng, 3, 8); // 양수 해 = 정답
    const q = pick(
      rng,
      [2, 3, 4, 5, 6].filter((v) => v !== p),
    ); // 버릴 음수 해 $-q$
    const a = pick(rng, [1, 2]);
    const b = pick(rng, [0, 1, 2]);

    const inscribed = a * p * p + b * p; // 원주각의 크기
    const central = 2 * inscribed;
    const e = 2 * b + q - p;
    const f = -p * q;

    return {
      content:
        `원 $\\mathrm{O}$ 에서 호 $\\mathrm{AB}$ 에 대한 원주각의 크기가 ` +
        `$(${quadratic(a, b, 0)})^\\circ$ 이고, 중심각의 크기가 ` +
        `$(${quadratic(2 * a + 1, e, f)})^\\circ$ 이다. 이때 양수 $x$ 의 값을 구하시오.`,
      answer: `$${p}$`,
      solution:
        `한 호에 대한 중심각의 크기는 원주각의 크기의 $2$ 배이므로 ` +
        `$${quadratic(2 * a + 1, e, f)}=2(${quadratic(a, b, 0)})$ 이다.\n` +
        `정리하면 $x^2${q - p >= 0 ? "+" : "-"}${Math.abs(q - p) === 1 ? "" : Math.abs(q - p)}x-${p * q}=0$ 이고, ` +
        `인수분해하면 $(x-${p})(x+${q})=0$ 이므로 $x=${p}$ 또는 $x=-${q}$ 이다.\n` +
        `$x$ 는 양수이므로 $x=${p}$ 이다. ` +
        `(이때 원주각은 $${inscribed}^\\circ$, 중심각은 $${central}^\\circ$ 이다.)`,
      difficulty: "심화",
      facts: { p, q, a, b, e, f, inscribed, central },
    };
  },
};

const DEFINITIONS: readonly ComboDefinition[] = [
  {
    id: QUADRATIC_CIRCLE_ID,
    anchorSection: "원주각",
    anchorGrade: "중3",
    conceptKeys: ["3-2|원주각|02", "3-1|이차방정식의 풀이|06"],
    curriculumBasis:
      "원주각과 중심각의 크기 ⑵(3-2|원주각|02)와 인수분해를 이용한 이차방정식의 풀이" +
      "(3-1|이차방정식의 풀이|06). 둘 다 중3 이고 앵커(원주각)가 더 뒤다.",
    laterConceptReview:
      "원의 성질과 이차방정식을 단순 연결할 뿐 고등의 정식 개념을 만들지 않는다 — " +
      "사인법칙(대수 2. 삼각함수)도, 이차방정식과 이차함수의 관계(공통수학1)도, " +
      "도형의 방정식(공통수학2)도 건드리지 않는다. 좌표평면을 쓰지 않으므로 D-100 ⑶ 도 안전.",
    gradeBoundary: "학년 안(중3+중3) — D-100 ⑵ 의 학년 경계 판단이 필요 없다.",
    salt: 0x5c1a,
    families: [quadraticCircle],
  },
];

const BY_ID = new Map(DEFINITIONS.map((d) => [d.id, d]));

/** 등록된 결합형 목록 — CLI 가 `--list-combos` 로 보여 준다. */
export function middleComboDefinitions(): readonly {
  id: string;
  anchorSection: string;
  anchorGrade: string;
  conceptKeys: readonly string[];
  familyIds: readonly string[];
  curriculumBasis: string;
  laterConceptReview: string;
  gradeBoundary: string;
}[] {
  return DEFINITIONS.map((d) => ({
    id: d.id,
    anchorSection: d.anchorSection,
    anchorGrade: d.anchorGrade,
    conceptKeys: d.conceptKeys,
    familyIds: d.families.map((f) => f.id),
    curriculumBasis: d.curriculumBasis,
    laterConceptReview: d.laterConceptReview,
    gradeBoundary: d.gradeBoundary,
  }));
}

export function isMiddleComboId(key: string): boolean {
  return BY_ID.has(key);
}

/**
 * 승인된 결합형 하나를 낸다. 등록되지 않은 id 는 **던진다** — 조합기가 아니다.
 */
export function generateMiddleComboProblem(
  comboId: string,
  seed: number,
  variant = 0,
): MidComboProblem {
  const def = BY_ID.get(comboId);
  if (!def) {
    throw new Error(
      `승인되지 않은 결합형입니다: ${comboId} — middleComboDefinitions() 로 확인. ` +
        `새 문형은 원장님 승인(D-07) 뒤에만 등록한다.`,
    );
  }
  const family = def.families[variant % def.families.length]!;
  const body = family.generate(createRng(seed + def.salt + variant * 0x9e37));
  return {
    kind: "combo",
    comboId: def.id,
    anchorSection: def.anchorSection,
    anchorGrade: def.anchorGrade,
    conceptKeys: def.conceptKeys,
    familyId: family.id,
    ...body,
  };
}

/** 한 결합형에서 n 문항 — 발문이 같은 것은 버리고 다시 뽑는다. */
export function generateMiddleComboSet(
  comboId: string,
  seed: number,
  count: number,
): MidComboProblem[] {
  const out: MidComboProblem[] = [];
  const seen = new Set<string>();
  for (let v = 0; out.length < count; v += 1) {
    if (v > count * 40) {
      throw new Error(
        `결합형 ${comboId} 에서 서로 다른 ${count}문항을 못 만들었습니다 — 변형 공간이 좁습니다.`,
      );
    }
    const p = generateMiddleComboProblem(comboId, seed, v);
    if (seen.has(p.content)) continue;
    seen.add(p.content);
    out.push(p);
  }
  return out;
}
