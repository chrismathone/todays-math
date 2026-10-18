/** 2026-10-18 R2 wave C: authored as reasoning tasks, never asDescriptive/expandFamily. */
import {
  nativeExternalId,
  nativeFamilyKey,
  serializeNativeSolution,
  type NativeCriterion,
  type NativeDefinition,
  type NativeDescriptiveProblem,
} from "../../contracts/nativeDescriptive.contract";
import { createRng, intBetween } from "../elementary/rng";

const DEFINITIONS: readonly NativeDefinition[] = [
  {
    definitionId: "e4-equilateral-audit-r1",
    title: "정삼각형 설계안의 길이·각 주장 검토",
    unitId: "c8d1b160-ffb6-4da1-9c54-a3522ffcf134",
    grade: "초4",
    chapter: "2-2 삼각형",
    unitSection: "2-2-3 정삼각형의 성질",
    difficulty: "응용",
    difficultyBasis: "두 주장을 성질로 반박하고 둘레·내각합으로 재확인",
    differentAction:
      "한 값 계산 대신 틀린 길이·각 주장을 각각 수정하고 두 독립 조건에 대조",
    limits: "정삼각형 한 개의 설계만 평가; 실물 작도 능력은 측정하지 않음",
  },
  {
    definitionId: "e4-triangle-dual-proof-r1",
    title: "두 기준 분류와 불가능한 교집합 설명",
    unitId: "0a069c2f-244d-4f9e-832f-3e0f8969ba21",
    grade: "초4",
    chapter: "2-2 삼각형",
    unitSection: "2-2-5 삼각형을 두 가지 기준으로 분류하기",
    difficulty: "응용",
    difficultyBasis: "변·각 분류의 근거를 분리하고 불가능한 결합을 설명",
    differentAction:
      "분류명만 고르지 않고 두 기준의 동시 적용과 불가능한 조건의 모순을 입증",
    limits:
      "이등변에 정삼각형을 포함한다는 정의를 명시; 각을 보고 길이를 역산하지 않음",
  },
  {
    definitionId: "e4-trapezoid-sufficiency-r1",
    title: "평행 조건의 충분성과 길이 조건의 반례",
    unitId: "5599a8d2-15d4-4160-9a59-741fc9541b64",
    grade: "초4",
    chapter: "2-4 사각형",
    unitSection: "2-4-4 사다리꼴",
    difficulty: "응용",
    difficultyBasis: "정의를 두 사례에 적용하고 충분조건·반례를 설명",
    differentAction:
      "변 수·모양 이름 대신 평행 정보의 논리적 역할과 잘못된 충분조건을 평가",
    limits:
      "사다리꼴은 한 쌍 이상 평행이라는 포함 정의; 그림·특수사각형의 외관 추측 없음",
  },
  {
    definitionId: "m3-factor-error-proof-r1",
    title: "인수분해 오류 진단과 항등식 검산",
    unitId: "068bcc39-0927-4f43-a919-24b61ca425f9",
    grade: "중3",
    chapter: "2. 다항식의 곱셈과 인수분해",
    unitSection: "인수분해",
    difficulty: "응용",
    difficultyBasis: "잘못된 곱을 전개하여 항별 오류를 진단하고 정정식을 검산",
    differentAction:
      "인수분해 결과만 산출하지 않고 오답의 항별 불일치와 항등식·수치 검산의 차이를 설명",
    limits:
      "최고차항 계수 1인 정수 이차식; 특정 값 대입만으로 항등식 증명 불가를 명시",
  },
  {
    definitionId: "m3-quadratic-domain-r1",
    title: "넓이 모델링과 해의 적합성 검토",
    unitId: "f7cf8f63-e727-4923-b46b-091804472a32",
    grade: "중3",
    chapter: "3. 이차방정식",
    unitSection: "이차방정식의 활용",
    difficulty: "응용",
    difficultyBasis: "미지수·방정식·두 해·정의역·원조건 확인을 분리",
    differentAction:
      "양의 길이 답만 쓰지 않고 방정식의 음의 해도 찾고 상황에서 제외하는 이유와 원조건 검산 제시",
    limits:
      "직사각형 넓이 상황의 정수 해; 다른 모델링 상황 전체를 대표하지 않음",
  },
  {
    definitionId: "m3-statistics-shift-spread-r1",
    title: "자료 이동과 퍼짐을 구분하여 선택",
    unitId: "468b8d96-7097-4ef3-8ccf-42c53d90b45f",
    grade: "중3",
    chapter: "7. 통계",
    unitSection: "대푯값과 산포도",
    difficulty: "응용",
    difficultyBasis:
      "세 자료의 평균·분산을 비교하고 선택 및 과도한 일반화 반박",
    differentAction:
      "한 자료의 평균·분산 계산 대신 평행 이동과 퍼짐 변화를 구별하고 동일 자료로 주장에 반례 제시",
    limits:
      "모분산(편차제곱 평균)을 발문에 명시; 표본분산·실증 학습효과 주장은 하지 않음",
  },
];
DEFINITIONS.forEach((d) => Object.freeze(d));
Object.freeze(DEFINITIONS);

