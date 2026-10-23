import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { WorkspaceAnswer } from "@/components/math-ontology/source";
import { mathOntologyAssertionSchema } from "@/contracts/mathOntology.contract";
import { ontologyActionReceiptSchema } from "@/contracts/mathOntologyAction.contract";
import { authorizeMathOntologySourceRead, MathOntologySourceAccessDenied } from "../sources/server";
import { authorizeOntologyDraftScope, authorizeOntologyPublisher } from "../review/authorization";
import { checkedCanonical } from "./canonical";
import { readOntologyActorInTransaction } from "./actor";
import type { OntologyActionActor } from "./authorization";

export function createOntologyHistoryReader(deps: { db: Pick<PrismaClient, "$transaction">; now?: () => Date }) {
  const clock = deps.now ?? (() => new Date());
  return async (actor: OntologyActionActor, branchId?: string): Promise<WorkspaceAnswer> => deps.db.$transaction(async tx => {
    await authorizeOntologyDraftScope(tx, actor, `owner:${actor.id}`, clock);
    const account = await readOntologyActorInTransaction(tx, actor, clock);
    const proposals = await tx.ontologyProposal.findMany({ where: { actorId: actor.id, ...(branchId ? { branchId } : {}) }, include: { receipt: true }, orderBy: { createdAt: "desc" }, take: 20 });
    const events: { id: string; at: string; title: string; note: string; state: "observed" | "reviewed" | "candidate"; detail: string; reviewId?: string }[] = [];
    const targets = [];
    for (const row of proposals) {
      const target = { studentId: row.studentId, classId: row.classId, branchId: row.branchId };
      const input = { actor, target, graphVersion: "ontology:history:v1", now: clock(), authorizationNow: clock };
      try { await authorizeMathOntologySourceRead(tx, input); }
      catch (error) { if (error instanceof MathOntologySourceAccessDenied) continue; throw error; }
      targets.push(input);
      if (row.receipt) {
        const receipt = ontologyActionReceiptSchema.parse(checkedCanonical(row.receipt.resultCanonical, row.receipt.resultHash));
        events.push({ id: row.receipt.id, at: row.receipt.createdAt.toISOString(), title: receipt.outcome === "applied" ? "학생 계획 변경" : "변경 없는 실행 확인", note: `기록 판 ${receipt.beforeRevision} → ${receipt.afterRevision}`, state: "observed", detail: `영수증 ${receipt.id}\n승인 ${receipt.approvalId}\n근거 판 ${receipt.binding.graphVersion}` });
      } else events.push({ id: row.id, at: row.createdAt.toISOString(), title: "계획 변경 준비", note: row.expiresAt <= clock() ? "기한 만료 · 다시 준비 필요" : row.status === "approved" ? "승인 후 실행 대기" : "실행 전 제안", state: "candidate", detail: `제안 ${row.id}\n학생 기록은 이 제안만으로 변경되지 않습니다.` });
    }
    const relations = await tx.ontologyRelationReview.findMany({ where: { proposedBy: actor.id, ...(account.row.isSuperAdmin ? {} : { scopeKey: `owner:${actor.id}` }) }, orderBy: { createdAt: "desc" }, take: 20 });
    for (const row of relations) {
      const a = mathOntologyAssertionSchema.parse(checkedCanonical(row.assertionCanonical, row.assertionHash));
      events.push({ id: row.id, reviewId: row.id, at: (row.reviewedAt ?? row.createdAt).toISOString(), title: row.state === "retired" ? "연결 폐기 기록" : row.state === "approved" ? "연결 승인 기록" : "연결 검토 기록", note: row.state === "approved" ? "승인 · 게시 반영은 별도 확인" : row.state === "retired" ? "다음 게시에서 제외" : "검토 전 후보", state: row.state === "approved" ? "reviewed" : "candidate", detail: `검토 ${row.id}\n초안 출처 ${a.origin === "model-proposal" ? "실제 모델 응답에 묶인 AI 제안" : "직접 작성"}\n검토 판 ${row.revision}\n교육적 효과는 미확인입니다.` });
    }
    let action: WorkspaceAnswer["action"];
    if (account.row.isSuperAdmin) {
      const jobs = await tx.ontologyCompileJob.findMany({ where: { requestedBy: actor.id }, orderBy: { createdAt: "desc" }, take: 20 });
      for (const job of jobs) {
        const release = job.state === "published" ? await tx.ontologyRelease.findUnique({ where: { jobId: job.id }, select: { revokedAt: true } }) : null;
        events.push({ id: job.id, at: job.createdAt.toISOString(), title: job.state === "published" ? "게시 완료 기록" : "게시 작업 기록", note: release?.revokedAt ? "게시 후 철회된 판입니다." : job.state === "published" ? "해당 판의 게시를 완료했습니다." : job.state === "stale" ? "근거 변경 · 다시 준비 필요" : "게시 결과 확인 필요", state: job.state === "published" ? "observed" : "candidate", detail: `게시 작업 ${job.id}\n작업 시도 ${job.attempt}\n활성 판 교체는 검증이 끝난 작업만 수행합니다.` });
        if (!action && ["queued", "leased", "failed"].includes(job.state)) {
          const prepared = await tx.ontologyReviewEvent.findFirst({ where: { actorId: actor.id, subjectId: job.id, event: "publish.prepared" } });
          if (prepared) action = { kind: "publication", id: job.id, sealHash: prepared.detailHash, label: "게시 결과 확인", changes: [{ label: "이미 확인한 게시 작업", before: "결과 대기", after: "현재 결과 확인" }], effects: ["기존 작업을 이어서 확인합니다."] };
        }
      }
      const decisions = await tx.ontologyReviewEvent.findMany({ where: { actorId: actor.id, scopeKey: "global", event: { in: ["release.revoked", "source.approved"] } }, orderBy: { createdAt: "desc" }, take: 20 });
      for (const decision of decisions) {
        const detail = checkedCanonical(decision.detailCanonical, decision.detailHash);
        events.push({ id: decision.id, at: decision.createdAt.toISOString(), title: decision.event === "release.revoked" ? "지식 판 철회 기록" : "원천 게시 승인 기록", note: "이전 판과 확인 이력을 보존했습니다.", state: "observed", detail: JSON.stringify(detail) });
      }
      await authorizeOntologyPublisher(tx, actor, clock);
    }
    for (const input of targets) await authorizeMathOntologySourceRead(tx, { ...input, authorizationNow: clock });
    await authorizeOntologyDraftScope(tx, actor, `owner:${actor.id}`, clock);
    const recent = events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
    return { id: "ontology:history", summary: recent.length ? "최근 검토·실행 이력입니다." : "아직 검토·실행 이력이 없습니다.", steps: recent.map(e => ({ id: e.id, title: e.title, note: `${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(e.at))} · ${e.note}`, state: e.state })), details: recent.map(e => ({ title: `${e.title} · ${e.id.slice(0, 8)}`, text: e.detail, ...(e.reviewId ? { reviewId: e.reviewId } : {}) })), coverage: [{ label: "이력 범위", value: "내 작업 중 현재 권한으로 볼 수 있는 최근 20개" }], ...(action ? { action } : {}) };
  }, { maxWait: 10000, timeout: 20000 });
}
