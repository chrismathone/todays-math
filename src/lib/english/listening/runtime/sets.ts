import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { englishListeningDocumentSchema } from "@/contracts/englishListening.contract";
import {
  listeningCreateSetSchema,
  listeningDraftSchema,
  listeningReviewSetSchema,
  listeningUpdateSetSchema,
  type ListeningSetDetail,
  type ListeningSetSummary,
} from "@/contracts/englishListeningHttp.contract";
import { listeningMediaCompletionSchema } from "@/contracts/englishListeningMedia.contract";
import { LISTENING_MAX_DOCUMENT_BYTES } from "@/contracts/englishListeningSource.contract";
import { withinOwnerScope } from "@/lib/ownerScope";
import {
  listeningContentHash,
  listeningValueHash,
  validateListeningPublication,
} from "../publication";
import { publishListeningWithVerifiedMedia } from "../verifiedPublication";
import { listeningQuestionMetadata } from "../metadata";
import { isKnownExternalListeningDocument } from "../externalSourcePolicy";
import {
  audit,
  availableListeningDocument,
  denied,
  expected,
  invalid,
  json,
  one,
  ownedSet,
  type ListeningTx,
  type PublicationRow,
  type SetRow,
} from "./database";

const noReviews = () => ({ content: null, audio: null, alignment: null });
export function teacherMediaUrls(setId: string, assetIds: string[]) {
  return Object.fromEntries(
    assetIds.map((id) => [
      id,
      `/api/english/listening/sets/${setId}/media/${id}`,
    ]),
  );
}
async function checkExam(
  tx: ListeningTx,
  account: AccountAccess,
  examId: string | null,
) {
  if (!examId) return;
  const exam = await tx.englishExam.findUnique({
    where: { id: examId },
    include: { user: true },
  });
  if (!exam || !withinOwnerScope(account, exam.userId, exam.branchId))
    throw denied();
}
export async function listSets(
  tx: ListeningTx,
  account: AccountAccess,
): Promise<ListeningSetSummary[]> {
  const rows = await tx.$queryRaw<
    (SetRow & { publication_count: bigint })[]
  >(Prisma.sql`
    SELECT s.*, (SELECT count(*) FROM english_listening_publication p WHERE p.set_id=s.id) AS publication_count
    FROM english_listening_set s WHERE s.deleted_at IS NULL
    AND ${availableListeningDocument(Prisma.sql`s.document`)} AND
    (${account.isSuperAdmin === true} OR (s.owner_id=${account.id}::uuid AND (s.branch_id IS NULL OR s.branch_id=${account.branchId ?? null}::uuid)) OR (${account.isAdmin && !!account.branchId} AND s.branch_id=${account.branchId ?? null}::uuid)) ORDER BY s.updated_at DESC LIMIT 200`);
  return rows.map((r) => ({
    id: r.id,
    revision: r.revision,
    title: r.document.title,
    level: r.document.level,
    groupCount: r.document.groups.length,
    publicationCount: Number(r.publication_count),
    updatedAt: r.updated_at.toISOString(),
  }));
}
export async function setDetail(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
): Promise<ListeningSetDetail> {
  const row = await ownedSet(tx, account, id);
  const rows = await tx.$queryRaw<PublicationRow[]>(
    Prisma.sql`SELECT * FROM english_listening_publication WHERE set_id=${id}::uuid ORDER BY created_at DESC`,
  );
  return {
    id,
    revision: row.revision,
    document: listeningDraftSchema.parse(row.document),
    publications: rows
      .filter((p) => !isKnownExternalListeningDocument(p.snapshot.document))
      .map((p) => validateListeningPublication(p.snapshot)),
    mediaUrlsByAssetId: teacherMediaUrls(
      id,
      row.document.groups.flatMap((g) => (g.audio ? [g.audio.assetId] : [])),
    ),
  };
}
export async function createSet(
  tx: ListeningTx,
  account: AccountAccess,
  input: unknown,
  now: string,
) {
  const data = listeningCreateSetSchema.parse(input);
  if (isKnownExternalListeningDocument({ source: data.source })) throw denied();
  await checkExam(tx, account, data.examId ?? null);
  const id = randomUUID();
  const document = listeningDraftSchema.parse({
    schemaVersion: 1,
    id,
    ownerId: account.id,
    branchId: account.branchId ?? null,
    revision: 1,
    title: data.title,
    level: data.level ?? null,
    examId: data.examId ?? null,
    ...(data.source ? { source: data.source } : {}),
    rights: data.rights,
    rightsReview: null,
    provenance: {
      kind: data.source ? "uploaded_assessment" : "teacher_authored",
      recordedBy: account.id,
      recordedAt: now,
      basis: data.basis,
    },
    groups: [],
  });
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_set(id,owner_id,branch_id,revision,document,created_at,updated_at) VALUES(${id}::uuid,${account.id}::uuid,${account.branchId ?? null}::uuid,1,${json(document)},${new Date(now)},${new Date(now)})`,
  );
  await audit(tx, id, account.id, "set_created", { revision: 1 }, now);
  return setDetail(tx, account, id);
}
export async function updateSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  input: unknown,
  now: string,
) {
  const data = listeningUpdateSetSchema.parse(input);
  const row = await ownedSet(tx, account, id);
  expected(row.revision, data.expectedRevision);
  await checkExam(tx, account, data.examId);
  const groups = data.groups.map((group) => {
    const previous = row.document.groups.find(
      (g) => g.id === group.id,
    )?.transcript;
    const unchanged =
      previous &&
      previous.text === group.transcript.text &&
      previous.spokenText === group.transcript.spokenText &&
      previous.translation === group.transcript.translation;
    return {
      ...group,
      questions: group.questions.map((question) => ({
        ...question,
        metadata: listeningQuestionMetadata(question, {
          source: row.document.source,
          level: data.level,
        }),
      })),
      transcript: {
        ...group.transcript,
        revision: previous ? previous.revision + (unchanged ? 0 : 1) : 1,
      },
      reviews: noReviews(),
    };
  });
  const rightsUnchanged =
    listeningValueHash(row.document.rights) ===
      listeningValueHash(data.rights) &&
    row.document.provenance.basis === data.basis;
  const document = listeningDraftSchema.parse({
    ...row.document,
    title: data.title,
    level: data.level,
    examId: data.examId,
    rights: data.rights,
    rightsReview: rightsUnchanged ? row.document.rightsReview : null,
    revision: row.document.revision + 1,
    provenance: rightsUnchanged
      ? row.document.provenance
      : {
          kind: row.document.provenance.kind,
          recordedBy: account.id,
          recordedAt: now,
          basis: data.basis,
        },
    groups,
  });
  if (isKnownExternalListeningDocument(document)) throw denied();
  const ids = [
    id,
    ...groups.flatMap((g) => [
      g.id,
      ...g.questions.flatMap((q) => [q.id, ...q.choices.map((c) => c.id)]),
    ]),
  ];
  if (new Set(ids).size !== ids.length)
    throw invalid("문항과 보기 ID는 중복될 수 없습니다.");
  if (
    Buffer.byteLength(JSON.stringify(document), "utf8") >
    LISTENING_MAX_DOCUMENT_BYTES
  )
    throw invalid("문항 그림의 합계가 너무 큽니다. 자료를 나눠 저장하세요.");
  const changed = await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_set SET document=${json(document)},revision=revision+1,updated_at=${new Date(now)} WHERE id=${id}::uuid AND revision=${data.expectedRevision}`,
  );
  if (changed !== 1) throw invalid("자료 저장 충돌입니다.");
  await audit(
    tx,
    id,
    account.id,
    "set_updated",
    { revision: row.revision + 1, contentRevision: document.revision },
    now,
  );
  return setDetail(tx, account, id);
}
export async function verifiedMedia(
  tx: ListeningTx,
  set: SetRow,
  assetId: string,
) {
  if (isKnownExternalListeningDocument(set.document)) throw denied();
  const row = await one<{ record: unknown }>(
    tx,
    Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${assetId}::uuid AND "setId"=${set.id}::uuid AND state='ready'`,
  );
  const record = row?.record as
    | { completion?: unknown; ownerId?: string; branchId?: string | null }
    | undefined;
  if (
    !record ||
    record.ownerId !== set.owner_id ||
    record.branchId !== set.branch_id
  )
    throw invalid("검증된 음원이 필요합니다.");
  const completion = listeningMediaCompletionSchema.parse(record.completion);
  if (
    completion.state !== "ready" ||
    completion.setId !== set.id ||
    completion.assetId !== assetId ||
    completion.ownerId !== set.owner_id ||
    completion.branchId !== set.branch_id
  )
    throw invalid("음원 범위가 일치하지 않습니다.");
  return completion;
}
export async function reviewSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  input: unknown,
  now: string,
) {
  const data = listeningReviewSetSchema.parse(input);
  const row = await ownedSet(tx, account, id);
  expected(row.revision, data.expectedRevision);
  const document = listeningDraftSchema.parse(row.document);
  if (data.kind === "rights") {
    if (document.rights.rightsStatus !== "approved" || !data.basis?.trim())
      throw invalid("허용 용도와 권리 확인 근거가 필요합니다.");
    document.rightsReview = {
      confirmedBy: account.id,
      confirmedAt: now,
      basis: data.basis,
    };
    document.revision++;
    for (const group of document.groups) group.reviews = noReviews();
  } else {
    const complete = englishListeningDocumentSchema.parse(document);
    if (!complete.rightsReview)
      throw invalid("출처와 권리를 먼저 확인해 주세요.");
    const group = document.groups.find((group) => group.id === data.groupId);
    if (!group?.audio) throw invalid("검수할 묶음이 필요합니다.");
    const stamp = {
      reviewerId: account.id,
      reviewedAt: now,
      revision: document.revision,
      contentHash: listeningContentHash(complete),
    };
    if (data.kind === "content") group.reviews.content = stamp;
    else {
      const readiness = await verifiedMedia(tx, row, group.audio.assetId);
      if (
        readiness.sha256 !== group.audio.sha256 ||
        readiness.durationMs !== group.audio.durationMs
      )
        throw invalid("검증된 음원 정보와 다릅니다.");
      group.reviews[data.kind] = {
        ...stamp,
        assetId: group.audio.assetId,
        sha256: group.audio.sha256,
        transcriptRevision: group.transcript.revision,
      };
    }
  }
  const changed = await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_set SET document=${json(document)},revision=revision+1,updated_at=${new Date(now)} WHERE id=${id}::uuid AND revision=${data.expectedRevision}`,
  );
  if (changed !== 1) throw invalid("검수 저장 충돌입니다.");
  await audit(
    tx,
    id,
    account.id,
    "review_" + data.kind,
    { contentRevision: document.revision, groupId: data.groupId ?? null },
    now,
  );
  return setDetail(tx, account, id);
}
export async function publishSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  revision: number,
  now: string,
) {
  const row = await ownedSet(tx, account, id);
  expected(row.revision, revision);
  const existing = await one<PublicationRow>(
    tx,
    Prisma.sql`SELECT * FROM english_listening_publication WHERE set_id=${id}::uuid AND source_revision=${row.document.revision}`,
  );
  if (existing) {
    if (isKnownExternalListeningDocument(existing.snapshot.document))
      throw denied();
    return validateListeningPublication(existing.snapshot);
  }
  const publication = await publishListeningWithVerifiedMedia(
    row.document,
    { id: randomUUID(), publishedAt: now },
    (target) => verifiedMedia(tx, row, target.assetId),
  );
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_publication(id,set_id,source_revision,snapshot,created_at) VALUES(${publication.id}::uuid,${id}::uuid,${row.document.revision},${json(publication)},${new Date(now)})`,
  );
  await audit(
    tx,
    id,
    account.id,
    "published",
    { publicationId: publication.id, contentRevision: row.document.revision },
    now,
  );
  return publication;
}
export async function deleteSet(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  revision: number,
  now: string,
) {
  const row = await ownedSet(tx, account, id);
  expected(row.revision, revision);
  if (
    await one(
      tx,
      Prisma.sql`SELECT id FROM english_listening_publication WHERE set_id=${id}::uuid LIMIT 1`,
    )
  )
    throw invalid("발행 이력이 있는 자료는 삭제할 수 없습니다.");
  await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_set SET deleted_at=${new Date(now)},revision=revision+1 WHERE id=${id}::uuid AND revision=${revision}`,
  );
  await audit(tx, id, account.id, "draft_deleted", { revision }, now);
  return { id, deleted: true };
}
