import "server-only";
import { z } from "zod";
import { mathOntologyQuerySchema } from "@/contracts/mathOntology.contract";
import {
  authorizeOntologyOperationRequest,
  ontologyOperationsEnabled,
} from "../actions/production.server";
import {
  ontologyFailure,
  ontologyJsonBody,
  ontologyResponse,
} from "../actions/http";
import { createProductionOntologyContext } from "./context.server";
import { queryOntology } from "../query/closed";
export async function handleOntologyRead(request: Request, studentId?: string) {
  if (!ontologyOperationsEnabled())
    return ontologyResponse(503, {
      error: { code: "ONTOLOGY_OPERATIONS_UNAVAILABLE" },
    });
  const access = await authorizeOntologyOperationRequest(request);
  if (access.response || !access.actor)
    return (
      access.response ?? ontologyResponse(403, { error: { code: "FORBIDDEN" } })
    );
  try {
    const url = new URL(request.url);
    const target = studentId
      ? {
          studentId: z.uuid().parse(studentId),
          classId: z.uuid().parse(url.searchParams.get("classId")),
          branchId: url.searchParams.get("branchId")
            ? z.uuid().parse(url.searchParams.get("branchId"))
            : null,
        }
      : undefined;
    const coverage = url.pathname === "/api/math-ontology/coverage";
    if (coverage && (request.method !== "GET" || url.searchParams.size !== 0))
      return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
    const validation = url.pathname === "/api/math-ontology/validate";
    if (validation)
      z.strictObject({}).parse(await ontologyJsonBody(request, 8192));
    const query = mathOntologyQuerySchema.parse(
      request.method === "GET" || validation
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
        : await ontologyJsonBody(request),
    );
    const current = createProductionOntologyContext(
        request,
        access.actor,
        target,
      ),
      session = await current.open(!!target);
    if (coverage) {
      const result = session.readCoverage();
      await session.assertCurrent();
      return ontologyResponse(200, {
        ...result,
        asOf: current.asOf.toISOString(),
        sourceSnapshotId: session.context.contextHash,
      });
    }
    let data: unknown;
    try {
      data = target
        ? session.privateEvidence
        : validation
          ? {
              graphVersion: session.runtime.identity.graphVersion,
              validation: session.runtime.validation,
            }
          : await queryOntology(session.runtime, query, session.context);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "ONTOLOGY_ENTITY_UNRESOLVED")
        data = {
          state: "unknown",
          completeness: "unknown",
          rows: [],
          proofIds: [],
          truncated: false,
          cursor: null,
        };
      else if (
        /^(?:MATERIALIZATION_|FRONTIER_WIDTH_BUDGET|CONTINUATION_BUDGET|QUERY_ROW_BUDGET)/.test(
          code,
        )
      )
        data = {
          state: "incomplete",
          completeness: "partial",
          rows: [],
          proofIds: [],
          truncated: true,
          cursor: null,
        };
      else throw error;
    }
    await session.assertCurrent();
    return ontologyResponse(200, {
      data,
      asOf: current.asOf.toISOString(),
      sourceSnapshotId: session.context.contextHash,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
    return ontologyFailure(error);
  }
}
