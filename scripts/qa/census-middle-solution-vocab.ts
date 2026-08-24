/**
 * ① 중등 말뭉치 `solution`의 한국어 어절·인접 명사구 후보를 목록 없이 전수 집계한다.
 * ② 개념어를 미리 정하면 목록 밖 부류가 0이 되므로, 기계적으로 뽑은 모든 후보에 빈도와
 *    유형 문서 빈도(DF)를 붙이고 등록 메타와 맞닿는 후보도 같은 산출물에 근거와 함께 남긴다.
 * ③ 결합형 여부를 판정하거나 DB·제품 코드·말뭉치를 바꾸지 않는다.
 *
 *   npx tsx scripts/qa/census-middle-solution-vocab.ts
 *   npx tsx scripts/qa/census-middle-solution-vocab.ts --limit=80
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CORPUS = "C:/tmp/middle-combo/corpus.json";
const DEFAULT_JSON = "C:/tmp/middle-combo/solution-vocab2.json";
const DEFAULT_TSV = "C:/tmp/middle-combo/solution-vocab2.tsv";
const DEFAULT_LIMIT = 120;

type CorpusSample = {
  seed: number;
  variant: number;
  solution: string;
};

type CorpusType = {
  key: string;
  grade: string;
  unitSection: string;
  rpmMinor: string;
  rpmTitle: string;
  samples: CorpusSample[];
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
  failures: { key: string }[];
};

type TermKind =
  "어절" | "2어절" | "3어절" | "LaTeX명령" | "수식골격" | "식모양";

type Bucket = {
  term: string;
  kind: TermKind;
  frequency: number;
  typeKeys: Set<string>;
  sampleIds: Set<string>;
  unitCounts: Map<string, number>;
  unitTypeKeys: Map<string, Set<string>>;
  examples: { key: string; solution: string }[];
};

type VocabRow = {
  term: string;
  kind: TermKind;
  frequency: number;
  typeFrequency: number;
  sampleFrequency: number;
  unitSections: {
    unitSection: string;
    frequency: number;
    typeFrequency: number;
  }[];
  examples: { key: string; solution: string }[];
};

type LabelAtom = {
  atom: string;
  units: string[];
};

type ConceptCandidate = VocabRow & {
  mappingSource: "등록 라벨" | "풀이 공기" | "풀이 분포";
  matchedLabelAtoms: string[];
  mappedUnitSections: string[];
  homeTypeFrequency: number;
  homePrecision: number;
  reason: string;
};

type CensusFile = {
  schemaVersion: 1;
  generatedAt: string;
  source: {
    corpus: string;
    registeredTypes: number;
    successfulTypes: number;
    failedTypes: number;
    samples: number;
  };
  extraction: {
    policy: string;
    documentUnit: "유형 키";
    selectionPolicy: string;
  };
  terms: VocabRow[];
  conceptCandidates: ConceptCandidate[];
  selectedKeys: ConceptCandidate[];
  shapeDecisions: ShapeDecision[];
};

type ShapeDecision = {
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
};

type ShapeAssociation = {
  atoms: string[];
  mappedUnitSections: string[];
  coTypeFrequency: number;
  precision: number;
};

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

function assertCorpus(corpus: CorpusFile): void {
  const d = corpus.denominator;
  if (
    corpus.schemaVersion !== 1 ||
    d.registered !== d.attempted ||
    d.succeeded + d.failed !== d.registered ||
    corpus.types.length !== d.succeeded ||
    corpus.failures.length !== d.failed
  ) {
    throw new Error(
      `말뭉치 분모 불일치: 등록 ${d.registered} / 시도 ${d.attempted}` +
        ` / 성공 ${d.succeeded}(${corpus.types.length}행)` +
        ` / 실패 ${d.failed}(${corpus.failures.length}행)`,
    );
  }
  const keys = new Set(corpus.types.map((type) => type.key));
  if (keys.size !== corpus.types.length) {
    throw new Error(
      `말뭉치 성공 유형 키가 겹칩니다: ${corpus.types.length - keys.size}건`,
    );
  }
}

function compactMath(expression: string): string {
  return expression
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[,;!]|\\quad/g, "")
    .replace(/\s+/g, "")
    .replace(/\^\{2\}/g, "^2");
}

function commandBraceBodies(math: string, command: string): string[] {
  const out: string[] = [];
  let cursor = 0;
  const prefix = `${command}{`;
  while (cursor < math.length) {
    const start = math.indexOf(prefix, cursor);
    if (start < 0) break;
    const bodyStart = start + prefix.length;
    let depth = 1;
    let index = bodyStart;
    for (; index < math.length && depth > 0; index += 1) {
      if (math[index] === "{") depth += 1;
      else if (math[index] === "}") depth -= 1;
    }
    if (depth === 0) out.push(math.slice(bodyStart, index - 1));
    cursor = Math.max(index, bodyStart + 1);
  }
  return out;
}

function splitAtTopLevelPlus(value: string): [string, string] | undefined {
  let braceDepth = 0;
  let parenDepth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;
    else if (char === "+" && braceDepth === 0 && parenDepth === 0) {
      return [value.slice(0, index), value.slice(index + 1)];
    }
  }
  return undefined;
}

/**
 * 특정 개념 이름을 적지 않고, 말뭉치에 실제로 나타난 해석 가능한 식 구조만 낸다.
 * 범용 표기 세 종류도 진단 후보로 남겨 분포가 왜 서명이 아닌지 수치로 기록한다.
 */
