import { it, expect } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import {
  loadPackagedOntologyBase,
  readPackagedOntologyArtifact,
} from "@/lib/math-ontology/runtime/base";
import { joinRetainedOntologySources } from "@/lib/math-ontology/retrieval/privateJoins";
import type { MathOntologyDatabaseSourceSnapshot } from "@/lib/math-ontology/sources/database";
const context = {
  allowedScopes: ["global"],
  contextHash: "synthetic-current-owned-context",
  cursorSecret: "synthetic-only",
  deadlineMs: 10000,
};
it("joins retained event to exact native section and chapter with SHACL and public witnesses; excludes foreign inputs", async () => {
  const runtime = await loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
  const { base } = loadPackagedOntologyBase(
    JSON.parse(release.files.source).baseHash,
  );
  const index = JSON.parse(
    readPackagedOntologyArtifact(base, base.catalog).toString("utf8"),
  ) as {
    entries: {
      entity: string;
      stableIri: string;
      nativeId: string;
      namespace: string;
    }[];
  };
  const section = index.entries.find((e) => e.namespace === "course-section")!;
  const snapshot = {
    graphVersion: runtime.identity.graphVersion,
    contextHash: context.contextHash,
    asOf: "2026-10-23T00:00:00.000Z",
    studentRevision: 7,
    snapshotDigest: "sha256:" + "a".repeat(64),
    learning: {
      firstAttempts: [
        {
          id: "PRIVATE_EVENT",
          sessionId: "PRIVATE_SESSION",
          problemId: "PRIVATE_PROBLEM",
          sectionId: section.nativeId,
          domain: "course",
          answeredAt: "2026-10-22T00:00:00.000Z",
          correct: false,
          independentFirstAttempt: true,
          sourceBinding: {
            namespace: "course-section",
            nativeId: section.nativeId,
            scope: "global",
            stableIri: section.stableIri,
            resolution: "exact-native-id-requires-approved-release-version",
          },
        },
      ],
      followUps: [],
    },
  } as unknown as MathOntologyDatabaseSourceSnapshot;
  const result = await joinRetainedOntologySources(runtime, snapshot, context);
  expect(
    result.rows.some(
      (r) => r.native === section.entity && r.section && r.chapter,
    ),
  ).toBe(true);
  expect(result.validation).toMatchObject({
    conforms: true,
    focusNodeCount: 1,
  });
  expect(result.witnesses[0].recordRevision).toBe(7);
  expect(result.witnesses[0].proofIds.length).toBeGreaterThan(1);
  expect(JSON.stringify(result)).not.toContain("PRIVATE_EVENT");
  expect(JSON.stringify(result)).not.toContain("PRIVATE_SESSION");
  await expect(
    joinRetainedOntologySources(runtime, snapshot, {
      ...context,
      allowedScopes: [],
    }),
  ).rejects.toThrow("PRIVATE_JOIN_CONTEXT_MISMATCH");
  await expect(
    joinRetainedOntologySources(
      runtime,
      { ...snapshot, graphVersion: "different" },
      context,
    ),
  ).rejects.toThrow("PRIVATE_JOIN_CONTEXT_MISMATCH");
}, 60000);
it("keeps explorer and fading summaries distinct from timed first attempts while resolving native proof paths", async () => {
  const runtime = await loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
  const { base } = loadPackagedOntologyBase(
    JSON.parse(release.files.source).baseHash,
  );
  const index = JSON.parse(
    readPackagedOntologyArtifact(base, base.catalog).toString("utf8"),
  ) as {
    entries: {
      entity: string;
      stableIri: string;
      nativeId: string;
      namespace: string;
    }[];
  };
  const card = index.entries.find((e) => e.namespace === "explorer-card")!,
    fading = index.entries.find((e) => e.namespace === "fading-group")!;
  const binding = (e: typeof card) => ({
    namespace: e.namespace,
    nativeId: e.nativeId,
    scope: "global",
    stableIri: e.stableIri,
    resolution: "exact-native-id-requires-approved-release-version",
  });
  const snapshot = {
    graphVersion: runtime.identity.graphVersion,
    contextHash: "synthetic-summary-only",
    studentRevision: 3,
    snapshotDigest: "sha256:" + "b".repeat(64),
    learning: {
      firstAttempts: [],
      followUps: [],
      explorerCards: [
        {
          cardId: card.nativeId,
          sourceBinding: binding(card),
          lastDate: "2026-10-22",
          independentFirstAttempt: false,
        },
      ],
      fadingConcepts: [
        {
          conceptId: fading.nativeId,
          sourceBinding: binding(fading),
          reviewedOn: "2026-10-22",
          independentFirstAttempt: false,
        },
      ],
    },
  } as unknown as MathOntologyDatabaseSourceSnapshot;
  const result = await joinRetainedOntologySources(runtime, snapshot, context);
  expect(result.witnesses).toHaveLength(0);
  expect(result.summaryWitnesses).toHaveLength(2);
  expect(result.summaries).toHaveLength(0);
  expect(result.validation).toMatchObject({
    conforms: true,
    timedEventFocus: 0,
    summaryFocus: 2,
  });
  expect(
    result.summaryWitnesses.every(
      (w) =>
        w.timeKind === "summary-not-event-time" && !w.independentFirstAttempt,
    ),
  ).toBe(true);
  expect(
    result.summaryWitnesses.find((w) => w.domain === "explorer-card")?.proofIds
      .length,
  ).toBeGreaterThan(0);
}, 60000);
