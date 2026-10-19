import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { ELEMENTARY_FIGURE_POLICY } from "../../src/lib/arithmetic-v2/presentation/figurePolicyElementary";
import type { ArithmeticV2Prompt } from "../../src/lib/arithmetic-v2/types";

// This oracle receives only public prose, instruction and output unit. It never
// receives parameters, SVG, production solve/holds, or the expected answer.
type PublicTask = { text: string; instruction: string; unit: string };
type Oracle = (task: PublicTask) => number;
const oracles = new Map<string, Oracle>();
const N = "(\\d+(?:\\.\\d+)?)";
function rule(
  id: string,
  text: string,
  target: RegExp,
  unit: string | ((captures: string[]) => string),
  solve: (captures: string[]) => number,
) {
  assert(!oracles.has(id), `Duplicate oracle ${id}`);
  const pattern = new RegExp(`^(?:${text})$`);
  oracles.set(id, (task) => {
    const match = pattern.exec(task.text);
    assert(match, `${id}: incomplete givens: ${task.text}`);
    assert.match(task.instruction, target, `${id}: changed target`);
    const captures = match.slice(1);
    assert.equal(task.unit, typeof unit === "string" ? unit : unit(captures));
    return solve(captures);
  });
}
const numberRule = (
  id: string,
  title: string,
  givens: string,
  target: RegExp,
  unit: string,
  solve: (values: number[]) => number,
) => rule(id, `${title}: ${givens}`, target, unit, (c) => solve(c.map(Number)));

const conversions = [
  ["e2-length-m-cm", "m", "cm", 100],
  ["e3-length-cm-mm", "cm", "mm", 10],
  ["e3-length-km-m", "km", "m", 1000],
  ["e3-capacity-l-ml", "L", "mL", 1000],
  ["e5-area-m2-cm2", "m²", "cm²", 10000],
  ["e5-area-km2-m2", "km²", "m²", 1000000],
  ["e6-volume-m3-cm3", "m³", "cm³", 1000000],
  ["e6-volume-decimal-units", "m³", "cm³", 1000000],
] as const;
for (const [id, large, small, factor] of conversions) {
  const title =
    id === "e6-volume-decimal-units"
      ? "소수인 부피 단위 바꾸기"
      : `${large}와 ${small} 단위 바꾸기`;
  rule(
    id,
    `${title}: ${N} (${large}|${small})`,
    /단위로 나타내세요\.$/,
    (c) => (c[1] === large ? small : large),
    (c) => Number(c[0]) * (c[1] === large ? factor : 1 / factor),
  );
}
for (const [id, large, small, factor] of [
  ["e2-length-mixed-cm", "m", "cm", 100],
  ["e3-length-mixed-mm", "cm", "mm", 10],
  ["e3-length-mixed-m", "km", "m", 1000],
  ["e3-capacity-mixed-ml", "L", "mL", 1000],
] as const) {
  numberRule(
    id,
    `복합 단위를 ${small}로 바꾸기`,
    `${N} ${large} ${N} ${small}`,
    new RegExp(`^${small} 단위로 나타내세요\\.$`),
    small,
    ([a, b]) => a * factor + b,
  );
}
for (const [id, title, subtract] of [
  ["e2-length-sum", "두 길이의 합", false],
  ["e2-length-difference", "두 길이의 차", true],
  ["e2-length-broken", "꺾인 선의 길이", false],
] as const) {
  numberRule(
    id,
    title,
    `${N} cm, ${N} cm`,
    new RegExp(`^${title}[을를] 구하세요\\.$`),
    "cm",
    ([a, b]) => (subtract ? a - b : a + b),
  );
}
for (const [suffix, name] of [
  ["sides", "변"],
  ["vertices", "꼭짓점"],
] as const) {
  rule(
    `e2-polygon-${suffix}-total`,
    `여러 도형의 ${name} 수: ([3-6]각형(?:, [3-6]각형){1,3})`,
    new RegExp(`^주어진 모든 도형의 ${name}의 수를 합하여 구하세요\\.$`),
    "개",
    ([list]) =>
      list.split(", ").reduce((sum, value) => sum + Number(value[0]), 0),
  );
}
numberRule(
  "e3-circle-radius",
  "지름에서 반지름",
  `지름 ${N} cm`,
  /^원의 반지름을 구하세요\.$/,
  "cm",
  ([diameter]) => diameter / 2,
);
numberRule(
  "e3-circle-diameter",
  "반지름에서 지름",
  `반지름 ${N} cm`,
  /^원의 지름을 구하세요\.$/,
  "cm",
  ([radius]) => radius * 2,
);
numberRule(
  "e5-unit-square-area",
  "단위 정사각형으로 넓이 구하기",
  `가로 ${N}칸, 세로 ${N}칸, 한 칸 ${N} cm²`,
  /^전체 넓이를 구하세요\.$/,
  "cm²",
  ([w, h, area]) => w * h * area,
);

