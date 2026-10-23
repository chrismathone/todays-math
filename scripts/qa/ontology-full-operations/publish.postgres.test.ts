import { describe, expect, it } from "vitest";
import { db, now, fixture } from "./harness";
import { createOntologyRelationService } from "@/lib/math-ontology/review/service";
import { sealOntologyModelRelationProposal } from "@/lib/math-ontology/review/modelReceipt";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { canonicalBytes, digest } from "@/lib/math-ontology/actions/canonical";
import type {
  MathOntologyArtifact,
  MathOntologyAssertion,
  MathOntologyCompileInput,
} from "@/contracts/mathOntology.contract";
import { MATH_ONTOLOGY_HASH_KEYS } from "@/contracts/mathOntology.contract";
function assertion(): MathOntologyAssertion {
  return {
    id: "urn:todaymath:assertion:synthetic:1",
    subject: "urn:todaymath:concept:synthetic:a",
    predicate: "urn:todaymath:vocab:supports",
    object: "urn:todaymath:concept:synthetic:b",
    scope: "global",
    sourceRevision: "urn:todaymath:source:synthetic:r1",
    sourceDigest: digest("source"),
    locator: "synthetic only",
    provenance: "unknown",
    origin: "model-proposal",
    support: "direct",
    review: "candidate",
    publication: "unpublished",
    distribution: "allowed",
    revision: 1,
  };
}
function artifactFor(input: MathOntologyCompileInput) {
  const files = Object.fromEntries(
    MATH_ONTOLOGY_HASH_KEYS.map((k) => [
      k,
      k === "source"
        ? input.sourceManifest
        : k === "review"
          ? JSON.stringify(input.assertions)
          : `synthetic-${k}`,
    ]),
  ) as MathOntologyArtifact["files"];
  const hashes = Object.fromEntries(
    MATH_ONTOLOGY_HASH_KEYS.map((k) => [k, digest(files[k])]),
  ) as MathOntologyArtifact["identity"]["hashes"];
  return {
    identity: {
      schemaVersion: 1,
      profile: "tm-owlrl-1",
      graphVersion: digest(canonicalBytes(hashes)),
      hashes,
    },
    files,
  } satisfies MathOntologyArtifact;
}
describe("manual/model relation provenance", () => {
 it("reprepares a separately sealed model candidate with atomic immutable predecessor history and fenced replay", async () => {
  const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
  const service = createOntologyRelationService({ db, now: () => now, candidates: { authorize: async () => {}, validate: async () => ({ engine: "synthetic-revision-validator", conforms: true, incomplete: false, report: "[]", focusNodeCount: 1, results: [] }) } });
  const previous = await service.draft(f.actor, { assertion: { ...assertion(), support: "unknown" }, evidenceRef: "synthetic:old-graph" });
  const checked = await service.validate(f.actor, previous.reviewId);
  const original = await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: previous.reviewId } });
  const candidate = { ...assertion(), id: `urn:todaymath:assertion:revision:${crypto.randomUUID()}`, support: "indirect" as const };
  const sealed = await db.$transaction(tx => sealOntologyModelRelationProposal(tx, f.actor, { assertion: candidate, evidenceRef: "synthetic:new-graph", evidenceHash: digest("synthetic-exact-triple-witness-not-a-real-engine-claim"), receipt: { modelCalled: true, vendor: "gemini", requestedModel: "synthetic-fixture", reportedModel: null, responseId: null, completionReason: "synthetic-stop", usage: null, responseTextHash: digest("synthetic-response") } }, () => now));
  const input = { previousReviewId: previous.reviewId, expectedPreviousRevision: checked.revision, assertion: candidate, evidenceRef: "synthetic:new-graph", ...sealed };
  await expect(service.draftModelRevision(f.actor, { ...input, expectedPreviousRevision: checked.revision - 1 })).rejects.toMatchObject({ code: "STALE" });
  expect(await db.ontologyRelationReview.count({ where: { id: sealed.modelRunId } })).toBe(0);
  const next = await service.draftModelRevision(f.actor, input);
  expect(next.reviewId).not.toBe(previous.reviewId); expect(next.state).toBe("draft");
  expect(await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: previous.reviewId } })).toEqual(original);
  const link = await db.ontologyReviewEvent.findFirstOrThrow({ where: { subjectId: next.reviewId, event: "relation.reprepared" } });
  expect(JSON.parse(link.detailCanonical)).toEqual({ previousReviewId: previous.reviewId, previousRevision: checked.revision });
  await expect(db.ontologyReviewEvent.update({ where: { id: link.id }, data: { detailCanonical: "tampered" } })).rejects.toThrow("immutable");
  expect(await service.draftModelRevision(f.actor, input)).toEqual(next);
  await expect(service.draftModelRevision(f.actor, { ...input, expectedPreviousRevision: checked.revision + 1 })).rejects.toMatchObject({ code: "BINDING_MISMATCH" });
  expect(await db.ontologyReviewEvent.count({ where: { subjectId: next.reviewId, event: "relation.reprepared" } })).toBe(1);
  const retrySeal = await db.$transaction(tx => sealOntologyModelRelationProposal(tx, f.actor, { assertion: candidate, evidenceRef: input.evidenceRef, evidenceHash: digest("synthetic-retry-proof"), receipt: { modelCalled: true, vendor: "gemini", requestedModel: "synthetic-fixture", reportedModel: null, responseId: null, completionReason: "synthetic-stop", usage: null, responseTextHash: digest("synthetic-retry-response") } }, () => now));
  const failing = db.$extends({ query: { ontologyReviewEvent: { async create({ args, query }) { const result = await query(args); if (args.data.event === "relation.reprepared") throw new Error("synthetic-predecessor-audit-failpoint"); return result; } } } });
  const failingService = createOntologyRelationService({ db: failing as unknown as Pick<typeof db, "$transaction">, now: () => now, candidates: { authorize: async () => {}, validate: async () => { throw new Error("unused"); } } });
  await expect(failingService.draftModelRevision(f.actor, { ...input, ...retrySeal })).rejects.toThrow("synthetic-predecessor-audit-failpoint");
  expect(await db.ontologyRelationReview.count({ where: { id: retrySeal.modelRunId } })).toBe(0);
  expect(await db.ontologyReviewEvent.count({ where: { subjectId: retrySeal.modelRunId } })).toBe(0);
  expect(await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: previous.reviewId } })).toEqual(original);
 });
 it("labels client drafts authored; actual server receipt binds model candidate bytes and rejects forgery", async () => {
  const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
  const service = createOntologyRelationService({ db, now: () => now, candidates: { authorize: async () => {}, validate: async () => ({ engine: "synthetic-validator", conforms: true, incomplete: false, report: "[]", focusNodeCount: 1, results: [] }) } });
  const candidate = assertion(), manual = await service.draft(f.actor, { assertion: candidate, evidenceRef: "synthetic:graph" });
  expect(JSON.parse((await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: manual.reviewId } })).assertionCanonical).origin).toBe("authored");
  const raw = { assertion: candidate, evidenceRef: "synthetic:graph", evidenceHash: digest("synthetic-checked-packet"), receipt: { modelCalled: true as const, vendor: "gemini" as const, requestedModel: "synthetic-configured-model", reportedModel: null, responseId: null, completionReason: "synthetic-stop", usage: null, responseTextHash: digest("synthetic-returned-text") } };
  const sealed = await db.$transaction(tx => sealOntologyModelRelationProposal(tx, f.actor, raw, () => now));
  const model = await service.draftModel(f.actor, { assertion: candidate, evidenceRef: raw.evidenceRef, ...sealed });
  expect(JSON.parse((await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: model.reviewId } })).assertionCanonical).origin).toBe("model-proposal");
  expect(await service.draftModel(f.actor, { assertion: candidate, evidenceRef: raw.evidenceRef, ...sealed })).toEqual(model);
  await expect(service.draftModel(f.actor, { assertion: { ...candidate, object: "urn:todaymath:forged" }, evidenceRef: raw.evidenceRef, ...sealed })).rejects.toThrow();
  await expect(db.$transaction(tx => sealOntologyModelRelationProposal(tx, f.actor, { ...raw, receipt: { ...raw.receipt, modelCalled: false } as never }, () => now))).rejects.toThrow();
 });
});
describe("relation review and durable publication orchestration (synthetic compiler port)", () => {
  it("keeps insufficient or undistributable candidates unapproved without promoting their support", async () => {
    const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
    const service = createOntologyRelationService({ db, now: () => now, candidates: { authorize: async () => {}, validate: async () => ({ engine: "synthetic-policy-validation", conforms: true, incomplete: false, report: "[]", focusNodeCount: 1, results: [] }) } });
    for (const variant of [{ support: "unknown" }, { support: "missing" }, { distribution: "restricted" }, { distribution: "unknown" }] as const) {
      const candidate = { ...assertion(), ...variant, id: `urn:todaymath:assertion:policy:${crypto.randomUUID()}`, scope: `branch:${f.branch.id}` };
      const draft = await service.draft(f.actor, { assertion: candidate, evidenceRef: "synthetic-policy-graph" });
      const checked = await service.validate(f.actor, draft.reviewId);
      await expect(service.decide(f.actor, { reviewId: draft.reviewId, expectedRevision: checked.revision, validationHash: checked.validationHash, decision: "approve", sourceReviewed: true, meaningReviewed: true })).rejects.toMatchObject({ code: "EVIDENCE_INSUFFICIENT" });
      const retained = await service.read(f.actor, draft.reviewId);
      expect(retained.state).toBe("validated"); expect(retained.assertion.support).toBe(candidate.support); expect(retained.assertion.distribution).toBe(candidate.distribution);
      expect(await db.ontologyReviewEvent.count({ where: { subjectId: draft.reviewId, event: "relation.approved" } })).toBe(0);
      expect((await service.decide(f.actor, { reviewId: draft.reviewId, expectedRevision: checked.revision, validationHash: checked.validationHash, decision: "reject", sourceReviewed: true, meaningReviewed: true })).state).toBe("rejected");
    }
  });
  it("requires publisher rights and actual validator success, preserving draft → validated → approved events", async () => {
    const f = await fixture();
    await db.user.update({
      where: { id: f.actor.id },
      data: { isSuperAdmin: true },
    });
    let conforms = false;
    const service = createOntologyRelationService({
      db,
      now: () => now,
      candidates: {
        authorize: async () => {},
        validate: async () => ({
          engine: "synthetic-validation-port",
          conforms,
          incomplete: false,
          report: "[]",
          focusNodeCount: 1,
          results: [],
        }),
      },
    });
    const draft = await service.draft(f.actor, {
      assertion: assertion(),
      evidenceRef: "sealed:synthetic",
    });
    let checked = await service.validate(f.actor, draft.reviewId);
    await expect(
      service.decide(f.actor, {
        reviewId: draft.reviewId,
        expectedRevision: checked.revision,
        validationHash: checked.validationHash,
        decision: "approve",
        sourceReviewed: true,
        meaningReviewed: true,
      }),
    ).rejects.toMatchObject({ code: "STALE" });
    conforms = true;
    checked = await service.validate(f.actor, draft.reviewId);
    await db.user.update({
      where: { id: f.actor.id },
      data: { isSuperAdmin: false, isAdmin: true, branchRole: "manager" },
    });
    await expect(
      service.decide(f.actor, {
        reviewId: draft.reviewId,
        expectedRevision: checked.revision,
        validationHash: checked.validationHash,
        decision: "approve",
        sourceReviewed: true,
        meaningReviewed: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.user.update({
      where: { id: f.actor.id },
      data: { isSuperAdmin: true },
    });
    const approved = await service.decide(f.actor, {
      reviewId: draft.reviewId,
      expectedRevision: checked.revision,
      validationHash: checked.validationHash,
      decision: "approve",
      sourceReviewed: true,
      meaningReviewed: true,
    });
    expect(approved.state).toBe("approved");
    expect(
      await db.ontologyReviewEvent.count({
        where: { subjectId: draft.reviewId },
      }),
    ).toBe(4);
    const read = await service.read(f.actor, draft.reviewId); expect(read.state).toBe("approved");
    await expect(service.retire(f.actor, draft.reviewId, approved.revision - 1)).rejects.toMatchObject({ code: "STALE" });
    expect(await service.retire(f.actor, draft.reviewId, approved.revision)).toMatchObject({ state: "retired", revision: approved.revision + 1 });
    expect((await service.read(f.actor, draft.reviewId)).state).toBe("retired");
    expect(await db.ontologyReviewEvent.count({ where: { subjectId: draft.reviewId, event: "relation.retired" } })).toBe(1);
  });
  it("persists a queued job, runs compilation outside its DB transaction, atomically activates a verified immutable release and preserves old bytes", async () => {
    const f = await fixture();
    await db.user.update({
      where: { id: f.actor.id },
      data: { isSuperAdmin: true },
    });
    const scopeKey = `branch:${f.branch.id}`;
    const buildInput = async (): Promise<MathOntologyCompileInput> => ({
      schemaVersion: 1,
      profile: "tm-owlrl-1",
      scope: scopeKey,
      registryNquads: "",
      assertions: [],
      sourceManifest: JSON.stringify({ synthetic: true, source: f.branch.id }),
    });
    let compileCount = 0;
    const publisher = createOntologyPublisher({
      db,
      now: () => now,
      engineLockHash: digest("synthetic-engine-lock"),
      buildInput,
      compiler: {
        compile: async (input) => {
          compileCount++;
          return artifactFor(input);
        },
      },
      verifyArtifact: async (artifact) => artifact,
    });
    const job = await publisher.enqueue(f.actor, scopeKey);
    expect((await publisher.enqueue(f.actor, scopeKey)).jobId).toBe(job.jobId);
    const released = await publisher.run(f.actor, job.jobId);
    expect(released.state).toBe("published");
    expect(compileCount).toBe(1);
    expect((await publisher.run(f.actor, job.jobId)).graphVersion).toBe(
      released.graphVersion,
    );
    expect(compileCount).toBe(1);
    const row = await db.ontologyRelease.findUniqueOrThrow({
      where: { graphVersion: released.graphVersion! },
    });
    await expect(
      db.ontologyRelease.update({
        where: { graphVersion: row.graphVersion },
        data: { artifactCanonical: "tampered" },
      }),
    ).rejects.toThrow("immutable");
  });
  it("refuses activation when the active generation or current publisher capability changes during compilation", async () => {
    for (const change of ["generation", "capability"] as const) {
      const f = await fixture();
      await db.user.update({
        where: { id: f.actor.id },
        data: { isSuperAdmin: true },
      });
      const scopeKey = `branch:${f.branch.id}`;
      const publisher = createOntologyPublisher({
        db,
        now: () => now,
        engineLockHash: digest("lock"),
        buildInput: async () => ({
          schemaVersion: 1,
          profile: "tm-owlrl-1",
          scope: scopeKey,
          registryNquads: "",
          assertions: [],
          sourceManifest: "{}",
        }),
        compiler: {
          compile: async (input) => {
            if (change === "generation")
              await db.ontologyActiveGraph.update({
                where: { scopeKey },
                data: { generation: { increment: 1 } },
              });
            else
              await db.user.update({
                where: { id: f.actor.id },
                data: { isSuperAdmin: false },
              });
            return artifactFor(input);
          },
        },
        verifyArtifact: async (artifact) => artifact,
      });
      const job = await publisher.enqueue(f.actor, scopeKey);
      await expect(publisher.run(f.actor, job.jobId)).rejects.toMatchObject({
        code: change === "generation" ? "STALE" : "FORBIDDEN",
      });
      expect(
        await db.ontologyRelease.count({ where: { jobId: job.jobId } }),
      ).toBe(0);
    }
  });
});
