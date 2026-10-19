import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyEvidence,
  ExamStudyFamily,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import {
  serializeNativeSolution,
  type NativeRubric,
} from "@/contracts/nativeDescriptive.contract";
import { add, fraction, mul, positive, sub, tex } from "./reinforcementMath";
import {
  classificationRows,
  modelWords,
  verifyReinforcedCandidate,
  verifyReinforcedClassification,
  verifyReinforcedEquality,
  verifyReinforcedModel,
  verifyReinforcedRectangle,
  verifyReinforcedSimplify,
} from "./reinforcementVerification";

/** Only these examStudy registrations are replaced; bank/SRS handlers and identities stay intact. */
export const REINFORCEMENT_IDS = {
  candidate: "legacy:mid:1-1|일차방정식의 풀이|11",
  equality: "legacy:mid:1-1|일차방정식의 풀이|06",
  classification: "legacy:mid:1-1|일차방정식의 풀이|09",
  model: "legacy:mid:1-1|일차방정식의 활용|01",
  simplify: "legacy:mid:1-1|문자의 사용과 식의 계산|13",
  rectangle: "legacy:native:m3-quadratic-domain-r1",
} as const;
const IDS = "ㄱㄴㄷㄹㅁ";
const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);
const linear = (a: number, b: number, v = "x") => `${a}${v}${signed(b)}`;
const base = (
  content: string,
  answer: string,
  solution: string,
  parameters: CanonicalParams,
): ExamStudyDraft => ({
  content,
  answer,
  solution,
  parameters,
  questionType: "단답형",
  difficulty: "응용",
  difficultyBasis: ["조건을 읽고 각 중간 결과를 원래 식에 대입하여 판정"],
  figureSpec: null,
});

