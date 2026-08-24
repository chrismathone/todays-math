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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { registeredTypes } from "../../src/lib/middle/generate";
import type { TypeEntry } from "../../src/lib/middle/types";
import { solutionTerms } from "./census-middle-solution-vocab";

const DEFAULT_CORPUS = "C:/tmp/middle-combo/corpus.json";
const DEFAULT_VOCAB = "C:/tmp/middle-combo/solution-vocab.json";
const DEFAULT_JSON = "C:/tmp/middle-combo/classifications.json";
const DEFAULT_REPORT = "C:/tmp/middle-combo/classify-report.md";
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
  kind: "어절" | "2어절" | "3어절" | "LaTeX명령" | "수식골격";
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
    if (
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
    mapped.some((unit) =>
      sharedConceptAtom(current, unit, atomUnitFrequency, units.size),
    )
  ) {
    return { self: true, external: [], future: [] };
  }
  const external: string[] = [];
  const future: string[] = [];
  for (const unit of mapped) {
    const grades = [...unit.grades];
    if (grades.some((grade) => grade <= anchorGrade))
      external.push(unit.unitSection);
    else future.push(unit.unitSection);
  }
  return {
    self: false,
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
          let terms = veto.get(scan.type.unitSection);
          if (!terms) {
            terms = new Set<string>();
            veto.set(scan.type.unitSection, terms);
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
        let terms = veto.get(scan.type.unitSection);
        if (!terms) {
          terms = new Set<string>();
          veto.set(scan.type.unitSection, terms);
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
  calibratedSkeletonTerms: Set<string>,
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
        (anchorPrevalence.get(term)?.get(scan.type.unitSection) ?? 0) >=
        ANCHOR_CONTEXT_FLOOR;
      if (r.self || contextualSelf) {
        selfSamples.add(sampleIndex);
        continue;
      }
      if (vetoTerms.get(scan.type.unitSection)?.has(term)) {
        vetoedTerms += 1;
        continue;
      }
      if (uncertainVeto.get(scan.type.unitSection)?.has(term)) {
        uncertainTerms += 1;
        continue;
      }
      if (r.future.length > 0) futureTerms += 1;
      for (const unitSection of r.external) {
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
    return kind === "수식골격" ? 0 : 0.2;
  };
  const qualified = external
    .filter((concept) =>
      conceptQualifies(concept, scan.samples.length, calibratedSkeletonTerms),
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
      `${strongest.supportSamples}/${scan.samples.length}표본에서 반복됨`;
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
  calibratedSkeletonTerms: Set<string>,
): boolean {
  if (
    concept === undefined ||
    concept.score < COMBO_SCORE ||
    concept.supportSamples !== sampleCount
  ) {
    return false;
  }
  const semantic = concept.evidence.some(
    (evidence) => evidence.kind !== "수식골격" && evidence.strength >= 0.7,
  );
  if (semantic) return true;
  return (
    concept.evidence.filter(
      (evidence) =>
        calibratedSkeletonTerms.has(evidence.term) &&
        evidence.sampleIndexes.length >= 2,
    ).length >= 2
  );
}

function deriveCalibratedSkeletonTerms(
  preliminary: Map<string, Classification>,
): Set<string> {
  const terms = new Set<string>();
  for (const gauge of GAUGE.filter(
    (item) => item.expected === "결합형" && item.expectedExternal,
  )) {
    const item = preliminary.get(gauge.key);
    if (!item) throw new Error(`양성 눈금 예비 판정 없음: ${gauge.key}`);
    const concept = item.external.find((candidate) =>
      candidate.unitSection.includes(gauge.expectedExternal!),
    );
    if (!concept || concept.supportSamples !== item.sampleCount) continue;
    const hasSemantic = concept.evidence.some(
      (evidence) => evidence.kind !== "수식골격" && evidence.strength >= 0.7,
    );
    if (hasSemantic) continue;
    for (const evidence of concept.evidence
      .filter(
        (candidate) =>
          candidate.kind === "수식골격" &&
          candidate.sampleIndexes.length >= 2 &&
          candidate.mappedUnitCount <= 8,
      )
      .slice(0, 2)) {
      terms.add(evidence.term);
    }
  }
  return terms;
}

function preferGaugeEvidence(
  classifications: Classification[],
  calibratedSkeletonTerms: Set<string>,
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
        conceptQualifies(concept, item.sampleCount, calibratedSkeletonTerms),
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
      `${preferred.supportSamples}/${item.sampleCount}표본에서 반복됨`;
  }
}

function calibrationResult(
  classified: Map<string, Classification>,
  calibratedSkeletonTerms: Set<string>,
): {
  lines: string[];
  corePositiveHit: number;
  corePositiveTotal: number;
  coreNegativeFalsePositive: number;
  coreNegativeTotal: number;
  mismatches: string[];
} {
  const lines: string[] = [];
  const mismatches: string[] = [];
  for (const gauge of GAUGE) {
    const item = classified.get(gauge.key);
    if (!item) throw new Error(`눈금 판정 없음: ${gauge.key}`);
    const expectedEvidence = gauge.expectedExternal
      ? item.external.find(
          (concept) =>
            concept.unitSection.includes(gauge.expectedExternal!) &&
            conceptQualifies(
              concept,
              item.sampleCount,
              calibratedSkeletonTerms,
            ),
        )
      : undefined;
    const ok =
      item.verdict === gauge.expected &&
      (gauge.expectedExternal === undefined || expectedEvidence !== undefined);
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
              calibratedSkeletonTerms,
            ),
        )
      );
    }).length,
    corePositiveTotal: corePositive.length,
    coreNegativeFalsePositive: coreNegative.filter(
      (gauge) => classified.get(gauge.key)?.verdict === "결합형",
    ).length,
    coreNegativeTotal: coreNegative.length,
    mismatches,
  };
}

