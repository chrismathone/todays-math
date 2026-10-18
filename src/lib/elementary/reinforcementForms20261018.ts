/**
 * 2026-10-18 보강 계획 R2의 초4 아홉 문형.
 * 기존 01~12 · 그림 21~의 생성 함수/RNG를 건드리지 않고 별도로 붙인다.
 * 계획 승인만 받은 저작 후보이며 최종 내용 승인·공유 DB 적재는 별도 관문이다.
 * 그림 없이도 배치/조건이 완결되는 발문만 쓴다(09 도형 지침 §2.2 ③).
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import { tierKey } from "./difficulty";
import { expr, n, unitNum } from "./format";
import { make } from "./make";
import { intBetween, pick } from "./rng";
import type { ElemForm, ElemProblem, Rng } from "./types";

const cm = (value: number) => unitNum(value, "cm");
const deg = (value: number) => expr(`${value}^\\circ`);

/** 두 정삼각형의 공유 변은 바깥 테두리에서 두 번 빠진다. */
function joinedEquilateral(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 20);
  return make(
    unit,
    `한 변의 길이가 ${cm(side)}인 똑같은 정삼각형 종이 두 장을 한 변 전체끼리 맞붙였습니다. ` +
      `두 종이는 맞붙인 변의 서로 반대쪽에 있고 겹친 부분은 없습니다. ` +
      `만들어진 모양의 바깥쪽 테두리 길이는 몇 cm입니까?`,
    cm(side * 4),
    `정삼각형 두 개의 변은 모두 같은 길이입니다. 전체 여섯 변 중 맞붙인 두 변은 ` +
      `바깥쪽 테두리에 들어가지 않으므로 ${expr("3+3-2=4")}개의 변이 남습니다. ` +
      `따라서 바깥쪽 테두리 길이는 ${expr(`${side}\\times4=${side * 4}`)}이므로 ${cm(side * 4)}입니다.`,
  );
}

/** 삼각형 전체의 180도가 아니라 한 꼭짓점의 60도를 부분으로 복원한다. */
function splitEquilateralAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const part = intBetween(rng, 1, 59);
  return make(
    unit,
    `정삼각형의 한 꼭짓점에서 그 각의 안쪽으로 선을 그어 두 각으로 나누었습니다. ` +
      `나눈 두 각 중 하나의 크기가 ${deg(part)}일 때 다른 한 각의 크기는 몇 도입니까?`,
    deg(60 - part),
    `정삼각형의 한 각은 ${deg(60)}입니다. 나눈 두 각의 합이 ${deg(60)}이므로 ` +
      `다른 한 각은 ${expr(`60-${part}=${60 - part}`)}이므로 ${deg(60 - part)}입니다.`,
  );
}

