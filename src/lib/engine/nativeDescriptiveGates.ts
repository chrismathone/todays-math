/** Pure authorship inspection. This is neither a student grader nor a registration/write path. */
import {
  parseNativeDescriptiveProblem,
  serializeNativeSolution,
  type NativeDescriptiveProblem,
  type NativeDescriptiveProblemR2,
} from "../../contracts/nativeDescriptive.contract";
import type {
  NativeIndependentVerifier,
  NativeVerification,
} from "./descriptiveVerification/types";

export type NativeGateId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6";
export type NativeGateSample = { seed: number; variant: number };
export type NativeMutationKind =
  "sign" | "unit" | "intermediate" | "figure-label";
export type NativeScoringExample = {
  response: string;
  awards: { criterionId: string; points: number }[];
};
export type NativeGateSuite = {
  generate(seed: number, variant: number): NativeDescriptiveProblem;
  twin?: (
    seed: number,
    variant: number,
  ) => NativeGateSample & {
    content: string;
    modelAnswer: string;
    /** Keys in the authored problem's non-given facts, including grouped targets. */
    requiredFactKeys: string[];
  };
  verify: NativeIndependentVerifier;
  samples: NativeGateSample[];
  /** Every legal branch and every extreme must be declared, then observed by the oracle. */
  coverage: { dimension: string; values: string[] }[];
  mutations: (NativeGateSample & {
    kind: NativeMutationKind;
    label: string;
    mutate(problem: NativeDescriptiveProblem): NativeDescriptiveProblem;
  })[];
  /** Teacher-authored score witnesses; no language-model or natural-language auto-grading. */
  scoringExamples?: (problem: NativeDescriptiveProblemR2) => {
    answerOnly: NativeScoringExample;
    reasoned: NativeScoringExample;
  };
};

const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/\$/g, "")
    .replace(/\\,\\mathrm\{cm\}/g, "cm")
    .replace(/\^\\circ/g, "°")
    .replace(/,\\;/g, ",");
/** Numeric fragments must not match part of another number, sign, or powered unit. */
function containsWitness(text: string, fragment: string): boolean {
  const haystack = normalize(text),
    needle = normalize(fragment);
  if (!needle) return false;
  for (
    let i = haystack.indexOf(needle);
    i !== -1;
    i = haystack.indexOf(needle, i + 1)
  ) {
    const before = haystack.slice(Math.max(0, i - 1), i),
      after = haystack.slice(i + needle.length, i + needle.length + 1);
    if (
      /^[+-]?\d/.test(needle) &&
      (/[\d+-]/.test(before) ||
        (before === "." &&
          /\d/.test(haystack.slice(Math.max(0, i - 2), i - 1))))
    )
      continue;
    if (
      /\d$/.test(needle) &&
      (/\d/.test(after) ||
        (after === "." &&
          /\d/.test(
            haystack.slice(i + needle.length + 1, i + needle.length + 2),
          )))
    )
      continue;
    if (/\d(?:cm|mm|km|m)$/.test(needle) && /[a-zA-Z\d^]/.test(after)) continue;
    return true;
  }
  return false;
}
const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;
const freezeDeep = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
function assertVerification(result: NativeVerification): void {
  const text = (v: unknown): v is string =>
    typeof v === "string" && normalize(v).length > 0;
  const witnesses = (v: unknown): v is string[] =>
    Array.isArray(v) && v.length > 0 && v.every(text);
  if (
    !result ||
    !Array.isArray(result.derived) ||
    !result.derived.length ||
    result.derived.some(
      (f) =>
        !f ||
        !text(f.factKey) ||
        !text(f.value) ||
        !["given", "intermediate", "answer"].includes(f.kind) ||
        (f.unit !== undefined && !text(f.unit)),
    ) ||
    !Array.isArray(result.criterionChecks) ||
    !result.criterionChecks.length ||
    result.criterionChecks.some(
      (c) =>
        !c ||
        !text(c.criterionId) ||
        !witnesses(c.expectedContains) ||
        !witnesses(c.modelContains) ||
        (c.answerContains !== undefined && !witnesses(c.answerContains)),
    ) ||
    !result.coverage ||
    typeof result.coverage !== "object" ||
    Array.isArray(result.coverage) ||
    !Object.keys(result.coverage).length ||
    Object.entries(result.coverage).some(
      ([key, value]) => !text(key) || !text(value),
    )
  )
    throw new Error("독립 검산 결과/증거/경계 자료 불완전");
}

