import {
  mathOntologyQuerySchema,
  type MathOntologyArtifact,
  type MathOntologyGraphIdentity,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { loadOntologyRuntime } from "../runtime/artifact";
import { queryOntology } from "../query/closed";
import {
  queryOntologyObservations,
  type RetainedOntologyObservations,
} from "./observations";

export interface OntologyReadAccess {
  stamp: string;
  sessionVersion: number;
  allowedScopes: readonly string[];
  actorId: string;
  sourceSnapshot: unknown;
  recordRevision: number;
  observations?: RetainedOntologyObservations;
}
export interface OntologyReadDependencies {
  authorize: (
    request: Request,
    studentId?: string,
    asOf?: Date,
  ) => Promise<{
    response: Response | null;
    access: OntologyReadAccess | null;
  }>;
  readRelease: (
    scope: string,
  ) => Promise<{
    generation: number;
    identity: MathOntologyGraphIdentity;
    artifact: MathOntologyArtifact;
  } | null>;
  cursorSecret: () => string;
}
const response = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
/** Authorization before graph load and an uncached final read after query work. */
export function createOntologyReadHandler(deps: OntologyReadDependencies) {
  return async (request: Request, studentId?: string) => {
    const asOf = new Date();
    const first = await deps.authorize(request, studentId, asOf);
    if (first.response || !first.access)
      return first.response ?? response(403, { error: { code: "FORBIDDEN" } });
    let query;
    const validationOnly =
      new URL(request.url).pathname === "/api/math-ontology/validate";
    try {
      const url = new URL(request.url);
      if (Number(request.headers.get("content-length")) > 72000)
        return response(413, { error: { code: "BODY_BUDGET" } });
      const raw =
        request.method === "GET" || validationOnly
          ? {
              kind: "catalog",
              ...(url.searchParams.get("q")
                ? { q: url.searchParams.get("q") }
                : {}),
              ...(url.searchParams.get("cursor")
                ? { cursor: url.searchParams.get("cursor") }
                : {}),
              limit: Number(url.searchParams.get("limit") ?? 20),
            }
          : await boundedOntologyJson(request);
      query = mathOntologyQuerySchema.parse(raw);
    } catch {
      return response(400, { error: { code: "VALIDATION_ERROR" } });
    }
    try {
      const release = await deps.readRelease("global");
      if (!release)
        return response(503, {
          error: { code: "ONTOLOGY_RELEASE_UNAVAILABLE" },
        });
      const runtime = await loadOntologyRuntime(
        release.artifact,
        release.identity,
      );
      const snapshotHash = ontologyDigest(
        canonicalOntologyJson(first.access.sourceSnapshot),
      );
      const contextHash = ontologyDigest(
        canonicalOntologyJson([
          first.access.stamp,
          first.access.recordRevision,
          snapshotHash,
          release.identity.graphVersion,
          release.generation,
        ]),
      );
      const answer = validationOnly
        ? {
            graphVersion: runtime.identity.graphVersion,
            validation: {
              engine: runtime.validation.engine,
              conforms: runtime.validation.conforms,
              incomplete: runtime.validation.incomplete,
              focusNodeCount: runtime.validation.focusNodeCount,
            },
          }
        : studentId && first.access.observations
          ? await queryOntologyObservations(
              runtime,
              first.access.observations,
              `student:${contextHash.slice(7)}`,
              contextHash,
            )
          : await queryOntology(runtime, query, {
              allowedScopes: first.access.allowedScopes,
              contextHash,
              cursorSecret: deps.cursorSecret(),
            });
      const last = await deps.authorize(request, studentId, asOf);
      if (
        last.response ||
        !last.access ||
        last.access.sessionVersion !== first.access.sessionVersion
      )
        return last.response ?? response(403, { error: { code: "FORBIDDEN" } });
      const active = await deps.readRelease("global");
      if (
        last.access.stamp !== first.access.stamp ||
        last.access.recordRevision !== first.access.recordRevision ||
        ontologyDigest(canonicalOntologyJson(last.access.sourceSnapshot)) !==
          snapshotHash ||
        active?.generation !== release.generation ||
        active.identity.graphVersion !== release.identity.graphVersion
      )
        return response(409, { error: { code: "CONFLICT" } });
      return response(200, {
        data: {
          ...answer,
          sourceSnapshotId: contextHash,
          asOf: asOf.toISOString(),
          coverage: undefined,
        },
      });
    } catch(error) {
      const code=error instanceof Error?error.message:"";
      if(code==="ONTOLOGY_ENTITY_UNRESOLVED")return response(200,{data:{state:"unknown",completeness:"unknown",rows:[],proofIds:[],truncated:false,cursor:null}});
      if(/^(?:MATERIALIZATION_|FRONTIER_WIDTH_BUDGET|CONTINUATION_BUDGET|QUERY_ROW_BUDGET)/.test(code))return response(200,{data:{state:"incomplete",completeness:"partial",rows:[],proofIds:[],truncated:true,cursor:null}});
      return response(503, { error: { code: "ONTOLOGY_READ_UNAVAILABLE" } });
    }
  };
}
async function boundedOntologyJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("BODY_REQUIRED");
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 72000) throw new Error("BODY_BUDGET");
      parts.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
