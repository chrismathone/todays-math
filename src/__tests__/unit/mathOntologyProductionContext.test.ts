import { beforeEach, afterEach, it, expect, vi } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
const state = vi.hoisted(() => ({
  revoked: false,
  generation: 1,
  revision: 4,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: async (fn: (tx: unknown) => unknown) => fn({}) },
}));
vi.mock("@/lib/math-ontology/actions/production.server", () => ({
  authorizeOntologyOperationRequest: async () =>
    state.revoked
      ? { actor: null, response: new Response(null, { status: 403 }) }
      : { actor: { id: "synthetic-actor", sessionVersion: 2 }, response: null },
}));
vi.mock("@/lib/math-ontology/actions/actor", () => ({
  readOntologyActorInTransaction: async () => ({
    row: {
      role: "teacher",
      isAdmin: false,
      isSuperAdmin: false,
      disabledMenus: [],
      branchId: null,
    },
    branch: null,
    binding: {
      id: "b",
      enabled: true,
      mode: "active",
      sourceEpoch: "epoch",
      leaseExpiresAt: new Date("2099-01-01"),
      updatedAt: new Date("2026-10-23"),
    },
    managed: {
      bindingId: "b",
      status: "confirmed",
      blockReasons: [],
      sourceEpoch: "epoch",
      securityRevision: BigInt(state.revision),
      accountRevocationGeneration: BigInt(1),
      tenantRevocationGeneration: BigInt(1),
      classListRevision: BigInt(1),
      leaseExpiresAt: new Date("2099-01-01"),
      endedAt: null,
    },
  }),
}));
vi.mock("@/lib/math-ontology/sources/server", () => ({
  authorizeMathOntologyNativeSourceRead: async () => {},
  authorizeMathOntologySourceRead: async () => {},
  readMathOntologyDatabaseSources: async () => {
    throw new Error("UNEXPECTED_PRIVATE_READ");
  },
}));
vi.mock("@/lib/math-ontology/sources/definitionEvidence", () => ({
  readNativeDefinitionEvidenceInTransaction: async () => {
    throw new Error("UNEXPECTED_DEFINITION_READ");
  },
}));
vi.mock("@/lib/math-ontology/feedback/observations", () => ({
  currentOntologyObservations: {},
}));
vi.mock("@/lib/math-ontology/publish/store", () => ({
  readActiveOntologyRelease: async () => ({
    artifact: release,
    identity: release.identity,
    generation: state.generation,
  }),
}));
import { createProductionOntologyContext } from "@/lib/math-ontology/retrieval/context.server";
import { queryOntology } from "@/lib/math-ontology/query/closed";
const actor = { id: "synthetic-actor", sessionVersion: 2 };
beforeEach(() => {
  state.revoked = false;
  state.generation = 1;
  state.revision = 4;
  vi.stubEnv("AUTH_SECRET", "synthetic-only-ontology-cursor-secret-32chars");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("real production context accepts public continuation across request clocks and rejects changed graph", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T01:00:00Z"));
  const first = await createProductionOntologyContext(
    new Request("https://local.invalid/api/math-ontology/catalog"),
    actor,
  ).open(false);
  const page = await queryOntology(
    first.runtime,
    { kind: "catalog", namespace: "course-section", q: "분수", limit: 2 },
    first.context,
  );
  expect(page.cursor).not.toBeNull();
  vi.setSystemTime(new Date("2026-10-23T01:01:00Z"));
  const second = await createProductionOntologyContext(
    new Request("https://local.invalid/api/math-ontology/catalog"),
    actor,
  ).open(false);
  expect(second.context.contextHash).toBe(first.context.contextHash);
  const next = await queryOntology(
    second.runtime,
    {
      kind: "catalog",
      namespace: "course-section",
      q: "분수",
      limit: 2,
      cursor: page.cursor!,
    },
    second.context,
  );
  expect(next.rows).toHaveLength(2);
  expect(next.rows[0].entity).not.toBe(page.rows[0].entity);
  state.generation++;
  await expect(second.assertCurrent()).rejects.toMatchObject({ code: "STALE" });
}, 60000);
it("real managed context preserves BigInt stamp; current authority changes are stale and revocation is forbidden", async () => {
  const session = await createProductionOntologyContext(
    new Request("https://local.invalid/api/math-ontology/catalog"),
    actor,
  ).open(false);
  state.revision++;
  await expect(session.assertCurrent()).rejects.toMatchObject({
    code: "STALE",
  });
  state.revoked = true;
  await expect(session.assertCurrent()).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
