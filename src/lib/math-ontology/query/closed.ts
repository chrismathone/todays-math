import { createHmac, timingSafeEqual } from "node:crypto";
import { DataFactory, Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import { BindingsFactory } from "@comunica/utils-bindings-factory";
import {
  mathOntologyQuerySchema,
  MATH_ONTOLOGY_RELATIONS,
  MATH_ONTOLOGY_VOCAB as TM,
  type MathOntologyQuery,
} from "@/contracts/mathOntology.contract";
import type { MathOntologyRuntime } from "../runtime/artifact";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { validateOntologyCore } from "../validation/core";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const { namedNode, literal, quad } = DataFactory;
const bindingsFactory = new BindingsFactory(DataFactory);
export interface OntologyQueryContext {
  allowedScopes: readonly string[];
  contextHash: string;
  cursorSecret: string;
  deadlineMs?: number;
}
function cursorEncode(data: unknown, secret: string) {
  const body = Buffer.from(canonicalOntologyJson(data)).toString("base64url");
  return `${body}.${createHmac("sha256", secret)
    .update("ontology-query-v1\n" + body)
    .digest("hex")}`;
}
export function cursorDecode(
  value: string,
  secret: string,
): Record<string, unknown> {
  const [body, signature, ...tail] = value.split(".");
  const wanted = createHmac("sha256", secret)
    .update("ontology-query-v1\n" + body)
    .digest("hex");
  if (
    tail.length ||
    !signature ||
    signature.length !== wanted.length ||
    !timingSafeEqual(Buffer.from(wanted), Buffer.from(signature))
  )
    throw new Error("INVALID_CURSOR");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}
export async function queryOntology(
  runtime: MathOntologyRuntime,
  raw: MathOntologyQuery,
  context: OntologyQueryContext,
): Promise<{
  graphVersion: string;
  rows: Record<string, string>[];
  proofIds: string[];
  truncated: boolean;
  cursor: string | null;
  coverage: MathOntologyRuntime["coverage"];
}> {
  let query = mathOntologyQuerySchema.parse(raw);
  const started = performance.now();
  if (runtime.resolveEntity)
    query = {
      ...query,
      ...(query.entityId
        ? { entityId: runtime.resolveEntity(query.entityId) }
        : {}),
      ...(query.targetId
        ? { targetId: runtime.resolveEntity(query.targetId) }
        : {}),
    };
  if (runtime.materialize)
    return queryOntology(
      await runtime.materialize(query, context),
      query,
      context,
    );
  if (
    !context.cursorSecret ||
    !context.allowedScopes.includes(runtime.coverage.scope)
  )
    throw new Error("SCOPE_DENIED");
  const { cursor, ...queryIdentity } = query,
    binding = ontologyDigest(
      canonicalOntologyJson([
        runtime.identity.graphVersion,
        queryIdentity,
        context.contextHash,
      ]),
    );
  const state = cursor ? cursorDecode(cursor, context.cursorSecret) : null;
  if (state && state.binding !== binding) throw new Error("STALE_CURSOR");
  const { registry, asserted } = runtime.datasets(),
    proofs = runtime.proofs();
  if (query.kind !== "catalog")
    for (const id of [query.entityId, query.targetId].filter(Boolean)) {
      const scopes = registry.getObjects(
        namedNode(id!),
        namedNode(TM + "sourceScope"),
        null,
      );
      if (
        !registry.countQuads(
          namedNode(id!),
          namedNode(RDF + "type"),
          namedNode(TM + "SourceEntity"),
          null,
        ) ||
        !scopes.some((s) => context.allowedScopes.includes(s.value))
      )
        throw new Error("ONTOLOGY_ENTITY_UNRESOLVED");
    }
  const visible = proofs.filter(
    (p) => p.assertionIds.length && context.allowedScopes.includes(p.scope),
  );
  const permittedRelations = new Set(
    MATH_ONTOLOGY_RELATIONS.map((p) => TM + p),
  );
  const graph = new Store();
  // No hidden conclusion is loaded into the query store. Authorization is checked
  // on every premise before the conclusion can enter this request's graph.
  for (const p of visible)
    if (permittedRelations.has(p.conclusion[1]))
      graph.addQuad(
        quad(
          ...(p.conclusion.map(namedNode) as [
            ReturnType<typeof namedNode>,
            ReturnType<typeof namedNode>,
            ReturnType<typeof namedNode>,
          ]),
        ),
      );
  const engine = new QueryEngine();
  async function select(
    text: string,
    values: Record<
      string,
      ReturnType<typeof namedNode> | ReturnType<typeof literal>
    >,
    source: Store,
  ) {
    const stream = await engine.queryBindings(text, {
      sources: [source],
      initialBindings: bindingsFactory.fromRecord(values),
      unionDefaultGraph: true,
      readOnly: true,
      fetch: async () => {
        throw new Error("REMOTE_RDF_DISABLED");
      },
    });
    const rows: Record<string, string>[] = [];
    for await (const row of stream) {
      rows.push(
        Object.fromEntries([...row].map(([k, v]) => [k.value, v.value])),
      );
      if (rows.length > query.limit + 500) {
        stream.destroy();
        throw new Error("QUERY_ROW_BUDGET");
      }
    }
    return rows;
  }
  if (query.kind === "catalog") {
    const offset = state?.offset ?? 0;
    if (
      typeof offset !== "number" ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw new Error("INVALID_CURSOR");
    const catalog = new Store();
    for (const type of registry.getQuads(
      null,
      namedNode(RDF + "type"),
      namedNode(TM + "SourceEntity"),
      null,
    )) {
      const scope = registry.getObjects(
        type.subject,
        namedNode(TM + "sourceScope"),
        null,
      )[0]?.value;
      if (!scope || !context.allowedScopes.includes(scope)) continue;
      for (const q of registry.getQuads(type.subject, null, null, null))
        catalog.addQuad(quad(q.subject, q.predicate, q.object));
    }
    const text = `SELECT DISTINCT ?entity ?label ?namespace WHERE { ?entity a <${TM}SourceEntity> ; <${TM}nativeNamespace> ?namespace . OPTIONAL { ?entity <${RDFS}label> ?label } ${query.q ? "FILTER(CONTAINS(LCASE(STR(?label)), LCASE(STR(?needle))))" : ""} } ORDER BY ?entity ?label LIMIT ${query.limit + 1} OFFSET ${offset}`;
    const rows = await select(
        text,
        {
          ...(query.q ? { needle: literal(query.q) } : {}),
          ...(query.namespace ? { namespace: literal(query.namespace) } : {}),
        },
        catalog,
      ),
      truncated = rows.length > query.limit;
    return {
      graphVersion: runtime.identity.graphVersion,
      rows: rows.slice(0, query.limit),
      proofIds: [] as string[],
      truncated,
      cursor: truncated
        ? cursorEncode(
            { binding, offset: offset + query.limit },
            context.cursorSecret,
          )
        : null,
      coverage: runtime.coverage,
    };
  }
  if (!query.entityId) throw new Error("ENTITY_REQUIRED");
  if (query.kind === "path" && !query.targetId)
    throw new Error("TARGET_REQUIRED");
  const proofByTriple = new Map(
    visible.map((p) => [canonicalOntologyJson(p.conclusion), p]),
  );
  if (query.kind !== "path") {
    const offset = state?.offset ?? 0;
    if (
      typeof offset !== "number" ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw new Error("INVALID_CURSOR");
    const values: Record<string, ReturnType<typeof namedNode>> = {
      s: namedNode(query.entityId),
    };
    if (query.relation) values.p = namedNode(TM + query.relation);
    const page = await select(
      `SELECT ?s ?p ?o WHERE { ?s ?p ?o } ORDER BY ?p ?o LIMIT ${query.limit + 1} OFFSET ${offset}`,
      values,
      graph,
    );
    const rows: Record<string, string>[] = [];
    for (const row of page.slice(0, query.limit)) {
      const proof = proofByTriple.get(
        canonicalOntologyJson([row.s, row.p, row.o]),
      );
      if (!proof) continue;
      const reports = await Promise.all(
        proof.assertionIds.map((id) =>
          validateOntologyCore(asserted, runtime.shapes, {
            id,
            shape: TM + "AssertionShape",
          }),
        ),
      );
      if (reports.every((r) => r.conforms && !r.incomplete))
        rows.push({ ...row, proofId: proof.id });
    }
    const truncated = page.length > query.limit;
    return {
      graphVersion: runtime.identity.graphVersion,
      rows,
      proofIds: rows.map((r) => r.proofId),
      truncated,
      cursor: truncated
        ? cursorEncode(
            { binding, offset: offset + query.limit },
            context.cursorSecret,
          )
        : null,
      coverage: runtime.coverage,
    };
  }
  const frontier = (state?.frontier ?? [
      { id: query.entityId, path: [] as string[] },
    ]) as { id: string; path: string[] }[],
    visited = new Set((state?.visited ?? []) as string[]),
    rows: Record<string, string>[] = [];
  let checks = 0,
    found: string[] | null = null;
  while (
    frontier.length &&
    rows.length < query.limit &&
    performance.now() - started < (context.deadlineMs ?? 2000) &&
    checks < 500
  ) {
    const current = frontier.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    const values: Record<string, ReturnType<typeof namedNode>> = {
      s: namedNode(current.id),
    };
    if (query.relation) values.p = namedNode(TM + query.relation);
    const next = await select(
      `SELECT ?s ?p ?o WHERE { ?s ?p ?o } ORDER BY ?p ?o LIMIT 101`,
      values,
      graph,
    );
    if (next.length > 100) throw new Error("FRONTIER_WIDTH_BUDGET");
    for (const row of next) {
      const proof = proofByTriple.get(
        canonicalOntologyJson([row.s, row.p, row.o]),
      );
      if (!proof) continue;
      let valid = true;
      for (const id of proof.assertionIds) {
        const report = await validateOntologyCore(asserted, runtime.shapes, {
          id,
          shape: TM + "AssertionShape",
        });
        checks++;
        if (!report.conforms || report.incomplete) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      const path = [...current.path, proof.id];
      if (query.kind !== "path") rows.push({ ...row, proofId: proof.id });
      else if (row.o === query.targetId) {
        found = path;
        rows.push({ ...row, proofId: proof.id });
        break;
      } else if (!visited.has(row.o)) frontier.push({ id: row.o, path });
    }
    if (found || query.kind !== "path") break;
  }
  if (frontier.length > 500 || visited.size > 1000)
    throw new Error("CONTINUATION_BUDGET");
  const truncated = !found && frontier.length > 0;
  const nextCursor = truncated
    ? cursorEncode(
        { binding, frontier, visited: [...visited] },
        context.cursorSecret,
      )
    : null;
  if (nextCursor && nextCursor.length > 64000)
    throw new Error("CONTINUATION_BUDGET");
  return {
    graphVersion: runtime.identity.graphVersion,
    rows,
    proofIds: found ?? rows.map((r) => r.proofId),
    truncated,
    cursor: nextCursor,
    coverage: runtime.coverage,
  };
}