function candidateDomain(): CanonicalParams[] {
  const out: CanonicalParams[] = [];
  for (let shift = 0; shift < 4; shift++)
    for (let mask = 1; mask < 31; mask++) {
      const rows = [2, -3, 4, -2, 5].map((a, i) => {
        const b = shift + i - 2,
          x = i - 2 + shift;
        return [a, b, a * x + b + (mask & (1 << i) ? 0 : i % 2 ? 1 : -1), x];
      });
      out.push({ rows });
    }
  return out;
}
function makeCandidate(p: CanonicalParams): ExamStudyDraft {
  const rows = p.rows as number[][];
  const truths = rows.map(([a, b, r, x]) => a! * x! + b! === r);
  const content =
    "다음은 서로 다른 방정식과 각각의 후보이다. 자기 행의 후보를 대입할 때 성립하는 항목의 개수를 구하시오.\n" +
    rows
      .map(
        ([a, b, r, x], i) =>
          `${IDS[i]}. $${linear(a!, b!)}=${r}$, 후보 $x=${x}$`,
      )
      .join("\n");
  const solution =
    rows
      .map(
        ([a, b, r, x], i) =>
          `${IDS[i]}: 후보 $x=${x}$를 대입하면 좌변 $${a}\\times(${x})${signed(b!)}=${a! * x! + b!}$, 우변 $${r}$이므로 ${truths[i] ? "성립" : "불성립"}한다.`,
      )
      .join("\n") +
    `\n성립하는 항목: ${[...IDS].filter((_, i) => truths[i]).join(", ")}. 따라서 $${truths.filter(Boolean).length}$개이다.`;
  return base(content, `$${truths.filter(Boolean).length}$개`, solution, p);
}
function equalityDomain(): CanonicalParams[] {
  const out: CanonicalParams[] = [];
  for (const k of [-3, -2, 2, 3])
    for (const c of [1, 3])
      for (let switches = 0; switches < 4; switches++)
        out.push({
          k,
          c,
          divisor: switches & 1 ? k : k + 1,
          squareMultiplier: switches & 2 ? k * k : k,
        });
  return out;
}
function makeEquality(p: CanonicalParams): ExamStudyDraft {
  const k = p.k as number,
    c = p.c as number,
    divisor = p.divisor as number,
    squareMultiplier = p.squareMultiplier as number;
  const eqs = [
    `a+${c}=${k}b+${c}`,
    `\\frac{a}{${divisor}}=b`,
    `a=${k}b+${c}`,
    `\\frac{a}{b}=${k}`,
    `a^{2}=${squareMultiplier}b^{2}`,
  ];
  const truths = [
    true,
    divisor === k,
    false,
    false,
    squareMultiplier === k * k,
  ];
  const proofs = [
    `$a=${k}b$를 대입하면 $${k}b+${c}=${k}b+${c}$이며 모든 실수 $b$에서 성립한다.`,
    divisor === k
      ? `$a=${k}b$를 대입하면 $\\frac{${k}b}{${k}}=b$이며 모든 실수 $b$에서 성립한다.`
      : `$b=1$, $a=${k}$에서 좌변 $\\frac{${k}}{${k + 1}}$, 우변 $1$로 다르다.`,
    `$b=0$, $a=0$에서 좌변 $0$, 우변 $${c}$로 다르다.`,
    "$b=0$, $a=0$에서 분모가 $0$이므로 정의되지 않는다.",
    squareMultiplier === k * k
      ? `$a=${k}b$를 대입하면 $(${k}b)^{2}=${k * k}b^{2}$이며 모든 실수 $b$에서 성립한다.`
      : `$b=1$, $a=${k}$에서 좌변 $${k * k}$, 우변 $${k}$로 다르다.`,
  ];
  return base(
    `실수 $a$, $b$가 $a=${k}b$를 만족한다. $b=0$인 경우도 포함하여 항상 옳은 진술의 개수를 구하시오.\n` +
      eqs.map((e, i) => `${IDS[i]}. $${e}$`).join("\n"),
    `$${truths.filter(Boolean).length}$개`,
    proofs.map((e, i) => `${IDS[i]}: ${e}`).join("\n") +
      `\n항상 성립하는 항목: ${[...IDS].filter((_, i) => truths[i]).join(", ")}. 따라서 $${truths.filter(Boolean).length}$개이다.`,
    p,
  );
}
function simplifyDomain(): CanonicalParams[] {
  const out: CanonicalParams[] = [];
  for (const a of [-4, -2, 2, 4])
    for (const b of [-3, 0, 3])
      for (const c of [-3, 2])
        for (const d of [-2, 0, 2])
          for (const k of [-3, 2]) out.push({ a, b, c, d, k });
  return out;
}
function makeSimplify(p: CanonicalParams): ExamStudyDraft {
  const { a, b, c, d, k } = p as Record<string, number>,
    A = a! + k! * c!,
    B = b! + k! * d!;
  const item = base(
    `다음 식을 전개하고 동류항끼리 정리하여 $Ax+B$로 나타낼 때, $x$의 계수 $A$와 상수항 $B$의 합 $A+B$의 값을 구하시오.\n$(${linear(a!, b!)})${signed(k!)}(${linear(c!, d!)})$`,
    `$${A + B}$`,
    `괄호를 풀면 $${linear(a!, b!)}${signed(k! * c!)}x${signed(k! * d!)}$이다.\n동류항끼리 모으면 $${linear(A, B)}$이다.\n따라서 $A=${A}$, $B=${B}$이므로 $A+B=${A + B}$이다.`,
    p,
  );
  const mistakes = [
    A - B,
    A,
    B,
    a! + b! + c! + d!,
    a! + b! + k! * c! + d!,
    a! + b! + c! + k! * d!,
    -A + B,
    -A - B,
    A + B - 1,
    A + B + 1,
    A + B - 2,
    A + B + 2,
  ];
  return {
    ...item,
    distractors: [...new Set(mistakes)]
      .filter((n) => n !== A + B)
      .slice(0, 4)
      .map((n) => `$${n}$`),
  };
}
function rectangleDomain(): CanonicalParams[] {
  const out: CanonicalParams[] = [];
  for (const l of [4, 6, 8])
    for (const w of [4, 6, 8, 10, 12])
      for (const p of [1, 2]) for (const q of [1, 2]) out.push({ l, w, p, q });
  return out;
}
function makeRectangle(params: CanonicalParams): ExamStudyDraft {
  const { l, w, p, q } = params as Record<string, number>;
  const area = l! * w!,
    b = p! * w! - q! * l!,
    t = fraction(b, p! * q!),
    upper = fraction(w!, q!);
  const L = add(fraction(l!), mul(fraction(p!), t)),
    W = sub(fraction(w!), mul(fraction(q!), t));
  const domain = `시간 조건: $t>0$, $L(t)>0$, $W(t)>0$이므로 $0<t<${tex(upper)}$.`;
  const model = `변의 길이: $L(t)=${l}+${p}t$, $W(t)=${w}-${q}t$ (cm).\n넓이 방정식: $(${l}+${p}t)(${w}-${q}t)=${area}$. 정리하면 $${-p! * q!}t^{2}${signed(b)}t=0$.`;
  const roots =
    `모든 실근: $0$${b ? `, $${tex(t)}$` : " (중근)"}.\n$t=0$은 처음 시각이므로 제외한다.\n` +
    (positive(t)
      ? `남은 근 $${tex(t)}$은 $0<t<${tex(upper)}$를 만족하므로 양의 회복 시각이다.`
      : `나머지 근도 $t\\le0$이므로 양의 회복 시각은 없다.`);
  const check = positive(t)
    ? `대입 확인: $L(${tex(t)})=${tex(L)}$, $W(${tex(t)})=${tex(W)}$, $${tex(L)}\\times${tex(W)}=${area}$ (cm²). 두 길이는 양수이다.`
    : "정의역 확인: 모든 실근이 양수 조건 $t>0$을 만족하지 않으므로 나중의 넓이 회복은 없다.";
  const rubric: NativeRubric = {
    totalPoints: 8,
    criteria: [
      {
        criterionId: "domain",
        points: 2,
        expected: domain,
        alternatives: [
          "두 변의 양수 조건을 시간 부등식으로 각각 구해 공통 범위를 제시",
        ],
        errors: [
          "처음 시각 t=0을 나중 회복으로 인정",
          "줄어드는 변이 0인 시각을 허용",
        ],
      },
      {
        criterionId: "model",
        points: 2,
        expected: model,
        alternatives: ["변화한 두 길이의 곱에서 처음 넓이를 빼서 방정식 작성"],
        errors: ["줄어드는 변의 변화 부호를 반대로 둠"],
      },
      {
        criterionId: "roots",
        points: 2,
        expected: roots,
        alternatives: [
          "인수분해 또는 이차방정식 근의 공식으로 모든 근을 구하고 시간 조건으로 판정",
        ],
        errors: ["t로 나누어 0인 근을 누락", "음의 시간을 나중 회복으로 인정"],
      },
      {
        criterionId: "check",
        points: 2,
        expected: check,
        alternatives: [
          "허용한 시간을 원래 두 길이에 대입하고 넓이와 양수 조건 확인; 허용 근이 없으면 모든 근의 시간 조건 확인",
        ],
        errors: ["원래 두 길이와 넓이의 대입 검산 생략"],
      },
    ],
  };
  return {
    ...base(
      `처음 가로 $${l}$ cm, 세로 $${w}$ cm인 직사각형이 있다. 시작 후 가로는 매분 $${p}$ cm씩 늘어나고 세로는 매분 $${q}$ cm씩 줄어든다. 두 변의 길이가 모두 양수인 동안만 생각한다.\n(1) 시작 후 $t$분일 때 두 변의 길이를 나타내고, 넓이가 처음과 같아지는 방정식과 시간의 범위를 쓰시오.\n(2) 방정식의 모든 실근을 구하시오. 처음 시각 $t=0$을 제외하고 양의 회복 시각이 있는지 판정하시오.\n(3) 가능한 경우 두 변과 넓이를 원상황에 대입하여 확인하고, 불가능하면 제외 이유를 설명하시오.`,
      positive(t)
        ? `$${tex(t)}$분 후; 가로 $${tex(L)}$ cm, 세로 $${tex(W)}$ cm`
        : "양의 회복 시각 없음",
      serializeNativeSolution([domain, model, roots, check].join("\n"), rubric),
      params,
    ),
    questionType: "서술형",
    rubric,
    difficulty: "응용",
    difficultyBasis: [
      "시간에 따른 두 변의 곱, 모든 근과 양의 시간·길이 정의역을 함께 판정",
    ],
  };
}