rule(
  "e4-triangle-missing-angle",
  `주어진 각 ${N}°, ${N}°인 삼각형의 빈 각`,
  /^삼각형의 나머지 한 각의 크기를 구하세요\.$/,
  "°",
  ([a, b]) => 180 - Number(a) - Number(b),
);
rule(
  "e4-right-triangle-missing-angle",
  `주어진 각 ${N}°, (90)°인 삼각형의 빈 각`,
  /^직각삼각형의 나머지 예각의 크기를 구하세요\.$/,
  "°",
  ([a, b]) => 180 - Number(a) - Number(b),
);
numberRule(
  "e4-angle-sum",
  "각도의 합",
  `이웃한 두 각 ${N}°, ${N}°`,
  /^이웃한 두 각을 합한 전체 각의 크기를 구하세요\.$/,
  "°",
  ([a, b]) => a + b,
);
numberRule(
  "e4-angle-difference",
  "각도의 차",
  `전체 각 ${N}°, 작은 각 ${N}°`,
  /^전체 각에서 작은 각을 뺀 나머지 각의 크기를 구하세요\.$/,
  "°",
  ([whole, part]) => whole - part,
);
for (const [suffix, name, whole] of [
  ["right", "직각", 90],
  ["straight", "평각", 180],
  ["turn", "한 바퀴", 360],
] as const) {
  numberRule(
    `e4-angle-${suffix}-remainder`,
    `${name}에서 남은 각`,
    `${name} (${whole})°, 주어진 각 ${N}°`,
    new RegExp(`^${name}에서 주어진 각을 뺀 나머지 각의 크기를 구하세요\\.$`),
    "°",
    ([full, part]) => full - part,
  );
}
numberRule(
  "e4-quadrilateral-missing-angle",
  "사각형의 빈 각",
  `세 각 ${N}°, ${N}°, ${N}°`,
  /^사각형의 나머지 한 각의 크기를 구하세요\.$/,
  "°",
  (angles) => 360 - angles.reduce((a, b) => a + b, 0),
);
numberRule(
  "e4-isosceles-base-angle",
  "이등변삼각형의 밑각",
  `꼭지각 ${N}°`,
  /^이등변삼각형의 한 밑각의 크기를 구하세요\.$/,
  "°",
  ([apex]) => (180 - apex) / 2,
);
numberRule(
  "e4-isosceles-apex-angle",
  "이등변삼각형의 꼭지각",
  `밑각 ${N}°`,
  /^이등변삼각형의 꼭지각의 크기를 구하세요\.$/,
  "°",
  ([base]) => 180 - 2 * base,
);

