/* Exhaustive, offline audit. Uses installed tools; creates no dependency links.
 * The independent oracle below reads prose, never parameters, SVG coordinates,
 * generator solve/relation functions, or the policy reason as mathematical input.
 * node scripts/qa/arithmetic-figure-necessity-middle-audit.cjs [--write-report]
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const workspace = path.resolve(__dirname, "../..");
const toolsRoot = "C:/Creative/testautocreator";
const toolRequire = Module.createRequire(path.join(toolsRoot, "package.json"));
const modulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function (directory) {
  return [
    ...modulePaths.call(this, directory),
    path.join(toolsRoot, "node_modules"),
  ];
};
toolRequire("tsx/cjs");
const { arithmeticV2Definitions } = require(
  path.join(workspace, "src/lib/arithmetic-v2/registry"),
);
const { MIDDLE_FIGURE_POLICY } = require(
  path.join(workspace, "src/lib/arithmetic-v2/presentation/figurePolicyMiddle"),
);
const { TRIANGLE_GEOMETRY_FIGURES } = require(
  path.join(workspace, "src/lib/arithmetic-v2/families/geometryTriangles"),
);
const { MEASUREMENT_GEOMETRY_FIGURES } = require(
  path.join(workspace, "src/lib/arithmetic-v2/families/geometryMeasure"),
);
const { presentArithmeticSegmentSvg } = require(
  path.join(workspace, "src/lib/arithmetic-v2/presentation/segments"),
);
const { presentArithmeticRemainingSvg } = require(
  path.join(workspace, "src/lib/arithmetic-v2/presentation/remaining"),
);

function readNumber(source, pattern, group = 1) {
  const m = source.match(pattern);
  assert(m, `Missing prose given ${pattern}: ${source}`);
  return Number(m[group]);
}
function quantity(s) {
  const m = s.match(/^(\d+)?(π)?(?:\/(\d+))?$/);
  assert(m, `Unsupported exact prose quantity: ${s}`);
  return (Number(m[1] || 1) * (m[2] ? Math.PI : 1)) / Number(m[3] || 1);
}
function answerValue(answer) {
  const [a, b, c, d] = answer.exact.map(Number);
  if (answer.kind === "integer") return a;
  if (answer.kind === "rational") return a / b;
  if (answer.kind === "surd") return (a * Math.sqrt(b)) / c;
  if (answer.kind === "polynomial") return a + (c * Math.PI) / d;
  throw new Error(`Unexpected answer kind ${answer.kind}`);
}
function close(actual, expected, context) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), context);
  assert(
    Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)),
    `${context}: ${actual} != ${expected}`,
  );
}
function requireText(text, ...conditions) {
  for (const condition of conditions)
    assert(text.includes(condition), `Missing ${condition}: ${text}`);
}

// Deliberately independent of family task implementations. Every branch checks
// the stated geometric relation and named target as well as numeric givens.
function proseAnswer(id, text, instruction) {
  const key = id.slice(3);
  const target = (...names) => requireText(instruction, ...names);
  const segment = (name) => readNumber(text, new RegExp(`${name}=(\\d+) cm`));
  const angle = (name) => readNumber(text, new RegExp(`∠${name}=(\\d+)°`));
  const measure = (name) => {
    const m = text.match(new RegExp(`${name}(?:는|=)? ?([0-9π/]+) cm`));
    assert(m, `Missing ${name}: ${text}`);
    return quantity(m[1]);
  };
  if (id.startsWith("m2-") && key.includes("circum")) {
    requireText(text, "삼각형 ABC의 외심은 O");
    if (key.startsWith("obtuse")) requireText(text, "둔각", "O는 BC의 바깥쪽");
    else if (key.includes("angle")) requireText(text, "예각삼각형");
    switch (key) {
      case "obtuse-circum-central-angle":
        target("∠BOC");
        requireText(text, "180°보다 작은");
        return 360 - 2 * angle("BAC");
      case "obtuse-circum-vertex-angle":
        target("∠BAC");
        requireText(text, "180°보다 작은");
        return 180 - angle("BOC") / 2;
      case "obtuse-circum-base-angle":
        target("∠OBC");
        return angle("BAC") - 90;
      case "circum-central-angle":
        target("∠BOC");
        return 2 * angle("BAC");
      case "circum-vertex-angle":
        target("∠BAC");
        return angle("BOC") / 2;
      case "circum-radius-base-angle":
        target("∠OBC");
        return (180 - angle("BOC")) / 2;
      case "circum-base-central-angle":
        target("∠BOC");
        return 180 - 2 * angle("OBC");
      case "circum-three-base-angles":
        target("∠OCA");
        return 90 - angle("OAB") - angle("OBC");
      case "circum-equal-radii":
        target("OB의 길이");
        return segment("OA");
      case "right-circumradius":
        target("OB의 길이");
        requireText(text, "∠ABC=90°");
        return segment("AC") / 2;
      case "right-circum-diameter":
        target("AC의 길이");
        requireText(text, "∠ABC=90°");
        return 2 * segment("OB");
    }
  }
  if (key.includes("incenter")) {
    requireText(text, "삼각형 ABC의 내심은 I");
    switch (key) {
      case "incenter-half-angle":
        target("∠BAI");
        return angle("BAC") / 2;
      case "incenter-whole-angle":
        target("∠BAC");
        return 2 * angle("BAI");
      case "incenter-central-angle":
        target("∠BIC");
        return 90 + angle("BAC") / 2;
      case "incenter-inverse-angle":
        target("∠BAC");
        return 2 * (angle("BIC") - 90);
      case "incenter-three-half-angles":
        target("∠ICA");
        return 90 - angle("BAI") - angle("IBC");
      case "iso-incenter-base-half":
        target("∠IBC");
        requireText(text, "AB=AC");
        return (180 - angle("BAC")) / 4;
      case "incenter-area":
        target("삼각형 ABC의 넓이");
        return (measure("내접원 반지름") * measure("둘레")) / 2;
      case "incenter-radius":
        target("내접원 반지름");
        return (2 * measure("넓이")) / measure("둘레");
      case "incenter-perimeter":
        target("삼각형 ABC의 둘레");
        return (2 * measure("넓이")) / measure("내접원 반지름");
      case "incenter-right-radius":
        target("내접원 반지름");
        requireText(text, "∠ACB=90°");
        return (segment("AC") + segment("BC") - segment("AB")) / 2;
    }
  }
  if (key.startsWith("centroid")) {
    requireText(text, "G는 삼각형 ABC의 무게중심");
    if (key === "centroid-median-sum") {
      requireText(text, "D, E, F는 각각 BC, CA, AB의 중점");
      target("AG+BG+CG");
      return (2 * readNumber(text, /AD\+BE\+CF=(\d+) cm/)) / 3;
    }
    requireText(text, "D는 BC의 중점");
    if (key.startsWith("centroid-area")) {
      const parts = key.endsWith("3") ? 3 : 6;
      target(parts === 3 ? "삼각형 GBC의 넓이" : "삼각형 GBD의 넓이");
      return measure("넓이") / parts;
    }
    const scales = {
      "centroid-vertex-from-short": ["GD", "AG", 2],
      "centroid-short-from-vertex": ["AG", "GD", 0.5],
      "centroid-vertex-from-median": ["AD", "AG", 2 / 3],
      "centroid-short-from-median": ["AD", "GD", 1 / 3],
      "centroid-median-from-vertex": ["AG", "AD", 1.5],
      "centroid-median-from-short": ["GD", "AD", 3],
    };
    const [given, wanted, factor] = scales[key];
    target(`${wanted}의 길이`);
    return segment(given) * factor;
  }
  if (
    [
      "triangle-midsegment",
      "midsegment-to-base",
      "midsegment-area-small",
      "midsegment-area-remainder",
    ].includes(key)
  ) {
    requireText(text, "D, E는 각각 AB, AC의 중점");
    if (key === "triangle-midsegment") {
      target("DE의 길이");
      return segment("BC") / 2;
    }
    if (key === "midsegment-to-base") {
      target("BC의 길이");
      return segment("DE") * 2;
    }
    target(key.endsWith("small") ? "삼각형 ADE의 넓이" : "사각형 DBCE의 넓이");
    return measure("넓이") * (key.endsWith("small") ? 1 / 4 : 3 / 4);
  }
  if (key.startsWith("midpoint-triangle-perimeter")) {
    requireText(text, "D, E, F는 각각 AB, AC, BC의 중점");
    const whole = key.endsWith("whole");
    requireText(text, `삼각형 ${whole ? "DEF" : "ABC"}의 둘레`);
    target(`삼각형 ${whole ? "ABC" : "DEF"}의 둘레`);
    return measure("둘레") * (whole ? 2 : 0.5);
  }
  if (key === "triangle-median-area") {
    requireText(text, "D는 BC의 중점");
    target("삼각형 ABD의 넓이");
    return measure("넓이") / 2;
  }
  if (key.startsWith("trapezoid-")) {
    requireText(text, "사다리꼴 ABCD");
    if (key === "trapezoid-parallel-section") {
      requireText(text, "E는 AB 위, F는 DC 위", "AD∥EF∥BC");
      target("EF의 길이");
      const p = readNumber(text, /AE:EB=(\d+):(\d+)/),
        q = readNumber(text, /AE:EB=(\d+):(\d+)/, 2);
      return (q * segment("AD") + p * segment("BC")) / (p + q);
    }
    requireText(text, "AD∥BC");
    if (key === "trapezoid-diagonal-midpoints") {
      requireText(text, "P, Q는 각각 AC, BD의 중점");
      target("PQ의 길이");
      return Math.abs(segment("BC") - segment("AD")) / 2;
    }
    requireText(text, "E, F는 각각 AB, DC의 중점");
    if (key === "trapezoid-base") {
      target("BC의 길이");
      return 2 * segment("EF") - segment("AD");
    }
    target("EF의 길이");
    return (segment("AD") + segment("BC")) / 2;
  }
  if (key.startsWith("similarity-")) {
    assert(
      /삼각형 ABC와 DEF는 이 순서로.*닮|닮은 두 삼각기둥의 대응하는 밑면은 ABC, DEF/.test(
        text,
      ),
      text,
    );
    if (key.includes("length-from-power")) {
      const power = key.endsWith("2") ? 2 : 3;
      const p = readNumber(text, /비는 (\d+):(\d+)/),
        q = readNumber(text, /비는 (\d+):(\d+)/, 2);
      target("DE ÷ AB");
      return (q / p) ** (1 / power);
    }
    const p = readNumber(text, /AB:DE=(\d+):(\d+)/),
      q = readNumber(text, /AB:DE=(\d+):(\d+)/, 2);
    if (key.includes("ratio-power")) {
      const power = Number(key.at(-1));
      target(
        power === 1
          ? "DE ÷ AB"
          : power === 2
            ? "삼각형 DEF 넓이 ÷ 삼각형 ABC 넓이"
            : "둘째 삼각기둥 부피 ÷ 첫째 삼각기둥 부피",
      );
      return (q / p) ** power;
    }
    if (key === "similarity-perimeter") {
      target("삼각형 DEF의 둘레");
      return (measure("둘레") * q) / p;
    }
    const reverse = key.endsWith("reduce"),
      power = key.includes("length") ? 1 : key.includes("area") ? 2 : 3;
    const given =
      power === 1
        ? segment(reverse ? "DE" : "AB")
        : measure(power === 2 ? "넓이" : "부피");
    target(
      power === 1
        ? `${reverse ? "AB" : "DE"}의 길이`
        : `${reverse ? "첫째" : "둘째"} 도형의 ${power === 2 ? "넓이" : "부피"}`,
    );
    return given * (reverse ? p / q : q / p) ** power;
  }
  if (key.startsWith("parallel-triangle")) {
    requireText(text, "D는 AB 위, E는 AC 위", "DE∥BC");
    const ratio = segment("DB") / segment("AD");
    if (key.endsWith("side-part")) {
      target("EC의 길이");
      return segment("AE") * ratio;
    }
    if (key.endsWith("base")) {
      target("BC의 길이");
      return segment("DE") * (1 + ratio);
    }
    target("AC의 길이");
    return segment("AE") * (1 + ratio);
  }
  if (key === "three-parallel-segments") {
    requireText(
      text,
      "세 평행선 AD, BE, CF",
      "A, B, C와 D, E, F는 각각 이 순서로 한 직선 위",
    );
    target("EF의 길이");
    return (segment("DE") * segment("BC")) / segment("AB");
  }
  if (key === "triangle-bisector-segment") {
    requireText(text, "AD는 ∠BAC의 이등분선", "D는 BC 위");
    target("BD의 길이");
    return (segment("BC") * segment("AB")) / (segment("AB") + segment("AC"));
  }
  if (key.startsWith("external-bisector")) {
    requireText(
      text,
      "BC를 C 쪽으로 연장",
      "AD는 외각 ∠XAC의 이등분선",
      "X는 BA를 A 쪽으로 연장",
    );
    const ab = segment("AB"),
      ac = segment("AC");
    if (key.endsWith("base")) {
      target("BC의 길이");
      return (segment("BD") * (ab - ac)) / ab;
    }
    target("CD의 길이");
    return (segment("BC") * ac) / (ab - ac);
  }
  if (key.startsWith("parallelogram")) {
    requireText(text, "평행사변형 ABCD");
    if (key.endsWith("adjacent")) {
      target("∠ABC");
      return 180 - angle("DAB");
    }
    requireText(text, "두 대각선의 교점은 O");
    if (key.endsWith("half")) {
      target("AO의 길이");
      return segment("AC") / 2;
    }
    if (key.endsWith("whole")) {
      target("AC의 길이");
      return segment("AO") * 2;
    }
    target("삼각형 AOB의 넓이");
    return measure("넓이") / 4;
  }
  if (key === "rectangle-diagonal-half") {
    requireText(text, "직사각형 ABCD의 대각선의 교점은 O");
    target("BO의 길이");
    return segment("AC") / 2;
  }
  if (key === "rhombus-diagonal-angle") {
    requireText(text, "마름모 ABCD");
    target("∠CAB");
    return angle("DAB") / 2;
  }
  if (key === "isosceles-trapezoid-angle") {
    requireText(text, "AD∥BC, AB=CD인 등변사다리꼴 ABCD");
    target("∠BAD");
    return 180 - angle("ABC");
  }
  if (key.startsWith("pythagoras")) {
    if (key.includes("isosceles-height")) {
      requireText(text, "이등변삼각형 ABC", "AD⊥BC");
      target("높이 AD의 길이");
      return Math.sqrt(
        readNumber(text, /AB=AC=(\d+) cm/) ** 2 - (segment("BC") / 2) ** 2,
      );
    }
    if (key.includes("rhombus-side")) {
      requireText(text, "마름모 ABCD");
      target("AB의 길이");
      return Math.hypot(segment("AC") / 2, segment("BD") / 2);
    }
    if (key.includes("rectangle")) {
      requireText(text, "직사각형 ABCD");
      if (key.includes("diagonal")) {
        target("AC의 길이");
        return Math.hypot(segment("AB"), segment("BC"));
      }
      target("BC의 길이");
      return Math.sqrt(segment("AC") ** 2 - segment("AB") ** 2);
    }
    requireText(text, "∠ABC=90°");
    if (key.includes("hypotenuse")) {
      target("AC의 길이");
      return Math.hypot(segment("AB"), segment("BC"));
    }
    target("AB의 길이");
    return Math.sqrt(segment("AC") ** 2 - segment("BC") ** 2);
  }
  if (key === "right-radius-from-legs") {
    requireText(text, "∠ABC=90°", "외심은 O");
    target("외접원 반지름");
    return Math.hypot(segment("AB"), segment("BC")) / 2;
  }
  if (key === "right-triangle-area") {
    requireText(text, "∠ABC=90°");
    target("삼각형 ABC의 넓이");
    return (
      (segment("AB") * Math.sqrt(segment("AC") ** 2 - segment("AB") ** 2)) / 2
    );
  }
  if (key === "same-height-area-ratio") {
    requireText(text, "D는 BC 위", "삼각형 ABD의 넓이");
    target("삼각형 ADC의 넓이");
    return (measure("넓이") * segment("DC")) / segment("BD");
  }
  if (key === "triangle-exterior") {
    target("외각의 크기");
    requireText(text, "떨어진 두 내각");
    const m = text.match(/두 내각이 (\d+)°, (\d+)°/);
    assert(m);
    return Number(m[1]) + Number(m[2]);
  }
  if (key.startsWith("polygon")) {
    const n = readNumber(text, /(\d+)각형/);
    if (key === "polygon-vertex-diagonals") {
      requireText(text, "한 꼭짓점에서 대각선을 모두");
      target("한 꼭짓점", "대각선의 개수");
      return n - 3;
    }
    if (key === "polygon-fan-triangles") {
      requireText(text, "한 꼭짓점에서 대각선을 모두");
      target("나누어진 삼각형의 개수");
      return n - 2;
    }
    if (key === "polygon-sum") {
      target("내각의 크기의 합");
      return 180 * (n - 2);
    }
    if (key === "polygon-diagonals") {
      target("대각선의 개수");
      return (n * (n - 3)) / 2;
    }
    requireText(text, "정다각형");
    target(key.endsWith("interior") ? "내각" : "외각");
    return key.endsWith("interior") ? 180 - 360 / n : 360 / n;
  }
  if (key.endsWith("-count")) {
    const n = readNumber(text, /^(\d+)/),
      pyramid = key.startsWith("pyramid");
    requireText(
      text,
      key.startsWith("prism") ? "각기둥" : pyramid ? "각뿔" : "각뿔대",
    );
    if (key.includes("faces")) {
      target("면의 개수");
      return n + (pyramid ? 1 : 2);
    }
    if (key.includes("edges")) {
      target("모서리의 개수");
      return n * (pyramid ? 2 : 3);
    }
    target("꼭짓점의 개수");
    return pyramid ? n + 1 : n * 2;
  }
  if (id.startsWith("m3-circle")) {
    switch (key) {
      case "circle-inscribed":
        requireText(text, "O는 원의 중심", "에 대한 원주각");
        target("∠C");
        return readNumber(text, /중심각 (\d+)°/) / 2;
      case "circle-central":
        requireText(text, "O는 원의 중심", "에 대한 중심각");
        target("중심각");
        return angle("C") * 2;
      case "circle-same-arc":
        requireText(text, "같은 호 AB에 대한 원주각");
        target("∠D");
        return angle("C");
      case "circle-cyclic-opposite":
        requireText(text, "원에 내접하는 사각형", "마주 보는");
        target("∠D");
        return 180 - angle("C");
      case "circle-tangent-angle":
        requireText(text, "T는 접점", "OT는 반지름", "접선 TP");
        target("∠POT");
        return 90 - angle("TPO");
      case "circle-tangent-chord":
        requireText(text, "T에서 접하는 직선과 현 TP");
        target("접선과 현 TP", "예각");
        if (text.includes("중심각")) {
          requireText(text, "O는 원의 중심");
          return angle("TOP") / 2;
        }
        requireText(text, "같은 호 TP에 대한 원주각");
        return angle("TCP");
      case "circle-equal-tangents":
        requireText(text, "원 밖의 점 P", "두 접선의 접점이 A, B");
        target("접선 PB의 길이");
        return segment("PA");
      case "circle-chord-distance":
        requireText(text, "원 O의 반지름", "OM⊥AB");
        target("중심에서 현까지의 거리 OM");
        return Math.sqrt(measure("반지름") ** 2 - (segment("AB") / 2) ** 2);
    }
  }
  if (id.startsWith("m1-circle")) {
    requireText(text, "인 원");
    if (key.includes("radius")) {
      target("반지름");
      return key.endsWith("area")
        ? Math.sqrt(measure("넓이") / Math.PI)
        : measure("원주") / (2 * Math.PI);
    }
    const r = measure("반지름");
    target(key.endsWith("area") ? "넓이" : "둘레");
    return key.endsWith("area") ? Math.PI * r * r : 2 * Math.PI * r;
  }
  if (key.startsWith("sector")) {
    requireText(text, "부채꼴");
    const r = () => readNumber(text, /r = (\d+) cm/),
      theta = () => readNumber(text, /중심각 (\d+)°/);
    if (key.includes("angle")) {
      target("중심각");
      return key.endsWith("area")
        ? (360 * measure("넓이")) / (Math.PI * r() ** 2)
        : (180 * measure("호")) / (Math.PI * r());
    }
    if (key.includes("radius")) {
      target("반지름");
      return key.endsWith("area")
        ? Math.sqrt((360 * measure("넓이")) / (Math.PI * theta()))
        : (180 * measure("호")) / (Math.PI * theta());
    }
    if (key === "sector-area-arc") {
      target("넓이");
      return (measure("호") * r()) / 2;
    }
    target(
      key.endsWith("arc")
        ? "호의 길이"
        : key.endsWith("perimeter")
          ? "둘레"
          : "넓이",
    );
    const arc = (Math.PI * r() * theta()) / 180;
    return key.endsWith("arc")
      ? arc
      : key.endsWith("perimeter")
        ? arc + 2 * r()
        : (arc * r()) / 2;
  }
  if (key.startsWith("trig")) {
    if (key === "trig-triangle-area") {
      requireText(text, "삼각형의 두 변", "그 끼인각");
      target("삼각형의 넓이");
      const m = text.match(/두 변 (\d+) cm, (\d+) cm와 그 끼인각 (\d+)°/);
      assert(m);
      return (
        (Number(m[1]) *
          Number(m[2]) *
          Math.sin((Number(m[3]) * Math.PI) / 180)) /
        2
      );
    }
    requireText(text, "직각삼각형");
    const named = (letter) => readNumber(text, new RegExp(`${letter}=(\\d+)`));
    if (key === "trig-ratio") {
      const fn = instruction.match(/^(sin|cos|tan) A/);
      assert(fn);
      requireText(text, "∠A의");
      if (fn[1] === "sin") {
        requireText(text, "맞은편 변 a", "빗변 c");
        return named("a") / named("c");
      }
      if (fn[1] === "cos") {
        requireText(text, "이웃한 변 b", "빗변 c");
        return named("b") / named("c");
      }
      requireText(text, "맞은편 변 a", "이웃한 변 b");
      return named("a") / named("b");
    }
    const radians = (angle("A") * Math.PI) / 180;
    if (key === "trig-special-value") {
      const fn = instruction.match(/^(sin|cos|tan) A/);
      assert(fn);
      return Math[fn[1]](radians);
    }
    requireText(text, "a: A의 맞은편, b: 이웃한 변, c: 빗변");
    const given = text.match(/([abc])=(\d+) cm/),
      wanted = instruction.match(/^([abc])의 길이/);
    assert(given && wanted);
    const unitSides = { a: Math.sin(radians), b: Math.cos(radians), c: 1 };
    return (Number(given[2]) * unitSides[wanted[1]]) / unitSides[given[1]];
  }
  if (/^(prism|pyramid|cylinder|cone|sphere)-/.test(key)) {
    const shape = key.split("-")[0];
    requireText(
      text,
      {
        prism: "기둥",
        pyramid: "뿔",
        cylinder: "원기둥",
        cone: "원뿔",
        sphere: "구",
      }[shape],
    );
    const dim = (letter) => readNumber(text, new RegExp(`${letter}=(\\d+) cm`));
    const base = () => (text.includes("B=") ? dim("B") : measure("밑넓이"));
    const h = () => dim("h"),
      r = () => dim("r");
    if (shape === "prism" || shape === "pyramid") {
      if (key.endsWith("volume")) {
        const divisor = shape === "pyramid" ? 3 : 1;
        if (key.includes("base-area")) {
          target("밑넓이");
          return (measure("부피") * divisor) / h();
        }
        if (key.includes("height")) {
          target("수직 높이 h");
          return (measure("부피") * divisor) / base();
        }
        target("부피");
        requireText(text, "수직 높이");
        return (base() * h()) / divisor;
      }
      if (shape === "prism") {
        requireText(text, "직각기둥");
        const perimeter = measure("밑면 둘레");
        if (key.includes("base-area")) {
          target("밑넓이");
          return (measure("겉넓이") - perimeter * h()) / 2;
        }
        if (key.includes("height")) {
          target("수직 높이 h");
          return (measure("겉넓이") - 2 * base()) / perimeter;
        }
        target("겉넓이");
        return 2 * base() + perimeter * h();
      }
      requireText(text, "정사각뿔", "밑면 한 변 a");
      const a = dim("a");
      if (key.includes("slant")) {
        target("옆면 삼각형의 높이 s");
        return (measure("겉넓이") - a * a) / (2 * a);
      }
      requireText(text, "옆면 삼각형의 높이 s");
      target("겉넓이");
      return a * a + 2 * a * dim("s");
    }
    if (shape === "sphere") {
      if (key.includes("radius")) {
        target("반지름 r");
        return key.endsWith("surface")
          ? Math.sqrt(measure("겉넓이") / (4 * Math.PI))
          : Math.cbrt((3 * measure("부피")) / (4 * Math.PI));
      }
      target(key.endsWith("surface") ? "겉넓이" : "부피");
      return key.endsWith("surface")
        ? 4 * Math.PI * r() ** 2
        : (4 * Math.PI * r() ** 3) / 3;
    }
    if (key.endsWith("volume")) {
      const divisor = shape === "cone" ? 3 : 1;
      if (key.includes("height")) {
        target("수직 높이 h");
        return (divisor * measure("부피")) / (Math.PI * r() ** 2);
      }
      if (key.includes("radius")) {
        target("반지름 r");
        return Math.sqrt((divisor * measure("부피")) / (Math.PI * h()));
      }
      requireText(text, "수직 높이");
      target("부피");
      return (Math.PI * r() ** 2 * h()) / divisor;
    }
    const total = key.endsWith("surface");
    if (shape === "cylinder") {
      if (key.includes("height")) {
        target("수직 높이 h");
        return (
          (measure(total ? "겉넓이" : "옆넓이") -
            (total ? 2 * Math.PI * r() ** 2 : 0)) /
          (2 * Math.PI * r())
        );
      }
      if (key.includes("radius")) {
        target("반지름 r");
        return measure("옆넓이") / (2 * Math.PI * h());
      }
      requireText(text, "수직 높이");
      target(total ? "겉넓이" : "옆넓이");
      return 2 * Math.PI * r() * (h() + (total ? r() : 0));
    }
    if (key.includes("radius")) {
      requireText(text, "모선 l");
      target("반지름 r");
      return measure("옆넓이") / (Math.PI * dim("l"));
    }
    if (key.includes("generator")) {
      target("모선 l");
      return (
        (measure(total ? "겉넓이" : "옆넓이") -
          (total ? Math.PI * r() ** 2 : 0)) /
        (Math.PI * r())
      );
    }
    requireText(text, "모선 l");
    target(total ? "겉넓이" : "옆넓이");
    return Math.PI * r() * (dim("l") + (total ? r() : 0));
  }
  throw new Error(`No independent prose proof for ${id}`);
}

const retainedIds = [
  "m1-parallel-angle",
  "m1-triangle-interior-exterior",
  "m2-incenter-part-area",
  "m2-iso-bisector-angle",
  "m2-iso-bisector-base",
  "m2-iso-bisector-half-base",
  "m2-right-triangle-height",
  "m2-right-triangle-projection",
  "m2-right-altitude-product",
  "m3-right-leg-product",
  "m3-circle-chord-length",
];
const dimensions = {
  "m2-incenter-part-area": "BC",
  "m2-iso-bisector-base": "BD",
  "m2-iso-bisector-half-base": "BC",
  "m2-right-triangle-height": "AB",
  "m2-right-triangle-projection": "AB",
  "m2-right-altitude-product": "AD",
  "m3-right-leg-product": "AD",
};
const stripSchematic = (s) =>
  s
    .replace(/이며 그림은 겨냥도입니다\./g, "입니다.")
    .replace(/ 그림은 겨냥도입니다\./g, "");
const definitions = arithmeticV2Definitions().filter(
  (d) => d.grade.startsWith("중") && d.problemAt(0).prompt.figureId,
);
assert.equal(definitions.length, 164);
assert.deepEqual(
  MIDDLE_FIGURE_POLICY.map((p) => p.typeId).sort(),
  definitions.map((d) => d.id).sort(),
);
assert.equal(new Set(MIDDLE_FIGURE_POLICY.map((p) => p.typeId)).size, 164);
assert.deepEqual(
  MIDDLE_FIGURE_POLICY.filter((p) => p.showFigure)
    .map((p) => p.typeId)
    .sort(),
  retainedIds.sort(),
);
const report = [
  "Middle-school arithmetic-v2 figure necessity audit — 2026-10-15",
  "Baseline: main 9356d1cb6556755021f9884dfdff909b5264871c",
  "Scope: 164 explicit figure-bearing families / 5,730 finite candidates.",
  "Decision: omit 153 families / 5,553 candidates; retain 11 families / 177 candidates.",
  "Canonical prompts, domain order, answers, verify logic and SVG assets remain unchanged.",
  "Root owns the display projection, wording cleanup and annotation deletion.",
  "The independent oracle reads only authored prose and effective target instructions.",
  "It does not use parameters, model coordinates, generator solve/relation, or policy reason as numeric input.",
  "Every omitted candidate is independently solved and compared to the canonical answer.",
  "Every candidate retains all prose numeric tokens and answer units; canonical verify still passes.",
  "Source census: registry + extraGeometry; figureId writes occur only in geometry, geometryElementary/core,",
  "geometryTriangles/core, geometryMeasure/core, geometryCounts. The first two are elementary-only.",
  "All template branches and full finite domains in centers, relationships, proportions, pythagoras,",
  "angles, round, solid, trig and geometryCounts were reviewed; policy prefixes are unique on every ID.",
  "",
  "Retained incidence is literal: perpendicular lines alone do not place D/M on the other line.",
  "By contrast the removable Pythagoras isosceles-height targets explicitly call AD a height,",
  "and circle-chord-distance explicitly calls OM the center-to-chord distance.",
  "An omitted triangle-area does not require its incidental D at all.",
  "",
  "Retained annotation cleanup:",
  "All duplicate numeric measurement dimensions are removable: prose names their values and segments.",
  "The 79 angle-value labels are also fully present in prose; the coordinator elects to keep them for visual angle association.",
  "Keep named points, all structural lines/circles and equal/parallel/right-angle/angle marks.",
  "No retained figure has an unnecessary unknown-name dimension.",
  "For seven gt1 families remove complete g[data-segment-dimension] groups (92 total) AND the separate text[data-segment-number] elements.",
  "For the three retained angle families preserve numeric g[data-label] trees and angle arcs; exact audited labels are still listed below.",
  "For parallel-angle also remove g[data-label='ℓ ∥ m']; keep individual ℓ and m labels.",
  "For chord-length remove the two numeric g[data-label] trees and the two dashed quadratic measurement paths",
  "(listed exact data-n IDs below), then remove mask attributes on structural lines using the resulting unused line-gap mask.",
  "The structural dashed straight OM segment is NOT a dimension curve and must remain.",
  "data-n on glyph outlines is not an independent geometry selector: remove the whole enclosing data-label tree.",
  "",
  "Explicit family census (all values covered, no sampling):",
];
const annotationRows = [];
let all = 0,
  omitted = 0,
  retained = 0,
  removedDimensions = 0,
  removedLabels = 0,
  removedNotes = 0,
  removedCurves = 0;
for (const definition of definitions) {
  const row = MIDDLE_FIGURE_POLICY.find((p) => p.typeId === definition.id);
  const ids = [];
  for (let i = 0; i < definition.domainSize; i++) {
    const candidate = definition.problemAt(i),
      before = JSON.stringify(candidate),
      p = candidate.prompt;
    assert.equal(p.layout, "math");
    assert(p.figureId);
    ids.push(p.figureId);
    const matching = MIDDLE_FIGURE_POLICY.filter(
      (x) =>
        p.figureId.startsWith(x.figureIdPrefix) &&
        /^\d+(?:-\d+)*$/.test(p.figureId.slice(x.figureIdPrefix.length)),
    );
    assert.deepEqual(
      matching.map((x) => x.typeId),
      [definition.id],
    );
    assert(definition.verify(candidate), `Canonical verify: ${p.figureId}`);
    const displayedText = stripSchematic(p.text),
      instruction = row.instruction ?? stripSchematic(p.instruction || "");
    assert(!/겨냥도/.test(displayedText + instruction));
    if (row.instruction)
      assert(
        /(?:세요|니다)\.$/.test(row.instruction),
        `Incomplete instruction: ${definition.id}`,
      );
    assert.deepEqual(
      displayedText.match(/\d+(?:\.\d+)?/g),
      p.text.match(/\d+(?:\.\d+)?/g),
    );
    assert.deepEqual(
      instruction.match(/\d+(?:\.\d+)?/g),
      (p.instruction || "").match(/\d+(?:\.\d+)?/g),
    );
    assert.equal(JSON.stringify(candidate), before);
    all++;
    if (!row.showFigure) {
      omitted++;
      close(
        proseAnswer(definition.id, displayedText, instruction),
        answerValue(candidate.answer),
        p.figureId,
      );
      assert(
        !/표시된|그림|숫자가 없는/.test(instruction),
        `Dangling instruction: ${p.figureId}`,
      );
      continue;
    }
    retained++;
    const original =
      TRIANGLE_GEOMETRY_FIGURES[p.figureId] ??
      MEASUREMENT_GEOMETRY_FIGURES[p.figureId];
    assert(original);
    const display =
      presentArithmeticSegmentSvg(p.figureId, original) ??
      presentArithmeticRemainingSvg(p.figureId, original) ??
      original;
    const dimGroups = [
      ...display.matchAll(/<g\b[^>]*data-segment-dimension="([^"]+)"/g),
    ].map((m) => m[1]);
    const labels = [...display.matchAll(/<g\b[^>]*data-label="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const numeric = labels.filter((label) => /\d/.test(label));
    const curves = [...display.matchAll(/<path\b[^>]*>/g)]
      .filter(
        (m) =>
          /stroke-dasharray="5 3"/.test(m[0]) && / d="M [^"]* Q /.test(m[0]),
      )
      .map((m) => m[0].match(/data-n="(\d+)"/)[1]);
    const masks = [...display.matchAll(/<mask\b[^>]*id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const maskedLines = [...display.matchAll(/<line\b[^>]*>/g)]
      .filter((m) => /mask="url\(#line-gap-/.test(m[0]))
      .map((m) => m[0].match(/data-n="(\d+)"/)[1]);
    if (dimensions[definition.id]) {
      assert.deepEqual(dimGroups, [dimensions[definition.id]]);
      const dim = dimGroups[0],
        expected = readNumber(p.text, new RegExp(`${dim}=(\\d+) cm`));
      const given = display.match(
        /<text\b[^>]*data-segment-number="true"[^>]*>(\d+)<\/text>/,
      );
      assert(given);
      assert.equal(Number(given[1]), expected);
      removedDimensions++;
    } else if (definition.id === "m3-circle-chord-length") {
      assert.equal(numeric.length, 2);
      assert.equal(curves.length, 2);
      assert.equal(masks.length, 1);
      assert(/^line-gap-/.test(masks[0]));
      assert.deepEqual(maskedLines, ["2", "3", "4"]);
      assert(/<path\b[^>]*data-n="5"/.test(display));
      const values = numeric
        .map((x) => readNumber(x, /(\d+)/))
        .sort((a, b) => a - b);
      assert.deepEqual(
        values,
        [
          readNumber(p.text, /반지름 (\d+) cm/),
          readNumber(p.text, /OM=(\d+) cm/),
        ].sort((a, b) => a - b),
      );
      removedLabels += 2;
      removedCurves += 2;
    } else {
      assert.equal(
        numeric.length,
        definition.id === "m1-triangle-interior-exterior" ? 2 : 1,
      );
      const givenAngles = [...p.text.matchAll(/(\d+)°/g)]
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
      assert.deepEqual(
        numeric.map((x) => readNumber(x, /(\d+)/)).sort((a, b) => a - b),
        givenAngles,
      );
      removedLabels += numeric.length;
    }
    const notes = labels.filter((x) => x === "ℓ ∥ m");
    assert.equal(notes.length, definition.id === "m1-parallel-angle" ? 1 : 0);
    removedNotes += notes.length;
    assert(
      labels.every((x) => /\d/.test(x) || /^[A-Zℓm]$/.test(x) || x === "ℓ ∥ m"),
      `Unreviewed label ${p.figureId}`,
    );
    annotationRows.push(
      `${p.figureId} | dimension=${dimGroups.join(",") || "none"} | audited-numeric-labels=${JSON.stringify(numeric)} | notes=${JSON.stringify(notes)} | quadratic-path-data-n=${curves.join(",") || "none"} | mask=${masks.join(",") || "none"} | unmask-line-data-n=${maskedLines.join(",") || "none"}`,
    );
  }
  report.push(
    `${definition.id} | ${row.showFigure ? "KEEP" : "OMIT"} | domain=${definition.domainSize} | prefix=${row.figureIdPrefix}`,
  );
  report.push(`  ${row.reason}`);
  report.push(`  first=${ids[0]} ; last=${ids.at(-1)}`);
  if (row.instruction) report.push(`  instruction=${row.instruction}`);
}
assert.equal(all, 5730);
assert.equal(omitted, 5553);
assert.equal(retained, 177);
assert.equal(removedDimensions, 92);
assert.equal(removedLabels, 145);
assert.equal(removedNotes, 14);
assert.equal(removedCurves, 66);
report.push(
  "",
  `Checks passed: ${all} canonical candidates; ${omitted} independent prose solutions; ${retained} complete display audits.`,
);
report.push(
  `Remove: ${removedDimensions} numeric segment groups plus separate numeric texts; 66 chord numeric outline-label groups; ${removedNotes} duplicate relation notes; ${removedCurves} dashed quadratic dimension paths.`,
);
report.push(
  `Reviewed ${removedLabels} numeric outline-label groups: 66 chord lengths removable, 79 angle values preserved for association.`,
);
report.push(
  "",
  "Exact retained figure IDs and removal metadata:",
  ...annotationRows,
  "",
  "Validation commands:",
  "node scripts/qa/arithmetic-figure-necessity-middle-audit.cjs --write-report",
  "node scripts/qa/arithmetic-figure-necessity-middle-typecheck.mjs",
  "",
);
if (process.argv.includes("--write-report"))
  fs.writeFileSync(
    path.join(
      workspace,
      "docs/reports/arithmetic-figure-necessity-middle-20261015.txt",
    ),
    report.join("\n"),
  );
console.log(
  JSON.stringify({
    families: definitions.length,
    candidates: all,
    omitted,
    retained,
    removedDimensions,
    removedLabels,
    removedNotes,
    removedCurves,
  }),
);
