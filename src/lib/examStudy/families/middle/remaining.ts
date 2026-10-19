import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { checkRubric, draft, insist, rubric, same, type RubricPart } from "./support";

/** Original finite text models. No source-school text, numbers, figures or answer gold. */
type Solved = {
  parameters: CanonicalParams;
  answer: string;
  steps: string[];
};
type Definition = {
  key: string;
  title: string;
  course: "중1" | "중2";
  unit: string;
  requirement: StudyRequirementId;
  domain: readonly CanonicalParams[];
  boundaries: readonly string[];
  version?: string;
  writtenParts?: readonly Omit<RubricPart, "expected">[];
  make(p: CanonicalParams): ExamStudyDraft;
  // Only printed content is passed: neither the answer nor generator parameters are an oracle.
  solve(content: string): Solved;
};
function remainingFamily(d: Definition): ExamStudyFamily {
  const checks = d.writtenParts
    ? ["independent-solution", "essential-conditions", "native-rubric"] as const
    : ["independent-solution", "essential-conditions"] as const;
  const nativeRubric = (steps: string[]) => {
    insist(d.writtenParts?.length === steps.length, "풀이와 채점 단계 수 불일치");
    return rubric(d.writtenParts.map((part, i) => ({...part, expected:steps[i]})));
  };
  insist(
    d.domain.length > 0 &&
      new Set(d.domain.map((p) => JSON.stringify(p))).size === d.domain.length,
    "유한 영역의 중복",
  );
  return {
    id: `study-middle-${d.key}`,
    version: d.version ?? "1",
    title: d.title,
    course: d.course,
    unitIds: [`${d.course}|${d.unit}`],
    unitSections: [d.unit],
    source: "authored",
    fulfills: [{ requirement: d.requirement, level: "full" }],
    formats: [d.writtenParts ? "서술형" : "단답형"],
    difficulties: ["심화하"],
    representation: "text",
    figureKinds: [],
    paramDomain: {
      kind: "finite",
      size: d.domain.length,
      enumerate: () => d.domain.map((p) => ({ ...p })),
    },
    evidence: {
      testFile: "src/__tests__/unit/examStudyMiddleRemaining.test.ts",
      sampleCount: d.domain.length,
      boundaryCases: d.boundaries,
      checkedRequirements: [d.requirement],
      checks,
    },
    generate(seed, variant) {
      insist(
        Number.isSafeInteger(seed) &&
          Number.isSafeInteger(variant) &&
          variant >= 0,
        "seed/variant 범위",
      );
      const size = d.domain.length;
      const item=d.make(d.domain[((seed % size) + (variant % size) + size) % size]);
      return d.writtenParts
        ? {...item, questionType:"서술형", rubric:nativeRubric(item.solution.split("\n"))}
        : item;
    },
    canonicalParams: (item) => d.solve(item.content).parameters,
    verify(item) {
      try {
        insist(
          item.questionType === (d.writtenParts ? "서술형" : "단답형") &&
            item.figureSpec === null &&
            (d.writtenParts || item.rubric === undefined) &&
            item.distractors === undefined &&
            item.difficulty === "심화하" &&
            item.difficultyBasis.length > 0,
          "지원하는 실제 형식/자료/난도 근거",
        );
        const solved = d.solve(item.content);
        insist(
          same(item.parameters, solved.parameters) &&
            d.domain.some((p) => same(p, solved.parameters)),
          "인쇄 조건과 유한 논리 영역 불일치",
        );
        insist(item.answer === solved.answer, "인쇄 조건의 독립 정답 불일치");
        insist(
          item.solution === solved.steps.join("\n"),
          "독립 검산한 풀이 단계 불일치",
        );
        if (d.writtenParts) {
          checkRubric(item, solved.steps);
          insist(same(item.rubric, nativeRubric(solved.steps)), "채점 대안/오류 기준 불일치");
        }
        return { valid: true, checks, errors: [] };
      } catch (error) {
        return {
          valid: false,
          checks: [],
          errors: [error instanceof Error ? error.message : "독립 검산 실패"],
        };
      }
    },
  };
}
function lines(content: string, patterns: readonly (string | RegExp)[]) {
  const printed = content.split("\n");
  insist(printed.length === patterns.length, "필수 조건 행 누락/추가");
  return patterns.map((pattern, i) => {
    if (typeof pattern === "string") {
      insist(printed[i] === pattern, "필수 조건/물음 변경");
      return [] as string[];
    }
    const m = pattern.exec(printed[i]);
    insist(m, "인쇄 수치/조건 표기 변경");
    return [...m];
  });
}
function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}
function rational(n: number, d = 1): string {
  insist(
    Number.isSafeInteger(n) && Number.isSafeInteger(d) && d !== 0,
    "정확한 유리수 범위",
  );
  const g = gcd(n, d),
    sign = d < 0 ? -1 : 1;
  return Math.abs(d) === g
    ? String((sign * n) / g)
    : `${(sign * n) / g}/${Math.abs(d) / g}`;
}
/** Decimal half-up using integer long division; no binary floating-point percentage rounding. */
function rounded(n: number, d: number, places: number): string {
  insist(
    n >= 0 && d > 0 && Number.isInteger(places) && places >= 0 && places <= 3,
    "반올림 영역",
  );
  const scaled = n * 10 ** places;
  insist(
    Number.isSafeInteger(scaled) && Number.isSafeInteger(d),
    "반올림 정수 범위",
  );
  const whole = Math.floor(scaled / d),
    rest = scaled % d;
  const value = String(whole + (2 * rest >= d ? 1 : 0)).padStart(
    places + 1,
    "0",
  );
  return places === 0
    ? value
    : `${value.slice(0, -places)}.${value.slice(-places)}`;
}
const signed = (n: number) => (n < 0 ? String(n) : `+${n}`);
const linear = (a: number, b: number) => `${a}x${signed(b)}`;
const list = (xs: number[]) => `{${xs.join(",")}}`;
const basis = [
  "앞 단계의 복원값을 다음 조건에 재사용",
  "조건의 완전성·단위·비퇴화 검산",
];