for (const [shape, name, givenSide, targetSide] of [
  ["rectangle", "직사각형", "세로", "가로"],
  ["parallelogram", "평행사변형", "옆변", "밑변"],
] as const) {
  numberRule(
    `e5-${shape}-perimeter`,
    `${name}의 둘레`,
    `이웃한 두 변 ${N} cm, ${N} cm`,
    new RegExp(`^${name}의 둘레를 구하세요\\.$`),
    "cm",
    ([a, b]) => 2 * (a + b),
  );
  numberRule(
    `e5-${shape}-perimeter-side`,
    `${name}의 둘레에서 한 변`,
    `둘레 ${N} cm, ${givenSide} ${N} cm`,
    new RegExp(
      `^${name}의 ${targetSide}${shape === "parallelogram" ? "의 길이" : ""}를 구하세요\\.$`,
    ),
    "cm",
    ([perimeter, side]) => perimeter / 2 - side,
  );
}
for (const [shape, name] of [
  ["square", "정사각형"],
  ["rhombus", "마름모"],
] as const) {
  numberRule(
    `e5-${shape}-perimeter`,
    `${name}의 둘레`,
    `한 변 ${N} cm`,
    new RegExp(`^${name}의 둘레를 구하세요\\.$`),
    "cm",
    ([side]) => 4 * side,
  );
  numberRule(
    `e5-${shape}-perimeter-side`,
    `${name}의 둘레에서 한 변`,
    `둘레 ${N} cm`,
    new RegExp(`^${name}의 한 변의 길이를 구하세요\\.$`),
    "cm",
    ([perimeter]) => perimeter / 4,
  );
}
const polygonSides: Record<string, number> = {
  삼: 3,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
};
rule(
  "e5-regular-polygon-perimeter",
  `정다각형의 둘레: 정([삼오육칠팔])각형, 한 변 ${N} cm`,
  /^정다각형의 둘레를 구하세요\.$/,
  "cm",
  ([name, side]) => polygonSides[name] * Number(side),
);
rule(
  "e5-regular-polygon-perimeter-side",
  `정다각형의 둘레에서 한 변: 정([삼오육칠팔])각형, 둘레 ${N} cm`,
  /^정다각형의 한 변의 길이를 구하세요\.$/,
  "cm",
  ([name, perimeter]) => Number(perimeter) / polygonSides[name],
);
numberRule(
  "e5-triangle-perimeter",
  "삼각형의 둘레",
  `세 변 ${N} cm, ${N} cm, ${N} cm`,
  /^삼각형의 둘레를 구하세요\.$/,
  "cm",
  (sides) => sides.reduce((a, b) => a + b, 0),
);
numberRule(
  "e5-triangle-perimeter-side",
  "삼각형의 둘레에서 한 변",
  `둘레 ${N} cm, 두 변 ${N} cm, ${N} cm`,
  /^삼각형의 나머지 한 변의 길이를 구하세요\.$/,
  "cm",
  ([perimeter, a, b]) => perimeter - a - b,
);
numberRule(
  "e5-rectangle-area",
  "직사각형의 넓이",
  `가로 ${N} cm, 세로 ${N} cm`,
  /^직사각형의 넓이를 구하세요\.$/,
  "cm²",
  ([w, h]) => w * h,
);
numberRule(
  "e5-rectangle-area-side",
  "직사각형의 넓이에서 가로",
  `넓이 ${N} cm², 세로 ${N} cm`,
  /^직사각형의 가로를 구하세요\.$/,
  "cm",
  ([area, h]) => area / h,
);
numberRule(
  "e5-square-area",
  "정사각형의 넓이",
  `한 변 ${N} cm`,
  /^정사각형의 넓이를 구하세요\.$/,
  "cm²",
  ([side]) => side ** 2,
);
numberRule(
  "e5-square-area-side",
  "정사각형의 넓이에서 한 변",
  `넓이 ${N} cm²`,
  /^정사각형의 한 변의 길이를 구하세요\.$/,
  "cm",
  ([area]) => Math.sqrt(area),
);
for (const [shape, name, multiplier] of [
  ["triangle", "삼각형", 2],
  ["parallelogram", "평행사변형", 1],
] as const) {
  numberRule(
    `e5-${shape}-area`,
    `${name}의 넓이`,
    `밑변 ${N} cm, 높이 ${N} cm`,
    new RegExp(`^${name}의 넓이를 구하세요\\.$`),
    "cm²",
    ([base, h]) => (base * h) / multiplier,
  );
  numberRule(
    `e5-${shape}-area-base`,
    `${name}의 넓이에서 밑변`,
    `넓이 ${N} cm², 높이 ${N} cm`,
    new RegExp(`^${name}의 밑변의 길이를 구하세요\\.$`),
    "cm",
    ([area, h]) => (area * multiplier) / h,
  );
  numberRule(
    `e5-${shape}-area-height`,
    `${name}의 넓이에서 높이`,
    `넓이 ${N} cm², 밑변 ${N} cm`,
    new RegExp(`^${name}의 높이를 구하세요\\.$`),
    "cm",
    ([area, base]) => (area * multiplier) / base,
  );
}
numberRule(
  "e5-rhombus-area",
  "마름모의 넓이",
  `두 대각선 ${N} cm, ${N} cm`,
  /^마름모의 넓이를 구하세요\.$/,
  "cm²",
  ([a, b]) => (a * b) / 2,
);
numberRule(
  "e5-rhombus-area-diagonal",
  "마름모의 넓이에서 대각선",
  `넓이 ${N} cm², 세로 대각선 ${N} cm`,
  /^가로 대각선의 길이를 구하세요\.$/,
  "cm",
  ([area, vertical]) => (area * 2) / vertical,
);
numberRule(
  "e5-trapezoid-area",
  "사다리꼴의 넓이",
  `윗변 ${N} cm, 아랫변 ${N} cm, 높이 ${N} cm`,
  /^사다리꼴의 넓이를 구하세요\.$/,
  "cm²",
  ([a, b, h]) => ((a + b) * h) / 2,
);
numberRule(
  "e5-trapezoid-area-height",
  "사다리꼴의 넓이에서 높이",
  `넓이 ${N} cm², 윗변 ${N} cm, 아랫변 ${N} cm`,
  /^사다리꼴의 높이를 구하세요\.$/,
  "cm",
  ([area, a, b]) => (area * 2) / (a + b),
);
numberRule(
  "e5-trapezoid-area-top",
  "사다리꼴의 넓이에서 윗변",
  `넓이 ${N} cm², 아랫변 ${N} cm, 높이 ${N} cm`,
  /^사다리꼴의 윗변의 길이를 구하세요\.$/,
  "cm",
  ([area, bottom, h]) => (area * 2) / h - bottom,
);
numberRule(
  "e5-trapezoid-area-bottom",
  "사다리꼴의 넓이에서 아랫변",
  `넓이 ${N} cm², 윗변 ${N} cm, 높이 ${N} cm`,
  /^사다리꼴의 아랫변의 길이를 구하세요\.$/,
  "cm",
  ([area, top, h]) => (area * 2) / h - top,
);

