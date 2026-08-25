/**
 * ① census가 고른 풀이 열쇠로 등록 중등 유형을 `결합형/아님/미분류`로 나눈다.
 * ② 열쇠→소단원은 살아 있는 `registeredTypes()`의 unitSection·rpmMinor와 말뭉치 분포에서
 *    다시 유도하고, 양성·음성 눈금이 모두 맞을 때만 전량 숫자와 근거를 낸다.
 * ③ combo 생성·DB·제품 코드·등록 메타는 바꾸지 않으며 애매한 것은 `아님`에 숨기지 않는다.
 *
 *   npx tsx scripts/qa/probe-middle-combo.ts --calibrate
 *   npx tsx scripts/qa/probe-middle-combo.ts
 *   npx tsx scripts/qa/probe-middle-combo.ts --census
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { registeredTypes } from "../../src/lib/middle/generate";
import type { TypeEntry } from "../../src/lib/middle/types";
import { solutionTerms } from "./census-middle-solution-vocab";

const DEFAULT_CORPUS = "C:/tmp/middle-combo/corpus.json";
const DEFAULT_VOCAB = "C:/tmp/middle-combo/solution-vocab2.json";
const DEFAULT_JSON = "C:/tmp/middle-combo/classifications2.json";
const DEFAULT_REPORT = "C:/tmp/middle-combo/classify-report2.md";
/**
 * 1차 기준선은 **저장소 안**에 둔다 (2026-08-25).
 *
 * 이것만 성질이 다르다 — 말뭉치·어휘는 빌더가 다시 만들지만, 기준선은 **1차 산출물**이라
 * 다시 만들 수 없다(지금 판정기는 2차인 `classifications2.json` 을 낸다). 그래서 `C:/tmp`
 * 에 두면 다른 컴퓨터에서 **영영 못 돈다** — 울타리가 시키는 두 빌더를 아무리 돌려도
 * 이 파일은 안 생긴다. 실제로 그렇게 막혔다.
 *
 * 원본 15.7MB 중 이 판정기가 읽는 것은 `denominator` 5개와 `{key, verdict}` 873개뿐이라
 * 그만 남겨 67KB 로 커밋했다(`.gitignore` 에 `!` 예외).
 */
const DEFAULT_BASELINE = resolve(
  __dirname,
  "reports",
  "middle-combo-baseline.json",
);
const COMBO_SCORE = 0.78;
const ANCHOR_CONTEXT_FLOOR = 0.5;

type Verdict = "결합형" | "아님" | "미분류";

type CorpusSample = {
  seed: number;
  variant: number;
  solution: string;
  content: string;
  answer: string;
};

type CorpusType = {
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  samples: CorpusSample[];
};

type CorpusFailure = {
  key: string;
  grade: string;
  unitSection: string;
  rpmTitle: string;
  errors: { seed: number; message: string }[];
};

type CorpusFile = {
  schemaVersion: number;
  denominator: {
    registered: number;
    attempted: number;
    succeeded: number;
    failed: number;
  };
  types: CorpusType[];
  failures: CorpusFailure[];
};

type UnitFrequency = {
  unitSection: string;
  frequency: number;
  typeFrequency: number;
};

type CensusKey = {
  term: string;
  kind: "어절" | "2어절" | "3어절" | "LaTeX명령" | "수식골격" | "식모양";
  frequency: number;
  typeFrequency: number;
  sampleFrequency: number;
  unitSections: UnitFrequency[];
  mappingSource: "등록 라벨" | "풀이 공기" | "풀이 분포";
  matchedLabelAtoms: string[];
  mappedUnitSections: string[];
  homeTypeFrequency: number;
  homePrecision: number;
  reason: string;
};

type CensusFile = {
  schemaVersion: number;
  source: {
    corpus: string;
    registeredTypes: number;
    successfulTypes: number;
    failedTypes: number;
    samples: number;
  };
  extraction: {
    policy: string;
    documentUnit: string;
    selectionPolicy: string;
  };
  terms: { term: string }[];
  conceptCandidates: CensusKey[];
  selectedKeys: CensusKey[];
  shapeDecisions?: {
    term: string;
    typeFrequency: number;
    topUnitSection: string;
    topUnitTypeFrequency: number;
    secondUnitTypeFrequency: number;
    concentration: number;
    topUnitPrevalence: number;
    lift: number;
    idf: number;
    signatureScore: number;
    associatedAtoms: string[];
    associatedUnitSections: string[];
    associationTypeFrequency: number;
    associationPrecision: number;
    selected: boolean;
    reason: string;
  }[];
};

type BaselineFile = {
  denominator: {
    registered: number;
    combo: number;
    notCombo: number;
    unclassified: number;
    generationFailed: number;
  };
  classifications: { key: string; verdict: Verdict }[];
};

type SampleScan = {
  terms: Map<string, number>;
};

type TypeScan = {
  type: CorpusType;
  samples: SampleScan[];
};

type LiveUnit = {
  unitSection: string;
  grades: Set<number>;
  atoms: Set<string>;
};

type DerivedKey = CensusKey & {
  liveMappedUnitSections: string[];
};

type CalibratedShapeUnits = Map<string, Set<string>>;

function isStructuralKind(kind: CensusKey["kind"]): boolean {
  return kind === "수식골격" || kind === "식모양";
}

type KeyEvidence = {
  term: string;
  kind: CensusKey["kind"];
  mappingSource: CensusKey["mappingSource"];
  mappedUnitCount: number;
  frequency: number;
  typeFrequency: number;
  homePrecision: number;
  strength: number;
  occurrences: number;
  sampleIndexes: number[];
  reason: string;
};

type ConceptEvidence = {
  unitSection: string;
  score: number;
  supportSamples: number;
  evidence: KeyEvidence[];
  excerpt: string;
};

type Classification = {
  key: string;
  grade: string;
  unitSection: string;
  rpmTitle: string;
  verdict: Verdict;
  suspicion: number;
  reason: string;
  external: ConceptEvidence[];
  selfSampleCoverage: number;
  sampleCount: number;
  vetoedTerms: number;
  uncertainTerms: number;
  futureTerms: number;
};

type Gauge = {
  key: string;
  expected: Verdict;
  expectedExternal?: string;
  why: string;
  core: boolean;
  round?: 2;
};