const doublingRules = [
  "두 배양 상자 A, B는 같은 순간에 관찰을 시작한다. 첫 증가는 관찰 시작으로부터 정확히 한 주기가 지난 순간에 일어난다. 두 상자의 수는 같은 주기마다 동시에 정확히 두 배가 되고, 그 사이에는 변하지 않는다.",
  "목표 수는 두 상자의 초기 수보다 큰 같은 수이다. 두 상자가 그 목표에 처음 도달하는 순간이 각각 존재한다.",
] as const;
const doublingQuestion =
  "다른 상자가 목표에 처음 도달하는 시각을 관찰 시작 후 몇 분인지 $t$를 사용한 식으로 나타내시오. 반복 두 배 표와 시간 단위 변환을 풀이에 쓰시오.";
const doublingDomain: CanonicalParams[] = [];
for (const period of [7, 13])
  for (const gap of [1, 2, 3])
    for (const known of ["A", "B"])
      doublingDomain.push({
        initialA: 3,
        initialB: 3 * 2 ** gap,
        period,
        known,
      });
function doublingResult(
  A: number,
  B: number,
  period: number,
  known: string,
  table: number[],
  gap: number,
  early: string,
  delta: number,
): Omit<Solved, "parameters"> {
  const small = Math.min(A, B),
    other = known === "A" ? "B" : "A";
  const answer = `60t${signed(delta)} 분`;
  return {
    answer,
    steps: [
      `① 작은 초기 수 ${small}에서 반복 두 배 표는 ${table.join(" → ")}이다. 큰 초기 수까지 ${gap}회 차이가 난다.`,
      `② 같은 목표까지는 ${early}가 ${gap}회 먼저 도달하므로 시간 차는 $${gap}×${period}=${gap * period}$분이다.`,
      `③ ${known}의 도달 시각 $t$시간은 $60t$분이다. ${other}는 ${known}보다 ${delta > 0 ? "늦게" : "일찍"} 도달하므로 답은 $60t${signed(delta)}$분이다.`,
      "④ 첫 증가는 관찰 시작 한 주기 후이고 목표가 두 초기 수보다 크므로 두 도달 시각은 모두 적어도 한 주기 후인 양수이다.",
    ],
  };
}
export const doublingTimeOffset = remainingFamily({
  key: "doubling-time-offset",
  version: "2-native-written",
  writtenParts: [
    {id:"doubling-table",alternative:"초기 수를 같은 횟수만큼 두 배로 늘린 표나 덧셈으로 반복 횟수 차를 구해도 된다.",error:"임의의 초기 비를 반복 두 배의 횟수로 처리한다."},
    {id:"arrival-offset",alternative:"같은 실제 목표에 이르는 두 시간표를 비교해 시차를 구해도 된다.",error:"어느 상자가 먼저 도달하는지 또는 주기와 횟수 차의 곱을 잘못 구한다."},
    {id:"hours-to-minutes",alternative:"알려진 시각을 먼저 분으로 바꾼 뒤 시차를 더하거나 빼도 된다.",error:"시간을 분으로 바꾸지 않거나 시차의 부호를 반대로 쓴다."},
    {id:"positive-arrivals",alternative:"목표가 두 초기 수보다 크고 첫 증가는 한 주기 후라는 조건으로 양수를 설명한다.",error:"더 이른 도달 시각이 0 또는 음수인 경우를 허용한다."},
  ],
  title: "공통 배증 주기의 도달 시차와 문자 시간",
  course: "중1",
  unit: "문자의 사용과 식의 계산",
  requirement: "model.doubling-time-offset",
  domain: doublingDomain,
  boundaries: [
    "초기비 2,4,8과 양 방향 시차",
    "시간→분 단위",
    "목표가 두 초기 수보다 큼",
    "동시·공통 주기, 비배증비/같은 초기량 배제",
  ],
  make(p) {
    const A = Number(p.initialA),
      B = Number(p.initialB),
      period = Number(p.period),
      known = String(p.known);
    const gap = [2, 4, 8].indexOf(Math.max(A, B) / Math.min(A, B)) + 1;
    const table = Array.from(
      { length: gap + 1 },
      (_, i) => Math.min(A, B) * 2 ** i,
    );
    const early = A > B ? "A" : "B",
      delta = (known === early ? 1 : -1) * gap * period;
    const result = doublingResult(
      A,
      B,
      period,
      known,
      table,
      gap,
      early,
      delta,
    );
    return draft(
      p,
      [
        doublingRules[0],
        `처음 수는 A가 ${A}개, B가 ${B}개이고 공통 주기는 ${period}분이다.`,
        doublingRules[1],
        `${known}가 목표에 처음 도달하는 시각은 관찰 시작 후 $t$시간이다.`,
        doublingQuestion,
      ].join("\n"),
      result.answer,
      result.steps.join("\n"),
      null,
      basis,
    );
  },
  solve(content) {
    const m = lines(content, [
      doublingRules[0],
      /^처음 수는 A가 (\d+)개, B가 (\d+)개이고 공통 주기는 (\d+)분이다\.$/,
      doublingRules[1],
      /^([AB])가 목표에 처음 도달하는 시각은 관찰 시작 후 \$t\$시간이다\.$/,
      doublingQuestion,
    ]);
    const A = Number(m[1][1]),
      B = Number(m[1][2]),
      period = Number(m[1][3]),
      known = m[3][1];
    insist(
      A > 0 && B > 0 && A !== B && period > 0,
      "양의 서로 다른 초기 수와 주기",
    );
    const table = [Math.min(A, B)];
    while (table.at(-1)! < Math.max(A, B) && table.length <= 12)
      table.push(table.at(-1)! * 2);
    insist(table.at(-1) === Math.max(A, B), "초기비가 반복 배증비가 아님");
    // Independently reach one actual common target and compare the two time tables.
    const target = 2 * Math.max(A, B),
      times: number[] = [];
    for (const initial of [A, B]) {
      let population = initial,
        time = 0;
      while (population < target) {
        population *= 2;
        time += period;
      }
      insist(population === target, "공통 목표 도달");
      times.push(time);
    }
    const delta = known === "A" ? times[1] - times[0] : times[0] - times[1];
    const gap = Math.abs(times[0] - times[1]) / period,
      early = times[0] < times[1] ? "A" : "B";
    return {
      parameters: { initialA: A, initialB: B, period, known },
      ...doublingResult(A, B, period, known, table, gap, early, delta),
    };
  },
});