for (const [quantity, grade, name, unit] of [
  ["edges", 5, "모든 모서리 길이의 합", "cm"],
  ["surface", 6, "겉넓이", "cm²"],
  ["volume", 6, "부피", "cm³"],
] as const) {
  const target = new RegExp(`^직육면체의 ${name}[을를] 구하세요\\.$`);
  numberRule(
    `e${grade}-cuboid-${quantity}`,
    `직육면체의 ${name}`,
    `가로 ${N} cm, 세로 ${N} cm, 높이 ${N} cm`,
    target,
    unit,
    ([w, d, h]) =>
      quantity === "edges"
        ? 4 * (w + d + h)
        : quantity === "surface"
          ? 2 * (w * d + w * h + d * h)
          : w * d * h,
  );
  numberRule(
    `e${grade}-cuboid-${quantity}-height`,
    `직육면체의 ${name}에서 높이`,
    `가로 ${N} cm, 세로 ${N} cm, ${name} ${N} ${unit}`,
    /^직육면체의 높이를 구하세요\.$/,
    "cm",
    ([w, d, total]) =>
      quantity === "edges"
        ? total / 4 - w - d
        : quantity === "surface"
          ? (total / 2 - w * d) / (w + d)
          : total / (w * d),
  );
  numberRule(
    `e${grade}-cube-${quantity}`,
    `정육면체의 ${name}`,
    `한 모서리 ${N} cm`,
    new RegExp(`^정육면체의 ${name}[을를] 구하세요\\.$`),
    unit,
    ([side]) =>
      quantity === "edges"
        ? side * 12
        : quantity === "surface"
          ? side ** 2 * 6
          : side ** 3,
  );
  numberRule(
    `e${grade}-cube-${quantity}-side`,
    `정육면체의 ${name}에서 모서리`,
    `${name} ${N} ${unit}`,
    /^정육면체의 한 모서리의 길이를 구하세요\.$/,
    "cm",
    ([total]) =>
      quantity === "edges"
        ? total / 12
        : quantity === "surface"
          ? Math.sqrt(total / 6)
          : Math.cbrt(total),
  );
}
numberRule(
  "e6-cuboid-base-volume",
  "밑넓이와 높이로 직육면체의 부피",
  `밑넓이 ${N} cm², 높이 ${N} cm`,
  /^직육면체의 부피를 구하세요\.$/,
  "cm³",
  ([base, height]) => base * height,
);
numberRule(
  "e6-cuboid-base-height",
  "직육면체의 부피와 밑넓이에서 높이",
  `밑넓이 ${N} cm², 부피 ${N} cm³`,
  /^직육면체의 높이를 구하세요\.$/,
  "cm",
  ([base, volume]) => volume / base,
);
for (const [suffix, given, target, givenUnit, answerUnit, solve] of [
  [
    "circumference-radius",
    "반지름",
    "원주",
    "cm",
    "cm",
    (r: number, pi: number) => 2 * r * pi,
  ],
  [
    "circumference-diameter",
    "지름",
    "원주",
    "cm",
    "cm",
    (d: number, pi: number) => d * pi,
  ],
  [
    "area-radius",
    "반지름",
    "넓이",
    "cm",
    "cm²",
    (r: number, pi: number) => r * r * pi,
  ],
  [
    "area-diameter",
    "지름",
    "넓이",
    "cm",
    "cm²",
    (d: number, pi: number) => (d * d * pi) / 4,
  ],
  [
    "radius-circumference",
    "원주",
    "반지름",
    "cm",
    "cm",
    (c: number, pi: number) => c / (2 * pi),
  ],
  [
    "diameter-circumference",
    "원주",
    "지름",
    "cm",
    "cm",
    (c: number, pi: number) => c / pi,
  ],
  [
    "radius-area",
    "넓이",
    "반지름",
    "cm²",
    "cm",
    (a: number, pi: number) => Math.sqrt(a / pi),
  ],
  [
    "diameter-area",
    "넓이",
    "지름",
    "cm²",
    "cm",
    (a: number, pi: number) => Math.sqrt(a / pi) * 2,
  ],
] as const) {
  numberRule(
    `e6-circle-${suffix}`,
    `원의 ${given}에서 ${target}`,
    `${given} ${N} ${givenUnit}, 원주율 ${N}`,
    new RegExp(`^원의 ${target}[을를] 구하세요\\. \\(원주율: (?:3|3\\.14)\\)$`),
    answerUnit,
    ([value, pi]) => solve(value, pi),
  );
}
rule(
  "e6-cylinder-net-area",
  `원기둥의 옆면을 펼친 직사각형의 넓이: 밑면 (반지름|지름) ${N} cm, 높이 ${N} cm, 원주율 ${N}`,
  /^원기둥의 옆면을 펼친 직사각형의 넓이를 구하세요\. \(원주율: (?:3|3\.14)\)$/,
  "cm²",
  ([kind, value, height, pi]) =>
    (kind === "반지름" ? 2 : 1) * Number(value) * Number(pi) * Number(height),
);
rule(
  "e6-cylinder-net-area-height",
  `원기둥의 옆면 넓이에서 높이: 옆면 넓이 ${N} cm², 밑면 (반지름|지름) ${N} cm, 원주율 ${N}`,
  /^원기둥의 높이를 구하세요\.$/,
  "cm",
  ([area, kind, value, pi]) =>
    Number(area) / ((kind === "반지름" ? 2 : 1) * Number(value) * Number(pi)),
);
numberRule(
  "e6-cylinder-net-area-radius",
  "원기둥의 옆면 넓이에서 밑면의 반지름",
  `옆면 넓이 ${N} cm², 높이 ${N} cm, 원주율 ${N}`,
  /^원기둥의 밑면의 반지름을 구하세요\.$/,
  "cm",
  ([area, height, pi]) => area / (2 * height * pi),
);
numberRule(
  "e6-cylinder-net-area-diameter",
  "원기둥의 옆면 넓이에서 밑면의 지름",
  `옆면 넓이 ${N} cm², 높이 ${N} cm, 원주율 ${N}`,
  /^원기둥의 밑면의 지름을 구하세요\.$/,
  "cm",
  ([area, height, pi]) => area / (height * pi),
);

