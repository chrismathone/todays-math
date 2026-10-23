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
    support: "unknown",
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
