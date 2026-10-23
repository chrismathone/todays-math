import type { MathOntologyProof } from "@/contracts/mathOntology.contract";
/** Only an exact checked conclusion supports this candidate. Shared endpoints,
 * an available fact ID, similar labels and multi-hop prerequisites do not. */
export function exactOntologyRelationSupport(
  proofs: readonly MathOntologyProof[],
  selectedIds: readonly string[],
  triple: readonly [string, string, string],
) {
  const witness = proofs.find(
    (p) =>
      selectedIds.includes(p.id) &&
      p.scope === "global" &&
      p.assertionIds.length > 0 &&
      p.conclusion.every((term, i) => term === triple[i]),
  );
  return witness
    ? {
        support:
          witness.rule === "asserted"
            ? ("direct" as const)
            : ("indirect" as const),
        witness,
      }
    : { support: "unknown" as const, witness: null };
}
