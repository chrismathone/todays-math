import { z } from "zod";
import type { WorkspaceAnswer } from "@/components/math-ontology/source";
import type { MathOntologyArtifact } from "@/contracts/mathOntology.contract";
import { verifyOntologyArtifact } from "../runtime/artifact";
import {
  loadPackagedOntologyBase,
  packagedSourceSchema,
} from "../runtime/base";
import { freezeOntology } from "../compiler/canonical";
/** Public source population only. Caller must authorize before loading and recheck
 * the current authority and active generation before returning these pinned counts. */
export function ontologyPublicCoverage(input: MathOntologyArtifact) {
  const artifact = verifyOntologyArtifact(input, input.identity);
  const source = packagedSourceSchema.parse(JSON.parse(artifact.files.source));
  const { base, sourceManifest } = loadPackagedOntologyBase(source.baseHash);
  if (
    source.projectionHash !== base.projectionHash ||
    sourceManifest.entities !== base.coverage.entities ||
    sourceManifest.assertions !== base.coverage.sourceAssertions
  )
    throw new Error("PACKAGED_COVERAGE_MISMATCH");
  const review = z
    .object({
      baseHash: z.string(),
      authorityDecisionId: z.string(),
      assertions: z.array(z.unknown()),
    })
    .parse(JSON.parse(artifact.files.review));
  if (
    review.baseHash !== source.baseHash ||
    review.authorityDecisionId !== source.authorityDecisionId
  )
    throw new Error("UNBOUND_PACKAGED_APPROVAL");
  const count = z.number().int().nonnegative();
  const active = z
    .object({
      engineInferred: count,
      witnessedInferred: count,
      untracedInferred: count,
    })
    .parse(JSON.parse(artifact.files.coverage));
  if (
    active.engineInferred !==
    active.witnessedInferred + active.untracedInferred
  )
    throw new Error("PACKAGED_COVERAGE_MISMATCH");
  const coverage = {
    scope: "public-packaged-source" as const,
    graphVersion: artifact.identity.graphVersion,
    baseHash: source.baseHash,
    projectionHash: source.projectionHash,
    sourceManifestHash: base.sourceManifestHash,
    base: {
      entities: base.coverage.entities,
      sourceAssertions: base.coverage.sourceAssertions,
      sourceShards: sourceManifest.partitions.length,
      primaryFocus: base.coverage.primaryFocus,
    },
    reviewedDeltaAssertions: review.assertions.length,
    activeInference: active,
    structuralValidation: "complete-for-pinned-public-base" as const,
    educationalCompleteness: "unknown" as const,
    officialAlignment: "unknown" as const,
  };
  const n = (value: number) => value.toLocaleString("ko-KR");
  const data: WorkspaceAnswer = {
    id: artifact.identity.graphVersion + ":coverage",
    summary:
      "현재 게시된 공개 원천의 등록 범위입니다. 전체 교육 내용의 완전성이나 공식 교육과정 정합성을 뜻하지 않습니다.",
    steps: [
      {
        id: "source-population",
        title: "공개 원천 등록 범위",
        state: "observed",
        note: `개체 ${n(coverage.base.entities)}개와 원천 관계 ${n(coverage.base.sourceAssertions)}개가 등록되어 있습니다.`,
      },
      {
        id: "structural-validation",
        title: "구조 검증 범위",
        state: "observed",
        note: `원천 ${n(coverage.base.sourceShards)}개 분할의 고유 검증 대상 ${n(coverage.base.primaryFocus)}개를 검사했습니다. 개체와 원천 관계를 각각 한 번 셉니다.`,
      },
      {
        id: "educational-unknown",
        title: "교육적 검토 범위",
        state: "unknown",
        note: "등록·형식 검증은 모든 관계의 교육적 타당성이나 공식 성취기준 검토 완료를 의미하지 않습니다. 선수 관계의 추이성·학생 숙달·학습 효과는 추론하지 않습니다.",
      },
    ],
    coverage: [
      { label: "공개 원천 개체", value: n(coverage.base.entities) },
      { label: "공개 원천 관계", value: n(coverage.base.sourceAssertions) },
      { label: "원천 분할", value: n(coverage.base.sourceShards) },
      { label: "고유 구조 검증 대상", value: n(coverage.base.primaryFocus) },
      {
        label: "추가 게시된 검토 관계",
        value: n(coverage.reviewedDeltaAssertions),
      },
      { label: "전체 교육 내용 완전성", value: "미확인" },
      { label: "공식 교육과정 정합성", value: "미확인" },
    ],
    details: [
      {
        title: "추론과 인용 범위",
        text: `활성 그래프의 엔진 추론 ${n(active.engineInferred)}개 중 검산 가능한 근거가 있는 ${n(active.witnessedInferred)}개만 인용 대상입니다. 미추적 ${n(active.untracedInferred)}개는 인용에서 보류합니다. 개별 조회는 권한·근거·검증·탐색 예산을 다시 확인합니다.`,
      },
      {
        title: "집계 경계",
        text: "공개 원천 패키지의 고정 모집단입니다. 학생·반·지점의 비공개 기록, 미검수 후보와 배포가 허용되지 않은 원천은 이 집계에 포함하지 않습니다. 추가 게시 관계는 원천 관계와 별도로 표시합니다.",
      },
      {
        title: "게시 버전과 원천",
        text: `그래프 ${coverage.graphVersion}; 원천 ${coverage.projectionHash}; 원천 명세 ${coverage.sourceManifestHash}`,
      },
    ],
  };
  return freezeOntology({ data, coverage });
}