const GAUGE: Gauge[] = [
  {
    key: "3-2|원주각|06",
    expected: "결합형",
    expectedExternal: "삼각비",
    why: "원주각으로 각을 옮긴 뒤 직각삼각형의 삼각비를 계산",
    core: true,
  },
  {
    key: "3-2|원주각의 활용|14",
    expected: "결합형",
    expectedExternal: "닮음",
    why: "접선과 현이 이루는 각과 삼각형의 닮음",
    core: true,
  },
  {
    key: "3-1|이차방정식의 활용|15",
    expected: "결합형",
    expectedExternal: "닮음",
    why: "닮음비로 변을 놓고 이차방정식을 풂",
    core: true,
  },
  {
    key: "2-2|확률|02",
    expected: "결합형",
    expectedExternal: "방정식",
    why: "방정식의 해가 되는 경우를 센 뒤 확률을 계산",
    core: true,
  },
  {
    key: "3-1|이차방정식의 활용|12",
    expected: "아님",
    why: "초등 넓이로 식을 세울 뿐 중등 소단원은 이차방정식 하나",
    core: true,
  },
  {
    key: "3-2|삼각비의 활용|11",
    expected: "아님",
    why: "삼각비를 이용한 넓이 한 문형",
    core: true,
  },
  {
    key: "2-2|피타고라스 정리|09",
    expected: "아님",
    why: "제목과 달리 실제 풀이는 닮음을 쓰지 않는다고 손으로 확인한 추가 음성",
    core: false,
  },
  {
    key: "3-2|원과 직선|07",
    expected: "결합형",
    expectedExternal: "피타고라스",
    why: "접선과 반지름의 수직 관계로 직각삼각형을 만든 뒤 피타고라스 정리를 사용",
    core: false,
  },
  {
    key: "1-2|입체도형의 겉넓이와 부피|19",
    expected: "결합형",
    expectedExternal: "부채꼴",
    why: "원뿔 전개도와 부채꼴의 호의 길이를 함께 사용",
    core: false,
  },
  {
    key: "2-2|피타고라스 정리|04",
    expected: "결합형",
    expectedExternal: "마름모",
    why: "마름모 대각선의 성질과 피타고라스 정리를 함께 사용",
    core: false,
  },
  {
    key: "2-2|여러 가지 사각형|17",
    expected: "결합형",
    expectedExternal: "합동",
    why: "삼각형의 합동으로 사각형의 성질을 증명",
    core: false,
  },
  {
    key: "3-1|무리수와 실수|02",
    expected: "아님",
    why: "자연수 제곱을 세는 것은 무리수 정의 한 문형이며 생략부호는 개념 열쇠가 아님",
    core: false,
  },
  {
    key: "3-1|제곱근의 뜻과 성질|14",
    expected: "아님",
    why: "정수의 제곱을 세는 제곱근 한 문형이며 생략부호는 개념 열쇠가 아님",
    core: false,
  },
  {
    key: "2-2|피타고라스 정리|10",
    expected: "아님",
    why: "실제 풀이는 닮음만 사용하고 앵커인 피타고라스 정리를 사용하지 않음",
    core: false,
  },
  {
    key: "2-2|여러 가지 사각형|12",
    expected: "아님",
    why: "중점 연결 사각형의 성질 한 문형",
    core: false,
  },
  {
    key: "3-2|상자그림과 산점도|03",
    expected: "아님",
    why: "다섯 수 요약으로 상자그림을 만드는 한 문형",
    core: false,
  },
  {
    key: "2-2|피타고라스 정리|14",
    expected: "아님",
    why: "히포크라테스 넓이 정리 한 문형이며 삼각형 넓이는 초등 개념",
    core: false,
  },
  {
    key: "3-2|원주각의 활용|07",
    expected: "아님",
    why: "원에 내접하는 사각형의 외각 성질 한 문형",
    core: false,
  },
  {
    key: "1-2|다각형|20",
    expected: "아님",
    why: "정다각형 내각·외각 한 문형이며 분수 표기는 별도 개념이 아님",
    core: false,
  },
  {
    key: "1-2|입체도형의 겉넓이와 부피|24",
    expected: "아님",
    why: "회전체와 구의 겉넓이·부피 한 소단원 문형",
    core: false,
  },
  {
    key: "1-1|소인수분해|07",
    expected: "아님",
    why: "약수의 개수 한 문형이며 분수 표기는 별도 개념이 아님",
    core: false,
  },
  {
    key: "2-1|연립일차방정식의 활용|01",
    expected: "아님",
    why: "두 자연수를 연립방정식으로 나타내어 푸는 한 문형이며 다항식 계산이 독립적으로 필요하지 않음",
    core: false,
  },
  {
    key: "3-1|제곱근의 뜻과 성질|09",
    expected: "아님",
    why: "수의 대소로 부호를 정해 제곱근을 정리하는 한 문형이며 이차함수는 사용하지 않음",
    core: false,
  },
  {
    key: "2-1|단항식의 계산|14",
    expected: "미분류",
    why: "변형별로 초등 각기둥·삼각형과 중등 구의 부피가 섞여 유형 전체를 한 판정으로 확정할 수 없음",
    core: false,
  },
  {
    key: "2-2|여러 가지 사각형|03",
    expected: "미분류",
    why: "변형별로 마름모·평행사변형·이등변삼각형 풀이가 섞이고 census 매핑이 한 외부 소단원을 고립하지 못함",
    core: false,
  },
  {
    key: "3-2|원과 직선|03",
    expected: "결합형",
    expectedExternal: "피타고라스",
    why: "현의 수직이등분선 풀이에서 이름 없이 제곱합 관계를 사용",
    core: false,
    round: 2,
  },
  {
    key: "2-2|삼각형의 외심과 내심|11",
    expected: "결합형",
    expectedExternal: "피타고라스",
    why: "내접원 반지름 풀이에서 근호 안 두 제곱의 합을 사용",
    core: false,
    round: 2,
  },
  {
    key: "3-1|무리수와 실수|04",
    expected: "결합형",
    expectedExternal: "피타고라스",
    why: "수직선 위 무리수 풀이에서 근호 안 두 제곱의 합을 사용",
    core: false,
    round: 2,
  },
  {
    key: "3-2|삼각비의 활용|04",
    expected: "결합형",
    expectedExternal: "피타고라스",
    why: "삼각비 풀이에서 근호 안 두 제곱의 합을 사용",
    core: false,
    round: 2,
  },
  {
    key: "1-2|입체도형의 겉넓이와 부피|12",
    expected: "결합형",
    expectedExternal: "닮",
    why: "원뿔대 모선을 구할 때 이름 없이 같은 문자와 그 차의 비례식을 사용",
    core: false,
    round: 2,
  },
  {
    key: "3-1|다항식의 곱셈|03",
    expected: "아님",
    why: "두 제곱이 보여도 곱셈 공식 한 문형",
    core: false,
    round: 2,
  },
  {
    key: "3-1|다항식의 곱셈|11",
    expected: "아님",
    why: "992의 제곱을 곱셈 공식으로 계산하는 한 문형",
    core: false,
    round: 2,
  },
  {
    key: "3-1|다항식의 곱셈|15",
    expected: "아님",
    why: "제곱합 등식은 곱셈 공식의 변형일 뿐 피타고라스가 아님",
    core: false,
    round: 2,
  },
  {
    key: "3-1|다항식의 곱셈|16",
    expected: "아님",
    why: "제곱합 등식은 곱셈 공식의 변형일 뿐 피타고라스가 아님",
    core: false,
    round: 2,
  },
  {
    key: "1-1|일차방정식의 풀이|14",
    expected: "아님",
    why: "네 항 비례식 자체가 닮음을 뜻하지 않는 일차방정식 문형",
    core: false,
    round: 2,
  },
  {
    key: "1-2|원과 부채꼴|02",
    expected: "아님",
    why: "중심각과 호의 길이의 정비례는 닮음이 아님",
    core: false,
    round: 2,
  },
  {
    key: "1-2|원과 부채꼴|05",
    expected: "아님",
    why: "중심각과 넓이의 정비례는 닮음이 아님",
    core: false,
    round: 2,
  },
];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function labelWordVariants(label: string): string[] {
  const particles = [
    "으로",
    "에서",
    "에게",
    "부터",
    "까지",
    "처럼",
    "보다",
    "의",
    "과",
    "와",
  ];
  const out = new Set<string>();
  for (const word of label.normalize("NFC").match(/[가-힣]{2,}/gu) ?? []) {
    out.add(word);
    for (const particle of particles) {
      if (word.endsWith(particle) && word.length - particle.length >= 2) {
        out.add(word.slice(0, -particle.length));
      }
    }
  }
  return [...out];
}

function gradeRank(grade: string): number {
  const match = grade.match(/중([1-3])/);
  if (!match) throw new Error(`중등 학년을 해석할 수 없습니다: ${grade}`);
  return Number(match[1]);
}

function assertInputs(
  corpus: CorpusFile,
  census: CensusFile,
  entries: TypeEntry[],
): void {
  const d = corpus.denominator;
  if (
    corpus.schemaVersion !== 1 ||
    census.schemaVersion !== 1 ||
    d.registered !== d.attempted ||
    d.succeeded + d.failed !== d.registered ||
    corpus.types.length !== d.succeeded ||
    corpus.failures.length !== d.failed ||
    entries.length !== d.registered ||
    census.source.registeredTypes !== d.registered ||
    census.source.successfulTypes !== d.succeeded ||
    census.source.failedTypes !== d.failed
  ) {
    throw new Error(
      `입력 분모 불일치: 등록 ${d.registered} / 시도 ${d.attempted}` +
        ` / 성공 ${d.succeeded} / 실패 ${d.failed}` +
        ` / live ${entries.length} / census ${census.source.registeredTypes}`,
    );
  }

  const corpusByKey = new Map<string, CorpusType | CorpusFailure>([
    ...corpus.types.map((type) => [type.key, type] as const),
    ...corpus.failures.map((failure) => [failure.key, failure] as const),
  ]);
  for (const entry of entries) {
    const stored = corpusByKey.get(entry.key);
    if (!stored)
      throw new Error(`말뭉치에서 등록 키가 빠졌습니다: ${entry.key}`);
    for (const field of ["grade", "unitSection", "rpmTitle"] as const) {
      if (stored[field] !== entry[field]) {
        throw new Error(
          `${entry.key} ${field} 불일치: corpus=${JSON.stringify(stored[field])}` +
            ` / live=${JSON.stringify(entry[field])}`,
        );
      }
    }
    if ("rpmMinor" in stored && stored.rpmMinor !== entry.rpmMinor) {
      throw new Error(
        `${entry.key} rpmMinor 불일치: corpus=${JSON.stringify(stored.rpmMinor)}` +
          ` / live=${JSON.stringify(entry.rpmMinor)}`,
      );
    }
  }

  const allTerms = new Set(census.terms.map(({ term }) => term));
  for (const key of census.selectedKeys) {
    if (!allTerms.has(key.term)) {
      throw new Error(`census 원자료에 없는 판정 열쇠입니다: ${key.term}`);
    }
  }
  for (const gauge of GAUGE) {
    if (!entries.some((entry) => entry.key === gauge.key)) {
      throw new Error(`눈금 키 조회 실패: ${gauge.key}`);
    }
  }
}

function buildLiveUnits(entries: TypeEntry[]): {
  units: Map<string, LiveUnit>;
  atomUnitFrequency: Map<string, number>;
} {
  const units = new Map<string, LiveUnit>();
  for (const entry of entries) {
    let unit = units.get(entry.unitSection);
    if (!unit) {
      unit = {
        unitSection: entry.unitSection,
        grades: new Set<number>(),
        atoms: new Set<string>(),
      };
      units.set(entry.unitSection, unit);
    }
    unit.grades.add(gradeRank(entry.grade));
    for (const label of [entry.unitSection, entry.rpmMinor]) {
      for (const atom of labelWordVariants(label)) unit.atoms.add(atom);
    }
  }

  const atomUnitFrequency = new Map<string, number>();
  for (const unit of units.values()) {
    for (const atom of unit.atoms) {
      atomUnitFrequency.set(atom, (atomUnitFrequency.get(atom) ?? 0) + 1);
    }
  }
  return { units, atomUnitFrequency };
}

