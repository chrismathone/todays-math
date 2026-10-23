import type { Prisma } from "@prisma/client";
export async function lockOntologyScope(
  tx: Prisma.TransactionClient,
  scopeKey: string,
  now: Date,
) {
  await tx.ontologyActiveGraph.upsert({
    where: { scopeKey },
    update: {},
    create: { scopeKey, generation: 0, updatedAt: now },
  });
  await tx.$queryRaw`SELECT scope_key FROM ontology_active_graph WHERE scope_key = ${scopeKey} FOR UPDATE`;
  return tx.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey } });
}