interface Reinforcement {
  title: string;
  version: string;
  requirement: StudyRequirementId;
  make: (seed: number, variant: number) => ExamStudyDraft;
  verify: ExamStudyFamily["verify"];
  evidence: ExamStudyEvidence;
  paramDomain: ExamStudyFamily["paramDomain"];
}
/** Pure adapter overlay: no database, source-original corpus, UI, or general engine writes. */
export function legacyReinforcement(
  id: string,
  original: (seed: number, variant: number) => ExamStudyDraft,
): Reinforcement | undefined {
  const kind = (
    Object.keys(REINFORCEMENT_IDS) as (keyof typeof REINFORCEMENT_IDS)[]
  ).find((k) => REINFORCEMENT_IDS[k] === id);
  if (!kind) return undefined;
  const title = {
    candidate: "방정식별 후보 해의 대입 검산",
    equality: "비단위 관계에서 등식 진술 판단",
    classification: "다항식의 차수와 해집합 구별",
    model: "문장 모델과 원상황 대입 검산",
    simplify: "일차식 전개와 계수·상수항 해석",
    rectangle: "직사각형 넓이 회복과 시간 정의역",
  }[kind];
  const configs = {
    candidate: {
      requirement: "algebra.candidate-verification",
      verify: verifyReinforcedCandidate,
      domain: candidateDomain,
      make: makeCandidate,
      boundaries: [
        "all 30 nontrivial truth subsets × four distinct candidate ranges",
        "negative, zero, positive candidates; each row has its own equation and candidate",
      ],
    },
    equality: {
      requirement: "algebra.equality-truth",
      verify: verifyReinforcedEquality,
      domain: equalityDomain,
      make: makeEquality,
      boundaries: [
        "four signed nonunit relations × two offsets × four truth switches",
        "universal polynomial identity, false witnesses, b=0 undefined quotient",
      ],
    },
    simplify: {
      requirement: "algebra.linear-simplify",
      verify: verifyReinforcedSimplify,
      domain: simplifyDomain,
      make: makeSimplify,
      boundaries: [
        "all 144 coefficient tuples",
        "positive/negative outer factors, zero coefficients/constants, expansion through A+B",
      ],
    },
    rectangle: {
      requirement: "written.rectangle-domain",
      verify: verifyReinforcedRectangle,
      domain: rectangleDomain,
      make: makeRectangle,
      boundaries: [
        "all 60 L0/W0/p/q tuples",
        "positive/negative return root, repeated t=0, open length-positive upper bound, original-area check, native rubric",
      ],
    },
  } as const;
  if (kind === "classification" || kind === "model") {
    const classification = kind === "classification";
    const requirement = classification
      ? "algebra.equation-classification"
      : "algebra.linear-model";
    return {
      title,
      version: classification
        ? "exam-exact-classification-r2"
        : "exam-original-model-check-r2",
      requirement,
      verify: classification
        ? verifyReinforcedClassification
        : verifyReinforcedModel,
      paramDomain: {
        kind: "sampled",
        description:
          "기존 생성 영역의 256 seeds × 2 variants 검사 및 별도 경계 강제; 전체 용량 미측정",
        maxAttempts: 48,
      },
      evidence: {
        testFile: "src/__tests__/unit/examStudyReinforcement.test.ts",
        sampleCount: 512,
        checkedRequirements: [requirement],
        checks: ["independent-solution", "essential-conditions"],
        boundaryCases: classification
          ? [
              "exact degree 2/1/constant/zero polynomial; no numeric fitting",
              "forced identity, impossible and quadratic cancellation, all five rows and requested subset",
            ]
          : [
              "larger/smaller relations, positive/negative coefficient difference",
              "both original quantities substituted and compared in the printed solution",
            ],
      },
      make(seed, variant): ExamStudyDraft {
        const item = original(seed, variant);
        if (classification) {
          const rows = classificationRows(item.content);
          return {
            ...item,
            parameters: { equations: rows.map((r) => r.printed).sort() },
            solution:
              rows
                .map(
                  (r, i) =>
                    `${IDS[i]}: 양변을 정리하면 $${r.reduced}=0$이므로 ${r.label}이다.`,
                )
                .join("\n") +
              `\n일차방정식인 항목: ${[...IDS].filter((_, i) => rows[i]!.label === "일차방정식").join(", ")}. 따라서 $${rows.filter((r) => r.label === "일차방정식").length}$개이다.`,
          };
        }
        const m = modelWords(item.content),
          first = m.a * m.x + m.b,
          second = m.c * m.x;
        return {
          ...item,
          parameters: { a: m.a, b: m.b, c: m.c, delta: m.delta },
          solution: `어떤 수를 $x$라 하면 $${m.a}x+${m.b}=${m.c}x${signed(m.delta)}$이다.\n정리하여 풀면 $x=${m.x}$이다.\n원상황 확인: 첫 계산 $${m.a}\\times${m.x}+${m.b}=${first}$, 비교 계산 $${m.c}\\times${m.x}=${second}$이다.\n$${first}-${second}=${m.delta}$이므로 첫 계산은 비교 계산보다 $${Math.abs(m.delta)}$만큼 ${m.delta > 0 ? "크다" : "작다"}.`,
        };
      },
    };
  }
  const config = configs[kind],
    domain = config.domain();
  const requirement = config.requirement;
  return {
    title,
    version: `exam-${kind}-reinforced-r2`,
    requirement,
    verify: config.verify,
    evidence: {
      testFile: "src/__tests__/unit/examStudyReinforcement.test.ts",
      sampleCount: domain.length,
      boundaryCases: config.boundaries,
      checkedRequirements: [requirement],
      checks: [
        "independent-solution",
        "essential-conditions",
        ...(kind === "rectangle" ? ["native-rubric" as const] : []),
      ],
    },
    paramDomain: {
      kind: "finite",
      size: domain.length,
      enumerate: () => domain,
    },
    make: (seed, variant) =>
      config.make(
        domain[(((seed >>> 0) % domain.length) + variant) % domain.length]!,
      ),
  };
}