/** This explicit projection is the sole oracle boundary. Hidden fields never cross it. */
export function verifyNativePrinted(
  problem: NativeDescriptiveProblem,
  verify: NativeIndependentVerifier,
): {
  issues: string[];
  /** G5 may only credit oracle rejection, never a stale serialized solution. */
  oracleIssues: string[];
  result?: NativeVerification;
} {
  try {
    parseNativeDescriptiveProblem(problem);
    const printed = freezeDeep({
      content: problem.content,
      figureSpec:
        problem.figureSpec === null
          ? null
          : structuredClone(problem.figureSpec),
    });
    const result = verify(printed);
    assertVerification(result);
    const issues: string[] = [];
    const derived = new Map(result.derived.map((f) => [f.factKey, f]));
    if (!result.derived.length || derived.size !== result.derived.length)
      issues.push("검산 대상이 없거나 factKey가 중복됨");
    if (problem.revision === 2) {
      for (const fact of problem.facts) {
        const got = derived.get(fact.factKey);
        if (
          !got ||
          got.value !== fact.value ||
          got.kind !== fact.kind ||
          got.unit !== fact.unit
        )
          issues.push(`검산 불일치: ${fact.factKey}`);
      }
      for (const c of problem.rubric.criteria)
        if (!derived.has(c.factKey))
          issues.push(`배점 대상 검산 누락: ${c.criterionId}`);
    }
    const checks = new Map(
      result.criterionChecks.map((c) => [c.criterionId, c]),
    );
    if (checks.size !== result.criterionChecks.length)
      issues.push("검산 기준 ID 중복");
    if (
      result.criterionChecks.some(
        (c) =>
          !problem.rubric.criteria.some((r) => r.criterionId === c.criterionId),
      )
    )
      issues.push("검산 기준에 대응하는 채점 기준 누락");
    let hasAnswerCheck = false;
    for (const c of problem.rubric.criteria) {
      const check = checks.get(c.criterionId);
      if (
        !check ||
        !check.expectedContains.length ||
        !check.modelContains.length
      ) {
        issues.push(`기준별 독립 검산 누락: ${c.criterionId}`);
        continue;
      }
      for (const text of check.expectedContains)
        if (!containsWitness(c.expected, text))
          issues.push(`채점 중간값 불일치: ${c.criterionId}`);
      for (const text of check.modelContains)
        if (!containsWitness(problem.modelAnswer, text))
          issues.push(`모범답 증거 불일치: ${c.criterionId}`);
      for (const text of check.answerContains ?? []) {
        hasAnswerCheck = true;
        if (!containsWitness(problem.answer, text))
          issues.push(`최종답 불일치: ${c.criterionId}`);
      }
    }
    if (!hasAnswerCheck) issues.push("최종답 독립 검산 누락");
    const publicationIssues =
      problem.solution ===
      serializeNativeSolution(problem.modelAnswer, problem.rubric)
        ? []
        : ["인쇄할 교사용 solution과 검산한 모범답·채점표 불일치"];
    return {
      issues: [...issues, ...publicationIssues],
      oracleIssues: issues,
      result,
    };
  } catch (e) {
    const issues = [`발문·그림 검산 거부: ${errorText(e)}`];
    return { issues, oracleIssues: issues };
  }
}