function shapeTerms(expression: string): { term: string; kind: TermKind }[] {
  const math = compactMath(expression);
  const terms = new Set<string>();
  const operand = String.raw`(?:\\overline\{[^{}]+\}|[A-Za-z]+|\d+(?:\.\d+)?|\([^()]+\))`;
  const square = `${operand}\\^2`;

  for (const body of commandBraceBodies(math, "\\sqrt")) {
    const addends = splitAtTopLevelPlus(body);
    if (addends?.every((addend) => /\^2$/.test(addend))) {
      terms.add("식모양:근호(두 제곱의 합)");
    }
  }
  if (new RegExp(`${square}=${square}[+-]${square}`).test(math)) {
    terms.add("식모양:한 제곱=두 제곱의 합차");
  }
  if ((math.match(/\^2/g) ?? []).length >= 2 && math.includes("=")) {
    terms.add("식모양:등식에 제곱 둘 이상");
  }

  const ratioAtom = String.raw`(?:\\overline\{[^{}]+\}|[A-Za-z]+|\d+(?:\.\d+)?|\([^()]+\))`;
  if (
    new RegExp(`^${ratioAtom}:${ratioAtom}=${ratioAtom}:${ratioAtom}$`).test(
      math,
    )
  ) {
    terms.add("식모양:네 항 비례식");
  }
  if (
    /^[^:=]+:[^:=]+=([A-Za-z]):\(\1[+-]\d+(?:\.\d+)?\)$/.test(math) ||
    /^([A-Za-z]):\(\1[+-]\d+(?:\.\d+)?\)=[^:=]+:[^:=]+$/.test(math)
  ) {
    terms.add("식모양:비례식(같은 문자와 그 차)");
  }
  if (/\\(?:d?frac)\{[^{}]+\}\{360\}/.test(math)) {
    terms.add("식모양:전체각 360에 대한 분율");
  }

  if (/\\(?:d?frac)\{/.test(math)) terms.add("식모양:분수 표기");
  if (/\\div|\//.test(math)) terms.add("식모양:나눗셈 표기");
  if (/\\left|[()]/.test(expression)) terms.add("식모양:괄호 표기");

  return [...terms].map((term) => ({ term, kind: "식모양" as const }));
}

function mathTerms(expression: string): { term: string; kind: TermKind }[] {
  const rawTokens =
    expression.match(
      /\\[A-Za-z]+|[A-Za-z]+|\d+(?:\.\d+)?|[=<>+\-*/^_:]|[^\s{}()[\],.]/g,
    ) ?? [];
  const tokens = rawTokens.map((token) => {
    if (/^\\[A-Za-z]+$/.test(token)) return token;
    if (/^[A-Za-z]+$/.test(token)) return "V";
    if (/^\d+(?:\.\d+)?$/.test(token)) return "N";
    return token;
  });
  const out: { term: string; kind: TermKind }[] = [];

  for (const command of tokens.filter(
    (token) => token.startsWith("\\") && token.length > 1,
  )) {
    out.push({ term: `수식명령:${command}`, kind: "LaTeX명령" });
  }
  for (let width = 2; width <= 6; width += 1) {
    for (let index = 0; index + width <= tokens.length; index += 1) {
      out.push({
        term: `수식골격:${tokens.slice(index, index + width).join("")}`,
        kind: "수식골격",
      });
    }
  }
  out.push(...shapeTerms(expression));
  return out;
}

/** 개념 사전 없이 한글 어절·인접 2·3어절과 수식 토큰 골격을 전부 낸다. */
export function solutionTerms(
  solution: string,
): { term: string; kind: TermKind }[] {
  const terms: { term: string; kind: TermKind }[] = [];
  const mathPattern = /\$([^$]*)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  for (const match of solution.normalize("NFC").matchAll(mathPattern)) {
    const expression = match[1] ?? match[2] ?? match[3] ?? "";
    terms.push(...mathTerms(expression));
  }

  const withoutMath = solution
    .normalize("NFC")
    .replace(/\$[^$]*\$/g, "\n")
    .replace(/\\\([\s\S]*?\\\)/g, "\n")
    .replace(/\\\[[\s\S]*?\\\]/g, "\n");
  const clauses = withoutMath.split(/[\n.!?;:()[\]{}<>·=+×÷]/u);

  for (const clause of clauses) {
    const words = clause.match(/[가-힣]{2,}/gu) ?? [];
    for (const word of words) terms.push({ term: word, kind: "어절" });
    for (const width of [2, 3] as const) {
      for (let i = 0; i + width <= words.length; i += 1) {
        terms.push({
          term: words.slice(i, i + width).join(" "),
          kind: width === 2 ? "2어절" : "3어절",
        });
      }
    }
  }
  return terms;
}

/** 등록 라벨의 조사만 기계적으로 벗긴다. 수학 개념 목록은 여기 없다. */
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

function labelAtoms(types: CorpusType[]): LabelAtom[] {
  const unitsByAtom = new Map<string, Set<string>>();
  for (const type of types) {
    for (const label of [type.unitSection, type.rpmMinor]) {
      for (const atom of labelWordVariants(label)) {
        let units = unitsByAtom.get(atom);
        if (!units) {
          units = new Set<string>();
          unitsByAtom.set(atom, units);
        }
        units.add(type.unitSection);
      }
    }
  }
  return [...unitsByAtom]
    .map(([atom, units]) => ({ atom, units: [...units].sort() }))
    .sort(
      (a, b) => b.atom.length - a.atom.length || a.atom.localeCompare(b.atom),
    );
}

function bump(
  buckets: Map<string, Bucket>,
  term: string,
  kind: TermKind,
  type: CorpusType,
  sampleId: string,
  solution: string,
): void {
  let bucket = buckets.get(term);
  if (!bucket) {
    bucket = {
      term,
      kind,
      frequency: 0,
      typeKeys: new Set<string>(),
      sampleIds: new Set<string>(),
      unitCounts: new Map<string, number>(),
      unitTypeKeys: new Map<string, Set<string>>(),
      examples: [],
    };
    buckets.set(term, bucket);
  }
  bucket.frequency += 1;
  bucket.typeKeys.add(type.key);
  bucket.sampleIds.add(sampleId);
  bucket.unitCounts.set(
    type.unitSection,
    (bucket.unitCounts.get(type.unitSection) ?? 0) + 1,
  );
  let unitTypeKeys = bucket.unitTypeKeys.get(type.unitSection);
  if (!unitTypeKeys) {
    unitTypeKeys = new Set<string>();
    bucket.unitTypeKeys.set(type.unitSection, unitTypeKeys);
  }
  unitTypeKeys.add(type.key);
  if (
    bucket.examples.length < 3 &&
    !bucket.examples.some((example) => example.key === type.key)
  ) {
    bucket.examples.push({
      key: type.key,
      solution: solution.replace(/\s+/g, " ").trim().slice(0, 180),
    });
  }
}

function rowOf(bucket: Bucket): VocabRow {
  return {
    term: bucket.term,
    kind: bucket.kind,
    frequency: bucket.frequency,
    typeFrequency: bucket.typeKeys.size,
    sampleFrequency: bucket.sampleIds.size,
    unitSections: [...bucket.unitCounts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([unitSection, frequency]) => ({
        unitSection,
        frequency,
        typeFrequency: bucket.unitTypeKeys.get(unitSection)?.size ?? 0,
      })),
    examples: bucket.examples,
  };
}

function matchingAtoms(term: string, atoms: LabelAtom[]): LabelAtom[] {
  const contained = atoms.filter(
    ({ atom }) => atom.length >= 2 && term.includes(atom),
  );
  if (contained.length > 0) {
    const longest = contained[0]!.atom.length;
    return contained.filter(({ atom }) => atom.length === longest);
  }
  const containing = atoms.filter(
    ({ atom }) => atom.length >= 2 && atom.includes(term),
  );
  if (containing.length === 0) return [];
  const shortest = Math.min(...containing.map(({ atom }) => atom.length));
  return containing.filter(({ atom }) => atom.length === shortest);
}

function directlyMatchingAtoms(term: string, atoms: LabelAtom[]): LabelAtom[] {
  const contained = atoms.filter(
    ({ atom }) => atom.length >= 2 && term.includes(atom),
  );
  if (contained.length === 0) return [];
  const longest = contained[0]!.atom.length;
  return contained.filter(({ atom }) => atom.length === longest);
}

function commandLocalAssociations(
  corpus: CorpusFile,
  atoms: LabelAtom[],
  atomTypes: Map<string, Set<string>>,
  typeCount: number,
): Map<
  string,
  {
    atoms: LabelAtom[];
    mappedUnitSections: string[];
    coTypeFrequency: number;
    precision: number;
  }
> {
  const commandSamples = new Map<string, Set<string>>();
  const neighborStats = new Map<
    string,
    Map<string, { samples: Set<string>; proximity: number }>
  >();
  const mathPattern = /\$([^$]*)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;

  for (const type of corpus.types) {
    type.samples.forEach((sample, sampleIndex) => {
      const sampleId = `${type.key}@${sample.seed}:${sample.variant}:${sampleIndex}`;
      for (const match of sample.solution
        .normalize("NFC")
        .matchAll(mathPattern)) {
        const expression = match[1] ?? match[2] ?? match[3] ?? "";
        const commands = [...new Set(expression.match(/\\[A-Za-z]+/g) ?? [])];
        if (commands.length === 0 || match.index === undefined) continue;
        const start = match.index;
        const end = start + match[0].length;
        const windowStart = Math.max(0, start - 60);
        const windowEnd = Math.min(sample.solution.length, end + 60);
        const window = sample.solution.slice(windowStart, windowEnd);
        for (const command of commands) {
          const term = `수식명령:${command}`;
          let samples = commandSamples.get(term);
          if (!samples) {
            samples = new Set<string>();
            commandSamples.set(term, samples);
          }
          samples.add(sampleId);
          let statsByAtom = neighborStats.get(term);
          if (!statsByAtom) {
            statsByAtom = new Map();
            neighborStats.set(term, statsByAtom);
          }
          for (const labelAtom of atoms) {
            const offset = window.indexOf(labelAtom.atom);
            if (offset < 0) continue;
            const atomCenter = windowStart + offset + labelAtom.atom.length / 2;
            const mathCenter = (start + end) / 2;
            const distance = Math.abs(atomCenter - mathCenter);
            let stats = statsByAtom.get(labelAtom.atom);
            if (!stats) {
              stats = { samples: new Set<string>(), proximity: 0 };
              statsByAtom.set(labelAtom.atom, stats);
            }
            stats.samples.add(sampleId);
            stats.proximity += 1 / (1 + distance);
          }
        }
      }
    });
  }

  const out = new Map<
    string,
    {
      atoms: LabelAtom[];
      mappedUnitSections: string[];
      coTypeFrequency: number;
      precision: number;
    }
  >();
  for (const [term, statsByAtom] of neighborStats) {
    const totalSamples = commandSamples.get(term)?.size ?? 0;
    const ranked = [...statsByAtom]
      .map(([atom, stats]) => {
        const globalDf = atomTypes.get(atom)?.size ?? typeCount;
        const precision = stats.samples.size / Math.max(1, totalSamples);
        const score =
          stats.proximity * Math.log((typeCount + 1) / Math.max(1, globalDf));
        return {
          atom,
          coTypeFrequency: stats.samples.size,
          precision,
          score,
        };
      })
      .filter(
        (item) =>
          item.coTypeFrequency >= 2 &&
          item.precision >= 0.5 &&
          Number.isFinite(item.score),
      )
      .sort((a, b) => b.score - a.score || b.atom.length - a.atom.length);
    const best = ranked[0];
    if (!best) continue;
    const pickedNames = new Set(
      ranked
        .filter((item) => item.score >= best.score * 0.95)
        .map((item) => item.atom),
    );
    const pickedAtoms = atoms.filter(({ atom }) => pickedNames.has(atom));
    const mappedUnitSections = [
      ...new Set(pickedAtoms.flatMap(({ units }) => units)),
    ].sort();
    if (mappedUnitSections.length === 0 || mappedUnitSections.length > 12) {
      continue;
    }
    out.set(term, {
      atoms: pickedAtoms,
      mappedUnitSections,
      coTypeFrequency: best.coTypeFrequency,
      precision: best.precision,
    });
  }
  return out;
}

function homeStats(
  row: VocabRow,
  mappedUnitSections: string[],
): {
  homeTypeFrequency: number;
  homePrecision: number;
} {
  const mapped = new Set(mappedUnitSections);
  const homeTypeFrequency = row.unitSections
    .filter(({ unitSection }) => mapped.has(unitSection))
    .reduce((sum, unit) => sum + unit.typeFrequency, 0);
  return {
    homeTypeFrequency,
    homePrecision: homeTypeFrequency / Math.max(1, row.typeFrequency),
  };
}

function distributionMapping(row: VocabRow): string[] {
  const top = Math.max(
    0,
    ...row.unitSections.map((unit) => unit.typeFrequency),
  );
  if (top < 2) return [];
  const floor = Math.max(2, Math.ceil(top * 0.6));
  return row.unitSections
    .filter((unit) => unit.typeFrequency >= floor)
    .map((unit) => unit.unitSection)
    .sort();
}

function shapeDecisionFor(
  row: VocabRow,
  unitTypeTotals: Map<string, number>,
  typeCount: number,
): ShapeDecision {
  const ranked = [...row.unitSections].sort(
    (a, b) =>
      b.typeFrequency - a.typeFrequency ||
      b.frequency - a.frequency ||
      a.unitSection.localeCompare(b.unitSection),
  );
  const top = ranked[0];
  const second = ranked[1];
  const topDf = top?.typeFrequency ?? 0;
  const secondDf = second?.typeFrequency ?? 0;
  const concentration = topDf / Math.max(1, row.typeFrequency);
  const topUnitPrevalence =
    topDf / Math.max(1, unitTypeTotals.get(top?.unitSection ?? "") ?? 0);
  const globalPrevalence = row.typeFrequency / Math.max(1, typeCount);
  const lift = topUnitPrevalence / Math.max(globalPrevalence, 1 / typeCount);
  const idf =
    Math.log((typeCount + 1) / (row.typeFrequency + 1)) /
    Math.log(typeCount + 1);
  const margin = topDf / Math.max(1, secondDf);
  const signatureScore = concentration * idf;
  const checks = [
    { ok: topDf >= 2, label: `최상위 소단원 DF ${topDf}>=2` },
    {
      ok: concentration >= 0.25,
      label: `집중도 ${(concentration * 100).toFixed(1)}%>=25%`,
    },
    { ok: margin >= 1.5, label: `1·2위 DF 비 ${margin.toFixed(2)}>=1.50` },
    { ok: lift >= 3, label: `리프트 ${lift.toFixed(2)}>=3.00` },
    { ok: idf >= 0.25, label: `정규 IDF ${idf.toFixed(3)}>=0.250` },
  ];
  const selected = checks.every(({ ok }) => ok);
  return {
    term: row.term,
    typeFrequency: row.typeFrequency,
    topUnitSection: top?.unitSection ?? "없음",
    topUnitTypeFrequency: topDf,
    secondUnitTypeFrequency: secondDf,
    concentration,
    topUnitPrevalence,
    lift,
    idf,
    signatureScore,
    associatedAtoms: [],
    associatedUnitSections: [],
    associationTypeFrequency: 0,
    associationPrecision: 0,
    selected,
    reason: checks
      .map(({ ok, label }) => `${ok ? "통과" : "탈락"} ${label}`)
      .join(" · "),
  };
}

function shapeLabelAssociations(
  shapeRows: VocabRow[],
  termsByType: Map<string, Set<string>>,
  atoms: LabelAtom[],
  atomTypes: Map<string, Set<string>>,
  typeCount: number,
): Map<string, ShapeAssociation> {
  const out = new Map<string, ShapeAssociation>();
  for (const row of shapeRows) {
    const shapeTypes = new Set(
      [...termsByType]
        .filter(([, terms]) => terms.has(row.term))
        .map(([typeKey]) => typeKey),
    );
    const ranked = atoms
      .map((labelAtom) => {
        const types = atomTypes.get(labelAtom.atom) ?? new Set<string>();
        let coTypeFrequency = 0;
        for (const typeKey of shapeTypes) {
          if (types.has(typeKey)) coTypeFrequency += 1;
        }
        const precision = coTypeFrequency / Math.max(1, shapeTypes.size);
        const atomIdf =
          Math.log((typeCount + 1) / (types.size + 1)) /
          Math.log(typeCount + 1);
        const coverage = coTypeFrequency / Math.max(1, types.size);
        return {
          labelAtom,
          coTypeFrequency,
          precision,
          score: precision * atomIdf + 0.2 * coverage,
        };
      })
      .filter(
        ({ labelAtom, coTypeFrequency, precision }) =>
          labelAtom.atom.length >= 3 &&
          labelAtom.units.length <= 4 &&
          coTypeFrequency >= 2 &&
          precision >= 0.1,
      )
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.coTypeFrequency - a.coTypeFrequency ||
          b.labelAtom.atom.length - a.labelAtom.atom.length ||
          a.labelAtom.atom.localeCompare(b.labelAtom.atom),
      );
    const best = ranked[0];
    if (!best) continue;
    const picked = ranked
      .filter(
        (item) =>
          item.score >= best.score * 0.5 &&
          item.coTypeFrequency >= best.coTypeFrequency * 0.75,
      )
      .slice(0, 5);
    out.set(row.term, {
      atoms: picked.map((item) => item.labelAtom.atom).sort(),
      mappedUnitSections: [
        ...new Set(picked.flatMap((item) => item.labelAtom.units)),
      ].sort(),
      coTypeFrequency: best.coTypeFrequency,
      precision: best.precision,
    });
  }
  return out;
}

function main(): void {
  const corpusPath = resolve(argValue("corpus") ?? DEFAULT_CORPUS);
  const jsonPath = resolve(argValue("json") ?? DEFAULT_JSON);
  const tsvPath = resolve(argValue("tsv") ?? DEFAULT_TSV);
  const limit = Number(argValue("limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`--limit은 0 이상의 정수여야 합니다: ${limit}`);
  }

  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as CorpusFile;
  assertCorpus(corpus);

  const buckets = new Map<string, Bucket>();
  const termsByType = new Map<string, Set<string>>();
  let sampleCount = 0;
  for (const type of corpus.types) {
    const typeTerms = new Set<string>();
    termsByType.set(type.key, typeTerms);
    for (const sample of type.samples) {
      sampleCount += 1;
      const sampleId = `${type.key}@${sample.seed}:${sample.variant}`;
      for (const { term, kind } of solutionTerms(sample.solution)) {
        bump(buckets, term, kind, type, sampleId, sample.solution);
        typeTerms.add(term);
      }
    }
  }

  const terms = [...buckets.values()]
    .map(rowOf)
    .sort(
      (a, b) =>
        b.frequency - a.frequency ||
        b.typeFrequency - a.typeFrequency ||
        a.term.localeCompare(b.term),
    );
  const unitTypeTotals = new Map<string, number>();
  for (const type of corpus.types) {
    unitTypeTotals.set(
      type.unitSection,
      (unitTypeTotals.get(type.unitSection) ?? 0) + 1,
    );
  }
  const atoms = labelAtoms(corpus.types);
  const atomTypes = new Map<string, Set<string>>();
  for (const [typeKey, typeTerms] of termsByType) {
    const seen = new Set<string>();
    for (const term of typeTerms) {
      if (term.startsWith("수식") || term.startsWith("식모양")) continue;
      for (const { atom } of directlyMatchingAtoms(term, atoms)) seen.add(atom);
    }
    for (const atom of seen) {
      let types = atomTypes.get(atom);
      if (!types) {
        types = new Set<string>();
        atomTypes.set(atom, types);
      }
      types.add(typeKey);
    }
  }
  const shapeRows = terms.filter((row) => row.kind === "식모양");
  const shapeAssociations = shapeLabelAssociations(
    shapeRows,
    termsByType,
    atoms,
    atomTypes,
    corpus.types.length,
  );
  const genericRatioAssociation = shapeAssociations.get("식모양:네 항 비례식");
  if (
    !shapeAssociations.has("식모양:비례식(같은 문자와 그 차)") &&
    genericRatioAssociation
  ) {
    shapeAssociations.set(
      "식모양:비례식(같은 문자와 그 차)",
      genericRatioAssociation,
    );
  }
  const shapeDecisions = shapeRows
    .map((row) => {
      const decision = shapeDecisionFor(
        row,
        unitTypeTotals,
        corpus.types.length,
      );
      const association = shapeAssociations.get(row.term);
      if (association) {
        decision.associatedAtoms = association.atoms;
        decision.associatedUnitSections = association.mappedUnitSections;
        decision.associationTypeFrequency = association.coTypeFrequency;
        decision.associationPrecision = association.precision;
        const associationRescuesMargin =
          !decision.selected &&
          decision.topUnitTypeFrequency >= 2 &&
          decision.concentration >= 0.25 &&
          decision.lift >= 3 &&
          decision.idf >= 0.25 &&
          association.coTypeFrequency >= 2 &&
          association.precision >= 0.4;
        if (associationRescuesMargin) {
          decision.selected = true;
          decision.reason +=
            " · 공기 보강 통과: 등록 라벨 어절과의 문서 공기 " +
            `${association.coTypeFrequency}/${row.typeFrequency}>=40%`;
        }
      }
      return decision;
    })
    .sort(
      (a, b) =>
        Number(b.selected) - Number(a.selected) ||
        b.signatureScore - a.signatureScore ||
        a.term.localeCompare(b.term),
    );
  const shapeDecisionByTerm = new Map(
    shapeDecisions.map((decision) => [decision.term, decision]),
  );
  const commandAssociations = commandLocalAssociations(
    corpus,
    atoms,
    atomTypes,
    corpus.types.length,
  );
  const conceptCandidates: ConceptCandidate[] = [];
  for (const row of terms) {
    // 한 유형에만 나오는 말은 소재일 가능성이 크므로 판정 열쇠 후보에서는 보류한다.
    // 원자료 `terms`에서는 빼지 않는다.
    if (row.typeFrequency < 2) continue;
    const lexical = ["어절", "2어절", "3어절"].includes(row.kind);
    const shape = row.kind === "식모양";
    const matched = lexical ? matchingAtoms(row.term, atoms) : [];
    const association =
      row.kind === "LaTeX명령" ? commandAssociations.get(row.term) : undefined;
    const usedAtoms = association?.atoms ?? matched;
    const matchedLabelAtoms = [
      ...new Set(usedAtoms.map(({ atom }) => atom)),
    ].sort();
    const shapeDecision = shapeDecisionByTerm.get(row.term);
    const mappedUnitSections = lexical
      ? [...new Set(matched.flatMap(({ units }) => units))].sort()
      : shape
        ? shapeDecision?.associatedUnitSections.length
          ? shapeDecision.associatedUnitSections
          : shapeDecision?.topUnitSection &&
              shapeDecision.topUnitSection !== "없음"
            ? [shapeDecision.topUnitSection]
            : []
        : (association?.mappedUnitSections ?? distributionMapping(row));
    if (mappedUnitSections.length === 0) continue;
    const home = shapeDecision
      ? {
          homeTypeFrequency: shapeDecision.topUnitTypeFrequency,
          homePrecision: shapeDecision.concentration,
        }
      : association
        ? {
            homeTypeFrequency: association.coTypeFrequency,
            homePrecision: association.precision,
          }
        : homeStats(row, mappedUnitSections);
    const mappingSource = lexical
      ? "등록 라벨"
      : association
        ? "풀이 공기"
        : "풀이 분포";
    conceptCandidates.push({
      ...row,
      mappingSource,
      matchedLabelAtoms,
      mappedUnitSections,
      homeTypeFrequency: home.homeTypeFrequency,
      homePrecision: home.homePrecision,
      reason:
        `풀이 빈도 ${row.frequency} · 유형 DF ${row.typeFrequency}; ` +
        (shapeDecision
          ? `문서빈도 서명 ${shapeDecision.topUnitSection} ` +
            `${shapeDecision.topUnitTypeFrequency}/${row.typeFrequency}` +
            ` (집중도 ${(shapeDecision.concentration * 100).toFixed(1)}%, ` +
            `IDF ${shapeDecision.idf.toFixed(3)}, 리프트 ${shapeDecision.lift.toFixed(2)}); ` +
            (shapeDecision.associatedUnitSections.length
              ? `같은 유형의 등록 라벨 어절 ${shapeDecision.associatedAtoms.join(", ")}와 ` +
                `DF ${shapeDecision.associationTypeFrequency}/${row.typeFrequency} 공기하여 ` +
                `${shapeDecision.associatedUnitSections.join(", ")}에 연결`
              : "공기 연결 없음")
          : lexical
            ? `등록 unitSection/rpmMinor에서 ${matchedLabelAtoms.join(", ")}와 맞닿음`
            : association
              ? `같은 유형 풀이의 등록 라벨 어절 ${matchedLabelAtoms.join(", ")}와 공기`
              : `유형별 풀이 분포 상위가 ${mappedUnitSections.join(", ")}`) +
        `; ${association ? "공기" : "홈"} 유형 ${home.homeTypeFrequency}/${row.typeFrequency}` +
        ` (${(home.homePrecision * 100).toFixed(1)}%)`,
    });
  }

  const selectedKeys = conceptCandidates.flatMap((candidate) => {
    const shapeDecision = shapeDecisionByTerm.get(candidate.term);
    if (candidate.kind === "식모양" && !shapeDecision?.selected) return [];
    const lexical = candidate.mappingSource === "등록 라벨";
    const associated = candidate.mappingSource === "풀이 공기";
    const unitLimit = lexical
      ? 8
      : associated
        ? 12
        : candidate.kind === "LaTeX명령"
          ? 5
          : candidate.kind === "식모양"
            ? 12
            : 8;
    const precisionFloor =
      candidate.kind === "식모양"
        ? 0.25
        : lexical || associated
          ? 0.5
          : candidate.kind === "LaTeX명령"
            ? 0.55
            : 0.25;
    if (
      candidate.mappedUnitSections.length > unitLimit ||
      candidate.homePrecision < precisionFloor
    ) {
      return [];
    }
    return [
      {
        ...candidate,
        reason:
          `${candidate.reason}; 판정 입력 채택 — 홈 정밀도 ` +
          `${(candidate.homePrecision * 100).toFixed(1)}%>=${precisionFloor * 100}%` +
          ` · 매핑 소단원 ${candidate.mappedUnitSections.length}<=${unitLimit}`,
      },
    ];
  });

  const census: CensusFile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      corpus: corpusPath,
      registeredTypes: corpus.denominator.registered,
      successfulTypes: corpus.denominator.succeeded,
      failedTypes: corpus.denominator.failed,
      samples: sampleCount,
    },
    extraction: {
      policy:
        "solution에서 2글자 이상 한글 어절·같은 절의 인접 2·3어절, LaTeX 명령, 정규화 수식 토큰 2~6그램, 해석 가능한 구조식(두 제곱의 합차·비례식·360분율) 및 범용 표기 진단군을 추출",
      documentUnit: "유형 키",
      selectionPolicy:
        "유형 키를 문서로 삼아 DF>=2를 계산한다. 한글은 등록 unitSection/rpmMinor 라벨에 연결한다. LaTeX 명령은 풀이 주변 등록 라벨과의 공기 정밀도>=55%·최대 5단원일 때만 남긴다. 식 모양은 최상위 소단원 DF>=2, 집중도>=25%, 1·2위 DF 비>=1.5, 리프트>=3, 정규 IDF>=0.25를 모두 통과할 때 그 최상위 소단원의 서명 후보로만 보낸다. 수식 n-gram과 식 모양의 실제 판정 사용 여부는 양성·음성 눈금이 다시 정한다.",
    },
    terms,
    conceptCandidates,
    selectedKeys,
    shapeDecisions,
  };

  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(tsvPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(census, null, 2), "utf8");
  writeFileSync(
    tsvPath,
    [
      "순위\t후보\t종류\t빈도\t유형DF\t표본DF\t상위 소단원(빈도/유형DF)",
      ...terms.map(
        (row, index) =>
          `${index + 1}\t${row.term}\t${row.kind}\t${row.frequency}` +
          `\t${row.typeFrequency}\t${row.sampleFrequency}\t` +
          row.unitSections
            .map(
              ({ unitSection, frequency, typeFrequency }) =>
                `${unitSection}:${frequency}/${typeFrequency}`,
            )
            .join(" | "),
      ),
    ].join("\n"),
    "utf8",
  );

  console.log(
    `분모 — 등록 ${corpus.denominator.registered} == 성공 ${corpus.denominator.succeeded}` +
      ` + 생성 실패 ${corpus.denominator.failed}; 풀이 표본 ${sampleCount}`,
  );
  console.log(
    `후보 ${terms.length}종 전량을 빈도순 TSV/JSON에 기록` +
      ` · DF>=2 개념 후보 ${conceptCandidates.length}종` +
      ` · 판정 입력 열쇠 ${selectedKeys.length}종`,
  );
  console.log(
    `\n── 빈도순 상위 ${limit === 0 ? terms.length : Math.min(limit, terms.length)} ──`,
  );
  for (const [index, row] of (limit === 0
    ? terms
    : terms.slice(0, limit)
  ).entries()) {
    console.log(
      `${String(index + 1).padStart(4)}  ${row.term.padEnd(24)}` +
        ` 빈도 ${String(row.frequency).padStart(5)}` +
        ` · 유형 DF ${String(row.typeFrequency).padStart(3)}` +
        ` · 표본 DF ${String(row.sampleFrequency).padStart(4)}`,
    );
  }
  console.log(`\nJSON → ${jsonPath}`);
  console.log(`전량 TSV → ${tsvPath}`);
}

const invokedPath = process.argv[1]
  ? resolve(process.argv[1]).toLowerCase()
  : "";
const modulePath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === modulePath) {
  try {
    main();
  } catch (error) {
    console.error(messageOf(error));
    process.exitCode = 1;
  }
}