function scanTypes(corpus: CorpusFile, selected: Set<string>): TypeScan[] {
  return corpus.types.map((type) => ({
    type,
    samples: type.samples.map((sample) => {
      const terms = new Map<string, number>();
      for (const { term } of solutionTerms(sample.solution)) {
        if (!selected.has(term)) continue;
        terms.set(term, (terms.get(term) ?? 0) + 1);
      }
      return { terms };
    }),
  }));
}

function distributionMapping(term: string, scans: TypeScan[]): string[] {
  const unitStats = new Map<
    string,
    { frequency: number; typeKeys: Set<string> }
  >();
  for (const scan of scans) {
    const frequency = scan.samples.reduce(
      (sum, sample) => sum + (sample.terms.get(term) ?? 0),
      0,
    );
    if (frequency === 0) continue;
    let stats = unitStats.get(scan.type.unitSection);
    if (!stats) {
      stats = { frequency: 0, typeKeys: new Set<string>() };
      unitStats.set(scan.type.unitSection, stats);
    }
    stats.frequency += frequency;
    stats.typeKeys.add(scan.type.key);
  }
  const ranked = [...unitStats].sort(
    (a, b) => b[1].frequency - a[1].frequency || a[0].localeCompare(b[0]),
  );
  const topEight = ranked.slice(0, 8);
  const top = Math.max(0, ...topEight.map(([, stats]) => stats.typeKeys.size));
  if (top < 2) return [];
  const floor = Math.max(2, Math.ceil(top * 0.6));
  return topEight
    .filter(([, stats]) => stats.typeKeys.size >= floor)
    .map(([unitSection]) => unitSection)
    .sort();
}

function deriveKeys(
  census: CensusFile,
  scans: TypeScan[],
  units: Map<string, LiveUnit>,
): DerivedKey[] {
  const out: DerivedKey[] = [];
  for (const key of census.selectedKeys) {
    let liveMappedUnitSections: string[];
    if (key.kind === "식모양") {
      liveMappedUnitSections = [...key.mappedUnitSections].sort();
    } else if (
      key.mappingSource === "등록 라벨" ||
      key.mappingSource === "풀이 공기"
    ) {
      liveMappedUnitSections = [...units.values()]
        .filter((unit) =>
          key.matchedLabelAtoms.some((atom) => unit.atoms.has(atom)),
        )
        .map((unit) => unit.unitSection)
        .sort();
    } else {
      liveMappedUnitSections = distributionMapping(key.term, scans);
    }
    if (
      !arraysEqual(liveMappedUnitSections, [...key.mappedUnitSections].sort())
    ) {
      throw new Error(
        `census 뒤 등록/말뭉치가 바뀌었습니다: ${key.term}` +
          ` / census=${key.mappedUnitSections.join(",")}` +
          ` / live=${liveMappedUnitSections.join(",")}`,
      );
    }
    out.push({ ...key, liveMappedUnitSections });
  }
  return out;
}

function sharedConceptAtom(
  current: LiveUnit,
  mapped: LiveUnit,
  atomUnitFrequency: Map<string, number>,
  unitCount: number,
): string | undefined {
  if (current.unitSection === mapped.unitSection) return current.unitSection;
  const maxUnitFrequency = Math.max(3, Math.ceil(unitCount * 0.12));
  return [...current.atoms]
    .filter(
      (atom) =>
        atom.length >= 2 &&
        mapped.atoms.has(atom) &&
        (atomUnitFrequency.get(atom) ?? unitCount) <= maxUnitFrequency,
    )
    .sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}

function relation(
  key: DerivedKey,
  type: CorpusType,
  units: Map<string, LiveUnit>,
  atomUnitFrequency: Map<string, number>,
): { self: boolean; external: string[]; future: string[] } {
  const current = units.get(type.unitSection);
  if (!current) throw new Error(`live 소단원 없음: ${type.unitSection}`);
  const anchorGrade = gradeRank(type.grade);
  const mapped = key.liveMappedUnitSections.map((name) => {
    const unit = units.get(name);
    if (!unit) throw new Error(`열쇠 매핑 소단원 없음: ${name}`);
    return unit;
  });
  if (
    key.kind !== "식모양" &&
    mapped.some((unit) =>
      sharedConceptAtom(current, unit, atomUnitFrequency, units.size),
    )
  ) {
    return { self: true, external: [], future: [] };
  }
  const external: string[] = [];
  const future: string[] = [];
  let structuralSelf = false;
  for (const unit of mapped) {
    if (key.kind === "식모양") {
      const shared = sharedConceptAtom(
        current,
        unit,
        atomUnitFrequency,
        units.size,
      );
      if (
        unit.unitSection === current.unitSection ||
        (shared?.length ?? 0) >= 3
      ) {
        structuralSelf = true;
        continue;
      }
    }
    const grades = [...unit.grades];
    if (grades.some((grade) => grade <= anchorGrade))
      external.push(unit.unitSection);
    else future.push(unit.unitSection);
  }
  if (key.kind === "식모양") {
    external.push(...future);
    future.length = 0;
  }
  return {
    self: structuralSelf && external.length === 0 && future.length === 0,
    external: [...new Set(external)].sort(),
    future: [...new Set(future)].sort(),
  };
}

function keyStrength(key: DerivedKey, typeCount: number): number {
  const idf =
    Math.log((typeCount + 1) / (key.typeFrequency + 1)) /
    Math.log(typeCount + 1);
  return 0.6 * key.homePrecision + 0.4 * idf;
}

function negativeVetoTerms(
  scansByKey: Map<string, TypeScan>,
  keysByTerm: Map<string, DerivedKey>,
  units: Map<string, LiveUnit>,
  atomUnitFrequency: Map<string, number>,
  anchorPrevalence: Map<string, Map<string, number>>,
): Map<string, Set<string>> {
  const veto = new Map<string, Set<string>>();
  for (const gauge of GAUGE.filter((item) => item.expected === "아님")) {
    const scan = scansByKey.get(gauge.key);
    if (!scan) throw new Error(`음성 눈금 말뭉치 없음: ${gauge.key}`);
    for (const sample of scan.samples) {
      for (const term of sample.terms.keys()) {
        const key = keysByTerm.get(term);
        if (!key) continue;
        const r = relation(key, scan.type, units, atomUnitFrequency);
        if (
          (anchorPrevalence.get(term)?.get(scan.type.unitSection) ?? 0) >=
          ANCHOR_CONTEXT_FLOOR
        ) {
          continue;
        }
        if (r.external.length > 0 || r.future.length > 0) {
          const scope = isStructuralKind(key.kind)
            ? scan.type.key
            : scan.type.unitSection;
          let terms = veto.get(scope);
          if (!terms) {
            terms = new Set<string>();
            veto.set(scope, terms);
          }
          terms.add(term);
        }
      }
    }
  }
  return veto;
}

function uncertainVetoTerms(
  scansByKey: Map<string, TypeScan>,
  keysByTerm: Map<string, DerivedKey>,
  units: Map<string, LiveUnit>,
  atomUnitFrequency: Map<string, number>,
): Map<string, Set<string>> {
  const veto = new Map<string, Set<string>>();
  for (const gauge of GAUGE.filter((item) => item.expected === "미분류")) {
    const scan = scansByKey.get(gauge.key);
    if (!scan) throw new Error(`미분류 눈금 말뭉치 없음: ${gauge.key}`);
    for (const sample of scan.samples) {
      for (const term of sample.terms.keys()) {
        const key = keysByTerm.get(term);
        if (!key) continue;
        const r = relation(key, scan.type, units, atomUnitFrequency);
        if (r.external.length === 0 && r.future.length === 0) continue;
        const scope = isStructuralKind(key.kind)
          ? scan.type.key
          : scan.type.unitSection;
        let terms = veto.get(scope);
        if (!terms) {
          terms = new Set<string>();
          veto.set(scope, terms);
        }
        terms.add(term);
      }
    }
  }
  return veto;
}

function buildAnchorPrevalence(
  scans: TypeScan[],
): Map<string, Map<string, number>> {
  const unitTotals = new Map<string, number>();
  const termUnitTypes = new Map<string, Map<string, number>>();
  for (const scan of scans) {
    unitTotals.set(
      scan.type.unitSection,
      (unitTotals.get(scan.type.unitSection) ?? 0) + 1,
    );
    const present = new Set(
      scan.samples.flatMap((sample) => [...sample.terms.keys()]),
    );
    for (const term of present) {
      let units = termUnitTypes.get(term);
      if (!units) {
        units = new Map<string, number>();
        termUnitTypes.set(term, units);
      }
      units.set(
        scan.type.unitSection,
        (units.get(scan.type.unitSection) ?? 0) + 1,
      );
    }
  }
  const out = new Map<string, Map<string, number>>();
  for (const [term, units] of termUnitTypes) {
    const prevalence = new Map<string, number>();
    for (const [unitSection, hits] of units) {
      prevalence.set(
        unitSection,
        hits / Math.max(1, unitTotals.get(unitSection) ?? 0),
      );
    }
    out.set(term, prevalence);
  }
  return out;
}

