import { lerp, near, range, rightTriangle, rows, sides } from "./core";
import type { Model, Spec } from "./core";

const square = (n: number) => Number.isInteger(Math.sqrt(n));
const legs = rows(range(3, 20), range(3, 20)).filter(
  ([a, b]) => a <= b && b <= 3 * a,
);
const hypLeg = rows(range(3, 20), range(5, 25)).filter(
  ([a, c]) =>
    c > a &&
    Math.sqrt(c * c - a * a) >= a / 3 &&
    Math.sqrt(c * c - a * a) <= 3 * a,
);
const triples = legs.filter(([a, b]) => square(a * a + b * b));
function rectangle(a: number, b: number): Model {
  return {
    points: { A: [0, 0], B: [a, 0], C: [a, b], D: [0, b] },
    edges: ["AB", "BC", "CD", "DA", "AC"],
    right: ["ABC", "BCD"],
  };
}
function altitude(a: number, b: number): Model {
  const m = rightTriangle(a, b),
    { A, C } = m.points;
  const t = (b * b) / (a * a + b * b);
  m.points.D = lerp(A, C, t);
  m.edges.push("BD");
  m.right!.push("BDC");
  // D is the orthogonal projection of B onto AC; never a decorative midpoint.
  return m;
}
export const PYTHAGORAS_SPECS: Spec[] = [];
for (const radical of [false, true])
  for (const mode of [
    "hypotenuse",
    "leg",
    "rectangle-diagonal",
    "rectangle-side",
    "isosceles-height",
    "rhombus-side",
  ]) {
    const difference =
      mode === "leg" ||
      mode === "rectangle-side" ||
      mode === "isosceles-height";
    const domain = (difference ? hypLeg : legs).filter(
      ([a, b]) =>
        square(difference ? b * b - a * a : a * a + b * b) !== radical,
    );
    const names: Record<string, string> = {
      hypotenuse: "직각삼각형의 빗변",
      leg: "직각삼각형의 나머지 직각변",
      "rectangle-diagonal": "직사각형의 대각선",
      "rectangle-side": "대각선에서 직사각형의 한 변",
      "isosceles-height": "이등변삼각형의 높이",
      "rhombus-side": "두 대각선에서 마름모의 한 변",
    };
    PYTHAGORAS_SPECS.push({
      key: `pythagoras-${mode}-${radical ? "surd" : "integer"}`,
      grade: radical ? "중3" : "중2",
      title: `${names[mode]} (${radical ? "근호" : "정수"})`,
      topic: "피타고라스",
      unit: "cm",
      rows: domain,
      task: ([a, b]) => {
        const n = difference ? b * b - a * a : a * a + b * b,
          x = Math.sqrt(n);
        let model: Model, text: string, target: string;
        if (mode === "hypotenuse" || mode === "leg") {
          model = rightTriangle(a, difference ? x : b);
          text = `∠ABC=90°인 삼각형 ABC에서 BC=${a} cm, ${difference ? "AC" : "AB"}=${b} cm이다.`;
          target = `${difference ? "AB" : "AC"}의 길이`;
        } else if (mode === "rectangle-diagonal" || mode === "rectangle-side") {
          model = rectangle(a, difference ? x : b);
          text = `직사각형 ABCD에서 AB=${a} cm, ${difference ? "AC" : "BC"}=${b} cm이다.`;
          target = `${difference ? "BC" : "AC"}의 길이`;
        } else if (mode === "isosceles-height") {
          model = sides(b, b, 2 * a);
          model.points.D = [a, 0];
          model.edges.push("AD");
          model.equal = [
            ["AB", "AC"],
            ["BD", "DC"],
          ];
          model.right = ["ADB"];
          text = `AB=AC=${b} cm, BC=${2 * a} cm인 이등변삼각형 ABC에서 AD⊥BC이다.`;
          target = "높이 AD의 길이";
        } else {
          model = {
            points: { A: [-a, 0], B: [0, b], C: [a, 0], D: [0, -b], O: [0, 0] },
            edges: ["AB", "BC", "CD", "DA", "AC", "BD"],
            equal: [["AB", "BC", "CD", "DA"]],
            right: ["AOB"],
          };
          text = `마름모 ABCD에서 AC=${2 * a} cm, BD=${2 * b} cm이고 대각선의 교점은 O이다.`;
          target = "AB의 길이";
        }
        return {
          text,
          target,
          model,
          value: radical ? { n: 1, root: n } : { n: x },
        };
      },
      relation: ([a, b], x) =>
        difference ? near(x * x + a * a, b * b) : near(x * x, a * a + b * b),
    });
  }
