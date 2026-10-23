import { DataFactory, Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import type { MathOntologyDatabaseSourceSnapshot } from "../sources/database";
import type { MathOntologyRuntime } from "../runtime/artifact";
import { queryOntology, type OntologyQueryContext } from "../query/closed";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { validateOntologyCore } from "../validation/core";
const TM = "urn:todaymath:vocab:",
  RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  XSD = "http://www.w3.org/2001/XMLSchema#";
const { namedNode: nn, literal: lit } = DataFactory;
const shapes = `@prefix sh: <http://www.w3.org/ns/shacl#> . @prefix tm: <${TM}> . @prefix xsd: <${XSD}> .
tm:RetainedJoinShape a sh:NodeShape; sh:targetClass tm:LearningObservation;
sh:property [sh:path tm:observedIn; sh:minCount 1; sh:maxCount 1; sh:nodeKind sh:IRI];
sh:property [sh:path tm:recordRevision; sh:minCount 1; sh:maxCount 1; sh:datatype xsd:integer; sh:minInclusive 0];
sh:property [sh:path tm:snapshotDigest; sh:minCount 1; sh:maxCount 1; sh:pattern "^sha256:[a-f0-9]{64}$"];
sh:property [sh:path tm:observedAt; sh:minCount 1; sh:maxCount 1; sh:datatype xsd:dateTime].`;
export interface RetainedJoinWitness {
  event: string;
  nativeEntity: string;
  recordRevision: number;
  snapshotDigest: string;
  eventHash: string;
  graphVersion: string;
  proofIds: readonly string[];
  path: readonly string[];
}
/** Source reader already authorized this one snapshot. Never union another student's
 * graph. These are descriptive joins, not OWL educational or prerequisite inference. */
export async function joinRetainedOntologySources(
  runtime: MathOntologyRuntime,
  snapshot: MathOntologyDatabaseSourceSnapshot,
  context: OntologyQueryContext,
) {
  if (
    snapshot.graphVersion !== runtime.identity.graphVersion ||
    !context.allowedScopes.includes("global")
  )
    throw new Error("PRIVATE_JOIN_CONTEXT_MISMATCH");
  const events = [
    ...snapshot.learning.firstAttempts,
    ...snapshot.learning.followUps,
  ].slice(0, 100);
  const store = new Store(),
    witnesses: RetainedJoinWitness[] = [],
    summaries: {
      event: string;
      independentFirstAttempt: boolean;
      correct: boolean;
      domain: string;
    }[] = [];
  let unresolved = 0;
  for (const event of events) {
    if (!("stableIri" in event.sourceBinding)) {
      unresolved++;
      continue;
    }
    let native: string;
    try {
      native =
        runtime.resolveEntity?.(event.sourceBinding.stableIri) ??
        event.sourceBinding.stableIri;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "ONTOLOGY_ENTITY_UNRESOLVED"
      ) {
        unresolved++;
        continue;
      }
      throw error;
    }
    const eventHash = ontologyDigest(canonicalOntologyJson(event));
    const id =
        "urn:todaymath:observation:" +
        ontologyDigest(
          snapshot.contextHash + snapshot.snapshotDigest + eventHash,
        ).slice(7),
      n = nn(id);
    store.addQuad(n, nn(RDF + "type"), nn(TM + "LearningObservation"));
    store.addQuad(n, nn(TM + "observedIn"), nn(native));
    store.addQuad(
      n,
      nn(TM + "recordRevision"),
      lit(String(snapshot.studentRevision), nn(XSD + "integer")),
    );
    store.addQuad(n, nn(TM + "snapshotDigest"), lit(snapshot.snapshotDigest));
    store.addQuad(
      n,
      nn(TM + "observedAt"),
      lit(event.answeredAt, nn(XSD + "dateTime")),
    );
    const proofIds: string[] = [],
      path = [native],
      visited = new Set<string>();
    let frontier = [native];
    for (let depth = 0; depth < 3 && frontier.length; depth++) {
      const next: string[] = [];
      for (const entityId of frontier) {
        if (visited.has(entityId)) continue;
        visited.add(entityId);
        if (visited.size > 24) throw new Error("PRIVATE_JOIN_FRONTIER_BUDGET");
        for (const relation of ["projectsSourceSection", "partOf"] as const) {
          const result = await queryOntology(
            runtime,
            { kind: "neighbors", entityId, relation, limit: 20 },
            context,
          );
          if (result.truncated) throw new Error("PRIVATE_JOIN_FRONTIER_BUDGET");
          for (const row of result.rows) {
            store.addQuad(nn(row.s), nn(row.p), nn(row.o));
            proofIds.push(row.proofId);
            path.push(row.o);
            next.push(row.o);
          }
        }
      }
      frontier = [...new Set(next)];
    }
    witnesses.push({
      event: id,
      nativeEntity: native,
      recordRevision: snapshot.studentRevision,
      snapshotDigest: snapshot.snapshotDigest,
      eventHash,
      graphVersion: runtime.identity.graphVersion,
      proofIds: [...new Set(proofIds)],
      path: [...new Set(path)],
    });
    summaries.push({
      event: id,
      independentFirstAttempt: event.independentFirstAttempt,
      correct: event.correct,
      domain: event.domain,
    });
  }
  const validation = await validateOntologyCore(store, shapes);
  if (!validation.conforms || validation.incomplete)
    throw new Error("PRIVATE_JOIN_SHACL");
  const stream = await new QueryEngine().queryBindings(
    `SELECT DISTINCT ?event ?native ?section ?chapter WHERE { ?event a <${TM}LearningObservation>; <${TM}observedIn> ?native . OPTIONAL { ?native <${TM}projectsSourceSection> ?section . OPTIONAL { ?section <${TM}partOf> ?chapter } } } ORDER BY ?event ?section ?chapter LIMIT 501`,
    {
      sources: [store],
      readOnly: true,
      fetch: async () => {
        throw new Error("REMOTE_RDF_DISABLED");
      },
    },
  );
  const rows: Record<string, string>[] = [];
  for await (const row of stream) {
    rows.push(Object.fromEntries([...row].map(([k, v]) => [k.value, v.value])));
    if (rows.length > 500) {
      stream.destroy();
      throw new Error("PRIVATE_JOIN_ROW_BUDGET");
    }
  }
  return {
    rows,
    witnesses,
    summaries,
    validation: {
      engine: validation.engine,
      conforms: validation.conforms,
      focusNodeCount: witnesses.length,
    },
    coverage: {
      retainedEvents: events.length,
      joinedEvents: witnesses.length,
      unresolved,
      partial:
        events.length <
        snapshot.learning.firstAttempts.length +
          snapshot.learning.followUps.length,
      historyComplete: false,
      otherDomains: {
        explorerCards: {
          count: snapshot.learning.explorerCards?.length ?? 0,
          status: "retained-summary-not-timed-first-attempt",
        },
        explorerDays: {
          count: snapshot.learning.explorerDays?.length ?? 0,
          status: "date-only-replay-not-first-attempt",
        },
        fadingConcepts: {
          count: snapshot.learning.fadingConcepts?.length ?? 0,
          status: "self-rating-summary-not-first-attempt",
        },
        legacyAttempts: {
          count: snapshot.learning.legacyAttempts?.length ?? 0,
          status: "retained-legacy-not-course-first-attempt",
        },
        activeExplorerSession: {
          present: !!snapshot.learning.activeExplorerSession,
          status: "open-session-not-completed-observation",
        },
        minuteRelearning: {
          present: !!snapshot.learning.minuteRelearning,
          status: "short-repeat-not-long-term-fsrs",
        },
      },
    },
    unknown:
      "보존된 기록의 단원 연결입니다. 기록 부재·후속 풀이·정답만으로 숙달이나 원인을 판단하지 않습니다.",
  };
}