const circleDomain = [
  [66, 32],
  [81, 40],
  [2024, 1000],
  [2026, 1000],
  [101, 50],
  [323, 160],
  [317, 120],
  [67, 30],
  [241, 100],
  [118, 45],
].map(([diameter, radius]) => ({ diameter, radius }));
const circleRules = [
  "한 바퀴 굴러간 거리는 원주와 같고 미끄러짐은 없다. 원래 바퀴와 새 바퀴가 각각 굴러간 총 거리는 같은 양수이다. 마지막의 일부 회전도 회전수에 포함한다.",
  "새 바퀴의 회전수는 원래 바퀴보다 몇 % 증가하는가? 원래 회전수를 기준량으로 하고, 소수 둘째 자리에서 반올림하여 소수 첫째 자리까지 쓰시오. 원주에서 회전수 비를 얻는 과정을 쓰시오.",
] as const;
function circleResult(
  D: number,
  R: number,
  ratio: string,
  rate: string,
  answer: string,
): Omit<Solved, "parameters"> {
  return {
    answer: `${answer}%`,
    steps: [
      `① 새 지름은 $2×${R}=${2 * R}$ cm이다. 원래 원주는 $${D}\\pi$ cm, 새 원주는 $${2 * R}\\pi$ cm이다.`,
      `② 같은 거리에서 회전수는 원주에 반비례한다. 원래 원주:새 원주=$${D}:${2 * R}$이므로 새 회전수/원래 회전수=$${ratio}$이다.`,
      `③ 원래 회전수를 기준으로 한 증가율은 $( ${ratio}-1 )×100=${rate}$ %이다.`,
      `④ 이 유리수를 소수 둘째 자리에서 반올림하면 ${answer}%이다. 지름의 감소율을 그대로 답하거나 새 회전수를 기준으로 나누면 안 된다.`,
    ],
  };
}
export const circleRevolutionPercentage = remainingFamily({
  key: "circle-revolution-percentage",
  version: "2-native-written",
  writtenParts: [
    {id:"radius-circumference",alternative:"새 반지름을 지름으로 바꾼 뒤 두 원주를 같은 단위로 비교한다.",error:"새 반지름을 지름으로 읽거나 원주율을 한쪽에만 적용한다."},
    {id:"inverse-turn-ratio",alternative:"원래 바퀴와 새 바퀴가 같은 거리를 가는 구체적인 회전수를 만들어 비를 구해도 된다.",error:"지름의 비와 회전수의 비를 같은 방향으로 놓는다."},
    {id:"original-reference-percent",alternative:"늘어난 회전수와 원래 회전수를 직접 비교해 백분율을 구해도 된다.",error:"새 회전수를 기준량으로 나누거나 지름 감소율을 그대로 쓴다."},
    {id:"exact-rounding",alternative:"정확한 분수나 충분한 소수 자릿수로 반올림 위치를 확인한다.",error:"중간에 반올림하거나 소수 첫째 자리까지의 답에서 필요한 0을 누락한다."},
  ],
  title: "반지름에서 원주를 거쳐 회전수 증가율",
  course: "중1",
  unit: "일차방정식의 활용",
  requirement: "model.circle-revolution-percentage",
  domain: circleDomain,
  boundaries: [
    "정확한 유리수 반올림: 경계 아래/정확히 절반/위",
    "지름과 반지름 구분",
    "동일 거리와 원래 기준량",
    "지름 감소·양수, 동률/증가 지름 배제",
  ],
  make(p) {
    const D = Number(p.diameter),
      R = Number(p.radius);
    const result = circleResult(
      D,
      R,
      rational(D, 2 * R),
      rational(100 * (D - 2 * R), 2 * R),
      rounded(100 * (D - 2 * R), 2 * R, 1),
    );
    return draft(
      p,
      [
        `원래 바퀴의 지름은 ${D} cm이고 새 바퀴의 반지름은 ${R} cm이다.`,
        ...circleRules,
      ].join("\n"),
      result.answer,
      result.steps.join("\n"),
      null,
      basis,
    );
  },
  solve(content) {
    const m = lines(content, [
      /^원래 바퀴의 지름은 (\d+) cm이고 새 바퀴의 반지름은 (\d+) cm이다\.$/,
      ...circleRules,
    ]);
    const D = Number(m[0][1]),
      R = Number(m[0][2]);
    insist(R > 0 && D > 2 * R, "양의 감소 지름");
    // Use the common distance D*(2R)*π: count turns separately, not diameter-percent subtraction.
    const distanceInPi = D * (2 * R),
      oldTurns = distanceInPi / D,
      newTurns = distanceInPi / (2 * R);
    const increaseNumerator = 100 * (newTurns - oldTurns);
    return {
      parameters: { diameter: D, radius: R },
      ...circleResult(
        D,
        R,
        rational(newTurns, oldTurns),
        rational(increaseNumerator, oldTurns),
        rounded(increaseNumerator, oldTurns, 1),
      ),
    };
  },
});