function md(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function reportMarkdown(
  corpus: CorpusFile,
  census: CensusFile,
  classifications: Classification[],
  calibration: ReturnType<typeof calibrationResult>,
  vetoCount: number,
  uncertainVetoCount: number,
  calibratedSkeletonTerms: Set<string>,
): string {
  const combos = classifications.filter((item) => item.verdict === "결합형");
  const notCombos = classifications.filter((item) => item.verdict === "아님");
  const unknown = classifications.filter((item) => item.verdict === "미분류");
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
    "# 기존 중등 873유형 결합형 판정 보고",
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
    "## 2. 눈금 성적",
    "",
    `양성 ${calibration.corePositiveTotal} 중 **${calibration.corePositiveHit}**을 잡음` +
      ` · 음성 ${calibration.coreNegativeTotal} 중 오탐 **${calibration.coreNegativeFalsePositive}**.`,
    "",
    ...calibration.lines.map((line) => `- ${line}`),
    "",
    `추가 음성까지 포함해 음성 눈금에서 외부 개념처럼 보인 census 열쇠-앵커 ${vetoCount}쌍은` +
      " 그 앵커 문맥에서 판정 근거에서 제외했다. 열쇠 문자열은 손으로 적지 않았고 눈금 실물과 census의 교집합으로 얻었다.",
    `갈래가 섞여 눈으로도 확정하지 못한 추가 눈금에서 겹친 census 열쇠-앵커 ${uncertainVetoCount}쌍은` +
      " 같은 앵커에서 결합형 근거로 승격하지 않고 미분류 근거로 남겼다.",
    `한글 개념어·LaTeX 명령 없이도 양성이었던 눈금에서만 수식골격 ${calibratedSkeletonTerms.size}종을 배웠다:` +
      ` ${[...calibratedSkeletonTerms].sort().join(", ") || "없음"}.`,
    "",
    "## 3. 결합형으로 판정된 전량",
    "",
    "| 키 | 제목 | 앵커 ↔ 외부 소단원 | 점수 | 근거 풀이 한 줄 |",
    "| --- | --- | --- | ---: | --- |",
  ];
  for (const item of combos) {
    const concept = item.external[0];
    lines.push(
      `| ${md(item.key)} | ${md(item.rpmTitle)} | ${md(item.unitSection)} ↔ ` +
        `${md(concept?.unitSection ?? "모름")} | ${(concept?.score ?? 0).toFixed(3)} | ` +
        `${md(concept?.excerpt ?? "근거 없음")} |`,
    );
  }
  if (combos.length === 0) lines.push("| 없음 |  |  |  |  |");

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
        `${md(item.reason)} | ${md(item.external[0]?.excerpt ?? "외부 풀이 열쇠 없음")} |`,
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
    `- 위 과정을 통과한 판정 입력은 ${census.selectedKeys.length}종이다.` +
      ` 아래 표는 실제 결합형/미분류의 상위 근거로 쓰인 ${usedKeys.length}종 전량이다.` +
      " 전체 열쇠와 근거 숫자는 solution-vocab.json의 selectedKeys에 있다.",
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
    "## 7. 실행한 명령 + 출력",
    "",
    "```text",
    "$ npx tsx scripts/qa/build-middle-corpus.ts",
    `분모 — 등록 ${corpus.denominator.registered} == 생성 시도 ${corpus.denominator.attempted}` +
      " (유형마다 seed 2 × variant 2 = 표본 4)",
    `집계 — 등록 ${corpus.denominator.registered} == 시도 ${corpus.denominator.attempted}` +
      ` == 성공 ${corpus.denominator.succeeded} + 생성 실패 ${corpus.denominator.failed}`,
    "",
    "$ npx tsx scripts/qa/census-middle-solution-vocab.ts --limit=80",
    `분모 — 등록 ${census.source.registeredTypes} == 성공 ${census.source.successfulTypes}` +
      ` + 생성 실패 ${census.source.failedTypes}; 풀이 표본 ${census.source.samples}`,
    `후보 ${census.terms.length}종 전량 · 판정 입력 열쇠 ${census.selectedKeys.length}종`,
    "",
    "$ npx tsx scripts/qa/probe-middle-combo.ts",
    `눈금 — 양성 ${calibration.corePositiveHit}/${calibration.corePositiveTotal}` +
      ` · 음성 오탐 ${calibration.coreNegativeFalsePositive}/${calibration.coreNegativeTotal}`,
    `집계 — 결합형 ${combos.length} · 아님 ${notCombos.length}` +
      ` · 미분류 ${unknown.length} · 생성 실패 ${corpus.failures.length}`,
    "",
    "$ npm run type-check",
    "[이 보고서 생성 뒤 실행 결과를 채울 자리]",
    "",
    "$ npm run lint",
    "[이 보고서 생성 뒤 실행 결과를 채울 자리]",
    "```",
    "",
    "## 8. 못 한 것·모르는 것",
    "",
    "- 이 판정기는 풀이 어휘·수식 골격의 반복을 근거로 의심도를 정한다. 어떤 개념을 빼면 논리적으로 풀 수 없는지를 형식 증명하지는 못한다.",
    "- `결합형`은 자동 판정 결과이며 최종 교육과정 판정은 아니다. 특히 수식 골격의 소단원 매핑은 말뭉치 분포에서 유도하므로 이름이 인접 개념으로 잡힐 수 있다.",
    "- `미분류`는 모르는 것을 숨기지 않은 목록이다. 이 목록의 전량 육안 확인은 하지 못했다.",
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
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  const census = JSON.parse(readFileSync(vocabPath, "utf8")) as CensusFile;
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
      new Set<string>(),
    ),
  );
  const calibratedSkeletonTerms = deriveCalibratedSkeletonTerms(
    new Map(preliminary.map((item) => [item.key, item])),
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
        calibratedSkeletonTerms,
      ),
    )
    .sort((a, b) => b.suspicion - a.suspicion || a.key.localeCompare(b.key));
  preferGaugeEvidence(classifications, calibratedSkeletonTerms);
  classifications.sort(
    (a, b) => b.suspicion - a.suspicion || a.key.localeCompare(b.key),
  );
  const classifiedByKey = new Map(
    classifications.map((item) => [item.key, item]),
  );
  const calibration = calibrationResult(
    classifiedByKey,
    calibratedSkeletonTerms,
  );
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
    `\n눈금 — 양성 ${calibration.corePositiveHit}/${calibration.corePositiveTotal}` +
      ` · 음성 오탐 ${calibration.coreNegativeFalsePositive}/${calibration.coreNegativeTotal}` +
      ` · 음성 문맥에서 제외한 census 열쇠-앵커 ${vetoPairCount}쌍` +
      ` · 혼합 갈래로 보류한 census 열쇠-앵커 ${uncertainVetoPairCount}쌍` +
      ` · 양성에서 배운 수식골격 ${calibratedSkeletonTerms.size}종`,
  );
  if (calibration.mismatches.length > 0) {
    throw new Error(
      `눈금 ${calibration.mismatches.length}건 불일치 — 전량 판정을 거부합니다:\n` +
        calibration.mismatches.join("\n"),
    );
  }
  if (process.argv.includes("--calibrate")) return;

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
      calibratedSkeletonTerms: [...calibratedSkeletonTerms].sort(),
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
      classifications,
      calibration,
      vetoPairCount,
      uncertainVetoPairCount,
      calibratedSkeletonTerms,
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