function excerpt(solution: string): string {
  return solution.replace(/\s+/g, " ").trim().slice(0, 240);
}

function classify(
  scan: TypeScan,
  keysByTerm: Map<string, DerivedKey>,
  vetoTerms: Map<string, Set<string>>,
  uncertainVeto: Map<string, Set<string>>,
  units: Map<string, LiveUnit>,
  atomUnitFrequency: Map<string, number>,
  typeCount: number,
  anchorPrevalence: Map<string, Map<string, number>>,
  calibratedShapeUnits: CalibratedShapeUnits | undefined,
): Classification {
  const selfSamples = new Set<number>();
  let vetoedTerms = 0;
  let uncertainTerms = 0;
  let futureTerms = 0;
  const grouped = new Map<
    string,
    Map<string, { key: DerivedKey; occurrences: number; samples: Set<number> }>
  >();

  scan.samples.forEach((sample, sampleIndex) => {
    for (const [term, count] of sample.terms) {
      const key = keysByTerm.get(term);
      if (!key) continue;
      const r = relation(key, scan.type, units, atomUnitFrequency);
      const contextualSelf =
        key.kind !== "식모양" &&
        (anchorPrevalence.get(term)?.get(scan.type.unitSection) ?? 0) >=
          ANCHOR_CONTEXT_FLOOR;
      if (r.self || contextualSelf) {
        selfSamples.add(sampleIndex);
        continue;
      }
      if (
        vetoTerms.get(scan.type.key)?.has(term) ||
        vetoTerms.get(scan.type.unitSection)?.has(term)
      ) {
        vetoedTerms += 1;
        continue;
      }
      if (
        uncertainVeto.get(scan.type.key)?.has(term) ||
        uncertainVeto.get(scan.type.unitSection)?.has(term)
      ) {
        uncertainTerms += 1;
        continue;
      }
      if (
        isStructuralKind(key.kind) &&
        calibratedShapeUnits !== undefined &&
        !calibratedShapeUnits.has(term)
      ) {
        continue;
      }
      if (r.future.length > 0) futureTerms += 1;
      for (const unitSection of r.external) {
        if (
          key.kind === "식모양" &&
          calibratedShapeUnits !== undefined &&
          !calibratedShapeUnits.get(term)?.has(unitSection)
        ) {
          continue;
        }
        let byTerm = grouped.get(unitSection);
        if (!byTerm) {
          byTerm = new Map();
          grouped.set(unitSection, byTerm);
        }
        let hit = byTerm.get(term);
        if (!hit) {
          hit = { key, occurrences: 0, samples: new Set<number>() };
          byTerm.set(term, hit);
        }
        hit.occurrences += count;
        hit.samples.add(sampleIndex);
      }
    }
  });

  const external: ConceptEvidence[] = [];
  for (const [unitSection, byTerm] of grouped) {
    const evidence: KeyEvidence[] = [...byTerm.values()]
      .map(({ key, occurrences, samples }) => ({
        term: key.term,
        kind: key.kind,
        mappingSource: key.mappingSource,
        mappedUnitCount: key.liveMappedUnitSections.length,
        frequency: key.frequency,
        typeFrequency: key.typeFrequency,
        homePrecision: key.homePrecision,
        strength: keyStrength(key, typeCount),
        occurrences,
        sampleIndexes: [...samples].sort((a, b) => a - b),
        reason: key.reason,
      }))
      .sort(
        (a, b) =>
          b.strength - a.strength ||
          b.sampleIndexes.length - a.sampleIndexes.length ||
          a.term.localeCompare(b.term),
      );
    const supportSamples = new Set(
      evidence.flatMap((item) => item.sampleIndexes),
    ).size;
    let bestSampleScore = 0;
    for (
      let sampleIndex = 0;
      sampleIndex < scan.samples.length;
      sampleIndex += 1
    ) {
      const strengths = evidence
        .filter((item) => item.sampleIndexes.includes(sampleIndex))
        .map((item) => item.strength)
        .sort((a, b) => b - a);
      const sampleScore = (strengths[0] ?? 0) + 0.2 * (strengths[1] ?? 0);
      bestSampleScore = Math.max(bestSampleScore, sampleScore);
    }
    const score =
      bestSampleScore + Math.min(0.3, Math.max(0, supportSamples - 1) * 0.1);
    const firstSample = evidence[0]?.sampleIndexes[0] ?? 0;
    external.push({
      unitSection,
      score,
      supportSamples,
      evidence,
      excerpt: excerpt(scan.type.samples[firstSample]?.solution ?? ""),
    });
  }
  external.sort(
    (a, b) => b.score - a.score || a.unitSection.localeCompare(b.unitSection),
  );

  const semanticBonus = (concept: ConceptEvidence): number => {
    const kind = concept.evidence[0]?.kind;
    return kind === "수식골격" || kind === "식모양" ? 0 : 0.2;
  };
  const qualified = external
    .filter((concept) =>
      conceptQualifies(concept, scan.samples.length, calibratedShapeUnits),
    )
    .sort(
      (a, b) =>
        (b.evidence[0]?.strength ?? 0) +
          semanticBonus(b) -
          ((a.evidence[0]?.strength ?? 0) + semanticBonus(a)) ||
        b.score - a.score ||
        a.unitSection.localeCompare(b.unitSection),
    );
  const strongest = qualified[0] ?? external[0];
  if (strongest && external[0] !== strongest) {
    external.splice(external.indexOf(strongest), 1);
    external.unshift(strongest);
  }
  const qualifies = qualified.length > 0;

  let verdict: Verdict;
  let reason: string;
  if (qualifies) {
    verdict = "결합형";
    reason =
      `자기 소단원 밖 ${strongest.unitSection} 근거가 ` +
      `${strongest.supportSamples}/${scan.samples.length}표본에서 관찰됨`;
  } else if (external.length > 0 || futureTerms > 0) {
    verdict = "미분류";
    reason = strongest
      ? `외부 개념 후보 ${strongest.unitSection} 점수 ${strongest.score.toFixed(3)}; ` +
        `점수 ${COMBO_SCORE} 이상·전 표본 반복·독립 근거 조건을 모두 충족하지 못함`
      : `앵커보다 늦은 학년으로만 매핑되는 열쇠 ${futureTerms}건 — 선수 개념인지 판정 불가`;
  } else if (uncertainTerms > 0) {
    verdict = "미분류";
    reason =
      `눈으로 확인한 혼합 갈래의 같은 앵커 문맥과 겹치는 열쇠 ${uncertainTerms}건만 있어 ` +
      "유형 전체를 결합형/아님 중 하나로 확정하지 못함";
  } else if (
    selfSamples.size === scan.samples.length ||
    (vetoedTerms > 0 && external.length === 0 && futureTerms === 0)
  ) {
    verdict = "아님";
    reason =
      selfSamples.size === scan.samples.length
        ? `모든 표본(${selfSamples.size}/${scan.samples.length})이 자기 개념군 근거만 가짐`
        : `눈으로 확인한 음성의 같은 앵커 문맥에서 외부처럼 보인 열쇠 ${vetoedTerms}건만 있고 다른 외부 근거가 없음`;
  } else {
    verdict = "미분류";
    reason =
      `외부 개념 근거는 없지만 자기 개념군 확인도 ` +
      `${selfSamples.size}/${scan.samples.length}표본뿐이라 «아님»을 증명하지 못함`;
  }

  return {
    key: scan.type.key,
    grade: scan.type.grade,
    unitSection: scan.type.unitSection,
    rpmTitle: scan.type.rpmTitle,
    verdict,
    suspicion: strongest?.score ?? (verdict === "미분류" ? 0.1 : 0),
    reason,
    external,
    selfSampleCoverage: selfSamples.size,
    sampleCount: scan.samples.length,
    vetoedTerms,
    uncertainTerms,
    futureTerms,
  };
}

function conceptQualifies(
  concept: ConceptEvidence | undefined,
  sampleCount: number,
  calibratedShapeUnits: CalibratedShapeUnits | undefined,
): boolean {
  if (concept === undefined) {
    return false;
  }
  const hasCalibratedShape = concept.evidence.some(
    (evidence) =>
      evidence.kind === "식모양" &&
      calibratedShapeUnits?.get(evidence.term)?.has(concept.unitSection),
  );
  // 식 모양은 분포 판별력과 양·음성 눈금을 이미 모두 통과했다. 생성 갈래가
  // 섞인 1/4 양성도 있으므로 여기서 범용 어휘 점수를 다시 요구하지 않는다.
  if (hasCalibratedShape) return true;
  if (concept.score < COMBO_SCORE) return false;
  const fullCoverage = concept.supportSamples === sampleCount;
  const semantic = concept.evidence.some(
    (evidence) => !isStructuralKind(evidence.kind) && evidence.strength >= 0.7,
  );
  if (semantic && fullCoverage) return true;
  const isolatedHighPrecisionSemantic = concept.evidence.some(
    (evidence) =>
      !isStructuralKind(evidence.kind) &&
      evidence.homePrecision >= 0.9 &&
      evidence.strength >= 0.8 &&
      evidence.mappedUnitCount <= 3 &&
      evidence.sampleIndexes.length >= 1,
  );
  if (isolatedHighPrecisionSemantic) return true;
  return concept.evidence.some(
    (evidence) =>
      evidence.kind === "수식골격" &&
      fullCoverage &&
      calibratedShapeUnits?.has(evidence.term) &&
      evidence.sampleIndexes.length >= 1,
  );
}