const coprimeDomain: CanonicalParams[] = [];
for (const denominator of [6, 8, 9, 10, 12, 15, 18])
  for (const lower of [1, 3]) coprimeDomain.push({ denominator, lower });
const coprimeQuestion =
  "그 분수들의 합 $S$를 $n$에 관한 다항식으로 나타내고, 분자 $a$를 분모로 나눌 때 가능한 나머지를 모두 쓰시오. 나머지의 완전성과 각 구간의 합을 설명하시오.";
const sumIdentity =
  "필요하면 $0+1+\\cdots+(n-1)=n(n-1)/2$를 사용해도 좋다. 여기서 $n=1$일 때 왼쪽 합은 0이다.";
function coprimeResult(
  D: number,
  lower: number,
  residues: number[],
  rejected: number[],
  quadratic: number,
  linearCoefficient: number,
): Omit<Solved, "parameters"> {
  const count = residues.length,
    residueSum = residues.reduce((a, b) => a + b, 0);
  const pairs = residues
    .filter((r) => r < D - r)
    .map((r) => `${r}↔${D - r}`)
    .join(", ");
  const polynomial = `${quadratic}n^{2}+${linearCoefficient}n`;
  return {
    answer: `나머지=${list(residues)}; $S=${polynomial}$`,
    steps: [
      `① 모든 분자는 유일하게 $a=${D}(k+${lower})+r$, $0≤k≤n-1$, $1≤r≤${D - 1}$로 나타난다. $r=0$이면 기약분수가 아니므로 제외한다. 각 분수는 $k+${lower}+r/${D}$이다.`,
      `② $${D}$와 공약수가 1뿐인 나머지는 ${list(residues)}, 탈락하는 0 아닌 나머지는 ${list(rejected)}이다. $a$와 ${D}의 공약수는 $r$와 ${D}의 공약수와 같으므로 이것이 빠짐없는 목록이다.`,
      `③ 나머지의 짝은 ${pairs}이고 각 짝의 합은 ${D}이다. 따라서 나머지는 ${count}개, 합은 ${residueSum}이다. 한 구간의 분수 합은 $${count}(k+${lower})+${residueSum}/${D}$이다.`,
      `④ $k=0$부터 $n-1$까지 더하면 $S=${count}×n(n-1)/2+${count * lower + count / 2}n=${polynomial}$이다. 나머지 표현의 유일성으로 중복이나 빠진 분수는 없다.`,
    ],
  };
}
export const coprimeSymbolicSum = remainingFamily({
  key: "coprime-symbolic-sum",
  title: "기약분수의 완전한 나머지 목록과 문자 합",
  course: "중1",
  unit: "소인수분해",
  requirement: "number.coprime-symbolic-sum",
  domain: coprimeDomain,
  boundaries: [
    "합성 분모: 소수 거듭제곱/서로 다른 소인수",
    "양의 정수 n, 길이1 구간",
    "완전한 나머지 분류와 r↔D-r",
    "분자 직접 gcd 전수 대조 n=1..12",
  ],
  make(p) {
    const D = Number(p.denominator),
      lower = Number(p.lower);
    const residues: number[] = [],
      rejected: number[] = [];
    for (let r = 1; r < D; r++) (gcd(r, D) === 1 ? residues : rejected).push(r);
    const result = coprimeResult(
      D,
      lower,
      residues,
      rejected,
      residues.length / 2,
      residues.length * lower,
    );
    return draft(
      p,
      [
        "$n$은 양의 정수이고 $a$는 자연수이다.",
        `분모가 ${D}인 분수 $a/${D}$ 중에서 $${lower}<a/${D}<n+${lower}$이고 기약분수인 것만 모두 고른다.`,
        coprimeQuestion,
        sumIdentity,
      ].join("\n"),
      result.answer,
      result.steps.join("\n"),
      null,
      basis,
    );
  },
  solve(content) {
    const m = lines(content, [
      "$n$은 양의 정수이고 $a$는 자연수이다.",
      /^분모가 (\d+)인 분수 \$a\/(\d+)\$ 중에서 \$(\d+)<a\/(\d+)<n\+(\d+)\$이고 기약분수인 것만 모두 고른다\.$/,
      coprimeQuestion,
      sumIdentity,
    ]);
    const D = Number(m[1][1]),
      lower = Number(m[1][3]);
    insist(
      D >= 4 &&
        D <= 30 &&
        lower > 0 &&
        m[1][1] === m[1][2] &&
        m[1][1] === m[1][4] &&
        m[1][3] === m[1][5],
      "일치하는 분모/문자 경계",
    );
    // Independently sieve by every proper divisor; no phi formula is assumed by a middle-1 student.
    const divisors = Array.from({ length: D - 2 }, (_, i) => i + 2).filter(
      (d) => D % d === 0,
    );
    insist(divisors.length > 0, "합성수 분모가 아님");
    const residues: number[] = [],
      rejected: number[] = [];
    for (let r = 1; r < D; r++)
      (divisors.some((d) => r % d === 0) ? rejected : residues).push(r);
    insist(
      residues.every((r) => residues.includes(D - r)) &&
        residues.length % 2 === 0,
      "완전한 서로소 짝",
    );
    insist(
      residues.reduce((s, r) => s + r, 0) * 2 === D * residues.length,
      "나머지 합 검산",
    );
    const directSum = (n: number) => {
      let numerator = 0;
      for (let a = D * lower + 1; a < D * (lower + n); a++)
        if (!divisors.some((d) => a % d === 0) && a % D !== 0) numerator += a;
      insist(numerator % D === 0, "구간 합의 정수성");
      return numerator / D;
    };
    const one = directSum(1),
      two = directSum(2),
      quadratic = (two - 2 * one) / 2,
      linearCoefficient = one - quadratic;
    insist(
      quadratic === residues.length / 2 &&
        linearCoefficient === residues.length * lower &&
        directSum(3) === 9 * quadratic + 3 * linearCoefficient,
      "짝짓기 일반식과 직접 구간 합",
    );
    return {
      parameters: { denominator: D, lower },
      ...coprimeResult(
        D,
        lower,
        residues,
        rejected,
        quadratic,
        linearCoefficient,
      ),
    };
  },
});

