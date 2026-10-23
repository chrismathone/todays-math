import type {
  MathOntologySourceNamespace,
  MathOntologySourceCoverage,
} from "@/contracts/mathOntologySource.contract";
/** Finite source populations measured at 34742b2f; changes require an explicit reviewed census update, never silent truncation. */
export const EXPECTED_MATH_ONTOLOGY_ADAPTER_COVERAGE: Readonly<
  Record<MathOntologySourceNamespace, number>
> = {
  "curriculum-grade": 16,
  "curriculum-chapter": 117,
  "curriculum-section": 735,
  "bank-definition": 9119,
  "bank-assessment": 9119,
  "bank-ox": 6947,
  "bank-apply": 4400,
  "bank-figure": 246,
  "course-section": 230,
  "explorer-unit": 46,
  "explorer-card": 230,
  "fading-group": 2040,
  "graph-unit": 100,
  "graph-topic": 356,
  "graph-course": 13,
  "arithmetic-skill": 7,
  "arithmetic-v2-type": 737,
  "algebra-srs-concept": 6,
  "textbook-script": 360,
  "textbook-script-turn": 7792,
  "elementary-form": 2499,
  "middle-type": 1517,
  "high-type": 168,
  "high-hold": 2,
  "native-descriptive-definition": 6,
  "elementary-combo": 1,
  "exam-study-family": 4220,
  "exam-study-requirement": 50,
  "rpm-index-type": 1220,
  "textbook-reference-term": 844,
  "textbook-reference-source": 14,
  "rpm-source": 8,
  "lab-unit": 71,
  "lab-source": 6,
  "source-exam": 52,
  "source-exam-question": 1049,
  "import-replay": 29,
  "official-standard": 435,
  "official-source": 1,
  "operational-model": 31,
};
export function sourcePopulationKind(
  namespace: MathOntologySourceNamespace,
): MathOntologySourceCoverage["populationKind"] {
  if (
    [
      "arithmetic-skill",
      "arithmetic-v2-type",
      "elementary-form",
      "middle-type",
      "high-type",
      "high-hold",
      "native-descriptive-definition",
      "elementary-combo",
      "exam-study-family",
    ].includes(namespace)
  )
    return "finite-family";
  if (namespace === "operational-model") return "contract-only";
  if (
    [
      "bank-definition",
      "bank-assessment",
      "bank-ox",
      "bank-apply",
      "bank-figure",
      "textbook-script",
      "textbook-script-turn",
      "source-exam-question",
      "textbook-reference-term",
      "rpm-index-type",
    ].includes(namespace)
  )
    return "materialized-source-record";
  return "structural";
}
const labels: Partial<Record<MathOntologySourceNamespace, string>> = {
  "curriculum-section": "교육과정 차시",
  "bank-definition": "일반 개념 정의",
  "bank-assessment": "개념 질문 표현",
  "explorer-card": "탐험 카드",
  "fading-group": "오늘의 기억 묶음",
  "graph-unit": "편집 단원",
  "graph-topic": "편집 학습 요소",
  "official-standard": "공식 교육과정 코드",
  "operational-model": "운영 데이터 계약",
};
/** Administrative full census only; never return these global/quarantine counts to teacher/student queries. */
export function mathOntologyAdminSourceCoverageRows(
  coverage: readonly MathOntologySourceCoverage[],
) {
  return coverage.map((c) => ({
    namespace: c.namespace,
    label: labels[c.namespace] ?? c.namespace,
    expected: c.expected,
    registered: c.registered,
    rdfEligible: c.rdfEligible,
    quarantined: c.quarantined,
    sourceLinked: c.sourceLinked,
    officialStandardMappings: c.officialStandardMappings,
    reviewedEducationalRelations: c.reviewedEducationalRelations,
    actualInstances: null,
    populationKind: c.populationKind,
    status: c.registered === c.expected ? "등록됨" : "원천 확인 필요",
    instanceStatus:
      c.populationKind === "finite-family"
        ? "생성 유형 수 · 실제 문항 수 미제공"
        : c.populationKind === "contract-only"
          ? "계약만 확인 · 실제 행 수 미제공"
          : "저장소 원천 레코드 수",
    educationStatus: "공식 기준 대응·교육 관계 검수 미확인",
  }));
}

/** Public metadata counts only, after the caller has selected its authorized graph. No private existence/denominator signal. */
export function mathOntologyVisibleSourceCoverageRows(
  coverage: readonly MathOntologySourceCoverage[],
) {
  return coverage
    .filter((c) => c.rdfEligible > 0)
    .map((c) => ({
      namespace: c.namespace,
      label: labels[c.namespace] ?? c.namespace,
      visibleSourceRecords: c.rdfEligible,
      populationKind: c.populationKind,
      actualInstances: null,
      educationStatus: "공식 기준 대응·교육 관계 검수 미확인",
    }));
}