export function nativeDescriptiveDefinitions(): readonly NativeDefinition[] {
  return DEFINITIONS;
}
export function nativeDescriptiveDefinition(id: string): NativeDefinition {
  const d = DEFINITIONS.find((x) => x.definitionId === id);
  if (!d) throw new Error(`Unknown native definition: ${id}`);
  return d;
}
const criterion = (
  criterionId: string,
  points: number,
  expected: string,
  alternative: string,
  error: string,
): NativeCriterion => ({
  criterionId,
  points,
  expected,
  alternatives: [alternative],
  errors: [error],
});
const mathList = (xs: number[]) => `$${xs.join(",\\;")}$`;

export function generateNativeDescriptive(
  definitionId: string,
  seed: number,
  variant: number,
): NativeDescriptiveProblem {
  const d = nativeDescriptiveDefinition(definitionId);
  const externalId = nativeExternalId({ definitionId, seed, variant });
  // A new stream, with no mutations to any source engine or its RNG consumption.
  const rng = createRng(seed + variant * 1009);
  const n = (lo: number, hi: number) => intBetween(rng, lo, hi);
  let content: string,
    answer: string,
    modelAnswer: string,
    criteria: NativeCriterion[];
  switch (definitionId) {
    case "e4-equilateral-audit-r1": {
      const a = n(3, 18),
        wrongSide = a + n(1, 3),
        wrongAngle = n(7, 9) * 10;
      const given =
        variant % 2 === 0
          ? `둘레가 $${3 * a}\\,\\mathrm{cm}$인 정삼각형 장식`
          : `한 변이 $${a}\\,\\mathrm{cm}$인 정삼각형 장식`;
      content = `${given}을 만들려고 합니다. 민수의 설계안에는 "세 변은 각각 $${wrongSide}\\,\\mathrm{cm}$, 세 각은 각각 $${wrongAngle}^\\circ$"라고 적혀 있습니다.\n\n(1) 길이와 각에 관한 주장이 각각 맞는지 정삼각형의 성질로 설명하고 바르게 고치세요. (2) 고친 세 변의 합과 세 각의 합을 구해 주어진 조건과 맞는지 확인하세요.`;
      answer = `두 주장 모두 틀림. 한 변 $${a}\\,\\mathrm{cm}$, 한 각 $60^\\circ$, 둘레 $${3 * a}\\,\\mathrm{cm}$, 각의 합 $180^\\circ$.`;
      modelAnswer = `정삼각형은 세 변의 길이가 같습니다. ${variant % 2 === 0 ? `$${3 * a}\\div3=${a}$` : `주어진 한 변과 같은 길이`}이므로 세 변은 각각 $${a}\\,\\mathrm{cm}$여야 합니다. 세 각도 같고 합이 $180^\\circ$이므로 한 각은 $180^\\circ\\div3=60^\\circ$입니다. 따라서 두 주장은 모두 틀렸습니다. 고친 값으로 $${a}+${a}+${a}=${3 * a}$이고 $60^\\circ+60^\\circ+60^\\circ=180^\\circ$이므로 조건에 맞습니다.`;
      criteria = [
        criterion(
          "length",
          2,
          `세 변이 같음을 근거로 각각 ${a} cm로 정정`,
          "같은 길이 세 개를 더해 둘레 조건으로 역확인",
          "둘레를 2로 나누거나 세 변이 다른 값을 제시",
        ),
        criterion(
          "angle",
          2,
          "세 각이 같고 합이 180도이므로 60도로 정정",
          "정삼각형의 한 각이 60도라는 성질을 직접 사용",
          "같은 각이라는 조건만으로 주어진 잘못된 각을 수용",
        ),
        criterion(
          "check",
          2,
          `둘레 ${3 * a} cm와 내각합 180도를 모두 확인`,
          "세 변/세 각을 각각 3배하여 검산",
          "맞음/틀림만 쓰고 근거와 확인 생략",
        ),
      ];
      break;
    }
    case "e4-triangle-dual-proof-r1": {
      const beta = variant % 2 === 0 ? n(6, 9) * 5 : [50, 70, 80][n(0, 2)]!;
      const alpha = 180 - 2 * beta;
      const angleClass =
        alpha === 90 ? "직각삼각형" : alpha > 90 ? "둔각삼각형" : "예각삼각형";
      content = `삼각형 ABC에서 변 AB와 AC의 길이가 같고, 각 A는 $${alpha}^\\circ$, 각 B와 C는 각각 $${beta}^\\circ$입니다. 이 문제에서는 두 변 이상이 같은 삼각형을 이등변삼각형이라고 하며 정삼각형도 여기에 포함합니다.\n\n(1) 변의 길이와 각의 크기 기준으로 해당하는 이름을 모두 쓰고 각 기준의 근거를 설명하세요. (2) "정삼각형이면서 직각삼각형인 삼각형"이 가능한지 성질을 이용해 설명하세요. 주어진 세 각의 합도 확인하세요.`;
      answer = `이등변삼각형, ${angleClass}; 정삼각형은 아님. 정삼각형이면서 직각삼각형인 삼각형은 불가능.`;
      modelAnswer = `AB와 AC가 같으므로 이등변삼각형입니다. 세 각이 모두 같지는 않으므로 정삼각형은 아닙니다. 가장 큰 각은 $${Math.max(alpha, beta)}^\\circ$이므로 ${angleClass}입니다. $${alpha}+${beta}+${beta}=180$으로 내각합에도 맞습니다. 정삼각형은 각이 모두 $60^\\circ$이므로 $90^\\circ$인 각이 필요한 직각삼각형일 수 없습니다.`;
      criteria = [
        criterion(
          "sides",
          2,
          "이등변이면서 정삼각형은 아님을 두 조건과 연결",
          "정삼각형의 각 성질로 정삼각형 제외",
          "이등변이면 정삼각형이라고 판단",
        ),
        criterion(
          "angles",
          2,
          `${angleClass}을 가장 큰 각과 연결하고 내각합 확인`,
          "세 각을 각각 90도와 비교",
          "이등변이면 언제나 예각이라고 판단",
        ),
        criterion(
          "impossible",
          2,
          "60도와 90도 조건이 양립 불가임을 설명",
          "직각 하나와 나머지 두 각의 합 90도를 이용",
          "그런 그림을 못 보았다는 이유만 제시",
        ),
      ];
      break;
    }
    case "e4-trapezoid-sufficiency-r1": {
      const side = n(3, 12);
      const parallel = variant % 2 === 0 ? "변 AB와 CD" : "변 AD와 BC";
      content = `이 문제에서는 마주 보는 변이 적어도 한 쌍 평행한 사각형을 사다리꼴이라고 합니다. 사각형의 꼭짓점 A, B, C, D는 둘레를 따라 차례로 붙였습니다. 가는 ${parallel}가 평행합니다. 나는 이웃한 변 AB와 AD가 각각 $${side}\\,\\mathrm{cm}$이고, 마주 보는 변 두 쌍 모두 평행하지 않습니다.\n\n(1) 가와 나가 사다리꼴인지 각각 정의로 설명하세요. (2) "길이가 같은 두 변이 있으면 사다리꼴이다"라는 주장에 나가 반례가 되는 이유를 쓰세요. (3) 사각형이 사다리꼴임을 보이기에 충분한 평행 조건 하나를 쓰세요.`;
      answer =
        "가는 사다리꼴, 나는 사다리꼴이 아님. 나는 같은 길이 두 변이 있어도 평행한 마주 보는 변이 없어 반례. 마주 보는 변 한 쌍이 평행하면 충분.";
      modelAnswer = `가는 마주 보는 ${parallel}가 평행하므로 정의를 만족합니다. 나는 마주 보는 변 중 평행한 쌍이 없어 사다리꼴이 아닙니다. 나에는 $${side}\\,\\mathrm{cm}$인 두 변이 있는데도 사다리꼴이 아니므로 주장을 반박하는 반례입니다. 마주 보는 변 AB와 CD가 평행하다는 조건만으로도 사다리꼴임을 보일 수 있습니다. 두 쌍이 모두 평행할 필요는 없습니다.`;
      criteria = [
        criterion(
          "classify",
          2,
          "가의 평행 한 쌍과 나의 평행 0쌍을 정의에 연결",
          "각각 정의 만족/불만족을 말로 설명",
          "같은 길이를 평행으로 취급",
        ),
        criterion(
          "counterexample",
          2,
          "나는 주장의 가정을 만족하나 결론은 만족하지 않음을 설명",
          "같은 길이 두 변 O / 사다리꼴 X를 함께 제시",
          "나는 두 변의 길이가 달라서 반례라고 설명",
        ),
        criterion(
          "sufficient",
          2,
          "마주 보는 변 한 쌍 평행을 구체적 변 이름으로 제시",
          "AD와 BC가 평행함을 제시",
          "이웃한 변 평행 또는 두 변 길이 같음만 제시",
        ),
      ];
      break;
    }
    case "m3-factor-error-proof-r1": {
      const a = n(2, 6),
        b = a + n(1, 4),
        sign = variant % 2 === 0 ? "+" : "-",
        other = sign === "+" ? "-" : "+";
      const polynomial = `x^2${sign}${a + b}x+${a * b}`,
        wrong = `(x${sign}${a})(x${other}${b})`,
        correct = `(x${sign}${a})(x${sign}${b})`;
      const check = n(1, 4),
        value =
          check * check + (sign === "+" ? 1 : -1) * (a + b) * check + a * b;
      content = `지우는 $${polynomial}$을 $${wrong}$로 인수분해했습니다.\n\n(1) 지우의 곱을 전개하여 원래 식과 어떤 항이 다른지 설명하세요. (2) 올바르게 인수분해하고 다시 전개해 모든 항을 확인하세요. (3) $x=${check}$를 원래 식과 고친 식에 대입해 값도 확인하고, 한 값의 일치만으로 모든 $x$에서 같은 식임을 증명할 수 있는지 설명하세요.`;
      answer = `$${correct}$; 잘못된 곱의 일차항과 상수항이 다름. 대입값 $${value}$. 한 값의 일치만으로 항등식 증명은 불가.`;
      const wrongLinear = sign === "+" ? a - b : b - a;
      modelAnswer = `잘못된 곱을 전개하면 $x^2${wrongLinear < 0 ? "-" : "+"}${Math.abs(wrongLinear)}x-${a * b}$이므로 일차항과 상수항이 원래 식과 다릅니다. 합이 $${sign === "+" ? a + b : -(a + b)}$, 곱이 $${a * b}$인 두 수를 쓰면 $${correct}$입니다. 전개하면 $${polynomial}$으로 모든 항이 같습니다. $x=${check}$에서 원래 식과 고친 곱은 모두 $${value}$입니다. 한 값에서만 일치하는 서로 다른 식도 있으므로 대입 한 번은 확인일 뿐이고, 여기서는 전개한 모든 계수가 같아 항등식임을 알 수 있습니다.`;
      criteria = [
        criterion(
          "diagnose",
          2,
          "잘못된 곱 전개 후 일차항·상수항 불일치 진단",
          "분배법칙의 각 곱을 표시해 부호 오류 설명",
          "상수항만 확인하고 일차항을 같다고 판단",
        ),
        criterion(
          "repair",
          2,
          `$${correct}$ 제시하고 전개로 모든 계수 확인`,
          "곱과 합으로 후보를 찾은 뒤 항별 비교",
          "인수분해식만 쓰고 검산 생략",
        ),
        criterion(
          "verify",
          2,
          `대입값 ${value} 확인과 수치 확인의 한계 설명`,
          "두 다른 식이 한 점에서 일치하는 예를 제시",
          "한 번의 대입만으로 항등식 증명이 된다고 주장",
        ),
      ];
      break;
    }
    case "m3-quadratic-domain-r1": {
      const width = n(4, 15),
        delta = n(2, 6),
        length = width + delta,
        area = width * length;
      const object = variant % 2 === 0 ? "화단" : "사진 판";
      content = `직사각형 ${object}의 가로는 세로보다 $${delta}\\,\\mathrm{cm}$ 길고 넓이는 $${area}\\,\\mathrm{cm}^2$입니다.\n\n(1) 세로를 $x\\,\\mathrm{cm}$로 놓고 $x$의 조건과 넓이에 관한 이차방정식을 세우세요. (2) 방정식의 두 해를 모두 구하고 이 상황에 쓸 수 없는 해를 제외하는 이유를 설명하세요. (3) 가로와 세로를 정하고 길이 차와 넓이를 원래 조건에 대입해 확인하세요.`;
      answer = `세로 $${width}\\,\\mathrm{cm}$, 가로 $${length}\\,\\mathrm{cm}$; 두 해 $${width}$, $-${length}$ 중 음수 해 제외.`;
      modelAnswer = `길이이므로 $x>0$이고 가로는 $x+${delta}$입니다. $x(x+${delta})=${area}$, 즉 $x^2+${delta}x-${area}=0$입니다. $(x-${width})(x+${length})=0$이므로 $x=${width}$ 또는 $x=-${length}$입니다. 음수 해는 길이의 조건 $x>0$을 만족하지 않아 제외합니다. 세로 $${width}\\,\\mathrm{cm}$, 가로 $${length}\\,\\mathrm{cm}$이고 $${length}-${width}=${delta}$, $${width}\\times${length}=${area}$이므로 두 조건에 모두 맞습니다.`;
      criteria = [
        criterion(
          "model",
          2,
          `x>0, 가로 x+${delta}, x(x+${delta})=${area}를 연결`,
          "가로를 미지수로 놓고 그에 맞는 정의역·식 제시",
          "넓이를 길이 합으로 모델링",
        ),
        criterion(
          "roots",
          2,
          `두 해 ${width}, -${length}를 구하고 길이 조건으로 음수 제외`,
          "근의 공식 또는 완전제곱식 사용",
          "음수라는 이유 없이 한 해를 누락하거나 절댓값으로 변경",
        ),
        criterion(
          "check",
          2,
          "가로·세로 및 단위를 쓰고 차와 곱 모두 확인",
          "원래 문장 두 조건에 각각 대입",
          "방정식만 확인하고 가로 길이나 원조건 검산 생략",
        ),
      ];
      break;
    }
    case "m3-statistics-shift-spread-r1": {
      const center = n(12, 20),
        step = n(1, 3),
        shift = n(2, 6);
      const ds = variant % 2 === 0 ? [-2, -1, 0, 1, 2] : [-3, -1, 1, 3];
      const original = ds.map((x) => center + x * step);
      const moved = original.map((x) => x + shift);
      const widened = ds.map((x) => center + x * step * 2);
      const variance =
        ds.reduce((s, x) => s + x * x * step * step, 0) / ds.length;
      content = `원래 자료는 ${mathList(original)}입니다. 수정안 A는 각 값에 $${shift}$를 더한 ${mathList(moved)}, 수정안 B는 ${mathList(widened)}입니다. 분산은 편차의 제곱의 평균으로 계산합니다.\n\n(1) 원래 자료, A, B의 평균과 분산을 각각 구하고 편차의 변화를 설명하세요. (2) "분산이 작은 수정안을 택한다"면 A와 B 중 무엇을 택할지 근거를 쓰세요. (3) "평균이 커지면 분산도 반드시 커진다"는 주장을 원래 자료와 A를 이용해 판단하세요.`;
      answer = `원래: 평균 $${center}$, 분산 $${variance}$; A: 평균 $${center + shift}$, 분산 $${variance}$; B: 평균 $${center}$, 분산 $${4 * variance}$. A 선택. 주장은 거짓.`;
      modelAnswer = `원래 자료의 평균은 $${center}$, 편차는 ${mathList(ds.map((x) => x * step))}이므로 분산은 $${variance}$입니다. A는 평균도 $${shift}$만큼 커져 $${center + shift}$이므로 편차는 그대로이고 분산은 $${variance}$입니다. B는 평균이 $${center}$로 같지만 편차가 원래의 $2$배여서 분산은 $4\\times${variance}=${4 * variance}$입니다. 분산이 작은 A를 택합니다. 원래 자료에서 A로 평균은 커져도 분산은 같으므로 제시한 주장은 거짓입니다.`;
      criteria = [
        criterion(
          "means",
          2,
          `평균 ${center}, ${center + shift}, ${center} 계산`,
          "합÷자료 개수로 각각 계산",
          "자료 이동에도 평균이 같다고 판단",
        ),
        criterion(
          "spread",
          2,
          `분산 ${variance}, ${variance}, ${4 * variance}와 편차 변화 설명`,
          "각 자료의 제곱합/개수에서 평균제곱을 뺌",
          "분산을 표준편차와 혼동하거나 n-1로 나눔",
        ),
        criterion(
          "judge",
          2,
          "분산 비교로 A 선택, 원래/A를 반례로 주장을 부정",
          "평균과 산포도가 다른 특성임을 수치로 설명",
          "평균이 큰 A의 분산도 더 크다고 판단",
        ),
      ];
      break;
    }
    default:
      throw new Error(`Unimplemented native definition: ${d.definitionId}`);
  }
  const rubric = {
    totalPoints: criteria.reduce((s, c) => s + c.points, 0),
    criteria,
  };
  return {
    definitionId,
    seed,
    variant,
    externalId,
    familyKey: nativeFamilyKey(definitionId),
    questionType: "서술형",
    problemType: d.grade === "초4" ? "개념" : "활용",
    content,
    answer,
    modelAnswer,
    rubric,
    solution: serializeNativeSolution(modelAnswer, rubric),
    figureSpec: null,
  };
}