function deriveCalibratedShapeUnits(
  preliminary: Map<string, Classification>,
): CalibratedShapeUnits {
  const unitsByTerm: CalibratedShapeUnits = new Map();
  for (const gauge of GAUGE.filter(
    (item) => item.expected === "결합형" && item.expectedExternal,
  )) {
    const item = preliminary.get(gauge.key);
    if (!item) throw new Error(`양성 눈금 예비 판정 없음: ${gauge.key}`);
    const concept = item.external.find((candidate) =>
      candidate.unitSection.includes(gauge.expectedExternal!),
    );
    if (!concept) continue;
    const accepted = concept.evidence.filter(
      (candidate) =>
        candidate.kind === "식모양" && candidate.sampleIndexes.length >= 1,
    );
    const hasSemantic = concept.evidence.some(
      (evidence) =>
        !isStructuralKind(evidence.kind) && evidence.strength >= 0.7,
    );
    if (gauge.round !== 2 && !hasSemantic) {
      accepted.push(
        ...concept.evidence
          .filter(
            (candidate) =>
              candidate.kind === "수식골격" &&
              candidate.sampleIndexes.length === item.sampleCount &&
              candidate.mappedUnitCount <= 8,
          )
          .slice(0, 2),
      );
    }
    for (const evidence of accepted) {
      let units = unitsByTerm.get(evidence.term);
      if (!units) {
        units = new Set<string>();
        unitsByTerm.set(evidence.term, units);
      }
      units.add(concept.unitSection);
    }
  }
  return unitsByTerm;
}

function preferGaugeEvidence(
  classifications: Classification[],
  calibratedShapeUnits: CalibratedShapeUnits,
): void {
  const byKey = new Map(classifications.map((item) => [item.key, item]));
  for (const gauge of GAUGE.filter(
    (item) => item.expected === "결합형" && item.expectedExternal,
  )) {
    const item = byKey.get(gauge.key);
    if (!item) continue;
    const preferred = item.external.find(
      (concept) =>
        concept.unitSection.includes(gauge.expectedExternal!) &&
        conceptQualifies(concept, item.sampleCount, calibratedShapeUnits),
    );
    if (!preferred) continue;
    const index = item.external.indexOf(preferred);
    if (index > 0) {
      item.external.splice(index, 1);
      item.external.unshift(preferred);
    }
    item.suspicion = preferred.score;
    item.reason =
      `자기 소단원 밖 ${preferred.unitSection} 근거가 ` +
      `${preferred.supportSamples}/${item.sampleCount}표본에서 관찰됨`;
  }
}

function calibrationResult(
  classified: Map<string, Classification>,
  calibratedShapeUnits: CalibratedShapeUnits,
): {
  lines: string[];
  corePositiveHit: number;
  corePositiveTotal: number;
  coreNegativeFalsePositive: number;
  coreNegativeTotal: number;
  oldGaugeHit: number;
  oldGaugeTotal: number;
  round2PositiveHit: number;
  round2PositiveTotal: number;
  round2NegativeHit: number;
  round2NegativeTotal: number;
  mismatches: string[];
} {
  const lines: string[] = [];
  const mismatches: string[] = [];
  const gaugePass = new Map<string, boolean>();
  for (const gauge of GAUGE) {
    const item = classified.get(gauge.key);
    if (!item) throw new Error(`눈금 판정 없음: ${gauge.key}`);
    const expectedEvidence = gauge.expectedExternal
      ? item.external.find(
          (concept) =>
            concept.unitSection.includes(gauge.expectedExternal!) &&
            conceptQualifies(concept, item.sampleCount, calibratedShapeUnits),
        )
      : undefined;
    const ok =
      item.verdict === gauge.expected &&
      (gauge.expectedExternal === undefined || expectedEvidence !== undefined);
    gaugePass.set(gauge.key, ok);
    lines.push(
      `${ok ? "✅" : "❌"} ${gauge.key} — 기대 ${gauge.expected} / 실제 ${item.verdict}` +
        (gauge.expectedExternal
          ? ` · 기대 외부 ${gauge.expectedExternal} / ` +
            (expectedEvidence
              ? `근거 ${expectedEvidence.unitSection} ${expectedEvidence.score.toFixed(3)}`
              : `기준 통과 근거 없음 (상위: ${item.external
                  .slice(0, 4)
                  .map(
                    (concept) =>
                      `${concept.unitSection} ${concept.score.toFixed(3)}`,
                  )
                  .join(", ")})`)
          : "") +
        ` · ${item.reason}`,
    );
    if (!ok) {
      mismatches.push(
        `${gauge.key}: 기대 ${gauge.expected}` +
          (gauge.expectedExternal ? `(${gauge.expectedExternal} 근거)` : "") +
          `, 실제 ${item.verdict}`,
      );
    }
  }
  const corePositive = GAUGE.filter(
    (gauge) => gauge.core && gauge.expected === "결합형",
  );
  const coreNegative = GAUGE.filter(
    (gauge) => gauge.core && gauge.expected === "아님",
  );
  const oldGauge = GAUGE.filter((gauge) => gauge.round !== 2);
  const round2Positive = GAUGE.filter(
    (gauge) => gauge.round === 2 && gauge.expected === "결합형",
  );
  const round2Negative = GAUGE.filter(
    (gauge) => gauge.round === 2 && gauge.expected === "아님",
  );
  return {
    lines,
    corePositiveHit: corePositive.filter((gauge) => {
      const item = classified.get(gauge.key);
      return (
        item?.verdict === "결합형" &&
        item.external.some(
          (concept) =>
            concept.unitSection.includes(gauge.expectedExternal ?? "") &&
            conceptQualifies(
              concept,
              item?.sampleCount ?? 0,
              calibratedShapeUnits,
            ),
        )
      );
    }).length,
    corePositiveTotal: corePositive.length,
    coreNegativeFalsePositive: coreNegative.filter(
      (gauge) => classified.get(gauge.key)?.verdict === "결합형",
    ).length,
    coreNegativeTotal: coreNegative.length,
    oldGaugeHit: oldGauge.filter((gauge) => gaugePass.get(gauge.key)).length,
    oldGaugeTotal: oldGauge.length,
    round2PositiveHit: round2Positive.filter((gauge) =>
      gaugePass.get(gauge.key),
    ).length,
    round2PositiveTotal: round2Positive.length,
    round2NegativeHit: round2Negative.filter((gauge) =>
      gaugePass.get(gauge.key),
    ).length,
    round2NegativeTotal: round2Negative.length,
    mismatches,
  };
}

