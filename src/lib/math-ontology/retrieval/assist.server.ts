import { OntologyModelOutputError } from "./output";
import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DataFactory } from "n3";
import { db } from "@/lib/db";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { maskInsightQuery } from "@/lib/math-insight/inference";
import { mathOntologyAssertionSchema } from "@/contracts/mathOntology.contract";
import {
  authorizeOntologyOperationRequest,
  ontologyOperationsEnabled,
  productionOntologyOperations,
} from "../actions/production.server";
import {
  ontologyFailure,
  ontologyJsonBody,
  ontologyResponse,
} from "../actions/http";
import { requireOperation } from "../actions/errors";
import { sealOntologyModelRelationProposal } from "../review/modelReceipt";
import { createProductionOntologyContext } from "./context.server";
import { requestOntologyCompletion } from "./model.server";
import { exactOntologyRelationSupport } from "./relationSupport";
import { runOntologyAssist } from "./assist";
const bodySchema = z.strictObject({
  query: z.string().trim().min(1).max(500),
  studentId: z.uuid().optional(),
  classId: z.uuid().optional(),
  branchId: z.uuid().nullable().optional(),
  previousReviewId: z.uuid().optional(),
  expectedPreviousRevision: z.number().int().nonnegative().optional(),
});
const TM = "urn:todaymath:vocab:",
  nn = DataFactory.namedNode;
