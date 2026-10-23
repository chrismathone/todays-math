import { DataFactory, Store } from "n3";
import {
  mathOntologyAssertionSchema,
  mathOntologyProofSchema,
  MATH_ONTOLOGY_VOCAB as TM,
  type MathOntologyProof,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL = "http://www.w3.org/2002/07/owl#";
const tripleKey = (t: readonly string[]) => canonicalOntologyJson(t);
export function checkOntologyProofs(
  raw: unknown,
  review: unknown,
  model: Store,
  closure: Store,
): readonly MathOntologyProof[] {
  if (!Array.isArray(raw) || !Array.isArray(review))
    throw new Error("INVALID_PROOF_SET");
  const assertions = new Map(
    review.map((a) => {
      const parsed = mathOntologyAssertionSchema.parse(a);
      return [parsed.id, parsed];
    }),
  );
  const proofs = raw.map((p) => mathOntologyProofSchema.parse(p));
  const byId = new Map(proofs.map((p) => [p.id, p]));
  if (byId.size !== proofs.length) throw new Error("DUPLICATE_PROOF");
  const verified = new Set<string>(),
    visiting = new Set<string>();
  const exists = (store: Store, t: readonly string[]) =>
    store.countQuads(
      ...(t.map((x) => DataFactory.namedNode(x)) as [
        ReturnType<typeof DataFactory.namedNode>,
        ReturnType<typeof DataFactory.namedNode>,
        ReturnType<typeof DataFactory.namedNode>,
      ]),
      null,
    ) > 0;
  function verify(proof: MathOntologyProof): void {
    if (verified.has(proof.id)) return;
    if (visiting.has(proof.id)) throw new Error("CYCLIC_PROOF");
    visiting.add(proof.id);
    const { id, ...unsigned } = proof;
    if (
      ontologyDigest(canonicalOntologyJson(unsigned)) !== id ||
      !exists(closure, proof.conclusion)
    )
      throw new Error("UNBOUND_PROOF");
    const parents = proof.premises.map((id) => {
      const p = byId.get(id);
      if (!p) throw new Error("MISSING_PREMISE");
      verify(p);
      return p;
    });
    const [s, p, o] = proof.conclusion;
    let valid = false;
    if (proof.rule === "asserted") {
      valid =
        !parents.length &&
        ((exists(model, proof.conclusion) &&
          !proof.assertionIds.length &&
          proof.scope === "global") ||
          (proof.assertionIds.length === 1 &&
            proof.assertionIds.every((id) => {
              const a = assertions.get(id);
              return (
                a?.review === "approved" &&
                a.publication === "published" &&
                a.distribution === "allowed" &&
                ["direct", "indirect"].includes(a.support) &&
                a.approvalId &&
                a.scope === proof.scope &&
                tripleKey([a.subject, a.predicate, a.object]) ===
                  tripleKey(proof.conclusion)
              );
            })));
    } else if (parents.length === 2) {
      const a = parents[0].conclusion,
        b = parents[1].conclusion;
      if (proof.rule === "prp-trp")
        valid =
          p === TM + "partOf" &&
          exists(model, [p, RDF + "type", OWL + "TransitiveProperty"]) &&
          a[0] === s &&
          a[1] === p &&
          a[2] === b[0] &&
          b[1] === p &&
          b[2] === o;
      if (proof.rule === "cax-sco")
        valid =
          p === RDF + "type" &&
          a[0] === s &&
          a[1] === p &&
          b[0] === a[2] &&
          b[1] === RDFS + "subClassOf" &&
          b[2] === o;
      if (proof.rule === "prp-spo1")
        valid =
          a[0] === s &&
          a[2] === o &&
          b[0] === a[1] &&
          b[1] === RDFS + "subPropertyOf" &&
          b[2] === p;
      if (proof.rule === "prp-dom")
        valid =
          p === RDF + "type" &&
          a[0] === s &&
          b[0] === a[1] &&
          b[1] === RDFS + "domain" &&
          b[2] === o;
      if (proof.rule === "prp-rng")
        valid =
          p === RDF + "type" &&
          a[2] === s &&
          b[0] === a[1] &&
          b[1] === RDFS + "range" &&
          b[2] === o;
      const ids = [...new Set(parents.flatMap((p) => p.assertionIds))].sort();
      const scopes = [
        ...new Set(parents.map((p) => p.scope).filter((s) => s !== "global")),
      ];
      valid =
        valid &&
        canonicalOntologyJson(ids) ===
          canonicalOntologyJson(proof.assertionIds) &&
        scopes.length <= 1 &&
        proof.scope === (scopes[0] ?? "global");
    }
    if (!valid) throw new Error("INVALID_DERIVATION");
    visiting.delete(proof.id);
    verified.add(proof.id);
  }
  for (const p of proofs) verify(p);
  return proofs;
}