const definitions = arithmeticV2Definitions();
const elementary = definitions.filter((d) => d.grade.startsWith("초"));
// Source coverage guards the nonfigure families without traversing their very
// large arithmetic domains. A new conditional writer requires a new review.
for (const directory of ["elementary", "elementaryComplete"]) {
  const base = resolve(`src/lib/arithmetic-v2/families/${directory}`);
  for (const file of readdirSync(base, { recursive: true })) {
    if (typeof file === "string" && file.endsWith(".ts")) {
      assert(
        !/figureId/.test(readFileSync(resolve(base, file), "utf8")),
        `New figure writer: ${directory}/${file}`,
      );
    }
  }
}
const hasFigure = (p: ArithmeticV2Prompt) =>
  p.layout === "math" && Boolean(p.figureId);
// Each nonfigure elementary source has no figure writer. Check representative
// domains as a registry guard; exhaustively check all figure-bearing domains below.
const figures = elementary.filter((d) =>
  [0, Math.floor(d.domainSize / 2), d.domainSize - 1].some((i) =>
    hasFigure(d.problemAt(i).prompt),
  ),
);
const policy = new Map(ELEMENTARY_FIGURE_POLICY.map((p) => [p.typeId, p]));
assert.equal(policy.size, ELEMENTARY_FIGURE_POLICY.length);
assert.equal(policy.size, 84);
assert.deepEqual([...policy.keys()].sort(), figures.map((d) => d.id).sort());
assert.deepEqual([...policy.keys()].sort(), [...oracles.keys()].sort());
for (const a of policy.values())
  for (const b of policy.values()) {
    if (a !== b)
      assert(
        !a.figureIdPrefix.startsWith(b.figureIdPrefix),
        `Ambiguous prefix: ${a.typeId}/${b.typeId}`,
      );
  }