const integerAreaDomain: CanonicalParams[] = [];
for (const [p, q] of [
  [2, 3],
  [3, 5],
  [4, 7],
])
  for (const i of [1, 2])
    for (const j of [1, 2]) integerAreaDomain.push({ p, q, N: p * i + q * j });
const areaRules = [
  "$O$는 원점이고, $A$와 $B$는 각각 직선 $\\ell$의 $x$절편과 $y$절편인 점이다.",
  "$P$는 직선 $\\ell$ 위의 점이며 두 좌표가 모두 음의 정수이다.",
  "$A,B$의 좌표와 가능한 모든 $P$를 구하고, 삼각형 $OAP$와 $OBP$의 넓이를 각각 구하여 어느 쪽이 더 큰지 쓰시오. 가능한 정수점을 빠짐없이 조사한 과정을 쓰시오.",
] as const;
function integerAreaResult(
  p: number,
  q: number,
  N: number,
  i: number,
  j: number,
  first: string,
  second: string,
  bigger: string,
): Omit<Solved, "parameters"> {
  const a = rational(-N, p),
    b = rational(-N, q);
  const candidates: string[] = [];
  for (let u = 1; p * u < N; u++) {
    const v = rational(N - p * u, q);
    candidates.push(`(${u},${v})`);
  }
  return {
    answer: `A=(${a},0), B=(0,${b}); P={(-${i},-${j})}; 넓이 OAP=${first}, OBP=${second}; ${bigger}가 큼`,
    steps: [
      `① $y=0$, $x=0$을 각각 대입하면 $A=(${a},0)$, $B=(0,${b})$이다. 두 절편은 0이 아니고 음수이다.`,
      `② $P=(-i,-j)$라 두면 $i,j$는 양의 정수이고 $${p}i+${q}j=${N}$이다. 따라서 $1≤i<${N}/${p}$, $1≤j<${N}/${q}$이므로 조사할 범위는 유한하다.`,
      `③ 가능한 $i$마다 얻은 $(i,j)$ 전체는 ${candidates.join(", ")}이다. 두 성분이 모두 양의 정수인 것은 (${i},${j})뿐이므로 $P=(-${i},-${j})$로 유일하다.`,
      `④ $OA$와 $OB$를 밑변으로 하면 높이는 각각 ${j}, ${i}이다. 넓이는 $[OAP]=${N}/${p}×${j}/2=${first}$, $[OBP]=${N}/${q}×${i}/2=${second}$이다. 두 넓이가 양수이고 ${bigger}가 더 크다.`,
    ],
  };
}
export const interceptIntegerArea = remainingFamily({
  key: "intercept-integer-area",
  version: "2-native-written",
  writtenParts: [
    {id:"negative-intercepts",alternative:"직선과 각 좌표축의 교점을 구해 두 절편의 좌표를 나타낸다.",error:"절편의 순서·부호를 바꾸거나 좌표를 길이와 혼동한다."},
    {id:"finite-integer-domain",alternative:"음의 정수 좌표의 범위를 직선식과 양수 조건으로 직접 제한해도 된다.",error:"음의 실수나 축 위의 점을 허용하거나 조사할 범위를 제한하지 않는다."},
    {id:"complete-integer-points",alternative:"제한된 범위에서 모든 정수 좌표를 대입해 가능한 점을 빠짐없이 찾는다.",error:"한 점만 찾고 다른 정수점의 존재 여부를 조사하지 않는다."},
    {id:"positive-area-comparison",alternative:"좌표축 위의 밑변과 수직 높이를 이용해 각각의 넓이를 양수로 계산한다.",error:"음의 절편을 그대로 길이로 쓰거나 두 높이를 뒤바꾼다."},
  ],
  title: "음의 정수점 전체를 결정한 뒤 두 넓이 비교",
  course: "중2",
  unit: "일차함수와 일차방정식의 관계",
  requirement: "coord.intercept-integer-area",
  domain: integerAreaDomain,
  boundaries: [
    "양수 계수로 음의 정수 격자 범위 유한",
    "격자점 전체와 넓이 유일성",
    "정수/각 부호 조건 삭제 대조",
    "0개/복수 후보·축 위·공선 퇴화 제외",
  ],
  make(parameters) {
    const p = Number(parameters.p),
      q = Number(parameters.q),
      N = Number(parameters.N);
    // Modular construction, independent of the verifier's bounded lattice search.
    let inverse = 1;
    while ((p * inverse) % q !== 1) inverse++;
    const i = (inverse * N) % q || q,
      j = (N - p * i) / q;
    const result = integerAreaResult(
      p,
      q,
      N,
      i,
      j,
      rational(N * j, 2 * p),
      rational(N * i, 2 * q),
      q * j > p * i ? "OAP" : "OBP",
    );
    return draft(
      parameters,
      [`직선 $\\ell$의 방정식은 $${p}x+${q}y=-${N}$이다.`, ...areaRules].join(
        "\n",
      ),
      result.answer,
      result.steps.join("\n"),
      null,
      basis,
    );
  },
  solve(content) {
    const m = lines(content, [
      /^직선 \$\\ell\$의 방정식은 \$(\d+)x\+(\d+)y=-(\d+)\$이다\.$/,
      ...areaRules,
    ]);
    const p = Number(m[0][1]),
      q = Number(m[0][2]),
      N = Number(m[0][3]);
    insist(
      p > 0 && q > 0 && N > 0 && N < 100 && gcd(p, q) === 1,
      "비퇴화 정수 직선 영역",
    );
    const feasible: [number, number][] = [];
    for (let x = -Math.ceil(N / p) + 1; x < 0; x++)
      for (let y = -Math.ceil(N / q) + 1; y < 0; y++)
        if (p * x + q * y === -N) feasible.push([x, y]);
    insist(feasible.length === 1, "음의 정수점이 없거나 유일하지 않음");
    const [x, y] = feasible[0];
    // Independent determinant numerators; positive areas and a strict comparison are required.
    const twiceFirst = -N * y,
      twiceSecond = -N * x;
    insist(
      twiceFirst > 0 && twiceSecond > 0 && twiceFirst * q !== twiceSecond * p,
      "퇴화/동률 넓이",
    );
    return {
      parameters: { p, q, N },
      ...integerAreaResult(
        p,
        q,
        N,
        -x,
        -y,
        rational(twiceFirst, 2 * p),
        rational(twiceSecond, 2 * q),
        twiceFirst * q > twiceSecond * p ? "OAP" : "OBP",
      ),
    };
  },
});