function shuffled<T>(rng: Rng, values: readonly T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** 목표 분류를 만족하는 밑각 후보의 집합. 45도 경계와 정삼각형 60도를 함께 본다. */
function admissibleBaseAngles(unit: UnitSeed, rng: Rng): ElemProblem {
  const wanted = pick(rng, ["예각삼각형", "직각삼각형", "둔각삼각형"] as const);
  const candidates = shuffled(rng, [
    intBetween(rng, 15, 40),
    45,
    intBetween(rng, 46, 59),
    60,
    intBetween(rng, 61, 85),
  ]);
  const possible = candidates
    .filter((base) => {
      if (base === 60) return false;
      const biggest = Math.max(base, 180 - base * 2);
      return wanted === "예각삼각형"
        ? biggest < 90
        : wanted === "직각삼각형"
          ? biggest === 90
          : biggest > 90;
    })
    .sort((a, b) => a - b);
  return make(
    unit,
    `두 변의 길이만 같은 이등변삼각형을 만들려고 합니다(정삼각형은 제외합니다). ` +
      `각의 크기로 분류하면 ${wanted}이 되어야 합니다. 한 밑각의 후보가 ` +
      `${candidates.map(deg).join(", ")}일 때 가능한 밑각의 크기를 작은 것부터 모두 쓰시오.`,
    possible.map(deg).join(", "),
    `밑각을 하나 정하면 다른 밑각도 같고 꼭지각은 ${deg(180)}에서 두 밑각의 합을 뺀 값입니다. ` +
      `밑각이 ${deg(45)}보다 작으면 둔각삼각형, 같으면 직각삼각형, 크면 예각삼각형입니다. ` +
      `다만 ${deg(60)}이면 세 각이 같아 정삼각형이므로 제외합니다. 따라서 가능한 값은 ` +
      `${possible.map(deg).join(", ")}입니다.`,
  );
}

/** 한 삼각형의 이름 대신, 두 기준의 교집합에 속한 카드 수를 복원한다. */
function classificationIntersection(unit: UnitSeed, rng: Rng): ElemProblem {
  const equilateral = intBetween(rng, 1, 8);
  const scaleneAcute = intBetween(rng, 1, 9);
  const isoscelesAcute = intBetween(rng, 1, 9);
  const acute = equilateral + scaleneAcute + isoscelesAcute;
  return make(
    unit,
    `삼각형 카드를 변의 길이에 따라 정삼각형, 두 변의 길이만 같은 삼각형, ` +
      `세 변의 길이가 모두 다른 삼각형으로 나눕니다. 예각삼각형 카드는 모두 ${n(acute)}장입니다. ` +
      `전체 정삼각형 카드는 ${n(equilateral)}장이고, 세 변의 길이가 모두 다르면서 예각삼각형인 카드는 ` +
      `${n(scaleneAcute)}장입니다. 두 변의 길이만 같으면서 예각삼각형인 카드는 몇 장입니까?`,
    `${n(isoscelesAcute)}장`,
    `정삼각형은 세 각이 모두 ${deg(60)}이므로 모두 예각삼각형에 들어갑니다. ` +
      `변의 길이에 따른 세 부류는 서로 겹치지 않으므로, 예각삼각형 중 나머지 두 부류를 빼면 됩니다. ` +
      `${expr(`${acute}-${equilateral}-${scaleneAcute}=${isoscelesAcute}`)}이므로 ${n(isoscelesAcute)}장입니다.`,
  );
}

/** 기준 직선 하나와의 관계가 아니라 모든 순서 없는 평행 쌍을 센다. */
function parallelPairs(unit: UnitSeed, rng: Rng): ElemProblem {
  const first = intBetween(rng, 2, 5);
  const second = intBetween(rng, 2, 5);
  const firstPairs = (first * (first - 1)) / 2;
  const secondPairs = (second * (second - 1)) / 2;
  return make(
    unit,
    `한 평면에 서로 다른 직선이 두 묶음 있습니다. 첫째 묶음의 ${n(first)}개는 서로 모두 평행하고, ` +
      `둘째 묶음의 ${n(second)}개도 서로 모두 평행합니다. 첫째 묶음의 각 직선은 둘째 묶음의 ` +
      `모든 직선과 수직입니다. 전체에서 평행한 두 직선의 짝은 모두 몇 쌍입니까? ` +
      `같은 두 직선은 순서를 바꾸어도 한 쌍으로 셉니다.`,
    `${n(firstPairs + secondPairs)}쌍`,
    `서로 다른 묶음에서 고른 두 직선은 수직이므로 평행한 짝에 넣지 않습니다. ` +
      `첫째 묶음 안에서 두 직선씩 빠짐없이 짝지으면 ${n(firstPairs)}쌍, 둘째 묶음 안에서는 ` +
      `${n(secondPairs)}쌍입니다. 따라서 ${expr(`${firstPairs}+${secondPairs}=${firstPairs + secondPairs}`)}이므로 ` +
      `${n(firstPairs + secondPairs)}쌍입니다.`,
  );
}

/** 평행한 선끼리는 만나지 않는다는 성질로 교점의 중복 여부까지 판단한다. */
function perpendicularGridIntersections(unit: UnitSeed, rng: Rng): ElemProblem {
  const horizontal = intBetween(rng, 2, 6);
  const vertical = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 평면에 가로 방향의 서로 다른 평행한 직선 ${n(horizontal)}개와 세로 방향의 서로 다른 ` +
      `평행한 직선 ${n(vertical)}개를 그었습니다. 가로 직선은 세로 직선과 모두 수직입니다. ` +
      `이 직선들이 만나서 생기는 점은 모두 몇 개입니까?`,
    `${n(horizontal * vertical)}개`,
    `가로 직선끼리나 세로 직선끼리는 평행하여 만나지 않습니다. 가로 직선 하나는 세로 직선 ` +
      `${n(vertical)}개와 만나 서로 다른 점 ${n(vertical)}개를 만듭니다. ` +
      `다른 가로 직선 위의 점과도 겹치지 않으므로 ${expr(`${vertical}\\times${horizontal}=${horizontal * vertical}`)}이므로 ` +
      `${n(horizontal * vertical)}개입니다.`,
  );
}

/** 같은 변에 수직인 두 변을 찾아, 사다리꼴의 평행한 변을 추론한다. */
function rightCornerTrapezoid(unit: UnitSeed, rng: Rng): ElemProblem {
  const ad = intBetween(rng, 3, 12);
  const bc = ad + intBetween(rng, 1, 8);
  const ab = intBetween(rng, 3, 10);
  return make(
    unit,
    `평행한 변이 한 쌍만 있는 사다리꼴의 꼭짓점을 둘레를 따라 가, 나, 다, 라라고 붙였습니다. ` +
      `가와 나의 각은 모두 직각입니다. 변 가라의 길이는 ${cm(ad)}, 변 나다의 길이는 ${cm(bc)}, ` +
      `변 가나의 길이는 ${cm(ab)}입니다. 이 사각형에서 평행한 두 변의 길이의 합은 몇 cm입니까?`,
    cm(ad + bc),
    `변 가라와 변 나다는 둘 다 변 가나와 수직이므로 서로 평행합니다. ` +
      `따라서 평행한 두 변의 길이의 합은 ${expr(`${ad}+${bc}=${ad + bc}`)}이므로 ${cm(ad + bc)}입니다.`,
  );
}

/** 포함 정의로 센 재고에서 두 쌍이 평행한 하위 집합을 빼, 정확히 한 쌍을 찾는다. */
function exactlyOneParallelPair(unit: UnitSeed, rng: Rng): ElemProblem {
  const onePair = intBetween(rng, 2, 15);
  const twoPairs = intBetween(rng, 1, 9);
  const noPair = intBetween(rng, 1, 8);
  const trapezoids = onePair + twoPairs;
  return make(
    unit,
    `여기서는 마주 보는 변 중 적어도 한 쌍이 평행한 사각형을 모두 사다리꼴로 셉니다. ` +
      `서로 다른 사각형 카드 ${n(trapezoids + noPair)}장 중 사다리꼴은 ${n(trapezoids)}장입니다. ` +
      `전체 카드 중 마주 보는 변 두 쌍이 모두 평행한 카드는 ${n(twoPairs)}장입니다. ` +
      `평행한 변이 정확히 한 쌍만 있는 카드는 몇 장입니까?`,
    `${n(onePair)}장`,
    `마주 보는 변 두 쌍이 모두 평행한 카드도 이 문제의 정의에서는 사다리꼴에 들어갑니다. ` +
      `사다리꼴 수에서 그 카드 수를 빼면 정확히 한 쌍만 평행한 카드 수입니다. ` +
      `${expr(`${trapezoids}-${twoPairs}=${onePair}`)}이므로 ${n(onePair)}장입니다.`,
  );
}

/** 미확인 조건을 거짓으로 취급하지 않고 가능한 개수의 두 끝을 구한다. */
function incompleteTrapezoidInspection(unit: UnitSeed, rng: Rng): ElemProblem {
  const confirmed = intBetween(rng, 1, 9);
  const rejected = intBetween(rng, 1, 7);
  const unknown = intBetween(rng, 1, 8);
  const total = confirmed + rejected + unknown;
  return make(
    unit,
    `여기서는 마주 보는 변 중 적어도 한 쌍이 평행한 사각형을 사다리꼴로 셉니다. ` +
      `사각형 카드 ${n(total)}장을 검사했습니다. ${n(confirmed)}장은 평행한 변이 한 쌍 이상 있음이 확인되었고, ` +
      `${n(rejected)}장은 마주 보는 어느 쌍도 평행하지 않음이 확인되었습니다. ` +
      `나머지 ${n(unknown)}장은 마주 보는 한 쌍이 평행하지 않음을 확인했지만 다른 한 쌍은 아직 검사하지 않았습니다. ` +
      `전체에서 사다리꼴은 적어도 몇 장이고 많아야 몇 장입니까? 이 순서대로 쓰시오.`,
    `적어도 ${n(confirmed)}장, 많아야 ${n(confirmed + unknown)}장`,
    `한 쌍 이상 평행하다고 확인된 ${n(confirmed)}장은 반드시 사다리꼴입니다. ` +
      `마주 보는 어느 쌍도 평행하지 않은 ${n(rejected)}장은 사다리꼴이 아닙니다. ` +
      `미검사한 쌍이 있는 ${n(unknown)}장은 모두 사다리꼴이 아닐 수도, 모두 사다리꼴일 수도 있습니다. ` +
      `따라서 적어도 ${n(confirmed)}장이고, 많아야 ${expr(`${confirmed}+${unknown}=${confirmed + unknown}`)}이므로 ` +
      `${n(confirmed + unknown)}장입니다.`,
  );
}

/** ID는 이 회차 전체에서 31~39를 한 번씩 쓴다. 01~12 · 21~와 겹치지 않는다. */
export const REINFORCEMENT_FORMS_20261018: Record<string, readonly ElemForm[]> =
  {
    "초4|2-2-3": [
      { id: "31", tier: "응용", generate: joinedEquilateral },
      { id: "32", tier: "기본", generate: splitEquilateralAngle },
    ],
    "초4|2-2-5": [
      {
        id: "33",
        tier: "응용",
        allowMultipleChoice: false,
        generate: admissibleBaseAngles,
      },
      { id: "34", tier: "응용", generate: classificationIntersection },
    ],
    "초4|2-4-2": [
      { id: "35", tier: "응용", generate: parallelPairs },
      { id: "36", tier: "응용", generate: perpendicularGridIntersections },
    ],
    "초4|2-4-4": [
      { id: "37", tier: "응용", generate: rightCornerTrapezoid },
      { id: "38", tier: "응용", generate: exactlyOneParallelPair },
      {
        id: "39",
        tier: "응용",
        allowMultipleChoice: false,
        generate: incompleteTrapezoidInspection,
      },
    ],
  };

export function reinforcementForms20261018(
  unit: UnitSeed,
): readonly ElemForm[] {
  return REINFORCEMENT_FORMS_20261018[tierKey(unit)] ?? [];
}
