import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/ontology-formal-release.json";
import { mathOntologyArtifactSchema } from "@/contracts/mathOntology.contract";
import {
  createOntologyReadHandler,
  type OntologyReadAccess,
} from "@/lib/math-ontology/retrieval/readHandler";
import { ontologyReadRoute } from "@/lib/math-ontology/access/readPolicy";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
const artifact = mathOntologyArtifactSchema.parse(fixture);
const access: OntologyReadAccess = {
  stamp: "auth1",
  sessionVersion: 1,
  allowedScopes: ["global"],
  actorId: "synthetic-actor",
  sourceSnapshot: { record: "synthetic" },
  recordRevision: 1,
};
const release = { generation: 1, identity: artifact.identity, artifact };
describe("ontology read boundary", () => {
  it("authorizes before loading any dataset", async () => {
    const readRelease = vi.fn();
    const handler = createOntologyReadHandler({
      authorize: async () => ({
        response: new Response(null, { status: 403 }),
        access: null,
      }),
      readRelease,
      cursorSecret: () => "synthetic",
    });
    expect(
      (
        await handler(
          new Request("https://synthetic.test/api/math-ontology/catalog"),
        )
      ).status,
    ).toBe(403);
    expect(readRelease).not.toHaveBeenCalled();
  });
  it.each(["record", "context", "graph"])(
    "rejects %s changes after actual query without an automatic request",
    async (kind) => {
      let calls = 0;
      const authorize = vi.fn(async () => ({
        response: null,
        access:
          ++calls === 1
            ? access
            : {
                ...access,
                ...(kind === "record"
                  ? { recordRevision: 2 }
                  : kind === "context"
                    ? { stamp: "auth2" }
                    : {}),
              },
      }));
      let reads = 0;
      const readRelease = vi.fn(async () => ({
        ...release,
        generation: ++reads > 1 && kind === "graph" ? 2 : 1,
      }));
      const handler = createOntologyReadHandler({
        authorize,
        readRelease,
        cursorSecret: () => "synthetic",
      });
      const result = await handler(
        new Request("https://synthetic.test/api/math-ontology/query", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: "neighbors",
            entityId: "urn:todaymath:entity:a",
            limit: 20,
          }),
        }),
      );
      expect(result.status).toBe(409);
      expect(authorize).toHaveBeenCalledTimes(2);
      expect(readRelease).toHaveBeenCalledTimes(2);
    },
  );
  it("clears results on session revocation after work", async () => {
    let calls = 0;
    const handler = createOntologyReadHandler({
      authorize: async () => ({
        response: null,
        access: ++calls === 1 ? access : { ...access, sessionVersion: 2 },
      }),
      readRelease: async () => release,
      cursorSecret: () => "synthetic",
    });
    const r = await handler(
      new Request("https://synthetic.test/api/math-ontology/catalog"),
    );
    expect(r.status).toBe(403);
    expect(await r.text()).not.toContain("urn:todaymath:entity");
  });
  it("only adds the enumerated read methods and paths", () => {
    expect(ontologyReadRoute("GET", "/api/math-ontology/catalog")).toBe(true);
    expect(ontologyReadRoute("POST", "/api/math-ontology/query")).toBe(true);
    for (const method of ["POST", "DELETE", "PATCH"])
      expect(ontologyReadRoute(method, "/api/math-ontology/catalog")).toBe(
        false,
      );
    expect(ontologyReadRoute("POST", "/api/math-ontology/execute")).toBe(false);
    expect(ontologyReadRoute("GET", "/api/math-ontology/unknown")).toBe(false);
  });
  it("retains the existing account helper and closes global publishing to branch staff", () => {
    const teacher: AccountAccess = {
      id: "synthetic",
      name: "Synthetic",
      email: "synthetic@example.test",
      role: "director",
      isAdmin: false,
      isSuperAdmin: false,
      branchId: null,
      branchRole: null,
      approvalStatus: "approved",
      menus: ["srs"],
    };
    expect(
      accountRouteAllowed(teacher, "POST", "/api/math-ontology/query"),
    ).toBe(true);
    expect(
      accountRouteAllowed(
        teacher,
        "POST",
        "/api/math-ontology/actions/proposals",
      ),
    ).toBe(true);
    for (const person of [teacher, { ...teacher, isAdmin: true }])
      expect(
        accountRouteAllowed(
          person,
          "POST",
          "/api/math-ontology/relations/proposals",
        ),
      ).toBe(false);
    expect(
      accountRouteAllowed(
        { ...teacher, isSuperAdmin: true },
        "POST",
        "/api/math-ontology/relations/proposals",
      ),
    ).toBe(true);
    expect(
      accountRouteAllowed(
        { ...teacher, menus: [] },
        "POST",
        "/api/math-ontology/query",
      ),
    ).toBe(false);
    expect(
      accountRouteAllowed(teacher, "POST", "/api/math-ontology/publish/stage"),
    ).toBe(false);
  });
});
