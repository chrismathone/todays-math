import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db, fixture, nextArgs } from "./harness";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { createOntologyPublicationApproval } from "@/lib/math-ontology/publish/approval";
import { buildNativeOntologyPublicationInput, currentPackagedPublicationBase, currentOntologyEngineFingerprint } from "@/lib/math-ontology/publish/native";
import { createOntologyPythonPort } from "@/lib/math-ontology/transport/python";
import { verifyOntologyCompiledArtifactForInput } from "@/lib/math-ontology/runtime/compiled";
import { loadActiveOntologyRuntimeInTransaction } from "@/lib/math-ontology/publish/store";
import { createOntologyEvidenceStore } from "@/lib/math-ontology/actions/evidence";
import { createOntologyActionService } from "@/lib/math-ontology/actions/service";
import { authorizeOntologyAction } from "@/lib/math-ontology/actions/authorization";
import { createOntologyHistoryDelivery } from "@/lib/math-ontology/outbox/history";
import { createOntologyFeedbackService } from "@/lib/math-ontology/feedback/service";
import { currentOntologyObservations } from "@/lib/math-ontology/feedback/observations";
import { createOntologyHistoryReader } from "@/lib/math-ontology/actions/history";
import { sourceEntityIri } from "@/lib/math-ontology/ids";
import { queryOntology } from "@/lib/math-ontology/query/closed";

const evidence = "/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/operations";
const python = "/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/formal/.venv312/bin/python";
describe("full native package -> real publication -> scoped action -> history/feedback", () => {
 it("uses actual packaged all-source proof materialization and the concrete native publisher with only synthetic student records", async () => {
  const secret = "synthetic-native-operation-machine-secret", audience = "synthetic-native-operations";
  const child = spawn(python, ["-B", "api/ontology-engine.py"], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], env: { NODE_ENV: "test", PATH: process.env.PATH ?? "/usr/bin:/bin", ONTOLOGY_ENGINE_SECRET: secret, ONTOLOGY_ENGINE_AUDIENCE: audience } });
  const receipt: Record<string, unknown> = { pid: child.pid, host: "127.0.0.1", studentData: "synthetic-only-no-model", startedAt: new Date().toISOString(), stopped: false };
  try {
    let output = "";
    const port = await new Promise<number>((resolve, reject) => { child.once("error", reject); child.once("exit", () => reject(new Error("Python stopped before ready"))); child.stdout.on("data", (chunk: Buffer) => { output += String(chunk); if (output.includes("\n")) { try { resolve(JSON.parse(output.split("\n")[0]).port); } catch { reject(new Error("Invalid fixture port")); } } }); });
    receipt.port = port;
    const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
    // Other orchestration fixture files may leave synthetic review rows. Retain
    // those histories and exclude them from this actual global publication.
    await db.ontologyRelationReview.updateMany({ where: { scopeKey: "global", state: "approved" }, data: { state: "retired", revision: { increment: 1 } } });
    const publisher = createOntologyPublisher({ db, engineLockHash: currentOntologyEngineFingerprint(), buildInput: buildNativeOntologyPublicationInput, compiler: createOntologyPythonPort({ endpoint: new URL(`http://127.0.0.1:${port}/api/ontology-engine`), audience, secret }), verifyArtifact: verifyOntologyCompiledArtifactForInput });
    const publication = createOntologyPublicationApproval({ db, publisher, base: currentPackagedPublicationBase });
    const prepared = await publication.prepare(f.actor), published = await publication.confirm(f.actor, { confirmationId: prepared.confirmationId, sealHash: prepared.sealHash });
    expect(published.state).toBe("published");
    const active = await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } }); expect(active.graphVersion).toBeTruthy();
    const graphVersion = active.graphVersion!, seed = sourceEntityIri({ namespace: "bank-assessment", scope: "global", nativeId: "e5-1-5-3-c1" });
    const chapter = await db.$transaction(async tx => {
      await authorizeOntologyAction(tx, f.actor, f.target, () => new Date());
      const runtime = await loadActiveOntologyRuntimeInTransaction(tx, graphVersion, { kind: "neighbors", entityId: seed, limit: 20 });
      let cursor = seed;
      const path = [seed];
      for (const relation of ["assessesDefinition", "partOf", "partOf"]) {
        const result = await queryOntology(runtime, { kind: "neighbors", entityId: cursor, relation, limit: 20 }, { allowedScopes: ["global"], contextHash: "synthetic-native-path", cursorSecret: secret });
        expect(result.rows.length).toBeGreaterThan(0); cursor = result.rows[0].o; path.push(cursor);
      }
      expect(new Set(path).size).toBe(4);
      receipt.explicitSourcePath = path;
      return cursor;
    }, { timeout: 20000 });
    const snapshots = createOntologyEvidenceStore({ db, runtime: { load: loadActiveOntologyRuntimeInTransaction }, cursorSecret: () => secret });
    const snapshot = await snapshots.capture(f.actor, { target: f.target, graphVersion, query: { kind: "path", entityId: seed, targetId: chapter, limit: 20 } });
    // The full package also has derived shortcuts. The closed path planner
    // correctly chooses two proof-backed hops rather than the explicit three.
    expect(snapshot.evidencePacket.proofIds.length).toBeGreaterThanOrEqual(2);
    const plans = createOntologyActionService({ db, evidence: snapshots.evidence });
    const proposal = await plans.propose(f.actor, { target: f.target, args: nextArgs, graphVersion, sourceSnapshotId: snapshot.sourceSnapshotId });
    const approval = await plans.approve(f.actor, { proposalId: proposal.proposalId, sealHash: proposal.sealHash }), applied = await plans.execute(f.actor, approval);
    expect(applied.outcome).toBe("applied"); expect(applied.afterRevision).toBe(2);
    expect(await createOntologyHistoryDelivery({ db })(f.actor, applied.id)).toEqual({ state: "delivered" });
    const feedback = await createOntologyFeedbackService({ db, observations: currentOntologyObservations }).record(f.actor, { receiptId: applied.id, sourceSnapshotId: "synthetic-native-post-action" });
    expect(feedback.observation.kind).toBe("descriptive"); expect(feedback.observation.counts.retainedFirstAttempts).toBe(0);
    expect((await createOntologyHistoryReader({ db })(f.actor)).steps.some(step => step.id === applied.id)).toBe(true);
    receipt.graphVersion = graphVersion; receipt.base = currentPackagedPublicationBase(); receipt.pathProofCount = snapshot.evidencePacket.proofIds?.length; receipt.outcome = applied.outcome; receipt.revision = applied.afterRevision; receipt.modelCalls = 0;
  } finally {
    child.kill("SIGTERM"); if (child.exitCode === null && child.signalCode === null) await once(child, "exit");
    try { process.kill(child.pid!, 0); } catch { receipt.stopped = true; }
    receipt.finishedAt = new Date().toISOString(); await writeFile(path.join(evidence, `native-flow-${Date.now()}.json`), JSON.stringify(receipt, null, 2) + "\n"); expect(receipt.stopped).toBe(true);
  }
 }, 120000);
});