function checkSteps(p: NativeDescriptiveProblemR2): string[] {
  const issues: string[] = [];
  const facts = new Map(p.facts.map((f) => [f.factKey, f]));
  if (facts.size !== p.facts.length || !unique(p.steps.map((s) => s.stepId)))
    issues.push("fact/단계 ID 중복");
  const intermediates = p.facts.filter((f) => f.kind === "intermediate");
  if (!intermediates.length) issues.push("최종답 이외의 중간값이 없음");
  const available = new Set(
    p.facts.filter((f) => f.kind === "given").map((f) => f.factKey),
  );
  const outputs = new Set<string>();
  const ancestors = new Map<string, Set<string>>();
  for (const step of p.steps) {
    if (
      step.kind !== "deduction" ||
      !step.relation.trim() ||
      !step.inputFactKeys.length ||
      !unique(step.inputFactKeys) ||
      step.inputFactKeys.some((key) => !available.has(key)) ||
      !facts.has(step.outputFactKey) ||
      available.has(step.outputFactKey)
    ) {
      issues.push(`입력 조건 → 관계 → 새 결과가 아닌 단계: ${step.stepId}`);
      continue;
    }
    available.add(step.outputFactKey);
    outputs.add(step.outputFactKey);
    ancestors.set(
      step.outputFactKey,
      new Set(
        step.inputFactKeys.flatMap((key) => [
          key,
          ...(ancestors.get(key) ?? []),
        ]),
      ),
    );
  }
  for (const fact of intermediates)
    if (!outputs.has(fact.factKey))
      issues.push(`도출되지 않은 중간값: ${fact.factKey}`);
  const scored = new Set<string>();
  for (const criterion of p.rubric.criteria) {
    const fact = facts.get(criterion.factKey);
    if (!fact || fact.kind === "given" || !outputs.has(criterion.factKey))
      issues.push(`기준-factKey 연결 없음: ${criterion.criterionId}`);
    if ((criterion.role === "answer") !== (fact?.kind === "answer"))
      issues.push(`방법/답 분류 불일치: ${criterion.criterionId}`);
    scored.add(criterion.factKey);
    const dependencies = ancestors.get(criterion.factKey) ?? new Set<string>();
    for (const key of criterion.carryForward.fromFactKeys) {
      const index = p.rubric.criteria.findIndex((c) => c.factKey === key);
      if (
        index < 0 ||
        index >= p.rubric.criteria.indexOf(criterion) ||
        !dependencies.has(key)
      )
        issues.push(
          `선행 오류 연결이 앞 기준의 의존 값이 아님: ${criterion.criterionId}`,
        );
    }
    if (criterion.role === "method")
      for (const previous of p.rubric.criteria.slice(
        0,
        p.rubric.criteria.indexOf(criterion),
      ))
        if (
          dependencies.has(previous.factKey) &&
          !criterion.carryForward.fromFactKeys.includes(previous.factKey)
        )
          issues.push(
            `의존하는 선행 값의 방법 점수 보호 누락: ${criterion.criterionId}/${previous.factKey}`,
          );
  }
  if (!intermediates.some((f) => scored.has(f.factKey)))
    issues.push("배점에 묶인 중간값이 없음");
  return issues;
}

function checkRequirements(
  p: NativeDescriptiveProblemR2,
  examples: NativeGateSuite["scoringExamples"],
): string[] {
  const issues: string[] = [];
  if (!unique(p.requirements.map((r) => r.requirementId)))
    issues.push("요구 ID 중복");
  const mapped: string[] = [];
  for (const req of p.requirements) {
    if (
      !req.text.trim() ||
      !p.content.includes(req.text) ||
      !req.criterionIds.length ||
      !unique(req.criterionIds)
    )
      issues.push(`인쇄 발문에 없는 요구: ${req.requirementId}`);
    for (const id of req.criterionIds) {
      mapped.push(id);
      const c = p.rubric.criteria.find((c) => c.criterionId === id);
      if (!c || c.requirementId !== req.requirementId || !c.evidence.trim())
        issues.push(`요구 ↔ 증거 ↔ 기준 불일치: ${id}`);
    }
  }
  if (
    !unique(mapped) ||
    mapped.length !== p.rubric.criteria.length ||
    p.rubric.criteria.some((c) => !mapped.includes(c.criterionId))
  )
    issues.push("묻지 않은 기준 또는 배점 없는 요구");
  if (!examples) return [...issues, "답만/근거까지 쓴 채점 예시가 없음"];
  const { answerOnly, reasoned } = examples(p);
  if (
    normalize(answerOnly.response) !== normalize(p.answer) ||
    normalize(reasoned.response) !== normalize(p.modelAnswer) ||
    normalize(answerOnly.response) === normalize(reasoned.response)
  )
    issues.push("서로 다른 답만/근거까지 답안이 아님");
  const total = (sample: NativeScoringExample, onlyAnswer: boolean) => {
    if (
      !unique(sample.awards.map((a) => a.criterionId)) ||
      sample.awards.length !== p.rubric.criteria.length
    )
      issues.push("채점 예시의 기준 누락/중복");
    return sample.awards.reduce((sum, award) => {
      const criterion = p.rubric.criteria.find(
        (c) => c.criterionId === award.criterionId,
      );
      if (
        !criterion ||
        !Number.isInteger(award.points) ||
        award.points < 0 ||
        award.points > criterion.points ||
        (award.points !== 0 &&
          award.points !== criterion.points &&
          !criterion.scoring.partial.some((s) => s.points === award.points))
      ) {
        issues.push("채점 예시에 허용되지 않은 점수");
        return sum;
      }
      if (onlyAnswer && criterion.role === "method" && award.points !== 0)
        issues.push("답만 답안에 방법 점수를 부여함");
      return sum + award.points;
    }, 0);
  };
  const answerScore = total(answerOnly, true),
    fullScore = total(reasoned, false);
  if (fullScore !== p.rubric.totalPoints || answerScore >= fullScore)
    issues.push("답만/근거까지 쓴 답안의 점수 차이를 입증하지 못함");
  return issues;
}