PYTHAGORAS_SPECS.push({
  key: "right-radius-from-legs",
  title: "두 직각변에서 외접원 반지름",
  topic: "외심과 피타고라스",
  unit: "cm",
  rows: triples,
  task: ([a, b]) => {
    const m = rightTriangle(a, b);
    m.points.O = lerp(m.points.A, m.points.C, 0.5);
    m.edges.push("BO");
    m.equal = [["OA", "OB", "OC"]];
    return {
      text: `∠ABC=90°인 삼각형 ABC의 외심은 O, AB=${b} cm, BC=${a} cm이다.`,
      target: "외접원 반지름",
      value: { n: Math.sqrt(a * a + b * b), d: 2 },
      model: m,
    };
  },
  relation: ([a, b], x) => near(4 * x * x, a * a + b * b),
});
for (const mode of ["height", "projection", "area"])
  PYTHAGORAS_SPECS.push({
    key: `right-triangle-${mode}`,
    title:
      mode === "height"
        ? "직각삼각형의 빗변에 내린 높이"
        : mode === "projection"
          ? "직각삼각형의 빗변 위 선분"
          : "빗변과 직각변에서 삼각형 넓이",
    topic: "피타고라스와 닮음",
    unit: mode === "area" ? "cm²" : "cm",
    rows: triples,
    task: ([a, b]) => {
      const c = Math.sqrt(a * a + b * b);
      return {
        text: `∠ABC=90°인 삼각형 ABC에서 ${mode === "height" ? `AB=${b} cm, BC=${a} cm, AC=${c} cm` : `AB=${b} cm, AC=${c} cm`}이고 BD⊥AC이다.`,
        target:
          mode === "height"
            ? "BD의 길이"
            : mode === "projection"
              ? "AD의 길이"
              : "삼각형 ABC의 넓이",
        value: {
          n: mode === "height" ? a * b : mode === "projection" ? b * b : a * b,
          d: mode === "area" ? 2 : c,
        },
        model: altitude(a, b),
      };
    },
    relation: ([a, b], x) =>
      mode === "height"
        ? near(x * x * (a * a + b * b), a * a * b * b)
        : mode === "projection"
          ? near(x * Math.sqrt(a * a + b * b), b * b)
          : near(((2 * x) / b) ** 2 + b * b, a * a + b * b),
  });
// These use the explicitly drawn altitude's geometric-mean relations directly.
for (const mode of ["altitude-product", "leg-product"])
  PYTHAGORAS_SPECS.push({
    key: `right-${mode}`,
    title:
      mode === "altitude-product"
        ? "빗변의 두 부분에서 높이"
        : "빗변과 정사영에서 직각변",
    topic: "직각삼각형의 닮음",
    unit: "cm",
    rows: rows(range(2, 5), range(2, 5)).filter(([a, b]) => a <= b),
    task: ([a, b]) => {
      const u = a * a,
        v = b * b,
        c = u + v;
      const m: Model = {
        points: { A: [-u, 0], C: [v, 0], B: [0, a * b], D: [0, 0] },
        edges: ["AB", "BC", "CA", "BD"],
        right: ["ABC", "BDC"],
      };
      return {
        text: `∠ABC=90°인 삼각형 ABC에서 BD⊥AC이고 ${mode === "altitude-product" ? `AD=${u} cm, DC=${v} cm` : `AD=${u} cm, AC=${c} cm`}이다.`,
        target: `${mode === "altitude-product" ? "BD" : "AB"}의 길이`,
        value: mode === "altitude-product" ? { n: a * b } : { n: a, root: c },
        model: m,
      };
    },
    grade: mode === "leg-product" ? "중3" : "중2",
    relation: ([a, b], x) =>
      mode === "altitude-product"
        ? near(x * x, a * a * b * b)
        : near(x * x, a * a * (a * a + b * b)),
  });