export async function handleOntologyAssist(request: Request) {
  if (!ontologyOperationsEnabled())
    return ontologyResponse(503, {
      error: { code: "ONTOLOGY_OPERATIONS_UNAVAILABLE" },
    });
  const access = await authorizeOntologyOperationRequest(request);
  if (access.response || !access.actor)
    return (
      access.response ?? ontologyResponse(403, { error: { code: "FORBIDDEN" } })
    );
  try {
    const body = bodySchema.parse(await ontologyJsonBody(request, 8192));
    if (Boolean(body.studentId) !== Boolean(body.classId))
      return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
    const target = body.studentId
        ? {
            studentId: body.studentId,
            classId: body.classId!,
            branchId: body.branchId ?? null,
          }
        : undefined,
      actor = access.actor;
    const current = createProductionOntologyContext(request, actor, target),
      ops = productionOntologyOperations();
    if (
      Boolean(body.previousReviewId) !==
      (body.expectedPreviousRevision !== undefined)
    )
      return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
    if (body.previousReviewId) {
      const previous = await ops.relations.read(actor, body.previousReviewId);
      requireOperation(
        previous.revision === body.expectedPreviousRevision,
        "STALE",
      );
    }
    const maskedQuestion = maskInsightQuery(
      body.query,
      await current.identities(),
    );
    const result = await runOntologyAssist(
      { maskedQuestion, hasSelectedStudent: !!target, signal: request.signal },
      {
        assertAuthorized: async () => {
          await current.authorize();
        },
        open: () => current.open(),
        complete: requestOntologyCompletion,
        async preparePublication() {
          const p = await ops.publication.prepare(actor);
          return {
            id: p.confirmationId,
            summary: "게시할 변경을 준비했습니다.",
            steps: [],
            details: [
              {
                title: "게시 조건",
                text: "사람의 확인 뒤 전체 의미 검증과 근거 대조를 다시 마친 후 활성 판을 교체합니다.",
              },
            ],
            coverage: [
              {
                label: "게시 대상",
                value: `개체 ${p.preview.base.entities}개 · 원천 연결 ${p.preview.base.assertions}개`,
              },
            ],
            action: {
              kind: "publication",
              id: p.confirmationId,
              sealHash: p.sealHash,
              label: "검토한 내용 게시하기",
              changes: [
                {
                  label: "지식 판",
                  before: "현재 판",
                  after: "검증을 마친 새 판",
                },
              ],
              effects: ["새 검증이 성공하면 활성 지식 판을 교체합니다."],
            },
          };
        },
        async preparePlan({
          session,
          sectionIri,
          dailyQuestionCount,
          enabled,
        }) {
          requireOperation(target, "FORBIDDEN");
          await session.assertCurrent();
          const query = {
            kind: "neighbors" as const,
            entityId: sectionIri,
            relation: "projectsSourceSection" as const,
            limit: 20,
          };
          const slice = session.runtime.materialize
            ? await session.runtime.materialize(query, session.context)
            : session.runtime;
          const registry = slice.datasets().registry;
          const nativeId = registry.getObjects(
            nn(sectionIri),
            nn(TM + "nativeId"),
            null,
          )[0]?.value;
          requireOperation(
            nativeId &&
              registry
                .getObjects(nn(sectionIri), nn(TM + "nativeNamespace"), null)
                .some((v) => v.value === "course-section"),
            "BINDING_MISMATCH",
          );
          const evidence = await ops.evidence.capture(actor, {
            target,
            graphVersion: session.runtime.identity.graphVersion,
            query,
          });
          await session.assertCurrent();
          const p = await ops.plans.propose(actor, {
            target,
            args: { startSectionId: nativeId, dailyQuestionCount, enabled },
            graphVersion: evidence.graphVersion,
            sourceSnapshotId: evidence.sourceSnapshotId,
          });
          return {
            id: p.proposalId,
            summary: "확인할 학습 계획을 준비했습니다.",
            steps: [],
            details: [
              {
                title: "변경 범위",
                text: "기존 학습 계획 API의 시작 단원·하루 문항 수·활성 여부만 변경합니다. 풀이 기록과 장기 기억 상태는 유지합니다.",
              },
            ],
            coverage: [],
            action: {
              kind: "plan",
              id: p.proposalId,
              sealHash: p.sealHash,
              label: "이 계획 적용하기",
              changes: [
                {
                  label: "시작 단원",
                  before: p.preview.before?.startSectionId
                    ? (getCourseSection(p.preview.before.startSectionId)
                        ?.title ?? "이전 단원 표기 미확인")
                    : "설정 없음",
                  after:
                    getCourseSection(nativeId)?.title ?? "단원 표기 미확인",
                },
                {
                  label: "하루 문항 수",
                  before: String(
                    p.preview.before?.dailyQuestionCount ?? "설정 없음",
                  ),
                  after: String(dailyQuestionCount),
                },
                {
                  label: "학습 계획",
                  before: p.preview.before?.enabled
                    ? "사용 중"
                    : "중지 또는 미설정",
                  after: enabled ? "사용" : "중지",
                },
              ],
              effects: [
                "확인 시 최신 권한·학습 기록·지식 판을 다시 검사합니다.",
              ],
            },
          };
        },
        async prepareRelation({
          session,
          subject,
          predicate,
          object,
          proofIds,
          packetId,
          receipt,
        }) {
          await session.assertCurrent();
          const query = {
            kind: "neighbors" as const,
            entityId: subject,
            targetId: object,
            limit: 20,
          };
          const slice = session.runtime.materialize
            ? await session.runtime.materialize(query, session.context)
            : session.runtime;
          const supported = exactOntologyRelationSupport(
            slice.proofs(),
            proofIds,
            [subject, TM + predicate, object],
          );
          const proof =
            supported.witness ??
            slice.proofs().find((p) => proofIds.includes(p.id));
          requireOperation(proof, "BINDING_MISMATCH");
          const asserted = slice.datasets().asserted,
            premise = nn(proof.assertionIds[0]);
          const value = (p: string) =>
            asserted.getObjects(premise, nn(TM + p), null)[0]?.value;
          const sourceRevision = value("sourceRevision"),
            sourceDigest = value("sourceDigest");
          requireOperation(sourceRevision && sourceDigest, "BINDING_MISMATCH");
          const assertion = mathOntologyAssertionSchema.parse({
            id: "urn:todaymath:assertion:model:" + randomUUID(),
            subject,
            predicate: TM + predicate,
            object,
            scope: "global",
            sourceRevision,
            sourceDigest,
            sourceDigestKind: slice
              .datasets()
              .registry.getObjects(
                nn(sourceRevision),
                nn(TM + "sourceProjectionHash"),
                null,
              )
              .some((v) => v.value === sourceDigest)
              ? "authorized-projection"
              : "raw-bytes",
            locator:
              "model-packet:" +
              packetId +
              (supported.witness
                ? ";exact-witness:" + supported.witness.id
                : ";support-unverified"),
            provenance: "native-product",
            origin: "model-proposal",
            support: supported.support,
            review: "candidate",
            publication: "unpublished",
            distribution: "allowed",
            revision: 1,
          });
          const sealed = await db.$transaction((tx) =>
            sealOntologyModelRelationProposal(
              tx,
              actor,
              {
                assertion,
                evidenceRef: session.runtime.identity.graphVersion,
                evidenceHash: packetId,
                receipt: { ...receipt, modelCalled: true },
              },
              () => new Date(),
            ),
          );
          await session.assertCurrent();
          const draft = await (body.previousReviewId
            ? ops.relations.draftModelRevision(actor, {
                previousReviewId: body.previousReviewId,
                expectedPreviousRevision: body.expectedPreviousRevision!,
                assertion,
                evidenceRef: session.runtime.identity.graphVersion,
                modelRunId: sealed.modelRunId,
              })
            : ops.relations.draftModel(actor, {
                assertion,
                evidenceRef: session.runtime.identity.graphVersion,
                modelRunId: sealed.modelRunId,
              }));
          const validated = supported.witness
            ? await ops.relations.validate(actor, draft.reviewId)
            : null;
          await session.assertCurrent();
          const labels = slice.datasets().registry;
          const display = (id: string) =>
            labels.getObjects(
              nn(id),
              nn("http://www.w3.org/2000/01/rdf-schema#label"),
              null,
            )[0]?.value ?? "표기 미확인";
          return {
            id: draft.reviewId,
            reprepare: {
              previousReviewId: draft.reviewId,
              expectedPreviousRevision: validated?.revision ?? draft.revision,
              query: body.query,
            },
            ...(validated?.report.conforms && !validated.report.incomplete
              ? {
                  action: {
                    kind: "relation" as const,
                    id: draft.reviewId,
                    revision: validated.revision,
                    validationHash: validated.validationHash,
                    label: "이 연결 승인하기",
                    changes: [
                      {
                        label: display(subject) + " → " + display(object),
                        before: "검토 전 후보",
                        after: "사람이 검토한 연결",
                      },
                    ],
                    effects: ["현재 지식 판 반영은 별도 게시에서 검증합니다."],
                  },
                }
              : {}),
            summary: "검토할 연결 후보를 기록했습니다.",
            steps: [
              {
                id: "candidate",
                title: "모델이 제안한 연결",
                note: supported.witness
                  ? "제안한 정확한 연결의 원천·규칙 근거를 재검산했습니다. 교육적 효과는 미확인입니다."
                  : "근거의 교육적 의미는 미확인입니다.",
                state: "candidate",
              },
            ],
            details: [
              {
                title: "연결 검토",
                text: supported.witness
                  ? "정확한 근거 연결을 확인했습니다. 출처와 의미를 사람이 검토한 뒤 승인할 수 있습니다."
                  : "근거 ID가 존재한다는 이유만으로 직접·간접 지지를 인정하지 않습니다. 의미와 출처를 검토한 새 판이 필요합니다.",
                reviewId: draft.reviewId,
              },
            ],
            coverage: [{ label: "승인 상태", value: "후보 · 미게시" }],
          };
        },
      },
    );
    return ontologyResponse(200, { data: result.answer });
  } catch (error) {
    if (error instanceof OntologyModelOutputError)
      return ontologyResponse(503, {
        error: { code: "MODEL_OUTPUT_INVALID", stage: error.stage },
      });
    if (
      error instanceof z.ZodError ||
      error instanceof SyntaxError ||
      (error instanceof Error &&
        ["identity-bearing-query", "invalid-query"].includes(error.message))
    )
      return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
    return ontologyFailure(error);
  }
}