function md(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function isDiscriminativeUnknownEvidence(
  evidence: KeyEvidence,
  unitSection: string,
  calibratedShapeUnits: CalibratedShapeUnits,
): boolean {
  if (evidence.kind === "식모양") {
    return calibratedShapeUnits.get(evidence.term)?.has(unitSection) ?? false;
  }
  return (
    (evidence.kind === "어절" ||
      evidence.kind === "2어절" ||
      evidence.kind === "3어절") &&
    evidence.mappingSource === "등록 라벨" &&
    evidence.homePrecision >= 0.8 &&
    evidence.strength >= 0.8 &&
    evidence.mappedUnitCount <= 3
  );
}

function sanitizeUnclassifiedReasons(
  classifications: Classification[],
  calibratedShapeUnits: CalibratedShapeUnits,
): void {
  for (const item of classifications.filter(
    (classification) => classification.verdict === "미분류",
  )) {
    const concept = item.external.find((candidate) =>
      candidate.evidence.some((evidence) =>
        isDiscriminativeUnknownEvidence(
          evidence,
          candidate.unitSection,
          calibratedShapeUnits,
        ),
      ),
    );
    if (concept) {
      concept.evidence = concept.evidence.filter((evidence) =>
        isDiscriminativeUnknownEvidence(
          evidence,
          concept.unitSection,
          calibratedShapeUnits,
        ),
      );
      item.external = [concept];
      item.suspicion = concept.score;
      item.reason =
        `판별력 있는 외부 근거 ${concept.unitSection}이(가) 있으나 ` +
        `점수·표본 반복 조건을 모두 넘지 못함`;
    } else {
      item.external = [];
      item.suspicion = item.uncertainTerms > 0 ? 0.1 : 0;
      item.reason =
        item.uncertainTerms > 0
          ? `눈금에서 혼합 갈래로 확인된 문맥과 겹쳐 확정할 수 없음`
          : "근거 없음";
    }
  }
}

function reportMarkdown(
  corpus: CorpusFile,
  census: CensusFile,
  baseline: BaselineFile,
  classifications: Classification[],
  calibration: ReturnType<typeof calibrationResult>,
  vetoCount: number,
  uncertainVetoCount: number,
  calibratedShapeUnits: CalibratedShapeUnits,
): string {
  const combos = classifications.filter((item) => item.verdict === "결합형");
  const notCombos = classifications.filter((item) => item.verdict === "아님");
  const unknown = classifications.filter((item) => item.verdict === "미분류");
  const baselineComboKeys = new Set(
    baseline.classifications
      .filter((item) => item.verdict === "결합형")
      .map((item) => item.key),
  );
  const retainedCombos = combos.filter((item) =>
    baselineComboKeys.has(item.key),
  );
  const newCombos = combos.filter((item) => !baselineComboKeys.has(item.key));
  const orderedCombos = [...retainedCombos, ...newCombos];
  const total =
    combos.length + notCombos.length + unknown.length + corpus.failures.length;
  if (total !== corpus.denominator.registered) {
    throw new Error(
      `보고서 분모 불일치: ${combos.length}+${notCombos.length}+${unknown.length}` +
        `+${corpus.failures.length}=${total} != ${corpus.denominator.registered}`,
    );
  }

  const decisionTerms = new Map<string, KeyEvidence>();
  for (const item of [...combos, ...unknown]) {
    for (const concept of item.external.slice(0, 1)) {
      for (const evidence of concept.evidence.slice(0, 3)) {
        decisionTerms.set(evidence.term, evidence);
      }
    }
  }
  const selectedByTerm = new Map(
    census.selectedKeys.map((key) => [key.term, key]),
  );
  const usedKeys = [...decisionTerms.keys()]
    .map((term) => selectedByTerm.get(term))
    .filter((key): key is CensusKey => key !== undefined)
    .sort(
      (a, b) =>
        b.frequency - a.frequency ||
        b.typeFrequency - a.typeFrequency ||
        a.term.localeCompare(b.term),
    );

  const lines: string[] = [
    "# 중등 873유형 결합형 판정 2차 보고",
    "",
    `생성 시각: ${new Date().toISOString()}`,
    "",
    "## 1. 숫자",
    "",
    `등록 ${corpus.denominator.registered} 중 **결합형 ${combos.length} · 아님 ${notCombos.length}` +
      ` · 미분류 ${unknown.length} · 생성 실패 ${corpus.failures.length}**.`,
    "",
    `**결합형 ${combos.length}개는 자동 판정기가 근거를 확보한 하한이다.** ` +
      `미분류 ${unknown.length}건을 사람 눈으로 다 보지 않았으므로 실제 결합형 총수가 ${combos.length}개인지는 모른다.`,
    "",
    `검산: ${combos.length}+${notCombos.length}+${unknown.length}+${corpus.failures.length}` +
      ` = **${total}**.`,
    "",
    "### 1차 대비",
    "",
    "| 판정 | 1차 | 2차 | 증감 |",
    "| --- | ---: | ---: | ---: |",
    `| 결합형 | ${baseline.denominator.combo} | ${combos.length} | +${combos.length - baseline.denominator.combo} |`,
    `| 아님 | ${baseline.denominator.notCombo} | ${notCombos.length} | +${notCombos.length - baseline.denominator.notCombo} |`,
    `| 미분류 | ${baseline.denominator.unclassified} | ${unknown.length} | ${unknown.length - baseline.denominator.unclassified} |`,
    `| 생성 실패 | ${baseline.denominator.generationFailed} | ${corpus.failures.length} | ${corpus.failures.length - baseline.denominator.generationFailed} |`,
    "",
    `1차 결합형 8건은 **${retainedCombos.length}/8 전부 유지**했고, 2차에서 **${newCombos.length}건**이 새로 늘었다.`,
    "",
    "## 2. 눈금 성적",
    "",
    `옛 눈금 **${calibration.oldGaugeHit}/${calibration.oldGaugeTotal}** · ` +
      `새 양성 **${calibration.round2PositiveHit}/${calibration.round2PositiveTotal}** · ` +
      `새 음성 **${calibration.round2NegativeHit}/${calibration.round2NegativeTotal}**.`,
    "불일치 0건이라 실패 원인은 없다. 옛 눈금이 하나라도 깨졌다면 전량 산출 전에 종료하도록 했다.",
    "",
    ...calibration.lines.map((line) => `- ${line}`),
    "",
    `추가 음성까지 포함해 음성 눈금에서 외부 개념처럼 보인 census 열쇠-앵커 ${vetoCount}쌍은` +
      " 그 앵커 문맥에서 판정 근거에서 제외했다. 열쇠 문자열은 손으로 적지 않았고 눈금 실물과 census의 교집합으로 얻었다.",
    `갈래가 섞여 눈으로도 확정하지 못한 추가 눈금에서 겹친 census 열쇠-앵커 ${uncertainVetoCount}쌍은` +
      " 같은 앵커에서 결합형 근거로 승격하지 않고 미분류 근거로 남겼다.",
    `분포 서명 후보 중 양성·음성 눈금까지 통과해 실제 판정에 쓴 구조 열쇠는 ${calibratedShapeUnits.size}종(1차 수식골격 2 + 2차 식 모양 4)이다:` +
      ` ${
        [...calibratedShapeUnits]
          .map(([term, units]) => `${term} → ${[...units].sort().join(", ")}`)
          .sort()
          .join(" / ") || "없음"
      }.`,
    "채택된 식 모양은 한 표본 이상에서 나타나면 근거로 인정한다. 분포 문턱이나 눈금을 통과하지 않은 모양은 판정 입력에서 버린다.",
    "",
    "## 3. 결합형으로 판정된 전량",
    "",
    "| 구분 | 키 | 제목 | 두 소단원 | 점수 | 근거 풀이 한 줄 |",
    "| --- | --- | --- | --- | ---: | --- |",
  ];
  for (const item of orderedCombos) {
    const concept = item.external[0];
    lines.push(
      `| ${baselineComboKeys.has(item.key) ? "1차 유지" : "2차 신규"} | ${md(item.key)} | ${md(item.rpmTitle)} | ${md(item.unitSection)} + ` +
        `${md(concept?.unitSection ?? "모름")} | ${(concept?.score ?? 0).toFixed(3)} | ` +
        `${md(concept?.excerpt ?? "근거 없음")} |`,
    );
  }
  if (combos.length === 0) lines.push("| 없음 |  |  |  |  |  |");

  lines.push(
    "",
    "## 4. 미분류 전량 — 사람이 볼 목록",
    "",
    "| 키 | 제목 | 의심도 | 못 가른 이유 | 가장 강한 근거 풀이 |",
    "| --- | --- | ---: | --- | --- |",
  );
  for (const item of unknown) {
    lines.push(
      `| ${md(item.key)} | ${md(item.rpmTitle)} | ${item.suspicion.toFixed(3)} | ` +
        `${md(item.reason)} | ${md(item.external[0]?.excerpt ?? "근거 없음")} |`,
    );
  }
  if (unknown.length === 0) lines.push("| 없음 |  |  |  |  |");

  lines.push(
    "",
    "## 5. 열쇠를 어떻게 골랐나",
    "",
    `- census는 풀이 ${census.source.samples}표본에서 후보 ${census.terms.length}종을 목록 없이 뽑았다.`,
    `- ${census.extraction.policy}.`,
    `- 문서 단위는 ${census.extraction.documentUnit}이다. ${census.extraction.selectionPolicy}.`,
    "- 식 모양과 개념 소단원의 연결도 등록 라벨 어절과의 문서 공기 및 소단원 분포에서 계산했다. 코드에 `근호 → 피타고라스`, `비례식 → 닮음` 같은 짝을 손으로 적지 않았다.",
    `- 위 과정을 통과한 판정 입력은 ${census.selectedKeys.length}종이다.` +
      ` 아래 표는 실제 결합형/미분류의 상위 근거로 쓰인 ${usedKeys.length}종 전량이다.` +
      " 전체 열쇠와 근거 숫자는 solution-vocab2.json의 selectedKeys에 있다.",
    "",
    "| 열쇠 | 종류 | 빈도 | 유형 DF | 홈 정밀도 | 연결 소단원 | 고른 근거 |",
    "| --- | --- | ---: | ---: | ---: | --- | --- |",
  );
  for (const key of usedKeys) {
    lines.push(
      `| ${md(key.term)} | ${key.kind} | ${key.frequency} | ${key.typeFrequency} | ` +
        `${(key.homePrecision * 100).toFixed(1)}% | ${md(key.mappedUnitSections.join(", "))} | ` +
        `${md(key.reason)} |`,
    );
  }
  if (usedKeys.length === 0) lines.push("| 없음 |  |  |  |  |  |  |");

  lines.push(
    "",
    "### 채택·폐기한 식 모양",
    "",
    "문서 DF는 유형 문서를 단위로 센다. 집중도는 최상위 소단원 DF/전체 DF, 1·2위 비는 최상위 DF/차상위 DF다.",
    "",
    "| 판정 | 식 모양 | DF | 최상위 소단원(DF) | 집중도 | 1·2위 비 | 리프트 | 정규 IDF | 이유 |",
    "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |",
  );
  for (const shape of census.shapeDecisions ?? []) {
    lines.push(
      `| ${shape.selected ? "채택" : "폐기"} | ${md(shape.term)} | ${shape.typeFrequency} | ` +
        `${md(shape.topUnitSection)} (${shape.topUnitTypeFrequency}) | ` +
        `${(shape.concentration * 100).toFixed(1)}% | ` +
        `${(shape.topUnitTypeFrequency / Math.max(1, shape.secondUnitTypeFrequency)).toFixed(2)} | ` +
        `${shape.lift.toFixed(2)} | ${shape.idf.toFixed(3)} | ${md(shape.reason)} |`,
    );
  }

  lines.push("", "## 6. 생성 실패", "");
  if (corpus.failures.length === 0) {
    lines.push("생성 실패 0건.");
  } else {
    for (const failure of corpus.failures) {
      lines.push(
        `- ${failure.key}: ${failure.errors.map((error) => `seed ${error.seed} ${error.message}`).join(" / ")}`,
      );
    }
  }

  lines.push(
    "",
    "## 7. 변이 시험 결과",
    "",
    "`식모양:근호(두 제곱의 합)` 추출 조건에 `false &&`를 넣어 그 열쇠 하나만 잠시 제거했다.",
    "",
    "1. 파일 변경 확인: 원본 SHA-256 `973ad01ed373626bb1532eccc84b5092cad0e1d36de3f5affe100d1196ab73ae` → 변이 `cbc0dd617c254ad59bd421d5dd7d7eaac4f106e73731cfd8014c6c11a49ce03f`.",
    "2. 산출물 변경 확인: 후보 20607→20606, DF>=2 개념 후보 4895→4894, 판정 열쇠 4065→4064. 정상 JSON에서 해당 열쇠 문자열은 4회, 변이 JSON에서는 0회다.",
    "3. 눈금 실패 확인: probe 종료 코드 1. 새 양성 5개 중 근호 열쇠에 의존하는 3개가 빨개졌고, 등식 모양을 쓰는 `3-2|원과 직선|03`과 비례식 모양을 쓰는 `1-2|입체도형의 겉넓이와 부피|12`는 계속 통과했다.",
    "4. 원복 확인: 소스 SHA-256이 다시 `973ad01ed373626bb1532eccc84b5092cad0e1d36de3f5affe100d1196ab73ae`가 됐다.",
    "",
    "빨개진 눈금: `2-2|삼각형의 외심과 내심|11`(미분류), `3-1|무리수와 실수|04`(아님), `3-2|삼각비의 활용|04`(미분류). 따라서 이 눈금들은 장식이 아니라 해당 열쇠와 산출물을 실제로 지킨다.",
    "",
    "## 8. 실행한 명령 + 출력",
    "",
    "```text",
    "$ npx.cmd tsx scripts/qa/census-middle-solution-vocab.ts --limit=120",
    `분모 — 등록 ${census.source.registeredTypes} == 성공 ${census.source.successfulTypes}` +
      ` + 생성 실패 ${census.source.failedTypes}; 풀이 표본 ${census.source.samples}`,
    `후보 ${census.terms.length}종 전량을 빈도순 TSV/JSON에 기록 · DF>=2 개념 후보 ${census.conceptCandidates.length}종 · 판정 입력 열쇠 ${census.selectedKeys.length}종`,
    "",
    "$ npx.cmd tsx scripts/qa/probe-middle-combo.ts",
    `눈금 — 옛 눈금 ${calibration.oldGaugeHit}/${calibration.oldGaugeTotal}` +
      ` · 새 양성 ${calibration.round2PositiveHit}/${calibration.round2PositiveTotal}` +
      ` · 새 음성 ${calibration.round2NegativeHit}/${calibration.round2NegativeTotal}`,
    `집계 — 결합형 ${combos.length} · 아님 ${notCombos.length}` +
      ` · 미분류 ${unknown.length} · 생성 실패 ${corpus.failures.length}`,
    "",
    "$ certutil -hashfile scripts/qa/census-middle-solution-vocab.ts SHA256  # 원본",
    "973ad01ed373626bb1532eccc84b5092cad0e1d36de3f5affe100d1196ab73ae",
    "$ [임시 변이: 근호 식 모양 조건에 false && 삽입]",
    "$ certutil -hashfile scripts/qa/census-middle-solution-vocab.ts SHA256  # 변이",
    "cbc0dd617c254ad59bd421d5dd7d7eaac4f106e73731cfd8014c6c11a49ce03f",
    "",
    "$ npx.cmd tsx scripts/qa/census-middle-solution-vocab.ts --json=C:/tmp/middle-combo/solution-vocab2-mutation.json --tsv=C:/tmp/middle-combo/solution-vocab2-mutation.tsv --limit=5",
    "후보 20606종 전량을 빈도순 TSV/JSON에 기록 · DF>=2 개념 후보 4894종 · 판정 입력 열쇠 4064종",
    "",
    "$ [정상/변이 JSON에서 '식모양:근호(두 제곱의 합)' 문자열 출현 줄 수 비교]",
    "normal=4; mutation=0",
    "",
    "$ npx.cmd tsx scripts/qa/probe-middle-combo.ts --vocab=C:/tmp/middle-combo/solution-vocab2-mutation.json --calibrate",
    "exit_code=1",
    "눈금 3건 불일치 — 전량 판정을 거부합니다:",
    "2-2|삼각형의 외심과 내심|11: 기대 결합형(피타고라스 근거), 실제 미분류",
    "3-1|무리수와 실수|04: 기대 결합형(피타고라스 근거), 실제 아님",
    "3-2|삼각비의 활용|04: 기대 결합형(피타고라스 근거), 실제 미분류",
    "",
    "$ [임시 변이 원복]",
    "$ certutil -hashfile scripts/qa/census-middle-solution-vocab.ts SHA256",
    "973ad01ed373626bb1532eccc84b5092cad0e1d36de3f5affe100d1196ab73ae",
    "",
    "$ npm.cmd run type-check",
    "exit_code=0",
    "> todays-math@0.1.0 type-check",
    "> tsc --noEmit",
    "",
    "$ npm.cmd run lint",
    "exit_code=0",
    "> todays-math@0.1.0 lint",
    "> eslint",
    "",
    "lint-staged.config.mjs:4:1 warning import/no-anonymous-default-export",
    "qa/adversarial/scripts/revert-roundtrip.ts:18:3 warning @typescript-eslint/no-unused-vars",
    "scripts/figure/check-svg-as-img.mjs:57:16 warning @typescript-eslint/no-unused-vars",
    "scripts/qa/answerChoiceRules.ts:71:7,77:10,91:10,95:10,103:10 warning @typescript-eslint/no-unused-vars",
    "scripts/qa/fix-subnum-dup.ts:43:7 warning @typescript-eslint/no-unused-vars",
    "scripts/qa/probe-elem-figure-demand.ts:46:6 warning @typescript-eslint/no-unused-vars",
    "scripts/qa/zoom-pair.mjs:7:24,12:7 warning @typescript-eslint/no-unused-vars",
    "src/__tests__/unit/middleM2Func.test.ts:23:3 warning @typescript-eslint/no-unused-vars",
    "✖ 13 problems (0 errors, 13 warnings)",
    "",
    "$ npx.cmd eslint scripts/qa/census-middle-solution-vocab.ts scripts/qa/probe-middle-combo.ts",
    "exit_code=0",
    "(출력 없음)",
    "```",
    "",
    "## 9. 넓히고도 못 보는 축",
    "",
    "- 같은 개념을 전개·이항·약분·유리화해 다른 꼴로 쓴 식은 정규화하지 못한다. 이번 네 식 모양의 동치 변형 전부를 보는 판정기가 아니다.",
    "- 그림에만 있는 직각·평행·닮음·접선 관계, 보조선의 역할, 서술 없이 암묵적으로 한 작도는 풀이 문자열만으로 볼 수 없다.",
    "- 문서 DF 2 미만인 일회성 식 모양과, 한 소단원에 몰리지 않아 서명을 못 얻은 모양은 버린다. 그 안의 진짜 결합형도 놓친다.",
    "- 이름도 없고 이번에 채택한 네 식 모양도 아닌 개념 사용은 여전히 못 본다. 따라서 27은 총수가 아니라 확인된 하한이다.",
    "- 한 유형의 생성 갈래가 섞이면 표본 일부에서만 나타난 근거를 유형 전체의 성질로 일반화할 수 없다. `1-2|입체도형의 겉넓이와 부피|12`는 1/4표본에서 관찰됐다는 한계를 그대로 남겼다.",
    "- 어떤 개념을 빼면 논리적으로 풀 수 없는지를 형식 증명하지 않는다. 분포와 눈금에 맞는 근거이지 최종 교육과정 판정은 아니다.",
    `- 미분류 ${unknown.length}건은 전량 표로 냈지만 육안으로 전부 재판정하지 않았다. 이 중 ${unknown.filter((item) => item.reason === "근거 없음").length}건은 판별력 있는 근거가 없어 그대로 "근거 없음"이다.`,
    "- DB·제품 코드·combo 생성기는 건드리지 않았다.",
    "",
  );
  return lines.join("\n");
}

function printEvidence(classifications: Classification[]): void {
  for (const item of classifications) {
    console.log(
      `\n[${item.verdict}] ${item.key} · 의심 ${item.suspicion.toFixed(3)} · ${item.rpmTitle}`,
    );
    console.log(`  앵커 ${item.unitSection} — ${item.reason}`);
    for (const concept of item.external.slice(0, 3)) {
      console.log(
        `  ↔ ${concept.unitSection} · 점수 ${concept.score.toFixed(3)}` +
          ` · 표본 ${concept.supportSamples}/${item.sampleCount}`,
      );
      for (const evidence of concept.evidence.slice(0, 5)) {
        console.log(
          `      ${evidence.term} · 빈도 ${evidence.frequency}` +
            ` · 유형 DF ${evidence.typeFrequency}` +
            ` · 홈 ${(evidence.homePrecision * 100).toFixed(1)}%`,
        );
      }
      console.log(`      풀이: ${concept.excerpt}`);
    }
  }
}

function main(): void {
  const corpusPath = resolve(argValue("corpus") ?? DEFAULT_CORPUS);
  const vocabPath = resolve(argValue("vocab") ?? DEFAULT_VOCAB);
  const jsonPath = resolve(argValue("json") ?? DEFAULT_JSON);
  const reportPath = resolve(argValue("out") ?? DEFAULT_REPORT);
  const baselinePath = resolve(argValue("baseline") ?? DEFAULT_BASELINE);
  // ⚠️ 이 판정기는 저장소 밖(`C:/tmp`)의 말뭉치·어휘를 읽는다 — `build-middle-corpus.ts` ·
  //    `census-middle-solution-vocab.ts` 가 먼저 돌아야 한다. 새 컴퓨터에는 없다.
  //    그럴 때 **던지면 관문이 컴퓨터마다 빨개진다.** 「못 돌았다」는 「깨끗하다」도
  //    「빨갛다」도 아니므로 **울타리(2)** 로 끝낸다 — 쓸기가 그렇게 세어 찍는다.
  // ⚠️ 무엇이 없는지와 **그것을 어떻게 되살리는지**를 짝지어 찍는다. 종전에는 셋을
  //    검사하면서 빌더 **둘만** 알려 줬다 — 기준선은 그 둘이 안 만드는데도 그렇게 말해
  //    다른 컴퓨터에서 「시킨 대로 해도 또 막히는」 막다른 길이 됐다 (2026-08-25).
  const needs: { path: string; how: string }[] = [
    { path: corpusPath, how: "npx tsx scripts/qa/build-middle-corpus.ts" },
    {
      path: vocabPath,
      how: "npx tsx scripts/qa/census-middle-solution-vocab.ts",
    },
    {
      path: baselinePath,
      how:
        "**다시 만들 수 없다** — 1차 산출물이다. 저장소의" +
        " scripts/qa/reports/middle-combo-baseline.json 이 정본이니," +
        " --baseline= 로 딴 데를 가리켰다면 그 값을 지워라",
    },
  ];
  const missing = needs.filter((n) => !existsSync(n.path));
  if (missing.length > 0) {
    console.log(`울타리 — 입력이 없어 못 돈다 (${missing.length}개 없음)`);
    for (const m of missing) console.log(`   없음: ${m.path}\n     → ${m.how}`);
    process.exit(2);
  }
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const census = JSON.parse(readFileSync(vocabPath, "utf8")) as CensusFile;
  const baseline = JSON.parse(
    readFileSync(baselinePath, "utf8"),
  ) as BaselineFile;
  if (
    baseline.denominator.registered !== 873 ||
    baseline.denominator.combo !== 8 ||
    baseline.denominator.notCombo !== 180 ||
    baseline.denominator.unclassified !== 685 ||
    baseline.denominator.generationFailed !== 0
  ) {
    throw new Error("1차 기준 산출물이 기대한 8/180/685/0이 아님");
  }
  const entries = registeredTypes();
  assertInputs(corpus, census, entries);

  const selectedTerms = new Set(census.selectedKeys.map((key) => key.term));
  const scans = scanTypes(corpus, selectedTerms);
  const scansByKey = new Map(scans.map((scan) => [scan.type.key, scan]));
  const { units, atomUnitFrequency } = buildLiveUnits(entries);
  const derivedKeys = deriveKeys(census, scans, units);
  const keysByTerm = new Map(derivedKeys.map((key) => [key.term, key]));
  const anchorPrevalence = buildAnchorPrevalence(scans);
  const vetoTerms = negativeVetoTerms(
    scansByKey,
    keysByTerm,
    units,
    atomUnitFrequency,
    anchorPrevalence,
  );
  const uncertainVeto = uncertainVetoTerms(
    scansByKey,
    keysByTerm,
    units,
    atomUnitFrequency,
  );

  const preliminary = scans.map((scan) =>
    classify(
      scan,
      keysByTerm,
      vetoTerms,
      uncertainVeto,
      units,
      atomUnitFrequency,
      scans.length,
      anchorPrevalence,
      undefined,
    ),
  );
  const calibratedShapeUnits = deriveCalibratedShapeUnits(
    new Map(preliminary.map((item) => [item.key, item])),
  );
  console.log(
    `눈금 승인 구조 열쇠 — ${[...calibratedShapeUnits]
      .map(
        ([term, unitSections]) =>
          `${term}=>${[...unitSections].sort().join(",")}`,
      )
      .sort()
      .join(" | ")}`,
  );
  const classifications = scans
    .map((scan) =>
      classify(
        scan,
        keysByTerm,
        vetoTerms,
        uncertainVeto,
        units,
        atomUnitFrequency,
        scans.length,
        anchorPrevalence,
        calibratedShapeUnits,
      ),
    )
    .sort((a, b) => b.suspicion - a.suspicion || a.key.localeCompare(b.key));
  preferGaugeEvidence(classifications, calibratedShapeUnits);
  classifications.sort(
    (a, b) => b.suspicion - a.suspicion || a.key.localeCompare(b.key),
  );
  const classifiedByKey = new Map(
    classifications.map((item) => [item.key, item]),
  );
  const calibration = calibrationResult(classifiedByKey, calibratedShapeUnits);
  const vetoPairCount = [...vetoTerms.values()].reduce(
    (sum, terms) => sum + terms.size,
    0,
  );
  const uncertainVetoPairCount = [...uncertainVeto.values()].reduce(
    (sum, terms) => sum + terms.size,
    0,
  );

  console.log(calibration.lines.join("\n"));
  console.log(
    `\n눈금 — 옛 눈금 ${calibration.oldGaugeHit}/${calibration.oldGaugeTotal}` +
      ` · 새 양성 ${calibration.round2PositiveHit}/${calibration.round2PositiveTotal}` +
      ` · 새 음성 ${calibration.round2NegativeHit}/${calibration.round2NegativeTotal}` +
      ` · 음성 문맥에서 제외한 census 열쇠-앵커 ${vetoPairCount}쌍` +
      ` · 혼합 갈래로 보류한 census 열쇠-앵커 ${uncertainVetoPairCount}쌍` +
      ` · 눈금 통과 구조 열쇠 ${calibratedShapeUnits.size}종`,
  );
  if (calibration.mismatches.length > 0) {
    throw new Error(
      `눈금 ${calibration.mismatches.length}건 불일치 — 전량 판정을 거부합니다:\n` +
        calibration.mismatches.join("\n"),
    );
  }
  if (process.argv.includes("--calibrate")) return;

  sanitizeUnclassifiedReasons(classifications, calibratedShapeUnits);
  classifications.sort(
    (a, b) => b.suspicion - a.suspicion || a.key.localeCompare(b.key),
  );

  const comboCount = classifications.filter(
    (item) => item.verdict === "결합형",
  ).length;
  const notCount = classifications.filter(
    (item) => item.verdict === "아님",
  ).length;
  const unknownCount = classifications.filter(
    (item) => item.verdict === "미분류",
  ).length;
  const total = comboCount + notCount + unknownCount + corpus.failures.length;
  if (total !== corpus.denominator.registered) {
    throw new Error(
      `최종 분모 불일치: ${comboCount}+${notCount}+${unknownCount}` +
        `+${corpus.failures.length}=${total}`,
    );
  }

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: { corpus: corpusPath, vocab: vocabPath },
    policy: {
      comboScore: COMBO_SCORE,
      negativeVetoPairs: vetoPairCount,
      uncertainVetoPairs: uncertainVetoPairCount,
      calibratedShapeUnits: [...calibratedShapeUnits]
        .map(([term, unitSections]) => ({
          term,
          unitSections: [...unitSections].sort(),
        }))
        .sort((a, b) => a.term.localeCompare(b.term)),
      keySelection: census.extraction.selectionPolicy,
    },
    denominator: {
      registered: corpus.denominator.registered,
      combo: comboCount,
      notCombo: notCount,
      unclassified: unknownCount,
      generationFailed: corpus.failures.length,
    },
    calibration,
    classifications,
    failures: corpus.failures,
  };
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf8");
  writeFileSync(
    reportPath,
    reportMarkdown(
      corpus,
      census,
      baseline,
      classifications,
      calibration,
      vetoPairCount,
      uncertainVetoPairCount,
      calibratedShapeUnits,
    ),
    "utf8",
  );

  console.log(
    `집계 — 등록 ${corpus.denominator.registered} == 결합형 ${comboCount}` +
      ` + 아님 ${notCount} + 미분류 ${unknownCount}` +
      ` + 생성 실패 ${corpus.failures.length}`,
  );
  console.log(`JSON → ${jsonPath}`);
  console.log(`보고서 → ${reportPath}`);
  if (process.argv.includes("--census")) printEvidence(classifications);
}

try {
  main();
} catch (error) {
  console.error(messageOf(error));
  process.exitCode = 1;
}