const translatedDomain: CanonicalParams[] = [];
for (const a of [-3, -2, 2, 3])
  for (const b of [-12, 6])
    for (const v of [-5, 4])
      translatedDomain.push({
        h: 1,
        v,
        px: -2,
        py: a * (-2 - 1) + b + v,
        qx: 3,
        qy: a * (3 - 1) + b + v,
      });
const translatedQuestion =
  "이동 전 함수 $f$의 식과 그 그래프의 $x$절편 $α$, $y$절편 $β$를 구하시오. 이어서 그 값을 계수로 재사용한 새 직선 $y=βx+α$의 식과 이 직선이 지나지 않는 사분면을 쓰시오. 좌표축 위의 점은 어느 사분면에도 포함하지 않는다.";
function translatedResult(
  px: number,
  py: number,
  qx: number,
  qy: number,
  h: number,
  v: number,
  a: number,
  b: number,
  alpha: number,
  beta: number,
  missing: number,
): Omit<Solved, "parameters"> {
  return {
    answer: `f(x)=${linear(a, b)}; α=${alpha}, β=${beta}; 새 직선 y=${linear(beta, alpha)}; 지나지 않는 사분면=제${missing}사분면`,
    steps: [
      `① 이동을 되돌리면 $f$의 그래프는 $(${px - h},${py - v})$, $(${qx - h},${qy - v})$를 지난다. 기울기는 $(${qy - v}-(${py - v}))/(${qx - h}-(${px - h}))=${a}$이고, 한 점을 대입해 $f(x)=${linear(a, b)}$를 얻는다.`,
      `② $f(x)=0$에서 $α=${alpha}$, $x=0$에서 $β=${beta}$를 얻는다. 두 값은 모두 0이 아니며 서로 다르다.`,
      `③ 첫 그래프에서 얻은 $β$를 기울기, $α$를 상수항으로 넣으면 새 직선은 $y=${linear(beta, alpha)}$이다. 첫 직선의 기울기와 절편을 그대로 쓰는 것이 아니다.`,
      `④ 새 직선의 기울기는 ${beta > 0 ? "양수" : "음수"}이고 $y$절편은 ${alpha > 0 ? "양수" : "음수"}이다. $x=0$과 $x=${rational(-alpha, beta)}$를 경계로 부호를 조사하면 제${missing}사분면만 지나지 않는다.`,
    ],
  };
}
export const translatedCoefficientReuse = remainingFamily({
  key: "translated-coefficient-reuse-linear",
  title: "이동 직선의 복원·두 절편·계수 재사용",
  course: "중2",
  unit: "일차함수의 그래프",
  requirement: "graph.translated-coefficient-reuse",
  domain: translatedDomain,
  boundaries: [
    "좌표 자료→역이동→첫 직선→절편→둘째 직선",
    "네 사분면 제외 경우 모두",
    "수평·수직 이동과 두 점 모두 필요",
    "0 기울기/0 절편/같은 재사용 계수 배제",
  ],
  make(p) {
    const h = Number(p.h),
      v = Number(p.v),
      px = Number(p.px),
      py = Number(p.py),
      qx = Number(p.qx),
      qy = Number(p.qy);
    const a = (qy - py) / (qx - px),
      b = py - a * (px - h) - v;
    const alpha = -b / a;
    const missing = b > 0 ? (alpha > 0 ? 4 : 2) : alpha > 0 ? 3 : 1;
    const result = translatedResult(
      px,
      py,
      qx,
      qy,
      h,
      v,
      a,
      b,
      alpha,
      b,
      missing,
    );
    return draft(
      p,
      [
        `일차함수 $f$의 그래프를 $x$축의 양의 방향으로 ${h}만큼, $y$축의 ${v > 0 ? "양의" : "음의"} 방향으로 ${Math.abs(v)}만큼 평행이동하여 $g$의 그래프를 얻었다.`,
        `$g$의 그래프는 두 점 $P=(${px},${py})$, $Q=(${qx},${qy})$를 지난다.`,
        translatedQuestion,
      ].join("\n"),
      result.answer,
      result.steps.join("\n"),
      null,
      basis,
    );
  },
  solve(content) {
    const m = lines(content, [
      /^일차함수 \$f\$의 그래프를 \$x\$축의 양의 방향으로 (\d+)만큼, \$y\$축의 (양의|음의) 방향으로 (\d+)만큼 평행이동하여 \$g\$의 그래프를 얻었다\.$/,
      /^\$g\$의 그래프는 두 점 \$P=\((-?\d+),(-?\d+)\)\$, \$Q=\((-?\d+),(-?\d+)\)\$를 지난다\.$/,
      translatedQuestion,
    ]);
    const h = Number(m[0][1]),
      v = Number(m[0][3]) * (m[0][2] === "음의" ? -1 : 1);
    const [px, py, qx, qy] = m[1].slice(1).map(Number);
    insist(h > 0 && v !== 0 && px !== qx, "서로 다른 점과 두 축의 비영 이동");
    const x1 = px - h,
      y1 = py - v,
      x2 = qx - h,
      y2 = qy - v;
    // Recover a,b from a two-by-two determinant after inverse-moving the supplied points.
    const det = x1 - x2,
      a = (y1 - y2) / det,
      b = (x1 * y2 - x2 * y1) / det;
    insist(
      a !== 0 &&
        b !== 0 &&
        Number.isInteger(a) &&
        Number.isInteger(b) &&
        Number.isInteger(-b / a),
      "비퇴화 정수 계수/절편",
    );
    const alpha = -b / a,
      beta = b;
    insist(
      alpha !== beta && alpha !== 0 && a !== beta,
      "계수 재배치가 무의미한 경우",
    );
    insist(
      a * (px - h) + b + v === py &&
        a * (qx - h) + b + v === qy &&
        a * alpha + b === 0,
      "이동/두 입사/절편 원조건",
    );
    // All open intervals bounded by the two axes crossings have constant coordinate signs.
    const root = -alpha / beta,
      cuts = [Math.min(0, root), Math.max(0, root)];
    const samples = [cuts[0] - 1, (cuts[0] + cuts[1]) / 2, cuts[1] + 1];
    const seen = new Set<number>(
      samples.map((x) => {
        const y = beta * x + alpha;
        return x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
      }),
    );
    const missing = [1, 2, 3, 4].filter((q) => !seen.has(q));
    insist(seen.size === 3 && missing.length === 1, "새 직선의 사분면 분기");
    return {
      parameters: { h, v, px, py, qx, qy },
      ...translatedResult(px, py, qx, qy, h, v, a, b, alpha, beta, missing[0]),
    };
  },
});

/** Five course-specific demands, 64 finite canonical tuples; no seed/format/name inflation. */
export const MIDDLE_REMAINING_FAMILIES: readonly ExamStudyFamily[] = [
  doublingTimeOffset,
  circleRevolutionPercentage,
  coprimeSymbolicSum,
  interceptIntegerArea,
  translatedCoefficientReuse,
];
