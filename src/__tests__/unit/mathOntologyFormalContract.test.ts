import { describe, expect, it } from "vitest";
import {
  mathOntologyAssertionSchema,
  mathOntologyGraphIdentitySchema,
  mathOntologyQuerySchema,
} from "@/contracts/mathOntology.contract";

const hash = `sha256:${"a".repeat(64)}`;
describe("formal ontology boundary", () => {
  it("requires independent graph, review, proof and engine hashes", () => {
    expect(mathOntologyGraphIdentitySchema.safeParse({ graphVersion: hash }).success).toBe(false);
    const hashes = Object.fromEntries(["source", "registry", "asserted", "closure", "review", "ontology", "shapes", "rules", "proof", "engine", "report", "coverage"].map(k => [k, hash]));
    expect(mathOntologyGraphIdentitySchema.parse({ schemaVersion: 1, profile: "tm-owlrl-1", graphVersion: hash, hashes }).hashes.closure).toBe(hash);
  });
  it("does not promote an AI candidate by calling it official or published", () => {
    const candidate = { id: "urn:todaymath:assertion:test", subject: "urn:todaymath:entity:a", predicate: "urn:todaymath:vocab:partOf", object: "urn:todaymath:entity:b", scope: "global", sourceRevision: "urn:todaymath:source:r1", sourceDigest: hash, locator: "/records/0", provenance: "official-document", origin: "model-proposal", support: "indirect", review: "candidate", publication: "unpublished", distribution: "allowed", revision: 1 };
    expect(mathOntologyAssertionSchema.parse(candidate).origin).toBe("model-proposal");
    expect(mathOntologyAssertionSchema.safeParse({ ...candidate, publication: "published" }).success).toBe(false);
    expect(mathOntologyAssertionSchema.safeParse({ ...candidate, review: "approved", publication: "published" }).success).toBe(false);
    expect(mathOntologyAssertionSchema.safeParse({ ...candidate, review: "approved", approvalId: "urn:todaymath:approval:one", publication: "published" }).success).toBe(true);
  });
  it("only accepts bounded closed query plans, never caller SPARQL or endpoints", () => {
    expect(mathOntologyQuerySchema.safeParse({ kind: "catalog", limit: 20 }).success).toBe(true);
    expect(mathOntologyQuerySchema.safeParse({ kind: "catalog", limit: 1000 }).success).toBe(false);
    expect(mathOntologyQuerySchema.safeParse({ kind: "catalog", sparql: "SERVICE <https://example.org> {}" }).success).toBe(false);
  });
});