const census: {
  id: string;
  grade: string;
  count: number;
  example: PublicTask;
}[] = [];
let candidates = 0;
let deletedGivensRejected = 0;
let deletedTargetsRejected = 0;
for (const definition of figures) {
  const item = policy.get(definition.id)!;
  const oracle = oracles.get(definition.id)!;
  assert.equal(item.showFigure, false);
  assert(item.reason.trim());
  let example: PublicTask | undefined;
  for (let index = 0; index < definition.domainSize; index++) {
    const candidate = definition.problemAt(index);
    const before = JSON.stringify(candidate);
    const prompt = candidate.prompt;
    assert(prompt.layout === "math" && prompt.figureId);
    assert(prompt.figureId.startsWith(item.figureIdPrefix));
    const task = {
      text: prompt.text,
      instruction: item.instruction ?? prompt.instruction ?? "",
      unit: prompt.answerUnit ?? "°",
    };
    assert(
      !/겨냥도|그림|숫자가 없는|표시|가운데|바깥쪽|호의|큰 호/.test(
        `${task.text} ${task.instruction}`,
      ),
      `${definition.id}: dangling diagram reference`,
    );
    // Conversion targets depend on direction: check the actual requested unit.
    if (conversions.some(([id]) => id === definition.id))
      assert.equal(task.instruction, `${task.unit} 단위로 나타내세요.`);
    // Pi duplicated in retained instruction must agree with the public given.
    if (task.instruction.includes("원주율:"))
      assert.equal(
        /원주율: (3(?:\.14)?)/.exec(task.instruction)?.[1],
        /원주율 (3(?:\.14)?)/.exec(task.text)?.[1],
      );
    const expected = oracle(task);
    const actual =
      Number(candidate.answer.exact[0]) /
      (candidate.answer.kind === "decimal"
        ? 10 ** Number(candidate.answer.exact[1])
        : 1);
    assert(Number.isFinite(expected));
    assert(
      Math.abs(actual - expected) < 1e-8,
      `${definition.id}/${index}: public prose ${expected}, stored answer ${actual}`,
    );
    assert(definition.verify(candidate));
    assert.equal(
      JSON.stringify(candidate),
      before,
      "Audit mutated canonical candidate",
    );
    // Demonstrate that every written numeric given is consumed, including pi,
    // polygon multiplicity, 90/180/360 and unit-square area, not just snapshots.
    const numbers = [...task.text.matchAll(/\d+(?:\.\d+)?/g)];
    for (const value of numbers) {
      const position = value.index!;
      assert.throws(() =>
        oracle({
          ...task,
          text:
            task.text.slice(0, position) +
            task.text.slice(position + value[0].length),
        }),
      );
      deletedGivensRejected++;
    }
    assert.throws(() => oracle({ ...task, instruction: "" }));
    deletedTargetsRejected++;
    example ??= task;
    candidates++;
  }
  census.push({
    id: definition.id,
    grade: definition.grade,
    count: definition.domainSize,
    example: example!,
  });
}
assert.equal(candidates, 11822);
const byGrade = Object.fromEntries(
  ["초1", "초2", "초3", "초4", "초5", "초6"].map((grade) => {
    const rows = census.filter((r) => r.grade === grade);
    return [
      grade,
      {
        families: rows.length,
        candidates: rows.reduce((sum, r) => sum + r.count, 0),
      },
    ];
  }),
);
const summary = {
  base: "9356d1cb6",
  registryFamilies: definitions.length,
  elementaryFamilies: elementary.length,
  figureFamilies: figures.length,
  omitted: figures.length,
  retained: 0,
  instructionOverrides: ELEMENTARY_FIGURE_POLICY.filter(
    (p) => p.instruction !== undefined,
  ).length,
  candidates,
  deletedGivensRejected,
  deletedTargetsRejected,
  byGrade,
};
console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes("--report")) {
  const intro = `Elementary arithmetic-v2 figure necessity audit — 2026-10-15

Base: main 9356d1cb6. Decision: omit all 84 elementary figure families;
retain none. The 11,822 finite candidates have complete public prose.
Policy is display-only. Root owns integration, typography and wording.
Canonical prompts, parameters, answers, IDs, schemas and assets are untouched.
Each record includes an exact, mutually unambiguous canonical figureIdPrefix.
For the two legacy angle families root MUST display prompt.text when omitting
the figure; the old geometry helper suppresses those complete givens.

Census and review scope
All 649 registry definitions inspected for grade/figure coverage; 248 are
elementary. The 84 figure families comprise 82 geometryElementary definitions
plus e4-triangle-missing-angle and e4-right-triangle-missing-angle.
Complete templates/domains read: families/geometry.ts and geometryElementary/
core.ts, measurement.ts, angles.ts, plane.ts, solidsCircle.ts and net.ts.
Figure-writer source search confirms elementary/ and elementaryComplete/ have
no figureId writers; remaining geometry cores instantiate middle-school grades.
QA checks first/middle/last registry candidates and every candidate of every
elementary figure family. This does not enumerate huge nonfigure domains.

Independent preservation proof
An independently authored public-prose oracle parses shape/relationship,
every named given and target/unit for every candidate. It receives no hidden
parameters, SVG, solve/holds function or expected answer. Its result matches
the stored exact answer for all 11,822 candidates (numeric tolerance 1e-8 for
decimal parsing and square/cube roots); canonical verify also passes.
Deleting each numeric given and deleting the target instruction is rejected.
Polygon multiplicity, all conversion directions, both net radius/diameter
modes, pi=3/3.14, inverse quantities and reflex turn remainders are covered.
Static instruction changes remove visual references while retaining target;
net inverse pi remains in unmodified prompt.text. Isosceles equality follows
from the stated isosceles shape; no extra equality condition is invented.

Dimension / annotation findings (retained families: none)
No elementary retained-family dimension or annotation work remains.
e5-trapezoid-area-bottom: the 아랫변 target dimension and repeated 넓이 note
add nothing to the given area/top/height and explicit bottom target.
e5-trapezoid-area-top and e5-trapezoid-area-height: target dimension labels
and repeated area notes likewise add no conditions. e5-trapezoid-area already
states all three measurements; its three figure dimensions are duplicates.
Repeated plane-area notes occur in e5-rectangle-area-side, e5-square-area-side,
e5-triangle-area-base, e5-triangle-area-height, e5-parallelogram-area-base,
e5-parallelogram-area-height, e5-rhombus-area-diagonal and the three trapezoid
inverse IDs above. Entire figures are omitted, so no canonical SVG edits.
e5-unit-square-area repeats 한 칸 1 cm² in text, instruction and figure;
the figure is omitted and instruction is shortened to 전체 넓이를 구하세요.
e5-parallelogram-perimeter-side instruction corrects 밑변를 to 밑변의 길이를.
e6-cuboid-surface-height, e6-cube-surface-side repeat given surface area;
e6-cuboid-base-volume and e6-cuboid-base-height repeat given base area;
e6-circle-radius-area and e6-circle-diameter-area repeat given circle area;
e6-cylinder-net-area-height, e6-cylinder-net-area-radius and
e6-cylinder-net-area-diameter repeat given lateral area. These figures all go.
14 solid-family instructions contained 겨냥도; all have exact replacements.
Additional replacements remove polygon 그림, angle arc/blank/tick references,
triangle-perimeter marked-base references and the net's 가운데 직사각형.
No general instruction override is used on bidirectional unit conversions.

Reproduce from this checkout using the existing installation (Node 24):
  node scripts/qa/arithmetic-figure-necessity-elementary-run.mjs C:/Creative/testautocreator --report
  node scripts/qa/arithmetic-figure-necessity-elementary-run.mjs C:/Creative/testautocreator --typecheck
Strict focused TypeScript passed for policy, QA and their imported dependencies.
No browser test is claimed: this worker supplies data classification and proof;
root owns rendering/projection integration and its screen/print verification.

Verification summary
${JSON.stringify(summary, null, 2)}

Explicit-ID census (all OMIT; count is the complete finite domain)
`;
  const rows = census
    .map(
      (r) =>
        `${r.id} | ${r.grade} | ${r.count} | OMIT | ${r.example.text} → ${r.example.instruction}`,
    )
    .join("\n");
  writeFileSync(
    resolve("docs/reports/arithmetic-figure-necessity-elementary-20261015.txt"),
    `${intro}${rows}\n`,
    "utf8",
  );
}
