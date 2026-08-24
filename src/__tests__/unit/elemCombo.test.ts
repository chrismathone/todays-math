/**
 * 초등 결합형(combo) 문항 — D-07 승인 파일럿.
 *
 * 기존 4단과 별도 경로이며, 참은 발문에서 독립 재도출한다. 제품 생성기의
 * 중간값이나 계산 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { ELEM_TIERS } from "../../lib/elementary/difficulty";
import {
  elementaryComboDefinitions,
  elementaryUnits,
  generateElementaryComboProblem,
  supportedCombos,
  supportedTiers,
  validateElementaryComboDefinition,
} from "../../lib/elementary/generate";
import { gcd } from "../../lib/elementary/math";
import {
  bareNumbers,
  josaFaults,
  runawayDecimals,
  tooAdvanced,
} from "../../lib/elementary/rules";

const AREA_FRACTION = "초5|2-2-3::초5|1-6-2";
const SWEEP = Array.from({ length: 96 }, (_, i) => i + 1);

function unit(key: string) {
  const [grade, code] = key.split("|");
  const found = CURRICULUM_UNITS.find(
    (u) => u.grade === grade && u.section.startsWith(`${code} `),
  );
  if (!found) throw new Error(`시험 fixture에 없는 소단원: ${key}`);
  return found;
}

/** 수와 승인된 소재 슬롯을 지운 문장 뼈대. 소재만 바뀐 것을 다양성으로 세지 않는다. */
function skeleton(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, "§")
    .replace(
      /(텃밭|화단|밭|채소|감자|상추|토마토|고구마|배추|방수 천|돗자리 천|천|깃발|가방|방석|띠|덮개|끈)(?:을|를|이|가)?/g,
      "◇",
    )
    .replace(/§(\s*[,·]\s*§)+/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

function latexInt(text: string): number {
  const hit = /^\$(\d+)\\,\\mathrm\{m\}\^2\$$/.exec(text);
  if (!hit) throw new Error(`넓이 정답 꼴이 아닙니다: ${text}`);
  return Number(hit[1]);
}

const NESTED =
  /가로가 \$(\d+)\\,\\mathrm\{m\}\$, 세로가 \$(\d+)\\,\\mathrm\{m\}\$[\s\S]*전체 넓이의 \$\\frac\{(\d+)\}\{(\d+)\}\$[\s\S]*그 넓이의 \$\\frac\{(\d+)\}\{(\d+)\}\$/;
const REMAINDER =
  /가로가 \$(\d+)\\,\\mathrm\{m\}\$, 세로가 \$(\d+)\\,\\mathrm\{m\}\$[\s\S]*전체 넓이의 \$\\frac\{(\d+)\}\{(\d+)\}\$[\s\S]*남은 [\s\S]* \$\\frac\{(\d+)\}\{(\d+)\}\$/;

describe("[초등 결합형] 기존 4단과 분리된 승인 등록부", () => {
  it("기존 230개 소단원과 4단 계약을 바꾸지 않는다", () => {
    expect(ELEM_TIERS).toEqual(["연산", "기본", "응용", "심화"]);
    const units = elementaryUnits();
    expect(units).toHaveLength(230);
    expect(units.filter((u) => supportedTiers(u).length === 4)).toHaveLength(
      230,
    );
  });

  it("등록부는 실재하는 이전 소단원만 가리키고 문형을 둘 이상 가진다", () => {
    const defs = elementaryComboDefinitions();
    expect(defs.map((d) => d.id)).toEqual([AREA_FRACTION]);

    for (const def of defs) {
      const anchor = unit(def.anchorKey);
      expect(new Set(def.prerequisiteKeys).size).toBe(
        def.prerequisiteKeys.length,
      );
      expect(def.prerequisiteKeys).not.toContain(def.anchorKey);
      expect(def.familyIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(def.familyIds).size).toBe(def.familyIds.length);
      expect(def.curriculumBasis.trim().length).toBeGreaterThan(0);
      expect(def.laterConceptReview).toMatch(/units\.ts/);
      for (const key of def.prerequisiteKeys) {
        expect(unit(key).orderIndex).toBeLessThan(anchor.orderIndex);
      }
    }
  });

  it("anchor에서만 지원 목록이 보이고 임의 id는 조용히 생성하지 않는다", () => {
    expect(supportedCombos(unit("초5|2-2-3"))).toEqual([AREA_FRACTION]);
    expect(supportedCombos(unit("초5|1-6-2"))).toEqual([]);
    expect(() =>
      generateElementaryComboProblem("초5|2-2-3::초6|2-6-2", 1),
    ).toThrow(/등록되지 않은 결합형/);
  });

  it("선수 순서가 뒤집히거나 family가 하나뿐인 등록 metadata는 막는다", () => {
    expect(() =>
      validateElementaryComboDefinition({
        id: "bad-order",
        anchorKey: "초5|1-6-2",
        prerequisiteKeys: ["초5|2-2-3"],
        curriculumBasis: "음성 대조",
        laterConceptReview: "units.ts 음성 대조",
        familyIds: ["a", "b"],
      }),
    ).toThrow(/선수 순서/);
    expect(() =>
      validateElementaryComboDefinition({
        id: "one-family",
        anchorKey: "초5|2-2-3",
        prerequisiteKeys: ["초5|1-6-2"],
        curriculumBasis: "음성 대조",
        laterConceptReview: "units.ts 음성 대조",
        familyIds: ["only"] as never,
      }),
    ).toThrow(/문형은 둘 이상/);
    expect(() =>
      validateElementaryComboDefinition({
        id: "no-later-review",
        anchorKey: "초5|2-2-3",
        prerequisiteKeys: ["초5|1-6-2"],
        curriculumBasis: "양성 근거만 있음",
        familyIds: ["a", "b"],
      } as never),
    ).toThrow(/후속 정식 개념/);
  });

  it("초6 재료를 합쳐 중1 원기둥 겉넓이를 만드는 반례는 등록되지 않았다", () => {
    expect(
      CURRICULUM_UNITS.filter((u) => /겉넓이|부피/.test(u.section)).map((u) => [
        u.grade,
        u.section,
        u.orderIndex,
      ]),
    ).toEqual([
      ["초6", "1-6-1 직육면체의 겉넓이 구하는 방법", 329],
      ["초6", "1-6-2 직육면체의 부피 비교와 직육면체의 부피 구하는 방법", 330],
      ["중1", "기둥의 겉넓이와 부피", 404],
      ["중1", "뿔의 겉넓이와 부피", 405],
      ["중1", "구의 겉넓이와 부피", 406],
      ["중2", "닮은 도형의 넓이의 비와 부피의 비", 462],
      ["미적분2", "입체도형의 부피", 734],
    ]);
    const later = CURRICULUM_UNITS.find(
      (u) => u.grade === "중1" && u.section === "기둥의 겉넓이와 부피",
    );
    expect(later?.orderIndex).toBe(404);
    expect(() =>
      generateElementaryComboProblem(
        "초6|2-6-2::초6|2-5-2+초6|2-5-4::원기둥-겉넓이",
        1,
      ),
    ).toThrow(/등록되지 않은 결합형/);
  });

  it("같은 id와 씨앗은 metadata·본문·정답·해설까지 같다", () => {
    expect(generateElementaryComboProblem(AREA_FRACTION, 20260824)).toEqual(
      generateElementaryComboProblem(AREA_FRACTION, 20260824),
    );
  });
});

describe("[초등 결합형] 넓이 × 분수의 곱 — 독립 검산", () => {
  it("두 승인 문형을 전부 실제 씨앗으로 내고 뼈대도 정확히 둘로 갈린다", () => {
    const problems = SWEEP.map((seed) =>
      generateElementaryComboProblem(AREA_FRACTION, seed),
    );
    expect(new Set(problems.map((p) => p.familyId))).toEqual(
      new Set(["nested-part", "remainder-part"]),
    );
    expect(new Set(problems.map((p) => skeleton(p.content))).size).toBe(2);
    expect(new Set(problems.map((p) => p.content)).size).toBeGreaterThanOrEqual(
      24,
    );
  });

  it("발문만 읽어 두 단계 값을 다시 구하면 정답과 일치한다", () => {
    let nested = 0;
    let remainder = 0;

    for (const seed of SWEEP) {
      const p = generateElementaryComboProblem(AREA_FRACTION, seed);
      const match =
        p.familyId === "nested-part"
          ? NESTED.exec(p.content)
          : REMAINDER.exec(p.content);
      expect(match, `씨앗 ${seed}: ${p.content}`).not.toBeNull();
      const [w, h, a, d, b, e] = match!.slice(1).map((value) => Number(value));
      expect(gcd(a!, d!)).toBe(1);
      expect(gcd(b!, e!)).toBe(1);
      expect(a!).toBeLessThan(d!);
      expect(b!).toBeLessThan(e!);

      const area = w! * h!;
      const expected =
        p.familyId === "nested-part"
          ? (area * a! * b!) / (d! * e!)
          : ((area - (area * a!) / d!) * b!) / e!;
      expect(Number.isInteger(expected), `씨앗 ${seed}`).toBe(true);
      expect(latexInt(p.answer), `씨앗 ${seed}`).toBe(expected);

      if (p.familyId === "nested-part") nested += 1;
      else remainder += 1;
    }

    expect(nested).toBeGreaterThan(0);
    expect(remainder).toBeGreaterThan(0);
  });

  it("소재가 바뀌어도 목적격 조사가 낱말의 받침과 맞는다", () => {
    const objects = [
      ["띠", "띠를", "띠을"],
      ["덮개", "덮개를", "덮개을"],
      ["끈", "끈을", "끈를"],
    ] as const;
    const reached = new Set<string>();
    for (const seed of SWEEP) {
      const p = generateElementaryComboProblem(AREA_FRACTION, seed);
      if (p.familyId !== "remainder-part") continue;
      const text = `${p.content}\n${p.solution}`;
      for (const [noun, right, wrong] of objects) {
        if (!text.includes(noun)) continue;
        reached.add(noun);
        expect(text, `씨앗 ${seed}`).toContain(right);
        expect(text, `씨앗 ${seed}`).not.toContain(wrong);
      }
    }
    expect(reached).toEqual(new Set(objects.map(([noun]) => noun)));
  });

  it("두 소단원 metadata와 초등 공통 지면 규칙을 전 씨앗에서 지킨다", () => {
    for (const seed of SWEEP) {
      const p = generateElementaryComboProblem(AREA_FRACTION, seed);
      expect(p.kind).toBe("combo");
      expect(p.comboId).toBe(AREA_FRACTION);
      expect(p.anchorKey).toBe("초5|2-2-3");
      expect(p.conceptKeys).toEqual(["초5|2-2-3", "초5|1-6-2"]);
      expect(p.figureSpec).toBeNull();

      for (const text of [p.content, p.answer, p.solution]) {
        expect(bareNumbers(text), `씨앗 ${seed}: ${text}`).toEqual([]);
        expect(runawayDecimals(text), `씨앗 ${seed}: ${text}`).toEqual([]);
      }
      expect(josaFaults(`${p.content}\n${p.solution}`)).toEqual([]);
      expect(tooAdvanced(p.orderIndex, p.solution)).toEqual([]);
    }
  });
});