export function checkNativeGates(suite: NativeGateSuite) {
  const errors: Record<NativeGateId, Set<string>> = {
    G1: new Set(),
    G2: new Set(),
    G3: new Set(),
    G4: new Set(),
    G5: new Set(),
    G6: new Set(),
  };
  const add = (gate: NativeGateId, messages: string[]) =>
    messages.forEach((m) => errors[gate].add(m));
  const observed = new Map<string, Set<string>>();
  const numericTargets = new Map<number, Map<number, string>>();
  let hasFigure = false;
  if (!suite.samples.length)
    for (const id of Object.keys(errors) as NativeGateId[])
      add(id, ["검사 표본 없음"]);
  for (const sample of suite.samples) {
    let p: NativeDescriptiveProblem;
    try {
      p = suite.generate(sample.seed, sample.variant);
      if (!p || typeof p !== "object") throw new Error("문항 객체 없음");
    } catch (e) {
      for (const id of Object.keys(errors) as NativeGateId[])
        add(id, [`생성 실패: ${errorText(e)}`]);
      continue;
    }
    if (p.seed !== sample.seed || p.variant !== sample.variant)
      add("G5", ["요청한 씨앗/변형과 생성 결과가 다름"]);
    hasFigure ||= p.figureSpec !== null;
    const authored = p.revision === 2 ? p : undefined;
    const run = (id: NativeGateId, check: () => string[]) => {
      try {
        add(id, check());
      } catch (e) {
        add(id, [`검사 자료 불완전: ${errorText(e)}`]);
      }
    };
    run("G1", () => {
      if (!suite.twin || !authored)
        return ["같은 씨앗의 단답 쌍둥이/요구 증거 대조 자료 없음"];
      const twin = suite.twin(sample.seed, sample.variant);
      const required = authored.facts.filter(
        (f) =>
          f.kind !== "given" &&
          authored.rubric.criteria.some((c) => c.factKey === f.factKey),
      );
      if (twin.seed !== p.seed || twin.variant !== p.variant)
        return ["단답 쌍둥이의 씨앗/변형 불일치"];
      if (
        !twin.requiredFactKeys.length ||
        !unique(twin.requiredFactKeys) ||
        twin.requiredFactKeys.some(
          (key) =>
            !authored.facts.some(
              (f) => f.kind !== "given" && f.factKey === key,
            ),
        )
      )
        return ["단답 쌍둥이의 요구 factKey 연결 없음"];
      if (
        !twin.content.trim() ||
        !twin.modelAnswer.trim() ||
        normalize(twin.content) === normalize(p.content) ||
        normalize(twin.modelAnswer) === normalize(p.modelAnswer) ||
        !required.some(
          (f) =>
            f.kind === "intermediate" &&
            !twin.requiredFactKeys.includes(f.factKey),
        )
      )
        return ["단답 쌍둥이와 추가 요구 증거/모범답 차이가 없음"];
      return [];
    });
    run("G2", () =>
      authored
        ? checkSteps(authored)
        : ["r2 중간값·기준-factKey·단계 연결 없음"],
    );
    const verification = verifyNativePrinted(p, suite.verify);
    add("G3", verification.issues);
    if (verification.result && verification.oracleIssues.length === 0) {
      for (const [key, value] of Object.entries(verification.result.coverage)) {
        if (!observed.has(key)) observed.set(key, new Set());
        observed.get(key)!.add(value);
      }
      const scored = authored
        ? new Set(authored.rubric.criteria.map((c) => c.factKey))
        : undefined;
      const targets = verification.result.derived.filter(
        (f) =>
          f.kind !== "given" &&
          (!scored || scored.has(f.factKey)) &&
          /\d/.test(f.value),
      );
      if (targets.length) {
        if (!numericTargets.has(sample.variant))
          numericTargets.set(sample.variant, new Map());
        numericTargets
          .get(sample.variant)!
          .set(
            sample.seed,
            JSON.stringify(
              targets
                .map((f) => [f.factKey, f.kind, f.value, f.unit ?? null])
                .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
            ),
          );
      }
    }
    run("G4", () =>
      authored
        ? checkRequirements(authored, suite.scoringExamples)
        : ["요구 ID ↔ 증거 ↔ 기준 ID 및 채점 예시 없음"],
    );
    run("G6", () => {
      const rubric = p.rubric;
      const messages: string[] = [];
      if (
        !Number.isInteger(rubric.totalPoints) ||
        rubric.totalPoints < 4 ||
        rubric.totalPoints > 12 ||
        !rubric.criteria.length ||
        rubric.criteria.some(
          (c) => !Number.isInteger(c.points) || c.points < 1,
        ) ||
        rubric.criteria.reduce((n, c) => n + c.points, 0) !== rubric.totalPoints
      )
        messages.push("배점 합/총점 4~12/기준당 1점 이상 불충족");
      if (rubric.revision !== 2)
        messages.push("답 기준 분류가 없어 1/3 상한을 입증할 수 없음");
      else if (
        rubric.criteria
          .filter((c) => c.role === "answer")
          .reduce((n, c) => n + c.points, 0) *
          3 >
        rubric.totalPoints
      )
        messages.push("답 기준 배점이 총점의 1/3 초과");
      return messages;
    });
    // r2 malformed metadata must fail closed even when a local gate did not need that field.
    if (authored)
      run("G4", () => {
        parseNativeDescriptiveProblem(authored);
        return [];
      });
  }
  if (
    ![...numericTargets.values()].some(
      (bySeed) => bySeed.size > 1 && new Set(bySeed.values()).size > 1,
    )
  )
    add("G5", [
      "같은 변형에서 씨앗 변화에 따른 배점 대상 수치 변화를 입증하지 못함",
    ]);
  if (!unique(suite.samples.map((s) => `${s.seed}:${s.variant}`)))
    add("G5", ["검사 씨앗/변형 중복"]);
  if (!suite.coverage.length || !unique(suite.coverage.map((c) => c.dimension)))
    add("G5", ["경계·갈래 전수 선언 없음/중복"]);
  const coverage = suite.coverage.map((c) => {
    const seen = [...(observed.get(c.dimension) ?? [])].sort();
    const missing = c.values.filter((v) => !seen.includes(v));
    const unexpected = seen.filter((v) => !c.values.includes(v));
    if (
      !c.dimension.trim() ||
      !c.values.length ||
      c.values.some((v) => !v.trim()) ||
      !unique(c.values) ||
      missing.length ||
      unexpected.length
    )
      add("G5", [
        `경계/갈래 누락·미선언: ${c.dimension} (${missing.join(", ")}; ${unexpected.join(", ")})`,
      ]);
    return { ...c, observed: seen, missing };
  });
  for (const dimension of observed.keys())
    if (!suite.coverage.some((c) => c.dimension === dimension))
      add("G5", [`검산기가 관찰한 갈래 선언 누락: ${dimension}`]);
  const mutationSignatures = new Set<string>();
  const mutations = suite.mutations.map((m) => {
    try {
      const original = suite.generate(m.seed, m.variant);
      const baseline = verifyNativePrinted(original, suite.verify);
      const damaged = m.mutate(structuredClone(original));
      const checked = verifyNativePrinted(damaged, suite.verify);
      const signature = JSON.stringify([original, damaged]);
      const figureChanged =
        original.figureSpec !== null &&
        JSON.stringify(original.figureSpec) !==
          JSON.stringify(damaged.figureSpec);
      const detected =
        baseline.issues.length === 0 &&
        JSON.stringify(original) !== JSON.stringify(damaged) &&
        checked.oracleIssues.length > 0 &&
        (m.kind !== "figure-label" || figureChanged) &&
        !mutationSignatures.has(signature);
      mutationSignatures.add(signature);
      if (!detected)
        add("G5", [`훼손 미탐지/기준 표본 검산 실패: ${m.kind} ${m.label}`]);
      return { kind: m.kind, label: m.label, detected, issues: checked.issues };
    } catch (e) {
      add("G5", [`훼손 시험 자체 실패: ${m.kind} ${m.label}`]);
      return {
        kind: m.kind,
        label: m.label,
        detected: false,
        issues: [errorText(e)],
      };
    }
  });
  const requiredKinds: NativeMutationKind[] = [
    "sign",
    "unit",
    "intermediate",
    ...(hasFigure ? ["figure-label" as const] : []),
  ];
  for (const kind of requiredKinds)
    if (!mutations.some((m) => m.kind === kind && m.detected))
      add("G5", [`필수 훼손 시험 없음: ${kind}`]);
  const gates = (Object.keys(errors) as NativeGateId[]).map((id) => ({
    id,
    passed: errors[id].size === 0,
    issues: [...errors[id]],
  }));
  return {
    passed: gates.every((g) => g.passed),
    samplesChecked: suite.samples.length,
    gates,
    coverage,
    mutations,
    figureMutationApplicable: hasFigure,
  };
}
